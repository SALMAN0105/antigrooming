package com.example.agent_app

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.accessibility.AccessibilityManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.FlutterEngineCache
import io.flutter.plugin.common.MethodChannel

/**
 * MainActivity — Entry point Flutter + Bridge ke lapisan Native Android.
 *
 * AUDIT FIXES APPLIED:
 * - [FIX-4] Semua result.success/error dipastikan dipanggil dari main thread
 *   karena MethodChannel hanya boleh diakses dari main thread.
 * - [FIX-1] onActivityResult sekarang memanggil ScreenshotManager.initMediaProjection()
 *   untuk menyimpan objek MediaProjection (bukan Intent token mentah) agar reusable.
 * - [FIX-NEW] onDestroy memanggil ScreenshotManager.releaseProjection() untuk lifecycle safety.
 */
class MainActivity : FlutterActivity() {

    private val TAG = "MainActivity"
    private val CHANNEL = "com.example.agent_app/service"

    private val NOTIFICATION_CHANNEL_ID = "ChatMonitorServiceChannel"
    private val NOTIFICATION_CHANNEL_NAME = "Chat Monitor Service"
    private val SCREEN_CAPTURE_REQUEST_CODE = 1001

    private var mediaProjectionManager: MediaProjectionManager? = null

    // Menyimpan pending result untuk MethodChannel yang menunggu onActivityResult
    private var pendingResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        Log.d(TAG, "🔧 Configuring Flutter Engine...")

        FlutterEngineCache
            .getInstance()
            .put("main_flutter_engine", flutterEngine)
        Log.d(TAG, "✅ Flutter Engine cached")

        createNotificationChannel()

        mediaProjectionManager =
            getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {

                    "requestAccessibilityPermission" -> {
                        try {
                            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                            startActivity(intent)
                            result.success(true)
                        } catch (e: Exception) {
                            Log.e(TAG, "❌ Gagal membuka Accessibility Settings: ${e.message}")
                            result.error("ERROR", "Gagal membuka settings", e.message)
                        }
                    }

                    "isAccessibilityServiceEnabled" -> {
                        try {
                            val isEnabled = isAccessibilityServiceEnabled(
                                this, ChatMonitorService::class.java
                            )
                            result.success(isEnabled)
                        } catch (e: Exception) {
                            Log.e(TAG, "❌ Error cek accessibility: ${e.message}")
                            result.success(false)
                        }
                    }

                    "requestScreenCapturePermission" -> {
                        try {
                            val captureIntent = mediaProjectionManager?.createScreenCaptureIntent()
                            if (captureIntent != null) {
                                // Simpan result; akan diselesaikan di onActivityResult
                                pendingResult = result
                                @Suppress("DEPRECATION") // startActivityForResult masih valid untuk Flutter
                                startActivityForResult(captureIntent, SCREEN_CAPTURE_REQUEST_CODE)
                            } else {
                                Log.e(TAG, "❌ MediaProjectionManager.createScreenCaptureIntent() null")
                                result.error("ERROR", "MediaProjection tidak tersedia di device ini", null)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "❌ Gagal memulai intent MediaProjection: ${e.message}")
                            pendingResult = null
                            result.error("ERROR", "Gagal meminta izin rekam layar", e.message)
                        }
                    }

                    "startService" -> {
                        try {
                            val intent = Intent(this, ChatMonitorService::class.java)
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                startForegroundService(intent)
                            } else {
                                startService(intent)
                            }
                            result.success(true)
                            Log.d(TAG, "✅ ChatMonitorService start command sent")
                        } catch (e: Exception) {
                            Log.e(TAG, "❌ Gagal start service: ${e.message}")
                            result.error("ERROR", "Gagal menjalankan layanan monitoring", e.message)
                        }
                    }

                    "stopService" -> {
                        try {
                            stopService(Intent(this, ChatMonitorService::class.java))
                            result.success(true)
                            Log.d(TAG, "✅ ChatMonitorService stop command sent")
                        } catch (e: Exception) {
                            Log.e(TAG, "❌ Gagal stop service: ${e.message}")
                            result.error("ERROR", "Gagal menghentikan layanan monitoring", e.message)
                        }
                    }

                    // [FIX-4] captureScreenshot: ScreenshotManager.captureScreenshot memanggil
                    // callback di mainHandler, sehingga result.success/error selalu di main thread.
                    "captureScreenshot" -> {
                        Log.d(TAG, "📸 captureScreenshot dipanggil dari Flutter")
                        ScreenshotManager.captureScreenshot(this) { path ->
                            // Callback sudah dijamin dari main thread oleh ScreenshotManager
                            if (path != null) {
                                Log.d(TAG, "✅ Path screenshot dikirim ke Flutter: $path")
                                result.success(path)
                            } else {
                                Log.e(TAG, "❌ captureScreenshot gagal, path null")
                                result.error(
                                    "CAPTURE_FAILED",
                                    "Gagal mengambil screenshot. Pastikan izin rekam layar sudah diberikan.",
                                    null
                                )
                            }
                        }
                    }

                    else -> {
                        Log.w(TAG, "⚠️ Method tidak diimplementasi: ${call.method}")
                        result.notImplemented()
                    }
                }
            }
    }

    /**
     * Dipanggil setelah user meng-grant atau menolak izin screen capture.
     * [FIX-1] Memanggil initMediaProjection agar objek projection tersimpan dan reusable.
     */
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode != SCREEN_CAPTURE_REQUEST_CODE) return

        if (resultCode == Activity.RESULT_OK && data != null) {
            Log.i(TAG, "✅ Izin MediaProjection DIBERIKAN. Menginisialisasi projection...")

            // Simpan token data untuk kebutuhan lain (kompatibilitas service)
            ScreenshotManager.mediaProjectionResultData = data

            // [FIX-1] Inisialisasi MediaProjection object satu kali, simpan untuk reuse
            ScreenshotManager.initMediaProjection(this, resultCode, data)

            pendingResult?.success(true)
        } else {
            Log.w(TAG, "⚠️ Izin MediaProjection DITOLAK oleh user")
            pendingResult?.success(false)
        }

        // Selalu clear pending result untuk mencegah "Reply already submitted" error
        pendingResult = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val channel = NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    NOTIFICATION_CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Layanan monitoring chat AntiGrooming berjalan di background"
                    setShowBadge(false)
                    enableLights(false)
                    enableVibration(false)
                    setSound(null, null)
                }
                val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.createNotificationChannel(channel)
                Log.d(TAG, "✅ Notification channel '$NOTIFICATION_CHANNEL_ID' siap")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Gagal membuat notification channel: ${e.message}")
            }
        }
    }

    private fun isAccessibilityServiceEnabled(context: Context, service: Class<*>): Boolean {
        return try {
            val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
                ?: return false

            am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
                .any { enabledService ->
                    enabledService.resolveInfo?.serviceInfo?.let { info ->
                        info.packageName == context.packageName && info.name == service.name
                    } ?: false
                }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error cek accessibility service: ${e.message}")
            false
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "🎬 MainActivity onCreate")
    }

    override fun onResume() {
        super.onResume()
        Log.d(TAG, "▶️ MainActivity onResume")
    }

    override fun onDestroy() {
        // [FIX-NEW] Pastikan MediaProjection dibebaskan saat Activity destroyed untuk mencegah leak
        ScreenshotManager.releaseProjection()
        Log.d(TAG, "💀 MainActivity onDestroy — MediaProjection released")
        super.onDestroy()
    }
}
package com.example.agent_app

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import android.content.SharedPreferences
import androidx.core.app.NotificationCompat
import java.io.File
import java.io.FileOutputStream

/**
 * GameOcrService — Foreground Service yang menangkap screenshot game
 * secara berkala dan mengekstrak teks via On-Device OCR (ML Kit).
 *
 * ARSITEKTUR:
 * ┌─────────────────────┐
 * │ ChatMonitorService   │  (AccessibilityService, sudah ada)
 * │ Deteksi game di FG   │
 * │ ─── startService ──→ │
 * └─────────────────────┘
 *          │
 *          ▼
 * ┌─────────────────────────────────────────┐
 * │ GameOcrService (Foreground Service)      │
 * │                                         │
 * │  MediaProjection → ImageReader          │
 * │       │                                 │
 * │       ▼ (setiap 5 detik)               │
 * │  Bitmap → OcrTextExtractor.extractText  │
 * │       │                                 │
 * │       ▼ (jika ada teks)                │
 * │  OcrApiClient.analyzeAndReport          │
 * │       │                                 │
 * │       ▼ Bitmap.recycle() + image.close()│
 * └─────────────────────────────────────────┘
 *
 * MEMORY CONTRACT:
 * - ImageReader maxImages = 2 (minimal untuk pipeline)
 * - image.close() dipanggil SEGERA setelah buffer dikopi ke Bitmap
 * - Bitmap di-recycle SEGERA setelah ML Kit selesai
 * - Throttle: 1 capture per CAPTURE_INTERVAL_MS (5000ms default)
 * - Jika OCR belum selesai saat timer berikutnya, capture di-skip
 *
 * LIFECYCLE:
 * - Dimulai oleh ChatMonitorService saat game terdeteksi di foreground
 * - Dihentikan oleh ChatMonitorService saat game tidak lagi di foreground
 * - Membersihkan semua resource di onDestroy()
 */
class GameOcrService : Service() {

    companion object {
        private const val TAG = "GameOcrService"
        private const val NOTIFICATION_CHANNEL_ID = "GameOcrServiceChannel"
        private const val NOTIFICATION_ID = 2 // Berbeda dari ChatMonitorService (ID=1)
        private const val CAPTURE_INTERVAL_MS = 5_000L // 5 detik per capture

        const val EXTRA_APP_NAME = "extra_app_name"
    }

    // Coroutine scope terikat lifecycle service — SupervisorJob agar
    // satu failure tidak membatalkan semua child coroutine
    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    private var mediaProjectionManager: MediaProjectionManager? = null
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var displayMetrics: DisplayMetrics? = null

    private val handler = Handler(Looper.getMainLooper())
    private var captureRunnable: Runnable? = null

    // Flag untuk mencegah capture bertumpuk saat OCR masih memproses
    @Volatile
    private var isProcessing = false

    private var currentAppName = "game"

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "🎮 GameOcrService onCreate")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        currentAppName = intent?.getStringExtra(EXTRA_APP_NAME) ?: "game"
        Log.d(TAG, "▶️ GameOcrService dimulai untuk: $currentAppName")

        // Harus startForeground dalam 5 detik setelah startForegroundService
        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)

        // Setup MediaProjection dari token yang sudah disimpan ScreenshotManager
        if (!setupMediaProjection()) {
            Log.e(TAG, "❌ MediaProjection gagal, menghentikan service")
            stopSelf()
            return START_NOT_STICKY
        }

        // DRY RUN FIX: Hentikan loop lama jika ada sebelum memulai yang baru
        captureRunnable?.let { handler.removeCallbacks(it) }

        // Mulai capture loop
        startCaptureLoop()

        return START_NOT_STICKY
    }

    /**
     * Setup MediaProjection menggunakan token yang sudah ada di ScreenshotManager.
     * TIDAK meminta izin baru — menggunakan token dari izin yang sudah diberikan user
     * saat pertama kali mengaktifkan perlindungan.
     */
    private fun setupMediaProjection(): Boolean {
        val resultData = ScreenshotManager.mediaProjectionResultData
        if (resultData == null) {
            Log.e(TAG, "❌ Tidak ada token MediaProjection — user belum memberikan izin rekam layar")
            return false
        }

        mediaProjectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager

        val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        displayMetrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        windowManager.defaultDisplay.getRealMetrics(displayMetrics!!)

        return try {
            mediaProjection = mediaProjectionManager!!.getMediaProjection(Activity.RESULT_OK, resultData)

            if (mediaProjection == null) {
                Log.e(TAG, "❌ getMediaProjection mengembalikan null")
                return false
            }

            // ImageReader dengan maxImages=2: satu frame aktif, satu buffer
            imageReader = ImageReader.newInstance(
                displayMetrics!!.widthPixels,
                displayMetrics!!.heightPixels,
                PixelFormat.RGBA_8888,
                2
            )

            virtualDisplay = mediaProjection!!.createVirtualDisplay(
                "GameOcrCapture",
                displayMetrics!!.widthPixels,
                displayMetrics!!.heightPixels,
                displayMetrics!!.densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader!!.surface,
                null,
                null
            )

            Log.d(TAG, "✅ MediaProjection dan VirtualDisplay siap")
            true
        } catch (e: Exception) {
            Log.e(TAG, "❌ Gagal setup MediaProjection: ${e.message}")
            releaseCapture()
            false
        }
    }

    /**
     * Memulai loop capture berkala.
     * Setiap CAPTURE_INTERVAL_MS, akan mengambil satu frame, OCR, dan mengirim.
     * Jika frame sebelumnya masih diproses, iterasi ini di-skip.
     */
    private fun startCaptureLoop() {
        captureRunnable = object : Runnable {
            override fun run() {
                if (!isProcessing) {
                    captureAndProcess()
                } else {
                    Log.d(TAG, "⏳ Skip capture — frame sebelumnya masih diproses")
                }
                // Schedule capture berikutnya
                handler.postDelayed(this, CAPTURE_INTERVAL_MS)
            }
        }
        // Mulai capture pertama setelah delay 1 detik (beri waktu VirtualDisplay render)
        handler.postDelayed(captureRunnable!!, 1_000L)
    }

    /**
     * Mengambil satu frame dari ImageReader dan memprosesnya via OCR.
     *
     * MEMORY FLOW:
     * 1. acquireLatestImage() → Image object (native memory)
     * 2. Copy buffer ke Bitmap (managed + native memory)
     * 3. image.close() SEGERA → bebaskan native Image buffer
     * 4. OCR proses Bitmap
     * 5. bitmap.recycle() SEGERA setelah OCR selesai → bebaskan native Bitmap memory
     *
     * Bitmap ARGB_8888 untuk layar 1080x2400 = ~10MB.
     * Dengan siklus 5 detik dan cleanup agresif, peak memory ~10-20MB acceptable.
     */
    private fun captureAndProcess() {
        isProcessing = true

        try {
            val image = try {
                imageReader?.acquireLatestImage()
            } catch (e: Exception) {
                Log.e(TAG, "❌ acquireLatestImage error: ${e.message}")
                isProcessing = false
                return
            }

            if (image == null) {
                Log.d(TAG, "ℹ️ Tidak ada frame tersedia, skip")
                isProcessing = false
                return
            }

            var bitmap: Bitmap? = null
            try {
                val plane = image.planes[0]
                val pixelStride = plane.pixelStride
                val rowStride = plane.rowStride
                val rowPadding = rowStride - pixelStride * displayMetrics!!.widthPixels

                bitmap = Bitmap.createBitmap(
                    displayMetrics!!.widthPixels + rowPadding / pixelStride,
                    displayMetrics!!.heightPixels,
                    Bitmap.Config.ARGB_8888
                )
                bitmap.copyPixelsFromBuffer(plane.buffer)

            } catch (t: Throwable) {
                Log.e(TAG, "❌ Error konversi frame ke Bitmap: ${t.message}")
                bitmap?.recycle()
                isProcessing = false
                return
            } finally {
                try {
                    image.close()
                } catch (e: Exception) {
                    Log.e(TAG, "⚠️ image.close() gagal: ${e.message}")
                }
            }

            val capturedBitmap = bitmap ?: run {
                Log.e(TAG, "❌ Bitmap null setelah konversi, skip")
                isProcessing = false
                return
            }

            // Simpan bitmap ke file untuk dikirim sebagai screenshot bukti
            val screenshotFile = saveBitmapToFile(capturedBitmap)
            val screenshotPath = screenshotFile?.absolutePath

            val deviceToken = getDeviceToken()

            serviceScope.launch {
                try {
                    val extractedText = OcrTextExtractor.extractText(capturedBitmap)

                    if (extractedText != null && extractedText.length > 3) {
                        Log.d(TAG, "🔍 Teks game terdeteksi (${extractedText.length} char), mengirim ke AI...")
                        OcrApiClient.analyzeAndReport(
                            text = extractedText,
                            appName = currentAppName,
                            deviceToken = deviceToken,
                            screenshotPath = screenshotPath
                        )
                    } else {
                        // Tidak ada teks terdeteksi, hapus file screenshot
                        deleteScreenshotFile(screenshotPath)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error di pipeline OCR: ${e.message}")
                    deleteScreenshotFile(screenshotPath)
                } finally {
                    capturedBitmap.recycle()
                    isProcessing = false
                }
            }

        } catch (t: Throwable) {
            Log.e(TAG, "❌ Unexpected error di captureAndProcess: ${t.javaClass.simpleName} — ${t.message}")
            isProcessing = false
        }
    }

    private fun saveBitmapToFile(bitmap: Bitmap): File? {
        val file = File(cacheDir, "game_ss_${System.currentTimeMillis()}.jpg")
        return try {
            FileOutputStream(file).use { fos ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 70, fos)
            }
            file
        } catch (e: Exception) {
            Log.e(TAG, "❌ Gagal menyimpan bitmap ke file: ${e.message}")
            null
        }
    }

    private fun deleteScreenshotFile(path: String?) {
        if (path == null) return
        try {
            val file = File(path)
            if (file.exists()) file.delete()
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting screenshot: ${e.message}")
        }
    }

    private fun getDeviceToken(): String? {
        val prefs: SharedPreferences = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
        return prefs.getString("flutter.device_token", null)
    }

    private fun releaseCapture() {
        virtualDisplay?.release()
        virtualDisplay = null
        imageReader?.close()
        imageReader = null
        mediaProjection?.stop()
        mediaProjection = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Pemantauan Game",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Layanan OCR aktif untuk memantau chat di dalam game"
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
                setSound(null, null)
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("Perlindungan Game Aktif")
            .setContentText("Memantau chat di $currentAppName untuk keamanan anak.")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        Log.d(TAG, "💀 GameOcrService onDestroy — membersihkan resource")

        // Hentikan capture loop
        captureRunnable?.let { handler.removeCallbacks(it) }
        captureRunnable = null

        // Bebaskan resource MediaProjection (BUKAN ScreenshotManager.activeMediaProjection)
        releaseCapture()

        // Batalkan semua coroutine yang masih berjalan
        serviceScope.cancel()

        // Bebaskan ML Kit recognizer
        OcrTextExtractor.release()

        super.onDestroy()
    }
}

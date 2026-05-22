package com.example.agent_app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.app.Activity
import android.app.Notification
import android.app.PendingIntent
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
import android.os.Looper
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.core.app.NotificationCompat
import io.flutter.embedding.engine.FlutterEngineCache
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ChatMonitorService : AccessibilityService() {

    private val TAG = "ChatMonitorService"
    private val NOTIFICATION_CHANNEL_ID = "ChatMonitorServiceChannel"
    private val NOTIFICATION_ID = 1

    private var mediaProjectionManager: MediaProjectionManager? = null
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var windowManager: WindowManager? = null
    private var displayMetrics: DisplayMetrics? = null

    private var channel: MethodChannel? = null
    private val handler = Handler(Looper.getMainLooper())
    private var scanRunnable: Runnable? = null
    private val recentTexts = mutableSetOf<String>()

    // === Game OCR Trigger State ===
    // Melacak apakah GameOcrService sedang berjalan untuk menghindari
    // start/stop berulang yang tidak perlu.
    private var isGameOcrServiceRunning = false
    // Package game yang terakhir aktif, untuk mengirim nama app ke service
    private var lastActiveGamePackage: String? = null
    
    private fun traverseNodes(node: AccessibilityNodeInfo?, foundTexts: MutableList<String>) {
        if (node == null) return
        try {
            val className = node.className?.toString() ?: ""
            if (className == "android.widget.EditText") return

            if (className == "android.widget.TextView" && node.text != null && node.text.isNotBlank()) {
                val foundText = node.text.toString().trim()
                if (foundText.length > 1 && !recentTexts.contains(foundText)) {
                    foundTexts.add(foundText)
                }
            }
            for (i in 0 until node.childCount) {
                val childNode = node.getChild(i)
                if (childNode != null) {
                    traverseNodes(childNode, foundTexts)
                    // FIX: Memory Leak Prevention
                    childNode.recycle()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error traverse node: ${e.message}")
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: ""

        // === ROUTING DECISION ===
        // Jika event berasal dari game, delegasikan ke GameOcrService.
        // Jika event berasal dari messaging app, proses via accessibility tree.
        
        if (isGamePackage(packageName)) {
            // Game terdeteksi di foreground
            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                handleGameForeground(packageName)
            }
            // Untuk game, JANGAN proses accessibility tree (tidak ada TextView).
            return
        }
        
        // Jika bukan game dan sebelumnya game OCR aktif, hentikan.
        if (isGameOcrServiceRunning && event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            handleGameBackground()
        }

        // === MESSAGING APP FLOW (logika existing, tidak diubah) ===
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) return
        if (!isMonitoredMessagingPackage(packageName)) return

        scanRunnable?.let { handler.removeCallbacks(it) }
        
        scanRunnable = Runnable {
            val rootNode = rootInActiveWindow ?: return@Runnable
            val allFoundTexts = mutableListOf<String>()
            
            traverseNodes(rootNode, allFoundTexts)

            if (allFoundTexts.isEmpty()) {
                rootNode.recycle()
                return@Runnable
            }

            val targetText = allFoundTexts.maxByOrNull { it.length }

            if (targetText != null && targetText.length > 2) {
                recentTexts.add(targetText)
                if (recentTexts.size > 50) recentTexts.remove(recentTexts.first())

                takeScreenshotAndUpload(
                    text = targetText,
                    appName = mapPackageToAppName(packageName),
                    rootNode = rootNode,
                    packageName = packageName
                )
            }
            rootNode.recycle()
        }
        handler.postDelayed(scanRunnable!!, 1500)
    }

    // === GAME OCR SERVICE TRIGGER ===

    /**
     * Dipanggil saat game terdeteksi di foreground.
     * Memulai GameOcrService jika belum berjalan.
     */
    private fun handleGameForeground(packageName: String) {
        if (isGameOcrServiceRunning && lastActiveGamePackage == packageName) {
            return // Sudah berjalan untuk game yang sama, skip
        }

        Log.d(TAG, "🎮 Game terdeteksi: $packageName → Memulai GameOcrService")
        lastActiveGamePackage = packageName

        val intent = Intent(this, GameOcrService::class.java).apply {
            putExtra(GameOcrService.EXTRA_APP_NAME, mapPackageToAppName(packageName))
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
            isGameOcrServiceRunning = true
        } catch (e: Exception) {
            Log.e(TAG, "❌ Gagal memulai GameOcrService: ${e.message}")
        }
    }

    /**
     * Dipanggil saat user berpindah dari game ke app lain.
     * Menghentikan GameOcrService untuk menghemat resource.
     */
    private fun handleGameBackground() {
        if (!isGameOcrServiceRunning) return

        Log.d(TAG, "🛑 Game tidak lagi di foreground → Menghentikan GameOcrService")
        try {
            stopService(Intent(this, GameOcrService::class.java))
        } catch (e: Exception) {
            Log.e(TAG, "Error menghentikan GameOcrService: ${e.message}")
        }
        isGameOcrServiceRunning = false
        lastActiveGamePackage = null
    }

    // === SCREENSHOT & UPLOAD (untuk messaging apps, tidak berubah) ===

    private fun takeScreenshotAndUpload(text: String, appName: String, rootNode: AccessibilityNodeInfo, packageName: String) {
        val pelakuIdentitas = extractPelakuIdentity(rootNode, packageName)

        // Coba ambil dari imageReader (VirtualDisplay yang sudah berjalan)
        val image = if (mediaProjection != null) {
            try { imageReader?.acquireLatestImage() } catch (e: Exception) { null }
        } else null

        if (image != null) {
            // Path utama: ambil langsung dari VirtualDisplay service
            try {
                val planes = image.planes
                val buffer = planes[0].buffer
                val pixelStride = planes[0].pixelStride
                val rowStride = planes[0].rowStride
                val rowPadding = rowStride - pixelStride * displayMetrics!!.widthPixels

                val bitmap = Bitmap.createBitmap(
                    displayMetrics!!.widthPixels + rowPadding / pixelStride,
                    displayMetrics!!.heightPixels,
                    Bitmap.Config.ARGB_8888
                )
                bitmap.copyPixelsFromBuffer(buffer)
                image.close()

                val file = saveBitmapToFile(bitmap)
                sendToFlutter(text, appName, file?.absolutePath, pelakuIdentitas)
            } catch (e: Exception) {
                try { image.close() } catch (_: Exception) {}
                // Jika bitmap processing gagal, coba fallback
                fallbackCaptureAndSend(text, appName, pelakuIdentitas)
            }
        } else {
            // Fallback: gunakan ScreenshotManager yang punya activeMediaProjection sendiri
            fallbackCaptureAndSend(text, appName, pelakuIdentitas)
        }
    }

    private fun fallbackCaptureAndSend(text: String, appName: String, pelakuIdentitas: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                takeScreenshot(
                    android.view.Display.DEFAULT_DISPLAY,
                    mainExecutor,
                    object : AccessibilityService.TakeScreenshotCallback {
                        override fun onSuccess(screenshotResult: AccessibilityService.ScreenshotResult) {
                            try {
                                val hardwareBuffer = screenshotResult.hardwareBuffer
                                val bitmap = Bitmap.wrapHardwareBuffer(hardwareBuffer, screenshotResult.colorSpace)
                                if (bitmap != null) {
                                    val copiedBitmap = bitmap.copy(Bitmap.Config.ARGB_8888, false)
                                    hardwareBuffer.close()
                                    val file = copiedBitmap?.let { saveBitmapToFile(it) }
                                    sendToFlutter(text, appName, file?.absolutePath, pelakuIdentitas)
                                } else {
                                    hardwareBuffer.close()
                                    Log.e(TAG, "Accessibility takeScreenshot bitmap null")
                                    useScreenshotManagerFallback(text, appName, pelakuIdentitas)
                                }
                            } catch (e: Exception) {
                                Log.e(TAG, "Exception in Accessibility takeScreenshot onSuccess: ${e.message}")
                                useScreenshotManagerFallback(text, appName, pelakuIdentitas)
                            }
                        }
                        override fun onFailure(errorCode: Int) {
                            Log.e(TAG, "Accessibility takeScreenshot failed with errorCode: $errorCode")
                            useScreenshotManagerFallback(text, appName, pelakuIdentitas)
                        }
                    }
                )
                return
            } catch (e: Exception) {
                Log.e(TAG, "Gagal menggunakan Accessibility takeScreenshot: ${e.message}")
            }
        }
        useScreenshotManagerFallback(text, appName, pelakuIdentitas)
    }

    private fun useScreenshotManagerFallback(text: String, appName: String, pelakuIdentitas: String) {
        ScreenshotManager.captureScreenshot(this) { path ->
            sendToFlutter(text, appName, path, pelakuIdentitas)
        }
    }

    private fun saveBitmapToFile(bitmap: Bitmap): File? {
        val cacheDir = applicationContext.cacheDir 
        val timestamp = System.currentTimeMillis()
        val file = File(cacheDir, "ss_$timestamp.jpg") 
        return try {
            val fos = FileOutputStream(file)
            bitmap.compress(Bitmap.CompressFormat.JPEG, 70, fos) 
            fos.flush()
            fos.close()
            
            // FIX: Memory Leak Prevention untuk Bitmap ARGB_8888
            bitmap.recycle() 
            
            file
        } catch (e: Exception) {
            null
        }
    }

    private fun sendToFlutter(text: String, appName: String, screenshotPath: String?, pelakuIdentitas: String) {
        if (channel == null) return
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
        val timestamp = sdf.format(Date())
        
        val data = mapOf(
            "text" to text,
            "appName" to appName,
            "timestamp" to timestamp,
            "screenshotPath" to screenshotPath,
            "pelaku_identitas" to pelakuIdentitas 
        )
        handler.post { channel?.invokeMethod("uploadIncident", data) }
    }

    // === IDENTITY EXTRACTION ===

    private fun extractPelakuIdentity(rootNode: AccessibilityNodeInfo?, packageName: String): String {
        if (rootNode == null) return "Tidak Diketahui"
        var identity = "Tidak Diketahui"
        try {
            if (packageName.contains("instagram")) {
                val nodes = rootNode.findAccessibilityNodeInfosByViewId("com.instagram.android:id/action_bar_title")
                if (nodes.isNotEmpty() && nodes[0].text != null) {
                    identity = "@" + nodes[0].text.toString()
                }
                nodes.forEach { it.recycle() }
            }
            if (packageName.contains("whatsapp")) {
                val nodes = rootNode.findAccessibilityNodeInfosByViewId("com.whatsapp:id/conversation_contact_name")
                if (nodes.isNotEmpty() && nodes[0].text != null) {
                    identity = nodes[0].text.toString()
                }
                nodes.forEach { it.recycle() }
            }
            if (packageName.contains("telegram")) {
                val nodes = rootNode.findAccessibilityNodeInfosByViewId("org.telegram.messenger:id/name")
                if (nodes.isEmpty()) {
                    val altNodes = rootNode.findAccessibilityNodeInfosByViewId("org.telegram.messenger:id/title")
                    if (altNodes.isNotEmpty() && altNodes[0].text != null) {
                        identity = altNodes[0].text.toString()
                    }
                    altNodes.forEach { it.recycle() }
                } else if (nodes[0].text != null) {
                    identity = nodes[0].text.toString()
                }
                nodes.forEach { it.recycle() }
            }
        } catch (e: Exception) { }
        return identity
    }

    // === PACKAGE CLASSIFICATION ===

    /**
     * Set khusus untuk game — di-route ke GameOcrService (OCR pipeline).
     */
    private val gamePackages = setOf(
        "com.roblox.client",
        "com.dts.freefireth", "com.dts.freefiremax",
        "com.mobile.legends"
    )

    /**
     * Set khusus untuk messaging app — di-proses via accessibility tree.
     */
    private val messagingPackages = setOf(
        "com.whatsapp", "com.whatsapp.w4b",
        "com.instagram.android", "com.facebook.orca",
        "org.telegram.messenger", "org.telegram.plus"
    )

    private fun isGamePackage(packageName: String): Boolean {
        return packageName in gamePackages
    }

    private fun isMonitoredMessagingPackage(packageName: String): Boolean {
        return packageName in messagingPackages
    }

    private fun isMonitoredPackage(packageName: String): Boolean {
        return packageName in messagingPackages || packageName in gamePackages
    }
    
    private fun mapPackageToAppName(packageName: String): String {
        return when (packageName) {
            "com.whatsapp" -> "whatsapp"
            "com.whatsapp.w4b" -> "whatsapp_business"
            "com.instagram.android" -> "instagram"
            "com.facebook.orca" -> "messenger"
            "org.telegram.messenger", "org.telegram.plus" -> "telegram"
            "com.roblox.client" -> "roblox"
            "com.dts.freefireth", "com.dts.freefiremax" -> "free_fire"
            "com.mobile.legends" -> "mobile_legends"
            else -> packageName
        }
    }

    // === LIFECYCLE ===

    override fun onInterrupt() {
        scanRunnable?.let { handler.removeCallbacks(it) }
        recentTexts.clear()
        stopScreenCapture()
    }

    private fun stopScreenCapture() {
        virtualDisplay?.release()
        imageReader?.close()
        mediaProjection?.stop()
        mediaProjection = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        val flutterEngine = FlutterEngineCache.getInstance().get("main_flutter_engine")
        if (flutterEngine != null) {
            channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.example.agent_app/service")
        }
        
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        displayMetrics = DisplayMetrics()
        windowManager?.defaultDisplay?.getMetrics(displayMetrics)
        mediaProjectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        
        val resultData = ScreenshotManager.mediaProjectionResultData
        if (resultData != null) {
            try {
                mediaProjection = mediaProjectionManager?.getMediaProjection(Activity.RESULT_OK, resultData)
                imageReader = ImageReader.newInstance(displayMetrics!!.widthPixels, displayMetrics!!.heightPixels, PixelFormat.RGBA_8888, 2)
                virtualDisplay = mediaProjection?.createVirtualDisplay(
                    "ScreenCapture", displayMetrics!!.widthPixels, displayMetrics!!.heightPixels, displayMetrics!!.densityDpi,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, imageReader?.surface, null, null
                )
            } catch (e: Exception) { }
        }

        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE)
        val notification: Notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("Layanan AntiGrooming Aktif")
            .setContentText("Aplikasi ini sedang memonitor chat untuk perlindungan.")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
        startForeground(NOTIFICATION_ID, notification)
        
        // Listen SEMUA package (messaging + game) agar kita bisa routing
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or 
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or 
                         AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            packageNames = (messagingPackages + gamePackages).toTypedArray()
            notificationTimeout = 100
            flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        }
        this.serviceInfo = info
    }

    override fun onDestroy() {
        super.onDestroy()
        scanRunnable?.let { handler.removeCallbacks(it) }
        recentTexts.clear()
        stopScreenCapture()
        // Hentikan GameOcrService jika masih berjalan
        handleGameBackground()
    }
}
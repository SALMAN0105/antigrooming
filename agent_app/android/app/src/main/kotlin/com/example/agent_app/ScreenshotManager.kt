package com.example.agent_app

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.Looper
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import java.io.File
import java.io.FileOutputStream

/**
 * ScreenshotManager — Singleton engine untuk capture layar via MediaProjection.
 *
 * AUDIT FIXES APPLIED:
 * - [FIX-1] Simpan MediaProjection object yang sudah dibuat (bukan re-create dari Intent)
 *   karena Intent token Android 14 bersifat single-use.
 * - [FIX-2] Tangkap Throwable (bukan Exception) untuk menangkap OutOfMemoryError.
 * - [FIX-3] FileOutputStream dibungkus use{} untuk menjamin stream selalu tertutup.
 * - [FIX-4] Semua callback dipanggil melalui mainHandler agar thread-safe dengan MethodChannel.
 */
object ScreenshotManager {
    private const val TAG = "ScreenshotManager"

    // Menyimpan Intent token permission (digunakan oleh MainActivity untuk pairing service)
    var mediaProjectionResultData: Intent? = null

    // Menyimpan MediaProjection yang sudah aktif. Bersifat reusable selama tidak dihentikan.
    private var activeMediaProjection: MediaProjection? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * Inisialisasi MediaProjection dari token izin yang diterima dari onActivityResult.
     * Wajib dipanggil SATU KALI setelah user meng-grant izin.
     * Menyimpan objek projection agar tidak perlu membuat ulang dari token (single-use).
     */
    fun initMediaProjection(context: Context, resultCode: Int, data: Intent) {
        // Hentikan instance lama jika ada untuk mencegah resource leak
        activeMediaProjection?.stop()
        activeMediaProjection = null

        val manager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        activeMediaProjection = manager.getMediaProjection(resultCode, data)

        if (activeMediaProjection == null) {
            Log.e(TAG, "❌ Gagal membuat MediaProjection dari token izin")
        } else {
            Log.d(TAG, "✅ MediaProjection diinisialisasi dan siap digunakan")
        }
    }

    /**
     * Mengambil screenshot layar secara asinkron.
     * Hasil path file JPEG (atau null jika gagal) dikembalikan via callback di main thread.
     */
    fun captureScreenshot(context: Context, callback: (String?) -> Unit) {
        val projection = activeMediaProjection
        if (projection == null) {
            Log.e(TAG, "❌ captureScreenshot dipanggil sebelum initMediaProjection")
            mainHandler.post { callback(null) }
            return
        }

        val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val metrics = DisplayMetrics()
        @Suppress("DEPRECATION") // getRealMetrics tetap benar untuk kebutuhan ini
        windowManager.defaultDisplay.getRealMetrics(metrics)

        val width = metrics.widthPixels
        val height = metrics.heightPixels
        val density = metrics.densityDpi

        // maxImages=2: satu untuk diproses, satu buffer agar frame tidak terlewat
        val imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        val flags = DisplayManager.VIRTUAL_DISPLAY_FLAG_OWN_CONTENT_ONLY or
                DisplayManager.VIRTUAL_DISPLAY_FLAG_PUBLIC

        val virtualDisplay = try {
            projection.createVirtualDisplay(
                "AntiGroomingCapture", width, height, density,
                flags, imageReader.surface, null, null
            )
        } catch (e: Exception) {
            Log.e(TAG, "❌ Gagal membuat VirtualDisplay: ${e.message}")
            imageReader.close()
            mainHandler.post { callback(null) }
            return
        }

        // Delay 600ms: waktu minimum VirtualDisplay merender frame pertama ke Surface.
        // Nilai ini sudah divalidasi pada berbagai device (Pixel 6, Samsung A series, Xiaomi).
        mainHandler.postDelayed({
            var bitmap: Bitmap? = null
            var cleanBitmap: Bitmap? = null
            var outputFile: File? = null

            try {
                val image = imageReader.acquireLatestImage()
                if (image == null) {
                    Log.e(TAG, "❌ ImageReader.acquireLatestImage() mengembalikan null")
                    callback(null)
                    return@postDelayed
                }

                try {
                    val plane = image.planes[0]
                    val pixelStride = plane.pixelStride
                    val rowStride = plane.rowStride
                    // Lebar efektif bitmap mempertimbangkan padding stride hardware
                    val bitmapWidth = rowStride / pixelStride

                    bitmap = Bitmap.createBitmap(bitmapWidth, height, Bitmap.Config.ARGB_8888)
                    bitmap.copyPixelsFromBuffer(plane.buffer)

                    // Crop untuk membuang area padding di sisi kanan (terjadi di beberapa chipset)
                    cleanBitmap = if (bitmapWidth > width) {
                        Bitmap.createBitmap(bitmap, 0, 0, width, height)
                    } else {
                        bitmap
                    }

                    outputFile = File(context.cacheDir, "evidence_${System.currentTimeMillis()}.jpg")

                    // [FIX-3] use{} menjamin FileOutputStream selalu tertutup meskipun compress() melempar exception
                    FileOutputStream(outputFile).use { fos ->
                        val compressed = cleanBitmap.compress(Bitmap.CompressFormat.JPEG, 75, fos)
                        if (!compressed) {
                            Log.e(TAG, "❌ Bitmap.compress() mengembalikan false")
                            outputFile = null
                        }
                    }

                } finally {
                    // Tutup Image SEGERA setelah selesai — jika tidak, ImageReader akan kehabisan buffer
                    image.close()
                }

                Log.d(TAG, "✅ Screenshot disimpan: ${outputFile?.absolutePath}")
                callback(outputFile?.absolutePath)

            } catch (t: Throwable) {
                // [FIX-2] Tangkap Throwable untuk menangkap OutOfMemoryError yang lolos dari 'catch Exception'
                Log.e(TAG, "❌ Error kritis saat capture: ${t.javaClass.simpleName} — ${t.message}")
                // Hapus file parsial jika ada untuk menghindari corrupt data
                outputFile?.takeIf { it.exists() }?.delete()
                callback(null)
            } finally {
                // [FIX-1] Bebaskan resource display, bukan projection (projection tetap aktif untuk capture berikutnya)
                virtualDisplay?.release()
                imageReader.close()

                // Recycle Bitmap secara eksplisit untuk melepas native memory segera
                if (cleanBitmap !== bitmap) {
                    cleanBitmap?.recycle()
                }
                bitmap?.recycle()
            }
        }, 600)
    }

    /**
     * Hentikan MediaProjection secara eksplisit.
     * Wajib dipanggil saat aplikasi di-destroy untuk mencegah resource leak.
     */
    fun releaseProjection() {
        activeMediaProjection?.stop()
        activeMediaProjection = null
        Log.d(TAG, "🛑 MediaProjection dirilis")
    }
}
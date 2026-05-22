package com.example.agent_app

import android.graphics.Bitmap
import android.util.Log
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

/**
 * OcrTextExtractor — Wrapper tipis di atas Google ML Kit Text Recognition.
 *
 * Concern: HANYA mengekstrak teks dari Bitmap. Tidak tahu tentang
 * MediaProjection, ImageReader, atau jaringan. Pure function wrapper.
 *
 * Thread Safety: ML Kit TextRecognizer secara internal thread-safe dan
 * menggunakan task queue sendiri. Fungsi ini bisa dipanggil dari coroutine
 * di Dispatchers.Default tanpa masalah.
 *
 * Memory Contract:
 * - Pemanggil WAJIB me-recycle Bitmap setelah fungsi ini selesai.
 * - Fungsi ini TIDAK akan memodifikasi atau menyimpan referensi ke Bitmap.
 */
object OcrTextExtractor {

    private const val TAG = "OcrTextExtractor"

    // Lazy-init recognizer: hanya dibuat satu kali selama lifetime proses.
    // TextRecognizerOptions.DEFAULT_OPTIONS menggunakan model on-device (latin).
    private val recognizer by lazy {
        TextRecognition.getClient(TextRecognizerOptions.Builder().build())
    }

    /**
     * Mengekstrak teks dari Bitmap menggunakan ML Kit on-device.
     *
     * @param bitmap Bitmap layar yang sudah di-capture. Tidak akan di-recycle oleh fungsi ini.
     * @return String teks yang ditemukan, atau null jika tidak ada teks / error.
     *
     * Kompleksitas: O(n) dimana n = jumlah piksel bitmap. ML Kit menjalankan
     * CNN inference secara internal, tapi kita hanya peduli bahwa ini single-shot
     * per panggilan dan tidak ada queue yang menumpuk.
     */
    suspend fun extractText(bitmap: Bitmap): String? = suspendCoroutine { continuation ->
        try {
            val inputImage = InputImage.fromBitmap(bitmap, 0)

            recognizer.process(inputImage)
                .addOnSuccessListener { visionText ->
                    val fullText = visionText.text.trim()
                    if (fullText.isNotEmpty()) {
                        Log.d(TAG, "✅ OCR berhasil: ${fullText.length} karakter ditemukan")
                        continuation.resume(fullText)
                    } else {
                        Log.d(TAG, "ℹ️ OCR selesai tapi tidak ada teks ditemukan")
                        continuation.resume(null)
                    }
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "❌ ML Kit gagal memproses: ${e.message}")
                    continuation.resume(null)
                }
        } catch (t: Throwable) {
            Log.e(TAG, "❌ Error membuat InputImage: ${t.message}")
            continuation.resume(null)
        }
    }

    /**
     * Membersihkan resource recognizer. Dipanggil saat service di-destroy.
     * Setelah close(), instance recognizer tidak bisa digunakan lagi —
     * tapi karena lazy, akses berikutnya akan membuat instance baru.
     */
    fun release() {
        try {
            recognizer.close()
            Log.d(TAG, "🛑 TextRecognizer ditutup")
        } catch (e: Exception) {
            Log.e(TAG, "Error saat menutup recognizer: ${e.message}")
        }
    }
}

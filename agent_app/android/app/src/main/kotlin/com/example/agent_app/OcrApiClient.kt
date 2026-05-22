package com.example.agent_app

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.DataOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

/**
 * OcrApiClient — Pengirim hasil OCR ke server Python (Flask/FastAPI).
 *
 * Concern: Mengirim data teks dan screenshot ke endpoint API.
 *
 * Thread Safety: Semua operasi jaringan dijalankan di Dispatchers.IO.
 */
object OcrApiClient {

    private const val TAG = "OcrApiClient"

    /**
     * Mengirim teks hasil OCR ke server AI untuk dianalisis.
     *
     * @param text Teks yang diekstrak dari screenshot game.
     * @param appName Nama aplikasi/game sumber (misal: "roblox").
     * @param deviceToken Token perangkat anak yang sudah terpair.
     * @param screenshotPath Path ke file screenshot (nullable).
     *
     * Flow:
     * 1. Kirim teks ke endpoint AI Python untuk analisis grooming.
     * 2. Jika AI mendeteksi bahaya, kirim insiden ke Laravel backend.
     */
    suspend fun analyzeAndReport(
        text: String,
        appName: String,
        deviceToken: String?,
        screenshotPath: String? = null
    ) {
        if (deviceToken == null) {
            Log.w(TAG, "⚠️ deviceToken null, skip pengiriman")
            return
        }

        withContext(Dispatchers.IO) {
            try {
                val aiResult = sendToAi(text)
                if (aiResult == null) {
                    Log.d(TAG, "ℹ️ AI tidak mendeteksi ancaman, skip")
                    deleteFile(screenshotPath)
                    return@withContext
                }

                val timestamp = generateTimestamp()
                sendIncidentToServer(
                    deviceToken = deviceToken,
                    detectedText = text,
                    appName = appName,
                    riskLevel = aiResult,
                    timestamp = timestamp,
                    pelakuIdentitas = "Pemain Game",
                    screenshotPath = screenshotPath
                )

                Log.d(TAG, "✅ Insiden game berhasil dilaporkan ke server")

            } catch (e: Exception) {
                Log.e(TAG, "❌ Gagal mengirim data: ${e.message}")
            } finally {
                deleteFile(screenshotPath)
            }
        }
    }

    /**
     * Mengirim teks ke AI Python endpoint.
     * @return risk_level string jika terdeteksi, null jika aman.
     */
    private fun sendToAi(text: String): String? {
        val url = URL(ApiConfig.AI_ENDPOINT)
        val conn = url.openConnection() as HttpURLConnection

        return try {
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Accept", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 15_000
            conn.readTimeout = 30_000

            val jsonBody = """{"text": "${escapeJson(text)}"}"""

            OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
                writer.write(jsonBody)
                writer.flush()
            }

            val responseCode = conn.responseCode
            if (responseCode == 200) {
                val responseBody = conn.inputStream.bufferedReader().use { it.readText() }

                if (responseBody.contains("\"detected\":true") || responseBody.contains("\"detected\": true")) {
                    "kritis"
                } else {
                    null
                }
            } else {
                Log.e(TAG, "AI endpoint HTTP $responseCode")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "AI request gagal: ${e.message}")
            null
        } finally {
            conn.disconnect()
        }
    }

    /**
     * Mengirim laporan insiden ke Laravel backend sebagai multipart/form-data.
     * Mendukung pengiriman screenshot sebagai file.
     */
    private fun sendIncidentToServer(
        deviceToken: String,
        detectedText: String,
        appName: String,
        riskLevel: String,
        timestamp: String,
        pelakuIdentitas: String,
        screenshotPath: String?
    ) {
        val boundary = "----Boundary${UUID.randomUUID()}"
        val url = URL(ApiConfig.INCIDENTS_ENDPOINT)
        val conn = url.openConnection() as HttpURLConnection

        try {
            conn.requestMethod = "POST"
            conn.setRequestProperty("Host", ApiConfig.HOST_HEADER)
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            conn.setRequestProperty("Accept", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 15_000
            conn.readTimeout = 30_000

            DataOutputStream(conn.outputStream).use { dos ->
                writeFormField(dos, boundary, "device_token", deviceToken)
                writeFormField(dos, boundary, "detected_text", detectedText)
                writeFormField(dos, boundary, "app_name", appName)
                writeFormField(dos, boundary, "risk_level", riskLevel)
                writeFormField(dos, boundary, "incident_timestamp", timestamp)
                writeFormField(dos, boundary, "pelaku_identitas", pelakuIdentitas)

                if (screenshotPath != null) {
                    val screenshotFile = File(screenshotPath)
                    if (screenshotFile.exists() && screenshotFile.length() > 0) {
                        writeFileField(dos, boundary, "screenshot", screenshotFile)
                    }
                }

                dos.writeBytes("--$boundary--\r\n")
                dos.flush()
            }

            val responseCode = conn.responseCode
            if (responseCode in 200..299) {
                Log.d(TAG, "✅ Insiden berhasil dikirim ke Laravel (HTTP $responseCode)")
            } else {
                val errorBody = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "no body"
                Log.e(TAG, "❌ Laravel HTTP $responseCode: $errorBody")
            }
        } finally {
            conn.disconnect()
        }
    }

    private fun writeFormField(dos: DataOutputStream, boundary: String, name: String, value: String) {
        dos.writeBytes("--$boundary\r\n")
        dos.writeBytes("Content-Disposition: form-data; name=\"$name\"\r\n")
        dos.writeBytes("Content-Type: text/plain; charset=UTF-8\r\n")
        dos.writeBytes("\r\n")
        dos.write(value.toByteArray(Charsets.UTF_8))
        dos.writeBytes("\r\n")
    }

    private fun writeFileField(dos: DataOutputStream, boundary: String, name: String, file: File) {
        val filename = "evidence_${System.currentTimeMillis()}.jpg"
        dos.writeBytes("--$boundary\r\n")
        dos.writeBytes("Content-Disposition: form-data; name=\"$name\"; filename=\"$filename\"\r\n")
        dos.writeBytes("Content-Type: image/jpeg\r\n")
        dos.writeBytes("\r\n")

        FileInputStream(file).use { fis ->
            val buffer = ByteArray(4096)
            var bytesRead: Int
            while (fis.read(buffer).also { bytesRead = it } != -1) {
                dos.write(buffer, 0, bytesRead)
            }
        }
        dos.writeBytes("\r\n")
    }

    private fun deleteFile(path: String?) {
        if (path == null) return
        try {
            val file = File(path)
            if (file.exists()) file.delete()
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting file: ${e.message}")
        }
    }

    private fun generateTimestamp(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date())
    }

    private fun escapeJson(value: String): String {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
    }
}

/**
 * Konfigurasi endpoint API. Nilai diambil dari Flutter ApiConfig yang sama.
 */
object ApiConfig {
    private const val SERVER_IP = "10.59.123.182"
    private const val PORT_PYTHON = "5000"

    const val HOST_HEADER = "antigrooming.test"
    const val AI_ENDPOINT = "http://$SERVER_IP:$PORT_PYTHON/analyze"
    const val INCIDENTS_ENDPOINT = "http://$SERVER_IP/api/incidents"
}

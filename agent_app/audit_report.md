# Laporan Audit Arsitektur Agent App (HP Anak)

## 1. Executive Summary
**Status Sistem:** 🚨 **ADA MASALAH (TIDAK SEHAT)**
Meskipun arsitektur aplikasi sudah terstruktur dengan baik untuk memisahkan tugas (AI terpisah dari logika UI, penggunaan SQLite untuk antrean offline), terdapat beberapa kerentanan **kritis** pada level native (Memory/Storage Leak) dan level logika Flutter (Race Condition & Data Churn). Aplikasi ini **belum** *Production-Ready* dan membutuhkan beberapa perbaikan sebelum dirilis, terutama karena targetnya adalah *background monitoring* di HP anak yang mungkin berspesifikasi rendah (low-end device).

---

## 2. Critical Native Errors (Kotlin)
Setelah melakukan simulasi "mental sandbox", ditemukan beberapa potensi **Memory Leak** dan **Storage Leak** yang dapat menyebabkan aplikasi mengalami *Out of Memory* (OOM) atau memenuhi memori internal:

1. **Bitmap Memory Leak (MediaProjection):**
   Di dalam fungsi `takeScreenshotAndUpload` (`ChatMonitorService.kt`), Anda membuat instance `bitmap` baru pada setiap iterasi screenshot:
   ```kotlin
   val bitmap = Bitmap.createBitmap(...)
   bitmap.copyPixelsFromBuffer(buffer)
   val file = saveBitmapToFile(bitmap)
   ```
   **Celah:** Tidak ada pemanggilan `bitmap.recycle()` setelah gambar disimpan ke file. Objek Bitmap sangat memakan memori (ARGB_8888). Jika event aktif berturut-turut, GC (Garbage Collector) akan kewalahan.
2. **AccessibilityNodeInfo Leak:**
   Objek dari Accessibility event berinteraksi melalui Binder dan wajib di-recycle.
   * Di dalam `traverseNodes()`: `node.getChild(i)` mengembalikan instance baru yang **tidak pernah di-recycle** setelah dievaluasi.
   * Di dalam `extractPelakuIdentity()`: Fungsi `findAccessibilityNodeInfosByViewId` mengembalikan list node. Node-node dalam list ini juga harus di-recycle setelah isinya dibaca.
3. **Storage/Disk Leak:**
   Fungsi `saveBitmapToFile` secara konstan menyimpan file `ss_$timestamp.jpg` ke `cacheDir`. Namun, **tidak ada mekanisme penghapusan otomatis** (cleanup) untuk file ini, baik di sisi Kotlin setelah dioper ke Flutter, maupun di sisi Flutter setelah di-upload ke server. Memori internal perangkat akan cepat penuh.

---

## 3. Flutter Logic Warnings (main.dart)
Terdapat beberapa peringatan terkait keamanan tipe data dan efisiensi HTTP Client:

1. **Storage Leak Lanjutan:**
   Seperti disebutkan di atas, di `main.dart` ketika `_sendToServer` berhasil mengirim multipart payload ke API Laravel, Anda tidak menghapus file asli secara lokal (`File(screenshotPath).deleteSync()`).
2. **Potensi Dio Connection Hang:**
   Instance `_dio` dibuat tanpa pengaturan `connectTimeout` dan `receiveTimeout`. Jika HP anak berada di area dengan jaringan internet buruk/putus-nyambung, request AI atau Laravel bisa *hang* (menggantung selamanya), menyebabkan antrean memory di sisi Dart membengkak.
3. **Type-Safety MethodChannel:**
   Data yang ditangkap dari Kotlin bertipe `Map<dynamic, dynamic>`. Meskipun menggunakan `arguments['text']`, sangat disarankan memakai casting eksplisit `as String?` atau `.toString()` untuk mencegah crash jika format data dari Native berubah atau tidak terduga.

---

## 4. Validasi Arsitektur (Ketahanan Sistem Saat Offline)
Arsitektur Resilience (SQLite v2 & Timer) memiliki **Celah Logika Kritis (Logic Bug)** yang akan merusak performa baterai dan database:

1. **Race Condition pada Timer Sinkronisasi:**
   `Timer.periodic` mengeksekusi `_syncOfflineData` setiap 30 detik tanpa peduli apakah sinkronisasi sebelumnya sudah selesai atau belum. Jika sedang memproses data banyak dan koneksi lemot (membutuhkan waktu >30 detik), *tick* berikutnya akan berjalan **tumpang tindih (overlap)** dan mengirimkan file duplikat ke server.
   * **Solusi:** Gunakan status boolean `_isSyncing` untuk memblokir Timer agar tidak tumpang tindih.
2. **Infinite Data Churn (Auto-Increment Jebol):**
   Ini adalah bug logika paling fatal pada skenario *offline*. 
   * `_syncOfflineData` memanggil `_handleIncidentPayload(rowData)`.
   * Jika HP **masih offline**, request `_dio.post` di dalam `_handleIncidentPayload` akan gagal, masuk ke blok `catch`, lalu secara otomatis menjalankan `_localDb.insert()` untuk menyimpannya sebagai **baris/ID baru** di SQLite.
   * Kemudian, eksekusi kembali ke `_syncOfflineData` dengan sukses semu, dan SQLite **menghapus baris ID lama** (`_localDb.delete`).
   * **Dampak:** Setiap 30 detik, data lama dihapus dan diciptakan ulang dengan ID baru. Pemborosan disk I/O, SQLite fragmentation, dan Auto-Increment ID akan jebol.
   * **Solusi:** `_handleIncidentPayload` seharusnya mengembalikan `Future<bool>` atau *throw error* ke luar. Jangan menaruh `_localDb.insert` di `catch` saat fungsinya dipanggil dari worker sinkronisasi.

### Kesimpulan
Kode ini **TIDAK Production-Ready**. Segera perbaiki kebocoran memori (recycle Bitmap/Node), hapus cache screenshot setelah digunakan, perbaiki *swallowed error* pada sinkronisasi offline, dan tambahkan perlindungan overlap pada Timer.

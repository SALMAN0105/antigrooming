# 🚀 Panduan Menjalankan Sistem Anti-Grooming AI

Panduan ini berisi langkah-langkah lengkap untuk menjalankan seluruh komponen microservices dalam sistem **Anti-Grooming AI** (Laravel Backend, Python Flask AI, Node.js WhatsApp Service, & React Frontend).

---

## 🛠️ Persyaratan Awal
Pastikan layanan berikut sudah aktif di aplikasi **FlyEnv / XAMPP**:
* **Apache / Nginx** (Menghubungkan ke `https://antigrooming.test/`)
* **MySQL** (Untuk database Laravel)

---

## 🏃‍♂️ Langkah-Langkah Menjalankan Service

### Langkah 1: Jalankan WhatsApp Web Service (Node.js)
Service ini mendengarkan pada port `3000` secara lokal untuk mengirim pesan notifikasi darurat ke WhatsApp orang tua.

1. Buka terminal baru dan masuk ke direktori service:
   ```bash
   cd c:\Users\salman\Documents\projek\whatsapp-service
   ```
2. Jalankan server Node.js:
   ```bash
   npm start
   ```
3. **Penting (Pertama Kali):** Pindai (Scan) QR code yang muncul di layar terminal menggunakan fitur **Perangkat Tertaut (Linked Devices)** di WhatsApp HP Anda.
4. Tunggu sampai muncul log: `✅ WhatsApp Web Client is READY!`.

---

### Langkah 2: Jalankan Service Python AI (Flask)
Service ini bertugas memproses input teks dari HP anak menggunakan kecerdasan buatan dan mengirimkan sinyal bahaya ke Laravel.

1. Buka terminal baru dan masuk ke direktori Python:
   ```bash
   cd c:\Users\salman\Documents\projek\AI-AntiGrooming\Python
   ```
2. Aktifkan Virtual Environment (jika ada):
   ```bash
   .\venv\Scripts\activate
   ```
3. Jalankan server Flask AI:
   ```bash
   python api.py
   ```
4. Server akan aktif di alamat `http://10.59.123.251:5000` (atau IP lokal Anda) dan siap dihubungi oleh HP Anak (Flutter).

---

### Langkah 3: Jalankan Kompilasi Frontend React (Vite)
Karena frontend menggunakan React + Vite, pastikan aset frontend sudah dikompilasi atau dijalankan dalam mode pengembangan (*Hot Reload*).

* **Pilihan A: Jalankan Mode Pengembangan (Sangat Direkomendasikan saat edit kode)**:
  ```bash
  cd c:\Users\salman\Documents\projek\AI-AntiGrooming
  npm run dev
  ```
* **Pilihan B: Kompilasi Aset untuk Produksi (Sudah dilakukan dan siap pakai)**:
  ```bash
  npm run build
  ```

---

## 🧪 Skrip Pengujian Mandiri

Kami telah menyediakan beberapa skrip uji coba otomatis untuk memudahkan Anda memverifikasi setiap bagian sistem secara mandiri:

### 1. Uji Coba Registrasi Akun Orang Tua (Nomor HP & WhatsApp)
Skrip ini memverifikasi bahwa pendaftaran akun baru orang tua berhasil menyimpan parameter `no_hp` ke database.
```bash
cd c:\Users\salman\Documents\projek\AI-AntiGrooming
php test_registration.php
```

### 2. Uji Coba Integrasi Laravel & WhatsApp (`test_whatsapp_alert.php`)
Skrip ini mensimulasikan panggilan dari Python AI ke Laravel dan menguji sistem *cooldown* 30 menit serta penanganan *timeout* 3 detik secara aman.
```bash
cd c:\Users\salman\Documents\projek\AI-AntiGrooming
php test_whatsapp_alert.php
```

### 3. Uji Coba Alur Endpoint AI Flask (`test_flask_route.py`)
Skrip ini mensimulasikan pengiriman teks (aman dan berbahaya) langsung ke Flask AI untuk melihat respons klasifikasi serta pemicuan sinyal darurat ke Laravel.
```bash
cd c:\Users\salman\Documents\projek\AI-AntiGrooming\Python
python test_flask_route.py
```

---

## 💡 Tips & Troubleshooting
* **Error Connection Refused di Laravel**: Pastikan Apache di FlyEnv sudah aktif dan domain `https://antigrooming.test/` dapat dibuka di browser.
* **Membatalkan Cooldown 30 Menit**: Jika sedang melakukan testing dan ingin melewati batas cooldown 30 menit, Anda dapat membersihkan cache Laravel dengan perintah:
  ```bash
  php artisan cache:clear
  ```
* **Sesi WhatsApp Terputus**: Cukup restart service Node.js (`npm start`) dan scan kembali QR Code jika diminta. Sesi Anda akan otomatis disimpan menggunakan metode `LocalAuth`.

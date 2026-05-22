<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Mail\DangerAlertMail;
use Illuminate\Support\Facades\Mail;

echo "Mulai pengujian pengiriman email...\n";

// Mengambil anak pertama
$child = App\Models\Child::with('user')->first();
if (!$child) {
    echo "Tidak ada data Anak di database. Membuat data dummy...\n";
    $user = App\Models\User::first();
    if (!$user) {
        $user = App\Models\User::create([
            'name' => 'Orang Tua Test',
            'email' => 'sasmikamika82@gmail.com',
            'password' => bcrypt('password123'),
        ]);
    }
    
    $child = App\Models\Child::create([
        'user_id' => $user->id,
        'nama' => 'Budi',
        'umur' => 12,
    ]);
}

$device = $child->devices()->first();
if (!$device) {
    echo "Tidak ada data Perangkat. Membuat dummy...\n";
    $device = App\Models\Device::create([
        'anak_id' => $child->id,
        'nama_perangkat' => 'Samsung Galaxy S21',
        'token_perangkat' => 'dummy_token_' . uniqid(),
    ]);
}

// Buat insiden uji coba
$incident = App\Models\Incident::create([
    'perangkat_id'         => $device->id,
    'waktu_insiden'        => now()->toDateTimeString(),
    'teks_terdeteksi'      => 'Halo manis, kamu lagi sendirian ya di rumah? Kirim foto kamu dong, nanti om beliin pulsa sama diamond game.',
    'nama_aplikasi'        => 'WhatsApp',
    'tingkat_risiko'       => 'kritis',
    'identitas_pelaku'     => '+62 812-3456-7890 (Akun Misterius)',
    'path_tangkapan_layar' => null,
]);

$recipient = $child->user->email ?? 'sasmikamika82@gmail.com';
echo "Mengirim email peringatan bahaya ke: " . $recipient . "\n";

try {
    Mail::to($recipient)->send(new DangerAlertMail($incident, $child));
    echo "Sukses! Email berhasil dikirim ke " . $recipient . "\n";
} catch (\Exception $e) {
    echo "Gagal mengirim email!\n";
    echo "Error: " . $e->getMessage() . "\n";
}

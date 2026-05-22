<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Api\IncidentController;
use Illuminate\Http\Request;
use App\Models\Child;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

echo "=== MEMULAI TEST NOTIFIKASI WHATSAPP DARURAT ===\n\n";

// 1. Persiapkan data uji di database
$user = User::first();
if (!$user) {
    echo "Membuat User dummy...\n";
    $user = User::create([
        'name'     => 'Orang Tua Test WA',
        'email'    => 'test_orangtua@example.com',
        'password' => bcrypt('password123'),
        'no_hp'    => '081234567890'
    ]);
} else {
    // Pastikan user pertama memiliki no_hp untuk testing
    $user->update(['no_hp' => '081234567890']);
    echo "Menggunakan User terdaftar: {$user->name} dengan No HP: {$user->no_hp}\n";
}

$child = Child::where('user_id', $user->id)->first();
if (!$child) {
    echo "Membuat Child dummy...\n";
    $child = Child::create([
        'user_id' => $user->id,
        'nama'    => 'Budi Test WA',
    ]);
} else {
    echo "Menggunakan Anak terdaftar: {$child->nama} (ID: {$child->id})\n";
}

// Hapus cache cooldown agar request pertama bisa terkirim
$cacheKey = "grooming_cooldown_{$child->id}";
Cache::forget($cacheKey);
echo "Cooldown cache dibersihkan untuk key: {$cacheKey}\n\n";

$controller = new IncidentController();

// === UJI 1: Pengiriman Pertama (Node.js mati / belum siap) ===
echo "--- UJI 1: Pengiriman pertama ketika Node.js mati/timeout ---\n";
$request1 = Request::create('/api/alert-grooming', 'POST', [
    'child_id' => $child->id,
    'evidence' => 'Halo adek manis, sendirian ya? Main yuk nanti om beliin coklat!'
]);

$start = microtime(true);
try {
    $response = $controller->handleGroomingAlert($request1);
    $duration = microtime(true) - $start;
    echo "Waktu eksekusi: " . round($duration, 2) . " detik\n";
    echo "Response Code: " . $response->getStatusCode() . "\n";
    echo "Response Content: " . $response->getContent() . "\n";
} catch (\Exception $e) {
    echo "Error Terjadi: " . $e->getMessage() . "\n";
}
echo "\n";

// === UJI 2: Pengiriman Kedua (Harus terkena Throttling / Cooldown) ===
echo "--- UJI 2: Pengiriman kedua (Harus terdeteksi Cooldown 30 Menit secara O(1)) ---\n";
// Uji 2 membutuhkan cache key terisi. Kita buat cache key terisi secara manual jika uji 1 gagal/berhasil.
// Karena uji 1 di atas pasti gagal terhubung ke Node.js (sehingga cache belum diset), kita set cache secara manual untuk simulasi cooldown.
Cache::put($cacheKey, true, 1800);
echo "Simulasi cooldown cache diisi secara manual...\n";

$request2 = Request::create('/api/alert-grooming', 'POST', [
    'child_id' => $child->id,
    'evidence' => 'Halo adek manis, sendirian ya? Main yuk nanti om beliin coklat!'
]);

$start = microtime(true);
try {
    $response = $controller->handleGroomingAlert($request2);
    $duration = microtime(true) - $start;
    echo "Waktu eksekusi (O1 Cooldown): " . round($duration, 6) . " detik\n";
    echo "Response Code: " . $response->getStatusCode() . "\n";
    echo "Response Content: " . $response->getContent() . "\n";
} catch (\Exception $e) {
    echo "Error Terjadi: " . $e->getMessage() . "\n";
}
echo "\n";

// Bersihkan cache lagi setelah selesai test
Cache::forget($cacheKey);
echo "=== SELESAI UJI COBA ===\n";

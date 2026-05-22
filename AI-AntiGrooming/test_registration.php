<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Api\ApiAuthController;
use Illuminate\Http\Request;
use App\Models\User;

echo "=== MEMULAI TEST REGISTRASI ORANG TUA DENGAN NOMOR HP ===\n\n";

$testEmail = 'parent_test_new_register@example.com';

// 1. Bersihkan data lama jika ada
User::where('email', $testEmail)->delete();

// 2. Buat Request Mock Registrasi
$controller = new ApiAuthController();
$dob = now()->subYears(25)->toDateString(); // Umur 25 tahun

$request = Request::create('/api/register', 'POST', [
    'name'          => 'Orang Tua Baru Test',
    'email'         => $testEmail,
    'password'      => 'password123',
    'no_hp'         => '085432109876',
    'date_of_birth' => $dob
]);

try {
    $response = $controller->register($request);
    echo "Response Code: " . $response->getStatusCode() . "\n";
    echo "Response Content: " . $response->getContent() . "\n\n";
    
    // 3. Verifikasi Data Tersimpan di Database
    $user = User::where('email', $testEmail)->first();
    if ($user) {
        echo "✅ USER BERHASIL DISIMPAN DI DATABASE!\n";
        echo "Nama: " . $user->name . "\n";
        echo "Email: " . $user->email . "\n";
        echo "Nomor HP / WhatsApp: " . $user->no_hp . "\n";
        echo "Tanggal Lahir: " . $user->date_of_birth . "\n";
        
        if ($user->no_hp === '085432109876') {
            echo "✅ VALIDASI NOMOR HP TERSIMPAN: SUKSES!\n";
        } else {
            echo "❌ VALIDASI NOMOR HP TERSIMPAN: GAGAL!\n";
        }
    } else {
        echo "❌ USER TIDAK DITEMUKAN DI DATABASE!\n";
    }
    
    // Hapus data uji agar database tetap bersih
    User::where('email', $testEmail)->delete();
    echo "\nData uji dibersihkan dari database.\n";
} catch (\Illuminate\Validation\ValidationException $e) {
    echo "❌ Validation Error: \n";
    print_r($e->errors());
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n=== SELESAI UJI COBA REGISTRASI ===\n";

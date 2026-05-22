<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Api\IncidentController;
use Illuminate\Http\Request;
use App\Models\Device;
use App\Models\Child;
use App\Models\User;

echo "Mulai pengujian integrasi insiden end-to-end...\n";

// 1. Dapatkan atau buat perangkat valid
$device = Device::query()->with('child.user')->first();
if (!$device) {
    echo "Tidak ada data Perangkat di database. Membuat data dummy...\n";
    $user = User::first();
    if (!$user) {
        $user = User::create([
            'name' => 'Orang Tua Test',
            'email' => 'sasmikamika82@gmail.com',
            'password' => bcrypt('password123'),
        ]);
    }
    
    $child = Child::create([
        'user_id' => $user->id,
        'nama' => 'Budi',
        'umur' => 12,
    ]);

    $device = Device::create([
        'anak_id' => $child->id,
        'nama_perangkat' => 'Samsung Galaxy S21',
        'token_perangkat' => 'test-device-token-12345',
    ]);
}

$token = $device->token_perangkat;
echo "Menggunakan Token Perangkat: " . $token . "\n";
echo "Email Orang Tua Terdaftar: " . ($device->child?->user?->email ?? 'Tidak ada') . "\n";

// 2. Buat Request Mock
$request = Request::create('/api/incidents', 'POST', [
    'device_token'       => $token,
    'detected_text'      => 'Halo adek manis, sendirian ya? Main yuk nanti om beliin coklat dan pulsa gratis!',
    'app_name'           => 'Telegram',
    'risk_level'         => 'kritis',
    'incident_timestamp' => now()->toDateTimeString(),
    'pelaku_identitas'   => 'Stranger_99',
]);

// 3. Panggil IncidentController@store
$controller = new IncidentController();

try {
    $response = $controller->store($request);
    echo "Response Code: " . $response->getStatusCode() . "\n";
    echo "Response Content: " . $response->getContent() . "\n";
} catch (\Illuminate\Validation\ValidationException $e) {
    echo "Validation Error: \n";
    print_r($e->errors());
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

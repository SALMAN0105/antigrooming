<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$device = App\Models\Device::first();

$incident = App\Models\Incident::create([
    'perangkat_id'         => $device->id,
    'waktu_insiden'        => now()->toDateTimeString(),
    'teks_terdeteksi'      => 'tes mock database',
    'nama_aplikasi'        => 'mock_app',
    'tingkat_risiko'       => 'kritis',
    'identitas_pelaku'     => 'Mock User',
    'path_tangkapan_layar' => '/storage/incidents/mock_image.jpg',
]);

echo "Created ID: " . $incident->id . "\n";
$dbIncident = App\Models\Incident::find($incident->id);
echo "DB Value: " . var_export($dbIncident->path_tangkapan_layar, true) . "\n";

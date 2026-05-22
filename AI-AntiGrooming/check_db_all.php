<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$i = App\Models\Incident::find(1);
if($i) {
    echo "ID: {$i->id}\n";
    echo "Waktu Insiden: {$i->waktu_insiden}\n";
    echo "Created At: {$i->created_at}\n";
    echo "Text: {$i->teks_terdeteksi}\n";
}

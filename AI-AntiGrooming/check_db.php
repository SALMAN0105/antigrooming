<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$i = App\Models\Incident::latest('waktu_insiden')->first();
if($i) {
    echo 'ID: ' . $i->id . "\n";
    echo 'Screenshot DB Value: ' . var_export($i->path_tangkapan_layar, true) . "\n";
} else {
    echo "No incidents found\n";
}

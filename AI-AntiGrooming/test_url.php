<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$url = Illuminate\Support\Facades\Storage::url('incidents/test.jpg');
echo "URL: " . var_export($url, true) . "\n";

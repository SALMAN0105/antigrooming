<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

file_put_contents('dummy.jpg', 'fake image content');

use App\Http\Controllers\Api\IncidentController;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

// Let's create a fake valid image so it passes "image" and "mimes:jpeg,png,jpg" validation.
// Wait, 'fake image content' will fail Laravel's image validation!
// Laravel uses finfo to check mime type. A text file pretending to be jpg will fail!
// Let's create a real 1x1 jpeg image.
$jpegHex = 'ffd8ffe000104a46494600010101004800480000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232c00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00f928a28afcff3f';
file_put_contents('dummy.jpg', hex2bin($jpegHex));

$file = new UploadedFile('dummy.jpg', 'dummy.jpg', 'image/jpeg', null, true);

$request = Request::create('/api/incidents', 'POST', [
    'device_token'       => App\Models\Device::first()->token_perangkat,
    'detected_text'      => 'tes bahasa indonesia',
    'app_name'           => 'whatsapp',
    'risk_level'         => 'kritis',
    'incident_timestamp' => now()->toDateTimeString(),
    'pelaku_identitas'   => 'Orang Asing',
], [], ['screenshot' => $file]);

$controller = new IncidentController();
try {
    $response = $controller->store($request);
    echo 'Response Code: ' . $response->getStatusCode() . "\n";
    echo 'Response Content: ' . $response->getContent() . "\n";
} catch (\Illuminate\Validation\ValidationException $e) {
    echo "Validation Error: \n";
    print_r($e->errors());
} catch (\Exception $e) {
    echo 'Error: ' . $e->getMessage() . "\n";
}

$i = App\Models\Incident::latest('waktu_insiden')->first();
echo "Latest Screenshot: " . var_export($i->path_tangkapan_layar, true) . "\n";

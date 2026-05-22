<?php

use App\Http\Controllers\Api\IncidentController;
use Illuminate\Http\Request;

// Create an instance of the controller
$controller = new IncidentController();

// Simulate a request from the Flutter app
$request = Request::create('/api/incidents', 'POST', [
    'device_token'       => 'd1555298-756f-4f82-9de3-3c598c64813d',
    'detected_text'      => 'tes bahasa indonesia',
    'app_name'           => 'whatsapp',
    'risk_level'         => 'kritis',
    'incident_timestamp' => now()->toDateTimeString(),
    'pelaku_identitas'   => 'Orang Asing',
]);

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

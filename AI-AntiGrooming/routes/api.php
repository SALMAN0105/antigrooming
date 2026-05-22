<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ApiAuthController;
use App\Http\Controllers\Api\PairingController;
use App\Http\Controllers\Api\IncidentController;

// Rute Publik
Route::post('/register', [ApiAuthController::class, 'register']);
Route::post('/login', [ApiAuthController::class, 'login']);
Route::post('/incidents', [IncidentController::class, 'store']); // HP Anak menembak ke sini, tidak pakai token Sanctum karena pakai UUID
Route::get('/device/status/{token}', [\App\Http\Controllers\Api\PairingController::class, 'checkStatus']);
Route::post('/device/pair-with-qrcode', [PairingController::class, 'pairWithQrCode']);

// Rute Terlindungi (Aplikasi Orang Tua dengan Bearer Token)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [ApiAuthController::class, 'logout']);
    Route::get('/user', function (Request $request) { return $request->user(); });
    
    // Rute Operasional Orang Tua
    Route::get('/dashboard/stats', [\App\Http\Controllers\Api\DashboardController::class, 'stats']);
    Route::get('/children', [PairingController::class, 'index']);
    Route::post('/device/pair', [PairingController::class, 'pairDevice']);
    Route::post('/pairing-code/generate', [PairingController::class, 'generatePairingCode']);
    Route::get('/incidents', [IncidentController::class, 'index']);
    Route::get('/incidents/{id}', [IncidentController::class, 'show']);
});
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\Device;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PairingController extends Controller
{
    public function pairDevice(Request $request)
    {
        $validated = $request->validate([
            'child_name'   => 'required|string|max:255',
            'device_token' => 'required|string|max:255', 
        ]);

        DB::beginTransaction();
        
        try {
            $child = Child::firstOrCreate([
                'user_id' => $request->user()->id,
                'nama'    => $validated['child_name'],
            ]);

            $device = Device::firstOrCreate(
                ['token_perangkat' => $validated['device_token']],
                ['anak_id'         => $child->id]
            );

            if ($device->anak_id !== $child->id) {
                $device->update(['anak_id' => $child->id]);
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Perangkat anak berhasil dihubungkan.',
                'data'    => [
                    'child_id'  => $child->id,
                    'device_id' => $device->id
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Pairing failed: ' . $e->getMessage());
            
            return response()->json([
                'status'  => 'error',
                'message' => 'Terjadi kesalahan sistem saat melakukan pairing.'
            ], 500);
        }
    }

    public function checkStatus($token)
    {
        $isPaired = Device::query()->where('token_perangkat', $token)->exists();
        
        return response()->json([
            'status' => $isPaired ? 'paired' : 'waiting'
        ]);
    }

    public function generatePairingCode(Request $request)
    {
        $validated = $request->validate([
            'child_name' => 'required|string|max:255',
        ]);

        $child = Child::firstOrCreate(
            ['user_id' => $request->user()->id, 'nama' => $validated['child_name']],
            ['token_pairing' => bin2hex(random_bytes(16))]
        );

        if (!$child->token_pairing) {
            $child->update(['token_pairing' => bin2hex(random_bytes(16))]);
        }

        return response()->json([
            'status' => 'success',
            'pairing_token' => $child->token_pairing,
            'child_id' => $child->id,
            'expires_in' => null,
        ]);
    }

    public function pairWithQrCode(Request $request)
    {
        $validated = $request->validate([
            'token_qr'     => 'required|string',
            'device_token' => 'required|string|max:255',
        ]);

        $pairingCode = \App\Models\PairingCode::where('token', $validated['token_qr'])
            ->where('kadaluarsa_pada', '>', now())
            ->first();

        DB::beginTransaction();
        try {
            if ($pairingCode) {
                $child = Child::firstOrCreate([
                    'user_id' => $pairingCode->user_id,
                    'nama'    => $pairingCode->nama_anak,
                ]);
                $pairingCode->delete();
            } else {
                $child = Child::where('token_pairing', $validated['token_qr'])->first();
            }

            if (!$child) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'QR Code tidak valid atau sudah kadaluarsa.'
                ], 400);
            }

            $device = Device::updateOrCreate(
                ['token_perangkat' => $validated['device_token']],
                ['anak_id'         => $child->id]
            );

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Perangkat anak berhasil dihubungkan.',
                'data'    => [
                    'child_id'  => $child->id,
                    'device_id' => $device->id
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('QR Pairing failed: ' . $e->getMessage());
            
            return response()->json([
                'status'  => 'error',
                'message' => 'Terjadi kesalahan sistem saat melakukan pairing.'
            ], 500);
        }
    }

    /**
     * Menampilkan daftar anak dan perangkatnya
     */
    public function index(Request $request)
    {
        $children = $request->user()->children()->with('devices')->get();

        return response()->json([
            'status' => 'success',
            'data'   => $children
        ]);
    }
}
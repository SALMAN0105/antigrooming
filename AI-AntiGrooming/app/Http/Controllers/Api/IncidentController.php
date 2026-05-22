<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use App\Models\Device;
use App\Models\Child;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use App\Mail\DangerAlertMail;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

class IncidentController extends Controller
{
    /**
     * Endpoint untuk HP Orang Tua mengambil daftar insiden
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $deviceIds = $user->devices()->pluck('perangkat.id');

        $incidents = Incident::query()->whereIn('perangkat_id', $deviceIds)
                            ->with('device.child')
                            ->latest('waktu_insiden')
                            ->paginate(20);

        return response()->json([
            'status' => 'success',
            'data'   => $incidents
        ]);
    }

    /**
     * Endpoint untuk HP Anak mengirim bukti grooming
     */
    public function store(Request $request)
    {
        $request->validate([
            'device_token'       => 'required|exists:perangkat,token_perangkat',
            'detected_text'      => 'required|string',
            'app_name'           => 'required|string',
            'risk_level'         => 'required|in:kritis',
            'incident_timestamp' => 'required|date',
            'pelaku_identitas'   => 'nullable|string',
            'screenshot'         => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        try {
            $device = Device::query()->with('child.user')->where('token_perangkat', $request->device_token)->firstOrFail();
            $screenshotPath = null;

            if ($request->hasFile('screenshot')) {
                $file = $request->file('screenshot');
                $filename = time() . '_' . uniqid() . '.' . $file->extension();
                $screenshotPath = $file->storeAs('incidents', $filename, 'public');
            }

            $incident = Incident::create([
                'perangkat_id'         => $device->id,
                'waktu_insiden'        => $request->incident_timestamp,
                'teks_terdeteksi'      => $request->detected_text,
                'nama_aplikasi'        => $request->app_name,
                'tingkat_risiko'       => $request->risk_level,
                'identitas_pelaku'     => $request->pelaku_identitas ?? 'Tidak Diketahui',
                'path_tangkapan_layar' => $screenshotPath ? Storage::url($screenshotPath) : null,
            ]);

            $parentUser = $device->child?->user;
            if ($parentUser) {
                if ($parentUser->fcm_token) {
                    $this->sendFcmNotification(
                        $parentUser->fcm_token, 
                        $device->child->nama, 
                        $request->app_name, 
                        $incident->identitas_pelaku
                    );
                }

                if ($parentUser->email) {
                    try {
                        Mail::to($parentUser->email)->send(new DangerAlertMail($incident, $device->child));
                    } catch (\Exception $e) {
                        Log::error('Gagal mengirim email notifikasi bahaya: ' . $e->getMessage());
                    }
                }
            }

            return response()->json([
                'status'  => 'success', 
                'message' => 'Insiden dicatat dan Notifikasi terkirim.'
            ], 201);

        } catch (\Exception $e) {
            Log::error('Incident failed: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error', 
                'message' => 'Gagal memproses sistem.'
            ], 500);
        }
    }

    /**
     * Endpoint untuk mendapatkan detail satu insiden
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $deviceIds = $user->devices()->pluck('perangkat.id');

        $incident = Incident::query()
            ->whereIn('perangkat_id', $deviceIds)
            ->with('device.child')
            ->find($id);

        if (!$incident) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Insiden tidak ditemukan atau Anda tidak memiliki akses.'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $incident
        ]);
    }

    private function sendFcmNotification($fcmToken, $childName, $appName, $pelaku)
    {
        try {
            $factory = (new Factory)->withServiceAccount(storage_path('app/firebase_credentials.json'));
            $messaging = $factory->createMessaging();

            $title = "⚠️ Bahaya pada perangkat $childName!";
            $body = "Terdeteksi obrolan grooming dengan $pelaku di aplikasi $appName.";

            $message = CloudMessage::withTarget('token', $fcmToken)
                ->withNotification(Notification::create($title, $body));

            $messaging->send($message);
        } catch (\Exception $e) {
            Log::error('FCM Error: ' . $e->getMessage());
        }
    }

    /**
     * Endpoint untuk memicu notifikasi WhatsApp Darurat dari deteksi AI Python
     */
    public function handleGroomingAlert(Request $request)
    {
        $request->validate([
            'child_id' => 'required|exists:anak,id',
            'evidence' => 'required|string',
        ]);

        $childId = $request->input('child_id');
        $evidence = $request->input('evidence');

        // Throttling/Cooldown: 30 menit per anak
        $cacheKey = "grooming_cooldown_{$childId}";
        if (Cache::has($cacheKey)) {
            Log::info("WhatsApp alert ignored due to cooldown for child: {$childId}");
            return response()->json([
                'status'  => 'ignored',
                'message' => 'Notifikasi WhatsApp sedang dalam masa cooldown (30 menit).'
            ]);
        }

        // Query O(1) untuk mengambil anak beserta user (orang tua)
        $child = Child::with('user')->find($childId);

        if (!$child || !$child->user || !$child->user->no_hp) {
            Log::warning("Gagal mengirim WhatsApp alert: orang tua tidak ditemukan atau nomor HP kosong untuk child ID: {$childId}");
            return response()->json([
                'status'  => 'error',
                'message' => 'Data orang tua atau nomor HP tidak terdaftar.'
            ], 404);
        }

        $parentPhone = $child->user->no_hp;
        $childName = $child->nama;

        // Siapkan pesan notifikasi
        $message = "⚠️ *PERINGATAN DETEKSI GROOMING (ANTI-GROOMING)* ⚠️\n\n" .
                   "Sistem kami mendeteksi obrolan berbahaya pada perangkat anak Anda (*{$childName}*).\n\n" .
                   "*Detail Percakapan:* \n\"{$evidence}\"\n\n" .
                   "Mohon segera periksa perangkat anak Anda untuk memastikan keselamatannya.";

        try {
            // Mengirim HTTP request ke service Node.js lokal dengan timeout 3 detik
            $response = Http::timeout(3)->post('http://localhost:3000/kirim-wa', [
                'nomor' => $parentPhone,
                'pesan' => $message,
            ]);

            if ($response->successful()) {
                // Set cache cooldown selama 30 menit
                Cache::put($cacheKey, true, now()->addMinutes(30));
                
                Log::info("WhatsApp alert successfully sent for child: {$childId} to {$parentPhone}");
                return response()->json([
                    'status'  => 'success',
                    'message' => 'Notifikasi WhatsApp berhasil dikirim.'
                ]);
            } else {
                Log::error("Node.js WhatsApp service returned failure: " . $response->body());
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Gagal mengirim notifikasi via Node.js service.'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error("Gagal terhubung ke service WhatsApp Node.js: " . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal terhubung ke service WhatsApp Node.js (Timeout/Koneksi terputus).'
            ], 500);
        }
    }
}
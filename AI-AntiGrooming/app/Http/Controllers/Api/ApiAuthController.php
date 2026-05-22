<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ApiAuthController extends Controller
{
    public function register(Request $request)
    {
        $minDate = now()->subYears(18)->toDateString();

        $request->validate([
            'name'          => 'required|string|max:255',
            'email'         => 'required|string|email|max:255|unique:users',
            'password'      => 'required|string|min:8',
            'no_hp'         => 'required|string|max:20',
            'date_of_birth' => 'required|date|before_or_equal:' . $minDate,
            'fcm_token'     => 'nullable|string',
        ], [
            'no_hp.required'                => 'Nomor HP/WhatsApp wajib diisi.',
            'date_of_birth.required'        => 'Tanggal lahir wajib diisi.',
            'date_of_birth.date'            => 'Format tanggal lahir tidak valid.',
            'date_of_birth.before_or_equal' => 'Anda harus berumur minimal 18 tahun untuk mendaftar.',
        ]);

        $user = User::create([
            'name'          => $request->name,
            'email'         => $request->email,
            'password'      => Hash::make($request->password),
            'no_hp'         => $request->no_hp,
            'date_of_birth' => $request->date_of_birth,
            'fcm_token'     => $request->fcm_token,
        ]);

        $token = $user->createToken('parent_mobile_app')->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Registrasi berhasil',
            'data'    => [
                'user'         => $user,
                'access_token' => $token,
            ]
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'fcm_token' => 'nullable|string' // Menerima token dari HP orang tua
        ]);
        
        $user = User::query()->where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kredensial tidak valid.'
            ], 401);
        }

        // Update fcm_token jika ada device baru yang login
        if ($request->filled('fcm_token')) {
            $user->update(['fcm_token' => $request->fcm_token]);
        }

        // Hapus token lama (opsional, jika ingin 1 akun 1 HP saja)
        // $user->tokens()->delete(); 

        // Generate Token Sanctum baru
        $token = $user->createToken('parent_mobile_app')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login berhasil',
            'data' => [
                'user' => $user,
                'access_token' => $token,
            ]
        ], 200);
    }

    public function logout(Request $request)
    {
        /** @var \Laravel\Sanctum\PersonalAccessToken $token */
        $token = $request->user()->currentAccessToken();
        $token->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Logout berhasil'
        ], 200);
    }
}
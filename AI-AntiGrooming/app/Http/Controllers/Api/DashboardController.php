<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Child;
use App\Models\Incident;

class DashboardController extends Controller
{
    /**
     * Mengambil statistik untuk dashboard orang tua.
     * Fitur 1: Menghitung total anak dari tabel anak (pendaftaran permanen).
     */
    public function stats(Request $request)
    {
        $user = $request->user();

        $totalChildren = $user->children()->count();

        $deviceIds = $user->devices()->pluck('perangkat.id');

        $totalIncidents = Incident::whereIn('perangkat_id', $deviceIds)->count();

        $incidentsToday = Incident::whereIn('perangkat_id', $deviceIds)
            ->whereDate('waktu_insiden', now()->toDateString())
            ->count();

        $recentIncidents = Incident::whereIn('perangkat_id', $deviceIds)
            ->with('device.child')
            ->latest('waktu_insiden')
            ->take(5)
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'total_children'   => $totalChildren,
                'total_incidents'  => $totalIncidents,
                'incidents_today'  => $incidentsToday,
                'recent_incidents' => $recentIncidents
            ]
        ]);
    }
}

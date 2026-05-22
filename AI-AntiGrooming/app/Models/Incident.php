<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Incident extends Model
{
    use HasFactory;

    protected $table = 'insiden';

    protected $fillable = [
        'perangkat_id',
        'waktu_insiden',
        'teks_terdeteksi',
        'nama_aplikasi',
        'tingkat_risiko',
        'identitas_pelaku',
        'path_tangkapan_layar',
    ];

    protected $casts = [
        'waktu_insiden' => 'datetime',
    ];

    // Relasi: 1 Incident terjadi di 1 Device
    public function device()
    {
        return $this->belongsTo(Device::class, 'perangkat_id');
    }
}
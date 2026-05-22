<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PairingCode extends Model
{
    use HasFactory;

    protected $table = 'kode_pairing';

    protected $fillable = [
        'user_id',
        'nama_anak',
        'token',
        'kadaluarsa_pada',
    ];

    protected $casts = [
        'kadaluarsa_pada' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

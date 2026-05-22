<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Device extends Model
{
    use HasFactory;

    protected $table = 'perangkat';

    protected $fillable = [
        'anak_id',
        'token_perangkat',
    ];

    // Relasi: 1 Device dimiliki 1 Child
    public function child()
    {
        return $this->belongsTo(Child::class, 'anak_id');
    }

    // Relasi: 1 Device punya banyak Incident
    public function incidents()
    {
        return $this->hasMany(Incident::class, 'perangkat_id');
    }
}
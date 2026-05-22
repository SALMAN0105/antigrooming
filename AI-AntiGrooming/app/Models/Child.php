<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Child extends Model
{
    use HasFactory;

    protected $table = 'anak';

    protected $fillable = [
        'user_id',
        'nama',
        'token_pairing',
    ];

    // Relasi: 1 Child dimiliki 1 User
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Relasi: 1 Child punya banyak Device
    public function devices()
    {
        return $this->hasMany(Device::class, 'anak_id');
    }
}
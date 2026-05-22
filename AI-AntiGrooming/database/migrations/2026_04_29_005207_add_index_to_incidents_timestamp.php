<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('insiden', function (Blueprint $table) {
            // Membuat B-Tree Index untuk performa pengurutan ->latest() O(log N)
            $table->index('waktu_insiden');
        });
    }

    public function down(): void
    {
        Schema::table('insiden', function (Blueprint $table) {
            $table->dropIndex(['waktu_insiden']);
        });
    }
};
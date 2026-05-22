<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('insiden', function (Blueprint $table) {
            $table->string('identitas_pelaku')->nullable()->after('nama_aplikasi');
        });
    }

    public function down(): void
    {
        Schema::table('insiden', function (Blueprint $table) {
            $table->dropColumn('identitas_pelaku');
        });
    }
};

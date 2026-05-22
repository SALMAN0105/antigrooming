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
        Schema::create('insiden', function (Blueprint $table) {
            $table->id();
            // Ini adalah Foreign Key ke tabel 'perangkat'
            $table->foreignId('perangkat_id')->constrained('perangkat')->onDelete('cascade');
            
            // Waktu kapan insiden ini terdeteksi di HP anak
            $table->timestamp('waktu_insiden'); 
            
            // Teks yang terdeteksi, pakai 'text' karena bisa sangat panjang
            $table->text('teks_terdeteksi'); 
            
            // Nama aplikasi (misal: "WhatsApp", "Instagram DM")
            $table->string('nama_aplikasi'); 
            
            // Sebaiknya pakai ENUM untuk level risiko
            $table->enum('tingkat_risiko', ['rendah', 'sedang', 'tinggi', 'kritis']); 
            
            // Path ke file screenshot, nullable jika gagal ambil
            $table->string('path_tangkapan_layar')->nullable(); 
            
            // Ini (created_at) adalah waktu kapan data masuk ke database kita
            $table->timestamps(); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('insiden');
    }
};
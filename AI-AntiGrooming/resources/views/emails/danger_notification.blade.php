<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PERINGATAN BAHAYA: Deteksi Grooming Kritis</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 30px 15px;">
        <tr>
            <td align="center">
                <!-- Wrapper -->
                <table width="100%" max-width="600px" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #ef4444; box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.3);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 30px; background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);">
                            <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 8px 16px; border-radius: 20px; color: #ffffff; font-size: 12px; font-weight: bold; letter-spacing: 1px; margin-bottom: 15px; text-transform: uppercase;">Sistem Anti-Grooming AI</span>
                            <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3;">⚠️ DETEKSI BAHAYA KRITIS</h1>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                                Halo Orang Tua Tangguh, <br>
                                Sistem kecerdasan buatan kami baru saja mendeteksi adanya **bahaya interaksi kritis** (indikasi grooming) pada perangkat anak Anda. Kami menyarankan Anda segera memeriksa aktivitas anak untuk tindakan pencegahan.
                            </p>

                            <!-- Alert Card / Summary -->
                            <table width="100%" style="border-collapse: collapse; background-color: #0f172a; border-radius: 12px; margin-bottom: 28px; border: 1px solid #334155;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="color: #ef4444; font-size: 16px; font-weight: 700; margin: 0 0 16px 0; border-bottom: 1px solid #334155; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Detail Laporan Insiden</h3>
                                        
                                        <table width="100%" style="border-collapse: collapse; font-size: 14px;">
                                            <tr>
                                                <td width="35%" style="color: #64748b; padding: 6px 0; font-weight: 600;">Nama Anak:</td>
                                                <td style="color: #f1f5f9; padding: 6px 0; font-weight: 700;">{{ $child->nama }}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; padding: 6px 0; font-weight: 600;">Aplikasi:</td>
                                                <td style="color: #38bdf8; padding: 6px 0; font-weight: bold;">{{ $incident->nama_aplikasi }}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; padding: 6px 0; font-weight: 600;">Tingkat Risiko:</td>
                                                <td style="padding: 6px 0;"><span style="background-color: #ef4444; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px; text-transform: uppercase;">{{ $incident->tingkat_risiko }}</span></td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; padding: 6px 0; font-weight: 600;">Dugaan Pelaku:</td>
                                                <td style="color: #f43f5e; padding: 6px 0; font-weight: bold;">{{ $incident->identitas_pelaku }}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; padding: 6px 0; font-weight: 600;">Waktu Kejadian:</td>
                                                <td style="color: #f1f5f9; padding: 6px 0;">{{ \Carbon\Carbon::parse($incident->waktu_insiden)->setTimezone('Asia/Jakarta')->format('d M Y - H:i:s') }} WIB</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Highlighted Detected Text -->
                            <h3 style="color: #f1f5f9; font-size: 15px; font-weight: 600; margin: 0 0 10px 0;">Teks Percakapan Terdeteksi:</h3>
                            <div style="background-color: #0f172a; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 28px; border-top: 1px solid #334155; border-right: 1px solid #334155; border-bottom: 1px solid #334155;">
                                <p style="color: #fca5a5; font-size: 14px; font-style: italic; line-height: 1.6; margin: 0; font-family: 'Courier New', Courier, monospace; font-weight: 600; word-break: break-word;">
                                    "{{ $incident->teks_terdeteksi }}"
                                </p>
                            </div>

                            @if($incident->path_tangkapan_layar)
                                <!-- Screenshot Section -->
                                <h3 style="color: #f1f5f9; font-size: 15px; font-weight: 600; margin: 0 0 10px 0;">Bukti Tangkapan Layar:</h3>
                                <div style="margin-bottom: 28px; border: 1px solid #334155; border-radius: 8px; overflow: hidden; background-color: #0f172a; text-align: center; padding: 10px;">
                                    <img src="{{ url($incident->path_tangkapan_layar) }}" alt="Tangkapan Layar Bukti" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #334155;" />
                                </div>
                            @endif

                            <!-- Advice Card -->
                            <table width="100%" style="border-collapse: collapse; background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(153, 27, 27, 0.1) 100%); border-radius: 12px; border: 1px dashed rgba(239, 68, 68, 0.4); margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h4 style="color: #f1f5f9; font-size: 14px; font-weight: 700; margin: 0 0 8px 0; text-transform: uppercase;">💡 Rekomendasi Tindakan Cepat:</h4>
                                        <ul style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0; padding-left: 20px;">
                                            <li style="margin-bottom: 6px;">Buka aplikasi **Parenting Control AI-AntiGrooming** di smartphone Anda untuk melihat histori detail.</li>
                                            <li style="margin-bottom: 6px;">Bicaralah secara tenang dengan anak Anda mengenai obrolan tersebut.</li>
                                            <li style="margin-bottom: 6px;">Lakukan pembatasan atau pemblokiran kontak yang mencurigakan bila diperlukan.</li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>

                            <!-- Footer CTA -->
                            <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0; text-align: center; border-top: 1px solid #334155; padding-top: 20px;">
                                Pesan ini dikirim secara otomatis oleh sistem keamanan AI-AntiGrooming. Jangan membalas email ini secara langsung. Jika Anda memerlukan bantuan lebih lanjut, silakan hubungi tim dukungan kami.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

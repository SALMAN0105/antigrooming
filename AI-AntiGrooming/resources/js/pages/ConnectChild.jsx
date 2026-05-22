import React, { useState } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { 
    QrCode, Smartphone, CheckCircle, Loader2, 
    ArrowRight, ShieldCheck, HelpCircle, RefreshCcw, Info 
} from 'lucide-react';

import LoadingScreen from '../components/LoadingScreen';

export default function ConnectChild() {
    const [childName, setChildName] = useState('');
    const [qrToken, setQrToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generateQR = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/pairing-code/generate', {
                child_name: childName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.pairing_token) {
                setQrToken(response.data.pairing_token);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal membuat QR Code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hubungkan Perangkat Baru</h2>
                <p className="text-slate-500 text-lg">Ikuti langkah sederhana ini untuk mulai melindungi anak Anda.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                    {/* Left: Input & Instructions */}
                    <div className="p-6 lg:p-14 space-y-10">
                        <div className="space-y-6">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-inner shadow-indigo-100/50">
                                <Smartphone className="h-8 w-8 text-indigo-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Identifikasi Perangkat</h3>
                                <p className="text-slate-500 leading-relaxed font-medium">
                                    Berikan nama panggilan untuk perangkat anak Anda agar mudah dikenali di dashboard.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={generateQR} className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Nama Panggilan Anak</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <ShieldCheck className="h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all text-slate-900 font-bold placeholder:text-slate-300"
                                        placeholder="Misal: Budi, Kakak, atau HP Anak"
                                        value={childName}
                                        onChange={(e) => setChildName(e.target.value)}
                                        disabled={qrToken !== null}
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 ml-1">
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>Nama ini hanya akan tampil pada dashboard orang tua.</span>
                                </div>
                            </div>
                            
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold animate-in shake duration-500 flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 flex-shrink-0 rotate-180" />
                                    {error}
                                </div>
                            )}

                            {!qrToken ? (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group w-full flex justify-center items-center py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all hover:shadow-2xl hover:shadow-indigo-200 hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0"
                                >
                                    {loading ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <>
                                            Lanjutkan ke QR Code
                                            <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => { setQrToken(null); setChildName(''); }}
                                    className="group w-full flex justify-center items-center py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all active:scale-95 border-2 border-transparent hover:border-slate-200"
                                >
                                    <RefreshCcw className="h-5 w-5 mr-2 transition-transform group-hover:rotate-180 duration-500" />
                                    Ganti Nama / Buat Ulang
                                </button>
                            )}
                        </form>
                    </div>

                    {/* Right: QR Code Visualization */}
                    <div className="p-6 lg:p-14 bg-slate-50/50 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 -z-10 opacity-30">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-200 rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-1000"></div>
                        </div>

                        {qrToken ? (
                            <div className="flex flex-col items-center animate-in zoom-in slide-in-from-top-8 duration-700 space-y-10 text-center">
                                <div className="relative">
                                    {/* Glowing Aura */}
                                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-125 animate-pulse"></div>
                                    
                                    <div className="bg-white p-6 rounded-[2rem] shadow-2xl shadow-indigo-200 border-4 border-white relative z-10 transition-transform hover:scale-105 duration-500">
                                        <QRCodeSVG 
                                            value={qrToken} 
                                            size={220} 
                                            level="H" 
                                            includeMargin={true} 
                                            fgColor="#1e1b4b"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 max-w-xs">
                                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-black bg-emerald-50 px-6 py-2.5 rounded-2xl text-sm border border-emerald-100 shadow-sm animate-bounce">
                                        <CheckCircle className="w-5 h-5" />
                                        QR SIAP
                                    </div>
                                    <p className="text-slate-500 text-sm font-medium leading-relaxed italic">
                                        Buka aplikasi <strong>AntiGrooming Anak</strong> dan arahkan kamera ke kode di atas.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center space-y-6">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-slate-200/50 blur-2xl rounded-full group-hover:bg-indigo-100 transition-colors duration-500"></div>
                                    <div className="w-56 h-56 border-4 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center bg-white relative z-10 group-hover:border-indigo-100 transition-all duration-500 shadow-inner">
                                        <QrCode className="w-20 h-20 text-slate-200 group-hover:text-indigo-100 transition-colors duration-500" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-lg font-bold text-slate-400">Menunggu Input...</h4>
                                    <p className="text-sm text-slate-400 px-10 leading-relaxed font-medium">
                                        Isi nama anak Anda di sebelah kiri terlebih dahulu untuk melihat kode unik.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hint Section */}
            <div className="bg-indigo-900 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden group shadow-xl shadow-indigo-100">
                <div className="absolute top-0 right-0 w-64 h-full bg-white/5 skew-x-12 transform group-hover:translate-x-20 transition-transform duration-1000"></div>
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 text-center md:text-left">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                        <Info className="h-7 w-7" />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold mb-1 tracking-tight">Tips Keamanan</h4>
                        <p className="text-indigo-200 font-medium">Pastikan anak Anda tahu bahwa sistem ini dipasang untuk melindunginya dari ancaman orang asing di dunia maya.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}


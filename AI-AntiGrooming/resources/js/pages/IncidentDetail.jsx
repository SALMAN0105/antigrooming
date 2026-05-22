import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    ChevronLeft, ShieldAlert, Calendar, User, Smartphone, 
    MessageSquare, Image as ImageIcon, Loader2, AlertCircle,
    Info, Download, Share2
} from 'lucide-react';

import LoadingScreen from '../components/LoadingScreen';

export default function IncidentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [incident, setIncident] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`/api/incidents/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIncident(response.data.data);
            } catch (error) {
                console.error("Failed to fetch incident detail:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    if (loading) {
        return <LoadingScreen message="Menganalisis bukti & detail insiden..." />;
    }

    if (!incident) {
        return (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Insiden Tidak Ditemukan</h3>
                <p className="text-slate-500 mb-8">Data yang Anda cari mungkin telah dihapus atau tidak tersedia.</p>
                <button 
                    onClick={() => navigate('/dashboard')} 
                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all hover:shadow-lg hover:shadow-indigo-100 active:scale-95"
                >
                    Kembali ke Dashboard
                </button>
            </div>
        );
    }

    const getRiskColor = () => 'bg-red-500 text-white shadow-red-200';

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Top Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button 
                    onClick={() => navigate(-1)}
                    className="group flex items-center text-slate-500 hover:text-slate-900 transition-all font-semibold"
                >
                    <div className="p-2 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all mr-2">
                        <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                    </div>
                    Kembali ke Riwayat
                </button>
                <div className="flex items-center gap-3">
                    <button className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-600 hover:shadow-sm transition-all">
                        <Share2 className="h-5 w-5" />
                    </button>
                    <button className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-600 hover:shadow-sm transition-all">
                        <Download className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Title & Status */}
            <div className="bg-white p-8 rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${getRiskColor()}`}>
                        <ShieldAlert className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Detail Deteksi Bahaya</h2>
                        <p className="text-slate-500 font-medium">Laporan ancaman keamanan siber pada perangkat anak</p>
                    </div>
                </div>
                <div className={`px-6 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-md relative z-10 ${getRiskColor()}`}>
                    Risiko Kritis
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Information Cards */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4">Info Perangkat</h3>
                        
                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Nama Anak</p>
                                <p className="font-bold text-slate-800">{incident.device?.child?.nama}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                                <Smartphone className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">ID Perangkat</p>
                                <p className="text-sm font-mono text-slate-600 truncate max-w-[160px]">{incident.device?.token_perangkat}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Waktu Deteksi</p>
                                <p className="text-sm font-bold text-slate-800">
                                    {new Date(incident.waktu_insiden).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-red-50 to-red-100/50 p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-125 transition-transform duration-700">
                            <AlertCircle className="h-24 w-24 text-red-600" />
                        </div>
                        <div className="flex items-center gap-3 text-red-700 mb-4">
                            <ShieldAlert className="h-5 w-5" />
                            <p className="font-black uppercase tracking-wider text-sm">Identitas Pelaku</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-inner border border-red-200/50">
                            <p className="text-red-700 font-black text-lg">
                                {incident.identitas_pelaku || 'Tidak Diketahui'}
                            </p>
                        </div>
                        <p className="text-xs text-red-500/80 mt-4 leading-relaxed font-medium">
                            <Info className="h-3 w-3 inline mr-1" />
                            Sistem mendeteksi identitas ini melalui metadata aplikasi perpesanan pada perangkat anak.
                        </p>
                    </div>
                </div>

                {/* Right Column: Evidence Content */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Detected Text Card */}
                    <div className="bg-white p-8 rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 rounded-xl">
                                    <MessageSquare className="h-6 w-6 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Pesan Berbahaya</h3>
                            </div>
                            <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-200 shadow-sm">
                                Aplikasi: {incident.nama_aplikasi}
                            </span>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner group transition-all duration-300 hover:bg-slate-100/50">
                            <p className="text-slate-800 text-xl leading-relaxed italic font-serif">
                                "{incident.teks_terdeteksi}"
                            </p>
                        </div>
                    </div>

                    {/* Screenshot Card */}
                    <div className="bg-white p-8 rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 rounded-xl">
                                    <ImageIcon className="h-6 w-6 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Bukti Screenshot</h3>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse delay-75"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse delay-150"></div>
                            </div>
                        </div>
                        
                        <div className="relative">
                            {incident.path_tangkapan_layar ? (
                                <div className="relative group/img rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
                                    <img 
                                        src={incident.path_tangkapan_layar} 
                                        alt="Bukti Chat" 
                                        className="w-full h-auto object-contain max-h-[700px] mx-auto opacity-90 hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-6">
                                        <p className="text-white text-xs font-bold tracking-widest uppercase flex items-center gap-2 backdrop-blur-sm bg-black/20 px-4 py-2 rounded-full">
                                            <ShieldAlert className="h-4 w-4" /> Screenshot Bukti Autentik
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-video bg-slate-50 rounded-2xl flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50/20 transition-all duration-300">
                                    <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                                        <ImageIcon className="h-10 w-10 opacity-20" />
                                    </div>
                                    <p className="font-bold text-slate-400">Bukti visual tidak tersedia</p>
                                    <p className="text-xs mt-1 opacity-60 italic">Sistem mungkin gagal mengambil cuplikan layar pada saat kejadian</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-8 flex items-start gap-4 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-sm text-indigo-700 leading-relaxed group-hover:bg-indigo-50 transition-colors">
                            <Info className="h-5 w-5 mt-0.5 shrink-0 text-indigo-500" />
                            <p className="font-medium">
                                Bukti ini dihasilkan secara otomatis oleh kecerdasan buatan (AI) kami saat mendeteksi indikasi <span className="font-black uppercase tracking-tighter">grooming</span> atau percakapan tidak wajar yang dapat membahayakan anak.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


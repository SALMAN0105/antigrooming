import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    Smartphone, User, Loader2, Plus, 
    ShieldCheck, Calendar, Hash, MoreVertical, QrCode, X 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

import LoadingScreen from '../components/LoadingScreen';

export default function ChildList() {
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChild, setSelectedChild] = useState(null);

    const fetchChildren = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/children', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChildren(response.data.data);
        } catch (error) {
            console.error("Failed to fetch children list:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChildren();
    }, []);

    if (loading) {
        return <LoadingScreen message="Memuat data keluarga & perangkat..." />;
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* QR Modal */}
            {selectedChild && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedChild(null)}></div>
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 md:p-10 text-center space-y-8 animate-in zoom-in duration-300">
                        <button 
                            onClick={() => setSelectedChild(null)}
                            className="absolute top-6 right-6 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">QR Pairing {selectedChild.nama}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pindai kode ini dari aplikasi hp anak untuk menghubungkan.</p>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-xl border-4 border-slate-50 mx-auto w-fit">
                            <QRCodeSVG 
                                value={selectedChild.token_pairing} 
                                size={200} 
                                level="H" 
                                includeMargin={true} 
                                fgColor="#1e1b4b"
                            />
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Token Permanen</p>
                            <p className="text-sm font-mono font-bold text-slate-600 dark:text-slate-300 break-all">{selectedChild.token_pairing}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Keluarga Saya</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Kelola dan pantau semua perangkat anak Anda di sini.</p>
                </div>
                <Link 
                    to="/connect"
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Anak Baru
                </Link>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {children.length > 0 ? (
                    children.map((child) => (
                        <div key={child.id} className="group relative bg-white dark:bg-slate-900 rounded-4xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-all hover:shadow-[0_30px_70px_rgba(79,70,229,0.08)] dark:hover:border-indigo-500/30 hover:-translate-y-2">
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-indigo-50 dark:bg-indigo-500/10 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
                            
                            <div className="relative space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 dark:shadow-indigo-900/40 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                        <User className="h-8 w-8 text-white" />
                                    </div>
                                    <button 
                                        onClick={() => setSelectedChild(child)}
                                        className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all text-slate-400 group/btn shadow-sm"
                                        title="Lihat QR Pairing"
                                    >
                                        <QrCode className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{child.nama}</h3>
                                    {child.devices && child.devices.length > 0 ? (
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                                            <ShieldCheck className="w-3 h-3" />
                                            Terlindungi
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-500/20">
                                            <Smartphone className="w-3 h-3" />
                                            Belum Terhubung
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                    {child.devices && child.devices.length > 0 ? child.devices.map(device => (
                                        <div key={device.id} className="flex items-center gap-4 group/item">
                                            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 group-hover/item:bg-indigo-50 dark:group-hover/item:bg-indigo-500/10 transition-all">
                                                <Smartphone className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Perangkat</p>
                                                <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                                                    {device.token_perangkat?.substring(0, 8)}...
                                                </p>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-slate-400 italic">Gunakan tombol QR di atas untuk menghubungkan perangkat anak.</p>
                                    )}
                                </div>

                                <Link 
                                    to={child.devices && child.devices.length > 0 ? "/dashboard" : "/connect"}
                                    className={`block w-full text-center py-4 font-black rounded-2xl transition-all border active:scale-95 shadow-sm ${
                                        child.devices && child.devices.length > 0 
                                        ? "bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-indigo-600"
                                        : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-600 hover:text-white"
                                    }`}
                                >
                                    {child.devices && child.devices.length > 0 ? "Pantau Aktivitas" : "Hubungkan Sekarang"}
                                </Link>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-6 text-center">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <Plus className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                        </div>
                        <div className="space-y-2 px-10">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Belum Ada Perangkat</h4>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm">Mulai dengan menghubungkan perangkat anak Anda untuk mendapatkan laporan keamanan otomatis.</p>
                        </div>
                        <Link 
                            to="/connect"
                            className="text-indigo-600 font-black hover:underline underline-offset-8"
                        >
                            Hubungkan Perangkat Pertama →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

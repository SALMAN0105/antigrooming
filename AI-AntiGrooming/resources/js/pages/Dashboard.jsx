import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
    Activity, AlertTriangle, Users, Calendar, 
    ChevronRight, ShieldAlert, Zap, Clock, TrendingUp 
} from 'lucide-react';

import LoadingScreen from '../components/LoadingScreen';

export default function Dashboard() {
    const [stats, setStats] = useState({ total_children: 0, total_incidents: 0 });
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const dashboardData = response.data.data || {};
                setIncidents(dashboardData.recent_incidents || []);
                setStats({
                    total_children: dashboardData.total_children || 0,
                    total_incidents: dashboardData.total_incidents || 0
                });
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <LoadingScreen message="Menganalisis statistik keamanan..." />;
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Welcome */}
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ringkasan Keamanan</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Semua aktivitas digital anak Anda dalam pengawasan cerdas.</p>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Stat 1: Total Anak */}
                <div className="group relative bg-white dark:bg-slate-900 rounded-4xl p-6 md:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-all hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] hover:-translate-y-1">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-50 dark:bg-indigo-500/10 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="relative flex items-center gap-6">
                        <div className="w-16 h-16 bg-linear-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 group-hover:scale-110 transition-transform duration-500">
                            <Users className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Terhubung</p>
                            <p className="text-4xl font-black text-slate-900 dark:text-white mt-1">{stats.total_children}</p>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 w-fit px-3 py-1.5 rounded-full uppercase tracking-tighter">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Perangkat Aktif
                    </div>
                </div>

                {/* Stat 2: Total Insiden */}
                <div className="group relative bg-white dark:bg-slate-900 rounded-4xl p-6 md:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-all hover:shadow-[0_20px_50px_rgba(239,68,68,0.1)] hover:-translate-y-1">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-red-50 dark:bg-red-500/10 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="relative flex items-center gap-6">
                        <div className="w-16 h-16 bg-linear-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100 dark:shadow-rose-900/20 group-hover:scale-110 transition-transform duration-500">
                            <ShieldAlert className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Insiden</p>
                            <p className="text-4xl font-black text-slate-900 dark:text-white mt-1">{stats.total_incidents}</p>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 w-fit px-3 py-1.5 rounded-full uppercase tracking-tighter">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Butuh Perhatian
                    </div>
                </div>

                {/* Stat 3: Status Sistem */}
                <div className="group relative bg-indigo-900 rounded-4xl p-6 md:p-8 shadow-2xl shadow-indigo-200 overflow-hidden transition-all hover:-translate-y-1">
                    <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/5 rounded-full group-hover:scale-125 transition-transform duration-1000"></div>
                    <div className="relative flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
                            <Activity className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-indigo-300 uppercase tracking-widest">Sistem AI</p>
                            <p className="text-3xl font-black text-white mt-1">OPERASIONAL</p>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center text-xs font-bold text-emerald-400 bg-white/10 backdrop-blur-md w-fit px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/10">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                        Terenkripsi & Terlindungi
                    </div>
                </div>
            </div>

            {/* Recent Incidents Section */}
            <div className="bg-white dark:bg-slate-900 rounded-4xl shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Investigasi Terbaru</h3>
                        <p className="text-sm text-slate-400 font-medium tracking-tight">Ancaman terbaru yang membutuhkan perhatian Anda.</p>
                    </div>
                    <Link 
                        to="/incidents" 
                        className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-5 py-2.5 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        Lihat Semua <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
                
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {incidents.length > 0 ? (
                        incidents.slice(0, 1).map((incident, idx) => (
                            <div key={idx} className="group p-5 md:p-8 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-default">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-start gap-6">
                                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform">
                                            <ShieldAlert className="h-7 w-7 text-rose-500" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-lg font-black text-slate-800 dark:text-white">
                                                Ancaman dari: <span className="text-indigo-600 dark:text-indigo-400">{incident.device?.child?.nama || 'Perangkat Anonim'}</span>
                                            </p>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-500 shadow-sm flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" /> {new Date(incident.incident_timestamp || incident.created_at).toLocaleTimeString()}
                                                </span>
                                                <span className="px-3 py-1 bg-rose-500 text-white rounded-lg text-xs font-black uppercase tracking-tighter shadow-sm">
                                                    Risiko {incident.risk_level === 'critical' ? 'Kritis' : incident.risk_level === 'high' ? 'Tinggi' : 'Menengah'} Terdeteksi
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-50 dark:border-slate-700 shadow-inner italic leading-relaxed">
                                                "{incident.detected_text}"
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 ml-auto md:ml-0">
                                        <div className="hidden lg:flex flex-col items-end mr-4">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Waktu Deteksi</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {new Date(incident.incident_timestamp || incident.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                                            </p>
                                        </div>
                                        <Link 
                                            to={`/incidents/${incident.id}`}
                                            className="px-6 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-[1.25rem] text-sm font-black hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all shadow-xl hover:shadow-indigo-200 dark:hover:shadow-indigo-900/40 group-hover:-translate-y-0.5 flex items-center gap-2"
                                        >
                                            Detail Investigasi <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-20 text-center flex flex-col items-center space-y-6">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                <Activity className="h-12 w-12" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xl font-black text-slate-800 tracking-tight">Kondisi Sangat Aman</p>
                                <p className="text-slate-400 font-medium max-w-xs mx-auto">Tidak ada aktivitas mencurigakan yang terdeteksi oleh AI dalam 24 jam terakhir.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


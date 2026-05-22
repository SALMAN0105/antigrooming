import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    ShieldAlert, MessageSquare, ChevronRight, 
    Calendar, Search, Filter, ArrowLeft 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';

export default function IncidentList() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchIncidents = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/incidents', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Laravel paginate() returns { data: { data: [...], ... } }
                const result = response.data.data;
                setIncidents(Array.isArray(result.data) ? result.data : []);
            } catch (error) {
                console.error("Failed to fetch incidents:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchIncidents();
    }, []);

    const filteredIncidents = incidents.filter(incident => 
        incident.teks_terdeteksi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.identitas_pelaku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.device?.child?.nama?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <LoadingScreen message="Mengambil riwayat investigasi..." />;
    }

    const getRiskStyles = () => 'bg-red-500 text-white shadow-red-200';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <ShieldAlert className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                        Riwayat Investigasi
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Daftar lengkap deteksi bahaya yang ditemukan oleh AI
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Cari pesan atau pelaku..." 
                            className="pl-12 pr-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 focus:border-indigo-500 outline-none w-full md:w-64 transition-all font-bold text-slate-700 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-slate-500 hover:text-indigo-600 hover:shadow-md dark:hover:bg-slate-800 transition-all">
                        <Filter className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Content Table/List */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                {filteredIncidents.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                        {filteredIncidents.map((incident) => (
                            <Link 
                                key={incident.id} 
                                to={`/incidents/${incident.id}`}
                                className="group flex flex-col sm:flex-row sm:items-center gap-6 p-8 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all duration-300 border-b border-slate-50 dark:border-slate-800 last:border-0"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-500 ${getRiskStyles()}`}>
                                    <ShieldAlert className="h-7 w-7" />
                                </div>
                                
                                <div className="flex-1 space-y-2 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-lg">
                                            {incident.device?.child?.nama}
                                        </span>
                                        <span className="text-slate-300 dark:text-slate-600 text-xs">•</span>
                                        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm font-bold">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(incident.waktu_insiden).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        "{incident.teks_terdeteksi}"
                                    </h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        Pelaku: <span className="font-bold text-slate-700 dark:text-slate-300">{incident.identitas_pelaku || 'Anonim'}</span>
                                    </p>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-6">
                                    <div className="hidden md:block text-right">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Aplikasi</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl inline-block">
                                            {incident.nama_aplikasi}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:translate-x-2 transition-all duration-500 shadow-inner group-hover:shadow-indigo-200">
                                        <ChevronRight className="h-6 w-6" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center px-6">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShieldAlert className="h-12 w-12 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Tidak ada insiden ditemukan</h3>
                        <p className="text-slate-400 mt-2 max-w-md mx-auto">
                            {searchTerm ? `Pencarian untuk "${searchTerm}" tidak membuahkan hasil.` : "Bagus! Belum ada aktivitas berbahaya yang terdeteksi pada perangkat anak Anda."}
                        </p>
                    </div>
                )}
            </div>
            
            {/* Summary Statistics Footer */}
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
                        <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Insiden Kritis</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">{incidents.length}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

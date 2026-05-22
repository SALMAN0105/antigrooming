import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Mail, Lock, User as UserIcon, ArrowRight, Loader2, Sparkles, AlertCircle, CheckCircle2, Calendar, Eye, EyeOff } from 'lucide-react';

// Hitung tanggal maksimum untuk input (18 tahun lalu dari hari ini)
function getMaxDOB() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
}

// Komponen Toast Notifikasi
function Toast({ type, message, onClose }) {
    const isSuccess = type === 'success';
    return (
        <div
            className={`fixed top-5 right-5 z-50 flex items-start gap-3 bg-white rounded-2xl shadow-2xl px-5 py-4 max-w-sm border-l-4 ${isSuccess ? 'border-green-500' : 'border-red-500'}`}
            style={{ animation: 'slideIn 0.4s ease' }}
        >
            <div className="flex-shrink-0 mt-0.5">
                {isSuccess
                    ? <CheckCircle2 className="w-6 h-6 text-green-500" />
                    : <AlertCircle className="w-6 h-6 text-red-500" />
                }
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">
                    {isSuccess ? 'Registrasi Berhasil!' : 'Registrasi Gagal!'}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">{message}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-1 flex-shrink-0 text-lg leading-none">×</button>
        </div>
    );
}

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '', password: '', date_of_birth: '' });
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success'|'error', message: '' }
    const [showPassword, setShowPassword] = useState(false);

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('/api/register', formData);
            if (response.data.status === 'success') {
                showToast('success', 'Akun berhasil dibuat! Mengarahkan ke halaman login...');
                setTimeout(() => {
                    navigate('/login', {
                        state: { message: 'Akun berhasil dibuat! Silakan masuk untuk memulai.' }
                    });
                }, 2000);
            } else {
                showToast('error', 'Registrasi gagal, silakan coba lagi.');
            }
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                // Ambil pesan error pertama dari validasi Laravel
                const firstError = Object.values(errors)[0][0];
                showToast('error', firstError);
            } else {
                showToast('error', err.response?.data?.message || 'Terjadi kesalahan saat registrasi.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans page-transition">

            {/* Toast Notifikasi */}
            {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

            {/* Light 3D Mesh Gradient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-500"></div>
                <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}></div>
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-indigo-500/5 to-transparent h-[50%] w-full animate-scan pointer-events-none"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center mb-6">
                    <div className="relative group perspective-1000">
                        <div className="absolute inset-0 bg-indigo-500 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 animate-pulse"></div>
                        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center border border-slate-100 relative z-10 transform transition-all group-hover:scale-110 group-hover:rotate-y-10 duration-700">
                            <ShieldCheck className="w-10 h-10 text-indigo-600" />
                        </div>
                        <div className="absolute -top-1 -right-1 bg-indigo-600 p-1.5 rounded-xl shadow-xl border-2 border-white text-white animate-bounce">
                            <Sparkles className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                        AntiGrooming <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600 italic">AI</span>
                    </h2>
                    <p className="text-slate-500 font-medium text-base px-8 leading-tight">
                        Mulai langkah cerdas untuk melindungi masa depan digital buah hati Anda.
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[420px] relative z-10 px-4 sm:px-0">
                <div className="bg-white/70 backdrop-blur-3xl py-10 px-8 sm:px-12 shadow-[0_20px_50px_rgba(0,0,0,0.06)] sm:rounded-[3rem] border border-white overflow-hidden relative group transition-all duration-700 hover:border-indigo-100">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-gradient-x"></div>

                    <form className="space-y-5" onSubmit={handleSubmit}>

                        {/* Nama */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nama Orang Tua</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-600 text-slate-400">
                                    <UserIcon className="h-4 w-4" />
                                </div>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 font-bold text-sm placeholder:text-slate-400 outline-none"
                                    placeholder="Nama Lengkap Anda"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Alamat Email</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-600 text-slate-400">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 font-bold text-sm placeholder:text-slate-400 outline-none"
                                    placeholder="nama@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Tanggal Lahir */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                                Tanggal Lahir <span className="normal-case font-medium text-slate-400">(min. 18 tahun)</span>
                            </label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-600 text-slate-400">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <input
                                    name="date_of_birth"
                                    type="date"
                                    required
                                    max={getMaxDOB()}
                                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 font-bold text-sm outline-none"
                                    value={formData.date_of_birth}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Kata Sandi</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-600 text-slate-400">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength="8"
                                    className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 font-bold text-sm placeholder:text-slate-400 outline-none"
                                    placeholder="Minimal 8 Karakter"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 focus:outline-none">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group w-full flex justify-center items-center py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-900/20 transition-all hover:shadow-indigo-500/40 hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0"
                            >
                                {loading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2 text-base">
                                        Buat Akun Sekarang
                                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-slate-500 font-bold">
                            Sudah menjadi bagian dari kami?{' '}
                            <Link to="/login" className="text-indigo-400 hover:text-white transition-colors underline decoration-2 decoration-indigo-500/20 underline-offset-8 hover:decoration-indigo-400">
                                Masuk Kembali
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(120%); opacity: 0; }
                    to   { transform: translateX(0);   opacity: 1; }
                }
            `}</style>
        </div>
    );
}

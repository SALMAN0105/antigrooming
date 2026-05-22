import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
    ShieldCheck, Mail, Lock, ArrowRight, Loader2, 
    Sparkles, AlertCircle, CheckCircle 
} from 'lucide-react';
import WelcomeOverlay from '../components/WelcomeOverlay';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [welcomeUser, setWelcomeUser] = useState(null);

    // Ambil pesan sukses dari register jika ada
    const successMessage = location.state?.message;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/login', formData);
            if (response.data.status === 'success') {
                const userData = response.data.data;
                localStorage.setItem('token', userData.access_token);
                localStorage.setItem('user', JSON.stringify(userData.user));
                
                // Tampilkan Welcome Overlay
                setWelcomeUser(userData.user.name);
                
                // Redirect setelah 2.5 detik untuk efek smooth
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2500);
            } else {
                setError('Login gagal, silakan coba lagi.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Terjadi kesalahan saat login.');
            setLoading(false);
        }
    };

    if (welcomeUser) {
        return <WelcomeOverlay name={welcomeUser} />;
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans page-transition">
            {/* Light 3D Mesh Gradient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Mesh Blobs - Soft & Colorful */}
                <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-500"></div>
                
                {/* Subtle Dot Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}></div>
                
                {/* Light Scanning Beam */}
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
                    <p className="text-slate-500 font-medium text-base px-8">
                        Keamanan keluarga dimulai dari login yang cerdas dan aman.
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[420px] relative z-10 px-4 sm:px-0">
                <div className="bg-white/70 backdrop-blur-3xl py-10 px-8 sm:px-12 shadow-[0_20px_50px_rgba(0,0,0,0.06)] sm:rounded-[3rem] border border-white overflow-hidden relative group transition-all duration-700 hover:border-indigo-100">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-gradient-x"></div>
                    
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {successMessage && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl animate-in fade-in zoom-in duration-700 flex items-center gap-4">
                                <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                                <p className="text-sm text-emerald-200 font-bold leading-tight">{successMessage}</p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl animate-in shake duration-500 flex items-center gap-4">
                                <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
                                <p className="text-sm text-red-200 font-bold leading-tight">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Orang Tua</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-400 text-slate-500">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 font-bold text-sm placeholder:text-slate-400 outline-none"
                                    placeholder="nama@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kata Sandi</label>
                                <a href="#" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Lupa Sandi?</a>
                            </div>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-600 text-slate-400">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 font-bold text-sm placeholder:text-slate-400 outline-none"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group w-full flex justify-center items-center py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-900/20 transition-all hover:shadow-indigo-500/40 hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0"
                            >
                                {loading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2 text-base">
                                        Masuk Ke Dashboard
                                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-slate-500 font-bold">
                            Baru di AntiGrooming AI?{' '}
                            <Link to="/register" className="text-indigo-400 hover:text-white transition-colors underline decoration-2 decoration-indigo-500/20 underline-offset-8 hover:decoration-indigo-400">
                                Daftar Gratis
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}


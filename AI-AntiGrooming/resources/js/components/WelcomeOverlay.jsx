import React from 'react';
import { ShieldCheck, Sparkles, CheckCircle } from 'lucide-react';

export default function WelcomeOverlay({ name }) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#f8fafc] animate-in fade-in duration-700">
            {/* Light 3D Mesh Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
            </div>

            <div className="relative z-10 text-center space-y-8 animate-in zoom-in fade-in slide-in-from-bottom-12 duration-1000">
                <div className="flex justify-center">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-indigo-500 rounded-[3rem] blur-3xl opacity-20 animate-pulse"></div>
                        <div className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center border-2 border-white shadow-2xl relative z-10">
                            <ShieldCheck className="w-16 h-16 text-indigo-600 animate-bounce" />
                        </div>
                        <div className="absolute -top-4 -right-4 bg-emerald-500 p-3 rounded-2xl shadow-xl border-4 border-white text-white">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 text-indigo-600 font-black uppercase tracking-[0.3em] text-sm">
                        <Sparkles className="w-5 h-5 fill-indigo-600" />
                        Akses Diterima
                    </div>
                    <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-tight">
                        Selamat Datang,<br />
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-600">
                            {name || 'Orang Tua'}
                        </span>
                    </h2>
                    <p className="text-slate-500 text-lg font-medium max-w-md mx-auto">
                        Sistem keamanan AntiGrooming AI siap melindungi aktivitas digital keluarga Anda.
                    </p>
                </div>

                <div className="pt-10 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                    <p className="text-indigo-600 font-bold tracking-widest text-xs uppercase animate-pulse">
                        Mengarahkan ke Dashboard...
                    </p>
                </div>
            </div>
        </div>
    );
}

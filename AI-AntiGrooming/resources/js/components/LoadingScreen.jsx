import React from 'react';
import { ShieldCheck, Zap } from 'lucide-react';

export default function LoadingScreen({ message = "Mempersiapkan data keamanan..." }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full animate-in fade-in duration-500">
            <div className="relative mb-8">
                {/* Outer glowing rings */}
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-full scale-125 animate-pulse delay-700"></div>
                
                {/* Animated Spinner Container */}
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                    
                    {/* Center Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ShieldCheck className="h-10 w-10 text-indigo-600 animate-bounce" />
                    </div>
                </div>
            </div>

            {/* Loading Text */}
            <div className="text-center space-y-3">
                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-500 fill-indigo-500 animate-pulse" />
                    AntiGrooming AI
                </h3>
                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">
                    {message}
                </p>
                
                {/* Progress bar simulation */}
                <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto mt-6 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full w-1/2 animate-[loading_2s_infinite_ease-in-out]"></div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes loading {
                    0% { transform: translateX(-100%); width: 30%; }
                    50% { width: 60%; }
                    100% { transform: translateX(400%); width: 30%; }
                }
            `}} />
        </div>
    );
}

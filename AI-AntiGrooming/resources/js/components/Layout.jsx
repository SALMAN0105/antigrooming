import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, QrCode, LogOut, ShieldCheck, 
    Users, Menu, X, Bell, User, Settings, Sparkles, 
    ShieldAlert, ChevronLeft, ChevronRight, Moon, Sun
} from 'lucide-react';
import axios from 'axios';

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
    const [user, setUser] = useState(null);

    React.useEffect(() => {
        // Dark Mode Logic
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await axios.get('/api/user', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setUser(response.data);
                localStorage.setItem('user', JSON.stringify(response.data));
            } catch (error) {
                console.error('Failed to fetch user:', error);
                // Fallback to local storage if API fails
                const storedUser = localStorage.getItem('user');
                if (storedUser) setUser(JSON.parse(storedUser));
            }
        };
        fetchUser();
    }, []);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    const getUserInitial = () => {
        if (!user?.name) return 'AG';
        return user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const handleLogout = async () => {
        try {
            await axios.post('/api/logout', {}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            localStorage.removeItem('token');
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard Utama' },
        { path: '/incidents', icon: ShieldAlert, label: 'Riwayat Investigasi' },
        { path: '/children', icon: Users, label: 'Keluarga & Perangkat' },
        { path: '/connect', icon: QrCode, label: 'Hubungkan Anak' },
    ];

    return (
        <div className={`min-h-screen bg-[#f1f5f9] dark:bg-[#020617] flex font-sans text-slate-900 dark:text-white transition-all duration-500`}>
            {/* Sidebar Desktop */}
            <aside className={`hidden lg:flex ${isSidebarCollapsed ? 'w-24' : 'w-80'} bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 flex-col sticky top-0 h-screen z-50 transition-all duration-500 ease-in-out`}>
                <div className={`h-24 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-10'} gap-3 relative`}>
                    <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] shrink-0 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
                        <ShieldCheck className="h-7 w-7 text-white" />
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col animate-in fade-in duration-500">
                            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">AntiGrooming AI</span>
                        </div>
                    )}
                    
                    {/* Toggle Button */}
                    <button 
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all shadow-sm z-10`}
                    >
                        {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>
                
                <nav className={`flex-1 ${isSidebarCollapsed ? 'px-3' : 'px-6'} py-8 space-y-3`}>
                    {!isSidebarCollapsed && (
                        <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 animate-in fade-in duration-500">Menu Utama</p>
                    )}
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={isSidebarCollapsed ? item.label : ''}
                                className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0 h-14' : 'px-5 py-4'} rounded-[1.25rem] transition-all duration-300 group ${
                                    isActive 
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40 font-bold' + (isSidebarCollapsed ? '' : ' translate-x-2')
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon className={`h-6 w-6 transition-transform group-hover:scale-110 shrink-0 ${isSidebarCollapsed ? '' : 'mr-4'} ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                {!isSidebarCollapsed && (
                                    <>
                                        <span className="tracking-tight whitespace-nowrap animate-in slide-in-from-left-2 duration-500">{item.label}</span>
                                        {isActive && <Sparkles className="w-4 h-4 ml-auto animate-pulse" />}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className={`${isSidebarCollapsed ? 'p-3' : 'p-8'} space-y-4`}>
                    <div className={`bg-slate-50 dark:bg-slate-800/50 rounded-3xl ${isSidebarCollapsed ? 'p-2' : 'p-5'} border border-slate-200/50 dark:border-slate-700 transition-all`}>
                        {!isSidebarCollapsed && (
                            <div className="flex items-center gap-3 mb-3 animate-in fade-in duration-500">
                                <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm overflow-hidden border border-slate-100 dark:border-slate-600">
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-[10px] font-black">
                                        {getUserInitial()}
                                    </div>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-black text-slate-900 dark:text-white truncate">{user?.name || 'Memuat...'}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Akun Premium</span>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            title={isSidebarCollapsed ? 'Keluar Akun' : ''}
                            className={`flex items-center justify-center w-full ${isSidebarCollapsed ? 'h-12' : 'py-3 px-4'} bg-white dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all font-bold text-xs gap-2 shadow-sm group`}
                        >
                            <LogOut className={`h-4 w-4 transition-transform group-hover:scale-110`} />
                            {!isSidebarCollapsed && <span>Keluar Akun</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <aside className={`fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-900 z-110 lg:hidden transform transition-transform duration-500 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-24 flex items-center justify-between px-8 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20">
                            <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">AntiGrooming AI</span>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 px-6 py-8 space-y-2">
                    <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Menu Utama</p>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center px-5 py-4 rounded-[1.25rem] transition-all duration-300 ${
                                    isActive 
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 font-bold' 
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Icon className={`h-6 w-6 mr-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                <span className="tracking-tight">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-8 mt-auto border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                        className="flex items-center justify-center w-full py-4 px-4 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl transition-all font-black text-sm gap-3 active:scale-95"
                    >
                        <LogOut className="h-5 w-5" />
                        Keluar Akun
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100 lg:hidden transition-opacity duration-500 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Modern Header */}
                <header className="h-20 lg:h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-4 lg:px-12 sticky top-0 z-60">
                    <div className="flex items-center gap-3 lg:gap-4">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 active:scale-90 transition-transform"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex flex-col shrink-0">
                            <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                                {navItems.find(item => item.path === location.pathname)?.label.split(' ')[0] || 'AntiGrooming'}
                            </h1>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Perlindungan Aktif</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-3">
                        <button 
                            onClick={toggleDarkMode}
                            className="flex p-3 lg:p-4 bg-white/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-[1.25rem] text-slate-400 transition-all relative border border-slate-200 dark:border-slate-700 shadow-sm group active:scale-90"
                        >
                            {isDarkMode ? (
                                <Sun className="w-6 h-6 text-amber-400 transition-colors" />
                            ) : (
                                <Moon className="w-6 h-6 group-hover:text-indigo-600 transition-colors" />
                            )}
                        </button>
                        <div className="flex items-center gap-3 ml-2">
                            <div className="hidden sm:flex flex-col items-end text-right">
                                <span className="text-sm font-black text-slate-900 dark:text-white leading-none">{user?.name || 'Memuat...'}</span>
                                <span className="text-[10px] font-bold text-emerald-500">Akun Premium</span>
                            </div>
                            <div className="w-10 h-10 lg:w-14 lg:h-14 bg-indigo-600 rounded-xl lg:rounded-[1.25rem] flex items-center justify-center border-2 lg:border-4 border-white dark:border-slate-800 shadow-md overflow-hidden text-white font-black text-lg">
                                {getUserInitial()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-12 custom-scrollbar relative">
                    {/* Background Decorative Blobs */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                        <div className="absolute top-[10%] left-[5%] w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px]"></div>
                        <div className="absolute bottom-[10%] right-[5%] w-80 h-80 bg-purple-500/5 rounded-full blur-[100px]"></div>
                    </div>
                    
                    <div className="max-w-7xl mx-auto pb-10">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>

    );
}



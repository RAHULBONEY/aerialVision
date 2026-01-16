import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { Wifi, MoreHorizontal, Menu } from 'lucide-react';

export default function AppShell({ allowedRoles = [] }) {
    const { user, loading } = useAuth();
    const location = useLocation();


    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#050B14] text-primary animate-pulse">LOADING SECURE SHELL...</div>;
    }


    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }


    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <div className="h-screen flex items-center justify-center text-red-500 font-mono">ACCESS DENIED: INSUFFICIENT CLEARANCE</div>;
    }

    return (
        <div className="flex h-screen bg-[#050B14] overflow-hidden">
            {/* LEFT: Navigation Sidebar */}
            <Sidebar userRole={user.role} />

            {/* RIGHT: Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-64">

                {/* GLOBAL HEADER */}
                <header className="h-16 border-b border-white/5 bg-[#0B1C2D]/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Toggle (Hidden on Desktop) */}
                        <button className="lg:hidden text-slate-400 hover:text-white">
                            <Menu size={24} />
                        </button>

                        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary">
                            <Wifi size={12} className="animate-pulse" />
                            <span>SYSTEM_ONLINE</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-slate-200 uppercase">{user.name || 'OPERATOR'}</div>
                            <div className="text-[10px] text-slate-500 font-mono tracking-widest">{user.role} // ID: {user.uid.slice(0, 6)}</div>
                        </div>
                        <div className="h-8 w-8 rounded bg-primary/20 border border-primary/50 flex items-center justify-center text-primary font-bold text-xs">
                            {user.name?.[0] || 'OP'}
                        </div>
                    </div>
                </header>

                {/* DYNAMIC PAGE CONTENT */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-700">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
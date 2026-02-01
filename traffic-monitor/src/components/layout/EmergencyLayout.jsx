import React from "react";
import { Outlet } from "react-router-dom";
import EmergencySidebar from "@/components/emergency/EmergencySidebar";
import { useAuth } from "@/context/AuthContext";
import { Bell, Heart, Sun, Moon, Activity } from "lucide-react";
import { useTheme } from "@/context/ThemeProvider";

export default function EmergencyLayout() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex h-screen bg-white dark:bg-[#050510] text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
            <EmergencySidebar />

            <div className="flex-1 flex flex-col ml-0 lg:ml-64 transition-all duration-300">
                {/* Header */}
                <header className="h-16 border-b border-gray-200 dark:border-rose-900/30 bg-white/95 dark:bg-[#0a0a12]/95 backdrop-blur-md flex items-center justify-between px-6 z-10 shadow-sm dark:shadow-none transition-colors duration-300">
                    {/* Status Indicator */}
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                        <span className="text-xs font-mono text-gray-600 dark:text-emerald-500 tracking-[0.2em] uppercase transition-colors duration-300">
                            Hospital Link Active
                        </span>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-4">
                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-rose-900/20 transition-colors duration-200"
                        >
                            {theme === 'dark' ? (
                                <Sun size={20} className="text-gray-600 dark:text-slate-400" />
                            ) : (
                                <Moon size={20} className="text-gray-600 dark:text-slate-400" />
                            )}
                        </button>

                        {/* Notifications */}
                        <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-rose-900/20 rounded-full transition-colors duration-200 group">
                            <Bell size={20} className="text-gray-600 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-200" />
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#0a0a12]" />
                        </button>

                        {/* User Info */}
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-rose-900/30">
                            <div className="text-right hidden md:block">
                                <div className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-300">
                                    {user?.name || "Operator"}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-slate-400 font-mono transition-colors duration-300">
                                    ID: {user?.uid?.slice(0, 8)}
                                </div>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-600 to-red-600 border border-rose-400/30 shadow-sm dark:shadow-lg dark:shadow-rose-900/20 flex items-center justify-center text-xs font-bold text-white">
                                {user?.name?.charAt(0) || "E"}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#050510] relative transition-colors duration-300">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useLoginMutation, useSeedAdminMutation } from "@/hooks/useAuthQueries";
import { ShieldCheck, Lock, Mail, Activity, Crosshair, ChevronRight, Zap, Database, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// --- MICRO VISUAL COMPONENTS ---

const CornerBrackets = () => (
    <>
        <div className="absolute top-0 left-0 h-4 w-4 border-l-2 border-t-2 border-primary/50 rounded-tl-sm" />
        <div className="absolute top-0 right-0 h-4 w-4 border-r-2 border-t-2 border-primary/50 rounded-tr-sm" />
        <div className="absolute bottom-0 left-0 h-4 w-4 border-l-2 border-b-2 border-primary/50 rounded-bl-sm" />
        <div className="absolute bottom-0 right-0 h-4 w-4 border-r-2 border-b-2 border-primary/50 rounded-br-sm" />
    </>
);

const GridBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#050b14]">
        {/* Perspective Grid Floor */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.15] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
        {/* Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[100px]" />
        {/* Scanner Line */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(0,229,255,0.03)_50%,transparent_100%)] w-full h-[2px] animate-scan top-1/2" />
    </div>
);

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [bootText, setBootText] = useState('');

    // --- LOGIC HOOKS ---
    const { mutate: login, isPending: isLoginPending, isSuccess: isLoginSuccess, isError: isLoginError, error: loginError } = useLoginMutation();
    const { mutate: seedAdmin, isPending: isSeedPending } = useSeedAdminMutation();

    // Typing Effect for "Boot" Text
    useEffect(() => {
        const text = "SYSTEM.READY // WAITING_FOR_OPERATOR...";
        let i = 0;
        const interval = setInterval(() => {
            setBootText(text.slice(0, i));
            i++;
            if (i > text.length) clearInterval(interval);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        // This triggers the AuthService logic we built
        login({ email, password });
    };

    const handleDevSeed = (e) => {
        e.preventDefault();
        // Dev backdoor to fix empty database
        if (!email || !password) {
            alert("Please enter Email & Password to use for the new Admin account.");
            return;
        }
        seedAdmin({ email, password }, {
            onSuccess: () => alert("DATABASE SEEDED: Admin profile created. You can now Login."),
            onError: (err) => alert(`SEED FAILED: ${err.message}`)
        });
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center font-sans overflow-hidden text-slate-100 selection:bg-primary/30">
            <GridBackground />

            <div className="relative z-10 w-full max-w-[420px] p-6">

                {/* Header Status Bar */}
                <div className="flex justify-between text-[10px] font-mono text-primary/60 mb-2 tracking-widest uppercase">
                    <span>Secure Node: TLS 1.3</span>
                    <span className="animate-pulse">Gateway: Active</span>
                </div>

                {/* --- GLASS CARD --- */}
                <div className="relative bg-[#0B1C2D]/60 backdrop-blur-xl border border-white/10 shadow-[0_0_60px_-15px_rgba(0,229,255,0.3)] p-8 rounded-xl overflow-hidden group">
                    <CornerBrackets />

                    {/* Interior Scanlines */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none opacity-20" />

                    {/* Logo Area */}
                    <div className="text-center mb-10 relative">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/30 shadow-[0_0_15px_rgba(0,229,255,0.3)] relative">
                            <div className="absolute inset-0 border-t-2 border-primary/60 rounded-full animate-spin-slow" />
                            <ShieldCheck className={cn("w-8 h-8 text-primary transition-all duration-700", isLoginSuccess ? "scale-125 text-green-400" : "")} />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-white italic">
                            AERIAL<span className="text-primary">VISION</span>
                        </h1>
                        <p className="text-[10px] text-slate-400 font-mono tracking-[0.3em] uppercase mt-1">
                            Traffic Command Node v4.0
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">

                        {/* Email */}
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-primary/70 ml-1">Operator ID</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#050b14]/50 border border-slate-700/50 text-slate-100 text-sm rounded-md py-2.5 pl-10 pr-4 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-600 font-mono"
                                    placeholder="OPERATOR EMAIL"
                                    disabled={isLoginPending || isLoginSuccess}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-primary/70 ml-1">Access Key</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#050b14]/50 border border-slate-700/50 text-slate-100 text-sm rounded-md py-2.5 pl-10 pr-4 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-600 font-mono"
                                    placeholder="••••••••••••"
                                    disabled={isLoginPending || isLoginSuccess}
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {isLoginError && (
                            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded border border-red-500/20 animate-in slide-in-from-top-2">
                                <AlertCircle size={14} />
                                <span className="font-mono uppercase">{loginError?.message || "Auth Handshake Failed"}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoginPending || isLoginSuccess}
                            className={cn(
                                "w-full py-3 rounded-sm font-bold tracking-widest uppercase text-xs transition-all duration-300 relative overflow-hidden group border",
                                isLoginSuccess
                                    ? "bg-green-500/20 border-green-500 text-green-400"
                                    : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]"
                            )}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isLoginPending ? (
                                    <>
                                        <Activity className="animate-spin" size={16} />
                                        <span>ESTABLISHING UPLINK...</span>
                                    </>
                                ) : isLoginSuccess ? (
                                    <>
                                        <ShieldCheck size={16} />
                                        <span>ACCESS GRANTED</span>
                                    </>
                                ) : (
                                    <>
                                        <Crosshair size={16} />
                                        <span>INITIALIZE SESSION</span>
                                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                        </button>
                    </form>

                    {/* Footer / Boot Text */}
                    <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center opacity-60">
                        <div className="text-[9px] font-mono text-primary/80">
                            {bootText}<span className="animate-pulse">_</span>
                        </div>

                        {/* DEV BACKDOOR: Only click this if DB is empty */}
                        <button
                            onClick={handleDevSeed}
                            className="flex items-center gap-1 text-[8px] text-slate-600 hover:text-red-400 transition-colors uppercase tracking-widest"
                            title="Dev: Seed Admin to DB"
                            disabled={isSeedPending}
                        >
                            <Database size={10} />
                            {isSeedPending ? "Seeding..." : "DB_SEED"}
                        </button>
                    </div>
                </div>

                <div className="text-center mt-6 text-[10px] text-slate-600 font-mono">
                    SECURE TRAFFIC MANAGEMENT SYSTEMS © 2026
                </div>
            </div>
        </div>
    );
}
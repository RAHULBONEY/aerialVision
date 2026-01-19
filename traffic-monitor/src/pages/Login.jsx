import React, { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
    ShieldCheck,
    Lock,
    Mail,
    Activity,
    Crosshair,
    ChevronRight,
    AlertCircle,
} from "lucide-react";

const CornerBrackets = () => (
    <>
        <div className="absolute top-0 left-0 h-4 w-4 border-l-2 border-t-2 border-blue-400 rounded-tl-sm" />
        <div className="absolute top-0 right-0 h-4 w-4 border-r-2 border-t-2 border-blue-400 rounded-tr-sm" />
        <div className="absolute bottom-0 left-0 h-4 w-4 border-l-2 border-b-2 border-blue-400 rounded-bl-sm" />
        <div className="absolute bottom-0 right-0 h-4 w-4 border-r-2 border-b-2 border-blue-400 rounded-br-sm" />
    </>
);

const GridBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#050b14] to-[#0a1525]">
        {/* Grid pattern */}
        <div
            className="absolute inset-0 opacity-10"
            style={{
                backgroundImage: `
                    linear-gradient(rgba(0, 229, 255, 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 229, 255, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
            }}
        />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[80px]" />

        {/* Animated scan line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-scan" />
    </div>
);

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [bootText, setBootText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        console.log("Login attempt with:", email);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("Login successful:", userCredential.user);

        } catch (err) {
            console.error("Login error:", err);
            setError(err.message || "Authentication failed");
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-[#050b14] text-white">
            <GridBackground />

            {/* Add scan animation CSS */}
            <style jsx>{`
                @keyframes scan {
                    0% {
                        transform: translateY(-100vh);
                    }
                    100% {
                        transform: translateY(100vh);
                    }
                }
                .animate-scan {
                    animation: scan 3s linear infinite;
                }
            `}</style>

            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="relative bg-gradient-to-b from-blue-900/20 to-blue-950/10 backdrop-blur-xl border border-blue-500/20 rounded-xl p-8 shadow-2xl shadow-blue-900/20">
                    <CornerBrackets />

                    <div className="text-center mb-10">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-400/30 shadow-lg shadow-blue-500/10">
                            <ShieldCheck className="w-10 h-10 text-blue-400" />
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter mb-2">
                            AERIAL<span className="text-blue-400">VISION</span>
                        </h1>
                        <p className="text-xs text-blue-300/80 font-mono tracking-widest">
                            Traffic Command Node
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-blue-300/70 tracking-wider">
                                Operator ID
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-blue-400/60" />
                                <input
                                    type="email"
                                    placeholder="test@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/40 border border-blue-500/30 text-white placeholder-blue-300/50 text-sm rounded-lg py-3.5 pl-12 pr-4 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-blue-300/70 tracking-wider">
                                Access Key
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-blue-400/60" />
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-blue-500/30 text-white placeholder-blue-300/50 text-sm rounded-lg py-3.5 pl-12 pr-4 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                                <AlertCircle size={16} />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-blue-800 disabled:to-cyan-800 text-white font-bold uppercase text-sm tracking-wider py-4 rounded-lg border border-blue-400/30 hover:border-blue-300/50 disabled:border-blue-700/30 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-400/30 disabled:shadow-none disabled:cursor-not-allowed group"
                        >
                            <span className="flex items-center justify-center gap-3">
                                {loading ? (
                                    <>
                                        <Activity className="animate-spin" size={18} />
                                        AUTHENTICATING...
                                    </>
                                ) : (
                                    <>
                                        <Crosshair size={18} className="group-hover:scale-110 transition-transform" />
                                        INITIALIZE SESSION
                                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-blue-500/20">
                        <div className="text-xs font-mono text-blue-400/70">
                            {bootText}
                            <span className="animate-pulse">_</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
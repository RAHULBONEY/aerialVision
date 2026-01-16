import React from 'react';
import VideoPanel from "@/components/panels/VideoPanel";
import { useDashboardStats, useIncidents } from "@/hooks/useDashboardQueries";
import {
    Activity,
    Zap,
    Clock,
    AlertTriangle,
    MapPin,
    MoreHorizontal,
    Siren,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    // 1. Fetch Data using the TanStack Query hooks we created
    const { data: stats, isLoading: statsLoading } = useDashboardStats();
    const { data: incidents, isLoading: incidentsLoading } = useIncidents();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ROW 1: HEADS-UP DISPLAY (Metrics) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="CONGESTION"
                    value={statsLoading ? "..." : stats?.congestionLevel}
                    subValue={statsLoading ? "CALCULATING..." : `${stats?.congestionScore || 0}% DENSITY`}
                    icon={Activity}
                    color="text-orange-500"
                    border="border-orange-500/30"
                />
                <StatCard
                    label="ACTIVE VEHICLES"
                    value={statsLoading ? "..." : stats?.activeVehicles}
                    subValue="SECTOR 4"
                    icon={Zap}
                    color="text-primary"
                    border="border-primary/30"
                />
                <StatCard
                    label="AVG SPEED"
                    value={statsLoading ? "..." : `${stats?.avgSpeed} KM/H`}
                    subValue="+2% vs AVG"
                    icon={Clock}
                    color="text-emerald-400"
                    border="border-emerald-500/30"
                />

                {/* EMERGENCY ACTION BUTTON */}
                <button className="relative h-full w-full overflow-hidden bg-red-600/10 hover:bg-red-600/20 border border-red-500/50 hover:border-red-500 text-red-500 transition-all duration-300 rounded-lg flex flex-col items-center justify-center gap-2 group p-4 shadow-[0_0_15px_rgba(220,38,38,0.1)] hover:shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(220,38,38,0.05)_10px,rgba(220,38,38,0.05)_20px)] opacity-50" />
                    <Siren size={28} className="group-hover:animate-bounce relative z-10" />
                    <span className="font-black tracking-[0.2em] text-sm relative z-10">TRIGGER SOS</span>
                </button>
            </div>

            {/* ROW 2: MAIN SURVEILLANCE & MAPS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[500px]">

                {/* VIDEO FEED (Takes 2/3 of width) */}
                <div className="lg:col-span-2 relative rounded-xl border border-white/10 bg-black overflow-hidden shadow-2xl group flex flex-col">
                    {/* The Video Panel Component */}
                    <div className="flex-1 relative">
                        <VideoPanel />

                        {/* Overlay: Camera ID */}
                        <div className="absolute top-4 left-4 z-10 flex gap-2">
                            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse shadow-lg">LIVE</span>
                            <span className="bg-black/60 backdrop-blur text-white text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 shadow-lg">CAM_FEED_04</span>
                        </div>

                        {/* Overlay: Scanning Grid Effect */}
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] opacity-20" />
                    </div>
                </div>

                {/* RIGHT COLUMN: INCIDENTS & MAP */}
                <div className="flex flex-col gap-4 h-full">

                    {/* Mini Map Placeholder */}
                    <div className="flex-1 min-h-[150px] bg-[#0B1C2D]/40 border border-white/10 rounded-xl relative overflow-hidden p-4 group cursor-pointer hover:border-primary/50 transition-colors">
                        {/* Fake Map Background */}
                        <div className="absolute inset-0 bg-[#162a40] opacity-50" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.1),transparent)]" />

                        {/* Grid Lines for Map Look */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />

                        <div className="relative z-10 flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                                <MapPin size={14} className="text-primary" /> GEOLOCATION
                            </h3>
                            <span className="text-[9px] font-mono text-primary bg-primary/10 px-1 rounded border border-primary/20">ACTIVE</span>
                        </div>

                        {/* Radar Ping Animation */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="relative">
                                <div className="w-2 h-2 bg-primary rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_#00E5FF]" />
                                <div className="w-24 h-24 border border-primary/30 rounded-full animate-ping opacity-75" />
                                <div className="w-48 h-48 border border-primary/10 rounded-full animate-pulse opacity-50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                    </div>

                    {/* INCIDENT LOG */}
                    <div className="flex-[1.5] bg-[#0B1C2D]/60 border border-white/10 rounded-xl p-4 overflow-hidden flex flex-col h-[280px]">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <AlertTriangle size={12} className="text-slate-500" /> Incident Log
                            </h3>
                            <span className="text-[10px] bg-white/5 text-slate-400 px-2 rounded-full border border-white/10 font-mono">
                                T-{incidents?.length || 0}
                            </span>
                        </div>

                        <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                            {incidentsLoading ? (
                                <div className="flex flex-col items-center justify-center h-32 space-y-2 text-xs text-slate-500 font-mono">
                                    <Activity className="animate-spin text-primary/50" size={20} />
                                    <span>SYNCING_LOGS...</span>
                                </div>
                            ) : incidents?.map((inc) => (
                                <div key={inc.id} className="p-3 bg-black/20 hover:bg-white/5 rounded border-l-2 border-transparent hover:border-primary transition-all group cursor-pointer">
                                    <div className="flex justify-between mb-1">
                                        <span className={cn(
                                            "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                                            inc.type === 'SOS' ? "bg-red-950/50 text-red-400 border border-red-900" :
                                                inc.type === 'ACCIDENT' ? "bg-orange-950/50 text-orange-400 border border-orange-900" :
                                                    "bg-slate-800 text-slate-300 border border-slate-700"
                                        )}>
                                            {inc.type}
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-mono group-hover:text-slate-400 transition-colors">{inc.time}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium leading-tight group-hover:text-white transition-colors">
                                        {inc.message}
                                    </p>
                                    <div className="mt-2 flex items-center gap-1 text-[9px] text-slate-600 uppercase font-bold">
                                        {inc.status === 'RESOLVED' ? (
                                            <CheckCircle2 size={10} className="text-green-500" />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                        )}
                                        {inc.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- REUSABLE STAT COMPONENT ---

function StatCard({ label, value, subValue, icon: Icon, color, border }) {
    return (
        <div className={cn(
            "bg-[#0B1C2D]/60 backdrop-blur-sm border border-white/5 p-4 rounded-xl relative overflow-hidden transition-all duration-300 group hover:bg-[#0B1C2D]/80 hover:shadow-[0_0_20px_-5px_rgba(0,229,255,0.1)]",
            border && `hover:${border}`
        )}>
            {/* Corner Accent */}
            <div className={cn("absolute top-0 right-0 w-8 h-8 opacity-10 transition-transform group-hover:scale-110", color.replace('text-', 'bg-'))} style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />

            <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">{label}</span>
                <Icon size={16} className={cn("opacity-60 group-hover:opacity-100 transition-opacity", color)} />
            </div>

            <div className="space-y-1 relative z-10">
                <div className={cn("text-2xl font-black tracking-tight font-mono", color)}>
                    {value}
                </div>
                <div className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-slate-500" />
                    {subValue}
                </div>
            </div>

            {/* Background Glow */}
            <div className={cn("absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-5 blur-2xl transition-opacity group-hover:opacity-10", color.replace('text-', 'bg-'))} />
        </div>
    );
}
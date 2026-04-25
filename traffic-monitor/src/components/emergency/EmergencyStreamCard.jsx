import React, { useRef, useState } from "react";
import { Activity, AlertTriangle, MapPin, Wifi, WifiOff, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeDensityPercent, computeSpeedFromDensity } from "@/hooks/useLiveStreamMetrics";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:8001";

export default function EmergencyStreamCard({ stream, onClick }) {
    const videoRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);

    const isSimulation = stream.type === "SIMULATION";

    const videoUrl = isSimulation
        ? `${GATEWAY_URL}/streams/${encodeURIComponent(stream.simulationId)}.mp4`
        : `${GATEWAY_URL}/streams/${stream.id}`;

    const statusConfig = {
        NORMAL: {
            border: "border-emerald-200 dark:border-emerald-500/30",
            badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30",
            icon: Activity,
            label: "STABLE",
            bg: "bg-emerald-100 dark:bg-emerald-500/10"
        },
        WARNING: {
            border: "border-amber-200 dark:border-amber-500/40",
            badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30",
            icon: AlertTriangle,
            label: "ALERT",
            bg: "bg-amber-100 dark:bg-amber-500/10"
        },
        CRITICAL: {
            border: "border-red-200 dark:border-red-500/50",
            badge: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30",
            icon: AlertTriangle,
            label: "CRITICAL",
            bg: "bg-red-100 dark:bg-red-500/10"
        }
    };

    const status = statusConfig[stream.currentStatus] || statusConfig.NORMAL;
    const StatusIcon = status.icon;
    // Use live computed density & speed if available, else fallback
    const densityPercent = stream.metrics?.densityPercent ?? computeDensityPercent(stream.metrics?.count);
    const density = densityPercent / 100;
    const speed = stream.metrics?.speed ?? computeSpeedFromDensity(densityPercent);

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (isSimulation && videoRef.current) {
            videoRef.current.play().catch(() => {});
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (isSimulation && videoRef.current) {
            videoRef.current.pause();
        }
    };

    return (
        <div
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "group relative overflow-hidden rounded-xl bg-white dark:bg-[#0a0a12] border-2 shadow-sm dark:shadow-none transition-all duration-300 cursor-pointer hover:shadow-lg dark:hover:shadow-rose-900/10",
                status.border
            )}
        >
            {/* Header */}
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin size={14} className="text-gray-500 dark:text-slate-400 shrink-0" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                {stream.name}
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={cn(
                                "text-xs font-mono px-2 py-0.5 rounded-full border",
                                stream.viewType === 'aerial'
                                    ? "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                                    : "bg-gray-100 dark:bg-slate-800/50 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-700"
                            )}>
                                {stream.viewType === 'aerial' ? 'DRONE' : 'GROUND'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-500 font-mono">
                                ID: {stream.id?.slice(0, 8).toUpperCase() || 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium shrink-0",
                        status.badge
                    )}>
                        <StatusIcon size={12} />
                        <span>{status.label}</span>
                    </div>
                </div>

                {/* Video / Thumbnail Area */}
                <div className="relative aspect-video rounded-lg overflow-hidden mb-4 border border-gray-200 dark:border-slate-800/50 bg-gray-900">
                    {isSimulation ? (
                        <>
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover"
                                onLoadedData={() => setVideoLoaded(true)}
                                onError={() => setVideoError(true)}
                            />
                            {/* Play overlay */}
                            <div className={cn(
                                "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200",
                                isHovered ? "opacity-0" : "opacity-100"
                            )}>
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Play className="w-5 h-5 text-white ml-0.5" />
                                </div>
                            </div>
                            {/* Pause indicator on hover */}
                            <div className={cn(
                                "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200",
                                isHovered ? "opacity-100" : "opacity-0"
                            )}>
                                <Pause className="w-6 h-6 text-white" />
                            </div>
                        </>
                    ) : (
                        <>
                            <img
                                src={videoUrl}
                                alt={`Live feed from ${stream.name}`}
                                className="w-full h-full object-cover"
                                onLoad={() => setVideoLoaded(true)}
                                onError={() => setVideoError(true)}
                            />
                            {/* Live Indicator for real streams */}
                            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-xs text-white font-mono">LIVE</span>
                            </div>
                        </>
                    )}

                    {/* Simulation live badge */}
                    {isSimulation && videoLoaded && !videoError && (
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-white font-mono">SIM</span>
                        </div>
                    )}

                    {/* Error / Loading states */}
                    {!videoLoaded && !videoError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <div className="text-center">
                                <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-gray-400 text-xs">Loading…</p>
                            </div>
                        </div>
                    )}
                    {videoError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <div className="text-center">
                                <WifiOff className="w-8 h-8 text-red-400 mx-auto mb-2" />
                                <p className="text-gray-400 text-xs">Stream Offline</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center">
                        <div className="text-gray-600 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">
                            DENSITY
                        </div>
                        <div className="flex items-center justify-center gap-1">
                            <span className={cn(
                                "text-xl font-bold font-mono",
                                density > 0.8 ? "text-red-600 dark:text-red-400" :
                                    density > 0.5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                            )}>
                                {Math.round(density * 100)}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-slate-500">%</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-gray-600 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">
                            AVG SPEED
                        </div>
                        <div className="flex items-center justify-center gap-1">
                            <span className={cn(
                                "text-xl font-bold font-mono",
                                speed < 10 ? "text-red-600 dark:text-red-400" :
                                    speed < 30 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                            )}>
                                {speed}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-slate-500">km/h</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-gray-200 dark:border-slate-800/50">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-500">
                        <div className="flex items-center gap-1.5">
                            {videoError ? (
                                <>
                                    <WifiOff size={12} className="text-red-400" />
                                    <span className="text-red-400">Offline</span>
                                </>
                            ) : (
                                <>
                                    <Wifi size={12} />
                                    <span>Connected</span>
                                </>
                            )}
                        </div>
                        <div className="font-mono">Read-Only</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

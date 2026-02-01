import React from "react";
import { Activity, AlertTriangle, MapPin, Wifi, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const getStreamThumbnail = (id, type) => {
    const placeholders = {
        aerial: [
            "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=800&auto=format&fit=crop",
        ],
        ground: [
            "https://images.unsplash.com/photo-1545459720-aacaf509ebc3?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?q=80&w=800&auto=format&fit=crop",
        ]
    };

    const collection = type === 'aerial' ? placeholders.aerial : placeholders.ground;
    const index = id?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % collection.length || 0;
    return collection[index];
};

export default function EmergencyStreamCard({ stream, onClick }) {
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
    const density = stream.metrics?.density || 0;
    const speed = stream.metrics?.speed || 0;

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden rounded-xl bg-white dark:bg-[#0a0a12] border-2 shadow-sm dark:shadow-none transition-all duration-300 cursor-pointer hover:shadow-lg dark:hover:shadow-rose-900/10",
                status.border
            )}
        >
            {/* Header */}
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin size={14} className="text-gray-500 dark:text-slate-400" />
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
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium",
                        status.badge
                    )}>
                        <StatusIcon size={12} />
                        <span>{status.label}</span>
                    </div>
                </div>

                {/* Thumbnail */}
                <div className="relative aspect-video rounded-lg overflow-hidden mb-4 border border-gray-200 dark:border-slate-800/50 bg-gray-100 dark:bg-black">
                    <img
                        src={getStreamThumbnail(stream.id, stream.viewType)}
                        alt={`Feed from ${stream.name}`}
                        className="w-full h-full object-cover opacity-90 dark:opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/20 dark:from-black/80 via-transparent to-transparent"></div>

                    {/* Live Indicator */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-white font-mono">LIVE</span>
                    </div>

                    {/* View Button */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-rose-500/90 backdrop-blur-sm px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye size={12} className="text-white" />
                        <span className="text-xs text-white font-medium">View</span>
                    </div>
                </div>

                {/* Read-Only Metrics */}
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

                {/* Connection Status */}
                <div className="pt-3 border-t border-gray-200 dark:border-slate-800/50">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <Wifi size={12} />
                            <span>Connected</span>
                        </div>
                        <div className="font-mono">Read-Only</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

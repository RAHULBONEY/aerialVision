import React from 'react';
import { X, Activity, MapPin, Wifi, Eye, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function StreamDetailModal({ stream, onClose }) {
    if (!stream) return null;

    const statusConfig = {
        NORMAL: {
            bg: "bg-emerald-100 dark:bg-emerald-500/10",
            text: "text-emerald-700 dark:text-emerald-400",
            label: "STABLE"
        },
        WARNING: {
            bg: "bg-amber-100 dark:bg-amber-500/10",
            text: "text-amber-700 dark:text-amber-400",
            label: "ALERT"
        },
        CRITICAL: {
            bg: "bg-red-100 dark:bg-red-500/10",
            text: "text-red-700 dark:text-red-400",
            label: "CRITICAL"
        }
    };

    const status = statusConfig[stream.currentStatus] || statusConfig.NORMAL;
    const density = stream.metrics?.density || 0;
    const speed = stream.metrics?.speed || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0a0a12] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", status.bg)}>
                            {stream.currentStatus === 'CRITICAL' || stream.currentStatus === 'WARNING' ? (
                                <AlertTriangle size={20} className={status.text} />
                            ) : (
                                <Activity size={20} className={status.text} />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{stream.name}</h2>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-500">
                                <MapPin size={12} />
                                <span>{stream.viewType === 'aerial' ? 'Drone Feed' : 'Ground Camera'}</span>
                                <span className="font-mono">• ID: {stream.id?.slice(0, 8).toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500 dark:text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {/* Video Feed */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900">
                        <img
                            src={getStreamThumbnail(stream.id, stream.viewType)}
                            alt={`Live feed from ${stream.name}`}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Live Badge */}
                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-sm text-white font-mono">LIVE</span>
                        </div>

                        {/* Status Badge */}
                        <div className={cn(
                            "absolute top-4 right-4 px-3 py-1.5 rounded-lg text-sm font-bold",
                            status.bg, status.text
                        )}>
                            {status.label}
                        </div>

                        {/* Read-Only Indicator */}
                        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                            <Eye size={14} className="text-white" />
                            <span className="text-xs text-white">Read-Only View</span>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide mb-1">Density</p>
                            <p className={cn(
                                "text-2xl font-bold font-mono",
                                density > 0.8 ? "text-red-600 dark:text-red-400" :
                                    density > 0.5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                            )}>
                                {Math.round(density * 100)}%
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide mb-1">Avg Speed</p>
                            <p className={cn(
                                "text-2xl font-bold font-mono",
                                speed < 10 ? "text-red-600 dark:text-red-400" :
                                    speed < 30 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                            )}>
                                {speed} km/h
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide mb-1">Model</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                                {stream.activeModel || 'N/A'}
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide mb-1">Connection</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
                                <Wifi size={20} />
                                Strong
                            </p>
                        </div>
                    </div>

                    {/* Info Notice */}
                    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <Eye size={20} className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-rose-800 dark:text-rose-300">Read-Only Access</p>
                                <p className="text-sm text-rose-700 dark:text-rose-400 mt-1">
                                    As an Emergency Operator, you can monitor this feed but cannot control stream settings.
                                    Contact Traffic Control for any required actions.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

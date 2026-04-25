import React, { useState } from 'react';
import { X, Activity, MapPin, Wifi, WifiOff, AlertTriangle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeDensityPercent, computeSpeedFromDensity } from '@/hooks/useLiveStreamMetrics';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function StreamDetailModal({ stream, onClose }) {
    if (!stream) return null;

    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);

    const isSimulation = stream.type === "SIMULATION";
    const videoUrl = isSimulation
        ? `${API_URL}/api/streams/${encodeURIComponent(stream.simulationId)}.mp4`
        : `${API_URL}/api/streams/${stream.id}`;

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
    const densityPercent = stream.metrics?.densityPercent ?? computeDensityPercent(stream.metrics?.count);
    const density = densityPercent / 100;
    const speed = stream.metrics?.speed ?? computeSpeedFromDensity(densityPercent);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-10 bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0a0a12] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden border border-gray-200/50 dark:border-white/[0.06] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.03]">
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
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-slate-800">
                        {isSimulation ? (
                            <video
                                src={videoUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                controls
                                className="w-full h-full object-contain"
                                onLoadedData={() => setVideoLoaded(true)}
                                onError={() => setVideoError(true)}
                            />
                        ) : (
                            <img
                                src={videoUrl}
                                alt={`Live feed from ${stream.name}`}
                                className="w-full h-full object-contain"
                                onLoad={() => setVideoLoaded(true)}
                                onError={() => setVideoError(true)}
                            />
                        )}

                        {/* Overlays */}
                        {!videoLoaded && !videoError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <div className="text-center">
                                    <div className="w-10 h-10 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-gray-300 text-sm">Connecting to stream…</p>
                                </div>
                            </div>
                        )}

                        {videoError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <div className="text-center p-6">
                                    <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-3" />
                                    <h3 className="text-white font-medium mb-1">Stream Offline</h3>
                                    <p className="text-gray-400 text-sm">Unable to connect to video source.</p>
                                </div>
                            </div>
                        )}

                        {/* Status Badge */}
                        {videoLoaded && !videoError && (
                            <div className={cn(
                                "absolute top-4 right-4 px-3 py-1.5 rounded-lg text-sm font-bold",
                                status.bg, status.text
                            )}>
                                {status.label}
                            </div>
                        )}

                        {/* Live / Sim Badge */}
                        {videoLoaded && !videoError && (
                            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                                <div className={cn(
                                    "w-2 h-2 rounded-full animate-pulse",
                                    isSimulation ? "bg-amber-500" : "bg-red-500"
                                )} />
                                <span className="text-sm text-white font-mono">
                                    {isSimulation ? "SIMULATION" : "LIVE"}
                                </span>
                            </div>
                        )}
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
                                {stream.model || 'N/A'}
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide mb-1">Connection</p>
                            <p className={cn(
                                "text-2xl font-bold flex items-center justify-center gap-2",
                                videoError ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                            )}>
                                {videoError ? <WifiOff size={20} /> : <Wifi size={20} />}
                                {videoError ? "Offline" : "Strong"}
                            </p>
                        </div>
                    </div>

                    {/* Info Notice */}
                    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <Play size={20} className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
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

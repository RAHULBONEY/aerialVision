import React, { useState } from 'react';
import { Video, RefreshCw, Activity, Eye } from 'lucide-react';
import { useEmergencyStreams } from '@/hooks/useEmergencyStreams';
import EmergencyStreamCard from '@/components/emergency/EmergencyStreamCard';
import StreamDetailModal from '@/components/emergency/StreamDetailModal';

export default function Streams() {
    const { data: streams, isLoading, error, refetch } = useEmergencyStreams();
    const [selectedStream, setSelectedStream] = useState(null);

    // Count by status
    const normalCount = streams?.filter(s => s.currentStatus === 'NORMAL').length || 0;
    const warningCount = streams?.filter(s => s.currentStatus === 'WARNING').length || 0;
    const criticalCount = streams?.filter(s => s.currentStatus === 'CRITICAL').length || 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-600 dark:text-slate-400 animate-pulse">Loading Surveillance Grid...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30 rounded-xl text-red-800 dark:text-red-200 m-6">
                <h3 className="font-bold flex items-center gap-2">
                    Connection Error
                </h3>
                <p className="text-sm mt-2">{error.message}</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Video className="text-rose-500" size={28} />
                        Emergency Stream Monitor
                    </h1>
                    <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">
                        Monitoring {streams?.length || 0} active surveillance feeds
                    </p>
                </div>

                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 rounded-lg text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-500/30 transition-colors"
                >
                    <RefreshCw size={16} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
                            <Activity size={20} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Normal Status</p>
                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{normalCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-500/10 rounded-lg">
                            <Activity size={20} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Warning Status</p>
                            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{warningCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-lg">
                            <Activity size={20} className="text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Critical Status</p>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">{criticalCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stream Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {streams?.map((stream) => (
                    <EmergencyStreamCard
                        key={stream.id}
                        stream={stream}
                        onClick={() => setSelectedStream(stream)}
                    />
                ))}
            </div>

            {/* Empty State */}
            {streams?.length === 0 && (
                <div className="p-10 border border-dashed border-gray-300 dark:border-slate-800 rounded-xl text-center text-gray-500 dark:text-slate-500 bg-white dark:bg-[#0a0a12]">
                    <Video size={48} className="mx-auto text-gray-400 dark:text-slate-600 mb-4" />
                    <p className="text-lg font-medium text-gray-700 dark:text-slate-300">
                        No streams available
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
                        Streams will appear here when available
                    </p>
                </div>
            )}

            {/* Status Legend */}
            <div className="pt-6 border-t border-gray-200 dark:border-slate-800/50">
                <div className="flex flex-col sm:flex-row items-center justify-between text-sm">
                    <div className="flex items-center gap-6 mb-4 sm:mb-0">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-gray-600 dark:text-slate-400">Normal</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                            <span className="text-gray-600 dark:text-slate-400">Warning</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-gray-600 dark:text-slate-400">Critical</span>
                        </div>
                    </div>
                    <div className="text-gray-500 dark:text-slate-500 text-xs font-mono flex items-center gap-2">
                        <Eye size={12} />
                        Read-Only View
                    </div>
                </div>
            </div>

            {/* Stream Detail Modal */}
            {selectedStream && (
                <StreamDetailModal
                    stream={selectedStream}
                    onClose={() => setSelectedStream(null)}
                />
            )}
        </div>
    );
}

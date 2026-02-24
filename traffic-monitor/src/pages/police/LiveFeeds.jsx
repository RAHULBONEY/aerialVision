import React, { useState } from 'react';
import { usePoliceStreams } from '@/hooks/useStreams';
import StreamCard from '@/components/police/StreamCard';
import StreamDetailModal from '@/components/admin/StreamDetailModal';
import { BarChart3, Cpu, Clock, Filter, RefreshCw, AlertTriangle } from 'lucide-react';

export default function LiveFeeds() {
    const { data: streams, isLoading, error, refetch } = usePoliceStreams();
    const [selectedStream, setSelectedStream] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleStreamClick = (stream) => {
        setSelectedStream(stream);
        setModalOpen(true);
    };

    // Mock stats data
    const systemStats = {
        activeNodes: 4,
        totalCoverage: '18.2 km²',
        avgInferenceSpeed: '45ms',
        uptime: '99.8%'
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-600 dark:text-slate-400 animate-pulse">Establishing Secure Uplink...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30 rounded-xl text-red-800 dark:text-red-200">
                <h3 className="font-bold flex items-center gap-2">
                    <AlertTriangle size={18} /> Connection Failure
                </h3>
                <p className="text-sm mt-2">{error.message}</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Live Surveillance Grid
                    </h1>
                    <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">
                        Real-time inference feeds from {streams?.length || 0} active nodes.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#0a1525] border border-gray-300 dark:border-blue-900/50 rounded-lg text-gray-700 dark:text-blue-200 hover:border-blue-500/50 transition-colors">
                        <Filter size={16} />
                        <span>Filter View</span>
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/30 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
                    >
                        <RefreshCw size={16} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* System Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-xl p-4 shadow-sm dark:shadow-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                            <BarChart3 size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Total Coverage</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{systemStats.totalCoverage}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-xl p-4 shadow-sm dark:shadow-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-100 dark:bg-cyan-500/10 rounded-lg">
                            <Cpu size={20} className="text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Avg Inference Speed</p>
                            <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{systemStats.avgInferenceSpeed}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-xl p-4 shadow-sm dark:shadow-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
                            <Clock size={20} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Uptime</p>
                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{systemStats.uptime}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stream Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {streams?.map((stream) => (
                    <StreamCard
                        key={stream.id}
                        stream={stream}
                        onClick={handleStreamClick}
                    />
                ))}
            </div>

            {/* Stream Detail Modal */}
            <StreamDetailModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                stream={selectedStream}
            />

            {/* Status Footer */}
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
                    <div className="text-gray-500 dark:text-slate-500 text-xs font-mono">
                        Last Update: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        </div>
    );
}
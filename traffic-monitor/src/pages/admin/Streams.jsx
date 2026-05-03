import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStreams, useCreateStream, useToggleStream, useStopStream } from "@/hooks/useStreams";
import { useLiveStreamMetrics } from "@/hooks/useLiveStreamMetrics";
import { cn } from "@/lib/utils";
import CreateStreamModal from "@/components/admin/CreateStreamModal";
import StreamDetailModal from "@/components/admin/StreamDetailModal";


import {
    Play, Pause, Eye, Video, AlertTriangle,
    ChevronUp, ChevronDown, Trash2, Wifi, WifiOff,
    Activity
} from "lucide-react";


const MODEL_OPTIONS = [
    { id: "mark-1", name: "Mark-1", description: "Fast Inference", bestFor: "Basic Monitoring" },
    { id: "mark-2", name: "Mark-2", description: "CCTV Optimized", bestFor: "Ground Traffic" },
    { id: "mark-2.5", name: "Mark-2.5", description: "Balanced", bestFor: "Mixed Sources" },
    { id: "mark-3", name: "Mark-3", description: "Aerial Precision", bestFor: "Drone/Aerial", isProduction: true },
    { id: "mark-4", name: "Mark-4", description: "Research Model", bestFor: "High Accuracy", isExperimental: true },
    { id: "mark-5", name: "Mark-5", description: "Advanced Precision", bestFor: "Aerial/Research", isExperimental: true },
];

const STATUS_CONFIG = {
    active: { bg: "bg-green-100", text: "text-green-800", icon: <Wifi className="w-3 h-3" /> },
    inactive: { bg: "bg-gray-100", text: "text-gray-600", icon: <WifiOff className="w-3 h-3" /> },
    error: { bg: "bg-red-100", text: "text-red-800", icon: <AlertTriangle className="w-3 h-3" /> },
};


const StatusBadge = ({ status, error }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
    return (
        <div className="flex flex-col">
            <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium w-fit", config.bg, config.text)}>
                {config.icon}
                {status}
            </span>
            {error && <span className="text-[10px] text-red-500 mt-1 truncate max-w-[150px]">{error}</span>}
        </div>
    );
};

const SortableHeader = ({ column, children, isActive, sortOrder, onClick }) => (
    <th
        onClick={() => onClick(column)}
        className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
        <div className="flex items-center gap-1">
            {children}
            {isActive && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
        </div>
    </th>
);

function StreamRow({ stream, liveMetrics, onToggle, onView, onStop, onTelemetry }) {
    const [isHovered, setIsHovered] = useState(false);
    const model = MODEL_OPTIONS.find(m => m.id === stream.model) || MODEL_OPTIONS[0];

    return (
        <tr
            className={cn(
                "border-b border-gray-200 dark:border-gray-800 transition-colors",
                isHovered ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <td className="py-4 pl-6 pr-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                        <Video className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{stream.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{stream.type}</p>
                    </div>
                </div>
            </td>
            <td className="py-4 px-4">
                <div className="space-y-1">
                    <div className="font-medium text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                        {model.name}
                        {model.isProduction && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded font-medium">PROD</span>
                        )}
                        {model.isExperimental && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded font-medium">🧪 EXP</span>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Best for: {model.bestFor}</p>
                </div>
            </td>
            <td className="py-4 px-4">
                <StatusBadge status={stream.status} error={stream.error} />
            </td>
            <td className="py-4 px-4">
                {stream.status !== 'active' ? (
                    <div className="text-sm text-gray-400 italic">Offline</div>
                ) : liveMetrics ? (
                    <div className="space-y-1">
                        <div className="text-sm font-mono text-gray-900 dark:text-gray-100">{liveMetrics.avgSpeed || 0} km/h</div>
                        <div className="text-xs text-gray-500">Count: {liveMetrics.count || 0}</div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="text-sm font-mono text-gray-400 dark:text-gray-500">Awaiting data...</div>
                        <div className="text-xs text-gray-400 animate-pulse">Connecting to GPU...</div>
                    </div>
                )}
            </td>
            <td className="py-4 px-4 text-right">
                <div className="flex items-center gap-2 justify-end">
                    <button
                        onClick={() => onToggle(stream.id)}
                        title={stream.status === "active" ? "Pause" : "Start"}
                        className="p-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900 dark:bg-gray-800 dark:border-transparent dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors shadow-sm"
                    >
                        {stream.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => onView(stream)}
                        className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-900/30 dark:border-transparent dark:text-blue-400 transition-colors shadow-sm"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onTelemetry(stream.id)}
                        title="Live Telemetry"
                        className="p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300 dark:bg-cyan-900/30 dark:border-transparent dark:text-cyan-400 transition-colors shadow-sm"
                    >
                        <Activity className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onStop(stream.id)}
                        title="Delete Stream"
                        className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 dark:bg-red-900/30 dark:border-transparent dark:text-red-400 transition-colors shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default function Streams() {
    const { data = [] } = useStreams();
    const streamIds = useMemo(() => data.map(s => s.id), [data]);
    const metricsMap = useLiveStreamMetrics(streamIds);
    const createStreamMutation = useCreateStream();
    const toggleStreamMutation = useToggleStream();
    const stopStreamMutation = useStopStream();
    const navigate = useNavigate();

    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [selectedStream, setSelectedStream] = useState(null);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState("asc");
    const handleViewStream = (stream) => {

        setSelectedStream(stream);
    };
    const handleTelemetry = (id) => {
        navigate(`/admin/streams/${id}/telemetry`);
    };

    const filteredStreams = useMemo(() => {
        return [...data]
            .filter(stream =>
                !search || stream.name?.toLowerCase().includes(search.toLowerCase())
            )
            .sort((a, b) => {
                const order = sortOrder === "asc" ? 1 : -1;
                if (sortBy === "name") {
                    return order * (a.name || "").localeCompare(b.name || "");
                }
                if (sortBy === "status") {
                    return order * (a.status || "").localeCompare(b.status || "");
                }
                return 0;
            });
    }, [data, search, sortBy, sortOrder]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("asc");
        }
    };
    const handleCreateStream = async (payload) => {

        await createStreamMutation.mutateAsync(payload);
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Live Streams Dashboard</h1>
                <button
                    onClick={() => setOpenCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Video className="w-4 h-4" />
                    Add New Stream
                </button>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <input
                        type="text"
                        placeholder="Search streams..."
                        className="w-full max-w-sm px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                                <SortableHeader
                                    column="name"
                                    isActive={sortBy === "name"}
                                    sortOrder={sortOrder}
                                    onClick={handleSort}
                                >
                                    Stream Name
                                </SortableHeader>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">AI Model</th>
                                <SortableHeader
                                    column="status"
                                    isActive={sortBy === "status"}
                                    sortOrder={sortOrder}
                                    onClick={handleSort}
                                >
                                    Status
                                </SortableHeader>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStreams.length > 0 ? (
                                filteredStreams.map(stream => (
                                    <StreamRow
                                        key={stream.id}
                                        stream={stream}
                                        liveMetrics={metricsMap[stream.id]}
                                        onToggle={(id) => toggleStreamMutation.mutate({ id, status: stream.status })}
                                        onView={handleViewStream}
                                        onStop={(id) => stopStreamMutation.mutate(id)}
                                        onTelemetry={handleTelemetry}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-gray-500">
                                        No streams found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateStreamModal
                open={openCreateModal}
                onClose={() => setOpenCreateModal(false)}
                onCreate={handleCreateStream}
                modelOptions={MODEL_OPTIONS}
            />

            {selectedStream && (
                <StreamDetailModal
                    stream={selectedStream}
                    open={!!selectedStream}
                    onClose={() => setSelectedStream(null)}
                />
            )}
        </div>
    );
}
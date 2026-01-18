import React, { useState, useMemo } from "react";
import { useStreams, useCreateStream, useToggleStream } from "@/hooks/useStreams";
import { cn } from "@/lib/utils";
import CreateStreamModal from "@/components/admin/CreateStreamModal";
import StreamDetailModal from "@/components/admin/StreamDetailModal";

// Icons
import {
    Play, Pause, Eye, Video, AlertTriangle,
    ChevronUp, ChevronDown, Settings, Wifi, WifiOff
} from "lucide-react";

// 1. CONSTANTS - Moved outside to prevent re-creation
const MODEL_OPTIONS = [
    { id: "mark-1", name: "Mark-1", description: "Fast Inference", bestFor: "Basic Monitoring" },
    { id: "mark-2", name: "Mark-2", description: "CCTV Optimized", bestFor: "Ground Traffic" },
    { id: "mark-2.5", name: "Mark-2.5", description: "Balanced", bestFor: "Mixed Sources" },
    { id: "mark-3", name: "Mark-3", description: "Aerial Precision", bestFor: "Drone/Aerial" },
];

const STATUS_CONFIG = {
    active: { bg: "bg-green-100", text: "text-green-800", icon: <Wifi className="w-3 h-3" /> },
    inactive: { bg: "bg-gray-100", text: "text-gray-600", icon: <WifiOff className="w-3 h-3" /> },
    error: { bg: "bg-red-100", text: "text-red-800", icon: <AlertTriangle className="w-3 h-3" /> },
};

// 2. SUB-COMPONENTS - Defined outside main component
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

function StreamRow({ stream, onToggle, onView, onStop }) {
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
                    <div className="font-medium text-sm">{model.name}</div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Best for: {model.bestFor}</p>
                </div>
            </td>
            <td className="py-4 px-4">
                <StatusBadge status={stream.status} error={stream.error} />
            </td>
            <td className="py-4 px-4">
                <div className="space-y-1">
                    <div className="text-sm font-mono">{stream.metrics?.fps || "0"} FPS</div>
                    <div className="text-xs text-gray-500">{stream.metrics?.latency || "0"}ms latency</div>
                </div>
            </td>
            <td className="py-4 px-4 text-right">
                <div className="flex items-center gap-2 justify-end">
                    <button
                        onClick={() => onToggle(stream.id)}
                        title={stream.status === "active" ? "Pause" : "Start"}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                    >
                        {stream.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => onView(stream)}
                        className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onStop(stream.id)}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// 3. MAIN COMPONENT
export default function Streams() {
    const { data = [], stopStream, toggleStream } = useStreams();
    const createStreamMutation = useCreateStream();
    const toggleStreamMutation = useToggleStream();


    if (data.length > 0) console.log("✅ Streams Data Received:", data);
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [selectedStream, setSelectedStream] = useState(null);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState("asc");
    const handleViewStream = (stream) => {
        console.log("👁️ User clicked view for stream:", stream);
        console.log("👉 Target URL should be:", stream.aiEngineUrl);
        setSelectedStream(stream);
    };
    // Memoize filtered data to prevent unnecessary re-sorts on every render
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

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Live Streams Dashboard</h1>
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
                                        onToggle={(id) => toggleStreamMutation.mutate({ id, status: stream.status })}
                                        onView={handleViewStream} // Use the wrapper function
                                        onStop={(id) => stopStreamMutation.mutate(id)}
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
                onCreate={(payload) => createStreamMutation.mutateAsync(payload)}
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
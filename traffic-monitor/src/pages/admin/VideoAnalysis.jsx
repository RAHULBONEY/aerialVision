import React, { useState, useRef, useCallback, useEffect } from "react";
import {
    Upload,
    Play,
    Video,
    AlertTriangle,
    Radio,
    Car,
    Clock,
    Loader2,
    CheckCircle,
    XCircle,
    Settings,
    RefreshCw,
    Film,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import SmartVideoPlayer from "@/components/stream/SmartVideoPlayer";
import { auth } from "@/lib/firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Simulation scenarios
const SIMULATION_SCENARIOS = [
    {
        id: "sim_ambulance_01",
        name: "🚑 Emergency Corridor",
        description: "Green Wave simulation with ambulance",
        tags: ["GREEN_WAVE", "PRIORITY"],
    },
    {
        id: "sim_highway_jam_01",
        name: "🚗 Highway Jam",
        description: "High density traffic congestion",
        tags: ["CONGESTION", "HIGH_DENSITY"],
    },
    {
        id: "sim_stalled_truck_01",
        name: "🚛 Stalled Vehicle",
        description: "Obstruction scenario with stalled truck",
        tags: ["OBSTRUCTION", "STALL"],
    },
];

const INCIDENT_COLORS = {
    GREEN_WAVE: "border-green-500 bg-green-500/10",
    OBSTRUCTION: "border-red-500 bg-red-500/10",
    CONGESTION: "border-amber-500 bg-amber-500/10",
};

const SEVERITY_COLORS = {
    CRITICAL: "bg-red-600",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-yellow-500",
    LOW: "bg-gray-500",
};

export default function VideoAnalysis() {
    const [mode, setMode] = useState("simulation"); // 'simulation' | 'upload'
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [streamId, setStreamId] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);

    // Socket connection for telemetry
    const {
        isConnected,
        stats,
        streamStatus,
        incidents,
        greenWaveActive,
        getFrameData,
        clearBuffer,
    } = useSocket(streamId);

    // Start simulation
    const startSimulation = async (scenario) => {
        setIsStarting(true);
        setError(null);
        clearBuffer();

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");

            const token = await user.getIdToken();
            const newStreamId = `sim_${Date.now()}`;

            const res = await fetch(`${API_URL}/api/incidents/analyze/simulation`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    simulationId: scenario.id,
                    streamId: newStreamId,
                    streamName: scenario.name,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || "Failed to start simulation");
            }

            setSelectedScenario(scenario);
            setStreamId(newStreamId);

            // For demo, use a placeholder video URL (local file would be served statically)
            setVideoUrl(`${API_URL}/streams/${scenario.id.replace("sim_", "")}.mp4`);

        } catch (err) {
            console.error("Start simulation error:", err);
            setError(err.message);
        } finally {
            setIsStarting(false);
        }
    };

    // Handle file upload
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsStarting(true);
        setError(null);
        clearBuffer();

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");

            const token = await user.getIdToken();
            const newStreamId = `upload_${Date.now()}`;

            const formData = new FormData();
            formData.append("video", file);
            formData.append("streamId", newStreamId);
            formData.append("streamName", file.name);

            const res = await fetch(`${API_URL}/api/incidents/analyze/upload`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || "Failed to upload video");
            }

            setStreamId(newStreamId);
            setVideoUrl(URL.createObjectURL(file));

        } catch (err) {
            console.error("Upload error:", err);
            setError(err.message);
        } finally {
            setIsStarting(false);
        }
    };

    // Reset analysis
    const resetAnalysis = () => {
        setStreamId(null);
        setVideoUrl(null);
        setSelectedScenario(null);
        setError(null);
        clearBuffer();
    };

    return (
        <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-[#020617]">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Video className="w-7 h-7 text-blue-500" />
                        AI Video Analysis
                    </h1>
                    <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">
                        Stream analysis powered by Mark 4.5 Ironclad Engine
                    </p>
                </div>

                {streamId && (
                    <button
                        onClick={resetAnalysis}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        New Analysis
                    </button>
                )}
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-4">
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
                    isConnected
                        ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                )}>
                    <Radio className={cn("w-3 h-3", isConnected && "animate-pulse")} />
                    {isConnected ? "Socket Connected" : "Disconnected"}
                </div>

                {streamStatus !== "IDLE" && (
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
                        streamStatus === "ANALYZING" && "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
                        streamStatus === "COMPLETED" && "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
                        streamStatus === "ERROR" && "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                    )}>
                        {streamStatus === "ANALYZING" && <Loader2 className="w-3 h-3 animate-spin" />}
                        {streamStatus === "COMPLETED" && <CheckCircle className="w-3 h-3" />}
                        {streamStatus === "ERROR" && <XCircle className="w-3 h-3" />}
                        {streamStatus}
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 dark:text-red-300">{error}</span>
                </div>
            )}

            {/* Main Content */}
            {!streamId ? (
                // Selection Mode
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Simulation Panel */}
                    <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <Film className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 dark:text-white">
                                    Simulation Scenarios
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-slate-400">
                                    Pre-configured demo scenarios
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {SIMULATION_SCENARIOS.map((scenario) => (
                                <button
                                    key={scenario.id}
                                    onClick={() => startSimulation(scenario)}
                                    disabled={isStarting}
                                    className={cn(
                                        "w-full p-4 rounded-xl border text-left transition-all",
                                        "bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700",
                                        "hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10",
                                        isStarting && "opacity-50 cursor-wait"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {scenario.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                                                {scenario.description}
                                            </p>
                                        </div>
                                        {isStarting ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                        ) : (
                                            <Play className="w-5 h-5 text-blue-500" />
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        {scenario.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-0.5 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-400 text-xs rounded"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Upload Panel */}
                    <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                                <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 dark:text-white">
                                    Upload Video
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-slate-400">
                                    Analyze your own traffic footage
                                </p>
                            </div>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-12 text-center cursor-pointer transition-all",
                                "hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/10"
                            )}
                        >
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-slate-400 mb-2">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-sm text-gray-500 dark:text-slate-500">
                                MP4, AVI, MOV up to 500MB
                            </p>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        {/* Model Info */}
                        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
                                <Zap className="w-4 h-4" />
                                Ironclad Protocol Active
                            </div>
                            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                                All analysis uses Mark 4.5 for maximum ambulance detection accuracy (53.3% mAP).
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                // Analysis Mode
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Video Player */}
                    <div className="lg:col-span-2">
                        <SmartVideoPlayer
                            videoSrc={videoUrl}
                            streamId={streamId}
                            stats={stats}
                            greenWaveActive={greenWaveActive}
                            getFrameData={getFrameData}
                            streamStatus={streamStatus}
                            className="aspect-video"
                        />

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm">
                                    <Car className="w-4 h-4" />
                                    Vehicles
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {stats.count || 0}
                                </p>
                            </div>

                            <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm">
                                    <Radio className="w-4 h-4" />
                                    Status
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {stats.status || "—"}
                                </p>
                            </div>

                            <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    Incidents
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {incidents.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Incident Log */}
                    <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                Detected Incidents
                            </h3>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto">
                            {incidents.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 dark:text-slate-400">
                                    <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No incidents detected yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {incidents.map((item, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "p-4 border-l-4",
                                                INCIDENT_COLORS[item.incident?.type] || "border-gray-300"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {item.incident?.type || "UNKNOWN"}
                                                </span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-bold text-white",
                                                    SEVERITY_COLORS[item.incident?.severity] || SEVERITY_COLORS.LOW
                                                )}>
                                                    {item.incident?.severity}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                                                {item.incident?.description}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(item.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

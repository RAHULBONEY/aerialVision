import { useState, useEffect, useCallback } from "react";
import {
    X, BarChart, AlertTriangle, Clock, Users, Activity,
    Download, Video, Wifi, Settings, Zap, Eye, Shield,
    Maximize2, Minimize2, RefreshCw, Volume2, VolumeX, Film, Play, Pause, Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";

// Gateway URL for simulations (Python Gateway serves video files)
const GATEWAY_URL = "http://localhost:8001";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function StreamDetailModal({ stream, open, onClose }) {
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(null);
    const [streamUrl, setStreamUrl] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [activeTab, setActiveTab] = useState("analytics");
    const [isPlaying, setIsPlaying] = useState(true);
    const [analysisTriggered, setAnalysisTriggered] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);

    // Socket.io for real-time telemetry
    const {
        isConnected,
        stats,
        streamStatus,
        incidents,
        greenWaveActive,
        analysisProgress
    } = useSocket(open && stream ? stream.id : null);

    // Determine the correct URL based on stream type
    useEffect(() => {
        if (open && stream) {
            setVideoLoaded(false);
            setVideoError(null);
            setAnalysisTriggered(false);
            setAnalysisError(null);

            if (stream.type === "SIMULATION") {
                // For simulations, serve video directly from Python Gateway
                const videoUrl = `${GATEWAY_URL}/streams/${stream.simulationId}.mp4`;
                setStreamUrl(videoUrl);
            } else {
                // For RTSP/Webcam, use the proxy endpoint
                const proxyUrl = `${API_URL}/api/admin/streams/proxy/${stream.engineStreamId}`;
                setStreamUrl(proxyUrl);
            }
        }
    }, [open, stream]);

    // Trigger analysis for SIMULATION streams when modal opens
    useEffect(() => {
        if (!open || !stream || stream.type !== "SIMULATION" || analysisTriggered) return;

        const triggerAnalysis = async () => {
            try {
                setAnalysisTriggered(true);
                console.log("🧠 Triggering simulation analysis for:", stream.simulationId);

                // Get auth token
                const { auth } = await import("@/lib/firebase");
                const user = auth.currentUser;
                let headers = { "Content-Type": "application/json" };

                if (user) {
                    const token = await user.getIdToken();
                    headers["Authorization"] = `Bearer ${token}`;
                }

                const response = await fetch(`${API_URL}/api/incidents/analyze/simulation`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        simulationId: stream.simulationId,
                        streamId: stream.id,
                        streamName: stream.name,
                        model: stream.model || "mark4.5"
                    })
                });

                const data = await response.json();
                if (!data.success) {
                    console.error("Analysis trigger failed:", data.message);
                    setAnalysisError(data.message);
                } else {
                    console.log("✅ Analysis started:", data);
                }
            } catch (err) {
                console.error("Failed to trigger analysis:", err);
                setAnalysisError(err.message);
            }
        };

        triggerAnalysis();
    }, [open, stream, analysisTriggered]);

    if (!open || !stream) return null;

    const isSimulation = stream.type === "SIMULATION";

    const modelConfig = {
        "mark-1": { color: "from-gray-500 to-gray-600", accuracy: "85%" },
        "mark-2": { color: "from-blue-500 to-blue-600", accuracy: "92%" },
        "mark-2.5": { color: "from-purple-500 to-purple-600", accuracy: "94%" },
        "mark-3": { color: "from-emerald-500 to-teal-600", accuracy: "96%" },
        "mark4": { color: "from-purple-500 to-pink-600", accuracy: "97%" },
        "mark4.5": { color: "from-red-500 to-orange-600", accuracy: "98%" },
    };

    const model = modelConfig[stream.model] || modelConfig["mark-3"];

    const getStreamTypeLabel = () => {
        switch (stream.type) {
            case "WEBCAM": return "Local Camera";
            case "SIMULATION": return "Simulation Demo";
            case "YOUTUBE": return "YouTube Live";
            default: return "RTSP Stream";
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className={cn(
                "mx-4 my-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl transition-all duration-300",
                isFullscreen
                    ? "w-full h-full max-w-none max-h-none"
                    : "w-full max-w-5xl max-h-[90vh] overflow-hidden"
            )}>
                {/* Header - Compact */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-8 rounded-full bg-gradient-to-b ${model.color}`}></div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {stream.name}
                            </h2>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                    {isSimulation ? <Film className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                                    {getStreamTypeLabel()}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                <span className="text-gray-500 dark:text-gray-400">
                                    {isSimulation ? "Demo Mode" : "Live"} • {stream.metrics?.fps || "30"} FPS
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? (
                                <VolumeX className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            ) : (
                                <Volume2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            )}
                        </button>

                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? (
                                <Minimize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            ) : (
                                <Maximize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            )}
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title="Close"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row h-[calc(90vh-72px)]">
                    {/* Left: Video Feed */}
                    <div className="flex-1 p-4 overflow-hidden">
                        <div className="relative bg-black rounded-xl overflow-hidden h-full">
                            {streamUrl ? (
                                <>
                                    {isSimulation ? (
                                        /* SIMULATION: Use HTML5 Video Element */
                                        <video
                                            src={streamUrl}
                                            className="w-full h-full object-contain"
                                            autoPlay
                                            loop
                                            muted={isMuted}
                                            controls
                                            onLoadedData={() => setVideoLoaded(true)}
                                            onError={() => setVideoError("Failed to load simulation video. Make sure Python Gateway is running.")}
                                        />
                                    ) : (
                                        /* RTSP/Webcam: Use Image (MJPEG proxy) */
                                        <img
                                            src={streamUrl}
                                            className="w-full h-full object-contain"
                                            alt="Live Stream"
                                            onLoad={() => setVideoLoaded(true)}
                                            onError={() => setVideoError("Failed to load stream connection.")}
                                        />
                                    )}

                                    {!videoLoaded && !videoError && (
                                        <div className="absolute top-4 left-4 text-white text-xs bg-black/70 px-2 py-1 rounded">
                                            {isSimulation ? "Loading video..." : "Waiting for first frame…"}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-12 h-12 border-4 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-white">Initializing {isSimulation ? "simulation" : "stream"}...</p>
                                    </div>
                                </div>
                            )}

                            {/* Loading Indicator */}
                            {!videoLoaded && !videoError && streamUrl && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-white">{isSimulation ? "Loading video..." : "Connecting to stream..."}</p>
                                    </div>
                                </div>
                            )}

                            {/* Error State */}
                            {videoError && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                    <div className="text-center p-6">
                                        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                        <h3 className="text-white font-medium mb-2">{isSimulation ? "Video Load Failed" : "Stream Connection Failed"}</h3>
                                        <p className="text-gray-300 text-sm mb-4">{videoError}</p>
                                        {isSimulation && (
                                            <p className="text-gray-400 text-xs mb-4">
                                                Ensure Python Gateway is running: <code className="bg-gray-800 px-1 rounded">python main.py</code>
                                            </p>
                                        )}
                                        <button
                                            onClick={() => {
                                                setVideoError(null);
                                                setVideoLoaded(false);
                                                // Force re-fetch
                                                const currentUrl = streamUrl;
                                                setStreamUrl(null);
                                                setTimeout(() => setStreamUrl(currentUrl), 100);
                                            }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                                        >
                                            Retry Connection
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-800 overflow-y-auto">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-gray-800">
                            {["analytics", "details", "alerts"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                                        activeTab === tab
                                            ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    )}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 space-y-6">
                            {/* Analytics Tab */}
                            {activeTab === "analytics" && (
                                <>
                                    {/* Model Card */}
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                <Zap className="w-4 h-4" />
                                                AI Model
                                            </h3>
                                            <span className={cn(
                                                "text-xs font-medium px-2 py-1 rounded-full",
                                                streamStatus === "PROCESSING"
                                                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white animate-pulse"
                                                    : streamStatus === "COMPLETED"
                                                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                                                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                            )}>
                                                {streamStatus === "PROCESSING" ? "Analyzing" : streamStatus || "Idle"}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Version</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">{stream.model || "mark-3"}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Accuracy</span>
                                                <span className="font-bold text-green-600 dark:text-green-400">{model.accuracy}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Frame</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    #{analysisProgress?.frame || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Performance Metrics */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Activity className="w-4 h-4" />
                                            Live Telemetry
                                            {isConnected ? (
                                                <span className="ml-auto flex items-center gap-1 text-xs text-green-500">
                                                    <Radio className="w-3 h-3 animate-pulse" />
                                                    Connected
                                                </span>
                                            ) : (
                                                <span className="ml-auto text-xs text-gray-400">Connecting...</span>
                                            )}
                                        </h4>

                                        {/* Green Wave Alert Banner */}
                                        {greenWaveActive && (
                                            <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white animate-pulse">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">🚑</span>
                                                    <div>
                                                        <div className="font-bold">GREEN WAVE ACTIVE</div>
                                                        <div className="text-xs opacity-90">Ambulance detected! Clearing lanes.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vehicles</div>
                                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {stats.count || 0}
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
                                                <div className={cn(
                                                    "text-sm font-bold",
                                                    stats.status?.includes("JAM") && "text-red-600 dark:text-red-400",
                                                    stats.status?.includes("CLEAR") && "text-green-600 dark:text-green-400",
                                                    stats.status?.includes("GREEN") && "text-emerald-600 dark:text-emerald-400"
                                                )}>
                                                    {stats.status || "IDLE"}
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Stream</div>
                                                <div className={cn(
                                                    "text-sm font-bold",
                                                    streamStatus === "PROCESSING" && "text-blue-600",
                                                    streamStatus === "COMPLETED" && "text-green-600",
                                                    streamStatus === "ERROR" && "text-red-600"
                                                )}>
                                                    {streamStatus || "IDLE"}
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Alerts</div>
                                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                    {incidents.length || 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Traffic Stats - Dynamic */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-gray-900 dark:text-white">Traffic Analytics</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Vehicle Count</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{stats.count || 0}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                                    style={{ width: `${Math.min((stats.count || 0) / 30 * 100, 100)}%` }}
                                                ></div>
                                            </div>

                                            <div className="flex justify-between text-sm mt-3">
                                                <span className="text-gray-600 dark:text-gray-400">Congestion Level</span>
                                                <span className={cn(
                                                    "font-medium",
                                                    (stats.count || 0) > 15 ? "text-red-600 dark:text-red-400" :
                                                        (stats.count || 0) > 8 ? "text-amber-600 dark:text-amber-400" :
                                                            "text-green-600 dark:text-green-400"
                                                )}>
                                                    {(stats.count || 0) > 15 ? "Heavy" :
                                                        (stats.count || 0) > 8 ? "Moderate" : "Light"}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div
                                                    className={cn(
                                                        "h-1.5 rounded-full transition-all duration-300",
                                                        (stats.count || 0) > 15 ? "bg-red-500" :
                                                            (stats.count || 0) > 8 ? "bg-amber-500" : "bg-green-500"
                                                    )}
                                                    style={{ width: `${Math.min((stats.count || 0) / 20 * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Details Tab */}
                            {activeTab === "details" && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Settings className="w-4 h-4" />
                                            Stream Details
                                        </h4>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Wifi className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        streamStatus === "PROCESSING" ? "bg-blue-500 animate-pulse" :
                                                            streamStatus === "COMPLETED" ? "bg-green-500" :
                                                                stream.status === "ACTIVE" ? "bg-green-500 animate-pulse" : "bg-gray-400"
                                                    )}></div>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {streamStatus === "PROCESSING" ? "Analyzing" :
                                                            streamStatus === "COMPLETED" ? "Completed" :
                                                                stream.status === "ACTIVE" ? "Active • Running" : stream.status || "Idle"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Created</span>
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {stream.createdAt?.toDate ? new Date(stream.createdAt.toDate()).toLocaleDateString() :
                                                        stream.createdAt ? new Date(stream.createdAt).toLocaleDateString() : "N/A"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Traffic Status</span>
                                                </div>
                                                <span className={cn(
                                                    "font-medium",
                                                    stats.status?.includes("JAM") && "text-red-600",
                                                    stats.status?.includes("CLEAR") && "text-green-600",
                                                    stats.status?.includes("GREEN") && "text-emerald-600"
                                                )}>
                                                    {stats.status || "Unknown"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">AI Model</span>
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">{stream.model || "mark-3"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stream Information */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-gray-900 dark:text-white">Information</h4>
                                        <div className="text-sm space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Stream Type</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{getStreamTypeLabel()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Stream ID</span>
                                                <span className="font-medium text-gray-900 dark:text-white text-xs">{stream.id?.slice(0, 12)}...</span>
                                            </div>
                                            {isSimulation && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Simulation File</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">{stream.simulationId}.mp4</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Location</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{stream.location || stream.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Vehicles Detected</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{stats.count || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Current Frame</span>
                                                <span className="font-medium text-gray-900 dark:text-white">#{analysisProgress?.frame || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Alerts Tab */}
                            {activeTab === "alerts" && (
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        Recent Alerts
                                        {incidents.length > 0 && (
                                            <span className="ml-auto text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                                                {incidents.length}
                                            </span>
                                        )}
                                    </h4>

                                    <div className="space-y-3">
                                        {incidents.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No alerts detected yet</p>
                                                <p className="text-xs mt-1">Alerts will appear here when incidents are detected</p>
                                            </div>
                                        ) : (
                                            incidents.slice(0, 10).map((alert, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {alert.type === "GREEN_WAVE" ? "🚑 Ambulance Detected" :
                                                                alert.type === "STALL" ? "Vehicle Stalled" :
                                                                    alert.type === "JAM" ? "Traffic Congestion" :
                                                                        alert.description || alert.type}
                                                        </span>
                                                        <span className={cn(
                                                            "text-xs px-2 py-1 rounded-full",
                                                            alert.severity === "CRITICAL" && "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
                                                            alert.severity === "HIGH" && "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300",
                                                            alert.severity === "MEDIUM" && "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
                                                            alert.severity === "LOW" && "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
                                                            !alert.severity && "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                                                        )}>
                                                            {alert.severity || "alert"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                        <span>
                                                            {alert.timestamp ?
                                                                new Date(alert.timestamp * 1000).toLocaleTimeString() :
                                                                `Frame #${alert.frame || 0}`}
                                                        </span>
                                                        {alert.vehicle_id && (
                                                            <span className="text-blue-600 dark:text-blue-400">
                                                                Vehicle #{alert.vehicle_id}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="sticky bottom-0 pt-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                                <div className="flex gap-2">
                                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all">
                                        <Download className="w-4 h-4" />
                                        Export Report
                                    </button>
                                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <BarChart className="w-4 h-4" />
                                        Analytics
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
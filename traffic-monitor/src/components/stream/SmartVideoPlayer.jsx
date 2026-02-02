import React, { useRef, useEffect, useState, useCallback } from "react";
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    Signal,
    AlertTriangle,
    Radio,
    Car,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// FPS assumption for frame calculation
const VIDEO_FPS = 30;

// Status colors
const STATUS_COLORS = {
    "🟢 FLOW": "bg-green-500",
    "🟡 SLOW": "bg-yellow-500",
    "🔴 JAM": "bg-red-500",
    "UNKNOWN": "bg-gray-500",
};

/**
 * Smart Video Player with Canvas Overlay
 * Syncs telemetry data with video playback using requestAnimationFrame
 */
export default function SmartVideoPlayer({
    videoSrc,
    streamId,
    stats = {},
    greenWaveActive = false,
    getFrameData,
    streamStatus = "IDLE",
    className,
}) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const containerRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Animation loop for overlay sync
    const renderLoop = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || video.paused) {
            animationRef.current = requestAnimationFrame(renderLoop);
            return;
        }

        const ctx = canvas.getContext("2d");
        const frame = Math.floor(video.currentTime * VIDEO_FPS);
        setCurrentFrame(frame);
        setCurrentTime(video.currentTime);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get frame data from buffer
        const frameData = getFrameData?.(frame);

        if (frameData?.boxes && frameData.boxes.length > 0) {
            drawBoundingBoxes(ctx, frameData.boxes, canvas.width, canvas.height);
        }

        // Draw status overlay
        drawStatusOverlay(ctx, frameData?.stats || stats, canvas.width);

        animationRef.current = requestAnimationFrame(renderLoop);
    }, [getFrameData, stats]);

    // Start/stop animation loop
    useEffect(() => {
        animationRef.current = requestAnimationFrame(renderLoop);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [renderLoop]);

    // Resize canvas to match video
    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        const handleResize = () => {
            canvas.width = video.clientWidth;
            canvas.height = video.clientHeight;
        };

        handleResize();
        video.addEventListener("loadedmetadata", handleResize);
        window.addEventListener("resize", handleResize);

        return () => {
            video.removeEventListener("loadedmetadata", handleResize);
            window.removeEventListener("resize", handleResize);
        };
    }, [videoSrc]);

    // Video metadata
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleMetadata = () => {
            setDuration(video.duration);
        };

        video.addEventListener("loadedmetadata", handleMetadata);
        return () => video.removeEventListener("loadedmetadata", handleMetadata);
    }, [videoSrc]);

    // Play/Pause
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
            setIsPlaying(true);
        } else {
            video.pause();
            setIsPlaying(false);
        }
    };

    // Mute
    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(video.muted);
    };

    // Fullscreen
    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Seek
    const handleSeek = (e) => {
        const video = videoRef.current;
        if (!video || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * duration;
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative bg-black rounded-xl overflow-hidden group",
                greenWaveActive && "ring-4 ring-green-500 ring-opacity-75 animate-pulse",
                className
            )}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-contain"
                muted={isMuted}
                loop
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            {/* Canvas Overlay */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
            />

            {/* Green Wave Banner */}
            {greenWaveActive && (
                <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center py-3 font-bold text-lg animate-pulse z-20">
                    🚑 AMBULANCE DETECTED — GREEN WAVE ACTIVE 🚑
                </div>
            )}

            {/* Top Stats Bar */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "px-3 py-1.5 rounded-lg text-white font-bold text-sm flex items-center gap-2",
                        STATUS_COLORS[stats.status] || STATUS_COLORS.UNKNOWN
                    )}>
                        <Radio className="w-4 h-4" />
                        {stats.status || "ANALYZING"}
                    </div>

                    {streamStatus === "ANALYZING" && (
                        <div className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing
                        </div>
                    )}
                </div>

                {/* Vehicle Count */}
                <div className="bg-black/70 backdrop-blur px-3 py-1.5 rounded-lg text-white flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    <span className="font-mono font-bold">{stats.count || 0}</span>
                    <span className="text-gray-300 text-sm">vehicles</span>
                </div>
            </div>

            {/* Frame Counter */}
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-2 py-1 rounded text-white font-mono text-xs z-10">
                Frame: {currentFrame}
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {/* Progress Bar */}
                <div
                    className="w-full h-1 bg-gray-600 rounded-full cursor-pointer mb-3"
                    onClick={handleSeek}
                >
                    <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Play/Pause */}
                        <button
                            onClick={togglePlay}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                            {isPlaying ? (
                                <Pause className="w-5 h-5 text-white" />
                            ) : (
                                <Play className="w-5 h-5 text-white ml-0.5" />
                            )}
                        </button>

                        {/* Mute */}
                        <button
                            onClick={toggleMute}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            {isMuted ? (
                                <VolumeX className="w-5 h-5 text-white" />
                            ) : (
                                <Volume2 className="w-5 h-5 text-white" />
                            )}
                        </button>

                        {/* Time */}
                        <span className="text-white text-sm font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Connection Status */}
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                            streamStatus === "COMPLETED" ? "bg-green-500/20 text-green-400" :
                                streamStatus === "ERROR" ? "bg-red-500/20 text-red-400" :
                                    "bg-blue-500/20 text-blue-400"
                        )}>
                            <Signal className="w-3 h-3" />
                            {streamStatus}
                        </div>

                        {/* Fullscreen */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <Maximize className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Draw bounding boxes on canvas
 */
function drawBoundingBoxes(ctx, boxes, width, height) {
    boxes.forEach((box) => {
        const [x1, y1, x2, y2] = box.coords || box;
        const label = box.label || box.class || "";
        const confidence = box.confidence || box.conf || 0;

        // Determine color based on vehicle type
        const color = label.toLowerCase().includes("ambulance")
            ? "#22c55e" // Green for ambulance
            : label.toLowerCase().includes("truck")
                ? "#f59e0b" // Amber for trucks
                : "#3b82f6"; // Blue for others

        // Scale coordinates to canvas size
        const sx1 = x1 * width;
        const sy1 = y1 * height;
        const sx2 = x2 * width;
        const sy2 = y2 * height;

        // Draw box
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx1, sy1, sx2 - sx1, sy2 - sy1);

        // Draw label background
        if (label) {
            const labelText = `${label} ${(confidence * 100).toFixed(0)}%`;
            ctx.font = "12px monospace";
            const textWidth = ctx.measureText(labelText).width;

            ctx.fillStyle = color;
            ctx.fillRect(sx1, sy1 - 18, textWidth + 8, 18);

            ctx.fillStyle = "#fff";
            ctx.fillText(labelText, sx1 + 4, sy1 - 5);
        }
    });
}

/**
 * Draw status overlay on canvas
 */
function drawStatusOverlay(ctx, stats, width) {
    if (!stats || !stats.count) return;

    // Draw semi-transparent background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(width - 120, 50, 110, 60);

    // Draw count
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px monospace";
    ctx.fillText(`${stats.count}`, width - 110, 85);

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#aaa";
    ctx.fillText("vehicles", width - 70, 85);
}

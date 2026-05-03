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

const STATUS_COLORS = {
    "🟢 FLOW": "bg-green-500",
    "🟡 SLOW": "bg-yellow-500",
    "🔴 JAM": "bg-red-500",
    "UNKNOWN": "bg-gray-500",
};

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
    const latestBoxesRef = useRef([]);
    const latestStatsRef = useRef(stats);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        latestStatsRef.current = stats;
    }, [stats]);

    useEffect(() => {
        if (!getFrameData) return;
        const interval = setInterval(() => {
            const video = videoRef.current;
            if (!video || !video.duration) return;
            const frame = Math.floor(video.currentTime * 30);
            const frameData = getFrameData(frame);
            if (frameData?.boxes && frameData.boxes.length > 0) {
                latestBoxesRef.current = frameData.boxes;
            }
            if (frameData?.stats) {
                latestStatsRef.current = frameData.stats;
            }
        }, 100);
        return () => clearInterval(interval);
    }, [getFrameData]);

    const renderLoop = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) {
            animationRef.current = requestAnimationFrame(renderLoop);
            return;
        }

        const cw = canvas.width;
        const ch = canvas.height;
        if (cw === 0 || ch === 0) {
            animationRef.current = requestAnimationFrame(renderLoop);
            return;
        }

        const ctx = canvas.getContext("2d");

        if (!video.paused) {
            const frame = Math.floor(video.currentTime * 30);
            setCurrentFrame(frame);
            setCurrentTime(video.currentTime);
        }

        ctx.clearRect(0, 0, cw, ch);

        const boxes = latestBoxesRef.current;
        const currentStats = latestStatsRef.current;

        if (boxes && boxes.length > 0) {
            const videoW = video.videoWidth || 1280;
            const videoH = video.videoHeight || 720;
            drawBoundingBoxes(ctx, boxes, cw, ch, videoW, videoH);
        }

        drawStatusOverlay(ctx, currentStats, cw);

        animationRef.current = requestAnimationFrame(renderLoop);
    }, []);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(renderLoop);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [renderLoop]);

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        const handleResize = () => {
            const w = video.clientWidth || video.offsetWidth || 1280;
            const h = video.clientHeight || video.offsetHeight || 720;
            canvas.width = w;
            canvas.height = h;
        };

        handleResize();
        video.addEventListener("loadeddata", handleResize);
        video.addEventListener("loadedmetadata", handleResize);
        window.addEventListener("resize", handleResize);

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(video);

        return () => {
            video.removeEventListener("loadeddata", handleResize);
            video.removeEventListener("loadedmetadata", handleResize);
            window.removeEventListener("resize", handleResize);
            resizeObserver.disconnect();
        };
    }, [videoSrc]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleMetadata = () => {
            setDuration(video.duration);
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = video.clientWidth || 1280;
                canvas.height = video.clientHeight || 720;
            }
        };

        const handleDataLoaded = () => {
            const canvas = canvasRef.current;
            if (canvas && video) {
                canvas.width = video.clientWidth || 1280;
                canvas.height = video.clientHeight || 720;
            }
        };

        video.addEventListener("loadedmetadata", handleMetadata);
        video.addEventListener("loadeddata", handleDataLoaded);
        return () => {
            video.removeEventListener("loadedmetadata", handleMetadata);
            video.removeEventListener("loadeddata", handleDataLoaded);
        };
    }, [videoSrc]);

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

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(video.muted);
    };

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
            <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-contain"
                autoPlay
                muted={isMuted}
                loop
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
            />

            {greenWaveActive && (
                <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center py-3 font-bold text-lg animate-pulse z-20">
                    🚑 AMBULANCE DETECTED — GREEN WAVE ACTIVE 🚑
                </div>
            )}

            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
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

                <div className="bg-black/70 backdrop-blur px-3 py-1.5 rounded-lg text-white flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    <span className="font-mono font-bold">{stats.count || 0}</span>
                    <span className="text-gray-300 text-sm">vehicles</span>
                </div>
            </div>

            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-2 py-1 rounded text-white font-mono text-xs z-10">
                Frame: {currentFrame}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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

                        <span className="text-white text-sm font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                            streamStatus === "COMPLETED" ? "bg-green-500/20 text-green-400" :
                                streamStatus === "ERROR" ? "bg-red-500/20 text-red-400" :
                                    "bg-blue-500/20 text-blue-400"
                        )}>
                            <Signal className="w-3 h-3" />
                            {streamStatus}
                        </div>

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

function getVideoDisplayRect(canvasW, canvasH, videoW, videoH) {
  const canvasRatio = canvasW / canvasH;
  const videoRatio = videoW / videoH;

  let drawW, drawH, offsetX, offsetY;

  if (canvasRatio > videoRatio) {
    drawH = canvasH;
    drawW = canvasH * videoRatio;
    offsetX = (canvasW - drawW) / 2;
    offsetY = 0;
  } else {
    drawW = canvasW;
    drawH = canvasW / videoRatio;
    offsetX = 0;
    offsetY = (canvasH - drawH) / 2;
  }

  return { drawW, drawH, offsetX, offsetY };
}

function drawBoundingBoxes(ctx, boxes, canvasW, canvasH, videoW, videoH) {
    if (!videoW || !videoH || videoW === 0 || videoH === 0) return;

    const { drawW, drawH, offsetX, offsetY } = getVideoDisplayRect(canvasW, canvasH, videoW, videoH);
    const scaleX = drawW / videoW;
    const scaleY = drawH / videoH;

    boxes.forEach((box) => {
        const x1 = box.x1 ?? 0;
        const y1 = box.y1 ?? 0;
        const x2 = box.x2 ?? 0;
        const y2 = box.y2 ?? 0;
        const label = box.label || box.class || "";
        const confidence = box.confidence || box.conf || 0;

        const color = label.toLowerCase().includes("ambulance")
            ? "#22c55e"
            : label.toLowerCase().includes("truck")
                ? "#f59e0b"
                : "#3b82f6";

        const sx1 = offsetX + x1 * scaleX;
        const sy1 = offsetY + y1 * scaleY;
        const sx2 = offsetX + x2 * scaleX;
        const sy2 = offsetY + y2 * scaleY;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx1, sy1, sx2 - sx1, sy2 - sy1);

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

function drawStatusOverlay(ctx, stats, width) {
    if (!stats || !stats.count) return;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(width - 120, 50, 110, 60);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px monospace";
    ctx.fillText(`${stats.count}`, width - 110, 85);

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#aaa";
    ctx.fillText("vehicles", width - 70, 85);
}
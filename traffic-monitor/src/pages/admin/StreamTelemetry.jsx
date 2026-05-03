import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useStreams } from '@/hooks/useStreams';
import { useStreamTelemetry } from '@/hooks/useStreamTelemetry';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Car,
  Activity,
  AlertTriangle,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Video,
  Film,
  Image as ImageIcon,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const INFERENCE_WIDTH = 1280;
const statusPalette = {
  CLEAR: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', pulse: false },
  MODERATE: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', pulse: false },
  'CRITICAL JAM': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', pulse: true },
  'GREEN WAVE ACTIVE': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', pulse: true },
};

function getStatusMeta(status) {
  const key = Object.keys(statusPalette).find((k) => status?.toUpperCase().includes(k)) || 'CLEAR';
  return statusPalette[key] || statusPalette.CLEAR;
}

function severityMeta(sev) {
  switch (sev) {
    case 'CRITICAL':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'HIGH':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'MEDIUM':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

function getVideoDisplayRect(video) {
  const containerW = video.clientWidth;
  const containerH = video.clientHeight;
  const intrinsicW = video.videoWidth || 1280;
  const intrinsicH = video.videoHeight || 720;

  const containerRatio = containerW / containerH;
  const intrinsicRatio = intrinsicW / intrinsicH;

  let drawW, drawH, offsetX, offsetY;

  if (containerRatio > intrinsicRatio) {
    // Container is wider: black bars on left/right
    drawH = containerH;
    drawW = containerH * intrinsicRatio;
    offsetX = (containerW - drawW) / 2;
    offsetY = 0;
  } else {
    // Container is taller: black bars on top/bottom
    drawW = containerW;
    drawH = containerW / intrinsicRatio;
    offsetX = 0;
    offsetY = (containerH - drawH) / 2;
  }

  return { drawW, drawH, offsetX, offsetY, intrinsicW, intrinsicH };
}

function useBoxOverlay(mediaRef, boxes) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const media = mediaRef.current;
    const canvas = canvasRef.current;
    if (!media || !canvas) return;

    const cw = media.clientWidth || 1280;
    const ch = media.clientHeight || 720;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);

    const { drawW, drawH, offsetX, offsetY, intrinsicW, intrinsicH } = getVideoDisplayRect(media);

    if (!intrinsicW || !intrinsicH) return;

    const sx = drawW / intrinsicW;
    const sy = drawH / intrinsicH;

    if (boxes && boxes.length > 0) {
      boxes.forEach((b) => {
        const x1 = offsetX + b.x1 * sx;
        const y1 = offsetY + b.y1 * sy;
        const x2 = offsetX + b.x2 * sx;
        const y2 = offsetY + b.y2 * sy;
        const label = b.label || '';
        const conf = b.confidence || 0;

        const isAmbulance = label.toLowerCase().includes('ambulance');
        const color = isAmbulance ? '#22c55e' : '#3b82f6';

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        if (label) {
          const txt = `${label} ${(conf * 100).toFixed(0)}%`;
          ctx.font = '12px monospace';
          const tw = ctx.measureText(txt).width;
          ctx.fillStyle = color;
          ctx.fillRect(x1, y1 - 18, tw + 8, 18);
          ctx.fillStyle = '#fff';
          ctx.fillText(txt, x1 + 4, y1 - 5);
        }
      });
    }

  }, [boxes, mediaRef]);

  useEffect(() => {
    let raf;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  return canvasRef;
}

export default function StreamTelemetry() {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { data: streams = [], isLoading: streamsLoading } = useStreams();

  const currentStream = streams.find((s) => s.id === streamId);
  const isSimulation = currentStream?.type === 'SIMULATION';

  const {
    stats,
    boxes,
    incidents,
    frameImage,
    connectionStatus,
    error,
    isLoading: telemetryLoading,
    greenWaveActive,
  } = useStreamTelemetry(currentStream);

  const [pickerOpen, setPickerOpen] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(null);

  const mediaRef = useRef(null);
  const canvasRef = useBoxOverlay(mediaRef, boxes);

  const videoUrl = currentStream
    ? isSimulation
      ? `${API_URL}/api/streams/${encodeURIComponent(currentStream.simulationId)}.mp4`
      : `${API_URL}/api/streams/${currentStream.id}`
    : null;

  const meta = getStatusMeta(stats.status);

  const handleRetry = useCallback(() => {
    setVideoError(null);
    setVideoLoaded(false);
    const el = mediaRef.current;
    if (el) {
      el.src = '';
      setTimeout(() => {
        if (el) el.src = videoUrl;
      }, 100);
    }
  }, [videoUrl]);

  if (streamsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 animate-pulse">Loading streams…</p>
        </div>
      </div>
    );
  }

  if (!currentStream) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Video className="w-16 h-16 mb-4 opacity-30" />
        <h2 className="text-xl font-bold text-white mb-2">Stream Not Found</h2>
        <p className="text-sm mb-6">The requested stream does not exist or has been removed.</p>
        <button
          onClick={() => navigate('/admin/streams')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Streams
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col -m-6">
      <div className="shrink-0 px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/streams')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {currentStream.name}
              {isSimulation && (
                <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10">
                  <Film className="w-3 h-3 mr-1" />
                  Simulation
                </Badge>
              )}
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Model: <span className="text-gray-700 dark:text-slate-200 font-medium">{currentStream.model || 'mark-3'}</span>
              {' · '}
              Type: <span className="text-gray-700 dark:text-slate-200 font-medium">{currentStream.type}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border',
              connectionStatus === 'connected'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : connectionStatus === 'connecting'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
            )}
          >
            {connectionStatus === 'connected' ? (
              <>
                <Radio className="w-3 h-3 animate-pulse" />
                Live
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                Offline
              </>
            )}
          </div>

          {error && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          className={cn(
            'shrink-0 border-r border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-900/30 transition-all duration-300 flex flex-col',
            pickerOpen ? 'w-56' : 'w-12'
          )}
        >
          <button
            onClick={() => setPickerOpen((p) => !p)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-200 dark:border-slate-800"
          >
            {pickerOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {pickerOpen && 'Streams'}
          </button>

          {pickerOpen && (
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {streams.map((s) => {
                  const active = s.id === streamId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/admin/streams/${s.id}/telemetry`)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors border',
                        active
                          ? 'bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-300'
                          : 'border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-200/50 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-slate-200'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            s.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-slate-600'
                          )}
                        />
                        <span className="truncate font-medium">{s.name}</span>
                      </div>
                      {active && (
                        <div className="mt-1 pl-4 text-[10px] text-gray-500 dark:text-slate-500">
                          {s.model || 'mark-3'} · {s.type}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 relative bg-black flex items-center justify-center min-h-[300px] lg:min-h-0">
            {isSimulation && frameImage ? (
              <>
                <img
                  src={frameImage}
                  alt="Annotated Stream"
                  className="w-full h-full object-contain"
                />
                {greenWaveActive && (
                  <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center py-2.5 font-bold text-sm animate-pulse z-20">
                    🚑 GREEN WAVE ACTIVE — AMBULANCE DETECTED
                  </div>
                )}
              </>
            ) : videoUrl && (
              <>
                {isSimulation ? (
                  <video
                    ref={mediaRef}
                    src={videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                    onLoadedData={() => { setVideoLoaded(true); setVideoError(null); }}
                    onError={() => setVideoError('Failed to load simulation video.')}
                  />
                ) : (
                  <img
                    ref={mediaRef}
                    src={videoUrl}
                    alt="Live Stream"
                    className="w-full h-full object-contain"
                    onLoad={() => { setVideoLoaded(true); setVideoError(null); }}
                    onError={() => setVideoError('Failed to load stream connection.')}
                  />
                )}

                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 pointer-events-none w-full h-full"
                />

                {greenWaveActive && (
                  <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center py-2.5 font-bold text-sm animate-pulse z-20">
                    🚑 GREEN WAVE ACTIVE — AMBULANCE DETECTED
                  </div>
                )}

                <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                  <div
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-2 border',
                      meta.bg,
                      meta.text,
                      meta.border,
                      meta.pulse && 'animate-pulse'
                    )}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    {stats.status || 'ANALYZING'}
                  </div>
                  <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-white text-xs flex items-center gap-2">
                    <Car className="w-3.5 h-3.5" />
                    <span className="font-mono font-bold">{stats.count || 0}</span>
                    <span className="text-slate-300">vehicles</span>
                  </div>
                </div>

                {!videoLoaded && !videoError && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="w-10 h-10 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-slate-300 text-sm">
                        {isSimulation ? 'Loading video…' : 'Connecting to stream…'}
                      </p>
                    </div>
                  </div>
                )}

                {videoError && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                    <div className="text-center p-6 max-w-sm">
                      <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-3" />
                      <h3 className="text-white font-medium mb-1">Connection Failed</h3>
                      <p className="text-slate-400 text-sm mb-4">{videoError}</p>
                      <button
                        onClick={handleRetry}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="w-full lg:w-[360px] shrink-0 border-l border-slate-800 bg-slate-900/40 flex flex-col overflow-hidden">
            <div className="p-4 space-y-3 border-b border-slate-800">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  Vehicle Count
                </div>
                <div className="text-4xl font-bold text-white tracking-tight">
                  {stats.count ?? 0}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Status</div>
                  <div
                    className={cn(
                      'text-sm font-bold',
                      meta.text
                    )}
                  >
                    {stats.status || 'IDLE'}
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Density</div>
                  <div className="text-sm font-bold text-white">{(stats.density ?? 0).toFixed(2)}</div>
                  <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
                    <div
                      className={cn(
                        'h-1 rounded-full transition-all duration-500',
                        (stats.density ?? 0) > 0.5 ? 'bg-red-500' : (stats.density ?? 0) > 0.25 ? 'bg-amber-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${Math.min((stats.density ?? 0) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Congestion</span>
                  <span
                    className={cn(
                      'font-medium',
                      (stats.count ?? 0) > 15
                        ? 'text-red-400'
                        : (stats.count ?? 0) > 8
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                    )}
                  >
                    {(stats.count ?? 0) > 15 ? 'Heavy' : (stats.count ?? 0) > 8 ? 'Moderate' : 'Light'}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-500',
                      (stats.count ?? 0) > 15 ? 'bg-red-500' : (stats.count ?? 0) > 8 ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min((stats.count ?? 0) / 20 * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Incident Feed
                </h3>
                {incidents.length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-red-400 border-red-500/30 bg-red-500/10 text-[10px]"
                  >
                    {incidents.length}
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {incidents.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">No incidents detected yet</p>
                      <p className="text-[10px] mt-1 opacity-60">Alerts will appear here in real time</p>
                    </div>
                  ) : (
                    incidents.map((inc, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3 hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-xs font-medium text-slate-200">
                            {inc.type === 'GREEN_WAVE'
                              ? '🚑 Ambulance Detected'
                              : inc.type === 'OBSTRUCTION'
                                ? '🚧 Obstruction'
                                : inc.description || inc.type}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] px-1.5 py-0.5', severityMeta(inc.severity))}
                          >
                            {inc.severity || 'alert'}
                          </Badge>
                        </div>

                        {inc.description && inc.type !== 'GREEN_WAVE' && (
                          <p className="text-[11px] text-slate-400 mb-1.5 line-clamp-2">{inc.description}</p>
                        )}

                        {inc.snapshot?.data && (
                          <img
                            src={inc.snapshot.data}
                            alt="Incident snapshot"
                            className="w-full h-20 object-cover rounded-md border border-slate-700 mb-1.5"
                          />
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            {inc.timestamp
                              ? new Date(inc.timestamp * 1000).toLocaleTimeString()
                              : inc.frame
                                ? `Frame #${inc.frame}`
                                : ''}
                          </span>
                          {inc.vehicle_id && (
                            <span className="text-blue-400">Vehicle #{inc.vehicle_id}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
              <span>
                {isSimulation ? 'NDJSON · Gateway' : 'Socket.io · Node Backend'}
              </span>
              <span className="font-mono">{connectionStatus}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEmergencyRoutes } from '../../hooks/useEmergencyRoutes';
import { TileImage } from './TileImage';
import { MapPin, Navigation, Trash2, Loader2, Search, AlertTriangle, Satellite, Brain, Zap, History, Clock } from 'lucide-react';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MUMBAI_CENTER = { lat: 19.076, lng: 72.8777 };

// ─── Dark Map Styles (reused from PatrolUnitMap) ──────────────────────
const MAP_STYLES = [
    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
    { featureType: "road", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2c6675" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#023e58" }] },
    { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ color: "#334e87" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6d70" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283d6a" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6f9ba5" }] },
    { featureType: "poi", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
    { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
    { featureType: "transit", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
];

function createPinSvg(color, label) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="18" cy="18" r="8" fill="white" opacity="0.9"/>
        <text x="18" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="${color}">${label}</text>
    </svg>`;
}

// ─── Places Autocomplete Input ────────────────────────────────────────
function PlacesInput({ placeholder, value, onChange, onPlaceSelect, icon: Icon, iconColor }) {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);

    useEffect(() => {
        if (!window.google?.maps?.places || !inputRef.current || autocompleteRef.current) return;

        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'in' },
            fields: ['geometry', 'name', 'formatted_address'],
        });

        ac.addListener('place_changed', () => {
            const place = ac.getPlace();
            if (place.geometry?.location) {
                onPlaceSelect({
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    label: place.name || place.formatted_address,
                });
            }
        });

        autocompleteRef.current = ac;
    }, [onPlaceSelect]);

    return (
        <div className="relative">
            <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${iconColor}`} />
            <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-600 text-white placeholder-gray-500 text-sm rounded-lg py-2.5 pl-10 pr-4 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────
export function RouteSelector() {
    const { computeRoutes, pollTileProgress, analyzeRoute, fetchRouteHistory, loading, error, session, routes } = useEmergencyRoutes();

    // Map state
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const originMarkerRef = useRef(null);
    const destMarkerRef = useRef(null);
    const routePolylinesRef = useRef([]);
    const [isMapLoaded, setIsMapLoaded] = useState(false);

    // Origin / Destination
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [originText, setOriginText] = useState('');
    const [destText, setDestText] = useState('');
    const [clickMode, setClickMode] = useState('origin'); // 'origin' | 'destination'

    // Tiles
    const [tiles, setTiles] = useState([]);
    const [stats, setStats] = useState({ newlyReady: 0, stillPending: 0, total: 0 });

    // AI Analysis
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);

    // History
    const [routeHistory, setRouteHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // ── Load Route History ────────────────────────────────────────────
    const loadHistory = useCallback(async () => {
        const history = await fetchRouteHistory();
        setRouteHistory(history);
    }, [fetchRouteHistory]);

    useEffect(() => {
        if (showHistory) {
            loadHistory();
        }
    }, [showHistory, loadHistory]);

    // ── Load Google Maps Script ───────────────────────────────────────
    useEffect(() => {
        if (window.google?.maps) {
            setIsMapLoaded(true);
            return;
        }
        if (!GOOGLE_MAPS_KEY) return;

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsMapLoaded(true);
        document.head.appendChild(script);
    }, []);

    // ── Initialize Map ────────────────────────────────────────────────
    useEffect(() => {
        if (!isMapLoaded || !mapRef.current || mapInstanceRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
            center: MUMBAI_CENTER,
            zoom: 13,
            styles: MAP_STYLES,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_BOTTOM },
            clickableIcons: false,
        });

        map.addListener('click', (e) => {
            const coord = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            handleMapClick(coord);
        });

        mapInstanceRef.current = map;
    }, [isMapLoaded]);

    // ── Handle Map Click ──────────────────────────────────────────────
    const handleMapClick = useCallback((coord) => {
        if (clickMode === 'origin' || (!origin && !destination)) {
            setOriginPoint(coord);
            setClickMode('destination');
        } else {
            setDestPoint(coord);
            setClickMode('origin');
        }
    }, [clickMode, origin, destination]);

    // ── Marker Helpers ────────────────────────────────────────────────
    const setOriginPoint = useCallback((coord) => {
        setOrigin(coord);
        setOriginText(coord.label || `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`);

        if (originMarkerRef.current) originMarkerRef.current.setMap(null);

        if (mapInstanceRef.current) {
            originMarkerRef.current = new window.google.maps.Marker({
                position: coord,
                map: mapInstanceRef.current,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(createPinSvg('#22c55e', 'A')),
                    scaledSize: new window.google.maps.Size(36, 48),
                    anchor: new window.google.maps.Point(18, 48),
                },
                title: 'Origin',
                animation: window.google.maps.Animation.DROP,
            });
        }
    }, []);

    const setDestPoint = useCallback((coord) => {
        setDestination(coord);
        setDestText(coord.label || `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`);

        if (destMarkerRef.current) destMarkerRef.current.setMap(null);

        if (mapInstanceRef.current) {
            destMarkerRef.current = new window.google.maps.Marker({
                position: coord,
                map: mapInstanceRef.current,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(createPinSvg('#ef4444', 'B')),
                    scaledSize: new window.google.maps.Size(36, 48),
                    anchor: new window.google.maps.Point(18, 48),
                },
                title: 'Destination',
                animation: window.google.maps.Animation.DROP,
            });

            // Fit bounds to show both markers
            if (originMarkerRef.current) {
                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend(originMarkerRef.current.getPosition());
                bounds.extend(destMarkerRef.current.getPosition());
                mapInstanceRef.current.fitBounds(bounds, 80);
            }
        }
    }, []);

    // ── Clear Everything ──────────────────────────────────────────────
    const handleClear = () => {
        setOrigin(null);
        setDestination(null);
        setOriginText('');
        setDestText('');
        setTiles([]);
        setStats({ newlyReady: 0, stillPending: 0, total: 0 });
        setClickMode('origin');
        setAnalyzing(false);
        setAnalysisResults(null);

        if (originMarkerRef.current) { originMarkerRef.current.setMap(null); originMarkerRef.current = null; }
        if (destMarkerRef.current) { destMarkerRef.current.setMap(null); destMarkerRef.current = null; }

        routePolylinesRef.current.forEach(p => p.setMap(null));
        routePolylinesRef.current = [];

        if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo(MUMBAI_CENTER);
            mapInstanceRef.current.setZoom(13);
        }
    };

    // ── Load History Item ─────────────────────────────────────────────
    const handleLoadHistoryItem = (item) => {
        handleClear();
        // The saved components are object with lat/lng/label
        if (item.origin) {
            setOriginPoint(item.origin);
        }
        if (item.destination) {
            setDestPoint(item.destination);
        }
        setShowHistory(false);
    };

    // ── Draw Route Polylines ──────────────────────────────────────────
    const drawRoutes = useCallback((routeData) => {
        // Clear old polylines
        routePolylinesRef.current.forEach(p => p.setMap(null));
        routePolylinesRef.current = [];

        if (!mapInstanceRef.current || !window.google?.maps?.geometry) return;

        routeData.forEach((route, idx) => {
            if (!route.encodedPolyline) return;

            const path = window.google.maps.geometry.encoding.decodePath(route.encodedPolyline);
            const polyline = new window.google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: idx === 0 ? '#3b82f6' : '#6b7280',
                strokeOpacity: idx === 0 ? 0.9 : 0.5,
                strokeWeight: idx === 0 ? 5 : 3,
                map: mapInstanceRef.current,
            });

            routePolylinesRef.current.push(polyline);
        });
    }, []);

    // ── Draw Heatmap Route (replaces blue polyline with colored segments) ──
    const drawHeatmapRoute = useCallback((analysisData) => {
        if (!mapInstanceRef.current || !window.google?.maps?.geometry || !routes.length) return;

        const primaryRoute = routes[0];
        if (!primaryRoute?.encodedPolyline) return;

        const tileResults = analysisData.data || analysisData.results || [];
        if (!tileResults.length) return;

        // Remove old polylines
        routePolylinesRef.current.forEach(p => p.setMap(null));
        routePolylinesRef.current = [];

        // Decode the full route path
        const fullPath = window.google.maps.geometry.encoding.decodePath(primaryRoute.encodedPolyline);
        const totalPoints = fullPath.length;
        const numSegments = tileResults.length;
        const pointsPerSegment = Math.max(2, Math.floor(totalPoints / numSegments));

        // Draw each segment with density-based color
        for (let i = 0; i < numSegments; i++) {
            const startIdx = i * pointsPerSegment;
            const endIdx = Math.min(startIdx + pointsPerSegment + 1, totalPoints);
            const segmentPath = fullPath.slice(startIdx, endIdx);

            if (segmentPath.length < 2) continue;

            const count = tileResults[i]?.vehicleCount ?? tileResults[i]?.vehicle_count ?? 0;

            // Color based on density
            let color, opacity;
            if (count > 50) {
                color = '#ef4444'; opacity = 0.95; // Red — heavy
            } else if (count > 20) {
                color = '#f59e0b'; opacity = 0.9;  // Yellow — moderate
            } else {
                color = '#22c55e'; opacity = 0.85; // Green — clear
            }

            const segment = new window.google.maps.Polyline({
                path: segmentPath,
                geodesic: true,
                strokeColor: color,
                strokeOpacity: opacity,
                strokeWeight: 7,
                map: mapInstanceRef.current,
            });

            routePolylinesRef.current.push(segment);
        }
    }, [routes]);

    // ── Generate Route ────────────────────────────────────────────────
    const handleGenerate = async () => {
        if (!origin || !destination) return;

        setTiles([]);
        setStats({ newlyReady: 0, stillPending: 0, total: 0 });
        setAnalysisResults(null);

        const res = await computeRoutes(origin, destination, { samplingIntervalMeters: 30 });
        if (res && res.routes) {
            drawRoutes(res.routes);
        }
        if (res && res.tiles) {
            setTiles(res.tiles.ready || []);
            setStats({
                newlyReady: res.tiles.ready?.length || 0,
                stillPending: res.tiles.pending,
                total: res.tiles.total,
            });
        }
    };

    // ── Poll for tile progress ────────────────────────────────────────
    useEffect(() => {
        if (!session || stats.stillPending === 0) return;

        const interval = setInterval(async () => {
            const progress = await pollTileProgress(session);
            if (progress && progress.tiles) {
                setStats(progress.tiles);
                if (progress.status === 'ready') clearInterval(interval);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [session, stats.stillPending, pollTileProgress]);

    // ── Analyze with AI ───────────────────────────────────────────────
    const handleAnalyze = async () => {
        if (!session || !tiles.length) return;
        setAnalyzing(true);
        setAnalysisResults(null);

        const tileIds = tiles.map(t => t.tileId);
        const result = await analyzeRoute(session, tileIds);

        setAnalysisResults(result);
        setAnalyzing(false);

        // Draw heatmap on the map polyline
        if (result) {
            drawHeatmapRoute(result);
        }
    };

    // ── RENDER ────────────────────────────────────────────────────────
    if (!GOOGLE_MAPS_KEY) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center p-8">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <h3 className="text-white font-semibold">Google Maps API Key Required</h3>
                    <p className="text-gray-400 text-sm mt-1">Add VITE_GOOGLE_MAPS_API_KEY to your .env file</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* ─── Header ──────────────────────────────────────────── */}
            <div className="border-b border-gray-700/50 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-20 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <Satellite className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Emergency Route Planner</h1>
                            <p className="text-xs text-gray-400">Click on the map or search to set origin & destination</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3">
                        {/* Status pill */}
                        <div className="flex items-center gap-2 mr-2">
                            {origin && !destination && (
                                <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1.5 rounded-full animate-pulse">
                                    Click map to set destination
                                </span>
                            )}
                            {!origin && (
                                <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-full animate-pulse">
                                    Click map to set origin
                                </span>
                            )}
                        </div>

                        {/* History Toggle */}
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${showHistory ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}
                        >
                            <History className="w-4 h-4" />
                            <span>History</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* ─── Search Inputs + Action Buttons ───────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3 mb-4">
                    <PlacesInput
                        placeholder="Search origin location..."
                        value={originText}
                        onChange={setOriginText}
                        onPlaceSelect={(place) => { setOriginPoint(place); setClickMode('destination'); }}
                        icon={MapPin}
                        iconColor="text-green-400"
                    />
                    <PlacesInput
                        placeholder="Search destination..."
                        value={destText}
                        onChange={setDestText}
                        onPlaceSelect={(place) => { setDestPoint(place); setClickMode('origin'); }}
                        icon={MapPin}
                        iconColor="text-red-400"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={!origin || !destination || loading}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg border border-blue-400/30 disabled:border-gray-600 transition-all shadow-lg shadow-blue-500/10 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Computing...</>
                        ) : (
                            <><Navigation className="w-4 h-4" /> Generate Route</>
                        )}
                    </button>
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-sm px-4 py-2.5 rounded-lg border border-gray-600 hover:border-gray-500 transition-all"
                    >
                        <Trash2 className="w-4 h-4" /> Clear
                    </button>
                </div>

                {error && (
                    <div className="text-red-400 p-3 border border-red-500/30 bg-red-900/20 mb-4 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* ─── Map + Results Grid ───────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Google Map */}
                    <div className="lg:col-span-2 relative rounded-xl overflow-hidden border border-gray-700/50 bg-gray-800" style={{ minHeight: '500px' }}>
                        <div ref={mapRef} className="absolute inset-0" />

                        {!isMapLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        )}

                        {/* History Overlay Panel */}
                        {showHistory && (
                            <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-32px)] bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-600 shadow-2xl overflow-hidden flex flex-col z-10 transition-all">
                                <div className="p-3 border-b border-gray-700 bg-gray-800/80 flex justify-between items-center">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <History className="w-4 h-4 text-indigo-400" /> Recent Routes
                                    </h3>
                                    <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white">
                                        &times;
                                    </button>
                                </div>
                                <div className="p-2 overflow-y-auto flex-1 space-y-2">
                                    {loading && routeHistory.length === 0 ? (
                                        <div className="flex items-center justify-center p-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                                        </div>
                                    ) : routeHistory.length === 0 ? (
                                        <div className="text-center p-4 text-sm text-gray-500">No route history found</div>
                                    ) : (
                                        routeHistory.map((item) => (
                                            <div
                                                key={item.sessionId}
                                                onClick={() => handleLoadHistoryItem(item)}
                                                className="p-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-indigo-500/50 hover:bg-gray-750 cursor-pointer transition-all"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="text-xs text-gray-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(item.createdAt).toLocaleString(undefined, {
                                                            month: 'short', day: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </div>
                                                    <div className="text-[10px] font-mono bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                                                        {item.metadata?.totalDistanceKm?.toFixed(1) || '?'} km
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                                        <div className="text-xs font-medium truncate" title={item.origin?.label}>
                                                            {item.origin?.label || 'Unknown Origin'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                                        <div className="text-xs font-medium truncate" title={item.destination?.label}>
                                                            {item.destination?.label || 'Unknown Destination'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Results Panel */}
                    <div className="space-y-4">
                        {/* Selected Points */}
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/50">
                            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Selected Points</h2>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-900/50">
                                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">A</div>
                                    <span className="text-sm text-gray-300 truncate">{origin ? originText : 'Not set'}</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-900/50">
                                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-400">B</div>
                                    <span className="text-sm text-gray-300 truncate">{destination ? destText : 'Not set'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Route Metrics */}
                        {session && routes.length > 0 && (
                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/50">
                                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Route Details</h2>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                    {routes.map((route, idx) => (
                                        <div key={idx} className={`p-3 rounded-lg text-sm ${idx === 0 ? 'bg-blue-900/20 border border-blue-500/20' : 'bg-gray-900/50 border border-gray-700/30'}`}>
                                            <h3 className={`font-bold text-xs uppercase tracking-wider mb-1 ${idx === 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                                                {route.label}
                                            </h3>
                                            <p className="text-gray-300">{(route.distanceMeters / 1000).toFixed(2)} km · {Math.round(route.durationSeconds / 60)} min</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tile Stats */}
                        {stats.total > 0 && (
                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/50">
                                <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-3">Tile Acquisition</h2>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-400">Total Tiles</span><span className="font-mono">{stats.total}</span></div>
                                    <div className="flex justify-between"><span className="text-green-400">Downloaded</span><span className="font-mono text-green-400">{stats.newlyReady}</span></div>
                                    {stats.stillPending > 0 && (
                                        <div className="flex justify-between"><span className="text-blue-400 animate-pulse">Pending</span><span className="font-mono text-blue-400">{stats.stillPending}</span></div>
                                    )}
                                </div>

                                {/* Progress bar */}
                                <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full transition-all duration-500"
                                        style={{ width: `${stats.total > 0 ? (stats.newlyReady / stats.total) * 100 : 0}%` }}
                                    />
                                </div>

                                {/* Analyze Button - appears when tiles are 100% downloaded */}
                                {stats.stillPending === 0 && stats.total > 0 && (
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={analyzing}
                                        className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg border border-purple-400/30 disabled:border-gray-600 transition-all shadow-lg shadow-purple-500/10 disabled:shadow-none"
                                    >
                                        {analyzing ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                                        ) : (
                                            <><Zap className="w-4 h-4" /> Analyze with AI</>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* AI Analysis Results */}
                        {analysisResults && (
                            <div className="bg-gray-800 p-4 rounded-xl border border-purple-500/30">
                                <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> AI Analysis
                                </h2>

                                {/* Summary */}
                                <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/20 mb-3">
                                    <div className="text-2xl font-bold text-white">
                                        {analysisResults.totalVehicles ?? analysisResults.total_vehicles ?? '—'}
                                    </div>
                                    <div className="text-xs text-purple-300">Total vehicles detected</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {analysisResults.tilesProcessed ?? analysisResults.tiles_analyzed ?? 0} tiles analyzed
                                    </div>
                                </div>

                                {/* Per-tile results with density colors */}
                                {(analysisResults.data || analysisResults.results) && (
                                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto text-xs pr-1">
                                        {(analysisResults.data || analysisResults.results).map((r, i) => {
                                            const count = r.vehicleCount ?? r.vehicle_count ?? 0;
                                            const densityColor = count > 50 ? 'text-red-400' : count > 20 ? 'text-yellow-400' : 'text-green-400';
                                            const barColor = count > 50 ? 'bg-red-500' : count > 20 ? 'bg-yellow-500' : 'bg-green-500';
                                            const barWidth = Math.min((count / 120) * 100, 100);
                                            return (
                                                <div key={i} className="p-1.5 rounded bg-gray-900/50">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-gray-400 truncate max-w-[140px]">{r.tileId || `Tile ${i + 1}`}</span>
                                                        <span className={`font-mono font-bold ${densityColor}`}>
                                                            {count}
                                                        </span>
                                                    </div>
                                                    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                                        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${barWidth}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Satellite Tile Grid ──────────────────────────── */}
                {tiles.length > 0 && (
                    <div className="mt-6 bg-gray-800 p-4 rounded-xl border border-gray-700/50">
                        <h2 className="text-lg font-semibold mb-1">Satellite Tiles</h2>
                        <p className="text-xs text-gray-400 mb-4">
                            {tiles.length} high-resolution Zoom 19 satellite tiles fetched and cached.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {tiles.map((tile, i) => (
                                <div key={i} title={`Tile: ${tile.tileId}`} className="w-20 h-20">
                                    <TileImage tileId={tile.tileId} />
                                </div>
                            ))}
                            {Array.from({ length: stats.stillPending }).map((_, i) => (
                                <div key={`pending-${i}`} className="w-20 h-20 bg-gray-700/50 border border-gray-600 rounded animate-pulse" />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RouteSelector;

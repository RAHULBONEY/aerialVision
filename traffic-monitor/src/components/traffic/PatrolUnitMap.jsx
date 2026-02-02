import React, { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Layers, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
    AVAILABLE: "#22c55e", // green-500
    ON_PATROL: "#f59e0b", // amber-500
    BUSY: "#ef4444", // red-500
};

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bangalore
const DEFAULT_ZOOM = 13;

export default function PatrolUnitMap({
    units = [],
    selectedUnit,
    onSelectUnit,
    onMapClick,
    apiKey,
}) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(null);

    // Load Google Maps script
    useEffect(() => {
        if (window.google?.maps) {
            setIsLoaded(true);
            return;
        }

        if (!apiKey) {
            setError("Google Maps API key not configured");
            return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => setIsLoaded(true);
        script.onerror = () => setError("Failed to load Google Maps");

        document.head.appendChild(script);

        return () => {
            // Cleanup markers on unmount
            Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
        };
    }, [apiKey]);

    // Initialize map
    useEffect(() => {
        if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            styles: getMapStyles(),
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: {
                position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
            },
            fullscreenControl: false,
            mapTypeControl: false,
            streetViewControl: false,
        });

        mapInstanceRef.current = map;

        // Map click handler for setting location
        map.addListener("click", (e) => {
            if (onMapClick) {
                onMapClick({
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng(),
                });
            }
        });
    }, [isLoaded, onMapClick]);

    // Update markers when units change
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return;

        const map = mapInstanceRef.current;

        // Get current unit IDs
        const currentUnitIds = new Set(units.map((u) => u.id));

        // Remove markers for units that no longer exist
        Object.keys(markersRef.current).forEach((id) => {
            if (!currentUnitIds.has(id)) {
                markersRef.current[id].setMap(null);
                delete markersRef.current[id];
            }
        });

        // Create or update markers for each unit
        units.forEach((unit) => {
            if (!unit.location?.lat || !unit.location?.lng) return;

            const position = { lat: unit.location.lat, lng: unit.location.lng };
            const isSelected = selectedUnit?.id === unit.id;

            if (markersRef.current[unit.id]) {
                // Update existing marker
                const marker = markersRef.current[unit.id];

                // Smooth animation to new position
                animateMarker(marker, position);

                marker.setIcon(createMarkerIcon(unit.status, isSelected));
                marker.setZIndex(isSelected ? 1000 : 1);
            } else {
                // Create new marker
                const marker = new window.google.maps.Marker({
                    position,
                    map,
                    icon: createMarkerIcon(unit.status, isSelected),
                    title: `${unit.unitCode} - ${unit.officerName}`,
                    zIndex: isSelected ? 1000 : 1,
                    animation: window.google.maps.Animation.DROP,
                });

                marker.addListener("click", () => {
                    onSelectUnit(unit);
                });

                markersRef.current[unit.id] = marker;
            }
        });
    }, [units, selectedUnit, isLoaded, onSelectUnit]);

    // Center on selected unit
    useEffect(() => {
        if (!mapInstanceRef.current || !selectedUnit?.location) return;

        mapInstanceRef.current.panTo({
            lat: selectedUnit.location.lat,
            lng: selectedUnit.location.lng,
        });
    }, [selectedUnit]);

    // Fit bounds to show all units
    const fitBoundsToUnits = useCallback(() => {
        if (!mapInstanceRef.current || units.length === 0) return;

        const bounds = new window.google.maps.LatLngBounds();
        units.forEach((unit) => {
            if (unit.location?.lat && unit.location?.lng) {
                bounds.extend({ lat: unit.location.lat, lng: unit.location.lng });
            }
        });

        mapInstanceRef.current.fitBounds(bounds, 50);
    }, [units]);

    // Animate marker to new position
    const animateMarker = (marker, newPosition) => {
        const currentPos = marker.getPosition();
        const startLat = currentPos.lat();
        const startLng = currentPos.lng();
        const endLat = newPosition.lat;
        const endLng = newPosition.lng;

        // Only animate if position actually changed
        if (Math.abs(startLat - endLat) < 0.000001 && Math.abs(startLng - endLng) < 0.000001) {
            return;
        }

        const duration = 500; // ms
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out
            const eased = 1 - Math.pow(1 - progress, 3);

            const lat = startLat + (endLat - startLat) * eased;
            const lng = startLng + (endLng - startLng) * eased;

            marker.setPosition({ lat, lng });

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    };

    // Loading state
    if (!apiKey) {
        return (
            <div className="relative h-full min-h-[500px] bg-gray-100 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 flex items-center justify-center">
                <div className="text-center p-6">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Maps API Key Required</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Add VITE_GOOGLE_MAPS_API_KEY to your environment
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="relative h-full min-h-[500px] bg-gray-100 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 flex items-center justify-center">
                <div className="text-center p-6">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Map Error</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full min-h-[500px] bg-white dark:bg-[#0a1525] rounded-xl border border-gray-200 dark:border-slate-800/50 overflow-hidden">
            {/* Map Container */}
            <div ref={mapRef} className="absolute inset-0" />

            {/* Loading overlay */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-slate-400">Loading map...</p>
                    </div>
                </div>
            )}

            {/* Header overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 pointer-events-auto">
                        <Layers className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                            {units.length} Units Active
                        </span>
                    </div>

                    <button
                        onClick={fitBoundsToUnits}
                        className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors pointer-events-auto"
                    >
                        Fit All
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3 rounded-lg border border-gray-200 dark:border-slate-700 z-10">
                <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Unit Status
                </p>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Available</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                        <span className="w-3 h-3 rounded-full bg-amber-500" />
                        <span>On Patrol</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Busy</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Create custom marker icon
function createMarkerIcon(status, isSelected) {
    const color = STATUS_COLORS[status] || STATUS_COLORS.AVAILABLE;
    const size = isSelected ? 40 : 32;
    const strokeWidth = isSelected ? 3 : 2;

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="${strokeWidth}"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `;

    return {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
        scaledSize: new window.google.maps.Size(size, size),
        anchor: new window.google.maps.Point(size / 2, size / 2),
    };
}

// Dark mode map styles
function getMapStyles() {
    return [
        { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
        {
            featureType: "administrative.country",
            elementType: "geometry.stroke",
            stylers: [{ color: "#4b6878" }],
        },
        {
            featureType: "administrative.land_parcel",
            elementType: "labels.text.fill",
            stylers: [{ color: "#64779e" }],
        },
        {
            featureType: "administrative.province",
            elementType: "geometry.stroke",
            stylers: [{ color: "#4b6878" }],
        },
        {
            featureType: "landscape.man_made",
            elementType: "geometry.stroke",
            stylers: [{ color: "#334e87" }],
        },
        {
            featureType: "landscape.natural",
            elementType: "geometry",
            stylers: [{ color: "#023e58" }],
        },
        {
            featureType: "poi",
            elementType: "geometry",
            stylers: [{ color: "#283d6a" }],
        },
        {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6f9ba5" }],
        },
        {
            featureType: "poi",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#1d2c4d" }],
        },
        {
            featureType: "poi.park",
            elementType: "geometry.fill",
            stylers: [{ color: "#023e58" }],
        },
        {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#3C7680" }],
        },
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#304a7d" }],
        },
        {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#98a5be" }],
        },
        {
            featureType: "road",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#1d2c4d" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#2c6675" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#255763" }],
        },
        {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#b0d5ce" }],
        },
        {
            featureType: "road.highway",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#023e58" }],
        },
        {
            featureType: "transit",
            elementType: "labels.text.fill",
            stylers: [{ color: "#98a5be" }],
        },
        {
            featureType: "transit",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#1d2c4d" }],
        },
        {
            featureType: "transit.line",
            elementType: "geometry.fill",
            stylers: [{ color: "#283d6a" }],
        },
        {
            featureType: "transit.station",
            elementType: "geometry",
            stylers: [{ color: "#3a4762" }],
        },
        {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#0e1626" }],
        },
        {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#4e6d70" }],
        },
    ];
}

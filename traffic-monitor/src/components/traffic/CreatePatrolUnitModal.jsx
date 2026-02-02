import React, { useState, useRef, useEffect } from "react";
import { X, MapPin, User, Hash, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreatePatrolUnit } from "@/hooks/usePatrolUnits";

const STATUS_OPTIONS = [
    { value: "AVAILABLE", label: "Available", color: "bg-green-500" },
    { value: "ON_PATROL", label: "On Patrol", color: "bg-amber-500" },
    { value: "BUSY", label: "Busy", color: "bg-red-500" },
];

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function CreatePatrolUnitModal({ isOpen, onClose, defaultLocation }) {
    const [form, setForm] = useState({
        unitCode: "",
        officerName: "",
        address: "",
        lat: defaultLocation?.lat || null,
        lng: defaultLocation?.lng || null,
        status: "AVAILABLE",
    });

    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const [isPlacesLoaded, setIsPlacesLoaded] = useState(false);

    const createMutation = useCreatePatrolUnit();

    // Initialize Google Places Autocomplete
    useEffect(() => {
        if (!isOpen || !GOOGLE_MAPS_API_KEY) return;

        const initAutocomplete = () => {
            if (!window.google?.maps?.places || !inputRef.current) return;

            autocompleteRef.current = new window.google.maps.places.Autocomplete(
                inputRef.current,
                {
                    types: ["geocode", "establishment"],
                    componentRestrictions: { country: "in" }, // Restrict to India
                    fields: ["formatted_address", "geometry", "name"],
                }
            );

            autocompleteRef.current.addListener("place_changed", () => {
                const place = autocompleteRef.current.getPlace();

                if (place.geometry?.location) {
                    setForm((prev) => ({
                        ...prev,
                        address: place.formatted_address || place.name || "",
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                    }));
                }
            });

            setIsPlacesLoaded(true);
        };

        // Check if Google Maps is already loaded
        if (window.google?.maps?.places) {
            initAutocomplete();
        } else {
            // Wait for it to load
            const checkLoaded = setInterval(() => {
                if (window.google?.maps?.places) {
                    clearInterval(checkLoaded);
                    initAutocomplete();
                }
            }, 100);

            return () => clearInterval(checkLoaded);
        }
    }, [isOpen]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setForm({
                unitCode: "",
                officerName: "",
                address: "",
                lat: null,
                lng: null,
                status: "AVAILABLE",
            });
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.lat || !form.lng) {
            alert("Please select a location from the dropdown");
            return;
        }

        try {
            await createMutation.mutateAsync({
                unitCode: form.unitCode,
                officerName: form.officerName,
                address: form.address,
                location: {
                    lat: form.lat,
                    lng: form.lng,
                },
                status: form.status,
            });

            onClose();
        } catch (err) {
            console.error("Failed to create patrol unit:", err);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#0a1525] rounded-xl border border-gray-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Create Patrol Unit
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-5 space-y-5">
                        {/* Unit Code */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                Unit Code
                            </label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={form.unitCode}
                                    onChange={(e) =>
                                        setForm({ ...form, unitCode: e.target.value.toUpperCase() })
                                    }
                                    placeholder="TP-01"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        {/* Officer Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                Officer Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={form.officerName}
                                    onChange={(e) =>
                                        setForm({ ...form, officerName: e.target.value })
                                    }
                                    placeholder="Officer name"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        {/* Location Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                <MapPin className="inline w-4 h-4 mr-1" />
                                Initial Location
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    placeholder="Search for a location..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            {/* Selected Location Confirmation */}
                            {form.lat && form.lng && (
                                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        Location set: {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
                                    </p>
                                </div>
                            )}

                            {!isPlacesLoaded && GOOGLE_MAPS_API_KEY && (
                                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Loading location search...
                                </p>
                            )}

                            {!GOOGLE_MAPS_API_KEY && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    ⚠️ Maps API key not configured. Enter address manually.
                                </p>
                            )}
                        </div>

                        {/* Initial Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                Initial Status
                            </label>
                            <div className="flex gap-2">
                                {STATUS_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, status: opt.value })}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                                            form.status === opt.value
                                                ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                                                : "bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-400"
                                        )}
                                    >
                                        <span className={cn("w-2 h-2 rounded-full", opt.color)} />
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Error Display */}
                        {createMutation.isError && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                                {createMutation.error?.message || "Failed to create patrol unit"}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending || !form.lat}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Unit"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

import React, { useState, useMemo } from "react";
import {
    Users,
    Filter,
    Map,
    List,
    Radio,
    Shield,
    AlertTriangle,
    Plus,
    RefreshCw,
    Loader2,
    LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PatrolUnitCard from "@/components/traffic/PatrolUnitCard";
import PatrolUnitMap from "@/components/traffic/PatrolUnitMap";
import PatrolUnitDrawer from "@/components/traffic/PatrolUnitDrawer";
import CreatePatrolUnitModal from "@/components/traffic/CreatePatrolUnitModal";
import { usePatrolUnits, useUpdateLocation } from "@/hooks/usePatrolUnits";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const STATUS_FILTERS = [
    { id: "all", label: "All", icon: Users },
    { id: "AVAILABLE", label: "Available", icon: Shield, color: "text-green-600" },
    { id: "ON_PATROL", label: "On Patrol", icon: Radio, color: "text-amber-600" },
    { id: "BUSY", label: "Busy", icon: AlertTriangle, color: "text-red-600" },
];

export default function PatrolUnits() {
    const [filter, setFilter] = useState("all");
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState("split");

    const { data: units = [], isLoading, error, refetch, isFetching } = usePatrolUnits();
    const updateLocationMutation = useUpdateLocation();

    const filteredUnits = useMemo(() => {
        if (filter === "all") return units;
        return units.filter((unit) => unit.status === filter);
    }, [filter, units]);

    const stats = useMemo(() => ({
        total: units.length,
        available: units.filter((u) => u.status === "AVAILABLE").length,
        onPatrol: units.filter((u) => u.status === "ON_PATROL").length,
        busy: units.filter((u) => u.status === "BUSY").length,
    }), [units]);

    const handleUnitClick = (unit) => {
        setSelectedUnit(unit);
        setDrawerOpen(true);
    };

    const handleMapClick = (location) => {
        if (selectedUnit) {
            updateLocationMutation.mutate({
                unitId: selectedUnit.id,
                location,
            });
        }
    };

    const liveSelectedUnit = useMemo(() => {
        if (!selectedUnit) return null;
        return units.find((u) => u.id === selectedUnit.id) || selectedUnit;
    }, [selectedUnit, units]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                    <p className="text-gray-600 dark:text-slate-400">Loading patrol units...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="font-bold text-red-800 dark:text-red-200">Failed to load patrol units</h3>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error.message}</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-5 min-h-screen bg-gray-50 dark:bg-[#020617]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Map className="w-6 h-6 text-blue-500" />
                        Patrol Unit Tracking
                        {isFetching && !isLoading && (
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                        )}
                    </h1>
                    <p className="text-gray-600 dark:text-slate-400 text-sm mt-0.5">
                        Real-time tracking of {stats.total} units
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Unit</span>
                    </button>

                    {/* View Toggle - Desktop */}
                    <div className="hidden md:flex items-center gap-1 bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("split")}
                            className={cn(
                                "p-2 rounded-md transition-colors",
                                viewMode === "split"
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                            )}
                            title="Split View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "p-2 rounded-md transition-colors",
                                viewMode === "list"
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                            )}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("map")}
                            className={cn(
                                "p-2 rounded-md transition-colors",
                                viewMode === "map"
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                            )}
                            title="Map View"
                        >
                            <Map className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-2 md:gap-3">
                <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-xl p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400">Total</p>
                            <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-xl p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-1.5 md:p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <Shield className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400">Available</p>
                            <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">{stats.available}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-xl p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-1.5 md:p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                            <Radio className="w-4 h-4 md:w-5 md:h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400">Patrol</p>
                            <p className="text-lg md:text-xl font-bold text-amber-600 dark:text-amber-400">{stats.onPatrol}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-xl p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-1.5 md:p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400">Busy</p>
                            <p className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400">{stats.busy}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1">
                <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {STATUS_FILTERS.map((sf) => {
                    const count = sf.id === "all" ? stats.total
                        : sf.id === "AVAILABLE" ? stats.available
                            : sf.id === "ON_PATROL" ? stats.onPatrol
                                : stats.busy;

                    return (
                        <button
                            key={sf.id}
                            onClick={() => setFilter(sf.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all whitespace-nowrap",
                                filter === sf.id
                                    ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                                    : "bg-white dark:bg-[#0a1525] border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-300"
                            )}
                        >
                            <sf.icon className={cn("w-3.5 h-3.5", sf.color)} />
                            {sf.label}
                            <span className="text-xs bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Main Content */}
            <div
                className={cn(
                    "grid gap-4",
                    viewMode === "split" ? "lg:grid-cols-[340px_1fr]" : "grid-cols-1"
                )}
            >
                {/* Unit List */}
                {(viewMode === "split" || viewMode === "list") && (
                    <div
                        className={cn(
                            viewMode === "list"
                                ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                                : "space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1"
                        )}
                    >
                        {filteredUnits.map((unit) => (
                            <PatrolUnitCard
                                key={unit.id}
                                unit={unit}
                                isSelected={selectedUnit?.id === unit.id}
                                onClick={() => handleUnitClick(unit)}
                            />
                        ))}

                        {filteredUnits.length === 0 && (
                            <div className="text-center py-12 text-gray-500 dark:text-slate-400 col-span-full">
                                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No patrol units found</p>
                                <button
                                    onClick={() => setCreateModalOpen(true)}
                                    className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
                                >
                                    Add your first unit
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Map */}
                {(viewMode === "split" || viewMode === "map") && (
                    <PatrolUnitMap
                        units={filteredUnits}
                        selectedUnit={liveSelectedUnit}
                        onSelectUnit={handleUnitClick}
                        onMapClick={handleMapClick}
                        apiKey={GOOGLE_MAPS_API_KEY}
                    />
                )}
            </div>

            {/* Drawer */}
            <PatrolUnitDrawer
                unit={liveSelectedUnit}
                isOpen={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setSelectedUnit(null);
                }}
            />

            {/* Create Modal */}
            <CreatePatrolUnitModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
            />
        </div>
    );
}

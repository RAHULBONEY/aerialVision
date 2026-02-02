import React from "react";
import {
    X,
    User,
    MapPin,
    Clock,
    Phone,
    AlertTriangle,
    Radio,
    Shield,
    Navigation,
    Loader2,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateStatus, useDeletePatrolUnit } from "@/hooks/usePatrolUnits";

const STATUS_CONFIG = {
    AVAILABLE: {
        label: "Available",
        color: "bg-green-500",
        textColor: "text-green-700 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
    },
    ON_PATROL: {
        label: "On Patrol",
        color: "bg-amber-500",
        textColor: "text-amber-700 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/20",
        borderColor: "border-amber-200 dark:border-amber-800",
    },
    BUSY: {
        label: "Busy",
        color: "bg-red-500",
        textColor: "text-red-700 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/20",
        borderColor: "border-red-200 dark:border-red-800",
    },
};

const STATUS_OPTIONS = ["AVAILABLE", "ON_PATROL", "BUSY"];

function formatTimeAgo(timestamp) {
    if (!timestamp) return "Unknown";

    const now = new Date();
    const updated = new Date(timestamp);
    const diffMs = now - updated;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return updated.toLocaleDateString();
}

export default function PatrolUnitDrawer({ unit, isOpen, onClose }) {
    const updateStatusMutation = useUpdateStatus();
    const deleteMutation = useDeletePatrolUnit();

    if (!isOpen || !unit) return null;

    const statusConfig = STATUS_CONFIG[unit.status] || STATUS_CONFIG.AVAILABLE;

    const handleStatusChange = async (newStatus) => {
        try {
            await updateStatusMutation.mutateAsync({
                unitId: unit.id,
                status: newStatus,
            });
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete patrol unit ${unit.unitCode}?`)) return;

        try {
            await deleteMutation.mutateAsync(unit.id);
            onClose();
        } catch (err) {
            console.error("Failed to delete unit:", err);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-[#0a1525] border-l border-gray-200 dark:border-slate-800 z-50 shadow-2xl overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-[#0a1525] border-b border-gray-200 dark:border-slate-800 p-4 z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Unit Details
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Officer Info Card */}
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl p-4 text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">{unit.officerName}</h3>
                                <p className="text-blue-100 font-mono text-sm">{unit.unitCode}</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Control */}
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-800">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-3">
                            Current Status
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map((status) => {
                                const config = STATUS_CONFIG[status];
                                const isActive = unit.status === status;
                                const isLoading =
                                    updateStatusMutation.isPending &&
                                    updateStatusMutation.variables?.status === status;

                                return (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusChange(status)}
                                        disabled={updateStatusMutation.isPending}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all",
                                            isActive
                                                ? `${config.bgColor} ${config.textColor} ${config.borderColor}`
                                                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-400",
                                            updateStatusMutation.isPending && "opacity-50 cursor-wait"
                                        )}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <span
                                                className={cn("w-2 h-2 rounded-full", config.color)}
                                            />
                                        )}
                                        {config.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-800">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-3">
                            Current Location
                        </h4>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0">
                                {unit.address ? (
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {unit.address}
                                    </p>
                                ) : (
                                    <p className="text-sm font-mono text-gray-700 dark:text-slate-300">
                                        {unit.location?.lat?.toFixed(6)}, {unit.location?.lng?.toFixed(6)}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Updated {formatTimeAgo(unit.lastUpdated)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Assigned Incident */}
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-800">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-3">
                            Assigned Incident
                        </h4>
                        {unit.assignedIncidentId ? (
                            <div className="flex items-center gap-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-red-700 dark:text-red-300 font-mono">
                                    {unit.assignedIncidentId}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-gray-500 dark:text-slate-400">
                                <Shield className="w-4 h-4" />
                                <span className="text-sm">No active incident assigned</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                        <button
                            disabled
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium opacity-50 cursor-not-allowed"
                        >
                            <Navigation className="w-4 h-4" />
                            Assign to Incident
                        </button>
                        <button
                            disabled
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-medium border border-gray-200 dark:border-slate-700 opacity-50 cursor-not-allowed"
                        >
                            <Phone className="w-4 h-4" />
                            Contact Officer
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 dark:text-red-400 rounded-xl font-medium border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            Delete Unit
                        </button>
                    </div>

                    {/* Info Notice */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            Location updates every 5 seconds via polling.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

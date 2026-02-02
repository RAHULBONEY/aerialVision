import React from "react";
import { User, MapPin, Clock, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

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

function formatTimeAgo(timestamp) {
    if (!timestamp) return "Unknown";

    const now = new Date();
    const updated = new Date(timestamp);
    const diffMs = now - updated;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return updated.toLocaleDateString();
}

// Shorten address for display
function shortenAddress(address) {
    if (!address) return null;

    // Take first two parts of the address
    const parts = address.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
        return `${parts[0]}, ${parts[1]}`;
    }
    return parts[0];
}

export default function PatrolUnitCard({ unit, isSelected, onClick }) {
    const statusConfig = STATUS_CONFIG[unit.status] || STATUS_CONFIG.AVAILABLE;
    const displayLocation = shortenAddress(unit.address) ||
        `${unit.location?.lat?.toFixed(4)}, ${unit.location?.lng?.toFixed(4)}`;

    return (
        <div
            onClick={onClick}
            className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all duration-200",
                "bg-white dark:bg-[#0a1525] hover:shadow-md",
                isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/20 shadow-lg"
                    : "border-gray-200 dark:border-slate-800/50 hover:border-blue-400/50"
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {unit.officerName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 font-mono">
                            {unit.unitCode}
                        </p>
                    </div>
                </div>

                {/* Status Badge */}
                <div
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0",
                        statusConfig.bgColor,
                        statusConfig.textColor,
                        statusConfig.borderColor
                    )}
                >
                    <span className={cn("w-2 h-2 rounded-full", statusConfig.color)} />
                    <span className="hidden sm:inline">{statusConfig.label}</span>
                </div>
            </div>

            {/* Details */}
            <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-400">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{displayLocation}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTimeAgo(unit.lastUpdated)}</span>
                </div>
            </div>

            {/* Status Indicator */}
            {unit.status === "AVAILABLE" && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <Radio className="w-3 h-3 animate-pulse" />
                        <span>Ready for dispatch</span>
                    </div>
                </div>
            )}

            {unit.assignedIncidentId && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                        <Radio className="w-3 h-3" />
                        <span>Responding to incident</span>
                    </div>
                </div>
            )}
        </div>
    );
}

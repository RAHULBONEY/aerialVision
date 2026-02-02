import React, { useState } from "react";
import { X, User, MapPin, Radio, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatrolUnits } from "@/hooks/usePatrolUnits";

export default function AssignPatrolUnitModal({
    open,
    onClose,
    incident,
    onAssign
}) {
    const { data: patrolUnits, isLoading } = usePatrolUnits();
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState(null);

    if (!open) return null;

    // Filter to only available units
    const availableUnits = patrolUnits?.filter(unit => unit.status === "AVAILABLE") || [];

    const handleAssign = async () => {
        if (!selectedUnit) return;

        setAssigning(true);
        setError(null);

        try {
            await onAssign(selectedUnit.id);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to assign patrol unit");
        } finally {
            setAssigning(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-[#0a1929] rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700/50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Assign Patrol Unit
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            Select an available unit to dispatch
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} className="text-gray-500 dark:text-slate-400" />
                    </button>
                </div>

                {/* Incident Summary */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/30 border-b border-gray-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
                            <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                                {incident?.type || "Incident"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">
                                {incident?.description?.slice(0, 60)}...
                            </div>
                        </div>
                    </div>
                </div>

                {/* Patrol Units List */}
                <div className="p-4 max-h-[300px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : availableUnits.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                            <User size={48} className="mx-auto mb-2 opacity-50" />
                            <p>No available patrol units</p>
                            <p className="text-sm">All units are currently on duty</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {availableUnits.map((unit) => (
                                <div
                                    key={unit.id}
                                    onClick={() => setSelectedUnit(unit)}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                        selectedUnit?.id === unit.id
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                                            : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50"
                                    )}
                                >
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        {unit.officerName?.charAt(0) || "U"}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {unit.unitCode}
                                            </span>
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                                                AVAILABLE
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-slate-300">
                                            {unit.officerName}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 mt-1">
                                            <MapPin size={12} />
                                            <span className="truncate">
                                                {unit.address?.slice(0, 40) || `${unit.location?.lat?.toFixed(4)}, ${unit.location?.lng?.toFixed(4)}`}...
                                            </span>
                                        </div>
                                    </div>

                                    {/* Selection Indicator */}
                                    {selectedUnit?.id === unit.id && (
                                        <CheckCircle size={24} className="text-blue-500 flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="px-4 py-2 bg-red-50 dark:bg-red-500/10 border-t border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-slate-700/50">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedUnit || assigning}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors",
                            selectedUnit && !assigning
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                        )}
                    >
                        {assigning ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Dispatching...
                            </>
                        ) : (
                            <>
                                <Radio size={18} />
                                Dispatch Unit
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

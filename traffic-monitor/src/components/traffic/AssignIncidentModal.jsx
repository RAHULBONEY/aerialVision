import React, { useState } from "react";
import { X, Navigation, AlertCircle, Loader2, CheckCircle, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIncidents } from "@/hooks/useIncidents";
import { useDispatchUnit } from "@/hooks/usePatrolUnits";
import { formatDateTime } from "@/utils/dateUtils";

export default function AssignIncidentModal({
    open,
    onClose,
    unitId
}) {
    const { data: incidents, isLoading } = useIncidents();
    const dispatchMutation = useDispatchUnit();
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState(null);

    if (!open) return null;

    // Filter to only active/new incidents (not resolved)
    const activeIncidents = incidents?.filter(inc => inc.status !== "RESOLVED") || [];

    const handleAssign = async () => {
        if (!selectedIncident || !unitId) return;

        setAssigning(true);
        setError(null);

        try {
            await dispatchMutation.mutateAsync({
                unitId: unitId,
                incidentId: selectedIncident.id
            });
            onClose();
        } catch (err) {
            setError(err.message || "Failed to assign incident");
        } finally {
            setAssigning(false);
        }
    };

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case "CRITICAL": return "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/20";
            case "HIGH": return "text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20";
            case "MEDIUM": return "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20";
            case "LOW": return "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20";
            default: return "text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-500/20";
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-xl mx-4 bg-white dark:bg-[#0a1929] rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700/50 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700/50 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Navigation size={20} className="text-blue-500" />
                            Assign Incident
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            Select an active incident to dispatch to this unit
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} className="text-gray-500 dark:text-slate-400" />
                    </button>
                </div>

                {/* Incident List */}
                <div className="p-4 overflow-y-auto flex-1 bg-gray-50 dark:bg-slate-900/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : activeIncidents.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                            <CheckCircle size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium text-gray-700 dark:text-slate-300">No active incidents</p>
                            <p className="text-sm mt-1">There are currently no unresolved incidents to assign.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeIncidents.map((incident) => (
                                <div
                                    key={incident.id}
                                    onClick={() => setSelectedIncident(incident)}
                                    className={cn(
                                        "flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all bg-white dark:bg-[#0a1525]",
                                        selectedIncident?.id === incident.id
                                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10"
                                            : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50"
                                    )}
                                >
                                    {/* Icon */}
                                    <div className={`p-3 rounded-xl flex-shrink-0 h-12 w-12 flex items-center justify-center ${incident.status === 'NEW' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                                        {incident.status === 'NEW' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-900 dark:text-white truncate">
                                                {incident.type}
                                            </span>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getSeverityStyles(incident.severity)}`}>
                                                {incident.severity}
                                            </span>
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {incident.status}
                                            </span>
                                        </div>

                                        <div className="text-sm text-gray-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                            {incident.description || 'No description provided'}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400 mt-2">
                                            <span className="flex items-center gap-1">
                                                <MapPin size={12} />
                                                {incident.streamName || 'Unknown Location'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {formatDateTime(incident.timestamp)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Selection Indicator */}
                                    <div className="flex-shrink-0 flex items-center justify-center pl-2">
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                            selectedIncident?.id === incident.id
                                                ? "border-blue-500 bg-blue-500"
                                                : "border-gray-300 dark:border-slate-600"
                                        )}>
                                            {selectedIncident?.id === incident.id && (
                                                <CheckCircle size={14} className="text-white" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="px-4 py-3 bg-red-50 dark:bg-red-500/10 border-y border-red-200 dark:border-red-500/20 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm flex-shrink-0">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-slate-700/50 bg-white dark:bg-[#0a1929] flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedIncident || assigning}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors shadow-sm",
                            selectedIncident && !assigning
                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                                : "bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-gray-200 dark:border-slate-700"
                        )}
                    >
                        {assigning ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Assigning...
                            </>
                        ) : (
                            <>
                                <Navigation size={18} />
                                Assign Incident
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

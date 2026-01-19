import React from 'react';
import { CheckCircle, User, FileText, Wifi } from 'lucide-react';
import { useAcknowledgeIncident } from '@/hooks/useIncidents';
import { formatFullDateTime, formatDateTime } from '@/utils/dateUtils';

export default function IncidentDetails({ incident }) {
    const { mutate: acknowledge, isPending } = useAcknowledgeIncident();

    const handleAcknowledge = () => {
        acknowledge({
            id: incident.id,
            note: "Operator confirmed visual and dispatched unit."
        });
    };

    return (
        <div className="space-y-6">
            {/* Basic Info */}
            <div>
                <h4 className="text-gray-600 dark:text-slate-400 text-sm uppercase tracking-wider mb-2">
                    Incident Information
                </h4>
                <div className="space-y-3">
                    <div>
                        <div className="text-xs text-gray-500 dark:text-slate-500">Type</div>
                        <div className="text-gray-900 dark:text-white font-medium">{incident.type}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 dark:text-slate-500">Description</div>
                        <div className="text-gray-900 dark:text-white">{incident.description}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 dark:text-slate-500">Detected At</div>
                        <div className="text-gray-900 dark:text-white">
                            {formatFullDateTime(incident.timestamp)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Source Stream */}
            <div>
                <h4 className="text-gray-600 dark:text-slate-400 text-sm uppercase tracking-wider mb-2">
                    Source Stream
                </h4>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/30 rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded">
                        <Wifi size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="text-gray-900 dark:text-white font-medium">{incident.streamName}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-500 font-mono">
                            ID: {incident.streamId}
                        </div>
                    </div>
                </div>
            </div>

            {/* Snapshot Data */}
            {incident.snapshot && (
                <div>
                    <h4 className="text-gray-600 dark:text-slate-400 text-sm uppercase tracking-wider mb-2">
                        Traffic Snapshot
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-800/30 rounded-lg p-3">
                            <div className="text-xs text-gray-500 dark:text-slate-500">Density</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {Math.round((incident.snapshot.density || 0) * 100)}%
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800/30 rounded-lg p-3">
                            <div className="text-xs text-gray-500 dark:text-slate-500">Speed</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {incident.snapshot.speed || 0} km/h
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800/30 rounded-lg p-3">
                            <div className="text-xs text-gray-500 dark:text-slate-500">Vehicles</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {incident.snapshot.vehicleCount || 0}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {incident.status === 'ACKNOWLEDGED' && incident.operatorAction && (
                <div>
                    <h4 className="text-gray-600 dark:text-slate-400 text-sm uppercase tracking-wider mb-2">
                        Response Details
                    </h4>
                    <div className="space-y-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                        <div className="flex items-center gap-2">
                            <User size={14} className="text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <div className="text-emerald-700 dark:text-emerald-300 font-medium">
                                    {incident.operatorAction.ackedBy || 'Unknown Officer'}
                                </div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400/70">
                                    Acknowledged {incident.operatorAction.ackedAt ? formatDateTime(incident.ackedAt) : 'N/A'}
                                </div>
                            </div>
                        </div>
                        {incident.note && (
                            <div className="flex items-start gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-500/20">
                                <FileText size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5" />
                                <div>
                                    <div className="text-xs text-emerald-600 dark:text-emerald-400/70">Note</div>
                                    <div className="text-emerald-700 dark:text-emerald-300">{incident.note}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {incident.status === 'NEW' && (
                <div className="pt-4 border-t border-gray-200 dark:border-slate-800/50">
                    <h4 className="text-gray-600 dark:text-slate-400 text-sm uppercase tracking-wider mb-3">
                        Actions
                    </h4>
                    <div className="flex gap-3">
                        <button
                            onClick={handleAcknowledge}
                            disabled={isPending}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors"
                        >
                            <CheckCircle size={16} />
                            {isPending ? "PROCESSING..." : "ACKNOWLEDGE"}
                        </button>
                        <button className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium rounded-lg transition-colors">
                            ESCALATE
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
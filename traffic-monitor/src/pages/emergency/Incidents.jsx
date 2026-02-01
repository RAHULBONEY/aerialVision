import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, MapPin, TrendingUp } from 'lucide-react';
import { useEmergencyIncidents, useLocalAcknowledge, useIncidentStats } from '@/hooks/useEmergencyIncidents';
import EmergencyIncidentCard from '@/components/emergency/EmergencyIncidentCard';
import { formatDateTime } from '@/utils/dateUtils';

export default function Incidents() {
    const { data: incidents, isLoading } = useEmergencyIncidents();
    const { acknowledge, isAcknowledged, acknowledgedCount } = useLocalAcknowledge();
    const stats = useIncidentStats();
    const [selectedIncident, setSelectedIncident] = useState(null);

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'CRITICAL': return 'text-red-600 dark:text-red-400';
            case 'HIGH': return 'text-orange-600 dark:text-orange-400';
            case 'MEDIUM': return 'text-amber-600 dark:text-amber-400';
            case 'LOW': return 'text-blue-600 dark:text-blue-400';
            default: return 'text-gray-600 dark:text-slate-400';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-600 dark:text-slate-400 animate-pulse">Loading Incident Feed...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <AlertTriangle className="text-rose-500" size={24} />
                            Emergency Incident Feed
                        </h1>
                        <p className="text-gray-600 dark:text-slate-400 mt-2">
                            <span className="font-bold text-red-600 dark:text-red-400">{stats.active}</span>
                            {' '}active incident{stats.active !== 1 ? 's' : ''} require{stats.active === 1 ? 's' : ''} attention
                        </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-emerald-700 dark:text-emerald-400 text-sm font-mono">LIVE FEED</span>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-lg p-4">
                        <div className="text-gray-600 dark:text-slate-400 text-sm">Total Incidents</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                    </div>
                    <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-lg p-4">
                        <div className="text-gray-600 dark:text-slate-400 text-sm">Active</div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.active}</div>
                    </div>
                    <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-lg p-4">
                        <div className="text-gray-600 dark:text-slate-400 text-sm">Locally Acknowledged</div>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{acknowledgedCount}</div>
                    </div>
                    <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-lg p-4">
                        <div className="text-gray-600 dark:text-slate-400 text-sm">Resolved</div>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.resolved}</div>
                    </div>
                </div>
            </div>

            {/* Incidents Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Incidents List */}
                <div className="lg:col-span-2 space-y-4">
                    {incidents?.map((incident) => (
                        <EmergencyIncidentCard
                            key={incident.id}
                            incident={incident}
                            isSelected={selectedIncident?.id === incident.id}
                            onClick={() => setSelectedIncident(incident)}
                            onAcknowledge={() => acknowledge(incident.id)}
                            isLocallyAcknowledged={isAcknowledged(incident.id)}
                            getSeverityColor={getSeverityColor}
                        />
                    ))}

                    {incidents?.length === 0 && (
                        <div className="p-10 border border-dashed border-gray-300 dark:border-slate-800 rounded-xl text-center text-gray-500 dark:text-slate-500 bg-white dark:bg-[#0a0a12]">
                            <CheckCircle size={48} className="mx-auto text-gray-400 dark:text-slate-600 mb-4" />
                            <p className="text-lg font-medium text-gray-700 dark:text-slate-300">
                                No incidents recorded
                            </p>
                            <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
                                All systems operating normally
                            </p>
                        </div>
                    )}
                </div>

                {/* Incident Details Panel */}
                <div className="lg:col-span-1">
                    {selectedIncident ? (
                        <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-6 sticky top-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Incident Details</h3>
                                <button
                                    onClick={() => setSelectedIncident(null)}
                                    className="text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 text-xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide">Type</label>
                                    <p className="text-gray-900 dark:text-white font-medium">{selectedIncident.type}</p>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide">Severity</label>
                                    <p className={`font-bold ${getSeverityColor(selectedIncident.severity)}`}>
                                        {selectedIncident.severity}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide">Status</label>
                                    <p className={`font-medium ${selectedIncident.status === 'NEW' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {selectedIncident.status}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide">Description</label>
                                    <p className="text-gray-700 dark:text-slate-300 text-sm">{selectedIncident.description}</p>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide">Location</label>
                                    <p className="text-gray-900 dark:text-white flex items-center gap-1">
                                        <MapPin size={14} />
                                        {selectedIncident.streamName}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide">Timestamp</label>
                                    <p className="text-gray-700 dark:text-slate-300 text-sm">{formatDateTime(selectedIncident.timestamp)}</p>
                                </div>

                                {selectedIncident.snapshot && (
                                    <div className="pt-4 border-t border-gray-200 dark:border-slate-800/50">
                                        <label className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide mb-2 block">Snapshot Data</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedIncident.snapshot.vehicleCount || 0}</p>
                                                <p className="text-xs text-gray-500 dark:text-slate-500">Vehicles</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">{Math.round((selectedIncident.snapshot.density || 0) * 100)}%</p>
                                                <p className="text-xs text-gray-500 dark:text-slate-500">Density</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-6 text-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="text-gray-400 dark:text-slate-600" size={24} />
                            </div>
                            <p className="text-gray-700 dark:text-slate-300 font-medium">Select an incident</p>
                            <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
                                Click on any incident to view detailed information
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

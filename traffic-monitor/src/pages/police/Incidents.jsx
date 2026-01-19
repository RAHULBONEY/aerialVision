import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, TrafficCone, Car, AlertCircle, TrendingUp } from 'lucide-react';
import { useIncidents } from '@/hooks/useIncidents';
import IncidentCard from '@/components/police/IncidentCard';
import IncidentDetails from '@/components/police/IncidentDetails';

export default function Incidents() {
    const { data: incidents, isLoading } = useIncidents();
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

    const getIncidentIcon = (type) => {
        switch (type) {
            case 'OBSTRUCTION': return <TrafficCone size={16} />;
            case 'CONGESTION': return <TrendingUp size={16} />;
            case 'ACCIDENT': return <Car size={16} />;
            default: return <AlertCircle size={16} />;
        }
    };

    const activeAlerts = incidents?.filter(i => i.status === 'NEW').length || 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-600 dark:text-slate-400 animate-pulse">Loading Incident Log...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">

            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <AlertTriangle className="text-red-500" size={24} />
                            Incident Response Log
                        </h1>
                        <p className="text-gray-600 dark:text-slate-400 mt-2">
                            <span className="font-bold text-red-600 dark:text-red-400">{activeAlerts}</span>
                            active alert{activeAlerts !== 1 ? 's' : ''} require{activeAlerts === 1 ? 's' : ''} attention.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-emerald-700 dark:text-emerald-400 text-sm font-mono">SYSTEM NOMINAL</span>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-lg p-4">
                        <div className="text-gray-600 dark:text-slate-400 text-sm">Total Incidents</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{incidents?.length || 0}</div>
                    </div>
                    <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-lg p-4">
                        <div className="text-gray-600 dark:text-slate-400 text-sm">Active Alerts</div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{activeAlerts}</div>
                    </div>
                    <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-lg p-4">
                        <div className="text-gray-600 dark:text-slate-400 text-sm">Avg Response Time</div>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">2.5m</div>
                    </div>
                    <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-lg p-4">
                        <div className="text-gray-600 dark:text-slate-400 text-sm">Resolved</div>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {incidents?.filter(i => i.status !== 'NEW').length || 0}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 space-y-4">
                    {incidents?.map((incident) => (
                        <IncidentCard
                            key={incident.id}
                            incident={incident}
                            isSelected={selectedIncident?.id === incident.id}
                            onClick={() => setSelectedIncident(incident)}
                            getSeverityColor={getSeverityColor}
                            getIncidentIcon={getIncidentIcon}
                        />
                    ))}
                    {incidents?.length === 0 && (
                        <div className="p-10 border border-dashed border-gray-300 dark:border-slate-800 rounded-xl text-center text-gray-500 dark:text-slate-500 bg-white dark:bg-[#0a1525]">
                            <CheckCircle size={48} className="mx-auto text-gray-400 dark:text-slate-600 mb-4" />
                            <p className="text-lg font-medium text-gray-700 dark:text-slate-300">
                                No incidents recorded in the last 24 hours.
                            </p>
                            <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
                                All systems operating normally.
                            </p>
                        </div>
                    )}
                </div>


                <div className="lg:col-span-1">
                    {selectedIncident ? (
                        <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-xl p-6 sticky top-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Incident Details</h3>
                                <button
                                    onClick={() => setSelectedIncident(null)}
                                    className="text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300"
                                >
                                    ×
                                </button>
                            </div>

                            <IncidentDetails incident={selectedIncident} />
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#0a1525] border border-gray-200 dark:border-slate-800/50 rounded-xl p-6 text-center">
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
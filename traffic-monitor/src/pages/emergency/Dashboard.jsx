import React, { useState } from 'react';
import {
    AlertTriangle,
    Activity,
    Video,
    Heart,
    Clock,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    Siren,
    MapPin
} from 'lucide-react';
import { useEmergencyIncidents, useIncidentStats } from '@/hooks/useEmergencyIncidents';
import { useEmergencyStreams } from '@/hooks/useEmergencyStreams';
import { formatTime, formatDateTime } from '@/utils/dateUtils';

export default function Dashboard() {
    const { data: incidents, isLoading: incidentsLoading } = useEmergencyIncidents();
    const { data: streams, isLoading: streamsLoading } = useEmergencyStreams();
    const stats = useIncidentStats();

    const isLoading = incidentsLoading || streamsLoading;

    // Get emergency-relevant streams (warning or critical)
    const emergencyStreams = streams?.filter(s =>
        s.currentStatus === 'WARNING' || s.currentStatus === 'CRITICAL'
    ) || [];

    // Recent incidents (last 5)
    const recentIncidents = incidents?.slice(0, 5) || [];

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
                    <p className="text-gray-600 dark:text-slate-400 animate-pulse">Establishing Hospital Uplink...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Heart className="text-rose-500" size={28} />
                        Emergency Command Center
                    </h1>
                    <p className="text-gray-600 dark:text-slate-400 mt-1">
                        Real-time situational awareness for emergency response
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-emerald-700 dark:text-emerald-400 text-sm font-mono">LINK ACTIVE</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Emergencies */}
                <div className="bg-white dark:bg-[#0a0a12] border-2 border-red-200 dark:border-rose-900/50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-rose-500/10 rounded-xl">
                            <Siren size={24} className="text-red-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Active Emergencies</p>
                            <p className="text-3xl font-bold text-red-600 dark:text-rose-400">{stats.active}</p>
                        </div>
                    </div>
                </div>

                {/* Critical Alerts */}
                <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-100 dark:bg-orange-500/10 rounded-xl">
                            <AlertTriangle size={24} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Critical</p>
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.critical}</p>
                        </div>
                    </div>
                </div>

                {/* Streams Monitoring */}
                <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-500/10 rounded-xl">
                            <Video size={24} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Live Streams</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{streams?.length || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Acknowledged */}
                <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl">
                            <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Acknowledged</p>
                            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.acknowledged}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Incidents */}
                <div className="lg:col-span-2 bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-800/50 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <AlertCircle size={20} className="text-rose-500" />
                            Recent Incidents
                        </h2>
                        <span className="text-xs text-gray-500 dark:text-slate-500 font-mono">
                            Last 24 hours
                        </span>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-slate-800/50">
                        {recentIncidents.length > 0 ? (
                            recentIncidents.map((incident) => (
                                <div key={incident.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/20 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${incident.status === 'NEW'
                                            ? 'bg-red-100 dark:bg-red-500/10'
                                            : 'bg-emerald-100 dark:bg-emerald-500/10'
                                            }`}>
                                            {incident.status === 'NEW' ? (
                                                <Clock className="text-red-600 dark:text-red-400" size={16} />
                                            ) : (
                                                <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={16} />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-bold ${getSeverityColor(incident.severity)}`}>
                                                    {incident.severity}
                                                </span>
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {incident.type} Detected
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                                                {incident.description}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    {incident.streamName}
                                                </span>
                                                <span>{formatDateTime(incident.timestamp)}</span>
                                            </div>
                                        </div>

                                        <div className={`px-2 py-1 rounded text-xs font-bold ${incident.status === 'NEW'
                                            ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                                            : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                            }`}>
                                            {incident.status}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <CheckCircle size={48} className="mx-auto text-gray-300 dark:text-slate-700 mb-4" />
                                <p className="text-gray-600 dark:text-slate-400">No recent incidents</p>
                                <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">All systems operating normally</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Emergency Streams */}
                <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-800/50">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity size={20} className="text-amber-500" />
                            Alert Zones
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-slate-800/50">
                        {emergencyStreams.length > 0 ? (
                            emergencyStreams.map((stream) => (
                                <div key={stream.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${stream.currentStatus === 'CRITICAL'
                                            ? 'bg-red-500 animate-pulse'
                                            : 'bg-amber-500'
                                            }`} />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">{stream.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-500">{stream.currentStatus}</p>
                                        </div>
                                        <span className={`text-xs font-mono px-2 py-1 rounded ${stream.currentStatus === 'CRITICAL'
                                            ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                                            : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                            }`}>
                                            {stream.viewType?.toUpperCase() || 'STREAM'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <Activity size={48} className="mx-auto text-gray-300 dark:text-slate-700 mb-4" />
                                <p className="text-gray-600 dark:text-slate-400">No active alerts</p>
                                <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">All zones are stable</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Footer */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-800/50">
                <div className="flex flex-col sm:flex-row items-center justify-between text-sm">
                    <div className="flex items-center gap-6 mb-4 sm:mb-0">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-gray-600 dark:text-slate-400">Critical</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full" />
                            <span className="text-gray-600 dark:text-slate-400">Warning</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <span className="text-gray-600 dark:text-slate-400">Normal</span>
                        </div>
                    </div>
                    <div className="text-gray-500 dark:text-slate-500 text-xs font-mono">
                        Last Sync: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        </div>
    );
}

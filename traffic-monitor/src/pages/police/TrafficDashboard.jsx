import React from 'react';
import {
    AlertTriangle,
    Siren,
    Video,
    Clock,
    CheckCircle,
    AlertCircle,
    MapPin,
    Car
} from 'lucide-react';
import { useTrafficDashboard } from '@/hooks/useTrafficDashboard';
import { formatDateTime } from '@/utils/dateUtils';

export default function TrafficDashboard() {
    const { stats, isLoading, incidents, streams, patrolUnits } = useTrafficDashboard();

    if (isLoading || !stats) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-600 dark:text-slate-400 animate-pulse">Establishing Command Uplink...</p>
                </div>
            </div>
        );
    }

    const { incidents: incidentStats, streams: streamStats, patrolUnits: unitStats } = stats;

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'CRITICAL': return 'text-red-600 dark:text-red-400';
            case 'HIGH': return 'text-orange-600 dark:text-orange-400';
            case 'MEDIUM': return 'text-amber-600 dark:text-amber-400';
            case 'LOW': return 'text-blue-600 dark:text-blue-400';
            default: return 'text-gray-600 dark:text-slate-400';
        }
    };

    const getUnitStatusColor = (status) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
            case 'DISPATCHED': return 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400';
            case 'EN_ROUTE': return 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400';
            case 'ON_SCENE': return 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400';
            case 'BUSY': return 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400';
            case 'OFF_DUTY': return 'bg-gray-100 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400';
            default: return 'bg-gray-100 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400';
        }
    };

    const getUnitStatusPulse = (status) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-emerald-500';
            case 'DISPATCHED': return 'bg-amber-500 animate-pulse';
            case 'EN_ROUTE': return 'bg-blue-500 animate-pulse';
            case 'ON_SCENE': return 'bg-purple-500';
            case 'BUSY': return 'bg-orange-500';
            case 'OFF_DUTY': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <AlertTriangle className="text-emerald-500" size={28} />
                        Traffic Command Center
                    </h1>
                    <p className="text-gray-600 dark:text-slate-400 mt-1">
                        Real-time traffic monitoring and incident response
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-emerald-700 dark:text-emerald-400 text-sm font-mono">SYSTEM NOMINAL</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Incidents */}
                <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${incidentStats.active > 0 ? 'bg-red-100 dark:bg-rose-500/10' : 'bg-emerald-100 dark:bg-emerald-500/10'}`}>
                            <AlertCircle size={24} className={incidentStats.active > 0 ? 'text-red-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Active Incidents</p>
                            <p className={`text-3xl font-bold ${incidentStats.active > 0 ? 'text-red-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {incidentStats.active}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Live Streams */}
                <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-500/10 rounded-xl">
                            <Video size={24} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Live Streams</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{streamStats.total}</p>
                        </div>
                    </div>
                </div>

                {/* Patrol Units */}
                <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl">
                            <Siren size={24} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Patrol Units Online</p>
                            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{unitStats.active}/{unitStats.total}</p>
                        </div>
                    </div>
                </div>

                {/* Avg Response Time */}
                <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-500/10 rounded-xl">
                            <Clock size={24} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-slate-400 text-sm">Avg Response Time</p>
                            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                {incidentStats.avgResponseTimeMins}
                                <span className="text-sm font-normal text-gray-500 dark:text-slate-500 ml-1">mins</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (2/3) - Incidents & Units */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Recent Incidents Panel */}
                    <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-800/50 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <AlertCircle size={20} className="text-rose-500" />
                                Recent Incidents
                            </h2>
                            <span className="text-xs text-gray-500 dark:text-slate-500 font-mono">
                                Last 24 hours
                            </span>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-slate-800/50 max-h-[400px] overflow-y-auto">
                            {incidentStats.recent.length > 0 ? (
                                incidentStats.recent.map((incident) => (
                                    <div key={incident.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-2 rounded-lg ${incident.status === 'NEW'
                                                ? 'bg-red-100 dark:bg-red-500/10'
                                                : incident.status === 'RESOLVED'
                                                    ? 'bg-blue-100 dark:bg-blue-500/10'
                                                    : 'bg-emerald-100 dark:bg-emerald-500/10'
                                                }`}>
                                                {incident.status === 'NEW' ? (
                                                    <Clock className="text-red-600 dark:text-red-400" size={16} />
                                                ) : incident.status === 'RESOLVED' ? (
                                                    <Car className="text-blue-600 dark:text-blue-400" size={16} />
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
                                                    {incident.description || 'No description provided'}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={12} />
                                                        {incident.streamName || 'Unknown Location'}
                                                    </span>
                                                    <span>{formatDateTime(incident.timestamp)}</span>
                                                </div>
                                            </div>

                                            <div className={`px-2 py-1 rounded text-xs font-bold ${incident.status === 'NEW'
                                                ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                                                : incident.status === 'RESOLVED'
                                                    ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
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
                                    <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">Traffic flowing normally</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Patrol Units Summary */}
                    <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-800/50 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Siren size={20} className="text-emerald-500" />
                                Active Patrol Units
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-slate-800/50 max-h-[300px] overflow-y-auto">
                            {patrolUnits && patrolUnits.filter(u => u.status !== 'OFF_DUTY').length > 0 ? (
                                patrolUnits.filter(u => u.status !== 'OFF_DUTY').slice(0, 10).map((unit) => (
                                    <div key={unit.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg">
                                                    <Car size={16} className="text-gray-600 dark:text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{unit.callsign}</p>
                                                    {unit.currentIncidentId ? (
                                                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                                                            Responding to ID: {unit.currentIncidentId}
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                                                            {unit.officers?.length || 0} Officer(s) assigned
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${getUnitStatusPulse(unit.status)}`} />
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getUnitStatusColor(unit.status)}`}>
                                                    {unit.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center">
                                    <Car size={48} className="mx-auto text-gray-300 dark:text-slate-700 mb-4" />
                                    <p className="text-gray-600 dark:text-slate-400">No active units</p>
                                    <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">All units are currently off duty</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right Column (1/3) - Alert Zones Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#0a0a12] border border-gray-200 dark:border-slate-800/50 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-800/50">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle size={20} className="text-amber-500" />
                                Alert Zones (Streams)
                            </h2>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-slate-800/50 min-h-[300px]">
                            {streamStats.alertStreams.length > 0 ? (
                                streamStats.alertStreams.map((stream) => (
                                    <div key={stream.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${stream.currentStatus === 'CRITICAL'
                                                ? 'bg-red-500 animate-pulse'
                                                : 'bg-amber-500'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-white truncate" title={stream.name}>{stream.name}</p>
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
                                <div className="p-8 text-center flex flex-col h-full justify-center">
                                    <Video size={48} className="mx-auto text-gray-300 dark:text-slate-700 mb-4" />
                                    <p className="text-gray-600 dark:text-slate-400">All Zones Stable</p>
                                    <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">No streams currently under alert</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Status Footer */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-800/50">
                <div className="flex flex-col sm:flex-row items-center justify-between text-sm">
                    <div className="flex items-center gap-6 mb-4 sm:mb-0">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-gray-600 dark:text-slate-400">Critical Incident</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            <span className="text-gray-600 dark:text-slate-400">Unit Dispatched</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <span className="text-gray-600 dark:text-slate-400">Nominal</span>
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
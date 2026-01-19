import React from 'react';
import { Clock, CheckCircle, MapPin, ArrowRight, ChevronRight, Users, TrendingUp, Timer } from 'lucide-react';
import { useAcknowledgeIncident } from '@/hooks/useIncidents';
import { formatTime, formatDateTime } from '@/utils/dateUtils';

export default function IncidentCard({
    incident,
    isSelected,
    onClick,
    getSeverityColor,
    getIncidentIcon
}) {
    const isNew = incident.status === 'NEW';
    const { mutate: acknowledge, isPending } = useAcknowledgeIncident();

    const handleAcknowledge = (e) => {
        e.stopPropagation();
        acknowledge({
            id: incident.id,
            note: "Operator confirmed visual."
        });
    };

    return (
        <div
            onClick={onClick}
            className={`
        p-4 rounded-xl border-l-4 bg-white dark:bg-[#0a1525] flex flex-col md:flex-row gap-4 
        transition-all cursor-pointer border border-gray-200 dark:border-slate-800/50
        ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-500/50' : 'hover:bg-gray-50 dark:hover:bg-[#0f1f35]'}
        ${isNew ? 'border-l-red-500' : 'border-l-emerald-500'}
      `}
        >
            {/* Status Icon */}
            <div className="flex flex-col items-center justify-center w-12">
                <div className={`
          p-2 rounded-lg ${isNew ? 'bg-red-100 dark:bg-red-500/10' : 'bg-emerald-100 dark:bg-emerald-500/10'}
        `}>
                    {isNew ?
                        <Clock className="text-red-600 dark:text-red-400" size={20} /> :
                        <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={20} />
                    }
                </div>
                <span className="text-[10px] font-mono text-gray-500 dark:text-slate-500 mt-2">
                    {formatTime(incident.timestamp)}
                </span>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase ${getSeverityColor(incident.severity)}`}>
                            {incident.severity}
                        </span>
                        <span className={`
              px-2 py-0.5 text-[10px] font-bold uppercase rounded
              ${isNew ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                                'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}
            `}>
                            {incident.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                        {getIncidentIcon(incident.type)}
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                            {incident.type} Detected
                        </h3>
                    </div>
                </div>

                <p className="text-gray-700 dark:text-slate-300 text-sm mb-3">
                    {incident.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                        <MapPin size={12} /> {incident.streamName}
                    </span>
                    <span className="font-mono">ID: {incident.id?.slice(0, 8) || 'N/A'}</span>
                    <span>{formatDateTime(incident.timestamp)}</span>
                </div>

                {/* Snapshot Data */}
                {incident.snapshot && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-slate-800/50">
                        <div className="flex items-center gap-1">
                            <Users size={12} className="text-gray-400 dark:text-slate-600" />
                            <span className="text-xs text-gray-600 dark:text-slate-400">
                                {incident.snapshot.vehicleCount || 0} vehicles
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <TrendingUp size={12} className="text-gray-400 dark:text-slate-600" />
                            <span className="text-xs text-gray-600 dark:text-slate-400">
                                {Math.round((incident.snapshot.density || 0) * 100)}% density
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Timer size={12} className="text-gray-400 dark:text-slate-600" />
                            <span className="text-xs text-gray-600 dark:text-slate-400">
                                {incident.snapshot.speed || 0} km/h
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Button */}
            <div className="flex items-center">
                {isNew ? (
                    <button
                        onClick={handleAcknowledge}
                        disabled={isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {isPending ? "PROCESSING..." : "ACKNOWLEDGE"}
                        {!isPending && <ArrowRight size={16} />}
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-500">
                        <span className="text-sm">Acknowledged</span>
                        <ChevronRight size={16} />
                    </div>
                )}
            </div>
        </div>
    );
}
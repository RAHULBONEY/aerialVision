import React from 'react';
import { Clock, CheckCircle, MapPin, ChevronRight, Eye } from 'lucide-react';
import { formatTime, formatDateTime } from '@/utils/dateUtils';

export default function EmergencyIncidentCard({
    incident,
    isSelected,
    onClick,
    onAcknowledge,
    isLocallyAcknowledged,
    getSeverityColor
}) {
    const isNew = incident.status === 'NEW' && !isLocallyAcknowledged;

    const handleAcknowledge = (e) => {
        e.stopPropagation();
        onAcknowledge();
    };

    return (
        <div
            onClick={onClick}
            className={`
                p-4 rounded-xl border-l-4 bg-white dark:bg-[#0a0a12] flex flex-col md:flex-row gap-4 
                transition-all cursor-pointer border border-gray-200 dark:border-slate-800/50
                ${isSelected ? 'ring-2 ring-rose-500 dark:ring-rose-500/50' : 'hover:bg-gray-50 dark:hover:bg-[#0f0a15]'}
                ${isNew ? 'border-l-red-500' : 'border-l-emerald-500'}
            `}
        >
            {/* Status Icon */}
            <div className="flex flex-col items-center justify-center w-12">
                <div className={`
                    p-2 rounded-lg ${isNew ? 'bg-red-100 dark:bg-red-500/10' : 'bg-emerald-100 dark:bg-emerald-500/10'}
                `}>
                    {isNew ? (
                        <Clock className="text-red-600 dark:text-red-400" size={20} />
                    ) : (
                        <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={20} />
                    )}
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
                            ${isNew
                                ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                                : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            }
                        `}>
                            {isLocallyAcknowledged ? 'SEEN' : incident.status}
                        </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {incident.type} Detected
                    </h3>
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
            </div>

            {/* Action Button */}
            <div className="flex items-center">
                {isNew ? (
                    <button
                        onClick={handleAcknowledge}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <Eye size={16} />
                        MARK SEEN
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-500">
                        <span className="text-sm">{isLocallyAcknowledged ? 'Marked Seen' : 'Acknowledged'}</span>
                        <ChevronRight size={16} />
                    </div>
                )}
            </div>
        </div>
    );
}

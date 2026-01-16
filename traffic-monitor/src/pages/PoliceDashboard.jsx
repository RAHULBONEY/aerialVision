// src/components/dashboards/PoliceDashboard.jsx
import React, { useState } from 'react';
import { useIncidents, useSystemHealth } from "@/hooks/useAdminQueries";
import {
    AlertTriangle, MapPin, Clock, Radio, Eye, Phone,
    Car, Siren, Navigation, Users, Activity, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PoliceDashboard() {
    const { data: incidents, isLoading: incidentsLoading } = useIncidents();
    const { data: health } = useSystemHealth();
    const [selectedIncident, setSelectedIncident] = useState(null);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* STATUS BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatusCard
                    label="ACTIVE INCIDENTS"
                    value={incidents?.filter(i => i.status === 'ACTIVE').length || 0}
                    icon={AlertTriangle}
                    color="text-red-400"
                    trend="+3 from yesterday"
                />
                <StatusCard
                    label="UNITS DEPLOYED"
                    value="12"
                    icon={Car}
                    color="text-blue-400"
                    trend="2 available"
                />
                <StatusCard
                    label="RESPONSE TIME"
                    value="4.2min"
                    icon={Clock}
                    color="text-green-400"
                    trend="avg this hour"
                />
                <StatusCard
                    label="AI DETECTIONS"
                    value="847"
                    icon={Eye}
                    color="text-purple-400"
                    trend="today"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ACTIVE INCIDENTS PANEL */}
                <div className="lg:col-span-2 glass-effect rounded-xl overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-border/50 flex justify-between items-center bg-destructive/5">
                        <div className="flex items-center gap-2">
                            <Siren size={16} className="text-red-400 animate-pulse" />
                            <h3 className="text-sm font-bold text-foreground tracking-wide">INCIDENT COMMAND CENTER</h3>
                        </div>
                        <Badge variant="destructive" className="animate-pulse">
                            {incidents?.filter(i => i.status === 'ACTIVE').length || 0} ACTIVE
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-auto scrollbar-thin">
                        <div className="p-4 space-y-3">
                            {incidentsLoading ? (
                                <div className="text-center py-8 text-muted-foreground animate-pulse">
                                    Scanning emergency frequencies...
                                </div>
                            ) : incidents?.map(incident => (
                                <IncidentCard
                                    key={incident.id}
                                    incident={incident}
                                    isSelected={selectedIncident?.id === incident.id}
                                    onClick={() => setSelectedIncident(incident)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* DISPATCH CONTROL */}
                <div className="flex flex-col gap-4">

                    {/* QUICK DISPATCH */}
                    <div className="glass-effect rounded-xl p-4">
                        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <Radio size={16} className="text-primary" />
                            RAPID DISPATCH
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                                <AlertTriangle size={14} className="mr-1" />
                                Emergency
                            </Button>
                            <Button size="sm" variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
                                <Car size={14} className="mr-1" />
                                Traffic
                            </Button>
                            <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                                <Users size={14} className="mr-1" />
                                Backup
                            </Button>
                            <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                                <Zap size={14} className="mr-1" />
                                Green Wave
                            </Button>
                        </div>
                    </div>

                    {/* UNIT STATUS */}
                    <div className="glass-effect rounded-xl p-4 flex-1">
                        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <Navigation size={16} className="text-primary" />
                            UNIT STATUS
                        </h3>
                        <div className="space-y-3">
                            {['PATROL-01', 'PATROL-02', 'EMERGENCY-01'].map(unit => (
                                <div key={unit} className="flex items-center justify-between py-2 border-b border-border/30 last:border-b-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-sm font-mono">{unit}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">EN ROUTE</Badge>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* LIVE COMM */}
                    <div className="glass-effect rounded-xl p-4 bg-black/20">
                        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                            <Phone size={16} className="text-primary animate-pulse" />
                            RADIO CHATTER
                        </h3>
                        <div className="space-y-2 font-mono text-xs text-muted-foreground">
                            <div><span className="text-green-400">[15:23]</span> Unit 12: "Proceeding to sector 7"</div>
                            <div><span className="text-yellow-400">[15:21]</span> Dispatch: "All units, BOLO sedan..."</div>
                            <div><span className="text-blue-400">[15:19]</span> Unit 05: "Traffic cleared, resuming patrol"</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// MICRO COMPONENTS
function StatusCard({ label, value, icon: Icon, color, trend }) {
    return (
        <div className="glass-effect p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
                <Icon size={16} className={color} />
            </div>
            <div className={cn("text-2xl font-black font-mono", color)}>{value}</div>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
    );
}

function IncidentCard({ incident, isSelected, onClick }) {
    const priorityColors = {
        HIGH: "border-red-500 bg-red-500/10 text-red-400",
        MEDIUM: "border-yellow-500 bg-yellow-500/10 text-yellow-400",
        LOW: "border-blue-500 bg-blue-500/10 text-blue-400"
    };

    return (
        <div
            className={cn(
                "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:bg-background/50",
                isSelected ? "bg-primary/10 border-primary" : "border-border bg-card",
                priorityColors[incident.priority]?.replace('text-', 'border-').replace('bg-', '').replace('/10', '/20')
            )}
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className={cn("text-xs border-2", priorityColors[incident.priority])}
                    >
                        {incident.priority}
                    </Badge>
                    <span className="text-sm font-bold">{incident.type}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                    {incident.timestamp?.toDate?.()?.toLocaleTimeString() || 'Just now'}
                </span>
            </div>

            <p className="text-sm text-muted-foreground mb-2">{incident.description}</p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span>{incident.location}</span>
                </div>
                {incident.unitsDispatched && (
                    <div className="flex items-center gap-1">
                        <Car size={12} />
                        <span>{incident.unitsDispatched} units</span>
                    </div>
                )}
            </div>
        </div>
    );
}

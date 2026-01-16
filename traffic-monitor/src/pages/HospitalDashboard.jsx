// src/components/dashboards/HospitalDashboard.jsx
import React, { useState } from 'react';
import { useAmbulanceTracking, useGreenWave } from "@/hooks/useAdminQueries";
import {
    Ambulance, Heart, MapPin, Clock, Zap, Navigation,
    Activity, Users, AlertCircle, CheckCircle2, Route
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HospitalDashboard() {
    const { data: ambulances, isLoading: ambulancesLoading } = useAmbulanceTracking();
    const { data: greenWaveRequests, activateGreenWave } = useGreenWave();
    const [selectedAmbulance, setSelectedAmbulance] = useState(null);

    const handleGreenWaveActivation = (ambulanceId) => {
        activateGreenWave.mutate({
            ambulanceId,
            route: "Hospital → Emergency Location",
            priority: "HIGH"
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* MEDICAL STATUS BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MedicalStatusCard
                    label="ACTIVE AMBULANCES"
                    value={ambulances?.length || 0}
                    icon={Ambulance}
                    color="text-red-400"
                    pulse
                />
                <MedicalStatusCard
                    label="GREEN WAVES ACTIVE"
                    value={greenWaveRequests?.filter(g => g.status === 'ACTIVE').length || 0}
                    icon={Zap}
                    color="text-green-400"
                    pulse
                />
                <MedicalStatusCard
                    label="AVG RESPONSE TIME"
                    value="6.4min"
                    icon={Clock}
                    color="text-blue-400"
                    trend="3min faster today"
                />
                <MedicalStatusCard
                    label="LIVES SAVED TODAY"
                    value="23"
                    icon={Heart}
                    color="text-pink-400"
                    trend="+8 from yesterday"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* AMBULANCE FLEET MONITOR */}
                <div className="lg:col-span-2 glass-effect rounded-xl overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-border/50 flex justify-between items-center bg-red-500/5">
                        <div className="flex items-center gap-2">
                            <Ambulance size={16} className="text-red-400 animate-pulse" />
                            <h3 className="text-sm font-bold text-foreground tracking-wide">EMERGENCY FLEET STATUS</h3>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-green-400 border-green-400/30">
                                {ambulances?.filter(a => a.status === 'AVAILABLE').length || 0} READY
                            </Badge>
                            <Badge variant="outline" className="text-red-400 border-red-400/30">
                                {ambulances?.filter(a => a.status === 'DISPATCHED').length || 0} EN ROUTE
                            </Badge>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto scrollbar-thin">
                        <div className="p-4 space-y-3">
                            {ambulancesLoading ? (
                                <div className="text-center py-8 text-muted-foreground animate-pulse">
                                    Connecting to fleet tracking system...
                                </div>
                            ) : ambulances?.map(ambulance => (
                                <AmbulanceCard
                                    key={ambulance.id}
                                    ambulance={ambulance}
                                    isSelected={selectedAmbulance?.id === ambulance.id}
                                    onClick={() => setSelectedAmbulance(ambulance)}
                                    onGreenWave={() => handleGreenWaveActivation(ambulance.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* EMERGENCY CONTROLS */}
                <div className="flex flex-col gap-4">

                    {/* GREEN WAVE CONTROL */}
                    <Card className="glass-effect border-green-500/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2 text-green-400">
                                <Zap size={16} className="animate-pulse" />
                                GREEN WAVE SYSTEM
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-1 gap-2">
                                <Button
                                    size="sm"
                                    className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                                    disabled={activateGreenWave.isLoading}
                                >
                                    <Route size={14} className="mr-2" />
                                    PRIORITY CORRIDOR
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                                >
                                    <Navigation size={14} className="mr-2" />
                                    ROUTE OPTIMIZER
                                </Button>
                            </div>

                            <div className="text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Active Corridors:</span>
                                    <span className="text-green-400">{greenWaveRequests?.filter(g => g.status === 'ACTIVE').length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Avg Clear Time:</span>
                                    <span className="text-blue-400">47s</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* PATIENT STATUS */}
                    <Card className="glass-effect border-blue-500/20 flex-1">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2 text-blue-400">
                                <Activity size={16} />
                                TRAUMA CENTER STATUS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                {[
                                    { room: 'ER-1', status: 'OCCUPIED', patient: 'CRITICAL', color: 'text-red-400' },
                                    { room: 'ER-2', status: 'AVAILABLE', patient: null, color: 'text-green-400' },
                                    { room: 'ER-3', status: 'PREP', patient: 'INCOMING', color: 'text-yellow-400' },
                                ].map(room => (
                                    <div key={room.room} className="flex items-center justify-between py-2 border-b border-border/30 last:border-b-0">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", room.color.replace('text-', 'bg-'))} />
                                            <span className="text-sm font-mono">{room.room}</span>
                                        </div>
                                        <div className="text-xs">
                                            <Badge
                                                variant="outline"
                                                className={cn("text-xs", room.color, room.color.replace('text-', 'border-').concat('/30'))}
                                            >
                                                {room.patient || room.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-border/30 text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Bed Capacity:</span>
                                    <span className="text-primary">12/15</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Staff on Duty:</span>
                                    <span className="text-green-400">8 Active</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* EMERGENCY CONTACTS */}
                    <Card className="glass-effect border-purple-500/20 bg-black/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2 text-purple-400">
                                <Users size={16} />
                                EMERGENCY CONTACTS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs font-mono text-muted-foreground">
                            <div><span className="text-purple-400">CHIEF MEDICAL:</span> Dr. Sharma (Ext: 1001)</div>
                            <div><span className="text-blue-400">TRAUMA LEAD:</span> Dr. Patel (Ext: 1002)</div>
                            <div><span className="text-green-400">DISPATCH:</span> Central Command (100)</div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// MICRO COMPONENTS
function MedicalStatusCard({ label, value, icon: Icon, color, trend, pulse }) {
    return (
        <div className="glass-effect p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
                <Icon size={16} className={cn(color, pulse && "animate-pulse")} />
            </div>
            <div className={cn("text-2xl font-black font-mono", color)}>{value}</div>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
    );
}

function AmbulanceCard({ ambulance, isSelected, onClick, onGreenWave }) {
    const statusColors = {
        AVAILABLE: "border-green-500 bg-green-500/10 text-green-400",
        DISPATCHED: "border-red-500 bg-red-500/10 text-red-400",
        RETURNING: "border-yellow-500 bg-yellow-500/10 text-yellow-400"
    };

    return (
        <div
            className={cn(
                "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:bg-background/50",
                isSelected ? "bg-primary/10 border-primary" : "border-border bg-card"
            )}
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className={cn("text-xs border-2", statusColors[ambulance.status])}
                    >
                        {ambulance.status}
                    </Badge>
                    <span className="text-sm font-bold font-mono">{ambulance.callSign || `AMB-${ambulance.id.slice(-3)}`}</span>
                </div>
                <div className="flex gap-1">
                    {ambulance.status === 'DISPATCHED' && (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onGreenWave(); }}>
                            <Zap size={12} className="mr-1" />
                            Green Wave
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
                {ambulance.currentLocation && (
                    <div className="flex items-center gap-2">
                        <MapPin size={12} />
                        <span>{ambulance.currentLocation}</span>
                    </div>
                )}
                {ambulance.eta && (
                    <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span>ETA: {ambulance.eta}</span>
                    </div>
                )}
                {ambulance.crew && (
                    <div className="flex items-center gap-2">
                        <Users size={12} />
                        <span>{ambulance.crew.join(', ')}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

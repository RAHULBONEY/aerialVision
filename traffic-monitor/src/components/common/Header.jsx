// src/components/layout/Header.jsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Wifi, ShieldCheck, Settings, Bell, User, LogOut } from "lucide-react";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const roleConfig = {
    admin: {
        label: "SYSTEM ADMINISTRATOR",
        color: "text-yellow-400",
        bgColor: "bg-yellow-400/10 border-yellow-400/30"
    },
    police: {
        label: "TRAFFIC CONTROL",
        color: "text-red-400",
        bgColor: "bg-red-400/10 border-red-400/30"
    },
    hospital: {
        label: "EMERGENCY MEDICAL",
        color: "text-green-400",
        bgColor: "bg-green-400/10 border-green-400/30"
    }
};

export default function Header({ role = "police", userName = "Officer Johnson" }) {
    const [notifications] = useState(3);
    const config = roleConfig[role.toLowerCase()] || roleConfig.police;

    return (
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-6">

            {/* Left Section - Branding & Role */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <ShieldCheck className="text-primary animate-pulse-subtle" size={28} />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground font-display">
                            AERIAL<span className="text-primary">VISION</span>
                        </h1>
                        <div className="text-xs text-muted-foreground font-mono-tech">
                            v2.4.1 • Neural Detection System
                        </div>
                    </div>
                </div>

                <Badge
                    variant="outline"
                    className={`${config.bgColor} ${config.color} border text-xs font-mono-tech uppercase tracking-wider`}
                >
                    {config.label}
                </Badge>
            </div>

            {/* Center Section - System Status */}
            <div className="hidden md:flex items-center gap-8">
                <div className="flex items-center gap-6 text-xs font-mono-tech text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">AI MODEL:</span>
                        <div className="flex items-center gap-1 text-green-400">
                            <Activity size={14} className="animate-pulse" />
                            <span>YOLOv8 ACTIVE</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">STREAM:</span>
                        <div className="flex items-center gap-1 text-green-400">
                            <Wifi size={14} />
                            <span>REAL-TIME</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">UPTIME:</span>
                        <span className="text-primary">23:45:12</span>
                    </div>
                </div>
            </div>

            {/* Right Section - User Controls */}
            <div className="flex items-center gap-4">
                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative">
                    <Bell size={18} />
                    {notifications > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center animate-pulse"
                        >
                            {notifications}
                        </Badge>
                    )}
                </Button>

                {/* Settings */}
                <Button variant="ghost" size="sm">
                    <Settings size={18} />
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 px-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                                <User size={16} className="text-primary" />
                            </div>
                            <div className="hidden md:block text-left">
                                <div className="text-sm font-medium">{userName}</div>
                                <div className="text-xs text-muted-foreground">{config.label}</div>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 glass-effect">
                        <DropdownMenuLabel>System Access</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Preferences</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign Out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

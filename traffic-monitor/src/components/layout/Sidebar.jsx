import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Video, FileText, ShieldAlert, LogOut,
    Stethoscope, Car, Shield, Users, Settings, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from '@/context/AuthContext';

export function Sidebar({ userRole }) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };


    const getMenuItems = (role) => {
        const baseItems = [
            {
                icon: LayoutDashboard,
                label: "Mission Control",
                path: "/dashboard",
                roles: ['ADMIN', 'admin', 'TRAFFIC_POLICE', 'EMERGENCY']
            }
        ];

        const roleSpecificItems = {
            ADMIN: [
                { icon: Shield, label: "System Control", path: "/admin" },
                { icon: Car, label: "Traffic Command", path: "/police" },
                { icon: Stethoscope, label: "Medical Center", path: "/hospital" },
                { icon: Users, label: "User Management", path: "/admin" },
                { icon: Settings, label: "Configuration", path: "/admin" }
            ],
            admin: [
                { icon: Shield, label: "System Control", path: "/admin" },
                { icon: Car, label: "Traffic Command", path: "/police" },
                { icon: Stethoscope, label: "Medical Center", path: "/hospital" },
                { icon: Users, label: "User Management", path: "/admin" }
            ],
            TRAFFIC_POLICE: [
                { icon: Car, label: "Incident Command", path: "/police" },
                { icon: ShieldAlert, label: "Emergency Response", path: "/incidents" },
                { icon: Video, label: "Live Surveillance", path: "/feeds" }
            ],
            EMERGENCY: [
                { icon: Stethoscope, label: "Medical Control", path: "/hospital" },
                { icon: Zap, label: "Green Wave System", path: "/hospital" },
                { icon: ShieldAlert, label: "Emergency Response", path: "/incidents" }
            ]
        };

        const userItems = roleSpecificItems[role] || [];
        return [...baseItems, ...userItems];
    };

    const menuItems = getMenuItems(userRole);


    const getRoleTheme = (role) => {
        switch (role) {
            case 'ADMIN':
            case 'admin':
                return {
                    accent: 'text-yellow-400',
                    accentBg: 'bg-yellow-400/10',
                    accentBorder: 'border-yellow-400/30'
                };
            case 'TRAFFIC_POLICE':
                return {
                    accent: 'text-blue-400',
                    accentBg: 'bg-blue-400/10',
                    accentBorder: 'border-blue-400/30'
                };
            case 'EMERGENCY':
                return {
                    accent: 'text-green-400',
                    accentBg: 'bg-green-400/10',
                    accentBorder: 'border-green-400/30'
                };
            default:
                return {
                    accent: 'text-primary',
                    accentBg: 'bg-primary/10',
                    accentBorder: 'border-primary/30'
                };
        }
    };

    const theme = getRoleTheme(userRole);

    return (
        <aside className="hidden lg:flex fixed left-0 top-0 z-50 h-screen w-64 flex-col border-r border-border/50 bg-background/80 backdrop-blur-xl transition-transform">

            {/* LOGO AREA */}
            <div className="flex h-16 items-center border-b border-border/50 px-6">
                <div className={cn(
                    "h-8 w-8 rounded flex items-center justify-center border mr-3 shadow-lg",
                    theme.accentBg, theme.accentBorder
                )}>
                    <div className={cn("h-2 w-2 rounded-full animate-pulse", theme.accent.replace('text-', 'bg-'))} />
                </div>
                <h1 className="font-bold tracking-tighter text-foreground text-lg font-display">
                    AERIAL<span className={theme.accent}>VISION</span>
                </h1>
            </div>

            {/* NAV LINKS */}
            <nav className="flex-1 space-y-1 p-4">
                <div className="mb-4 px-2 text-xs uppercase tracking-widest text-muted-foreground font-mono">
                    Command Modules
                </div>

                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 relative overflow-hidden",
                            isActive
                                ? `${theme.accentBg} ${theme.accent} ${theme.accentBorder} border-l-2 shadow-lg`
                                : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent"
                        )}
                    >
                        <item.icon size={18} />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* SYSTEM STATUS */}
            <div className={cn("border-t border-border/50 p-4", theme.accentBg)}>
                <div className="text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">STATUS:</span>
                        <span className={theme.accent}>OPERATIONAL</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">UPTIME:</span>
                        <span className="text-green-400">23:45:12</span>
                    </div>
                </div>
            </div>

            {/* LOGOUT */}
            <div className="border-t border-border/50 p-4">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors group"
                >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Terminate Session</span>
                </button>
            </div>
        </aside>
    );
}

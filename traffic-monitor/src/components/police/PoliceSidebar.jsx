import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    AlertTriangle,
    Video,
    Siren,
    Radio,
    ChevronLeft,
    ChevronRight,
    Moon,
    Sun,
    User,
    LogOut,
    ShieldCheck
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/context/ThemeProvider";
import { useAuth } from "@/context/AuthContext";


const navItems = [
    { label: "Mission Control", path: "/police", icon: LayoutDashboard },
    { label: "Live Feeds", path: "/police/streams", icon: Video },
    { label: "Incidents", path: "/police/incidents", icon: AlertTriangle },
    { label: "Emergency Comms", path: "/police/comms", icon: Radio },
    { label: "Patrol Units", path: "/police/units", icon: Siren },
];

export default function PoliceSidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const isExpanded = !collapsed || isHovered;

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };


    const sidebarBg = theme === 'dark'
        ? 'bg-[#050b14] border-r border-blue-900/30'
        : 'bg-white border-r border-slate-200';


    const logoBg = theme === 'dark'
        ? 'bg-gradient-to-br from-cyan-600 to-blue-700 shadow-[0_0_15px_rgba(8,145,178,0.4)]'
        : 'bg-gradient-to-br from-cyan-500 to-blue-600';

    const logoTextColor = theme === 'dark' ? 'text-blue-50' : 'text-slate-900';
    const sidebarTextColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';
    const hoverBg = theme === 'dark' ? 'hover:bg-blue-900/20' : 'hover:bg-blue-50';


    const activeClass = theme === 'dark'
        ? 'bg-blue-900/40 border-l-2 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.1)]'
        : 'bg-blue-50 border-l-2 border-blue-600 text-blue-700';

    return (
        <aside
            className={cn(
                `fixed top-0 left-0 h-screen ${sidebarBg} transition-all duration-300 flex flex-col z-50`,
                collapsed ? "w-20" : "w-64"
            )}
            onMouseEnter={() => collapsed && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >

            <div className={`p-6 border-b ${theme === 'dark' ? 'border-blue-900/30' : 'border-slate-200'}`}>
                <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                    <div className={`w-10 h-10 rounded-xl ${logoBg} flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105`}>
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    {isExpanded && (
                        <div className="flex flex-col animate-fade-in overflow-hidden whitespace-nowrap">
                            <h1 className={`text-lg font-black italic tracking-tighter ${logoTextColor}`}>
                                AERIAL<span className="text-cyan-400">VISION</span>
                            </h1>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-600/80">
                                Traffic Ops
                            </p>
                        </div>
                    )}
                </div>
            </div>


            <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-900/50">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === "/police"}
                                className={({ isActive }) =>
                                    cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 group relative overflow-hidden",
                                        isActive ? activeClass : `${sidebarTextColor} ${hoverBg}`
                                    )
                                }
                            >
                                <Icon className={cn("w-5 h-5 flex-shrink-0 transition-colors",
                                    theme === 'dark' ? "group-hover:text-cyan-400" : "group-hover:text-blue-600"
                                )} />
                                {isExpanded && (
                                    <span className="font-medium text-sm tracking-wide">{item.label}</span>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
            </nav>


            <div className={`p-4 border-t ${theme === 'dark' ? 'border-blue-900/30' : 'border-slate-200'} space-y-2`}>


                <div className={cn("flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-opacity-50",
                    theme === 'dark' ? "bg-[#0a1525]" : "bg-slate-50",
                    !isExpanded && "justify-center"
                )}>
                    <div className={`w-8 h-8 rounded-lg ${theme === 'dark' ? 'bg-cyan-900/30' : 'bg-blue-100'} flex items-center justify-center border border-cyan-500/20`}>
                        <User className={`w-4 h-4 ${theme === 'dark' ? 'text-cyan-400' : 'text-blue-600'}`} />
                    </div>
                    {isExpanded && (
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                {user?.name?.split(' ')[0] || "Officer"}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-[10px] text-green-500 font-mono uppercase">On Duty</p>
                            </div>
                        </div>
                    )}
                </div>


                <button
                    onClick={toggleTheme}
                    className={cn(
                        `flex items-center gap-3 w-full p-2.5 rounded-lg transition-all border border-transparent`,
                        theme === 'dark' ? 'hover:bg-blue-900/20 hover:border-blue-800/50 text-slate-400' : 'hover:bg-slate-100 text-slate-600',
                        !isExpanded && "justify-center"
                    )}
                >
                    {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                    {isExpanded && <span className="text-sm">Appearance</span>}
                </button>


                <button
                    onClick={handleLogout}
                    className={cn(
                        `flex items-center gap-3 w-full p-2.5 rounded-lg transition-all border border-transparent group`,
                        theme === 'dark'
                            ? 'hover:bg-red-950/30 hover:border-red-900/50 text-red-400'
                            : 'hover:bg-red-50 text-red-600',
                        !isExpanded && "justify-center"
                    )}
                >
                    <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {isExpanded && <span className="text-sm">Sign Out</span>}
                </button>


                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        `flex items-center gap-2 w-full p-2 rounded-lg mt-2 ${theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`,
                        !isExpanded && "justify-center"
                    )}
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>
        </aside>
    );
}
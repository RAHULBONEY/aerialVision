import { NavLink, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Shield,
    Video,
    Settings,
    FileText,
    LogIn,
    BarChart,
    ChevronLeft,
    ChevronRight,
    Moon,
    Sun,
    User,
    LogOut,
    Home
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/context/ThemeProvider";
import { useAuth } from "@/context/AuthContext";

const navItems = [
    { label: "Overview", path: "/admin", icon: LayoutDashboard },
    { label: "Operators", path: "/admin/operators", icon: Users },
    { label: "Roles", path: "/admin/roles", icon: Shield },
    { label: "Streams", path: "/admin/streams", icon: Video },
    { label: "Model Config", path: "/admin/model", icon: Settings },
    { label: "Audit Logs", path: "/admin/audit-logs", icon: FileText },
    { label: "Login History", path: "/admin/login-history", icon: LogIn },
    { label: "Metrics", path: "/admin/metrics", icon: BarChart },
];

export default function AdminSidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const location = useLocation();
    // useEffect(() => {
    //     console.log("Current location in sidebar:", location.pathname);
    // }, [location]);
    const isExpanded = !collapsed || isHovered;

    const sidebarBg = theme === 'dark'
        ? 'bg-slate-900 border-r border-slate-800'
        : 'bg-white border-r border-slate-200';

    const logoBg = theme === 'dark'
        ? 'bg-gradient-to-br from-blue-600 to-cyan-500'
        : 'bg-gradient-to-br from-blue-500 to-cyan-400';

    const logoTextColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
    const sidebarTextColor = theme === 'dark' ? 'text-slate-300' : 'text-slate-600';
    const hoverBg = theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100';
    const activeBg = theme === 'dark' ? 'bg-slate-800/70' : 'bg-slate-100';

    return (
        <aside
            className={cn(
                `fixed top-0 left-0 h-screen ${sidebarBg} transition-all duration-300 flex flex-col z-40 shadow-lg`,
                collapsed ? "w-20" : "w-64"
            )}
            onMouseEnter={() => {
                if (collapsed) setIsHovered(true);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
            }}
        >
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                    <div className={`w-10 h-10 rounded-xl ${logoBg} flex items-center justify-center shadow-lg`}>
                        <Home className="w-5 h-5 text-white" />
                    </div>
                    {isExpanded && (
                        <div className="flex flex-col animate-fade-in">
                            <h1 className={`text-lg font-bold tracking-tight ${logoTextColor}`}>AERIALVISION</h1>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Command Center</p>
                        </div>
                    )}
                </div>
            </div>

            <nav className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                                        isActive
                                            ? `${theme === 'dark' ? 'bg-blue-900/30 border-l-2 border-blue-500 text-blue-400' : 'bg-blue-50 border-l-2 border-blue-500 text-blue-600'}`
                                            : `${sidebarTextColor} ${hoverBg}`
                                    )
                                }
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {isExpanded && (
                                    <span className="font-medium text-sm">{item.label}</span>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
            </nav>

            <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} space-y-3`}>
                <div className={cn("flex items-center gap-3 px-3", !isExpanded && "justify-center")}>
                    <div className={`w-8 h-8 rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'} flex items-center justify-center`}>
                        <User className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`} />
                    </div>
                    {isExpanded && (
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'} truncate`}>{user?.name || "Admin"}</p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} truncate`}>{user?.role || "Administrator"}</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={toggleTheme}
                    className={cn(
                        `flex items-center gap-3 w-full p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`,
                        !isExpanded && "justify-center"
                    )}
                >
                    {theme === "dark" ? (
                        <Sun className="w-4 h-4 text-amber-500" />
                    ) : (
                        <Moon className="w-4 h-4 text-slate-600" />
                    )}
                    {isExpanded && (
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                            {theme === "dark" ? "Light Mode" : "Dark Mode"}
                        </span>
                    )}
                </button>

                <button
                    onClick={logout}
                    className={cn(
                        `flex items-center gap-3 w-full p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-red-900/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`,
                        !isExpanded && "justify-center"
                    )}
                >
                    <LogOut className="w-4 h-4" />
                    {isExpanded && <span className="text-sm">Logout</span>}
                </button>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        `flex items-center gap-2 w-full p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'}`,
                        !isExpanded && "justify-center"
                    )}
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <>
                            <ChevronLeft className="w-4 h-4" />
                            {isExpanded && <span className="text-xs">Collapse</span>}
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}
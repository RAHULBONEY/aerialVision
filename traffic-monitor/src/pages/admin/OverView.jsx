import { Users, Video, Shield, Activity, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { useTheme } from "@/context/ThemeProvider";

export default function Overview() {
    const { theme } = useTheme();

    const stats = [
        { label: "Active Operators", value: "24", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Active Streams", value: "156", icon: Video, color: "text-green-500", bg: "bg-green-500/10" },
        { label: "System Health", value: "98.7%", icon: Shield, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Response Time", value: "47ms", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    ];

    const titleColor = theme === 'dark' ? 'text-slate-200' : 'text-slate-800';
    const subtitleColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';
    const cardBg = theme === 'dark' ? 'bg-slate-800/50' : 'bg-white';
    const cardBorder = theme === 'dark' ? 'border-slate-700' : 'border-slate-200';
    const statusBg = theme === 'dark' ? 'bg-slate-800/70' : 'bg-slate-50';

    return (
        <div className="p-8">
            <div className="mb-8">
                <h2 className={`text-2xl font-bold ${titleColor} mb-2`}>Dashboard Overview</h2>
                <p className={subtitleColor}>Welcome back, Administrator. Here's what's happening with your system.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className={`${cardBg} border ${cardBorder} rounded-xl p-6 shadow-sm`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                                    <Icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <div className="flex items-center gap-1 text-green-500 text-sm">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>+12%</span>
                                </div>
                            </div>
                            <h3 className={`text-2xl font-bold ${titleColor} mb-1`}>
                                {stat.value}
                            </h3>
                            <p className={`text-sm ${subtitleColor}`}>{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${cardBg} border ${cardBorder} rounded-xl p-6 shadow-sm`}>
                    <h3 className={`text-lg font-semibold ${titleColor} mb-4`}>System Status</h3>
                    <div className="space-y-3">
                        <div className={`flex items-center justify-between p-3 rounded-lg ${statusBg}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className={`text-sm ${subtitleColor}`}>API Service</span>
                            </div>
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                                Operational
                            </span>
                        </div>
                        <div className={`flex items-center justify-between p-3 rounded-lg ${statusBg}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className={`text-sm ${subtitleColor}`}>Database</span>
                            </div>
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                                Healthy
                            </span>
                        </div>
                        <div className={`flex items-center justify-between p-3 rounded-lg ${statusBg}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <span className={`text-sm ${subtitleColor}`}>Stream Processor</span>
                            </div>
                            <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
                                Warning
                            </span>
                        </div>
                    </div>
                </div>

                <div className={`${cardBg} border ${cardBorder} rounded-xl p-6 shadow-sm`}>
                    <h3 className={`text-lg font-semibold ${titleColor} mb-4`}>Recent Activity</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Users className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${titleColor}`}>New operator added</p>
                                <p className={`text-xs ${subtitleColor}`}>2 minutes ago</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                <Activity className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${titleColor}`}>System update completed</p>
                                <p className={`text-xs ${subtitleColor}`}>15 minutes ago</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${titleColor}`}>Security alert resolved</p>
                                <p className={`text-xs ${subtitleColor}`}>1 hour ago</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
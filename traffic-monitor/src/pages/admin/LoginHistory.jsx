import { useState } from "react";
import { useLoginHistory } from "@/hooks/useLoginHistory";
import {
    Shield, Search, Download, User as UserIcon, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, XCircle, MonitorSmartphone, Clock, Network
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

export default function LoginHistory() {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Pagination state
    const [cursorStack, setCursorStack] = useState([]);
    const [currentCursor, setCurrentCursor] = useState(null);
    const limit = 30;

    const { data: response, isLoading, error, refetch, isFetching } = useLoginHistory({
        limit,
        cursor: currentCursor,
        role: roleFilter,
        status: statusFilter,
    });

    const logs = response?.data || [];
    const hasMore = response?.hasMore;
    const nextCursor = response?.nextCursor;

    // Client-side text search filter
    const filteredLogs = logs.filter(log => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            log.name?.toLowerCase().includes(q) ||
            log.email?.toLowerCase().includes(q) ||
            log.ip?.toLowerCase().includes(q) ||
            log.userAgent?.toLowerCase().includes(q)
        );
    });

    const handleNextPage = () => {
        if (hasMore && nextCursor) {
            setCursorStack(prev => [...prev, currentCursor]);
            setCurrentCursor(nextCursor);
        }
    };

    const handlePrevPage = () => {
        if (cursorStack.length > 0) {
            const newStack = [...cursorStack];
            const prevCursor = newStack.pop();
            setCursorStack(newStack);
            setCurrentCursor(prevCursor);
        }
    };

    const handleFilterChange = (setter, val) => {
        setter(val);
        setCursorStack([]);
        setCurrentCursor(null);
    };

    const downloadCSV = () => {
        if (!logs.length) return;

        const headers = ["Timestamp", "Status", "Role", "Name", "Email", "IP Address", "User Agent"];
        const rows = logs.map(log => [
            format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
            log.status,
            log.role,
            log.name,
            log.email,
            log.ip,
            `"${(log.userAgent || "").replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `login_history_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case "ADMIN": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50";
            case "TRAFFIC_POLICE": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50";
            case "EMERGENCY": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50";
            default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
        }
    };

    // Very basic UA parsing for aesthetics
    const parseUserAgent = (uaString) => {
        if (!uaString) return { browser: "Unknown", os: "Unknown Device" };
        const u = uaString.toLowerCase();

        let browser = "Unknown Browser";
        if (u.includes("chrome") && !u.includes("edg")) browser = "Chrome";
        else if (u.includes("safari") && !u.includes("chrome")) browser = "Safari";
        else if (u.includes("firefox")) browser = "Firefox";
        else if (u.includes("edg")) browser = "Edge";

        let os = "Desktop";
        if (u.includes("win")) os = "Windows";
        else if (u.includes("mac")) os = "macOS";
        else if (u.includes("linux")) os = "Linux";
        else if (u.includes("iphone") || u.includes("ipad")) os = "iOS Device";
        else if (u.includes("android")) os = "Android Device";

        return { browser, os };
    };

    if (isLoading && !logs.length) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">Loading auth history...</p>
                </div>
            </div>
        );
    }

    if (error && !logs.length) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Failed to load history</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">{error.message}</p>
                    <button
                        onClick={() => refetch()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Login History</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Monitor authentication sessions across all system roles.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={downloadCSV}
                            disabled={!logs.length}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-all disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or IP address..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                    </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                    <div className="relative min-w-[140px]">
                        <select
                            value={roleFilter}
                            onChange={(e) => handleFilterChange(setRoleFilter, e.target.value)}
                            className="w-full appearance-none pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="ADMIN">Admins</option>
                            <option value="TRAFFIC_POLICE">Traffic Police</option>
                            <option value="EMERGENCY">Emergency</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative min-w-[140px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
                            className="w-full appearance-none pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="SUCCESS">Success</option>
                            <option value="FAILED">Failed</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    <button
                        onClick={() => {
                            setCursorStack([]);
                            setCurrentCursor(null);
                            refetch();
                        }}
                        disabled={isFetching}
                        className="flex items-center justify-center p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                        title="Refresh Data"
                    >
                        <RefreshCw className={cn("w-5 h-5", isFetching && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                                <th className="p-4 w-[200px]">Time</th>
                                <th className="p-4">User</th>
                                <th className="p-4 w-[160px]">Role</th>
                                <th className="p-4 w-[200px]">IP & Device</th>
                                <th className="p-4 w-[120px]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-500">
                                        <Shield className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 opacity-50" />
                                        <p className="font-medium text-slate-700 dark:text-slate-300">No login records found</p>
                                        <p className="text-sm mt-1 mb-4">No sessions match your current filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const date = new Date(log.createdAt);
                                    const { browser, os } = parseUserAgent(log.userAgent);

                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-800 dark:text-slate-300" title={format(date, "PPpp")}>
                                                        {formatDistanceToNow(date, { addSuffix: true })}
                                                    </span>
                                                    <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {format(date, "MMM d, HH:mm")}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 flex-shrink-0">
                                                        <UserIcon className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                                                            {log.name || "Unknown User"}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                            {log.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border",
                                                    getRoleBadge(log.role)
                                                )}>
                                                    <span>{log.role}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-sm">
                                                        <Network className="w-3.5 h-3.5 text-slate-400" />
                                                        {log.ip}
                                                    </span>
                                                    <span className="text-xs text-slate-500 mt-1 flex items-center gap-1.5" title={log.userAgent}>
                                                        <MonitorSmartphone className="w-3.5 h-3.5" />
                                                        {browser} • {os}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                {log.status === "SUCCESS" ? (
                                                    <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Success
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                                                        <XCircle className="w-4 h-4" />
                                                        Failed
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        {isFetching ? "Syncing history..." : "History up to date."}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={cursorStack.length === 0 || isFetching}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-sm disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" /> Newer
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={!hasMore || isFetching}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-sm disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Older <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const ChevronDown = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 12 15 18 9"></polyline></svg>
);

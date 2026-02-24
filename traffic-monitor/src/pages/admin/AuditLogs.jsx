import { useState } from "react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import {
    Activity, Filter, Search, FileText, Download, User as UserIcon, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Info, Clock, Terminal, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

export default function AuditLogs() {
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [cursorStack, setCursorStack] = useState([]); // Array of cursors for "Previous" pagination
    const [currentCursor, setCurrentCursor] = useState(null);
    const limit = 25;

    // We pass search into `action` or handle client-side text-search depending on setup, 
    // but the backend only accepts specific filters. So we'll use client-side filtering for search,
    // and server-side filtering for category/cursor.
    const { data: response, isLoading, error, refetch, isFetching } = useAuditLogs({
        limit,
        cursor: currentCursor,
        category: categoryFilter,
    });

    const logs = response?.data || [];
    const hasMore = response?.hasMore;
    const nextCursor = response?.nextCursor;

    // Filter by search text locally
    const filteredLogs = logs.filter(log => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            log.action?.toLowerCase().includes(q) ||
            log.targetName?.toLowerCase().includes(q) ||
            log.performedBy?.name?.toLowerCase().includes(q) ||
            log.performedBy?.email?.toLowerCase().includes(q)
        );
    });

    const handleNextPage = () => {
        if (hasMore && nextCursor) {
            setCursorStack(prev => [...prev, currentCursor]); // Push current cursor to stack
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

    const handleFilterChange = (val) => {
        setCategoryFilter(val);
        // Reset pagination on filter change
        setCursorStack([]);
        setCurrentCursor(null);
    };

    const downloadCSV = () => {
        if (!logs.length) return;

        const headers = ["Timestamp", "Action", "Category", "User", "Role", "Target ID", "Target Name", "Details"];
        const rows = logs.map(log => [
            format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
            log.action,
            log.category,
            log.performedBy?.name || log.performedBy?.email || "Unknown",
            log.performedBy?.role || "SYSTEM",
            log.targetId,
            log.targetName,
            JSON.stringify(log.details || {}).replace(/"/g, '""') // Escape quotes for CSV
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => `"${r.join('","')}"`)].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `audit_logs_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getActionColor = (action) => {
        if (action.includes("CREATE") || action.includes("ADD")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
        if (action.includes("DELETE") || action.includes("REMOVE")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50";
        if (action.includes("UPDATE") || action.includes("EDIT") || action.includes("STATUS")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50";
        if (action.includes("AUTH") || action.includes("LOGIN")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50";
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    };

    const getActionIcon = (action) => {
        if (action.includes("CREATE")) return <CheckCircle2 className="w-3.5 h-3.5" />;
        if (action.includes("DELETE")) return <XCircle className="w-3.5 h-3.5" />;
        if (action.includes("UPDATE")) return <RefreshCw className="w-3.5 h-3.5" />;
        if (action.includes("AUTH")) return <AlertTriangle className="w-3.5 h-3.5" />;
        return <Activity className="w-3.5 h-3.5" />;
    };

    if (isLoading && !logs.length) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">Loading audit trail...</p>
                </div>
            </div>
        );
    }

    if (error && !logs.length) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Failed to load logs</h3>
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

    // Stats calculations (just from current page, but good for UI flair)
    const stats = {
        total: logs.length,
        creates: logs.filter(l => l.action.includes("CREATE")).length,
        updates: logs.filter(l => l.action.includes("UPDATE")).length,
        deletes: logs.filter(l => l.action.includes("DELETE")).length,
    };

    const categories = ["ALL", "ROLES", "OPERATORS", "STREAMS", "AUTH", "CONFIG", "EMERGENCY"];

    return (
        <div className="p-6">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Audit Logs</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            System-wide immutable ledger of administrative and operator actions.
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

            {/* Micro-Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Visible Events</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.total}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-500/50" />
                </div>
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Creations</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.creates}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                </div>
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Modifications</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.updates}</p>
                    </div>
                    <RefreshCw className="w-8 h-8 text-amber-500/50" />
                </div>
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Deletions</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.deletes}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500/50" />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter current view by action, user, or target..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="relative min-w-[160px]">
                        <select
                            value={categoryFilter}
                            onChange={(e) => handleFilterChange(e.target.value)}
                            className="w-full appearance-none pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                            {categories.map(c => (
                                <option key={c} value={c}>{c === "ALL" ? "All Categories" : c}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
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
                                <th className="p-4 w-[200px]">Timestamp</th>
                                <th className="p-4 w-[180px]">User</th>
                                <th className="p-4 w-[220px]">Action</th>
                                <th className="p-4">Target Details</th>
                                <th className="p-4 w-[60px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-500">
                                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                        <p className="font-medium text-slate-700 dark:text-slate-300">No logs found</p>
                                        <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <LogRow
                                        key={log.id}
                                        log={log}
                                        getColor={getActionColor}
                                        getIcon={getActionIcon}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        {isFetching ? "Syncing ledger..." : "Ledger is synchronized."}
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

// Separate component for expandable rows to manage own state cleanly
function LogRow({ log, getColor, getIcon }) {
    const [expanded, setExpanded] = useState(false);
    const date = new Date(log.createdAt);

    return (
        <>
            <tr className={cn("hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group", expanded && "bg-slate-50 dark:bg-slate-700/30")}>
                <td className="p-4 align-top">
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-800 dark:text-slate-300" title={format(date, "PPpp")}>
                            {formatDistanceToNow(date, { addSuffix: true })}
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(date, "MMM d, HH:mm:ss")}
                        </span>
                    </div>
                </td>
                <td className="p-4 align-top">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
                            <UserIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                                {log.performedBy?.name || log.performedBy?.email || "System"}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                                {log.performedBy?.role || "ADMIN"}
                            </p>
                        </div>
                    </div>
                </td>
                <td className="p-4 align-top">
                    <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                        getColor(log.action)
                    )}>
                        {getIcon(log.action)}
                        <span className="truncate">{log.action}</span>
                    </div>
                    <div className="mt-1.5 ml-1">
                        <span className="text-xs text-slate-500 font-mono tracking-tighter uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50">
                            {log.category}
                        </span>
                    </div>
                </td>
                <td className="p-4 align-top max-w-[300px]">
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {log.targetName || "System Scope"}
                        </span>
                        <span className="text-xs text-slate-500 font-mono truncate mt-0.5" title={log.targetId}>
                            ID: {log.targetId || "N/A"}
                        </span>
                    </div>
                </td>
                <td className="p-4 align-top text-right">
                    {log.details && Object.keys(log.details).length > 0 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
                            title="View Payload Details"
                        >
                            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                    )}
                </td>
            </tr>
            {expanded && log.details && (
                <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                    <td colSpan={5} className="p-0 border-b border-slate-100 dark:border-slate-800">
                        <div className="p-4 pl-[4.5rem]">
                            <div className="rounded-lg bg-slate-900 shadow-inner overflow-hidden border border-slate-800">
                                <div className="flex items-center px-3 py-2 bg-slate-800/80 border-b border-slate-700/50 text-slate-400 text-xs font-mono">
                                    <Terminal className="w-3 h-3 mr-2 text-emerald-400" />
                                    Payload Details
                                </div>
                                <div className="p-4 overflow-x-auto">
                                    <pre className="text-xs text-blue-300 font-mono leading-relaxed m-0">
                                        {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

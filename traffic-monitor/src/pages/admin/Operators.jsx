import { useState } from "react";
import { useOperators, useUpdateStatus } from "@/hooks/useAdminOperators";
import CreateOperatorModal from "@/components/admin/CreatOperatorModal";
import {
    Users,
    UserPlus,
    Search,
    Filter,
    MoreVertical,
    Shield,
    Mail,
    Phone,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    TrendingUp,
    Download,
    RefreshCw,
    Eye,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    Badge,
    Building,
    Key
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Operators() {
    const { data: operators = [], isLoading, error, refetch } = useOperators();
    const updateStatus = useUpdateStatus();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [roleFilter, setRoleFilter] = useState("ALL");





    const filteredOperators = operators.filter(operator => {
        const matchesSearch =
            operator?.name?.toLowerCase().includes(search.toLowerCase()) ||
            operator?.email?.toLowerCase().includes(search.toLowerCase()) ||
            operator?.badge?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || operator?.status === statusFilter;
        const matchesRole = roleFilter === "ALL" || operator?.role === roleFilter;

        return matchesSearch && matchesStatus && matchesRole;
    });


    const activeCount = operators.filter(op => op.status === "ACTIVE").length;
    const suspendedCount = operators.filter(op => op.status === "SUSPENDED").length;
    const totalCount = operators.length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Loading operators...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Failed to load operators</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">{error.message}</p>
                    <button
                        onClick={() => refetch()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Retry
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
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Operators Management</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Manage and monitor all system operators
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <button
                            onClick={() => setOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                        >
                            <UserPlus className="w-4 h-4" />
                            Add Operator
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Total Operators</p>
                            <p className="text-3xl font-bold text-blue-900 dark:text-blue-300 mt-1">{totalCount}</p>
                        </div>
                        <Users className="w-10 h-10 text-blue-500 opacity-60" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Active</p>
                            <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-300 mt-1">{activeCount}</p>
                        </div>
                        <UserCheck className="w-10 h-10 text-emerald-500 opacity-60" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Suspended</p>
                            <p className="text-3xl font-bold text-amber-900 dark:text-amber-300 mt-1">{suspendedCount}</p>
                        </div>
                        <UserX className="w-10 h-10 text-amber-500 opacity-60" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 border border-purple-200 dark:border-purple-800/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">Avg. Uptime</p>
                            <p className="text-3xl font-bold text-purple-900 dark:text-purple-300 mt-1">98.7%</p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-purple-500 opacity-60" />
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search operators by name, email, or badge..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="ALL">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="SUSPENDED">Suspended</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="ALL">All Roles</option>
                                <option value="ADMIN">Admin</option>
                                <option value="TRAFFIC_POLICE">Traffic Police</option>
                                <option value="OPERATOR">Operator</option>
                                <option value="SUPERVISOR">Supervisor</option>
                            </select>
                            <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        <button
                            onClick={() => refetch()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Operators Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="text-left p-4 font-medium text-slate-700 dark:text-slate-300">Operator</th>
                                <th className="text-left p-4 font-medium text-slate-700 dark:text-slate-300">Role & Department</th>
                                <th className="text-left p-4 font-medium text-slate-700 dark:text-slate-300">Status</th>
                                <th className="text-left p-4 font-medium text-slate-700 dark:text-slate-300">Access Level</th>
                                <th className="text-left p-4 font-medium text-slate-700 dark:text-slate-300">Last Activity</th>
                                <th className="text-left p-4 font-medium text-slate-700 dark:text-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOperators.length > 0 ? (
                                filteredOperators.map((operator) => {
                                    const isActive = operator.status === "ACTIVE";
                                    const isAdmin = operator.role === "ADMIN";

                                    return (
                                        <tr
                                            key={operator.uid}
                                            className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                                                            <span className="text-white font-semibold text-lg">
                                                                {operator?.name?.charAt(0) || "O"}
                                                            </span>
                                                        </div>
                                                        {isActive && (
                                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {operator.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Mail className="w-3 h-3 text-slate-500" />
                                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                                {operator.email}
                                                            </p>
                                                        </div>
                                                        {operator.badge && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <Badge className="w-3 h-3 text-slate-500" />
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                    {operator.badge}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="space-y-2">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                                        <Shield className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            {operator.role}
                                                        </span>
                                                    </div>
                                                    {operator.department && (
                                                        <div className="flex items-center gap-1">
                                                            <Building className="w-3 h-3 text-slate-500" />
                                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                                {operator.department}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className={cn(
                                                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg",
                                                    isActive
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                )}>
                                                    {isActive ? (
                                                        <CheckCircle className="w-4 h-4" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4" />
                                                    )}
                                                    <span className="text-sm font-medium">
                                                        {operator.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Key className="w-4 h-4 text-slate-500" />
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                            Level {operator.accessLevel || "1"}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {operator.permissions?.length || 0} permissions
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-slate-500" />
                                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                                            {operator.createdAt?._seconds
                                                                ? new Date(operator.createdAt._seconds * 1000).toLocaleDateString()
                                                                : "Unknown"
                                                            }
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-slate-500" />
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            Last active: Today
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            updateStatus.mutate({
                                                                uid: operator.uid,
                                                                status: isActive ? "SUSPENDED" : "ACTIVE",
                                                            })
                                                        }
                                                        disabled={updateStatus.isLoading}
                                                        className={cn(
                                                            "px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
                                                            isActive
                                                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                                                                : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                                                        )}
                                                    >
                                                        {isActive ? "Suspend" : "Activate"}
                                                    </button>

                                                    <button
                                                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>

                                                    {!isAdmin && (
                                                        <button
                                                            className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                                            <Users className="w-12 h-12 opacity-50" />
                                            <p className="text-lg font-medium">No operators found</p>
                                            <p className="text-sm">
                                                {search || statusFilter !== "ALL" || roleFilter !== "ALL"
                                                    ? "Try adjusting your filters"
                                                    : "Add your first operator to get started"
                                                }
                                            </p>
                                            {(search || statusFilter !== "ALL" || roleFilter !== "ALL") && (
                                                <button
                                                    onClick={() => {
                                                        setSearch("");
                                                        setStatusFilter("ALL");
                                                        setRoleFilter("ALL");
                                                    }}
                                                    className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    Clear all filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredOperators.length > 0 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Showing {filteredOperators.length} of {operators.length} operators
                        </p>
                        <div className="flex items-center gap-2">
                            <button className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                                Previous
                            </button>
                            <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">
                                1
                            </button>
                            <button className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                                2
                            </button>
                            <button className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <CreateOperatorModal open={open} onClose={() => setOpen(false)} />
        </div>
    );
}
import { useState } from "react";
import { useRoles, useDeleteRole } from "@/hooks/useAdminRoles";
import CreateRoleModal from "@/components/admin/CreateRoleModal";
import {
    Shield, Search, Filter, ShieldAlert, Key, Edit, Trash2, ShieldQuestion, Loader2, AlertCircle, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Roles() {
    const { data: roles = [], isLoading, error, refetch } = useRoles();
    const deleteRole = useDeleteRole();

    const [openModal, setOpenModal] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState(null);
    const [search, setSearch] = useState("");
    const [levelFilter, setLevelFilter] = useState("ALL");

    const filteredRoles = roles.filter(role => {
        const matchesSearch = role.name?.toLowerCase().includes(search.toLowerCase()) ||
            role.description?.toLowerCase().includes(search.toLowerCase());
        const matchesLevel = levelFilter === "ALL" || role.accessLevel === parseInt(levelFilter);
        return matchesSearch && matchesLevel;
    });

    const totalRoles = roles.length;
    const systemRoles = roles.filter(r => r.isSystem).length;
    const customRoles = totalRoles - systemRoles;

    const allPermissions = roles.flatMap(r => r.permissions || []);
    const uniquePermissions = new Set(allPermissions).size;

    const handleEdit = (role) => {
        setRoleToEdit(role);
        setOpenModal(true);
    };

    const handleCreate = () => {
        setRoleToEdit(null);
        setOpenModal(true);
    };

    const handleDelete = (role) => {
        if (role.isSystem) {
            alert("System roles cannot be deleted.");
            return;
        }
        if (window.confirm(`Are you sure you want to delete the role ${role.name}?`)) {
            deleteRole.mutate(role.uid);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">Loading roles...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Failed to load roles</h3>
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
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Roles & Permissions</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Manage access control and system permissions
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                        >
                            <Shield className="w-4 h-4" />
                            Create Role
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Total Roles</p>
                            <p className="text-3xl font-bold text-blue-900 dark:text-blue-300 mt-1">{totalRoles}</p>
                        </div>
                        <Shield className="w-10 h-10 text-blue-500 opacity-60" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/10 border border-indigo-200 dark:border-indigo-800/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-indigo-700 dark:text-indigo-400 font-medium">System Roles</p>
                            <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-300 mt-1">{systemRoles}</p>
                        </div>
                        <ShieldAlert className="w-10 h-10 text-indigo-500 opacity-60" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Custom Roles</p>
                            <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-300 mt-1">{customRoles}</p>
                        </div>
                        <ShieldQuestion className="w-10 h-10 text-emerald-500 opacity-60" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 border border-purple-200 dark:border-purple-800/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">Total Permissions</p>
                            <p className="text-3xl font-bold text-purple-900 dark:text-purple-300 mt-1">{uniquePermissions}</p>
                        </div>
                        <Key className="w-10 h-10 text-purple-500 opacity-60" />
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search roles by name or description..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="relative">
                            <select
                                value={levelFilter}
                                onChange={(e) => setLevelFilter(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="ALL">All Access Levels</option>
                                {[1, 2, 3, 4, 5].map(level => (
                                    <option key={level} value={level}>Level {level}</option>
                                ))}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        <button
                            onClick={() => refetch()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all font-medium"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRoles.map(role => (
                    <div key={role.uid} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex-1">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        {role.name}
                                        {role.isSystem && (
                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                System
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 min-h-[40px]">
                                        {role.description}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 mb-2 flex items-center gap-2">
                                <span className={cn(
                                    "px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 w-max",
                                    role.accessLevel >= 4 ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" :
                                        role.accessLevel >= 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400" :
                                            "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                )}>
                                    <Key className="w-3 h-3" />
                                    Level {role.accessLevel} Access
                                </span>
                            </div>

                            <div className="mt-5">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                    Permissions ({role.permissions?.length || 0})
                                </p>
                                <div className="flex flex-wrap gap-1.5 h-[100px] content-start overflow-y-auto pr-1">
                                    {role.permissions?.map(perm => (
                                        <span key={perm} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                                            {perm}
                                        </span>
                                    ))}
                                    {(!role.permissions || role.permissions.length === 0) && (
                                        <span className="text-sm text-slate-400 italic">No specific permissions assigned</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 px-5 py-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-2">
                            <button
                                onClick={() => handleEdit(role)}
                                className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent shadow-sm"
                                title="Edit Role"
                            >
                                <Edit className="w-4 h-4" />
                            </button>

                            {!role.isSystem && (
                                <button
                                    onClick={() => handleDelete(role)}
                                    disabled={deleteRole.isLoading}
                                    className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent shadow-sm disabled:opacity-50"
                                    title="Delete Role"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredRoles.length === 0 && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center shadow-sm">
                    <ShieldQuestion className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">No roles found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                        {search || levelFilter !== "ALL"
                            ? "Try adjusting your search criteria or filters to find what you're looking for."
                            : "There are no roles defined in the system yet. Click 'Create Role' to add one."}
                    </p>
                </div>
            )}

            <CreateRoleModal
                open={openModal}
                onClose={() => setOpenModal(false)}
                roleToEdit={roleToEdit}
            />
        </div>
    );
}

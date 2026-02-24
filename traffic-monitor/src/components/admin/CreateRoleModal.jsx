import { useState, useEffect } from "react";
import { useCreateRole, useUpdateRole } from "@/hooks/useAdminRoles";
import { X, Shield, Key, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_PERMISSIONS = [
    { id: "incidents:read", label: "Read Incidents" },
    { id: "incidents:write", label: "Write Incidents" },
    { id: "traffic:control", label: "Traffic Control" },
    { id: "streams:view", label: "View Streams" },
    { id: "streams:assign", label: "Assign Streams" },
    { id: "users:read", label: "Read Users" },
    { id: "users:write", label: "Write Users" },
    { id: "model:configure", label: "Configure AI Models" }
];

export default function CreateRoleModal({ open, onClose, roleToEdit = null }) {
    const createRole = useCreateRole();
    const updateRole = useUpdateRole();
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        name: "",
        description: "",
        accessLevel: 1,
        permissions: []
    });

    useEffect(() => {
        if (roleToEdit) {
            setForm({
                name: roleToEdit.name,
                description: roleToEdit.description || "",
                accessLevel: roleToEdit.accessLevel || 1,
                permissions: roleToEdit.permissions || []
            });
        } else {
            setForm({
                name: "",
                description: "",
                accessLevel: 1,
                permissions: []
            });
        }
        setErrors({});
    }, [roleToEdit, open]);

    const update = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: null }));
        }
    };

    const togglePermission = (permissionId) => {
        setForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permissionId)
                ? prev.permissions.filter(p => p !== permissionId)
                : [...prev.permissions, permissionId]
        }));
        if (errors.permissions) {
            setErrors(prev => ({ ...prev, permissions: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!form.name.trim()) newErrors.name = "Role name is required";
        if (!form.description.trim()) newErrors.description = "Description is required";
        if (form.permissions.length === 0) newErrors.permissions = "Select at least one permission";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submit = (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        const isEditing = !!roleToEdit;
        const mutation = isEditing ? updateRole : createRole;
        const payload = isEditing ? { id: roleToEdit.uid, updates: form } : form;

        mutation.mutate(payload, {
            onSuccess: () => {
                onClose();
            },
            onError: (error) => {
                console.error(`Failed to ${isEditing ? 'update' : 'create'} role:`, error);
            }
        });
    };

    if (!open) return null;

    const isLoading = createRole.isLoading || updateRole.isLoading;
    const isError = createRole.isError || updateRole.isError;
    const errorMessage = createRole.error?.message || updateRole.error?.message;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {roleToEdit ? "Edit Role" : "Create New Role"}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            {roleToEdit ? "Modify existing role properties" : "Define a new set of permissions"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto">
                    <form id="role-form" onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5" />
                                    Role Name <span className="text-red-500">*</span>
                                </div>
                            </label>
                            <input
                                placeholder="e.g. SUPERVISOR"
                                value={form.name}
                                onChange={(e) => update("name", e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                                disabled={!!roleToEdit}
                                className={cn(
                                    "w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                    errors.name
                                        ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                                        : "border-slate-300 dark:border-slate-700 focus:ring-blue-500/20 focus:border-blue-500"
                                )}
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <input
                                placeholder="Brief description of the role's purpose"
                                value={form.description}
                                onChange={(e) => update("description", e.target.value)}
                                className={cn(
                                    "w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-1 transition-all",
                                    errors.description
                                        ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                                        : "border-slate-300 dark:border-slate-700 focus:ring-blue-500/20 focus:border-blue-500"
                                )}
                            />
                            {errors.description && (
                                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    {errors.description}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <Key className="w-3.5 h-3.5" />
                                    Access Level
                                </div>
                            </label>
                            <div className="relative">
                                <select
                                    value={form.accessLevel}
                                    onChange={(e) => update("accessLevel", parseInt(e.target.value))}
                                    className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
                                >
                                    {[1, 2, 3, 4, 5].map(level => (
                                        <option key={level} value={level}>Level {level}</option>
                                    ))}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Key className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Permissions <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {ALL_PERMISSIONS.map(permission => (
                                    <div
                                        key={permission.id}
                                        onClick={() => togglePermission(permission.id)}
                                        className={cn(
                                            "flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors text-sm",
                                            form.permissions.includes(permission.id)
                                                ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                                                : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.permissions.includes(permission.id)}
                                            readOnly
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="truncate">{permission.label}</span>
                                    </div>
                                ))}
                            </div>
                            {errors.permissions && (
                                <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    {errors.permissions}
                                </p>
                            )}
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                    {isError && (
                        <div className="p-2 mb-3 bg-red-500/10 border border-red-500/20 rounded-lg shrink-0">
                            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errorMessage || "An error occurred"}
                            </p>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-medium"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="role-form"
                            disabled={isLoading}
                            className={cn(
                                "flex-1 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20",
                                isLoading ? "opacity-70 cursor-not-allowed" : "hover:from-blue-500 hover:to-cyan-500"
                            )}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-1.5">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Saving...
                                </span>
                            ) : (
                                roleToEdit ? "Save Changes" : "Create Role"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

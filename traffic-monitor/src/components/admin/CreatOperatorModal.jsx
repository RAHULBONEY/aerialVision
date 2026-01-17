import { useState } from "react";
import { useCreateOperator } from "@/hooks/useAdminOperators";
import {
    X,
    User,
    Mail,
    Lock,
    Shield,
    Key,
    Badge,
    Building,
    Users,
    AlertCircle,
    Loader2,
    Eye,
    EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_PERMISSIONS = {
    TRAFFIC_POLICE: [
        "incidents:read",
        "incidents:write",
        "traffic:control",
        "streams:view",
        "streams:assign",
        "users:read"
    ],
    EMERGENCY: [
        "incidents:read",
        "incidents:write",
        "streams:view",
        "streams:assign",
        "users:read"
    ],
    ADMIN: [
        "users:read",
        "users:write",
        "streams:view",
        "streams:assign",
        "model:configure"
    ],


};

export default function CreateOperatorModal({ open, onClose }) {
    const createOperator = useCreateOperator();
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "TRAFFIC_POLICE",
        accessLevel: 3,
        badge: "",
        department: "Traffic Control Division"
    });

    const update = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!form.name.trim()) newErrors.name = "Name is required";
        if (!form.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(form.email)) {
            newErrors.email = "Please enter a valid email";
        }
        if (!form.password) newErrors.password = "Password is required";
        else if (form.password.length < 6) newErrors.password = "Password must be at least 6 characters";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submit = (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        createOperator.mutate(form, {
            onSuccess: () => {
                onClose();
                setForm({
                    name: "",
                    email: "",
                    password: "",
                    role: "TRAFFIC_POLICE",
                    accessLevel: 3,
                    badge: "",
                    department: "Traffic Control Division"
                });
                setErrors({});
            },
            onError: (error) => {
                console.error("Failed to create operator:", error);
            }
        });
    };

    if (!open) return null;

    const currentPermissions = ROLE_PERMISSIONS[form.role] || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add New Operator</h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            Create a new system operator account
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-4 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                Full Name
                            </div>
                        </label>
                        <input
                            required
                            placeholder="Enter full name"
                            value={form.name}
                            onChange={(e) => update("name", e.target.value)}
                            className={cn(
                                "w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-1 transition-all",
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
                            <div className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                Email Address
                            </div>
                        </label>
                        <input
                            required
                            type="email"
                            placeholder="operator@example.com"
                            value={form.email}
                            onChange={(e) => update("email", e.target.value)}
                            className={cn(
                                "w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-1 transition-all",
                                errors.email
                                    ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                                    : "border-slate-300 dark:border-slate-700 focus:ring-blue-500/20 focus:border-blue-500"
                            )}
                        />
                        {errors.email && (
                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-2.5 h-2.5" />
                                {errors.email}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5" />
                                Temporary Password
                            </div>
                        </label>
                        <div className="relative">
                            <input
                                required
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={form.password}
                                onChange={(e) => update("password", e.target.value)}
                                className={cn(
                                    "w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-1 transition-all",
                                    errors.password
                                        ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                                        : "border-slate-300 dark:border-slate-700 focus:ring-blue-500/20 focus:border-blue-500"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                            >
                                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-2.5 h-2.5" />
                                {errors.password}
                            </p>
                        )}
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Must be at least 6 characters long
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5" />
                                    Role
                                </div>
                            </label>
                            <select
                                value={form.role}
                                onChange={(e) => update("role", e.target.value)}
                                className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="TRAFFIC_POLICE">Traffic Police</option>
                                <option value="EMERGENCY">Emergency Response</option>
                                <option value="ADMIN">Administrator</option>

                            </select>
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
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <Badge className="w-3.5 h-3.5" />
                                Badge Number (Optional)
                            </div>
                        </label>
                        <input
                            placeholder="e.g., TCP-001"
                            value={form.badge}
                            onChange={(e) => update("badge", e.target.value)}
                            className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5" />
                                Department
                            </div>
                        </label>
                        <select
                            value={form.department}
                            onChange={(e) => update("department", e.target.value)}
                            className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                            <option value="Traffic Control Division">Traffic Control Division</option>
                            <option value="Emergency Response Unit">Emergency Response Unit</option>
                            <option value="System Administration">System Administration</option>
                            <option value="Operations Management">Operations Management</option>
                            <option value="Technical Support">Technical Support</option>
                        </select>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Default Permissions
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {currentPermissions.map((permission) => (
                                <span
                                    key={permission}
                                    className="px-1.5 py-0.5 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded"
                                >
                                    {permission}
                                </span>
                            ))}
                        </div>
                    </div>

                    {createOperator.isError && (
                        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {createOperator.error?.message || "Failed to create operator"}
                            </p>
                        </div>
                    )}

                    <div className="pt-4 flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            disabled={createOperator.isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createOperator.isLoading}
                            className={cn(
                                "flex-1 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20",
                                createOperator.isLoading
                                    ? "opacity-70 cursor-not-allowed"
                                    : "hover:from-blue-500 hover:to-cyan-500"
                            )}
                        >
                            {createOperator.isLoading ? (
                                <span className="flex items-center justify-center gap-1.5">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Creating...
                                </span>
                            ) : (
                                "Create Operator"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
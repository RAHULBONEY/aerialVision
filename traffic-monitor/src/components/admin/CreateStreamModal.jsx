import { useState } from "react";
import { X, Video, Link, Shield, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
    { value: "ADMIN", label: "Admin" },
    { value: "TRAFFIC_POLICE", label: "Traffic Police" },
    { value: "EMERGENCY", label: "Hospital / Emergency" },
];

const SOURCE_TYPES = [
    {
        value: "WEBCAM",
        label: "Local Webcam",
        icon: "📷",
        description: "Use connected camera"
    },
    {
        value: "RTSP",
        label: "IP Camera",
        icon: "🌐",
        description: "RTSP/IP camera stream"
    },
    {
        value: "YOUTUBE",
        label: "YouTube Live",
        icon: "▶️",
        description: "YouTube live stream"
    },
];

export default function CreateStreamModal({ open, onClose, onCreate, modelOptions }) {
    const [form, setForm] = useState({
        name: "",
        type: "WEBCAM",
        sourceUrl: "0",
        model: "mark-3",
        assignedRoles: ["ADMIN"],
    });

    if (!open) return null;

    const update = (key, value) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const toggleRole = (role) => {
        setForm(prev => ({
            ...prev,
            assignedRoles: prev.assignedRoles.includes(role)
                ? prev.assignedRoles.filter(r => r !== role)
                : [...prev.assignedRoles, role],
        }));
    };

    const getModelDescription = (modelId) => {
        const model = modelOptions.find(m => m.id === modelId);
        return model ? `${model.description} • Best for: ${model.bestFor}` : "";
    };

    const submit = async () => {
        if (!form.name.trim()) return;
        await onCreate(form);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Create New Stream
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Configure a new video stream for analysis
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Stream Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Stream Name
                        </label>
                        <input
                            value={form.name}
                            onChange={(e) => update("name", e.target.value)}
                            placeholder="e.g., Junction Camera 12, Highway Entrance"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    {/* Stream Type */}

                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                            Source Type
                        </label>

                        {/* Radio group with improved visibility */}
                        <div className="grid grid-cols-3 gap-3">
                            {SOURCE_TYPES.map((type) => (
                                <div key={type.value} className="relative">
                                    <input
                                        type="radio"
                                        id={`type-${type.value}`}
                                        name="streamType"
                                        value={type.value}
                                        checked={form.type === type.value}
                                        onChange={(e) => {
                                            update("type", e.target.value);
                                            update("sourceUrl", e.target.value === "WEBCAM" ? "0" : "");
                                        }}
                                        className="sr-only" // Hide default radio, style custom one
                                    />
                                    <label
                                        htmlFor={`type-${type.value}`}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200",
                                            form.type === type.value
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                                                : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600"
                                        )}
                                    >
                                        {/* Icon with better visibility */}
                                        <div className={cn(
                                            "text-2xl mb-2",
                                            form.type === type.value
                                                ? "text-blue-600 dark:text-blue-400"
                                                : "text-gray-500 dark:text-gray-400"
                                        )}>
                                            {type.icon}
                                        </div>

                                        {/* Label with proper contrast */}
                                        <div className="text-sm font-medium text-center">
                                            {type.label}
                                        </div>

                                        {/* Active indicator */}
                                        {form.type === type.value && (
                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Source URL */}
                    {form.type !== "WEBCAM" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                {form.type === "YOUTUBE" ? "YouTube Live URL" : "RTSP Camera URL"}
                            </label>
                            <input
                                value={form.sourceUrl}
                                onChange={(e) => update("sourceUrl", e.target.value)}
                                placeholder={
                                    form.type === "YOUTUBE"
                                        ? "https://youtube.com/live/..."
                                        : "rtsp://camera-ip:554/stream"
                                }
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                    )}

                    {/* AI Model Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-900 dark:text-white">
                                AI Detection Model
                            </label>
                            <Info className="w-4 h-4 text-gray-400" />
                        </div>

                        <div className="space-y-2">
                            {modelOptions.map((model) => (
                                <label
                                    key={model.id}
                                    className={cn(
                                        "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all",
                                        form.model === model.id
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                            : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="model"
                                            value={model.id}
                                            checked={form.model === model.id}
                                            onChange={(e) => update("model", e.target.value)}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {model.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {model.description}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                                        {model.bestFor}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Access Roles */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Access Control
                        </label>
                        <div className="space-y-2">
                            {ROLE_OPTIONS.map((role) => (
                                <label
                                    key={role.value}
                                    className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.assignedRoles.includes(role.value)}
                                        onChange={() => toggleRole(role.value)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-900 dark:text-white">{role.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={!form.name.trim()}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create Stream
                    </button>
                </div>
            </div>
        </div>
    );
}
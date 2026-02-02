import { useState, useEffect } from "react";
import {
    X, Video, Link, Shield, Info,
    Loader2, Lock, ShieldCheck, AlertTriangle, Film
} from "lucide-react";
import { useAnalyzeSource } from "@/hooks/useModelConfig";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
    { value: "ADMIN", label: "Admin" },
    { value: "TRAFFIC_POLICE", label: "Traffic Police" },
    { value: "EMERGENCY", label: "Hospital / Emergency" },
];

const SOURCE_TYPES = [
    { value: "WEBCAM", label: "Local Webcam", icon: "📷", description: "Use connected camera" },
    { value: "RTSP", label: "IP Camera", icon: "🌐", description: "RTSP/IP camera stream" },
    { value: "YOUTUBE", label: "YouTube Live", icon: "▶️", description: "YouTube live stream" },
    { value: "SIMULATION", label: "Simulation / Demo", icon: <Film className="w-6 h-6" />, description: "Pre-recorded scenario" },
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CreateStreamModal({ open, onClose, onCreate, modelOptions }) {
    const [form, setForm] = useState({
        name: "",
        type: "WEBCAM",
        sourceUrl: "0",
        model: "mark-3",
        assignedRoles: ["ADMIN"],
        simulationId: "" // Added for simulation
    });
    const [governance, setGovernance] = useState({
        isLocked: false,
        detectedView: null,
        reason: ""
    });
    const [simulations, setSimulations] = useState([]);
    const [isLoadingSims, setIsLoadingSims] = useState(false);

    const { mutate: analyze, isPending: isAnalyzing } = useAnalyzeSource();

    const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    // Fetch simulations when type is SIMULATION
    useEffect(() => {
        let mounted = true;

        const fetchSims = async () => {
            if (form.type !== "SIMULATION") return;

            setIsLoadingSims(true);
            try {
                // Dynamic import to avoid SSR issues if any, but mainly purely client side.
                // Keeping import inside might be okay if not used elsewhere, but cleaner to just import at top if possible.
                // However, moving on...
                const { auth } = await import("@/lib/firebase");
                const user = auth.currentUser;

                let headers = {};
                if (user) {
                    const token = await user.getIdToken();
                    headers = { Authorization: `Bearer ${token}` };
                }

                const res = await fetch(`${API_URL}/api/incidents/simulations`, { headers });
                const data = await res.json();

                if (mounted && data.success) {
                    setSimulations(data.data);
                }
            } catch (e) {
                console.error("Failed to fetch simulations", e);
            } finally {
                if (mounted) setIsLoadingSims(false);
            }
        };

        fetchSims();

        return () => { mounted = false; };
    }, [form.type]);

    if (!open) return null;


    const runAnalysis = (url, modelId) => {
        if (form.type === "WEBCAM" || form.type === "SIMULATION" || !url || url.length < 5) return;

        analyze(
            { sourceUrl: url, requestedModel: modelId },
            {
                onSuccess: (data) => {
                    setGovernance({
                        isLocked: data.isLocked,
                        detectedView: data.detectedView,
                        reason: data.reason
                    });

                    if (data.recommendedModel && data.recommendedModel !== modelId) {
                        update("model", data.recommendedModel);
                    }
                }
            }
        );
    };

    const handleUrlBlur = () => {
        runAnalysis(form.sourceUrl, form.model);
    };

    const handleModelChange = (newModelId) => {
        update("model", newModelId);
        runAnalysis(form.sourceUrl, newModelId);
    };

    const toggleRole = (role) => {
        setForm(prev => ({
            ...prev,
            assignedRoles: prev.assignedRoles.includes(role)
                ? prev.assignedRoles.filter(r => r !== role)
                : [...prev.assignedRoles, role],
        }));
    };

    const submit = async () => {
        if (!form.name.trim()) return;

        // Ensure simulationId is set if type is SIMULATION
        if (form.type === "SIMULATION" && !form.simulationId) return;

        await onCreate({
            ...form,
            viewType: governance.detectedView || "GROUND"
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl mx-4">
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Stream</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure a new video stream for analysis</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Stream Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => update("name", e.target.value)}
                            placeholder="e.g., Junction Camera 12"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">Source Type</label>
                        <div className="grid grid-cols-4 gap-2">
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
                                            setGovernance({ isLocked: false, detectedView: null, reason: "" });
                                        }}
                                        className="sr-only"
                                    />
                                    <label
                                        htmlFor={`type-${type.value}`}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 h-24",
                                            form.type === type.value
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                                                : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400"
                                        )}
                                    >
                                        <div className={cn("text-2xl mb-1", form.type === type.value ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400")}>
                                            {typeof type.icon === 'string' ? type.icon : type.icon}
                                        </div>
                                        <div className="text-[10px] font-medium text-center leading-tight">{type.label}</div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {form.type === "SIMULATION" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Select Simulation Scenario</label>
                            {isLoadingSims ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching scenarios...
                                </div>
                            ) : (
                                <select
                                    value={form.simulationId}
                                    onChange={(e) => {
                                        update("simulationId", e.target.value);
                                        // Also auto-set name if empty
                                        const sim = simulations.find(s => s.id === e.target.value);
                                        if (sim && !form.name) {
                                            update("name", sim.name);
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition appearance-none"
                                >
                                    <option value="">-- Select a scenario --</option>
                                    {simulations.map(sim => (
                                        <option key={sim.id} value={sim.id}>
                                            {sim.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {(form.type !== "WEBCAM" && form.type !== "SIMULATION") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                {form.type === "YOUTUBE" ? "YouTube Live URL" : "RTSP Camera URL"}
                            </label>
                            <div className="relative">
                                <input
                                    value={form.sourceUrl}
                                    onChange={(e) => update("sourceUrl", e.target.value)}
                                    onBlur={handleUrlBlur}
                                    placeholder={form.type === "YOUTUBE" ? "https://youtube.com/live/..." : "rtsp://..."}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition"
                                />
                                {isAnalyzing && (
                                    <div className="absolute right-3 top-3.5">
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-900 dark:text-white">AI Detection Model</label>
                            {governance.isLocked ? (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                                    <Lock className="w-3 h-3" /> Policy Enforced
                                </span>
                            ) : (
                                <Info className="w-4 h-4 text-gray-400" />
                            )}
                        </div>

                        <div className="space-y-2">
                            {modelOptions.map((model) => {
                                const isSelected = form.model === model.id;
                                const isDisabled = governance.isLocked && !isSelected;

                                return (
                                    <label
                                        key={model.id}
                                        className={cn(
                                            "flex items-center justify-between p-3 border rounded-lg transition-all",
                                            isDisabled ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800" : "cursor-pointer",
                                            isSelected
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                : model.isExperimental
                                                    ? "border-amber-200 dark:border-amber-800 hover:border-amber-400"
                                                    : "border-gray-300 dark:border-gray-700 hover:border-gray-400"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="model"
                                                value={model.id}
                                                checked={isSelected}
                                                disabled={isDisabled}
                                                onChange={() => handleModelChange(model.id)}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                    {model.name}
                                                    {model.isProduction && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded font-medium flex items-center gap-0.5">
                                                            <Lock className="w-2.5 h-2.5" /> PROD
                                                        </span>
                                                    )}
                                                    {model.isExperimental && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded font-medium">
                                                            🧪 EXP
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{model.description}</div>
                                                {model.isExperimental && (
                                                    <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Higher compute cost
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {governance.isLocked && isSelected && (
                                            <ShieldCheck className="w-4 h-4 text-green-600" />
                                        )}
                                    </label>
                                );
                            })}
                        </div>

                        {governance.detectedView && (
                            <div className={cn(
                                "mt-3 text-xs p-2 rounded flex items-start gap-2",
                                governance.isLocked ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-600"
                            )}>
                                {governance.isLocked ? <ShieldCheck className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
                                <div>
                                    <p className="font-semibold">{governance.detectedView} View Detected</p>
                                    <p>{governance.reason}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Access Control
                        </label>
                        <div className="space-y-2">
                            {ROLE_OPTIONS.map((role) => (
                                <label key={role.value} className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
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

                <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-800">
                    <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={!form.name.trim() || isAnalyzing}
                        className={cn(
                            "flex-1 px-4 py-3 font-medium rounded-lg shadow-lg transition-all",
                            (!form.name.trim() || isAnalyzing)
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
                                : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-500/20"
                        )}
                    >
                        {isAnalyzing ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Analyzing...
                            </div>
                        ) : (
                            "Create Stream"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
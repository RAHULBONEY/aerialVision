import { useState, useEffect } from "react";
import {
    X, Shield, Info,
    Loader2, Lock, ShieldCheck, AlertTriangle, Film
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
    { value: "ADMIN", label: "Admin" },
    { value: "TRAFFIC_POLICE", label: "Traffic Police" },
    { value: "EMERGENCY", label: "Ambulance / Emergency" },
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CreateStreamModal({ open, onClose, onCreate, modelOptions }) {
    const [form, setForm] = useState({
        name: "",
        type: "SIMULATION",
        sourceUrl: "",
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

    const [isAnalyzing] = useState(false);

    const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    useEffect(() => {
        let mounted = true;

        const fetchSims = async () => {
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
    }, []);

    if (!open) return null;


    const handleModelChange = (newModelId) => {
        update("model", newModelId);
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

                    {/* Simulation Mode Header */}
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800/30 rounded-xl">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                            <Film className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Simulation Mode</h3>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400/70">Choose a pre-recorded scenario to simulate traffic incidents</p>
                        </div>
                    </div>

                    {/* Simulation Scenarios Grid */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">Select Simulation Scenario</label>
                        {isLoadingSims ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                                <Loader2 className="w-4 h-4 animate-spin" /> Fetching scenarios...
                            </div>
                        ) : simulations.length === 0 ? (
                            <div className="text-sm text-gray-500 py-4 text-center">
                                No simulation scenarios available
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {simulations.map((sim) => (
                                    <div key={sim.id} className="relative">
                                        <input
                                            type="radio"
                                            id={`sim-${sim.id}`}
                                            name="simulationId"
                                            value={sim.id}
                                            checked={form.simulationId === sim.id}
                                            onChange={(e) => {
                                                update("simulationId", e.target.value);
                                                const selectedSim = simulations.find(s => s.id === e.target.value);
                                                if (selectedSim && !form.name) {
                                                    update("name", selectedSim.name);
                                                }
                                            }}
                                            className="sr-only"
                                        />
                                        <label
                                            htmlFor={`sim-${sim.id}`}
                                            className={cn(
                                                "flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200",
                                                form.simulationId === sim.id
                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm"
                                                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-lg",
                                                    form.simulationId === sim.id
                                                        ? "bg-blue-100 dark:bg-blue-500/20"
                                                        : "bg-gray-100 dark:bg-gray-700"
                                                )}>
                                                    <Film className={cn(
                                                        "w-5 h-5",
                                                        form.simulationId === sim.id
                                                            ? "text-blue-600 dark:text-blue-400"
                                                            : "text-gray-500 dark:text-gray-400"
                                                    )} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className={cn(
                                                        "font-medium",
                                                        form.simulationId === sim.id
                                                            ? "text-blue-900 dark:text-blue-300"
                                                            : "text-gray-900 dark:text-white"
                                                    )}>
                                                        {sim.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {sim.description || 'Simulation Scenario'}
                                                    </div>
                                                </div>
                                                {form.simulationId === sim.id && (
                                                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

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
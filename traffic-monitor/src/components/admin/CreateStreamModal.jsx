import { useState } from "react";
import { X, Video, Link, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
    { value: "ADMIN", label: "Admin" },
    { value: "TRAFFIC_POLICE", label: "Traffic Police" },
    { value: "EMERGENCY", label: "Hospital / Emergency" },
];

export default function CreateStreamModal({ open, onClose, onCreate }) {
    const [form, setForm] = useState({
        name: "",
        type: "WEBCAM",
        sourceUrl: "0",
        model: "mark-2",
        assignedRoles: ["ADMIN"],
    });

    if (!open) return null;

    const update = (key, value) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const toggleRole = (role) => {
        setForm((prev) => ({
            ...prev,
            assignedRoles: prev.assignedRoles.includes(role)
                ? prev.assignedRoles.filter((r) => r !== role)
                : [...prev.assignedRoles, role],
        }));
    };

    const submit = async () => {
        if (!form.name.trim()) return;

        const streamId = crypto.randomUUID();

        const res = await fetch("http://localhost:8001/streams/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: streamId,
                sourceUrl: form.sourceUrl,
                model: form.model,
            }),
        });

        if (!res.ok) {
            alert("AI Engine failed");
            return;
        }

        const { aiEngineUrl } = await res.json();

        onCreate({
            id: streamId,
            name: form.name,
            type: form.type,
            sourceUrl: form.sourceUrl,
            model: { name: form.model },
            assignedRoles: form.assignedRoles,
            status: "RUNNING",
            aiEngineUrl,
        });

        onClose();
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border shadow-xl">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Create Stream</h2>
                    <button onClick={onClose}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">

                    {/* Stream Name */}
                    <div>
                        <label className="text-xs font-medium">Stream Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => update("name", e.target.value)}
                            placeholder="Junction Camera 12"
                            className="w-full mt-1 px-3 py-2 border rounded"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="text-xs font-medium">Stream Type</label>
                        <select
                            value={form.type}
                            onChange={(e) => {
                                update("type", e.target.value);
                                update("sourceUrl", e.target.value === "WEBCAM" ? "0" : "");
                            }}
                            className="w-full mt-1 px-3 py-2 border rounded"
                        >
                            <option value="WEBCAM">Local Webcam</option>
                            <option value="YOUTUBE">YouTube Live</option>
                            <option value="RTSP">RTSP Camera</option>
                        </select>
                    </div>

                    {/* Source */}
                    {form.type !== "WEBCAM" && (
                        <div>
                            <label className="text-xs font-medium">
                                {form.type === "YOUTUBE" ? "YouTube URL" : "RTSP URL"}
                            </label>
                            <input
                                value={form.sourceUrl}
                                onChange={(e) => update("sourceUrl", e.target.value)}
                                placeholder="https://..."
                                className="w-full mt-1 px-3 py-2 border rounded"
                            />
                        </div>
                    )}

                    {/* Model */}
                    <div>
                        <label className="text-xs font-medium">AI Model</label>
                        <div className="mt-1 px-3 py-2 border rounded bg-slate-50 dark:bg-slate-800">
                            Mark-2 (Realtime)
                        </div>
                    </div>

                    {/* Roles */}
                    <div>
                        <label className="text-xs font-medium flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Allowed Roles
                        </label>
                        <div className="mt-2 flex gap-2 flex-wrap">
                            {ROLE_OPTIONS.map((r) => (
                                <button
                                    key={r.value}
                                    onClick={() => toggleRole(r.value)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs rounded border",
                                        form.assignedRoles.includes(r.value)
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white dark:bg-slate-800"
                                    )}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 p-4 border-t">
                    <button
                        onClick={onClose}
                        className="flex-1 px-3 py-2 border rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded"
                    >
                        Create Stream
                    </button>
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { useUsers, useSystemHealth, useAuditLogs, useCreateUser } from "@/hooks/useAdminQueries";
import { CreateUserModal } from "@/components/modals/CreateUserModal"; // <--- 1. IMPORT MODAL
import {
    Shield, Server, Users, Activity, Terminal,
    AlertOctagon, CheckCircle2, HardDrive, Cpu, Search, Trash2, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
    const { data: users, isLoading: usersLoading } = useUsers();
    const { data: health, isLoading: healthLoading } = useSystemHealth();
    const { data: logs, isLoading: logsLoading } = useAuditLogs();

    // <--- 2. ADD STATE TO CONTROL MODAL VISIBILITY
    const [isModalOpen, setIsModalOpen] = useState(false);

    // <--- 3. ADD THE CREATE USER HOOK
    const { mutate: createUser } = useCreateUser();

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300 relative">

            {/* ROW 1: INFRASTRUCTURE HEALTH */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <HealthCard label="SYSTEM STATUS" value={health?.databaseStatus || "..."} icon={Shield} color="text-green-400" pulse />
                <HealthCard label="API LATENCY" value={health?.apiLatency || "..."} sub="Global Avg" icon={Activity} color="text-blue-400" />
                <HealthCard label="AI INFERENCE" value={health?.aiModelStatus || "..."} icon={Cpu} color="text-purple-400" />
                <HealthCard label="ACTIVE NODES" value={health?.activeConnections || "..."} icon={Server} color="text-orange-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* COL 1 & 2: USER MANAGEMENT CONSOLE */}
                <div className="lg:col-span-2 bg-[#0B1C2D]/60 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden flex flex-col h-[500px]">

                    {/* Header Bar */}
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-primary" />
                            <h3 className="text-xs font-bold text-slate-200 tracking-widest uppercase">Operator Database</h3>
                        </div>
                        <div className="flex gap-2">
                            {/* <--- 4. CONNECT THE BUTTON TO THE STATE */}
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded border border-primary/30 hover:bg-primary/30 hover:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all active:scale-95"
                            >
                                + NEW OPERATOR
                            </button>
                        </div>
                    </div>

                    {/* Search / Filter Bar */}
                    <div className="p-3 border-b border-white/5 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-500 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search by UID or Name..."
                                className="w-full bg-[#050B14] border border-white/10 rounded pl-9 py-2 text-xs text-slate-300 focus:border-primary/50 focus:outline-none font-mono"
                            />
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/5 text-[10px] uppercase text-slate-500 font-mono sticky top-0 backdrop-blur-md z-10">
                                <tr>
                                    <th className="p-3 pl-4">UID</th>
                                    <th className="p-3">Identity</th>
                                    <th className="p-3">Clearance</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs text-slate-300 divide-y divide-white/5 font-mono">
                                {usersLoading ? (
                                    <tr><td colSpan="5" className="p-4 text-center animate-pulse">DECRYPTING USER DATA...</td></tr>
                                ) : users?.map(user => (
                                    <tr key={user.uid} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-3 pl-4 text-primary">{user.uid}</td>
                                        <td className="p-3">
                                            <div className="font-bold text-slate-200">{user.name}</div>
                                            <div className="text-[10px] text-slate-500">{user.email}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-bold border",
                                                user.role === 'ADMIN' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                    user.role === 'EMERGENCY' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                            )}>
                                                {user.role === 'EMERGENCY' ? 'HOSPITAL' : user.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            {user.status === 'ACTIVE' ? (
                                                <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={12} /> Active</span>
                                            ) : (
                                                <span className="text-red-400 flex items-center gap-1"><AlertOctagon size={12} /> Suspended</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white"><Lock size={14} /></button>
                                                <button className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* COL 3: SECURITY TERMINAL */}
                <div className="flex flex-col gap-4">
                    <div className="bg-black border border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col shadow-2xl font-mono text-[11px]">
                        <div className="bg-slate-900/50 p-2 border-b border-slate-800 flex items-center gap-2">
                            <Terminal size={12} className="text-slate-500" />
                            <span className="text-slate-400">audit_log_stream.sh</span>
                        </div>
                        <div className="flex-1 p-3 overflow-y-auto text-slate-300 space-y-1.5 custom-scrollbar">
                            {logsLoading ? (
                                <div className="animate-pulse">Connecting to secure socket...</div>
                            ) : logs?.map(log => (
                                <div key={log.id} className="break-all">
                                    <span className="text-slate-600">[{log.time}]</span>{' '}
                                    <span className={cn(
                                        "font-bold",
                                        log.status === 'CRITICAL' ? "text-red-500" :
                                            log.status === 'WARN' ? "text-yellow-500" : "text-green-500"
                                    )}>{log.status}</span>{' '}
                                    <span className="text-blue-400">@{log.user}</span>:{' '}
                                    {log.action} <span className="text-slate-600">({log.ip})</span>
                                </div>
                            ))}
                            <div className="animate-pulse text-primary pt-2">_</div>
                        </div>
                    </div>

                    <div className="bg-[#0B1C2D]/60 border border-white/10 p-4 rounded-xl">
                        <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Maintenance Protocols</h3>
                        <div className="space-y-2">
                            <button className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-xs text-slate-300 flex items-center justify-between transition-colors">
                                <span>Clear Cache</span>
                                <HardDrive size={14} className="text-slate-500" />
                            </button>
                            <button className="w-full text-left px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded border border-red-500/20 text-xs text-red-400 flex items-center justify-between transition-colors">
                                <span>Emergency Shutdown</span>
                                <AlertOctagon size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* <--- 5. RENDER THE MODAL AT THE BOTTOM */}
            <CreateUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={(data) => createUser(data)}
            />
        </div>
    );
}

// --- MICRO COMPONENT ---
function HealthCard({ label, value, sub, icon: Icon, color, pulse }) {
    return (
        <div className="bg-[#0B1C2D]/60 backdrop-blur-sm border border-white/10 p-4 rounded-xl flex items-center justify-between">
            <div>
                <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">{label}</p>
                <div className={cn("text-xl font-black font-mono flex items-center gap-2", color)}>
                    {pulse && <div className={cn("w-2 h-2 rounded-full animate-pulse", color.replace('text-', 'bg-'))} />}
                    {value}
                </div>
                {sub && <p className="text-[9px] text-slate-600 mt-1">{sub}</p>}
            </div>
            <div className={cn("p-2 rounded-lg bg-white/5", color)}>
                <Icon size={20} />
            </div>
        </div>
    );
}
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area"; // Install with: npx shadcn@latest add scroll-area

export default function IncidentHistory() {
    const incidents = [
        { id: 1, type: "SOS", desc: "Ambulance Priority Cleared", time: "10:42 AM", status: "Resolved" },
        { id: 2, type: "Congestion", desc: "High Density - Sector G", time: "09:15 AM", status: "Resolved" },
        { id: 3, type: "Accident", desc: "Vehicle Stall - Lane 2", time: "08:30 AM", status: "Resolved" },
    ];

    return (
        <div className="bg-[#162F4A] border border-[#1E3A5F] rounded-xl p-4 shadow-xl flex flex-col h-[300px]">
            <h3 className="text-xs font-bold text-[#9AA4AF] uppercase mb-4 tracking-widest">
                Incident History
            </h3>
            <div className="space-y-3 overflow-y-auto pr-2">
                {incidents.map((incident) => (
                    <div key={incident.id} className="border-l-2 border-[#00E5FF] bg-[#0B1C2D]/50 p-3 rounded-r-md">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-mono text-[#00E5FF] uppercase">{incident.type}</span>
                            <span className="text-[10px] text-[#687280]">{incident.time}</span>
                        </div>
                        <p className="text-sm text-[#EAEAEA] font-medium leading-tight mb-2">
                            {incident.desc}
                        </p>
                        <Badge className="bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/30 text-[9px] h-5">
                            {incident.status}
                        </Badge>
                    </div>
                ))}
            </div>
        </div>
    );
}
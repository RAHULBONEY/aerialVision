import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, MessageSquare } from "lucide-react";

export default function SOSPanel() {
    return (
        <div className="bg-[#162F4A] border border-[#1E3A5F] rounded-xl p-4 shadow-xl">
            <h3 className="text-xs font-bold text-[#9AA4AF] uppercase mb-4 tracking-widest">
                SOS Controls [cite: 14]
            </h3>
            <div className="flex flex-col gap-3">
                <Button className="w-full bg-[#FF8C00] hover:bg-[#FF8C00]/90 text-white font-bold gap-2">
                    <AlertTriangle size={18} /> TRIGGER ALERT [cite: 15]
                </Button>
                <Button variant="outline" className="w-full border-[#E53935] text-[#E53935] hover:bg-[#E53935]/10 font-bold gap-2">
                    <ShieldAlert size={18} /> MARK ACCIDENT [cite: 16]
                </Button>
                <Button variant="secondary" className="w-full bg-[#1E3A5F] text-[#EAEAEA] font-bold gap-2">
                    <MessageSquare size={18} /> ESCALATE TO ADMIN [cite: 17]
                </Button>
            </div>
        </div>
    );
}
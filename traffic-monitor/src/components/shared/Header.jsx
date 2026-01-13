import { Badge } from "@/components/ui/badge";
import { Circle, Radio, ShieldCheck } from "lucide-react";

export default function Header({ role = "ADMIN", isModelRunning = true }) {
    return (
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <ShieldCheck className="text-background" size={20} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tighter text-primary">
                        AERIAL<span className="text-white">VISION</span>
                    </h1>
                </div>
                <Badge variant="outline" className="border-primary/50 text-primary">
                    {role}
                </Badge>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="text-muted-foreground uppercase">Model Status:</span>
                    <div className="flex items-center gap-1.5 text-success">
                        <Radio size={14} className="animate-pulse" />
                        RUNNING
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="text-muted-foreground uppercase">Backend:</span>
                    <div className="flex items-center gap-1.5 text-success">
                        <Circle size={8} fill="currentColor" />
                        CONNECTED
                    </div>
                </div>

                <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center border border-border">
                    <span className="text-xs font-bold">RB</span>
                </div>
            </div>
        </header>
    );
}
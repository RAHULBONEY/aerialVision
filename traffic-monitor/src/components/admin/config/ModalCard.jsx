import React from "react";
import {
    Card, CardHeader, CardTitle, CardContent, CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Server } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ModelCard({ id, model, onToggle }) {
    const isEnabled = model.status !== "disabled";

    const getBadgeVariant = (status) => {
        switch (status) {
            case "production": return "default";
            case "allowed": return "secondary";
            case "experimental": return "outline";
            case "disabled": return "destructive";
            default: return "outline";
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case "production": return "PRODUCTION";
            case "experimental": return "EXPERIMENTAL";
            case "disabled": return "DISABLED";
            default: return status?.toUpperCase();
        }
    };

    const getStatusColors = (status) => {
        switch (status) {
            case "production":
                return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
            case "experimental":
                return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
            case "disabled":
                return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
            default:
                return "";
        }
    };

    return (
        <Card className={cn(
            "transition-all duration-200 border",
            !isEnabled
                ? "opacity-70 bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700"
                : "bg-white border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 hover:shadow-md dark:hover:shadow-slate-900/50"
        )}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                    <Badge
                        variant={getBadgeVariant(model.status)}
                        className={cn(
                            "uppercase tracking-wider text-[10px] border",
                            getStatusColors(model.status)
                        )}
                    >
                        {getStatusLabel(model.status)}
                    </Badge>
                    <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => onToggle(id, checked ? "allowed" : "disabled")}
                        aria-label="Toggle model availability"
                    />
                </div>
                <CardTitle className="text-base flex items-center gap-2 mt-2 text-slate-900 dark:text-slate-100">
                    <Server className="w-4 h-4 text-slate-400" />
                    {model.label}
                </CardTitle>
                <CardDescription className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {model.version}
                </CardDescription>
            </CardHeader>

            <CardContent>
                {model.warning && (
                    <div className="flex items-start gap-2 text-xs bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {model.warning}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

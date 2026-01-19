import React from "react";
import {
    Card, CardHeader, CardTitle, CardContent, CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Server } from "lucide-react";

export default function ModelCard({ id, model, onToggle }) {
    const isEnabled = model.status !== "disabled";


    const getBadgeVariant = (status) => {
        switch (status) {
            case "production": return "default";
            case "allowed": return "secondary";
            case "disabled": return "destructive";
            default: return "outline";
        }
    };

    return (
        <Card className={`transition-all duration-200 ${!isEnabled ? "opacity-75 bg-muted/50 border-destructive/20" : "hover:shadow-md"}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <Badge variant={getBadgeVariant(model.status)} className="uppercase tracking-widest text-[10px]">
                        {model.status}
                    </Badge>
                    <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => onToggle(id, checked ? "allowed" : "disabled")}
                        aria-label="Toggle model availability"
                    />
                </div>
                <CardTitle className="text-lg flex items-center gap-2 mt-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    {model.label}
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                    {model.version}
                </CardDescription>
            </CardHeader>

            <CardContent>
                {model.warning && (
                    <div className="flex items-start gap-2 text-xs bg-amber-50 text-amber-800 p-2 rounded border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {model.warning}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
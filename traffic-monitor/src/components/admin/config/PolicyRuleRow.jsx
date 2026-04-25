import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Satellite, MapPin, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PolicyRuleRow({ viewName, rule, onUpdate }) {
    const isLocked = rule.locked;
    const isAerial = viewName.toLowerCase().includes("aerial");

    return (
        <Card className={cn(
            "transition-colors border overflow-hidden",
            isLocked
                ? "border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-950/20"
                : "border-slate-200 dark:border-slate-700 dark:bg-slate-800/30"
        )}>
            <CardContent className="p-5 space-y-4">
                {/* Top row: icon + info + badge */}
                <div className="flex items-start gap-4">
                    <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        isLocked
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    )}>
                        {isAerial ? (
                            <Satellite className="w-5 h-5" />
                        ) : (
                            <MapPin className="w-5 h-5" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                                {viewName.replace(/_/g, ' ')} View Policy
                            </h4>
                            {isLocked && (
                                <Badge
                                    variant="outline"
                                    className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700"
                                >
                                    <Lock className="w-2.5 h-2.5 mr-1" />
                                    ENFORCED
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {rule.reason}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                            <span>Priority: <span className="font-medium text-slate-700 dark:text-slate-300">{rule.priority || "Medium"}</span></span>
                            <span>Streams: <span className="font-medium text-slate-700 dark:text-slate-300">{rule.streams || "Auto"}</span></span>
                        </div>
                    </div>
                </div>

                {/* Controls row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    {/* Target Model Select */}
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block mb-1.5">
                            Target Model
                        </span>
                        <Select
                            value={rule.model}
                            onValueChange={(val) => onUpdate(viewName, { ...rule, model: val })}
                        >
                            <SelectTrigger className={cn(
                                "w-full text-slate-900 dark:text-slate-100",
                                isLocked
                                    ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/30"
                                    : "border-slate-200 dark:border-slate-600 dark:bg-slate-800"
                            )}>
                                <SelectValue placeholder="Select Model" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <SelectItem value="mark-3" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <span className="flex items-center gap-2">
                                        Mark-3 (Precision)
                                        <span className="text-[9px] px-1 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded">PROD</span>
                                    </span>
                                </SelectItem>
                                <SelectItem value="mark-5" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <span className="flex items-center gap-2">
                                        Mark-5 (Advanced)
                                        <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded">EXP</span>
                                    </span>
                                </SelectItem>
                                <SelectItem value="mark-4" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <span className="flex items-center gap-2">
                                        Mark-4 (Research)
                                        <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded">EXP</span>
                                    </span>
                                </SelectItem>
                                <SelectItem value="mark-2.5" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    Mark-2.5 (Balanced)
                                </SelectItem>
                                <SelectItem value="mark-2" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    Mark-2 (Speed)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Strict Lock Toggle */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5 shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                            Strict Lock
                        </span>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={rule.locked}
                                onCheckedChange={(checked) => onUpdate(viewName, { ...rule, locked: checked })}
                                className={cn(
                                    isLocked
                                        ? "data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-600"
                                        : ""
                                )}
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {isLocked ? "On" : "Off"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Enforced notice */}
                {isLocked && (
                    <div className={cn(
                        "flex items-start gap-2 p-3 rounded-lg border text-sm",
                        "bg-blue-50 border-blue-200 text-blue-800",
                        "dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300"
                    )}>
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>This rule is enforced and cannot be overridden by individual operators.</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

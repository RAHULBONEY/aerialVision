import React from "react";
import {
    Card, CardContent
} from "@/components/ui/card";
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
            "hover:border-blue-300 dark:hover:border-primary/50 transition-colors border",
            isLocked
                ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
                : "border-gray-200 dark:border-gray-800"
        )}>
            <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-6">

                <div className="flex items-start gap-4 w-full sm:w-auto">
                    <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                        isLocked
                            ? "bg-blue-100 text-blue-600 dark:bg-primary/10 dark:text-primary"
                            : "bg-gray-100 text-gray-500 dark:bg-muted dark:text-muted-foreground"
                    )}>
                        {isAerial ? (
                            <Satellite className="w-6 h-6" />
                        ) : (
                            <MapPin className="w-6 h-6" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                                {viewName.replace(/_/g, ' ')} View Policy
                            </h4>
                            {isLocked && (
                                <Badge
                                    variant="default"
                                    className="text-[10px] bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800"
                                >
                                    <Lock className="w-3 h-3 mr-1" />
                                    ENFORCED
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-muted-foreground mb-3">
                            {rule.reason}
                        </p>


                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Priority:</span>
                                <span className="text-gray-600 dark:text-gray-400 ml-1">
                                    {rule.priority || "Medium"}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Streams:</span>
                                <span className="text-gray-600 dark:text-gray-400 ml-1">
                                    {rule.streams || "Auto"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full sm:w-auto justify-end">
                    {/* Target Model Select */}
                    <div className="flex flex-col items-start sm:items-end gap-2">
                        <span className="text-xs uppercase font-bold text-gray-600 dark:text-muted-foreground tracking-wider">
                            Target Model
                        </span>
                        <Select
                            value={rule.model}
                            onValueChange={(val) => onUpdate(viewName, { ...rule, model: val })}
                        >
                            <SelectTrigger className={cn(
                                "w-[200px] text-gray-900 dark:text-gray-100",
                                isLocked
                                    ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                                    : "border-gray-300 dark:border-gray-700"
                            )}>
                                <SelectValue placeholder="Select Model" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                                <SelectItem value="mark-3" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">
                                    Mark-3 (Precision)
                                </SelectItem>
                                <SelectItem value="mark-2.5" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">
                                    Mark-2.5 (Balanced)
                                </SelectItem>
                                <SelectItem value="mark-2" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">
                                    Mark-2 (Speed)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Strict Lock Toggle */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs uppercase font-bold text-gray-600 dark:text-muted-foreground tracking-wider">
                            Strict Lock
                        </span>
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={rule.locked}
                                onCheckedChange={(checked) => onUpdate(viewName, { ...rule, locked: checked })}
                                className={cn(
                                    isLocked
                                        ? "data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-600"
                                        : ""
                                )}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                {isLocked ? "On" : "Off"}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>


            {isLocked && (
                <div className="px-6 pb-4">
                    <div className={cn(
                        "flex items-start gap-2 p-3 rounded-lg border text-sm",
                        "bg-blue-50 border-blue-200 text-blue-800",
                        "dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                    )}>
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>This rule is enforced and cannot be overridden by individual operators.</span>
                    </div>
                </div>
            )}
        </Card>
    );
}
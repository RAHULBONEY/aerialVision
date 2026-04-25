import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Undo2 } from "lucide-react";

export default function SaveBanner({ hasChanges, onSave, onReset, isSaving }) {
    if (!hasChanges) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50">
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm truncate">Unsaved Changes</span>
                        <span className="text-xs text-slate-400 truncate">Policies have been modified locally.</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        disabled={isSaving}
                        className="text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                        <Undo2 className="w-4 h-4 mr-1.5" />
                        Discard
                    </Button>
                    <Button
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-500 text-white"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                        Apply
                    </Button>
                </div>
            </div>
        </div>
    );
}

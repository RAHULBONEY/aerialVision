import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Undo2 } from "lucide-react";

export default function SaveBanner({ hasChanges, onSave, onReset, isSaving }) {
    if (!hasChanges) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-foreground text-background p-4 rounded-xl shadow-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">Unsaved Changes</span>
                        <span className="text-xs text-muted-foreground">Policies have been modified locally.</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        disabled={isSaving}
                        className="text-muted-foreground hover:text-background"
                    >
                        <Undo2 className="w-4 h-4 mr-2" />
                        Discard
                    </Button>
                    <Button
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Apply Config
                    </Button>
                </div>
            </div>
        </div>
    );
}
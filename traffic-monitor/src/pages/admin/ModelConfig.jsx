import React, { useState, useEffect } from "react";
import { useConfigDashboard, useUpdatePolicy } from "@/hooks/useModelConfig";
import { Shield, Server, Activity, AlertTriangle } from "lucide-react";
import ModelCard from "@/components/admin/config/ModalCard";
import PolicyRuleRow from "@/components/admin/config/PolicyRuleRow";
import SaveBanner from "@/components/admin/config/SaveBanner";

export default function ModelConfig() {
    const { data: serverPolicy, isLoading } = useConfigDashboard();
    const updatePolicyMutation = useUpdatePolicy();

    const [draftPolicy, setDraftPolicy] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (serverPolicy && !draftPolicy) {
            setDraftPolicy(serverPolicy);
        }
    }, [serverPolicy, draftPolicy]);

    useEffect(() => {
        if (!serverPolicy || !draftPolicy) return;
        const isDifferent = JSON.stringify(serverPolicy) !== JSON.stringify(draftPolicy);
        setHasChanges(isDifferent);
    }, [draftPolicy, serverPolicy]);

    const handleModelToggle = (modelId, newStatus) => {
        setDraftPolicy(prev => ({
            ...prev,
            models: {
                ...prev.models,
                [modelId]: { ...prev.models[modelId], status: newStatus }
            }
        }));
    };

    const handleRuleUpdate = (viewName, newRule) => {
        setDraftPolicy(prev => ({
            ...prev,
            perView: {
                ...prev.perView,
                [viewName]: newRule
            }
        }));
    };

    const handleSave = () => {
        const { success, ...policyToSave } = draftPolicy;
        updatePolicyMutation.mutate(policyToSave, {
            onSuccess: () => setHasChanges(false),
        });
    };

    const handleReset = () => {
        setDraftPolicy(serverPolicy);
        setHasChanges(false);
    };

    if (isLoading || !draftPolicy) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-8 pb-24">
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    <Shield className="w-7 h-7 lg:w-8 lg:h-8 text-blue-600" />
                    Governance Engine
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-base lg:text-lg max-w-2xl">
                    Configure global AI enforcement policies, manage model lifecycles, and control detection parameters.
                </p>
            </div>

            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Server className="w-4 h-4 text-slate-400" />
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model Registry</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {Object.entries(draftPolicy.models).map(([key, model]) => (
                        <ModelCard
                            key={key}
                            id={key}
                            model={model}
                            onToggle={handleModelToggle}
                        />
                    ))}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enforcement Rules</h2>
                </div>
                <div className="space-y-4">
                    {Object.entries(draftPolicy.perView).map(([view, rule]) => (
                        <PolicyRuleRow
                            key={view}
                            viewName={view}
                            rule={rule}
                            onUpdate={handleRuleUpdate}
                        />
                    ))}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Notices</h2>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                        <span className="text-amber-500 mt-1">•</span>
                        <p className="text-slate-600 dark:text-slate-400">
                            <strong className="text-amber-600 dark:text-amber-400">Experimental models (Mark-4, Mark-5)</strong> may reduce FPS and increase compute costs.
                        </p>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                        <span className="text-blue-500 mt-1">•</span>
                        <p className="text-slate-600 dark:text-slate-400">
                            Policy changes apply to <strong>new streams only</strong>. Existing streams retain their current model.
                        </p>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                        <span className="text-emerald-500 mt-1">•</span>
                        <p className="text-slate-600 dark:text-slate-400">
                            <strong className="text-emerald-600 dark:text-emerald-400">Mark-3</strong> is the locked production default for mission-critical deployments.
                        </p>
                    </div>
                </div>
            </section>

            <SaveBanner
                hasChanges={hasChanges}
                onSave={handleSave}
                onReset={handleReset}
                isSaving={updatePolicyMutation.isPending}
            />
        </div>
    );
}

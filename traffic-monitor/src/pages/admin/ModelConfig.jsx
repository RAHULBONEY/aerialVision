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

        setDraftPolicy(prev => {
            const next = {
                ...prev,
                models: {
                    ...prev.models,
                    [modelId]: { ...prev.models[modelId], status: newStatus }
                }
            };

            return next;
        });
    };

    const handleRuleUpdate = (viewName, newRule) => {

        setDraftPolicy(prev => {
            const next = {
                ...prev,
                perView: {
                    ...prev.perView,
                    [viewName]: newRule
                }
            };

            return next;
        });
    };

    const handleSave = () => {
        const { success, ...policyToSave } = draftPolicy;


        updatePolicyMutation.mutate(policyToSave, {
            onSuccess: () => {

                setHasChanges(false);
            },
        });
    };

    const handleReset = () => {
        setDraftPolicy(serverPolicy);
        setHasChanges(false);
    };

    if (isLoading || !draftPolicy) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-10 bg-gray-50 dark:bg-gray-950 min-h-screen pb-32">


            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-600" />
                    Governance Engine
                </h1>
                <p className="text-gray-500 mt-2 text-lg max-w-2xl">
                    Configure global AI enforcement policies, manage model lifecycles, and control detection parameters.
                </p>
            </div>


            <section>
                <div className="flex items-center gap-2 mb-5">
                    <Server className="w-5 h-5 text-gray-400" />
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Model Registry</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className="flex items-center gap-2 mb-5">
                    <Activity className="w-5 h-5 text-gray-400" />
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Enforcement Rules</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            {/* Warnings Section */}
            <section className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">System Notices</h2>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                        <span className="text-amber-500">•</span>
                        <p className="text-gray-600 dark:text-gray-400">
                            <strong className="text-amber-600 dark:text-amber-400">Experimental models (Mark-4, Mark-5)</strong> may reduce FPS and increase compute costs.
                        </p>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                        <span className="text-blue-500">•</span>
                        <p className="text-gray-600 dark:text-gray-400">
                            Policy changes apply to <strong>new streams only</strong>. Existing streams retain their current model.
                        </p>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                        <span className="text-green-500">•</span>
                        <p className="text-gray-600 dark:text-gray-400">
                            <strong className="text-green-600 dark:text-green-400">Mark-3</strong> is the locked production default for mission-critical deployments.
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
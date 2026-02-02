import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    Target,
    AlertTriangle,
    CheckCircle2,
    AlertCircle,
    Eye,
    Satellite,
    MapPin,
    Filter
} from "lucide-react";
import { benchmarkData, getPerformanceScore, formatNumber, getVerdict } from "@/lib/benchmarkData";

const VIEW_FILTERS = [
    { id: "all", label: "All Views", icon: Eye },
    { id: "aerial", label: "Aerial", icon: Satellite },
    { id: "ground", label: "Ground", icon: MapPin },
];

function StatCard({ icon: Icon, label, value }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
                </div>
            </div>
        </div>
    );
}

export default function Metrics() {
    const [view, setView] = useState("all");
    const [sortBy, setSortBy] = useState("performance");

    const rows = useMemo(() => {
        let filtered = benchmarkData.filter(
            (r) => view === "all" || r.view === view
        );

        if (sortBy === "detections") {
            filtered.sort((a, b) => b.total_detections - a.total_detections);
        } else if (sortBy === "emergency") {
            filtered.sort((a, b) => {
                const ratioA = b.emergency_detections / b.total_detections;
                const ratioB = a.emergency_detections / a.total_detections;
                return ratioB - ratioA;
            });
        } else if (sortBy === "performance") {
            filtered.sort((a, b) => getPerformanceScore(b) - getPerformanceScore(a));
        }

        return filtered;
    }, [view, sortBy]);

    const summary = useMemo(() => {
        const allRows = view === "all" ? benchmarkData : rows;
        const totalDetections = allRows.reduce((sum, r) => sum + r.total_detections, 0);
        const totalEmergency = allRows.reduce((sum, r) => sum + r.emergency_detections, 0);

        return {
            totalDetections: formatNumber(totalDetections),
            emergencyRate: ((totalEmergency / totalDetections) * 100).toFixed(1),
        };
    }, [view, rows]);

    const bestModel = useMemo(() => {
        return rows.reduce((best, current) =>
            getPerformanceScore(current) > getPerformanceScore(best) ? current : best
        );
    }, [rows]);

    return (
        <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    Model Benchmark Results
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Detection accuracy on aerial & ground videos (GTX 1650 training results)
                </p>
            </div>

            {/* View Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-slate-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">View Filters</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {VIEW_FILTERS.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setView(filter.id)}
                            className={cn(
                                "px-4 py-2 rounded-lg border text-sm flex items-center gap-2",
                                view === filter.id
                                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                                    : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                            )}
                        >
                            <filter.icon className="w-4 h-4" />
                            {filter.label}
                        </button>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sort By</span>
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-slate-100"
                    >
                        <option value="performance">Performance Score</option>
                        <option value="detections">Detections (High to Low)</option>
                        <option value="emergency">Emergency Rate (High to Low)</option>
                    </select>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid md:grid-cols-2 gap-4">
                <StatCard icon={Target} label="Total Detections" value={summary.totalDetections} />
                <StatCard icon={AlertTriangle} label="Emergency Rate" value={summary.emergencyRate + '%'} />
            </div>

            {/* Top Model Banner */}
            {bestModel && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Top Model:</strong> {bestModel.model} ({bestModel.view} view) with {getPerformanceScore(bestModel)}/100 score
                    </p>
                </div>
            )}

            {/* Benchmark Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Detailed Results</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Model</th>
                                <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">View</th>
                                <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Detections</th>
                                <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Emergency</th>
                                <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Emergency %</th>
                                <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Performance</th>
                                <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Verdict</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => {
                                const verdict = getVerdict(row);
                                const Icon = verdict.icon;
                                const emergencyRate = ((row.emergency_detections / row.total_detections) * 100).toFixed(1);
                                const performanceScore = getPerformanceScore(row);

                                return (
                                    <tr
                                        key={`${row.model}-${row.view}-${index}`}
                                        className={cn(
                                            "border-t border-slate-200 dark:border-slate-700",
                                            index % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-800/50"
                                        )}
                                    >
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                                    row.model.includes("Mark-5") ? "bg-purple-100 dark:bg-purple-900/30" :
                                                        row.model.includes("Mark-4") ? "bg-amber-100 dark:bg-amber-900/30" :
                                                            row.model.includes("Mark-3") ? "bg-blue-100 dark:bg-blue-900/30" :
                                                                row.model.includes("Mark-2.5") ? "bg-emerald-100 dark:bg-emerald-900/30" :
                                                                    row.model.includes("Mark-2") ? "bg-amber-100 dark:bg-amber-900/30" :
                                                                        "bg-slate-100 dark:bg-slate-700"
                                                )}>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        {row.model.charAt(row.model.length - 1)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-slate-800 dark:text-slate-200">{row.model}</p>
                                                        {row.isExperimental && (
                                                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded font-medium">
                                                                🧪 EXP
                                                            </span>
                                                        )}
                                                        {row.model === "Mark-3" && (
                                                            <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded font-medium">
                                                                🔒 PROD
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{row.modelId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className={cn(
                                                "inline-flex items-center gap-1 px-2 py-1 rounded text-xs capitalize",
                                                row.view === "aerial"
                                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                                    : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                            )}>
                                                {row.view === "aerial" ? (
                                                    <Satellite className="w-3 h-3" />
                                                ) : (
                                                    <MapPin className="w-3 h-3" />
                                                )}
                                                {row.view}
                                            </div>
                                        </td>
                                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                            {formatNumber(row.total_detections)}
                                        </td>
                                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                            {formatNumber(row.emergency_detections)}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                                    <div
                                                        className={cn(
                                                            "h-1.5 rounded-full",
                                                            emergencyRate > 60 ? "bg-green-500" :
                                                                emergencyRate > 30 ? "bg-amber-500" : "bg-red-500"
                                                        )}
                                                        style={{ width: `${Math.min(100, emergencyRate)}%` }}
                                                    />
                                                </div>
                                                <span className="font-medium text-slate-800 dark:text-slate-200">{emergencyRate}%</span>
                                            </div>
                                        </td>
                                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                            {performanceScore}/100
                                        </td>
                                        <td className="p-3">
                                            <div className={cn(
                                                "inline-flex items-center gap-1 px-2 py-1 rounded border text-xs",
                                                verdict.bgColor,
                                                verdict.borderColor,
                                                verdict.color
                                            )}>
                                                <Icon className="w-3 h-3" />
                                                {verdict.label}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Final Recommendation */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">Production Recommendation</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    Based on detection accuracy and emergency recognition performance, Mark-3 is selected for production streams.
                    It provides the best balance of detection reliability and emergency recognition across both aerial and ground views.
                    Mark-2.5 remains suitable for high-accuracy ground feed applications.
                </p>
                <div className="grid md:grid-cols-4 gap-3 mt-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                            <h4 className="font-medium text-slate-800 dark:text-slate-200">Selected</h4>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Mark-3 for production</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                            <h4 className="font-medium text-slate-800 dark:text-slate-200">Backup</h4>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Mark-2.5 for ground feeds</p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-purple-600 dark:text-purple-500" />
                            <h4 className="font-medium text-slate-800 dark:text-slate-200">Experimental</h4>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Mark-4 & Mark-5 (research)</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-500" />
                            <h4 className="font-medium text-slate-800 dark:text-slate-200">Not Recommended</h4>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Mark-1 due to low accuracy</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
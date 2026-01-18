import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle
} from "lucide-react";

export const benchmarkData = [
  {
    model: "Mark-1",
    modelId: "mark-1",
    view: "ground",
    frames: 469,
    total_detections: 74,
    emergency_detections: 28,
    classCounts: {
      car: 0,
      truck: 70,
      bus: 4,
    },
  },
  {
    model: "Mark-2",
    modelId: "mark-2",
    view: "aerial",
    frames: 447,
    total_detections: 15859,
    emergency_detections: 12746,
    classCounts: {
      car: 15674,
      bus: 184,
      truck: 1,
    },
  },
  {
    model: "Mark-2",
    modelId: "mark-2",
    view: "ground",
    frames: 469,
    total_detections: 1680,
    emergency_detections: 1453,
    classCounts: {
      car: 1430,
      truck: 223,
      bus: 27,
    },
  },
  {
    model: "Mark-2.5",
    modelId: "mark-2.5",
    view: "aerial",
    frames: 447,
    total_detections: 985,
    emergency_detections: 590,
    classCounts: {
      car: 704,
      truck: 281,
      bus: 0,
    },
  },
  {
    model: "Mark-2.5",
    modelId: "mark-2.5",
    view: "ground",
    frames: 469,
    total_detections: 4299,
    emergency_detections: 962,
    classCounts: {
      car: 3970,
      truck: 327,
      bus: 2,
    },
  },
  {
    model: "Mark-3",
    modelId: "mark-3",
    view: "aerial",
    frames: 447,
    total_detections: 8120,
    emergency_detections: 5340,
    classCounts: {
      car: 7600,
      truck: 420,
      bus: 100,
    },
  },
  {
    model: "Mark-3",
    modelId: "mark-3",
    view: "ground",
    frames: 469,
    total_detections: 6120,
    emergency_detections: 1800,
    classCounts: {
      car: 5400,
      truck: 600,
      bus: 120,
    },
  },
];

export function getEmergencyRatio(entry) {
  if (!entry.total_detections) return 0;
  return Math.round((entry.emergency_detections / entry.total_detections) * 100);
}

export function getPerformanceScore(row) {
  const detectionScore = Math.min(row.total_detections / 10000, 1) * 60;
  const emergencyScore = (row.emergency_detections / row.total_detections) * 40;
  return Math.round(detectionScore + emergencyScore);
}

export function formatNumber(num) {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toFixed(1);
}

export function getVerdict(row) {
  const accuracy = row.total_detections / row.frames;
  if (accuracy > 15) return { 
    label: "High Accuracy", 
    color: "text-green-600 dark:text-green-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    icon: CheckCircle2 
  };
  if (accuracy > 8) return { 
    label: "Medium Accuracy", 
    color: "text-amber-600 dark:text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    icon: AlertTriangle 
  };
  return { 
    label: "Low Accuracy", 
    color: "text-red-600 dark:text-red-500",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    icon: AlertCircle 
  };
}
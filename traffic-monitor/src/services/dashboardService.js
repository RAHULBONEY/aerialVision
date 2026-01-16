// src/services/dashboardService.js

// Simulate network delay to test loading states
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const DashboardService = {
  getStats: async () => {
    await delay(1200); // Simulate API latency
    return {
      congestionLevel: "HIGH",
      congestionScore: 78, // 0-100
      activeVehicles: 142,
      avgSpeed: 32, // km/h
      activeCameras: 8,
      systemStatus: "OPERATIONAL"
    };
  },

  getIncidents: async () => {
    await delay(1500);
    return [
      { id: 1, type: "SOS", message: "Ambulance Detected: Route 4 cleared", time: "2m ago", status: "ACTIVE" },
      { id: 2, type: "ACCIDENT", message: "Vehicle Stalled: Sector 7", time: "15m ago", status: "PENDING" },
      { id: 3, type: "CONGESTION", message: "Traffic flow normalized at North Gate", time: "1h ago", status: "RESOLVED" },
    ];
  }
};
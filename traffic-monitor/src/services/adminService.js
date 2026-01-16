// src/services/adminService.js

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const AdminService = {
  // 1. Fetch all registered operators
  getUsers: async () => {
    await delay(1000);
    return [
      { uid: 'OP-884', name: 'Officer Rahul', email: 'rahul@police.gov', role: 'TRAFFIC_POLICE', status: 'ACTIVE', lastLogin: '2 mins ago' },
      { uid: 'OP-102', name: 'Central Hospital', email: 'dispatch@hospital.com', role: 'EMERGENCY', status: 'ACTIVE', lastLogin: '1 hr ago' },
      { uid: 'OP-001', name: 'System Admin', email: 'root@aerialvision.com', role: 'ADMIN', status: 'ACTIVE', lastLogin: 'Now' },
      { uid: 'OP-999', name: 'Officer Vikram', email: 'vikram@police.gov', role: 'TRAFFIC_POLICE', status: 'SUSPENDED', lastLogin: '5 days ago' },
    ];
  },

  // 2. Fetch technical system health metrics
  getSystemHealth: async () => {
    await delay(800);
    return {
      serverUptime: "99.98%",
      apiLatency: "45ms",
      databaseStatus: "HEALTHY",
      aiModelStatus: "RUNNING",
      activeConnections: 342,
      storageUsage: "45%"
    };
  },

  // 3. Security Audit Logs
  getAuditLogs: async () => {
    await delay(600);
    return [
      { id: 1, action: "USER_LOGIN", user: "Officer Rahul", ip: "192.168.1.45", time: "10:42:01", status: "SUCCESS" },
      { id: 2, action: "SOS_TRIGGER", user: "Officer Rahul", ip: "192.168.1.45", time: "10:45:12", status: "WARN" },
      { id: 3, action: "USER_CREATE", user: "Admin", ip: "10.0.0.1", time: "09:15:00", status: "SUCCESS" },
      { id: 4, action: "FAILED_LOGIN", user: "Unknown", ip: "45.22.11.0", time: "03:12:44", status: "CRITICAL" },
    ];
  }
};
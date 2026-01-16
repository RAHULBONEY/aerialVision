// src/services/hospitalService.js

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const HospitalService = {
  // 1. Hospital Resource Status
  getStats: async () => {
    await delay(1000);
    return {
      icuBeds: { available: 2, total: 12 },
      erBeds: { available: 5, total: 20 },
      ambulancesActive: 3,
      incomingPatients: 2,
    };
  },

  // 2. Active Ambulance Feeds (GPS + Patient Data)
  getActiveAmbulances: async () => {
    await delay(1200);
    return [
      { 
        id: "AMB-04", 
        location: "Sector 4 Highway", 
        status: "IN_TRANSIT", 
        eta: "4 mins", 
        patientCondition: "CRITICAL", 
        vitals: { hr: 120, bp: "140/90", spo2: "92%" },
        destination: "Central Trauma Center" 
      },
      { 
        id: "AMB-01", 
        location: "Main Market Rd", 
        status: "RETURNING", 
        eta: "12 mins", 
        patientCondition: "STABLE", 
        vitals: null,
        destination: "Base" 
      }
    ];
  }
};
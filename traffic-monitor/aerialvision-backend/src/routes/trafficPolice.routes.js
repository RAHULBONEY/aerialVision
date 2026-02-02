const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { requireRole, ROLES } = require("../middleware/rbac");
const { listTrafficPolice } = require("../controllers/trafficPolice.controller");
const {
  createPatrolUnit,
  getAllPatrolUnits,
  getPatrolUnit,
  updateLocation,
  updateStatus,
  dispatchToIncident,
  deletePatrolUnit,
} = require("../controllers/patrolUnits.controller");

// All routes require authentication and TRAFFIC_POLICE role
router.use(authenticateToken);
router.use(requireRole(ROLES.POLICE_AND_ADMIN));

// GET /api/traffic-police - List all active traffic police officers
router.get("/", listTrafficPolice);

// ============== PATROL UNITS ==============

// POST /api/traffic-police/patrol-units - Create a new patrol unit
router.post("/patrol-units", createPatrolUnit);

// GET /api/traffic-police/patrol-units - Get all patrol units
router.get("/patrol-units", getAllPatrolUnits);

// GET /api/traffic-police/patrol-units/:id - Get a specific patrol unit
router.get("/patrol-units/:id", getPatrolUnit);

// PATCH /api/traffic-police/patrol-units/:id/location - Update unit location
router.patch("/patrol-units/:id/location", updateLocation);

// PATCH /api/traffic-police/patrol-units/:id/status - Update unit status
router.patch("/patrol-units/:id/status", updateStatus);

// PATCH /api/traffic-police/patrol-units/:id/dispatch - Dispatch to incident
router.patch("/patrol-units/:id/dispatch", dispatchToIncident);

// DELETE /api/traffic-police/patrol-units/:id - Delete a patrol unit
router.delete("/patrol-units/:id", deletePatrolUnit);

module.exports = router;


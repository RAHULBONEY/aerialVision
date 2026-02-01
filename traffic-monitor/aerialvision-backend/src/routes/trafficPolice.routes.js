const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { requireRole, ROLES } = require("../middleware/rbac");
const { listTrafficPolice } = require("../controllers/trafficPolice.controller");

// All routes require authentication and TRAFFIC_POLICE role
router.use(authenticateToken);
router.use(requireRole(ROLES.POLICE_AND_ADMIN));

// GET /api/traffic-police - List all active traffic police officers
router.get("/", listTrafficPolice);

module.exports = router;

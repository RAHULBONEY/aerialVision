const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { listLoginHistory } = require("../controllers/loginHistory.controller");

router.use(authenticateToken);
// Only admins view overarching login history
router.use(requireRole(["ADMIN"]));

router.get("/login-history", listLoginHistory);

module.exports = router;

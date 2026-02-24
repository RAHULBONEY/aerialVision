const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { listAuditLogs } = require("../controllers/auditLogs.controller");

router.use(authenticateToken);
// Only admins should view audit logs
router.use(requireRole(["ADMIN"]));

router.get("/audit-logs", listAuditLogs);

module.exports = router;

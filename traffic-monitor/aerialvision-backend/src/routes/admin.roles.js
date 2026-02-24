const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/roles.controller");

router.use(authenticateToken);
router.use(requireRole(["ADMIN"]));

router.get("/roles", listRoles);
router.post("/roles", createRole);
router.patch("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

module.exports = router;

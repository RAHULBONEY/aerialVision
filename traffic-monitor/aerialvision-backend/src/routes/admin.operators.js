const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const {
  listOperators,
  createOperator,
  updateOperator,
  updateOperatorStatus,
  deleteOperator,
} = require("../controllers/adminOperators.controller");

router.use(authenticateToken);
router.use(requireRole(["ADMIN"]));

router.get("/operators", listOperators);
router.post("/operators", createOperator);
router.patch("/operators/:uid", updateOperator);
router.post("/operators/:uid/status", updateOperatorStatus);
router.delete("/operators/:uid", deleteOperator);

module.exports = router;

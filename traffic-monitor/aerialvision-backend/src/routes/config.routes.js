const express = require("express");
const router = express.Router();
const configController = require("../controllers/config.controller");
const { authenticateToken } = require("../middleware/auth");

router.post("/analyze", authenticateToken, configController.analyzeUrl);
router.get("/dashboard", configController.getDashboardData);
router.put("/update", authenticateToken, configController.updatePolicy);

module.exports = router;
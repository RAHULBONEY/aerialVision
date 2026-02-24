const router = require("express").Router();
const { authenticateToken } = require("../middleware/auth");
const ctrl = require("../controllers/streams.controller");

// router.get("/streams", ctrl.listStreams);
router.get('/streams', authenticateToken, ctrl.getActiveStreams);

module.exports = router;

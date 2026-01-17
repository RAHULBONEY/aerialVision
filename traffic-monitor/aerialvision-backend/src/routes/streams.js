const router = require("express").Router();
const { authenticateToken } = require("../middleware/auth");
const ctrl = require("../controllers/streams.controller");

router.use(authenticateToken);
router.get("/streams", ctrl.listStreams);

module.exports = router;

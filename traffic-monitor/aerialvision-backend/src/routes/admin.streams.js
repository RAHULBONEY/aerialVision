const router = require("express").Router();
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const ctrl = require("../controllers/streams.controller");

router.use(authenticateToken);
router.use(requireRole(["ADMIN"]));

router.get("/streams", ctrl.listStreams);
router.post("/streams", ctrl.createStream);
router.patch("/streams/:id", ctrl.updateStream);
router.delete("/streams/:id", ctrl.deleteStream);

module.exports = router;

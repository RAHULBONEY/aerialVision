const trafficPoliceService = require("../services/trafficPolice.service");

/**
 * GET /api/traffic-police
 * Fetch all active traffic police officers (excluding self)
 */
exports.listTrafficPolice = async (req, res) => {
  try {
    const currentUserId = req.user.uid;
    const officers = await trafficPoliceService.list(currentUserId);

    res.json({
      success: true,
      data: officers,
    });
  } catch (err) {
    console.error("Error fetching traffic police:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch traffic police directory",
    });
  }
};

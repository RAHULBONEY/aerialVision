const loginHistoryService = require("../services/loginHistory.service");

exports.listLoginHistory = async (req, res) => {
  try {
    const { 
      limit, 
      cursor, 
      role, 
      status,
      uid 
    } = req.query;

    const result = await loginHistoryService.list({
      limit,
      cursor,
      role,
      status,
      uid
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Error fetching login history:", err);
    res.status(500).json({ success: false, message: "Failed to fetch login history" });
  }
};

const auditLogsService = require("../services/auditLogs.service");

exports.listAuditLogs = async (req, res) => {
  try {
    const { 
      limit, 
      cursor, 
      category, 
      action,
      performedByUid 
    } = req.query;

    const result = await auditLogsService.list({
      limit,
      cursor,
      category,
      action,
      performedByUid
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
};

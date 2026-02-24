
const adminOperatorsService = require("../services/adminOperators.service");
const auditLogsService = require("../services/auditLogs.service");

exports.listOperators = async (req, res) => {
  try {
    const operators = await adminOperatorsService.list(req.query);
    
    res.json({ success: true, data: operators });
    
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createOperator = async (req, res) => {
  try {
    const operator = await adminOperatorsService.create(req.body, req.user.uid);
    auditLogsService.logAction({
      action: "CREATE_OPERATOR",
      category: "OPERATORS",
      performedBy: req.user,
      targetId: operator.uid,
      targetName: operator.name || operator.email,
      details: { role: operator.role, accessLevel: operator.accessLevel }
    });
    res.status(201).json({ success: true, data: operator });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateOperator = async (req, res) => {
  try {
    const operator = await adminOperatorsService.update(
      req.params.uid,
      req.body
    );
    auditLogsService.logAction({
      action: "UPDATE_OPERATOR",
      category: "OPERATORS",
      performedBy: req.user,
      targetId: operator.uid,
      targetName: operator.name || operator.email,
      details: req.body
    });
    res.json({ success: true, data: operator });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateOperatorStatus = async (req, res) => {
  try {
    await adminOperatorsService.updateStatus(
      req.params.uid,
      req.body.status
    );
    auditLogsService.logAction({
      action: "UPDATE_OPERATOR_STATUS",
      category: "OPERATORS",
      performedBy: req.user,
      targetId: req.params.uid,
      targetName: `Operator ID: ${req.params.uid}`,
      details: { status: req.body.status }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteOperator = async (req, res) => {
  try {
    await adminOperatorsService.softDelete(req.params.uid);
    auditLogsService.logAction({
      action: "DELETE_OPERATOR",
      category: "OPERATORS",
      performedBy: req.user,
      targetId: req.params.uid,
      targetName: `Operator ID: ${req.params.uid}`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

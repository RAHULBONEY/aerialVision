
const adminOperatorsService = require("../services/adminOperators.service");

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
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteOperator = async (req, res) => {
  try {
    await adminOperatorsService.softDelete(req.params.uid);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

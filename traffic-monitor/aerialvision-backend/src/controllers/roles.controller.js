const rolesService = require("../services/roles.service");
const auditLogsService = require("../services/auditLogs.service");

exports.listRoles = async (req, res) => {
  try {
    const roles = await rolesService.list();
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createRole = async (req, res) => {
  try {
    const role = await rolesService.create(req.body, req.user.uid);
    auditLogsService.logAction({
      action: "CREATE_ROLE",
      category: "ROLES",
      performedBy: req.user,
      targetId: role.uid,
      targetName: role.name,
      details: { permissions: role.permissions, accessLevel: role.accessLevel }
    });
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const role = await rolesService.update(req.params.id, req.body);
    auditLogsService.logAction({
      action: "UPDATE_ROLE",
      category: "ROLES",
      performedBy: req.user,
      targetId: role.uid,
      targetName: role.name,
      details: req.body
    });
    res.json({ success: true, data: role });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    await rolesService.delete(req.params.id);
    auditLogsService.logAction({
      action: "DELETE_ROLE",
      category: "ROLES",
      performedBy: req.user,
      targetId: req.params.id,
      targetName: `Role ID: ${req.params.id}`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

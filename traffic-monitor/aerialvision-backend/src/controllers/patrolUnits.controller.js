const patrolUnitsService = require("../services/patrolUnits.service");

exports.createPatrolUnit = async (req, res) => {
  try {
    const createdByUid = req.user.uid;
    const unit = await patrolUnitsService.create(req.body, createdByUid);

    res.status(201).json({
      success: true,
      data: unit,
      message: "Patrol unit created successfully",
    });
  } catch (err) {
    console.error("Error creating patrol unit:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to create patrol unit",
    });
  }
};

exports.getAllPatrolUnits = async (req, res) => {
  try {
    const units = await patrolUnitsService.getAll();

    res.json({
      success: true,
      data: units,
      count: units.length,
    });
  } catch (err) {
    console.error("Error fetching patrol units:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch patrol units",
    });
  }
};

exports.getPatrolUnit = async (req, res) => {
  try {
    const unit = await patrolUnitsService.getById(req.params.id);

    res.json({
      success: true,
      data: unit,
    });
  } catch (err) {
    console.error("Error fetching patrol unit:", err);
    res.status(404).json({
      success: false,
      message: err.message || "Patrol unit not found",
    });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { location } = req.body;
    const unit = await patrolUnitsService.updateLocation(req.params.id, location);

    res.json({
      success: true,
      data: unit,
      message: "Location updated successfully",
    });
  } catch (err) {
    console.error("Error updating location:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to update location",
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const unit = await patrolUnitsService.updateStatus(req.params.id, status);

    res.json({
      success: true,
      data: unit,
      message: "Status updated successfully",
    });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to update status",
    });
  }
};

exports.dispatchToIncident = async (req, res) => {
  try {
    const { incidentId } = req.body;
    const userId = req.user.uid;
    const userName = req.user.name || req.user.email;
    
    const unit = await patrolUnitsService.dispatchToIncident(req.params.id, incidentId, userId, userName);

    res.json({
      success: true,
      data: unit,
      message: incidentId
        ? "Unit dispatched to incident"
        : "Unit unassigned from incident",
    });
  } catch (err) {
    console.error("Error dispatching unit:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to dispatch unit",
    });
  }
};

exports.deletePatrolUnit = async (req, res) => {
  try {
    await patrolUnitsService.remove(req.params.id);

    res.json({
      success: true,
      message: "Patrol unit deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting patrol unit:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to delete patrol unit",
    });
  }
};

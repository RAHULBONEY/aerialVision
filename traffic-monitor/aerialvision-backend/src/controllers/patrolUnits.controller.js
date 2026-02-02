const patrolUnitsService = require("../services/patrolUnits.service");

/**
 * Create a new patrol unit
 * POST /api/traffic-police/patrol-units
 */
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

/**
 * Get all patrol units
 * GET /api/traffic-police/patrol-units
 */
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

/**
 * Get a single patrol unit
 * GET /api/traffic-police/patrol-units/:id
 */
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

/**
 * Update patrol unit location
 * PATCH /api/traffic-police/patrol-units/:id/location
 */
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

/**
 * Update patrol unit status
 * PATCH /api/traffic-police/patrol-units/:id/status
 */
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

/**
 * Dispatch patrol unit to an incident
 * PATCH /api/traffic-police/patrol-units/:id/dispatch
 */
exports.dispatchToIncident = async (req, res) => {
  try {
    const { incidentId } = req.body;
    const unit = await patrolUnitsService.dispatchToIncident(req.params.id, incidentId);

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

/**
 * Delete a patrol unit
 * DELETE /api/traffic-police/patrol-units/:id
 */
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

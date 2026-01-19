const configService = require("../services/config.service");
exports.analyzeUrl = async (req, res) => {
  try {
    const { sourceUrl, requestedModel ,manualViewType} = req.body;

    let finalViewType = "GROUND";
    if (manualViewType) {
      finalViewType = manualViewType;
    } else {
    finalViewType = await configService.detectViewType(sourceUrl);
    }
    const enforcement = await configService.getEnforcedModel(requestedModel, finalViewType);
    res.json({
      success: true,
      detectedView: finalViewType,
      recommendedModel: enforcement.model,
      isLocked: enforcement.isLocked,
      reason: enforcement.reason
    });

  } catch (error) {
    console.error("Analyze Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.getDashboardData = async (req, res) => {
  try {
    const policy = await configService.getGovernancePolicy();
    res.json({
      success: true,
      models: policy.models,
      perView: policy.perView,
      benchmarks: policy.benchmarks 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const newPolicy = req.body;
    // console.log("📩 /api/config/update body:", JSON.stringify(req.body, null, 2));
    // console.log("📩 Body keys:", Object.keys(req.body));

    
    await configService.updateGovernancePolicy(newPolicy);

    res.json({
      success: true,
      message: "Governance policy updated successfully"
    });

  } catch (error) {
    console.error("Policy Update Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
const service = require("../services/streams.services.js");
const auditLogsService = require("../services/auditLogs.service");

exports.createStream = async (req, res) => {
  try {
    const stream = await service.create(req.body, req.user.uid);
    auditLogsService.logAction({
      action: "CREATE_STREAM",
      category: "STREAMS",
      performedBy: req.user,
      targetId: stream.id,
      targetName: stream.name,
      details: req.body
    });
    res.status(201).json({ success: true, data: stream });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
exports.proxyStream = async (req, res) => {
  const { id } = req.params;
  const AI_ENGINE_URL = process.env.AI_ENGINE_URL;

  const response = await fetch(`${AI_ENGINE_URL}/streams/${id}`, {
    headers: {
      "ngrok-skip-browser-warning": "true",
      "Connection": "keep-alive"
    }
  });

  if (!response.ok) {
    res.status(response.status).end("Stream unreachable");
    return;
  }

  res.writeHead(200, {
    "Content-Type": "multipart/x-mixed-replace; boundary=frame",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Connection": "keep-alive",
    "Transfer-Encoding": "chunked",
    "X-Accel-Buffering": "no"
  });

  response.body.pipe(res);
};

exports.listStreams = async (req, res) => {
  try {
    const streams = await service.list(req.user);
    res.json({ success: true, data: streams });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateStream = async (req, res) => {
  try {
    const stream = await service.update(req.params.id, req.body);
    auditLogsService.logAction({
      action: "UPDATE_STREAM",
      category: "STREAMS",
      performedBy: req.user,
      targetId: stream.id || req.params.id,
      targetName: stream.name || `Stream ID: ${req.params.id}`,
      details: req.body
    });
    res.json({ success: true, data: stream });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.deleteStream = async (req, res) => {
  try {
    await service.remove(req.params.id);
    auditLogsService.logAction({
      action: "DELETE_STREAM",
      category: "STREAMS",
      performedBy: req.user,
      targetId: req.params.id,
      targetName: `Stream ID: ${req.params.id}`
    });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
//for non-admins
exports.getActiveStreams = async (req, res) => {
  try {
    const streams = await service.listActive();
    res.status(200).json({ success: true, data: streams });
  } catch (e) {
    console.error("Fetch Active Streams Error:", e);
    res.status(500).json({ success: false, message: "Failed to load live feeds" });
  }
};
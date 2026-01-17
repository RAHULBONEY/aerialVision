const service = require("../services/streams.services.js");

exports.createStream = async (req, res) => {
  try {
    const stream = await service.create(req.body, req.user.uid);
    res.status(201).json({ success: true, data: stream });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
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
    res.json({ success: true, data: stream });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.deleteStream = async (req, res) => {
  try {
    await service.remove(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

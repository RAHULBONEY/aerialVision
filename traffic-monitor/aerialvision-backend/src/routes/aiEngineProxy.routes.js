const express = require('express');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const router = express.Router();

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || process.env.GATEWAY_URL || 'http://127.0.0.1:8001';

function pipeToAiEngine(req, res, targetPath) {
  const targetUrl = new URL(targetPath, AI_ENGINE_URL);
  const isHttps = targetUrl.protocol === 'https:';
  const lib = isHttps ? https : http;

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isHttps ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.host
    }
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    Object.keys(proxyRes.headers).forEach(key => {
      res.set(key, proxyRes.headers[key]);
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[AI Engine Proxy] Error proxying ${req.method} ${targetPath}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ success: false, message: 'AI Engine unavailable' });
    }
  });

  req.pipe(proxyReq);
}

// Proxy video/simulation files (GET /api/streams/:filename)
router.get('/streams/:filename', (req, res) => {
  pipeToAiEngine(req, res, `/streams/${encodeURIComponent(req.params.filename)}`);
});

// Proxy simulation processing (POST /api/process-simulation)
router.post('/process-simulation', (req, res) => {
  pipeToAiEngine(req, res, '/process-simulation');
});

module.exports = router;

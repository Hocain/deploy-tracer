// ============================================================
// DeployTracer - Events Route (SSE Fallback)
// ============================================================
// SSE (Server-Sent Events) is a simpler alternative to
// WebSocket. The browser opens a persistent HTTP connection
// and the server pushes events down it. One-way only
// (server → browser), but perfect for our use case.
//
// We use this as a FALLBACK for environments where
// WebSocket might be blocked (corporate proxies, etc.)
// ============================================================

const express = require('express');
const db = require('../database');

const router = express.Router();

// ----------------------------------------------------------
// SSE Endpoint
// ----------------------------------------------------------
// URL: GET /api/events/stream
// Browser connects and receives real-time updates

router.get('/stream', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial data
  const recent = db.getRecentDeployments(10);
  res.write(`data: ${JSON.stringify({ type: 'INITIAL_STATE', data: recent })}\n\n`);

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// ----------------------------------------------------------
// Get events for a specific deployment
// ----------------------------------------------------------
// URL: GET /api/events/:deploymentId

router.get('/:deploymentId', (req, res) => {
  const deployment = db.getDeployment(req.params.deploymentId);

  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }

  res.json(deployment);
});

module.exports = router;

// ============================================================
// DeployTracer Backend - server.js
// ============================================================
// This is the brain of DeployTracer. It does 3 things:
//   1. Receives webhook events from GitHub Actions
//   2. Stores deployment pipeline events in SQLite
//   3. Broadcasts real-time updates via WebSocket
// ============================================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

// Import route handlers
const webhookRoutes = require('./routes/webhook');
const eventsRoutes = require('./routes/events');
const deploymentsRoutes = require('./routes/deployments');
const db = require('./database');

// ----------------------------------------------------------
// STEP 1: Initialize Express App
// ----------------------------------------------------------
const app = express();
const server = http.createServer(app);

// Parse JSON bodies (GitHub sends JSON webhooks)
app.use(express.json());

// Allow frontend to connect from different port during dev
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
}

// ----------------------------------------------------------
// STEP 2: Setup WebSocket Server
// ----------------------------------------------------------
// WebSocket = persistent connection between browser & server
// Unlike HTTP (request → response), WebSocket stays open
// so we can PUSH updates to the browser instantly.

const wss = new WebSocket.Server({ server, path: '/ws' });

// Track all connected browsers
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  clients.add(ws);

  // Send recent deployments on connect
  const recent = db.getRecentDeployments(10);
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    data: recent
  }));

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
  });
});

// Broadcast function - sends data to ALL connected browsers
function broadcast(event) {
  const message = JSON.stringify(event);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Make broadcast available to route handlers
app.set('broadcast', broadcast);

// ----------------------------------------------------------
// STEP 3: API Routes
// ----------------------------------------------------------

// Health check endpoint (for K8s liveness/readiness probes)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    connections: clients.size
  });
});

// Webhook endpoints (GitHub sends events here)
app.use('/api/webhook', webhookRoutes);

// Event streaming endpoints (frontend fetches data here)
app.use('/api/events', eventsRoutes);

// Deployment history endpoints
app.use('/api/deployments', deploymentsRoutes);

// Catch-all for SPA routing in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// ----------------------------------------------------------
// STEP 4: Start Server
// ----------------------------------------------------------
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║     🔍 DeployTracer Backend Running       ║
  ║                                           ║
  ║   HTTP:      http://localhost:${PORT}        ║
  ║   WebSocket: ws://localhost:${PORT}/ws       ║
  ║   Health:    http://localhost:${PORT}/api/health ║
  ╚═══════════════════════════════════════════╝
  `);
});
// webhook test
// new feature
// new feature

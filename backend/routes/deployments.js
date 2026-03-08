// ============================================================
// DeployTracer - Deployments Route
// ============================================================
// REST API for viewing deployment history.
// The frontend dashboard fetches data from here.
// ============================================================

const express = require('express');
const db = require('../database');

const router = express.Router();

// GET /api/deployments - List recent deployments
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const deployments = db.getRecentDeployments(limit);
  res.json(deployments);
});

// GET /api/deployments/:id - Get single deployment
router.get('/:id', (req, res) => {
  const deployment = db.getDeployment(req.params.id);
  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }
  res.json(deployment);
});

// GET /api/deployments/stages/list - Get valid stage names
router.get('/stages/list', (req, res) => {
  res.json(db.getStages());
});

module.exports = router;

// ============================================================
// DeployTracer - Webhook Routes
// ============================================================
// GitHub sends HTTP POST requests here whenever something
// happens in your repo. We listen for:
//   1. push events      → Create new deployment
//   2. workflow_run      → Track CI/CD progress
//   3. Custom events     → From our GitHub Actions workflow
//
// HOW GITHUB WEBHOOKS WORK:
//   You → git push → GitHub → POST /api/webhook/github → Us
//   GitHub sends a JSON payload with all the details about
//   what happened (commit, author, branch, etc.)
// ============================================================

const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

// ----------------------------------------------------------
// Webhook Signature Verification
// ----------------------------------------------------------
// GitHub signs every webhook with your secret key.
// This ensures no one else can fake webhook calls.

function verifyGitHubSignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true; // Skip in development

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// ----------------------------------------------------------
// ROUTE 1: GitHub Push/Workflow Webhook
// ----------------------------------------------------------
// URL: POST /api/webhook/github
// GitHub sends this when you push code or workflow updates

router.post('/github', (req, res) => {
  // Verify the webhook is actually from GitHub
  if (!verifyGitHubSignature(req)) {
    console.error('❌ Invalid webhook signature!');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;
  const broadcast = req.app.get('broadcast');

  console.log(`📨 Received GitHub event: ${event}`);

  switch (event) {
    // --------------------------------------------------
    // PUSH EVENT: Someone pushed code
    // --------------------------------------------------
    case 'push': {
      const deployId = uuidv4();
      const headCommit = payload.head_commit;

      const deployment = db.createDeployment({
        id: deployId,
        commitSha: headCommit?.id?.substring(0, 7) || 'unknown',
        commitMsg: headCommit?.message || 'No message',
        branch: payload.ref?.replace('refs/heads/', '') || 'main',
        author: payload.pusher?.name || 'unknown',
        authorAvatar: payload.sender?.avatar_url || '',
        repo: payload.repository?.full_name || ''
      });

      // Broadcast to all connected browsers immediately!
      broadcast({
        type: 'NEW_DEPLOYMENT',
        data: deployment
      });

      console.log(`🚀 New deployment created: ${deployId}`);

      // Return the deployment ID so GitHub Actions can use it
      return res.json({
        status: 'ok',
        deploymentId: deployId
      });
    }

    // --------------------------------------------------
    // WORKFLOW EVENT: CI/CD status update
    // --------------------------------------------------
    case 'workflow_run': {
      const { workflow_run } = payload;
      console.log(`⚙️ Workflow: ${workflow_run?.name} - ${workflow_run?.conclusion}`);
      return res.json({ status: 'ok' });
    }

    default:
      console.log(`ℹ️ Ignoring event: ${event}`);
      return res.json({ status: 'ignored' });
  }
});

// ----------------------------------------------------------
// ROUTE 2: Pipeline Stage Update
// ----------------------------------------------------------
// URL: POST /api/webhook/stage
// Our GitHub Actions workflow calls this at each stage
// to report progress back to DeployTracer.
//
// Body: {
//   deploymentId: "uuid",
//   stage: "ci_build",
//   status: "success" | "failed" | "in_progress",
//   message: "All tests passed"
// }

router.post('/stage', (req, res) => {
  const { deploymentId, stage, status, message, metadata } = req.body;

  // Validate required fields
  if (!deploymentId || !stage || !status) {
    return res.status(400).json({
      error: 'Missing required fields: deploymentId, stage, status'
    });
  }

  // Validate stage name
  const validStages = db.getStages();
  if (!validStages.includes(stage)) {
    return res.status(400).json({
      error: `Invalid stage. Must be one of: ${validStages.join(', ')}`
    });
  }

  // Update the database
  const deployment = db.addEvent(deploymentId, stage, status, message, metadata);

  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }

  // Broadcast the update to all browsers
  const broadcast = req.app.get('broadcast');
  broadcast({
    type: 'STAGE_UPDATE',
    data: deployment
  });

  console.log(`📊 Stage update: ${stage} → ${status} (${deploymentId.substring(0, 8)})`);

  return res.json({ status: 'ok', deployment });
});

// ----------------------------------------------------------
// ROUTE 3: Manual Deployment Trigger (for testing)
// ----------------------------------------------------------
// URL: POST /api/webhook/test
// Use this to test the pipeline without actually pushing code

router.post('/test', (req, res) => {
  const deployId = uuidv4();
  const broadcast = req.app.get('broadcast');

  const deployment = db.createDeployment({
    id: deployId,
    commitSha: crypto.randomBytes(3).toString('hex'),
    commitMsg: req.body.message || 'Test deployment',
    branch: req.body.branch || 'main',
    author: req.body.author || 'test-user',
    authorAvatar: '',
    repo: 'test/deploy-tracer'
  });

  broadcast({
    type: 'NEW_DEPLOYMENT',
    data: deployment
  });

  // Auto-simulate pipeline stages
  if (req.body.simulate) {
    simulateDeployment(deployId, broadcast);
  }

  res.json({ status: 'ok', deploymentId: deployId, deployment });
});

// Simulate a full pipeline for demo/testing
async function simulateDeployment(deployId, broadcast) {
  const stages = [
    { stage: 'ci_build', delay: 3000, msg: 'Running tests & building...' },
    { stage: 'ci_build', delay: 5000, msg: 'All 42 tests passed ✓', status: 'success' },
    { stage: 'image_push', delay: 2000, msg: 'Pushing to ECR...' },
    { stage: 'image_push', delay: 4000, msg: 'Image pushed: sha-a3f2c1', status: 'success' },
    { stage: 'k8s_rollout', delay: 2000, msg: 'Rolling out to cluster...' },
    { stage: 'k8s_rollout', delay: 6000, msg: '3/3 pods ready', status: 'success' },
    { stage: 'health_check', delay: 2000, msg: 'Running health checks...' },
    { stage: 'health_check', delay: 3000, msg: 'All endpoints healthy ❤️', status: 'success' }
  ];

  for (const step of stages) {
    await new Promise(resolve => setTimeout(resolve, step.delay));
    const status = step.status || 'in_progress';
    const deployment = db.addEvent(deployId, step.stage, status, step.msg);
    broadcast({ type: 'STAGE_UPDATE', data: deployment });
  }
}

module.exports = router;

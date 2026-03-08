// ============================================================
// DeployTracer - Database Module (SQLite)
// ============================================================
// WHY SQLite?
//   - Zero setup (no Docker container for DB needed)
//   - Single file database (easy to backup)
//   - Fast enough for this use case
//   - Perfect for a weekend project!
//
// In production, you'd swap this for PostgreSQL or MySQL.
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');

// Create/open database file
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'deploytracer.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read/write performance
db.pragma('journal_mode = WAL');

// ----------------------------------------------------------
// STEP 1: Create Tables
// ----------------------------------------------------------
// We need 2 tables:
//   deployments - one row per deployment (git push → production)
//   events      - many rows per deployment (each stage update)

db.exec(`
  -- Main deployments table
  CREATE TABLE IF NOT EXISTS deployments (
    id            TEXT PRIMARY KEY,
    commit_sha    TEXT NOT NULL,
    commit_msg    TEXT,
    branch        TEXT DEFAULT 'main',
    author        TEXT,
    author_avatar TEXT,
    repo          TEXT,
    status        TEXT DEFAULT 'pending',
    current_stage TEXT DEFAULT 'git_push',
    started_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at   DATETIME,
    duration_ms   INTEGER
  );

  -- Individual stage events
  CREATE TABLE IF NOT EXISTS events (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id TEXT NOT NULL,
    stage         TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    message       TEXT,
    metadata      TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deployment_id) REFERENCES deployments(id)
  );

  -- Index for fast lookups
  CREATE INDEX IF NOT EXISTS idx_events_deployment 
    ON events(deployment_id);
  CREATE INDEX IF NOT EXISTS idx_deployments_status 
    ON deployments(status);
`);

// ----------------------------------------------------------
// STEP 2: Database Operations
// ----------------------------------------------------------

// The 5 stages a deployment goes through (in order)
const STAGES = ['git_push', 'ci_build', 'image_push', 'k8s_rollout', 'health_check'];

const operations = {

  // Create a new deployment (triggered by git push webhook)
  createDeployment({ id, commitSha, commitMsg, branch, author, authorAvatar, repo }) {
    const stmt = db.prepare(`
      INSERT INTO deployments (id, commit_sha, commit_msg, branch, author, author_avatar, repo, status, current_stage)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress', 'git_push')
    `);
    stmt.run(id, commitSha, commitMsg, branch, author, authorAvatar, repo);

    // Also create the first event
    this.addEvent(id, 'git_push', 'success', `Push to ${branch} by ${author}`);

    return this.getDeployment(id);
  },

  // Get a single deployment with all its events
  getDeployment(id) {
    const deployment = db.prepare('SELECT * FROM deployments WHERE id = ?').get(id);
    if (!deployment) return null;

    const events = db.prepare(
      'SELECT * FROM events WHERE deployment_id = ? ORDER BY created_at ASC'
    ).all(id);

    return { ...deployment, events };
  },

  // Get recent deployments for the dashboard
  getRecentDeployments(limit = 10) {
    const deployments = db.prepare(
      'SELECT * FROM deployments ORDER BY started_at DESC LIMIT ?'
    ).all(limit);

    return deployments.map(dep => {
      const events = db.prepare(
        'SELECT * FROM events WHERE deployment_id = ? ORDER BY created_at ASC'
      ).all(dep.id);
      return { ...dep, events };
    });
  },

  // Add a stage event (called when GitHub Actions reports progress)
  addEvent(deploymentId, stage, status, message, metadata = null) {
    const stmt = db.prepare(`
      INSERT INTO events (deployment_id, stage, status, message, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(deploymentId, stage, status, message, JSON.stringify(metadata));

    // Update the deployment's current stage
    if (status === 'success' || status === 'in_progress') {
      db.prepare('UPDATE deployments SET current_stage = ? WHERE id = ?')
        .run(stage, deploymentId);
    }

    // If the stage failed, mark the whole deployment as failed
    if (status === 'failed') {
      db.prepare('UPDATE deployments SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('failed', deploymentId);
    }

    // If health_check succeeded, deployment is complete!
    if (stage === 'health_check' && status === 'success') {
      const deployment = db.prepare('SELECT started_at FROM deployments WHERE id = ?').get(deploymentId);
      const duration = Date.now() - new Date(deployment.started_at).getTime();
      db.prepare('UPDATE deployments SET status = ?, finished_at = CURRENT_TIMESTAMP, duration_ms = ? WHERE id = ?')
        .run('success', duration, deploymentId);
    }

    return this.getDeployment(deploymentId);
  },

  // Get the stage list
  getStages() {
    return STAGES;
  }
};

module.exports = operations;

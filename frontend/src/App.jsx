// ============================================================
// DeployTracer - Main App Component
// ============================================================
import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import PipelineTracker from './components/PipelineTracker';
import DeploymentList from './components/DeploymentList';
import Header from './components/Header';

// Determine WebSocket URL based on environment
const WS_URL = import.meta.env.PROD
  ? `wss://${window.location.host}/ws`
  : 'ws://localhost:3001/ws';

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

export default function App() {
  const { deployments, connected } = useWebSocket(WS_URL);
  const [selectedDeploy, setSelectedDeploy] = useState(null);

  // Currently active deployment (most recent in_progress, or selected)
  const activeDeploy = selectedDeploy
    || deployments.find(d => d.status === 'in_progress')
    || deployments[0];

  // Trigger a test deployment (for demo purposes)
  async function triggerTestDeploy() {
    try {
      await fetch(`${API_URL}/api/webhook/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'feat: add real-time pipeline tracking',
          author: 'mayank',
          branch: 'main',
          simulate: true  // Auto-simulate the stages
        })
      });
    } catch (err) {
      console.error('Failed to trigger test:', err);
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <Header connected={connected} onTest={triggerTestDeploy} />

      {/* Main Pipeline Visualization */}
      {activeDeploy ? (
        <PipelineTracker deployment={activeDeploy} />
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontSize: 20, marginBottom: 8, color: 'var(--text-secondary)' }}>
            No deployments yet
          </h2>
          <p style={{ marginBottom: 24 }}>
            Push some code or click "Test Deploy" to see the tracker in action!
          </p>
          <button onClick={triggerTestDeploy} style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer'
          }}>
            🚀 Trigger Test Deploy
          </button>
        </div>
      )}

      {/* Deployment History List */}
      <DeploymentList
        deployments={deployments}
        selected={activeDeploy?.id}
        onSelect={setSelectedDeploy}
      />
    </div>
  );
}

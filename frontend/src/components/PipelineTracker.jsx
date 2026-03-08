// ============================================================
// PipelineTracker Component
// ============================================================
// This is the STAR of the show - the visual pipeline that
// animates through each deployment stage in real-time.
// This is what makes people stop scrolling on LinkedIn!
// ============================================================

import { useState, useEffect } from 'react';

// The 5 stages of a deployment
const STAGES = [
  { id: 'git_push',     icon: '⚡', label: 'Git Push',     color: '#F59E0B' },
  { id: 'ci_build',     icon: '🔨', label: 'CI Build',     color: '#3B82F6' },
  { id: 'image_push',   icon: '📦', label: 'Image Push',   color: '#8B5CF6' },
  { id: 'k8s_rollout',  icon: '🚀', label: 'K8s Rollout',  color: '#10B981' },
  { id: 'health_check', icon: '❤️', label: 'Health Check', color: '#EF4444' },
];

export default function PipelineTracker({ deployment }) {
  const [animatedStage, setAnimatedStage] = useState(-1);

  // Find the index of the current stage
  const currentStageIndex = STAGES.findIndex(s => s.id === deployment?.current_stage);

  // Animate stages sequentially
  useEffect(() => {
    if (currentStageIndex >= 0) {
      setAnimatedStage(currentStageIndex);
    }
  }, [currentStageIndex]);

  // Get status for a specific stage
  function getStageStatus(stageId) {
    if (!deployment?.events) return 'pending';
    const stageEvents = deployment.events.filter(e => e.stage === stageId);
    if (stageEvents.length === 0) return 'pending';
    const latest = stageEvents[stageEvents.length - 1];
    return latest.status;
  }

  // Get the latest message for a stage
  function getStageMessage(stageId) {
    if (!deployment?.events) return '';
    const stageEvents = deployment.events.filter(e => e.stage === stageId);
    if (stageEvents.length === 0) return '';
    return stageEvents[stageEvents.length - 1].message || '';
  }

  function getStatusColor(status) {
    switch (status) {
      case 'success': return '#10B981';
      case 'failed': return '#EF4444';
      case 'in_progress': return '#3B82F6';
      default: return '#334155';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'success': return '✓';
      case 'failed': return '✗';
      case 'in_progress': return '●';
      default: return '○';
    }
  }

  if (!deployment) return null;

  const duration = deployment.duration_ms
    ? `${(deployment.duration_ms / 1000).toFixed(1)}s`
    : deployment.status === 'in_progress'
      ? 'In progress...'
      : '—';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: 32,
      marginBottom: 32,
      animation: 'slideIn 0.3s ease-out'
    }}>
      {/* Deployment Info Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <code style={{
            background: 'rgba(59,130,246,0.15)',
            color: '#60a5fa',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {deployment.commit_sha}
          </code>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {deployment.commit_msg}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            ⏱️ {duration}
          </span>
          <span style={{
            fontSize: 12,
            padding: '4px 10px',
            borderRadius: 12,
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            background: deployment.status === 'success' ? 'rgba(16,185,129,0.15)'
              : deployment.status === 'failed' ? 'rgba(239,68,68,0.15)'
              : 'rgba(59,130,246,0.15)',
            color: deployment.status === 'success' ? '#10B981'
              : deployment.status === 'failed' ? '#EF4444'
              : '#3B82F6'
          }}>
            {deployment.status?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Pipeline Stages Visualization */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 8
      }}>
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const message = getStageMessage(stage.id);
          const isActive = index <= animatedStage;
          const isCurrent = stage.id === deployment.current_stage && deployment.status === 'in_progress';

          return (
            <div key={stage.id} style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              minWidth: 0
            }}>
              {/* Stage Card */}
              <div style={{
                flex: 1,
                minWidth: 120,
                padding: '16px 12px',
                borderRadius: 12,
                border: `2px solid ${isActive ? getStatusColor(status) : 'var(--border)'}`,
                background: isCurrent
                  ? `linear-gradient(135deg, ${stage.color}15, transparent)`
                  : 'var(--bg-secondary)',
                textAlign: 'center',
                transition: 'all 0.5s ease',
                animation: isCurrent ? 'glow 2s infinite' : 'none',
                opacity: isActive ? 1 : 0.4,
                position: 'relative'
              }}>
                {/* Status indicator */}
                <div style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: getStatusColor(status),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'white',
                  opacity: status === 'pending' ? 0 : 1,
                  transition: 'all 0.3s'
                }}>
                  {getStatusIcon(status)}
                </div>

                <div style={{ fontSize: 28, marginBottom: 8 }}>{stage.icon}</div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isActive ? stage.color : 'var(--text-muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: 4
                }}>
                  {stage.label}
                </div>
                {message && (
                  <div style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    marginTop: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {message}
                  </div>
                )}
              </div>

              {/* Connector Arrow */}
              {index < STAGES.length - 1 && (
                <div style={{ padding: '0 4px', flexShrink: 0 }}>
                  <svg width="24" height="16" viewBox="0 0 24 16">
                    <path
                      d="M2 8 L16 8 M12 3 L18 8 L12 13"
                      fill="none"
                      stroke={index < animatedStage ? '#10B981' : 'var(--border)'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ transition: 'stroke 0.5s ease' }}
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Deployment metadata */}
      <div style={{
        display: 'flex',
        gap: 24,
        marginTop: 24,
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap'
      }}>
        {[
          { label: 'Branch', value: deployment.branch, icon: '🌿' },
          { label: 'Author', value: deployment.author, icon: '👤' },
          { label: 'Repo', value: deployment.repo, icon: '📁' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {item.label}:
            </span>
            <span style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {item.value || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

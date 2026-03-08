// ============================================================
// DeploymentList Component
// ============================================================
// Shows a list of recent deployments below the pipeline.
// Click any deployment to view its pipeline stages.
// ============================================================

export default function DeploymentList({ deployments, selected, onSelect }) {
  if (!deployments || deployments.length === 0) return null;

  function getStatusEmoji(status) {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'in_progress': return '🔄';
      default: return '⏳';
    }
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return (
    <div>
      <h2 style={{
        fontSize: 14,
        color: 'var(--text-muted)',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: 2,
        marginBottom: 16
      }}>
        DEPLOYMENT HISTORY
      </h2>

      <div style={{
        display: 'grid',
        gap: 8
      }}>
        {deployments.map((dep) => (
          <div
            key={dep.id}
            onClick={() => onSelect(dep)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: selected === dep.id
                ? 'rgba(59,130,246,0.1)'
                : 'var(--bg-card)',
              border: `1px solid ${selected === dep.id ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 0.2s',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <span style={{ fontSize: 16 }}>{getStatusEmoji(dep.status)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 2
                }}>
                  <code style={{
                    fontSize: 12,
                    color: '#60a5fa',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    {dep.commit_sha}
                  </code>
                  <span style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    padding: '1px 6px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 4
                  }}>
                    {dep.branch}
                  </span>
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {dep.commit_msg}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexShrink: 0,
              marginLeft: 12
            }}>
              <span style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                {dep.author}
              </span>
              <span style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                {timeAgo(dep.started_at)}
              </span>
              {dep.duration_ms && (
                <span style={{
                  fontSize: 11,
                  color: 'var(--status-success)',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {(dep.duration_ms / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

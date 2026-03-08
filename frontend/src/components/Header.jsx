// ============================================================
// Header Component
// ============================================================
// Shows app title, WebSocket connection status, and test button

export default function Header({ connected, onTest }) {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 32,
      paddingBottom: 20,
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap',
      gap: 16
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 32 }}>🔍</span>
        <div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            DeployTracer
          </h1>
          <p style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: 2,
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            REAL-TIME DEPLOYMENT TRACKER
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Connection Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderRadius: 20,
          background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connected ? '#10B981' : '#EF4444',
            animation: connected ? 'pulse 2s infinite' : 'none'
          }} />
          <span style={{
            fontSize: 12,
            color: connected ? '#10B981' : '#EF4444',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {connected ? 'LIVE' : 'RECONNECTING...'}
          </span>
        </div>

        {/* Test Deploy Button */}
        <button
          onClick={onTest}
          style={{
            padding: '8px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            transition: 'all 0.2s'
          }}
          onMouseOver={e => {
            e.target.style.borderColor = '#3B82F6';
            e.target.style.color = '#60a5fa';
          }}
          onMouseOut={e => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.color = 'var(--text-secondary)';
          }}
        >
          🚀 Test Deploy
        </button>
      </div>
    </header>
  );
}

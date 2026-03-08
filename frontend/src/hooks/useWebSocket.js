// ============================================================
// useWebSocket Hook
// ============================================================
// Custom React hook that:
//   1. Connects to the WebSocket server
//   2. Auto-reconnects if connection drops
//   3. Manages deployment state from server events
//   4. Returns deployments + connection status
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url) {
  const [deployments, setDeployments] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          // Initial load - replace all deployments
          case 'INITIAL_STATE':
            setDeployments(message.data);
            break;

          // New deployment created - add to top of list
          case 'NEW_DEPLOYMENT':
            setDeployments(prev => [message.data, ...prev.slice(0, 19)]);
            break;

          // Stage update - replace the updated deployment
          case 'STAGE_UPDATE':
            setDeployments(prev =>
              prev.map(dep =>
                dep.id === message.data.id ? message.data : dep
              )
            );
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected, reconnecting in 3s...');
        setConnected(false);
        // Auto-reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      reconnectTimeout.current = setTimeout(connect, 3000);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  return { deployments, connected };
}

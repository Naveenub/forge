import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_BASE_URL } from '../utils/constants';
import { getToken } from '../utils/api';

/**
 * useWebSocket — connects to Forge's real-time log stream for a pipeline.
 *
 * @param {string|null} pipelineId  — connect only when truthy
 * @param {function} onMessage      — called with each parsed event
 * @param {object} options
 * @param {number} options.reconnectDelay  — ms between reconnect attempts (default 2000)
 * @param {number} options.maxRetries      — max reconnect attempts (default 10)
 */
export function useWebSocket(pipelineId, onMessage, options = {}) {
  const { reconnectDelay = 2000, maxRetries = 10 } = options;

  const ws        = useRef(null);
  const retries   = useRef(0);
  const timer     = useRef(null);
  const onMsg     = useRef(onMessage);
  const [status, setStatus] = useState('idle'); // idle | connecting | open | closed | error

  // Keep handler ref fresh so callers don't need to memoize
  useEffect(() => { onMsg.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    if (!pipelineId) return;

    const token = getToken();
    const url   = `${WS_BASE_URL}/pipelines/${pipelineId}?token=${token}`;

    setStatus('connecting');
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setStatus('open');
      retries.current = 0;
    };

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMsg.current?.(data);
      } catch {
        // ignore malformed frames
      }
    };

    socket.onerror = () => setStatus('error');

    socket.onclose = () => {
      setStatus('closed');
      if (retries.current < maxRetries) {
        retries.current += 1;
        timer.current = setTimeout(connect, reconnectDelay * Math.min(retries.current, 5));
      }
    };
  }, [pipelineId, reconnectDelay, maxRetries]);

  useEffect(() => {
    if (!pipelineId) return;
    connect();
    return () => {
      clearTimeout(timer.current);
      ws.current?.close(1000, 'unmount');
    };
  }, [pipelineId, connect]);

  const send = useCallback((payload) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload));
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTimeout(timer.current);
    retries.current = maxRetries; // prevent auto-reconnect
    ws.current?.close(1000, 'manual');
  }, [maxRetries]);

  return { status, send, disconnect };
}

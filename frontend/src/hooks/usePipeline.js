import { useState, useEffect, useCallback, useRef } from 'react';
import { pipelines as pipelinesApi, approvals as approvalsApi } from '../utils/api';
import { useWebSocket } from './useWebSocket';
import { WS_EVENTS } from '../utils/constants';

/**
 * usePipeline — manages live state for a single pipeline.
 * Combines REST polling fallback with WebSocket real-time updates.
 */
export function usePipeline(pipelineId) {
  const [pipeline, setPipeline] = useState(null);
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetch = useCallback(async () => {
    if (!pipelineId) return;
    try {
      const data = await pipelinesApi.get(pipelineId);
      setPipeline(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  useEffect(() => { fetch(); }, [fetch]);

  // WebSocket handler
  const handleWsMessage = useCallback((event) => {
    switch (event.type) {
      case WS_EVENTS.PIPELINE_UPDATE:
        setPipeline((prev) => ({ ...prev, ...event.data }));
        break;
      case WS_EVENTS.AGENT_LOG:
        setLogs((prev) => [...prev.slice(-499), event.data]); // keep last 500 lines
        break;
      case WS_EVENTS.PIPELINE_DONE:
        setPipeline((prev) => ({ ...prev, status: event.data.status }));
        break;
      default:
        break;
    }
  }, []);

  const { status: wsStatus } = useWebSocket(
    pipeline?.status === 'running' ? pipelineId : null,
    handleWsMessage,
  );

  const cancel = useCallback(async () => {
    await pipelinesApi.cancel(pipelineId);
    await fetch();
  }, [pipelineId, fetch]);

  const retry = useCallback(async () => {
    await pipelinesApi.retry(pipelineId);
    setLogs([]);
    await fetch();
  }, [pipelineId, fetch]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { pipeline, logs, loading, error, wsStatus, cancel, retry, clearLogs, refresh: fetch };
}

/**
 * usePipelineList — lists pipelines for a project with optional polling.
 */
export function usePipelineList(projectId, pollMs = 0) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const timer = useRef(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await pipelinesApi.list(projectId);
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetch();
    if (pollMs > 0) {
      timer.current = setInterval(fetch, pollMs);
      return () => clearInterval(timer.current);
    }
  }, [fetch, pollMs]);

  const create = useCallback(async (data) => {
    const p = await pipelinesApi.create(projectId, data);
    setItems((prev) => [p, ...prev]);
    return p;
  }, [projectId]);

  return { items, loading, error, create, refresh: fetch };
}

/**
 * usePendingApprovals — pending approval list with polling.
 */
export function usePendingApprovals(pollMs = 15_000) {
  const [approvals, setApprovals] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await approvalsApi.list();
      setApprovals(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, pollMs);
    return () => clearInterval(t);
  }, [fetch, pollMs]);

  const approve = useCallback(async (id, comment = '') => {
    await approvalsApi.approve(id, comment);
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const reject = useCallback(async (id, comment = '') => {
    await approvalsApi.reject(id, comment);
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { approvals, loading, approve, reject, refresh: fetch };
}

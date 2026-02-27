/**
 * useMetrics — workspace and pipeline metrics with configurable polling.
 *
 * Usage:
 *   const { metrics, loading } = useMetrics(workspaceId);
 *   const { metrics: agentMetrics } = useAgentMetrics();
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { metrics as metricsApi } from '../utils/api';
import { POLL_METRICS } from '../utils/constants';

// ── useMetrics ────────────────────────────────────────────────────────────────

/**
 * Live workspace infrastructure metrics.
 * @param {string}  workspaceId
 * @param {number}  pollMs       polling interval (default POLL_METRICS = 10s)
 */
export function useMetrics(workspaceId, pollMs = POLL_METRICS) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(!!workspaceId);
  const [error,   setError]   = useState(null);
  const timer = useRef(null);

  const fetch = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const result = await metricsApi.overview(workspaceId);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetch();
    if (pollMs > 0) {
      timer.current = setInterval(fetch, pollMs);
      return () => clearInterval(timer.current);
    }
  }, [fetch, pollMs]);

  return { metrics: data, loading, error, refresh: fetch };
}

// ── usePipelineMetrics ────────────────────────────────────────────────────────

/**
 * Per-pipeline metrics: stage timing, token usage, cost estimate.
 * @param {string} pipelineId
 */
export function usePipelineMetrics(pipelineId) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(!!pipelineId);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!pipelineId) return;
    setLoading(true);
    try {
      const result = await metricsApi.pipeline(pipelineId);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { metrics: data, loading, error, refresh: fetch };
}

// ── useAgentMetrics ───────────────────────────────────────────────────────────

/**
 * Agent pool metrics: throughput, latency, token usage by domain.
 * @param {number} pollMs polling interval
 */
export function useAgentMetrics(pollMs = POLL_METRICS) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);

  const fetch = useCallback(async () => {
    try {
      const result = await metricsApi.agents();
      setData(result);
    } catch {
      /* silent — show stale data */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    if (pollMs > 0) {
      timer.current = setInterval(fetch, pollMs);
      return () => clearInterval(timer.current);
    }
  }, [fetch, pollMs]);

  return { metrics: data, loading, refresh: fetch };
}

// ── useAuditLog ───────────────────────────────────────────────────────────────

/**
 * Paginated audit log.
 * @param {{ limit?: number, event_type?: string }} params
 */
export function useAuditLog(params = {}) {
  const [events,  setEvents]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const { limit = 50, event_type } = params;

  const fetch = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const { audit } = await import('../utils/api');
      const result = await audit.list({ limit, offset, event_type });
      setEvents(result.events || []);
      setTotal(result.total || 0);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [limit, event_type]);

  useEffect(() => { fetch(0); }, [fetch]);

  return { events, total, loading, error, fetchPage: fetch };
}

export default useMetrics;

/**
 * useAgents — live agent status with configurable polling.
 *
 * Usage:
 *   const { agents, summary, loading } = useAgents();
 *   const { agents: running } = useAgents({ filter: 'running', pollMs: 5000 });
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { agents as agentsApi } from '../utils/api';

/**
 * @param {object} opts
 * @param {string|null} opts.filter   — 'running' | 'idle' | null (all)
 * @param {number}      opts.pollMs   — polling interval ms (0 = no polling)
 */
export function useAgents({ filter = null, pollMs = 30_000 } = {}) {
  const [agents,  setAgents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const timer = useRef(null);

  const fetch = useCallback(async () => {
    try {
      const data = await agentsApi.list();
      setAgents(data);
      setError(null);
    } catch (e) {
      setError(e.message);
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

  const filtered = filter ? agents.filter((a) => a.status === filter) : agents;

  const summary = {
    total:   agents.length,
    running: agents.filter((a) => a.status === 'running').length,
    idle:    agents.filter((a) => a.status === 'idle').length,
    byDomain: agents.reduce((acc, a) => {
      acc[a.domain] = acc[a.domain] || { total: 0, running: 0 };
      acc[a.domain].total++;
      if (a.status === 'running') acc[a.domain].running++;
      return acc;
    }, {}),
  };

  return { agents: filtered, summary, loading, error, refresh: fetch };
}

/**
 * useAgentStatus — lightweight status endpoint (just the counts).
 */
export function useAgentStatus(pollMs = 30_000) {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await agentsApi.status();
      setStatus(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    if (pollMs > 0) {
      const t = setInterval(fetch, pollMs);
      return () => clearInterval(t);
    }
  }, [fetch, pollMs]);

  return { status, loading, refresh: fetch };
}

export default useAgents;

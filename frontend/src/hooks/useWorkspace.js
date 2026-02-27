/**
 * useWorkspace — workspace list, create, delete.
 * useProject   — project list and CRUD within a workspace.
 */
import { useState, useEffect, useCallback } from 'react';
import { workspaces as workspacesApi, projects as projectsApi } from '../utils/api';

// ── useWorkspace ──────────────────────────────────────────────────────────────

export function useWorkspaceList() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const data = await workspacesApi.list();
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = useCallback(async (payload) => {
    const ws = await workspacesApi.create(payload);
    setItems((prev) => [ws, ...prev]);
    return ws;
  }, []);

  const remove = useCallback(async (id) => {
    await workspacesApi.delete(id);
    setItems((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const update = useCallback(async (id, payload) => {
    const ws = await workspacesApi.update(id, payload);
    setItems((prev) => prev.map((w) => (w.id === id ? ws : w)));
    return ws;
  }, []);

  return { items, loading, error, create, remove, update, refresh: fetch };
}

export function useWorkspace(workspaceId) {
  const [workspace, setWorkspace] = useState(null);
  const [loading,   setLoading]   = useState(!!workspaceId);
  const [error,     setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await workspacesApi.get(workspaceId);
      setWorkspace(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetch(); }, [fetch]);

  const update = useCallback(async (payload) => {
    const ws = await workspacesApi.update(workspaceId, payload);
    setWorkspace(ws);
    return ws;
  }, [workspaceId]);

  return { workspace, loading, error, update, refresh: fetch };
}

// ── useProject ────────────────────────────────────────────────────────────────

export function useProjectList(workspaceId) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(!!workspaceId);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await projectsApi.list(workspaceId);
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = useCallback(async (payload) => {
    const proj = await projectsApi.create(workspaceId, payload);
    setItems((prev) => [proj, ...prev]);
    return proj;
  }, [workspaceId]);

  const remove = useCallback(async (id) => {
    await projectsApi.delete(id);
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { items, loading, error, create, remove, refresh: fetch };
}

export function useProject(projectId) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(!!projectId);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await projectsApi.get(projectId);
      setProject(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  const update = useCallback(async (payload) => {
    const proj = await projectsApi.update(projectId, payload);
    setProject(proj);
    return proj;
  }, [projectId]);

  return { project, loading, error, update, refresh: fetch };
}

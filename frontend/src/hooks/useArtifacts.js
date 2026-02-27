/**
 * useArtifacts — pipeline artifact management.
 *
 * Usage:
 *   const { artifacts, loading } = useArtifacts(pipelineId);
 *   const { artifact, loading  } = useArtifact(artifactId);
 */
import { useState, useEffect, useCallback } from 'react';
import { artifacts as artifactsApi } from '../utils/api';

// ── useArtifacts — list for a pipeline ───────────────────────────────────────

/**
 * @param {string|null} pipelineId
 * @param {{ filter?: string }} opts  — filter by artifact_type
 */
export function useArtifacts(pipelineId, { filter } = {}) {
  const [all,     setAll]     = useState([]);
  const [loading, setLoading] = useState(!!pipelineId);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!pipelineId) return;
    setLoading(true);
    try {
      const data = await artifactsApi.list(pipelineId);
      setAll(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  useEffect(() => { fetch(); }, [fetch]);

  const artifacts = filter ? all.filter((a) => a.artifact_type === filter) : all;

  // Group by domain for the pipeline view
  const byDomain = all.reduce((acc, a) => {
    const key = a.domain || 'other';
    acc[key] = acc[key] || [];
    acc[key].push(a);
    return acc;
  }, {});

  return { artifacts, all, byDomain, loading, error, refresh: fetch };
}

// ── useArtifact — single artifact ────────────────────────────────────────────

export function useArtifact(artifactId) {
  const [artifact, setArtifact] = useState(null);
  const [loading,  setLoading]  = useState(!!artifactId);
  const [error,    setError]    = useState(null);

  const fetch = useCallback(async () => {
    if (!artifactId) return;
    setLoading(true);
    try {
      const data = await artifactsApi.get(artifactId);
      setArtifact(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [artifactId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Download helper
  const download = useCallback(async () => {
    if (!artifactId) return;
    const { url } = await artifactsApi.download(artifactId);
    window.open(url, '_blank', 'noopener');
  }, [artifactId]);

  // Copy content to clipboard
  const copyContent = useCallback(async () => {
    if (!artifact?.content) return false;
    try {
      await navigator.clipboard.writeText(artifact.content);
      return true;
    } catch {
      return false;
    }
  }, [artifact]);

  return { artifact, loading, error, refresh: fetch, download, copyContent };
}

// ── useArtifactDownload — batch download controller ──────────────────────────

export function useArtifactDownload() {
  const [downloading, setDownloading] = useState(new Set());

  const download = useCallback(async (artifactId, filename) => {
    if (downloading.has(artifactId)) return;
    setDownloading((prev) => new Set([...prev, artifactId]));
    try {
      const { url } = await artifactsApi.download(artifactId);
      // Create an anchor and trigger download
      const a = document.createElement('a');
      a.href = url;
      if (filename) a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(artifactId);
        return next;
      });
    }
  }, [downloading]);

  const isDownloading = useCallback((id) => downloading.has(id), [downloading]);

  return { download, isDownloading };
}

export default useArtifacts;

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

let authToken = localStorage.getItem('forge_token') || null;

export function setToken(token) {
  authToken = token;
  if (token) localStorage.setItem('forge_token', token);
  else localStorage.removeItem('forge_token');
}

export function getToken() {
  return authToken;
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }

  return res.status === 204 ? null : res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  logout: () => request('POST', '/auth/logout'),
  me: () => request('GET', '/auth/me'),
  updateProfile: (data) => request('PATCH', '/auth/me', data),
  changePassword: (data) => request('POST', '/auth/change-password', data),
  generateApiKey: () => request('POST', '/auth/api-keys'),
  listApiKeys: () => request('GET', '/auth/api-keys'),
  revokeApiKey: (id) => request('DELETE', `/auth/api-keys/${id}`),
};

// ── Workspaces ────────────────────────────────────────────────────────────────
export const workspaces = {
  list: () => request('GET', '/workspaces'),
  get: (id) => request('GET', `/workspaces/${id}`),
  create: (data) => request('POST', '/workspaces', data),
  update: (id, data) => request('PATCH', `/workspaces/${id}`, data),
  delete: (id) => request('DELETE', `/workspaces/${id}`),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projects = {
  list: (workspaceId) => request('GET', `/workspaces/${workspaceId}/projects`),
  get: (id) => request('GET', `/projects/${id}`),
  create: (workspaceId, data) => request('POST', `/workspaces/${workspaceId}/projects`, data),
  update: (id, data) => request('PATCH', `/projects/${id}`, data),
  delete: (id) => request('DELETE', `/projects/${id}`),
};

// ── Pipelines ─────────────────────────────────────────────────────────────────
export const pipelines = {
  list: (projectId) => request('GET', `/projects/${projectId}/pipelines`),
  get: (id) => request('GET', `/pipelines/${id}`),
  create: (projectId, data) => request('POST', `/projects/${projectId}/pipelines`, data),
  cancel: (id) => request('POST', `/pipelines/${id}/cancel`),
  retry: (id) => request('POST', `/pipelines/${id}/retry`),
};

// ── Approvals ─────────────────────────────────────────────────────────────────
export const approvals = {
  list: () => request('GET', '/approvals/pending'),
  approve: (id, comment) => request('POST', `/approvals/${id}/approve`, { comment }),
  reject: (id, comment) => request('POST', `/approvals/${id}/reject`, { comment }),
};

// ── Artifacts ─────────────────────────────────────────────────────────────────
export const artifacts = {
  list: (pipelineId) => request('GET', `/pipelines/${pipelineId}/artifacts`),
  get: (id) => request('GET', `/artifacts/${id}`),
  download: (id) => request('GET', `/artifacts/${id}/download`),
};

// ── Agents ────────────────────────────────────────────────────────────────────
export const agents = {
  list: () => request('GET', '/agents'),
  status: () => request('GET', '/agents/status'),
};

// ── Metrics ───────────────────────────────────────────────────────────────────
export const metrics = {
  overview: () => request('GET', '/metrics'),
  pipeline: (id) => request('GET', `/metrics/pipelines/${id}`),
  agents: () => request('GET', '/metrics/agents'),
};

// ── Audit ─────────────────────────────────────────────────────────────────────
export const audit = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/audit${qs ? `?${qs}` : ''}`);
  },
};

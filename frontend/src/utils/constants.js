// ── App ───────────────────────────────────────────────────────────────────────
export const APP_NAME = 'Forge';
export const APP_VERSION = '2.0.0';

// ── Roles ─────────────────────────────────────────────────────────────────────
export const ROLES = {
  OWNER:       'OWNER',
  MANAGER:     'MANAGER',
  CONTRIBUTOR: 'CONTRIBUTOR',
  VIEWER:      'VIEWER',
};

export const ROLE_LABELS = {
  OWNER:       'Owner',
  MANAGER:     'Manager',
  CONTRIBUTOR: 'Contributor',
  VIEWER:      'Viewer',
};

// ── Pipeline stages ───────────────────────────────────────────────────────────
export const STAGES = {
  EXECUTE: 'execute',
  REVIEW:  'review',
  APPROVE: 'approve',
};

export const PIPELINE_STATUSES = [
  'pending', 'running', 'review', 'approved', 'completed', 'failed', 'cancelled',
];

// ── Domains ───────────────────────────────────────────────────────────────────
export const DOMAINS = ['architecture', 'development', 'testing', 'security', 'devops'];

export const DOMAIN_COLORS = {
  architecture: '#6366f1',
  development:  '#3b82f6',
  testing:      '#10b981',
  security:     '#f59e0b',
  devops:       '#ef4444',
};

export const PIPELINE_STAGES = [
  'requirements_gathering',
  'architecture_design',
  'architecture_review',
  'architecture_approval',
  'development_planning',
  'implementation',
  'code_review',
  'dev_approval',
  'unit_testing',
  'integration_testing',
  'test_review',
  'test_approval',
  'security_scan',
  'security_review',
  'deployment',
  'post_deployment_validation',
];

export const AGENTS_BY_DOMAIN = {
  architecture: ['Architect', 'Sr. Architect', 'Arch Approve'],
  development:  ['Developer', 'Sr. Developer', 'Dev Manager'],
  testing:      ['Tester', 'Sr. Tester', 'QA Manager'],
  security:     ['Sec Engineer', 'Sr. Security', 'Sec Manager'],
  devops:       ['Cloud Engineer', 'Cloud Lead', 'Cloud Manager'],
};

// ── WebSocket ─────────────────────────────────────────────────────────────────
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export const WS_EVENTS = {
  PIPELINE_UPDATE: 'pipeline_update',
  AGENT_LOG:       'agent_log',
  APPROVAL_NEEDED: 'approval_needed',
  ARTIFACT_READY:  'artifact_ready',
  PIPELINE_DONE:   'pipeline_done',
  ERROR:           'error',
};

// ── Pagination ────────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ── Polling intervals (ms) ────────────────────────────────────────────────────
export const POLL_METRICS   = 10_000;
export const POLL_APPROVALS = 15_000;
export const POLL_AGENTS    = 30_000;

// ── Local storage keys ────────────────────────────────────────────────────────
export const LS_TOKEN     = 'forge_token';
export const LS_USER      = 'forge_user';
export const LS_WORKSPACE = 'forge_workspace';
export const LS_THEME     = 'forge_theme';

// ── Demo accounts ─────────────────────────────────────────────────────────────
export const DEMO_ACCOUNTS = [
  { email: 'admin@forge.dev', password: 'Forge@2025', role: 'Owner',       label: 'Admin' },
  { email: 'lead@forge.dev',  password: 'Lead@2025',  role: 'Manager',     label: 'Lead'  },
  { email: 'dev@forge.dev',   password: 'Dev@2025',   role: 'Contributor', label: 'Dev'   },
];

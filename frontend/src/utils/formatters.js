// ── Date & Time ───────────────────────────────────────────────────────────────
export function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return formatDate(iso);
}

export function formatDuration(ms) {
  if (!ms && ms !== 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${rem}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ── Numbers ───────────────────────────────────────────────────────────────────
export function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatPercent(n, decimals = 1) {
  if (n === null || n === undefined) return '—';
  return `${n.toFixed(decimals)}%`;
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ── Status ────────────────────────────────────────────────────────────────────
export const STATUS_COLORS = {
  pending:    { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  running:    { bg: 'bg-blue-500/10',   text: 'text-blue-400',   dot: 'bg-blue-400'   },
  review:     { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
  approved:   { bg: 'bg-green-500/10',  text: 'text-green-400',  dot: 'bg-green-400'  },
  completed:  { bg: 'bg-green-500/10',  text: 'text-green-400',  dot: 'bg-green-400'  },
  failed:     { bg: 'bg-red-500/10',    text: 'text-red-400',    dot: 'bg-red-400'    },
  cancelled:  { bg: 'bg-gray-500/10',   text: 'text-gray-400',   dot: 'bg-gray-400'   },
  rejected:   { bg: 'bg-red-500/10',    text: 'text-red-400',    dot: 'bg-red-400'    },
  idle:       { bg: 'bg-gray-500/10',   text: 'text-gray-400',   dot: 'bg-gray-500'   },
  active:     { bg: 'bg-green-500/10',  text: 'text-green-400',  dot: 'bg-green-400'  },
};

export function getStatusColor(status) {
  return STATUS_COLORS[status?.toLowerCase()] || STATUS_COLORS.idle;
}

export function formatStatus(status) {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

// ── Domain ────────────────────────────────────────────────────────────────────
export const DOMAINS = ['architecture', 'development', 'testing', 'security', 'devops'];

export const DOMAIN_LABELS = {
  architecture: 'Architecture',
  development:  'Development',
  testing:      'Testing',
  security:     'Security',
  devops:       'DevOps',
};

export const DOMAIN_COLORS = {
  architecture: '#6366f1',
  development:  '#3b82f6',
  testing:      '#10b981',
  security:     '#f59e0b',
  devops:       '#ef4444',
};

// ── String ────────────────────────────────────────────────────────────────────
export function truncate(str, n = 40) {
  if (!str) return '';
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── SHA ───────────────────────────────────────────────────────────────────────
export function shortSha(sha) {
  if (!sha) return '—';
  return sha.slice(0, 8);
}

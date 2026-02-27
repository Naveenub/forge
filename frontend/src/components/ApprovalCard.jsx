/**
 * ApprovalCard — renders a pending governance approval gate.
 *
 * Usage:
 *   <ApprovalCard
 *     approval={approval}
 *     onApprove={(id, comment) => approvalsApi.approve(id, comment)}
 *     onReject={(id, comment) => approvalsApi.reject(id, comment)}
 *   />
 */
import { useState } from 'react';

const DOMAIN_META = {
  architecture: { icon: '◈', color: '#00d4ff' },
  development:  { icon: '⬡', color: '#a855f7' },
  testing:      { icon: '◎', color: '#00e87a' },
  security:     { icon: '⬢', color: '#ffaa00' },
  devops:       { icon: '⌬', color: '#ff3e5e' },
};

function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ApprovalCard({ approval, onApprove, onReject, style = {} }) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(null); // 'approve' | 'reject' | null
  const [expanded, setExpanded] = useState(false);

  const domain = (approval.stage_type || '').split('_')[0];
  const meta = DOMAIN_META[domain] || { icon: '◉', color: '#8899bb' };

  async function handleDecide(decision) {
    setLoading(decision);
    try {
      if (decision === 'approve') await onApprove?.(approval.id, comment);
      else await onReject?.(approval.id, comment);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{
      border: '1px solid #ffaa0040',
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: '10px',
      background: '#090d1a',
      overflow: 'hidden',
      ...style,
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px',
          cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        <span style={{ fontSize: '18px', color: meta.color }}>{meta.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#dde6f5' }}>
            {approval.stage_type?.replace(/_/g, ' ').toUpperCase() ?? 'Approval Required'}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8899bb' }}>
            Pipeline {approval.pipeline_id?.slice(0, 8)} ·{' '}
            Role required: <strong style={{ color: '#ffaa00' }}>{approval.required_role}</strong> ·{' '}
            {formatRelative(approval.created_at)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <span style={{
            fontSize: '11px', padding: '3px 10px', borderRadius: '12px',
            background: '#ffaa0014', color: '#ffaa00', border: '1px solid #ffaa0030',
          }}>
            PENDING
          </span>
          <span style={{ color: '#4a5f80', fontSize: '14px' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expandable body */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #18233d' }}>
          <p style={{ margin: '12px 0 8px', fontSize: '12px', color: '#8899bb', fontWeight: 500 }}>
            Review comment (optional)
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Provide context for your decision…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#0c1120', border: '1px solid #18233d',
              borderRadius: '8px', padding: '9px 12px',
              fontSize: '13px', color: '#dde6f5', resize: 'vertical',
              fontFamily: 'inherit', outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#00d4ff60'; }}
            onBlur={(e)  => { e.target.style.borderColor = '#18233d'; }}
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'flex-end' }}>
            <DecideBtn
              label="Reject"
              color="#ff3e5e"
              loading={loading === 'reject'}
              disabled={loading !== null}
              onClick={() => handleDecide('reject')}
            />
            <DecideBtn
              label="Approve"
              color="#00e87a"
              loading={loading === 'approve'}
              disabled={loading !== null}
              onClick={() => handleDecide('approve')}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DecideBtn({ label, color, loading, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: `${color}18`,
        border: `1px solid ${color}60`,
        color, borderRadius: '8px',
        padding: '8px 20px',
        fontSize: '13px', fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}
    >
      {loading && (
        <span style={{
          width: '10px', height: '10px',
          border: `2px solid ${color}40`, borderTopColor: color,
          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
          display: 'inline-block',
        }} />
      )}
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}

// ── ApprovalBadge ─────────────────────────────────────────────────────────────

export function ApprovalBadge({ status }) {
  const cfg = {
    pending:  { bg: '#ffaa0014', color: '#ffaa00', border: '#ffaa0030', label: 'Pending'  },
    approved: { bg: '#00e87a14', color: '#00e87a', border: '#00e87a30', label: 'Approved' },
    rejected: { bg: '#ff3e5e14', color: '#ff3e5e', border: '#ff3e5e30', label: 'Rejected' },
  }[status] || { bg: '#18233d', color: '#8899bb', border: '#18233d', label: status };

  return (
    <span style={{
      fontSize: '11px', padding: '3px 10px', borderRadius: '12px',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontWeight: 500, letterSpacing: '0.04em',
    }}>
      {cfg.label}
    </span>
  );
}

export default ApprovalCard;

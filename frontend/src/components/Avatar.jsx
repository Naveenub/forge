/**
 * Avatar — user profile picture with initials fallback and online status indicator.
 *
 * Usage:
 *   <Avatar user={user} size={36} />
 *   <Avatar user={user} size={24} status="online" />
 *   <AvatarGroup users={members} max={5} size={28} />
 */

const GRADIENT_PAIRS = [
  ['#00d4ff', '#0066cc'],
  ['#a855f7', '#6d28d9'],
  ['#00e87a', '#059669'],
  ['#ffaa00', '#d97706'],
  ['#ff3e5e', '#be123c'],
  ['#38bdf8', '#0284c7'],
  ['#fb923c', '#ea580c'],
  ['#c084fc', '#9333ea'],
];

function gradientForString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const pair = GRADIENT_PAIRS[Math.abs(hash) % GRADIENT_PAIRS.length];
  return `linear-gradient(135deg, ${pair[0]}40, ${pair[1]}60)`;
}

function getInitials(user) {
  if (user?.name) {
    return user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  }
  if (user?.username) return user.username.slice(0, 2).toUpperCase();
  if (user?.email)    return user.email[0].toUpperCase();
  return '?';
}

const STATUS_COLORS = {
  online:  '#00e87a',
  away:    '#ffaa00',
  busy:    '#ff3e5e',
  offline: '#2e3f60',
};

// ── Avatar ────────────────────────────────────────────────────────────────────

export function Avatar({
  user,
  size = 32,
  status,          // 'online' | 'away' | 'busy' | 'offline'
  showTooltip = false,
  style = {},
  onClick,
}) {
  const initials = getInitials(user);
  const gradient = gradientForString(user?.email || user?.id || '');
  const fontSize  = Math.round(size * 0.36);
  const dotSize   = Math.max(8, Math.round(size * 0.24));

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={showTooltip ? (user?.name || user?.email || 'User') : undefined}
      onClick={onClick}
      style={{
        position: 'relative',
        width: size, height: size,
        borderRadius: '50%',
        background: gradient,
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize, fontWeight: 600,
        color: '#fff',
        flexShrink: 0, userSelect: 'none',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        ...style,
      }}
    >
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={initials}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        initials
      )}

      {status && (
        <span style={{
          position: 'absolute',
          bottom: 0, right: 0,
          width: dotSize, height: dotSize,
          borderRadius: '50%',
          background: STATUS_COLORS[status] || STATUS_COLORS.offline,
          border: `${Math.max(1, Math.round(dotSize * 0.2))}px solid #05070f`,
        }} />
      )}
    </div>
  );
}

// ── AvatarGroup ───────────────────────────────────────────────────────────────

export function AvatarGroup({ users = [], max = 4, size = 28, style = {} }) {
  const visible  = users.slice(0, max);
  const overflow = users.length - max;
  const overlap  = Math.round(size * 0.3);

  return (
    <div style={{ display: 'flex', alignItems: 'center', ...style }}>
      {visible.map((user, i) => (
        <div
          key={user?.id || i}
          style={{
            marginLeft: i === 0 ? 0 : -overlap,
            zIndex: visible.length - i,
            border: '2px solid #05070f',
            borderRadius: '50%',
          }}
        >
          <Avatar user={user} size={size} showTooltip />
        </div>
      ))}
      {overflow > 0 && (
        <div style={{
          marginLeft: -overlap, zIndex: 0,
          width: size, height: size, borderRadius: '50%',
          background: '#18233d', border: '2px solid #05070f',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: Math.round(size * 0.32), color: '#8899bb', fontWeight: 600,
          userSelect: 'none',
        }}>
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ── AvatarWithName ────────────────────────────────────────────────────────────

export function AvatarWithName({ user, size = 32, subtitle, style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', ...style }}>
      <Avatar user={user} size={size} />
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#dde6f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.name || user?.email?.split('@')[0] || 'Unknown'}
        </p>
        {subtitle && (
          <p style={{ margin: 0, fontSize: '11px', color: '#4a5f80', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default Avatar;

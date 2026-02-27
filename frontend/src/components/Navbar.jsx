/**
 * Navbar — top navigation bar.
 * Displays workspace switcher, page title, notification badge, and user menu.
 *
 * Usage:
 *   <Navbar title="Pipelines" workspace={ws} user={user} onLogout={logout} />
 */
import { useState, useRef } from 'react';
import { useOnClickOutside } from '../hooks/useUtils';

// ── Avatar helper ─────────────────────────────────────────────────────────────

function Avatar({ user, size = 32 }) {
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #00d4ff40, #a855f740)',
      border: '1px solid #00d4ff40',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, color: '#00d4ff',
      flexShrink: 0, userSelect: 'none',
    }}>
      {user?.avatar_url
        ? <img src={user.avatar_url} alt={initials} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        : initials}
    </div>
  );
}

// ── NotificationDot ───────────────────────────────────────────────────────────

function NotificationDot({ count = 0 }) {
  if (!count) return null;
  return (
    <span style={{
      position: 'absolute', top: '-4px', right: '-4px',
      background: '#ff3e5e', color: '#fff',
      fontSize: '9px', fontWeight: 700,
      width: '16px', height: '16px', borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid #05070f',
    }}>
      {count > 9 ? '9+' : count}
    </span>
  );
}

// ── UserMenu ──────────────────────────────────────────────────────────────────

function UserMenu({ user, onLogout, onProfile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'transparent', border: '1px solid #18233d',
          borderRadius: '8px', padding: '5px 10px 5px 6px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          color: '#dde6f5', transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2e3f60'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#18233d'; }}
      >
        <Avatar user={user} size={26} />
        <span style={{ fontSize: '13px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.name || user?.email?.split('@')[0] || 'Account'}
        </span>
        <span style={{ fontSize: '10px', color: '#4a5f80' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: '#090d1a', border: '1px solid #18233d',
          borderRadius: '10px', padding: '6px',
          minWidth: '200px', zIndex: 1000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid #0c1120', marginBottom: '4px' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#dde6f5' }}>
              {user?.name || 'User'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#4a5f80' }}>{user?.email}</p>
            {user?.role && (
              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: '#00d4ff14', color: '#00d4ff', marginTop: '4px', display: 'inline-block' }}>
                {user.role.toUpperCase()}
              </span>
            )}
          </div>

          {[
            { label: '👤  Profile', action: onProfile },
            { label: '⚙  Settings', action: () => {} },
            { label: '📖  Docs', action: () => window.open('https://github.com/forge/forge', '_blank') },
          ].map(({ label, action }) => (
            <MenuItem key={label} onClick={() => { setOpen(false); action?.(); }}>{label}</MenuItem>
          ))}

          <div style={{ borderTop: '1px solid #0c1120', marginTop: '4px', paddingTop: '4px' }}>
            <MenuItem onClick={() => { setOpen(false); onLogout?.(); }} danger>
              ⎋  Sign out
            </MenuItem>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'transparent', border: 'none',
        color: danger ? '#ff3e5e' : '#8899bb',
        padding: '8px 10px', borderRadius: '6px',
        fontSize: '13px', cursor: 'pointer',
        transition: 'all 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? '#ff3e5e12' : '#ffffff08'; e.currentTarget.style.color = danger ? '#ff5f7a' : '#dde6f5'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = danger ? '#ff3e5e' : '#8899bb'; }}
    >
      {children}
    </button>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export function Navbar({
  title,
  subtitle,
  user,
  pendingApprovals = 0,
  onLogout,
  onProfile,
  onNotifications,
  actions,
}) {
  return (
    <header style={{
      height: '56px',
      background: '#05070f',
      borderBottom: '1px solid #18233d',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: '16px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={{ fontSize: '20px' }}>⬡</span>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#00d4ff', letterSpacing: '0.06em' }}>
          FORGE
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '20px', background: '#18233d', flexShrink: 0 }} />

      {/* Page title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#dde6f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </h1>
        )}
        {subtitle && (
          <p style={{ margin: 0, fontSize: '11px', color: '#4a5f80' }}>{subtitle}</p>
        )}
      </div>

      {/* Custom actions slot */}
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{actions}</div>}

      {/* Notifications */}
      <button
        onClick={onNotifications}
        title="Pending approvals"
        style={{
          position: 'relative',
          background: pendingApprovals > 0 ? '#ffaa0010' : 'transparent',
          border: `1px solid ${pendingApprovals > 0 ? '#ffaa0040' : '#18233d'}`,
          borderRadius: '8px', padding: '6px 10px',
          cursor: 'pointer', color: pendingApprovals > 0 ? '#ffaa00' : '#4a5f80',
          fontSize: '15px', lineHeight: 1, display: 'flex', alignItems: 'center',
        }}
      >
        ◎
        <NotificationDot count={pendingApprovals} />
      </button>

      {/* User menu */}
      {user && <UserMenu user={user} onLogout={onLogout} onProfile={onProfile} />}
    </header>
  );
}

export default Navbar;

/**
 * Dropdown — accessible floating action menu.
 *
 * Usage:
 *   <Dropdown
 *     trigger={<Button>Actions ▾</Button>}
 *     items={[
 *       { label: 'Edit', icon: '✎', onClick: handleEdit },
 *       { label: 'Delete', icon: '✕', onClick: handleDelete, danger: true },
 *       { type: 'divider' },
 *       { label: 'Docs', icon: '↗', href: 'https://…' },
 *     ]}
 *   />
 */
import { useState, useRef, useEffect } from 'react';
import { useOnClickOutside } from '../hooks/useUtils';

export function Dropdown({
  trigger,
  items = [],
  align = 'left',   // 'left' | 'right'
  width = 200,
  disabled = false,
  onOpen,
  onClose,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useOnClickOutside(ref, () => {
    if (open) { setOpen(false); onClose?.(); }
  });

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); onClose?.(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  function toggle() {
    if (disabled) return;
    const next = !open;
    setOpen(next);
    if (next) onOpen?.(); else onClose?.();
  }

  function handleItemClick(item) {
    if (item.disabled) return;
    setOpen(false);
    onClose?.();
    item.onClick?.();
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger */}
      <div onClick={toggle} style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
        {trigger}
      </div>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            width, minWidth: width,
            background: '#090d1a',
            border: '1px solid #18233d',
            borderRadius: '10px',
            padding: '5px',
            zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            animation: 'dd-in 0.12s ease',
          }}
        >
          {items.map((item, i) => {
            if (item.type === 'divider') {
              return <div key={`div-${i}`} style={{ height: '1px', background: '#0c1120', margin: '4px 0' }} />;
            }
            if (item.type === 'label') {
              return (
                <p key={`lbl-${i}`} style={{ margin: 0, padding: '6px 10px 2px', fontSize: '10px', fontWeight: 600, color: '#2e3f60', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {item.label}
                </p>
              );
            }

            const El = item.href ? 'a' : 'button';
            return (
              <El
                key={item.label || i}
                role="menuitem"
                href={item.href}
                target={item.href ? '_blank' : undefined}
                rel={item.href ? 'noopener noreferrer' : undefined}
                onClick={item.href ? undefined : () => handleItemClick(item)}
                disabled={item.disabled}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', textAlign: 'left',
                  background: 'transparent',
                  border: 'none', borderRadius: '6px',
                  padding: '8px 10px',
                  color: item.danger ? '#ff3e5e' : item.disabled ? '#2e3f60' : '#8899bb',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  fontSize: '13px', textDecoration: 'none',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!item.disabled) {
                    e.currentTarget.style.background = item.danger ? '#ff3e5e12' : '#ffffff08';
                    e.currentTarget.style.color = item.danger ? '#ff5f7a' : '#dde6f5';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = item.danger ? '#ff3e5e' : item.disabled ? '#2e3f60' : '#8899bb';
                }}
              >
                {item.icon && <span style={{ fontSize: '13px', flexShrink: 0, opacity: item.disabled ? 0.4 : 1 }}>{item.icon}</span>}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.shortcut && <span style={{ fontSize: '11px', color: '#2e3f60' }}>{item.shortcut}</span>}
                {item.href && <span style={{ fontSize: '10px', color: '#2e3f60' }}>↗</span>}
              </El>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes dd-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

// ── ContextMenu ───────────────────────────────────────────────────────────────
// Right-click context menu

export function useContextMenu() {
  const [state, setState] = useState(null); // { x, y, items }

  function show(e, items) {
    e.preventDefault();
    setState({ x: e.clientX, y: e.clientY, items });
  }

  function hide() { setState(null); }

  function ContextMenu() {
    if (!state) return null;
    return (
      <>
        <div
          onClick={hide}
          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
        />
        <div
          role="menu"
          style={{
            position: 'fixed',
            left: Math.min(state.x, window.innerWidth - 220),
            top: Math.min(state.y, window.innerHeight - 200),
            width: 200, background: '#090d1a',
            border: '1px solid #18233d', borderRadius: '10px',
            padding: '5px', zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {state.items.map((item, i) => {
            if (item.type === 'divider') return <div key={i} style={{ height: '1px', background: '#0c1120', margin: '4px 0' }} />;
            return (
              <button
                key={i}
                onClick={() => { hide(); item.onClick?.(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none', borderRadius: '6px',
                  padding: '8px 10px', color: item.danger ? '#ff3e5e' : '#8899bb',
                  cursor: 'pointer', fontSize: '13px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.color = item.danger ? '#ff5f7a' : '#dde6f5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = item.danger ? '#ff3e5e' : '#8899bb'; }}
              >
                {item.icon && <span>{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return { show, hide, ContextMenu };
}

export default Dropdown;

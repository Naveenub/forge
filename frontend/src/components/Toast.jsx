/**
 * Toast — lightweight notification system.
 *
 * Setup (in main.jsx or App.jsx):
 *   <ToastProvider>
 *     <App />
 *   </ToastProvider>
 *
 * Usage anywhere in the tree:
 *   const toast = useToast();
 *   toast.success('Pipeline started!');
 *   toast.error('Failed to connect', { duration: 8000 });
 *   toast.info('Agent is reviewing your architecture…', { duration: 0 }); // persists
 */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ICONS = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

const COLORS = {
  success: { text: '#00e87a', border: '#00e87a40', bg: '#00e87a0a' },
  error:   { text: '#ff3e5e', border: '#ff3e5e40', bg: '#ff3e5e0a' },
  warning: { text: '#ffaa00', border: '#ffaa0040', bg: '#ffaa000a' },
  info:    { text: '#00d4ff', border: '#00d4ff40', bg: '#00d4ff0a' },
};

const ToastContext = createContext(null);
let _uid = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, type = 'info', { duration = 4000, title } = {}) => {
    const id = ++_uid;
    setToasts((prev) => [...prev.slice(-4), { id, message, type, title }]);

    if (duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const api = {
    show,
    success: (msg, opts) => show(msg, 'success', opts),
    error:   (msg, opts) => show(msg, 'error',   opts),
    warning: (msg, opts) => show(msg, 'warning', opts),
    info:    (msg, opts) => show(msg, 'info',    opts),
    dismiss,
  };

  // Cleanup timers on unmount
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Portal-like container — fixed at top-right */}
      <div style={{
        position: 'fixed', top: '20px', right: '20px',
        zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: '10px',
        width: '340px', maxWidth: 'calc(100vw - 40px)',
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onDismiss }) {
  const { id, message, type, title } = toast;
  const c = COLORS[type] || COLORS.info;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        background: '#090d1a',
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.text}`,
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'toast-in 0.2s ease',
        pointerEvents: 'all',
        position: 'relative',
      }}
    >
      <span style={{ fontSize: '14px', color: c.text, flexShrink: 0, marginTop: '1px' }}>
        {ICONS[type]}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: 600, color: '#dde6f5' }}>
            {title}
          </p>
        )}
        <p style={{ margin: 0, fontSize: '13px', color: '#8899bb', lineHeight: 1.5, wordBreak: 'break-word' }}>
          {message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(id)}
        style={{
          background: 'none', border: 'none', color: '#2e3f60',
          cursor: 'pointer', fontSize: '14px', padding: '0 2px', flexShrink: 0,
          lineHeight: 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#8899bb'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#2e3f60'; }}
        aria-label="Dismiss notification"
      >
        ✕
      </button>

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export default ToastProvider;

/**
 * Modal — accessible dialog overlay.
 *
 * Usage:
 *   <Modal open={show} onClose={() => setShow(false)} title="Confirm Deletion" size="sm">
 *     <p>Are you sure?</p>
 *     <Modal.Footer>
 *       <Button variant="ghost" onClick={() => setShow(false)}>Cancel</Button>
 *       <Button variant="danger" onClick={handleDelete}>Delete</Button>
 *     </Modal.Footer>
 *   </Modal>
 */
import { useEffect, useRef, useCallback } from 'react';

const SIZES = {
  xs:  '360px',
  sm:  '480px',
  md:  '640px',
  lg:  '800px',
  xl:  '1024px',
  full: 'calc(100vw - 48px)',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  closable = true,
  children,
  style: extraStyle = {},
}) {
  const overlayRef = useRef(null);
  const panelRef   = useRef(null);

  // Close on Escape
  const handleKey = useCallback((e) => {
    if (e.key === 'Escape' && closable) onClose?.();
  }, [closable, onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    // Focus the panel
    setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, handleKey]);

  if (!open) return null;

  const maxW = SIZES[size] || SIZES.md;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === overlayRef.current && closable) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(5,7,15,0.85)',
        backdropFilter: 'blur(4px)',
        padding: '24px',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: maxW,
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          background: '#090d1a',
          border: '1px solid #18233d',
          borderRadius: '14px',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.2s ease',
          ...extraStyle,
        }}
      >
        {/* Header */}
        {(title || closable) && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '20px 24px 0',
            flexShrink: 0,
          }}>
            <div>
              {title && (
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#dde6f5' }}>
                  {title}
                </h2>
              )}
              {subtitle && (
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8899bb' }}>{subtitle}</p>
              )}
            </div>
            {closable && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  background: 'none', border: 'none', color: '#8899bb',
                  cursor: 'pointer', fontSize: '18px', lineHeight: 1,
                  padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
                  marginLeft: '12px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#dde6f5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#8899bb'; }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  );
}

/** Modal.Footer — sticky action row at the bottom */
Modal.Footer = function ModalFooter({ children, style = {} }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '10px',
      padding: '16px 24px',
      borderTop: '1px solid #18233d',
      flexShrink: 0,
      ...style,
    }}>
      {children}
    </div>
  );
};

/** ConfirmModal — convenience wrapper for yes/no dialogs */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="xs">
      <p style={{ margin: 0, fontSize: '14px', color: '#8899bb', lineHeight: 1.6 }}>
        {message}
      </p>
      <Modal.Footer>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: '1px solid #18233d',
            color: '#8899bb', padding: '8px 18px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '13px',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          style={{
            background: confirmVariant === 'danger' ? '#ff3e5e18' : '#00d4ff18',
            border: `1px solid ${confirmVariant === 'danger' ? '#ff3e5e60' : '#00d4ff60'}`,
            color: confirmVariant === 'danger' ? '#ff3e5e' : '#00d4ff',
            padding: '8px 18px', borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '13px', opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Please wait…' : confirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default Modal;

/**
 * Button — reusable button with variants, sizes, and loading state.
 *
 * Usage:
 *   <Button variant="primary" size="md" onClick={handleClick}>Save</Button>
 *   <Button variant="danger" loading>Deleting…</Button>
 *   <Button variant="ghost" icon="✕" iconOnly aria-label="Close" />
 */

const VARIANTS = {
  primary: {
    bg: '#00d4ff',
    color: '#05070f',
    border: 'transparent',
    hover: '#00bfe6',
  },
  secondary: {
    bg: 'transparent',
    color: '#00d4ff',
    border: '#00d4ff40',
    hover: '#00d4ff10',
  },
  danger: {
    bg: 'transparent',
    color: '#ff3e5e',
    border: '#ff3e5e40',
    hover: '#ff3e5e10',
  },
  success: {
    bg: 'transparent',
    color: '#00e87a',
    border: '#00e87a40',
    hover: '#00e87a10',
  },
  ghost: {
    bg: 'transparent',
    color: '#8899bb',
    border: 'transparent',
    hover: '#ffffff08',
  },
  dark: {
    bg: '#101828',
    color: '#dde6f5',
    border: '#18233d',
    hover: '#18233d',
  },
};

const SIZES = {
  xs: { padding: '4px 10px', fontSize: '11px', borderRadius: '6px', gap: '4px' },
  sm: { padding: '6px 14px', fontSize: '12px', borderRadius: '6px', gap: '5px' },
  md: { padding: '9px 20px', fontSize: '13px', borderRadius: '8px', gap: '6px' },
  lg: { padding: '12px 28px', fontSize: '14px', borderRadius: '10px', gap: '8px' },
};

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  iconOnly = false,
  fullWidth = false,
  onClick,
  type = 'button',
  style: extraStyle = {},
  className = '',
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.secondary;
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    padding: iconOnly ? s.padding.split(' ')[0] : s.padding,
    fontSize: s.fontSize,
    fontFamily: 'inherit',
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: '0.02em',
    borderRadius: s.borderRadius,
    border: `1px solid ${v.border}`,
    background: v.bg,
    color: v.color,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    transition: 'all 0.15s ease',
    outline: 'none',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : 'auto',
    flexShrink: 0,
    ...extraStyle,
  };

  function handleClick(e) {
    if (isDisabled) { e.preventDefault(); return; }
    onClick?.(e);
  }

  function handleMouseEnter(e) {
    if (!isDisabled) e.currentTarget.style.background = v.hover;
  }
  function handleMouseLeave(e) {
    e.currentTarget.style.background = v.bg;
  }

  return (
    <button
      type={type}
      style={baseStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={isDisabled}
      className={className}
      {...rest}
    >
      {loading ? (
        <span style={{
          display: 'inline-block',
          width: '12px',
          height: '12px',
          border: `2px solid ${v.color}40`,
          borderTopColor: v.color,
          borderRadius: '50%',
          animation: 'forge-spin 0.7s linear infinite',
        }} />
      ) : icon ? (
        <span style={{ lineHeight: 1, fontSize: `calc(${s.fontSize} * 1.1)` }}>{icon}</span>
      ) : null}

      {!iconOnly && children && (
        <span>{children}</span>
      )}

      <style>{`
        @keyframes forge-spin { to { transform: rotate(360deg); } }
      `}</style>
    </button>
  );
}

/** ButtonGroup — renders children side-by-side with shared border */
export function ButtonGroup({ children, style = {} }) {
  return (
    <div style={{ display: 'inline-flex', gap: 0, ...style }}>
      {children}
    </div>
  );
}

export default Button;

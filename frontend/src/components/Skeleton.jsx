/**
 * Skeleton — animated loading placeholders.
 *
 * Usage:
 *   <Skeleton width="60%" height={16} />
 *   <SkeletonCard />
 *   <SkeletonTable rows={5} cols={4} />
 *   <SkeletonText lines={3} />
 */

// ── Base Skeleton ─────────────────────────────────────────────────────────────

export function Skeleton({
  width  = '100%',
  height = 14,
  radius = 4,
  style  = {},
}) {
  return (
    <div style={{
      width, height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, #0c1120 0%, #18233d 50%, #0c1120 100%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
      flexShrink: 0,
      ...style,
    }}>
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}

// ── SkeletonText — multiple lines ─────────────────────────────────────────────

export function SkeletonText({ lines = 3, style = {} }) {
  const widths = ['100%', '85%', '70%', '90%', '60%', '95%', '75%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={widths[i % widths.length]} height={13} />
      ))}
    </div>
  );
}

// ── SkeletonCard — generic card placeholder ───────────────────────────────────

export function SkeletonCard({ style = {} }) {
  return (
    <div style={{
      border: '1px solid #18233d', borderRadius: '12px',
      padding: '18px 20px', background: '#090d1a',
      display: 'flex', flexDirection: 'column', gap: '12px',
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Skeleton width={38} height={38} radius={10} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton width="100%" height={3} radius={2} />
      <div style={{ display: 'flex', gap: '12px' }}>
        <Skeleton width="30%" height={12} />
        <Skeleton width="25%" height={12} />
        <Skeleton width="20%" height={12} />
      </div>
    </div>
  );
}

// ── SkeletonTable ─────────────────────────────────────────────────────────────

export function SkeletonTable({ rows = 5, cols = 4, style = {} }) {
  const colWidths = ['30%', '20%', '25%', '15%', '10%'];
  return (
    <div style={style}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '12px',
        padding: '10px 14px',
        borderBottom: '1px solid #18233d',
        marginBottom: '2px',
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={colWidths[i] || '80%'} height={11} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '12px',
          padding: '11px 14px',
          borderBottom: '1px solid #0c1120',
        }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <Skeleton key={ci} width={colWidths[ci] || '80%'} height={13} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── SkeletonPipelineCard ──────────────────────────────────────────────────────

export function SkeletonPipelineCard({ style = {} }) {
  return (
    <div style={{
      border: '1px solid #18233d', borderRadius: '12px',
      padding: '16px', background: '#090d1a',
      display: 'flex', flexDirection: 'column', gap: '10px',
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton width="40%" height={14} />
        <Skeleton width={60} height={20} radius={10} />
      </div>
      <Skeleton width="100%" height={4} radius={2} />
      <div style={{ display: 'flex', gap: '8px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={28} height={28} radius={6} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <Skeleton width="25%" height={11} />
        <Skeleton width="30%" height={11} />
      </div>
    </div>
  );
}

// ── SkeletonPage — full-page loading skeleton ─────────────────────────────────

export function SkeletonPage({ cards = 6, style = {} }) {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', ...style }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Skeleton width={200} height={20} />
          <Skeleton width={140} height={13} />
        </div>
        <Skeleton width={120} height={36} radius={8} />
      </div>
      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {Array.from({ length: cards }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export default Skeleton;

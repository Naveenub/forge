/**
 * LoadingSpinner — centralised loading state component.
 *
 * Variants:
 *   <LoadingSpinner />                   — full-page overlay
 *   <LoadingSpinner size="sm" inline />  — inline 16px spinner
 *   <LoadingSpinner size="md" />         — card-level spinner
 *   <LoadingSpinner text="Loading…" />   — spinner + label
 *
 * Sizes: "xs" | "sm" | "md" | "lg" | "xl"
 */

const T = {
  bg: "#05070f",
  bgCard: "#090d1a",
  cyan: "#00d4ff",
  purple: "#a855f7",
  text: "#dde6f5",
  textSub: "#8899bb",
  textDim: "#2e3f60",
};

const SIZE_MAP = {
  xs: 12,
  sm: 16,
  md: 32,
  lg: 48,
  xl: 64,
};

const CSS = `
  @keyframes forge-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes forge-pulse {
    0%, 100% { opacity: 0.4; transform: scale(0.85); }
    50%       { opacity: 1;   transform: scale(1);    }
  }
`;

function Spinner({ sizePx, color = T.cyan, strokeWidth = 2.5 }) {
  const r = (sizePx - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox={`0 0 ${sizePx} ${sizePx}`}
      style={{ animation: "forge-spin 0.8s linear infinite", flexShrink: 0 }}
    >
      {/* Track */}
      <circle
        cx={sizePx / 2}
        cy={sizePx / 2}
        r={r}
        fill="none"
        stroke={`${color}22`}
        strokeWidth={strokeWidth}
      />
      {/* Arc */}
      <circle
        cx={sizePx / 2}
        cy={sizePx / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
      />
    </svg>
  );
}

export function LoadingSpinner({
  size = "md",
  color = T.cyan,
  text = "",
  inline = false,
  fullPage = false,
}) {
  const sizePx = SIZE_MAP[size] ?? SIZE_MAP.md;

  const content = (
    <div
      style={{
        display: "flex",
        flexDirection: inline ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: inline ? 8 : 12,
      }}
    >
      <style>{CSS}</style>
      <Spinner sizePx={sizePx} color={color} />
      {text && (
        <span
          style={{
            fontSize: Math.max(9, sizePx * 0.3),
            color: T.textSub,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.06em",
            animation: "forge-pulse 1.4s ease-in-out infinite",
          }}
        >
          {text}
        </span>
      )}
    </div>
  );

  if (inline) return content;

  if (fullPage) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(5, 7, 15, 0.85)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {content}
      </div>
    );
  }

  // Default: centred within its container
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        width: "100%",
      }}
    >
      {content}
    </div>
  );
}

/**
 * Skeleton placeholder — use while async data is loading.
 *
 *   <Skeleton width={200} height={16} />
 *   <Skeleton width="100%" height={12} borderRadius={6} />
 */
export function Skeleton({
  width = "100%",
  height = 14,
  borderRadius = 4,
  style = {},
}) {
  return (
    <>
      <style>{`
        @keyframes forge-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
      `}</style>
      <div
        style={{
          width,
          height,
          borderRadius,
          background: "linear-gradient(90deg, #0c1120 25%, #18233d 50%, #0c1120 75%)",
          backgroundSize: "200% 100%",
          animation: "forge-shimmer 1.4s ease infinite",
          ...style,
        }}
      />
    </>
  );
}

/**
 * Convenient page-level skeleton layout for dashboard cards.
 */
export function DashboardSkeleton() {
  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Metrics row */}
      <div style={{ display: "flex", gap: 10 }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: "#090d1a",
              border: "1px solid #18233d",
              borderRadius: 10,
              padding: "13px 15px",
            }}
          >
            <Skeleton width={60} height={9} style={{ marginBottom: 10 }} />
            <Skeleton width={80} height={24} />
          </div>
        ))}
      </div>
      {/* Main card */}
      <div
        style={{
          background: "#090d1a",
          border: "1px solid #18233d",
          borderRadius: 12,
          padding: 17,
        }}
      >
        <Skeleton width={200} height={11} style={{ marginBottom: 14 }} />
        <Skeleton width="100%" height={3} style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 12 }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} width="100%" height={120} borderRadius={8} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoadingSpinner;

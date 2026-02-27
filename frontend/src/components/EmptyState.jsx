/**
 * EmptyState — shown when a list has no items.
 *
 * Usage:
 *   <EmptyState
 *     icon="⬡"
 *     title="No pipelines yet"
 *     description="Start a pipeline to automate your SDLC."
 *     action={{ label: 'Start Pipeline', onClick: handleStart }}
 *   />
 */

export function EmptyState({
  icon = '◉',
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  style = {},
}) {
  const sizes = {
    sm: { icon: '28px', title: '14px', desc: '12px', padding: '32px 20px' },
    md: { icon: '36px', title: '15px', desc: '13px', padding: '48px 24px' },
    lg: { icon: '48px', title: '17px', desc: '14px', padding: '64px 32px' },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: s.padding,
      ...style,
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '16px',
        background: '#0c1120', border: '1px solid #18233d',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: s.icon, color: '#2e3f60', marginBottom: '16px',
      }}>
        {icon}
      </div>

      {title && (
        <h3 style={{ margin: '0 0 8px', fontSize: s.title, fontWeight: 600, color: '#dde6f5' }}>
          {title}
        </h3>
      )}

      {description && (
        <p style={{
          margin: '0 0 20px', fontSize: s.desc, color: '#4a5f80',
          lineHeight: 1.6, maxWidth: '360px',
        }}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            <button
              onClick={action.onClick}
              style={{
                background: '#00d4ff18', border: '1px solid #00d4ff40',
                color: '#00d4ff', borderRadius: '8px',
                padding: '9px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#00d4ff28'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#00d4ff18'; }}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              style={{
                background: 'transparent', border: '1px solid #18233d',
                color: '#8899bb', borderRadius: '8px',
                padding: '9px 20px', cursor: 'pointer', fontSize: '13px',
              }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const EMPTY_STATES = {
  pipelines: {
    icon: '⬡',
    title: 'No pipelines yet',
    description: 'Start your first autonomous SDLC pipeline and let the agents build your software.',
  },
  projects: {
    icon: '◉',
    title: 'No projects in this workspace',
    description: 'Create a project with your requirements and let Forge generate production-grade code.',
  },
  workspaces: {
    icon: '⬡',
    title: 'No workspaces',
    description: 'Create a workspace to organise your projects and team.',
  },
  approvals: {
    icon: '◎',
    title: 'No pending approvals',
    description: 'All governance gates are clear. Pipelines are running autonomously.',
  },
  artifacts: {
    icon: '⬢',
    title: 'No artifacts generated',
    description: 'Artifacts will appear here as pipeline stages complete.',
  },
  agents: {
    icon: '⌬',
    title: 'No agents active',
    description: 'All 15 agents are idle. Start a pipeline to put them to work.',
  },
  search: {
    icon: '⌕',
    title: 'No results found',
    description: 'Try adjusting your search terms or filters.',
  },
  error: {
    icon: '✕',
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Try refreshing the page.',
  },
};

/** Quick preset: <EmptyState preset="pipelines" action={…} /> */
export function EmptyStatePreset({ preset, action, secondaryAction, size, style }) {
  const config = EMPTY_STATES[preset] || EMPTY_STATES.error;
  return (
    <EmptyState {...config} action={action} secondaryAction={secondaryAction} size={size} style={style} />
  );
}

export default EmptyState;

/**
 * WorkspaceCard & ProjectCard — workspace and project list cards.
 */

function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── WorkspaceCard ─────────────────────────────────────────────────────────────

export function WorkspaceCard({ workspace, onClick, onDelete, style = {} }) {
  return (
    <div
      onClick={() => onClick?.(workspace)}
      style={{
        background: '#090d1a',
        border: '1px solid #18233d',
        borderRadius: '12px',
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#00d4ff40';
        e.currentTarget.style.background  = '#0c1120';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#18233d';
        e.currentTarget.style.background  = '#090d1a';
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px',
          background: '#00d4ff18', border: '1px solid #00d4ff30',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', flexShrink: 0,
        }}>
          ⬡
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#dde6f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workspace.name}
          </p>
          {workspace.description && (
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8899bb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workspace.description}
            </p>
          )}
        </div>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(workspace); }}
            style={{
              background: 'none', border: 'none', color: '#2e3f60',
              cursor: 'pointer', fontSize: '14px', padding: '4px',
              borderRadius: '4px', flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ff3e5e'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#2e3f60'; }}
            title="Delete workspace"
          >
            ✕
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#4a5f80' }}>
        <span>
          <strong style={{ color: '#8899bb' }}>{workspace.project_count ?? 0}</strong> projects
        </span>
        <span>Created {formatRelative(workspace.created_at)}</span>
      </div>
    </div>
  );
}

// ── ProjectCard ───────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  draft:     { bg: '#18233d',   text: '#8899bb', label: 'Draft'     },
  active:    { bg: '#00d4ff18', text: '#00d4ff', label: 'Active'    },
  completed: { bg: '#00e87a18', text: '#00e87a', label: 'Completed' },
  archived:  { bg: '#ffaa0018', text: '#ffaa00', label: 'Archived'  },
};

export function ProjectCard({ project, onClick, onDelete, style = {} }) {
  const statusCfg = STATUS_COLORS[project.status] || STATUS_COLORS.draft;

  return (
    <div
      onClick={() => onClick?.(project)}
      style={{
        background: '#090d1a',
        border: '1px solid #18233d',
        borderRadius: '12px',
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#00d4ff40';
        e.currentTarget.style.background  = '#0c1120';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#18233d';
        e.currentTarget.style.background  = '#090d1a';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#dde6f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </p>
          {project.description && (
            <p style={{
              margin: '4px 0 0', fontSize: '12px', color: '#8899bb',
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {project.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
            background: statusCfg.bg, color: statusCfg.text,
            fontWeight: 500,
          }}>
            {statusCfg.label}
          </span>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project); }}
              style={{
                background: 'none', border: 'none', color: '#2e3f60',
                cursor: 'pointer', fontSize: '13px', padding: '2px 4px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff3e5e'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#2e3f60'; }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tech stack badges */}
      {project.tech_stack?.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {project.tech_stack.slice(0, 5).map((tech, i) => (
            <span key={i} style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
              background: '#0c1120', border: '1px solid #18233d', color: '#8899bb',
            }}>
              {tech}
            </span>
          ))}
          {project.tech_stack.length > 5 && (
            <span style={{ fontSize: '11px', color: '#4a5f80' }}>
              +{project.tech_stack.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Footer stats */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#4a5f80', borderTop: '1px solid #0c1120', paddingTop: '8px' }}>
        <span><strong style={{ color: '#8899bb' }}>{project.pipeline_count ?? 0}</strong> pipelines</span>
        <span>Updated {formatRelative(project.updated_at || project.created_at)}</span>
      </div>
    </div>
  );
}

export default WorkspaceCard;

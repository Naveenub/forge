/**
 * Sidebar — left navigation panel.
 * Collapses to icon-only mode below 900px.
 *
 * Usage:
 *   <Sidebar active="pipelines" workspace={ws} onNavigate={setPage} />
 */
import { useState } from 'react';
import { useMediaQuery } from '../hooks/useUtils';

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',  icon: '◈', section: 'main' },
  { id: 'pipelines',  label: 'Pipelines',  icon: '⬡', section: 'main' },
  { id: 'projects',   label: 'Projects',   icon: '◉', section: 'main' },
  { id: 'agents',     label: 'Agents',     icon: '⌬', section: 'main' },
  { id: 'approvals',  label: 'Approvals',  icon: '◎', section: 'main', badge: 'approvals' },
  { id: 'artifacts',  label: 'Artifacts',  icon: '⬢', section: 'main' },
  { id: 'metrics',    label: 'Metrics',    icon: '▦',  section: 'monitor' },
  { id: 'audit',      label: 'Audit Log',  icon: '▤',  section: 'monitor' },
  { id: 'settings',   label: 'Settings',   icon: '⚙',  section: 'settings' },
];

const SECTIONS = [
  { id: 'main',     label: 'Workspace' },
  { id: 'monitor',  label: 'Monitor'   },
  { id: 'settings', label: null        },
];

// ── Domain progress bar ───────────────────────────────────────────────────────

const DOMAINS = [
  { id: 'architecture', icon: '◈', color: '#00d4ff' },
  { id: 'development',  icon: '⬡', color: '#a855f7' },
  { id: 'testing',      icon: '◎', color: '#00e87a' },
  { id: 'security',     icon: '⬢', color: '#ffaa00' },
  { id: 'devops',       icon: '⌬', color: '#ff3e5e' },
];

function DomainProgress({ activeDomain, completedDomains = [], collapsed }) {
  if (collapsed) return null;
  return (
    <div style={{ padding: '10px 12px', borderTop: '1px solid #0c1120', marginTop: 'auto' }}>
      <p style={{ margin: '0 0 8px', fontSize: '10px', color: '#2e3f60', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Pipeline Domains
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {DOMAINS.map((d) => {
          const done    = completedDomains.includes(d.id);
          const active  = d.id === activeDomain;
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: done ? d.color : active ? d.color : '#2e3f60', opacity: done || active ? 1 : 0.4 }}>
                {d.icon}
              </span>
              <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: '#0c1120', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  background: d.color,
                  width: done ? '100%' : active ? '50%' : '0%',
                  transition: 'width 0.4s ease',
                  opacity: done || active ? 1 : 0,
                }} />
              </div>
              {done && <span style={{ fontSize: '9px', color: d.color }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({ item, active, collapsed, badgeCount, onClick }) {
  const isActive = active === item.id;
  return (
    <button
      onClick={() => onClick(item.id)}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: collapsed ? 0 : '10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        width: '100%', textAlign: 'left',
        background: isActive ? '#00d4ff10' : 'transparent',
        border: `1px solid ${isActive ? '#00d4ff30' : 'transparent'}`,
        borderRadius: '8px',
        padding: collapsed ? '9px' : '8px 10px',
        color: isActive ? '#00d4ff' : '#4a5f80',
        cursor: 'pointer', fontSize: '13px',
        transition: 'all 0.12s',
        position: 'relative',
      }}
      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = '#ffffff06'; e.currentTarget.style.color = '#8899bb'; } }}
      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a5f80'; } }}
    >
      <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
      {!collapsed && badgeCount > 0 && (
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '8px',
          background: '#ffaa0018', color: '#ffaa00', border: '1px solid #ffaa0030',
        }}>
          {badgeCount}
        </span>
      )}
      {collapsed && badgeCount > 0 && (
        <span style={{
          position: 'absolute', top: '4px', right: '4px',
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#ffaa00', border: '2px solid #05070f',
        }} />
      )}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({
  active = 'dashboard',
  onNavigate,
  pendingApprovals = 0,
  activeDomain,
  completedDomains,
  workspace,
}) {
  const isMobile  = useMediaQuery('(max-width: 900px)');
  const [collapsed, setCollapsed] = useState(false);
  const isNarrow  = collapsed || isMobile;

  const width = isNarrow ? '56px' : '220px';

  return (
    <aside style={{
      width, minWidth: width, maxWidth: width,
      height: '100%',
      background: '#05070f',
      borderRight: '1px solid #18233d',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Workspace header */}
      {!isNarrow && workspace && (
        <div style={{ padding: '12px', borderBottom: '1px solid #0c1120', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#2e3f60', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Workspace</p>
          <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600, color: '#dde6f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workspace.name}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px' }}>
        {SECTIONS.map((section) => {
          const sectionItems = NAV_ITEMS.filter((i) => i.section === section.id);
          return (
            <div key={section.id} style={{ marginBottom: '8px' }}>
              {section.label && !isNarrow && (
                <p style={{ margin: '8px 0 4px 10px', fontSize: '10px', color: '#2e3f60', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {section.label}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {sectionItems.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    active={active}
                    collapsed={isNarrow}
                    badgeCount={item.badge === 'approvals' ? pendingApprovals : 0}
                    onClick={onNavigate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Domain progress */}
      <DomainProgress
        activeDomain={activeDomain}
        completedDomains={completedDomains}
        collapsed={isNarrow}
      />

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          background: 'transparent', border: 'none',
          borderTop: '1px solid #0c1120',
          padding: '10px', cursor: 'pointer',
          color: '#2e3f60', fontSize: '13px',
          display: 'flex', justifyContent: 'center',
          flexShrink: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#8899bb'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#2e3f60'; }}
      >
        {isNarrow ? '→' : '←'}
      </button>
    </aside>
  );
}

export default Sidebar;

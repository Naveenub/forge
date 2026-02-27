/**
 * ArtifactViewer — renders a pipeline artifact with syntax highlighting.
 *
 * Usage:
 *   <ArtifactViewer artifact={artifact} />
 */

const TYPE_META = {
  source_code:         { icon: '⬡', label: 'Source Code',         lang: 'text' },
  architecture_doc:    { icon: '◈', label: 'Architecture Doc',     lang: 'markdown' },
  architecture_diagram:{ icon: '◈', label: 'Architecture Diagram', lang: 'text' },
  arch_doc:            { icon: '◈', label: 'Architecture Doc',     lang: 'markdown' },
  test_suite:          { icon: '◎', label: 'Test Suite',           lang: 'text' },
  coverage_report:     { icon: '◎', label: 'Coverage Report',      lang: 'text' },
  security_report:     { icon: '⬢', label: 'Security Report',      lang: 'markdown' },
  dockerfile:          { icon: '⌬', label: 'Dockerfile',           lang: 'dockerfile' },
  docker_compose:      { icon: '⌬', label: 'Docker Compose',       lang: 'yaml' },
  kubernetes_manifest: { icon: '⌬', label: 'K8s Manifest',         lang: 'yaml' },
  helm_chart:          { icon: '⌬', label: 'Helm Chart',           lang: 'yaml' },
  ci_cd_pipeline:      { icon: '⌬', label: 'CI/CD Pipeline',       lang: 'yaml' },
  db_schema:           { icon: '◈', label: 'DB Schema',            lang: 'sql' },
};

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatBytes(n) {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function ArtifactViewer({ artifact, style = {} }) {
  if (!artifact) return null;

  const meta = TYPE_META[artifact.artifact_type] || { icon: '◉', label: artifact.artifact_type, lang: 'text' };
  const content = artifact.content || '(No content available — binary artifact stored externally)';
  const lineCount = content.split('\n').length;

  return (
    <div style={{
      border: '1px solid #18233d',
      borderRadius: '10px',
      overflow: 'hidden',
      background: '#090d1a',
      ...style,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px',
        borderBottom: '1px solid #18233d',
        background: '#0c1120',
      }}>
        <span style={{ color: '#00d4ff', fontSize: '15px' }}>{meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#dde6f5' }}>{artifact.name}</p>
          <p style={{ margin: 0, fontSize: '11px', color: '#4a5f80' }}>
            {meta.label} · {lineCount} lines · {formatBytes(artifact.size_bytes)}
            {artifact.checksum && ` · SHA-256: ${artifact.checksum.slice(0, 12)}…`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <ActionBtn title="Copy" onClick={() => copyToClipboard(content)}>
            ⎘ Copy
          </ActionBtn>
          <ActionBtn title="Download" onClick={() => downloadText(artifact.name, content)}>
            ↓ Download
          </ActionBtn>
          {artifact.is_immutable && (
            <span style={{
              fontSize: '11px', padding: '3px 8px', borderRadius: '12px',
              background: '#00e87a14', color: '#00e87a', border: '1px solid #00e87a30',
            }}>
              🔒 Immutable
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <pre style={{
        margin: 0,
        padding: '16px',
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: '520px',
        fontSize: '12px',
        lineHeight: 1.7,
        color: '#c9d7f0',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        whiteSpace: 'pre',
        counterReset: 'line',
      }}>
        <code>{content}</code>
      </pre>
    </div>
  );
}

function ActionBtn({ children, onClick, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '1px solid #18233d',
        color: '#8899bb',
        borderRadius: '6px',
        padding: '4px 10px',
        fontSize: '12px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '4px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#dde6f5'; e.currentTarget.style.borderColor = '#2e3f60'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = '#8899bb'; e.currentTarget.style.borderColor = '#18233d'; }}
    >
      {children}
    </button>
  );
}

// ── ArtifactList ──────────────────────────────────────────────────────────────

export function ArtifactList({ artifacts = [], onSelect }) {
  if (artifacts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#4a5f80', fontSize: '13px' }}>
        No artifacts generated yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {artifacts.map((a) => {
        const meta = TYPE_META[a.artifact_type] || { icon: '◉', label: a.artifact_type };
        return (
          <button
            key={a.id}
            onClick={() => onSelect?.(a)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', textAlign: 'left',
              background: 'transparent', border: '1px solid #18233d',
              borderRadius: '8px', padding: '10px 14px',
              cursor: 'pointer', color: '#dde6f5',
              transition: 'all 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#0c1120'; e.currentTarget.style.borderColor = '#2e3f60'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#18233d'; }}
          >
            <span style={{ fontSize: '16px', color: '#00d4ff', flexShrink: 0 }}>{meta.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>{a.name}</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#4a5f80' }}>
                {meta.label} · {formatBytes(a.size_bytes)}
                {a.is_immutable && ' · 🔒'}
              </p>
            </div>
            <span style={{ color: '#4a5f80', fontSize: '12px' }}>→</span>
          </button>
        );
      })}
    </div>
  );
}

export default ArtifactViewer;

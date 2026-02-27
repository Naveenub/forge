/**
 * Table — generic sortable data table for the Forge dashboard.
 *
 * Usage:
 *   <Table
 *     columns={[
 *       { key: 'name',       label: 'Name',   sortable: true },
 *       { key: 'status',     label: 'Status', render: (v) => <StatusBadge status={v} /> },
 *       { key: 'created_at', label: 'Created', render: (v) => formatRelative(v) },
 *     ]}
 *     rows={pipelines}
 *     keyField="id"
 *     onRowClick={(row) => navigate(`/pipelines/${row.id}`)}
 *   />
 */
import { useState } from 'react';

// ── Table ─────────────────────────────────────────────────────────────────────

export function Table({
  columns = [],
  rows = [],
  keyField = 'id',
  loading = false,
  emptyMessage = 'No data yet.',
  onRowClick,
  style = {},
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey] ?? '';
        const bv = b[sortKey] ?? '';
        const cmp = typeof av === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : rows;

  const thStyle = (col) => ({
    padding: '10px 14px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: col.sortable ? '#8899bb' : '#4a5f80',
    cursor: col.sortable ? 'pointer' : 'default',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    textAlign: col.align || 'left',
    borderBottom: '1px solid #18233d',
  });

  const tdStyle = (col) => ({
    padding: '11px 14px',
    fontSize: '13px',
    color: '#dde6f5',
    borderBottom: '1px solid #0c1120',
    textAlign: col.align || 'left',
    verticalAlign: 'middle',
  });

  return (
    <div style={{ overflowX: 'auto', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={thStyle(col)}
                onClick={() => col.sortable && handleSort(col.key)}
                aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {col.label}
                {col.sortable && sortKey === col.key && (
                  <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} style={tdStyle(col)}>
                    <div style={{
                      height: '14px',
                      background: 'linear-gradient(90deg, #0c1120 0%, #18233d 50%, #0c1120 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '4px',
                      width: `${60 + Math.random() * 30}%`,
                    }} />
                  </td>
                ))}
              </tr>
            ))
          ) : sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ padding: '40px', textAlign: 'center', color: '#4a5f80', fontSize: '13px' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick?.(row)}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) e.currentTarget.style.background = '#0c112080';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={tdStyle(col)}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────

export function Pagination({ page, total, size = 20, onChange }) {
  const totalPages = Math.ceil(total / size);
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  const btnStyle = (active) => ({
    minWidth: '32px', height: '32px', padding: '0 6px',
    background: active ? '#00d4ff18' : 'transparent',
    border: `1px solid ${active ? '#00d4ff60' : '#18233d'}`,
    color: active ? '#00d4ff' : '#8899bb',
    borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', padding: '16px 0' }}>
      <button
        style={btnStyle(false)}
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} style={{ color: '#4a5f80', fontSize: '13px' }}>…</span>
        ) : (
          <button key={p} style={btnStyle(p === page)} onClick={() => onChange(p)}>
            {p}
          </button>
        )
      )}

      <button
        style={btnStyle(false)}
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
      >
        ›
      </button>

      <span style={{ fontSize: '12px', color: '#4a5f80', marginLeft: '6px' }}>
        {total} total
      </span>
    </div>
  );
}

export default Table;

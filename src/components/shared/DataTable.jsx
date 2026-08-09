// ============================================================
// FILE: src/components/shared/DataTable.jsx
// PURPOSE: Reusable sortable, filterable, paginated data table
//          with search, column config, export CSV/JSON,
//          row actions, custom renderers, RBAC column hiding
// ============================================================

import { useState, useMemo } from 'react'
import { Pill }          from './Pill.jsx'

// ── Sort Icon ─────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span style={{ color: '#cbd5e1', fontSize: 10 }}>↕</span>
  return <span style={{ color: '#3b82f6', fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

// ── Pagination ────────────────────────────────────────────────
function Pagination({ page, totalPages, onPrev, onNext, totalRows, perPage }) {
  const start = (page - 1) * perPage + 1
  const end   = Math.min(page * perPage, totalRows)

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 14px', borderTop: '1px solid #f1f5f9',
      fontSize: 12, color: '#64748b',
    }}>
      <span>Showing <strong>{start}–{end}</strong> of <strong>{totalRows}</strong> records</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={onPrev}
          disabled={page === 1}
          style={{
            padding: '4px 10px', borderRadius: 7, border: '1px solid #e2e8f0',
            background: page === 1 ? '#f8fafc' : '#fff',
            color: page === 1 ? '#cbd5e1' : '#334155',
            fontSize: 12, cursor: page === 1 ? 'not-allowed' : 'pointer',
          }}>
          ← Prev
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = i + 1
          return (
            <button key={p}
              onClick={() => {}}
              style={{
                width: 30, height: 28, borderRadius: 7,
                border: `1px solid ${p === page ? '#3b82f6' : '#e2e8f0'}`,
                background: p === page ? '#3b82f6' : '#fff',
                color: p === page ? '#fff' : '#334155',
                fontSize: 12, cursor: 'pointer', fontWeight: p === page ? 700 : 400,
              }}>
              {p}
            </button>
          )
        })}
        <button
          onClick={onNext}
          disabled={page === totalPages}
          style={{
            padding: '4px 10px', borderRadius: 7, border: '1px solid #e2e8f0',
            background: page === totalPages ? '#f8fafc' : '#fff',
            color: page === totalPages ? '#cbd5e1' : '#334155',
            fontSize: 12, cursor: page === totalPages ? 'not-allowed' : 'pointer',
          }}>
          Next →
        </button>
      </div>
    </div>
  )
}

// ── Export Helpers ────────────────────────────────────────────
function exportCSV(data, columns, filename) {
  const headers = columns.map(c => c.label || c.key).join(',')
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key] ?? ''
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    }).join(',')
  )
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `${filename}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function exportJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `${filename}.json`; a.click()
  URL.revokeObjectURL(url)
}

// ── Main DataTable ────────────────────────────────────────────
/**
 * @param {Object[]}  columns        - Column definitions
 * @param {string}    columns[].key  - Data key
 * @param {string}    columns[].label- Header label
 * @param {boolean}   columns[].sortable - Is sortable
 * @param {Function}  columns[].render  - Custom render fn (row) => JSX
 * @param {string}    columns[].type    - 'pill'|'badge'|'text'
 * @param {boolean}   columns[].hidden  - RBAC hidden column
 * @param {string}    columns[].width   - Column width
 * @param {Object[]}  data           - Row data array
 * @param {string}    title          - Table title
 * @param {string}    subtitle       - Table subtitle
 * @param {Function}  onRowClick     - Row click handler
 * @param {string[]}  actions        - Row actions (e.g. ['Edit', 'Delete'])
 * @param {Function}  onAction       - Action handler (action, row) => void
 * @param {number}    pageSize       - Rows per page (default 10)
 * @param {boolean}   showSearch     - Show search bar
 * @param {boolean}   showExport     - Show export buttons
 * @param {string}    filename       - Export filename
 * @param {string}    emptyMessage   - Message when no data
 */
export default function DataTable({
  columns      = [],
  data         = [],
  title,
  subtitle,
  onRowClick,
  actions      = [],
  onAction,
  pageSize     = 10,
  showSearch   = true,
  showExport   = true,
  filename     = 'export',
  emptyMessage = 'No data available',
  loading      = false,
}) {
  const [sortCol,  setSortCol]  = useState(null)
  const [sortDir,  setSortDir]  = useState('asc')
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [perPage,  setPerPage]  = useState(pageSize)
  const [selected, setSelected] = useState(new Set())

  // Visible columns (filter hidden)
  const visibleCols = columns.filter(c => !c.hidden)

  // Filter + sort
  const processed = useMemo(() => {
    let rows = [...data]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(row =>
        visibleCols.some(col => {
          const val = row[col.key]
          return val != null && String(val).toLowerCase().includes(q)
        })
      )
    }

    // Sort
    if (sortCol) {
      rows.sort((a, b) => {
        const av = a[sortCol] ?? ''
        const bv = b[sortCol] ?? ''
        const cmp = typeof av === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return rows
  }, [data, search, sortCol, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processed.length / perPage))
  const pageData   = processed.slice((page - 1) * perPage, page * perPage)

  const handleSort = (key) => {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
    setPage(1)
  }

  const handleSearch = (val) => { setSearch(val); setPage(1) }

  const toggleSelect = (i) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === pageData.length) setSelected(new Set())
    else setSelected(new Set(pageData.map((_, i) => i)))
  }

  // Render cell value
  const renderCell = (col, row) => {
    if (col.render) return col.render(row)
    const val = row[col.key]
    if (val == null) return <span style={{ color: '#cbd5e1' }}>—</span>

    if (col.type === 'pill') {
      const colorMap = {
        Active:    'green', active:    'green',
        Probation: 'yellow',probation: 'yellow',
        Inactive:  'red',   inactive:  'red',
        Pending:   'yellow',pending:   'yellow',
        Approved:  'green', approved:  'green',
        Rejected:  'red',   rejected:  'red',
        Urgent:    'red',   urgent:    'red',
        Open:      'blue',  open:      'blue',
        Placed:    'green', placed:    'green',
      }
      return <Pill color={colorMap[val] || 'gray'}>{val}</Pill>
    }

    if (col.type === 'badge') {
      return (
        <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
          {val}
        </span>
      )
    }

    if (col.type === 'boolean') {
      return val ? <Pill color="green">Yes</Pill> : <Pill color="gray">No</Pill>
    }

    return <span style={{ color: '#334155' }}>{String(val)}</span>
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>

      {/* ── Header ── */}
      {(title || showSearch || showExport) && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {title && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{title}</div>
              {subtitle && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{subtitle}</div>}
            </div>
          )}
          <div style={{ flex: 1 }} />

          {/* Row count */}
          <span style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '3px 9px', borderRadius: 20 }}>
            {processed.length} records
          </span>

          {/* Search */}
          {showSearch && (
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8' }}>🔍</span>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
                style={{
                  padding: '6px 10px 6px 28px', borderRadius: 8,
                  border: '1px solid #e2e8f0', fontSize: 12,
                  outline: 'none', width: 180,
                }}
                onFocus={e => e.target.style.borderColor = '#93c5fd'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          )}

          {/* Per page selector */}
          <select
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
            style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', cursor: 'pointer' }}
          >
            {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>

          {/* Export */}
          {showExport && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => exportCSV(processed, visibleCols, filename)}
                style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                📥 CSV
              </button>
              <button
                onClick={() => exportJSON(processed, filename)}
                style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                📋 JSON
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 28, marginBottom: 10, animation: 'spin 1s linear infinite' }}>⏳</div>
            <div style={{ fontSize: 13 }}>Loading data...</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            {/* Head */}
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>
                {/* Checkbox */}
                {actions.length > 0 && (
                  <th style={{ width: 36, padding: '10px 12px' }}>
                    <input type="checkbox" checked={selected.size === pageData.length && pageData.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                  </th>
                )}

                {visibleCols.map(col => (
                  <th key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    style={{
                      textAlign: 'left', padding: '10px 12px',
                      color: '#64748b', fontWeight: 600,
                      cursor: col.sortable !== false ? 'pointer' : 'default',
                      userSelect: 'none', whiteSpace: 'nowrap',
                      width: col.width,
                    }}
                    onMouseEnter={e => { if (col.sortable !== false) e.currentTarget.style.color = '#334155' }}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {col.label || col.key}
                      {col.sortable !== false && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}

                {/* Actions column */}
                {actions.length > 0 && (
                  <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + (actions.length > 0 ? 2 : 0)}
                    style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                    <div style={{ fontSize: 13 }}>{emptyMessage}</div>
                  </td>
                </tr>
              ) : (
                pageData.map((row, rowIdx) => (
                  <tr key={rowIdx}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      borderBottom: '1px solid #f8fafc',
                      background: selected.has(rowIdx) ? '#eff6ff' : 'transparent',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => { if (!selected.has(rowIdx)) e.currentTarget.style.background = '#fafbff' }}
                    onMouseLeave={e => { if (!selected.has(rowIdx)) e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Row checkbox */}
                    {actions.length > 0 && (
                      <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(rowIdx)} onChange={() => toggleSelect(rowIdx)} style={{ cursor: 'pointer' }} />
                      </td>
                    )}

                    {/* Data cells */}
                    {visibleCols.map(col => (
                      <td key={col.key} style={{ padding: '9px 12px', verticalAlign: 'middle', whiteSpace: col.noWrap ? 'nowrap' : 'normal' }}>
                        {renderCell(col, row)}
                      </td>
                    ))}

                    {/* Action buttons */}
                    {actions.length > 0 && (
                      <td style={{ padding: '8px 12px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {actions.map(action => (
                            <button key={action}
                              onClick={() => onAction?.(action, row)}
                              style={{
                                padding: '3px 9px', borderRadius: 6,
                                border: '1px solid #e2e8f0',
                                background: action === 'Delete' ? '#fef2f2' : '#f8fafc',
                                color: action === 'Delete' ? '#dc2626' : '#3b82f6',
                                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                transition: 'all .12s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = action === 'Delete' ? '#fecaca' : '#eff6ff' }}
                              onMouseLeave={e => { e.currentTarget.style.background = action === 'Delete' ? '#fef2f2' : '#f8fafc' }}
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && processed.length > perPage && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage(p => Math.max(1, p - 1))}
          onNext={() => setPage(p => Math.min(totalPages, p + 1))}
          totalRows={processed.length}
          perPage={perPage}
        />
      )}

      {/* Selected count bar */}
      {selected.size > 0 && (
        <div style={{ padding: '8px 16px', background: '#eff6ff', borderTop: '1px solid #bfdbfe', fontSize: 12, color: '#1d4ed8', display: 'flex', gap: 10, alignItems: 'center' }}>
          <strong>{selected.size}</strong> row{selected.size > 1 ? 's' : ''} selected
          <button onClick={() => setSelected(new Set())}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
            Clear selection
          </button>
          <div style={{ flex: 1 }} />
          {actions.map(a => (
            <button key={a}
              style={{ padding: '3px 10px', borderRadius: 7, border: '1px solid #bfdbfe', background: '#fff', color: '#1d4ed8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {a} ({selected.size})
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

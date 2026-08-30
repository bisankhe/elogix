// ============================================================
// FILE: src/components/shared/TaskItem.jsx
// PURPOSE: Checkable task item — priority dots, department/role
//          labels, due date, assignee, expandable detail,
//          used in all 7 dashboards for "Things To Do"
// USAGE:
//   <TaskItem task="Approve leave" priority="high" done={false}
//             onToggle={() => handleToggle(id)} />
//   <TaskItem task="Review appraisals" priority="medium"
//             dept="IT" role="Dept Head" dueDate="Jun 10" />
// ============================================================

import { useState } from 'react'
import { Pill } from './Pill.jsx'

// ── Priority Config ───────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { color: '#ef4444', bg: '#fef2f2', label: 'High',   dot: '#ef4444' },
  medium: { color: '#f59e0b', bg: '#fffbeb', label: 'Medium', dot: '#f59e0b' },
  low:    { color: '#10b981', bg: '#f0fdf4', label: 'Low',    dot: '#10b981' },
  urgent: { color: '#dc2626', bg: '#fef2f2', label: 'Urgent', dot: '#dc2626' },
}

// ── Checkbox ──────────────────────────────────────────────────
function Checkbox({ checked, onChange, color }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange?.() }}
      style={{
        width: 18, height: 18,
        borderRadius: 5,
        border: `2px solid ${checked ? '#10b981' : '#cbd5e1'}`,
        background: checked ? '#10b981' : 'transparent',
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 10, fontWeight: 800,
        transition: 'all .15s',
        outline: 'none',
        padding: 0,
      }}
      onMouseEnter={e => { if (!checked) e.currentTarget.style.borderColor = '#10b981' }}
      onMouseLeave={e => { if (!checked) e.currentTarget.style.borderColor = '#cbd5e1' }}
      title={checked ? 'Mark as incomplete' : 'Mark as complete'}
    >
      {checked ? '✓' : ''}
    </button>
  )
}

// ── Main TaskItem ─────────────────────────────────────────────
export function TaskItem({
  id,
  task,
  done       = false,
  priority   = 'medium',
  dept,
  role,
  dueDate,
  assignee,
  note,
  onToggle,
  onClick,
  showMeta   = false,
  className  = '',
}) {
  const [expanded, setExpanded] = useState(false)
  const pc = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium

  return (
    <div
      style={{
        borderBottom: '1px solid #f8fafc',
        transition: 'background .1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Main Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '8px 4px',
          cursor: onClick ? 'pointer' : 'default',
        }}
        onClick={onClick}
      >
        {/* Checkbox */}
        <Checkbox checked={done} onChange={onToggle} />

        {/* Task text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 12,
            color: done ? '#94a3b8' : '#334155',
            textDecoration: done ? 'line-through' : 'none',
            lineHeight: 1.5,
            display: 'block',
          }}>
            {task}
          </span>

          {/* Meta info */}
          {showMeta && (dept || role || dueDate || assignee) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {dept && (
                <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '1px 5px', borderRadius: 5 }}>
                  🏢 {dept}
                </span>
              )}
              {role && (
                <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '1px 5px', borderRadius: 5 }}>
                  👤 {role}
                </span>
              )}
              {dueDate && (
                <span style={{ fontSize: 10, color: '#94a3b8', background: '#fffbeb', padding: '1px 5px', borderRadius: 5 }}>
                  📅 {dueDate}
                </span>
              )}
              {assignee && (
                <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '1px 5px', borderRadius: 5 }}>
                  → {assignee}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Priority dot + expand toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {/* Priority indicator */}
          <span
            title={`Priority: ${pc.label}`}
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: done ? '#cbd5e1' : pc.dot,
              flexShrink: 0,
              boxShadow: done ? 'none' : `0 0 4px ${pc.dot}60`,
            }}
          />

          {/* Expand toggle (if note exists) */}
          {note && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', fontSize: 10, padding: 2,
              }}
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded note */}
      {expanded && note && (
        <div style={{
          margin: '0 4px 8px 28px',
          padding: '8px 10px',
          background: '#f8fafc',
          borderRadius: 8,
          border: '1px solid #f1f5f9',
          fontSize: 11,
          color: '#64748b',
          lineHeight: 1.5,
        }}>
          {note}
        </div>
      )}
    </div>
  )
}

// ── Task List ─────────────────────────────────────────────────
// Renders a group of tasks with title and progress
export function TaskList({
  title,
  tasks     = [],
  onToggle,
  showMeta  = false,
  showProgress = true,
  emptyText = 'All tasks complete! 🎉',
}) {
  const done  = tasks.filter(t => t.done).length
  const total = tasks.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div>
      {title && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{title}</div>
          {showProgress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 60, height: 5, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', borderRadius: 3, transition: 'width .4s' }} />
              </div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{done}/{total}</span>
            </div>
          )}
        </div>
      )}

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 12 }}>
          {emptyText}
        </div>
      ) : (
        tasks.map((task, i) => (
          <TaskItem
            key={task.id || i}
            {...task}
            showMeta={showMeta}
            onToggle={() => onToggle?.(task.id || i)}
          />
        ))
      )}
    </div>
  )
}

export default TaskItem

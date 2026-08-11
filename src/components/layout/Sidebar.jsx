// ============================================================
// FILE: src/components/layout/Sidebar.jsx
// PURPOSE: Full collapsible sidebar — 12 modules, 130+ pages,
//          7 persona switcher, RBAC-aware menu filtering,
//          badge indicators, search, dark theme
// ============================================================

import { useState, useCallback } from 'react'
import { useApp }  from '../../context/AppContext.jsx'
import { SIDEBAR_MENU } from '../../data/sidebarMenu.js'
import { PERSONAS }     from '../../data/personas.js'


// ── Persona → Dashboard mapping (shown ONLY to the logged-in user) ──
const PERSONA_DASHBOARD = {
  'super-admin':          { id: 'super-admin-dashboard',            label: 'Super Admin Dashboard',           icon: '👑', level: 1  },
  'executive':            { id: 'executive-dashboard',              label: 'Executive Dashboard',             icon: '🏛', level: 2  },
  'hr':                   { id: 'hr-dashboard',                     label: 'HR Manager Dashboard',            icon: '👥', level: 3  },
  'finance':              { id: 'finance-dashboard',                label: 'Finance Workspace',               icon: '💰', level: 3  },
  'department':           { id: 'department-dashboard',             label: 'Department Head Dashboard',       icon: '🏢', level: 4  },
  'branch':               { id: 'branch-dashboard',                 label: 'Branch / Section Dashboard',      icon: '🌿', level: 4  },
  'hr-officer':           { id: 'hr-officer-dashboard',             label: 'HR Officer Workspace',            icon: '📋', level: 4  },
  'recruitment-officer':  { id: 'recruitment-officer-dashboard',    label: 'Recruitment Officer Workspace',   icon: '🎯', level: 4  },
  'it-admin':             { id: 'it-admin-dashboard',               label: 'IT Administrator Workspace',      icon: '💻', level: 4  },
  'procurement':          { id: 'procurement-dashboard',            label: 'Procurement Workspace',           icon: '📦', level: 4  },
  'admin-officer':        { id: 'admin-workspace-dashboard',        label: 'Admin Workspace',                 icon: '⚙️', level: 4  },
  'sales':                { id: 'sales-dashboard',                  label: 'Sales Workspace',                 icon: '📈', level: 4  },
  'customer-service':     { id: 'customer-service-dashboard',       label: 'Customer Service Workspace',      icon: '🎧', level: 4  },
  'legal':                { id: 'legal-dashboard',                  label: 'Legal Workspace',                 icon: '⚖️', level: 4  },
  'operations':           { id: 'operations-dashboard',             label: 'Operations Workspace',            icon: '⚡', level: 4  },
  'learning-development': { id: 'learning-development-dashboard',   label: 'Learning & Dev Workspace',        icon: '📚', level: 4  },
  'marketing':            { id: 'marketing-dashboard',              label: 'Marketing Workspace',             icon: '📣', level: 4  },
  'recruitment':          { id: 'recruitment-dashboard',            label: 'Recruitment Agency Portal',       icon: '🎯', level: 4  },
  'employee':             { id: 'employee-dashboard',               label: 'My Dashboard',                    icon: '👤', level: 10 },
}


// ══════════════════════════════════════════════════════════════
// RBAC MODULE ACCESS — which personas see which top-level modules
// ══════════════════════════════════════════════════════════════
const MODULE_ACCESS = {
  // Level 1–2: Super Admin + Executive → see EVERYTHING
  'super-admin': 'all',
  'executive':   'all',

  // Level 3: HR Manager → all HR modules, no finance internals
  'hr': ['dashboard','ai-assistant','org-mgmt','emp-lifecycle','workforce-ops',
         'perf-talent','emp-experience','hr-services','compliance','reports'],

  // Level 3: Finance → finance + payroll + reports
  'finance': ['dashboard','ai-assistant','org-mgmt','workforce-ops',
              'finance-assets','compliance','reports'],

  // Level 4: Department Head → own dept HR + attendance + leave + performance
  'department': ['dashboard','ai-assistant','emp-lifecycle','workforce-ops',
                 'perf-talent','emp-experience','hr-services','reports'],

  // Level 4: Branch Manager → same as dept head
  'branch': ['dashboard','ai-assistant','emp-lifecycle','workforce-ops',
             'perf-talent','emp-experience','hr-services','reports'],

  // Level 4: HR Officer → HR operations, no admin/finance
  'hr-officer': ['dashboard','ai-assistant','emp-lifecycle','workforce-ops',
                 'perf-talent','emp-experience','hr-services','reports'],

  // Level 4: Recruitment Officer → recruitment only
  'recruitment-officer': ['dashboard','ai-assistant','emp-lifecycle','workforce-ops',
                          'perf-talent','hr-services','reports'],
  'recruitment': ['dashboard','ai-assistant','emp-lifecycle','workforce-ops','reports'],

  // Level 4: IT Admin → system + org + reports
  'it-admin': ['dashboard','ai-assistant','org-mgmt','sys-admin','compliance','reports'],

  // Level 4: Procurement → finance + admin
  'procurement': ['dashboard','ai-assistant','finance-assets','compliance','reports'],

  // Level 4: Admin Officer → admin + HR services
  'admin-officer': ['dashboard','ai-assistant','org-mgmt','hr-services',
                    'finance-assets','compliance','reports'],

  // Level 4: Sales → own performance + reports
  'sales': ['dashboard','ai-assistant','workforce-ops','perf-talent',
            'emp-experience','hr-services','reports'],

  // Level 4: Customer Service
  'customer-service': ['dashboard','ai-assistant','workforce-ops','perf-talent',
                       'emp-experience','hr-services','reports'],

  // Level 4: Legal + Compliance
  'legal': ['dashboard','ai-assistant','org-mgmt','compliance','finance-assets','reports'],

  // Level 4: Operations
  'operations': ['dashboard','ai-assistant','org-mgmt','workforce-ops',
                 'perf-talent','compliance','reports'],

  // Level 4: Learning & Development
  'learning-development': ['dashboard','ai-assistant','perf-talent',
                           'emp-experience','hr-services','reports'],

  // Level 4: Marketing
  'marketing': ['dashboard','ai-assistant','workforce-ops','perf-talent',
                'emp-experience','hr-services','reports'],

  // Level 10: Employee → SELF-SERVICE ONLY
  'employee': ['dashboard','hr-services'],
}

// ══════════════════════════════════════════════════════════════
// CHILD ITEM ACCESS — which sub-items employees/officers can see
// Employees only see self-service items tagged with selfService:true
// or items in modules they have access to
// ══════════════════════════════════════════════════════════════

// Items employees can NEVER see (sensitive — payroll internals, admin, etc.)
const EMPLOYEE_BLOCKED_IDS = new Set([
  // Payroll internals
  'payroll-processing','payroll-setup','salary-structure','tax-config',
  'bank-details-mgmt','payroll-batch','payroll-approval',
  // Org admin
  'company-settings','branch-setup','dept-setup','position-setup',
  'grade-level','job-band','job-family','shift-setup','leave-policy',
  'org-chart-admin','workflow-config','approval-matrix',
  // Finance admin
  'budget-planning','cost-center','chart-of-accounts','journal-entry',
  'bank-reconciliation','vendor-payment','asset-register',
  // Compliance admin
  'audit-log','system-audit','data-privacy-config','risk-register',
  // Reports (bulk)
  'payroll-report','hr-analytics','bi-dashboard','advanced-analytics',
  // System admin
  'user-management','role-config','permission-matrix','system-config',
  'email-templates','integration-setup',
])

// Items ONLY employees see (self-service)
const EMPLOYEE_ONLY_IDS = new Set([
  'employee-dashboard','apply-leave','my-attendance','leave-balance',
  'my-payslip','my-documents','my-profile','my-goals','my-tasks',
  'my-training','my-feedback','my-grievance','expense-claim',
  'timesheet','loan-application','advance-salary',
])

// ── Badge Styles ─────────────────────────────────────────────
const badgeStyle = (badge) => {
  if (!badge) return null
  const map = {
    'Live':  { bg: 'rgba(16,185,129,.25)',  color: '#6ee7b7' },
    '🔒':    { bg: 'rgba(239,68,68,.2)',    color: '#fca5a5' },
    'AI':    { bg: 'rgba(139,92,246,.25)',  color: '#c4b5fd' },
    '7':     { bg: 'rgba(239,68,68,.2)',    color: '#fca5a5' },
    '!':     { bg: 'rgba(245,158,11,.2)',   color: '#fcd34d' },
    'New':   { bg: 'rgba(59,130,246,.2)',   color: '#93c5fd' },
    'Beta':  { bg: 'rgba(245,158,11,.2)',   color: '#fcd34d' },
  }
  return map[badge] || { bg: 'rgba(239,68,68,.2)', color: '#fca5a5' }
}

// ── Nav Item ──────────────────────────────────────────────────
function NavItem({ child, isActive, onClick }) {
  const bs = badgeStyle(child.badge)
  return (
    <button
      onClick={onClick}
      title={child.label}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 14px 5px 24px',
        border: 'none',
        background: isActive ? 'rgba(59,130,246,.18)' : 'transparent',
        color: isActive ? '#93c5fd' : '#64748b',
        fontSize: 11,
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: 6,
        marginBottom: 1,
        transition: 'all .12s',
        borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,.05)'
          e.currentTarget.style.color = '#cbd5e1'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#64748b'
        }
      }}
    >
      {/* Active dot */}
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: isActive ? '#60a5fa' : '#334155',
        flexShrink: 0,
        transition: 'background .15s',
      }} />

      {/* Label */}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
        {child.label}
      </span>

      {/* Badge */}
      {bs && (
        <span style={{
          background: bs.bg, color: bs.color,
          fontSize: 9, padding: '1px 5px',
          borderRadius: 8, fontWeight: 700,
          flexShrink: 0, lineHeight: 1.5,
        }}>
          {child.badge}
        </span>
      )}
    </button>
  )
}

// ── Menu Section ──────────────────────────────────────────────
function MenuSection({ menu, isExpanded, onToggle, activeSub, onNavTo, t }) {
  return (
    <div>
      {/* Section Header */}
      <button
        onClick={() => onToggle(menu.id)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          border: 'none',
          background: 'transparent',
          color: isExpanded ? '#cbd5e1' : '#64748b',
          fontSize: 11,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'color .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#cbd5e1'}
        onMouseLeave={e => e.currentTarget.style.color = isExpanded ? '#cbd5e1' : '#64748b'}
      >
        <span style={{ fontSize: 15, flexShrink: 0 }}>{menu.icon}</span>
        <span style={{ flex: 1, fontWeight: 600, letterSpacing: '.01em', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t(menu.labelKey) || menu.label}
        </span>
        <span style={{
          fontSize: 9,
          transition: 'transform .2s',
          display: 'inline-block',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
          color: '#475569',
        }}>
          ▶
        </span>
      </button>

      {/* Children */}
      {isExpanded && (
        <div style={{ paddingLeft: 4, paddingRight: 4 }}>
          {menu.children?.map(child => (
            <NavItem
              key={child.id}
              child={child}
              isActive={activeSub === child.id}
              onClick={() => onNavTo(child.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────
export default function Sidebar({ open }) {
  const {
    persona, switchPersona,
    sub, navTo,
    expanded, toggleExpanded,
    t, language,
  } = useApp()

  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [personaListOpen, setPersonaListOpen] = useState(false)

  const currentPersonaObj = PERSONAS.find(p => p.id === persona) || PERSONAS[0]

  if (!open) return null

  // ── RBAC: Determine which modules this persona can access ──
  const allowedModules = MODULE_ACCESS[persona]   // 'all' or array of module ids
  const isAllAccess    = allowedModules === 'all'
  const isEmployee     = persona === 'employee'
  const myDashboard    = PERSONA_DASHBOARD[persona] || PERSONA_DASHBOARD['employee']

  // ── Build RBAC-filtered menu ──────────────────────────────
  const rbacMenu = SIDEBAR_MENU
    // 1. Filter top-level modules
    .filter(menu => isAllAccess || (allowedModules || []).includes(menu.id))
    // 2. For each allowed module, filter its children
    .map(menu => {
      // Inject persona dashboard into dashboard section
      if (menu.id === 'dashboard') {
        const myDashItem = {
          id:    myDashboard.id,
          label: myDashboard.label,
          icon:  myDashboard.icon,
          group: 'My Dashboard',
          badge: '●',
        }
        let children = (menu.children || [])
          .filter(c => c.group !== 'Persona Dashboards')

        // Employees: only show self-service dashboard items
        if (isEmployee) {
          children = children.filter(c =>
            ['Widgets','Snapshots'].includes(c.group) === false ||
            ['calendar-events','notifications','birthday-anniversary','upcoming-events'].includes(c.id)
          )
        }
        return { ...menu, children: [myDashItem, ...children] }
      }

      // hr-services module: employees see only self-service children
      if (menu.id === 'hr-services' && isEmployee) {
        const selfServiceIds = new Set([
          'apply-leave','leave-balance','my-attendance','my-payslip',
          'my-documents','my-profile','expense-claim','loan-application',
          'advance-salary','timesheet','my-feedback','my-grievance',
          'my-tasks','my-training','employee-self-service',
        ])
        return {
          ...menu,
          children: (menu.children || []).filter(c => selfServiceIds.has(c.id)),
        }
      }

      // All other modules for non-employee: filter blocked IDs
      if (!isEmployee && !isAllAccess) {
        const lvl4Blocked = new Set([
          'payroll-processing','payroll-setup','salary-structure',
          'tax-config','payroll-batch','payroll-approval',
          'company-settings','workflow-config','permission-matrix',
          'system-config','user-management','role-config',
          'integration-setup','audit-log','system-audit',
        ])
        return {
          ...menu,
          children: (menu.children || []).filter(c => !lvl4Blocked.has(c.id)),
        }
      }

      return menu
    })
    // 3. Remove empty sections
    .filter(menu => menu.children?.length > 0)

  // ── Search filter on top of RBAC ────────────────────────────
  const isSearching = !!search.trim()
  const filteredMenu = isSearching
    ? rbacMenu.map(menu => ({
        ...menu,
        children: menu.children?.filter(c =>
          c.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(menu => menu.children?.length > 0)
    : rbacMenu

  return (
    <aside
      className="sidebar-scroll"
      style={{
        width: 248,
        minWidth: 248,
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflowY: 'auto',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,.06)',
      }}
    >
      {/* ── Brand ── */}
      <div style={{
        padding: '18px 16px 14px',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(59,130,246,.3)',
          }}>
            🏢
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc', letterSpacing: '-.3px' }}>
              NepHR Pro
            </div>
            <div style={{ fontSize: 10, color: '#475569' }}>
              HRIS · HRMS · HRIM
            </div>
          </div>
          {/* Search toggle */}
          <button
            onClick={() => setShowSearch(s => !s)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14, padding: 4, borderRadius: 6 }}
            title="Search menu"
          >
            🔍
          </button>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <input
            type="text"
            placeholder="Search menu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%', marginTop: 10,
              padding: '6px 10px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,.1)',
              background: 'rgba(255,255,255,.06)',
              color: '#f1f5f9', fontSize: 11,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        )}
      </div>

        {/* Persona Switcher — SuperAdmin + Executive only */}
        {['super-admin','executive'].includes(persona) && (
        <div style={{
          padding: '10px 10px 8px',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          flexShrink: 0,
        }}>
        <button
          onClick={() => setPersonaListOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 8,
            border: 'none',
            background: 'rgba(59,130,246,.12)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: currentPersonaObj?.dot || '#3b82f6', flexShrink: 0,
            boxShadow: `0 0 6px ${currentPersonaObj?.dot || '#3b82f6'}80`,
          }} />
          <span style={{ fontSize: 14 }}>{currentPersonaObj?.icon}</span>
          <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#93c5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t(currentPersonaObj?.labelKey) || currentPersonaObj?.label}
          </span>
          <span style={{ fontSize: 9, color: '#475569', transition: 'transform .15s', transform: personaListOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
        </button>

        {personaListOpen && (
          <div style={{
            marginTop: 6,
            maxHeight: 180,
            overflowY: 'auto',
            borderRadius: 8,
            background: 'rgba(255,255,255,.02)',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: '#334155',
              textTransform: 'uppercase', letterSpacing: '.1em',
              padding: '6px 8px 4px',
            }}>
              {t('switchPersona')}
            </div>

            {PERSONAS.filter(p =>
              // Only show relevant personas to admins; others see only their own
              ['super-admin','executive'].includes(persona)
                ? true
                : p.id === persona
            ).map(p => {
              const isActive = persona === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => { switchPersona(p.id); setPersonaListOpen(false) }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: 'none',
                    background: isActive ? 'rgba(59,130,246,.2)' : 'transparent',
                    color: isActive ? '#93c5fd' : '#64748b',
                    fontSize: 11,
                    cursor: 'pointer',
                    marginBottom: 1,
                    textAlign: 'left',
                    transition: 'all .12s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,.05)'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Color dot */}
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: p.dot, flexShrink: 0,
                    boxShadow: isActive ? `0 0 6px ${p.dot}80` : 'none',
                  }} />

                  {/* Icon */}
                  <span style={{ fontSize: 14 }}>{p.icon}</span>

                  {/* Label */}
                  <span style={{ flex: 1, fontWeight: isActive ? 700 : 400 }}>
                    {t(p.labelKey) || p.label}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#60a5fa', flexShrink: 0,
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        )}
        </div>
        )}


      {/* ── Navigation (now genuinely gets the bulk of the sidebar's
           vertical space -- flex: 1 on a flex-column parent that no
           longer has an unconstrained sibling above it) ── */}
      <nav style={{ flex: 1, padding: '6px 0', overflow: 'auto', minHeight: 0 }}>
        {search.trim() && filteredMenu.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: '#475569', fontSize: 12 }}>
            No results for "{search}"
          </div>
        )}

        {filteredMenu.map(menu => (
          <MenuSection
            key={menu.id}
            menu={menu}
            isExpanded={isSearching || !!expanded[menu.id]}
            onToggle={toggleExpanded}
            activeSub={sub}
            onNavTo={navTo}
            t={t}
          />
        ))}
      </nav>

      {/* ── Bottom Info ── */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid rgba(255,255,255,.07)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, color: '#334155', marginBottom: 2 }}>
          NepHR Pro v3.0 · Multi-Tenant SaaS
        </div>
        <div style={{ fontSize: 9, color: '#334155', marginBottom: 2 }}>
          Nepal Labour Act 2017 · RBAC · Privacy Act 2018
        </div>
        <div style={{ fontSize: 9, color: '#1e3a8a', background: 'rgba(59,130,246,.1)', padding: '3px 7px', borderRadius: 5, display: 'inline-block', marginTop: 2 }}>
          🔒 All data encrypted · AES-256
        </div>
      </div>
    </aside>
  )
}

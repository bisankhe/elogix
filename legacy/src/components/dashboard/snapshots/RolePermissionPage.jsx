// FILE: src/components/dashboard/snapshots/RolePermissionPage.jsx
// eLogix HRMS — Role & Permission Management
// Tenant SuperAdmin assigns roles/permissions to their OWN staff
// ─────────────────────────────────────────────────────────────
// KEY RULES:
//   1. Tenant SuperAdmin can ONLY grant permissions for modules that
//      eLogix SuperAdmin has activated (from tenantPermissions.js).
//   2. Modules NOT in tenant's plan are shown locked (cannot be granted).
//   3. Roles available depend on the plan (trial = fewer roles).
//   4. Business type adds relevant role defaults (e.g. recruiter for agencies).
//   5. All role assignments are stored per-tenant in localStorage.
// eLogix Technologies · www.elogix.com.np

import { useState, useMemo } from 'react'
import {
  resolveTenantAccess,
  getSessionSlug,
  getTenantPermissionRecord,
  getTenantModules,
  MODULE_TO_SIDEBAR,
} from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

// ── Get session info ──────────────────────────────────────────────────
function getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch(_e) { return {} }
}

// ── MODULE DISPLAY CONFIG ─────────────────────────────────────────────
// Maps tenantPermissions module keys → display info for the role matrix
const MODULE_DISPLAY = {
  employee      : { label:'Employee Management',        icon:'👤', group:'Core HR',     actions:['view','create','edit','delete','export'] },
  org_setup     : { label:'Organisation Setup',         icon:'🏢', group:'Core HR',     actions:['view','create','edit','delete'] },
  attendance    : { label:'Attendance & Time',           icon:'⏰', group:'Core HR',     actions:['view','create','edit','approve','export'] },
  leave         : { label:'Leave Management',            icon:'📅', group:'Core HR',     actions:['view','create','edit','approve','export'] },
  payroll       : { label:'Payroll & Compensation',      icon:'💰', group:'Core HR',     actions:['view','create','edit','approve','export'] },
  self_service  : { label:'Employee Self-Service (ESS)', icon:'🙋', group:'Core HR',     actions:['view','create','edit'] },
  documents     : { label:'Document Management',         icon:'📋', group:'Core HR',     actions:['view','create','edit','delete','export'] },
  ats           : { label:'Recruitment / ATS',           icon:'🎯', group:'Recruitment', actions:['view','create','edit','approve','export'] },
  job_portal    : { label:'Job Portal & Career Page',    icon:'🌐', group:'Recruitment', actions:['view','create','edit'] },
  interview     : { label:'Interview Management',         icon:'🎤', group:'Recruitment', actions:['view','create','edit','approve'] },
  onboarding    : { label:'Onboarding',                  icon:'🚀', group:'Recruitment', actions:['view','create','edit','approve'] },
  candidate_pool: { label:'Candidate Pool & CRM',        icon:'🗂', group:'Recruitment', actions:['view','create','edit','export'] },
  jd_library    : { label:'JD Library',                  icon:'📝', group:'Recruitment', actions:['view','create','edit','delete'] },
  outsource     : { label:'Outsource / Vendor',          icon:'🤝', group:'Recruitment', actions:['view','create','edit','approve'] },
  performance   : { label:'Performance Management',      icon:'🏆', group:'Performance', actions:['view','create','edit','approve','export'] },
  goals         : { label:'Goals / KPI / OKR',           icon:'🎯', group:'Performance', actions:['view','create','edit','approve'] },
  '360_feedback': { label:'360° Feedback',               icon:'🔄', group:'Performance', actions:['view','create','edit'] },
  pip           : { label:'Performance Improvement Plan', icon:'📈', group:'Performance', actions:['view','create','edit','approve'] },
  training      : { label:'Training & LMS',              icon:'📚', group:'Training',    actions:['view','create','edit','approve','export'] },
  skill_matrix  : { label:'Skill Gap & Matrix',          icon:'🧠', group:'Training',    actions:['view','create','edit'] },
  career_pathing: { label:'Career Pathing & Succession',  icon:'🗺', group:'Training',    actions:['view','create','edit'] },
  finance       : { label:'HR Budgeting & Finance',       icon:'💹', group:'Finance',     actions:['view','create','edit','approve','export'] },
  compliance    : { label:'Compliance & Risk',            icon:'⚖️', group:'Finance',     actions:['view','create','edit','export'] },
  tax           : { label:'Tax & SSF',                   icon:'🧾', group:'Finance',     actions:['view','create','edit'] },
  loan          : { label:'Loan & Advance',              icon:'🏦', group:'Finance',     actions:['view','create','edit','approve'] },
  expense       : { label:'Expense & Travel Claims',     icon:'🧳', group:'Finance',     actions:['view','create','edit','approve'] },
  ai_chatbot    : { label:'AI HR Assistant',             icon:'🤖', group:'AI',          actions:['view'] },
  ai_bi         : { label:'AI Business Intelligence',    icon:'📊', group:'AI',          actions:['view','export'] },
  reports       : { label:'Reports & Analytics',         icon:'📈', group:'Analytics',   actions:['view','create','export'] },
  ai_letters    : { label:'AI HR Letters',               icon:'✉️', group:'AI',          actions:['view','create'] },
  manpower      : { label:'Manpower Planning',           icon:'👥', group:'Workforce',   actions:['view','create','edit','approve'] },
  org_chart     : { label:'Organisation Chart',          icon:'🌳', group:'Workforce',   actions:['view','export'] },
  roster        : { label:'Roster & Shift Management',   icon:'📆', group:'Workforce',   actions:['view','create','edit'] },
  overtime      : { label:'Overtime Management',         icon:'⏱', group:'Workforce',   actions:['view','create','edit','approve'] },
  announcements : { label:'Announcements & Calendar',   icon:'📢', group:'Communication',actions:['view','create','edit'] },
  helpdesk      : { label:'HR Helpdesk',                 icon:'🎧', group:'Communication',actions:['view','create','edit','approve'] },
  exit          : { label:'Exit & Resignation',          icon:'🚪', group:'Communication',actions:['view','create','edit','approve'] },
  integrations  : { label:'Integrations & API',          icon:'🔗', group:'System',      actions:['view','create','edit'] },
  biometric     : { label:'Biometric Integration',       icon:'👁', group:'System',      actions:['view','create','edit'] },
  permissions   : { label:'User & Permission Management', icon:'🔐', group:'System',     actions:['view','create','edit','delete'] },
  audit_log     : { label:'Audit Logs',                  icon:'📜', group:'System',      actions:['view','export'] },
  billing       : { label:'Billing & Subscription',      icon:'💳', group:'System',      actions:['view'] },
  white_label   : { label:'White Label / Branding',      icon:'🎨', group:'System',      actions:['view','create','edit'] },
  multi_branch  : { label:'Multi-branch Management',     icon:'🏬', group:'System',      actions:['view','create','edit'] },
}

// ── ROLE TEMPLATES per business type ─────────────────────────────────
const BASE_ROLES = [
  { key:'super_admin',    label:'Company Super Admin', level:1,  color:'#7c3aed', protected:true,
    desc:'Full access to all granted modules. Cannot be restricted.' },
  { key:'executive',      label:'Executive / Director', level:2,  color:'#0c4a6e',
    desc:'View-only across all modules, approve major transactions.' },
  { key:'hr_manager',     label:'HR Manager',           level:3,  color:'#0369a1',
    desc:'Full HR module access — create, edit, approve, export.' },
  { key:'hr_officer',     label:'HR Officer',           level:4,  color:'#0891b2',
    desc:'Standard HR tasks — create and edit, no delete/approve.' },
  { key:'finance_officer',label:'Finance Officer',      level:3,  color:'#059669',
    desc:'Finance, payroll, tax modules — approve and export.' },
  { key:'department_head',label:'HOD / Department Head', level:4, color:'#d97706',
    desc:'Own department only — view all, approve team tasks.' },
  { key:'team_lead',      label:'Team Lead / Supervisor', level:5, color:'#7c3aed',
    desc:'Own team — view and forward attendance/leave.' },
  { key:'employee',       label:'Employee (ESS)',       level:10, color:'#64748b',
    desc:'Self-service only — view own data, submit requests.' },
]

const BIZ_EXTRA_ROLES = {
  recruitment_agency: [
    { key:'recruiter',     label:'Recruiter',           level:4, color:'#0891b2',  desc:'ATS, candidate management, job posting.' },
    { key:'vendor_mgr',    label:'Vendor Manager',      level:4, color:'#d97706',  desc:'Vendor, outsource, billing management.' },
    { key:'interviewer',   label:'Interviewer (Panel)', level:6, color:'#64748b',  desc:'Interview panel access only.' },
  ],
  it_software: [
    { key:'recruiter',     label:'Tech Recruiter',      level:4, color:'#0891b2',  desc:'ATS, JD library, candidate pipeline.' },
    { key:'tech_lead',     label:'Technical Lead',      level:5, color:'#7c3aed',  desc:'Performance, goals, skill matrix.' },
  ],
  bank_finance: [
    { key:'compliance_officer', label:'Compliance Officer', level:3, color:'#dc2626', desc:'Compliance, audit, risk management.' },
    { key:'branch_manager',     label:'Branch Manager',     level:4, color:'#d97706',  desc:'Branch-level staff management.' },
  ],
  hospital_health: [
    { key:'shift_supervisor', label:'Shift Supervisor', level:5, color:'#d97706', desc:'Roster, shift, attendance for their shift.' },
    { key:'nurse_manager',    label:'Clinical Manager',  level:4, color:'#0891b2', desc:'Clinical staff attendance and leave.' },
  ],
  manufacturing: [
    { key:'shift_supervisor', label:'Shift Supervisor', level:5, color:'#d97706', desc:'Roster, overtime, attendance.' },
    { key:'factory_manager',  label:'Factory Manager',  level:4, color:'#dc2626', desc:'Branch-level operations and OT.' },
  ],
}

// Default action grants per role level for a module
function defaultGrants(roleLevel, moduleKey) {
  const sensitive = ['payroll','tax','finance','loan','audit_log','billing']
  const isSensitive = sensitive.includes(moduleKey)

  if (roleLevel === 1) return { view:true, create:true, edit:true, delete:true, approve:true, export:true }
  if (roleLevel === 2) return { view:true, create:false, edit:false, delete:false, approve:isSensitive?false:true, export:true }
  if (roleLevel === 3) return { view:true, create:true, edit:true, delete:false, approve:true, export:true }
  if (roleLevel === 4) return { view:true, create:true, edit:true, delete:false, approve:false, export:false }
  if (roleLevel === 5) return { view:true, create:false, edit:false, delete:false, approve:false, export:false }
  return { view:true, create:false, edit:false, delete:false, approve:false, export:false } // L10 employee
}

const STORAGE_KEY = (slug) => `elogix_role_permissions:${slug}`

function loadRolePerms(slug, roles, grantedModules) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY(slug)) || 'null')
    if (saved) return saved
  } catch(_e) {}
  // Build defaults based on granted modules
  const perms = {}
  roles.forEach(role => {
    perms[role.key] = {}
    grantedModules.forEach(modKey => {
      perms[role.key][modKey] = defaultGrants(role.level, modKey)
    })
  })
  return perms
}

function saveRolePerms(slug, perms) {
  try {
    localStorage.setItem(STORAGE_KEY(slug), JSON.stringify(perms))
    return true
  } catch(_e) { return false }
}

// ── PLAN LIMITS on roles ──────────────────────────────────────────────
const PLAN_ALLOWED_ROLES = {
  trial:      ['super_admin','employee'],
  starter:    ['super_admin','hr_officer','finance_officer','employee'],
  growth:     ['super_admin','executive','hr_manager','hr_officer','finance_officer','department_head','team_lead','employee'],
  business:   BASE_ROLES.map(r=>r.key),
  enterprise: BASE_ROLES.map(r=>r.key),
  unlimited:  BASE_ROLES.map(r=>r.key),
}

// ─────────────────────────────────────────────────────────────────────
export default function RolePermissionPage() {
  const slug      = getSessionSlug()
  const access    = resolveTenantAccess(slug)
  const permRec   = getTenantPermissionRecord(slug)
  const sess      = getSession()
  const company   = sess.company || {}
  const plan      = (company.plan || 'trial').toLowerCase()
  const bizType   = company.business_type || 'custom'

  // ── Gate: must have permissions module ───────────────────────────
  if (!access.hasAccess('permissions')) {
    return <AccessDenied moduleName="Role & Permission Management" />
  }

  // ── Granted modules from eLogix SuperAdmin ────────────────────────
  const grantedModules = access.modules  // e.g. ['employee','attendance','ats',...]

  // ── Build role list: base roles filtered by plan + biz extras ────
  const allowedRoleKeys = new Set(PLAN_ALLOWED_ROLES[plan] || PLAN_ALLOWED_ROLES.trial)
  const bizExtras = BIZ_EXTRA_ROLES[bizType] || []

  const allRoles = [
    ...BASE_ROLES.filter(r => allowedRoleKeys.has(r.key)),
    ...bizExtras,
  ]

  // ── All modules grouped, split by granted vs locked ───────────────
  const grantedSet = new Set(grantedModules)
  const allModuleKeys = Object.keys(MODULE_DISPLAY)

  // Modules by group
  const modulesByGroup = useMemo(() => {
    const groups = {}
    allModuleKeys.forEach(key => {
      const m = MODULE_DISPLAY[key]
      if (!groups[m.group]) groups[m.group] = []
      groups[m.group].push({ key, ...m, granted: grantedSet.has(key) })
    })
    return groups
  }, [grantedModules.join(',')])

  // ── State ─────────────────────────────────────────────────────────
  const [perms, setPerms]       = useState(() => loadRolePerms(slug, allRoles, grantedModules))
  const [selRole, setSelRole]   = useState(allRoles[0]?.key || 'super_admin')
  const [search, setSearch]     = useState('')
  const [groupFilter, setGroupFilter] = useState('All')
  const [toast, setToast]       = useState('')
  const [saved, setSaved]       = useState(false)
  const [showLocked, setShowLocked] = useState(false)

  const notify = m => { setToast(m); setTimeout(() => setToast(''), 3200) }

  const role = allRoles.find(r => r.key === selRole)

  // ── Toggle a single permission ────────────────────────────────────
  const toggle = (modKey, action) => {
    if (role?.protected) return
    if (!grantedSet.has(modKey)) return  // cannot grant locked modules
    setPerms(p => ({
      ...p,
      [selRole]: {
        ...(p[selRole] || {}),
        [modKey]: {
          ...(p[selRole]?.[modKey] || {}),
          [action]: !(p[selRole]?.[modKey]?.[action] || false),
        }
      }
    }))
    setSaved(false)
  }

  const hasAction = (modKey, action) => {
    if (role?.protected) return true   // super_admin always has all granted modules
    return !!(perms[selRole]?.[modKey]?.[action])
  }

  // ── Grant all / revoke all for a module ───────────────────────────
  const toggleModuleAll = (modKey, grantAll) => {
    if (role?.protected || !grantedSet.has(modKey)) return
    const mod = MODULE_DISPLAY[modKey]
    const newActions = {}
    mod.actions.forEach(a => { newActions[a] = grantAll })
    setPerms(p => ({
      ...p,
      [selRole]: {
        ...(p[selRole] || {}),
        [modKey]: newActions
      }
    }))
    setSaved(false)
  }

  // ── Apply template: reset role to plan defaults ───────────────────
  const applyDefault = () => {
    if (role?.protected) return
    const defaults = {}
    grantedModules.forEach(modKey => {
      defaults[modKey] = defaultGrants(role.level, modKey)
    })
    setPerms(p => ({ ...p, [selRole]: defaults }))
    notify('↩️ Reset to plan defaults')
    setSaved(false)
  }

  // ── Save ─────────────────────────────────────────────────────────
  const handleSave = () => {
    const ok = saveRolePerms(slug, perms)
    if (ok) { setSaved(true); notify('✅ Role permissions saved') }
    else notify('❌ Save failed')
  }

  // ── Grant all unlocked modules to this role ───────────────────────
  const grantAllUnlocked = () => {
    if (role?.protected) return
    const allGrants = {}
    grantedModules.forEach(modKey => {
      const mod = MODULE_DISPLAY[modKey]
      if (!mod) return
      allGrants[modKey] = {}
      mod.actions.forEach(a => { allGrants[modKey][a] = true })
    })
    setPerms(p => ({ ...p, [selRole]: allGrants }))
    notify('✅ All unlocked modules granted')
    setSaved(false)
  }

  const revokeAll = () => {
    if (role?.protected) return
    const minimal = {}
    grantedModules.forEach(modKey => {
      minimal[modKey] = {}
      ;(MODULE_DISPLAY[modKey]?.actions || []).forEach(a => { minimal[modKey][a] = false })
      minimal[modKey].view = true  // always keep view
    })
    setPerms(p => ({ ...p, [selRole]: minimal }))
    notify('🚫 All access revoked (view-only)')
    setSaved(false)
  }

  // ── Filter modules ────────────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase()
    const result = {}
    Object.entries(modulesByGroup).forEach(([group, modules]) => {
      if (groupFilter !== 'All' && group !== groupFilter) return
      const filtered = modules.filter(m =>
        !q || m.label.toLowerCase().includes(q)
      )
      if (filtered.length) result[group] = filtered
    })
    return result
  }, [modulesByGroup, search, groupFilter])

  const groups = [...new Set(Object.keys(MODULE_DISPLAY).map(k => MODULE_DISPLAY[k].group))]
  const grantedCount = grantedModules.length
  const lockedCount  = allModuleKeys.length - grantedCount

  return (
    <div style={{
      fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#f0f4ff', minHeight:'100vh', paddingBottom:40,
    }}>
      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',bottom:20,right:20,zIndex:9999,
          background:toast.startsWith('❌')?'#fef2f2':'#f0fdf4',
          border:`1px solid ${toast.startsWith('❌')?'#fecaca':'#bbf7d0'}`,
          borderRadius:10,padding:'10px 18px',fontSize:12,fontWeight:600,
          color:toast.startsWith('❌')?'#dc2626':'#065f46',
          boxShadow:'0 4px 16px rgba(0,0,0,.12)'}}>
          {toast}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{background:G,padding:'16px 24px',color:'#fff',marginBottom:0}}>
        <div style={{fontSize:11,opacity:.7,marginBottom:4}}>
          System Administration › User & Access
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>🔐 Role & Permission Management</div>
            <div style={{fontSize:11,opacity:.8,marginTop:2}}>
              {company.name || 'Your Company'} ·
              Plan: <strong>{plan.charAt(0).toUpperCase()+plan.slice(1)}</strong> ·
              {grantedCount} modules activated by eLogix SuperAdmin
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {permRec && (
              <div style={{fontSize:10,background:'rgba(255,255,255,.15)',
                padding:'6px 12px',borderRadius:20,border:'1px solid rgba(255,255,255,.3)'}}>
                ✅ Last updated: {new Date(permRec.granted_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:8,marginTop:14}}>
          {[
            {label:'Roles Available',  v:allRoles.length,  icon:'🎖'},
            {label:'Modules Granted',  v:grantedCount,     icon:'✅'},
            {label:'Modules Locked',   v:lockedCount,      icon:'🔒'},
            {label:'Your Plan',        v:plan.charAt(0).toUpperCase()+plan.slice(1), icon:'📦'},
          ].map(s=>(
            <div key={s.label} style={{background:'rgba(255,255,255,.12)',borderRadius:8,
              padding:'8px 12px',textAlign:'center',border:'1px solid rgba(255,255,255,.2)'}}>
              <div style={{fontSize:16}}>{s.icon}</div>
              <div style={{fontSize:16,fontWeight:900,lineHeight:1,marginTop:3}}>{s.v}</div>
              <div style={{fontSize:9,opacity:.75,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PLAN INFO BANNER ── */}
      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',
        padding:'10px 24px',fontSize:11,color:'#3730a3',
        display:'flex',gap:10,alignItems:'flex-start',flexWrap:'wrap'}}>
        <span style={{fontSize:16,flexShrink:0}}>ℹ️</span>
        <div>
          <strong>Permission Boundary:</strong> You can only assign access to modules your plan includes.
          Modules marked 🔒 are not in your <strong>{plan}</strong> plan or have not been activated by eLogix SuperAdmin.
          <span style={{marginLeft:8}}>
            <a href="mailto:support@elogix.com.np" style={{color:'#4338ca',textDecoration:'none',fontWeight:700}}>
              Contact eLogix to upgrade →
            </a>
          </span>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'250px 1fr',gap:16,padding:'16px 20px',alignItems:'start'}}>

        {/* ── LEFT: Role List ── */}
        <div style={{background:'#fff',borderRadius:14,boxShadow:'0 2px 10px rgba(0,0,0,.06)',overflow:'hidden',position:'sticky',top:16}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',
            fontSize:12,fontWeight:800,color:'#374151',display:'flex',justifyContent:'space-between'}}>
            <span>🎖 Roles</span>
            <span style={{fontSize:10,color:'#94a3b8',fontWeight:400}}>{allRoles.length} roles</span>
          </div>

          {allRoles.map(r => (
            <div key={r.key} onClick={() => setSelRole(r.key)}
              style={{padding:'10px 14px',cursor:'pointer',transition:'all .1s',
                background:selRole===r.key ? `${r.color}12` : '#fff',
                borderLeft:`3px solid ${selRole===r.key?r.color:'transparent'}`,
                borderBottom:'1px solid #f8fafc'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:selRole===r.key?r.color:'#374151'}}>
                    {r.label}
                    {r.protected && <span style={{marginLeft:6,fontSize:9,color:'#7c3aed'}}>👑</span>}
                  </div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>Level {r.level} · {r.desc?.split('—')[0]}</div>
                </div>
                <span style={{fontSize:9,padding:'2px 7px',borderRadius:10,flexShrink:0,
                  background:`${r.color}18`,color:r.color,fontWeight:700}}>
                  L{r.level}
                </span>
              </div>
            </div>
          ))}

          <div style={{padding:'12px 14px',borderTop:'1px solid #f1f5f9',fontSize:10,color:'#94a3b8',lineHeight:1.5}}>
            {plan === 'trial' && '⚠️ Trial plan: only 2 roles available. Upgrade for full role hierarchy.'}
            {plan === 'starter' && '📦 Starter plan: 4 roles. Upgrade to Growth for department/team roles.'}
            {!['trial','starter'].includes(plan) && `✅ ${plan.charAt(0).toUpperCase()+plan.slice(1)} plan: all ${allRoles.length} roles available.`}
          </div>
        </div>

        {/* ── RIGHT: Permission Editor ── */}
        <div>
          {role && (
            <>
              {/* Role header */}
              <div style={{background:'#fff',borderRadius:14,padding:'16px 20px',
                boxShadow:'0 2px 10px rgba(0,0,0,.06)',marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:900,color:role.color}}>{role.label}</div>
                    <div style={{fontSize:11,color:'#64748b',marginTop:3}}>{role.desc}</div>
                    {role.protected && (
                      <div style={{marginTop:8,background:'#f5f3ff',border:'1px solid #ddd6fe',
                        borderRadius:8,padding:'8px 12px',fontSize:11,color:'#5b21b6',fontWeight:600}}>
                        👑 Super Admin has full access to all activated modules. Cannot be restricted.
                        eLogix SuperAdmin controls which modules are available to your company.
                      </div>
                    )}
                  </div>
                  {!role.protected && (
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <button onClick={grantAllUnlocked}
                        style={{padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',
                          background:'#f0fdf4',color:'#16a34a',fontSize:11,fontWeight:700}}>
                        ✅ Grant All
                      </button>
                      <button onClick={revokeAll}
                        style={{padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',
                          background:'#fef2f2',color:'#dc2626',fontSize:11,fontWeight:700}}>
                        🚫 Revoke All
                      </button>
                      <button onClick={applyDefault}
                        style={{padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',
                          background:'#eff6ff',color:'#1d4ed8',fontSize:11,fontWeight:700}}>
                        ↩️ Reset Defaults
                      </button>
                      <button onClick={handleSave}
                        style={{padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',
                          background:G,color:'#fff',fontSize:11,fontWeight:700}}>
                        💾 Save{saved ? ' ✓' : ''}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Search + filter */}
              <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search modules..."
                  style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',
                    fontSize:12,outline:'none',flex:1,minWidth:180,fontFamily:'inherit'}}/>
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {['All',...groups].map(g=>(
                    <button key={g} onClick={()=>setGroupFilter(g)}
                      style={{padding:'5px 12px',borderRadius:20,border:'none',cursor:'pointer',
                        fontSize:10,fontWeight:600,
                        background:groupFilter===g?A:'#f1f5f9',
                        color:groupFilter===g?'#fff':'#475569'}}>
                      {g}
                    </button>
                  ))}
                </div>
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#64748b',cursor:'pointer'}}>
                  <input type="checkbox" checked={showLocked} onChange={e=>setShowLocked(e.target.checked)}
                    style={{cursor:'pointer'}}/>
                  Show locked modules
                </label>
              </div>

              {/* Module permission cards */}
              {Object.entries(filteredGroups).map(([group, modules]) => (
                <div key={group} style={{marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:800,color:'#374151',
                    marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                    <span style={{textTransform:'uppercase',letterSpacing:1,fontSize:10,color:'#94a3b8'}}>{group}</span>
                    <div style={{flex:1,height:1,background:'#f1f5f9'}}/>
                    <span style={{fontSize:9,color:'#94a3b8'}}>
                      {modules.filter(m=>m.granted).length}/{modules.length} activated
                    </span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:8}}>
                    {modules.map(mod => {
                      const isGranted = mod.granted
                      if (!isGranted && !showLocked) return null

                      return (
                        <div key={mod.key} style={{
                          background: isGranted ? '#fff' : '#f8fafc',
                          borderRadius:10,padding:'12px 14px',
                          border:`1.5px solid ${isGranted?'#e2e8f0':'#f1f5f9'}`,
                          opacity: isGranted ? 1 : 0.65,
                          boxShadow: isGranted ? '0 1px 4px rgba(0,0,0,.04)' : 'none',
                        }}>
                          {/* Module header */}
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontSize:18}}>{mod.icon}</span>
                              <div>
                                <div style={{fontSize:11,fontWeight:700,color:isGranted?'#0f172a':'#94a3b8'}}>
                                  {mod.label}
                                </div>
                                {!isGranted && (
                                  <div style={{fontSize:9,color:'#ef4444',fontWeight:600,marginTop:1}}>
                                    🔒 Not in your plan · Upgrade to unlock
                                  </div>
                                )}
                              </div>
                            </div>
                            {isGranted && !role.protected && (
                              <div style={{display:'flex',gap:4}}>
                                <button onClick={()=>toggleModuleAll(mod.key, true)}
                                  style={{padding:'2px 8px',borderRadius:6,border:'none',cursor:'pointer',
                                    background:'#f0fdf4',color:'#16a34a',fontSize:9,fontWeight:700}}>All</button>
                                <button onClick={()=>toggleModuleAll(mod.key, false)}
                                  style={{padding:'2px 8px',borderRadius:6,border:'none',cursor:'pointer',
                                    background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700}}>None</button>
                              </div>
                            )}
                          </div>

                          {/* Action toggles */}
                          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                            {mod.actions.map(action => {
                              const on = role.protected ? isGranted : (isGranted && hasAction(mod.key, action))
                              const canToggle = isGranted && !role.protected
                              return (
                                <button key={action}
                                  onClick={() => canToggle && toggle(mod.key, action)}
                                  disabled={!canToggle}
                                  style={{
                                    padding:'4px 10px',borderRadius:20,cursor:canToggle?'pointer':'default',
                                    border:`1.5px solid ${on?A:'#e2e8f0'}`,fontSize:10,fontWeight:700,
                                    background: on ? `${A}15` : '#f8fafc',
                                    color: on ? A : '#94a3b8',
                                    transition:'all .1s',
                                  }}>
                                  {on ? '✓' : ''} {action.charAt(0).toUpperCase()+action.slice(1)}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {!role.protected && (
                <div style={{marginTop:16,padding:'12px 16px',background:'#fff',
                  borderRadius:10,border:'1px solid #e2e8f0',
                  display:'flex',justifyContent:'flex-end'}}>
                  <button onClick={handleSave}
                    style={{padding:'10px 24px',borderRadius:9,border:'none',cursor:'pointer',
                      background:G,color:'#fff',fontSize:12,fontWeight:700}}>
                    💾 Save {role.label} Permissions
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

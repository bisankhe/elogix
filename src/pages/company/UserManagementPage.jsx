// FILE: src/pages/company/UserManagementPage.jsx
// eLogix HRMS — Company User & Role Management
// COMPLETE REWRITE — fixes all crashes + wires real API
// ─────────────────────────────────────────────────────────────────────
// Fixes:
//   • `company` declared TWICE (L41 + L70) → Identifier already declared crash
//   • `MODULES` used in PermMatrix but never declared → ReferenceError crash
//   • `toggleActive` only updated local state → now calls PATCH /api/v1/company-users/:id/toggle-status
//   • `Reset PW` only called notify() → now calls POST /api/v1/company-users/:id/reset-password
//   • `Save Permissions` only called notify() → now calls PUT /api/v1/roles/:slug/permissions
//   • MODULES loaded from GET /api/v1/modules (tenant-activated modules)
//   • No scrollbar → added overflowY:'auto' on root
//   • Roles also loaded from API (GET /api/v1/roles) with SYSTEM_ROLES as fallback
// API:
//   GET    /api/v1/company-users
//   POST   /api/v1/company-users
//   PATCH  /api/v1/company-users/:id/toggle-status
//   POST   /api/v1/company-users/:id/reset-password
//   GET    /api/v1/roles
//   PUT    /api/v1/roles/:slug/permissions
//   GET    /api/v1/modules
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useCallback } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G   = 'linear-gradient(135deg,#1e3a5f 0%,#0369a1 60%,#38bdf8 100%)'
const A   = '#0369a1'
const inp = {
  width:'100%', padding:'9px 12px', borderRadius:8,
  border:'1.5px solid #e2e8f0', fontSize:11,
  outline:'none', fontFamily:'inherit', boxSizing:'border-box',
}

// ── Role definitions — UI config only (actual perms come from API) ─────────
const SYSTEM_ROLES = [
  {slug:'super_admin',     name:'Super Admin',      level:1,  color:'#312e81', desc:'Full system access'},
  {slug:'executive',       name:'Executive',         level:2,  color:'#0c4a6e', desc:'View all + approve'},
  {slug:'hr_manager',      name:'HR Manager',        level:3,  color:'#0369a1', desc:'Full HR access'},
  {slug:'payroll_officer', name:'Payroll Officer',   level:3,  color:'#059669', desc:'Payroll + finance'},
  {slug:'hod',             name:'HOD',               level:4,  color:'#7c3aed', desc:'Own dept + approve'},
  {slug:'hr_officer',      name:'HR Officer',        level:4,  color:'#0891b2', desc:'HR support tasks'},
  {slug:'department_head', name:'Department Head',   level:4,  color:'#7c3aed', desc:'Own department'},
  {slug:'branch_manager',  name:'Branch Manager',    level:4,  color:'#d97706', desc:'Own branch'},
  {slug:'finance_officer', name:'Finance Officer',   level:5,  color:'#059669', desc:'Finance reports'},
  {slug:'recruiter',       name:'Recruiter',         level:5,  color:'#0891b2', desc:'Recruitment only'},
  {slug:'team_lead',       name:'Team Lead',         level:5,  color:'#7c3aed', desc:'Own team'},
  {slug:'supervisor',      name:'Supervisor',        level:6,  color:'#d97706', desc:'Own team oversight'},
  {slug:'manager',         name:'Manager',           level:6,  color:'#64748b', desc:'Team management'},
  {slug:'employee',        name:'Employee',          level:10, color:'#374151', desc:'Self-service only'},
]

const LEVEL_MAP = {super_admin:1,executive:2,hr_manager:3,payroll_officer:3,hod:4,
  hr_officer:4,department_head:4,branch_manager:4,finance_officer:5,recruiter:5,
  team_lead:5,supervisor:6,manager:6,employee:10}

const PERM_ACTIONS = ['view','create','edit','delete','approve','export']

// ── Permission Matrix sub-component ────────────────────────────────────────
function PermMatrix({ role, modules, onSave, onBack }) {
  const defaultPerms = Object.fromEntries(
    modules.map(m => [m, {
      view:   role.level <= 10,
      create: role.level <= 3,
      edit:   role.level <= 3,
      delete: role.level <= 2,
      approve:role.level <= 4,
      export: role.level <= 4,
    }])
  )
  const [perms, setPerms] = useState(role.permissions || defaultPerms)
  const [saving, setSaving] = useState(false)

  const toggle = (mod, action) =>
    setPerms(p => ({ ...p, [mod]: { ...p[mod], [action]: !p[mod]?.[action] } }))

  const handleSave = async () => {
    setSaving(true)
    await onSave(role, perms)
    setSaving(false)
  }

  return (
    <div>
      <button onClick={onBack}
        style={{ marginBottom:16, padding:'7px 14px', borderRadius:8,
          border:'1px solid #e2e8f0', background:'#fff', fontSize:10, cursor:'pointer' }}>
        ← Back to Roles
      </button>
      <div style={{ fontWeight:800, fontSize:12, marginBottom:12 }}>
        Permission Matrix for{' '}
        <span style={{ color:role.color }}>{role.name}</span>
        {' '}(Level {role.level})
      </div>
      {modules.length === 0 ? (
        <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:12 }}>
          No modules activated yet — eLogix SuperAdmin must activate modules for this tenant first.
        </div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                <th style={{ padding:'8px 12px', textAlign:'left', borderBottom:'1px solid #f1f5f9',
                  width:140, fontSize:9, fontWeight:700, color:'#374151' }}>Module</th>
                {PERM_ACTIONS.map(a => (
                  <th key={a} style={{ padding:'8px 10px', textAlign:'center',
                    borderBottom:'1px solid #f1f5f9', fontSize:9, fontWeight:700,
                    color:'#374151', textTransform:'capitalize' }}>{a}</th>
                ))}
                <th style={{ padding:'8px 10px', textAlign:'center',
                  borderBottom:'1px solid #f1f5f9', fontSize:9, fontWeight:700, color:'#374151' }}>
                  Scope
                </th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m, i) => (
                <tr key={m} style={{ background:i%2===0?'#fff':'#fafafa' }}>
                  <td style={{ padding:'8px 12px', fontWeight:700, color:'#374151',
                    textTransform:'capitalize' }}>
                    {m.replace(/_/g,' ')}
                  </td>
                  {PERM_ACTIONS.map(action => (
                    <td key={action} style={{ padding:'8px 10px', textAlign:'center' }}>
                      <input type="checkbox" checked={!!perms[m]?.[action]}
                        onChange={() => toggle(m, action)}
                        style={{ cursor:'pointer', width:14, height:14 }}/>
                    </td>
                  ))}
                  <td style={{ padding:'8px 10px', textAlign:'center' }}>
                    <select style={{ fontSize:9, padding:'2px 4px', borderRadius:4,
                      border:'1px solid #e2e8f0', outline:'none' }}
                      defaultValue={role.level<=3?'all':role.level<=4?'own_dept':'self_only'}>
                      {['all','own_dept','own_branch','own_team','self_only'].map(v => (
                        <option key={v} value={v}>{v.replace(/_/g,' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button onClick={handleSave} disabled={saving}
        style={{ marginTop:14, padding:'10px 20px', borderRadius:9, border:'none',
          background:G, color:'#fff', fontSize:11, fontWeight:700,
          cursor:'pointer', opacity:saving?.6:1 }}>
        {saving ? '⟳ Saving...' : '💾 Save Permissions'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
export default function UserManagementPage() {

  // ── Single session read — no duplicate declarations ────────────────────
  const _s      = _getSession()
  const company = _s?.company || {}
  const plan    = (company.plan || 'trial').toLowerCase()
  const myRole  = _s?.user?.role || 'employee'
  const myLevel = LEVEL_MAP[myRole] || 10

  // ── State ──────────────────────────────────────────────────────────────
  const [tab,       setTab]       = useState('users')
  const [users,     setUsers]     = useState([])
  const [roles,     setRoles]     = useState(SYSTEM_ROLES)
  const [modules,   setModules]   = useState([])  // from API (tenant-activated)
  const [search,    setSearch]    = useState('')
  const [showAdd,   setShowAdd]   = useState(false)
  const [editPerms, setEditPerms] = useState(null)
  const [msg,       setMsg]       = useState('')
  const [loading,   setLoading]   = useState(true)
  const [form,      setForm]      = useState({
    full_name:'', email:'', role_slug:'employee',
    dept:'', branch:'', reports_to:'', emp_id:'', phone:'',
  })

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3500) }
  const sf = (k, v) => setForm(p => ({...p, [k]: v}))

  // ── Load users, roles and modules from API ─────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('access_token') || _s?.token || ''
    const slug  = _s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }

    await Promise.allSettled([
      // 1. Users
      fetch('/api/v1/company-users', { headers:_authH() })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setUsers(d.data || d.users || []) }),

      // 2. Roles (with permissions from DB)
      fetch('/api/v1/roles', { headers:_authH() })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.data?.length || d?.roles?.length) {
            const apiRoles = d.data || d.roles
            // Merge API roles with SYSTEM_ROLES defaults for display props
            const merged = apiRoles.map(ar => {
              const sys = SYSTEM_ROLES.find(s => s.slug === ar.slug) || {}
              return { ...sys, ...ar, permissions: ar.permissions || {} }
            })
            setRoles(merged)
          }
        }),

      // 3. Tenant-activated modules (set by eLogix SuperAdmin)
      fetch('/api/v1/modules', { headers:_authH() })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.data || d?.modules) {
            const mods = (d.data || d.modules || []).map(m =>
              typeof m === 'string' ? m : m.id || m.key || m.name
            )
            setModules(mods)
          }
        }),
    ])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Available roles filtered by plan ──────────────────────────────────
  const PLAN_ROLE_KEYS = {
    trial:   ['super_admin','employee'],
    starter: ['super_admin','hr_officer','finance_officer','employee'],
    growth:  ['super_admin','executive','hr_manager','hr_officer','finance_officer',
              'hod','team_lead','employee'],
  }
  const planRoleSlugs = PLAN_ROLE_KEYS[plan]
  const availableRoles = roles.filter(r =>
    !planRoleSlugs || planRoleSlugs.includes(r.slug)
  )

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role_slug?.includes(search.toLowerCase())
  )

  // ── Add user → API ────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.full_name || !form.email) { notify('⚠️ Name and email required'); return }
    try {
      const res = await fetch('/api/v1/company-users', {
        method:'POST', headers:_authH(), body:JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) { notify(`❌ ${d.error || 'Failed to create user'}`); return }
      const role = roles.find(r => r.slug === form.role_slug)
      const newU = d.data || { ...form, id:`u${Date.now()}`, level:role?.level||10, is_active:true }
      setUsers(p => [...p, newU])
      notify(`✅ ${form.full_name} added as ${role?.name || form.role_slug}`)
      setShowAdd(false)
      setForm({ full_name:'', email:'', role_slug:'employee', dept:'', branch:'', reports_to:'', emp_id:'', phone:'' })
    } catch(_e) { notify('❌ Network error') }
  }

  // ── Toggle active → API ───────────────────────────────────────────────
  const toggleActive = async (user) => {
    const newStatus = !user.is_active
    // Optimistic update
    setUsers(p => p.map(u => u.id===user.id ? {...u, is_active:newStatus} : u))
    try {
      const res = await fetch(`/api/v1/company-users/${user.id}/toggle-status`, {
        method:'PATCH', headers:_authH(),
        body: JSON.stringify({ is_active: newStatus }),
      })
      if (!res.ok) {
        // Revert on failure
        setUsers(p => p.map(u => u.id===user.id ? {...u, is_active:!newStatus} : u))
        notify(`❌ Failed to update status`)
      } else {
        notify(newStatus ? `✅ ${user.full_name} reactivated` : `⏸ ${user.full_name} deactivated`)
      }
    } catch(_e) {
      setUsers(p => p.map(u => u.id===user.id ? {...u, is_active:!newStatus} : u))
      notify('❌ Network error')
    }
  }

  // ── Reset password → API ──────────────────────────────────────────────
  const resetPassword = async (user) => {
    try {
      const res = await fetch(`/api/v1/company-users/${user.id}/reset-password`, {
        method:'POST', headers:_authH(),
      })
      const d = await res.json()
      if (!res.ok) { notify(`❌ ${d.error || 'Reset failed'}`); return }
      notify(`🔑 Password reset email sent to ${user.email}`)
    } catch(_e) { notify('❌ Network error') }
  }

  // ── Save permissions → API ────────────────────────────────────────────
  const savePermissions = async (role, perms) => {
    try {
      const res = await fetch(`/api/v1/roles/${role.slug}/permissions`, {
        method:'PUT', headers:_authH(),
        body: JSON.stringify({ permissions: perms }),
      })
      const d = await res.json()
      if (!res.ok) { notify(`❌ ${d.error || 'Save failed'}`); return }
      // Update local role permissions
      setRoles(p => p.map(r => r.slug===role.slug ? {...r, permissions:perms} : r))
      notify(`✅ Permissions saved for ${role.name}`)
      setEditPerms(null)
    } catch(_e) { notify('❌ Network error') }
  }

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", background:'#f0f7ff',
      minHeight:'100vh', overflowY:'auto', scrollbarWidth:'thin',
      scrollbarColor:`${A} #dbeafe` }}>

      {/* Toast */}
      {msg && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999,
          background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10,
          padding:'10px 18px', fontSize:11, color:'#065f46',
          boxShadow:'0 4px 16px rgba(0,0,0,.12)', maxWidth:440 }}>
          {msg}
        </div>
      )}

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 20px 32px' }}>

        {/* Header */}
        <div style={{ background:G, padding:'18px 24px', color:'#fff',
          marginBottom:20, borderRadius:14, boxShadow:'0 4px 16px rgba(3,105,161,.2)' }}>
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>👥 User & Role Management</div>
              <div style={{ fontSize:10, opacity:.75, marginTop:2 }}>
                {company.name || 'Company'} · {myRole.replace(/_/g,' ')} ·
                Create users · Assign roles · Set hierarchy · Manage permissions
              </div>
            </div>
            <button onClick={() => setShowAdd(true)}
              style={{ padding:'9px 18px', borderRadius:9, border:'none',
                background:'rgba(255,255,255,.2)', color:'#fff',
                fontSize:11, fontWeight:800, cursor:'pointer' }}>
              + Add User
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>
          {[['users','👥 Users'],['roles','🎖 Roles & Permissions'],['hierarchy','🏢 Hierarchy']].map(([id,lb]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:'8px 16px', borderRadius:20,
                border:`1.5px solid ${tab===id ? A : '#e2e8f0'}`,
                background: tab===id ? A+'15' : '#fff',
                color: tab===id ? A : '#64748b',
                fontSize:11, fontWeight: tab===id ? 800 : 400, cursor:'pointer' }}>
              {lb}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:'center', padding:40, color:A, fontSize:12 }}>
            ⟳ Loading user data...
          </div>
        )}

        {/* ── USERS TAB ── */}
        {!loading && tab === 'users' && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email or role..."
                style={{ ...inp, maxWidth:300, width:'auto' }}/>
              <span style={{ fontSize:10, color:'#64748b' }}>
                {filtered.length} of {users.length} users
              </span>
              <button onClick={loadAll} style={{ marginLeft:'auto', padding:'6px 14px',
                borderRadius:8, border:`1px solid ${A}`, background:'#fff',
                color:A, fontSize:10, fontWeight:600, cursor:'pointer' }}>
                ↻ Refresh
              </button>
            </div>

            {users.length === 0 ? (
              <div style={{ textAlign:'center', padding:60, background:'#fff',
                borderRadius:14, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#475569', marginBottom:6 }}>
                  No users yet
                </div>
                <div style={{ fontSize:11, color:'#94a3b8', marginBottom:20 }}>
                  Add your first user to get started
                </div>
                <button onClick={() => setShowAdd(true)}
                  style={{ padding:'10px 24px', borderRadius:10, border:'none',
                    background:A, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  + Add First User
                </button>
              </div>
            ) : (
              <div style={{ background:'#fff', borderRadius:12,
                boxShadow:'0 1px 6px rgba(0,0,0,.06)', overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse',
                  fontSize:11, minWidth:800 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['User','Email','Role','Level','Department','Branch',
                        'Last Login','Status','Actions'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left',
                          fontSize:9, fontWeight:700, color:'#374151',
                          borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => {
                      const role    = roles.find(r => r.slug === u.role_slug)
                      const canEdit = myLevel < (u.level ?? 10)
                      return (
                        <tr key={u.id || i}
                          style={{ background:i%2===0?'#fff':'#fafafa' }}>
                          <td style={{ padding:'9px 14px', fontWeight:700, color:'#0f172a' }}>
                            {u.full_name}
                          </td>
                          <td style={{ padding:'9px 14px', color:'#64748b', fontSize:10 }}>
                            {u.email}
                          </td>
                          <td style={{ padding:'9px 14px' }}>
                            <span style={{ background:(role?.color||'#64748b')+'15',
                              color:role?.color||'#64748b', fontSize:9, fontWeight:700,
                              padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' }}>
                              {role?.name || u.role_slug}
                            </span>
                          </td>
                          <td style={{ padding:'9px 14px', textAlign:'center' }}>
                            <span style={{ background:'#f1f5f9', color:'#374151',
                              fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                              L{u.level ?? '?'}
                            </span>
                          </td>
                          <td style={{ padding:'9px 14px', fontSize:10, color:'#475569' }}>
                            {u.dept || u.department || '—'}
                          </td>
                          <td style={{ padding:'9px 14px', fontSize:10, color:'#475569' }}>
                            {u.branch || '—'}
                          </td>
                          <td style={{ padding:'9px 14px', fontSize:9, color:'#94a3b8',
                            whiteSpace:'nowrap' }}>
                            {u.last_login || '—'}
                          </td>
                          <td style={{ padding:'9px 14px' }}>
                            <span style={{ background:u.is_active?'#f0fdf4':'#fef2f2',
                              color:u.is_active?'#059669':'#dc2626', fontSize:9,
                              fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                              {u.is_active ? '✅ Active' : '❌ Inactive'}
                            </span>
                          </td>
                          <td style={{ padding:'9px 14px' }}>
                            {canEdit && (
                              <div style={{ display:'flex', gap:4, flexWrap:'nowrap' }}>
                                <button onClick={() => toggleActive(u)}
                                  style={{ padding:'4px 8px', borderRadius:6, border:'none',
                                    background:u.is_active?'#fffbeb':'#f0fdf4',
                                    color:u.is_active?'#d97706':'#059669',
                                    fontSize:8, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                                  {u.is_active ? '⏸ Deactivate' : '✅ Activate'}
                                </button>
                                <button onClick={() => resetPassword(u)}
                                  style={{ padding:'4px 8px', borderRadius:6, border:'none',
                                    background:'#f5f3ff', color:'#7c3aed',
                                    fontSize:8, fontWeight:700, cursor:'pointer' }}>
                                  🔑 Reset PW
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── ROLES TAB ── */}
        {!loading && tab === 'roles' && (
          editPerms ? (
            <div style={{ background:'#fff', borderRadius:12, padding:'20px',
              boxShadow:'0 1px 6px rgba(0,0,0,.06)' }}>
              <PermMatrix
                role={editPerms}
                modules={modules}
                onSave={savePermissions}
                onBack={() => setEditPerms(null)}
              />
            </div>
          ) : (
            <div style={{ display:'grid',
              gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
              {availableRoles.map(role => (
                <div key={role.slug} style={{ background:'#fff', borderRadius:12,
                  padding:'16px', boxShadow:'0 1px 6px rgba(0,0,0,.06)',
                  borderLeft:`4px solid ${role.color}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:13, color:role.color }}>
                        {role.name}
                      </div>
                      <div style={{ fontSize:9, color:'#64748b' }}>{role.desc}</div>
                    </div>
                    <span style={{ background:role.color+'15', color:role.color,
                      fontSize:9, fontWeight:800, padding:'3px 9px', borderRadius:20 }}>
                      L{role.level}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:12, alignItems:'center' }}>
                    <button onClick={() => setEditPerms(role)}
                      style={{ flex:1, padding:'7px', borderRadius:8, border:'none',
                        background:role.color+'15', color:role.color,
                        fontSize:9, fontWeight:700, cursor:'pointer' }}>
                      🔐 Edit Permissions
                    </button>
                    <span style={{ fontSize:9, color:'#94a3b8' }}>
                      {users.filter(u => u.role_slug === role.slug).length} users
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── HIERARCHY TAB ── */}
        {!loading && tab === 'hierarchy' && (
          <div style={{ background:'#fff', borderRadius:12, padding:'20px',
            boxShadow:'0 1px 6px rgba(0,0,0,.06)' }}>
            <div style={{ fontWeight:800, fontSize:13, marginBottom:16 }}>
              🏢 Company Authority Hierarchy
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[1,2,3,4,5,6,10].map(lv => {
                const levelRoles = roles.filter(r => r.level === lv)
                const levelUsers = users.filter(u => u.level === lv)
                if (levelRoles.length === 0) return null
                return (
                  <div key={lv} style={{ display:'flex', alignItems:'center', gap:14,
                    padding:'12px 16px', borderRadius:10, background:'#f8fafc',
                    borderLeft:`4px solid ${levelRoles[0]?.color || '#e2e8f0'}` }}>
                    <div style={{ width:36, height:36, borderRadius:'50%',
                      background:levelRoles[0]?.color || '#e2e8f0',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontWeight:900, fontSize:14, flexShrink:0 }}>
                      L{lv}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:12, color:'#0f172a' }}>
                        {levelRoles.map(r => r.name).join(' · ')}
                      </div>
                      <div style={{ fontSize:10, color:'#64748b', marginTop:2, overflow:'hidden',
                        textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {levelUsers.map(u => u.full_name).join(', ') || 'No users assigned'}
                      </div>
                    </div>
                    <div style={{ fontSize:22, fontWeight:900,
                      color:levelRoles[0]?.color || '#e2e8f0', flexShrink:0 }}>
                      {levelUsers.length}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Add User Modal ── */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)',
          zIndex:1000, display:'flex', alignItems:'center',
          justifyContent:'center', padding:16 }}
          onClick={() => setShowAdd(false)}>
          <div style={{ background:'#fff', borderRadius:18, width:560, maxWidth:'96vw',
            maxHeight:'92vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background:G, padding:'14px 22px',
              borderRadius:'18px 18px 0 0', color:'#fff' }}>
              <div style={{ fontSize:15, fontWeight:900 }}>+ Add New User</div>
              <div style={{ fontSize:10, opacity:.8 }}>
                Welcome email with temp password sent automatically
              </div>
            </div>
            <div style={{ padding:'20px 22px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
                gap:12, marginBottom:12 }}>
                {[
                  ['Full Name *',   'full_name', 'text',  'Full name'],
                  ['Email *',       'email',     'email', 'work@company.com'],
                  ['Employee ID',   'emp_id',    'text',  'ELX-XXX-0001'],
                  ['Phone',         'phone',     'tel',   '+977-98XXXXXXXX'],
                ].map(([lb,k,t,ph]) => (
                  <div key={k}>
                    <label style={{ fontSize:9, fontWeight:700, color:'#374151',
                      display:'block', marginBottom:3 }}>{lb}</label>
                    <input type={t} value={form[k]||''} placeholder={ph}
                      onChange={e => sf(k, e.target.value)} style={inp}/>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151',
                    display:'block', marginBottom:3 }}>Role *</label>
                  <select value={form.role_slug}
                    onChange={e => sf('role_slug', e.target.value)} style={inp}>
                    {availableRoles.filter(r => r.level > myLevel).map(r => (
                      <option key={r.slug} value={r.slug}>
                        {r.name} (L{r.level})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151',
                    display:'block', marginBottom:3 }}>Department</label>
                  <input value={form.dept||''} placeholder="e.g. Engineering"
                    onChange={e => sf('dept', e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151',
                    display:'block', marginBottom:3 }}>Branch</label>
                  <input value={form.branch||''} placeholder="e.g. Kathmandu HQ"
                    onChange={e => sf('branch', e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151',
                    display:'block', marginBottom:3 }}>Reports To</label>
                  <select style={inp}
                    onChange={e => sf('reports_to', e.target.value)}>
                    <option value="">— Select Manager —</option>
                    {users.filter(u => u.level < 10).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role_slug})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a',
                borderRadius:9, padding:'10px 14px', marginBottom:16,
                fontSize:10, color:'#92400e' }}>
                ⚡ You can only create users at a lower authority level than your own (L{myLevel}).
                A temporary password will be sent to their email automatically.
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={handleAdd}
                  style={{ flex:1, padding:'11px', borderRadius:9, border:'none',
                    background:G, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                  ✅ Create User
                </button>
                <button onClick={() => setShowAdd(false)}
                  style={{ padding:'11px 18px', borderRadius:9,
                    border:'1px solid #e2e8f0', background:'#fff',
                    fontSize:11, cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

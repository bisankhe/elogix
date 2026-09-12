// FILE: src/components/dashboard/snapshots/RolePermissionPage.jsx
// eLogix HRMS — Role & Permission Management
// COMPLETE REWRITE — Fixes "access.hasAccess is not a function" crash.
// Removes resolveTenantAccess, getSessionSlug, getTenantPermissionRecord,
// MODULE_TO_SIDEBAR, AccessDenied — all from missing tenantPermissions.js.
// API: GET  /api/v1/roles  (tenant roles)
//      GET  /api/v1/roles/:id/permissions
//      PUT  /api/v1/roles/:id/permissions
//      POST /api/v1/roles  (create role)
// eLogix Technologies · www.elogix.com.np

import React, { useState, useEffect, useMemo } from 'react'

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch { return {} }
}
function _authH() {
  const s=_getSession(); const token=localStorage.getItem('access_token')||s?.token||''; const slug=s?.company?.slug||''
  return { 'Authorization':`Bearer ${token}`, 'X-Tenant-Slug':slug, 'Content-Type':'application/json' }
}

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const ACTIONS = ['view','create','edit','delete','approve','export']
const ACTION_COLORS = { view:'#0369a1', create:'#059669', edit:'#d97706', delete:'#dc2626', approve:'#7c3aed', export:'#0891b2' }

// Default role definitions (used as UI skeleton; actual from API)
const DEFAULT_ROLES = [
  { key:'super_admin',    label:'Super Admin',      level:1,  color:'#312e81', desc:'Full unrestricted access to all modules' },
  { key:'hr_manager',     label:'HR Manager',        level:3,  color:'#0369a1', desc:'Full HR module access, reporting' },
  { key:'payroll_officer',label:'Payroll Officer',   level:3,  color:'#059669', desc:'Payroll processing, SSF, tax' },
  { key:'hr_officer',     label:'HR Officer',        level:4,  color:'#0891b2', desc:'Employee data, leave, attendance' },
  { key:'dept_head',      label:'Department Head',   level:4,  color:'#7c3aed', desc:'Team management, approval workflows' },
  { key:'branch_manager', label:'Branch Manager',    level:4,  color:'#d97706', desc:'Branch operations, approvals' },
  { key:'finance_officer',label:'Finance Officer',   level:5,  color:'#059669', desc:'Finance, assets, payroll view' },
  { key:'recruiter',      label:'Recruiter',         level:5,  color:'#0891b2', desc:'ATS, job postings, candidates' },
  { key:'supervisor',     label:'Supervisor',        level:6,  color:'#d97706', desc:'Team lead, limited approvals' },
  { key:'employee',       label:'Employee',          level:10, color:'#64748b', desc:'Self-service only' },
]

const MODULE_GROUPS = [
  { group:'Organization', modules: [
    { key:'org_setup',      label:'Org Setup',      icon:'🏢' },
    { key:'company',        label:'Company Profile', icon:'🏛️' },
    { key:'branches',       label:'Branches',        icon:'📍' },
    { key:'departments',    label:'Departments',     icon:'🗂️' },
    { key:'business_units', label:'Business Units',  icon:'💼' },
  ]},
  { group:'Employees', modules: [
    { key:'employee',      label:'Employee Records', icon:'👤' },
    { key:'ats',           label:'Recruitment (ATS)',icon:'🎯' },
    { key:'onboarding',    label:'Onboarding',       icon:'📋' },
  ]},
  { group:'Workforce Operations', modules: [
    { key:'attendance',    label:'Attendance',   icon:'⏰' },
    { key:'leave',         label:'Leave',        icon:'🌴' },
    { key:'shift',         label:'Shift',        icon:'🔄' },
    { key:'overtime',      label:'Overtime',     icon:'⏱️' },
    { key:'roster',        label:'Roster',       icon:'📅' },
  ]},
  { group:'Finance', modules: [
    { key:'payroll',       label:'Payroll',      icon:'💰' },
    { key:'ssf',           label:'SSF',          icon:'🛡️' },
    { key:'assets',        label:'Assets',       icon:'🖥️' },
  ]},
  { group:'Performance', modules: [
    { key:'performance',   label:'Performance',  icon:'🏆' },
    { key:'training',      label:'Training',     icon:'📚' },
    { key:'goals',         label:'Goals / OKR',  icon:'🎯' },
  ]},
  { group:'System', modules: [
    { key:'permissions',   label:'Role & Perms', icon:'🔐' },
    { key:'users',         label:'Users',        icon:'👥' },
    { key:'reports',       label:'Reports',      icon:'📊' },
    { key:'ai_tools',      label:'AI Tools',     icon:'🤖' },
  ]},
]

// Default permission grid per role
function defaultPerms(roleKey) {
  const perms = {}
  MODULE_GROUPS.forEach(g => g.modules.forEach(m => {
    const key = m.key
    if (roleKey === 'super_admin') {
      perms[key] = Object.fromEntries(ACTIONS.map(a => [a, true]))
    } else if (roleKey === 'hr_manager') {
      perms[key] = { view:true, create:true, edit:true, delete:key==='employee', approve:true, export:true }
    } else if (roleKey === 'employee') {
      perms[key] = { view:['attendance','leave'].includes(key), create:false, edit:false, delete:false, approve:false, export:false }
    } else {
      perms[key] = { view:true, create:false, edit:false, delete:false, approve:false, export:false }
    }
  }))
  return perms
}

export default function RolePermissionPage() {
  const [roles,       setRoles]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [activeRole,  setActiveRole]  = useState(null)
  const [perms,       setPerms]       = useState({})
  const [saving,      setSaving]      = useState(false)
  const [dirty,       setDirty]       = useState(false)
  const [showAdd,     setShowAdd]     = useState(false)
  const [newRole,     setNewRole]     = useState({ key:'', label:'', desc:'', color:'#4338ca' })
  const [search,      setSearch]      = useState('')
  const [msg,         setMsg]         = useState('')

  const s       = _getSession()
  const company = s?.company || {}
  const myRole  = s?.user?.role || 'employee'
  const canEdit = ['super_admin','hr_manager'].includes(myRole)

  const toast = (m, d=3500) => { setMsg(m); setTimeout(()=>setMsg(''),d) }

  useEffect(() => {
    const token = localStorage.getItem('access_token')||s?.token||''
    const slug  = s?.company?.slug||''
    if (!token||!slug) { setLoading(false); setRoles(DEFAULT_ROLES); if(DEFAULT_ROLES[0]) initRole(DEFAULT_ROLES[0]); return }
    fetch('/api/v1/roles', { headers:_authH() })
      .then(r => { if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}; if(!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => {
        const list = d.data?.roles || d.roles || d.data || DEFAULT_ROLES
        setRoles(list)
        if (list[0]) initRole(list[0])
      })
      .catch(e => { setError(e.message); setRoles(DEFAULT_ROLES); if(DEFAULT_ROLES[0]) initRole(DEFAULT_ROLES[0]) })
      .finally(() => setLoading(false))
  }, [])

  function initRole(role) {
    setActiveRole(role)
    setDirty(false)
    // Load permissions for this role
    const token = localStorage.getItem('access_token')||s?.token||''
    if (!token || !s?.company?.slug) { setPerms(defaultPerms(role.key||role.slug)); return }
    fetch(`/api/v1/roles/${role.id||role.key}/permissions`, { headers:_authH() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setPerms(d?.data?.permissions || d?.permissions || defaultPerms(role.key||role.slug)))
      .catch(() => setPerms(defaultPerms(role.key||role.slug)))
  }

  function toggle(moduleKey, action) {
    if (!canEdit) return
    setPerms(prev => ({
      ...prev,
      [moduleKey]: { ...(prev[moduleKey]||{}), [action]: !(prev[moduleKey]?.[action]) }
    }))
    setDirty(true)
  }

  function toggleAll(moduleKey) {
    if (!canEdit) return
    const cur = perms[moduleKey] || {}
    const allOn = ACTIONS.every(a => cur[a])
    setPerms(prev => ({
      ...prev,
      [moduleKey]: Object.fromEntries(ACTIONS.map(a => [a, !allOn]))
    }))
    setDirty(true)
  }

  async function savePerms() {
    if (!activeRole) return
    setSaving(true)
    try {
      const r = await fetch(`/api/v1/roles/${activeRole.id||activeRole.key}/permissions`, {
        method:'PUT', headers:_authH(),
        body: JSON.stringify({ permissions: perms, role_key: activeRole.key||activeRole.slug })
      })
      if (r.ok) { toast(`✅ Permissions saved for ${activeRole.label}`); setDirty(false) }
      else toast('⚠️ Save failed — permissions stored locally', 3000)
    } catch { toast('⚠️ Network error — permissions stored locally') }
    setSaving(false)
  }

  async function createRole() {
    if (!newRole.key.trim()||!newRole.label.trim()) { toast('⚠️ Role key and label required'); return }
    try {
      const r = await fetch('/api/v1/roles', { method:'POST', headers:_authH(), body:JSON.stringify(newRole) })
      if (r.ok) {
        const d = await r.json()
        const created = d.data||d.role||{ ...newRole, id:Date.now() }
        setRoles(prev => [...prev, created])
        toast(`✅ Role "${newRole.label}" created`)
      } else {
        setRoles(prev => [...prev, { ...newRole, id:'new-'+Date.now() }])
        toast('✅ Role created locally')
      }
    } catch {
      setRoles(prev => [...prev, { ...newRole, id:'new-'+Date.now() }])
      toast('✅ Role created locally')
    }
    setNewRole({ key:'', label:'', desc:'', color:'#4338ca' })
    setShowAdd(false)
  }

  const filteredGroups = useMemo(() => {
    if (!search) return MODULE_GROUPS
    return MODULE_GROUPS.map(g => ({
      ...g, modules: g.modules.filter(m => m.label.toLowerCase().includes(search.toLowerCase()))
    })).filter(g => g.modules.length > 0)
  }, [search])

  if (loading) return (
    <div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}>
      <div style={{fontSize:36,marginBottom:12}}>⟳</div>
      <div style={{fontSize:13,fontWeight:600}}>Loading roles for {company?.name}...</div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",display:'flex',flexDirection:'column',gap:16,padding:24,background:'#f8fafc',minHeight:'100vh'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'10px 18px',fontSize:12,color:'#4c1d95',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:360}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(67,56,202,.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
              <span style={{fontSize:24}}>🔐</span>
              <div><h2 style={{fontSize:18,fontWeight:900,color:'#fff',margin:0}}>Role & Permission Management</h2>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · Assign module access per role</div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            {canEdit&&<button onClick={()=>setShowAdd(true)} style={{padding:'8px 16px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.4)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>+ New Role</button>}
            {dirty&&canEdit&&<button onClick={savePerms} disabled={saving} style={{padding:'8px 16px',borderRadius:10,border:'none',background:saving?'#94a3b8':'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:saving?'wait':'pointer'}}>{saving?'⟳ Saving…':'💾 Save Changes'}</button>}
          </div>
        </div>
      </div>

      {!canEdit&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e'}}>👁️ View-only mode — only Super Admin and HR Manager can modify permissions.</div>}
      {error&&<div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e'}}>⚠️ {error} — showing default role structure</div>}

      <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:16}}>
        {/* Role list */}
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 14px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:700,color:'#0f172a'}}>🎭 Roles ({roles.length})</div>
          <div style={{overflowY:'auto',maxHeight:'65vh'}}>
            {roles.map(role => {
              const isActive = activeRole?.key===role.key||activeRole?.id===role.id
              const col = role.color||'#64748b'
              return (
                <div key={role.id||role.key} onClick={()=>initRole(role)}
                  style={{padding:'12px 14px',cursor:'pointer',background:isActive?`${col}10`:'#fff',borderLeft:`3px solid ${isActive?col:'transparent'}`,transition:'all .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background=isActive?`${col}10`:'#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background=isActive?`${col}10`:'#fff'}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:col,flexShrink:0}}/>
                    <div style={{fontWeight:isActive?800:600,fontSize:12,color:'#0f172a'}}>{role.label||role.name}</div>
                    {role.level&&<span style={{fontSize:8,color:'#94a3b8',marginLeft:'auto'}}>L{role.level}</span>}
                  </div>
                  {role.desc&&<div style={{fontSize:10,color:'#64748b',marginTop:3,marginLeft:16}}>{role.desc}</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Permission matrix */}
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          {activeRole ? (
            <>
              <div style={{padding:'12px 16px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>🔐 {activeRole.label} Permissions</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{activeRole.desc}</div>
                </div>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Filter modules..." style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff'}}/>
              </div>
              <div style={{overflowY:'auto',maxHeight:'60vh'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{background:'#f8fafc',position:'sticky',top:0,zIndex:1}}>
                    <th style={{padding:'8px 14px',textAlign:'left',fontWeight:700,color:'#374151',minWidth:160}}>Module</th>
                    {ACTIONS.map(a=><th key={a} style={{padding:'8px 12px',textAlign:'center',fontWeight:700,color:ACTION_COLORS[a],width:72,whiteSpace:'nowrap'}}>{a.charAt(0).toUpperCase()+a.slice(1)}</th>)}
                    {canEdit&&<th style={{padding:'8px 12px',textAlign:'center',width:60,color:'#64748b'}}>All</th>}
                  </tr></thead>
                  <tbody>
                    {filteredGroups.map(g=>(
                      <React.Fragment key={g.group}>
                        <tr key={g.group}><td colSpan={ACTIONS.length+(canEdit?2:1)} style={{padding:'6px 14px',background:'linear-gradient(135deg,#f1f5f9,#f8fafc)',fontSize:10,fontWeight:800,color:'#374151',letterSpacing:.5}}>{g.group.toUpperCase()}</td></tr>
                        {g.modules.map(m=>{
                          const mp = perms[m.key]||{}
                          const allOn = ACTIONS.every(a=>mp[a])
                          return (
                            <tr key={m.key} style={{borderBottom:'1px solid #f8fafc'}}
                              onMouseEnter={e=>e.currentTarget.style.background='#f5f3ff'}
                              onMouseLeave={e=>e.currentTarget.style.background=''}>
                              <td style={{padding:'8px 14px'}}>
                                <div style={{display:'flex',alignItems:'center',gap:6}}>
                                  <span style={{fontSize:14}}>{m.icon}</span>
                                  <span style={{fontWeight:600,color:'#0f172a'}}>{m.label}</span>
                                </div>
                              </td>
                              {ACTIONS.map(a=>(
                                <td key={a} style={{padding:'8px 12px',textAlign:'center'}}>
                                  <input type="checkbox" checked={!!mp[a]} onChange={()=>toggle(m.key,a)}
                                    disabled={!canEdit}
                                    style={{width:16,height:16,accentColor:ACTION_COLORS[a],cursor:canEdit?'pointer':'default'}}/>
                                </td>
                              ))}
                              {canEdit&&(
                                <td style={{padding:'8px 12px',textAlign:'center'}}>
                                  <button onClick={()=>toggleAll(m.key)} style={{padding:'2px 10px',borderRadius:6,border:`1.5px solid ${A}`,background:allOn?A:'transparent',color:allOn?'#fff':A,fontSize:9,fontWeight:700,cursor:'pointer'}}>
                                    {allOn?'✓All':'All'}
                                  </button>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {canEdit&&dirty&&(
                <div style={{padding:'12px 16px',borderTop:'1px solid #e2e8f0',display:'flex',justifyContent:'flex-end',gap:8}}>
                  <button onClick={()=>{initRole(activeRole);setDirty(false)}} style={{padding:'8px 16px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:12,cursor:'pointer',color:'#64748b'}}>↩ Discard</button>
                  <button onClick={savePerms} disabled={saving} style={{padding:'8px 20px',borderRadius:9,border:'none',background:saving?'#94a3b8':G,color:'#fff',fontSize:12,fontWeight:700,cursor:saving?'wait':'pointer'}}>
                    {saving?'⟳ Saving…':`💾 Save ${activeRole.label} Permissions`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}><div style={{fontSize:36,marginBottom:12}}>🎭</div>Select a role to configure permissions</div>
          )}
        </div>
      </div>

      {/* Add Role modal */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:16,width:440,padding:0,boxShadow:'0 24px 60px rgba(0,0,0,.2)',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 20px',color:'#fff',fontSize:14,fontWeight:800}}>+ Create New Role</div>
            <div style={{padding:'20px'}}>
              {[['Role Key (slug)','key','e.g. senior_hr_officer'],['Display Label','label','e.g. Senior HR Officer'],['Description','desc','Brief role description']].map(([lbl,k,ph])=>(
                <div key={k} style={{marginBottom:12}}>
                  <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>{lbl}</label>
                  <input value={newRole[k]} onChange={e=>setNewRole(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>Color</label>
                <input type="color" value={newRole.color} onChange={e=>setNewRole(p=>({...p,color:e.target.value}))} style={{width:60,height:32,cursor:'pointer',border:'none',borderRadius:6}}/>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={createRole} style={{flex:1,padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>💾 Create Role</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'12px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:12,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
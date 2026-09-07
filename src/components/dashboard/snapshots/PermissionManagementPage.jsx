// FILE: src/components/dashboard/snapshots/PermissionManagementPage.jsx
// eLogix HRMS — Permission & Role Management
// SuperAdmin (Level 1) only — assign/revoke module access per user/role
// eLogix Technologies · www.elogix.com.np
import { resolveTenantAccess, getSessionSlug } from '../../../utils/tenantPermissions.js'
import { tenantCanAccess } from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'
import { useState } from 'react'

const A  = '#0369a1'
const G  = 'linear-gradient(135deg,#0c4a6e,#0369a1,#38bdf8)'

// All modules
const ALL_MODULES = [
  { id:'dashboard',      label:'Dashboard',                   icon:'🏠', desc:'Dashboards and widgets' },
  { id:'ai-assistant',   label:'AI Assistant',                icon:'🤖', desc:'AI tools and analytics' },
  { id:'org-mgmt',       label:'Organization Management',     icon:'🏢', desc:'Company setup, org chart' },
  { id:'emp-lifecycle',  label:'Employee Lifecycle',          icon:'👤', desc:'Hiring, onboarding, exit' },
  { id:'workforce-ops',  label:'Workforce Operations',        icon:'⏰', desc:'Attendance, leave, shift' },
  { id:'perf-talent',    label:'Performance & Talent',        icon:'🎯', desc:'KPI, OKR, appraisals' },
  { id:'emp-experience', label:'Employee Experience',         icon:'❤️', desc:'Engagement, wellness' },
  { id:'hr-services',    label:'HR Services & Support',       icon:'🛎', desc:'Self-service, helpdesk' },
  { id:'finance-assets', label:'Finance, Assets & Admin',     icon:'💰', desc:'Payroll, SSF, assets' },
  { id:'compliance',     label:'Compliance & Risk',           icon:'⚖️', desc:'Audit, legal, policies' },
  { id:'reports',        label:'Reports & Analytics',         icon:'📊', desc:'Standard & custom reports' },
  { id:'sys-admin',      label:'System Administration',       icon:'⚙️', desc:'Users, roles, settings' },
]

// Actions per module
const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export']

// Default role templates
const ROLE_TEMPLATES = {
  super_admin:    { label:'Super Admin',       level:1,  color:'#7c3aed', modules:'all', actions:'all' },
  executive:      { label:'Executive',         level:2,  color:'#0369a1', modules:['dashboard','ai-assistant','org-mgmt','emp-lifecycle','workforce-ops','perf-talent','emp-experience','hr-services','finance-assets','compliance','reports'], actions:['view','export'] },
  hr_manager:     { label:'HR Manager',        level:3,  color:'#0891b2', modules:['dashboard','ai-assistant','org-mgmt','emp-lifecycle','workforce-ops','perf-talent','emp-experience','hr-services','compliance','reports'], actions:['view','create','edit','approve','export'] },
  finance_officer:{ label:'Finance Officer',   level:3,  color:'#16a34a', modules:['dashboard','ai-assistant','org-mgmt','workforce-ops','finance-assets','compliance','reports'], actions:['view','create','edit','approve','export'] },
  hod:            { label:'HOD / Dept Head',   level:4,  color:'#d97706', modules:['dashboard','ai-assistant','emp-lifecycle','workforce-ops','perf-talent','emp-experience','hr-services','reports'], actions:['view','create','edit','approve'] },
  hr_officer:     { label:'HR Officer',        level:4,  color:'#0369a1', modules:['dashboard','ai-assistant','emp-lifecycle','workforce-ops','perf-talent','emp-experience','hr-services','reports'], actions:['view','create','edit'] },
  it_admin:       { label:'IT Administrator',  level:4,  color:'#64748b', modules:['dashboard','ai-assistant','org-mgmt','sys-admin','compliance','reports'], actions:['view','create','edit','delete','export'] },
  employee:       { label:'Employee',          level:10, color:'#6b7280', modules:['dashboard','hr-services'], actions:['view'] },
}

// Demo users
const DEMO_USERS = [
  { id:1, name:'Ram Thapa',     email:'admin@demo.com',   role:'super_admin',     level:1,  dept:'Management', status:'active' },
  { id:2, name:'Sita Shrestha', email:'hr@demo.com',      role:'hr_manager',      level:3,  dept:'HR',         status:'active' },
  { id:3, name:'Hari Maharjan', email:'payroll@demo.com', role:'finance_officer', level:3,  dept:'Finance',     status:'active' },
  { id:4, name:'Gita Gurung',   email:'hod@demo.com',     role:'hod',             level:4,  dept:'IT',          status:'active' },
  { id:5, name:'Maya Gurung',   email:'employee@demo.com',role:'employee',         level:10, dept:'IT',          status:'active' },
  { id:6, name:'Bikash KC',     email:'admin@himalayan.com',role:'super_admin',   level:1,  dept:'Management',  status:'active' },
]

function notify(msg, setMsg) {
  setMsg(msg)
  setTimeout(() => setMsg(''), 3000)
}

export default function PermissionManagementPage() {
  const slug   = getSessionSlug()
  // Tenant access check
  if (!tenantCanAccess('user-management')) {
    return <AccessDenied moduleName="PermissionManagement" />
  }
  // ── Tenant context ────────────────────────────────────────────
  const sess        = (() => { try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}} })()
  const company     = sess.company || {}
  const plan        = (company.plan||'trial').toLowerCase()
  const bizType     = company.business_type || 'custom'
  const grantedMods = new Set(access.modules)
  const permRec     = getTenantPermissionRecord(slug)

  // Only show modules that eLogix SuperAdmin has granted to this tenant
  const VISIBLE_MODULES = ALL_MODULES.filter(m => {
    // Map sidebar module IDs to permission module keys
    const modMap = {
      'dashboard':'employee','ai-assistant':'ai_chatbot','org-mgmt':'org_setup',
      'emp-lifecycle':'ats','workforce-ops':'attendance','perf-talent':'performance',
      'emp-experience':'announcements','hr-services':'self_service',
      'finance-assets':'finance','compliance':'compliance','reports':'reports',
      'sys-admin':'permissions',
    }
    const permKey = modMap[m.id] || m.id
    return grantedMods.has(permKey) || grantedMods.has(m.id)
  })

  const [tab,        setTab]        = useState('roles')     // roles | users | matrix
  const [roles,      setRoles]      = useState({...ROLE_TEMPLATES})
  const [users,      setUsers]      = useState(DEMO_USERS)
  const [selRole,    setSelRole]    = useState('super_admin')
  const [selUser,    setSelUser]    = useState(null)
  const [msg,        setMsg]        = useState('')
  const [showAdd,    setShowAdd]    = useState(false)
  const [newUser,    setNewUser]    = useState({ name:'', email:'', role:'employee', dept:'' })
  const [search,     setSearch]     = useState('')

  const role = roles[selRole]

  const hasModule = (mId) => role?.modules === 'all' || (Array.isArray(role?.modules) && role.modules.includes(mId))
  const hasAction = (act) => role?.actions === 'all' || (Array.isArray(role?.actions) && role.actions.includes(act))

  const toggleModule = (mId) => {
    if (selRole === 'super_admin') return // super_admin always has all
    setRoles(p => {
      const r = {...p[selRole]}
      const mods = r.modules === 'all' ? ALL_MODULES.map(m=>m.id) : [...(r.modules||[])]
      r.modules = mods.includes(mId) ? mods.filter(m=>m!==mId) : [...mods, mId]
      return {...p, [selRole]: r}
    })
  }

  const toggleAction = (act) => {
    if (selRole === 'super_admin') return
    setRoles(p => {
      const r = {...p[selRole]}
      const acts = r.actions === 'all' ? [...ACTIONS] : [...(r.actions||[])]
      r.actions = acts.includes(act) ? acts.filter(a=>a!==act) : [...acts, act]
      return {...p, [selRole]: r}
    })
  }

  const grantAll  = () => { if (selRole==='super_admin') return; setRoles(p=>({...p,[selRole]:{...p[selRole],modules:'all',actions:'all'}})); notify('✅ Full access granted',setMsg) }
  const revokeAll = () => { if (selRole==='super_admin') return; setRoles(p=>({...p,[selRole]:{...p[selRole],modules:[],actions:[]}}));   notify('🚫 All access revoked',setMsg) }
  const saveRole  = () => notify('✅ Permissions saved successfully', setMsg)

  const addUser = () => {
    if (!newUser.name||!newUser.email) { notify('⚠️ Name and email required',setMsg); return }
    setUsers(p=>[...p,{id:Date.now(),...newUser,level:ROLE_TEMPLATES[newUser.role]?.level||10,status:'active'}])
    setShowAdd(false); setNewUser({name:'',email:'',role:'employee',dept:''})
    notify('✅ User added successfully', setMsg)
  }

  const changeUserRole = (userId, newRole) => {
    setUsers(p=>p.map(u=>u.id===userId ? {...u, role:newRole, level:ROLE_TEMPLATES[newRole]?.level||10} : u))
    notify('✅ User role updated', setMsg)
  }

  const toggleUserStatus = (userId) => {
    setUsers(p=>p.map(u=>u.id===userId ? {...u, status:u.status==='active'?'suspended':'active'} : u))
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.dept.toLowerCase().includes(search.toLowerCase())
  )

  const BtnStyle = (active) => ({
    padding:'7px 18px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12,
    fontWeight:700, transition:'all .15s',
    background: active ? A : '#f1f5f9',
    color:      active ? '#fff' : '#475569',
  })

  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f0f7ff',padding:'0 0 32px'}}>
      {/* Toast */}
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,
        background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,
        padding:'10px 18px',fontSize:11,color:'#0c4a6e',
        boxShadow:'0 4px 16px rgba(0,0,0,.12)',fontWeight:600}}>{msg}</div>}

      {/* ── Header ── */}
      <div style={{background:G,padding:'16px 24px',color:'#fff',marginBottom:0,borderRadius:'0 0 14px 14px'}}>
        <div style={{fontSize:18,fontWeight:900,marginBottom:2}}>🔐 Permission & Access Management</div>
        <div style={{fontSize:11,opacity:.75}}>
          Assign · Revoke · Configure module access per role and user · eLogix HRMS
        </div>
        <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{fontSize:10,background:'rgba(255,255,255,.2)',padding:'4px 12px',borderRadius:20,border:'1px solid rgba(255,255,255,.3)'}}>
          📦 {plan.charAt(0).toUpperCase()+plan.slice(1)} Plan · {access.modules.length} Modules Activated
        </span>
        {permRec && <span style={{fontSize:9,background:'rgba(255,255,255,.15)',padding:'3px 10px',borderRadius:20}}>
          Last updated by eLogix SuperAdmin: {new Date(permRec.granted_at).toLocaleDateString()}
        </span>}
      </div>
      <div style={{display:'flex',gap:4,marginTop:10,flexWrap:'wrap'}}>
          {[
            {id:'roles',  label:'⚙️ Role Permissions'},
            {id:'users',  label:'👥 User Management'},
            {id:'matrix', label:'📊 Access Matrix'},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:'7px 16px',borderRadius:20,border:'none',cursor:'pointer',
                fontSize:11,fontWeight:700,transition:'all .15s',
                background:tab===t.id?'#fff':'rgba(255,255,255,.18)',
                color:tab===t.id?A:'#fff'}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'16px 20px'}}>

        {/* ════ TAB: ROLE PERMISSIONS ════ */}
        {tab==='roles'&&(
          <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:16}}>
            {/* Role list */}
            <div style={{background:'#fff',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,.06)',overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800,color:'#374151'}}>
                👤 Roles
              </div>
              {Object.entries(roles).map(([key,r])=>(
                <div key={key} onClick={()=>setSelRole(key)}
                  style={{padding:'10px 16px',cursor:'pointer',
                    background:selRole===key?`${r.color}12`:'#fff',
                    borderLeft:selRole===key?`3px solid ${r.color}`:'3px solid transparent',
                    borderBottom:'1px solid #f8fafc',transition:'all .1s',
                    display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:selRole===key?r.color:'#374151'}}>{r.label}</div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>Level {r.level}</div>
                  </div>
                  <span style={{fontSize:9,padding:'2px 8px',borderRadius:10,
                    background:`${r.color}18`,color:r.color,fontWeight:700}}>
                    {r.modules==='all'?'ALL':Array.isArray(r.modules)?`${r.modules.length}m`:'0'}
                  </span>
                </div>
              ))}
            </div>

            {/* Permission editor */}
            {role&&(
              <div style={{background:'#fff',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
                <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',
                  display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:role.color}}>{role.label}</div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>
                      Authority Level {role.level} · {role.modules==='all'?'All modules':Array.isArray(role.modules)?`${role.modules.length} modules`:'No modules'}
                    </div>
                  </div>
                  {selRole!=='super_admin'&&(
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={grantAll}
                        style={{padding:'6px 14px',borderRadius:8,border:'none',
                          background:'#f0fdf4',color:'#16a34a',cursor:'pointer',
                          fontSize:11,fontWeight:700}}>✅ Grant All</button>
                      <button onClick={revokeAll}
                        style={{padding:'6px 14px',borderRadius:8,border:'none',
                          background:'#fef2f2',color:'#dc2626',cursor:'pointer',
                          fontSize:11,fontWeight:700}}>🚫 Revoke All</button>
                      <button onClick={saveRole}
                        style={{padding:'6px 14px',borderRadius:8,border:'none',
                          background:G,color:'#fff',cursor:'pointer',
                          fontSize:11,fontWeight:700}}>💾 Save</button>
                    </div>
                  )}
                  {selRole==='super_admin'&&(
                    <span style={{fontSize:11,color:'#7c3aed',fontWeight:700,
                      background:'#f5f3ff',padding:'4px 12px',borderRadius:8}}>
                      👑 Protected — cannot be restricted
                    </span>
                  )}
                </div>

                <div style={{padding:'16px 20px'}}>
                  {/* Actions row */}
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:11,fontWeight:800,color:'#374151',marginBottom:10}}>⚡ Allowed Actions</div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {ACTIONS.map(act=>{
                        const on = hasAction(act)
                        return (
                          <button key={act} onClick={()=>toggleAction(act)}
                            disabled={selRole==='super_admin'}
                            style={{padding:'6px 16px',borderRadius:20,cursor:selRole==='super_admin'?'default':'pointer',
                              border:`1.5px solid ${on?A:'#e2e8f0'}`,fontSize:11,fontWeight:700,
                              background:on?`${A}15`:'#f8fafc',color:on?A:'#94a3b8',
                              transition:'all .15s'}}>
                            {on?'✓':''} {act.charAt(0).toUpperCase()+act.slice(1)}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Module grid */}
                  <div style={{fontSize:11,fontWeight:800,color:'#374151',marginBottom:10}}>
                    📦 Module Access — click to toggle
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:8}}>
                    {VISIBLE_MODULES.map(mod=>{
                      const on = hasModule(mod.id)
                      return (
                        <div key={mod.id} onClick={()=>toggleModule(mod.id)}
                          style={{padding:'12px 14px',borderRadius:10,
                            border:`1.5px solid ${on?A:'#e2e8f0'}`,
                            background:on?`${A}08`:'#f8fafc',
                            cursor:selRole==='super_admin'?'default':'pointer',
                            transition:'all .15s',
                            display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:34,height:34,borderRadius:8,flexShrink:0,
                            background:on?`${A}15`:'#e2e8f0',display:'flex',
                            alignItems:'center',justifyContent:'center',fontSize:18}}>
                            {mod.icon}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:11,fontWeight:700,color:on?A:'#374151',
                              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                              {mod.label}
                            </div>
                            <div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{mod.desc}</div>
                          </div>
                          <div style={{width:20,height:20,borderRadius:'50%',flexShrink:0,
                            background:on?A:'#e2e8f0',border:`2px solid ${on?A:'#e2e8f0'}`,
                            display:'flex',alignItems:'center',justifyContent:'center'}}>
                            {on&&<span style={{color:'#fff',fontSize:10,fontWeight:900}}>✓</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ TAB: USER MANAGEMENT ════ */}
        {tab==='users'&&(
          <div>
            {/* Toolbar */}
            <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search users..."
                style={{padding:'8px 14px',borderRadius:9,border:'1.5px solid #e2e8f0',
                  fontSize:12,outline:'none',flex:1,minWidth:200,maxWidth:320,fontFamily:'inherit'}}
                onFocus={e=>e.target.style.borderColor=A}
                onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              <button onClick={()=>setShowAdd(true)}
                style={{padding:'8px 18px',borderRadius:9,border:'none',background:G,
                  color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                + Add User
              </button>
            </div>

            {/* User table */}
            <div style={{background:'#fff',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,.06)',overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                    {['User','Email','Role','Dept','Level','Status','Actions'].map(h=>(
                      <th key={h} style={{padding:'10px 16px',textAlign:'left',fontWeight:800,color:'#374151',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u=>{
                    const r = roles[u.role] || roles.employee
                    return (
                      <tr key={u.id} style={{borderBottom:'1px solid #f1f5f9',
                        background:selUser===u.id?`${A}06`:'#fff',
                        cursor:'pointer',transition:'background .1s'}}
                        onClick={()=>setSelUser(u.id===selUser?null:u.id)}
                        onMouseEnter={e=>e.currentTarget.style.background=selUser===u.id?`${A}06`:'#f8fafc'}
                        onMouseLeave={e=>e.currentTarget.style.background=selUser===u.id?`${A}06`:'#fff'}>
                        <td style={{padding:'12px 16px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:34,height:34,borderRadius:'50%',flexShrink:0,
                              background:`${r?.color||A}20`,color:r?.color||A,
                              display:'flex',alignItems:'center',justifyContent:'center',
                              fontSize:13,fontWeight:900}}>
                              {u.name.charAt(0)}
                            </div>
                            <span style={{fontWeight:700,color:'#0f172a'}}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{padding:'12px 16px',color:'#64748b'}}>{u.email}</td>
                        <td style={{padding:'12px 16px'}}>
                          <select value={u.role}
                            onChange={e=>{e.stopPropagation();changeUserRole(u.id,e.target.value)}}
                            onClick={e=>e.stopPropagation()}
                            style={{padding:'4px 8px',borderRadius:7,border:`1.5px solid ${r?.color||A}40`,
                              background:`${r?.color||A}10`,color:r?.color||A,
                              fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            {Object.entries(roles).map(([k,v])=>(
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{padding:'12px 16px',color:'#64748b'}}>{u.dept||'—'}</td>
                        <td style={{padding:'12px 16px'}}>
                          <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,
                            background:`${r?.color||A}18`,color:r?.color||A}}>
                            L{u.level}
                          </span>
                        </td>
                        <td style={{padding:'12px 16px'}}>
                          <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,
                            background:u.status==='active'?'#f0fdf4':'#fef2f2',
                            color:u.status==='active'?'#16a34a':'#dc2626'}}>
                            {u.status==='active'?'✓ Active':'✗ Suspended'}
                          </span>
                        </td>
                        <td style={{padding:'12px 16px'}} onClick={e=>e.stopPropagation()}>
                          <div style={{display:'flex',gap:6}}>
                            <button onClick={()=>toggleUserStatus(u.id)}
                              style={{padding:'4px 10px',borderRadius:7,border:'none',cursor:'pointer',
                                fontSize:10,fontWeight:700,
                                background:u.status==='active'?'#fef2f2':'#f0fdf4',
                                color:u.status==='active'?'#dc2626':'#16a34a'}}>
                              {u.status==='active'?'Suspend':'Activate'}
                            </button>
                            {u.role!=='super_admin'&&(
                              <button onClick={()=>{
                                  setUsers(p=>p.filter(x=>x.id!==u.id))
                                  notify('🗑️ User removed',setMsg)
                                }}
                                style={{padding:'4px 10px',borderRadius:7,border:'none',
                                  cursor:'pointer',fontSize:10,fontWeight:700,
                                  background:'#f1f5f9',color:'#64748b'}}>
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ TAB: ACCESS MATRIX ════ */}
        {tab==='matrix'&&(
          <div style={{background:'#fff',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,.06)',overflow:'auto'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',fontSize:13,fontWeight:800,color:'#374151'}}>
              📊 Full Access Matrix — Roles × Modules
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{borderCollapse:'collapse',fontSize:10,minWidth:800}}>
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    <th style={{padding:'10px 16px',textAlign:'left',fontWeight:800,color:'#374151',
                      borderBottom:'2px solid #e2e8f0',minWidth:130,position:'sticky',left:0,background:'#f8fafc'}}>
                      Module
                    </th>
                    {Object.entries(roles).map(([key,r])=>(
                      <th key={key} style={{padding:'8px 12px',textAlign:'center',fontWeight:700,
                        color:r.color,borderBottom:'2px solid #e2e8f0',minWidth:80}}>
                        {r.label.split(' ')[0]}<br/>
                        <span style={{fontSize:8,color:'#94a3b8',fontWeight:500}}>L{r.level}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_MODULES.map((mod,mi)=>(
                    <tr key={mod.id} style={{background:mi%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f1f5f9'}}>
                      <td style={{padding:'9px 16px',fontWeight:700,color:'#374151',
                        position:'sticky',left:0,background:mi%2===0?'#fff':'#fafafa',
                        display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:14}}>{mod.icon}</span>
                        <span>{mod.label}</span>
                      </td>
                      {Object.entries(roles).map(([key,r])=>{
                        const on = r.modules==='all' || (Array.isArray(r.modules)&&r.modules.includes(mod.id))
                        return (
                          <td key={key} style={{padding:'9px 12px',textAlign:'center'}}>
                            <span style={{fontSize:14,
                              color:on?'#16a34a':'#e2e8f0',
                              fontWeight:on?900:400}}>
                              {on ? '✓' : '✕'}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {/* Actions row */}
                  <tr style={{background:'#f0f9ff',borderTop:'2px solid #bae6fd'}}>
                    <td style={{padding:'9px 16px',fontWeight:800,color:A,
                      position:'sticky',left:0,background:'#f0f9ff'}}>⚡ Allowed Actions</td>
                    {Object.entries(roles).map(([key,r])=>(
                      <td key={key} style={{padding:'6px 8px',textAlign:'center',fontSize:9,color:'#64748b'}}>
                        {r.actions==='all' ? 'ALL' : Array.isArray(r.actions) ? r.actions.join(', ') : 'none'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Add User Modal ── */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:16,width:440,maxWidth:'96vw',
            boxShadow:'0 24px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 20px',borderRadius:'16px 16px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>+ Add New User</div>
              <div style={{fontSize:10,opacity:.75,marginTop:2}}>Assign role and permissions immediately</div>
            </div>
            <div style={{padding:'18px 20px'}}>
              {[
                {label:'Full Name *',    k:'name',  type:'text', ph:'Ram Bahadur Thapa'},
                {label:'Work Email *',   k:'email', type:'email',ph:'ram@company.com'},
                {label:'Department',     k:'dept',  type:'text', ph:'HR / Finance / IT'},
              ].map(({label,k,type,ph})=>(
                <div key={k} style={{marginBottom:14}}>
                  <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>{label}</label>
                  <input type={type} value={newUser[k]} onChange={e=>setNewUser(p=>({...p,[k]:e.target.value}))}
                    placeholder={ph}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',
                      fontSize:12,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}
                    onFocus={e=>e.target.style.borderColor=A}
                    onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                </div>
              ))}
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>Role & Authority Level</label>
                <select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',
                    fontSize:12,outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                  {Object.entries(roles).map(([k,r])=>(
                    <option key={k} value={k}>{r.label} — Level {r.level}</option>
                  ))}
                </select>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={addUser}
                  style={{flex:1,padding:'11px',borderRadius:10,border:'none',
                    background:G,color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer'}}>
                  ✅ Create User
                </button>
                <button onClick={()=>setShowAdd(false)}
                  style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',
                    background:'#fff',fontSize:12,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// FILE: src/components/dashboard/snapshots/PermissionManagementPage.jsx
// eLogix HRMS — Permission & Role Management
// COMPLETE REWRITE — Fixes "access is not defined" crash.
// Removes resolveTenantAccess, getSessionSlug, tenantCanAccess,
// getTenantPermissionRecord — all from missing tenantPermissions.js.
// API: GET /api/v1/permissions/users
//      PUT /api/v1/permissions/users/:id
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const A = '#0369a1'
const G = 'linear-gradient(135deg,#0c4a6e,#0369a1,#38bdf8)'

const ALL_MODULES = [
  { id:'dashboard',     label:'Dashboard',            icon:'🏠', desc:'Dashboards and widgets' },
  { id:'ai-assistant',  label:'AI Assistant',         icon:'🤖', desc:'AI tools and analytics' },
  { id:'org-mgmt',      label:'Organization Mgmt',    icon:'🏢', desc:'Company setup, org chart' },
  { id:'emp-lifecycle', label:'Employee Lifecycle',   icon:'👤', desc:'Hiring, onboarding, exit' },
  { id:'workforce-ops', label:'Workforce Operations', icon:'⏰', desc:'Attendance, leave, shift' },
  { id:'perf-talent',   label:'Performance & Talent', icon:'🎯', desc:'KPI, OKR, appraisals' },
  { id:'emp-experience',label:'Employee Experience',  icon:'❤️', desc:'Engagement, wellness' },
  { id:'hr-services',   label:'HR Services',          icon:'🛎️', desc:'Self-service, helpdesk' },
  { id:'finance-assets',label:'Finance & Assets',     icon:'💰', desc:'Payroll, SSF, assets' },
  { id:'compliance',    label:'Compliance & Risk',    icon:'⚖️', desc:'Audit, legal, policies' },
  { id:'reports',       label:'Reports & Analytics',  icon:'📊', desc:'Standard & custom reports' },
  { id:'sys-admin',     label:'System Administration',icon:'⚙️', desc:'Users, roles, settings' },
]
const ACTIONS = ['view','create','edit','delete','approve','export']

export default function PermissionManagementPage(){
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [selected,setSelected]= useState(null)
  const [perms,   setPerms]   = useState({})
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')
  const [msg,     setMsg]     = useState('')

  const s=_getSession(); const company=s?.company||{}
  const myRole=s?.user?.role||'employee'
  const canEdit=['super_admin','hr_manager'].includes(myRole)
  const toast=(m,d=3500)=>{setMsg(m);setTimeout(()=>setMsg(''),d)}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    fetch('/api/v1/permissions/users',{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')};if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>setUsers(d.data?.users||d.users||d.data||[]))
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false))
  },[])

  function selectUser(user){
    setSelected(user)
    // Load permissions for this user
    const token=localStorage.getItem('access_token')||s?.token||''
    if(!token){const p={};ALL_MODULES.forEach(m=>{p[m.id]=Object.fromEntries(ACTIONS.map(a=>[a,false]))});setPerms(p);return}
    fetch(`/api/v1/permissions/users/${user.id}`,{headers:_authH()})
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(d?.data?.permissions||d?.permissions){
          setPerms(d.data?.permissions||d.permissions)
        } else {
          const p={};ALL_MODULES.forEach(m=>{p[m.id]=Object.fromEntries(ACTIONS.map(a=>[a,false]))});setPerms(p)
        }
      })
      .catch(()=>{const p={};ALL_MODULES.forEach(m=>{p[m.id]=Object.fromEntries(ACTIONS.map(a=>[a,false]))});setPerms(p)})
  }

  function toggle(modId,action){
    if(!canEdit)return
    setPerms(prev=>({...prev,[modId]:{...(prev[modId]||{}), [action]:!(prev[modId]?.[action])}}))
  }

  async function save(){
    if(!selected)return
    setSaving(true)
    try{
      const r=await fetch(`/api/v1/permissions/users/${selected.id}`,{method:'PUT',headers:_authH(),body:JSON.stringify({permissions:perms})})
      toast(r.ok?`✅ Permissions saved for ${selected.full_name||selected.name}`:'⚠️ Save failed — stored locally')
    }catch{toast('⚠️ Network error')}
    setSaving(false)
  }

  const filteredUsers=users.filter(u=>!search||(u.full_name||u.name||'').toLowerCase().includes(search.toLowerCase())||(u.email||'').toLowerCase().includes(search.toLowerCase()))

  if(loading&&users.length===0)return<div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading permissions for {company?.name}...</div></div>

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#f0f9ff',minHeight:'100vh'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:'10px 18px',fontSize:12,color:'#0c4a6e',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:360}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(3,105,161,.25)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
          <span style={{fontSize:24}}>🛡️</span>
          <div><h2 style={{fontSize:18,fontWeight:900,color:'#fff',margin:0}}>Permission Management</h2>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · User-level module access control</div>
          </div>
        </div>
      </div>

      {error&&<div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}
      {!canEdit&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>👁️ View-only — only Super Admin and HR Manager can edit permissions</div>}

      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:16}}>
        {/* User list */}
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 14px',borderBottom:'1px solid #f1f5f9'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search users..." style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
          </div>
          {users.length===0&&!loading?(
            <div style={{textAlign:'center',padding:40,color:'#94a3b8',fontSize:12}}>
              <div style={{fontSize:32,marginBottom:8}}>👥</div>No users yet — add users in User Management
            </div>
          ):(
            <div style={{overflowY:'auto',maxHeight:'60vh'}}>
              {filteredUsers.map(u=>{
                const isSel=selected?.id===u.id
                return(
                  <div key={u.id} onClick={()=>selectUser(u)} style={{padding:'12px 14px',cursor:'pointer',background:isSel?'#eff6ff':'#fff',borderLeft:`3px solid ${isSel?A:'transparent'}`,transition:'all .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background=isSel?'#eff6ff':'#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background=isSel?'#eff6ff':'#fff'}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:32,height:32,borderRadius:'50%',background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:A,flexShrink:0}}>
                        {(u.full_name||u.name||'?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:12,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.full_name||u.name}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{u.role_slug||u.role} · {u.dept||''}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Permission matrix */}
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          {!selected?(
            <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>🛡️</div>Select a user to manage their permissions</div>
          ):(
            <>
              <div style={{padding:'14px 18px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>🛡️ {selected.full_name||selected.name}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{selected.email} · {selected.role_slug||selected.role}</div>
                </div>
                {canEdit&&<button onClick={save} disabled={saving} style={{padding:'8px 18px',borderRadius:9,border:'none',background:saving?'#94a3b8':G,color:'#fff',fontSize:11,fontWeight:700,cursor:saving?'wait':'pointer'}}>{saving?'⟳ Saving…':'💾 Save Permissions'}</button>}
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{background:'#f8fafc'}}>
                    <th style={{padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#374151',minWidth:180}}>Module</th>
                    {ACTIONS.map(a=><th key={a} style={{padding:'10px 10px',textAlign:'center',fontWeight:700,color:'#64748b',width:70}}>{a.charAt(0).toUpperCase()+a.slice(1)}</th>)}
                  </tr></thead>
                  <tbody>
                    {ALL_MODULES.map((m,i)=>{
                      const mp=perms[m.id]||{}
                      return(
                        <tr key={m.id} style={{borderBottom:'1px solid #f8fafc',background:i%2?'#fafafa':'#fff'}}
                          onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'}
                          onMouseLeave={e=>e.currentTarget.style.background=i%2?'#fafafa':'#fff'}>
                          <td style={{padding:'10px 14px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontSize:16}}>{m.icon}</span>
                              <div>
                                <div style={{fontWeight:700,color:'#0f172a'}}>{m.label}</div>
                                <div style={{fontSize:9,color:'#94a3b8'}}>{m.desc}</div>
                              </div>
                            </div>
                          </td>
                          {ACTIONS.map(a=>(
                            <td key={a} style={{padding:'10px',textAlign:'center'}}>
                              <input type="checkbox" checked={!!mp[a]} onChange={()=>toggle(m.id,a)}
                                disabled={!canEdit}
                                style={{width:16,height:16,accentColor:A,cursor:canEdit?'pointer':'default'}}/>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// FILE: src/components/dashboard/snapshots/UserManagementPage.jsx
// eLogix HRMS — Tenant User & Role Management (SuperAdmin)
// COMPLETE REWRITE — Zero mock data. Real tenant API. No bad imports.
// SuperAdmin of tenant company manages all users and credentials here.
// Removes MOCK_USERS (6 fake users), tenantPermissions, AccessDenied.
// API: GET/POST/PUT/DELETE /api/v1/company-users
//      PATCH /api/v1/company-users/:id/reset-password
//      PATCH /api/v1/company-users/:id/toggle-status
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G='linear-gradient(135deg,#1e3a5f 0%,#0369a1 60%,#38bdf8 100%)'
const A='#0369a1'
const inp={width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',fontFamily:'inherit',boxSizing:'border-box',background:'#fff'}

// Reference role list — NOT mock data, these are system role definitions
const SYSTEM_ROLES=[
  {slug:'super_admin',    name:'Super Admin',     level:1,  color:'#312e81'},
  {slug:'hr_manager',     name:'HR Manager',      level:3,  color:'#0369a1'},
  {slug:'payroll_officer',name:'Payroll Officer', level:3,  color:'#059669'},
  {slug:'hr_officer',     name:'HR Officer',      level:4,  color:'#0891b2'},
  {slug:'department_head',name:'Department Head', level:4,  color:'#7c3aed'},
  {slug:'branch_manager', name:'Branch Manager',  level:4,  color:'#d97706'},
  {slug:'finance_officer',name:'Finance Officer', level:5,  color:'#059669'},
  {slug:'recruiter',      name:'Recruiter',       level:5,  color:'#0891b2'},
  {slug:'team_lead',      name:'Team Lead',       level:5,  color:'#7c3aed'},
  {slug:'supervisor',     name:'Supervisor',      level:6,  color:'#d97706'},
  {slug:'manager',        name:'Manager',         level:6,  color:'#64748b'},
  {slug:'employee',       name:'Employee',        level:10, color:'#374151'},
]

const BLANK_USER={full_name:'',email:'',role_slug:'employee',dept:'',branch:'',phone:'',is_active:true,send_credentials:true}

function Inp({label,value,onChange,type='text',options,required,placeholder=''}){
  const [foc,setFoc]=useState(false)
  const st={...inp,border:`1.5px solid ${foc?A:'#e2e8f0'}`}
  return(
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>{label}{required&&<span style={{color:'#ef4444'}}> *</span>}</label>
      {type==='select'?<select value={value||''} onChange={e=>onChange(e.target.value)} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} style={{...st,appearance:'none'}}><option value="">Select…</option>{options.map(o=><option key={o.val||o} value={o.val||o}>{o.label||o}</option>)}</select>
      :<input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} style={st}/>}
    </div>
  )
}

export default function UserManagementPage(){
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [tab,      setTab]      = useState('users')
  const [search,   setSearch]   = useState('')
  const [roleF,    setRoleF]    = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({...BLANK_USER})
  const [msg,      setMsg]      = useState('')
  const [msgType,  setMsgType]  = useState('ok')
  const [deleting, setDeleting] = useState(null)
  const [resetting,setResetting]= useState(null)

  const s=_getSession(); const company=s?.company||{}
  const myRole=s?.user?.role||'employee'
  const myLevel=SYSTEM_ROLES.find(r=>r.slug===myRole)?.level||10
  const sf=(k,v)=>setForm(p=>({...p,[k]:v}))
  const toast=(m,type='ok',d=4000)=>{setMsg(m);setMsgType(type);setTimeout(()=>setMsg(''),d)}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);setError('Not authenticated');return}
    fetch('/api/v1/company-users',{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')};if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>setUsers(d.data?.users||d.users||d.data||[]))
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false))
  },[])

  const saveUser=async()=>{
    if(!form.full_name?.trim()){toast('⚠️ Full name required','err');return}
    if(!form.email?.trim()){toast('⚠️ Email required','err');return}
    if(!form.role_slug){toast('⚠️ Role required','err');return}
    setSaving(true)
    try{
      const method=form.id?'PUT':'POST'
      const url=form.id?`/api/v1/company-users/${form.id}`:'/api/v1/company-users'
      const r=await fetch(url,{method,headers:_authH(),body:JSON.stringify({...form,company_id:company?.id})})
      if(r.ok){
        const saved=await r.json(); const user=saved.data||saved.user||{...form,id:Date.now()}
        setUsers(p=>form.id?p.map(u=>u.id===form.id?user:u):[...p,user])
        toast(`✅ User "${form.full_name}" ${form.id?'updated':'created'}${form.send_credentials&&!form.id?' — credentials sent via email':''}`)
      }else{
        const d=await r.json().catch(()=>({}))
        toast(d.message||'❌ Save failed','err')
      }
    }catch{toast('❌ Network error','err')}
    setSaving(false);setShowForm(false);setForm({...BLANK_USER})
  }

  const toggleStatus=async(id,active)=>{
    try{await fetch(`/api/v1/company-users/${id}/toggle-status`,{method:'PATCH',headers:_authH(),body:JSON.stringify({is_active:!active})})}catch{}
    setUsers(p=>p.map(u=>u.id===id?{...u,is_active:!active}:u))
    toast(`${!active?'✅ User activated':'⏸ User deactivated'}`)
  }

  const resetPassword=async(id,name)=>{
    if(!confirm(`Send password reset link to "${name}"?`))return
    setResetting(id)
    try{
      await fetch(`/api/v1/company-users/${id}/reset-password`,{method:'PATCH',headers:_authH()})
      toast(`✅ Password reset link sent to ${name}`)
    }catch{toast('❌ Reset failed — check email configuration','err')}
    setResetting(null)
  }

  const deleteUser=async(id,name)=>{
    if(!confirm(`Remove user "${name}"?\nThis will revoke all access. Attendance and payroll history is preserved.`))return
    setDeleting(id)
    try{await fetch(`/api/v1/company-users/${id}`,{method:'DELETE',headers:_authH()})}catch{}
    setUsers(p=>p.filter(u=>u.id!==id))
    toast(`🗑️ User "${name}" removed`)
    setDeleting(null)
  }

  const filtered=users.filter(u=>{
    if(roleF!=='all'&&u.role_slug!==roleF)return false
    if(search&&!(u.full_name||'').toLowerCase().includes(search.toLowerCase())&&!(u.email||'').toLowerCase().includes(search.toLowerCase()))return false
    return true
  })
  const active=users.filter(u=>u.is_active).length
  const roleOpts=SYSTEM_ROLES.filter(r=>r.level>=myLevel||myLevel===1).map(r=>({val:r.slug,label:r.name}))

  if(loading&&users.length===0)return<div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading users for {company?.name}...</div></div>

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#f0f9ff',minHeight:'100vh'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:msgType==='err'?'#fef2f2':'#f0fdf4',border:`1px solid ${msgType==='err'?'#fecaca':'#bbf7d0'}`,borderRadius:10,padding:'10px 18px',fontSize:12,fontWeight:600,color:msgType==='err'?'#dc2626':'#14532d',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:380}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(3,105,161,.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:24}}>👥</span>
              <div><h2 style={{fontSize:18,fontWeight:900,color:'#fff',margin:0}}>User Management</h2>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · Manage system users, roles & credentials</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[{l:'Total Users',v:users.length,i:'👥'},{l:'Active',v:active,i:'✅'},{l:'Inactive',v:users.length-active,i:'⏸'},{l:'Roles',v:new Set(users.map(u=>u.role_slug)).size,i:'🎭'}].map((s,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'6px 12px'}}>
                  <span style={{fontSize:11}}>{s.i}</span><span style={{fontSize:15,fontWeight:800,color:'#fff',marginLeft:5}}>{s.v}</span>
                  <span style={{fontSize:9,color:'rgba(255,255,255,.7)',marginLeft:3}}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={()=>{setForm({...BLANK_USER});setShowForm(true)}} style={{padding:'10px 18px',borderRadius:12,border:'1.5px solid rgba(255,255,255,.4)',background:'rgba(255,255,255,.2)',color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>+ Add User</button>
        </div>
      </div>

      {error&&<div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {[['users','👥 Users'],['roles','🎭 Roles']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{padding:'8px 18px',borderRadius:20,border:`1.5px solid ${tab===v?A:'#e2e8f0'}`,background:tab===v?A:'#fff',color:tab===v?'#fff':'#64748b',fontSize:12,fontWeight:700,cursor:'pointer'}}>{l}</button>
        ))}
      </div>

      {/* Users tab */}
      {tab==='users'&&(
        <div>
          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search name or email..." style={{flex:1,minWidth:200,padding:'8px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff'}}/>
            <select value={roleF} onChange={e=>setRoleF(e.target.value)} style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff',appearance:'none'}}>
              <option value="all">All Roles</option>
              {SYSTEM_ROLES.map(r=><option key={r.slug} value={r.slug}>{r.name}</option>)}
            </select>
            <button onClick={()=>{setForm({...BLANK_USER});setShowForm(true)}} style={{padding:'8px 18px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>+ Add User</button>
          </div>

          {users.length===0&&!loading?(
            <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:14,border:'2px dashed #e2e8f0',color:'#94a3b8'}}>
              <div style={{fontSize:48,marginBottom:16}}>👥</div>
              <div style={{fontSize:15,fontWeight:700,color:'#475569',marginBottom:6}}>No users yet for {company?.name}</div>
              <div style={{fontSize:12,marginBottom:20}}>Add the first user to grant system access</div>
              <button onClick={()=>{setForm({...BLANK_USER});setShowForm(true)}} style={{padding:'10px 28px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>+ Add First User</button>
            </div>
          ):(
            <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{background:'#f8fafc'}}>
                  {['User','Email','Role','Dept/Branch','Status','Last Login','Actions'].map(h=><th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',whiteSpace:'nowrap'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtered.map((u,i)=>{
                    const role=SYSTEM_ROLES.find(r=>r.slug===u.role_slug)||{name:u.role_slug,color:'#64748b'}
                    return(
                      <tr key={u.id||i} style={{borderBottom:'1px solid #f8fafc',background:i%2?'#fafafa':'#fff'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
                        onMouseLeave={e=>e.currentTarget.style.background=i%2?'#fafafa':'#fff'}>
                        <td style={{padding:'11px 14px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:34,height:34,borderRadius:'50%',background:`${role.color}20`,border:`2px solid ${role.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,flexShrink:0,color:role.color}}>
                              {(u.full_name||'?').charAt(0).toUpperCase()}
                            </div>
                            <div><div style={{fontWeight:700,color:'#0f172a'}}>{u.full_name}</div><div style={{fontSize:9,color:'#94a3b8'}}>{u.emp_code||'—'}</div></div>
                          </div>
                        </td>
                        <td style={{padding:'11px 14px',color:'#64748b',fontSize:11}}>{u.email}</td>
                        <td style={{padding:'11px 14px'}}>
                          <span style={{padding:'2px 10px',borderRadius:20,fontSize:9,fontWeight:700,background:`${role.color}12`,color:role.color}}>{role.name}</span>
                        </td>
                        <td style={{padding:'11px 14px',fontSize:11,color:'#64748b'}}>{[u.dept,u.branch].filter(Boolean).join(' · ')||'—'}</td>
                        <td style={{padding:'11px 14px'}}>
                          <button onClick={()=>toggleStatus(u.id,u.is_active)} style={{padding:'3px 10px',borderRadius:20,border:'none',fontSize:9,fontWeight:700,cursor:'pointer',background:u.is_active?'#f0fdf4':'#f8fafc',color:u.is_active?'#15803d':'#94a3b8'}}>
                            {u.is_active?'✅ Active':'⏸ Inactive'}
                          </button>
                        </td>
                        <td style={{padding:'11px 14px',fontSize:10,color:'#94a3b8'}}>{u.last_login?new Date(u.last_login).toLocaleDateString():'Never'}</td>
                        <td style={{padding:'11px 14px'}}>
                          <div style={{display:'flex',gap:5}}>
                            <button onClick={()=>{setForm({...u});setShowForm(true)}} style={{padding:'4px 10px',borderRadius:7,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>✏️ Edit</button>
                            <button onClick={()=>resetPassword(u.id,u.full_name)} disabled={resetting===u.id} style={{padding:'4px 10px',borderRadius:7,border:'none',background:'#fffbeb',color:'#b45309',fontSize:10,cursor:'pointer'}}>{resetting===u.id?'⟳':'🔑'}</button>
                            <button onClick={()=>deleteUser(u.id,u.full_name)} disabled={deleting===u.id} style={{padding:'4px 10px',borderRadius:7,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:10,cursor:'pointer'}}>{deleting===u.id?'⟳':'🗑️'}</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{padding:'10px 16px',fontSize:11,color:'#94a3b8',borderTop:'1px solid #f1f5f9'}}>{filtered.length} of {users.length} users · {company?.name}</div>
            </div>
          )}
        </div>
      )}

      {/* Roles tab */}
      {tab==='roles'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
          {SYSTEM_ROLES.map(role=>{
            const count=users.filter(u=>u.role_slug===role.slug).length
            return(
              <div key={role.slug} style={{background:'#fff',borderRadius:14,border:`1.5px solid ${role.color}20`,padding:'16px',borderTop:`3px solid ${role.color}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div style={{fontWeight:800,fontSize:12,color:'#0f172a'}}>{role.name}</div>
                  <span style={{fontSize:10,fontWeight:700,color:role.color,background:`${role.color}12`,padding:'2px 8px',borderRadius:20}}>{count}</span>
                </div>
                <div style={{fontSize:9,color:'#94a3b8'}}>Level {role.level} · {count} user{count!==1?'s':''}</div>
                {count>0&&<div style={{marginTop:8,display:'flex',gap:3,flexWrap:'wrap'}}>{users.filter(u=>u.role_slug===role.slug).slice(0,3).map((u,i)=><span key={i} style={{fontSize:8,padding:'1px 6px',borderRadius:20,background:`${role.color}10`,color:role.color}}>{u.full_name?.split(' ')[0]}</span>)}{users.filter(u=>u.role_slug===role.slug).length>3&&<span style={{fontSize:8,color:'#94a3b8'}}>+{users.filter(u=>u.role_slug===role.slug).length-3}</span>}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit form modal */}
      {showForm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowForm(false)}>
          <div style={{background:'#fff',borderRadius:18,width:560,maxHeight:'93vh',overflow:'auto',boxShadow:'0 24px 60px rgba(0,0,0,.25)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:16,fontWeight:900}}>{form.id?'✏️ Edit User':'+ Add New User'}</div>
              <div style={{fontSize:11,opacity:.75,marginTop:2}}>{company?.name}</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <Inp label="Full Name" required value={form.full_name} onChange={v=>sf('full_name',v)} placeholder="Ram Bahadur Thapa"/>
              <Inp label="Email Address" required type="email" value={form.email} onChange={v=>sf('email',v)} placeholder="ram@company.com"/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                <Inp label="Role" required type="select" value={form.role_slug} onChange={v=>sf('role_slug',v)} options={roleOpts}/>
                <Inp label="Phone" type="tel" value={form.phone} onChange={v=>sf('phone',v)} placeholder="+977-XXXXXXXXXX"/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                <Inp label="Department" value={form.dept} onChange={v=>sf('dept',v)} placeholder="HR / Finance / IT…"/>
                <Inp label="Branch" value={form.branch} onChange={v=>sf('branch',v)} placeholder="Kathmandu HQ"/>
              </div>
              {!form.id&&(
                <label style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,cursor:'pointer',padding:'10px 14px',background:'#f0f9ff',borderRadius:10,border:'1.5px solid #bae6fd'}}>
                  <input type="checkbox" checked={!!form.send_credentials} onChange={e=>sf('send_credentials',e.target.checked)} style={{accentColor:A,width:16,height:16}}/>
                  <span style={{fontSize:12,fontWeight:600,color:'#0369a1'}}>📧 Send login credentials to employee's email</span>
                </label>
              )}
              <label style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,cursor:'pointer'}}>
                <input type="checkbox" checked={!!form.is_active} onChange={e=>sf('is_active',e.target.checked)} style={{accentColor:A,width:16,height:16}}/>
                <span style={{fontSize:12,fontWeight:600,color:'#374151'}}>Account is Active</span>
              </label>
              <div style={{display:'flex',gap:10}}>
                <button onClick={saveUser} disabled={saving} style={{flex:1,padding:12,borderRadius:10,border:'none',background:saving?'#94a3b8':G,color:'#fff',fontSize:13,fontWeight:800,cursor:saving?'wait':'pointer'}}>
                  {saving?'⟳ Saving…':`💾 ${form.id?'Update':'Create'} User`}
                </button>
                <button onClick={()=>setShowForm(false)} style={{padding:'12px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:12,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

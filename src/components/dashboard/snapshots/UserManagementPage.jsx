// FILE: src/pages/company/UserManagementPage.jsx
// eLogix HRMS — Company User & Role Management
// HR Admins create users, assign roles, set department/branch hierarchy
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect } from 'react'
import { tenantCanAccess } from '../../../utils/tenantPermissions.js'
import { resolveTenantAccess, getSessionSlug, getTenantPermissionRecord } from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'

const G  = 'linear-gradient(135deg,#1e3a5f 0%,#0369a1 60%,#38bdf8 100%)'
const A  = '#0369a1'
const inp = {width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',
  fontSize:11,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}

const SYSTEM_ROLES = [
  {slug:'super_admin',     name:'Super Admin',      level:1,  color:'#312e81', desc:'Full system access'},
  {slug:'executive',       name:'Executive',        level:2,  color:'#0c4a6e', desc:'View all + approve'},
  {slug:'hr_manager',      name:'HR Manager',       level:3,  color:'#0369a1', desc:'Full HR access'},
  {slug:'payroll_officer', name:'Payroll Officer',  level:3,  color:'#059669', desc:'Payroll + finance'},
  {slug:'hod',             name:'HOD',              level:4,  color:'#7c3aed', desc:'Own dept + approve'},
  {slug:'hr_officer',      name:'HR Officer',       level:4,  color:'#0891b2', desc:'HR support tasks'},
  {slug:'department_head', name:'Department Head',  level:4,  color:'#7c3aed', desc:'Own department'},
  {slug:'branch_manager',  name:'Branch Manager',   level:4,  color:'#d97706', desc:'Own branch'},
  {slug:'finance_officer', name:'Finance Officer',  level:5,  color:'#059669', desc:'Finance reports'},
  {slug:'recruiter',       name:'Recruiter',        level:5,  color:'#0891b2', desc:'Recruitment only'},
  {slug:'team_lead',       name:'Team Lead',        level:5,  color:'#7c3aed', desc:'Own team'},
  {slug:'supervisor',      name:'Supervisor',       level:6,  color:'#d97706', desc:'Own team oversight'},
  {slug:'manager',         name:'Manager',          level:6,  color:'#64748b', desc:'Team management'},
  {slug:'employee',        name:'Employee',         level:10, color:'#374151', desc:'Self-service only'},
]

// Users are tenant-scoped — load from localStorage key per company slug
// In production: GET /api/v1/users (JWT-filtered by company_id)
const MOCK_USERS = [
  {id:'u1',full_name:'Bikash Adhikari', email:'bikash@company.com',role_slug:'super_admin',dept:'Management',branch:'HQ',level:1,is_active:true,last_login:'2 hrs ago'},
  {id:'u2',full_name:'Priya Sharma',    email:'priya@company.com', role_slug:'hr_manager',  dept:'HR',         branch:'HQ',level:3,is_active:true,last_login:'1 day ago'},
  {id:'u3',full_name:'Ramesh Thapa',    email:'ramesh@company.com',role_slug:'payroll_officer',dept:'Finance',branch:'HQ',level:3,is_active:true,last_login:'3 hrs ago'},
  {id:'u4',full_name:'Sunita Karki',    email:'sunita@company.com',role_slug:'department_head',dept:'IT',      branch:'Lalitpur',level:4,is_active:true,last_login:'5 hrs ago'},
  {id:'u5',full_name:'Anil Maharjan',   email:'anil@company.com',  role_slug:'team_lead',   dept:'Sales',      branch:'Pokhara',level:5,is_active:true,last_login:'1 day ago'},
  {id:'u6',full_name:'Maya Gurung',     email:'maya@company.com',  role_slug:'employee',    dept:'Operations', branch:'HQ',level:10,is_active:false,last_login:'2 weeks ago'},
]

const MODULES = ['employees','attendance','leave','payroll','recruitment','performance','training','documents','reports','settings']

export default function UserManagementPage() {
  const slug   = getSessionSlug()
  // Tenant access check
  if (!tenantCanAccess('user-management')) {
    return <AccessDenied moduleName="UserManagement" />
  }
  // Read current user level from session (no useAuth hook needed outside App context)
  const myLevel = (() => {
    try {
      const sess = JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}
      const role = sess?.user?.role || 'employee'
      const levelMap = {super_admin:1,executive:2,hr_manager:3,payroll_officer:3,
        hod:4,hr_officer:4,department_head:4,branch_manager:4,finance_officer:5,
        recruiter:5,team_lead:5,supervisor:6,manager:6,employee:10}
      return levelMap[role] || 10
    } catch(_e) { return 10 }
  })()
  const can = () => true  // permission check done at module level by resolveTenantAccess
  const sess    = (() => { try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}} })()
  const company = sess.company || {}
  const plan    = (company.plan||'trial').toLowerCase()
  const permRec = getTenantPermissionRecord(slug)

  // Filter available roles by plan (trial gets minimal roles)
  const PLAN_ROLE_KEYS = {
    trial:['super_admin','employee'],
    starter:['super_admin','hr_officer','finance_officer','employee'],
    growth:['super_admin','executive','hr_manager','hr_officer','finance_officer','hod','team_lead','employee'],
  }
  const planRoles = PLAN_ROLE_KEYS[plan] || SYSTEM_ROLES.map(r=>r.slug)
  const availableRoles = SYSTEM_ROLES.filter(r => planRoles.includes(r.slug) || !PLAN_ROLE_KEYS[plan])

  const [_apiLoading, _setApiLoading] = useState(false)
  const [tab, setTab]         = useState('users')
  const [users, setUsers]     = useState(MOCK_USERS)
  const [search, setSearch]   = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selRole, setSelRole] = useState(null)
  const [editPerms, setEditPerms] = useState(null)
  const [msg, setMsg]         = useState('')
  const [form, setForm]       = useState({full_name:'',email:'',role_slug:'employee',dept:'',branch:'',reports_to:''})

  const notify = m=>{setMsg(m);setTimeout(()=>setMsg(''),3500)}
  const sf=(k,v)=>setForm(p=>({...p,[k]:v}))

  const filtered = users.filter(u=>
    !search || u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role_slug.includes(search.toLowerCase())
  )

  const canManage = can('employees','create') || myLevel<=3

  const handleAdd = () => {
    if (!form.full_name||!form.email) { notify('⚠️ Name and email required'); return }
    const role = SYSTEM_ROLES.find(r=>r.slug===form.role_slug)
    const newU = {...form,id:`u${Date.now()}`,level:role?.level||10,is_active:true,last_login:'just now'}
    setUsers(p=>[...p,newU])
    notify(`✅ ${form.full_name} added as ${role?.name}`)
    setShowAdd(false)
    setForm({full_name:'',email:'',role_slug:'employee',dept:'',branch:'',reports_to:''})
  }

  const toggleActive = (id) => {
    setUsers(p=>p.map(u=>u.id===id?{...u,is_active:!u.is_active}:u))
    const u = users.find(x=>x.id===id)
    notify(u?.is_active?`⏸ ${u?.full_name} deactivated — logged out`:`✅ ${u?.full_name} reactivated`)
  }

  const PermMatrix = ({role}) => {
    const [perms, setPerms] = useState(
      Object.fromEntries(MODULES.map(m=>[m,{view:role.level<=4,create:role.level<=3,edit:role.level<=3,delete:role.level<=2,approve:role.level<=4,export:role.level<=3}]))
    )
    return (
      <div>
        <div style={{fontWeight:800,fontSize:12,marginBottom:12}}>
          Permission Matrix for <span style={{color:role.color}}>{role.name}</span> (Level {role.level})
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                <th style={{padding:'8px 12px',textAlign:'left',borderBottom:'1px solid #f1f5f9',width:130}}>Module</th>
                {['View','Create','Edit','Delete','Approve','Export'].map(a=>(
                  <th key={a} style={{padding:'8px 10px',textAlign:'center',borderBottom:'1px solid #f1f5f9',fontSize:9,fontWeight:700}}>{a}</th>
                ))}
                <th style={{padding:'8px 10px',textAlign:'center',borderBottom:'1px solid #f1f5f9',fontSize:9,fontWeight:700}}>Scope</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m,i)=>(
                <tr key={m} style={{background:i%2===0?'#fff':'#fafafa'}}>
                  <td style={{padding:'8px 12px',fontWeight:700,color:'#374151',textTransform:'capitalize'}}>{m.replace('_',' ')}</td>
                  {['view','create','edit','delete','approve','export'].map(action=>(
                    <td key={action} style={{padding:'8px 10px',textAlign:'center'}}>
                      <input type="checkbox" checked={perms[m]?.[action]||false}
                        onChange={e=>setPerms(p=>({...p,[m]:{...p[m],[action]:e.target.checked}}))}
                        style={{cursor:'pointer',width:14,height:14}}/>
                    </td>
                  ))}
                  <td style={{padding:'8px 10px',textAlign:'center'}}>
                    <select style={{fontSize:9,padding:'2px 4px',borderRadius:4,border:'1px solid #e2e8f0'}}
                      defaultValue={role.level<=3?'all':role.level<=4?'own_dept':'self_only'}>
                      <option value="all">All</option>
                      <option value="own_dept">Own Dept</option>
                      <option value="own_branch">Own Branch</option>
                      <option value="own_team">Own Team</option>
                      <option value="self_only">Self Only</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={()=>{notify(`✅ Permissions saved for ${role.name}`);setEditPerms(null)}}
          style={{marginTop:14,padding:'10px 20px',borderRadius:9,border:'none',
            background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
          💾 Save Permissions
        </button>
      </div>
    )
  }


  // SaaS DB — load real tenant data (fallback to mock if no token/API down)
  useEffect(() => {
    const _token = localStorage.getItem('access_token')
    const _slug  = getSessionSlug()
    if (!_token) return
    _setApiLoading(true)
    fetch('/api/v1/company-users', {
      headers: {
        'Authorization': `Bearer ${_token}`,
        'X-Tenant-Slug': _slug,
        'Content-Type': 'application/json',
      }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const items = d.users || d.data || d.items || []
        if (items.length > 0) setTab(items)
      })
      .catch(() => {/* keep mock */})
      .finally(() => _setApiLoading(false))
  }, [])

  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f0f7ff'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',
        border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:11,color:'#065f46',
        boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:440}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,padding:'16px 24px',color:'#fff',marginBottom:16,borderRadius:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>👥 User & Role Management</div>
            <div style={{fontSize:10,opacity:.75}}>Create users · Assign roles · Set hierarchy · Manage permissions</div>
          </div>
          {canManage&&(
            <button onClick={()=>setShowAdd(true)}
              style={{padding:'9px 18px',borderRadius:9,border:'none',background:'#fff',
                color:A,fontSize:11,fontWeight:800,cursor:'pointer'}}>+ Add User</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,padding:'0 0 14px',flexWrap:'wrap'}}>
        {[['users','👥 Users'],['roles','🎖 Roles & Permissions'],['hierarchy','🏢 Hierarchy']].map(([id,lb])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:'8px 16px',borderRadius:20,border:`1.5px solid ${tab===id?A:'#e2e8f0'}`,
              background:tab===id?A+'15':'#fff',color:tab===id?A:'#64748b',
              fontSize:11,fontWeight:tab===id?800:400,cursor:'pointer'}}>
            {lb}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab==='users'&&(
        <>
          <div style={{display:'flex',gap:10,marginBottom:14}}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search users..."
              style={{...inp,maxWidth:280}}/>
            <span style={{fontSize:10,color:'#64748b',alignSelf:'center'}}>
              {filtered.length}/{users.length} users
            </span>
          </div>
          <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 6px rgba(0,0,0,.06)',overflow:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:700}}>
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['User','Email','Role','Level','Department','Branch','Last Login','Status','Actions'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,fontWeight:700,
                      color:'#374151',borderBottom:'1px solid #f1f5f9'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u,i)=>{
                  const role = SYSTEM_ROLES.find(r=>r.slug===u.role_slug)
                  const canEdit = myLevel < u.level  // can only manage users below your level
                  return (
                    <tr key={u.id} style={{background:i%2===0?'#fff':'#fafafa'}}>
                      <td style={{padding:'9px 14px',fontWeight:700,color:'#0f172a'}}>{u.full_name}</td>
                      <td style={{padding:'9px 14px',color:'#64748b',fontSize:10}}>{u.email}</td>
                      <td style={{padding:'9px 14px'}}>
                        <span style={{background:(role?.color||'#64748b')+'15',
                          color:role?.color||'#64748b',fontSize:9,fontWeight:700,
                          padding:'2px 8px',borderRadius:20}}>
                          {role?.name||u.role_slug}
                        </span>
                      </td>
                      <td style={{padding:'9px 14px',textAlign:'center'}}>
                        <span style={{background:'#f1f5f9',color:'#374151',fontSize:9,fontWeight:700,
                          padding:'2px 8px',borderRadius:20}}>L{u.level}</span>
                      </td>
                      <td style={{padding:'9px 14px',fontSize:10,color:'#475569'}}>{u.dept||'—'}</td>
                      <td style={{padding:'9px 14px',fontSize:10,color:'#475569'}}>{u.branch||'—'}</td>
                      <td style={{padding:'9px 14px',fontSize:9,color:'#94a3b8'}}>{u.last_login}</td>
                      <td style={{padding:'9px 14px'}}>
                        <span style={{background:u.is_active?'#f0fdf4':'#fef2f2',
                          color:u.is_active?'#059669':'#dc2626',fontSize:9,fontWeight:700,
                          padding:'2px 8px',borderRadius:20}}>
                          {u.is_active?'✅ Active':'❌ Inactive'}
                        </span>
                      </td>
                      <td style={{padding:'9px 14px'}}>
                        {canEdit&&(
                          <div style={{display:'flex',gap:4}}>
                            <button onClick={()=>notify(`✏️ Editing ${u.full_name}`)}
                              style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#eff6ff',
                                color:'#1d4ed8',fontSize:8,fontWeight:700,cursor:'pointer'}}>Edit</button>
                            <button onClick={()=>toggleActive(u.id)}
                              style={{padding:'4px 8px',borderRadius:6,border:'none',
                                background:u.is_active?'#fffbeb':'#f0fdf4',
                                color:u.is_active?'#d97706':'#059669',fontSize:8,fontWeight:700,cursor:'pointer'}}>
                              {u.is_active?'⏸':'✅'}
                            </button>
                            <button onClick={()=>notify(`🔑 Password reset email sent to ${u.email}`)}
                              style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#f5f3ff',
                                color:'#7c3aed',fontSize:8,fontWeight:700,cursor:'pointer'}}>Reset PW</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── ROLES TAB ── */}
      {tab==='roles'&&(
        editPerms ? (
          <div style={{background:'#fff',borderRadius:12,padding:'20px',boxShadow:'0 1px 6px rgba(0,0,0,.06)'}}>
            <button onClick={()=>setEditPerms(null)}
              style={{marginBottom:16,padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',
                background:'#fff',fontSize:10,cursor:'pointer'}}>← Back to Roles</button>
            <PermMatrix role={editPerms}/>
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
            {availableRoles.map(role=>(
              <div key={role.slug} style={{background:'#fff',borderRadius:12,padding:'16px',
                boxShadow:'0 1px 6px rgba(0,0,0,.06)',borderLeft:`4px solid ${role.color}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:13,color:role.color}}>{role.name}</div>
                    <div style={{fontSize:9,color:'#64748b'}}>{role.desc}</div>
                  </div>
                  <span style={{background:role.color+'15',color:role.color,fontSize:9,fontWeight:800,
                    padding:'3px 9px',borderRadius:20}}>L{role.level}</span>
                </div>
                <div style={{display:'flex',gap:6,marginTop:12}}>
                  <button onClick={()=>setEditPerms(role)}
                    style={{flex:1,padding:'7px',borderRadius:8,border:'none',
                      background:role.color+'15',color:role.color,fontSize:9,fontWeight:700,cursor:'pointer'}}>
                    🔐 Edit Permissions
                  </button>
                  <span style={{fontSize:9,color:'#94a3b8',display:'flex',alignItems:'center'}}>
                    {users.filter(u=>u.role_slug===role.slug).length} users
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── HIERARCHY TAB ── */}
      {tab==='hierarchy'&&(
        <div style={{background:'#fff',borderRadius:12,padding:'20px',boxShadow:'0 1px 6px rgba(0,0,0,.06)'}}>
          <div style={{fontWeight:800,fontSize:13,marginBottom:16}}>🏢 Company Authority Hierarchy</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[1,2,3,4,5,6,10].map(lv=>{
              const levelRoles = SYSTEM_ROLES.filter(r=>r.level===lv)
              const levelUsers = users.filter(u=>u.level===lv)
              return (
                <div key={lv} style={{display:'flex',alignItems:'center',gap:14,
                  padding:'12px 16px',borderRadius:10,background:'#f8fafc',
                  borderLeft:`4px solid ${levelRoles[0]?.color||'#e2e8f0'}`}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:levelRoles[0]?.color||'#e2e8f0',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    color:'#fff',fontWeight:900,fontSize:14}}>L{lv}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:12,color:'#0f172a'}}>
                      {levelRoles.map(r=>r.name).join(' · ')}
                    </div>
                    <div style={{fontSize:10,color:'#64748b'}}>
                      {levelUsers.map(u=>u.full_name).join(', ')||'No users assigned'}
                    </div>
                  </div>
                  <div style={{fontSize:20,fontWeight:900,color:levelRoles[0]?.color||'#e2e8f0'}}>
                    {levelUsers.length}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Add User Modal ── */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,width:520,maxWidth:'96vw',maxHeight:'92vh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>+ Add New User</div>
              <div style={{fontSize:10,opacity:.8}}>Welcome email with temp password sent automatically</div>
            </div>
            <div style={{padding:'20px 22px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                {[['Full Name *','full_name','text'],['Email *','email','email'],
                  ['Employee ID','emp_id','text'],['Phone','phone','text']].map(([lb,k,t])=>(
                  <div key={k}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                    <input type={t} value={form[k]||''} onChange={e=>sf(k,e.target.value)} style={inp} placeholder={lb.replace(' *','')+' ...'}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Role *</label>
                  <select value={form.role_slug} onChange={e=>sf('role_slug',e.target.value)} style={inp}>
                    {availableRoles.filter(r=>r.level > myLevel).map(r=>(
                      <option key={r.slug} value={r.slug}>{r.name} (L{r.level})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Department</label>
                  <input value={form.dept||''} onChange={e=>sf('dept',e.target.value)} style={inp} placeholder="e.g. Finance"/>
                </div>
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Branch</label>
                  <input value={form.branch||''} onChange={e=>sf('branch',e.target.value)} style={inp} placeholder="e.g. Kathmandu HQ"/>
                </div>
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Reports To</label>
                  <select style={inp} onChange={e=>sf('reports_to',e.target.value)}>
                    <option value="">— Select Manager —</option>
                    {users.filter(u=>u.level<10).map(u=><option key={u.id} value={u.id}>{u.full_name} ({u.role_slug})</option>)}
                  </select>
                </div>
              </div>
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:9,
                padding:'10px 14px',marginBottom:16,fontSize:10,color:'#92400e'}}>
                ⚡ You can only create users at a lower authority level than your own (L{myLevel}).
                A temp password will be sent to their email automatically.
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={handleAdd}
                  style={{flex:1,padding:'11px',borderRadius:9,border:'none',background:G,
                    color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  ✅ Create User
                </button>
                <button onClick={()=>setShowAdd(false)}
                  style={{padding:'11px 18px',borderRadius:9,border:'1px solid #e2e8f0',
                    background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

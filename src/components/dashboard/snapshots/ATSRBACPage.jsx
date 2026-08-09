// ATSRBACPage.jsx - Multi-Company, Multi-Branch, Role-Based Access Control
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const COMPANIES = [
  { id:'co1', name:'NepHR Pro Pvt. Ltd.', type:'Owner', branches:3, users:12, plan:'Enterprise', active:true },
  { id:'co2', name:'TechSoft Nepal',      type:'Client', branches:2, users:6, plan:'Business',   active:true },
  { id:'co3', name:'FinTech Nepal',       type:'Client', branches:1, users:4, plan:'Starter',    active:true },
  { id:'co4', name:'Marketing Hub Pvt.', type:'Client', branches:2, users:3, plan:'Business',   active:false },
]

const BRANCHES = [
  { id:'b1', name:'Kathmandu HQ',   company:'NepHR Pro', city:'Kathmandu', users:8, jobs:12, active:true },
  { id:'b2', name:'Pokhara Office', company:'NepHR Pro', city:'Pokhara',   users:3, jobs:4,  active:true },
  { id:'b3', name:'Chitwan Office', company:'NepHR Pro', city:'Chitwan',   users:2, jobs:2,  active:true },
  { id:'b4', name:'TechSoft Main',  company:'TechSoft',  city:'Kathmandu', users:4, jobs:6,  active:true },
  { id:'b5', name:'TechSoft Dev',   company:'TechSoft',  city:'Lalitpur',  users:2, jobs:3,  active:true },
]

const ROLES = [
  { id:'r1', name:'Super Admin',       level:1, color:'#dc2626', bg:'#fef2f2', desc:'Full system access across all companies', perms:['all'] },
  { id:'r2', name:'Company Admin',     level:2, color:'#f59e0b', bg:'#fffbeb', desc:'Full access within own company', perms:['company.*'] },
  { id:'r3', name:'HR Director',       level:3, color:'#7c3aed', bg:'#f5f3ff', desc:'Manage all HR operations, approve requisitions', perms:['jobs','candidates','reports','settings'] },
  { id:'r4', name:'Recruiter',         level:4, color:'#1e40af', bg:'#eff6ff', desc:'Post jobs, manage candidates, schedule interviews', perms:['jobs','candidates','interviews'] },
  { id:'r5', name:'Interviewer',       level:5, color:'#059669', bg:'#f0fdf4', desc:'View assigned candidates, submit scorecards only', perms:['interviews.own','scorecards'] },
  { id:'r6', name:'Hiring Manager',    level:5, color:'#0891b2', bg:'#ecfeff', desc:'Raise requisitions, approve shortlists, view reports', perms:['requisitions','candidates.view','reports.team'] },
  { id:'r7', name:'Finance Approver',  level:5, color:'#64748b', bg:'#f8fafc', desc:'Approve job requisitions from finance perspective', perms:['requisitions.approve'] },
  { id:'r8', name:'Client Viewer',     level:6, color:'#94a3b8', bg:'#f8fafc', desc:'View-only access to assigned candidate shortlists', perms:['candidates.shortlist.view'] },
]

const USERS = [
  { id:'u1', name:'Bikash Shrestha', email:'bikash@nephrpro.com', role:'Super Admin',    company:'NepHR Pro', branch:'Kathmandu HQ', status:'Active', lastLogin:'2 hrs ago' },
  { id:'u2', name:'Maya Pradhan',    email:'maya@nephrpro.com',   role:'HR Director',   company:'NepHR Pro', branch:'Kathmandu HQ', status:'Active', lastLogin:'1 day ago' },
  { id:'u3', name:'Anita Gurung',    email:'anita@nephrpro.com',  role:'Recruiter',     company:'NepHR Pro', branch:'Kathmandu HQ', status:'Active', lastLogin:'3 hrs ago' },
  { id:'u4', name:'Ramesh Koirala',  email:'ramesh@nephrpro.com', role:'Finance Approver',company:'NepHR Pro',branch:'Kathmandu HQ', status:'Active', lastLogin:'5 days ago' },
  { id:'u5', name:'Sunita Rana',     email:'sunita@techsoft.com', role:'Company Admin', company:'TechSoft',  branch:'TechSoft Main', status:'Active', lastLogin:'6 hrs ago' },
  { id:'u6', name:'Dev Karki',       email:'dev@techsoft.com',    role:'Recruiter',     company:'TechSoft',  branch:'TechSoft Main', status:'Active', lastLogin:'1 day ago' },
  { id:'u7', name:'Priya Rai',       email:'priya@fintechne.com', role:'Hiring Manager',company:'FinTech',   branch:'FinTech HQ',   status:'Inactive', lastLogin:'2 weeks ago' },
]

const PERMISSIONS = {
  'Jobs': ['Create Job','Edit Job','Delete Job','Publish Job','View All Jobs'],
  'Candidates': ['View Candidates','Shortlist Candidates','Reject Candidates','Export Candidates','View Contact Info'],
  'Interviews': ['Schedule Interview','View All Interviews','Submit Scorecard','View Scorecards'],
  'Offers': ['Generate Offer','Approve Offer','View Offers','Send Offer'],
  'Reports': ['View Team Reports','View Company Reports','View All Reports','Export Reports'],
  'Settings': ['Manage Users','Manage Roles','Manage Integrations','Billing'],
  'Requisitions': ['Create Requisition','Approve Requisition','View All Requisitions'],
}

export default function ATSRBACPage() {
  const { navigate } = useApp()
  const [tab, setTab] = useState('companies')
  const [selRole, setSelRole] = useState(ROLES[2])
  const [msg, setMsg] = useState('')
  const [inviteForm, setInviteForm] = useState({ name:'', email:'', role:'Recruiter', company:'NepHR Pro', branch:'Kathmandu HQ' })
  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'linear-gradient(135deg,#0f172a,#475569)', borderRadius:14, padding:'16px 22px', marginBottom:16, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900 }}>Multi-Company / RBAC</h2>
          <p style={{ margin:'3px 0 0', fontSize:10, opacity:.8 }}>Multi-company · Multi-branch · Role-based access control · User management · Audit trail</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {msg && <span style={{ fontSize:9, padding:'5px 12px', background:'rgba(255,255,255,.2)', borderRadius:8 }}>{msg}</span>}
          {[['companies','Companies'],['branches','Branches'],['roles','Roles'],['users','Users'],['permissions','Permissions']].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:'6px 12px', borderRadius:8, border:'none', background:tab===t?'rgba(255,255,255,.25)':'rgba(255,255,255,.1)', color:'#fff', fontSize:9, fontWeight:tab===t?800:400, cursor:'pointer' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {[{l:'Companies',v:COMPANIES.length,c:'#1e40af'},{l:'Branches',v:BRANCHES.length,c:'#7c3aed'},{l:'Roles',v:ROLES.length,c:'#059669'},{l:'Users',v:USERS.length,c:'#f59e0b'},{l:'Active Sessions',v:5,c:'#0891b2'}].map((s,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:10, padding:'8px 14px', border:'1px solid #f1f5f9', flex:'1 1 80px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:900, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:8, color:'#94a3b8' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {tab==='companies' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#0f172a' }}>Company Accounts</div>
            <button onClick={() => notify('Add company wizard opened!')} style={{ padding:'7px 14px', borderRadius:9, border:'none', background:'#1e40af', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>+ Add Company</button>
          </div>
          {COMPANIES.map(c => (
            <div key={c.id} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', marginBottom:8, border:'1px solid #f1f5f9', display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
              <div style={{ width:42, height:42, borderRadius:10, background:'linear-gradient(135deg,#1e3a5f,#1e40af)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#fff', flexShrink:0 }}>{c.name[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>{c.name}</span>
                  <span style={{ fontSize:8, padding:'2px 8px', borderRadius:6, background:c.type==='Owner'?'#fef9c3':'#eff6ff', color:c.type==='Owner'?'#92400e':'#1e40af', fontWeight:700 }}>{c.type}</span>
                  <span style={{ fontSize:8, padding:'2px 8px', borderRadius:6, background:c.active?'#f0fdf4':'#f8fafc', color:c.active?'#059669':'#94a3b8', border:`1px solid ${c.active?'#bbf7d0':'#e2e8f0'}` }}>{c.active?'Active':'Inactive'}</span>
                  <span style={{ fontSize:8, padding:'2px 8px', borderRadius:6, background:'#f5f3ff', color:'#7c3aed' }}>{c.plan}</span>
                </div>
                <div style={{ fontSize:9, color:'#64748b' }}>{c.branches} branch{c.branches>1?'es':''} · {c.users} users</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => notify('Company settings opened!')} style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#374151', fontSize:8, cursor:'pointer' }}>Settings</button>
                <button onClick={() => notify('Switching to ' + c.name + '!')} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'#1e40af', color:'#fff', fontSize:8, cursor:'pointer' }}>Switch</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='branches' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#0f172a' }}>Branches / Offices</div>
            <button onClick={() => notify('Add branch opened!')} style={{ padding:'7px 14px', borderRadius:9, border:'none', background:'#7c3aed', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>+ Add Branch</button>
          </div>
          {BRANCHES.map(b => (
            <div key={b.id} style={{ background:'#fff', borderRadius:12, padding:'12px 14px', marginBottom:8, border:'1px solid #f1f5f9', display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ width:36, height:36, borderRadius:8, background:'#f5f3ff', border:'1px solid #c4b5fd', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🏢</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#0f172a' }}>{b.name}</div>
                <div style={{ fontSize:9, color:'#64748b' }}>{b.company} · {b.city} · {b.users} users · {b.jobs} active jobs</div>
              </div>
              <span style={{ fontSize:8, padding:'2px 8px', borderRadius:6, background:b.active?'#f0fdf4':'#fef2f2', color:b.active?'#059669':'#ef4444' }}>{b.active?'Active':'Inactive'}</span>
              <button onClick={() => notify('Branch settings opened!')} style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#374151', fontSize:8, cursor:'pointer' }}>Manage</button>
            </div>
          ))}
        </div>
      )}

      {tab==='roles' && (
        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:10 }}>System Roles</div>
            {ROLES.map(r => (
              <div key={r.id} onClick={() => setSelRole(r)}
                style={{ borderRadius:10, padding:'10px 12px', marginBottom:6, border:`1.5px solid ${selRole?.id===r.id?r.color:'#f1f5f9'}`, cursor:'pointer', background:selRole?.id===r.id?r.bg:'#fff' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                  <span style={{ fontSize:10, fontWeight:700,}}>{r.name}</span>
                  <span style={{ fontSize:7, fontWeight:700, padding:'1px 6px', borderRadius:4, background:r.bg, color:r.color }}>L{r.level}</span>
                </div>
                <div style={{ fontSize:8, color:'#64748b', lineHeight:1.4 }}>{r.desc}</div>
              </div>
            ))}
            <button onClick={() => notify('Custom role creator opened!')} style={{ width:'100%', padding:'9px', borderRadius:9, border:'1px dashed #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:9, cursor:'pointer', marginTop:8 }}>+ Create Custom Role</button>
          </div>
          {selRole && (
            <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:selRole.bg, border:`2px solid ${selRole.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>👤</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:900, color:selRole.color }}>{selRole.name}</div>
                  <div style={{ fontSize:9, color:'#64748b' }}>{selRole.desc}</div>
                </div>
              </div>
              <div style={{ fontSize:10, fontWeight:800, color:'#0f172a', marginBottom:10 }}>Permissions</div>
              {Object.entries(PERMISSIONS).map(([module, perms]) => (
                <div key={module} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'#374151', marginBottom:7, textTransform:'uppercase', letterSpacing:'.06em' }}>{module}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {perms.map(perm => {
                      const granted = selRole.perms.includes('all') || selRole.perms.some(p => p.startsWith(module.toLowerCase()))
                      return (
                        <label key={perm} style={{ display:'flex', gap:5, alignItems:'center', fontSize:9, cursor:'pointer', padding:'4px 8px', borderRadius:6, background:granted?'#f0fdf4':'#f8fafc', border:`1px solid ${granted?'#bbf7d0':'#e2e8f0'}` }}>
                          <input type="checkbox" defaultChecked={granted} onChange={() => notify('Permission updated!')} />
                          <span style={{ color:granted?'#065f46':'#64748b' }}>{perm}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
              <button onClick={() => notify('Role permissions saved!')} style={{ padding:'9px 20px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#1e3a5f,#475569)', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>Save Permissions</button>
            </div>
          )}
        </div>
      )}

      {tab==='users' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#0f172a' }}>User Management</div>
          </div>
          {/* Invite form */}
          <div style={{ background:'#fff', borderRadius:12, padding:'14px 16px', marginBottom:14, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#0f172a', marginBottom:10 }}>Invite New User</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
              {[['Name','name','text'],['Email','email','email']].map(([l,k,t]) => (
                <div key={k}>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                  <input type={t} value={inviteForm[k]} onChange={e => setInviteForm(f => ({ ...f, [k]: e.target.value }))} style={{ width:'100%', padding:'7px 9px', borderRadius:7, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
              {[['Role','role',ROLES.map(r=>r.name)],['Company','company',COMPANIES.map(c=>c.name)],['Branch','branch',BRANCHES.map(b=>b.name)]].map(([l,k,opts]) => (
                <div key={k}>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                  <select value={inviteForm[k]} onChange={e => setInviteForm(f => ({ ...f, [k]: e.target.value }))} style={{ width:'100%', padding:'7px 9px', borderRadius:7, border:'1px solid #e2e8f0', fontSize:9, outline:'none' }}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button onClick={() => { if (inviteForm.name && inviteForm.email) notify(`Invite sent to ${inviteForm.email} as ${inviteForm.role}!`); else notify('Fill name and email first.') }}
              style={{ marginTop:10, padding:'8px 20px', borderRadius:9, border:'none', background:'#1e40af', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>Send Invite</button>
          </div>
          {/* Users table */}
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
            <div style={{ background:'#1e3a5f', color:'#fff', display:'grid', gridTemplateColumns:'1fr 160px 140px 120px 80px 80px', padding:'9px 14px', fontSize:9, fontWeight:700, gap:8 }}>
              {['User','Role','Company / Branch','Last Login','Status','Actions'].map(h => <div key={h}>{h}</div>)}
            </div>
            {USERS.map(u => {
              const role = ROLES.find(r => r.name === u.role)
              return (
                <div key={u.id} style={{ display:'grid', gridTemplateColumns:'1fr 160px 140px 120px 80px 80px', padding:'10px 14px', borderBottom:'1px solid #f1f5f9', alignItems:'center', gap:8 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{u.name}</div>
                    <div style={{ fontSize:8, color:'#94a3b8' }}>{u.email}</div>
                  </div>
                  <div>
                    <span style={{ fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:6, background:role?.bg||'#f8fafc', color:role?.color||'#64748b' }}>{u.role}</span>
                  </div>
                  <div style={{ fontSize:9, color:'#64748b' }}>{u.company} · {u.branch}</div>
                  <div style={{ fontSize:8, color:'#94a3b8' }}>{u.lastLogin}</div>
                  <span style={{ fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:6, background:u.status==='Active'?'#f0fdf4':'#f8fafc', color:u.status==='Active'?'#059669':'#94a3b8' }}>{u.status}</span>
                  <div style={{ display:'flex', gap:4 }}>
                    <button onClick={() => notify('User edited!')} style={{ padding:'3px 7px', borderRadius:5, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#374151', fontSize:7, cursor:'pointer' }}>Edit</button>
                    <button onClick={() => notify('User deactivated!')} style={{ padding:'3px 7px', borderRadius:5, border:'none', background:'#fef2f2', color:'#dc2626', fontSize:7, cursor:'pointer' }}>Revoke</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab==='permissions' && (
        <div>
          <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:14 }}>Permission Matrix — All Roles</div>
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'auto' }}>
            <div style={{ display:'grid', gridTemplateColumns:`180px repeat(${ROLES.length},1fr)`, minWidth:900 }}>
              <div style={{ background:'#1e3a5f', color:'#fff', padding:'10px 12px', fontSize:9, fontWeight:700 }}>Module / Permission</div>
              {ROLES.map(r => (
                <div key={r.id} style={{ background:'#1e3a5f', color:'#fff', padding:'10px 8px', fontSize:8, fontWeight:700, textAlign:'center' }}>
                  <div style={{ fontSize:10 }}>L{r.level}</div>
                  <div style={{ color:r.color+'cc', marginTop:2 }}>{r.name.split(' ')[0]}</div>
                </div>
              ))}
              {Object.entries(PERMISSIONS).map(([mod, perms]) => [
                <div key={mod+'h'} style={{ gridColumn:`span ${ROLES.length+1}`, background:'#f8fafc', padding:'6px 12px', fontSize:8, fontWeight:800, color:'#0f172a', textTransform:'uppercase', letterSpacing:'.06em', borderTop:'1px solid #e2e8f0' }}>{mod}</div>,
                ...perms.map((perm,pi) => [
                  <div key={perm} style={{ padding:'6px 12px', fontSize:9, color:'#374151', borderBottom:'1px solid #f8fafc', display:'flex', alignItems:'center' }}>{perm}</div>,
                  ...ROLES.map(r => {
                    const g = r.perms.includes('all') || r.perms.some(p => p.startsWith(mod.toLowerCase()))
                    return <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'center', borderBottom:'1px solid #f8fafc' }}>
                      <span style={{ fontSize:12, color:g?'#10b981':'#e2e8f0' }}>{g?'✓':'–'}</span>
                    </div>
                  })
                ])
              ])}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// FILE: AccountCreationPage.jsx — Account Creation & Employee Enrollment
// eLogix HRMS — Employee Joining module
// TWO MODES:
//   A) IT Account Provisioning (existing — auto-triggered after NDA/contract)
//   B) New Employee Enrollment — create profile for new candidate/hire or bulk upload
// Nepal Labour Act 2074 compliant | useApp + DeptSetupShared pattern

import { useState } from 'react'
import { PageHeader, ExcelModal, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

// ── IT Provisioning data (existing mode) ─────────────────────
const SYSTEMS = [
  {key:'email',label:'Corporate Email',icon:'📧'},
  {key:'hris',label:'HRIS Self-Service Portal',icon:'👤'},
  {key:'slack',label:'Slack / Teams',icon:'💬'},
  {key:'erp',label:'ERP / Finance System',icon:'📊'},
  {key:'vpn',label:'VPN Access',icon:'🔐'},
  {key:'attendance',label:'Attendance App',icon:'⏰'},
  {key:'software',label:'Role-Specific Software',icon:'💻'},
]

const ACCOUNTS = [
  { id:'a1', employee:'Gita Maharjan', position:'Cloud Architect', dept:'IT', joined:'2081-03-22',
    nda_signed:true, contract_signed:true, trigger_status:'ready',
    accounts:{email:'done',hris:'done',slack:'done',erp:'na',vpn:'done',attendance:'done',software:'in_progress'},
    overall_pct:86, twofa_enabled:false, it_ticket:'IT-2025-0412' },
  { id:'a2', employee:'Sunita Rai', position:'Senior Software Developer', dept:'IT', joined:'2081-03-25',
    nda_signed:false, contract_signed:false, trigger_status:'blocked',
    accounts:{email:'pending',hris:'pending',slack:'pending',erp:'na',vpn:'pending',attendance:'pending',software:'pending'},
    overall_pct:0, twofa_enabled:false, it_ticket:null },
  { id:'a3', employee:'Maya Pradhan', position:'Finance Manager', dept:'Finance', joined:'2081-03-01',
    nda_signed:true, contract_signed:true, trigger_status:'completed',
    accounts:{email:'done',hris:'done',slack:'done',erp:'done',vpn:'done',attendance:'done',software:'done'},
    overall_pct:100, twofa_enabled:true, it_ticket:'IT-2025-0398' },
]

// ── New Enrollment (Candidate → Employee) ────────────────────
const ENROLLED = [
  { id:'e1', name:'Ram Bhandari',    phone:'+977-9801234567', email:'ram@email.com',    dept:'IT',      position:'Senior Dev',     type:'New Hire',   status:'Complete',    joined:'2081-03-22', emp_id:'EMP-0142' },
  { id:'e2', name:'Sita Lama',       phone:'+977-9807654321', email:'sita@email.com',   dept:'Finance', position:'Accountant',     type:'New Hire',   status:'In Progress', joined:'2081-03-28', emp_id:'EMP-0143' },
  { id:'e3', name:'Hari Shrestha',   phone:'+977-9809876543', email:'hari@email.com',   dept:'HR',      position:'HR Officer',     type:'Transfer',   status:'Pending',     joined:'2081-04-01', emp_id:null },
]

const STATUS_DOT = {done:'#10b981',in_progress:'#f59e0b',pending:'#94a3b8',na:'#e2e8f0'}
const TRIGGER_CFG = {
  ready:     {c:'#3b82f6',bg:'#eff6ff',label:'Ready to Provision'},
  blocked:   {c:'#ef4444',bg:'#fef2f2',label:'Blocked — NDA/Contract Pending'},
  completed: {c:'#10b981',bg:'#f0fdf4',label:'All Accounts Active'},
const EST_COLOR = {Complete:'#10b981','In Progress':'#f59e0b',Pending:'#94a3b8'}

const BLANK = {name:'',phone:'',email:'',dept:'',position:'',type:'New Hire',joined:'',employment_type:'Permanent'}

export default function AccountCreationPage() {
  const [tab, setTab]           = useState('enroll')   // 'enroll' | 'it'
  const [accounts, setAccounts] = useState(ACCOUNTS)
  const [enrolled, setEnrolled] = useState(ENROLLED)
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [form, setForm]         = useState(BLANK)
  const [ctx, setCtx]           = useState(null)
  const [msg, setMsg]           = useState('')

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  // ── IT Provisioning helpers ──────────────────────────────────
  const filteredAcc = accounts.filter(a => !search || a.employee.toLowerCase().includes(search.toLowerCase()))

  const provisionAccount = (id, sysKey) => {
    setAccounts(prev => prev.map(a => {
      if (a.id !== id || a.trigger_status === 'blocked') return a
      const newAccounts = {...a.accounts, [sysKey]:'done'}
      const done = Object.values(newAccounts).filter(v=>v==='done').length
      const total = Object.values(newAccounts).filter(v=>v!=='na').length
      const pct = Math.round(done/total*100)
      return {...a, accounts:newAccounts, overall_pct:pct,
              trigger_status: pct===100?'completed':'ready'}
    }))
    notify('Account provisioned!')

  // ── Enrollment helpers ───────────────────────────────────────
  const filteredEnroll = enrolled.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()))

  const submitEnroll = () => {
    if (!form.name || !form.dept || !form.position) { notify('⚠️ Name, Dept, Position required'); return }
    const newId = 'EMP-' + String(144 + enrolled.length).padStart(4,'0')
    setEnrolled(prev => [...prev, {
      id: 'e'+Date.now(), ...form, status:'Pending', emp_id:null
    }])
    setShowForm(false)
    setForm(BLANK)
    notify(`✅ ${form.name} enrolled! IT provisioning triggered.`)

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="👤" title="Account Creation & Employee Enrollment"
        breadcrumb="Employee Lifecycle > Onboarding > Employee Joining"
        gradient={G}
        stats={[
          {icon:'👥',label:'Enrolled',       value:enrolled.length},
          {icon:'✅',label:'IT Provisioned', value:accounts.filter(a=>a.overall_pct===100).length},
          {icon:'⏳',label:'Pending Setup',  value:enrolled.filter(e=>e.status==='Pending').length},
          {icon:'🔴',label:'Blocked',        value:accounts.filter(a=>a.trigger_status==='blocked').length},
        ]}
        onAdd={()=>setShowForm(true)} addLabel="+ Enroll Employee"
        onExcel={()=>setShowExcel(true)}/>

      {/* Mode tabs */}
      <div style={{display:'flex',gap:6,marginBottom:14,background:'#f1f5f9',padding:4,borderRadius:10,width:'fit-content'}}>
        {[['enroll','👤 Enroll New Employee / Candidate'],['it','💻 IT Account Provisioning']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'8px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:10,
            background:tab===k?'#fff':'transparent',color:tab===k?A:'#64748b',
            fontWeight:tab===k?700:400,boxShadow:tab===k?'0 1px 4px rgba(0,0,0,.1)':'none'}}>{l}</button>
        ))}
      </div>

      {msg && <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46'}}>{msg}</div>}

      {/* ── TAB: ENROLL ── */}
      {tab==='enroll' && (
        <>
          <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
            <span style={{fontSize:18}}>💡</span>
            <div><strong>Employee Enrollment:</strong> Create an employee profile for a new hire or transfer. Once enrolled, their Employee ID is auto-generated and IT account provisioning is triggered automatically. Use <strong>Bulk Upload</strong> to enroll multiple employees from Excel.</div>
          </div>

          <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search enrolled employees..."/>
            <button onClick={()=>setShowForm(true)} style={{padding:'9px 18px',borderRadius:9,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',flexShrink:0}}>+ Enroll Single</button>
            <button onClick={()=>setShowExcel(true)} style={{padding:'9px 18px',borderRadius:9,border:'1px solid '+A,background:'#fff',color:A,fontSize:10,fontWeight:700,cursor:'pointer',flexShrink:0}}>📤 Bulk Upload Excel</button>
          </div>

          {/* Enrolled list */}
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
              <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
                {['Employee','Department','Position','Type','Joining Date','Emp ID','Status','Actions'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'#64748b'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredEnroll.map((e,i)=>(
                  <tr key={e.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                    <td style={{padding:'11px 14px'}}>
                      <div style={{display:'flex',gap:9,alignItems:'center'}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:A,flexShrink:0}}>
                          {e.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                        </div>
                        <div>
                          <div style={{fontWeight:700,color:'#0f172a'}}>{e.name}</div>
                          <div style={{fontSize:8,color:'#64748b'}}>{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'11px 14px',color:'#374151'}}>{e.dept}</td>
                    <td style={{padding:'11px 14px',color:'#374151'}}>{e.position}</td>
                    <td style={{padding:'11px 14px'}}>
                      <span style={{fontSize:8,fontWeight:700,padding:'3px 8px',borderRadius:6,background:'#f0f9ff',color:'#0369a1'}}>{e.type}</span>
                    </td>
                    <td style={{padding:'11px 14px',color:'#64748b'}}>{e.joined||'TBD'}</td>
                    <td style={{padding:'11px 14px',fontWeight:700,color:e.emp_id?'#059669':'#94a3b8'}}>{e.emp_id||'Pending'}</td>
                    <td style={{padding:'11px 14px'}}>
                      <span style={{fontSize:8,fontWeight:700,padding:'3px 8px',borderRadius:6,background:EST_COLOR[e.status]+'20',color:EST_COLOR[e.status]}}>{e.status}</span>
                    </td>
                    <td style={{padding:'11px 14px'}}>
                      <div style={{display:'flex',gap:5}}>
                        <button style={{padding:'5px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:8,cursor:'pointer'}}>👁 View</button>
                        <button style={{padding:'5px 10px',borderRadius:7,border:'none',background:A,color:'#fff',fontSize:8,cursor:'pointer'}}>✏️ Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB: IT PROVISIONING ── */}
      {tab==='it' && (
        <>
          <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
            <span style={{fontSize:18}}>⚡</span>
            <div><strong>Zero-touch provisioning:</strong> Auto-triggered after NDA and contract signing. Blocked employees cannot be provisioned until all documents are complete.</div>
          </div>

          <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

          <div style={{display:'grid',gap:14,marginTop:14}}>
            {filteredAcc.map(a=>{
              const cfg = TRIGGER_CFG[a.trigger_status]
              return (
                <LuxCard key={a.id} color={A}>
                  <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9'}}>
                    <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                      <div style={{width:44,height:44,borderRadius:'50%',background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:A,flexShrink:0}}>
                        {a.employee.split(' ').map(n=>n[0]).join('').slice(0,2)}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{a.employee}</div>
                        <div style={{fontSize:10,color:'#64748b'}}>{a.position} · {a.dept}</div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                        <span style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,background:cfg.bg,color:cfg.c}}>{cfg.label}</span>
                        <span style={{fontSize:11,fontWeight:900,color:a.overall_pct===100?'#10b981':A}}>{a.overall_pct}% done</span>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:'12px 18px',display:'flex',flexWrap:'wrap',gap:8}}>
                    {SYSTEMS.map(sys=>{
                      const status = a.accounts[sys.key]
                      if (status==='na') return null
                      return (
                        <div key={sys.key} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',borderRadius:9,border:`1px solid ${STATUS_DOT[status]}40`,background:`${STATUS_DOT[status]}08`,cursor:status==='pending'&&a.trigger_status!=='blocked'?'pointer':'default'}}
                          onClick={()=>status==='pending'&&a.trigger_status!=='blocked'&&provisionAccount(a.id,sys.key)}>
                          <span style={{fontSize:12}}>{sys.icon}</span>
                          <div>
                            <div style={{fontSize:9,fontWeight:600,color:'#374151'}}>{sys.label}</div>
                            <div style={{fontSize:8,color:STATUS_DOT[status],fontWeight:700}}>{status.replace('_',' ')}</div>
                          </div>
                          {status==='pending'&&a.trigger_status!=='blocked'&&<span style={{fontSize:8,color:A,fontWeight:700}}>→ Click</span>}
                        </div>
                      )
                    })}
                  </div>
                </LuxCard>
              )
            })}
          </div>
        </>
      )}

      {/* ── ENROLL FORM MODAL ── */}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowForm(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:28,width:520,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:900,color:'#0f172a',marginBottom:4}}>👤 Enroll New Employee / Candidate</div>
            <div style={{fontSize:10,color:'#64748b',marginBottom:20}}>Fill details below to create employee profile. Employee ID auto-generates on save.</div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              {[
                ['Full Name *','name','text'],
                ['Phone *','phone','text'],
                ['Email','email','email'],
                ['Department *','dept','text'],
                ['Position / Designation *','position','text'],
                ['Joining Date','joined','date'],
              ].map(([label,field,type])=>(
                <div key={field}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{label}</label>
                  <input type={type} value={form[field]} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
              <div>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Employment Type</label>
                <select value={form.employment_type} onChange={e=>setForm(p=>({...p,employment_type:e.target.value}))}
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',background:'#fff'}}>
                  {['Permanent','Contract','Probation','Part-Time','Intern','Outsource'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Enroll Type</label>
                <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',background:'#fff'}}>
                  {['New Hire','Transfer','Re-hire','Promotion','Contract Renewal'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'10px 14px',marginBottom:20,fontSize:9,color:'#92400e'}}>
              ⚠️ <strong>Nepal Labour Act 2074:</strong> Employee must be provided appointment letter within 30 days of joining. SSF registration required within 3 months.
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={submitEnroll} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>✅ Enroll & Trigger IT Setup</button>
              <button onClick={()=>setShowForm(false)} style={{padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[
        {icon:'👁',label:'View Profile',key:'view'},{icon:'✏️',label:'Edit',key:'edit'},
        {icon:'📄',label:'Print ID Card',key:'print'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}

      {showExcel&&<ExcelModal title="Bulk Employee Enrollment"
        columns={['Full Name','Phone','Email','Department','Position','Joining Date','Employment Type','Enroll Type']}
        onClose={()=>setShowExcel(false)}
        onImport={(f,result)=>{
          notify(`✅ Bulk import from ${f.name} — ${Array.isArray(result)?result.length:0} employees queued for enrollment`)
          setShowExcel(false)
        }}/>}
    </div>
  )

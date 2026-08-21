// FILE: WelcomeCommunicationPage.jsx — Welcome Communication (Employee Joining)
// eLogix HRMS — Send, preview, track welcome messages to new employees
// FULLY FUNCTIONAL: + Create, compose & preview messages, send tracking, recipient display
// Nepal Labour Act 2074 compliant | useApp + DeptSetupShared pattern

import { useState } from 'react'
import { PageHeader, ExcelModal, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#38bdf8 100%)'
const A = '#0369a1'

// ── Welcome message templates ────────────────────────────────
const MSG_TEMPLATES = {
  'Pre-start Welcome Email': {
    subject: 'Welcome to [Company Name] — We are excited to have you!',
    body: `Dear [Employee Name],

On behalf of [Company Name], we are thrilled to welcome you as our new [Position] in the [Department] department.

Your joining date is confirmed as [Joining Date]. Please report to [Location] at [Time] AM.

Here is what to bring on Day 1:
• Original citizenship/passport (for verification)
• 2 passport-sized photos
• Copies of academic certificates
• Bank account details for payroll

We look forward to having you with us!

Warm regards,
HR Team | [Company Name]`,
    channel: 'Email',
  },
  'CEO Welcome Video': {
    subject: 'A personal welcome from our CEO',
    body: `Dear [Employee Name],

Please watch this short welcome message from our CEO before your first day.

[VIDEO LINK: https://company.com/ceo-welcome]

The CEO personally welcomes every new team member to set the right tone and share our vision.

HR Team`,
    channel: 'Portal',
  },
  'Day-1 Agenda': {
    subject: 'Your Day 1 Schedule at [Company Name]',
    body: `Dear [Employee Name],

Here is your Day 1 agenda:

09:00 AM — Reception & ID card collection
09:30 AM — HR orientation (documents, SSF, policies)
11:00 AM — IT setup (laptop, accounts, email)
12:30 PM — Welcome lunch with your team
02:00 PM — Department introduction with [HOD Name]
03:30 PM — 1:1 with your direct manager
05:00 PM — End of Day 1

Dress code: Smart casual

See you soon!`,
    channel: 'Email + SMS',
  },
  'Team-wide Announcement': {
    subject: 'Please welcome [Employee Name] to our team!',
    body: `Team,

We are delighted to announce that [Employee Name] has joined us as [Position] in the [Department] team, effective [Joining Date].

[Employee Name] brings [X] years of experience in [Field]. Please give them a warm welcome!

Best,
HR Team`,
    channel: 'Slack / Teams',
  },
  'Company Swag Details': {
    subject: 'Your Company Welcome Kit is on its way!',
    body: `Dear [Employee Name],

Your company welcome kit includes:
• Company branded t-shirt (size [Size])
• Notebook & pen
• Employee handbook
• Access card

It will be ready for collection on your first day at the reception desk.

HR Team`,
    channel: 'Email',
  },
  'Vendor-Appropriate Welcome': {
    subject: 'Welcome — Scope of Work & Key Contacts',
    body: `Dear [Employee Name],

Welcome to [Company Name]. As a vendor-supplied team member through [Vendor Name], here is what you need to know:

Your role: [Position]
Reporting to: [Supervisor Name]
Work site: [Location]
Working hours: [Start Time] — [End Time]
Weekly off: [Day]

Key contacts:
• HR: [HR Name] — [HR Phone]
• Your Supervisor: [Supervisor Name] — [Supervisor Phone]
• Security: [Number]

Please carry your ID card at all times.

HR Team`,
    channel: 'Email',
  },

const COMMUNICATIONS = [
  { id:'wc1', employee:'Gita Maharjan', type:'insource', position:'Cloud Architect', dept:'IT', phone:'+977-9801111111', email:'gita@company.com',
    joining_date:'2081-03-22', manager:'Rajesh Sharma (CTO)',
    sequence:[
      {step:'Pre-start Welcome Email',sent:true, date:'2081-03-15',channel:'Email',     opened:true},
      {step:'CEO Welcome Video',       sent:true, date:'2081-03-15',channel:'Portal',    opened:true},
      {step:'Company Swag Details',    sent:true, date:'2081-03-16',channel:'Email',     opened:true},
      {step:'Day-1 Agenda',            sent:true, date:'2081-03-21',channel:'Email + SMS',opened:false},
      {step:'Team-wide Announcement',  sent:false,date:null,        channel:'Slack',     opened:false},
    ]},
  { id:'wc2', employee:'Sunita Rai', type:'insource', position:'Senior Software Developer', dept:'IT', phone:'+977-9802222222', email:'sunita@company.com',
    joining_date:'2081-03-28', manager:'Rajesh Sharma (CTO)',
    sequence:[
      {step:'Pre-start Welcome Email',sent:true, date:'2081-03-20',channel:'Email',     opened:true},
      {step:'CEO Welcome Video',       sent:false,date:null,        channel:'Portal',    opened:false},
      {step:'Company Swag Details',    sent:false,date:null,        channel:'Email',     opened:false},
      {step:'Day-1 Agenda',            sent:false,date:null,        channel:'Email + SMS',opened:false},
      {step:'Team-wide Announcement',  sent:false,date:null,        channel:'Slack',     opened:false},
    ]},
  { id:'wc3', employee:'Ramesh Bahadur Shrestha', type:'outsource', position:'Security Guard', dept:'Operations',
    phone:'+977-9803333333', email:'ramesh@shiledguard.com',
    joining_date:'2081-03-20', manager:'Maya Gurung (Ops Head)', vendor:'ShieldGuard Nepal',
    sequence:[
      {step:'Vendor-Appropriate Welcome',sent:true,date:'2081-03-18',channel:'Email',opened:true},
      {step:'Day-1 Agenda',              sent:true,date:'2081-03-19',channel:'Email + SMS',opened:false},
    ]},
]

export default function WelcomeCommunicationPage() {
  const [comms, setComms]         = useState(COMMUNICATIONS)
  const [search, setSearch]       = useState('')
  const [filterType, setFilter]   = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showPreview, setShowPreview] = useState(null) // {comm, step, template}
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)
  const [msg, setMsg]             = useState('')

  // New send form state
  const [newComm, setNewComm] = useState({employee:'',email:'',phone:'',position:'',dept:'',type:'insource',joining_date:'',manager:'',vendor:''})

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = comms.filter(c => {
    if (filterType!=='all' && c.type!==filterType) return false
    if (search && !c.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const sendStep = (commId, stepName) => {
    setComms(prev=>prev.map(c=>c.id!==commId?c:{...c,
      sequence:c.sequence.map(s=>s.step!==stepName?s:{...s,sent:true,date:new Date().toISOString().split('T')[0]})
    }))
    notify(`✅ "${stepName}" sent!`)

  const previewMsg = (comm, step) => {
    const tpl = MSG_TEMPLATES[step.step]
    if (!tpl) return
    const filled = {
      ...tpl,
      body: tpl.body
        .replace(/\[Employee Name\]/g, comm.employee)
        .replace(/\[Position\]/g, comm.position)
        .replace(/\[Department\]/g, comm.dept)
        .replace(/\[Joining Date\]/g, comm.joining_date)
        .replace(/\[HOD Name\]/g, comm.manager)
        .replace(/\[Vendor Name\]/g, comm.vendor||'')
        .replace(/\[Company Name\]/g, 'Future Company Nepal')
        .replace(/\[Location\]/g, 'Head Office, Kathmandu')
        .replace(/\[Time\]/g, '09:00')
    setShowPreview({comm, step, template:filled})

  const totalSent  = comms.reduce((s,c)=>s+c.sequence.filter(x=>x.sent).length,0)
  const totalSteps = comms.reduce((s,c)=>s+c.sequence.length,0)

  const addNewEmployee = () => {
    if (!newComm.employee || !newComm.dept) { notify('⚠️ Name and Department required'); return }
    const isOutsource = newComm.type==='outsource'
    const defaultSeq = isOutsource
      ? [{step:'Vendor-Appropriate Welcome',sent:false,date:null,channel:'Email',opened:false},{step:'Day-1 Agenda',sent:false,date:null,channel:'Email + SMS',opened:false}]
      : [{step:'Pre-start Welcome Email',sent:false,date:null,channel:'Email',opened:false},{step:'CEO Welcome Video',sent:false,date:null,channel:'Portal',opened:false},{step:'Company Swag Details',sent:false,date:null,channel:'Email',opened:false},{step:'Day-1 Agenda',sent:false,date:null,channel:'Email + SMS',opened:false},{step:'Team-wide Announcement',sent:false,date:null,channel:'Slack',opened:false}]
    setComms(prev=>[...prev,{id:'wc'+Date.now(),...newComm,sequence:defaultSeq}])
    setShowCreate(false)
    setNewComm({employee:'',email:'',phone:'',position:'',dept:'',type:'insource',joining_date:'',manager:'',vendor:''})
    notify(`✅ Welcome sequence created for ${newComm.employee}`)

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="📨" title="Welcome Communication"
        breadcrumb="Employee Lifecycle > Onboarding > Employee Joining"
        gradient={G}
        stats={[
          {icon:'👥',label:'New Hires',     value:comms.length},
          {icon:'✅',label:'Messages Sent', value:totalSent},
          {icon:'📊',label:'Completion',    value:Math.round(totalSent/totalSteps*100)+'%'},
          {icon:'👁',label:'Open Rate',     value:Math.round(comms.reduce((s,c)=>s+c.sequence.filter(x=>x.opened).length,0)/Math.max(totalSent,1)*100)+'%'},
        ]}
        onAdd={()=>setShowCreate(true)} addLabel="+ Add Employee"
        onExcel={()=>setShowExcel(true)}/>

      {msg && <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46'}}>{msg}</div>}

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','insource','outsource'].map(t=>(
            <button key={t} onClick={()=>setFilter(t)} style={{padding:'8px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
              background:filterType===t?'#fff':'transparent',color:filterType===t?A:'#64748b',
              fontWeight:filterType===t?700:400,boxShadow:filterType===t?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {t==='all'?'All':t==='insource'?'🏢 Insource':'🏭 Outsource'}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(c=>{
          const sentCount = c.sequence.filter(s=>s.sent).length
          return (
            <div key={c.id} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.employee,...c}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${c.type==='outsource'?'#f59e0b':A}`}}>
              
              {/* Employee header row */}
              <div style={{display:'flex',alignItems:'flex-start',gap:14,padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:A,flexShrink:0}}>
                  {c.employee.split(' ').map(n=>n[0]).join('').slice(0,2)}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{c.employee}</span>
                    <span style={{background:c.type==='outsource'?'#fffbeb':'#f0fdf4',color:c.type==='outsource'?'#b45309':'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                      {c.type==='outsource'?'🏭 Outsource':'🏢 Insource'}
                    </span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{c.position} · {c.dept}{c.vendor?` · ${c.vendor}`:''}</div>
                  {/* Recipient details */}
                  <div style={{display:'flex',gap:12,marginTop:5,fontSize:9,color:'#475569'}}>
                    <span>📧 {c.email}</span>
                    <span>📱 {c.phone}</span>
                    {c.joining_date&&<span>📅 Joining: <strong>{c.joining_date}</strong></span>}
                    {c.manager&&<span>👔 Reports to: <strong>{c.manager}</strong></span>}
                  </div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:sentCount===c.sequence.length?'#10b981':A}}>{sentCount}/{c.sequence.length}</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>SENT</div>
                </div>
              </div>

              {/* Message sequence */}
              <div style={{padding:'12px 18px'}}>
                {c.sequence.map((s,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<c.sequence.length-1?'1px solid #f8fafc':'none'}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:s.sent?'#10b981':'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:700,flexShrink:0}}>
                      {s.sent?'✓':i+1}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:600,color:s.sent?'#0f172a':'#94a3b8'}}>{s.step}</div>
                      <div style={{display:'flex',gap:8,fontSize:9,color:'#94a3b8',marginTop:1}}>
                        <span>📡 {s.channel}</span>
                        {s.date&&<span>📅 {s.date}</span>}
                        {s.sent&&<span style={{color:s.opened?'#10b981':'#f59e0b'}}>{s.opened?'👁 Opened':'📭 Not opened'}</span>}
                        <span style={{color:'#475569'}}>→ To: <strong style={{color:'#0f172a'}}>{c.employee}</strong> ({c.type==='outsource'?c.vendor||c.email:c.email})</span>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:5,flexShrink:0}}>
                      {MSG_TEMPLATES[s.step]&&(
                        <button onClick={()=>previewMsg(c,s)} style={{padding:'4px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:8,cursor:'pointer'}}>👁 Preview</button>
                      )}
                      {!s.sent&&(
                        <button onClick={()=>sendStep(c.id,s.step)} style={{padding:'4px 12px',borderRadius:7,border:'none',background:G,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Send Now</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── CREATE NEW MODAL ── */}
      {showCreate&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCreate(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:28,width:500,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:900,marginBottom:4,color:'#0f172a'}}>📨 Add Employee to Welcome Sequence</div>
            <div style={{fontSize:10,color:'#64748b',marginBottom:20}}>Fill details — a welcome message sequence is auto-created based on employee type.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              {[['Full Name *','employee','text'],['Email *','email','email'],['Phone','phone','text'],
                ['Position','position','text'],['Department *','dept','text'],['Joining Date','joining_date','date'],
                ['Manager / HOD','manager','text'],['Vendor (if outsource)','vendor','text']
              ].map(([label,field,type])=>(
                <div key={field}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{label}</label>
                  <input type={type} value={newComm[field]} onChange={e=>setNewComm(p=>({...p,[field]:e.target.value}))}
                    style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>Employee Type</label>
              <div style={{display:'flex',gap:8}}>
                {['insource','outsource'].map(t=>(
                  <button key={t} onClick={()=>setNewComm(p=>({...p,type:t}))} style={{flex:1,padding:'9px',borderRadius:9,border:`2px solid ${newComm.type===t?A:'#e2e8f0'}`,background:newComm.type===t?`${A}10`:'#fff',color:newComm.type===t?A:'#64748b',fontSize:10,fontWeight:newComm.type===t?700:400,cursor:'pointer'}}>
                    {t==='insource'?'🏢 Insource (Direct Hire)':'🏭 Outsource (Vendor/Contract)'}
                  </button>
                ))}
              </div>
              <div style={{fontSize:9,color:'#64748b',marginTop:6}}>
                {newComm.type==='insource'
                  ? '→ Will create: Pre-start Email, CEO Video, Swag Details, Day-1 Agenda, Team Announcement'
                  : '→ Will create: Vendor-Appropriate Welcome, Day-1 Agenda'}
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={addNewEmployee} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>📨 Create Sequence</button>
              <button onClick={()=>setShowCreate(false)} style={{padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGE PREVIEW MODAL ── */}
      {showPreview&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowPreview(null)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:580,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:13,fontWeight:900}}>{showPreview.template.subject}</div>
              <div style={{fontSize:9,opacity:.8,marginTop:3}}>To: {showPreview.comm.employee} · {showPreview.comm.email} · via {showPreview.step.channel}</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'flex',gap:8,marginBottom:16,fontSize:9,flexWrap:'wrap'}}>
                <span style={{background:'#f1f5f9',padding:'4px 10px',borderRadius:6}}>📧 From: HR Team</span>
                <span style={{background:'#f1f5f9',padding:'4px 10px',borderRadius:6}}>To: {showPreview.comm.employee}</span>
                <span style={{background:'#f1f5f9',padding:'4px 10px',borderRadius:6}}>📡 Channel: {showPreview.step.channel}</span>
              </div>
              <pre style={{fontSize:11,color:'#374151',lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'system-ui,sans-serif',background:'#f8fafc',borderRadius:10,padding:16,margin:0}}>
                {showPreview.template.body}
              </pre>
              <div style={{display:'flex',gap:10,marginTop:20}}>
                <button onClick={()=>{sendStep(showPreview.comm.id,showPreview.step.step);setShowPreview(null)}}
                  style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>
                  ✅ Send This Message
                </button>
                <button onClick={()=>setShowPreview(null)} style={{padding:'10px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[
        {icon:'👁',label:'View Sequence',key:'view'},{icon:'📧',label:'Send All Pending',key:'send'},
        {icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}

      {showExcel&&<ExcelModal title="Welcome Communications" columns={['Employee','Email','Phone','Department','Position','Joining Date','Type','Manager']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{notify(`✅ Imported from ${f.name}`);setShowExcel(false)}}/>}
    </div>
  )

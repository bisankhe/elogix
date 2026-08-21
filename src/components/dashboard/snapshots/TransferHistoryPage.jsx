// FILE: TransferHistoryPage.jsx — Transfer & History (Employee Movement)
// AI-generated transfer letter, auto-notify staff/supervisor/HOD, maintain history, hit timeline
import { useState } from 'react'
import { ExcelModal, PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#164e63 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const REASON_LABELS = {
  lateral_skill_alignment:'Skill Alignment',restructuring:'Restructuring',
  geographic_request:'Employee Request',business_need:'Business Need',promotion:'Promotion-based',
const STATUS_CFG = {
  completed:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Completed'},
  pending:  {c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'In Progress'},
  cancelled:{c:'#ef4444',bg:'#fef2f2',icon:'❌',label:'Cancelled'},

const TRANSFERS_INIT = [
  { id:'t1', employee:'Priya Khadka', emp_id:'EMP-0089', position:'Sales Executive', dept_from:'Sales & Marketing', dept_to:'Customer Service',
    branch_from:'KTM HQ', branch_to:'Pokhara', manager_from:'Dipak Tamang', manager_to:'Anil Bista',
    hod_to:'Maya Gurung', effective_date:'2025-08-01', reason:'geographic_request',
    relocation_npr:50000, salary_unchanged:true, grade_unchanged:true, consent:true,
    status:'completed', letter_generated:true, letter_sent:true, notified:true,
    timeline_hit:true, impact_links:['Employee Timeline','Org Chart','Payroll Setup'] },
  { id:'t2', employee:'Ramesh KC', emp_id:'EMP-0054', position:'Accountant', dept_from:'Finance & Accounts', dept_to:'Finance & Accounts',
    branch_from:'KTM HQ', branch_to:'KTM HQ', manager_from:'Sanjay Karki', manager_to:'Sanjay Karki',
    hod_to:'Sanjay Karki', effective_date:'2025-07-15', reason:'restructuring',
    relocation_npr:0, salary_unchanged:true, grade_unchanged:true, consent:true,
    status:'pending', letter_generated:false, letter_sent:false, notified:false,
    timeline_hit:false, impact_links:['Employee Timeline'] },
]

const LETTER_TEMPLATE = (t) => `TRANSFER ORDER

Ref No: TO-${new Date().getFullYear()}-${String(Math.floor(Math.random()*999)+100).padStart(3,'0')}
Date: ${new Date().toLocaleDateString('en-NP')}

TO: ${t.employee} (${t.emp_id})
     ${t.position}

SUBJECT: Transfer Order — Effective ${t.effective_date}

Dear ${t.employee.split(' ')[0]},

This is to inform you that pursuant to company requirements, you are hereby transferred from:

FROM: ${t.dept_from}, ${t.branch_from}
       Reporting to: ${t.manager_from}

TO:   ${t.dept_to}, ${t.branch_to}
       Reporting to: ${t.manager_to}

Effective Date: ${t.effective_date}
Reason: ${REASON_LABELS[t.reason] || t.reason}

Your salary, grade level, and benefits remain unchanged per Nepal Labour Act 2074. This transfer does not constitute a demotion or reduction in service conditions.
${t.relocation_npr > 0 ? `\nRelocation Allowance: NPR ${t.relocation_npr.toLocaleString()} will be credited to your salary account.` : ''}

Please acknowledge receipt and report to your new assignment on the effective date.

For [Company Name],

_________________________          _________________________
HR Manager                          HOD — ${t.dept_to}
(Priya Adhikari)                   (${t.hod_to})`

export default function TransferHistoryPage() {
  const [transfers, setTransfers] = useState(TRANSFERS_INIT)
  const [search, setSearch]   = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showLetter, setShowLetter] = useState(null)
  const [showExcel, setShowExcel]   = useState(false)
  const [ctx, setCtx]         = useState(null)
  const [wizStep, setWizStep] = useState(1)
  const [msg, setMsg]         = useState('')
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({
    employee:'',emp_id:'EMP-NEW',position:'',
    dept_from:'',dept_to:'',branch_from:'KTM HQ',branch_to:'KTM HQ',
    manager_from:'',manager_to:'',hod_to:'',effective_date:'',reason:'business_need',
    relocation_npr:'0',rationale:'',salary_unchanged:true,grade_unchanged:true,consent:false,
  })
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3500) }

  const filtered = transfers.filter(t=>!search||t.employee.toLowerCase().includes(search.toLowerCase()))

  const generateLetter = async (transfer) => {
    setGenerating(true)
    setTimeout(()=>{
      setTransfers(prev=>prev.map(t=>t.id===transfer.id?{...t,letter_generated:true}:t))
      setShowLetter(transfer)
      setGenerating(false)
      notify('✅ AI Transfer Letter generated for '+transfer.employee)
    },1500)

  const sendNotifications = (transfer) => {
    setTransfers(prev=>prev.map(t=>t.id===transfer.id?{...t,letter_sent:true,notified:true,timeline_hit:true}:t))
    notify(`📧 Transfer letter sent to ${transfer.employee} + ${transfer.manager_to} + ${transfer.hod_to} via Email, WhatsApp & Viber. Employee Timeline updated.`)

  const completeTransfer = (id) => {
    setTransfers(prev=>prev.map(t=>t.id===id?{...t,status:'completed'}:t))
    notify('✅ Transfer completed and recorded in Employee Timeline.')

  const submitTransfer = () => {
    if (!form.employee||!form.effective_date||!form.dept_to) {
      notify('⚠️ Employee, effective date and new department required'); return
    const newT = {
      id:'t'+Date.now(),...form,
      relocation_npr:parseInt(form.relocation_npr)||0,
      status:'pending',letter_generated:false,letter_sent:false,notified:false,timeline_hit:false,
      impact_links:['Employee Timeline','Org Chart','Payroll Setup']
    setTransfers(prev=>[newT,...prev])
    setShowWizard(false); setWizStep(1)
    setForm({employee:'',emp_id:'EMP-NEW',position:'',dept_from:'',dept_to:'',branch_from:'KTM HQ',
      branch_to:'KTM HQ',manager_from:'',manager_to:'',hod_to:'',effective_date:'',reason:'business_need',
      relocation_npr:'0',rationale:'',salary_unchanged:true,grade_unchanged:true,consent:false})
    notify('✅ Transfer initiated for '+form.employee+' — AI letter generation available.')

  const inter = transfers.filter(t=>t.branch_from!==t.branch_to).length

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="🔄" title="Transfer & History"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Movement"
        gradient={G}
        stats={[
          {icon:'🔄',label:'Total Transfers', value:transfers.length},
          {icon:'🌍',label:'Inter-Branch',    value:inter},
          {icon:'✅',label:'Completed',        value:transfers.filter(t=>t.status==='completed').length},
          {icon:'💰',label:'Allowances',       value:'NPR '+(transfers.reduce((s,t)=>s+t.relocation_npr,0)/1000).toFixed(0)+'K'},
        ]}
        onAdd={()=>{setShowWizard(true);setWizStep(1)}} addLabel="+ New Transfer"
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#155e75',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖️</span>
        <div><strong>Nepal Labour Act 2074:</strong> Transfers cannot move an employee to an inferior position or cause salary reduction. AI auto-generates transfer letter and notifies all parties via Email, WhatsApp, Viber. All transfers hit Employee Timeline.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(t=>{
          const sc = STATUS_CFG[t.status]||STATUS_CFG.pending
          const isInter = t.branch_from!==t.branch_to
          return (
            <div key={t.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.employee,...t}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{t.employee}</span>
                    <span style={{fontSize:10,color:'#94a3b8'}}>{t.emp_id}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {isInter&&<span style={{background:'#ecfeff',color:'#0891b2',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>🌍 Inter-Branch</span>}
                    {t.timeline_hit&&<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>📊 Timeline Updated</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{t.position} · Effective {t.effective_date} · {REASON_LABELS[t.reason]||t.reason}</div>
                </div>
              </div>

              <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:14,borderBottom:'1px solid #f8fafc'}}>
                <div style={{flex:1,background:'#f8fafc',borderRadius:10,padding:'10px 12px'}}>
                  <div style={{fontSize:9,color:'#94a3b8',marginBottom:2}}>FROM</div>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{t.dept_from}</div>
                  <div style={{fontSize:9,color:'#64748b'}}>{t.branch_from} · {t.manager_from}</div>
                </div>
                <span style={{fontSize:20,color:A}}>→</span>
                <div style={{flex:1,background:'#ecfeff',borderRadius:10,padding:'10px 12px'}}>
                  <div style={{fontSize:9,color:A,marginBottom:2}}>TO</div>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{t.dept_to}</div>
                  <div style={{fontSize:9,color:'#64748b'}}>{t.branch_to} · {t.manager_to}</div>
                </div>
              </div>

              <div style={{padding:'10px 20px',display:'flex',gap:12,flexWrap:'wrap',borderBottom:'1px solid #f8fafc',fontSize:10}}>
                {[
                  [t.salary_unchanged,'✓ Salary Unchanged','⚠ Salary Changed'],
                  [t.grade_unchanged,'✓ Same Grade','⚠ Grade Changed'],
                  [t.consent,'✓ Consent Given','⏳ Consent Pending'],
                  [t.letter_generated,'✅ Letter Ready','📝 Letter Pending'],
                  [t.notified,'📧 All Notified','📬 Notify Pending'],
                ].map(([cond,yes,no],i)=>(
                  <span key={i} style={{fontWeight:700,color:cond?'#10b981':'#f59e0b'}}>{cond?yes:no}</span>
                ))}
              </div>

              {t.rationale&&<div style={{padding:'8px 20px',fontSize:10,color:'#64748b',fontStyle:'italic'}}>{t.rationale}</div>}

              <div style={{padding:'10px 16px',display:'flex',gap:6,justifyContent:'flex-end',flexWrap:'wrap',borderTop:'1px solid #f8fafc'}}>
                {!t.letter_generated&&(
                  <button onClick={()=>generateLetter(t)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#7c3aed,#4338ca)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    {generating?'⏳ Generating...':'🤖 Generate AI Letter'}
                  </button>
                )}
                {t.letter_generated&&<button onClick={()=>setShowLetter(t)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>👁 View Letter</button>}
                {t.letter_generated&&!t.notified&&(
                  <button onClick={()=>sendNotifications(t)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    📧 Send to All (Email+WhatsApp+Viber)
                  </button>
                )}
                {t.status==='pending'&&t.notified&&(
                  <button onClick={()=>completeTransfer(t.id)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✅ Mark Complete</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Transfer Letter Preview Modal */}
      {showLetter&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowLetter(null)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:600,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:13,fontWeight:900}}>🤖 AI-Generated Transfer Letter — {showLetter.employee}</div>
              <button onClick={()=>setShowLetter(null)} style={{background:'rgba(255,255,255,.2)',border:'none',color:'#fff',borderRadius:8,padding:'4px 10px',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:'20px 24px'}}>
              <pre style={{fontSize:11,color:'#1e293b',lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'Georgia,serif',background:'#fafaf9',borderRadius:10,padding:'20px 24px',border:'1px solid #e7e5e4',margin:0}}>
                {LETTER_TEMPLATE(showLetter)}
              </pre>
              <div style={{display:'flex',gap:10,marginTop:16}}>
                <button onClick={()=>{sendNotifications(showLetter);setShowLetter(null)}} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>📧 Send to All Parties</button>
                <button onClick={()=>notify('📥 PDF downloaded')} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>📥 Download PDF</button>
                <button onClick={()=>setShowLetter(null)} style={{padding:'10px 14px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Wizard */}
      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:700,maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px',borderRadius:'20px 20px 0 0'}}>
              <div style={{fontSize:17,fontWeight:900,color:'#fff'}}>Transfer Wizard — Step {wizStep}/3</div>
              <div style={{display:'flex',gap:4,marginTop:10}}>{[1,2,3].map(s=><div key={s} style={{flex:1,height:4,borderRadius:4,background:s<=wizStep?'rgba(255,255,255,.9)':'rgba(255,255,255,.3)'}}/>)}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:4}}>{['Employee & Assignment','Logistics & Consent','AI Letter & Confirm'][wizStep-1]}</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              {wizStep===1&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  {[['Employee Name *','employee','text'],['Employee ID','emp_id','text'],
                    ['Current Position','position','text'],['Current Department','dept_from','text'],
                    ['Current Branch','branch_from','text'],['Current Manager','manager_from','text'],
                  ].map(([l,f,t])=>(
                    <div key={f}>
                      <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                      <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                        style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                    </div>
                  ))}
                </div>
              )}
              {wizStep===2&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  {[['New Department *','dept_to','text'],['New Branch','branch_to','text'],
                    ['New Manager','manager_to','text'],['HOD (New Department)','hod_to','text'],
                    ['Effective Date *','effective_date','date'],['Relocation Allowance (NPR)','relocation_npr','number'],
                  ].map(([l,f,t])=>(
                    <div key={f}>
                      <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                      <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                        style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                    </div>
                  ))}
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Transfer Reason</label>
                    <select value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                      {Object.entries(REASON_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Rationale / Notes</label>
                    <textarea value={form.rationale} onChange={e=>setForm(p=>({...p,rationale:e.target.value}))} rows={3}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
                  </div>
                  <div style={{gridColumn:'1/-1',display:'flex',gap:20}}>
                    {[['salary_unchanged','✅ Salary remains unchanged (LA2074 Compliant)'],
                      ['grade_unchanged','✅ Grade level remains unchanged'],
                      ['consent','✅ Employee has acknowledged and consented'],
                    ].map(([f,l])=>(
                      <label key={f} style={{display:'flex',gap:8,alignItems:'center',cursor:'pointer',fontSize:11,color:'#374151'}}>
                        <input type="checkbox" checked={form[f]} onChange={()=>setForm(p=>({...p,[f]:!p[f]}))} style={{accentColor:A}}/>
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {wizStep===3&&(
                <div>
                  <div style={{background:'linear-gradient(135deg,#f5f3ff,#ede9fe)',border:'1px solid #c4b5fd',borderRadius:12,padding:'14px 16px',marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:800,color:'#3730a3',marginBottom:8}}>🤖 AI Actions on Confirmation</div>
                    {['AI generates official transfer letter in Nepal government format','Sends to: Employee → Direct Manager → HOD → HR simultaneously via Email + WhatsApp + Viber',
                      'Updates Employee Timeline with transfer event',
                      'Triggers payroll cost center update for new department/branch',
                      'LA2074: Verifies no demotion / salary reduction before proceeding'].map((l,i)=>(
                      <div key={i} style={{display:'flex',gap:8,padding:'5px 0',fontSize:10,color:'#4c1d95'}}>
                        <span style={{flexShrink:0}}>✅</span><span>{l}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'#f8fafc',borderRadius:12,padding:'14px',fontSize:10,color:'#374151'}}>
                    <strong>Summary:</strong> {form.employee||'Employee'} → {form.dept_to||'New Dept'}, {form.branch_to}, Effective {form.effective_date||'TBD'}
                  </div>
                </div>
              )}
              <div style={{display:'flex',gap:10,marginTop:16}}>
                {wizStep>1&&<button onClick={()=>setWizStep(s=>s-1)} style={{padding:'12px 20px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:12,cursor:'pointer'}}>Back</button>}
                <button onClick={()=>wizStep<3?setWizStep(s=>s+1):submitTransfer()}
                  style={{flex:1,padding:12,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  {wizStep<3?'Continue →':'✅ Confirm Transfer & Generate AI Letter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'🤖',label:'Generate Letter',key:'letter'},
        {icon:'📧',label:'Send Notifications',key:'notify'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Transfer History" columns={['Employee','Emp ID','From Dept','To Dept','From Branch','To Branch','Effective Date','Reason','Relocation Allowance','Status','Letter Sent','Timeline Hit']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
    </div>
  )

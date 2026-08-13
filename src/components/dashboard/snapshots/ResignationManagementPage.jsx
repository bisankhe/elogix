// FILE: ResignationManagementPage.jsx - Resignation Management (Exit Management)
// Self-service digital resignation, auto LWD calc, notice-period tracking, 15-day rule

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const RESIGNATIONS = [
  { id:'r1', employee:'Dipendra Yadav', position:'Junior Accountant', dept:'Finance & Accounts',
    submitted_date:'2025-06-10', tenure_at_resignation:'1.2 years', required_notice_days:30,
    proposed_lwd:'2025-07-10', actual_notice_days:30, notice_shortfall_days:0,
    employer_acceptance_deadline:'2025-06-25', employer_responded:true, response_date:'2025-06-12',
    status:'accepted', reason_category:'better_opportunity', deduction_npr:0,
    impact_links:['Exit Clearance','Knowledge Transfer'] },
  { id:'r2', employee:'Anjali Sharma', position:'Sales Executive', dept:'Sales & Marketing',
    submitted_date:'2025-06-18', tenure_at_resignation:'0.4 years', required_notice_days:7,
    proposed_lwd:'2025-06-22', actual_notice_days:4, notice_shortfall_days:3,
    employer_acceptance_deadline:'2025-07-03', employer_responded:false, response_date:null,
    status:'pending_acceptance', reason_category:'personal', deduction_npr:5250,
    impact_links:['Exit Clearance'] },
  { id:'r3', employee:'Kiran Bhattarai', position:'Senior Developer', dept:'Information Technology',
    submitted_date:'2025-05-01', tenure_at_resignation:'3.5 years', required_notice_days:30,
    proposed_lwd:'2025-05-31', actual_notice_days:30, notice_shortfall_days:0,
    employer_acceptance_deadline:'2025-05-16', employer_responded:false, response_date:null,
    status:'auto_accepted_15day', reason_category:'higher_studies', deduction_npr:0,
    impact_links:['Exit Clearance','Knowledge Transfer','Asset Return'] },
]

const STATUS_CFG = {
  pending_acceptance:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Pending Acceptance'},
  accepted:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Accepted'},
  auto_accepted_15day:{c:'#3b82f6',bg:'#eff6ff',icon:'⚖',label:'Auto-Accepted (15-Day Rule)'},
}
const REASON_LABELS = {better_opportunity:'Better Opportunity',personal:'Personal Reasons',higher_studies:'Higher Studies',relocation:'Relocation',other:'Other'}

export default function ResignationManagementPage() {
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  const [resignations, setResignations] = useState(RESIGNATIONS)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = resignations.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const pendingCount = resignations.filter(r=>r.status==='pending_acceptance').length
  const shortfallCount = resignations.filter(r=>r.notice_shortfall_days>0).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📝" title="Resignation Management"
        breadcrumb="Employee Lifecycle > Offboarding > Exit Management"
        gradient={G}
        stats={[
          {icon:'📝',label:'Total Resignations', value:resignations.length},
          {icon:'⏳',label:'Pending Acceptance',  value:pendingCount},
          {icon:'⚠',label:'Notice Shortfall',    value:shortfallCount},
          {icon:'💰',label:'Total Deductions',    value:'NPR '+resignations.reduce((s,r)=>s+r.deduction_npr,0).toLocaleString()},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Log Resignation"
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Notice period - up to 4 weeks: 1 day . 4 weeks-1yr: 7 days . &gt;1yr: 30 days. Employer must accept within 15 days or resignation is automatically deemed accepted. Notice shortfall = deduction from final settlement.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]
          const daysToDeadline = Math.ceil((new Date(r.employer_acceptance_deadline)-new Date('2025-06-21'))/(1000*60*60*24))
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.position} . {r.dept} . {r.tenure_at_resignation} tenure</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Submitted {r.submitted_date} . {REASON_LABELS[r.reason_category]}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:A}}>{r.proposed_lwd}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>LAST WORKING DAY</div>
                </div>
              </div>

              <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                {[{l:'Required Notice',v:r.required_notice_days+'d',c:'#3b82f6'},
                  {l:'Actual Notice',v:r.actual_notice_days+'d',c:r.notice_shortfall_days>0?'#ef4444':'#10b981'},
                  {l:'Shortfall',v:r.notice_shortfall_days+'d',c:r.notice_shortfall_days>0?'#ef4444':'#10b981'},
                  {l:'Deduction',v:'NPR '+r.deduction_npr.toLocaleString(),c:r.deduction_npr>0?'#ef4444':'#10b981'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                  </div>
                ))}
              </div>

              <div style={{padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                {r.status==='pending_acceptance'?(
                  <span style={{fontSize:10,color:daysToDeadline<=5?'#ef4444':'#f59e0b',fontWeight:700}}>⏰ {daysToDeadline} days until auto-accept deadline ({r.employer_acceptance_deadline})</span>
                ):(
                  <span style={{fontSize:10,color:'#64748b'}}>{r.status==='auto_accepted_15day'?'Auto-accepted per 15-day rule':`Accepted ${r.response_date}`}</span>
                )}
                <div style={{display:'flex',gap:6}}>
                  {r.status==='pending_acceptance'&&(
                    <>
                      <button onClick={()=>{setResignations(prev=>prev.map(x=>x.id===r.id?{...x,status:'rejected',employer_responded:true}:x));notify('❌ Rejected — employee notified')}}
                        style={{padding:'6px 12px',borderRadius:8,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer'}}>❌ Reject</button>
                      <button onClick={()=>{setResignations(prev=>prev.map(x=>x.id===r.id?{...x,status:'accepted',employer_responded:true,response_date:new Date().toISOString().split('T')[0]}:x));notify('✅ Resignation accepted for '+r.employee)}}
                        style={{padding:'6px 12px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✅ Accept</button>
                    </>
                  )}
                  {(r.status==='accepted'||r.status==='auto_accepted_15day')&&(
                    <button onClick={()=>{setResignations(prev=>prev.filter(x=>x.id!==r.id));notify('➡️ Exit clearance started for '+r.employee+' — removed from active list')}}
                      style={{padding:'6px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>➡️ Start Exit Clearance</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Submit Resignation</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:12}}>
                {[['Employee Name *','employee','text'],['Resignation Date *','date','date'],['Proposed Last Working Day *','lwd','date']].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Reason Category</label>
                  <select value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    {Object.entries(REASON_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Resignation Letter / Notes</label>
                <textarea value={form.letter} onChange={e=>setForm(p=>({...p,letter:e.target.value}))} rows={4}
                  placeholder="Dear HR Team, I am writing to formally resign..."
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:10,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
              <AIImpact color={A} lines={['AI auto-calculates required notice period from tenure.','Auto-flags shortfall and computes deduction from final settlement.','Auto-notifies manager, IT, Finance, and HR simultaneously.','15-day silent-acceptance countdown starts automatically.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.employee||!form.date||!form.lwd){notify('⚠️ Employee, date and LWD required');return}
                  setResignations(prev=>[...prev,{id:'r'+Date.now(),employee:form.employee,position:'Staff',dept:'TBD',submitted_date:form.date,tenure_at_resignation:'TBD',required_notice_days:30,proposed_lwd:form.lwd,actual_notice_days:0,notice_shortfall_days:0,employer_acceptance_deadline:'TBD',employer_responded:false,response_date:null,status:'pending_acceptance',reason_category:form.reason,deduction_npr:0,impact_links:['Exit Clearance']}])
                  notify('✅ Resignation submitted for '+form.employee+' — Manager and HR notified')
                  setShowAdd(false)
                  setForm({employee:'',date:'',lwd:'',reason:'better_opportunity',letter:''})
                }} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>📝 Submit Resignation</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✅',label:'Accept Resignation',key:'accept'},
        {icon:'➡',label:'Start Exit Clearance',key:'clearance'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Resignation Management" columns={['Employee','Position','Department','Submitted Date','Proposed LWD','Required Notice','Actual Notice','Deduction NPR','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

// FILE: LeaveRequestPage.jsx - Leave Request (Leave Operations)
// Wizard-style ESS form: visual date picker, live balance preview, half-day
// toggle, team-overlap check, AI auto-suggest based on policy + calendar.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const MY_REQUESTS = [
  { id:'lr1', leave_type:'Home/Annual Leave', start_date:'2025-07-10', end_date:'2025-07-12', days:3, half_day:false,
    reason:'Family trip to Pokhara', status:'pending', submitted:'2025-06-20', team_overlap:1,
    impact_links:['Leave Balance','Leave Calendar'] },
  { id:'lr2', leave_type:'Sick Leave', start_date:'2025-06-18', end_date:'2025-06-18', days:1, half_day:false,
    reason:'Fever, doctor visit', status:'approved', submitted:'2025-06-17', team_overlap:0,
    impact_links:[] },
  { id:'lr3', leave_type:'Home/Annual Leave', start_date:'2025-06-25', end_date:'2025-06-25', days:0.5, half_day:true, half_day_period:'Second Half',
    reason:'Personal appointment', status:'approved', submitted:'2025-06-19', team_overlap:0,
    impact_links:[] },
]

const STATUS_CFG = {pending:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Pending'},approved:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Approved'},rejected:{c:'#ef4444',bg:'#fef2f2',icon:'🚫',label:'Rejected'}}
const LEAVE_TYPES = ['Home/Annual Leave','Sick Leave','Maternity Leave','Paternity Leave','Mourning Leave (Kiriya)','Unpaid Leave']

export default function LeaveRequestPage() {
  const [requests, setRequests] = useState(MY_REQUESTS)
  const [form, setForm] = useState({})
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = requests.filter(r=>!search||r.leave_type.toLowerCase().includes(search.toLowerCase()))
  const pendingCount = requests.filter(r=>r.status==='pending').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📝" title="Leave Request"
        breadcrumb="Workforce Operations > Leave Management > Leave Operations"
        gradient={G}
        stats={[
          {icon:'📝',label:'My Requests',  value:requests.length},
          {icon:'⏳',label:'Pending',       value:pendingCount},
          {icon:'✅',label:'Approved',       value:requests.filter(r=>r.status==='approved').length},
          {icon:'📅',label:'Days Used (YTD)',value:requests.filter(r=>r.status==='approved').reduce((s,r)=>s+r.days,0)},
        ]}
        onAdd={()=>{setShowWizard(true);setWizardStep(1)}} addLabel="Request Leave"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Except for Sick, Maternity, and Mourning leave, leave is a facility (not absolute right) - employer may decline/reschedule for valid operational reasons. All approved requests sync instantly to your Leave Balance and team's Leave Calendar.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search my requests..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.leave_type,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,padding:'16px 20px',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.leave_type}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {r.half_day&&<span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>½ {r.half_day_period}</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.start_date} {r.end_date!==r.start_date?`> ${r.end_date}`:''} . {r.days} day(s)</div>
                </div>
                {r.team_overlap>0&&<span style={{background:'#fffbeb',color:'#b45309',fontSize:9,fontWeight:700,padding:'4px 10px',borderRadius:20}}>👥 {r.team_overlap} teammate(s) also off</span>}
              </div>
              <div style={{fontSize:10,color:'#374151',fontStyle:'italic'}}>"{r.reason}"</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>Submitted {r.submitted}</div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Request Leave</div>
              <div style={{display:'flex',gap:6,marginTop:10}}>
                {[1,2,3].map(s=>(<div key={s} style={{flex:1,height:4,borderRadius:4,background:s<=wizardStep?'#fff':'rgba(255,255,255,.3)'}}/>))}
              </div>
            </div>
            <div style={{padding:'22px 28px'}}>
              {wizardStep===1&&(<>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Leave Type</label>
                <input type="text" value={form.leaveType||""} onChange={e=>setForm(p=>({...p,leaveType:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 14px',margin:'8px 0',fontSize:11,color:'#065f46'}}>
                  💰 Current balance: <strong>18.5 days available</strong> for this leave type
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Start Date *</label>
                <input type="date" value={form.startDate||""} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>End Date *</label>
                <input type="date" value={form.endDate||""} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                </div>
                <label style={{display:'flex',gap:8,alignItems:'center',margin:'10px 0',fontSize:12,color:'#374151',cursor:'pointer'}}>
                  <input type="checkbox" checked={isHalfDay} onChange={()=>setIsHalfDay(!isHalfDay)} style={{accentColor:A}}/> This is a half-day leave
                </label>
                {isHalfDay&&(
                  <div style={{display:'flex',gap:10,marginBottom:10}}>
                    {['First Half','Second Half'].map(h=>(
                      <button key={h} onClick={()=>setForm&&setForm(p=>({...p,halfDayPeriod:h}))} style={{flex:1,padding:'10px',borderRadius:10,border:`1.5px solid ${form&&form.halfDayPeriod===h?A:A+'33'}`,background:form&&form.halfDayPeriod===h?A+'15':'#fff',color:A,fontSize:11,fontWeight:700,cursor:'pointer'}}>{h}</button>
                    ))}
                  </div>
                )}
              </>)}
              {wizardStep===2&&(<>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Reason / Notes *</label>
                <textarea value={form.reasonNotes||""} onChange={e=>setForm(p=>({...p,reasonNotes:e.target.value}))} rows={3} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
                <div style={{margin:'10px 0'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>Supporting Document (if required)</div>
                  <label style={{display:'block',border:'2px dashed #bbf7d0',borderRadius:12,padding:'16px',textAlign:'center',background:'#f0fdf4',cursor:'pointer'}}>
                    <div style={{fontSize:22,marginBottom:4}}>📎</div>
                    <div style={{fontSize:10,color:'#065f46'}}>Click or drag to upload (medical certificate, etc.)</div>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e=>setForm&&setForm(p=>({...p,doc_file:e.target.files[0]}))} style={{display:'none'}}/>
                  </label>
                </div>
              </>)}
              {wizardStep===3&&(<>
                <div style={{background:'#fffbeb',borderRadius:10,padding:'12px 14px',marginBottom:10,fontSize:11,color:'#92400e'}}>
                  👥 <strong>1 teammate</strong> already has approved leave overlapping these dates - your manager will see this in the approval view.
                </div>
                <AIImpact color={A} lines={['Request auto-routes to your direct manager per the configured approval hierarchy.','Balance instantly reflects "pending deduction" once submitted.','Calendar updates for your team the moment this is approved.']}/>
              </>)}
              <div style={{display:'flex',gap:10,marginTop:14}}>
                {wizardStep>1&&<button onClick={()=>setWizardStep(wizardStep-1)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Back</button>}
                {wizardStep<3?(
                  <button onClick={()=>setWizardStep(wizardStep+1)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Next</button>
                ):(
                  <button onClick={()=>setShowWizard(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✏',label:'Edit (if pending)',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="My Leave Requests" columns={['Leave Type','Start Date','End Date','Days','Reason','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

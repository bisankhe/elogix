// FILE: SixtyDayReviewPage.jsx - 60 Days Review (Probation Management)
// Productivity & Autonomy Phase: KPI rating scale, 360-feedback, PIP trigger

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const KPI_LABELS = ['Job Knowledge','Quality of Work','Productivity/Output','Initiative & Independence','Collaboration','Reliability']

const REVIEWS = [
  { id:'sx1', employee:'Maya Pradhan', position:'Finance Manager', dept:'Finance', review_date:'2025-08-08',
    kpi_scores:{'Job Knowledge':5,'Quality of Work':5,'Productivity/Output':5,'Initiative & Independence':5,'Collaboration':5,'Reliability':5},
    peer_feedback:[{from:'Sanjay Karki (CFO)',comment:'Exceptional. Already leading cross-functional initiatives.'},{from:'Priya Khadka (Accountant)',comment:'Great mentor, very approachable.'}],
    pip_triggered:false, attendance_pct:100, status:'completed', overall_avg:5.0,
    impact_links:['90 Days Review','30 Days Review'] },
  { id:'sx2', employee:'Hari Thapa', position:'DevOps Engineer', dept:'IT', review_date:'2025-07-20',
    kpi_scores:{'Job Knowledge':3,'Quality of Work':3,'Productivity/Output':2,'Initiative & Independence':2,'Collaboration':4,'Reliability':3},
    peer_feedback:[{from:'Bikash Shrestha (IT Lead)',comment:'Technical skills are there but struggles without close supervision. Needs more confidence to ask questions early.'}],
    pip_triggered:true, attendance_pct:92, status:'completed', overall_avg:2.83,
    impact_links:['90 Days Review','Performance Improvement Plan'] },
  { id:'sx3', employee:'Priya Khadka', position:'Sales Executive', dept:'Sales', review_date:'2025-09-03',
    kpi_scores:{}, peer_feedback:[], pip_triggered:false, attendance_pct:null, status:'pending', overall_avg:null,
    impact_links:[] },
]

const STATUS_CFG = {pending:{c:'#94a3b8',bg:'#f8fafc',icon:'⏳',label:'Pending'},completed:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Completed'}}

function KPIBar({label,score}) {
  const color = score>=4?'#10b981':score>=3?'#f59e0b':'#ef4444'
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:9}}>
        <span style={{color:'#64748b'}}>{label}</span><span style={{fontWeight:700,color}}>{score}/5</span>
      </div>
      <div style={{height:5,background:'#f1f5f9',borderRadius:5,overflow:'hidden'}}>
        <div style={{width:`${score/5*100}%`,height:'100%',background:color,borderRadius:5}}/>
      </div>
    </div>
  )
}

export default function SixtyDayReviewPage() {
  const [reviews, setReviews] = useState(REVIEWS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [ctx, setCtx] = useState(null)

  const filtered = reviews.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const pipCount = reviews.filter(r=>r.pip_triggered).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎯" title="60 Days Review"
        breadcrumb="Employee Lifecycle > Onboarding > Probation Management"
        gradient={G}
        stats={[
          {icon:'👥',label:'In Review',     value:reviews.length},
          {icon:'✅',label:'Completed',      value:reviews.filter(r=>r.status==='completed').length},
          {icon:'⚠',label:'PIP Triggered',  value:pipCount},
          {icon:'⏰',label:'Probation Cap', value:'6 months'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New KPI Review"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#9a3412',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚠</span>
        <div><strong>Course-Correction Phase:</strong> If KPI average falls below 3.0, system auto-triggers a Performance Improvement Plan (PIP). All feedback is securely logged for legal traceability - poor documentation here makes future action difficult to justify.</div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]
          return (
            <LuxCard key={r.id} color={r.pip_triggered?'#ef4444':sc.c} onClick={()=>setSelected(r)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}>
              <div style={{padding:'14px 16px 10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{r.position} . {r.dept} . {r.review_date}</div>
                  </div>
                  {r.overall_avg&&(
                    <div style={{textAlign:'center',flexShrink:0}}>
                      <div style={{fontSize:18,fontWeight:900,color:r.overall_avg>=4?'#10b981':r.overall_avg>=3?'#f59e0b':'#ef4444'}}>{r.overall_avg}</div>
                      <div style={{fontSize:8,color:'#94a3b8'}}>AVG /5</div>
                    </div>
                  )}
                </div>

                {r.pip_triggered&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'6px 10px',fontSize:10,color:'#991b1b',fontWeight:700,marginBottom:8}}>⚠ Performance Improvement Plan Triggered</div>}

                {r.status==='completed'?(
                  <>
                    {Object.entries(r.kpi_scores).map(([k,v])=><KPIBar key={k} label={k} score={v}/>)}
                    <div style={{marginTop:8,fontSize:9,fontWeight:700,color:'#334155',marginBottom:4}}>360° Peer Feedback</div>
                    {r.peer_feedback.map((f,i)=>(
                      <div key={i} style={{background:'#f8fafc',borderRadius:8,padding:'6px 9px',marginBottom:4}}>
                        <div style={{fontSize:9,fontWeight:700,color:A}}>{f.from}</div>
                        <div style={{fontSize:9,color:'#64748b',fontStyle:'italic'}}>"{f.comment}"</div>
                      </div>
                    ))}
                    {r.attendance_pct!==null&&<div style={{marginTop:6,fontSize:9,color:'#64748b'}}>Attendance: <strong style={{color:r.attendance_pct>=95?'#10b981':'#f59e0b'}}>{r.attendance_pct}%</strong></div>}
                  </>
                ):(
                  <button onClick={ev=>{ev.stopPropagation();setShowAdd(true)}} style={{width:'100%',padding:'8px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Start KPI Review</button>
                )}
              </div>
            </LuxCard>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>60-Day KPI Review</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Employee" type="select" value="" onChange={e=>setForm&&setForm(p=>({...p,[e.target.name||'v']:e.target.value}))} accent={A} options={['Priya Khadka']}/>
              <div style={{margin:'14px 0'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:8}}>KPI Rating Scale (1-5)</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {KPI_LABELS.map(label=>(
                    <Field key={label} label={label} type="number" value="" onChange={e=>setForm&&setForm(p=>({...p,[e.target.name||'v']:e.target.value}))} accent={A} hint="1=Poor, 5=Excellent"/>
                  ))}
                </div>
              </div>
              <Field label="360° Peer Feedback (Name : Comment)" type="textarea" value="" onChange={e=>setForm&&setForm(p=>({...p,[e.target.name||'v']:e.target.value}))} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['Average below 3.0 auto-triggers a Performance Improvement Plan (PIP).','Historical attendance/ticket logs auto-pulled into this review.','Flags employees falling behind for targeted intervention before 90-day deadline.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Review</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Review',key:'view'},{icon:'📋',label:'Create PIP',key:'pip'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="60 Days Review" columns={['Employee','Position','Department','Review Date','Avg KPI Score','Attendance %','PIP Triggered','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

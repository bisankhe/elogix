// FILE: PIPPage.jsx - Performance Improvement Plan (Performance & Talent > Goal & Performance > Performance Evaluation)
// Collaborative coaching framework (not punitive): structured milestones,
// 30-90 day timeline, training links, mandatory 7-day explanation right.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const PIPS = [
  { id:'p1', employee:'Bikash Rai', dept:'IT', start_date:'2025-06-15', duration_days:60, end_date:'2025-08-14',
    reason:'Sprint commitments missed 2 consecutive quarters; communication gaps with stakeholders.',
    appraisal_history:['Q1: Below Standard','Q2: Below Standard'],
    milestones:[
      {goal:'Complete 90% of sprint commitments for 4 consecutive sprints',progress_pct:50,target_date:'2025-07-15'},
      {goal:'Weekly stakeholder update sent every Friday without exception',progress_pct:75,target_date:'2025-08-14'},
    ],
    linked_training:'Agile Project Management - LMS Course #4521',
    checkin_frequency:'Weekly with direct manager',
    explanation_period_status:'completed', explanation_note:'Employee submitted written explanation citing unstaffed dependencies; HR reviewed and proceeded with coaching PIP rather than termination.',
    status:'active', impact_links:['Performance Appraisal','Workload Analysis','Training Records'] },
]

const STATUS_CFG = {active:{c:'#f59e0b',bg:'#fffbeb',label:'Active - In Progress'},completed_success:{c:'#10b981',bg:'#f0fdf4',label:'Completed - Improved'},completed_unsuccessful:{c:'#ef4444',bg:'#fef2f2',label:'Unsuccessful'}}

export default function PIPPage() {
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = PIPS.filter(p=>!search||p.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📈" title="Performance Improvement Plan (PIP)"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Evaluation"
        gradient={G}
        stats={[
          {icon:'📈',label:'Active PIPs',     value:PIPS.filter(p=>p.status==='active').length},
          {icon:'📅',label:'Standard Duration', value:'30-90 days'},
          {icon:'⚖',label:'3-Strike Rule',     value:'Applies'},
          {icon:'📝',label:'7-Day Right',       value:'Enforced'},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Initiate PIP"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🤝</span>
        <div style={{flex:1,minWidth:200}}><strong>Coaching, Not Punishment:</strong> A PIP is a structured development tool, not a pre-termination formality. Per Nepal Labour Act 2074, an employee must be given 7 days to submit a written explanation before any disciplinary escalation. Termination is only legally permitted after 3 consecutive unsatisfactory formal appraisals.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(p=>{
          const sc = STATUS_CFG[p.status]
          return (
            <div key={p.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.employee,...p}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{p.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{p.dept} . {p.start_date} {'>'} {p.end_date} ({p.duration_days} days)</div>
                </div>
              </div>

              <div style={{padding:'10px 18px',fontSize:10,color:'#374151',borderBottom:'1px solid #f8fafc'}}>{p.reason}</div>

              <div style={{padding:'10px 18px',display:'flex',gap:6,flexWrap:'wrap',borderBottom:'1px solid #f8fafc'}}>
                {p.appraisal_history.map((h,i)=>(<span key={i} style={{background:'#fef2f2',color:'#dc2626',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{h}</span>))}
              </div>

              <div style={{padding:'12px 18px'}}>
                <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',marginBottom:8}}>MILESTONES</div>
                {p.milestones.map((m,i)=>(
                  <div key={i} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:4}}>
                      <span style={{color:'#374151',fontWeight:600}}>{m.goal}</span><span style={{fontWeight:700,color:A}}>{m.progress_pct}%</span>
                    </div>
                    <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${m.progress_pct}%`,height:'100%',background:m.progress_pct>=70?'#10b981':'#f59e0b',borderRadius:7}}/></div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Target: {m.target_date}</div>
                  </div>
                ))}
              </div>

              <div style={{padding:'10px 18px',display:'flex',gap:14,fontSize:9,color:'#64748b',borderTop:'1px solid #f8fafc',flexWrap:'wrap'}}>
                <span>📚 {p.linked_training}</span>
                <span>📅 {p.checkin_frequency}</span>
              </div>

              <div style={{padding:'10px 18px',background:'#f0fdf4',fontSize:10,color:'#065f46'}}>
                <strong>✅ 7-Day Explanation Right:</strong> {p.explanation_note}
              </div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(620px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Initiate Performance Improvement Plan</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{background:'#fffbeb',borderRadius:10,padding:'10px 14px',marginBottom:10,fontSize:11,color:'#92400e'}}>
                ⚖ <strong>Before proceeding:</strong> confirm this employee has been given the 7-day written explanation opportunity. A PIP should follow prior coaching steps, not replace them.
              </div>
              <Field label="Employee" type="select" value="" onChange={()=>{}} accent={A} options={['Bikash Rai']}/>
              <Field label="Duration" type="select" value="" onChange={()=>{}} accent={A} options={['30 days','60 days','90 days']}/>
              <Field label="Reason / Underperformance Areas" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Cite specific, measurable evidence - not vague impressions"/>
              <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',margin:'8px 0',fontSize:10,color:'#374151'}}>
                <strong>Milestones (specific & measurable):</strong>
                <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:6}}>
                  <input placeholder="Milestone 1" style={{padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:10}}/>
                  <input placeholder="Milestone 2" style={{padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:10}}/>
                </div>
              </div>
              <Field label="Linked Training Course" type="select" value="" onChange={()=>{}} accent={A} options={['Agile Project Management','Communication Skills Workshop','Time Management']}/>
              <Field label="Check-In Frequency" type="select" value="" onChange={()=>{}} accent={A} options={['Weekly','Bi-Weekly']}/>
              <AIImpact color={A} lines={['Suggests realistic milestones based on the specific behaviors cited in the underlying appraisal.','Auto-schedules check-in reminders at the configured frequency.','Notification sent to the employee, their manager, and HR once the PIP is published.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Publish PIP</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'💬',label:'Log Check-In',key:'checkin'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

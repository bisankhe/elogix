// FILE: ThirtyDayReviewPage.jsx - 30 Days Review (Probation Management)
// Assimilation & Expectation Phase: check-in survey, manager-set goals, 1:1 planner

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const REVIEWS = [
  { id:'thr1', employee:'Maya Pradhan', position:'Finance Manager', dept:'Finance', join_date:'2025-06-09', review_date:'2025-07-09',
    goals:[
      {goal:'Complete vendor reconciliation process training',met:true},
      {goal:'Lead first month-end close independently',met:true},
      {goal:'Build relationship with cross-dept stakeholders',met:true},
    ],
    survey:{role_clarity:5,team_integration:5,manager_support:5,tools_access:5,overall_satisfaction:5},
    manager_note:'Outstanding integration. Already leading initiatives independently. No concerns.',
    employee_feedback:'Great team, clear expectations, excellent support from CFO and team.',
    status:'completed', red_flags:0,
    impact_links:['60 Days Review','7 Days Review'] },
  { id:'thr2', employee:'Hari Thapa', position:'DevOps Engineer', dept:'IT', join_date:'2025-05-20', review_date:'2025-06-20',
    goals:[
      {goal:'Set up CI/CD pipeline for 2 services',met:true},
      {goal:'Pass infrastructure security training',met:false},
      {goal:'Pair with senior engineer 3x/week',met:true},
    ],
    survey:{role_clarity:3,team_integration:4,manager_support:4,tools_access:2,overall_satisfaction:3},
    manager_note:'Solid technical progress but tool access delays hampered productivity. Security training overdue - schedule immediately.',
    employee_feedback:'Still waiting on VPN access for production systems. Otherwise team has been welcoming.',
    status:'completed', red_flags:1,
    impact_links:['60 Days Review','Account Creation'] },
  { id:'thr3', employee:'Priya Khadka', position:'Sales Executive', dept:'Sales', join_date:'2025-07-05', review_date:'2025-08-04',
    goals:[], survey:{}, manager_note:'', employee_feedback:'',
    status:'pending', red_flags:0,
    impact_links:[] },
]

const STATUS_CFG = {pending:{c:'#94a3b8',bg:'#f8fafc',icon:'⏳',label:'Pending'},completed:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Completed'}}

export default function ThirtyDayReviewPage() {
  const [reviews, setReviews] = useState(REVIEWS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [ctx, setCtx] = useState(null)

  const filtered = reviews.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const completedCount = reviews.filter(r=>r.status==='completed').length
  const redFlagCount = reviews.reduce((s,r)=>s+r.red_flags,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="30 Days Review"
        breadcrumb="Employee Lifecycle > Onboarding > Probation Management"
        gradient={G}
        stats={[
          {icon:'👥',label:'In Review',     value:reviews.length},
          {icon:'✅',label:'Completed',      value:completedCount},
          {icon:'🚩',label:'Red Flags',     value:redFlagCount},
          {icon:'⏰',label:'Probation Cap', value:'6 months'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Check-in"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#f5f3ff,#faf5ff)',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>💡</span>
        <div><strong>No-Surprise Rule:</strong> Document every concern here - nothing should appear as a surprise at the 90-day mark. Address knowledge gaps immediately rather than waiting. This is the time to clarify ambiguous instructions or implement an improvement plan.</div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]
          const avgSurvey = r.status==='completed'?(Object.values(r.survey).reduce((s,v)=>s+v,0)/Object.values(r.survey).length).toFixed(1):null
          const goalsMet = r.goals.filter(g=>g.met).length
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${r.red_flags>0?'#fecaca':sc.c+'33'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${r.red_flags>0?'#ef4444':sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {r.red_flags>0&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>🚩 {r.red_flags} Red Flag</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.position} . {r.dept} . Review {r.review_date}</div>
                </div>
                {avgSurvey&&(
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:avgSurvey>=4?'#10b981':avgSurvey>=3?'#f59e0b':'#ef4444'}}>{avgSurvey}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>SURVEY AVG /5</div>
                  </div>
                )}
              </div>

              {r.status==='completed' && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:0}}>
                  <div style={{padding:'12px 18px',borderRight:'1px solid #f8fafc'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#334155',marginBottom:6}}>30-Day Goals ({goalsMet}/{r.goals.length} met)</div>
                    {r.goals.map((g,i)=>(
                      <div key={i} style={{display:'flex',gap:6,padding:'3px 0',fontSize:10}}>
                        <span style={{color:g.met?'#10b981':'#ef4444',fontWeight:700}}>{g.met?'✓':'✗'}</span>
                        <span style={{color:g.met?'#374151':'#94a3b8'}}>{g.goal}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{padding:'12px 18px',borderRight:'1px solid #f8fafc'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#334155',marginBottom:6}}>Check-in Survey</div>
                    {Object.entries(r.survey).map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:9,padding:'2px 0'}}>
                        <span style={{color:'#64748b',textTransform:'capitalize'}}>{k.replace('_',' ')}</span>
                        <span style={{fontWeight:700,color:v>=4?'#10b981':v>=3?'#f59e0b':'#ef4444'}}>{v}/5</span>
                      </div>
                    ))}
                  </div>
                  <div style={{padding:'12px 18px'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#334155',marginBottom:4}}>Manager Note</div>
                    <div style={{fontSize:9,color:'#64748b',lineHeight:1.5,marginBottom:8}}>{r.manager_note}</div>
                    <div style={{fontSize:10,fontWeight:700,color:'#334155',marginBottom:4}}>Employee Feedback</div>
                    <div style={{fontSize:9,color:'#64748b',lineHeight:1.5,fontStyle:'italic'}}>"{r.employee_feedback}"</div>
                  </div>
                </div>
              )}
              {r.status==='pending'&&(
                <div style={{padding:'12px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:10,color:'#94a3b8'}}>Check-in not yet conducted.</span>
                  <button onClick={()=>setShowAdd(true)} style={{padding:'6px 16px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Start Check-in</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:700,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>30-Day Check-in Form</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Employee" type="select" value="" onChange={e=>setForm&&setForm(p=>({...p,[e.target.name||'v']:e.target.value}))} accent={A} options={['Priya Khadka']}/>
              <div style={{margin:'14px 0'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:8}}>30-Day Goals Set on Day 1 - Were they met?</div>
                {[1,2,3].map(i=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'3fr auto',gap:10,marginBottom:6,alignItems:'center'}}>
                    <Field label={`Goal ${i}`} value="" onChange={e=>setForm&&setForm(p=>({...p,[e.target.name||'v']:e.target.value}))} accent={A}/>
                    <select style={{padding:'9px',borderRadius:9,border:'1.5px solid #e2e8f0'}}><option>Met</option><option>Not Met</option></select>
                  </div>
                ))}
              </div>
              <div style={{margin:'14px 0'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:8}}>Check-in Survey (1-5 scale)</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {['Role Clarity','Team Integration','Manager Support','Tools Access','Overall Satisfaction'].map(label=>(
                    <Field key={label} label={label} type="number" value="" onChange={e=>setForm&&setForm(p=>({...p,[e.target.name||'v']:e.target.value}))} accent={A} hint="1-5"/>
                  ))}
                </div>
              </div>
              <Field label="Manager Note" type="textarea" value="" onChange={e=>setForm&&setForm(p=>({...p,[e.target.name||'v']:e.target.value}))} accent={A} hint="Voice input supported"/>
              <Field label="Employee Feedback" type="textarea" value="" onChange={e=>setForm&&setForm(p=>({...p,[e.target.name||'v']:e.target.value}))} accent={A} hint="Two-way dialogue"/>
              <AIImpact color={A} lines={['AI flags low survey scores (<3) as red flags for 60-day review.','Manager notified 7 days before review due date.','All feedback securely logged for legal traceability.','No-surprise rule: concerns here must carry forward, never first-appear at 90 days.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Check-in</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Review',key:'view'},{icon:'📅',label:'Start Check-in',key:'checkin'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="30 Days Review" columns={['Employee','Position','Department','Review Date','Goals Met','Survey Avg','Red Flags','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

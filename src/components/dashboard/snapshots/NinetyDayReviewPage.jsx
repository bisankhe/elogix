// FILE: NinetyDayReviewPage.jsx - 90 Days Review (Probation Management)
// Integration & Role Mastery Phase: competency assessment, consolidated history, decision prep

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const REVIEWS = [
  { id:'nt1', employee:'Maya Pradhan', position:'Finance Manager', dept:'Finance', review_date:'2025-09-07',
    history:{day7:100,day30:5.0,day60:5.0}, competency_score:96,
    competencies:[{name:'Role Mastery',score:5},{name:'Independent Execution',score:5},{name:'Team Leadership',score:5},{name:'Goal Achievement',score:5}],
    ai_recommendation:'CONFIRM', ai_note:'Exceptional trajectory across all 3 prior checkpoints. Zero red flags. Strong recommend for early confirmation.',
    status:'completed', decision_pending:true,
    impact_links:['Confirmation or Termination'] },
  { id:'nt2', employee:'Hari Thapa', position:'DevOps Engineer', dept:'IT', review_date:'2025-08-18',
    history:{day7:100,day30:3.4,day60:2.83}, competency_score:58,
    competencies:[{name:'Role Mastery',score:3},{name:'Independent Execution',score:2},{name:'Team Leadership',score:3},{name:'Goal Achievement',score:2}],
    ai_recommendation:'EXTEND', ai_note:'Declining trend from 30 to 60-day checkpoints. PIP was triggered but technical foundation is solid. Recommend 1-3 month extension with targeted support, not termination.',
    status:'completed', decision_pending:true,
    impact_links:['Confirmation or Termination','Performance Improvement Plan'] },
  { id:'nt3', employee:'Priya Khadka', position:'Sales Executive', dept:'Sales', review_date:'2025-10-03',
    history:{day7:0,day30:null,day60:null}, competency_score:null,
    competencies:[], ai_recommendation:null, ai_note:'90-day review not yet due.',
    status:'pending', decision_pending:false,
    impact_links:[] },
]

const REC_CFG = {
  CONFIRM:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'AI Recommends: Confirm'},
  EXTEND:{c:'#f59e0b',bg:'#fffbeb',icon:'⏸',label:'AI Recommends: Extend'},
  TERMINATE:{c:'#ef4444',bg:'#fef2f2',icon:'🚫',label:'AI Recommends: Terminate'},

export default function NinetyDayReviewPage() {
  const [reviews, setReviews] = useState(REVIEWS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [ctx, setCtx] = useState(null)

  const filtered = reviews.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const pendingDecisions = reviews.filter(r=>r.decision_pending).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏆" title="90 Days Review"
        breadcrumb="Employee Lifecycle > Onboarding > Probation Management"
        gradient={G}
        stats={[
          {icon:'👥',label:'In Review',          value:reviews.length},
          {icon:'✅',label:'Completed',           value:reviews.filter(r=>r.status==='completed').length},
          {icon:'⚠',label:'Decisions Pending',   value:pendingDecisions},
          {icon:'⏰',label:'Probation Cap',       value:'6 months'},
        ]}
        onAdd={()=>notify('📋 90 Days review created')} addLabel="+ New Review" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#991b1b',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Critical Legal Deadline - Nepal LA2074 Section 13:</strong> Probation maxes at 6 months. If a decision is not made and the employee continues working past 6 months, confirmation happens automatically by operation of law. Manager procrastination here has legal consequences - act before the deadline.</div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>{
          const rec = r.ai_recommendation ? REC_CFG[r.ai_recommendation] : null
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${rec?rec.c+'33':'#e2e8f0'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${rec?rec.c:'#94a3b8'}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                    {rec&&<span style={{background:rec.bg,color:rec.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{rec.icon} {rec.label}</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.position} . {r.dept} . Review {r.review_date}</div>
                </div>
                {r.competency_score&&(
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:24,fontWeight:900,color:r.competency_score>=80?'#10b981':r.competency_score>=60?'#f59e0b':'#ef4444'}}>{r.competency_score}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>COMPETENCY SCORE</div>
                  </div>
                )}
              </div>

              {r.status==='completed' && (
                <>
                  <div style={{padding:'12px 20px',borderBottom:'1px solid #f8fafc'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#334155',marginBottom:8}}>Trajectory: 7-Day {'>'} 30-Day {'>'} 60-Day {'>'} Now</div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      {[r.history.day7+'%',r.history.day30,r.history.day60].map((v,i)=>(
                        <div key={i} style={{flex:1,textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'6px'}}>
                          <div style={{fontSize:12,fontWeight:800,color:A}}>{v}</div>
                          <div style={{fontSize:8,color:'#94a3b8'}}>{['7-Day %','30-Day Avg','60-Day Avg'][i]}</div>
                        </div>
                      ))}
                      <div style={{fontSize:16,color:'#94a3b8'}}>{'>'}</div>
                      <div style={{flex:1,textAlign:'center',background:rec?.bg||'#f8fafc',borderRadius:8,padding:'6px'}}>
                        <div style={{fontSize:12,fontWeight:800,color:rec?.c||A}}>{r.competency_score}</div>
                        <div style={{fontSize:8,color:'#94a3b8'}}>90-Day Score</div>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                    {r.competencies.map((c,i)=>(
                      <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                        <div style={{fontSize:14,fontWeight:900,color:c.score>=4?'#10b981':c.score>=3?'#f59e0b':'#ef4444'}}>{c.score}/5</div>
                        <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{c.name}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{padding:'12px 20px',fontSize:10,color:'#64748b',fontStyle:'italic'}}>🤖 {r.ai_note}</div>
                  {r.decision_pending&&(
                    <div style={{padding:'12px 20px',background:'#fffbeb',borderTop:'1px solid #fde68a',display:'flex',gap:8}}>
                      <button style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#10b981',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>✅ Confirm Employment</button>
                      <button style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#f59e0b',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>⏸ Extend Probation</button>
                      <button style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#ef4444',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>🚫 Terminate</button>
                    </div>
                  )}
                </>
              )}
              {r.status==='pending'&&<div style={{padding:'12px 20px',fontSize:10,color:'#94a3b8'}}>{r.ai_note}</div>}
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Assessment',key:'view'},{icon:'➡',label:'Proceed to Decision',key:'decision'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="90 Days Review" columns={['Employee','Position','Department','Review Date','Competency Score','AI Recommendation','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

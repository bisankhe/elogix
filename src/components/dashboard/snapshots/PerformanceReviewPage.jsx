// FILE: PerformanceReviewPage.jsx - Performance Review (Performance & Talent > Goal & Performance > Performance Evaluation)
// Collaborative development discussion - consolidates the whole-cycle
// record (Appraisal + Continuous Feedback + Behaviour Eval) to prevent
// recency bias; separated from compensation discussion.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const REVIEWS = [
  { id:'rv1', employee:'Gita Maharjan', cycle:'Annual FY 2082/83', meeting_date:'2025-06-25',
    full_cycle_evidence:{appraisal_rating:4,continuous_feedback_count:12,behaviour_avg:8.6},
    career_development_topics:['Senior Engineer readiness','Cloud architecture certification'],
    status:'completed', impact_links:['Performance Appraisal','Training Records'] },
  { id:'rv2', employee:'Bikash Rai', cycle:'Annual FY 2082/83', meeting_date:'2025-06-28',
    full_cycle_evidence:{appraisal_rating:2,continuous_feedback_count:8,behaviour_avg:6.4},
    discussion_notes:null,
    career_development_topics:[],
    status:'scheduled', impact_links:['PIP Management'] },
]

const STATUS_CFG = {scheduled:{c:'#f59e0b',bg:'#fffbeb',label:'Scheduled'},completed:{c:'#10b981',bg:'#f0fdf4',label:'Completed'}}

export default function PerformanceReviewPage() {
  const [search, setSearch] = useState('')
  const [showNotesFor, setShowNotesFor] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = REVIEWS.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗣" title="Performance Review"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Evaluation"
        gradient={G}
        stats={[
          {icon:'🗣',label:'Reviews This Cycle', value:REVIEWS.length},
          {icon:'✅',label:'Completed',           value:REVIEWS.filter(r=>r.status==='completed').length},
          {icon:'⏳',label:'Scheduled',           value:REVIEWS.filter(r=>r.status==='scheduled').length},
          {icon:'🚫',label:'Comp Discussion',     value:'Separated'},
        ]}
        onAdd={()=>{}} addLabel="Schedule Review"/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📚</span>
        <div style={{flex:1,minWidth:200}}><strong>Whole-Cycle Evidence, Not Recency:</strong> Pulls every Continuous Feedback entry and Behaviour Evaluation from the full period - preventing managers from over-weighting the last 2-4 weeks. Compensation is discussed separately to keep this conversation honest and development-focused.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{r.cycle} . Meeting: {r.meeting_date}</div>
                </div>
              </div>
              <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[{l:'Appraisal Rating',v:r.full_cycle_evidence.appraisal_rating+'/5',c:'#7c3aed'},
                  {l:'Feedback Entries',v:r.full_cycle_evidence.continuous_feedback_count,c:'#0284c7'},
                  {l:'Behaviour Avg',v:r.full_cycle_evidence.behaviour_avg+'/10',c:'#c2410c'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
              {r.discussion_notes&&<div style={{padding:'10px 18px',fontSize:10,color:'#374151'}}><strong>Notes:</strong> {r.discussion_notes}</div>}
              {r.career_development_topics.length>0&&(
                <div style={{padding:'8px 18px',display:'flex',gap:6,flexWrap:'wrap'}}>
                  {r.career_development_topics.map((t,i)=>(<span key={i} style={{background:'#eef2ff',color:'#4338ca',fontSize:9,fontWeight:600,padding:'2px 9px',borderRadius:20}}>📈 {t}</span>))}
                </div>
              )}
              <div style={{padding:'10px 18px'}}>
                <button onClick={()=>setShowNotesFor(r)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>{r.status==='completed'?'View Full Notes':'Log Discussion Notes'}</button>
              </div>
            </div>
          )
        })}
      </div>

      {showNotesFor&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNotesFor(null)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(540px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Discussion Notes - {showNotesFor.employee}</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Discussion Notes" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <Field label="Career Development Topics (comma-separated)" value="" onChange={()=>{}} accent={A}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowNotesFor(null)} style={{flex:1,padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save & Mark Completed</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Cycle Evidence',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

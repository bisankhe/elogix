// FILE: TrainingRecommendationPage.jsx - Training Recommendation (Performance & Talent > Goal & Performance)
// AI maps skill gaps (from Behaviour Evaluation, PIP, 360 results) to
// targeted learning modules; tracks statutory annual training quota.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const RECOMMENDATIONS = [
  { id:'tr1', employee:'Hari Thapa', gap_source:'Behaviour Evaluation', gap_identified:'Communication scored 5/10 - missed stakeholder updates',
    recommended_course:'Effective Stakeholder Communication', provider:'Internal LMS', enrolled:false, progress_pct:0,
    impact_links:['Behaviour Evaluation'] },
  { id:'tr2', employee:'Bikash Rai', gap_source:'PIP Milestone', gap_identified:'Sprint commitment reliability',
    recommended_course:'Agile Project Management', provider:'Internal LMS', enrolled:true, progress_pct:45,
    impact_links:['PIP Management'] },
  { id:'tr3', employee:'Anjali Sharma', gap_source:'360 Degree Feedback', gap_identified:'Strategic Thinking - perception gap vs peers',
    recommended_course:'Strategic Planning for Managers', provider:'External - Coursera', enrolled:true, progress_pct:80,
    impact_links:['360 Degree Feedback','Individual Development Plan'] },
]

const STATUTORY_TRAINING = { employees_trained_ytd:142, total_employees:298, statutory_min_pct:30, current_pct:48 }

export default function TrainingRecommendationPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = RECOMMENDATIONS.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const enrolledCount = RECOMMENDATIONS.filter(r=>r.enrolled).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎓" title="Training Recommendation"
        breadcrumb="Performance & Talent Management > Goal & Performance"
        gradient={G}
        stats={[
          {icon:'🎓',label:'AI Recommendations', value:RECOMMENDATIONS.length},
          {icon:'✅',label:'Enrolled',             value:enrolledCount},
          {icon:'📊',label:'Statutory Training',   value:STATUTORY_TRAINING.current_pct+'%'},
          {icon:'⚖',label:'Min Required',          value:STATUTORY_TRAINING.statutory_min_pct+'%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Targeted, Not Generic:</strong> AI maps specific gaps from Behaviour Evaluations, PIP milestones, and 360 Feedback to exact courses - never a one-size-fits-all annual seminar. Nepal Labour Act Section 40 requires a minimum percentage of employees receive training annually; currently {STATUTORY_TRAINING.current_pct}% vs the {STATUTORY_TRAINING.statutory_min_pct}% statutory floor.</div>
      </div>

      {/* Statutory training tracker */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 18px',marginBottom:18}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:11}}>
          <span style={{fontWeight:700,color:'#0f172a'}}>📊 Statutory Training Coverage (YTD)</span>
          <span style={{fontWeight:700,color:'#10b981'}}>{STATUTORY_TRAINING.employees_trained_ytd}/{STATUTORY_TRAINING.total_employees} employees</span>
        </div>
        <div style={{height:10,background:'#f1f5f9',borderRadius:10,overflow:'hidden',position:'relative'}}>
          <div style={{width:`${STATUTORY_TRAINING.current_pct}%`,height:'100%',background:'#10b981',borderRadius:10}}/>
          <div style={{position:'absolute',left:`${STATUTORY_TRAINING.statutory_min_pct}%`,top:0,bottom:0,width:2,background:'#ef4444'}}/>
        </div>
        <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>Red line = statutory minimum ({STATUTORY_TRAINING.statutory_min_pct}%)</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>(
          <div key={r.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${A}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                  <span style={{background:`${A}15`,color:A,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>Source: {r.gap_source}</span>
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{r.gap_identified}</div>
              </div>
            </div>
            <div style={{padding:'12px 18px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>📚 {r.recommended_course}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginBottom:8}}>{r.provider}</div>
              {r.enrolled?(<>
                <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${r.progress_pct}%`,height:'100%',background:A,borderRadius:7}}/></div>
                <div style={{fontSize:8,color:'#94a3b8',marginTop:3}}>{r.progress_pct}% complete</div>
              </>):(
                <button style={{padding:'6px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Enroll Now</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'📚',label:'Enroll',key:'enroll'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

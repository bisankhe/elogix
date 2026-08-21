// FILE: DEITrainingPage.jsx - DEI Training
// (Employee Experience & Culture > Diversity, Equity & Inclusion)
// Adaptive-LMS style catalog: micro-learning courses (Unconscious Bias,
// Allyship), compliance tracking, pre/post cultural-intelligence score
// lift. Tags into the EXISTING lms_courses -- never a parallel catalog.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const COURSES = [
  { id:'c1', title:'Unconscious Bias in Hiring', duration:'25 min', completion_pct:78, mandatory:true, pre_score:5.2, post_score:7.4, impact_links:['Course Management'] },
  { id:'c2', title:'Allyship in Practice', duration:'18 min', completion_pct:54, mandatory:false, pre_score:6.0, post_score:7.8 },
  { id:'c3', title:'Inclusive Leadership for Managers', duration:'40 min', completion_pct:42, mandatory:true, pre_score:4.8, post_score:null,
    flag_note:'Below 50% completion with a mandatory compliance deadline in 12 days.' },
]

export default function DEITrainingPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = COURSES.filter(c=>!search||c.title.toLowerCase().includes(search.toLowerCase()))
  const avgLift = COURSES.filter(c=>c.post_score).reduce((s,c)=>s+(c.post_score-c.pre_score),0)/COURSES.filter(c=>c.post_score).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎓" title="DEI Training"
        breadcrumb="Employee Experience & Culture > Diversity, Equity & Inclusion"
        gradient={G}
        stats={[
          {icon:'🎓',label:'Courses Available',  value:COURSES.length},
          {icon:'✅',label:'Avg Completion',         value:Math.round(COURSES.reduce((s,c)=>s+c.completion_pct,0)/COURSES.length)+'%'},
          {icon:'📈',label:'Avg CQ Score Lift',        value:'+'+avgLift.toFixed(1)},
          {icon:'⚠',label:'Behind on Mandatory',         value:COURSES.filter(c=>c.mandatory&&c.completion_pct<50).length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🧠</span>
        <div style={{flex:1,minWidth:200}}><strong>Behavior, Not Just Attendance:</strong> Every course tracks a pre/post cultural-intelligence score, not just a completion checkbox -- moving past the "performative training" trap toward measurable shift.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search courses..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(c=>(
          <div key={c.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.title,...c}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.title} {c.mandatory&&<span style={{fontSize:8,color:'#dc2626',fontWeight:700}}>MANDATORY</span>}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>⏱ {c.duration}</div>
              </div>
              <span style={{fontSize:13,fontWeight:900,color:A}}>{c.completion_pct}%</span>
            </div>
            <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden',marginTop:8}}><div style={{width:`${c.completion_pct}%`,height:'100%',background:A,borderRadius:7}}/></div>
            {c.post_score&&<div style={{marginTop:8,fontSize:9,color:'#15803d'}}>📈 CQ score: {c.pre_score} {'>'} {c.post_score} (+{(c.post_score-c.pre_score).toFixed(1)})</div>}
            {c.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {c.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Courses are tagged into the existing Course Management catalog -- no separate, disconnected DEI LMS.','AI recommends role-specific modules based on department-level cultural challenge signals, not one-size-fits-all assignment.','Mandatory courses behind schedule auto-escalate to the manager 14, 7, and 1 day before the compliance deadline.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Course Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

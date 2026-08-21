// FILE: MyGoalsKPIPage.jsx - My Goals & KPI
// (HR Services & Support > Employee Self Service)
// ESS-facing personal goal dashboard, pure UI over the EXISTING
// v_unified_goal_tracking (Goal Tracking session, already a UNION
// across KRA/KPI/OKR/Goal Assignment) -- never a second goal store.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const MY_GOALS = [
  { id:'g1', type:'OKR', title:'Improve API response time by 30%', progress_pct:68, target_date:'2025-09-30', cascade_from:'Engineering: Platform Reliability', impact_links:['OKR Management'] },
  { id:'g2', type:'KPI', title:'Code review turnaround under 4 hours', progress_pct:85, target_date:'2025-12-31', cascade_from:null },
  { id:'g3', type:'KRA', title:'Mentor 2 junior engineers this quarter', progress_pct:40, target_date:'2025-09-30', cascade_from:null,
    flag_note:'Behind pace -- 2 check-ins overdue with your manager.', impact_links:['Goal Tracking'] },
]

const TYPE_CFG = { OKR:'#7c3aed', KPI:'#0284c7', KRA:'#15803d' }

export default function MyGoalsKPIPage() {
  const [ctx, setCtx] = useState(null)
  const avgProgress = Math.round(MY_GOALS.reduce((s,g)=>s+g.progress_pct,0)/MY_GOALS.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎯" title="My Goals & KPI"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'🎯',label:'Active Goals',  value:MY_GOALS.length},
          {icon:'📊',label:'Avg Progress',     value:avgProgress+'%'},
          {icon:'⚠',label:'Behind Pace',         value:MY_GOALS.filter(g=>g.flag_note).length},
          {icon:'🔗',label:'Cascaded from Org',     value:MY_GOALS.filter(g=>g.cascade_from).length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>One Goal, One Place:</strong> Every OKR, KPI, and KRA assigned to you -- whether cascaded from a department objective or set individually -- shown together with live progress, not scattered across separate modules.</div>
      </div>

      <div style={{display:'grid',gap:16}}>
        {MY_GOALS.map(g=>(
          <div key={g.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:g.title,...g}})}}
            style={{background:'#fff',border:`1px solid ${g.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px',borderLeft:`4px solid ${TYPE_CFG[g.type]}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div>
                <span style={{background:`${TYPE_CFG[g.type]}15`,color:TYPE_CFG[g.type],fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{g.type}</span>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginTop:6}}>{g.title}</div>
                {g.cascade_from&&<div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>↳ Cascaded from: {g.cascade_from}</div>}
              </div>
              <span style={{fontSize:16,fontWeight:900,color:TYPE_CFG[g.type]}}>{g.progress_pct}%</span>
            </div>
            <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden',marginTop:10}}><div style={{width:`${g.progress_pct}%`,height:'100%',background:TYPE_CFG[g.type],borderRadius:8}}/></div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:8}}>Target: {g.target_date}</div>
            {g.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {g.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Progress updates here sync instantly with Goal Tracking -- never a second number to reconcile.','AI suggests a check-in with your manager when a goal stalls for 14+ days.','Cascade lineage shows exactly which company objective your work ladders up to.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'📝',label:'Log Progress Update',key:'update'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

// FILE: TrainingReportsStandardPage.jsx - Training Reports (Standard Reports)
// (Reports, Analytics & BI > Standard Reports)
// The simple, standard report card -- distinct from the EXISTING
// TrainingReportsLDPage (Learning & Development, the deep executive
// rollup over lms_enrollments/annual_training_budgets/skill_taxonomy).
// That page's own header comment anticipated this one: "distinct from
// the generic 'training-reports-page'." This is that generic version.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const DEPT_COMPLIANCE = [
  {dept:'IT',completion_pct:82},{dept:'Sales & Marketing',completion_pct:65},
  {dept:'Finance',completion_pct:94},{dept:'Operations',completion_pct:71},
]

const UPCOMING_MODULES = [
  {module:'OSH Refresher 2025',date:'2025-07-08',enrolled:34},
  {module:'Leadership Essentials -- Cohort 3',date:'2025-07-15',enrolled:12},
]

export default function TrainingReportsStandardPage() {
  const [ctx, setCtx] = useState(null)
  const avgCompletion = Math.round(DEPT_COMPLIANCE.reduce((s,d)=>s+d.completion_pct,0)/DEPT_COMPLIANCE.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎓" title="Training Reports"
        breadcrumb="Reports, Analytics & BI > Standard Reports"
        gradient={G}
        stats={[
          {icon:'🎓',label:'Completion Rate',  value:avgCompletion+'%'},
          {icon:'⏱',label:'Avg Hours / Employee', value:'14.2h'},
          {icon:'💰',label:'Budget Spent',           value:'NPR 920K'},
          {icon:'📋',label:'Upcoming Modules',           value:UPCOMING_MODULES.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>The Standard Report Card:</strong> For the full executive rollup with skill-gap heatmaps and ROI tracking, see Training Reports under Learning & Development -- this is the simpler, at-a-glance version.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Mandatory Compliance Training by Department</div>
        {DEPT_COMPLIANCE.map((d,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.dept,...d,impact_links:['Training Reports']}})}}
            style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
              <span style={{color:'#374151'}}>{d.dept}</span><span style={{fontWeight:700,color:A}}>{d.completion_pct}%</span>
            </div>
            <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${d.completion_pct}%`,height:'100%',background:A,borderRadius:8}}/></div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📅 Upcoming Modules</div>
        {UPCOMING_MODULES.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<UPCOMING_MODULES.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{m.module} . {m.date}</span>
            <span style={{fontSize:9,color:'#94a3b8'}}>{m.enrolled} enrolled</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Numbers sync directly with the existing Course Management enrollment data -- never a parallel training log.','Mandatory training behind schedule flags here the same way it does in the L&D module, no inconsistency between the two views.','Click any department to jump into the deeper skill-gap rollup.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

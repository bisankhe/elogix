// FILE: KPITransformationAfterPage.jsx - KPI Transformation Infographic: After
// (Performance & Talent > Goal & Performance > Performance Analytics > KPI)
// ROI-clarity visual: live, computed metrics from the actual system -
// contrasted directly against the Before page's legacy baseline.

import { useState } from 'react'
import { PageHeader, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const AFTER_METRICS = [
  {label:'Time Spent on Admin vs Strategy',before:'70% / 30%',after:'20% Admin / 80% Strategy',improvement:'+50pp to Strategy',icon:'🚀'},
  {label:'Recruitment Time-to-Fill',before:'45+ days',after:'22 days (live ATS tracking)',improvement:'-51%',icon:'⚡'},
  {label:'Compliance Tracking',before:'Manual, reactive',after:'Automated alerts, real-time health score',improvement:'Proactive',icon:'✅'},
  {label:'Data State',before:'Scattered spreadsheets',after:'Single source of truth, real-time sync',improvement:'Centralized',icon:'🗄'},
  {label:'Attendance & Productivity',before:'Untracked absenteeism',after:'Live Bradford Factor + burnout alerts',improvement:'Predictive',icon:'📈'},
  {label:'Documentation',before:'Paper trails',after:'Digital, e-signature linked, audit-logged',improvement:'100% Digital',icon:'📲'},
]

export default function KPITransformationAfterPage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⏭" title="KPI Transformation - After"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Analytics > KPI"
        gradient={G}
        stats={[
          {icon:'🚀',label:'Strategy Time',  value:'80%'},
          {icon:'⚡',label:'Time-to-Fill',     value:'22 days'},
          {icon:'✅',label:'Audit Method',     value:'Automated'},
          {icon:'📲',label:'Records',           value:'100% Digital'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎉</span>
        <div style={{flex:1,minWidth:200}}><strong>The Measurable ROI:</strong> Every figure here is computed live from the system - not aspirational marketing copy. Centralized data, proactive alerts, and automated workflows replace the legacy manual baseline shown on the "Before" page.</div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {AFTER_METRICS.map((m,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:m.label,impact_links:['KPI Transformation - Before']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
            <div style={{fontSize:28,flexShrink:0}}>{m.icon}</div>
            <div style={{flex:1,minWidth:160}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginBottom:6}}>{m.label}</div>
              <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                <span style={{fontSize:10,color:'#94a3b8',textDecoration:'line-through'}}>{m.before}</span>
                <span style={{color:'#10b981'}}>{'>'}</span>
                <span style={{fontSize:12,fontWeight:800,color:'#15803d'}}>{m.after}</span>
              </div>
            </div>
            <span style={{background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:800,padding:'5px 14px',borderRadius:20,flexShrink:0}}>{m.improvement}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:20,textAlign:'center'}}>
        <span style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:'10px 24px',fontSize:11,fontWeight:700,color:A}}>⏮ Review the legacy baseline {'>'} KPI Transformation - Before</span>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Compare to Before',key:'compare'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

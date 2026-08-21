// FILE: KPITransformationBeforePage.jsx - KPI Transformation Infographic: Before
// (Performance & Talent > Goal & Performance > Performance Analytics)
// Baseline-clarity visual: legacy manual-process pain points, validating
// why the transformation to eLogix HRMS was necessary.

import { useState } from 'react'
import { PageHeader, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#451a03 0%,#92400e 60%,#fbbf24 100%)'
const A = '#92400e'

const BEFORE_METRICS = [
  {label:'Time Spent on Admin vs Strategy',value:'70% Admin / 30% Strategy',icon:'📋',severity:'high'},
  {label:'Recruitment Time-to-Fill',value:'45+ days (manual Excel tracking)',icon:'🐌',severity:'high'},
  {label:'Compliance Tracking',value:'Manual audits, missed certification deadlines',icon:'⚠',severity:'high'},
  {label:'Data State',value:'Scattered spreadsheets, high duplication risk',icon:'🗂',severity:'medium'},
  {label:'Attendance & Productivity',value:'High absenteeism, lost workdays untracked',icon:'📉',severity:'medium'},
  {label:'Documentation',value:'Paper trails, frequent missing employee files',icon:'📄',severity:'high'},
]

export default function KPITransformationBeforePage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⏮" title="KPI Transformation - Before"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Analytics > KPI"
        gradient={G}
        stats={[
          {icon:'📋',label:'Admin Time',     value:'70%'},
          {icon:'🐌',label:'Time-to-Fill',     value:'45+ days'},
          {icon:'⚠',label:'Audit Method',     value:'Manual'},
          {icon:'📄',label:'Records',          value:'Paper-Based'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#78350f',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📊</span>
        <div style={{flex:1,minWidth:200}}><strong>The Legacy Baseline:</strong> This snapshot represents the pre-eLogix HRMS state - decentralized data, reactive reporting, and guesswork-driven decisions. Compare against the "After" page to see the measurable transformation.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14}}>
        {BEFORE_METRICS.map((m,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:m.label,impact_links:['KPI Transformation - After']}})}}
            style={{background:'#fff',border:`2px solid ${m.severity==='high'?'#fecaca':'#fed7aa'}`,borderRadius:16,padding:'18px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,right:0,width:60,height:60,background:m.severity==='high'?'#fef2f2':'#fff7ed',borderRadius:'0 0 0 60px'}}/>
            <div style={{fontSize:28,marginBottom:10}}>{m.icon}</div>
            <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:6}}>{m.label}</div>
            <div style={{fontSize:14,fontWeight:900,color:m.severity==='high'?'#dc2626':'#b45309'}}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:20,textAlign:'center'}}>
        <span style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:'10px 24px',fontSize:11,fontWeight:700,color:A}}>⏭ See the transformation {'>'} KPI Transformation - After</span>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Compare to After',key:'compare'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

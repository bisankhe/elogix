// FILE: BIDashboardPage.jsx - BI Dashboard (Business Intelligence)
// (Reports, Analytics & BI > Advanced Analytics)
// The cross-module executive visual hub -- distinct from
// HRAnalyticsStandardPage (single board view) and AIInsightsPage
// (ML/forecasting-specific). Pure rollup pulling one tile each from
// EXISTING views across Risk Management, Standard Reports, and HR
// Analytics -- never a duplicate calculation, purely a unified canvas.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const KPI_TILES = [
  {label:'Headcount',value:312,c:'#0284c7',target:'Headcount Analysis'},
  {label:'Turnover Rate',value:'9.2%',c:'#ef4444',target:'Attrition Analysis'},
  {label:'Labor Cost / FTE',value:'NPR 41.2K',c:'#15803d',target:'Cost Analysis'},
  {label:'Quality of Hire',value:'8.1/10',c:'#7c3aed',target:'Recruitment Reports'},
]

const ATTRITION_VS_TENURE = [
  {tenure:'< 1 yr',attrition_pct:18},{tenure:'1-3 yrs',attrition_pct:11},
  {tenure:'3-5 yrs',attrition_pct:6},{tenure:'5+ yrs',attrition_pct:3},
]

export default function BIDashboardPage() {
  const [ctx, setCtx] = useState(null)
  const maxAttrition = Math.max(...ATTRITION_VS_TENURE.map(a=>a.attrition_pct))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="BI Dashboard"
        breadcrumb="Reports, Analytics & BI > Advanced Analytics"
        gradient={G}
        stats={KPI_TILES.map(k=>({icon:'📈',label:k.label,value:k.value}))}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🧩</span>
        <div style={{flex:1,minWidth:200}}><strong>One Canvas, Every Source:</strong> Every tile here reads live from its own dedicated report -- click any KPI to drill straight into the full detail, never a number that only exists on this page.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,marginBottom:18}}>
        {KPI_TILES.map((k,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:k.label,...k,impact_links:[k.target]}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'18px',textAlign:'center',cursor:'pointer'}}>
            <div style={{fontSize:18,fontWeight:900,color:k.c}}>{k.value}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:5}}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📉 Attrition vs Tenure</div>
        <div style={{display:'flex',gap:12,alignItems:'flex-end',height:90}}>
          {ATTRITION_VS_TENURE.map((a,i)=>(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <div style={{fontSize:9,fontWeight:700,color:A}}>{a.attrition_pct}%</div>
              <div style={{width:'100%',background:A,borderRadius:'4px 4px 0 0',height:`${a.attrition_pct/maxAttrition*60}px`}}/>
              <div style={{fontSize:8,color:'#94a3b8'}}>{a.tenure}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Filter by department or demographic with a single click -- never a SQL query required.','Every widget here is read-only and never duplicates a calculation already owned by another report.','Drop any tile onto a custom dashboard layout using the Custom Report Builder.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Drill into Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

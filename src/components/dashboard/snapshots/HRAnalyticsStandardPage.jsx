// FILE: HRAnalyticsStandardPage.jsx - HR Analytics (Standard Reports)
// (Reports, Analytics & BI > Standard Reports)
// The executive 3-5 KPI rollup -- distinct from the EXISTING AI HR
// Analytics (sidebar 'ai-hr-analytics') and the deeper HR Analytics
// group (headcount/attrition/productivity/cost analysis pages). This
// is the minimalist, board-level summary; those are the drill-down detail.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const KPIS = [
  {label:'Total Headcount',value:312,delta:'+8 (1mo)',c:'#0284c7',target:'Workforce Summary'},
  {label:'Attrition Rate',value:'9.2%',delta:'-0.4pt',c:'#10b981',target:'Attrition Risk'},
  {label:'Diversity Index',value:'0.71',delta:'+0.02',c:'#7c3aed',target:'Diversity Dashboard'},
]

const PERF_VS_COMP = [
  {band:'Top Performers',avg_rating:4.6,avg_comp_pctile:62},
  {band:'Core Performers',avg_rating:3.4,avg_comp_pctile:48},
  {band:'Needs Improvement',avg_rating:2.1,avg_comp_pctile:51,flag:'Comp percentile not aligned with performance -- review recommended.'},
]

export default function HRAnalyticsStandardPage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="HR Analytics"
        breadcrumb="Reports, Analytics & BI > Standard Reports"
        gradient={G}
        stats={KPIS.map(k=>({icon:'📈',label:k.label,value:k.value}))}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>The Board-Level Summary, Not the Deep Dive:</strong> 3-5 strategic KPIs at a glance -- for granular drill-down (headcount trends, attrition cohorts, cost analysis), see the dedicated HR Analytics group in the sidebar.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:18}}>
        {KPIS.map((k,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:k.label,...k,impact_links:[k.target]}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',textAlign:'center',cursor:'pointer'}}>
            <div style={{fontSize:22,fontWeight:900,color:k.c}}>{k.value}</div>
            <div style={{fontSize:9,color:'#374151',marginTop:6,fontWeight:700}}>{k.label}</div>
            <div style={{fontSize:8,color:k.delta.startsWith('-')&&k.label!=='Attrition Rate'?'#ef4444':'#10b981',marginTop:4}}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📐 Performance vs. Compensation</div>
        {PERF_VS_COMP.map((p,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.band,...p,impact_links:['Compensation']}})}}
            style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<PERF_VS_COMP.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{p.band}</span>
            <span style={{fontSize:9,color:p.flag?'#b45309':'#94a3b8'}}>Rating {p.avg_rating} . Comp percentile {p.avg_comp_pctile}{p.flag&&' ⚠'}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Every KPI here pulls live from its own dedicated module -- never a separately maintained executive number.','Performance-compensation misalignment surfaces here before it becomes a pay-equity complaint.','Export this exact view as a board-ready PDF in one click.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Drill into Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

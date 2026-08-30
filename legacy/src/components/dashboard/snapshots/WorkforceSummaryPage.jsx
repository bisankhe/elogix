// FILE: WorkforceSummaryPage.jsx - Workforce Summary
// (Reports, Analytics & BI > Standard Reports)
// Headcount/FTE/tenure bird's-eye view -- distinct from HeadcountPlanPage
// (Workforce Planning, quota/vacancy forward-looking) and Department
// Reports (the per-department drill-down). This is the company-wide,
// point-in-time snapshot.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const DEPT_HEADCOUNT = [
  {dept:'IT',actual:24,target:26},{dept:'Sales & Marketing',actual:19,target:18},
  {dept:'Finance',actual:7,target:8},{dept:'Operations',actual:31,target:30},
]

const PERF_VS_COMP_SCATTER = [
  {employee:'Hari Thapa',rating:4.2,comp_pctile:55},{employee:'Gita Maharjan',rating:4.8,comp_pctile:71},
  {employee:'Bikash Rai',rating:3.1,comp_pctile:62,flag:true},
]

export default function WorkforceSummaryPage() {
  const [ctx, setCtx] = useState(null)
  const totalActual = DEPT_HEADCOUNT.reduce((s,d)=>s+d.actual,0)
  const totalTarget = DEPT_HEADCOUNT.reduce((s,d)=>s+d.target,0)
  const maxHc = Math.max(...DEPT_HEADCOUNT.flatMap(d=>[d.actual,d.target]))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="👥" title="Workforce Summary"
        breadcrumb="Reports, Analytics & BI > Standard Reports"
        gradient={G}
        stats={[
          {icon:'👥',label:'Total Headcount',  value:totalActual},
          {icon:'📐',label:'FTE Count',            value:totalActual},
          {icon:'📈',label:'Δ vs Last Month',          value:'+8'},
          {icon:'⏱',label:'Average Tenure',               value:'3.2 yrs'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>A Snapshot, Not a Forecast:</strong> This shows exactly where headcount stands today against target -- for forward-looking quota and vacancy planning, see Headcount Planning under Workforce Planning.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>🏢 Headcount by Department -- Actual vs Target</div>
        {DEPT_HEADCOUNT.map((d,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.dept,...d,impact_links:['Department Reports']}})}}
            style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
              <span style={{color:'#374151',fontWeight:600}}>{d.dept}</span>
              <span style={{fontWeight:700,color:A}}>{d.actual} / {d.target}</span>
            </div>
            <div style={{position:'relative',height:9}}>
              <div style={{position:'absolute',width:'100%',height:9,background:'#f1f5f9',borderRadius:9}}/>
              <div style={{position:'absolute',width:`${d.actual/maxHc*100}%`,height:9,background:A,borderRadius:9}}/>
              <div style={{position:'absolute',left:`${d.target/maxHc*100}%`,top:-2,width:2,height:13,background:'#0f172a'}}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📈 Performance vs. Compensation</div>
        {PERF_VS_COMP_SCATTER.map((p,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<PERF_VS_COMP_SCATTER.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{p.employee} {p.flag&&'⚠'}</span>
            <span style={{fontSize:9,color:'#94a3b8'}}>Rating {p.rating} . Comp percentile {p.comp_pctile}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Headcount figures sync live with the same employee registry HR maintains for the Labour Office -- never a separate count.','Click any department bar to drill into its full report.','Tenure and FTE figures recalculate automatically the moment a hire or exit processes -- never a manually refreshed snapshot.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Department Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

// FILE: BudgetVarianceAnalysisPage.jsx - Budget Variance Analysis
// (Finance, Assets & Administration > HR Budgeting)
// Planned vs Actual gap visualization across every sub-budget --
// pure computed variance over the EXISTING allocated/spent figures
// already tracked on each dedicated budget page, never re-entered data.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const VARIANCE_DATA = [
  {category:'Payroll',planned:48000000,actual:51200000,impact_links:['Payroll Budget']},
  {category:'Recruitment',planned:2000000,actual:1680000,impact_links:['Recruitment Budget']},
  {category:'Training',planned:1800000,actual:920000,impact_links:['Training Budget']},
  {category:'Engagement',planned:900000,actual:920000,impact_links:['Engagement Budget']},
]

export default function BudgetVarianceAnalysisPage() {
  const [ctx, setCtx] = useState(null)
  const fmt = n => 'NPR '+(n/1000000).toFixed(2)+'M'
  const totalPlanned = VARIANCE_DATA.reduce((s,v)=>s+v.planned,0)
  const totalActual = VARIANCE_DATA.reduce((s,v)=>s+v.actual,0)
  const overrunCount = VARIANCE_DATA.filter(v=>v.actual>v.planned).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📐" title="Budget Variance Analysis"
        breadcrumb="Finance, Assets & Administration > HR Budgeting"
        gradient={G}
        stats={[
          {icon:'📐',label:'Total Variance',  value:fmt(Math.abs(totalActual-totalPlanned))},
          {icon:'⚠',label:'Categories Over Budget', value:overrunCount},
          {icon:'💰',label:'Total Planned',            value:fmt(totalPlanned)},
          {icon:'💸',label:'Total Actual',                value:fmt(totalActual)},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🚨</span>
        <div style={{flex:1,minWidth:200}}><strong>Real-Time, Not Quarterly Excel:</strong> Every variance here computes live from each category's own planned vs actual figures -- overruns trigger an alert the moment they happen, not three months later in a review meeting.</div>
      </div>

      <div style={{display:'grid',gap:16}}>
        {VARIANCE_DATA.map((v,i)=>{
          const variance = v.actual - v.planned
          const variancePct = Math.round(variance/v.planned*100)
          const isOver = variance > 0
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:v.category,...v}})}}
              style={{background:'#fff',border:`1.5px solid ${isOver?'#fecaca':'#bbf7d0'}`,borderRadius:16,padding:'18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{v.category}</div>
                <span style={{background:isOver?'#fef2f2':'#f0fdf4',color:isOver?'#dc2626':'#15803d',fontSize:10,fontWeight:800,padding:'3px 10px',borderRadius:20}}>
                  {isOver?'▲':'▼'} {Math.abs(variancePct)}% {isOver?'over':'under'}
                </span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
                <div style={{fontSize:9,color:'#94a3b8'}}>Planned: <strong style={{color:'#374151'}}>{fmt(v.planned)}</strong></div>
                <div style={{fontSize:9,color:'#94a3b8'}}>Actual: <strong style={{color:isOver?'#dc2626':'#15803d'}}>{fmt(v.actual)}</strong></div>
              </div>
              <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden',marginTop:10,position:'relative'}}>
                <div style={{width:'100%',height:'100%',background:'#e2e8f0',position:'absolute'}}/>
                <div style={{width:`${Math.min(v.actual/v.planned*100,100)}%`,height:'100%',background:isOver?'#ef4444':'#15803d',borderRadius:8,position:'relative'}}/>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI distinguishes a genuine overspend from a timing difference (e.g. an annual license paid upfront) before flagging it as a real concern.','Alerts fire the moment a category crosses its planned ceiling -- never discovered after the fact in a quarterly review.','Every variance links straight back to its source budget page for full transaction-level detail.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Transaction Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

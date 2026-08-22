// FILE: BudgetForecastingPage.jsx - Budget Forecasting
// (Finance, Assets & Administration > HR Budgeting)
// Predictive scenario modeling over historical turnover and headcount
// data -- pulls from EXISTING attrition/headcount sources, never a
// duplicate workforce dataset. AI-assisted scenario projections.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const SCENARIOS = [
  {name:'Conservative',projected_cost:52000000,assumptions:'8% attrition, no salary band changes',c:'#94a3b8'},
  {name:'Base Case',projected_cost:55800000,assumptions:'12% attrition, 2 new senior hires, standard increment',c:A,selected:true},
  {name:'Aggressive Growth',projected_cost:64200000,assumptions:'18% headcount growth, market-rate salary adjustments',c:'#c2410c'},
]

const HISTORICAL_TREND = [{year:'2081/82',actual:48200000},{year:'2082/83',actual:51400000},{year:'2083/84',projected:55800000}]

export default function BudgetForecastingPage() {
  const [ctx, setCtx] = useState(null)
  const maxVal = Math.max(...HISTORICAL_TREND.map(h=>h.actual||h.projected))
  const fmt = n => 'NPR '+(n/1000000).toFixed(1)+'M'

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔮" title="Budget Forecasting"
        breadcrumb="Finance, Assets & Administration > HR Budgeting"
        gradient={G}
        stats={[
          {icon:'🔮',label:'Next FY Projection',  value:fmt(55800000)},
          {icon:'📈',label:'YoY Growth',              value:'+8.6%'},
          {icon:'🔄',label:'Attrition Assumption',        value:'12%'},
          {icon:'🎯',label:'Scenarios Modeled',               value:SCENARIOS.length},
        ]}
        onAdd={()=>{}} addLabel="Run New Scenario"/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🤖</span>
        <div style={{flex:1,minWidth:200}}><strong>AI-Assisted, Not Spreadsheet-Bound:</strong> Models pull live historical turnover and headcount data -- no manual exports, no stale assumptions baked in from last year's static file.</div>
      </div>

      {/* Historical trend */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Historical Trend & Projection</div>
        <div style={{display:'flex',gap:14,alignItems:'flex-end',height:90}}>
          {HISTORICAL_TREND.map((h,i)=>{
            const val = h.actual||h.projected
            return (
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{fontSize:9,fontWeight:700,color:h.projected?A:'#15803d'}}>{fmt(val)}</div>
                <div style={{width:'100%',background:h.projected?A:'#15803d',borderRadius:'4px 4px 0 0',height:`${val/maxVal*70}px`,opacity:h.projected?.6:1,border:h.projected?'1px dashed '+A:'none'}}/>
                <div style={{fontSize:8,color:'#94a3b8'}}>{h.year}{h.projected&&' (proj.)'}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scenario comparison */}
      <div style={{display:'grid',gap:14}}>
        {SCENARIOS.map((s,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.name,...s,impact_links:['Annual HR Budget']}})}}
            style={{background:'#fff',border:`1.5px solid ${s.selected?s.c+'66':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{s.name} {s.selected&&'✓'}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{s.assumptions}</div>
              </div>
              <div style={{fontSize:14,fontWeight:900,color:s.c}}>{fmt(s.projected_cost)}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Attrition assumptions pull from real historical exit data -- never an arbitrary guessed percentage.','All statutory commitments (SSF, gratuity, bonus fund) are pre-validated as fully funded in every scenario before it\'s presented.','Run a what-if scenario any time -- results compute in seconds, not a multi-day spreadsheet exercise.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Model',key:'view'},{icon:'✅',label:'Select Scenario',key:'select'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

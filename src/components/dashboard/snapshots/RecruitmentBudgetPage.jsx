// FILE: RecruitmentBudgetPage.jsx - Recruitment Budget
// (Finance, Assets & Administration > HR Budgeting)
// Cost-per-hire, agency fees, ATS spend, relocation -- genuinely new
// recruitment_budget_lines table; no precedent existed for hiring cost
// tracking anywhere in the build until now.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const COST_BREAKDOWN = [
  {category:'Job Board Postings',amount:340000,c:'#c2410c'},{category:'Agency Fees',amount:520000,c:'#0284c7'},
  {category:'ATS Software License',amount:280000,c:'#7c3aed'},{category:'Interview & Travel Expenses',amount:180000,c:'#15803d'},
  {category:'Relocation Assistance',amount:360000,c:'#f59e0b'},
]

const KPIS = { total_hires:42, total_spend:1680000, cost_per_hire:40000, foreign_national_pct:3.2 }

export default function RecruitmentBudgetPage() {
  const [ctx, setCtx] = useState(null)
  const total = COST_BREAKDOWN.reduce((s,c)=>s+c.amount,0)
  const maxCost = Math.max(...COST_BREAKDOWN.map(c=>c.amount))
  const fmt = n => 'NPR '+(n/1000).toFixed(0)+'K'

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎯" title="Recruitment Budget"
        breadcrumb="Finance, Assets & Administration > HR Budgeting"
        gradient={G}
        stats={[
          {icon:'🎯',label:'Cost Per Hire',  value:fmt(KPIS.cost_per_hire)},
          {icon:'👥',label:'Hires YTD',          value:KPIS.total_hires},
          {icon:'💸',label:'Total Spend',           value:fmt(KPIS.total_spend)},
          {icon:'🌍',label:'Foreign National %',        value:KPIS.foreign_national_pct+'% (cap 5%)'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>The 5% Cap, Tracked Live:</strong> Foreign national headcount is checked against the statutory 5% workforce cap automatically -- every foreign hire decision has this number in view before it's made.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>💰 Cost Breakdown</div>
        {COST_BREAKDOWN.map((c,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.category,...c,impact_links:['Recruitment Pipeline']}})}}
            style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
              <span style={{color:'#374151'}}>{c.category}</span><span style={{fontWeight:700,color:c.c}}>{fmt(c.amount)}</span>
            </div>
            <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${c.amount/maxCost*100}%`,height:'100%',background:c.c,borderRadius:8}}/></div>
          </div>
        ))}
        <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between'}}>
          <span style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>Total</span><span style={{fontSize:14,fontWeight:900,color:A}}>{fmt(total)}</span>
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Cost-per-hire trends by department -- spot whether a specific role or team is driving outsized recruitment spend.','Foreign national hiring requires the newspaper + Ministry of Labor portal posting -- a compliance checklist surfaces automatically when applicable.','AI flags reactive, rushed hiring patterns that historically inflate agency fees.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

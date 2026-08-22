// FILE: EngagementBudgetPage.jsx - Engagement Budget
// (Finance, Assets & Administration > HR Budgeting)
// Wellbeing, recognition, team-building spend -- genuinely new
// engagement_budget_lines table; no precedent existed for engagement
// cost tracking. Intangible-ROI framing addressed directly via
// participation-correlated metrics, not just raw spend.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const SPEND_CATEGORIES = [
  {category:'Recognition & Rewards Platform',amount:280000,participation_pct:74,c:'#c2410c'},
  {category:'Wellness & EAP',amount:340000,participation_pct:31,c:'#0284c7'},
  {category:'Team-Building Events',amount:210000,participation_pct:82,c:'#15803d'},
  {category:'ERG & Inclusion Programs',amount:90000,participation_pct:18,c:'#7c3aed',
   flag_note:'Low participation relative to spend -- may need awareness push, not just budget.'},
]

export default function EngagementBudgetPage() {
  const [ctx, setCtx] = useState(null)
  const total = SPEND_CATEGORIES.reduce((s,c)=>s+c.amount,0)
  const maxAmount = Math.max(...SPEND_CATEGORIES.map(c=>c.amount))
  const fmt = n => 'NPR '+(n/1000).toFixed(0)+'K'

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="❤️" title="Engagement Budget"
        breadcrumb="Finance, Assets & Administration > HR Budgeting"
        gradient={G}
        stats={[
          {icon:'❤️',label:'Total Spend',  value:fmt(total)},
          {icon:'📊',label:'Avg Participation',  value:Math.round(SPEND_CATEGORIES.reduce((s,c)=>s+c.participation_pct,0)/SPEND_CATEGORIES.length)+'%'},
          {icon:'⚠',label:'Low-Participation Spend', value:SPEND_CATEGORIES.filter(c=>c.flag_note).length},
          {icon:'🔗',label:'Categories',                  value:SPEND_CATEGORIES.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📈</span>
        <div style={{flex:1,minWidth:200}}><strong>Spend Tied to Participation, Not Just Cost:</strong> Engagement ROI is genuinely hard to quantify in pure financial terms -- so every category here is shown alongside actual usage, giving a fuller picture than spend alone.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>💰 Spend vs Participation</div>
        {SPEND_CATEGORIES.map((c,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.category,...c,impact_links:['Employee Engagement']}})}}
            style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
              <span style={{color:'#374151'}}>{c.category}</span>
              <span style={{fontWeight:700,color:c.c}}>{fmt(c.amount)} . {c.participation_pct}% participation</span>
            </div>
            <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${c.amount/maxAmount*100}%`,height:'100%',background:c.c,borderRadius:8}}/></div>
            {c.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>⚠ {c.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Participation rates pull live from Employee Engagement -- never a separately tracked, stale percentage.','High-spend, low-participation categories flag here before renewal decisions, not after the budget is already committed.','Correlates engagement spend trends against eNPS and retention data to build a genuine business case for leadership.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

// FILE: TrainingBudgetPage.jsx - Training Budget
// (Finance, Assets & Administration > HR Budgeting)
// Pure UI over the EXISTING annual_training_budgets + v_ld_budget_widget
// (Skill Gap / Training Request session) -- never a second training
// budget table. Skills-based view layered on top.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const SKILL_ALLOCATION = [
  {skill:'Cloud & DevOps',allocated:480000,spent:310000,c:'#7c3aed'},{skill:'Leadership Development',allocated:360000,spent:290000,c:'#0284c7'},
  {skill:'Compliance & Safety',allocated:240000,spent:240000,c:'#15803d'},{skill:'Data & AI Literacy',allocated:420000,spent:120000,c:'#f59e0b',
   flag_note:'Significantly under-utilized vs allocation -- a high-value emerging skill area worth promoting harder.'},
]

export default function TrainingBudgetPage() {
  const [ctx, setCtx] = useState(null)
  const totalAllocated = SKILL_ALLOCATION.reduce((s,c)=>s+c.allocated,0)
  const totalSpent = SKILL_ALLOCATION.reduce((s,c)=>s+c.spent,0)
  const fmt = n => 'NPR '+(n/1000).toFixed(0)+'K'

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎓" title="Training Budget"
        breadcrumb="Finance, Assets & Administration > HR Budgeting"
        gradient={G}
        stats={[
          {icon:'🎓',label:'Total Allocated',  value:fmt(totalAllocated)},
          {icon:'💸',label:'YTD Spent',            value:fmt(totalSpent)},
          {icon:'📊',label:'Utilization',              value:Math.round(totalSpent/totalAllocated*100)+'%'},
          {icon:'🧠',label:'Skill Categories',             value:SKILL_ALLOCATION.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🧠</span>
        <div style={{flex:1,minWidth:200}}><strong>Skills-Based, Not Job-Role Budgeting:</strong> Funding follows fluid employee skills -- especially emerging, high-value technology areas -- rather than rigid departmental training quotas.</div>
      </div>

      <div style={{display:'grid',gap:16}}>
        {SKILL_ALLOCATION.map((s,i)=>{
          const pct = Math.round(s.spent/s.allocated*100)
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.skill,...s,impact_links:['Training Request']}})}}
              style={{background:'#fff',border:`1px solid ${s.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{s.skill}</div>
                <div style={{fontSize:10,fontWeight:700,color:s.c}}>{fmt(s.spent)} / {fmt(s.allocated)}</div>
              </div>
              <div style={{height:9,background:'#f1f5f9',borderRadius:9,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:s.c,borderRadius:9}}/></div>
              {s.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>💡 {s.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['This budget syncs directly with Training Request approvals -- never a separately reconciled spend figure.','AI recommends reallocating under-utilized skill budgets toward categories with proven completion and ROI.','Mandatory annual training programs (Labour Act capacity-building requirement) are flagged separately to guarantee they\'re funded first.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

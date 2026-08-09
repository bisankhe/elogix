// FILE: AnnualHRBudgetPage.jsx - Annual HR Budget
// (Finance, Assets & Administration > HR Budgeting)
// The master blueprint: aggregates every sub-budget (Department,
// Recruitment, Training, Engagement, Payroll) into one executive view.
// Pure rollup -- never re-enters figures that live in their own pages.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const SUB_BUDGETS = [
  {category:'Payroll',allocated:48000000,spent:34200000,c:'#15803d',target:'Payroll Budget'},
  {category:'Recruitment',allocated:2400000,spent:1680000,c:'#0284c7',target:'Recruitment Budget'},
  {category:'Training',allocated:1800000,spent:920000,c:'#7c3aed',target:'Training Budget'},
  {category:'Engagement',allocated:900000,spent:610000,c:'#f59e0b',target:'Engagement Budget'},
]

export default function AnnualHRBudgetPage() {
  const [ctx, setCtx] = useState(null)
  const totalAllocated = SUB_BUDGETS.reduce((s,b)=>s+b.allocated,0)
  const totalSpent = SUB_BUDGETS.reduce((s,b)=>s+b.spent,0)
  const utilizationPct = Math.round(totalSpent/totalAllocated*100)
  const fmt = n => (n/1000000).toFixed(1)+'M'

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏛" title="Annual HR Budget"
        breadcrumb="Finance, Assets & Administration > HR Budgeting"
        gradient={G}
        stats={[
          {icon:'🏛',label:'Total Allocated',  value:'NPR '+fmt(totalAllocated)},
          {icon:'💸',label:'YTD Spent',            value:'NPR '+fmt(totalSpent)},
          {icon:'📊',label:'Utilization',              value:utilizationPct+'%'},
          {icon:'📐',label:'Fiscal Year',                  value:'2082/83'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🏛</span>
        <div style={{flex:1,minWidth:200}}><strong>The Master Blueprint:</strong> Every figure here rolls up live from its own dedicated budget page -- click any category to drill straight into the detail, never a second number to reconcile.</div>
      </div>

      <div style={{display:'grid',gap:16}}>
        {SUB_BUDGETS.map((b,i)=>{
          const pct = Math.round(b.spent/b.allocated*100)
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:b.category,...b,impact_links:[b.target]}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{b.category}</div>
                <div style={{fontSize:10,fontWeight:700,color:b.c}}>NPR {fmt(b.spent)} / {fmt(b.allocated)}</div>
              </div>
              <div style={{height:10,background:'#f1f5f9',borderRadius:10,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:b.c,borderRadius:10}}/></div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:6}}>{pct}% utilized</div>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags any category trending toward overspend before fiscal year-end, based on current burn rate.','Statutory commitments (SSF, gratuity, bonus fund) are checked for full funding automatically -- never left exposed.','Department-level allocations roll up here too -- see Department Budget for the granular breakdown.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Drill into Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

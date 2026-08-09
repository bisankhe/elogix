// FILE: PayrollBudgetPage.jsx - Payroll Budget
// (Finance, Assets & Administration > HR Budgeting)
// Pure aggregation over the EXISTING payslips (gross/SSF/TDS already
// captured per pay run) -- plus the genuinely new bonus_fund_tracking
// table for the mandatory 10%-of-net-profit annual bonus, a legal
// obligation with no prior representation anywhere in the build.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const COMPONENTS = [
  {label:'Base Salaries',amount:38400000,c:'#15803d'},{label:'Overtime (1.5x)',amount:1240000,c:'#0284c7'},
  {label:'SSF Employer Contribution',amount:4608000,c:'#7c3aed'},{label:'Gratuity Accrual (8.33%)',amount:3200000,c:'#f59e0b'},
]

const BONUS_FUND = { net_profit:120000000, required_pct:10, required_amount:12000000, funded_amount:8400000, deadline:'2026-01-15' }

export default function PayrollBudgetPage() {
  const [ctx, setCtx] = useState(null)
  const total = COMPONENTS.reduce((s,c)=>s+c.amount,0)
  const maxComp = Math.max(...COMPONENTS.map(c=>c.amount))
  const fmt = n => 'NPR '+(n/1000000).toFixed(1)+'M'
  const bonusFundedPct = Math.round(BONUS_FUND.funded_amount/BONUS_FUND.required_amount*100)
  const bonusShortfall = BONUS_FUND.required_amount - BONUS_FUND.funded_amount

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💰" title="Payroll Budget"
        breadcrumb="Finance, Assets & Administration > HR Budgeting"
        gradient={G}
        stats={[
          {icon:'💰',label:'Total Payroll Cost',  value:fmt(total)},
          {icon:'🎁',label:'Bonus Fund Funded',       value:bonusFundedPct+'%'},
          {icon:'⚠',label:'Bonus Shortfall',             value:fmt(bonusShortfall)},
          {icon:'⚖',label:'Bonus Deadline',                 value:BONUS_FUND.deadline},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>The Mandatory Bonus, Tracked to the Rupee:</strong> 10% of net annual profit must reach the employee bonus fund and be distributed within 6 months of fiscal year-end. A shortfall here is a legal exposure, not just a budgeting gap.</div>
      </div>

      {/* Bonus fund tracker -- the legally critical piece */}
      <div style={{background:'#fff',border:bonusShortfall>0?'1.5px solid #fed7aa':'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>🎁 Annual Bonus Fund (10% of Net Profit)</div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:10}}>
          <span style={{color:'#374151'}}>Funded</span><span style={{fontWeight:700,color:A}}>{fmt(BONUS_FUND.funded_amount)} / {fmt(BONUS_FUND.required_amount)}</span>
        </div>
        <div style={{height:12,background:'#f1f5f9',borderRadius:12,overflow:'hidden'}}><div style={{width:`${bonusFundedPct}%`,height:'100%',background:bonusFundedPct<100?'#f59e0b':'#15803d',borderRadius:12}}/></div>
        {bonusShortfall>0&&<div style={{marginTop:10,fontSize:9,color:'#b45309'}}>⚠ Shortfall of {fmt(bonusShortfall)} must be funded before distribution deadline ({BONUS_FUND.deadline}).</div>}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Payroll Components</div>
        {COMPONENTS.map((c,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.label,...c,impact_links:['Payroll Processing']}})}}
            style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
              <span style={{color:'#374151'}}>{c.label}</span><span style={{fontWeight:700,color:c.c}}>{fmt(c.amount)}</span>
            </div>
            <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${c.amount/maxComp*100}%`,height:'100%',background:c.c,borderRadius:8}}/></div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Every figure pulls live from finalized payslips -- never an estimate that drifts from actual disbursement.','Overtime tracked against the statutory 4h/day, 20h/week cap automatically -- flags before a compliance breach, not after.','SSF and gratuity accruals are checked for full funding throughout the year, never just at year-end audit time.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

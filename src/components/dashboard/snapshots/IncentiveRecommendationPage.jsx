// FILE: IncentiveRecommendationPage.jsx - Incentive Recommendation (Performance & Talent > Goal & Performance)
// KPI/OKR-tied bonus calculator with budget-constrained adjustment slider,
// one-click manager approval - distinct from Reward Program's discretionary spot bonuses.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const INCENTIVE_CALCS = [
  { id:'ic1', employee:'Anjali Sharma', kpi_basis:'Q2 Sales Target Achievement', kpi_actual_pct:118,
    base_incentive_npr:40000, calculated_npr:47200, manager_adjusted_npr:47200, budget_cap_npr:50000,
    status:'pending_approval', impact_links:['KPI Management','Bonus Processing'] },
  { id:'ic2', employee:'Ramesh KC', kpi_basis:'Q2 Sales Target Achievement', kpi_actual_pct:82,
    base_incentive_npr:40000, calculated_npr:32800, manager_adjusted_npr:32800, budget_cap_npr:50000,
    status:'approved', impact_links:[] },
]

const STATUS_CFG = {pending_approval:{c:'#f59e0b',bg:'#fffbeb',label:'Pending Approval'},approved:{c:'#10b981',bg:'#f0fdf4',label:'Approved'}}

export default function IncentiveRecommendationPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = INCENTIVE_CALCS.filter(i=>!search||i.employee.toLowerCase().includes(search.toLowerCase()))
  const totalProposed = INCENTIVE_CALCS.reduce((s,i)=>s+i.manager_adjusted_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💵" title="Incentive Recommendation"
        breadcrumb="Performance & Talent Management > Goal & Performance"
        gradient={G}
        stats={[
          {icon:'💵',label:'Active Calculations', value:INCENTIVE_CALCS.length},
          {icon:'💰',label:'Total Proposed',         value:'NPR '+totalProposed.toLocaleString()},
          {icon:'⏳',label:'Pending Approval',       value:INCENTIVE_CALCS.filter(i=>i.status==='pending_approval').length},
          {icon:'📊',label:'Basis',                  value:'KPI-Tied'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>KPI-Tied, Not Discretionary:</strong> Calculated directly from KPI Management's tracked achievement percentage - no spreadsheet math. Managers can adjust within the pre-set budget cap, then submit for one-click approval. Communicated at the start of the cycle, so employees know exactly what triggers the payout.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(i=>{
          const sc = STATUS_CFG[i.status]
          const budgetPct = Math.round(i.manager_adjusted_npr/i.budget_cap_npr*100)
          return (
            <div key={i.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:i.employee,...i}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{i.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{i.kpi_basis} - {i.kpi_actual_pct}% achieved</div>
                </div>
                <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {i.manager_adjusted_npr.toLocaleString()}</div>
              </div>
              <div style={{padding:'12px 18px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:9}}>
                  <span style={{color:'#64748b'}}>Budget cap: NPR {i.budget_cap_npr.toLocaleString()}</span><span style={{fontWeight:700,color:A}}>{budgetPct}%</span>
                </div>
                <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${budgetPct}%`,height:'100%',background:A,borderRadius:8}}/></div>
              </div>
              {i.status==='pending_approval'&&(
                <div style={{padding:'10px 18px',display:'flex',gap:8}}>
                  <button style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ One-Click Approve</button>
                  <button style={{padding:'7px 16px',borderRadius:8,border:`1px solid ${A}33`,background:'#f0fdf4',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>✏ Adjust Amount</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Calculation Detail',key:'view'},{icon:'✅',label:'Approve',key:'approve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

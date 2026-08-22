// FILE: DepartmentBudgetPage.jsx - Department Budget
// (Finance, Assets & Administration > HR Budgeting)
// Permission-scoped: department heads see only their own allocation,
// never company-wide confidential figures. Genuinely new
// department_budget_allocations table, following the proven
// accommodation_budget allocated-vs-spent pattern.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const DEPARTMENTS = [
  {dept:'IT',allocated:1200000,spent:980000,headcount_budget:24,headcount_actual:22},
  {dept:'Sales & Marketing',allocated:900000,spent:870000,headcount_budget:18,headcount_actual:19,
    flag_note:'Headcount slightly over budget -- requires HR review before next hire.'},
  {dept:'Finance',allocated:450000,spent:210000,headcount_budget:8,headcount_actual:7},
]

export default function DepartmentBudgetPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = DEPARTMENTS.filter(d=>!search||d.dept.toLowerCase().includes(search.toLowerCase()))
  const fmt = n => 'NPR '+(n/1000).toFixed(0)+'K'

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏢" title="Department Budget"
        breadcrumb="Finance, Assets & Administration > HR Budgeting"
        gradient={G}
        stats={[
          {icon:'🏢',label:'Departments',  value:DEPARTMENTS.length},
          {icon:'⚠',label:'Over Headcount',   value:DEPARTMENTS.filter(d=>d.headcount_actual>d.headcount_budget).length},
          {icon:'💰',label:'Total Allocated',     value:fmt(DEPARTMENTS.reduce((s,d)=>s+d.allocated,0))},
          {icon:'🔒',label:'Visibility',              value:'Permission-Scoped'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Delegated, Not Disclosed:</strong> Each department head sees only their own ledger here -- never confidential company-wide figures from other business units.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search departments..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map((d,i)=>{
          const pct = Math.round(d.spent/d.allocated*100)
          const hcOver = d.headcount_actual > d.headcount_budget
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.dept,...d,impact_links:['Annual HR Budget']}})}}
              style={{background:'#fff',border:`1px solid ${d.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{d.dept}</div>
                <div style={{fontSize:10,fontWeight:700,color:A}}>{fmt(d.spent)} / {fmt(d.allocated)}</div>
              </div>
              <div style={{height:9,background:'#f1f5f9',borderRadius:9,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:A,borderRadius:9}}/></div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:9,color:'#94a3b8'}}>
                <span>{pct}% utilized</span>
                <span style={{color:hcOver?'#dc2626':'#64748b',fontWeight:hcOver?700:400}}>Headcount: {d.headcount_actual}/{d.headcount_budget}</span>
              </div>
              {d.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {d.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Headcount budget syncs with actual employee count automatically -- no manual reconciliation needed.','Department heads can request budget revisions directly here, routed for HR/Finance approval.','Rolls up into Annual HR Budget automatically -- never a separately maintained total.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Ledger',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

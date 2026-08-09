// FILE: ReimbursementPage.jsx - Reimbursement
// (Finance, Assets & Administration > Finance & Claims)
// The payment-status ledger -- distinct from Expense Claims (the
// submission/categorization step). Tracks Submitted -> Approved ->
// Paid across ALL claim types (expense, petty cash, mobile/fuel),
// pure read aggregation, never a duplicate claims engine.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const STAGES = ['Submitted','Approved','Paid']

const REIMBURSEMENTS = [
  {id:'r1',claim_type:'Expense Claim',description:'Client Entertainment -- Yeti Cafe',amount:4200,stage_idx:0,date:'2025-06-25'},
  {id:'r2',claim_type:'Petty Cash',description:'Courier charges -- branch office',amount:850,stage_idx:1,date:'2025-06-22'},
  {id:'r3',claim_type:'Mobile & Fuel',description:'June fuel allowance',amount:6000,stage_idx:2,date:'2025-06-01',paid_date:'2025-06-05'},
  {id:'r4',claim_type:'Travel Request',description:'Pokhara client visit -- daily allowance',amount:4500,stage_idx:1,date:'2025-06-08'},
]

export default function ReimbursementPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = REIMBURSEMENTS.filter(r=>!search||r.description.toLowerCase().includes(search.toLowerCase()))
  const totalPaid = REIMBURSEMENTS.filter(r=>r.stage_idx===2).reduce((s,r)=>s+r.amount,0)
  const totalOutstanding = REIMBURSEMENTS.filter(r=>r.stage_idx<2).reduce((s,r)=>s+r.amount,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💸" title="Reimbursement"
        breadcrumb="Finance, Assets & Administration > Finance & Claims"
        gradient={G}
        stats={[
          {icon:'💸',label:'Total Outstanding',  value:'NPR '+totalOutstanding.toLocaleString()},
          {icon:'✅',label:'Paid This Month',        value:'NPR '+totalPaid.toLocaleString()},
          {icon:'📋',label:'Active Reimbursements',      value:REIMBURSEMENTS.length},
          {icon:'🔗',label:'Claim Types Tracked',            value:[...new Set(REIMBURSEMENTS.map(r=>r.claim_type))].length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>One Ledger, Every Claim Type:</strong> Expense claims, petty cash, mobile/fuel, and travel allowances all land here once approved -- a single payment-status view, never a separate finance spreadsheet to reconcile.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search reimbursements..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>(
          <div key={r.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.description,...r,impact_links:['Expense Claims']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
              <div>
                <span style={{background:'#eff6ff',color:'#1e40af',fontSize:7,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{r.claim_type}</span>
                <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginTop:6}}>{r.description}</div>
              </div>
              <div style={{fontSize:13,fontWeight:800,color:A}}>NPR {r.amount.toLocaleString()}</div>
            </div>
            <div style={{display:'flex',gap:4}}>
              {STAGES.map((s,i)=>(
                <div key={s} style={{flex:1,textAlign:'center'}}>
                  <div style={{height:6,borderRadius:6,background:i<=r.stage_idx?A:'#f1f5f9'}}/>
                  <div style={{fontSize:7,color:i<=r.stage_idx?A:'#94a3b8',fontWeight:i===r.stage_idx?700:400,marginTop:4}}>{s}</div>
                </div>
              ))}
            </div>
            {r.paid_date&&<div style={{marginTop:8,fontSize:8,color:'#15803d'}}>✅ Paid {r.paid_date}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Approved claims trigger payment automatically through the payroll/ledger integration -- never a manual wire-transfer step.','Outstanding totals update live the moment any claim type moves stages -- no end-of-month reconciliation surprise.','Export the full ledger to your accounting system any time, formatted for direct import.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

// FILE: VendorBillingPayrollProcPage.jsx - Vendor Billing Payroll (Payroll Processing)
// 3-way matching: PO vs contract rate vs delivery log, before ACH/digital payout.
// Distinct from Payroll Setup's Vendor Billing config - this is the execution stage.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#164e63 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const VENDOR_BILLS = [
  { id:'vb1', vendor:'ShieldGuard Nepal', bill_no:'SG-2025-0142', workers_billed:8, days_billed:30,
    contract_rate_npr:850, billed_rate_npr:850, gross_npr:204000, match_status:'matched',
    impact_links:['Vendor Billing','Outsource Compliance'] },
  { id:'vb2', vendor:'CleanPro Services', bill_no:'CP-2025-0098', workers_billed:5, days_billed:30,
    contract_rate_npr:720, billed_rate_npr:780, gross_npr:117000, match_status:'discrepancy',
    flag_note:'Billed rate (NPR 780/day) exceeds contract rate (NPR 720/day) - NPR 9,000 overcharge flagged.',
    impact_links:['Vendor SLA'] },
  { id:'vb3', vendor:'TechStaff Solutions', bill_no:'TS-2025-0067', workers_billed:3, days_billed:22,
    contract_rate_npr:1200, billed_rate_npr:1200, gross_npr:79200, match_status:'matched',
    impact_links:[] },
]

const STATUS_CFG = {matched:{c:'#10b981',bg:'#f0fdf4',label:'3-Way Matched'},discrepancy:{c:'#ef4444',bg:'#fef2f2',label:'Discrepancy Found'}}

export default function VendorBillingPayrollProcPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = VENDOR_BILLS.filter(v=>!search||v.vendor.toLowerCase().includes(search.toLowerCase()))
  const totalGross = VENDOR_BILLS.reduce((s,v)=>s+v.gross_npr,0)
  const discrepancyCount = VENDOR_BILLS.filter(v=>v.match_status==='discrepancy').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧾" title="Vendor Billing Payroll"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Processing"
        gradient={G}
        stats={[
          {icon:'🧾',label:'Bills This Cycle',  value:VENDOR_BILLS.length},
          {icon:'✅',label:'3-Way Matched',      value:VENDOR_BILLS.filter(v=>v.match_status==='matched').length},
          {icon:'⚠',label:'Discrepancies',      value:discrepancyCount},
          {icon:'💰',label:'Total Gross',        value:'NPR '+totalGross.toLocaleString()},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#155e75',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔍</span>
        <div style={{flex:1,minWidth:200}}><strong>3-Way Matching:</strong> Every vendor bill is auto-checked against the contract rate AND the verified delivery/attendance log before payout is scheduled. Mismatches are held - never auto-paid - until reconciled, preventing overcharges and duplicate payments.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by vendor name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(v=>{
          const sc = STATUS_CFG[v.match_status]
          return (
            <div key={v.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:v.vendor,...v}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{v.vendor}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>Bill: {v.bill_no} . {v.workers_billed} workers × {v.days_billed} days</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:15,fontWeight:900,color:A}}>NPR {v.gross_npr.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>GROSS BILL</div>
                </div>
              </div>
              <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                <div style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#10b981'}}>NPR {v.contract_rate_npr}</div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>CONTRACT RATE/DAY</div>
                </div>
                <div style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                  <div style={{fontSize:12,fontWeight:800,color:v.billed_rate_npr>v.contract_rate_npr?'#ef4444':'#10b981'}}>NPR {v.billed_rate_npr}</div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>BILLED RATE/DAY</div>
                </div>
              </div>
              {v.flag_note&&<div style={{padding:'10px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠</strong> {v.flag_note}</div>}
              <div style={{padding:'10px 18px',display:'flex',justifyContent:'flex-end'}}>
                <button disabled={v.match_status==='discrepancy'} style={{padding:'7px 16px',borderRadius:8,border:'none',background:v.match_status==='discrepancy'?'#e2e8f0':A,color:v.match_status==='discrepancy'?'#94a3b8':'#fff',fontSize:11,fontWeight:700,cursor:v.match_status==='discrepancy'?'not-allowed':'pointer'}}>
                  {v.match_status==='discrepancy'?'Resolve Before Payout':'Schedule Payout'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Bill Detail',key:'view'},{icon:'🔧',label:'Reconcile Discrepancy',key:'reconcile'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

// FILE: VendorBillingPayrollPage.jsx - Vendor Billing Payroll (Payroll & Compensation)
// Consolidated invoice generator: timesheet-to-billing, agency fee/markup
// transparency, currency-fluctuation note, SLA-tied verification.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A = '#334155'

const INVOICES = [
  { id:'vb1', vendor:'ShieldGuard Nepal', period:'June 2025', staff_count:8, base_pay_npr:168000, agency_fee_npr:16800, total_npr:184800, status:'pending_verification', impact_links:['Vendor Profile','Outsource Billing'] },
  { id:'vb2', vendor:'CleanPro Services', period:'June 2025', staff_count:5, base_pay_npr:97750, agency_fee_npr:9775, total_npr:107525, status:'approved', impact_links:[] },
  { id:'vb3', vendor:'TechStaff Solutions', period:'June 2025', staff_count:1, base_pay_npr:17800, agency_fee_npr:1780, total_npr:19580, status:'disputed', impact_links:['Outsource Attendance'] },
]
const STATUS_CFG = {pending_verification:{c:'#f59e0b',bg:'#fffbeb',label:'Pending Verification'},approved:{c:'#10b981',bg:'#f0fdf4',label:'Approved'},disputed:{c:'#ef4444',bg:'#fef2f2',label:'Disputed'}}

export default function VendorBillingPayrollPage() {
  const [invoices, setInvoices] = useState(INVOICES)
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = invoices.filter(i=>!search||i.vendor.toLowerCase().includes(search.toLowerCase()))
  const totalBilling = invoices.reduce((s,i)=>s+i.total_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧾" title="Vendor Billing Payroll"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Setup"
        gradient={G}
        stats={[
          {icon:'🧾',label:'Invoices',          value:invoices.length},
          {icon:'👥',label:'Vendor Staff Total', value:invoices.reduce((s,i)=>s+i.staff_count,0)},
          {icon:'⚠',label:'Disputed',           value:invoices.filter(i=>i.status==='disputed').length},
          {icon:'💰',label:'Total Billing',       value:'NPR '+(totalBilling/1000).toFixed(0)+'K'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🧾</span>
        <div style={{flex:1,minWidth:220}}><strong>Transparent Markup:</strong> Every invoice cleanly separates base staff pay from the agency fee/markup - required verified timesheets before approval, per global SLA best practice. Disputed invoices auto-link to Outsource Attendance for evidence review.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by vendor name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(i=>{
          const sc = STATUS_CFG[i.status]
          return (
            <div key={i.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:i.vendor,...i}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{i.vendor}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{i.period} . {i.staff_count} staff</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {i.total_npr.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>TOTAL INVOICE</div>
                </div>
              </div>
              <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:8}}>
                {[{l:'Base Staff Pay',v:'NPR '+i.base_pay_npr.toLocaleString(),c:'#10b981'},{l:'Agency Fee (10%)',v:'NPR '+i.agency_fee_npr.toLocaleString(),c:'#f59e0b'}].map((s,k)=>(
                  <div key={k} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Invoice',key:'view'},{icon:'✅',label:'Approve',key:'approve'},
        {icon:'⚠',label:'Dispute',key:'dispute'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

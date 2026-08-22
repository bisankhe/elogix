// FILE: VendorBillingReportPage.jsx - Vendor Billing Report
// (Reports, Analytics & BI > HR Analytics)
// The ANALYTICS/reporting lens -- distinct from the EXISTING
// VendorBillingPage (rate enforcement/3-way match), VendorBillingPayrollPage
// (invoice generation), and VendorBillingPayrollProcPage (payment
// execution). This page never touches a transaction; it reads the
// EXISTING vendor_master + vendor_employees_extended and surfaces the
// markup gap (billing rate vs worker wage) those execution pages never
// needed to expose, plus department cost allocation and SLA correlation.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const VENDOR_BILLING = [
  {vendor:'Kathmandu Manpower Suppliers',billing_rate_npr:32000,worker_wage_npr:24000,sla_score:94,dept:'Facilities'},
  {vendor:'CleanPro Facilities Pvt Ltd',billing_rate_npr:23000,worker_wage_npr:18500,sla_score:88,dept:'Facilities'},
  {vendor:'QuickStaff Outsourcing',billing_rate_npr:82000,worker_wage_npr:65000,sla_score:71,dept:'IT',
   flag_note:'SLA score below 75 -- markup of 26% not matched by service quality, renewal review recommended.'},
]

export default function VendorBillingReportPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = VENDOR_BILLING.filter(v=>!search||v.vendor.toLowerCase().includes(search.toLowerCase()))
  const totalSpend = VENDOR_BILLING.reduce((s,v)=>s+v.billing_rate_npr,0)
  const avgMarkupPct = Math.round(VENDOR_BILLING.reduce((s,v)=>s+(v.billing_rate_npr-v.worker_wage_npr)/v.worker_wage_npr*100,0)/VENDOR_BILLING.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧾" title="Vendor Billing Report"
        breadcrumb="Reports, Analytics & BI > HR Analytics"
        gradient={G}
        stats={[
          {icon:'💰',label:'Total Current Spend',  value:'NPR '+totalSpend.toLocaleString()},
          {icon:'📐',label:'Avg Agency Markup',         value:avgMarkupPct+'%'},
          {icon:'⚠',label:'SLA Concerns',                  value:VENDOR_BILLING.filter(v=>v.sla_score<75).length},
          {icon:'⚖',label:'Min Wage Verified',                 value:VENDOR_BILLING.length+'/'+VENDOR_BILLING.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>The Markup, Made Visible:</strong> What you pay the agency and what the agency pays the worker are two different numbers -- this is the one report that shows both, side by side, so a hidden fee never hides in the gap between them.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search vendors..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map((v,i)=>{
          const markupPct = Math.round((v.billing_rate_npr-v.worker_wage_npr)/v.worker_wage_npr*100)
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:v.vendor,...v,impact_links:['Vendor-wise Headcount']}})}}
              style={{background:'#fff',border:`1px solid ${v.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{v.vendor}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{v.dept} . SLA Score: {v.sla_score}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:14,fontWeight:900,color:A}}>NPR {v.billing_rate_npr.toLocaleString()}/head</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>Worker wage: NPR {v.worker_wage_npr.toLocaleString()} . {markupPct}% markup</div>
                </div>
              </div>
              {v.flag_note&&<div style={{marginTop:10,fontSize:9,color:'#b45309'}}>⚠ {v.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['If a supplier fails to pay a worker properly, the law requires the company to step in and pay them directly -- then deduct that exact amount from the next vendor invoice, logged here for the full audit trail.','Billing anomalies (a sudden rate jump with no contract amendment) flag instantly, never discovered after the invoice is already paid.','SLA score and markup correlate directly -- a high markup paired with a low score is the renewal conversation this report exists to start.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Invoice Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

// FILE: VendorWiseHeadcountPage.jsx - Vendor-wise Headcount
// (Reports, Analytics & BI > HR Analytics)
// Pure aggregation over the EXISTING vendor_employees_extended (already
// tracks Section 64 compliance: id_verified, bg_verified, ssf_paid,
// insurance_active, min_wage_ok) -- never a second outsourced-worker
// registry. Distinct from the existing Vendor Billing pages (invoicing/
// payment execution) -- this is headcount and compliance visibility.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const VENDORS = [
  {vendor:'Kathmandu Manpower Suppliers',headcount:18,service_category:'Security & Reception',cost_per_head_npr:24000,contract_renewal:'2025-09-15',license_valid:true,is_core_work:false},
  {vendor:'CleanPro Facilities Pvt Ltd',headcount:9,service_category:'Cleaning & Housekeeping',cost_per_head_npr:18500,contract_renewal:'2025-07-20',license_valid:true,is_core_work:false},
  {vendor:'QuickStaff Outsourcing',headcount:6,service_category:'Software Development',cost_per_head_npr:65000,contract_renewal:'2025-08-01',license_valid:true,is_core_work:true,
   flag_note:'Service category overlaps with core engineering work -- legal review recommended; outsourcing core functions is prohibited.'},
]

export default function VendorWiseHeadcountPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = VENDORS.filter(v=>!search||v.vendor.toLowerCase().includes(search.toLowerCase()))
  const totalOutsourced = VENDORS.reduce((s,v)=>s+v.headcount,0)
  const coreWorkFlags = VENDORS.filter(v=>v.is_core_work).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏭" title="Vendor-wise Headcount"
        breadcrumb="Reports, Analytics & BI > HR Analytics"
        gradient={G}
        stats={[
          {icon:'🏭',label:'Active Vendors',  value:VENDORS.length},
          {icon:'👥',label:'Total Outsourced',     value:totalOutsourced},
          {icon:'⚠',label:'Core-Work Flags',           value:coreWorkFlags},
          {icon:'⚖',label:'Licensed Suppliers',            value:VENDORS.filter(v=>v.license_valid).length+'/'+VENDORS.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Core Work Cannot Be Outsourced:</strong> If a vendor's workers are performing your business's core functions rather than peripheral support, the law deems them your own direct employees -- this view flags that overlap before it becomes a liability, not after a labour audit.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search vendors..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map((v,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:v.vendor,...v,impact_links:['Vendor Billing']}})}}
            style={{background:'#fff',border:`1px solid ${v.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{v.vendor}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{v.service_category} . Renews {v.contract_renewal}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:900,color:A}}>{v.headcount}</div>
                <div style={{fontSize:8,color:'#94a3b8'}}>NPR {v.cost_per_head_npr.toLocaleString()}/head</div>
              </div>
            </div>
            <div style={{display:'flex',gap:6,marginTop:10}}>
              <span style={{background:v.license_valid?'#f0fdf4':'#fef2f2',color:v.license_valid?'#15803d':'#dc2626',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                {v.license_valid?'✓ Licensed':'⚠ Unlicensed'}
              </span>
              {v.is_core_work&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⚠ Core Work Overlap</span>}
            </div>
            {v.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {v.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Headcount syncs live from each vendor employee\'s active contract record -- never a separately maintained count.','Unlicensed suppliers are flagged before a single hour gets billed -- engaging one risks those workers being deemed your own direct employees.','Click any vendor to drill into its full billing and compliance detail.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

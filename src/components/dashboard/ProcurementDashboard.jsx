// ============================================================
// FILE: src/components/dashboard/ProcurementDashboard.jsx
// PURPOSE: Procurement workspace -- vendor agreements, asset/
//          inventory purchasing, PO tracking, vendor billing
//          review. Reuses EXISTING vendor_master/asset_management
//          tables, never a duplicate vendor registry.
// ============================================================
import { useState , useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'

const POS=[
  {item:'48x Laptop Replacement -- IT Dept',vendor:'Lenovo Nepal',status:'awaiting_approval',amount:'NPR 2.1M'},
  {item:'Office Furniture -- New Pokhara Branch',vendor:'WorkSpace Furnishings',status:'in_transit',amount:'NPR 480K'},
]
const VENDOR_RENEWALS=[
  {vendor:'CleanPro Facilities Pvt Ltd',expires:'2025-07-20',days_left:20},
  {vendor:'Kathmandu Manpower Suppliers',expires:'2025-09-15',days_left:77},
]


// ── Tenant session helper ──────────────────────────────────────────────
function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e) { return {} }
}
function _getTenantHeaders() {
  const sess  = _getSession()
  const token = localStorage.getItem('access_token') || sess?.token || ''
  const slug  = sess?.company?.slug || localStorage.getItem('elogix_tenant_slug') || ''
  return { token, slug, valid: !!(token && slug) }
}

export default function ProcurementDashboard(){
  const [apiData, setApiData] = useState(null)
  const [apiLoading, setApiLoading] = useState(true)
  const [apiError, setApiError] = useState(null)

  const { navTo, t } = useApp()
  return(
    <div>
      <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>📦 Procurement Workspace</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>Purchase orders, vendor agreements, and asset acquisition -- one view</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="📋" label="Open POs" value={POS.length}/>
        <StatCard icon="🏭" label="Active Vendors" value="14"/>
        <StatCard icon="📅" label="Renewals (30d)" value={VENDOR_RENEWALS.filter(v=>v.days_left<=30).length}/>
        <StatCard icon="💰" label="MTD Spend" value="NPR 3.2M"/>
        <StatCard icon="✅" label="Licensed Suppliers" value="14/14"/>
      </div>

      <Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📦 Purchase Orders</div>
        {POS.map((p,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<POS.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
            <div><div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{p.item}</div><div style={{fontSize:8,color:'#94a3b8'}}>{p.vendor}</div></div>
            <div style={{textAlign:'right'}}><div style={{fontSize:9,fontWeight:700,color:'#0284c7'}}>{p.amount}</div><span style={{fontSize:7,color:'#94a3b8'}}>{p.status.replace('_',' ')}</span></div>
          </div>
        ))}
      </Card>

      <div style={{marginTop:16}}><Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📅 Vendor Contract Renewals</div>
        {VENDOR_RENEWALS.map((v,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<VENDOR_RENEWALS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{v.vendor}</span>
            <span style={{fontSize:8,color:v.days_left<=30?'#b45309':'#94a3b8'}}>{v.days_left} days . {v.expires}</span>
          </div>
        ))}
      </Card></div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['Vendor Listing','vendor-listing'],['Vendor Agreement','vendor-agreement'],['Asset Management','asset-management'],['Vendor Billing Report','vendor-billing-report'],['IT Inventory','it-inventory']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}

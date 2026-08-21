// FILE: OutsourcePayrollPage.jsx - Outsource Payroll (Payroll & Compensation)
// Vendor-supplied staff payroll oversight: confirms statutory minimum wage
// compliance, vendor-liability flag if underpaid, consolidated multi-vendor view.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'
const MIN_WAGE_NPR = 19550

const VENDOR_PAYROLL = [
  { id:'vp1', employee:'Ramesh Shrestha', vendor:'ShieldGuard Nepal', role:'Security Guard', gross_paid_npr:21000, status:'compliant', impact_links:['Vendor Profile'] },
  { id:'vp2', employee:'Sita Tamang', vendor:'CleanPro Services', role:'Housekeeping', gross_paid_npr:19550, status:'compliant', impact_links:[] },
  { id:'vp3', employee:'Bikash Rai (Vendor)', vendor:'TechStaff Solutions', role:'IT Helpdesk', gross_paid_npr:17800, status:'underpaid', impact_links:['Vendor Clearance','Vendor Billing'] },
]
const STATUS_CFG = {compliant:{c:'#10b981',bg:'#f0fdf4',label:'Min Wage Compliant'},underpaid:{c:'#ef4444',bg:'#fef2f2',label:'Below Min Wage - Liability Risk'}}

export default function OutsourcePayrollPage() {
  const [payroll, setPayroll] = useState(VENDOR_PAYROLL)
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = payroll.filter(p=>!search||p.employee.toLowerCase().includes(search.toLowerCase()))
  const underpaidCount = payroll.filter(p=>p.status==='underpaid').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔗" title="Outsource Payroll"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Setup"
        gradient={G}
        stats={[
          {icon:'👥',label:'Vendor Staff',     value:payroll.length},
          {icon:'✅',label:'Compliant',         value:payroll.filter(p=>p.status==='compliant').length},
          {icon:'⚠',label:'Below Min Wage',    value:underpaidCount},
          {icon:'💰',label:'Min Wage Floor',    value:'NPR '+MIN_WAGE_NPR.toLocaleString()},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:220}}><strong>Core Liability Stays With You:</strong> Per Nepal LA2074, the primary employer is legally obligated to ensure outsourced staff receive at least minimum wage (NPR {MIN_WAGE_NPR.toLocaleString()}/month). If a vendor underpays, the primary employer remains liable and can deduct dues from the vendor contract.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(p=>{
          const sc = STATUS_CFG[p.status]
          return (
            <div key={p.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.employee,...p}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
              <div style={{flex:1,minWidth:160}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{p.employee}</span>
                  <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{p.vendor} . {p.role}</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:15,fontWeight:900,color:sc.c}}>NPR {p.gross_paid_npr.toLocaleString()}</div>
                <div style={{fontSize:8,color:'#94a3b8'}}>GROSS PAID</div>
              </div>
            </div>
          )
        })}
      </div>

      {underpaidCount>0&&(
        <div style={{marginTop:16,background:'#fff',border:'1px solid #fecaca',borderRadius:16,padding:'16px 20px'}}>
          <AIImpact color={A} lines={[`${underpaidCount} vendor employee(s) paid below the statutory minimum - flagged for Vendor Clearance review.`,'Primary employer liability triggers an automatic deduction-from-contract recommendation.','Resolve before next billing cycle to avoid compounding liability.']}/>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'⚠',label:'Flag for Clearance',key:'flag'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

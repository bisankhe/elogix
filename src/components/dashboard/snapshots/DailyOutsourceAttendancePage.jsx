// FILE: DailyOutsourceAttendancePage.jsx - Outsource Attendance (Daily Attendance)
// Vendor-supplied staff: data synced FROM vendor's own system via API, variance/dispute
// tracker, SLA-linked verification, ghost-employee risk flag. Distinct from the
// Employment Type module's OutsourceAttendancePage (which covers billing/headcount KPIs) -
// this page is the DAILY operational attendance lens: today's sync status, discrepancies.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const OUTSOURCE_LOG = [
  { id:'os1', employee:'Ramesh Shrestha', vendor:'ShieldGuard Nepal', role:'Security Guard',
    date:'2025-06-21', login:'10:00 PM', logout:'06:00 AM', total_hrs:8,
    sync_source:'vendor_api', sync_status:'synced', sync_time:'06:15 AM',
    variance_flag:false, location:'KTM HQ Main Gate', geo_validated:true,
    impact_links:['Vendor Profile','Outsource Billing'] },
  { id:'os2', employee:'Sita Tamang', vendor:'CleanPro Services', role:'Housekeeping',
    date:'2025-06-21', login:'07:02 AM', logout:'03:10 PM', total_hrs:8.1,
    sync_source:'vendor_api', sync_status:'synced', sync_time:'03:25 PM',
    variance_flag:false, location:'KTM HQ All Floors', geo_validated:true,
    impact_links:[] },
  { id:'os3', employee:'Bikash Rai', vendor:'TechStaff Solutions', role:'IT Helpdesk',
    date:'2025-06-21', login:'09:15 AM', logout:null, total_hrs:null,
    sync_source:'vendor_api', sync_status:'discrepancy', sync_time:'09:30 AM',
    variance_flag:true, variance_note:'Vendor system shows logout at 6:00 PM, but no checkout punch recorded on-site. Possible ghost entry or sync lag.',
    location:'IT Helpdesk', geo_validated:false,
    impact_links:['Vendor Profile'] },
  { id:'os4', employee:'Priya Gurung', vendor:'ShieldGuard Nepal', role:'Security Guard',
    date:'2025-06-21', login:'08:00 AM', logout:'04:05 PM', total_hrs:8.1,
    sync_source:'manual_entry', sync_status:'pending_sync', sync_time:null,
    variance_flag:false, location:'KTM HQ Side Gate', geo_validated:true,
    impact_links:[] },
]

const SYNC_CFG = {
  synced:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Synced from Vendor'},
  discrepancy:{c:'#ef4444',bg:'#fef2f2',icon:'⚠',label:'Variance Detected'},
  pending_sync:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Pending Sync'},
}

export default function DailyOutsourceAttendancePage() {
  const [logs, setLogs] = useState(OUTSOURCE_LOG)
  const [search, setSearch] = useState('')
  const [filterVendor, setFilterVendor] = useState('all')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const vendors = [...new Set(logs.map(l=>l.vendor))]
  const filtered = logs.filter(l=>{
    if (filterVendor!=='all'&&l.vendor!==filterVendor) return false
    if (search&&!l.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const discrepancyCount = logs.filter(l=>l.sync_status==='discrepancy').length
  const pendingCount = logs.filter(l=>l.sync_status==='pending_sync').length
  const syncedCount = logs.filter(l=>l.sync_status==='synced').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔗" title="Outsource Attendance"
        breadcrumb="Workforce Operations > Attendance Management > Daily Attendance"
        gradient={G}
        stats={[
          {icon:'👥',label:'Vendor Staff Today', value:logs.length},
          {icon:'✅',label:'Synced',               value:syncedCount},
          {icon:'⚠',label:'Variance Flagged',     value:discrepancyCount},
          {icon:'⏳',label:'Pending Sync',         value:pendingCount},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔗</span>
        <div><strong>Federated Integration:</strong> Vendor logs attendance in their own system; this page reflects what's been synced via API into NepHR Pro. Per Nepal LA2074, outsourced staff are limited to non-core functions, and the main employer still must maintain daily attendance records - discrepancies are flagged here for resolution before payroll/billing.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <select value={filterVendor} onChange={e=>setFilterVendor(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Vendors</option>
          {vendors.map(v=><option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.map(l=>{
          const sc = SYNC_CFG[l.sync_status]
          return (
            <div key={l.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.employee,...l}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'14px 18px',boxShadow:'0 1px 6px rgba(0,0,0,.04)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{l.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'1px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {!l.geo_validated&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'1px 8px',borderRadius:20}}>📍 Not Geo-Validated</span>}
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{l.vendor} . {l.role} . {l.location}</div>
                </div>
                <div style={{display:'flex',gap:16,fontSize:10}}>
                  <div style={{textAlign:'center'}}><div style={{fontWeight:700,color:'#10b981'}}>{l.login}</div><div style={{fontSize:8,color:'#94a3b8'}}>LOGIN</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontWeight:700,color:l.logout?'#ef4444':'#94a3b8'}}>{l.logout||'-'}</div><div style={{fontSize:8,color:'#94a3b8'}}>LOGOUT</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontWeight:800,color:A}}>{l.total_hrs?l.total_hrs+'h':'-'}</div><div style={{fontSize:8,color:'#94a3b8'}}>TOTAL</div></div>
                </div>
              </div>
              {l.variance_note&&(
                <div style={{marginTop:10,background:'#fef2f2',borderRadius:8,padding:'8px 12px',fontSize:10,color:'#991b1b'}}>
                  <strong>⚠ Variance:</strong> {l.variance_note}
                </div>
              )}
              <div style={{marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:9,color:'#94a3b8'}}>Source: {l.sync_source==='vendor_api'?'Vendor API':'Manual Entry'}{l.sync_time?` . Synced ${l.sync_time}`:''}</span>
                {l.variance_flag&&<button style={{padding:'5px 12px',borderRadius:7,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Open Dispute Ticket</button>}
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Vendor Record',key:'view'},{icon:'🔄',label:'Re-Sync',key:'sync'},
        {icon:'⚠',label:'Flag Dispute',key:'dispute'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Outsource Attendance" columns={['Employee','Vendor','Role','Date','Login','Logout','Total Hrs','Sync Status','Variance']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

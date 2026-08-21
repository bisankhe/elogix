// FILE: MobileAttendanceTrackingPage.jsx - Mobile Attendance Tracking (Attendance Management)
// ESS mobile check-in screen mock: biometric/facial liveness, GPS geofence, QR badge scan,
// offline-mode caching with pending-sync indicator, device-management overview for IT/HR.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#164e63 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const DEVICES = [
  { id:'d1', employee:'Ramesh Shrestha', device_model:'Samsung Galaxy A54', os:'Android 14', app_version:'3.2.1',
    last_sync:'2 min ago', offline_pending:0, biometric_enrolled:true, status:'online',
    impact_links:['GPS Attendance','Biometric Attendance'] },
  { id:'d2', employee:'Sunita Rai', device_model:'iPhone 13', os:'iOS 17.4', app_version:'3.2.1',
    last_sync:'5 min ago', offline_pending:0, biometric_enrolled:true, status:'online',
    impact_links:[] },
  { id:'d3', employee:'Bikash Rai', device_model:'Xiaomi Redmi Note 12', os:'Android 13', app_version:'3.1.8',
    last_sync:'1 hour ago', offline_pending:3, biometric_enrolled:true, status:'offline_cached',
    impact_links:[] },
  { id:'d4', employee:'Anjali Sharma', device_model:'Unknown', os:'Unknown', app_version:'2.9.0 (outdated)',
    last_sync:'4 days ago', offline_pending:0, biometric_enrolled:false, status:'inactive',
    impact_links:['IT Helpdesk'] },
]

const STATUS_CFG = {online:{c:'#10b981',bg:'#f0fdf4',icon:'🟢',label:'Synced'},offline_cached:{c:'#f59e0b',bg:'#fffbeb',icon:'📡',label:'Offline - Caching'},inactive:{c:'#ef4444',bg:'#fef2f2',icon:'⚠',label:'Inactive / Update Needed'}}

export default function MobileAttendanceTrackingPage() {
  const [devices, setDevices] = useState(DEVICES)
  const [search, setSearch] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = devices.filter(d=>!search||d.employee.toLowerCase().includes(search.toLowerCase()))
  const offlinePendingTotal = devices.reduce((s,d)=>s+d.offline_pending,0)
  const enrolledCount = devices.filter(d=>d.biometric_enrolled).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📱" title="Mobile Attendance Tracking"
        breadcrumb="Workforce Operations > Attendance Management > Overtime"
        gradient={G}
        stats={[
          {icon:'📱',label:'Registered Devices', value:devices.length},
          {icon:'🟢',label:'Synced',              value:devices.filter(d=>d.status==='online').length},
          {icon:'📡',label:'Pending Sync',        value:offlinePendingTotal},
          {icon:'👆',label:'Biometric Enrolled',  value:enrolledCount},
        ]}
        onAdd={()=>setShowPreview(true)} addLabel="Preview Mobile App"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#155e75',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>📍</span>
        <div><strong>GPS + Biometric Anti-Fraud:</strong> Facial recognition liveness detection prevents buddy-punching; GPS geofencing restricts check-ins to assigned locations. Offline mode caches punches locally and auto-syncs on reconnect - no lost attendance data in low-connectivity areas.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16,marginTop:14}}>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead><tr style={{background:'#f8fafc'}}>
                {['Employee','Device','OS','App Ver.','Last Sync','Offline Queue','Biometric','Status'].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(d=>{
                  const sc = STATUS_CFG[d.status]
                  return (
                    <tr key={d.id} style={{borderBottom:'1px solid #f8fafc'}}
                      onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.employee,...d}})}}>
                      <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{d.employee}</td>
                      <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{d.device_model}</td>
                      <td style={{padding:'9px 12px',color:'#94a3b8',fontSize:10}}>{d.os}</td>
                      <td style={{padding:'9px 12px',color:d.app_version.includes('outdated')?'#ef4444':'#64748b',fontSize:10}}>{d.app_version}</td>
                      <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{d.last_sync}</td>
                      <td style={{padding:'9px 12px'}}>{d.offline_pending>0?<span style={{color:'#f59e0b',fontWeight:700}}>{d.offline_pending} pending</span>:<span style={{color:'#10b981'}}>-</span>}</td>
                      <td style={{padding:'9px 12px'}}>{d.biometric_enrolled?<span style={{color:'#10b981'}}>✓ Enrolled</span>:<span style={{color:'#ef4444'}}>✗ Not Set</span>}</td>
                      <td style={{padding:'9px 12px'}}><span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile app preview mock */}
        <div style={{background:'#0f172a',borderRadius:28,padding:'18px 14px',height:'fit-content',boxShadow:'0 12px 40px rgba(0,0,0,.25)'}}>
          <div style={{background:'#fff',borderRadius:20,padding:'18px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#94a3b8',marginBottom:4}}>09:14 AM</div>
            <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginBottom:14}}>Ramesh Shrestha</div>
            <div style={{width:130,height:130,margin:'0 auto 14px',borderRadius:'50%',background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color:'#fff'}}>
              Tap to<br/>Clock In
            </div>
            <div style={{background:'#f0fdf4',borderRadius:10,padding:'8px 10px',fontSize:9,color:'#065f46',marginBottom:8}}>
              📍 Within KTM HQ geo-fence (12m)
            </div>
            <div style={{display:'flex',gap:6,justifyContent:'center'}}>
              <span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:8,fontWeight:700,padding:'3px 9px',borderRadius:20}}>😊 Face ID Ready</span>
              <span style={{background:'#faf5ff',color:'#7c3aed',fontSize:8,fontWeight:700,padding:'3px 9px',borderRadius:20}}>📱 Scan QR</span>
            </div>
          </div>
        </div>
      </div>

      {showPreview&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowPreview(false)}>
          <div style={{background:'#fff',borderRadius:20,padding:'28px',maxWidth:420,textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:14}}>📱 Mobile App Check-In Flow</div>
            <div style={{textAlign:'left',fontSize:11,color:'#374151',lineHeight:1.8}}>
              <div>1️⃣ Open app {'>'} biometric/Face ID unlock</div>
              <div>2️⃣ GPS auto-detects geo-fence status</div>
              <div>3️⃣ Tap "Clock In" or scan personal QR badge</div>
              <div>4️⃣ If offline: cached locally, syncs on reconnect</div>
              <div>5️⃣ Confirmation + live daily hours timer starts</div>
            </div>
            <button onClick={()=>setShowPreview(false)} style={{marginTop:18,padding:'10px 24px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Close</button>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Sync Log',key:'view'},{icon:'🔄',label:'Force Sync',key:'sync'},
        {icon:'📧',label:'Send Update Reminder',key:'remind'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Mobile Attendance Devices" columns={['Employee','Device Model','OS','App Version','Last Sync','Offline Pending','Biometric Enrolled','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

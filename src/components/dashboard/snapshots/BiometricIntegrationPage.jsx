// FILE: BiometricIntegrationPage.jsx - Biometric Integration (Attendance Setup)
// Hardware terminal sync, anti-buddy-punching, attendance register (LA2074 Section 20)

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A = '#334155'

const DEVICES = [
  { id:'dv1', name:'KTM HQ - Main Entrance', type:'Fingerprint + Face', model:'ZKTeco MB460', branch:'KTM HQ',
    status:'online', last_sync:'2 mins ago', enrolled_users:218, daily_punches:436, ip:'192.168.1.41',
    impact_links:['GPS Attendance','Attendance Policy'] },
  { id:'dv2', name:'Pokhara Branch - Entrance', type:'Fingerprint', model:'ZKTeco K40', branch:'Pokhara',
    status:'online', last_sync:'5 mins ago', enrolled_users:32, daily_punches:64, ip:'192.168.2.12',
    impact_links:[] },
  { id:'dv3', name:'Biratnagar Outlet', type:'Face Recognition', model:'Hikvision DS-K1T331', branch:'Biratnagar',
    status:'offline', last_sync:'2 hours ago', enrolled_users:18, daily_punches:0, ip:'192.168.3.8',
    impact_links:[] },
]

const RECENT_SYNC_LOG = [
  {employee:'Gita Maharjan', device:'KTM HQ - Main Entrance', method:'Face', time:'09:01 AM', status:'matched'},
  {employee:'Bikash Shrestha', device:'KTM HQ - Main Entrance', method:'Fingerprint', time:'08:58 AM', status:'matched'},
  {employee:'Unknown', device:'KTM HQ - Main Entrance', method:'Fingerprint', time:'08:55 AM', status:'rejected_no_match'},
]

const STATUS_CFG = {online:{c:'#10b981',icon:'🟢'},offline:{c:'#ef4444',icon:'🔴'}}

export default function BiometricIntegrationPage() {
  const [devices, setDevices] = useState(DEVICES)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = devices.filter(d=>!search||d.name.toLowerCase().includes(search.toLowerCase()))
  const totalPunches = devices.reduce((s,d)=>s+d.daily_punches,0)
  const onlineCount = devices.filter(d=>d.status==='online').length

  return (
    <div onClick={()=>setCtx(null)}>
      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}
      <PageHeader icon="👆" title="Biometric Integration"
        breadcrumb="Workforce Operations > Attendance Management > Attendance Setup"
        gradient={G}
        stats={[
          {icon:'📟',label:'Total Devices',  value:devices.length},
          {icon:'🟢',label:'Online',          value:onlineCount},
          {icon:'👤',label:'Enrolled Users',  value:devices.reduce((s,d)=>s+d.enrolled_users,0)},
          {icon:'👆',label:"Today's Punches", value:totalPunches},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Device"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074 Section 20:</strong> Biometric/facial recognition aligns with the mandate to maintain an accurate attendance register. Digital logs prevent buddy-punching and satisfy the requirement to securely store attendance/payment records for 5 years.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search devices..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(d=>{
          const sc = STATUS_CFG[d.status]
          return (
            <div key={d.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.name,...d}})}}
              style={{background:'#fff',border:`1px solid ${d.status==='offline'?'#fecaca':'#e2e8f0'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{padding:'16px 16px 10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{d.name}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{d.model} . {d.type}</div>
                  </div>
                  <span style={{fontSize:14}}>{sc.icon}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6,marginBottom:8}}>
                  {[{l:'Enrolled',v:d.enrolled_users,c:A},{l:"Today's Punches",v:d.daily_punches,c:'#10b981'}].map((s,i)=>(
                    <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                      <div style={{fontSize:14,fontWeight:900,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:9,color:'#94a3b8'}}>IP: {d.ip} . Last sync: {d.last_sync}</div>
              </div>
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                <button onClick={()=>notify('🔄 Syncing device data...')} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>Sync Now</button>
                <button onClick={()=>notify('📋 Loading attendance logs...')} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>View Logs</button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800,color:'#0f172a'}}>📋 Recent Sync Log</div>
        {RECENT_SYNC_LOG.map((l,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 18px',borderBottom:i<RECENT_SYNC_LOG.length-1?'1px solid #f8fafc':'none'}}>
            <div style={{fontSize:11,color:'#0f172a',fontWeight:l.status==='rejected_no_match'?700:400}}>{l.employee} <span style={{color:'#94a3b8',fontWeight:400}}>. {l.device} . {l.method}</span></div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:10,color:'#94a3b8'}}>{l.time}</span>
              <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,background:l.status==='matched'?'#f0fdf4':'#fef2f2',color:l.status==='matched'?'#15803d':'#dc2626'}}>{l.status==='matched'?'✓ Matched':'✗ No Match - Possible Buddy Punch Attempt'}</span>
            </div>
          </div>
        ))}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Biometric Device</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Device Name *</label>
                <input type="text" value={form.deviceName||""} onChange={e=>setForm(p=>({...p,deviceName:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Type</label>
                <select value={form.type||"Fingerprint"} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="Fingerprint" value="Fingerprint">Fingerprint</option><option key="Face Recognition" value="Face Recognition">Face Recognition</option><option key="Fingerprint + Face" value="Fingerprint + Face">Fingerprint + Face</option><option key="Iris Scan" value="Iris Scan">Iris Scan</option></select>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Model</label>
                <input type="text" value={form.model||""} onChange={e=>setForm(p=>({...p,model:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Branch</label>
                <select value={form.branch||"KTM HQ"} onChange={e=>setForm(p=>({...p,branch:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="KTM HQ" value="KTM HQ">KTM HQ</option><option key="Pokhara" value="Pokhara">Pokhara</option><option key="Biratnagar" value="Biratnagar">Biratnagar</option></select>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>IP Address</label>
                <input type="text" value={form.ipAddress||""} onChange={e=>setForm(p=>({...p,ipAddress:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
              <AIImpact color={A} lines={['Device auto-syncs punches to attendance register every 5 minutes.','AI flags unmatched/failed punches as potential buddy-punching attempts.','5-year secure log retention per Nepal LA2074 Section 20.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>{notify("Record created");setShowAdd(false);setForm({})}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Device</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'🔄',label:'Sync Now',key:'sync'},{icon:'📋',label:'View Logs',key:'logs'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Biometric Devices" columns={['Device Name','Type','Model','Branch','Status','Enrolled Users','IP Address']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

// FILE: src/components/dashboard/snapshots/BiometricIntegrationPage.jsx
// eLogix HRMS — Biometric Device Integration Hub
// COMPLETE REWRITE: Full device setup UI — replaces 85L stub that just JSON.stringify'd API.
// Each tenant company manages their own biometric devices — complete data isolation.
// Supports: ZKTeco, Suprema, RealTime, Face ID Cloud, GPS/Mobile, QR, Manual/Excel
// API: GET/POST/PUT/DELETE /api/v1/biometric/devices
// API: POST /api/v1/biometric/devices/:id/test
// API: POST /api/v1/biometric/devices/:id/sync
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useCallback } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G  = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#38bdf8 100%)'
const A  = '#0369a1'

const DEVICE_TYPES = [
  { id:'zkteco',   label:'ZKTeco',          icon:'🔐', port:4370,  desc:'Fingerprint / Face — most common in Nepal',  color:'#0369a1' },
  { id:'suprema',  label:'Suprema',         icon:'👁️',  port:51211, desc:'BioStation series — enterprise grade',        color:'#7c3aed' },
  { id:'realtime', label:'RealTime',        icon:'⏱️',  port:4370,  desc:'RealTime biometric devices — Nepal market',  color:'#0891b2' },
  { id:'anviz',    label:'Anviz',           icon:'🖐️',  port:5010,  desc:'Anviz fingerprint & face terminals',          color:'#059669' },
  { id:'faceid',   label:'Face ID Cloud',   icon:'🤳',  port:443,   desc:'Cloud-based face recognition via API',       color:'#dc2626' },
  { id:'gps',      label:'GPS / Mobile',    icon:'📍',  port:null,  desc:'GPS attendance via eLogix mobile app',       color:'#d97706' },
  { id:'qr',       label:'QR Scanner',      icon:'📱',  port:null,  desc:'QR code attendance at entry points',         color:'#9333ea' },
  { id:'manual',   label:'Manual / Excel',  icon:'📋',  port:null,  desc:'Bulk import punches from Excel/CSV file',    color:'#64748b' },
]

const STATUS_CFG = {
  ok     : { c:'#16a34a', bg:'#f0fdf4', b:'#bbf7d0', label:'✅ Online'   },
  error  : { c:'#dc2626', bg:'#fef2f2', b:'#fecaca', label:'❌ Error'    },
  pending: { c:'#d97706', bg:'#fffbeb', b:'#fde68a', label:'⏳ Pending'  },
  timeout: { c:'#dc2626', bg:'#fef2f2', b:'#fecaca', label:'⏰ Timeout'  },
  unknown: { c:'#94a3b8', bg:'#f8fafc', b:'#e2e8f0', label:'⚪ Unknown'  },
}

const EMPTY_FORM = {
  device_name:'', device_type:'', device_ip:'', device_port:'',
  model:'', location:'', serial_number:'', sync_interval_min:5,
  username:'admin', password:'', use_ssl:false, notes:''
}

async function apiFetch(url, opts={}) {
  const res = await fetch(url, { ...opts, headers:{ ..._authH(), ...(opts.headers||{}) } })
  if(res.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
  if(!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const inp = {width:'100%',padding:'7px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',
  fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box',fontFamily:'inherit'}

function Field({label,children,half}){
  return(
    <div style={{marginBottom:12,width:half?'calc(50% - 6px)':undefined}}>
      <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>{label}</div>
      {children}
    </div>
  )
}

export default function BiometricIntegrationPage() {
  const [devices,  setDevices]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [msg,      setMsg]      = useState({text:'',type:'ok'})
  const [showAdd,  setShowAdd]  = useState(false)
  const [editDev,  setEditDev]  = useState(null)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [testing,  setTesting]  = useState({})
  const [syncing,  setSyncing]  = useState({})
  const [saving,   setSaving]   = useState(false)
  const [tab,      setTab]      = useState('devices')

  const s = _getSession(); const company = s?.company || {}
  const notify = (text, type='ok') => { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:'ok'}),4000) }

  const load = useCallback(async () => {
    const token = localStorage.getItem('access_token')||s?.token||''
    const slug  = s?.company?.slug||''
    if(!token||!slug){ setLoading(false); return }
    setLoading(true)
    try {
      const d = await apiFetch('/api/v1/biometric/devices')
      setDevices(d.data?.devices || d.devices || d.data || [])
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(()=>{ load() },[load])

  const openAdd  = () => { setForm(EMPTY_FORM); setEditDev(null); setShowAdd(true) }
  const openEdit = (d) => { setForm({...d,password:''}); setEditDev(d); setShowAdd(true) }

  const testDevice = async (dev) => {
    setTesting(p=>({...p,[dev.id]:true}))
    try {
      const d = await apiFetch(`/api/v1/biometric/devices/${dev.id}/test`, {method:'POST'})
      const ok = d.data?.reachable ?? d.reachable ?? false
      notify(ok?`✅ ${dev.device_name} reachable (${d.data?.latency_ms||d.latency_ms||'?'}ms)`
               :`❌ ${dev.device_name}: ${d.data?.message||d.message||'Cannot connect'}`, ok?'ok':'err')
      setDevices(prev=>prev.map(dv=>dv.id===dev.id
        ?{...dv,last_sync_status:ok?'ok':'error',last_error:ok?null:(d.data?.message||d.message)}:dv))
    } catch(e) {
      notify(`❌ ${dev.device_name}: ${e.message}`,'err')
      setDevices(prev=>prev.map(dv=>dv.id===dev.id?{...dv,last_sync_status:'error',last_error:e.message}:dv))
    } finally { setTesting(p=>({...p,[dev.id]:false})) }
  }

  const syncDevice = async (dev) => {
    setSyncing(p=>({...p,[dev.id]:true}))
    try {
      const d = await apiFetch(`/api/v1/biometric/devices/${dev.id}/sync`, {method:'POST'})
      const cnt = d.data?.pulled ?? d.pulled ?? 0
      notify(`✅ Synced ${cnt} punches from ${dev.device_name}`)
      setDevices(prev=>prev.map(dv=>dv.id===dev.id
        ?{...dv,last_sync_status:'ok',last_sync_count:cnt,last_sync_at:new Date().toLocaleString()}:dv))
    } catch(e) { notify(`⚠️ Sync failed: ${e.message}`,'err') }
    finally { setSyncing(p=>({...p,[dev.id]:false})) }
  }

  const saveDevice = async () => {
    if(!form.device_name||!form.device_type){notify('Device name and type are required','err');return}
    setSaving(true)
    try {
      const url    = editDev ? `/api/v1/biometric/devices/${editDev.id}` : '/api/v1/biometric/devices'
      const method = editDev ? 'PUT' : 'POST'
      await apiFetch(url, {method, body:JSON.stringify(form)})
      notify(editDev?`✅ ${form.device_name} updated`:`✅ ${form.device_name} added`)
      setShowAdd(false); setEditDev(null); setForm(EMPTY_FORM); load()
    } catch(e) { notify(`❌ ${e.message}`,'err') }
    finally { setSaving(false) }
  }

  const removeDevice = async (dev) => {
    if(!window.confirm(`Remove ${dev.device_name} from ${company?.name}?`)) return
    try {
      await apiFetch(`/api/v1/biometric/devices/${dev.id}`, {method:'DELETE'})
      setDevices(p=>p.filter(d=>d.id!==dev.id))
      notify(`${dev.device_name} removed`)
    } catch(e) { notify(`❌ ${e.message}`,'err') }
  }

  const selType     = DEVICE_TYPES.find(t=>t.id===form.device_type)
  const totalOnline = devices.filter(d=>d.last_sync_status==='ok').length
  const totalPunch  = devices.reduce((s,d)=>s+(d.punches_today||0),0)

  if(loading) return(
    <div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}>
      <div style={{fontSize:30,marginBottom:10}}>⟳</div>
      <div style={{fontSize:12,fontWeight:600}}>Loading biometric devices for {company?.name}...</div>
    </div>
  )

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:'#f8fafc',minHeight:'100vh',color:'#0f172a'}}>
      {msg.text&&(
        <div style={{position:'fixed',bottom:20,right:20,zIndex:9999,padding:'10px 18px',borderRadius:10,
          background:msg.type==='err'?'#fef2f2':'#f0fdf4',
          border:`1px solid ${msg.type==='err'?'#fecaca':'#bbf7d0'}`,
          color:msg.type==='err'?'#dc2626':'#065f46',fontSize:11,
          boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:380}}>{msg.text}</div>
      )}

      {/* Header */}
      <div style={{background:G,padding:'18px 24px',marginBottom:20,boxShadow:'0 4px 20px rgba(3,105,161,.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
              <span style={{fontSize:22}}>🔐</span>
              <div>
                <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Biometric Integration Hub</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>
                  {company?.name} · Device setup, testing & attendance sync — data isolated per tenant
                </div>
              </div>
            </div>
          </div>
          <button onClick={openAdd} style={{padding:'9px 18px',borderRadius:10,border:'2px solid rgba(255,255,255,.6)',
            background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            ＋ Add Device
          </button>
        </div>
        {/* KPI strip */}
        <div style={{display:'flex',gap:16,marginTop:14,flexWrap:'wrap'}}>
          {[
            ['🔌','Total Devices',devices.length,'#fff'],
            ['✅','Online',totalOnline,'#86efac'],
            ['❌','Error',devices.filter(d=>d.last_sync_status==='error').length,'#fca5a5'],
            ['👉','Punches Today',totalPunch,'#bfdbfe'],
          ].map(([icon,label,val,color])=>(
            <div key={label} style={{background:'rgba(255,255,255,.12)',borderRadius:10,padding:'8px 16px',textAlign:'center',minWidth:90}}>
              <div style={{fontSize:11,fontWeight:900,color}}>{icon} {val}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.7)',marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:'0 24px 24px'}}>
        {error&&<div style={{padding:'10px 16px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,fontSize:12,color:'#dc2626',marginBottom:14}}>⚠️ {error}</div>}

        {/* Tabs */}
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:10,marginBottom:16,width:'fit-content'}}>
          {[['devices','🔌 Devices'],['setup','⚙️ Setup Guide'],['vendors','📦 Supported Devices']].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)}
              style={{padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,
                fontWeight:tab===v?700:400,background:tab===v?'#fff':'transparent',
                color:tab===v?'#0f172a':'#64748b',boxShadow:tab===v?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
              {l}
            </button>
          ))}
        </div>

        {/* Devices Tab */}
        {tab==='devices'&&(
          devices.length===0?(
            <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:16,border:'1px solid #e2e8f0'}}>
              <div style={{fontSize:56,marginBottom:16}}>🔐</div>
              <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:6}}>No biometric devices yet</div>
              <div style={{fontSize:12,color:'#94a3b8',marginBottom:20,maxWidth:400,margin:'0 auto 20px'}}>
                Add your company's biometric devices to start collecting attendance automatically.<br/>
                Each device is scoped to <strong>{company?.name}</strong> — completely isolated from other companies.
              </div>
              <button onClick={openAdd} style={{padding:'10px 24px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                ＋ Add First Device
              </button>
            </div>
          ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:14}}>
              {devices.map((dev,i)=>{
                const dt  = DEVICE_TYPES.find(t=>t.id===dev.device_type)||{label:dev.device_type,icon:'🔌',color:A}
                const sc  = STATUS_CFG[dev.last_sync_status||'unknown']||STATUS_CFG.unknown
                return(
                  <div key={dev.id||i} style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',
                    boxShadow:'0 2px 8px rgba(0,0,0,.04)',overflow:'hidden'}}>
                    <div style={{background:`${dt.color}08`,padding:'12px 16px',borderBottom:'1px solid #e2e8f0',
                      display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                          <span style={{fontSize:18}}>{dt.icon}</span>
                          <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{dev.device_name}</div>
                        </div>
                        <div style={{fontSize:10,color:'#64748b'}}>{dt.label} · {dev.model||'—'}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{dev.location||''}</div>
                      </div>
                      <span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:20,
                        background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,flexShrink:0}}>{sc.label}</span>
                    </div>
                    <div style={{padding:'12px 16px'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                        {[
                          ['IP / Port', dev.device_ip?(dev.device_port?`${dev.device_ip}:${dev.device_port}`:dev.device_ip):'N/A (Cloud/Mobile)'],
                          ['Punches Today', dev.punches_today??0],
                          ['Last Sync', dev.last_sync_at||'Never'],
                          ['Sync Count', dev.last_sync_count??'—'],
                        ].map(([k,v])=>(
                          <div key={k}>
                            <div style={{fontSize:9,color:'#94a3b8'}}>{k}</div>
                            <div style={{fontSize:11,fontWeight:600,color:'#0f172a'}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {dev.last_error&&(
                        <div style={{padding:'6px 10px',background:'#fef2f2',borderRadius:8,fontSize:9,color:'#dc2626',marginBottom:10}}>
                          ⚠️ {dev.last_error}
                        </div>
                      )}
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <button onClick={()=>testDevice(dev)} disabled={!!testing[dev.id]}
                          style={{flex:1,padding:'6px',borderRadius:8,border:`1px solid ${A}`,
                            background:testing[dev.id]?'#f1f5f9':'#fff',color:A,fontSize:9,fontWeight:700,cursor:'pointer'}}>
                          {testing[dev.id]?'Testing...':'🔍 Test'}
                        </button>
                        <button onClick={()=>syncDevice(dev)} disabled={!!syncing[dev.id]}
                          style={{flex:1,padding:'6px',borderRadius:8,border:`1px solid ${A}`,
                            background:syncing[dev.id]?A:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer',opacity:syncing[dev.id]?.7:1}}>
                          {syncing[dev.id]?'Syncing...':'🔄 Sync'}
                        </button>
                        <button onClick={()=>openEdit(dev)}
                          style={{padding:'6px 10px',borderRadius:8,border:'1px solid #e2e8f0',
                            background:'#f8fafc',color:'#374151',fontSize:9,fontWeight:700,cursor:'pointer'}}>✏️</button>
                        <button onClick={()=>removeDevice(dev)}
                          style={{padding:'6px 10px',borderRadius:8,border:'1px solid #fecaca',
                            background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,cursor:'pointer'}}>🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* Setup Guide Tab */}
        {tab==='setup'&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
            {DEVICE_TYPES.map(dt=>(
              <div key={dt.id} style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 18px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <span style={{fontSize:24}}>{dt.icon}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{dt.label}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{dt.desc}</div>
                  </div>
                </div>
                {dt.port&&<div style={{fontSize:10,color:'#64748b',marginBottom:8}}>Default port: <strong>{dt.port}</strong></div>}
                                <div style={{fontSize:10,color:'#475569',lineHeight:1.8}}>
                  {({
                    zkteco:  ['Connect device to same LAN as server','Get IP from device → Communication → Network','Enable UDP sync in device settings',`Add device here with IP + port ${dt.port||4370}`,'Click Test to verify, then click Sync'],
                    suprema: ['Install BioStar 2 server or use direct SDK','Set port to 51211 in device network settings','Add device here with IP + port','Enter device admin credentials','Test connection then enable auto-sync'],
                    realtime:['Access device web interface at device IP','Enable ADMS push mode in Communication','Set server URL to your eLogix server',`Add device here with IP + port ${dt.port||4370}`,'Test and sync punches'],
                    anviz:   ['Access device web interface at device IP','Enable TCP/IP communication mode','Note device IP from network settings',`Add device here with IP + port ${dt.port||5010}`,'Test connection then configure auto-sync'],
                    faceid:  ['Create account on Face ID cloud portal','Obtain API key from developer settings','Add device here — set port to 443','Enter API key in the password field','Cloud syncs automatically every 5 min'],
                    gps:     ['Install eLogix mobile app on employee phones','Enable GPS attendance in app settings','Employees tap In/Out within geo-fence','Add GPS device here to track in dashboard','Punches auto-sync via mobile data'],
                    qr:      ['Generate employee QR codes from HR module','Print or share QR codes digitally','Set up QR scanner at entry points','Add QR scanner as device here','Scan logs sync automatically via eLogix'],
                    manual:  ['Download attendance template from HR module','Fill punch data from legacy device manually','Upload via Import in Biometric Attendance','System maps employee IDs automatically','Best for offline devices or one-time imports'],
                  }[dt.id]||['Contact your device vendor for integration guide','Ensure device is on the same network','Configure push/pull sync to eLogix server','Add device IP and port here','Test connection and enable auto-sync']).map((step,si)=>(
                    <div key={si} style={{display:'flex',gap:6,marginBottom:4}}>
                      <span style={{fontSize:9,fontWeight:800,color:dt.color,flexShrink:0,width:14}}>{si+1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Supported Vendors Tab */}
        {tab==='vendors'&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
            {DEVICE_TYPES.map(dt=>(
              <div key={dt.id} onClick={()=>{setForm(f=>({...f,device_type:dt.id,device_port:dt.port||''}));setTab('devices');openAdd()}}
                style={{background:'#fff',borderRadius:14,border:`2px solid ${dt.color}20`,padding:'16px',
                  cursor:'pointer',textAlign:'center',transition:'all .2s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=dt.color}
                onMouseLeave={e=>e.currentTarget.style.borderColor=`${dt.color}20`}>
                <div style={{fontSize:36,marginBottom:10}}>{dt.icon}</div>
                <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{dt.label}</div>
                <div style={{fontSize:10,color:'#64748b',marginTop:4}}>{dt.desc}</div>
                {dt.port&&<div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>Port: {dt.port}</div>}
                <button style={{marginTop:10,padding:'5px 14px',borderRadius:8,border:'none',
                  background:dt.color,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                  + Add {dt.label}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Drawer */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'flex-end'}}>
          <div style={{background:'#fff',width:460,height:'100vh',overflow:'auto',
            boxShadow:'-4px 0 20px rgba(0,0,0,.15)',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontSize:15,fontWeight:800}}>{editDev?'Edit Device':'Add Biometric Device'}</div>
                <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Scoped to: {company?.name}</div>
              </div>
              <button onClick={()=>setShowAdd(false)} style={{fontSize:18,background:'none',border:'none',cursor:'pointer',color:'#94a3b8'}}>✕</button>
            </div>

            <Field label="Device Type *">
              <select value={form.device_type} onChange={e=>{const dt=DEVICE_TYPES.find(t=>t.id===e.target.value);setForm(p=>({...p,device_type:e.target.value,device_port:dt?.port||p.device_port}))}} style={{...inp}}>
                <option value="">— Select device type —</option>
                {DEVICE_TYPES.map(dt=><option key={dt.id} value={dt.id}>{dt.icon} {dt.label} — {dt.desc}</option>)}
              </select>
            </Field>

            {selType&&(
              <div style={{padding:'8px 12px',background:`${selType.color}08`,borderRadius:8,border:`1px solid ${selType.color}20`,marginBottom:12,fontSize:10,color:'#64748b'}}>
                {selType.icon} {selType.desc}
                {selType.port&&<span style={{marginLeft:8,fontWeight:700}}>Default port: {selType.port}</span>}
              </div>
            )}

            <Field label="Device Name *">
              <input value={form.device_name} onChange={e=>setForm(p=>({...p,device_name:e.target.value}))} placeholder="e.g. Main Entrance, Gate A" style={{...inp}}/>
            </Field>
            <Field label="Location">
              <input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="e.g. Ground Floor Reception" style={{...inp}}/>
            </Field>
            <Field label="Model">
              <input value={form.model} onChange={e=>setForm(p=>({...p,model:e.target.value}))} placeholder="e.g. ZK9500, BioStation A2" style={{...inp}}/>
            </Field>

            {selType&&selType.port!==null&&(
              <div style={{display:'flex',gap:12}}>
                <Field label="Device IP Address" half>
                  <input value={form.device_ip} onChange={e=>setForm(p=>({...p,device_ip:e.target.value}))} placeholder="192.168.1.100" style={{...inp}}/>
                </Field>
                <Field label="Port" half>
                  <input type="number" value={form.device_port} onChange={e=>setForm(p=>({...p,device_port:+e.target.value}))} placeholder={selType?.port||''} style={{...inp}}/>
                </Field>
              </div>
            )}

            <div style={{display:'flex',gap:12}}>
              <Field label="Admin Username" half>
                <input value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value}))} placeholder="admin" style={{...inp}}/>
              </Field>
              <Field label="Password / API Key" half>
                <input type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="••••••••" style={{...inp}}/>
              </Field>
            </div>

            <Field label="Auto-Sync Interval (minutes)">
              <select value={form.sync_interval_min} onChange={e=>setForm(p=>({...p,sync_interval_min:+e.target.value}))} style={{...inp}}>
                {[1,2,5,10,15,30,60].map(m=><option key={m} value={m}>{m} {m===1?'minute':'minutes'}</option>)}
              </select>
            </Field>
            <Field label="Serial Number">
              <input value={form.serial_number} onChange={e=>setForm(p=>({...p,serial_number:e.target.value}))} placeholder="Optional" style={{...inp}}/>
            </Field>
            <Field label="Notes">
              <textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Additional notes" style={{...inp,resize:'vertical'}}/>
            </Field>

            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:11,cursor:'pointer',marginBottom:16}}>
              <input type="checkbox" checked={!!form.use_ssl} onChange={e=>setForm(p=>({...p,use_ssl:e.target.checked}))} style={{width:15,height:15}}/>
              Use SSL / HTTPS connection
            </label>

            <div style={{display:'flex',gap:10}}>
              <button onClick={saveDevice} disabled={saving} style={{flex:1,padding:'10px',borderRadius:10,border:'none',
                background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>
                {saving?'Saving...':(editDev?'Update Device':'Add Device')}
              </button>
              <button onClick={()=>setShowAdd(false)} style={{padding:'10px 18px',borderRadius:10,
                border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

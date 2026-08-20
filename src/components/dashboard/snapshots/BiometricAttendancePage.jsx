// FILE: src/components/dashboard/snapshots/BiometricAttendancePage.jsx
// eLogix HRMS — Per-Tenant Biometric Device Management
// Each tenant manages their OWN devices — Zkteco, Suprema, RealTime, Face ID, etc.
// Data isolated by company_id at API + database level
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'
import { eLogixAPI } from '../../../utils/api.js'

const A  = '#0369a1'
const G  = 'linear-gradient(135deg,#0c4a6e,#0369a1,#38bdf8)'

const DEVICE_TYPES = [
  { id:'zkteco',   label:'ZKTeco',        icon:'🔐', port:4370,  desc:'ZKTeco fingerprint / face devices' },
  { id:'suprema',  label:'Suprema',       icon:'👁',  port:51211, desc:'Suprema BioStation series' },
  { id:'realtime', label:'RealTime',      icon:'⏱',  port:4370,  desc:'RealTime biometric devices (Nepal)' },
  { id:'faceid',   label:'Face ID Cloud', icon:'🤳', port:443,   desc:'Cloud-based face recognition' },
  { id:'gps',      label:'GPS / Mobile',  icon:'📍', port:null,  desc:'GPS attendance via mobile app' },
  { id:'qr',       label:'QR Scanner',    icon:'📱', port:null,  desc:'QR code based attendance' },
  { id:'manual',   label:'Manual / Excel',icon:'📋', port:null,  desc:'Manual punch import via Excel' },
]

const STATUS_CFG = {
  ok:      { color:'#16a34a', bg:'#f0fdf4', label:'✅ Online' },
  error:   { color:'#dc2626', bg:'#fef2f2', label:'❌ Error'  },
  pending: { color:'#d97706', bg:'#fffbeb', label:'⏳ Pending' },
  timeout: { color:'#dc2626', bg:'#fef2f2', label:'⏰ Timeout' },
}

export default function BiometricAttendancePage() {
  const { currentPersona } = useApp()
  const [devices,    setDevices]    = useState([])
  const [punches,    setPunches]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [syncing,    setSyncing]    = useState({})
  const [testing,    setTesting]    = useState({})
  const [showAdd,    setShowAdd]    = useState(false)
  const [editDev,    setEditDev]    = useState(null)
  const [tab,        setTab]        = useState('devices')
  const [msg,        setMsg]        = useState('')
  const [msgType,    setMsgType]    = useState('ok')
  const [punchDate,  setPunchDate]  = useState(new Date().toISOString().split('T')[0])

  const [form, setForm] = useState({
    device_name:'', device_type:'zkteco', model:'', serial_no:'',
    location:'', device_ip:'', device_port:4370,
    api_key:'', username:'', password:'', comm_key:'',
    sync_interval_min:5,
  })

  const notify = (m, type='ok') => {
    setMsg(m); setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }
  const sf = (k, v) => setForm(p => ({...p, [k]: v}))

  // ── Fetch devices from API ──────────────────────────────────
  const loadDevices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/biometric/devices', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('elogix_token')}` }
      })
      if (res.ok) {
        const d = await res.json()
        setDevices(d.data?.devices || d.devices || [])
      }
    } catch {
      // Dev fallback
      setDevices([
        { id:'dev-1', device_name:'Main Entrance', device_type:'zkteco',
          model:'ZK9500', location:'Ground Floor - Reception',
          device_ip:'192.168.1.100', device_port:4370,
          last_sync_status:'ok', last_sync_at:'2083-04-20 08:00',
          last_sync_count:342, is_active:true, punches_today:87 },
        { id:'dev-2', device_name:'Server Room', device_type:'suprema',
          model:'BioStation A2', location:'4th Floor - IT Room',
          device_ip:'192.168.1.105', device_port:51211,
          last_sync_status:'error', last_sync_at:'2083-04-19 18:00',
          last_sync_count:0, is_active:true, punches_today:0,
          last_error:'Connection timeout after 5s' },
        { id:'dev-3', device_name:'GPS - Field Team', device_type:'gps',
          model:'Mobile App', location:'Remote / Field',
          device_ip:null, device_port:null,
          last_sync_status:'ok', last_sync_at:'2083-04-20 09:15',
          last_sync_count:28, is_active:true, punches_today:28 },
      ])
    } finally { setLoading(false) }
  }, [])

  // ── Fetch punch logs ────────────────────────────────────────
  const loadPunches = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/biometric/punches?from=${punchDate}&to=${punchDate}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('elogix_token')}` }}
      )
      if (res.ok) {
        const d = await res.json()
        setPunches(d.data?.punches || d.punches || [])
      }
    } catch {
      setPunches([
        { id:'p1', employee_id:'ELX-HIMA-0001', punch_time:'2083-04-20 09:02',
          punch_type:'IN',  source:'biometric', device_id:'dev-1' },
        { id:'p2', employee_id:'ELX-HIMA-0002', punch_time:'2083-04-20 09:08',
          punch_type:'IN',  source:'biometric', device_id:'dev-1' },
        { id:'p3', employee_id:'ELX-HIMA-0001', punch_time:'2083-04-20 13:02',
          punch_type:'OUT', source:'biometric', device_id:'dev-1' },
        { id:'p4', employee_id:'ELX-FIELD-001', punch_time:'2083-04-20 08:45',
          punch_type:'IN',  source:'gps',      device_id:'dev-3',
          latitude:27.7172, longitude:85.3240 },
      ])
    }
  }, [punchDate])

  useEffect(() => { loadDevices() }, [loadDevices])
  useEffect(() => { if (tab === 'punches') loadPunches() }, [tab, loadPunches])

  // ── Test device ─────────────────────────────────────────────
  const testDevice = async (dev) => {
    setTesting(p => ({...p, [dev.id]: true}))
    try {
      const res = await fetch(`/api/v1/biometric/devices/${dev.id}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('elogix_token')}` }
      })
      const d = res.ok ? await res.json() : {}
      const ok = d.data?.connected ?? d.connected ?? false
      notify(ok ? `✅ ${dev.device_name} is reachable (${d.data?.latency_ms||d.latency_ms||'?'}ms)` : `❌ ${dev.device_name}: ${d.data?.message||d.message||'Cannot connect'}`, ok?'ok':'err')
      setDevices(prev => prev.map(dv => dv.id===dev.id
        ? {...dv, last_sync_status: ok?'ok':'error', last_error: ok?null:(d.data?.message||d.message)} : dv))
    } catch {
      notify(`❌ ${dev.device_name}: Cannot reach device`, 'err')
    } finally { setTesting(p => ({...p, [dev.id]: false})) }
  }

  // ── Sync device ─────────────────────────────────────────────
  const syncDevice = async (dev) => {
    setSyncing(p => ({...p, [dev.id]: true}))
    try {
      const res = await fetch(`/api/v1/biometric/devices/${dev.id}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('elogix_token')}` }
      })
      const d = res.ok ? await res.json() : {}
      const cnt = d.data?.pulled ?? d.pulled ?? 0
      notify(`✅ Synced ${cnt} punches from ${dev.device_name}`)
      setDevices(prev => prev.map(dv => dv.id===dev.id
        ? {...dv, last_sync_status:'ok', last_sync_count:cnt,
           last_sync_at:new Date().toLocaleString()} : dv))
    } catch { notify(`⚠️ Sync failed for ${dev.device_name}`, 'err') }
    finally { setSyncing(p => ({...p, [dev.id]: false})) }
  }

  // ── Add / Update device ─────────────────────────────────────
  const saveDevice = async () => {
    if (!form.device_name || !form.device_type) {
      notify('Device name and type are required', 'err'); return
    }
    try {
      const url    = editDev ? `/api/v1/biometric/devices/${editDev.id}` : '/api/v1/biometric/devices'
      const method = editDev ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method, headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('elogix_token')}`
        },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        notify(editDev ? `✅ ${form.device_name} updated` : `✅ ${form.device_name} added`)
        setShowAdd(false); setEditDev(null)
        setForm({ device_name:'', device_type:'zkteco', model:'', serial_no:'',
                  location:'', device_ip:'', device_port:4370,
                  api_key:'', username:'', password:'', comm_key:'', sync_interval_min:5 })
        loadDevices()
      } else { notify('Failed to save device', 'err') }
    } catch {
      // Dev mode — just add locally
      const newDev = { id:'dev-'+Date.now(), ...form,
        last_sync_status:'pending', is_active:true, punches_today:0 }
      setDevices(p => [...p, newDev])
      notify(`✅ ${form.device_name} added`)
      setShowAdd(false)
    }
  }

  const selType = DEVICE_TYPES.find(t => t.id === form.device_type)

  return (
    <div style={{ fontFamily:'system-ui,sans-serif',minHeight:'100%',background:'#f0f9ff' }}>
      {msg && (
        <div style={{ position:'fixed',bottom:20,right:20,zIndex:9999,
          background:msgType==='err'?'#fef2f2':'#f0fdf4',
          border:`1px solid ${msgType==='err'?'#fecaca':'#bbf7d0'}`,
          borderRadius:12,padding:'12px 20px',fontSize:11,fontWeight:700,
          color:msgType==='err'?'#dc2626':'#15803d',boxShadow:'0 4px 20px rgba(0,0,0,.12)'}}>
          {msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background:G,padding:'14px 20px',borderRadius:'0 0 14px 14px',marginBottom:14 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
          <div>
            <div style={{ fontSize:15,fontWeight:900,color:'#fff' }}>🔐 Biometric Attendance</div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2 }}>
              Your tenant's devices · {devices.filter(d=>d.is_active).length} active ·
              {devices.reduce((s,d)=>s+(d.punches_today||0),0)} punches today
            </div>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={() => { setShowAdd(true); setEditDev(null) }}
              style={{ padding:'8px 16px',borderRadius:9,border:'none',
                background:'rgba(255,255,255,.2)',color:'#fff',
                fontSize:11,fontWeight:800,cursor:'pointer' }}>
              + Add Device
            </button>
            <button onClick={loadDevices}
              style={{ padding:'8px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,.3)',
                background:'transparent',color:'#fff',fontSize:11,cursor:'pointer' }}>
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:'0 16px 20px' }}>
        {/* Tabs */}
        <div style={{ display:'flex',gap:6,marginBottom:14 }}>
          {[{id:'devices',label:'🔐 My Devices'},{id:'punches',label:'📋 Punch Logs'},{id:'setup',label:'⚙️ Setup Guide'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ padding:'7px 16px',borderRadius:20,border:'none',cursor:'pointer',
                fontSize:11,fontWeight:700,background:tab===t.id?A:'#fff',
                color:tab===t.id?'#fff':'#374151',boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ADD/EDIT DEVICE MODAL ── */}
        {(showAdd || editDev) && (
          <div style={{ background:'#fff',borderRadius:12,padding:20,
            boxShadow:'0 4px 20px rgba(0,0,0,.12)',marginBottom:14,
            border:'1.5px solid #bae6fd' }}>
            <div style={{ fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:16 }}>
              {editDev ? '✏️ Edit Device' : '+ Add Biometric Device'}
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12 }}>
              {/* Device Type */}
              <div>
                <label style={{ fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4 }}>
                  Device Type *
                </label>
                <select value={form.device_type} onChange={e=>{sf('device_type',e.target.value);sf('device_port',DEVICE_TYPES.find(t=>t.id===e.target.value)?.port||4370)}}
                  style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box' }}>
                  {DEVICE_TYPES.map(t=>(
                    <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
              {[
                ['Device Name','device_name','e.g. Main Entrance',true],
                ['Model','model','e.g. ZK9500'],
                ['Serial Number','serial_no',''],
                ['Location','location','e.g. Ground Floor - Reception'],
              ].map(([lb,k,ph,req])=>(
                <div key={k}>
                  <label style={{ fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4 }}>
                    {lb}{req&&<span style={{ color:'#dc2626' }}> *</span>}
                  </label>
                  <input value={form[k]} onChange={e=>sf(k,e.target.value)} placeholder={ph}
                    style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',
                      fontSize:11,outline:'none',boxSizing:'border-box' }}/>
                </div>
              ))}
              {selType?.port && <>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4 }}>Device IP Address</label>
                  <input value={form.device_ip} onChange={e=>sf('device_ip',e.target.value)} placeholder="192.168.1.100"
                    style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4 }}>Port</label>
                  <input value={form.device_port} onChange={e=>sf('device_port',parseInt(e.target.value)||4370)} type="number"
                    style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4 }}>Communication Key</label>
                  <input value={form.comm_key} onChange={e=>sf('comm_key',e.target.value)} placeholder="ZKTeco comm key (optional)"
                    style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box' }}/>
                </div>
              </>}
              <div>
                <label style={{ fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4 }}>Sync Every (minutes)</label>
                <select value={form.sync_interval_min} onChange={e=>sf('sync_interval_min',parseInt(e.target.value))}
                  style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box' }}>
                  {[1,2,5,10,15,30,60].map(v=><option key={v} value={v}>{v} {v===1?'minute':'minutes'}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex',gap:8,marginTop:16 }}>
              <button onClick={saveDevice}
                style={{ padding:'10px 24px',borderRadius:9,border:'none',
                  background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer' }}>
                💾 Save Device
              </button>
              <button onClick={()=>{setShowAdd(false);setEditDev(null)}}
                style={{ padding:'10px 18px',borderRadius:9,border:'1.5px solid #e2e8f0',
                  background:'#fff',fontSize:12,fontWeight:700,cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── DEVICES TAB ── */}
        {tab==='devices' && (
          loading ? (
            <div style={{ textAlign:'center',padding:40,color:'#94a3b8' }}>
              Loading devices...
            </div>
          ) : devices.length === 0 ? (
            <div style={{ background:'#fff',borderRadius:12,padding:'48px',textAlign:'center',
              boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:48,marginBottom:12 }}>🔐</div>
              <div style={{ fontSize:14,fontWeight:700,color:'#374151',marginBottom:6 }}>No biometric devices configured</div>
              <div style={{ fontSize:11,color:'#64748b',marginBottom:16 }}>
                Add your ZKTeco, Suprema, or other biometric devices to start tracking attendance
              </div>
              <button onClick={()=>setShowAdd(true)}
                style={{ padding:'10px 24px',borderRadius:9,border:'none',
                  background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer' }}>
                + Add First Device
              </button>
            </div>
          ) : (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12 }}>
              {devices.map(dev => {
                const dt   = DEVICE_TYPES.find(t=>t.id===dev.device_type) || {icon:'🔐',label:dev.device_type}
                const sc   = STATUS_CFG[dev.last_sync_status] || STATUS_CFG.pending
                const isSyncing = syncing[dev.id]
                const isTesting = testing[dev.id]
                return (
                  <div key={dev.id} style={{ background:'#fff',borderRadius:12,padding:16,
                    boxShadow:'0 2px 8px rgba(0,0,0,.06)',
                    border:`1.5px solid ${dev.last_sync_status==='error'?'#fecaca':'#e2e8f0'}` }}>
                    <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10 }}>
                      <div style={{ display:'flex',gap:10,alignItems:'center' }}>
                        <span style={{ fontSize:24 }}>{dt.icon}</span>
                        <div>
                          <div style={{ fontSize:13,fontWeight:800,color:'#0f172a' }}>{dev.device_name}</div>
                          <div style={{ fontSize:10,color:'#64748b' }}>{dt.label} · {dev.model||'—'}</div>
                        </div>
                      </div>
                      <span style={{ fontSize:9,padding:'3px 10px',borderRadius:20,fontWeight:700,
                        background:sc.bg,color:sc.color,height:'fit-content' }}>
                        {sc.label}
                      </span>
                    </div>
                    {/* Stats */}
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10 }}>
                      {[
                        ['📍 Location', dev.location||'Not set'],
                        ['🌐 IP', dev.device_ip ? `${dev.device_ip}:${dev.device_port||4370}` : 'N/A (GPS/QR)'],
                        ['📊 Today', `${dev.punches_today||0} punches`],
                        ['🔄 Last sync', dev.last_sync_at ? new Date(dev.last_sync_at).toLocaleTimeString() : 'Never'],
                        ['📥 Records', dev.last_sync_count||0],
                        ['⏱ Interval', `${dev.sync_interval_min||5} min`],
                      ].map(([lb,v])=>(
                        <div key={lb} style={{ padding:'7px 8px',background:'#f8fafc',borderRadius:7,border:'1px solid #f1f5f9' }}>
                          <div style={{ fontSize:9,color:'#94a3b8' }}>{lb}</div>
                          <div style={{ fontSize:10,fontWeight:700,color:'#334155',
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {dev.last_error && (
                      <div style={{ padding:'6px 10px',background:'#fef2f2',borderRadius:7,
                        fontSize:10,color:'#dc2626',marginBottom:8,border:'1px solid #fecaca' }}>
                        ⚠️ {dev.last_error}
                      </div>
                    )}
                    {/* Actions */}
                    <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                      <button onClick={()=>testDevice(dev)} disabled={isTesting}
                        style={{ padding:'6px 12px',borderRadius:7,border:'1px solid #e2e8f0',
                          background:'#f8fafc',fontSize:10,fontWeight:700,cursor:'pointer' }}>
                        {isTesting?'Testing...':'🔌 Test'}
                      </button>
                      {dev.device_ip && (
                        <button onClick={()=>syncDevice(dev)} disabled={isSyncing}
                          style={{ padding:'6px 12px',borderRadius:7,border:'1px solid #bae6fd',
                            background:'#eff6ff',color:A,fontSize:10,fontWeight:700,cursor:'pointer' }}>
                          {isSyncing?'Syncing...':'🔄 Sync Now'}
                        </button>
                      )}
                      <button onClick={()=>{setEditDev(dev);setForm({...dev});setShowAdd(false)}}
                        style={{ padding:'6px 12px',borderRadius:7,border:'1px solid #e2e8f0',
                          background:'#f8fafc',fontSize:10,fontWeight:700,cursor:'pointer' }}>
                        ✏️ Edit
                      </button>
                      <button onClick={async()=>{
                          if(!window.confirm(`Deactivate ${dev.device_name}?`)) return
                          try {
                            await fetch(`/api/v1/biometric/devices/${dev.id}`,{method:'DELETE',
                              headers:{'Authorization':`Bearer ${localStorage.getItem('elogix_token')}`}})
                          } catch {}
                          setDevices(p=>p.filter(d=>d.id!==dev.id))
                          notify(`${dev.device_name} removed`)
                        }}
                        style={{ padding:'6px 12px',borderRadius:7,border:'1px solid #fecaca',
                          background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer' }}>
                        🗑 Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── PUNCH LOGS TAB ── */}
        {tab==='punches' && (
          <div>
            <div style={{ display:'flex',gap:10,marginBottom:12,alignItems:'center',flexWrap:'wrap' }}>
              <input type="date" value={punchDate} onChange={e=>setPunchDate(e.target.value)}
                style={{ padding:'8px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11 }}/>
              <button onClick={loadPunches}
                style={{ padding:'8px 16px',borderRadius:9,border:'none',background:A,
                  color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer' }}>
                🔍 Load Punches
              </button>
              <span style={{ fontSize:11,color:'#64748b' }}>{punches.length} records found</span>
            </div>
            <div style={{ background:'#fff',borderRadius:12,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Employee ID','Punch Time','Type','Source','Device','Location'].map(h=>(
                      <th key={h} style={{ padding:'10px 12px',textAlign:'left',fontSize:10,
                        fontWeight:700,color:'#64748b',borderBottom:'2px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {punches.length===0 ? (
                    <tr><td colSpan={6} style={{ padding:'32px',textAlign:'center',color:'#94a3b8' }}>
                      No punch records for this date
                    </td></tr>
                  ) : punches.map((p,i)=>(
                    <tr key={p.id} style={{ background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'9px 12px',fontWeight:700 }}>{p.employee_id}</td>
                      <td style={{ padding:'9px 12px',color:'#334155' }}>{new Date(p.punch_time).toLocaleString()}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:9,padding:'2px 8px',borderRadius:10,fontWeight:700,
                          background:p.punch_type==='IN'?'#f0fdf4':'#fef2f2',
                          color:p.punch_type==='IN'?'#16a34a':'#dc2626' }}>
                          {p.punch_type==='IN'?'▶ IN':'◀ OUT'}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px',color:'#64748b' }}>
                        {p.source==='gps'?'📍 GPS':p.source==='biometric'?'🔐 Biometric':'📱 '+p.source}
                      </td>
                      <td style={{ padding:'9px 12px',color:'#64748b',fontSize:10 }}>
                        {devices.find(d=>d.id===p.device_id)?.device_name||p.device_id||'—'}
                      </td>
                      <td style={{ padding:'9px 12px',color:'#64748b',fontSize:10 }}>
                        {p.latitude ? `${p.latitude?.toFixed(4)}, ${p.longitude?.toFixed(4)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SETUP GUIDE TAB ── */}
        {tab==='setup' && (
          <div style={{ display:'grid',gap:12 }}>
            {[
              { icon:'🔐', title:'ZKTeco Setup', color:'#0369a1', bg:'#eff6ff',
                steps:[
                  'Connect ZKTeco device to same network as eLogix server',
                  'Note the device IP: Settings → Network → IP Address (default: 192.168.1.201)',
                  'Note the communication key: Settings → Advanced → Comm Key (default: 0)',
                  'Click "+ Add Device" → select ZKTeco → enter IP, port (4370), Comm Key',
                  'Click "Test" to verify → click "Sync Now" to pull attendance data',
                  'Set sync interval to auto-pull every 5 minutes',
                ]},
              { icon:'👁', title:'Suprema BioStation Setup', color:'#7c3aed', bg:'#f5f3ff',
                steps:[
                  'Ensure Suprema device is on same network — check device admin panel for IP',
                  'Enable BioStar API in device settings: Configuration → Server → BioStar',
                  'Click "+ Add Device" → select Suprema → enter IP, port (51211)',
                  'Enter Suprema admin username and password',
                  'Test connection — the device will show "BioStar Connected" on screen',
                ]},
              { icon:'📍', title:'GPS / Mobile Attendance', color:'#059669', bg:'#f0fdf4',
                steps:[
                  'No physical device needed — employees use eLogix mobile app',
                  'Enable GPS in employee phones: Settings → Location → Always',
                  'HR sets geofence: Attendance → GPS Setup → Define Work Location radius',
                  'Employees punch IN/OUT via app — GPS coordinates auto-recorded',
                  'Real-time map view available in Live Attendance page',
                ]},
              { icon:'🔌', title:'Webhook / API Integration', color:'#d97706', bg:'#fffbeb',
                steps:[
                  'For custom or cloud biometric systems, use the webhook endpoint:',
                  'POST /api/v1/biometric/punch with header: X-Device-Secret: <your-key>',
                  'Body: { device_serial, employee_id, punch_time, type: "IN"|"OUT" }',
                  'Your device sends punches in real-time — no polling needed',
                  'Get your webhook secret from Settings → Integrations → API Keys',
                ]},
            ].map(guide=>(
              <div key={guide.title} style={{ background:'#fff',borderRadius:12,padding:16,
                boxShadow:'0 2px 8px rgba(0,0,0,.06)',borderLeft:`4px solid ${guide.color}` }}>
                <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
                  <span style={{ fontSize:24 }}>{guide.icon}</span>
                  <div style={{ fontSize:13,fontWeight:800,color:guide.color }}>{guide.title}</div>
                </div>
                {guide.steps.map((step,i)=>(
                  <div key={i} style={{ display:'flex',gap:10,marginBottom:8,alignItems:'flex-start' }}>
                    <span style={{ width:20,height:20,borderRadius:'50%',background:guide.bg,
                      color:guide.color,fontSize:10,fontWeight:900,flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center' }}>{i+1}</span>
                    <span style={{ fontSize:11,color:'#374151',lineHeight:1.5 }}>{step}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

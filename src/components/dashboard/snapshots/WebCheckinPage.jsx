// FILE: src/components/dashboard/snapshots/WebCheckinPage.jsx
// eLogix HRMS — Web Check-In (Employee Self-Service)
// COMPLETE REWRITE — Real tenant API. Employee clocks IN via browser.
// Shows current status, shift info, photo capture, location validation.
// API: POST /api/v1/attendance/web-checkin
//      GET  /api/v1/attendance/my-today
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useRef } from 'react'

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch { return {} }
}
function _authH() {
  const s=_getSession(); const token=localStorage.getItem('access_token')||s?.token||''; const slug=s?.company?.slug||''
  return { 'Authorization':`Bearer ${token}`, 'X-Tenant-Slug':slug, 'Content-Type':'application/json' }
}

const G  = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#38bdf8 100%)'
const A  = '#0369a1'
const GR = '#10b981'

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(()=>{ const iv=setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(iv) },[])
  return (
    <div style={{textAlign:'center'}}>
      <div style={{fontSize:42,fontWeight:900,color:'#0f172a',letterSpacing:2,fontVariantNumeric:'tabular-nums'}}>
        {time.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
      </div>
      <div style={{fontSize:13,color:'#64748b',marginTop:4}}>
        {time.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
      </div>
    </div>
  )
}

export default function WebCheckinPage() {
  const [today,     setToday]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [checking,  setChecking]  = useState(false)
  const [error,     setError]     = useState(null)
  const [msg,       setMsg]       = useState('')
  const [msgType,   setMsgType]   = useState('ok')
  const [location,  setLocation]  = useState(null)
  const [locError,  setLocError]  = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [photo,     setPhoto]     = useState(null)
  const videoRef = useRef(null)
  const canvasRef= useRef(null)
  const streamRef= useRef(null)

  const s       = _getSession()
  const company = s?.company || {}
  const user    = s?.user    || {}

  const toast = (m,type='ok',d=4000)=>{ setMsg(m); setMsgType(type); setTimeout(()=>setMsg(''),d) }

  // Get today's attendance record
  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){ setLoading(false); return }
    fetch('/api/v1/attendance/my-today',{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));return null};return r.ok?r.json():null})
      .then(d=>d&&setToday(d.data||d))
      .catch(()=>{})
      .finally(()=>setLoading(false))

    // Get geolocation
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos=>setLocation({ lat:pos.coords.latitude.toFixed(6), lng:pos.coords.longitude.toFixed(6), acc:Math.round(pos.coords.accuracy) }),
        ()=>setLocError('Location access denied — check browser permissions')
      )
    } else setLocError('Geolocation not supported in this browser')
  },[])

  const startCamera = async () => {
    setCapturing(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' } })
      streamRef.current = stream
      if(videoRef.current) videoRef.current.srcObject = stream
    } catch { toast('❌ Camera access denied','err'); setCapturing(false) }
  }

  const capturePhoto = () => {
    if(!canvasRef.current||!videoRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    canvasRef.current.width  = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8)
    setPhoto(dataUrl)
    streamRef.current?.getTracks().forEach(t=>t.stop())
    setCapturing(false)
    toast('✅ Photo captured')
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t=>t.stop())
    setCapturing(false)
  }

  const checkIn = async () => {
    if(!location){ toast('⚠️ Location required for web check-in','err'); return }
    setChecking(true)
    try {
      const body = {
        type       : 'IN',
        method     : 'web',
        lat        : location?.lat,
        lng        : location?.lng,
        accuracy_m : location?.acc,
        photo      : photo,
        user_agent : navigator.userAgent,
      }
      const r = await fetch('/api/v1/attendance/web-checkin',{method:'POST',headers:_authH(),body:JSON.stringify(body)})
      if(r.ok){
        const d = await r.json()
        setToday(prev=>({...prev, check_in:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}), status:'Present', ...d.data}))
        toast(`✅ Checked in at ${new Date().toLocaleTimeString()}`)
      } else {
        const d = await r.json().catch(()=>({}))
        toast(d.message||'❌ Check-in failed — try again','err')
      }
    } catch { toast('❌ Network error — check connection','err') }
    setChecking(false)
  }

  const isCheckedIn  = today?.check_in && !today?.check_out
  const isCheckedOut = today?.check_in && today?.check_out
  const statusColor  = isCheckedOut?'#10b981':isCheckedIn?'#0369a1':'#94a3b8'

  if(loading) return (
    <div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}>
      <div style={{fontSize:36,marginBottom:12}}>⟳</div>
      <div style={{fontSize:13,fontWeight:600}}>Loading attendance for {user?.name||company?.name||'you'}...</div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#f0f9ff',minHeight:'100vh'}}>

      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,
        background:msgType==='err'?'#fef2f2':'#f0fdf4',border:`1px solid ${msgType==='err'?'#fecaca':'#bbf7d0'}`,
        borderRadius:10,padding:'10px 18px',fontSize:12,fontWeight:600,
        color:msgType==='err'?'#dc2626':'#14532d',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:360}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(3,105,161,.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
              <span style={{fontSize:24}}>💻</span>
              <div>
                <h2 style={{fontSize:18,fontWeight:900,color:'#fff',margin:0}}>Web Check-In</h2>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · Browser-based attendance</div>
              </div>
            </div>
          </div>
          <div style={{background:'rgba(255,255,255,.12)',borderRadius:12,padding:'10px 18px',textAlign:'center'}}>
            <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginBottom:2}}>Today's Status</div>
            <div style={{fontSize:14,fontWeight:800,color:isCheckedOut?'#4ade80':isCheckedIn?'#93c5fd':'#e2e8f0'}}>
              {isCheckedOut?'✅ Completed':isCheckedIn?'🟢 On Duty':'⚫ Not Checked In'}
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,maxWidth:860,margin:'0 auto'}}>
        {/* Left: clock + status */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Clock */}
          <div style={{background:'#fff',borderRadius:16,padding:'28px 20px',border:'1px solid #e2e8f0',boxShadow:'0 2px 10px rgba(0,0,0,.06)',textAlign:'center'}}>
            <Clock/>
          </div>

          {/* Today's record */}
          <div style={{background:'#fff',borderRadius:16,padding:'20px',border:'1px solid #e2e8f0',boxShadow:'0 2px 10px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>📋 Today's Record</div>
            {[
              ['Employee', user?.name||today?.employee_name||'—'],
              ['Employee Code', user?.emp_code||today?.emp_code||'—'],
              ['Department', user?.dept||today?.dept||company?.name||'—'],
              ['Shift', today?.shift||today?.shift_name||'—'],
              ['Check-In', today?.check_in||'—'],
              ['Check-Out', today?.check_out||'—'],
              ['Duration', today?.duration||'—'],
              ['Overtime', today?.overtime||'—'],
              ['Status', today?.status||'Not Checked In'],
            ].map(([l,v],i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
                <span style={{color:'#64748b'}}>{l}</span>
                <span style={{fontWeight:700,color:l==='Status'?statusColor:'#0f172a'}}>{v}</span>
              </div>
            ))}
          </div>

          {/* Location status */}
          <div style={{background:location?'#f0fdf4':'#fef9c3',borderRadius:12,padding:'12px 16px',border:`1px solid ${location?'#bbf7d0':'#fde68a'}`,fontSize:11}}>
            {location
              ? <><div style={{fontWeight:700,color:'#14532d'}}>📍 Location Captured</div>
                  <div style={{color:'#166534',marginTop:4}}>{location.lat}, {location.lng} (±{location.acc}m)</div></>
              : <><div style={{fontWeight:700,color:'#92400e'}}>⚠️ {locError||'Getting location...'}</div>
                  <div style={{color:'#78350f',marginTop:4,fontSize:10}}>Location is required for web check-in</div></>
            }
          </div>
        </div>

        {/* Right: check-in action */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Selfie capture */}
          <div style={{background:'#fff',borderRadius:16,padding:'20px',border:'1px solid #e2e8f0',boxShadow:'0 2px 10px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:12}}>🤳 Selfie Verification</div>
            {photo ? (
              <div style={{textAlign:'center'}}>
                <img src={photo} alt="selfie" style={{width:'100%',borderRadius:10,maxHeight:180,objectFit:'cover'}}/>
                <button onClick={()=>setPhoto(null)} style={{marginTop:8,padding:'6px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer',color:'#64748b'}}>🔄 Retake</button>
              </div>
            ) : capturing ? (
              <div>
                <video ref={videoRef} autoPlay muted style={{width:'100%',borderRadius:10,maxHeight:180,objectFit:'cover'}}/>
                <canvas ref={canvasRef} style={{display:'none'}}/>
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button onClick={capturePhoto} style={{flex:1,padding:'8px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>📸 Capture</button>
                  <button onClick={stopCamera}   style={{padding:'8px 14px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer',color:'#64748b'}}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:40,marginBottom:10}}>📷</div>
                <div style={{fontSize:11,color:'#94a3b8',marginBottom:12}}>Optional: take a selfie for liveness verification</div>
                <button onClick={startCamera} style={{padding:'8px 20px',borderRadius:9,border:`1.5px solid ${A}`,background:'#f0f9ff',color:A,fontSize:11,fontWeight:700,cursor:'pointer'}}>📷 Start Camera</button>
              </div>
            )}
          </div>

          {/* Check-in / check-out button */}
          <div style={{background:'#fff',borderRadius:16,padding:'24px',border:'1px solid #e2e8f0',boxShadow:'0 2px 10px rgba(0,0,0,.06)',textAlign:'center'}}>
            {isCheckedOut ? (
              <div>
                <div style={{fontSize:36,marginBottom:10}}>✅</div>
                <div style={{fontSize:14,fontWeight:700,color:'#15803d',marginBottom:4}}>Work Day Complete</div>
                <div style={{fontSize:11,color:'#64748b'}}>
                  {today?.check_in} → {today?.check_out}
                  {today?.duration&&<div style={{marginTop:4}}>Duration: <strong>{today.duration}</strong></div>}
                </div>
              </div>
            ) : isCheckedIn ? (
              <div>
                <div style={{fontSize:36,marginBottom:10}}>🟢</div>
                <div style={{fontSize:13,fontWeight:700,color:A,marginBottom:4}}>You are checked in</div>
                <div style={{fontSize:11,color:'#64748b',marginBottom:16}}>Checked in at {today?.check_in}</div>
                <div style={{fontSize:10,color:'#94a3b8',marginBottom:14}}>Use the Web Check-Out page to end your shift</div>
              </div>
            ) : (
              <div>
                <div style={{fontSize:36,marginBottom:10}}>⚫</div>
                <div style={{fontSize:13,fontWeight:600,color:'#475569',marginBottom:16}}>Not checked in yet today</div>
                <button onClick={checkIn} disabled={checking||!location}
                  style={{width:'100%',padding:'14px',borderRadius:12,border:'none',fontSize:15,fontWeight:800,
                    cursor:(checking||!location)?'not-allowed':'pointer',
                    background:(checking||!location)?'#e2e8f0':G,color:(checking||!location)?'#94a3b8':'#fff',
                    boxShadow:(checking||!location)?'none':'0 4px 16px rgba(3,105,161,.35)',transition:'all .2s'}}>
                  {checking?'⟳ Checking In…':'✅ Check In Now'}
                </button>
                {!location&&<div style={{fontSize:10,color:'#ef4444',marginTop:8}}>Enable location to check in</div>}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:12,padding:'12px 16px',fontSize:11,color:'#0369a1'}}>
            💡 <strong>Web Check-In Records:</strong> IP address, browser, GPS coordinates and timestamp are captured. Records are validated against your assigned geo-fence zone.
          </div>
        </div>
      </div>
    </div>
  )
}

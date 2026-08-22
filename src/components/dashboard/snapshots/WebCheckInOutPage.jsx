// FILE: WebCheckInOutPage.jsx - Web Check-In & Out (Daily Attendance)
// Large color-changing clock-in button, live timer, IP/session capture, QR badge scan,
// auto break deduction for overtime calc

import { useState, useEffect } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const TODAY_LOG = [
  { id:'w1', employee:'Maya Pradhan', login:'09:05 AM', logout:'06:10 PM', ip:'202.51.74.12', session:'sess_8a92f1', total_hrs:8.6, breaks_deducted_min:30, status:'completed',
    impact_links:['Employee Movement'] },
  { id:'w2', employee:'Sanjay Karki', login:'08:50 AM', logout:null, ip:'202.51.74.18', session:'sess_3c71e9', total_hrs:null, breaks_deducted_min:0, status:'in_progress',
    impact_links:[] },
]

export default function WebCheckInOutPage() {
  const [checkedIn, setCheckedIn] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [log, setLog] = useState(TODAY_LOG)
  const [search, setSearch] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [ctx, setCtx] = useState(null)

  useEffect(()=>{
    if (!checkedIn) return
    const t = setInterval(()=>setElapsed(e=>e+1), 1000)
    return ()=>clearInterval(t)
  },[checkedIn])

  const formatTime = (s) => {
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const filtered = log.filter(l=>!search||l.employee.toLowerCase().includes(search.toLowerCase()))
  const inProgressCount = log.filter(l=>l.status==='in_progress').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💻" title="Web Check-In & Out"
        breadcrumb="Workforce Operations > Attendance Management > Daily Attendance"
        gradient={G}
        stats={[
          {icon:'💻',label:"Today's Sessions", value:log.length},
          {icon:'🔄',label:'In Progress',       value:inProgressCount},
          {icon:'✅',label:'Completed',         value:log.filter(l=>l.status==='completed').length},
          {icon:'☕',label:'Avg Break Deduct',  value:'30min'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      {/* Hero check-in widget */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:'36px 28px',marginBottom:20,textAlign:'center'}}>
        <div style={{fontSize:12,color:'#64748b',marginBottom:16}}>Your Status</div>
        <button onClick={()=>{setCheckedIn(!checkedIn); if(checkedIn) setElapsed(0)}}
          style={{width:160,height:160,borderRadius:'50%',border:'none',cursor:'pointer',
            background:checkedIn?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#94a3b8,#64748b)',
            color:'#fff',fontSize:15,fontWeight:900,boxShadow:checkedIn?'0 8px 30px rgba(16,185,129,.4)':'0 8px 30px rgba(100,116,139,.3)',
            transition:'all .4s',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6}}>
          <span style={{fontSize:28}}>{checkedIn?'🟢':'⚪'}</span>
          <span>{checkedIn?'Checked In':'Tap to Check In'}</span>
        </button>
        {checkedIn&&(
          <div style={{marginTop:20,fontSize:28,fontWeight:900,color:A,fontFamily:'monospace'}}>{formatTime(elapsed)}</div>
        )}
        <div style={{marginTop:18,display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>setShowQR(true)} style={{padding:'9px 18px',borderRadius:10,border:`1.5px solid ${A}`,background:'#fff',color:A,fontSize:11,fontWeight:700,cursor:'pointer'}}>📱 Scan QR Badge Instead</button>
          {checkedIn&&<button style={{padding:'9px 18px',borderRadius:10,border:'none',background:'#fffbeb',color:'#b45309',fontSize:11,fontWeight:700,cursor:'pointer'}}>☕ Start Break</button>}
        </div>
        <div style={{marginTop:14,fontSize:9,color:'#94a3b8'}}>IP: 202.51.74.{Math.floor(Math.random()*99)} . Session captured automatically . Browser-based, no app required</div>
      </div>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Tampering/falsifying web check-ins is classified as misconduct (Section 13). Each session captures exact timestamp, IP address, and browser session ID for an immutable audit trail. Breaks auto-deducted before overtime calculation.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{marginTop:14,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800,color:'#0f172a'}}>📋 Today's Web Sessions</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Employee','Login','Logout','IP Address','Session ID','Total Hrs','Status'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,fontWeight:800,color:A,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(l=>(
                <tr key={l.id} style={{borderBottom:'1px solid #f8fafc'}}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.employee,...l}})}}>
                  <td style={{padding:'9px 14px',fontWeight:700,color:'#0f172a'}}>{l.employee}</td>
                  <td style={{padding:'9px 14px',color:'#10b981',fontWeight:600}}>{l.login}</td>
                  <td style={{padding:'9px 14px',color:l.logout?'#ef4444':'#94a3b8',fontWeight:600}}>{l.logout||'Active'}</td>
                  <td style={{padding:'9px 14px',color:'#64748b',fontFamily:'monospace',fontSize:9}}>{l.ip}</td>
                  <td style={{padding:'9px 14px',color:'#94a3b8',fontFamily:'monospace',fontSize:9}}>{l.session}</td>
                  <td style={{padding:'9px 14px',fontWeight:700,color:A}}>{l.total_hrs?l.total_hrs+'h':'-'}</td>
                  <td style={{padding:'9px 14px'}}><span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,background:l.status==='completed'?'#f0fdf4':'#fffbeb',color:l.status==='completed'?'#15803d':'#b45309'}}>{l.status==='completed'?'Completed':'In Progress'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showQR&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowQR(false)}>
          <div style={{background:'#fff',borderRadius:20,padding:'32px',textAlign:'center',maxWidth:340}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:16}}>Scan Your Employee QR Badge</div>
            <div style={{width:200,height:200,margin:'0 auto',background:'#f8fafc',border:'2px dashed #cbd5e1',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:48}}>📷</div>
            <div style={{fontSize:11,color:'#64748b',marginTop:14}}>Point your camera at your unique employee QR code to check in/out instantly - same QR also used on assets, ID cards, and transaction receipts.</div>
            <button onClick={()=>setShowQR(false)} style={{marginTop:16,padding:'10px 24px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Close</button>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Session Detail',key:'view'},{icon:'✏',label:'Manual Correction',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

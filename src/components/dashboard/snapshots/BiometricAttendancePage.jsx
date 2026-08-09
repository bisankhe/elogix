// FILE: BiometricAttendancePage.jsx - Biometric Attendance (Daily Attendance)
// Daily punch log from biometric devices, liveness-verified, anti-buddy-punch alerts

import { useState } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A = '#334155'

const TODAY_PUNCHES = [
  { id:'b1', employee:'Gita Maharjan', device:'KTM HQ - Main Entrance', method:'face', time:'09:02 AM', type:'in', confidence:98.4, status:'matched',
    impact_links:['Live Attendance','Employee Movement'] },
  { id:'b2', employee:'Bikash Shrestha', device:'KTM HQ - Main Entrance', method:'fingerprint', time:'08:58 AM', type:'in', confidence:99.1, status:'matched',
    impact_links:[] },
  { id:'b3', employee:'Maya Pradhan', device:'KTM HQ - Main Entrance', method:'fingerprint', time:'09:15 AM', type:'in', confidence:97.8, status:'matched',
    impact_links:[] },
  { id:'b4', employee:'Unknown', device:'KTM HQ - Main Entrance', method:'fingerprint', time:'08:55 AM', type:'in', confidence:42.1, status:'rejected_no_match',
    impact_links:[] },
  { id:'b5', employee:'Hari Thapa', device:'KTM HQ - Main Entrance', method:'face', time:'06:00 AM', type:'out', confidence:96.5, status:'matched',
    impact_links:[] },
]

const STATUS_CFG = {matched:{c:'#10b981',bg:'#f0fdf4',icon:'✅'},rejected_no_match:{c:'#ef4444',bg:'#fef2f2',icon:'🚫'},rejected_low_confidence:{c:'#f59e0b',bg:'#fffbeb',icon:'⚠'}}
const METHOD_ICONS = {fingerprint:'👆',face:'😊',iris:'👁'}

export default function BiometricAttendancePage() {
  const [punches, setPunches] = useState(TODAY_PUNCHES)
  const [search, setSearch] = useState('')
  const [_nm, _snm] = useState("")
  const notify = m => { _snm(m); setTimeout(()=>_snm(""),3000) }
  const [ctx, setCtx] = useState(null)

  const filtered = punches.filter(p=>!search||p.employee.toLowerCase().includes(search.toLowerCase()))
  const matchedCount = punches.filter(p=>p.status==='matched').length
  const flaggedCount = punches.filter(p=>p.status!=='matched').length
  const avgConfidence = (punches.filter(p=>p.status==='matched').reduce((s,p)=>s+p.confidence,0)/matchedCount).toFixed(1)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="👆" title="Biometric Attendance"
        breadcrumb="Workforce Operations > Attendance Management > Daily Attendance"
        gradient={G}
        stats={[
          {icon:'👆',label:"Today's Punches", value:punches.length},
          {icon:'✅',label:'Matched',          value:matchedCount},
          {icon:'⚠',label:'Flagged',          value:flaggedCount},
          {icon:'🎯',label:'Avg Confidence',   value:avgConfidence+'%'},
        ]}
        onAdd={()=>notify('Biometric attendance logged')} addLabel="+ Log Biometric" onExcel={()=>{}}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔐</span>
        <div><strong>AI Liveness Detection:</strong> Contactless face/fingerprint matching prevents spoofing via photos or buddy-punching. Biometric templates are mathematically hashed - no actual images/fingerprints stored (privacy-by-design, GDPR-aligned). Punches retained 5 years per Nepal LA2074 Section 20.</div>
      </div>

      {_nm&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{_nm}</div>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:10,marginTop:14}}>
        {filtered.map(p=>{
          const sc = STATUS_CFG[p.status]
          return (
            <div key={p.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.employee,...p}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
              <div style={{width:42,height:42,borderRadius:12,background:`${sc.c}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{METHOD_ICONS[p.method]}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                  <span style={{fontSize:12,fontWeight:800,color:p.employee==='Unknown'?'#ef4444':'#0f172a'}}>{p.employee}</span>
                  <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'1px 8px',borderRadius:20}}>{sc.icon} {p.status==='matched'?'Matched':p.status==='rejected_no_match'?'No Match Found':'Low Confidence'}</span>
                  <span style={{background:p.type==='in'?'#f0fdf4':'#fef2f2',color:p.type==='in'?'#15803d':'#dc2626',fontSize:9,fontWeight:700,padding:'1px 8px',borderRadius:20}}>{p.type==='in'?'Clock In':'Clock Out'}</span>
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{p.device} . {p.method} . {p.time}</div>
              </div>
              <div style={{textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:14,fontWeight:900,color:p.confidence>=90?'#10b981':p.confidence>=70?'#f59e0b':'#ef4444'}}>{p.confidence}%</div>
                <div style={{fontSize:8,color:'#94a3b8'}}>CONFIDENCE</div>
              </div>
            </div>
          )
        })}
      </div>

      {flaggedCount>0&&(
        <div style={{marginTop:16,background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'12px 16px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#991b1b',marginBottom:4}}>⚠ Potential Buddy-Punching Attempts Detected</div>
          <div style={{fontSize:10,color:'#991b1b'}}>{flaggedCount} punch(es) today failed biometric matching. Review device logs and notify security/HR if pattern repeats.</div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full History',key:'view'},{icon:'✏',label:'Manual Override',key:'override'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

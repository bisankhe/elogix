// FILE: LiveAttendancePage.jsx - Live Attendance (Daily Attendance)
// Real-time ledger: who's clocked in/on break/absent, WebSocket-style live updates,
// discrepancy alerts (missed checkout), QR employee badge scan option

import { useState, useEffect } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const LIVE_FEED = [
  { id:'e1', name:'Gita Maharjan', dept:'IT', status:'working', method:'biometric', since:'09:02 AM', location:'KTM HQ', avatar:'#3b82f6' },
  { id:'e2', name:'Maya Pradhan', dept:'Finance', status:'on_break', method:'web', since:'01:05 PM', location:'KTM HQ', avatar:'#10b981' },
  { id:'e3', name:'Ramesh KC', dept:'Sales', status:'field_duty', method:'gps', since:'10:15 AM', location:'Client Site - Lalitpur', avatar:'#f59e0b' },
  { id:'e4', name:'Bikash Shrestha', dept:'IT', status:'working', method:'biometric', since:'08:58 AM', location:'KTM HQ', avatar:'#7c3aed' },
  { id:'e5', name:'Sunita Rai', dept:'HR', status:'absent', method:null, since:null, location:null, avatar:'#ec4899' },
  { id:'e6', name:'Hari Thapa', dept:'IT', status:'missed_checkout', method:'biometric', since:'Yesterday 10:00 PM', location:'KTM HQ', avatar:'#ef4444' },
]

const STATUS_CFG = {
  working:{c:'#10b981',bg:'#f0fdf4',icon:'🟢',label:'Working'},
  on_break:{c:'#f59e0b',bg:'#fffbeb',icon:'☕',label:'On Break'},
  field_duty:{c:'#3b82f6',bg:'#eff6ff',icon:'📍',label:'Field Duty'},
  absent:{c:'#94a3b8',bg:'#f8fafc',icon:'⚪',label:'Absent'},
  missed_checkout:{c:'#ef4444',bg:'#fef2f2',icon:'⚠',label:'Missed Checkout'},
}
const METHOD_ICONS = {biometric:'👆',gps:'📍',web:'💻',qr:'📱'}

export default function LiveAttendancePage() {
  const [feed, setFeed] = useState(LIVE_FEED)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [_nm, _snm] = useState("")
  const notify = m => { _snm(m); setTimeout(()=>_snm(""),3000) }
  const [ctx, setCtx] = useState(null)
  const [pulse, setPulse] = useState(true)

  useEffect(()=>{ const t = setInterval(()=>setPulse(p=>!p), 1500); return ()=>clearInterval(t) },[])

  const filtered = feed.filter(e=>{
    if (filterStatus!=='all'&&e.status!==filterStatus) return false
    if (search&&!e.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    working: feed.filter(e=>e.status==='working').length,
    on_break: feed.filter(e=>e.status==='on_break').length,
    field_duty: feed.filter(e=>e.status==='field_duty').length,
    absent: feed.filter(e=>e.status==='absent').length,
  }
  const anomalies = feed.filter(e=>e.status==='missed_checkout').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📡" title="Live Attendance"
        breadcrumb="Workforce Operations > Attendance Management > Daily Attendance"
        gradient={G}
        stats={[
          {icon:'🟢',label:'Working Now',  value:counts.working},
          {icon:'☕',label:'On Break',      value:counts.on_break},
          {icon:'📍',label:'Field Duty',    value:counts.field_duty},
          {icon:'⚠',label:'Anomalies',     value:anomalies},
        ]}
        onAdd={()=>notify('Live attendance marked')} addLabel="+ Mark Attendance" onExcel={()=>{}}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px'}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:'#10b981',opacity:pulse?1:0.3,transition:'opacity .3s'}}/>
        <span style={{fontSize:11,color:'#065f46'}}><strong>Live feed</strong> - updates in real-time as employees punch in/out across all locations.</span>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {_nm&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{_nm}</div>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,overflowX:'auto'}}>
          {['all',...Object.keys(STATUS_CFG)].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':`${STATUS_CFG[s].icon} ${STATUS_CFG[s].label}`}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:12}}>
        {filtered.map(e=>{
          const sc = STATUS_CFG[e.status]
          return (
            <div key={e.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.name,impact_links:['Employee Movement','Biometric Attendance']}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'14px 16px',display:'flex',gap:12,alignItems:'center',boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
              <div style={{width:42,height:42,borderRadius:'50%',background:`${e.avatar}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color:e.avatar,flexShrink:0,position:'relative'}}>
                {e.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                {e.status==='working'&&<span style={{position:'absolute',bottom:-2,right:-2,width:11,height:11,borderRadius:'50%',background:'#10b981',border:'2px solid #fff'}}/>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{e.name}</div>
                <div style={{fontSize:9,color:'#64748b'}}>{e.dept}</div>
                <div style={{display:'flex',gap:6,alignItems:'center',marginTop:3}}>
                  <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'1px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  {e.method&&<span style={{fontSize:11}}>{METHOD_ICONS[e.method]}</span>}
                </div>
                {e.since&&<div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Since {e.since} {e.location&&`. ${e.location}`}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Today\'s Log',key:'view'},{icon:'📞',label:'Contact',key:'contact'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

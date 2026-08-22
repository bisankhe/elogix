// FILE: RealTimeMonitoringPage.jsx - Real-Time Monitoring (Attendance Management)
// Live single-source-of-truth dashboard: who's working/on-break/absent right now,
// live OT accrual ticker, unauthorized-OT push alert, anomaly feed (not micromanagement).

import { useState, useEffect } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const LIVE_FEED = [
  { id:'r1', employee:'Gita Maharjan', dept:'IT', status:'working', since:'09:02 AM', accruing_ot:false },
  { id:'r2', employee:'Maya Pradhan', dept:'Finance', status:'on_break', since:'01:05 PM', accruing_ot:false },
  { id:'r3', employee:'Bikash Rai', dept:'IT', status:'working_overtime', since:'06:05 PM', accruing_ot:true, ot_minutes:35 },
  { id:'r4', employee:'Sunil Magar', dept:'Customer Service', status:'absent', since:null, accruing_ot:false },
  { id:'r5', employee:'Hari Thapa', dept:'IT', status:'working', since:'10:00 PM', accruing_ot:false },
]

const STATUS_CFG = {
  working:{c:'#10b981',bg:'#f0fdf4',icon:'🟢',label:'Working'},
  on_break:{c:'#f59e0b',bg:'#fffbeb',icon:'☕',label:'On Break'},
  working_overtime:{c:'#ef4444',bg:'#fef2f2',icon:'🔴',label:'Overtime (Unplanned)'},
  absent:{c:'#94a3b8',bg:'#f8fafc',icon:'⚪',label:'Absent'},
}

const ANOMALY_FEED = [
  {time:'2 min ago',text:'Bikash Rai started accruing unplanned overtime - no pre-approved OT request found for today.',severity:'high'},
  {time:'18 min ago',text:'Customer Service department at 89% staffing - below the 90% coverage threshold for the 2-4 PM peak window.',severity:'medium'},
]

export default function RealTimeMonitoringPage() {
  const [feed, setFeed] = useState(LIVE_FEED)
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)
  const [pulse, setPulse] = useState(true)

  useEffect(()=>{ const t = setInterval(()=>setPulse(p=>!p), 1500); return ()=>clearInterval(t) },[])

  const filtered = feed.filter(e=>!search||e.employee.toLowerCase().includes(search.toLowerCase()))
  const counts = {
    working: feed.filter(e=>e.status==='working').length,
    on_break: feed.filter(e=>e.status==='on_break').length,
    overtime: feed.filter(e=>e.status==='working_overtime').length,
    absent: feed.filter(e=>e.status==='absent').length,
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📡" title="Real-Time Monitoring"
        breadcrumb="Workforce Operations > Attendance Management > Overtime"
        gradient={G}
        stats={[
          {icon:'🟢',label:'Working Now',     value:counts.working},
          {icon:'☕',label:'On Break',         value:counts.on_break},
          {icon:'🔴',label:'Unplanned OT',     value:counts.overtime},
          {icon:'⚪',label:'Absent',           value:counts.absent},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px'}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:'#10b981',opacity:pulse?1:0.3,transition:'opacity .3s'}}/>
        <span style={{fontSize:11,color:'#065f46'}}><strong>Single source of truth</strong> - live across all locations. Used for staffing optimization and emergency response, not micromanagement.</span>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:12,marginTop:14,marginBottom:16}}>
        {filtered.map(e=>{
          const sc = STATUS_CFG[e.status]
          return (
            <div key={e.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.employee,impact_links:['Overtime Management','Employee Movement']}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'14px 16px',display:'flex',gap:12,alignItems:'center',boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
              <span style={{fontSize:20,flexShrink:0}}>{sc.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{e.employee}</div>
                <div style={{fontSize:9,color:'#64748b'}}>{e.dept}</div>
                <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'1px 8px',borderRadius:20,display:'inline-block',marginTop:3}}>{sc.label}</span>
                {e.since&&<div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Since {e.since}</div>}
              </div>
              {e.accruing_ot&&(
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:900,color:'#ef4444'}}>+{e.ot_minutes}m</div>
                  <div style={{fontSize:7,color:'#94a3b8'}}>OT ACCRUING</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{background:'#fff',border:'1px solid #fed7aa',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔔 Live Anomaly Alerts</div>
        {ANOMALY_FEED.map((a,i)=>(
          <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',borderBottom:i<ANOMALY_FEED.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{background:a.severity==='high'?'#fef2f2':'#fffbeb',color:a.severity==='high'?'#dc2626':'#b45309',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20,flexShrink:0}}>{a.severity}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'#374151'}}>{a.text}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{a.time}</div>
            </div>
          </div>
        ))}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:"View Today's Log",key:'view'},{icon:'📞',label:'Contact',key:'contact'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

// FILE: GPSAttendancePage.jsx - GPS Attendance (Attendance Setup)
// Mobile clock-in map view, odd-location rejection, assigned-location validation

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#064e3b 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const PUNCHES_TODAY = [
  { id:'p1', employee:'Gita Maharjan', location:'KTM HQ Office', distance_m:12, status:'accepted', time:'09:02 AM', task:null,
    impact_links:['Geo-Fencing','Attendance Policy'] },
  { id:'p2', employee:'Ramesh KC', location:'Field Visit - Client ABC Pvt Ltd', distance_m:8, status:'accepted', time:'10:15 AM', task:'Site survey - assigned by Dipak Tamang',
    impact_links:['Task & Location Assignment'] },
  { id:'p3', employee:'Anjali Sharma', location:'Unknown / Odd Location', distance_m:340, status:'rejected', time:'09:08 AM', task:null,
    impact_links:['Geo-Fencing'] },
  { id:'p4', employee:'Sunil Magar', location:'Pokhara Branch', distance_m:6, status:'accepted', time:'08:55 AM', task:null,
    impact_links:[] },
]

const STATUS_CFG = {accepted:{c:'#10b981',bg:'#f0fdf4',icon:'✅'},rejected:{c:'#ef4444',bg:'#fef2f2',icon:'🚫'}}

export default function GPSAttendancePage() {
  const [punches, setPunches] = useState(PUNCHES_TODAY)
  const [search, setSearch] = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [_nm, _snm] = useState("")
  const notify = m => { _snm(m); setTimeout(()=>_snm(""),3000) }
  const [ctx, setCtx] = useState(null)

  const filtered = punches.filter(p=>!search||p.employee.toLowerCase().includes(search.toLowerCase()))
  const rejectedCount = punches.filter(p=>p.status==='rejected').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📍" title="GPS Attendance"
        breadcrumb="Workforce Operations > Attendance Management > Attendance Setup"
        gradient={G}
        stats={[
          {icon:'📍',label:"Today's Punches", value:punches.length},
          {icon:'✅',label:'Accepted',          value:punches.filter(p=>p.status==='accepted').length},
          {icon:'🚫',label:'Rejected',          value:rejectedCount},
          {icon:'📋',label:'With Task Assigned',value:punches.filter(p=>p.task).length},
        ]}
        onAdd={()=>notify('GPS attendance visit recorded')} addLabel="+ Record GPS Visit" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#155e75',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>📍</span>
        <div><strong>Strict Location Rule:</strong> No attendance accepted from odd/unassigned locations. Every employee has a defined HQ/branch/outlet location. For field visits, the supervisor/manager must first assign a specific task + location - only then does GPS validate the clock-in against that geo-fence.</div>
      </div>

      {_nm&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{_nm}</div>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16,marginTop:14}}>
        <div style={{display:'grid',gap:10}}>
          {filtered.map(p=>{
            const sc = STATUS_CFG[p.status]
            return (
              <div key={p.id}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.employee,...p}})}}
                style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
                <div style={{width:42,height:42,borderRadius:12,background:`${sc.c}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{sc.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{p.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'1px 8px',borderRadius:20}}>{p.status==='accepted'?'Accepted':'Rejected - Odd Location'}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>📍 {p.location} . {p.distance_m}m from fence center . {p.time}</div>
                  {p.task&&<div style={{fontSize:9,color:A,marginTop:2}}>📋 {p.task}</div>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mini map visualization */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 18px',height:'fit-content'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🗺 Live Punch Map (Today)</div>
          <div style={{height:200,background:'linear-gradient(135deg,#e0f2fe,#cffafe)',borderRadius:12,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:'40%',left:'30%',width:60,height:60,borderRadius:'50%',border:`2px dashed ${A}`,background:`${A}10`}}/>
            {punches.map((p,i)=>(
              <div key={i} style={{position:'absolute',top:`${30+i*15}%`,left:`${20+i*18}%`,width:10,height:10,borderRadius:'50%',
                background:STATUS_CFG[p.status].c,border:'2px solid #fff',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
            ))}
          </div>
          <div style={{fontSize:9,color:'#94a3b8',marginTop:8}}>Dashed circle = active geo-fence perimeter . Dots = punch attempts (green=accepted, red=rejected)</div>
        </div>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View on Map',key:'view'},{icon:'✏',label:'Override / Approve Manually',key:'override'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="GPS Attendance Log" columns={['Employee','Location','Distance (m)','Status','Time','Assigned Task']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

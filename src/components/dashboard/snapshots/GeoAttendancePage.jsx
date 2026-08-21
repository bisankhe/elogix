// FILE: GeoAttendancePage.jsx - Geo Attendance (Daily Attendance)
// Selfie+GPS clock-in within geo-fence, daily punch log, odd-location rejection feed

import { useState } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const PUNCHES = [
  { id:'g1', employee:'Ramesh KC', location:'Client ABC Pvt Ltd, Lalitpur', fence:'Task Site (Auto-Created)',
    distance_m:8, time:'10:15 AM', selfie:true, status:'accepted',
    impact_links:['Task & Location Assignment'] },
  { id:'g2', employee:'Sunita Rai', location:'XYZ Suppliers, Bhaktapur', fence:'Task Site (Auto-Created)',
    distance_m:14, time:'11:02 AM', selfie:true, status:'accepted',
    impact_links:[] },
  { id:'g3', employee:'Anjali Sharma', location:'Unknown / Odd Location', fence:null,
    distance_m:340, time:'09:08 AM', selfie:false, status:'rejected',
    impact_links:['Geo-Fencing'] },
  { id:'g4', employee:'Sunil Magar', location:'Pokhara Branch', fence:'Pokhara Branch (Fixed)',
    distance_m:6, time:'08:55 AM', selfie:true, status:'accepted',
    impact_links:[] },
]

const STATUS_CFG = {accepted:{c:'#10b981',bg:'#f0fdf4',icon:'✅'},rejected:{c:'#ef4444',bg:'#fef2f2',icon:'🚫'}}

export default function GeoAttendancePage() {
  const [punches, setPunches] = useState(PUNCHES)
  const [search, setSearch] = useState('')
  const [_nm, _snm] = useState("")
  const notify = m => { _snm(m); setTimeout(()=>_snm(""),3000) }
  const [ctx, setCtx] = useState(null)

  const filtered = punches.filter(p=>!search||p.employee.toLowerCase().includes(search.toLowerCase()))
  const acceptedCount = punches.filter(p=>p.status==='accepted').length
  const rejectedCount = punches.filter(p=>p.status==='rejected').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📍" title="Geo Attendance"
        breadcrumb="Workforce Operations > Attendance Management > Daily Attendance"
        gradient={G}
        stats={[
          {icon:'📍',label:"Today's Punches", value:punches.length},
          {icon:'✅',label:'Accepted',          value:acceptedCount},
          {icon:'🚫',label:'Rejected',          value:rejectedCount},
          {icon:'🤳',label:'Selfie Verified',   value:punches.filter(p=>p.selfie).length},
        ]}
        onAdd={()=>notify('Geo-fenced attendance recorded')} addLabel="+ Geo Check-In" onExcel={()=>{}}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🛡</span>
        <div><strong>Strict Geo-Fence Rule:</strong> No attendance accepted from odd/unassigned locations. Field staff must have a task+location pre-assigned by their supervisor - this auto-creates the temporary fence shown below. Selfie clock-in adds liveness verification on top of GPS validation.</div>
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
              <div style={{width:42,height:42,borderRadius:12,background:`${sc.c}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{sc.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                  <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{p.employee}</span>
                  <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'1px 7px',borderRadius:20}}>{p.status==='accepted'?'Accepted':'Rejected - Odd Location'}</span>
                  {p.selfie&&<span style={{fontSize:11}}>🤳</span>}
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>📍 {p.location} . {p.distance_m}m from fence center . {p.time}</div>
                {p.fence&&<div style={{fontSize:9,color:A,marginTop:2}}>🛡 {p.fence}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mini map visualization */}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 18px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🗺 Geo Punch Map (Today)</div>
        <div style={{height:180,background:'linear-gradient(135deg,#faf5ff,#f5f3ff)',borderRadius:12,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:'35%',left:'25%',width:54,height:54,borderRadius:'50%',border:`2px dashed ${A}`,background:`${A}10`}}/>
          <div style={{position:'absolute',top:'55%',left:'55%',width:50,height:50,borderRadius:'50%',border:`2px dashed ${A}`,background:`${A}10`}}/>
          {punches.map((p,i)=>(
            <div key={i} style={{position:'absolute',top:`${28+i*16}%`,left:`${22+i*16}%`,width:10,height:10,borderRadius:'50%',
              background:STATUS_CFG[p.status].c,border:'2px solid #fff',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
          ))}
        </div>
        <div style={{fontSize:9,color:'#94a3b8',marginTop:8}}>Dashed circles = active geo-fences . Dots = today's punches (green=accepted, red=rejected)</div>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View on Map',key:'view'},{icon:'🤳',label:'View Selfie',key:'selfie'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

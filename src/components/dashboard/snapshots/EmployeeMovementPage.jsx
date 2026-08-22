// FILE: EmployeeMovementPage.jsx - Employee Movement (Daily Attendance)
// Time-to-time movement log (login->logout), mandatory break calc, night/holiday/OT counters,
// timeline route tracker for field staff visiting multiple stops

import { useState } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#164e63 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const MOVEMENT_LOGS = [
  { id:'m1', employee:'Gita Maharjan', date:'2025-06-21',
    events:[
      {time:'09:02 AM',type:'login',location:'KTM HQ'},
      {time:'01:00 PM',type:'break_start',location:'KTM HQ'},
      {time:'01:32 PM',type:'break_end',location:'KTM HQ'},
      {time:'06:15 PM',type:'logout',location:'KTM HQ'},
    ],
    total_hrs:8.5, break_min:32, break_compliant:true, overtime_hrs:0.5,
    night_duty:false, public_holiday_worked:false, extra_duty:false,
    impact_links:['Live Attendance','Payroll Setup'] },
  { id:'m2', employee:'Ramesh KC', date:'2025-06-21',
    events:[
      {time:'10:15 AM',type:'login',location:'KTM HQ'},
      {time:'10:45 AM',type:'movement',location:'Client ABC Pvt Ltd, Lalitpur'},
      {time:'02:30 PM',type:'movement',location:'Client XYZ Suppliers, Bhaktapur'},
      {time:'05:50 PM',type:'logout',location:'KTM HQ'},
    ],
    total_hrs:7.6, break_min:0, break_compliant:false, overtime_hrs:0,
    night_duty:false, public_holiday_worked:false, extra_duty:true,
    impact_links:['Task & Location Assignment','Field Visit Tracking'] },
  { id:'m3', employee:'Hari Thapa', date:'2025-06-20',
    events:[
      {time:'10:00 PM',type:'login',location:'KTM HQ'},
      {time:'02:00 AM',type:'break_start',location:'KTM HQ'},
      {time:'02:30 AM',type:'break_end',location:'KTM HQ'},
      {time:'06:00 AM',type:'logout',location:'KTM HQ'},
    ],
    total_hrs:7.5, break_min:30, break_compliant:true, overtime_hrs:0,
    night_duty:true, public_holiday_worked:false, extra_duty:false,
    impact_links:['Shift Management'] },
]

const EVENT_CFG = {
  login:{c:'#10b981',icon:'▶'}, logout:{c:'#ef4444',icon:'⏹'},
  break_start:{c:'#f59e0b',icon:'☕'}, break_end:{c:'#3b82f6',icon:'↩'},
  movement:{c:'#7c3aed',icon:'📍'},
}

export default function EmployeeMovementPage() {
  const [logs, setLogs] = useState(MOVEMENT_LOGS)
  const [search, setSearch] = useState('')
  const [_nm, _snm] = useState("")
  const notify = m => { _snm(m); setTimeout(()=>_snm(""),3000) }
  const [ctx, setCtx] = useState(null)

  const filtered = logs.filter(l=>!search||l.employee.toLowerCase().includes(search.toLowerCase()))
  const totalNightDuties = logs.filter(l=>l.night_duty).length
  const totalExtraDuties = logs.filter(l=>l.extra_duty).length
  const totalOT = logs.reduce((s,l)=>s+l.overtime_hrs,0)
  const breakViolations = logs.filter(l=>!l.break_compliant).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🛤" title="Employee Movement"
        breadcrumb="Workforce Operations > Attendance Management > Daily Attendance"
        gradient={G}
        stats={[
          {icon:'🌙',label:'Night Duties',    value:totalNightDuties},
          {icon:'⏱',label:'Total OT Hours',  value:totalOT.toFixed(1)},
          {icon:'➕',label:'Extra Duties',     value:totalExtraDuties},
          {icon:'⚠',label:'Break Violations', value:breakViolations},
        ]}
        onAdd={()=>notify('Employee movement recorded')} addLabel="+ Record Movement" onExcel={()=>{}}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#155e75',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>📊</span>
        <div><strong>Auto-Tracked Per Employee:</strong> Night duties . Public holidays worked . Holidays worked . Overtime (1.5× per LA2074) . Extra duties . Mandatory 30-min break compliance - all calculated from this movement log.</div>
      </div>

      {_nm&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{_nm}</div>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(l=>(
          <div key={l.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.employee,...l}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)'}}>
            <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{l.employee}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{l.date}</div>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {l.night_duty&&<span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>🌙 Night Duty</span>}
                {l.extra_duty&&<span style={{background:'#fff7ed',color:'#c2410c',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>➕ Extra Duty</span>}
                {!l.break_compliant&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⚠ Break Skipped</span>}
              </div>
              <div style={{textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:16,fontWeight:900,color:A}}>{l.total_hrs}h</div>
                <div style={{fontSize:8,color:'#94a3b8'}}>TOTAL</div>
              </div>
            </div>

            {/* Movement timeline */}
            <div style={{padding:'14px 18px',position:'relative',paddingLeft:38}}>
              <div style={{position:'absolute',left:14,top:14,bottom:14,width:2,background:'#e2e8f0'}}/>
              {l.events.map((ev,i)=>{
                const ec = EVENT_CFG[ev.type]
                return (
                  <div key={i} style={{position:'relative',marginBottom:i<l.events.length-1?12:0}}>
                    <div style={{position:'absolute',left:-32,top:0,width:18,height:18,borderRadius:'50%',background:ec.c,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',border:'2px solid #fff',boxShadow:`0 0 0 2px ${ec.c}33`}}>{ec.icon}</div>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <span style={{fontSize:11,fontWeight:700,color:'#0f172a',width:80}}>{ev.time}</span>
                      <span style={{fontSize:10,color:ec.c,fontWeight:600,textTransform:'capitalize'}}>{ev.type.replace('_',' ')}</span>
                      <span style={{fontSize:9,color:'#94a3b8'}}>. {ev.location}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{padding:'10px 18px',borderTop:'1px solid #f8fafc',display:'flex',gap:16,fontSize:10,color:'#64748b'}}>
              <span>Break: <strong style={{color:l.break_compliant?'#10b981':'#ef4444'}}>{l.break_min}min</strong></span>
              {l.overtime_hrs>0&&<span>OT: <strong style={{color:'#f59e0b'}}>{l.overtime_hrs}h @ 1.5×</strong></span>}
            </div>
          </div>
        ))}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Log',key:'view'},{icon:'✏',label:'Edit Entry (Mgr/Sup)',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

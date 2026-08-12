// FILE: ShiftManagementPage.jsx — Shift Management (Attendance Setup)
// Shift templates, night-differential pay rates, 8hr/48hr LA2074 caps

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const SHIFTS = [
  { id:'s1', name:'Morning Shift', start:'06:00', end:'14:00', duration_hrs:8, type:'day',
    night_differential_pct:0, color:'#3b82f6', assigned_employees:62, status:'active',
    impact_links:['Roster Management','Payroll Setup'] },
  { id:'s2', name:'General Shift', start:'09:00', end:'17:00', duration_hrs:8, type:'day',
    night_differential_pct:0, color:'#10b981', assigned_employees:148, status:'active',
    impact_links:['Roster Management'] },
  { id:'s3', name:'Evening Shift', start:'14:00', end:'22:00', duration_hrs:8, type:'day',
    night_differential_pct:5, color:'#f59e0b', assigned_employees:28, status:'active',
    impact_links:['Roster Management'] },
  { id:'s4', name:'Night Shift', start:'22:00', end:'06:00', duration_hrs:8, type:'night',
    night_differential_pct:20, color:'#7c3aed', assigned_employees:14, status:'active',
    impact_links:['Roster Management','Payroll Setup'] },
]

export default function ShiftManagementPage() {
  const [shifts, setShifts] = useState(SHIFTS)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = shifts.filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase()))
  const totalAssigned = shifts.reduce((s,x)=>s+x.assigned_employees,0)

  return (
    <div onClick={()=>setCtx(null)}>
      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}
      <PageHeader icon="🕐" title="Shift Management"
        breadcrumb="Workforce Operations > Attendance Management > Attendance Setup"
        gradient={G}
        stats={[
          {icon:'🕐',label:'Shift Templates',  value:shifts.length},
          {icon:'👥',label:'Total Assigned',    value:totalAssigned},
          {icon:'🌙',label:'Night Shifts',      value:shifts.filter(s=>s.type==='night').length},
          {icon:'⏰',label:'Max Daily Hours',   value:'8 hrs'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Shift Template"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#eef2ff,#f5f3ff)',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal LA2074:</strong> All shift templates capped at 8hrs/day. Night shift differential pay is a standard practice add-on (not legally mandated but common). One-month auto-shift-selector and slider available below for rapid rostering.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search shift templates..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(s=>(
          <div key={s.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.name,...s}})}}
            style={{background:'#fff',border:`1.5px solid ${s.color}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${s.color}`}}>
            <div style={{padding:'16px 18px'}}>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:18}}>{s.type==='night'?'🌙':'☀'}</span>
                <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{s.name}</span>
              </div>
              <div style={{fontSize:18,fontWeight:900,color:s.color,marginBottom:4}}>{s.start} – {s.end}</div>
              <div style={{fontSize:10,color:'#64748b'}}>{s.duration_hrs} hours{s.night_differential_pct>0?` · +${s.night_differential_pct}% differential`:''}</div>
              <div style={{marginTop:10,background:'#f8fafc',borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:9,color:'#94a3b8'}}>Assigned Employees</div>
                <div style={{fontSize:16,fontWeight:900,color:'#0f172a'}}>{s.assigned_employees}</div>
              </div>
            </div>
            <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 14px',display:'flex',gap:6}}>
              <button onClick={()=>notify('✏️ Opening shift editor...')} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${s.color}12`,color:s.color,fontSize:10,fontWeight:700,cursor:'pointer'}}>Edit Template</button>
              <button onClick={()=>notify('👥 Opening employee assignment panel...')} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>Assign Employees</button>
            </div>
          </div>
        ))}
      </div>

      {/* One-month auto-shift selector */}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:4}}>🗓 One-Month Auto-Shift Selector</div>
        <div style={{fontSize:10,color:'#94a3b8',marginBottom:14}}>Drag the slider to apply a shift pattern across an entire month for selected employees</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px',marginBottom:14}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Apply Shift</label>
                <input type="text" value={form.applyShift||""} onChange={e=>setForm(p=>({...p,applyShift:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Month</label>
                <select value={form.month||"July 2025"} onChange={e=>setForm(p=>({...p,month:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="July 2025" value="July 2025">July 2025</option><option key="August 2025" value="August 2025">August 2025</option></select>
                </div>
        </div>
        <input type="range" min="1" max="31" defaultValue="1" style={{width:'100%',accentColor:A,marginBottom:6}}/>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#94a3b8'}}>
          <span>Day 1</span><span>Day 15</span><span>Day 31</span>
        </div>
        <button onClick={()=>notify('✅ Shift applied to selected date range')} style={{marginTop:14,padding:'10px 20px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Apply Shift to Selected Range</button>
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>New Shift Template</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Shift Name</label>
                <input type="text" value={form.shiftName||""} onChange={e=>setForm(p=>({...p,shiftName:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Type</label>
                <select value={form.type||"day"} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="day" value="day">day</option><option key="night" value="night">night</option></select>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Start Time</label>
                <input type="time" value={form.startTime||""} onChange={e=>setForm(p=>({...p,startTime:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>End Time</label>
                <input type="time" value={form.endTime||""} onChange={e=>setForm(p=>({...p,endTime:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Night Differential (%)</label>
                <input type="number" value={form.nightDifferential||""} onChange={e=>setForm(p=>({...p,nightDifferential:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
              <AIImpact color={A} lines={['Auto-validates against 8hr/day LA2074 cap.','Night shift (10PM-6AM window) auto-flagged for differential eligibility.','Syncs instantly to Roster Management calendar.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{notify("Record created");setShowAdd(false);setForm({})}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Create Shift</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✏',label:'Edit Shift',key:'edit'},
        {icon:'👥',label:'Assign Employees',key:'assign'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Shift Management" columns={['Shift Name','Start','End','Duration Hrs','Type','Night Differential %','Assigned Employees']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

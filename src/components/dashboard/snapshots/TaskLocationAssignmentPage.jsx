// FILE: TaskLocationAssignmentPage.jsx - Task & Location Assignment (Attendance Setup)
// Manager assigns field task + location before clock-in is geo-validated there

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const ASSIGNMENTS = [
  { id:'ta1', employee:'Ramesh KC', task:'Site survey & equipment audit', location:'Client ABC Pvt Ltd, Lalitpur',
    assigned_by:'Dipak Tamang', date:'2025-06-21', start_time:'09:00', end_time:'17:00',
    geo_fence_created:true, status:'in_progress', clock_in_time:'10:15 AM', clock_in_validated:true,
    impact_links:['Geo-Fencing','GPS Attendance'] },
  { id:'ta2', employee:'Sunita Rai', task:'Vendor payment collection', location:'XYZ Suppliers, Bhaktapur',
    assigned_by:'Sanjay Karki', date:'2025-06-22', start_time:'10:00', end_time:'15:00',
    geo_fence_created:true, status:'scheduled', clock_in_time:null, clock_in_validated:null,
    impact_links:['Geo-Fencing'] },
  { id:'ta3', employee:'Bikash Shrestha', task:'Server installation', location:'Branch Office, Pokhara',
    assigned_by:'Rajesh Sharma', date:'2025-06-20', start_time:'08:00', end_time:'18:00',
    geo_fence_created:true, status:'completed', clock_in_time:'08:05 AM', clock_in_validated:true,
    impact_links:[] },
]

const STATUS_CFG = {scheduled:{c:'#94a3b8',bg:'#f8fafc',icon:'📅'},in_progress:{c:'#3b82f6',bg:'#eff6ff',icon:'🔄'},completed:{c:'#10b981',bg:'#f0fdf4',icon:'✅'}}

export default function TaskLocationAssignmentPage() {
  const [assignments, setAssignments] = useState(ASSIGNMENTS)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = assignments.filter(a=>!search||a.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}
      <PageHeader icon="📍" title="Task & Location Assignment"
        breadcrumb="Workforce Operations > Attendance Management > Attendance Setup"
        gradient={G}
        stats={[
          {icon:'📍',label:'Total Assignments', value:assignments.length},
          {icon:'🔄',label:'In Progress',         value:assignments.filter(a=>a.status==='in_progress').length},
          {icon:'✅',label:'Completed',            value:assignments.filter(a=>a.status==='completed').length},
          {icon:'🛡',label:'Geo-Fences Created',  value:assignments.filter(a=>a.geo_fence_created).length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Assign Task & Location"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>📋</span>
        <div><strong>Mandatory for Field Visits:</strong> If an employee's location differs from their regular duty location, the supervisor/manager MUST assign a task + location first. This auto-creates a temporary geo-fence - only then will GPS accept the clock-in there. No task assigned = no attendance accepted at that location.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(a=>{
          const sc = STATUS_CFG[a.status]
          return (
            <div key={a.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.employee,...a}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{a.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {a.status.replace('_',' ')}</span>
                    {a.geo_fence_created&&<span style={{background:'#faf5ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>🛡 Geo-Fence Active</span>}
                  </div>
                  <div style={{fontSize:11,color:'#374151',fontWeight:600}}>{a.task}</div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>📍 {a.location} . Assigned by {a.assigned_by}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{a.date} . {a.start_time} - {a.end_time}</div>
                </div>
              </div>

              {a.clock_in_time&&(
                <div style={{padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:10,color:'#64748b'}}>
                    Clock-in: <strong>{a.clock_in_time}</strong>
                    {a.clock_in_validated&&<span style={{color:'#10b981',fontWeight:700}}> . ✓ GPS Validated at assigned location</span>}
                  </span>
                </div>
              )}
              {!a.clock_in_time&&(
                <div style={{padding:'10px 20px',fontSize:10,color:'#94a3b8'}}>Awaiting clock-in - will validate against the assigned geo-fence above.</div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:620,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Assign Task & Location</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Employee</label>
                <select value={form.employee||"Sunita Rai"} onChange={e=>setForm(p=>({...p,employee:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="Sunita Rai" value="Sunita Rai">Sunita Rai</option><option key="Bikash Shrestha" value="Bikash Shrestha">Bikash Shrestha</option></select>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Date</label>
                <input type="date" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Start Time</label>
                <input type="time" value={form.startTime||""} onChange={e=>setForm(p=>({...p,startTime:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>End Time</label>
                <input type="time" value={form.endTime||""} onChange={e=>setForm(p=>({...p,endTime:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Task Description</label>
                <textarea value={form.taskDescription||""} onChange={e=>setForm(p=>({...p,taskDescription:e.target.value}))} rows={3} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Location / Address</label>
                <input type="text" value={form.locationAddress||""} placeholder="Will auto-generate geo-fence on save" onChange={e=>setForm(p=>({...p,locationAddress:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              <AIImpact color={A} lines={['Auto-creates a temporary geo-fence at this location for the task duration.','Employee\'s GPS clock-in will only succeed within this fence during the assigned window.','Auto-expires once task is marked complete - preserves privacy.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{notify("Record created");setShowAdd(false);setForm({})}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Assign & Create Geo-Fence</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'🛡',label:'View Geo-Fence',key:'fence'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Task & Location Assignments" columns={['Employee','Task','Location','Assigned By','Date','Start Time','End Time','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

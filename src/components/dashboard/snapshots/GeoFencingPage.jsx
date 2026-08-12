// FILE: GeoFencingPage.jsx - Geo-Fencing (Attendance Setup)
// Virtual perimeter setup per location, radius config, privacy-respecting (work-hours only)

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const FENCES = [
  { id:'gf1', name:'KTM HQ Office', type:'fixed_location', lat:27.7172, lng:85.3240, radius_m:100,
    employees_assigned:218, status:'active', tracking_hours:'office_hours_only',
    impact_links:['GPS Attendance','Attendance Policy'] },
  { id:'gf2', name:'Pokhara Branch', type:'fixed_location', lat:28.2096, lng:83.9856, radius_m:80,
    employees_assigned:32, status:'active', tracking_hours:'office_hours_only',
    impact_links:[] },
  { id:'gf3', name:'Biratnagar Outlet', type:'fixed_location', lat:26.4525, lng:87.2718, radius_m:60,
    employees_assigned:18, status:'active', tracking_hours:'office_hours_only',
    impact_links:[] },
  { id:'gf4', name:'Client ABC Pvt Ltd (Field Site)', type:'temporary_task_site', lat:27.6800, lng:85.3100, radius_m:150,
    employees_assigned:1, status:'active', tracking_hours:'task_duration_only',
    impact_links:['Task & Location Assignment'] },
]

const TRACKING_LABELS = {office_hours_only:'Office Hours Only',task_duration_only:'Task Duration Only',always:'Always (Not Recommended)'}

export default function GeoFencingPage() {
  const [fences, setFences] = useState(FENCES)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = fences.filter(f=>!search||f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}
      <PageHeader icon="🛡" title="Geo-Fencing"
        breadcrumb="Workforce Operations > Attendance Management > Attendance Setup"
        gradient={G}
        stats={[
          {icon:'🛡',label:'Active Fences',  value:fences.length},
          {icon:'👥',label:'Employees Covered',value:fences.reduce((s,f)=>s+f.employees_assigned,0)},
          {icon:'📍',label:'Fixed Locations',  value:fences.filter(f=>f.type==='fixed_location').length},
          {icon:'⏱',label:'Temp Task Sites',  value:fences.filter(f=>f.type==='temporary_task_site').length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Create Geo-Fence"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔐</span>
        <div><strong>Privacy by Design:</strong> Geo-tracking captures location only at exact punch-in/out moments - never continuously, and never outside working hours. Legal in Nepal for remote/field staff verification, provided employee privacy rights are respected.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search geo-fences..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(f=>(
          <div key={f.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.name,...f}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${f.type==='fixed_location'?A:'#f59e0b'}`}}>
            <div style={{padding:'16px 16px 10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{f.name}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{f.type==='fixed_location'?'Fixed Location':'Temporary Task Site'}</div>
                </div>
                <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,flexShrink:0}}>Active</span>
              </div>

              {/* Mini perimeter visualization */}
              <div style={{height:90,background:'linear-gradient(135deg,#faf5ff,#f5f3ff)',borderRadius:10,position:'relative',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:64,height:64,borderRadius:'50%',border:`2.5px dashed ${A}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:A}}/>
                </div>
                <span style={{position:'absolute',bottom:6,right:8,fontSize:8,color:A,fontWeight:700}}>{f.radius_m}m radius</span>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6,marginBottom:8}}>
                <div style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'6px 4px'}}>
                  <div style={{fontSize:13,fontWeight:900,color:A}}>{f.employees_assigned}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>Employees</div>
                </div>
                <div style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'6px 4px'}}>
                  <div style={{fontSize:13,fontWeight:900,color:'#10b981'}}>{f.radius_m}m</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>Radius</div>
                </div>
              </div>
              <div style={{fontSize:9,color:'#64748b'}}>📍 {f.lat.toFixed(4)}, {f.lng.toFixed(4)}</div>
              <span style={{display:'inline-block',marginTop:6,background:'#eff6ff',color:'#1d4ed8',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{TRACKING_LABELS[f.tracking_hours]}</span>
            </div>
            <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
              <button onClick={()=>notify('🛡 Opening perimeter editor...')} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>Edit Perimeter</button>
              <button onClick={()=>notify('👥 Opening employee assignment panel...')} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>Assign Employees</button>
            </div>
          </div>
        ))}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Create Geo-Fence</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Fence Name *</label>
                <input type="text" value={form.fenceName||""} onChange={e=>setForm(p=>({...p,fenceName:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Type</label>
                <select value={form.type||"fixed_location"} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="fixed_location" value="fixed_location">fixed_location</option><option key="temporary_task_site" value="temporary_task_site">temporary_task_site</option></select>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Latitude</label>
                <input type="number" value={form.latitude||""} onChange={e=>setForm(p=>({...p,latitude:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Longitude</label>
                <input type="number" value={form.longitude||""} onChange={e=>setForm(p=>({...p,longitude:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Radius (meters)</label>
                <input type="number" value={form.radiusMeters||""} onChange={e=>setForm(p=>({...p,radiusMeters:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Tracking Window</label>
                <select value={form.trackingWindow||"office_hours_only"} onChange={e=>setForm(p=>({...p,trackingWindow:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="office_hours_only" value="office_hours_only">office_hours_only</option><option key="task_duration_only" value="task_duration_only">task_duration_only</option></select>
                </div>
              </div>
              <AIImpact color={A} lines={['GPS punches outside this perimeter auto-rejected.','Privacy-respecting - no tracking outside assigned hours.','Temporary sites auto-expire when linked task is marked complete.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>{notify("Record created");setShowAdd(false);setForm({})}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Create Fence</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'✏',label:'Edit Perimeter',key:'edit'},{icon:'👥',label:'Assign Employees',key:'assign'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Geo-Fences" columns={['Name','Type','Latitude','Longitude','Radius (m)','Employees Assigned','Tracking Window']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

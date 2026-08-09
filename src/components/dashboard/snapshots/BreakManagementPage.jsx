// FILE: BreakManagementPage.jsx - Break Management (Attendance Setup)
// Mandatory 30-min break after 5hrs (LA2074), auto-lockout enforcement, maternity extra break

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const BREAK_POLICIES = [
  { id:'bp1', name:'Standard Lunch Break', duration_min:30, trigger_after_hrs:5, mandatory:true,
    counted_as_working:true, auto_lockout:true, applicable_to:'All Employees', shift_types:['Morning','General','Evening'],
    employees_covered:218, compliance_pct:96, status:'active',
    impact_links:['Shift Management','Attendance Policy'] },
  { id:'bp2', name:'Night Shift Break', duration_min:30, trigger_after_hrs:4, mandatory:true,
    counted_as_working:true, auto_lockout:true, applicable_to:'Night Shift Staff', shift_types:['Night'],
    employees_covered:18, compliance_pct:89, status:'active',
    impact_links:['Shift Management'] },
  { id:'bp3', name:'Maternity Extra Break', duration_min:30, trigger_after_hrs:0, mandatory:true,
    counted_as_working:true, auto_lockout:false, applicable_to:'Pregnant / Child Under 3yr', shift_types:['All'],
    employees_covered:4, compliance_pct:100, status:'active',
    impact_links:['Attendance Policy'] },
  { id:'bp4', name:'Short Tea Break', duration_min:15, trigger_after_hrs:0, mandatory:false,
    counted_as_working:true, auto_lockout:false, applicable_to:'All Employees', shift_types:['All'],
    employees_covered:218, compliance_pct:null, status:'active',
    impact_links:[] },
]

const TODAY_VIOLATIONS = [
  {employee:'Hari Thapa', shift:'Night Shift', issue:'Skipped mandatory break', time:'02:15 AM'},
  {employee:'Anita Gurung', shift:'General Shift', issue:'Returned 12 min early from break (locked out)', time:'01:18 PM'},
]

export default function BreakManagementPage() {
  const [policies, setPolicies] = useState(BREAK_POLICIES)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = policies.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase()))
  const avgCompliance = Math.round(policies.filter(p=>p.compliance_pct).reduce((s,p)=>s+p.compliance_pct,0)/policies.filter(p=>p.compliance_pct).length)

  return (
    <div onClick={()=>setCtx(null)}>
      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}
      <PageHeader icon="☕" title="Break Management"
        breadcrumb="Workforce Operations > Attendance Management > Attendance Setup"
        gradient={G}
        stats={[
          {icon:'☕',label:'Break Policies',  value:policies.length},
          {icon:'✅',label:'Avg Compliance',   value:avgCompliance+'%'},
          {icon:'⚠',label:"Today's Violations",value:TODAY_VIOLATIONS.length},
          {icon:'🔒',label:'Auto-Lockout',     value:policies.filter(p=>p.auto_lockout).length+' policies'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Break Policy"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Mandatory continuous rest of at least 30 minutes after 5 consecutive hours of work - counted as part of working hours. Pregnant women / mothers with child under 3 years get an additional 30-minute break daily. System auto-locks out early re-entry to enforce compliance.</div>
      </div>

      {TODAY_VIOLATIONS.length>0&&(
        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'12px 16px',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:'#92400e',marginBottom:6}}>⚠ Today's Break Exceptions</div>
          {TODAY_VIOLATIONS.map((v,i)=>(
            <div key={i} style={{fontSize:10,color:'#92400e',padding:'3px 0'}}>{v.employee} ({v.shift}) - {v.issue} at {v.time}</div>
          ))}
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search break policies..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(p=>(
          <div key={p.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.name,...p}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${A}`}}>
            <div style={{padding:'16px 16px 10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{p.name}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{p.applicable_to}</div>
                </div>
                {p.mandatory&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,flexShrink:0}}>Mandatory</span>}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
                {[{l:'Duration',v:p.duration_min+'min',c:A},{l:'After',v:p.trigger_after_hrs>0?p.trigger_after_hrs+'hrs':'Anytime',c:'#7c3aed'},{l:'Covered',v:p.employees_covered,c:'#10b981'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'6px 4px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                  </div>
                ))}
              </div>

              <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>
                <span style={{background:p.counted_as_working?'#f0fdf4':'#fef2f2',color:p.counted_as_working?'#15803d':'#dc2626',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{p.counted_as_working?'✓ Counted as Working':'Unpaid Break'}</span>
                {p.auto_lockout&&<span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>🔒 Auto-Lockout</span>}
              </div>

              {p.compliance_pct&&(
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:9}}>
                    <span style={{color:'#64748b'}}>Compliance Rate</span><span style={{fontWeight:700,color:p.compliance_pct>=95?'#10b981':'#f59e0b'}}>{p.compliance_pct}%</span>
                  </div>
                  <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}>
                    <div style={{width:`${p.compliance_pct}%`,height:'100%',background:p.compliance_pct>=95?'#10b981':'#f59e0b',borderRadius:6}}/>
                  </div>
                </div>
              )}
            </div>
            <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
              <button onClick={()=>notify('✏️ Opening policy editor...')} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>Edit Policy</button>
              <button onClick={()=>notify('📋 Loading attendance logs...')} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>View Logs</button>
            </div>
          </div>
        ))}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>New Break Policy</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Policy Name *</label>
                <input type="text" value={form.policyName||""} onChange={e=>setForm(p=>({...p,policyName:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Duration (minutes)</label>
                <input type="number" value={form.durationMinutes||""} onChange={e=>setForm(p=>({...p,durationMinutes:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Trigger After (hours)</label>
                <input type="number" value={form.triggerAfterHours||""} onChange={e=>setForm(p=>({...p,triggerAfterHours:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                <div style={{fontSize:9,color:"#94a3b8",marginTop:2}}>0 = available anytime</div>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Applicable To</label>
                <select value={form.applicableTo||"All Employees"} onChange={e=>setForm(p=>({...p,applicableTo:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="All Employees" value="All Employees">All Employees</option><option key="Night Shift Staff" value="Night Shift Staff">Night Shift Staff</option><option key="Pregnant / Child Under 3yr" value="Pregnant / Child Under 3yr">Pregnant / Child Under 3yr</option></select>
                </div>
              </div>
              <div style={{display:'flex',gap:16,marginTop:6}}>
                <label style={{display:'flex',gap:8,alignItems:'center',fontSize:12,color:'#374151',cursor:'pointer'}}><input type="checkbox" defaultChecked style={{accentColor:A}}/> Mandatory</label>
                <label style={{display:'flex',gap:8,alignItems:'center',fontSize:12,color:'#374151',cursor:'pointer'}}><input type="checkbox" defaultChecked style={{accentColor:A}}/> Counted as Working Hours</label>
                <label style={{display:'flex',gap:8,alignItems:'center',fontSize:12,color:'#374151',cursor:'pointer'}}><input type="checkbox" style={{accentColor:A}}/> Auto-Lockout Early Return</label>
              </div>
              <AIImpact color={A} lines={['System auto-flags employees skipping mandatory breaks.','Auto-lockout prevents clock-in before break duration completes.','Break time auto-syncs to attendance & overtime calculation.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>{notify("Record created");setShowAdd(false);setForm({})}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Create Policy</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Logs',key:'view'},{icon:'✏',label:'Edit Policy',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Break Policies" columns={['Policy Name','Duration (min)','Trigger After (hrs)','Applicable To','Mandatory','Auto-Lockout','Compliance %']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

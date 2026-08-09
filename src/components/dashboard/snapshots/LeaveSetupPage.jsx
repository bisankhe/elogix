// FILE: LeaveSetupPage.jsx - Leave Setup (Leave Management)
// Foundation config: fiscal/leave year definition, approval hierarchy wizard,
// holiday calendar mapping, working-days-vs-non-working calendar.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const LEAVE_YEAR_CFG = { type:'Fiscal Year (Nepal)', start:'Shrawan 1 (mid-July)', end:'Ashadh end (mid-July next year)', current_period:'2082/83 BS (2025/26 AD)' }

const APPROVAL_HIERARCHIES = [
  { id:'ah1', name:'Standard 2-Tier', levels:['Direct Manager','HR Manager'], applies_to:'All Employees', escalation_days:3, active:true,
    impact_links:['Leave Policy','Attendance Approval'] },
  { id:'ah2', name:'Executive 1-Tier', levels:['CEO/CFO Direct'], applies_to:'C-Suite & VPs', escalation_days:1, active:true,
    impact_links:[] },
  { id:'ah3', name:'Field Staff 3-Tier', levels:['Supervisor','Branch Manager','HR Manager'], applies_to:'Vendor-Supplied / Field Staff', escalation_days:5, active:true,
    impact_links:['Vendor Leave Requests'] },
]

const WORKING_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const WORKING_DAY_STATUS = [true,true,true,true,true,true,false] // Saturday = weekly off (Nepal default)

export default function LeaveSetupPage() {
  const [hierarchies, setHierarchies] = useState(APPROVAL_HIERARCHIES)
  const [workingDays, setWorkingDays] = useState(WORKING_DAY_STATUS)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [form, setForm] = useState({})

  const filtered = hierarchies.filter(h=>!search||h.name.toLowerCase().includes(search.toLowerCase()))
  const toggleDay = (i) => setWorkingDays(prev=>prev.map((d,idx)=>idx===i?!d:d))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗓" title="Leave Setup"
        breadcrumb="Workforce Operations > Leave Management > Leave Setup"
        gradient={G}
        stats={[
          {icon:'📅',label:'Leave Year',          value:'Fiscal (BS)'},
          {icon:'🔀',label:'Approval Hierarchies', value:hierarchies.length},
          {icon:'📆',label:'Working Days/Week',    value:workingDays.filter(Boolean).length},
          {icon:'🎌',label:'Public Holidays',      value:'13 (14 for women)'},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="New Approval Hierarchy"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Weekly off - at least 1 day/week (typically Saturday). 13 paid public holidays/year (14 for women, includes International Women's Day). Leave usage is a statutory right and cannot be deducted from compensation.</div>
      </div>

      {/* Leave Year config */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📅 Leave Year Definition</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[{l:'Year Type',v:LEAVE_YEAR_CFG.type},{l:'Starts',v:LEAVE_YEAR_CFG.start},{l:'Ends',v:LEAVE_YEAR_CFG.end},{l:'Current Period',v:LEAVE_YEAR_CFG.current_period}].map((s,i)=>(
            <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'10px 12px'}}>
              <div style={{fontSize:9,color:'#94a3b8',marginBottom:3}}>{s.l}</div>
              <div style={{fontSize:11,fontWeight:700,color:A}}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Working days calendar */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📆 Working Days vs Weekly Off</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
          {WORKING_DAYS.map((d,i)=>(
            <div key={d} onClick={()=>toggleDay(i)}
              style={{background:workingDays[i]?'#f0fdf4':'#fef2f2',border:`1.5px solid ${workingDays[i]?'#bbf7d0':'#fecaca'}`,borderRadius:10,padding:'12px 4px',textAlign:'center',cursor:'pointer'}}>
              <div style={{fontSize:11,fontWeight:800,color:workingDays[i]?'#15803d':'#dc2626'}}>{d}</div>
              <div style={{fontSize:8,color:workingDays[i]?'#065f46':'#991b1b',marginTop:3}}>{workingDays[i]?'Working':'Off'}</div>
            </div>
          ))}
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search approval hierarchies..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(h=>(
          <div key={h.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:h.name,...h}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${A}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{h.name}</div>
                <div style={{fontSize:10,color:'#64748b'}}>Applies to: {h.applies_to}</div>
              </div>
              <span style={{background:h.active?'#f0fdf4':'#f8fafc',color:h.active?'#15803d':'#94a3b8',fontSize:9,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{h.active?'✓ Active':'Inactive'}</span>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              {h.levels.map((l,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{background:`${A}10`,color:A,fontSize:10,fontWeight:700,padding:'5px 12px',borderRadius:20}}>{i+1}. {l}</span>
                  {i<h.levels.length-1&&<span style={{color:'#94a3b8'}}>&gt;</span>}
                </div>
              ))}
            </div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:8}}>Auto-escalates after {h.escalation_days} days without action</div>
          </div>
        ))}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:580,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>New Approval Hierarchy</div></div>
            <div style={{padding:'22px 28px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Hierarchy Name *</label>
                <input type="text" value={form.hierarchyName||""} onChange={e=>setForm(p=>({...p,hierarchyName:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Applies To</label>
                <select value={form.appliesTo||"All Employees"} onChange={e=>setForm(p=>({...p,appliesTo:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="All Employees" value="All Employees">All Employees</option><option key="C-Suite & VPs" value="C-Suite & VPs">C-Suite & VPs</option><option key="Department Heads" value="Department Heads">Department Heads</option><option key="Vendor-Supplied Staff" value="Vendor-Supplied Staff">Vendor-Supplied Staff</option></select>
                </div>
              <div style={{margin:'12px 0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:8}}>Approval Levels (in order)</div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Field</label>
                <select value={form.field||"Direct Manager"} onChange={e=>setForm(p=>({...p,field:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="Direct Manager" value="Direct Manager">Direct Manager</option><option key="Department Head" value="Department Head">Department Head</option><option key="HR Manager" value="HR Manager">HR Manager</option><option key="CEO/CFO" value="CEO/CFO">CEO/CFO</option></select>
                </div>
              </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Auto-Escalation After (days)</label>
                <input type="number" value={form.autoescalationAfterD||""} onChange={e=>setForm(p=>({...p,autoescalationAfterD:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              <AIImpact color={A} lines={['Routes requests automatically based on org chart reporting lines.','Auto-escalates to next level if pending past the configured threshold.','Links directly to Attendance Approval inbox for unified processing.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Create Hierarchy</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✏',label:'Edit',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Leave Setup - Approval Hierarchies" columns={['Hierarchy Name','Applies To','Levels','Escalation Days','Active']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

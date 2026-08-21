// FILE: AttendancePolicyPage.jsx — Attendance Policy (Attendance Setup)
// Point-and-click rule engine: grace periods, overtime thresholds, penalty deductions

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const POLICIES = [
  { id:'p1', name:'Standard HQ Policy', applies_to:'KTM HQ, All Departments', grace_period_min:15,
    half_day_threshold_hrs:4, full_day_hrs:8, weekly_hrs_cap:48, ot_daily_cap_hrs:4, ot_weekly_cap_hrs:24,
    ot_rate_multiplier:1.5, late_penalty:'Deduct 1 unit leave per 3 late arrivals', mandatory_break_min:30,
    break_after_hrs:5, weekly_off_day:'Saturday', status:'active', acknowledged_count:198, total_employees:210,
    impact_links:['Shift Management','Break Management','Payroll Setup'] },
  { id:'p2', name:'Field Staff Policy', applies_to:'Sales & Field Operations', grace_period_min:30,
    half_day_threshold_hrs:4, full_day_hrs:8, weekly_hrs_cap:48, ot_daily_cap_hrs:4, ot_weekly_cap_hrs:24,
    ot_rate_multiplier:1.5, late_penalty:'No penalty — task-based verification', mandatory_break_min:30,
    break_after_hrs:5, weekly_off_day:'Saturday', status:'active', acknowledged_count:34, total_employees:38,
    impact_links:['GPS Attendance','Geo-Fencing','Task & Location Assignment'] },
]

export default function AttendancePolicyPage() {
  const [policies, setPolicies] = useState(POLICIES)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = policies.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}
      <PageHeader icon="📜" title="Attendance Policy"
        breadcrumb="Workforce Operations > Attendance Management > Attendance Setup"
        gradient={G}
        stats={[
          {icon:'📜',label:'Active Policies', value:policies.length},
          {icon:'⏰',label:'Daily Cap',        value:'8 hrs'},
          {icon:'📅',label:'Weekly Cap',       value:'48 hrs'},
          {icon:'💰',label:'OT Rate',          value:'1.5x'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Policy"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> 8hrs/day, 48hrs/week cap. Overtime max 4hrs/day, 24hrs/week — must be voluntary, paid at 1.5x. Mandatory 30-min break after 5 consecutive hours (counted as working time). Employers must maintain a formal attendance register (Section 20/28).</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search policies..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(p=>{
          const ackPct = Math.round(p.acknowledged_count/p.total_employees*100)
          return (
            <div key={p.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.name,...p}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${A}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{p.name}</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{p.applies_to}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:ackPct>=90?'#10b981':'#f59e0b'}}>{ackPct}%</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>ACKNOWLEDGED</div>
                </div>
              </div>
              <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                {[{l:'Grace Period',v:p.grace_period_min+' min'},{l:'Full Day',v:p.full_day_hrs+' hrs'},
                  {l:'OT Daily Cap',v:p.ot_daily_cap_hrs+' hrs'},{l:'OT Rate',v:p.ot_rate_multiplier+'x'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:13,fontWeight:900,color:A}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:'10px 20px',fontSize:10,color:'#64748b'}}>
                <div>🍽 Mandatory break: {p.mandatory_break_min} min after {p.break_after_hrs} hrs continuous work</div>
                <div>📅 Weekly off: {p.weekly_off_day} · Late penalty: {p.late_penalty}</div>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'92vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Create Attendance Policy</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Policy Name</label>
                <input type="text" value={form.policyName||""} onChange={e=>setForm(p=>({...p,policyName:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Applies To</label>
                <input type="text" value={form.appliesTo||""} placeholder="Branch/Dept" onChange={e=>setForm(p=>({...p,appliesTo:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Grace Period (minutes)</label>
                <input type="number" value={form.gracePeriodMinutes||""} onChange={e=>setForm(p=>({...p,gracePeriodMinutes:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Full Day Hours</label>
                <input type="number" value={form.fullDayHours||""} onChange={e=>setForm(p=>({...p,fullDayHours:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>OT Daily Cap (hrs, max 4)</label>
                <input type="number" value={form.otDailyCapHrsMax4||""} onChange={e=>setForm(p=>({...p,otDailyCapHrsMax4:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>OT Weekly Cap (hrs, max 24)</label>
                <input type="number" value={form.otWeeklyCapHrsMax24||""} onChange={e=>setForm(p=>({...p,otWeeklyCapHrsMax24:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Mandatory Break (min)</label>
                <input type="number" value={form.mandatoryBreakMin||""} onChange={e=>setForm(p=>({...p,mandatoryBreakMin:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Weekly Off Day</label>
                <select value={form.weeklyOffDay||"Saturday"} onChange={e=>setForm(p=>({...p,weeklyOffDay:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="Saturday" value="Saturday">Saturday</option><option key="Sunday" value="Sunday">Sunday</option><option key="Friday" value="Friday">Friday</option></select>
                </div>
              </div>
              <AIImpact color={A} lines={['System auto-blocks OT entries exceeding legal caps.','Grace period auto-applied before late-penalty triggers.','Employees notified via self-service to acknowledge policy.','Auto-syncs to Shift Management and Payroll modules.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{notify("Record created");setShowAdd(false);setForm({})}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Create Policy</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✏',label:'Edit Policy',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Attendance Policies" columns={['Name','Applies To','Grace Period','Full Day Hrs','OT Daily Cap','OT Rate','Mandatory Break','Weekly Off']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

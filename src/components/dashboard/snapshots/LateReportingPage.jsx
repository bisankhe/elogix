// FILE: LateReportingPage.jsx — Late Reporting Alert (Auto-system)
// Auto-sends after 15min of shift start. 3 violations = half-day deduction
import { useState } from 'react'
import { PageHeader, SearchBar, ExcelModal } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#78350f 0%,#d97706 60%,#fcd34d 100%)'
const A = '#d97706'

const LATE_LOGS = [
  { id:'lr1', emp:'Ramesh KC', emp_id:'EMP-0054', dept:'Finance', shift_start:'09:00', login_time:'09:32', late_mins:32, violations_this_month:2, violations_total:5, status:'alerted', deduction_triggered:false, half_day_at:3 },
  { id:'lr2', emp:'Sunil Magar', emp_id:'EMP-0042', dept:'Sales', shift_start:'09:00', login_time:'09:47', late_mins:47, violations_this_month:3, violations_total:8, status:'half_day_deducted', deduction_triggered:true, half_day_at:3 },
  { id:'lr3', emp:'Dipesh Rai', emp_id:'EMP-0101', dept:'Finance', shift_start:'09:00', login_time:'09:18', late_mins:18, violations_this_month:1, violations_total:2, status:'alerted', deduction_triggered:false, half_day_at:3 },
]

export default function LateReportingPage() {
  const [logs, setLogs] = useState(LATE_LOGS)
  const [search, setSearch] = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = logs.filter(l=>!search||l.emp.toLowerCase().includes(search.toLowerCase()))
  const halfDays = logs.filter(l=>l.deduction_triggered).length

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="⏰" title="Late Reporting Alert"
        breadcrumb="Workforce Operations > Attendance > Late Reporting"
        gradient={G}
        stats={[
          {icon:'⏰',label:'Late Today',          value:logs.length},
          {icon:'💰',label:'Half-Day Deductions', value:halfDays},
          {icon:'⚠️',label:'3rd Violation Today', value:logs.filter(l=>l.violations_this_month>=3).length},
          {icon:'📊',label:'Avg Late Mins',       value:Math.round(logs.reduce((s,l)=>s+l.late_mins,0)/logs.length)+'min'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#fffbeb',border:'2px solid #d97706',borderRadius:12,padding:'14px 18px',marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:900,color:'#92400e',marginBottom:8}}>🤖 Auto Late Alert — Rules</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:8,fontSize:11,color:'#78350f'}}>
          <div>⏱️ Alert triggered if login &gt; Shift Start + 15 min</div>
          <div>📧 Message via Email + WhatsApp + Viber</div>
          <div>📋 Checks leave status — no alert if on leave</div>
          <div>💰 3 violations in a month = Half Day deduction</div>
          <div>⚠️ Records hit Discipline in Performance Mgmt</div>
          <div>🔁 Counter resets at start of each calendar month</div>
        </div>
      </div>

      <div style={{background:'#f8fafc',borderRadius:12,padding:'12px 16px',marginBottom:14,fontSize:11,color:'#374151',fontStyle:'italic',border:'1px solid #e2e8f0'}}>
        📋 <strong>Sample auto-message:</strong> "Dear [Name], you reported late today. This is your [N]th late instance this month. Please note that 3 late arrivals in a month will result in a half-day salary deduction and will be recorded in your Performance Management."
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:10,marginTop:14}}>
        {filtered.map(l=>(
          <div key={l.id} style={{background:'#fff',border:'1px solid #fde68a',borderRadius:12,padding:'14px 18px',borderLeft:`4px solid ${l.deduction_triggered?'#dc2626':'#d97706'}`}}>
            <div style={{display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{l.emp} <span style={{fontSize:10,color:'#94a3b8'}}>{l.emp_id}</span></span>
                  {l.deduction_triggered&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>💰 Half Day Deducted</span>}
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{l.dept} · Shift: {l.shift_start} · Logged in: {l.login_time} · Late by: <strong style={{color:'#d97706'}}>{l.late_mins} min</strong></div>
                <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap'}}>
                  <span style={{fontSize:9,color:'#78350f'}}>This month: <strong>{l.violations_this_month}/{l.half_day_at} violations</strong></span>
                  <div style={{display:'flex',gap:2}}>
                    {[...Array(l.half_day_at)].map((_,i)=>(
                      <div key={i} style={{width:16,height:16,borderRadius:4,background:i<l.violations_this_month?'#d97706':'#f1f5f9',border:'1px solid #e2e8f0'}}/>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={()=>notify('📧 Late alert re-sent to '+l.emp)} style={{padding:'5px 12px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer',flexShrink:0}}>📧 Resend</button>
            </div>
          </div>
        ))}
      </div>
      {showExcel&&<ExcelModal title="Late Reporting" columns={['Employee','Emp ID','Dept','Shift Start','Login Time','Late Minutes','Violations This Month','Half Day Deducted']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
    </div>
  )

// FILE: EarlyDeparturePage.jsx — Early Departure Alert (Auto-system)  
// Auto-sends alert if logout before shift end - 5 min. 3 violations = half-day deduction
import { useState } from 'react'
import { PageHeader, SearchBar, ExcelModal } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 60%,#93c5fd 100%)'
const A = '#1d4ed8'

const EARLY_LOGS = [
  { id:'ed1', emp:'Sita Gurung', emp_id:'EMP-0120', dept:'HR', shift_end:'18:00', logout_time:'17:48', early_mins:12, violations_this_month:1, deduction_triggered:false },
  { id:'ed2', emp:'Bikesh Tamang', emp_id:'EMP-0088', dept:'Operations', shift_end:'17:30', logout_time:'17:08', early_mins:22, violations_this_month:3, deduction_triggered:true },
]

export default function EarlyDeparturePage() {
  const [logs, setLogs] = useState(EARLY_LOGS)
  const [search, setSearch] = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = logs.filter(l=>!search||l.emp.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="🚪" title="Early Departure Alert"
        breadcrumb="Workforce Operations > Attendance > Early Departure"
        gradient={G}
        stats={[
          {icon:'🚪',label:'Early Departures Today', value:logs.length},
          {icon:'💰',label:'Half-Day Deductions',    value:logs.filter(l=>l.deduction_triggered).length},
          {icon:'⚠️',label:'3rd Violation Today',    value:logs.filter(l=>l.violations_this_month>=3).length},
          {icon:'📊',label:'Avg Early By',           value:Math.round(logs.reduce((s,l)=>s+l.early_mins,0)/logs.length)+'min'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#eff6ff',border:'2px solid #1d4ed8',borderRadius:12,padding:'14px 18px',marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:900,color:'#1e3a5f',marginBottom:8}}>🤖 Auto Early Departure Alert — Rules</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:8,fontSize:11,color:'#1e40af'}}>
          <div>⏱️ Alert if logout before Shift End - 5 min</div>
          <div>📧 Notified via Email + WhatsApp + Viber</div>
          <div>📋 Checks approved early-leave before alerting</div>
          <div>💰 3 violations = Half Day salary deduction</div>
          <div>⚠️ Hits discipline record in Performance Mgmt</div>
          <div>🔁 Counter resets monthly</div>
        </div>
      </div>

      <div style={{background:'#f8fafc',borderRadius:12,padding:'12px 16px',marginBottom:14,fontSize:11,color:'#374151',fontStyle:'italic',border:'1px solid #e2e8f0'}}>
        📋 <strong>Sample message:</strong> "Dear [Name], you logged out early today. This is your [N]th early departure this month. 3 instances results in a half-day deduction to payroll and a discipline entry."
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:10,marginTop:14}}>
        {filtered.map(l=>(
          <div key={l.id} style={{background:'#fff',border:'1px solid #bfdbfe',borderRadius:12,padding:'14px 18px',borderLeft:`4px solid ${l.deduction_triggered?'#dc2626':A}`}}>
            <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:800}}>{l.emp} <span style={{fontSize:10,color:'#94a3b8'}}>{l.emp_id}</span></span>
                  {l.deduction_triggered&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>💰 Half Day Deducted</span>}
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{l.dept} · Shift End: {l.shift_end} · Logged out: {l.logout_time} · Early by: <strong style={{color:A}}>{l.early_mins} min</strong></div>
                <div style={{fontSize:9,color:'#1e40af',marginTop:3}}>Violations this month: <strong>{l.violations_this_month}/3</strong></div>
              </div>
              <button onClick={()=>notify('📧 Alert resent to '+l.emp)} style={{padding:'5px 12px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer'}}>📧 Resend</button>
            </div>
          </div>
        ))}
      </div>
      {showExcel&&<ExcelModal title="Early Departure" columns={['Employee','Emp ID','Dept','Shift End','Logout Time','Early Minutes','Violations This Month','Deduction']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
    </div>
  )
}

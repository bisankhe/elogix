// FILE: NoLogInReportPage.jsx — No Login Report (Auto-alert system)
// Auto-sends email/WhatsApp/Viber 30 min after duty start if no login
// Marks as unauthorized absence, hits payroll for full-day deduction
import { useState } from 'react'
import { PageHeader, SearchBar, ExcelModal } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1c1917 0%,#7f1d1d 60%,#fca5a5 100%)'
const A = '#7f1d1d'

const TODAY = '2025-07-21'
const ALERTS = [
  { id:'nl1', emp:'Sunil Magar', emp_id:'EMP-0042', dept:'Sales', shift_start:'09:00', trigger_at:'09:30', status:'sent', marked_absent:true, payroll_hit:true, notified_via:['Email','WhatsApp','Viber'], log_in_time:null },
  { id:'nl2', emp:'Dipendra Yadav', emp_id:'EMP-0091', dept:'Finance', shift_start:'09:00', trigger_at:'09:30', status:'sent', marked_absent:true, payroll_hit:true, notified_via:['Email','WhatsApp'], log_in_time:null },
  { id:'nl3', emp:'Priya Khadka', emp_id:'EMP-0089', dept:'Customer Service', shift_start:'09:00', trigger_at:'09:30', status:'on_leave', marked_absent:false, payroll_hit:false, notified_via:[], log_in_time:null },
  { id:'nl4', emp:'Hari Adhikari', emp_id:'EMP-0143', dept:'Operations', shift_start:'08:00', trigger_at:'08:30', status:'logged_in_late', marked_absent:false, payroll_hit:false, notified_via:['Email'], log_in_time:'09:45' },
]

const STATUS_CFG = {
  sent:          {c:'#dc2626', bg:'#fef2f2', icon:'📧', label:'Alert Sent — Marked Absent'},
  on_leave:      {c:'#10b981', bg:'#f0fdf4', icon:'🏖️', label:'On Approved Leave — No Alert'},
  logged_in_late:{c:'#f59e0b', bg:'#fffbeb', icon:'⏰', label:'Logged In Late'},
  pending:       {c:'#94a3b8', bg:'#f8fafc', icon:'⏳', label:'Monitoring...'},

export default function NoLogInReportPage() {
  const [alerts, setAlerts] = useState(ALERTS)
  const [search, setSearch] = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [msg, setMsg]       = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3500) }

  const filtered = alerts.filter(a=>!search||a.emp.toLowerCase().includes(search.toLowerCase()))
  const sent = alerts.filter(a=>a.status==='sent').length
  const payrollHits = alerts.filter(a=>a.payroll_hit).length

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="🚨" title="No Login Report"
        breadcrumb="Workforce Operations > Attendance > No Login Report"
        gradient={G}
        stats={[
          {icon:'🚨',label:'Alerts Sent Today',  value:sent},
          {icon:'💰',label:'Payroll Deductions',  value:payrollHits},
          {icon:'🏖️',label:'On Leave (Safe)',     value:alerts.filter(a=>a.status==='on_leave').length},
          {icon:'⏰',label:'Late Logins Today',   value:alerts.filter(a=>a.status==='logged_in_late').length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#fef2f2',border:'2px solid #dc2626',borderRadius:12,padding:'14px 18px',marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:900,color:'#991b1b',marginBottom:8}}>🤖 Automated Alert System — Active</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:8,fontSize:11,color:'#7f1d1d'}}>
          <div>⏱️ System checks roster every 5 minutes</div>
          <div>🔔 Alert triggered at Shift Start + 30 min</div>
          <div>📧 Notifies via Email + WhatsApp + Viber</div>
          <div>📋 Auto-checks leave status before alerting</div>
          <div>💰 Full-day salary deduction hit to payroll</div>
          <div>⚠️ Unauthorized absence hits discipline record</div>
        </div>
      </div>

      <div style={{background:'#f8fafc',borderRadius:12,padding:'12px 16px',marginBottom:14,fontSize:11,color:'#374151',fontStyle:'italic',border:'1px solid #e2e8f0'}}>
        📋 <strong>Sample auto-message sent:</strong> "Dear [Name], you have missed logging in to duty today. This will be marked as unauthorized absence and a full-day salary deduction will be applied to your payroll. This incident will be recorded in your Discipline section of Performance Management."
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:10,marginTop:14}}>
        {filtered.map(a=>{
          const sc = STATUS_CFG[a.status]||STATUS_CFG.pending
          return (
            <div key={a.id} style={{background:'#fff',border:`1px solid ${sc.c}30`,borderRadius:12,padding:'14px 18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{a.emp}</span>
                    <span style={{fontSize:10,color:'#94a3b8'}}>{a.emp_id}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{a.dept} · Shift: {a.shift_start} · Alert at: {a.trigger_at} · {TODAY}</div>
                  {a.notified_via.length>0&&<div style={{fontSize:9,color:'#dc2626',marginTop:2}}>📧 Notified via: {a.notified_via.join(', ')}</div>}
                  {a.log_in_time&&<div style={{fontSize:9,color:'#f59e0b',marginTop:2}}>⏰ Eventually logged in at: {a.log_in_time}</div>}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end',flexShrink:0}}>
                  {a.marked_absent&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>📋 Marked Absent</span>}
                  {a.payroll_hit&&<span style={{background:'#fff7ed',color:'#c2410c',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>💰 Full Day Deducted</span>}
                </div>
              </div>
              {a.status==='sent'&&(
                <div style={{marginTop:8,display:'flex',gap:6}}>
                  <button onClick={()=>{setAlerts(prev=>prev.map(x=>x.id===a.id?{...x,payroll_hit:false,marked_absent:false}:x));notify('⚠️ Absence reversed for '+a.emp+' — HR override recorded')}} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#f59e0b',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>HR: Reverse Absence</button>
                  <button onClick={()=>notify('📧 Reminder re-sent to '+a.emp+' via Email, WhatsApp, Viber')} style={{padding:'5px 12px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer'}}>📧 Resend Alert</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {showExcel&&<ExcelModal title="No Login Report" columns={['Employee','Emp ID','Dept','Shift Start','Alert Triggered','Status','Payroll Deduction','Channels']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
    </div>
  )

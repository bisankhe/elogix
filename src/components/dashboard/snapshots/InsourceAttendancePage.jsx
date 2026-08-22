// FILE: InsourceAttendancePage.jsx - Insource Attendance (Daily Attendance)
// Direct/permanent employees: full statutory counter suite (night duty, holidays,
// OT, breaks), centralized biometric+GPS+web capture, full payroll-native control

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const INSOURCE_LOG = [
  { id:'in1', employee:'Gita Maharjan', dept:'IT', employment_type:'Regular',
    date:'2025-06-21', login:'09:02 AM', logout:'06:15 PM', total_hrs:8.5,
    break_min:32, break_compliant:true, capture_method:'biometric',
    night_duty:false, public_holiday_worked:false, rest_day_worked:false,
    overtime_hrs:0.5, extra_duty:false, location:'KTM HQ', geo_validated:true,
    impact_links:['Employee Movement','Payroll Setup'] },
  { id:'in2', employee:'Bikash Shrestha', dept:'IT', employment_type:'Regular',
    date:'2025-06-21', login:'08:58 AM', logout:'05:50 PM', total_hrs:8.3,
    break_min:30, break_compliant:true, capture_method:'biometric',
    night_duty:false, public_holiday_worked:false, rest_day_worked:false,
    overtime_hrs:0, extra_duty:false, location:'KTM HQ', geo_validated:true,
    impact_links:[] },
  { id:'in3', employee:'Hari Thapa', dept:'IT', employment_type:'Regular',
    date:'2025-06-20', login:'10:00 PM', logout:'06:00 AM', total_hrs:7.5,
    break_min:30, break_compliant:true, capture_method:'biometric',
    night_duty:true, public_holiday_worked:false, rest_day_worked:false,
    overtime_hrs:0, extra_duty:false, location:'KTM HQ', geo_validated:true,
    impact_links:['Shift Management'] },
  { id:'in4', employee:'Maya Pradhan', dept:'Finance', employment_type:'Regular',
    date:'2025-06-21', login:'09:05 AM', logout:'06:10 PM', total_hrs:8.6,
    break_min:30, break_compliant:true, capture_method:'web',
    night_duty:false, public_holiday_worked:false, rest_day_worked:false,
    overtime_hrs:0.6, extra_duty:true, location:'KTM HQ', geo_validated:true,
    impact_links:[] },
]

const METHOD_ICONS = {biometric:'👆',gps:'📍',web:'💻',qr:'📱',manual:'✏'}

export default function InsourceAttendancePage() {
  const [logs, setLogs] = useState(INSOURCE_LOG)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [showExcel, setShowExcel] = useState(false)
  const [_nm, _snm] = useState("")
  const notify = m => { _snm(m); setTimeout(()=>_snm(""),3000) }
  const [ctx, setCtx] = useState(null)

  const depts = [...new Set(logs.map(l=>l.dept))]
  const filtered = logs.filter(l=>{
    if (filterDept!=='all'&&l.dept!==filterDept) return false
    if (search&&!l.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalNightDuty = logs.filter(l=>l.night_duty).length
  const totalOT = logs.reduce((s,l)=>s+l.overtime_hrs,0)
  const breakViolations = logs.filter(l=>!l.break_compliant).length
  const avgHrs = (logs.reduce((s,l)=>s+l.total_hrs,0)/logs.length).toFixed(1)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏢" title="Insource Attendance"
        breadcrumb="Workforce Operations > Attendance Management > Daily Attendance"
        gradient={G}
        stats={[
          {icon:'👥',label:'Direct Employees', value:logs.length},
          {icon:'⏱',label:'Avg Hours/Day',      value:avgHrs+'h'},
          {icon:'🌙',label:'Night Duties',       value:totalNightDuty},
          {icon:'⚠',label:'Break Violations',   value:breakViolations},
        ]}
        onAdd={()=>notify('Attendance recorded')} addLabel="+ Record Attendance" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🏢</span>
        <div><strong>Centralized Control:</strong> Direct/permanent employee attendance is fully managed within eLogix HRMS - biometric, GPS, web, and QR capture all flow into one master record. Overtime, breaks, night duty, and holiday-worked counters auto-calculate and sync natively to payroll, with zero third-party hand-off.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {_nm&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{_nm}</div>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Departments</option>
          {depts.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Employee','Dept','Date','Login','Logout','Total Hrs','Break','OT','Flags','Method'].map(h=>(
                <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(l=>(
                <tr key={l.id} style={{borderBottom:'1px solid #f8fafc'}}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.employee,...l}})}}>
                  <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{l.employee}</td>
                  <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{l.dept}</td>
                  <td style={{padding:'9px 12px',color:'#94a3b8',fontSize:10}}>{l.date}</td>
                  <td style={{padding:'9px 12px',color:'#10b981',fontWeight:600}}>{l.login}</td>
                  <td style={{padding:'9px 12px',color:'#ef4444',fontWeight:600}}>{l.logout}</td>
                  <td style={{padding:'9px 12px',fontWeight:800,color:A}}>{l.total_hrs}h</td>
                  <td style={{padding:'9px 12px'}}><span style={{color:l.break_compliant?'#10b981':'#ef4444',fontSize:9,fontWeight:700}}>{l.break_min}min {l.break_compliant?'✓':'✗'}</span></td>
                  <td style={{padding:'9px 12px',color:l.overtime_hrs>0?'#f59e0b':'#94a3b8',fontWeight:600}}>{l.overtime_hrs>0?l.overtime_hrs+'h':'-'}</td>
                  <td style={{padding:'9px 12px',display:'flex',gap:3}}>
                    {l.night_duty&&<span title="Night Duty" style={{fontSize:11}}>🌙</span>}
                    {l.public_holiday_worked&&<span title="Holiday Worked" style={{fontSize:11}}>📅</span>}
                    {l.extra_duty&&<span title="Extra Duty" style={{fontSize:11}}>➕</span>}
                    {l.geo_validated&&<span title="Geo-Validated" style={{fontSize:11}}>📍</span>}
                  </td>
                  <td style={{padding:'9px 12px',fontSize:14}}>{METHOD_ICONS[l.capture_method]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🤖 AI Productivity & Compliance Insight</div>
        <AIImpact color={A} lines={[
          'All capture methods (biometric/GPS/web/QR) feed the same master attendance record - single source of truth.',
          'Overtime auto-calculated at 1.5x per Nepal LA2074, capped 4hrs/day, 24hrs/week.',
          `${breakViolations} break violation(s) detected this period - flagged for HR review.`,
          'Zero vendor hand-off: full payroll-native integration, no external sync delay.',
        ]}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Log',key:'view'},{icon:'✏',label:'Edit Entry (Mgr/Sup)',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Insource Attendance" columns={['Employee','Department','Date','Login','Logout','Total Hours','Break Min','Overtime Hrs','Night Duty','Holiday Worked']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

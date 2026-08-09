// FILE: VendorAttendancePage.jsx - Vendor Employee Attendance
// Geo-fenced check-in, biometric sync, timesheet auto-generation, ghost detection

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, Badge, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#042f2e 0%,#0d9488 60%,#5eead4 100%)'
const A = '#0d9488'

const TODAY = '2025-06-17'

const ATTENDANCE = [
  { id:'at1', emp_id:'VE-001', name:'Ramesh Bahadur Shrestha', name_nepali:'रमेश बहादुर श्रेष्ठ',
    vendor:'ShieldGuard Nepal', role:'Security Guard', shift:'Night (22:00-06:00)',
    date:TODAY, check_in:'22:01', check_out:'06:03',
    hours_worked:8.0, overtime:0, late_mins:1, early_leave_mins:0,
    status:'present', is_late:false, is_half_day:false,
    biometric:true, gps:true, gps_location:'KTM HQ (27.7172°N, 85.3240°E)',
    ghost_risk:5, anomaly:false, verified:true,
    monthly_summary:{present:16,absent:0,late:1,ot_hrs:4,attendance_pct:100} },
  { id:'at2', emp_id:'VE-002', name:'Sunita Gurung', name_nepali:'सुनिता गुरुङ',
    vendor:'CleanPro Services', role:'Housekeeper', shift:'Morning (06:00-14:00)',
    date:TODAY, check_in:'05:58', check_out:'14:05',
    hours_worked:8.1, overtime:0.1, late_mins:0, early_leave_mins:0,
    status:'present', is_late:false, is_half_day:false,
    biometric:true, gps:true, gps_location:'KTM HQ (27.7172°N, 85.3240°E)',
    ghost_risk:3, anomaly:false, verified:true,
    monthly_summary:{present:17,absent:0,late:0,ot_hrs:0.5,attendance_pct:100} },
  { id:'at3', emp_id:'VE-003', name:'Bikash Tamang', name_nepali:'बिकास तामाङ',
    vendor:'TechStaff Solutions', role:'IT Helpdesk L1', shift:'General (09:00-18:00)',
    date:TODAY, check_in:'09:47', check_out:null,
    hours_worked:null, overtime:0, late_mins:47, early_leave_mins:0,
    status:'present', is_late:true, is_half_day:false,
    biometric:false, gps:false, gps_location:'NOT VERIFIED',
    ghost_risk:58, anomaly:true, verified:false,
    monthly_summary:{present:14,absent:2,late:5,ot_hrs:0,attendance_pct:88} },
  { id:'at4', emp_id:'VE-004_old', name:'Puja Maharjan (Contract Expired)', name_nepali:'पुजा महर्जन',
    vendor:'ShieldGuard Nepal', role:'Driver', shift:'General (09:00-18:00)',
    date:TODAY, check_in:null, check_out:null,
    hours_worked:0, overtime:0, late_mins:0, early_leave_mins:0,
    status:'absent', is_late:false, is_half_day:false,
    biometric:false, gps:false, gps_location:null,
    ghost_risk:90, anomaly:true, verified:false,
    monthly_summary:{present:0,absent:17,late:0,ot_hrs:0,attendance_pct:0} },
  { id:'at5', emp_id:'VE-005', name:'Hari Prasad Rai', name_nepali:'हरि प्रसाद राई',
    vendor:'ShieldGuard Nepal', role:'Security Guard', shift:'Evening (14:00-22:00)',
    date:TODAY, check_in:'13:58', check_out:'22:02',
    hours_worked:8.1, overtime:0.1, late_mins:0, early_leave_mins:0,
    status:'present', is_late:false, is_half_day:false,
    biometric:true, gps:true, gps_location:'Biratnagar Office (26.4525°N, 87.2718°E)',
    ghost_risk:4, anomaly:false, verified:true,
    monthly_summary:{present:17,absent:0,late:0,ot_hrs:1.5,attendance_pct:100} },
]

const STATUS_CFG = {
  present: {c:'#10b981',bg:'#f0fdf4',icon:'✅'},
  absent:  {c:'#ef4444',bg:'#fef2f2',icon:'❌'},
  half_day:{c:'#f59e0b',bg:'#fffbeb',icon:'⏰'},
  on_leave:{c:'#3b82f6',bg:'#eff6ff',icon:'🏖'},
  holiday: {c:'#8b5cf6',bg:'#f5f3ff',icon:'🎉'},
}
const CTX_ACTIONS = [
  {icon:'✅',label:'Verify Attendance',     key:'verify'},
  {icon:'✏',label:'Manual Correction',      key:'edit'},
  {icon:'📊',label:'View Monthly Summary',  key:'monthly'},
  {icon:'📥',label:'Generate Timesheet',    key:'timesheet'},
  {icon:'🔗',label:'Impact Analysis',       key:'impact'},
  {icon:'🤖',label:'AI Ghost Check',        key:'ghost'},
  {icon:'📤',label:'Export Attendance',     key:'export'},
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun']

export default function VendorAttendancePage() {
  const [records, setRecords] = useState(ATTENDANCE)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [view, setView] = useState('daily')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = records.filter(r=>{
    if (filterStatus!=='all'&&r.status!==filterStatus) return false
    if (search&&!r.name.toLowerCase().includes(search.toLowerCase())&&!r.emp_id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const present = records.filter(r=>r.status==='present').length
  const absent  = records.filter(r=>r.status==='absent').length
  const highGhost = records.filter(r=>r.ghost_risk>50).length
  const totalOT = records.reduce((s,r)=>s+r.overtime,0)

  const verifyRecord = (id) => setRecords(p=>p.map(r=>r.id===id?{...r,verified:true,biometric:true,ghost_risk:Math.max(r.ghost_risk-20,0),anomaly:false}:r))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📅" title="Vendor Employee Attendance"
        breadcrumb="Organization Management > Vendor / Outsource Employee Management"
        gradient={G}
        stats={[
          {icon:'✅',label:'Present Today',  value:present},
          {icon:'❌',label:'Absent Today',    value:absent},
          {icon:'⏰',label:'OT Hours',        value:totalOT.toFixed(1)+'h'},
          {icon:'👻',label:'Ghost Risk',      value:highGhost},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Log Attendance"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#f0fdf4,#f5f3ff)',border:'1px solid #a7f3d0',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#065f46'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074, Section 64:</strong> Main employer must maintain attendance records of all outsourced employees. Records used for billing verification and SLA compliance. AI detects ghost workers.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, VE-ID..."/>
        <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','present','absent'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'8px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
        {['daily','monthly'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'9px 14px',borderRadius:9,border:`1.5px solid ${view===v?A:'#e2e8f0'}`,background:view===v?'#f0fdfa':'#fff',color:view===v?A:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>
            {v.charAt(0).toUpperCase()+v.slice(1)}
          </button>
        ))}
      </div>

      {/* DAILY VIEW */}
      {view==='daily' && (
        <div style={{display:'grid',gap:12}}>
          {filtered.map(r=>{
            const sc = STATUS_CFG[r.status]||STATUS_CFG.absent
            const ghostColor = r.ghost_risk>50?'#ef4444':r.ghost_risk>25?'#f59e0b':'#10b981'
            return (
              <div key={r.id}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.name,emp_id:r.emp_id,impact_links:['Billing','SLA Contract','Attendance Report']}})}}
                style={{background:'#fff',border:`1px solid ${r.anomaly?'#fecaca':r.ghost_risk>50?'#fde68a':'#e2e8f0'}`,
                  borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.05)',
                  borderLeft:`5px solid ${r.ghost_risk>50?'#ef4444':sc.c}`}}>

                {r.anomaly && <div style={{background:'#fef2f2',padding:'4px 16px',fontSize:9,fontWeight:800,color:'#dc2626',borderBottom:'1px solid #fecaca'}}>ANOMALY DETECTED - {r.ghost_risk>70?'GHOST WORKER RISK':'VERIFICATION REQUIRED'}</div>}

                <div style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',flexWrap:'wrap'}}>
                  <div style={{width:44,height:44,borderRadius:12,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:sc.c,flexShrink:0}}>
                    {r.emp_id.split('-')[1]}
                  </div>
                  <div style={{flex:1,minWidth:180}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                      <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.name}</span>
                      <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {r.status.toUpperCase()}</span>
                      {r.is_late && <span style={{background:'#fffbeb',color:'#d97706',border:'1px solid #fde68a',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20}}>Late {r.late_mins}m</span>}
                    </div>
                    <div style={{fontSize:10,color:'#64748b'}}>{r.emp_id} . {r.vendor} . {r.shift}</div>
                  </div>

                  {/* Clock in/out */}
                  <div style={{display:'flex',gap:12,flexShrink:0}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:16,fontWeight:900,color:r.check_in?'#10b981':'#94a3b8'}}>{r.check_in||'--:--'}</div>
                      <div style={{fontSize:9,color:'#94a3b8'}}>CHECK IN</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:16,fontWeight:900,color:r.check_out?'#ef4444':'#94a3b8'}}>{r.check_out||'--:--'}</div>
                      <div style={{fontSize:9,color:'#94a3b8'}}>CHECK OUT</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:16,fontWeight:900,color:A}}>{r.hours_worked!==null?r.hours_worked+'h':'--'}</div>
                      <div style={{fontSize:9,color:'#94a3b8'}}>WORKED</div>
                    </div>
                    {r.overtime>0 && (
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:14,fontWeight:900,color:'#f59e0b'}}>+{r.overtime}h</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>OT</div>
                      </div>
                    )}
                  </div>

                  {/* Verification badges */}
                  <div style={{display:'flex',gap:5,flexShrink:0}}>
                    {[['Bio',r.biometric],['GPS',r.gps],['Verified',r.verified]].map(([l,ok])=>(
                      <span key={l} style={{background:ok?'#f0fdf4':'#fef2f2',color:ok?'#15803d':'#dc2626',border:`1px solid ${ok?'#bbf7d0':'#fecaca'}`,fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:20}}>
                        {ok?'✓':'✗'} {l}
                      </span>
                    ))}
                  </div>

                  {/* Ghost risk */}
                  <div style={{textAlign:'center',flexShrink:0,minWidth:60}}>
                    <div style={{fontSize:16,fontWeight:900,color:ghostColor}}>{r.ghost_risk}%</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>GHOST RISK</div>
                  </div>
                </div>

                <div style={{padding:'6px 16px 8px',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:10,color:'#94a3b8',borderTop:'1px solid #f8fafc',flexWrap:'wrap',gap:6}}>
                  <span>{r.gps_location||'Location not verified'}</span>
                  <div style={{display:'flex',gap:6}}>
                    {!r.verified && (
                      <button onClick={()=>verifyRecord(r.id)}
                        style={{padding:'5px 12px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                        Verify
                      </button>
                    )}
                    <button style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${A}33`,background:'#f0fdfa',color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>
                      Monthly
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MONTHLY SUMMARY VIEW */}
      {view==='monthly' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#f0fdfa,#eff6ff)'}}>
                  {['VE-ID','Employee','Vendor','Shift','Present','Absent','Late','OT Hrs','Attendance%','Ghost Risk','Status'].map(h=>(
                    <th key={h} style={{padding:'12px 10px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r=>(
                  <tr key={r.id} style={{borderBottom:'1px solid #f8fafc'}}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.name,emp_id:r.emp_id,impact_links:['Billing','SLA']}})}}
                    onMouseEnter={ev=>ev.currentTarget.style.background='#f0fdfa'}
                    onMouseLeave={ev=>ev.currentTarget.style.background='#fff'}>
                    <td style={{padding:'10px 10px',fontFamily:'monospace',fontSize:10,fontWeight:800,color:A}}>{r.emp_id}</td>
                    <td style={{padding:'10px 10px'}}>
                      <div style={{fontWeight:700,color:'#0f172a',fontSize:11}}>{r.name}</div>
                      <div style={{fontSize:9,color:'#94a3b8'}}>{r.name_nepali}</div>
                    </td>
                    <td style={{padding:'10px 10px',fontSize:10,color:'#64748b'}}>{r.vendor}</td>
                    <td style={{padding:'10px 10px',fontSize:10,color:'#64748b'}}>{r.shift.split(' ')[0]}</td>
                    <td style={{padding:'10px 10px',textAlign:'center',fontWeight:800,color:'#10b981'}}>{r.monthly_summary.present}</td>
                    <td style={{padding:'10px 10px',textAlign:'center',fontWeight:800,color:r.monthly_summary.absent>0?'#ef4444':'#94a3b8'}}>{r.monthly_summary.absent}</td>
                    <td style={{padding:'10px 10px',textAlign:'center',fontWeight:800,color:r.monthly_summary.late>2?'#f59e0b':'#64748b'}}>{r.monthly_summary.late}</td>
                    <td style={{padding:'10px 10px',textAlign:'center',fontWeight:700,color:'#f59e0b'}}>{r.monthly_summary.ot_hrs}h</td>
                    <td style={{padding:'10px 10px',textAlign:'center'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{flex:1,height:6,background:'#e2e8f0',borderRadius:3,overflow:'hidden'}}>
                          <div style={{width:`${r.monthly_summary.attendance_pct}%`,height:'100%',background:r.monthly_summary.attendance_pct>=95?'#10b981':r.monthly_summary.attendance_pct>=80?'#f59e0b':'#ef4444',borderRadius:3}}/>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:r.monthly_summary.attendance_pct>=95?'#10b981':r.monthly_summary.attendance_pct>=80?'#f59e0b':'#ef4444',flexShrink:0}}>{r.monthly_summary.attendance_pct}%</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 10px',textAlign:'center',fontWeight:800,color:r.ghost_risk>50?'#ef4444':r.ghost_risk>25?'#f59e0b':'#10b981'}}>{r.ghost_risk}%</td>
                    <td style={{padding:'10px 10px'}}><Badge status={r.status}/></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:'#f0fdfa'}}>
                  <td colSpan={4} style={{padding:'10px',fontWeight:800,fontSize:11,color:A}}>TOTALS / AVERAGES</td>
                  <td style={{padding:'10px',textAlign:'center',fontWeight:800,color:'#10b981'}}>{filtered.reduce((s,r)=>s+r.monthly_summary.present,0)}</td>
                  <td style={{padding:'10px',textAlign:'center',fontWeight:800,color:'#ef4444'}}>{filtered.reduce((s,r)=>s+r.monthly_summary.absent,0)}</td>
                  <td style={{padding:'10px',textAlign:'center',fontWeight:800,color:'#f59e0b'}}>{filtered.reduce((s,r)=>s+r.monthly_summary.late,0)}</td>
                  <td style={{padding:'10px',textAlign:'center',fontWeight:800,color:'#f59e0b'}}>{filtered.reduce((s,r)=>s+r.monthly_summary.ot_hrs,0).toFixed(1)}h</td>
                  <td style={{padding:'10px',textAlign:'center',fontWeight:800,color:A}}>
                    {Math.round(filtered.reduce((s,r)=>s+r.monthly_summary.attendance_pct,0)/(filtered.length||1))}%
                  </td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Generate Timesheet Button */}
      <div style={{marginTop:16,background:'linear-gradient(135deg,#f0fdfa,#eff6ff)',border:'1px solid #a7f3d0',borderRadius:12,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:3}}>Monthly Timesheet Export</div>
          <div style={{fontSize:11,color:'#64748b'}}>Generate verified timesheets for vendor billing reconciliation and SLA compliance reporting.</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{padding:'10px 20px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Generate Timesheet</button>
          <button style={{padding:'10px 20px',borderRadius:10,border:`1px solid ${A}33`,background:'#fff',color:A,fontSize:12,fontWeight:600,cursor:'pointer'}}>AI Ghost Scan</button>
        </div>
      </div>

      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Log Attendance Entry</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>Manual override. AI will flag if inconsistent with biometric/GPS data.</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Employee" type="select" value="" onChange={()=>{}} accent={A}
                  options={['VE-001 Ramesh Shrestha','VE-002 Sunita Gurung','VE-003 Bikash Tamang','VE-005 Hari Rai']}/>
                <Field label="Date" type="date" value={TODAY} onChange={()=>{}} accent={A}/>
                <Field label="Check-in Time" type="time" value="" onChange={()=>{}} accent={A}/>
                <Field label="Check-out Time" type="time" value="" onChange={()=>{}} accent={A}/>
                <Field label="Attendance Status" type="select" value="" onChange={()=>{}} accent={A}
                  options={['Present','Absent','Half Day','On Leave','Holiday']}/>
                <Field label="Verification Method" type="select" value="" onChange={()=>{}} accent={A}
                  options={['Biometric','GPS Mobile','Access Card','Manual','CCTV Verified']}/>
                <Field label="Overtime Hours" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Remarks" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              </div>
              <AIImpact color={A} lines={[
                'AI validates manual entry against biometric/GPS logs. Flags discrepancies.',
                'Overtime auto-calculated at 1.5x rate per Nepal Labour Act 2074 Section 30.',
                'Monthly timesheet auto-generated for billing reconciliation.',
                'Ghost risk score updated after each attendance entry.',
              ]}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Log Attendance</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX_ACTIONS} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel && <ExcelModal title="Vendor Attendance" columns={['VE-ID','Name','Vendor','Date','Check-In','Check-Out','Hours Worked','OT Hours','Status','Biometric','GPS Verified','Ghost Risk']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

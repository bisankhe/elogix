// FILE: OutsourceAttendancePage.jsx - Page 5: Outsource Attendance
import { useState } from 'react'
import { ExcelModal, PageHeader, SearchBar, Badge, ContextMenu } from './DeptSetupShared.jsx'

const T = { gradient:'linear-gradient(135deg,#5b21b6 0%,#8b5cf6 100%)', accent:'#5b21b6', light:'#f5f3ff' }

const MONTHS = ['June 2026','May 2026','April 2026']
const MOCK_ATTENDANCE = [
  {id:'a1', emp_id:'OUT-001', name:'Ramesh Shrestha',  vendor:'ShieldGuard Nepal', role:'Security Guard',
   shift:'Night', total_days:26, present:26, absent:0, late:1, half_day:0,
   att_pct:100, shift_start:'22:00', shift_end:'06:00', overtime_hrs:3,
   biometric_verified:true, location:'Kathmandu HQ', ghost_risk:'low',
  },
  {id:'a2', emp_id:'OUT-002', name:'Sita Tamang',      vendor:'CleanPro Services', role:'Housekeeping',
   shift:'Day', total_days:26, present:24, absent:2, late:3, half_day:0,
   att_pct:92, shift_start:'07:00', shift_end:'15:00', overtime_hrs:0,
   biometric_verified:true, location:'KTM HQ - All Floors', ghost_risk:'low',
  },
  {id:'a3', emp_id:'OUT-003', name:'Bikash Rai',       vendor:'TechStaff Solutions', role:'IT Helpdesk',
   shift:'Day', total_days:26, present:23, absent:3, late:5, half_day:1,
   att_pct:88, shift_start:'09:00', shift_end:'18:00', overtime_hrs:0,
   biometric_verified:false, location:'IT Helpdesk', ghost_risk:'medium',
  },
  {id:'a4', emp_id:'OUT-004', name:'Priya Gurung',     vendor:'ShieldGuard Nepal', role:'Security Guard',
   shift:'Day', total_days:26, present:25, absent:1, late:2, half_day:0,
   att_pct:96, shift_start:'06:00', shift_end:'14:00', overtime_hrs:4,
   biometric_verified:true, location:'KTM HQ - Parking', ghost_risk:'low',
  },
  {id:'a5', emp_id:'OUT-005', name:'Hari Thapa',       vendor:'NepCatering Services', role:'Kitchen Staff',
   shift:'Day', total_days:26, present:21, absent:5, late:4, half_day:2,
   att_pct:81, shift_start:'07:00', shift_end:'16:00', overtime_hrs:0,
   biometric_verified:true, location:'HQ Cafeteria', ghost_risk:'high',
  },
]

const CONTEXT_ACTIONS = [
  {icon:'👁', label:'View Full Record',   key:'view'},
  {icon:'📅', label:'View Calendar View', key:'calendar'},
  {icon:'⚠', label:'Flag Ghost Risk',    key:'ghost'},
  {icon:'📤', label:'Export Attendance',  key:'export'},
  {icon:'💰', label:'Link to Invoice',    key:'invoice'},
]

export default function OutsourceAttendancePage() {
  const [ctx,       setCtx]       = useState(null)
  const [showConfig,setShowConfig] = useState(false)
  const [configVendor,setConfigVendor] = useState('ShieldGuard Nepal')
  const [configMethod,setConfigMethod] = useState('biometric')
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [month,     setMonth]     = useState('June 2026')
  const [search,    setSearch]    = useState('')
  const [showExcel, setShowExcel] = useState(false)

  const filtered = MOCK_ATTENDANCE.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.vendor.toLowerCase().includes(search.toLowerCase())
  )

  const avgAtt   = Math.round(filtered.reduce((s,e)=>s+e.att_pct,0)/filtered.length)
  const ghostRisk = filtered.filter(e=>e.ghost_risk!=='low').length
  const unverified = filtered.filter(e=>!e.biometric_verified).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="📅" title="Outsource Attendance"
        breadcrumb="Organization Management > Workforce Configuration > Employment Type > Outsource"
        gradient={T.gradient}
        stats={[
          {icon:'📅',label:'Workers Tracked',    value:filtered.length},
          {icon:'📊',label:'Avg Attendance',     value:avgAtt+'%'},
          {icon:'⚠', label:'Ghost Worker Risk',  value:ghostRisk},
          {icon:'👁', label:'Biometric Verified', value:(filtered.length-unverified)+'/'+filtered.length},
        ]}
        onAdd={()=>setShowConfig(true)} addLabel="⚙️ Configure Device"
        onExcel={()=>setShowExcel(true)}
      />

      {/* Alerts */}
      {(ghostRisk>0||unverified>0) && (
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:800,color:'#dc2626',marginBottom:6}}>
            Attendance Compliance Alerts
          </div>
          {filtered.filter(e=>e.ghost_risk==='high').map((e,i)=>(
            <div key={i} style={{fontSize:11,color:'#991b1b',padding:'3px 0',display:'flex',gap:6}}>
              <span>👻</span><span><strong>{e.name}</strong> - HIGH ghost worker risk: {e.absent} absences, {e.late} late, {e.att_pct}% attendance. Verify physical presence.</span>
            </div>
          ))}
          {filtered.filter(e=>!e.biometric_verified).map((e,i)=>(
            <div key={i} style={{fontSize:11,color:'#b45309',padding:'3px 0',display:'flex',gap:6}}>
              <span>👁</span><span><strong>{e.name}</strong> - Biometric not verified. Manual attendance only - fraud risk.</span>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{flex:1,position:'relative',minWidth:220}}>
          <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'#94a3b8'}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search workers..."
            style={{width:'100%',padding:'10px 14px 10px 36px',borderRadius:12,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <select value={month} onChange={e=>setMonth(e.target.value)}
          style={{padding:'10px 14px',borderRadius:12,border:'1.5px solid #e2e8f0',fontSize:12,background:'#fff',cursor:'pointer',outline:'none'}}>
          {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'8px 14px',marginBottom:14,fontSize:11,color:'#4c1d95'}}>
        Labour Act 2074: Main employer must track outsource attendance and verify agency pays workers. Right-click for ghost worker risk analysis.
      </div>

      {/* Attendance Table */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',marginBottom:14}}>
        <div style={{padding:'12px 18px',background:'linear-gradient(135deg,#f5f3ff,#eff6ff)',
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:13,fontWeight:800,color:'#3730a3'}}>Attendance Register - {month}</div>
          <div style={{fontSize:11,color:'#6366f1',fontWeight:600}}>
            Working Days: 26 &bull; Total Workers: {filtered.length}
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                {['Worker','Vendor','Role','Shift','Present','Absent','Late','OT Hrs','Att %','Bio Verified','Ghost Risk','Status'].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:700,
                    color:'#5b21b6',borderBottom:'2px solid #e0e7ff',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e,i)=>{
                const attColor = e.att_pct>=95?'#10b981':e.att_pct>=85?'#f59e0b':'#ef4444'
                return (
                  <tr key={e.id}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.name,...e}})}}
                    style={{borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                    onMouseEnter={ev=>ev.currentTarget.style.background='#f5f3ff'}
                    onMouseLeave={ev=>ev.currentTarget.style.background='#fff'}>
                    <td style={{padding:'10px 12px',fontWeight:700,color:'#0f172a'}}>{e.name}
                      <div style={{fontSize:9,color:'#94a3b8'}}>{e.emp_id}</div>
                    </td>
                    <td style={{padding:'10px 12px',color:'#64748b',fontSize:11}}>{e.vendor.split(' ')[0]}</td>
                    <td style={{padding:'10px 12px',color:'#64748b',fontSize:11}}>{e.role}</td>
                    <td style={{padding:'10px 12px',fontSize:11}}>
                      <span style={{background:'#eef2ff',color:'#3730a3',fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{e.shift}</span>
                    </td>
                    <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:'#10b981'}}>{e.present}</td>
                    <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:e.absent>0?'#ef4444':'#94a3b8'}}>{e.absent}</td>
                    <td style={{padding:'10px 12px',textAlign:'center',color:e.late>2?'#f59e0b':'#94a3b8'}}>{e.late}</td>
                    <td style={{padding:'10px 12px',textAlign:'center',color:e.overtime_hrs>0?'#8b5cf6':'#94a3b8',fontWeight:e.overtime_hrs>0?700:400}}>{e.overtime_hrs}h</td>
                    <td style={{padding:'10px 12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{flex:1,height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden',minWidth:50}}>
                          <div style={{width:`${e.att_pct}%`,height:'100%',background:attColor,borderRadius:6}}/>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:attColor,width:32}}>{e.att_pct}%</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 12px',textAlign:'center'}}>
                      {e.biometric_verified
                        ?<span style={{background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>Bio OK</span>
                        :<span style={{background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>Manual Only</span>}
                    </td>
                    <td style={{padding:'10px 12px',textAlign:'center'}}>
                      <span style={{background:e.ghost_risk==='low'?'#f0fdf4':e.ghost_risk==='medium'?'#fffbeb':'#fef2f2',
                        color:e.ghost_risk==='low'?'#15803d':e.ghost_risk==='medium'?'#b45309':'#dc2626',
                        fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                        {e.ghost_risk.charAt(0).toUpperCase()+e.ghost_risk.slice(1)}
                      </span>
                    </td>
                    <td style={{padding:'10px 12px'}}><Badge status="active"/></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{background:'linear-gradient(135deg,#f5f3ff,#eff6ff)',borderTop:'2px solid #e0e7ff'}}>
                <td colSpan={4} style={{padding:'10px 12px',fontWeight:700,color:'#3730a3',fontSize:12}}>
                  Total / Average
                </td>
                <td style={{padding:'10px 12px',textAlign:'center',fontWeight:900,color:'#10b981'}}>
                  {filtered.reduce((s,e)=>s+e.present,0)}
                </td>
                <td style={{padding:'10px 12px',textAlign:'center',fontWeight:900,color:'#ef4444'}}>
                  {filtered.reduce((s,e)=>s+e.absent,0)}
                </td>
                <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:'#f59e0b'}}>
                  {filtered.reduce((s,e)=>s+e.late,0)}
                </td>
                <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:'#8b5cf6'}}>
                  {filtered.reduce((s,e)=>s+e.overtime_hrs,0)}h
                </td>
                <td style={{padding:'10px 12px',fontWeight:900,color:avgAtt>=90?'#10b981':'#f59e0b'}}>
                  {avgAtt}% avg
                </td>
                <td colSpan={3}/>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)'}}>{msg}</div>}

      {/* DEVICE CONFIGURATION MODAL */}
      {showConfig && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowConfig(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:560,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:T.gradient,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>⚙️ Configure Outsource Attendance</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>Each outsource company can configure their employees and attendance method here</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>Outsource Company</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {['ShieldGuard Nepal','CleanPro Services','TechStaff Solutions','NepCatering Services'].map(v=>(
                    <button key={v} onClick={()=>setConfigVendor(v)} style={{padding:'7px 14px',borderRadius:9,border:`2px solid ${configVendor===v?T.accent:'#e2e8f0'}`,background:configVendor===v?`${T.accent}12`:'#fff',color:configVendor===v?T.accent:'#64748b',fontSize:10,fontWeight:configVendor===v?700:400,cursor:'pointer'}}>{v}</button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>Attendance Capture Method</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[['biometric','👆 Biometric (Fingerprint / Face ID)','Auto-verified, fraud-proof'],['manual','📝 Manual Attendance Register','Paper/supervisor sign-off'],['web_checkin','💻 Web Check-In / Mobile App','Employee self-service online'],['qr_code','📱 QR Code Scan','Daily QR at entry point']].map(([k,l,d])=>(
                    <div key={k} onClick={()=>setConfigMethod(k)} style={{padding:'10px 12px',borderRadius:10,border:`2px solid ${configMethod===k?T.accent:'#e2e8f0'}`,background:configMethod===k?`${T.accent}08`:'#fff',cursor:'pointer'}}>
                      <div style={{fontSize:11,fontWeight:700,color:configMethod===k?T.accent:'#374151'}}>{l}</div>
                      <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{d}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'12px',marginBottom:16,fontSize:10,color:'#4c1d95'}}>
                <strong>Employees included from {configVendor}:</strong> {MOCK_ATTENDANCE.filter(e=>e.vendor.includes(configVendor.split(' ')[0])).map(e=>e.name).join(', ')||'All employees'}<br/>
                <span style={{marginTop:4,display:'block',color:'#6d28d9'}}>Attendance will be captured using <strong>{configMethod.replace('_',' ')}</strong> method starting next working day.</span>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{notify('✅ Attendance configured for '+configVendor+' using '+configMethod.replace('_',' '));setShowConfig(false)}}
                  style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:T.gradient,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>💾 Save Configuration</button>
                <button onClick={()=>setShowConfig(false)} style={{padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
        impactLinks={[{module:'Billing'},{module:'Ghost Worker Prevention'},{module:'Payroll Validation'}].map(l=>l.module)}
        actions={CONTEXT_ACTIONS}
        onAction={()=>{}} onClose={()=>setCtx(null)} />}
      {showExcel && <ExcelModal title="Outsource Attendance"
        columns={['EMP ID','Name','Vendor','Role','Month','Present','Absent','Late','OT Hours','Att%','Bio Verified']}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Importing: '+f.name)} />}
    </div>
  )

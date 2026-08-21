// FILE: CompensatoryLeavePage.jsx - Compensatory Leave (Leave Settlement)
// Auto-credit engine: detects weekend/holiday work from attendance, banks
// comp-off at premium rate, 21-day use-by countdown, payout-if-unused fallback.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'
const COMP_RATIO = 1.0 // Nepal LA2074 Section 42: substitute leave is 1-for-1 day, not premium-rated like OT pay

const COMP_BALANCE = [
  { id:'cb1', employee:'Ramesh Shrestha (Security)', worked_date:'2025-06-08', worked_reason:'Weekly off coverage', source:'weekly_rest_day',
    days_credited:1, credited_on:'2025-06-09', use_by_date:'2025-06-29', days_remaining:5, status:'pending_use',
    impact_links:['GPS Attendance','Substitute Leave Tracker'] },
  { id:'cb2', employee:'Sita Tamang (Housekeeping)', worked_date:'2025-10-09', worked_reason:'Dashain Phulpati coverage', source:'public_holiday',
    days_credited:1, credited_on:'2025-10-10', use_by_date:'2025-10-30', days_remaining:0, status:'used',
    used_date:'2025-10-25', impact_links:[] },
  { id:'cb3', employee:'Hari Thapa', worked_date:'2025-06-01', worked_reason:'Critical server maintenance window', source:'weekly_rest_day',
    days_credited:1, credited_on:'2025-06-02', use_by_date:'2025-06-22', days_remaining:1, status:'expiring_soon',
    impact_links:['Late & Early Tracking'] },
  { id:'cb4', employee:'Bikash Rai', worked_date:'2025-05-15', worked_reason:'Weekend deployment', source:'weekly_rest_day',
    days_credited:1, credited_on:'2025-05-16', use_by_date:'2025-06-05', days_remaining:-16, status:'expired_paid_out',
    payout_npr:1083, impact_links:['Payroll Setup'] },
]

const STATUS_CFG = {
  pending_use:{c:'#3b82f6',bg:'#eff6ff',icon:'⏳',label:'Banked - Pending Use'},
  expiring_soon:{c:'#f59e0b',bg:'#fffbeb',icon:'⚠',label:'Expiring Soon'},
  used:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Used'},
  expired_paid_out:{c:'#94a3b8',bg:'#f8fafc',icon:'💰',label:'Expired - Paid Out'},
const SOURCE_LABELS = {weekly_rest_day:'Weekly Rest Day',public_holiday:'Public Holiday'}

export default function CompensatoryLeavePage() {
  const [balances, setBalances] = useState(COMP_BALANCE)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = balances.filter(b=>{
    if (filterStatus!=='all'&&b.status!==filterStatus) return false
    if (search&&!b.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const pendingCount = balances.filter(b=>b.status==='pending_use'||b.status==='expiring_soon').length
  const expiringCount = balances.filter(b=>b.status==='expiring_soon').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔄" title="Compensatory Leave"
        breadcrumb="Workforce Operations > Leave Management > Leave Settlement"
        gradient={G}
        stats={[
          {icon:'🔄',label:'Total Banked',     value:balances.length},
          {icon:'⏳',label:'Awaiting Use',      value:pendingCount},
          {icon:'⚠',label:'Expiring Soon',     value:expiringCount},
          {icon:'💰',label:'Paid Out (Expired)',value:balances.filter(b=>b.status==='expired_paid_out').length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074, Section 42:</strong> Working through a weekly rest day or public holiday entitles the employee to a substitute day off, scheduled in coordination with the employer - not freely chosen. Must be granted within <strong>21 days</strong> of the worked date. Unused comp-off may be paid out per company policy.</div>
      </div>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🤖</span>
        <div><strong>Auto-Credit Engine:</strong> Whenever Daily Attendance flags <code>is_weekly_rest_day_worked</code> or <code>is_public_holiday_worked</code>, this module automatically banks 1 day of comp-off - no manual application needed. A 21-day countdown starts immediately.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,overflowX:'auto'}}>
          {['all',...Object.keys(STATUS_CFG)].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(b=>{
          const sc = STATUS_CFG[b.status]
          return (
            <div key={b.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:b.employee,...b}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{b.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{SOURCE_LABELS[b.source]}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>Worked {b.worked_date} . {b.worked_reason}</div>
                </div>
                {(b.status==='pending_use'||b.status==='expiring_soon')&&(
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:16,fontWeight:900,color:b.days_remaining<=2?'#ef4444':A}}>{b.days_remaining}d</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>UNTIL EXPIRY</div>
                  </div>
                )}
              </div>
              <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                {[{l:'Days Credited',v:b.days_credited+'d',c:'#10b981'},{l:'Credited On',v:b.credited_on,c:'#64748b'},{l:'Use-By Date',v:b.use_by_date,c:b.days_remaining<=2&&b.days_remaining>=0?'#ef4444':'#64748b'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600,marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
              {b.status==='expired_paid_out'&&<div style={{padding:'10px 20px',background:'#f8fafc',fontSize:10,color:'#64748b'}}>💰 Unused comp-off auto-paid out: <strong>NPR {b.payout_npr}</strong> (next payroll cycle)</div>}
              {b.status==='used'&&<div style={{padding:'10px 20px',background:'#f0fdf4',fontSize:10,color:'#065f46'}}>✅ Taken on {b.used_date}</div>}
              {(b.status==='pending_use'||b.status==='expiring_soon')&&(
                <div style={{padding:'10px 20px',display:'flex',justifyContent:'flex-end'}}>
                  <button style={{padding:'7px 16px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Schedule This Comp-Off</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {expiringCount>0&&(
        <div style={{marginTop:16,background:'#fff',border:'1px solid #fed7aa',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🤖 AI Expiry Alert</div>
          <AIImpact color={A} lines={[`${expiringCount} comp-off entry(ies) expiring within 2 days - push notification sent to employee and manager.`,'If not scheduled by the use-by date, this will auto-convert to a payroll payout per company policy.']}/>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Source Attendance',key:'view'},{icon:'📅',label:'Schedule Use',key:'schedule'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Compensatory Leave Balances" columns={['Employee','Worked Date','Source','Days Credited','Use-By Date','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

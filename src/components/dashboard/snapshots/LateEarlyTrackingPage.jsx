// FILE: LateEarlyTrackingPage.jsx - Late & Early Tracking (Attendance Management)
// Grace-period-aware exception log: late arrivals/early departures vs scheduled
// shift, chronic-pattern detection, consistent cross-department policy enforcement.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const GRACE_PERIOD_MIN = 10

const EXCEPTIONS = [
  { id:'le1', employee:'Hari Thapa', dept:'IT', date:'2025-06-21', type:'late_arrival',
    scheduled:'09:00 AM', actual:'09:18 AM', deviation_min:18, beyond_grace:true,
    occurrences_this_month:4, chronic_flag:true, impact_links:['Employee Movement','Disciplinary Records'] },
  { id:'le2', employee:'Maya Pradhan', dept:'Finance', date:'2025-06-21', type:'late_arrival',
    scheduled:'09:00 AM', actual:'09:06 AM', deviation_min:6, beyond_grace:false,
    occurrences_this_month:1, chronic_flag:false, impact_links:[] },
  { id:'le3', employee:'Anjali Sharma', dept:'Sales', date:'2025-06-20', type:'early_departure',
    scheduled:'05:00 PM', actual:'04:22 PM', deviation_min:38, beyond_grace:true,
    occurrences_this_month:3, chronic_flag:true, impact_links:['Performance Review'] },
  { id:'le4', employee:'Bikash Shrestha', dept:'IT', date:'2025-06-21', type:'late_arrival',
    scheduled:'09:00 AM', actual:'09:03 AM', deviation_min:3, beyond_grace:false,
    occurrences_this_month:1, chronic_flag:false, impact_links:[] },
]

const TYPE_CFG = {late_arrival:{c:'#ef4444',bg:'#fef2f2',icon:'⏰',label:'Late Arrival'},early_departure:{c:'#f59e0b',bg:'#fffbeb',icon:'🚪',label:'Early Departure'}}

export default function LateEarlyTrackingPage() {
  const [exceptions, setExceptions] = useState(EXCEPTIONS)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = exceptions.filter(e=>{
    if (filterType!=='all'&&e.type!==filterType) return false
    if (search&&!e.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const chronicCount = exceptions.filter(e=>e.chronic_flag).length
  const beyondGraceCount = exceptions.filter(e=>e.beyond_grace).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⏰" title="Late & Early Tracking"
        breadcrumb="Workforce Operations > Attendance Management > Overtime"
        gradient={G}
        stats={[
          {icon:'📋',label:"Today's Exceptions", value:exceptions.length},
          {icon:'⏰',label:'Late Arrivals',       value:exceptions.filter(e=>e.type==='late_arrival').length},
          {icon:'🚪',label:'Early Departures',    value:exceptions.filter(e=>e.type==='early_departure').length},
          {icon:'🔁',label:'Chronic Pattern',      value:chronicCount},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🕐</span>
        <div><strong>Grace Period: {GRACE_PERIOD_MIN} minutes</strong> - applied uniformly across all departments per consistent policy enforcement best practice. Deviations within this window are not flagged. Chronic patterns (3+ occurrences/month) surface for a coaching conversation, not automatic penalty - disclosed in advance per Nepal LA2074 internal disciplinary rules.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','late_arrival','early_departure'].map(t=>(
            <button key={t} onClick={()=>setFilterType(t)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterType===t?'#fff':'transparent',color:filterType===t?A:'#64748b',
                fontWeight:filterType===t?700:400,boxShadow:filterType===t?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {t==='all'?'All':TYPE_CFG[t].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Employee','Dept','Date','Type','Scheduled','Actual','Deviation','This Month','Flag'].map(h=>(
                <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(e=>{
                const tc = TYPE_CFG[e.type]
                return (
                  <tr key={e.id} style={{borderBottom:'1px solid #f8fafc'}}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.employee,...e}})}}>
                    <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{e.employee}</td>
                    <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{e.dept}</td>
                    <td style={{padding:'9px 12px',color:'#94a3b8',fontSize:10}}>{e.date}</td>
                    <td style={{padding:'9px 12px'}}><span style={{background:tc.bg,color:tc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{tc.icon} {tc.label}</span></td>
                    <td style={{padding:'9px 12px',color:'#94a3b8'}}>{e.scheduled}</td>
                    <td style={{padding:'9px 12px',fontWeight:700,color:tc.c}}>{e.actual}</td>
                    <td style={{padding:'9px 12px',fontWeight:800,color:e.beyond_grace?'#ef4444':'#10b981'}}>{e.deviation_min}min {e.beyond_grace?'⚠':'✓'}</td>
                    <td style={{padding:'9px 12px',color:'#64748b'}}>{e.occurrences_this_month}x</td>
                    <td style={{padding:'9px 12px'}}>{e.chronic_flag&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>🔁 Chronic</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {chronicCount>0&&(
        <div style={{marginTop:16,background:'#fff',border:'1px solid #fed7aa',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🤖 AI Pattern Insight</div>
          <AIImpact color={A} lines={[
            `${chronicCount} employee(s) show chronic late/early patterns (3+ times this month).`,
            'AI suggests checking shift timing or commute distance before assuming a discipline issue.',
            'Recommended: a coaching conversation, not an automatic pay deduction.',
          ]}/>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View History',key:'view'},{icon:'💬',label:'Schedule Coaching',key:'coach'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Late & Early Tracking" columns={['Employee','Department','Date','Type','Scheduled','Actual','Deviation (min)','Occurrences This Month','Chronic Flag']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

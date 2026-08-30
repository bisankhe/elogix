// FILE: HalfDayLeavePage.jsx - Half-Day Leave (Leave Operations)
// First-half/second-half toggle config, minimum-hours-worked validation,
// 0.5-day balance deduction tracker, abuse-pattern detection.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const HALF_DAY_CONFIG = { first_half:{start:'09:00 AM',end:'01:00 PM'}, second_half:{start:'01:00 PM',end:'06:00 PM'}, min_hours_required:4 }

const HALF_DAY_LOG = [
  { id:'hd1', employee:'Maya Pradhan', date:'2025-06-25', period:'Second Half', leave_type:'Home/Annual Leave',
    hours_worked:4.2, min_required:4, valid:true, occurrences_this_month:1,
    impact_links:['Leave Balance','Employee Movement'] },
  { id:'hd2', employee:'Hari Thapa', date:'2025-06-20', period:'First Half', leave_type:'Home/Annual Leave',
    hours_worked:3.5, min_required:4, valid:false, occurrences_this_month:4,
    impact_links:['Late & Early Tracking'] },
  { id:'hd3', employee:'Anjali Sharma', date:'2025-06-18', period:'Second Half', leave_type:'Sick Leave',
    hours_worked:4.0, min_required:4, valid:true, occurrences_this_month:1,
    impact_links:[] },
]

export default function HalfDayLeavePage() {
  const [log, setLog] = useState(HALF_DAY_LOG)
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = log.filter(l=>!search||l.employee.toLowerCase().includes(search.toLowerCase()))
  const validCount = log.filter(l=>l.valid).length
  const flaggedCount = log.filter(l=>l.occurrences_this_month>=3).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="½" title="Half-Day Leave"
        breadcrumb="Workforce Operations > Leave Management > Leave Operations"
        gradient={G}
        stats={[
          {icon:'½',label:'This Month',          value:log.length},
          {icon:'✅',label:'Valid (Min Hrs Met)', value:validCount},
          {icon:'⚠',label:'Below Min Hours',     value:log.length-validCount},
          {icon:'🔁',label:'Pattern Flagged',      value:flaggedCount},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🕐</span>
        <div><strong>Half-Day Definitions:</strong> First Half {HALF_DAY_CONFIG.first_half.start}-{HALF_DAY_CONFIG.first_half.end}, Second Half {HALF_DAY_CONFIG.second_half.start}-{HALF_DAY_CONFIG.second_half.end}. Minimum {HALF_DAY_CONFIG.min_hours_required} hours worked required to qualify - exactly 0.5 days deducted, never a full day.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
        {Object.entries(HALF_DAY_CONFIG).filter(([k])=>k!=='min_hours_required').map(([k,v])=>(
          <div key={k} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:6,textTransform:'capitalize'}}>{k.replace('_',' ')}</div>
            <div style={{fontSize:18,fontWeight:900,color:A}}>{v.start} - {v.end}</div>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',marginTop:14}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Employee','Date','Period','Leave Type','Hours Worked','Min Required','Valid','This Month'].map(h=>(
                <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(l=>(
                <tr key={l.id} style={{borderBottom:'1px solid #f8fafc'}}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.employee,...l}})}}>
                  <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{l.employee}</td>
                  <td style={{padding:'9px 12px',color:'#94a3b8',fontSize:10}}>{l.date}</td>
                  <td style={{padding:'9px 12px'}}><span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{l.period}</span></td>
                  <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{l.leave_type}</td>
                  <td style={{padding:'9px 12px',fontWeight:700,color:l.valid?'#10b981':'#ef4444'}}>{l.hours_worked}h</td>
                  <td style={{padding:'9px 12px',color:'#94a3b8'}}>{l.min_required}h</td>
                  <td style={{padding:'9px 12px'}}>{l.valid?<span style={{color:'#10b981'}}>✓ 0.5d</span>:<span style={{color:'#ef4444'}}>✗ Full day deducted</span>}</td>
                  <td style={{padding:'9px 12px'}}>{l.occurrences_this_month>=3&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>🔁 {l.occurrences_this_month}x</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {flaggedCount>0&&(
        <div style={{marginTop:16,background:'#fff',border:'1px solid #fed7aa',borderRadius:16,padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🤖 AI Pattern Insight</div>
          <AIImpact color={A} lines={[`${flaggedCount} employee(s) show frequent half-day patterns (3+ this month).`,'Worth checking if this reflects a recurring commitment vs. policy loophole usage.','If hours-worked falls below minimum, a full day is auto-deducted instead of 0.5.']}/>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✏',label:'Override',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

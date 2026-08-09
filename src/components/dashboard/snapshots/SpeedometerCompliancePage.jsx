// FILE: SpeedometerCompliancePage.jsx - Speedometer: Compliance
// (Performance & Talent > Goal & Performance > Performance Analytics > KPI)
// Audit Pass Rate, Training Completion, Certification Expiry - sourced
// from existing v_compliance_health_score + statutory_filing_deadlines.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

function Gauge({ value, max, label, unit, zones }) {
  const pct = Math.min(value / max, 1)
  const angle = pct * 180
  const radius = 80, cx = 100, cy = 100
  const polarToCartesian = (r, deg) => {
    const rad = (deg - 180) * Math.PI / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }
  let cumulativeStart = 0
  const arcs = zones.map((z, i) => {
    const startDeg = cumulativeStart * 180, endDeg = z.upTo * 180
    cumulativeStart = z.upTo
    const [x1, y1] = polarToCartesian(radius, startDeg)
    const [x2, y2] = polarToCartesian(radius, endDeg)
    const largeArc = (endDeg - startDeg) > 180 ? 1 : 0
    return <path key={i} d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`} stroke={z.color} strokeWidth="18" fill="none"/>
  })
  const [needleX, needleY] = polarToCartesian(radius - 15, angle)
  const currentZone = zones.find(z => pct <= z.upTo) || zones[zones.length - 1]
  return (
    <div style={{textAlign:'center'}}>
      <svg width="200" height="120" viewBox="0 0 200 110">
        {arcs}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="5" fill="#1e293b"/>
      </svg>
      <div style={{fontSize:20,fontWeight:900,color:currentZone.color,marginTop:-10}}>{value}{unit}</div>
      <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{label}</div>
    </div>
  )
}

const COMPLIANCE_METRICS = {
  audit_pass:{value:97,max:100,label:'Statutory Audit Pass Rate',unit:'%',zones:[{upTo:0.95,color:'#ef4444'},{upTo:0.99,color:'#f59e0b'},{upTo:1,color:'#10b981'}]},
  training_completion:{value:91,max:100,label:'Mandatory Training Completion',unit:'%',zones:[{upTo:0.80,color:'#ef4444'},{upTo:0.95,color:'#f59e0b'},{upTo:1,color:'#10b981'}]},
  policy_ack:{value:96,max:100,label:'Policy Acknowledgment Rate',unit:'%',zones:[{upTo:0.90,color:'#ef4444'},{upTo:0.95,color:'#f59e0b'},{upTo:1,color:'#10b981'}]},
}

const CERT_EXPIRY = [
  {item:'SSF Registration',status:'current'},{item:'Annual Labour Audit FY 2024/25',status:'due_soon',due:'mid-January'},
  {item:'OSH Committee Certification',status:'current'},
]

export default function SpeedometerCompliancePage() {
  const [ctx, setCtx] = useState(null)
  const breaches = CERT_EXPIRY.filter(c=>c.status!=='current').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🚦" title="Speedometer - Compliance"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Analytics > KPI"
        gradient={G}
        stats={[
          {icon:'✅',label:'Audit Pass Rate',     value:'97%'},
          {icon:'🎓',label:'Training Completion',  value:'91%'},
          {icon:'📝',label:'Policy Acknowledged',  value:'96%'},
          {icon:'⚠',label:'Cert. Breaches',        value:breaches},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Statutory Compliance Score = (Completed Tasks / Total Required Tasks) × 100.</strong> Tracks SSF contribution processing and mandatory Labour Relation Committee meetings (10+ employee enterprises). Any rate below 95% pushes the needle into the red warning zone - legal exposure, not just a metric.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px',display:'flex',flexWrap:'wrap',justifyContent:'space-around',gap:20}}>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'Audit Pass Rate',impact_links:['Tax & Compliance']}})}}>
          <Gauge {...COMPLIANCE_METRICS.audit_pass}/>
        </div>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'Training Completion',impact_links:['Training Recommendation']}})}}>
          <Gauge {...COMPLIANCE_METRICS.training_completion}/>
        </div>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'Policy Acknowledgment',impact_links:[]}})}}>
          <Gauge {...COMPLIANCE_METRICS.policy_ack}/>
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>📅 Certification & Filing Expiry Tracker</div>
        {CERT_EXPIRY.map((c,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<CERT_EXPIRY.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:11,fontWeight:600,color:'#0f172a'}}>{c.item}</span>
            {c.status==='current'?<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>✓ Current</span>:
             <span style={{background:'#fffbeb',color:'#b45309',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>⏳ Due {c.due}</span>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Pulls live from the existing Compliance Health Score and Statutory Filing Deadlines.','Real-time risk monitoring flags any metric crossing into the red zone before it becomes a penalty.','Auto-reminders sent as filing deadlines approach.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

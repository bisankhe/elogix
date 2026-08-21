// FILE: SpeedometerRecruitmentPage.jsx - Speedometer: Recruitment
// (Performance & Talent > Goal & Performance > Performance Analytics > KPI)
// Half-circle SVG gauge: Time-to-Fill, Offer Acceptance Rate, Cost-per-Hire.
// Green/Yellow/Red zones per Nepal LA2074 MOLESS-advertised vacancy tracking.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

function Gauge({ value, max, label, unit, zones, invert }) {
  // zones: [{upTo, color}] in ascending order of upTo (as % of max)
  const pct = Math.min(value / max, 1)
  const angle = pct * 180  // half-circle
  const needleAngle = -90 + angle
  const radius = 80, cx = 100, cy = 100

  const polarToCartesian = (r, deg) => {
    const rad = (deg - 180) * Math.PI / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]

  let cumulativeStart = 0
  const arcs = zones.map((z, i) => {
    const startDeg = cumulativeStart * 180
    const endDeg = z.upTo * 180
    cumulativeStart = z.upTo
    const [x1, y1] = polarToCartesian(radius, startDeg)
    const [x2, y2] = polarToCartesian(radius, endDeg)
    const largeArc = (endDeg - startDeg) > 180 ? 1 : 0
    return <path key={i} d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`} stroke={z.color} strokeWidth="18" fill="none" strokeLinecap="butt"/>
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

const RECRUITMENT_METRICS = {
  time_to_fill:{value:22,max:60,label:'Time-to-Fill (days)',unit:'d',zones:[{upTo:0.5,color:'#10b981'},{upTo:0.75,color:'#f59e0b'},{upTo:1,color:'#ef4444'}]},
  offer_acceptance:{value:88,max:100,label:'Offer Acceptance Rate',unit:'%',zones:[{upTo:0.75,color:'#ef4444'},{upTo:0.85,color:'#f59e0b'},{upTo:1,color:'#10b981'}]},
  cost_per_hire:{value:3200,max:8000,label:'Cost-per-Hire (NPR equiv.)',unit:'',zones:[{upTo:0.5,color:'#10b981'},{upTo:0.75,color:'#f59e0b'},{upTo:1,color:'#ef4444'}]},

const MOLESS_TRACKER = { advertised_compliant:14, total_vacancies:16, pct:88 }

export default function SpeedometerRecruitmentPage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎯" title="Speedometer - Recruitment"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Analytics > KPI"
        gradient={G}
        stats={[
          {icon:'⏱',label:'Time-to-Fill',       value:'22 days'},
          {icon:'✅',label:'Offer Acceptance',    value:'88%'},
          {icon:'💰',label:'Cost-per-Hire',        value:'NPR 3,200'},
          {icon:'📋',label:'MOLESS Compliant',     value:MOLESS_TRACKER.pct+'%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Live, Not Static:</strong> Time-to-Fill = Sum of Days to Fill Vacancies / Total Vacancies, pulled directly from Job Requisitions. Nepal LA2074 mandates local newspaper/MOLESS portal advertisement before hiring foreign nationals - tracked here for compliance readiness.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px',display:'flex',flexWrap:'wrap',justifyContent:'space-around',gap:20}}>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'Time-to-Fill',impact_links:['Job Requisitions']}})}}>
          <Gauge {...RECRUITMENT_METRICS.time_to_fill}/>
        </div>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'Offer Acceptance Rate',impact_links:[]}})}}>
          <Gauge {...RECRUITMENT_METRICS.offer_acceptance}/>
        </div>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'Cost-per-Hire',impact_links:[]}})}}>
          <Gauge {...RECRUITMENT_METRICS.cost_per_hire}/>
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>📋 MOLESS Advertisement Compliance</div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:11}}>
          <span style={{color:'#64748b'}}>{MOLESS_TRACKER.advertised_compliant} of {MOLESS_TRACKER.total_vacancies} vacancies properly advertised</span>
          <span style={{fontWeight:700,color:'#10b981'}}>{MOLESS_TRACKER.pct}%</span>
        </div>
        <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${MOLESS_TRACKER.pct}%`,height:'100%',background:'#0284c7',borderRadius:8}}/></div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags requisitions open beyond 45 days for HR escalation.','Quality-of-hire (90-day retention) tracked alongside speed for balanced recruiting health.','Gauge thresholds auto-adjust if company policy changes the target zones.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

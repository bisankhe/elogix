// FILE: SpeedometerDocumentationPage.jsx - Speedometer: Documentation
// (Performance & Talent > Goal & Performance > Performance Analytics > KPI)
// Missing Records, e-Signature Completion, Contract Expiry - sourced
// from existing employee_documents/employee_contracts tables.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#164e63 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

function Gauge({ value, max, label, unit, zones }) {
  const pct = Math.min(value / max, 1)
  const angle = pct * 180
  const radius = 80, cx = 100, cy = 100
  const polarToCartesian = (r, deg) => {
    const rad = (deg - 180) * Math.PI / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
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

const DOC_METRICS = {
  documentation_completion:{value:96,max:100,label:'Documentation Completion',unit:'%',zones:[{upTo:0.85,color:'#ef4444'},{upTo:0.95,color:'#f59e0b'},{upTo:1,color:'#10b981'}]},
  esignature_rate:{value:99,max:100,label:'e-Signature Completion',unit:'%',zones:[{upTo:0.85,color:'#ef4444'},{upTo:0.98,color:'#f59e0b'},{upTo:1,color:'#10b981'}]},
  missing_docs:{value:1.4,max:10,label:'Missing Documents',unit:'%',zones:[{upTo:0.2,color:'#10b981'},{upTo:0.5,color:'#f59e0b'},{upTo:1,color:'#ef4444'}]},

const CONTRACT_EXPIRY = [
  {employee:'Ramesh KC',contract_type:'Time-Bound',expires:'2025-07-30',days_left:36,status:'upcoming'},
  {employee:'Sita Tamang',contract_type:'Time-Bound',expires:'2025-06-28',days_left:4,status:'urgent'},
]

export default function SpeedometerDocumentationPage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📁" title="Speedometer - Documentation"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Analytics > KPI"
        gradient={G}
        stats={[
          {icon:'📁',label:'Documentation',     value:'96%'},
          {icon:'✍',label:'e-Signature',         value:'99%'},
          {icon:'⚠',label:'Missing Docs',         value:'1.4%'},
          {icon:'📅',label:'Contracts Expiring',  value:CONTRACT_EXPIRY.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#155e75',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Documentation Completion = (Employees with Fully Compliant Files / Total Employees) × 100.</strong> Records must include signed appointment letters, citizenship copies, and SSF data per Nepal LA2074. Paperless workflows linked to e-signature replace the legacy filing-cabinet risk shown on the "Before" infographic.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px',display:'flex',flexWrap:'wrap',justifyContent:'space-around',gap:20}}>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'Documentation Completion',impact_links:['Employee Documents']}})}}>
          <Gauge {...DOC_METRICS.documentation_completion}/>
        </div>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'e-Signature Completion',impact_links:[]}})}}>
          <Gauge {...DOC_METRICS.esignature_rate}/>
        </div>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'Missing Documents',impact_links:['Employee Documents']}})}}>
          <Gauge {...DOC_METRICS.missing_docs}/>
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>📅 Contract Expiry Tracker</div>
        {CONTRACT_EXPIRY.map((c,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<CONTRACT_EXPIRY.length-1?'1px solid #f8fafc':'none'}}>
            <div>
              <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{c.employee}</span>
              <span style={{fontSize:9,color:'#94a3b8',marginLeft:8}}>{c.contract_type} . expires {c.expires}</span>
            </div>
            <span style={{background:c.status==='urgent'?'#fef2f2':'#fffbeb',color:c.status==='urgent'?'#dc2626':'#b45309',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{c.days_left}d left</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Automated alerts fire as contracts approach expiry - no manual calendar tracking.','Missing-document gauge cross-references against the statutory required-file checklist.','Digital adoption index rises automatically as paper-based processes are retired.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

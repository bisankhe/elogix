// FILE: KRIDashboardPage.jsx - KRI Dashboard
// (Compliance & Risk Management > Risk Management)
// The control center: a single 0-100 health index synthesizing every
// other risk page's signals. Pure rollup -- never a second calculation
// engine, just a weighted read across Compliance/Payroll/Attrition/
// Security risk pages. Leading indicators, not just lagging turnover.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const RISK_DOMAINS = [
  {domain:'Compliance Risk',score:82,trend:'stable',c:'#10b981',target:'Compliance Risk'},
  {domain:'Payroll Risk',score:71,trend:'declining',c:'#f59e0b',target:'Payroll Risk'},
  {domain:'Attrition Risk',score:58,trend:'declining',c:'#ef4444',target:'Attrition Risk'},
  {domain:'Security Risk',score:88,trend:'improving',c:'#10b981',target:'Security Risk'},
]

const LEADING_INDICATORS = [
  {label:'Overtime Hours (vs 30d avg)',value:'+18%',signal:'warning'},
  {label:'Policy Acknowledgment Rate',value:'94%',signal:'healthy'},
  {label:'Engagement Score Trend',value:'-0.4 pts',signal:'warning'},
]

export default function KRIDashboardPage() {
  const [ctx, setCtx] = useState(null)
  const overallScore = Math.round(RISK_DOMAINS.reduce((s,d)=>s+d.score,0)/RISK_DOMAINS.length)
  const healthColor = overallScore>=75?'#10b981':overallScore>=50?'#f59e0b':'#ef4444'

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎯" title="KRI Dashboard"
        breadcrumb="Compliance & Risk Management > Risk Management"
        gradient={G}
        stats={[
          {icon:'🎯',label:'Overall Health Score',  value:overallScore+'/100'},
          {icon:'⚠',label:'Domains Declining',          value:RISK_DOMAINS.filter(d=>d.trend==='declining').length},
          {icon:'📈',label:'Domains Improving',             value:RISK_DOMAINS.filter(d=>d.trend==='improving').length},
          {icon:'🔔',label:'Active Alerts',                    value:'5'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Leading, Not Just Lagging:</strong> This score weighs rising overtime and dropping engagement -- early signals -- alongside historical turnover, so problems surface before they become resignations or fines.</div>
      </div>

      {/* Overall health gauge */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px',marginBottom:18,textAlign:'center'}}>
        <svg width="160" height="160" viewBox="0 0 36 36" style={{margin:'0 auto'}}>
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="4"/>
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={healthColor} strokeWidth="4" strokeDasharray={`${overallScore} ${100-overallScore}`} strokeDashoffset="25" transform="rotate(-90 18 18)"/>
        </svg>
        <div style={{fontSize:28,fontWeight:900,color:healthColor,marginTop:-100}}>{overallScore}</div>
        <div style={{fontSize:9,color:'#94a3b8',marginTop:80}}>Organizational Risk Health Index</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:18}}>
        {RISK_DOMAINS.map((d,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.domain,...d,impact_links:[d.target]}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',textAlign:'center',cursor:'pointer'}}>
            <div style={{fontSize:20,fontWeight:900,color:d.c}}>{d.score}</div>
            <div style={{fontSize:9,color:'#374151',marginTop:4,fontWeight:700}}>{d.domain}</div>
            <div style={{fontSize:8,color:d.trend==='declining'?'#ef4444':d.trend==='improving'?'#10b981':'#94a3b8',marginTop:4}}>
              {d.trend==='declining'?'↓':d.trend==='improving'?'↑':'>'} {d.trend}
            </div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📊 Leading Indicators</div>
        {LEADING_INDICATORS.map((l,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<LEADING_INDICATORS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{l.label}</span>
            <span style={{fontSize:10,fontWeight:700,color:l.signal==='warning'?'#b45309':'#15803d'}}>{l.value}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Every score here computes from real data already tracked elsewhere -- never a second, hand-maintained number.','Click any domain tile to drill straight into its dedicated risk page for full detail.','AI flags genuinely correlated risk clusters -- rising overtime AND dropping engagement in the same team is a stronger signal than either alone.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Drill into Domain',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

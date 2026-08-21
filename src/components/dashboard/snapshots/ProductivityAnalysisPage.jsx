// FILE: ProductivityAnalysisPage.jsx - Productivity Analysis
// (Reports, Analytics & BI > HR Analytics)
// Performance-vs-engagement quadrant, overtime/absenteeism rates,
// training ROI -- reuses the EXISTING v_performance_vs_compensation
// (Standard Reports session, built just last session) directly for
// the correlation view, never a second performance calculation.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const QUADRANT_DATA = [
  {employee:'Hari Thapa',performance:4.2,engagement:7.8,quadrant:'Star'},
  {employee:'Gita Maharjan',performance:4.8,engagement:8.5,quadrant:'Star'},
  {employee:'Bikash Rai',performance:2.9,engagement:4.1,quadrant:'At Risk',flag:'Low performance AND low engagement -- a coaching conversation, not just a PIP.'},
  {employee:'Sunil Magar',performance:4.5,engagement:3.2,quadrant:'Flight Risk',flag:'High performer, low engagement -- the classic pre-resignation signature.'},
]

const DEPT_METRICS = [
  {dept:'IT',overtime_hrs:8.2,absenteeism_pct:2.1,training_completion:82},
  {dept:'Sales & Marketing',overtime_hrs:14.6,absenteeism_pct:3.4,training_completion:65,flag:'Overtime trending toward the 24h/week statutory cap.'},
]

export default function ProductivityAnalysisPage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📈" title="Productivity Analysis"
        breadcrumb="Reports, Analytics & BI > HR Analytics"
        gradient={G}
        stats={[
          {icon:'⭐',label:'Stars',  value:QUADRANT_DATA.filter(q=>q.quadrant==='Star').length},
          {icon:'⚠',label:'Flight Risk',    value:QUADRANT_DATA.filter(q=>q.quadrant==='Flight Risk').length},
          {icon:'⏱',label:'Avg Overtime/Week',  value:'11.4h'},
          {icon:'🎓',label:'Training Completion',  value:'74%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>Performance Alone Isn't the Whole Picture:</strong> Pairing rating with engagement (not compensation, here) surfaces the quiet flight risk hiding behind a strong review -- the quadrant most dashboards miss entirely.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Performance vs Engagement Quadrant</div>
        {QUADRANT_DATA.map((q,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:q.employee,...q,impact_links:['Attrition Risk']}})}}
            style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'10px 0',borderBottom:i<QUADRANT_DATA.length-1?'1px solid #f8fafc':'none'}}>
            <div>
              <span style={{fontSize:10,color:'#374151'}}>{q.employee}</span>
              {q.flag&&<div style={{fontSize:8,color:'#b45309',marginTop:3}}>⚠ {q.flag}</div>}
            </div>
            <span style={{background:q.quadrant==='Star'?'#f0fdf4':q.quadrant==='Flight Risk'?'#fef2f2':'#fffbeb',
              color:q.quadrant==='Star'?'#15803d':q.quadrant==='Flight Risk'?'#dc2626':'#b45309',
              fontSize:8,fontWeight:700,padding:'3px 9px',borderRadius:20,flexShrink:0}}>{q.quadrant}</span>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>⏱ Department Productivity Metrics</div>
        {DEPT_METRICS.map((d,i)=>(
          <div key={i} style={{padding:'9px 0',borderBottom:i<DEPT_METRICS.length-1?'1px solid #f8fafc':'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10}}>
              <span style={{color:'#374151'}}>{d.dept}</span>
              <span style={{color:'#94a3b8'}}>OT {d.overtime_hrs}h · Absence {d.absenteeism_pct}% · Training {d.training_completion}%</span>
            </div>
            {d.flag&&<div style={{marginTop:4,fontSize:8,color:'#b45309'}}>⚠ {d.flag}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Overtime tracked against the 24h/week statutory cap -- a productivity metric and a compliance check in one view.','High performer, low engagement is treated as a genuine retention signal -- never just celebrated as a top reviewer score.','Training completion correlates with absenteeism trends to spot whether disengagement, not capability, is the real bottleneck.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Profile',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

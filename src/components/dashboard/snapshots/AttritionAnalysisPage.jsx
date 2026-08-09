// FILE: AttritionAnalysisPage.jsx - Attrition Analysis
// (Reports, Analytics & BI > HR Analytics)
// Voluntary vs involuntary, regrettable-loss rate, retention by manager
// -- pure aggregation over the EXISTING exit_records (Exit Analytics
// session, already has exit_type + is_regrettable). Distinct from
// Attrition Risk (Risk Management, predictive/forward-looking) -- this
// is the historical, analytical lens.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const QUARTERLY_EXITS = [{q:'Q1',voluntary:8,involuntary:2},{q:'Q2',voluntary:11,involuntary:1},{q:'Q3',voluntary:6,involuntary:3}]

const RETENTION_BY_MANAGER = [
  {manager:'Dipesh Bhattarai',retention_pct:78,exits:4,regrettable_pct:75,flag:true},
  {manager:'Anjali Sharma',retention_pct:94,exits:1,regrettable_pct:0,flag:false},
]

export default function AttritionAnalysisPage() {
  const [ctx, setCtx] = useState(null)
  const totalVol = QUARTERLY_EXITS.reduce((s,q)=>s+q.voluntary,0)
  const totalInvol = QUARTERLY_EXITS.reduce((s,q)=>s+q.involuntary,0)
  const maxExits = Math.max(...QUARTERLY_EXITS.map(q=>q.voluntary+q.involuntary))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🚪" title="Attrition Analysis"
        breadcrumb="Reports, Analytics & BI > HR Analytics"
        gradient={G}
        stats={[
          {icon:'🚪',label:'Total Exits (YTD)',  value:totalVol+totalInvol},
          {icon:'📊',label:'Voluntary Rate',          value:Math.round(totalVol/(totalVol+totalInvol)*100)+'%'},
          {icon:'⚠',label:'Regrettable Loss Rate',       value:'42%'},
          {icon:'📐',label:'Avg Tenure at Exit',            value:'2.4 yrs'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>Not All Turnover Is the Same:</strong> Voluntary vs involuntary, and regrettable vs not, pull directly from Exit Analytics' own exit_type and is_regrettable fields -- never a second classification system that could disagree with the original exit record.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Quarterly Departures -- Voluntary vs Involuntary</div>
        <div style={{display:'flex',gap:14,alignItems:'flex-end',height:90}}>
          {QUARTERLY_EXITS.map((q,i)=>(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div style={{fontSize:8,color:'#94a3b8'}}>{q.voluntary+q.involuntary}</div>
              <div style={{width:'100%',display:'flex',flexDirection:'column',height:`${(q.voluntary+q.involuntary)/maxExits*70}px`}}>
                <div style={{flex:q.involuntary,background:'#ef4444',borderRadius:'4px 4px 0 0'}}/>
                <div style={{flex:q.voluntary,background:A}}/>
              </div>
              <div style={{fontSize:8,color:'#94a3b8'}}>{q.q}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:14,marginTop:10,fontSize:8,color:'#94a3b8'}}>
          <span><span style={{display:'inline-block',width:8,height:8,background:A,borderRadius:2,marginRight:4}}/>Voluntary</span>
          <span><span style={{display:'inline-block',width:8,height:8,background:'#ef4444',borderRadius:2,marginRight:4}}/>Involuntary</span>
        </div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>👤 Retention by Manager</div>
        {RETENTION_BY_MANAGER.map((m,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:m.manager,...m,impact_links:['Attrition Risk']}})}}
            style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<RETENTION_BY_MANAGER.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{m.manager} {m.flag&&'⚠'}</span>
            <span style={{fontSize:9,color:m.flag?'#dc2626':'#94a3b8'}}>{m.retention_pct}% retention · {m.exits} exits ({m.regrettable_pct}% regrettable)</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Regrettable-loss flags weigh performance rating at exit -- a struggling performer leaving is never miscounted as a talent loss.','Managers with disproportionately high regrettable exits surface here as a coaching opportunity, never an automated blame signal.','Retrenchment-driven exits track separately, since the 30-day notice and 1-month-per-year severance obligation apply only there.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

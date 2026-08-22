// FILE: TeamActivityThisYearPage.jsx - Team Activity This Year
// (HR Services & Support > Manager Self Service)
// Manager-scoped mirror of My Activity This Year -- the broadest lens,
// useful for annual team-health review and retention-risk awareness
// ahead of appraisal season.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const QUARTERLY_COMPARISON = [{q:'Q1',count:892},{q:'Q2',count:1021},{q:'Q3',count:0,projected:true},{q:'Q4',count:0,projected:true}]

const YEAR_HIGHLIGHTS = [
  {label:'Team Courses Completed',value:24,icon:'🎓'},{label:'Team Certificates Earned',value:14,icon:'🏆'},
  {label:'Team Goals Closed',value:19,icon:'🎯'},{label:'Avg Team Engagement',value:'7.6/10',icon:'❤️'},
]

const RETENTION_SIGNALS = [
  {employee:'Sunil Magar',signal:'Activity dropped 40% vs last quarter',risk:'medium'},
]

export default function TeamActivityThisYearPage() {
  const [ctx, setCtx] = useState(null)
  const completedTotal = QUARTERLY_COMPARISON.filter(q=>!q.projected).reduce((s,q)=>s+q.count,0)
  const maxQ = Math.max(...QUARTERLY_COMPARISON.map(q=>q.count), 1)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗂" title="Team Activity This Year"
        breadcrumb="HR Services & Support > Manager Self Service"
        gradient={G}
        stats={[
          {icon:'🗂',label:'Total Team Actions (YTD)',  value:completedTotal},
          {icon:'🎓',label:'Courses Completed',             value:24},
          {icon:'🏆',label:'Certificates Earned',              value:14},
          {icon:'⚠',label:'Retention Signals',                    value:RETENTION_SIGNALS.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🪪</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Team's Year in Review:</strong> The full annual picture, plus AI-surfaced retention signals -- a real heads-up before someone's disengagement becomes a resignation.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Quarterly Team Activity</div>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',height:90}}>
          {QUARTERLY_COMPARISON.map((q,i)=>(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <div style={{fontSize:9,fontWeight:700,color:q.projected?'#cbd5e1':A}}>{q.projected?'--':q.count}</div>
              <div style={{width:'100%',background:q.projected?'#f1f5f9':A,borderRadius:'4px 4px 0 0',height:`${Math.max(q.count/maxQ*70,4)}px`,border:q.projected?'1px dashed #cbd5e1':'none'}}/>
              <div style={{fontSize:8,color:'#94a3b8'}}>{q.q}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:18}}>
        {YEAR_HIGHLIGHTS.map((h,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',textAlign:'center'}}>
            <div style={{fontSize:22,marginBottom:6}}>{h.icon}</div>
            <div style={{fontSize:16,fontWeight:900,color:A}}>{h.value}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>{h.label}</div>
          </div>
        ))}
      </div>

      {RETENTION_SIGNALS.length>0&&(
        <div style={{background:'#fff',border:'1px solid #fed7aa',borderRadius:16,padding:'18px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>⚠ Retention Signals</div>
          {RETENTION_SIGNALS.map((r,i)=>(
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{fontSize:10,color:'#374151',padding:'8px 0'}}>
              <strong>{r.employee}</strong> -- {r.signal}
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Activity-drop signals are a prompt for a genuine check-in, never an automated disciplinary trigger.','Export this whole view as a one-page summary for your annual team review.','Every figure here traces through Quarter, Month, Week, all the way to Today -- one consistent source.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

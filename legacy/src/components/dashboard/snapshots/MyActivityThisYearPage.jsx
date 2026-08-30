// FILE: MyActivityThisYearPage.jsx - My Activity This Year
// (HR Services & Support > Employee Self Service)
// Quarterly comparison + annual milestones, the broadest lens over the
// SAME employee_activity_log -- a year-in-review framing, useful for
// annual appraisal prep and tenure-anniversary context.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const QUARTERLY_COMPARISON = [{q:'Q1',count:248},{q:'Q2',count:286},{q:'Q3',count:0,projected:true},{q:'Q4',count:0,projected:true}]

const YEAR_MILESTONES = [
  {label:'Courses Completed',value:6,icon:'🎓'},{label:'Certificates Earned',value:4,icon:'🏆'},
  {label:'Goals Closed',value:9,icon:'🎯'},{label:'Recognitions Received',value:5,icon:'❤️'},
]

export default function MyActivityThisYearPage() {
  const [ctx, setCtx] = useState(null)
  const completedTotal = QUARTERLY_COMPARISON.filter(q=>!q.projected).reduce((s,q)=>s+q.count,0)
  const maxQ = Math.max(...QUARTERLY_COMPARISON.map(q=>q.count), 1)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗂" title="My Activity This Year"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'🗂',label:'Total Actions (YTD)',  value:completedTotal},
          {icon:'🎓',label:'Courses Completed',        value:6},
          {icon:'🏆',label:'Certificates Earned',         value:4},
          {icon:'📈',label:'Trend',                          value:'+15% vs last year'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🪪</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Year in Review:</strong> The same automatic trail, zoomed all the way out -- genuinely useful heading into your annual appraisal, with nothing to compile by hand.</div>
      </div>

      {/* Quarterly comparison */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Quarterly Activity</div>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',height:90}}>
          {QUARTERLY_COMPARISON.map((q,i)=>(
            <div key={i}
              onContextMenu={ev=>{!q.projected&&ev.preventDefault();!q.projected&&setCtx({x:ev.clientX,y:ev.clientY,item:{name:q.q,...q,impact_links:['My Activity This Quarter']}})}}
              style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <div style={{fontSize:9,fontWeight:700,color:q.projected?'#cbd5e1':A}}>{q.projected?'--':q.count}</div>
              <div style={{width:'100%',background:q.projected?'#f1f5f9':A,borderRadius:'4px 4px 0 0',height:`${Math.max(q.count/maxQ*70,4)}px`,border:q.projected?'1px dashed #cbd5e1':'none'}}/>
              <div style={{fontSize:8,color:'#94a3b8'}}>{q.q}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Annual milestones */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12}}>
        {YEAR_MILESTONES.map((m,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',textAlign:'center'}}>
            <div style={{fontSize:22,marginBottom:6}}>{m.icon}</div>
            <div style={{fontSize:18,fontWeight:900,color:A}}>{m.value}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Year-over-year comparison auto-calculates against your same period last year for honest context.','Export this whole view as a one-page summary for your annual self-assessment.','Every figure traces back through Quarter, Month, Week, all the way to Today -- one consistent source, zero re-entry.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Quarter Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

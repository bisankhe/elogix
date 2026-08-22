// FILE: MyActivityThisQuarterPage.jsx - My Activity This Quarter
// (HR Services & Support > Employee Self Service)
// Month-comparison rollup over the SAME employee_activity_log, plus a
// correlation against My Goals & KPI progress -- a quarter is the
// natural review-cycle window, so the lens shifts toward outcomes.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const MONTHLY_COMPARISON = [{month:'April',count:88,goal_progress_delta:12},{month:'May',count:103,goal_progress_delta:18},{month:'June',count:95,goal_progress_delta:21}]

const QUARTER_HIGHLIGHTS = [
  {label:'Courses Completed',value:2,icon:'🎓'},{label:'Goals Advanced',value:3,icon:'🎯'},
  {label:'Requests Submitted',value:11,icon:'📥'},{label:'Helpdesk Tickets Resolved',value:4,icon:'🎫'},
]

export default function MyActivityThisQuarterPage() {
  const [ctx, setCtx] = useState(null)
  const total = MONTHLY_COMPARISON.reduce((s,m)=>s+m.count,0)
  const maxMonth = Math.max(...MONTHLY_COMPARISON.map(m=>m.count))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📆" title="My Activity This Quarter"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'📆',label:'Total Actions',  value:total},
          {icon:'📈',label:'Trend',             value:'Growing'},
          {icon:'🎯',label:'Goal Progress Gain',   value:'+21pts'},
          {icon:'📊',label:'Monthly Average',          value:Math.round(total/3)},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🪞</span>
        <div style={{flex:1,minWidth:200}}><strong>Quarter Reflection, Built In:</strong> Helpful context heading into a performance check-in -- not just raw counts, but how your activity correlates with real progress on My Goals & KPI.</div>
      </div>

      {/* Monthly comparison */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Monthly Comparison</div>
        {MONTHLY_COMPARISON.map((m,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:m.month,...m,impact_links:['My Goals & KPI']}})}}
            style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
              <span style={{color:'#374151',fontWeight:600}}>{m.month}</span>
              <span style={{fontWeight:700,color:A}}>{m.count} actions . +{m.goal_progress_delta}pts goal progress</span>
            </div>
            <div style={{height:9,background:'#f1f5f9',borderRadius:9,overflow:'hidden'}}><div style={{width:`${m.count/maxMonth*100}%`,height:'100%',background:A,borderRadius:9}}/></div>
          </div>
        ))}
      </div>

      {/* Quarter highlights */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12}}>
        {QUARTER_HIGHLIGHTS.map((h,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',textAlign:'center'}}>
            <div style={{fontSize:22,marginBottom:6}}>{h.icon}</div>
            <div style={{fontSize:18,fontWeight:900,color:A}}>{h.value}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>{h.label}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Activity volume rising alongside goal-progress gains is a healthy signal -- both tracked together, never in isolation.','Use the Quarter Highlights as ready-made talking points for your upcoming check-in.','This entire view exports as a single summary if you want to bring it into a 1-on-1.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Month Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

// FILE: TeamActivityThisQuarterPage.jsx - Team Activity This Quarter
// (HR Services & Support > Manager Self Service)
// Manager-scoped mirror of My Activity This Quarter -- correlates team
// activity volume against aggregate team goal progress, useful
// review-cycle context heading into team performance discussions.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const MONTHLY_COMPARISON = [{month:'April',count:312,team_goal_progress:64},{month:'May',count:368,team_goal_progress:71},{month:'June',count:341,team_goal_progress:78}]

const QUARTER_HIGHLIGHTS = [
  {label:'Team Courses Completed',value:11,icon:'🎓'},{label:'Team Goals Closed',value:6,icon:'🎯'},
  {label:'Requests Processed',value:34,icon:'📥'},{label:'Avg Approval Time',value:'1.4 days',icon:'⏱'},
]

export default function TeamActivityThisQuarterPage() {
  const [ctx, setCtx] = useState(null)
  const total = MONTHLY_COMPARISON.reduce((s,m)=>s+m.count,0)
  const maxMonth = Math.max(...MONTHLY_COMPARISON.map(m=>m.count))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📆" title="Team Activity This Quarter"
        breadcrumb="HR Services & Support > Manager Self Service"
        gradient={G}
        stats={[
          {icon:'📆',label:'Total Team Actions',  value:total},
          {icon:'🎯',label:'Team Goal Progress',     value:'78%'},
          {icon:'⏱',label:'Avg Approval Time',          value:'1.4 days'},
          {icon:'📊',label:'Monthly Average',              value:Math.round(total/3)},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🪞</span>
        <div style={{flex:1,minWidth:200}}><strong>Quarter Reflection for Your Team:</strong> Activity volume correlated with goal progress -- helpful, real context heading into your own check-in with HR about how the team performed.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Monthly Comparison</div>
        {MONTHLY_COMPARISON.map((m,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:m.month,...m,impact_links:['Team Activity This Month']}})}}
            style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
              <span style={{color:'#374151',fontWeight:600}}>{m.month}</span>
              <span style={{fontWeight:700,color:A}}>{m.count} actions . {m.team_goal_progress}% team goal progress</span>
            </div>
            <div style={{height:9,background:'#f1f5f9',borderRadius:9,overflow:'hidden'}}><div style={{width:`${m.count/maxMonth*100}%`,height:'100%',background:A,borderRadius:9}}/></div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12}}>
        {QUARTER_HIGHLIGHTS.map((h,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',textAlign:'center'}}>
            <div style={{fontSize:22,marginBottom:6}}>{h.icon}</div>
            <div style={{fontSize:16,fontWeight:900,color:A}}>{h.value}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>{h.label}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Rising activity alongside rising goal progress is a healthy team signal -- both tracked together, never in isolation.','Use Quarter Highlights as ready-made talking points for your own leadership check-in.','This entire view exports as a single summary if you need to bring it into a team performance discussion.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Month Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

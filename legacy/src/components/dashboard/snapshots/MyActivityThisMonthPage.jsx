// FILE: MyActivityThisMonthPage.jsx - My Activity This Month
// (HR Services & Support > Employee Self Service)
// Week-grouped rollup over the SAME employee_activity_log, just a
// date_trunc('month', ...) window -- never a separate log table.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const WEEKLY_TREND = [
  {week:'Week 1',count:24},{week:'Week 2',count:31},{week:'Week 3',count:18},{week:'Week 4',count:27},
]

const TOP_ACTIVITIES = [
  {action:'Clock-in/out',count:42,module:'attendance'},{action:'Course progress updates',count:18,module:'training'},
  {action:'Goal/KPI updates',count:14,module:'goal'},{action:'Leave & attendance requests',count:8,module:'leave'},
]

export default function MyActivityThisMonthPage() {
  const [ctx, setCtx] = useState(null)
  const total = WEEKLY_TREND.reduce((s,w)=>s+w.count,0)
  const maxWeek = Math.max(...WEEKLY_TREND.map(w=>w.count))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗓" title="My Activity This Month"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'🗓',label:'Total Actions',  value:total},
          {icon:'📈',label:'Busiest Week',      value:WEEKLY_TREND.reduce((a,b)=>a.count>b.count?a:b).week},
          {icon:'🎓',label:'Training Touches',     value:18},
          {icon:'📊',label:'Weekly Average',          value:(total/4).toFixed(1)},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📊</span>
        <div style={{flex:1,minWidth:200}}><strong>The Bigger Picture:</strong> A month-long view of the same automatic trail -- useful for your own monthly check-in prep, no manual diary-keeping needed.</div>
      </div>

      {/* Weekly trend chart */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📈 Weekly Trend</div>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',height:90}}>
          {WEEKLY_TREND.map((w,i)=>(
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:w.week,...w}})}}
              style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <div style={{fontSize:9,fontWeight:700,color:A}}>{w.count}</div>
              <div style={{width:'100%',background:A,borderRadius:'4px 4px 0 0',height:`${w.count/maxWeek*70}px`}}/>
              <div style={{fontSize:8,color:'#94a3b8'}}>{w.week}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top activities */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🏆 Top Activities This Month</div>
        {TOP_ACTIVITIES.map((t,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<TOP_ACTIVITIES.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{t.action}</span>
            <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{t.count}x</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Monthly summary auto-generates the same way week and day views do -- nothing recalculated by hand.','Use this view ahead of any 1-on-1 to recall exactly what you worked through this month.','Switch to This Quarter or This Year for an even broader lens on the same data.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Week Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

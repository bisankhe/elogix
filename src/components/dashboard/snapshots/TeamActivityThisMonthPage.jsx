// FILE: TeamActivityThisMonthPage.jsx - Team Activity This Month
// (HR Services & Support > Manager Self Service)
// Manager-scoped mirror of My Activity This Month -- same
// employee_activity_log, date_trunc('month', ...) window, plus a
// module-mix breakdown across the whole team.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const TEAM_MODULE_MIX = [
  {module:'Attendance',count:84,c:'#10b981'},{module:'Training',count:42,c:'#0284c7'},
  {module:'Goals',count:28,c:'#7c3aed'},{module:'Leave/Requests',count:19,c:'#f59e0b'},{module:'Helpdesk',count:11,c:'#ef4444'},
]

const TOP_PERFORMERS = [{employee:'Gita Maharjan',count:38},{employee:'Bikash Rai',count:32},{employee:'Hari Thapa',count:27}]

export default function TeamActivityThisMonthPage() {
  const [ctx, setCtx] = useState(null)
  const total = TEAM_MODULE_MIX.reduce((s,m)=>s+m.count,0)
  const maxMix = Math.max(...TEAM_MODULE_MIX.map(m=>m.count))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗓" title="Team Activity This Month"
        breadcrumb="HR Services & Support > Manager Self Service"
        gradient={G}
        stats={[
          {icon:'🗓',label:'Total Team Actions',  value:total},
          {icon:'🎓',label:'Training Touches',        value:42},
          {icon:'🎯',label:'Goal Updates',                value:28},
          {icon:'📊',label:'Team Average',                   value:Math.round(total/4)},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📊</span>
        <div style={{flex:1,minWidth:200}}><strong>The Month in Review:</strong> Where your team's energy went this month -- useful for spotting whether compliance training or goal progress is getting the attention it needs.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>🧩 Team Module Mix</div>
        {TEAM_MODULE_MIX.map((m,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:m.module,...m}})}}
            style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
              <span style={{color:'#374151'}}>{m.module}</span><span style={{fontWeight:700,color:m.c}}>{m.count}</span>
            </div>
            <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${m.count/maxMix*100}%`,height:'100%',background:m.c,borderRadius:7}}/></div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🏆 Most Active This Month</div>
        {TOP_PERFORMERS.map((t,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<TOP_PERFORMERS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{i+1}. {t.employee}</span>
            <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{t.count} actions</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Module mix helps you see at a glance whether your team is heads-down on training or stretched thin on requests.','This is a planning tool, never a forced ranking -- use it to guide where to invest coaching time.','Drill into any module slice for the exact list of who did what.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Module Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

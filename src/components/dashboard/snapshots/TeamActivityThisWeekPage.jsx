// FILE: TeamActivityThisWeekPage.jsx - Team Activity This Week
// (HR Services & Support > Manager Self Service)
// Manager-scoped mirror of My Activity This Week -- same
// employee_activity_log, wider date_trunc('week', ...) window,
// aggregated per team member instead of per day for a manager lens.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const TEAM_WEEK = [
  {employee:'Hari Thapa',count:18,top_module:'attendance'},{employee:'Bikash Rai',count:24,top_module:'training'},
  {employee:'Gita Maharjan',count:31,top_module:'goal'},{employee:'Sunil Magar',count:9,top_module:'helpdesk',flag:'Notably quiet this week -- worth a check-in.'},
]

export default function TeamActivityThisWeekPage() {
  const [ctx, setCtx] = useState(null)
  const total = TEAM_WEEK.reduce((s,t)=>s+t.count,0)
  const maxCount = Math.max(...TEAM_WEEK.map(t=>t.count))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📅" title="Team Activity This Week"
        breadcrumb="HR Services & Support > Manager Self Service"
        gradient={G}
        stats={[
          {icon:'📅',label:'Total Team Actions',  value:total},
          {icon:'🏆',label:'Most Active',             value:TEAM_WEEK.reduce((a,b)=>a.count>b.count?a:b).employee},
          {icon:'⚠',label:'Flagged for Check-in',         value:TEAM_WEEK.filter(t=>t.flag).length},
          {icon:'📊',label:'Team Average',                   value:Math.round(total/TEAM_WEEK.length)},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📈</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Team's Week:</strong> Same automatic capture as Today, rolled up per person -- useful context heading into 1-on-1s, never a productivity scoreboard.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>👥 Activity by Team Member</div>
        {TEAM_WEEK.map((t,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.employee,...t}})}}
            style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
              <span style={{color:'#374151',fontWeight:600}}>{t.employee}</span><span style={{fontWeight:700,color:A}}>{t.count} actions</span>
            </div>
            <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${t.count/maxCount*100}%`,height:'100%',background:t.flag?'#f59e0b':A,borderRadius:8}}/></div>
            {t.flag&&<div style={{marginTop:4,fontSize:8,color:'#b45309'}}>⚠ {t.flag}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['A notably quiet week surfaces here as a gentle prompt to check in -- never used as a disciplinary signal on its own.','Drill into any team member to see their exact daily timeline, same as Team Activity Today.','Switch to This Month, Quarter, or Year for a broader view of the same underlying data.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Daily Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

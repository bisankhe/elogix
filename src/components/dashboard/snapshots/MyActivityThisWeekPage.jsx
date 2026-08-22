// FILE: MyActivityThisWeekPage.jsx - My Activity This Week
// (HR Services & Support > Employee Self Service)
// Day-grouped activity rollup over the SAME employee_activity_log as
// My Activity Today -- just a wider date_trunc('week', ...) window,
// never a separate log.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const MODULE_ICONS = { attendance:'⏰', leave:'🏖', payroll:'💰', training:'🎓', document:'📂', signature:'✍', goal:'🎯', feedback:'💬', helpdesk:'🎫', login:'🔓' }

const WEEK_ACTIVITY = [
  { day:'Monday', date:'Jun 23', count:6, top_module:'training' },
  { day:'Tuesday', date:'Jun 24', count:4, top_module:'attendance' },
  { day:'Wednesday', date:'Jun 25', count:8, top_module:'goal' },
  { day:'Thursday', date:'Jun 26', count:3, top_module:'helpdesk' },
  { day:'Friday', date:'Jun 27', count:5, top_module:'leave' },
]

const MODULE_BREAKDOWN = [
  {module:'training',count:9,c:'#0284c7'},{module:'attendance',count:6,c:'#10b981'},
  {module:'goal',count:5,c:'#7c3aed'},{module:'leave',count:3,c:'#f59e0b'},{module:'helpdesk',count:3,c:'#ef4444'},
]

export default function MyActivityThisWeekPage() {
  const [ctx, setCtx] = useState(null)
  const totalActions = WEEK_ACTIVITY.reduce((s,d)=>s+d.count,0)
  const mostActiveDay = WEEK_ACTIVITY.reduce((a,b)=>a.count>b.count?a:b)
  const maxModule = Math.max(...MODULE_BREAKDOWN.map(m=>m.count))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📅" title="My Activity This Week"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'📅',label:'Total Actions',  value:totalActions},
          {icon:'🔥',label:'Most Active Day',  value:mostActiveDay.day},
          {icon:'🧩',label:'Modules Touched',     value:MODULE_BREAKDOWN.length},
          {icon:'📊',label:'Daily Average',          value:(totalActions/5).toFixed(1)},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📈</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Week at a Glance:</strong> Same automatic activity capture as Today -- grouped by day, with a breakdown of which modules you spent the most time in.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📅 Daily Breakdown</div>
        {WEEK_ACTIVITY.map((d,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.day,...d}})}}
            style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<WEEK_ACTIVITY.length-1?'1px solid #f8fafc':'none'}}>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <span style={{fontSize:16}}>{MODULE_ICONS[d.top_module]}</span>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{d.day}</div>
                <div style={{fontSize:8,color:'#94a3b8'}}>{d.date}</div>
              </div>
            </div>
            <span style={{background:`${A}15`,color:A,fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{d.count} actions</span>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>🧩 Module Breakdown</div>
        {MODULE_BREAKDOWN.map((m,i)=>(
          <div key={i} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
              <span style={{color:'#374151',textTransform:'capitalize'}}>{MODULE_ICONS[m.module]} {m.module}</span><span style={{fontWeight:700,color:m.c}}>{m.count}</span>
            </div>
            <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${m.count/maxModule*100}%`,height:'100%',background:m.c,borderRadius:7}}/></div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Week boundaries follow your company\'s fiscal calendar settings automatically.','Unusually quiet days surface gently here -- never used punitively, just for your own awareness.','Drill into any day to see the exact chronological timeline, same as My Activity Today.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Day Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

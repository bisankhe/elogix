// FILE: TeamActivityTodayPage.jsx - Team Activity Today
// (HR Services & Support > Manager Self Service)
// Manager-scoped mirror of My Activity Today -- same EXISTING
// employee_activity_log, filtered to actor_employee_id IN (direct
// reports) instead of a single self ID. Grouped by team member.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const MODULE_ICONS = { attendance:'⏰', leave:'🏖', payroll:'💰', training:'🎓', document:'📂', signature:'✍', goal:'🎯', feedback:'💬', helpdesk:'🎫', login:'🔓' }

const TEAM_TODAY = [
  { employee:'Hari Thapa', actions:[{time:'09:02 AM',module:'login',action:'Logged in'},{time:'09:15 AM',module:'attendance',action:'Clock-in recorded'}] },
  { employee:'Bikash Rai', actions:[{time:'09:30 AM',module:'training',action:'Completed module 3 of AWS course'},{time:'02:00 PM',module:'leave',action:'Submitted leave request'}] },
  { employee:'Gita Maharjan', actions:[{time:'10:15 AM',module:'goal',action:'Updated OKR progress to 75%'}] },
]

export default function TeamActivityTodayPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = TEAM_TODAY.filter(t=>!search||t.employee.toLowerCase().includes(search.toLowerCase()))
  const totalActions = TEAM_TODAY.reduce((s,t)=>s+t.actions.length,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Team Activity Today"
        breadcrumb="HR Services & Support > Manager Self Service"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total Actions',  value:totalActions},
          {icon:'👥',label:'Active Members',    value:TEAM_TODAY.length},
          {icon:'🧩',label:'Modules Touched',       value:new Set(TEAM_TODAY.flatMap(t=>t.actions.map(a=>a.module))).size},
          {icon:'🔒',label:'Visibility',                value:'Direct Reports Only'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔍</span>
        <div style={{flex:1,minWidth:200}}><strong>Auto-Traced Across Your Team:</strong> Every action your direct reports took today, grouped by person -- automatically captured, never something they have to log manually. Scoped strictly to your reporting line, never the whole company.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search team members..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map((t,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>{t.employee}</div>
            {t.actions.map((a,j)=>(
              <div key={j}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:`${t.employee} -- ${a.action}`,...a}})}}
                style={{display:'flex',gap:10,alignItems:'center',padding:'7px 0',borderBottom:j<t.actions.length-1?'1px solid #f8fafc':'none'}}>
                <span style={{fontSize:14}}>{MODULE_ICONS[a.module]}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:'#374151'}}>{a.action}</div>
                </div>
                <span style={{fontSize:8,color:'#94a3b8'}}>{a.time}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Visibility is structurally limited to your direct reports -- this view can never expand to show another manager\'s team.','Quiet team members surface gently here for awareness, never used punitively.','Switch to This Week, Month, Quarter, or Year for a broader lens on the same automatic trail.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

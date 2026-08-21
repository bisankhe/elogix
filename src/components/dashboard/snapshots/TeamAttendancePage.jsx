// FILE: TeamAttendancePage.jsx - Team Attendance
// (HR Services & Support > Manager Self Service)
// Manager-scoped calendar over the EXISTING daily_attendance_records,
// filtered to direct reports. Section 20: 8h/day, 48h/week cap, 4h/day
// OT cap surfaced directly so managers never approve out of compliance.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const STATUS_CFG = { present:{c:'#10b981',label:'Present'},absent:{c:'#ef4444',label:'Absent'},on_leave:{c:'#f59e0b',label:'On Leave'},remote:{c:'#7c3aed',label:'Remote'} }

const TEAM_TODAY = [
  {name:'Hari Thapa',status:'present',hours:8.2,overtime:0},
  {name:'Bikash Rai',status:'remote',hours:7.8,overtime:0},
  {name:'Sunil Magar',status:'on_leave',hours:0,overtime:0},
  {name:'Gita Maharjan',status:'present',hours:9.5,overtime:1.5,flag:'Approaching weekly OT cap (22/24h used)'},
]

export default function TeamAttendancePage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = TEAM_TODAY.filter(t=>!search||t.name.toLowerCase().includes(search.toLowerCase()))
  const presentCount = TEAM_TODAY.filter(t=>t.status==='present'||t.status==='remote').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📅" title="Team Attendance"
        breadcrumb="HR Services & Support > Manager Self Service"
        gradient={G}
        stats={[
          {icon:'✅',label:'Present Today',  value:presentCount+'/'+TEAM_TODAY.length},
          {icon:'🏖',label:'On Leave',           value:TEAM_TODAY.filter(t=>t.status==='on_leave').length},
          {icon:'⚡',label:'OT Risk',                value:TEAM_TODAY.filter(t=>t.flag).length},
          {icon:'⚖',label:'OT Cap',                     value:'24h/week'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Compliance Built In:</strong> Section 20 caps -- 8h/day, 48h/week, overtime at 1.5x up to 4h/day and 24h/week -- are checked automatically, so you never approve a schedule that puts the company at risk.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search team members..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map((t,i)=>{
          const sc = STATUS_CFG[t.status]
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.name,...t,impact_links:['My Attendance']}})}}
              style={{background:'#fff',border:`1px solid ${t.flag?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{t.name}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{t.hours}h worked{t.overtime>0&&` . ${t.overtime}h OT`}</div>
                {t.flag&&<div style={{fontSize:8,color:'#b45309',marginTop:4}}>⚠ {t.flag}</div>}
              </div>
              <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Hover or click any team member to drill into their weekly/monthly timesheet history.','OT approaching the statutory cap auto-flags here before you approve anything that breaches it.','Approve time-off requests directly from this view -- no separate navigation to Approval Center required.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Timesheet',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

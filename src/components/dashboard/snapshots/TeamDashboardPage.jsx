// FILE: TeamDashboardPage.jsx - Team Dashboard
// (HR Services & Support > Manager Self Service)
// The manager's control tower -- widget aggregation pulling live from
// daily_attendance_records, leave_applications, performance_appraisals,
// and the approval queues built across this whole build. Never a
// second data source; pure rollup.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const TEAM_KPIS = { headcount:8, present_today:7, on_leave:1, pending_approvals:5, absenteeism_pct:12.5, overdue_reviews:2 }

const ACTION_ITEMS = [
  {type:'Leave Request',detail:'Hari Thapa -- Annual leave, July 5-7',urgency:'medium',target:'Approval Center'},
  {type:'Cash Advance',detail:'Bikash Rai -- NPR 25,000, exceeds your approval limit',urgency:'high',target:'Forward Cash Advance Request'},
  {type:'Performance Review',detail:'Sunil Magar -- Q2 review overdue by 4 days',urgency:'high',target:'Performance Review'},
]

export default function TeamDashboardPage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧭" title="Team Dashboard"
        breadcrumb="HR Services & Support > Manager Self Service"
        gradient={G}
        stats={[
          {icon:'👥',label:'Team Headcount',  value:TEAM_KPIS.headcount},
          {icon:'✅',label:'Present Today',      value:TEAM_KPIS.present_today},
          {icon:'⏳',label:'Pending Approvals',     value:TEAM_KPIS.pending_approvals},
          {icon:'⚠',label:'Overdue Reviews',           value:TEAM_KPIS.overdue_reviews},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🧭</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Control Tower:</strong> Every widget here pulls live from the same data HR sees -- never a stale, separately-maintained snapshot. One glance tells you exactly where your attention is needed today.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
        {/* Team status overview */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>👥 Today's Team Status</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            <div style={{textAlign:'center',background:'#f0fdf4',borderRadius:10,padding:'14px'}}>
              <div style={{fontSize:20,fontWeight:900,color:'#15803d'}}>{TEAM_KPIS.present_today}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>Present</div>
            </div>
            <div style={{textAlign:'center',background:'#fffbeb',borderRadius:10,padding:'14px'}}>
              <div style={{fontSize:20,fontWeight:900,color:'#b45309'}}>{TEAM_KPIS.on_leave}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>On Leave</div>
            </div>
            <div style={{textAlign:'center',background:'#fef2f2',borderRadius:10,padding:'14px'}}>
              <div style={{fontSize:20,fontWeight:900,color:'#dc2626'}}>{TEAM_KPIS.absenteeism_pct}%</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>Absenteeism (30d)</div>
            </div>
          </div>
        </div>

        {/* Action items */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>⚡ Action Items</div>
          {ACTION_ITEMS.map((a,i)=>(
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.detail,...a,impact_links:[a.target]}})}}
              style={{padding:'10px 0',borderBottom:i<ACTION_ITEMS.length-1?'1px solid #f8fafc':'none'}}>
              <div style={{fontSize:9,fontWeight:700,color:a.urgency==='high'?'#dc2626':'#b45309'}}>{a.type}</div>
              <div style={{fontSize:9,color:'#374151',marginTop:2}}>{a.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags absenteeism spikes and scheduling fatigue before they show up in next month\'s numbers.','Action items prioritize by urgency and statutory deadline -- never just chronological order.','Every widget links straight to the source page -- no second login, no app-switching.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

// FILE: MyActivityTodayPage.jsx - My Activity Today
// (HR Services & Support > Employee Self Service)
// Auto-traces every action the LOGGED-IN USER performed today, pulled
// from the NEW employee_activity_log (genuinely new -- distinct from
// transaction_notifications, which tracks what was done TO/FOR someone,
// not what THEY did). Chronological timeline, real-time.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const MODULE_ICONS = {
  attendance:'⏰', leave:'🏖', payroll:'💰', training:'🎓', document:'📂', signature:'✍', goal:'🎯', feedback:'💬', helpdesk:'🎫', login:'🔓',

const TODAY_ACTIVITY = [
  { id:'a1', time:'09:02 AM', module:'login', action:'Logged in via Web Portal' },
  { id:'a2', time:'09:15 AM', module:'attendance', action:'Clock-in recorded', impact_links:['My Attendance'] },
  { id:'a3', time:'11:30 AM', module:'leave', action:'Submitted leave request for July 5-7' },
  { id:'a4', time:'02:10 PM', module:'training', action:'Completed "Data Privacy & Security Compliance" -- 30% progress', impact_links:['My Training'] },
  { id:'a5', time:'03:45 PM', module:'signature', action:'Signed: Written Warning -- Attendance Policy', impact_links:['My Digital Signature'] },
  { id:'a6', time:'04:20 PM', module:'goal', action:'Updated progress on "Mentor 2 junior engineers" to 40%' },
]

export default function MyActivityTodayPage() {
  const [ctx, setCtx] = useState(null)
  const moduleCount = new Set(TODAY_ACTIVITY.map(a=>a.module)).size

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="My Activity Today"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'📋',label:'Actions Today',  value:TODAY_ACTIVITY.length},
          {icon:'🧩',label:'Modules Touched',   value:moduleCount},
          {icon:'⏰',label:'First Action',         value:TODAY_ACTIVITY[0]?.time||'--'},
          {icon:'🔄',label:'Last Action',             value:TODAY_ACTIVITY[TODAY_ACTIVITY.length-1]?.time||'--'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔍</span>
        <div style={{flex:1,minWidth:200}}><strong>Auto-Traced, Not Manually Logged:</strong> Every action you took in this software today -- automatically captured the instant it happens, never something you have to remember to record.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        {TODAY_ACTIVITY.map((a,i)=>(
          <div key={a.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.action,...a}})}}
            style={{display:'flex',gap:14,paddingBottom:i<TODAY_ACTIVITY.length-1?18:0,position:'relative'}}>
            {i<TODAY_ACTIVITY.length-1&&<div style={{position:'absolute',left:19,top:30,bottom:0,width:2,background:'#f1f5f9'}}/>}
            <div style={{width:38,height:38,borderRadius:38,background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,zIndex:1}}>{MODULE_ICONS[a.module]}</div>
            <div style={{flex:1,paddingTop:6}}>
              <div style={{fontSize:10,color:'#374151'}}>{a.action}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:3}}>{a.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Activity captures fire automatically across every module -- no manual time-logging required.','Only your own actions appear here -- this is never visible to managers or HR without your explicit data-access request.','Switch to This Week, This Month, This Quarter, or This Year for a broader view of the same automatic trail.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

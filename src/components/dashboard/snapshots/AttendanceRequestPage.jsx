// FILE: AttendanceRequestPage.jsx - Attendance Request
// (HR Services & Support > Employee Self Service)
// ESS-facing submission UI over the EXISTING missed_punch_requests
// (Daily Attendance session) -- plus overtime claim and comp-off
// request types per Section 20's 1.5x OT pay and substitute-leave rights.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const TYPE_CFG = { missed_punch:{icon:'⏰',label:'Missed Punch'},overtime_claim:{icon:'💪',label:'Overtime Claim'},comp_off:{icon:'🔄',label:'Comp-Off Request'} }
const STATUS_CFG = { pending:{c:'#f59e0b',label:'Pending Manager Review'},approved:{c:'#10b981',label:'Approved'},rejected:{c:'#ef4444',label:'Rejected'} }

const MY_REQUESTS = [
  { id:'r1', type:'missed_punch', detail:'Forgot to clock out yesterday', date:'2025-06-23', status:'pending', impact_links:['My Attendance'] },
  { id:'r2', type:'overtime_claim', detail:'2.5 hrs OT for production deployment', date:'2025-06-20', status:'approved', resolution_note:'Approved -- 1.5x rate applied, 3.75h credited.' },
  { id:'r3', type:'comp_off', detail:'Worked Saturday (weekly rest day) for client demo', date:'2025-06-14', status:'pending' },
]

export default function AttendanceRequestPage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = MY_REQUESTS.filter(r=>!search||r.detail.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📝" title="Attendance Request"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'📝',label:'My Requests',  value:MY_REQUESTS.length},
          {icon:'⏳',label:'Pending',          value:MY_REQUESTS.filter(r=>r.status==='pending').length},
          {icon:'✅',label:'Approved',           value:MY_REQUESTS.filter(r=>r.status==='approved').length},
          {icon:'⚖',label:'OT Rate',                value:'1.5x'},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="New Request"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Section 20 Rights, One Form:</strong> Missed punches, overtime claims (1.5x pay, capped at 24h/week), and compensatory leave for working weekly-rest days or public holidays -- all routed straight to your manager for review.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search my requests..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>{
          const tc = TYPE_CFG[r.type], sc = STATUS_CFG[r.status]
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.detail,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{fontSize:20}}>{tc.icon}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{r.detail}</div>
                    <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{tc.label} . {r.date}</div>
                  </div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
              {r.resolution_note&&<div style={{marginTop:8,fontSize:9,color:'#15803d',background:'#f0fdf4',borderRadius:8,padding:'8px 10px'}}>✅ {r.resolution_note}</div>}
            </div>
          )
        })}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(500px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>New Attendance Request</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Request Type" type="select" value="" onChange={()=>{}} accent={A} options={['Missed Punch','Overtime Claim','Comp-Off Request']}/>
              <Field label="Date" type="date" value="" onChange={()=>{}} accent={A}/>
              <Field label="Details" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Weekly-hours impact preview shows your manager exactly how this request changes overtime totals before they approve.','Comp-off requests auto-check whether the day worked was genuinely a public holiday or weekly rest day.','Requests pending 3+ days auto-escalate with a reminder to your manager.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

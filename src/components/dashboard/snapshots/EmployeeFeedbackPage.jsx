// FILE: EmployeeFeedbackPage.jsx - Employee Feedback
// (Employee Experience & Culture > Employee Engagement)
// Open channel, confidential or open, ticket-style closed-loop tracking
// (Submitted -> Under Review -> Resolved) -- never a "dead end."
// Option to route directly to HR, bypassing the direct manager.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const MY_FEEDBACK = [
  { id:'fb1', topic:'Workload during sprint close', routed_to:'HR (bypassed manager)', status:'under_review', submitted:'2025-06-18', confidential:true,
    impact_links:['Workload Analysis'] },
  { id:'fb2', topic:'Suggestion for standup format', routed_to:'Direct Manager', status:'resolved', submitted:'2025-06-05', confidential:false,
    resolution_note:'Standup shortened to 15 min per team vote -- implemented June 10.' },
]

const STATUS_CFG = { submitted:{c:'#94a3b8',label:'Submitted'},under_review:{c:'#f59e0b',label:'Under Review'},resolved:{c:'#10b981',label:'Resolved'} }

export default function EmployeeFeedbackPage() {
  const [search, setSearch] = useState('')
  const [showSubmit, setShowSubmit] = useState(false)
  const [routeToHR, setRouteToHR] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = MY_FEEDBACK.filter(f=>!search||f.topic.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💬" title="Employee Feedback"
        breadcrumb="Employee Experience & Culture > Employee Engagement"
        gradient={G}
        stats={[
          {icon:'💬',label:'My Submissions',  value:MY_FEEDBACK.length},
          {icon:'✅',label:'Resolved',           value:MY_FEEDBACK.filter(f=>f.status==='resolved').length},
          {icon:'⏳',label:'Under Review',         value:MY_FEEDBACK.filter(f=>f.status==='under_review').length},
          {icon:'🔒',label:'Confidential',           value:MY_FEEDBACK.filter(f=>f.confidential).length},
        ]}
        onAdd={()=>setShowSubmit(true)} addLabel="Share Feedback"/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Never a Dead End:</strong> Every submission is tracked like a ticket -- Submitted, Under Review, Resolved -- with a real resolution note, not silence. Route directly to HR if you'd rather bypass your manager.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search my feedback..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(f=>{
          const sc = STATUS_CFG[f.status]
          return (
            <div key={f.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.topic,...f}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{f.topic} {f.confidential&&'🔒'}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>Routed to: {f.routed_to} . Submitted {f.submitted}</div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
              {f.resolution_note&&<div style={{marginTop:10,fontSize:10,color:'#15803d',background:'#f0fdf4',borderRadius:8,padding:'8px 10px'}}>✅ {f.resolution_note}</div>}
            </div>
          )
        })}
      </div>

      {showSubmit&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSubmit(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(500px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Share Feedback</div></div>
            <div style={{padding:'22px 24px'}}>
              <Field label="Topic" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Details" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <label style={{display:'flex',gap:8,alignItems:'center',marginBottom:10,fontSize:10,color:'#374151'}}>
                <input type="checkbox" checked={routeToHR} onChange={e=>setRouteToHR(e.target.checked)} style={{accentColor:A}}/>
                Route directly to HR (bypass my manager)
              </label>
              <button onClick={()=>setShowSubmit(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Feedback</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Sensitive or medical/personal feedback content is kept confidential per Labour Act requirements -- never shared without consent.','HR-routed feedback skips the direct manager entirely for psychological safety.','Status updates trigger an automatic notification the moment HR moves your case forward.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Thread',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

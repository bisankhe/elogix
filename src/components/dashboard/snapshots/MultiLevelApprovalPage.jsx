// FILE: MultiLevelApprovalPage.jsx - Multi-Level Approval
// (System Administration > Workflow & Automation)
// Sequential-chain status tracker -- distinct from Approval Matrix
// (which defines the chains) -- this shows where IN-FLIGHT requests
// currently sit. Directly addresses the brief's three named pain
// points: approver bottlenecks, delegation failures, lack of visibility.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const IN_FLIGHT = [
  {request:'Expense Claim -- NPR 32,000',requester:'Gita Maharjan',chain:['Line Manager','Project Head','Finance'],current_idx:1,days_at_stage:1},
  {request:'Leave Request -- 5 days',requester:'Bikash Rai',chain:['Department Head','HR Manager'],current_idx:0,days_at_stage:6,
   flag_note:'Department Head has been on leave for 4 of these 6 days with no delegate assigned -- request is stalled, not just slow.'},
]

export default function MultiLevelApprovalPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = IN_FLIGHT.filter(r=>!search||r.requester.toLowerCase().includes(search.toLowerCase()))
  const stalledCount = IN_FLIGHT.filter(r=>r.flag_note).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🪜" title="Multi-Level Approval"
        breadcrumb="System Administration > Workflow & Automation"
        gradient={G}
        stats={[
          {icon:'🪜',label:'In-Flight Requests',  value:IN_FLIGHT.length},
          {icon:'⚠',label:'Stalled (No Delegate)',    value:stalledCount},
          {icon:'👁',label:'Visibility',                  value:'Real-Time'},
          {icon:'🔁',label:'Auto-Delegate',                   value:'Configurable'},
        ]}
        onAdd={()=>{}} addLabel="Configure Delegate"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🪜</span>
        <div style={{flex:1,minWidth:200}}><strong>One Unavailable Manager Shouldn't Halt Everything:</strong> Setting an out-of-office delegate here means a request keeps moving even while its approver is away -- no employee or admin has to guess where a request actually is.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search requests..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map((r,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.request,...r,impact_links:['Escalation Rules']}})}}
            style={{background:'#fff',border:`1px solid ${r.flag_note?'#fecaca':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{r.request}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{r.requester}</div>
              </div>
              <span style={{fontSize:9,fontWeight:700,color:r.days_at_stage>3?'#ef4444':'#94a3b8'}}>{r.days_at_stage} days at current stage</span>
            </div>
            <div style={{display:'flex',gap:4}}>
              {r.chain.map((c,j)=>(
                <div key={j} style={{flex:1,textAlign:'center'}}>
                  <div style={{height:6,borderRadius:6,background:j<=r.current_idx?A:'#f1f5f9'}}/>
                  <div style={{fontSize:7,color:j<=r.current_idx?A:'#94a3b8',fontWeight:j===r.current_idx?700:400,marginTop:4}}>{c}</div>
                </div>
              ))}
            </div>
            {r.flag_note&&<div style={{marginTop:10,fontSize:9,color:'#dc2626',fontWeight:600}}>🚨 {r.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['An approver marked out-of-office with no delegate gets flagged here automatically -- never discovered only when a requester complains.','Click any stage to see exactly who holds the request right now and for how long, ending the "where is my approval" status inquiry.','Setting a delegate here applies system-wide -- never something to configure separately in each module.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Chain',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

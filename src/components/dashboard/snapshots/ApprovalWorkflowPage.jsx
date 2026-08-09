// FILE: ApprovalWorkflowPage.jsx - Approval Workflow
// (Finance, Assets & Administration > Finance & Claims)
// The claims-specific multi-tier routing visualization (Line Manager
// -> Project Head -> Finance) -- distinct from ApprovalCenterPage
// (MSS, the manager's cross-module action queue). Auto-escalation on
// manager absence; the formal dispute path if a claim goes unpaid.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const CHAIN_STAGES = ['Line Manager','Project Head','Finance']

const CLAIMS_IN_FLIGHT = [
  {id:'w1',claim:'Expense Claim -- Client Entertainment',amount:4200,employee:'Hari Thapa',stage_idx:1,days_at_stage:1},
  {id:'w2',claim:'Petty Cash -- Printer cartridge',amount:2400,employee:'Branch Admin',stage_idx:2,days_at_stage:4},
  {id:'w3',claim:'Travel Request -- Dubai conference',amount:32000,employee:'Gita Maharjan',stage_idx:0,days_at_stage:6,
   flag_note:'Line Manager has not actioned in 6 days -- auto-escalating to Project Head.'},
]

export default function ApprovalWorkflowPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = CLAIMS_IN_FLIGHT.filter(c=>!search||c.claim.toLowerCase().includes(search.toLowerCase())||c.employee.toLowerCase().includes(search.toLowerCase()))
  const stalledCount = CLAIMS_IN_FLIGHT.filter(c=>c.flag_note).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔗" title="Approval Workflow"
        breadcrumb="Finance, Assets & Administration > Finance & Claims"
        gradient={G}
        stats={[
          {icon:'🔗',label:'Claims in Flight',  value:CLAIMS_IN_FLIGHT.length},
          {icon:'⚠',label:'Auto-Escalating',        value:stalledCount},
          {icon:'⏱',label:'Avg Days per Stage',         value:'2.8'},
          {icon:'⚖',label:'Dispute Path',                  value:'15d + 21d'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Never Stuck in the Dark:</strong> If a claim sits unactioned too long, it escalates automatically -- and if it's ultimately unpaid despite approval, the Labour Act gives a clear path: 15 days of negotiation, then 21 days with the local Labour Office.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search claims in flight..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(c=>(
          <div key={c.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.claim,...c,impact_links:['Expense Claims','Reimbursement']}})}}
            style={{background:'#fff',border:`1px solid ${c.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.claim}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{c.employee}</div>
              </div>
              <div style={{fontSize:13,fontWeight:900,color:A}}>NPR {c.amount.toLocaleString()}</div>
            </div>
            <div style={{display:'flex',gap:4}}>
              {CHAIN_STAGES.map((s,i)=>(
                <div key={s} style={{flex:1,textAlign:'center'}}>
                  <div style={{height:6,borderRadius:6,background:i<=c.stage_idx?A:'#f1f5f9'}}/>
                  <div style={{fontSize:7,color:i<=c.stage_idx?A:'#94a3b8',fontWeight:i===c.stage_idx?700:400,marginTop:4}}>{s}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:8,fontSize:8,color:'#94a3b8'}}>{c.days_at_stage} days at current stage</div>
            {c.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {c.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Claims unactioned for 5+ days auto-escalate to the next tier -- a manager\'s out-of-office never silently stalls a payment.','Mobile approval works identically to desktop -- traveling executives never become the bottleneck.','Every routing decision is logged with who, when, and any comments -- a complete defensible trail if a dispute ever reaches the Labour Office.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Chain',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

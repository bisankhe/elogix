// FILE: PettyCashClaimPage.jsx - Petty Cash Claim
// (Finance, Assets & Administration > Finance & Claims)
// Per-branch cash box ledger, per-transaction limits, replenishment
// tracking. Genuinely new -- addresses the brief's explicit fraud-risk
// and reconciliation pain points with a digital audit trail.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const PER_TRANSACTION_LIMIT = 2000

const BRANCH_LEDGERS = [
  {branch:'Kathmandu HQ',float_amount:25000,spent:18400,custodian:'Reception Admin'},
  {branch:'Pokhara Branch',float_amount:10000,spent:9650,custodian:'Branch Admin',
   flag_note:'Approaching float exhaustion -- replenishment request recommended.'},
]

const RECENT_CLAIMS = [
  {branch:'Kathmandu HQ',item:'Courier charges',amount:850,claimed_by:'Hari Thapa',date:'2025-06-26'},
  {branch:'Kathmandu HQ',item:'Office tea/coffee supplies',amount:1200,claimed_by:'Reception Admin',date:'2025-06-24'},
  {branch:'Pokhara Branch',item:'Printer cartridge -- emergency',amount:2400,claimed_by:'Branch Admin',date:'2025-06-23',
   flag_note:'Exceeds the NPR 2,000 per-transaction limit -- requires Finance Head approval.'},
]

export default function PettyCashClaimPage() {
  const [search, setSearch] = useState('')
  const [showClaim, setShowClaim] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = RECENT_CLAIMS.filter(c=>!search||c.item.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💵" title="Petty Cash Claim"
        breadcrumb="Finance, Assets & Administration > Finance & Claims"
        gradient={G}
        stats={[
          {icon:'💵',label:'Branches Tracked',  value:BRANCH_LEDGERS.length},
          {icon:'⚠',label:'Needs Replenishment',   value:BRANCH_LEDGERS.filter(b=>b.flag_note).length},
          {icon:'📐',label:'Per-Transaction Limit',     value:'NPR '+PER_TRANSACTION_LIMIT.toLocaleString()},
          {icon:'📋',label:'Digital Audit Trail',          value:'Always On'},
        ]}
        onAdd={()=>setShowClaim(true)} addLabel="File Petty Cash Claim"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>No More Physical Logbook:</strong> Every withdrawal is digitally logged the moment it happens -- no more reconciling a paper ledger against a cash box at month-end, and every claim is attributable to a real person.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:18}}>
        {BRANCH_LEDGERS.map((b,i)=>{
          const pct = Math.round(b.spent/b.float_amount*100)
          return (
            <div key={i} style={{background:'#fff',border:`1px solid ${b.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{b.branch}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>Custodian: {b.custodian}</div>
              <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden',marginTop:10}}><div style={{width:`${pct}%`,height:'100%',background:pct>85?'#ef4444':A,borderRadius:8}}/></div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>NPR {b.spent.toLocaleString()} / {b.float_amount.toLocaleString()}</div>
              {b.flag_note&&<div style={{marginTop:8,fontSize:8,color:'#b45309'}}>⚠ {b.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search claims..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map((c,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.item,...c,impact_links:['Approval Workflow']}})}}
            style={{background:'#fff',border:`1px solid ${c.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:12,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{c.item}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{c.branch} . {c.claimed_by} . {c.date}</div>
              {c.flag_note&&<div style={{marginTop:4,fontSize:8,color:'#b45309'}}>⚠ {c.flag_note}</div>}
            </div>
            <span style={{fontSize:12,fontWeight:800,color:A}}>NPR {c.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {showClaim&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowClaim(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>File Petty Cash Claim</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Branch" type="select" value="" onChange={()=>{}} accent={A} options={BRANCH_LEDGERS.map(b=>b.branch)}/>
              <Field label="Item / Reason" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <Field label="Amount (NPR)" type="number" value="" onChange={()=>{}} accent={A} required hint={`Per-transaction limit: NPR ${PER_TRANSACTION_LIMIT.toLocaleString()}`}/>
              <button onClick={()=>setShowClaim(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Claim</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Claims exceeding the per-transaction limit auto-route to Finance Head, never bypassed at the branch level.','Float exhaustion triggers a replenishment request automatically -- never discovered when the box runs dry mid-day.','Every withdrawal is attributed to a real custodian, removing the "multiple people, one cash box" risk entirely.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

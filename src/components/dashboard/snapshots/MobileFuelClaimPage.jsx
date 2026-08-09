// FILE: MobileFuelClaimPage.jsx - Mobile & Fuel Claim
// (Finance, Assets & Administration > Finance & Claims)
// Monthly recurring allowance claims with mileage/usage tracking.
// Genuinely new -- addresses the personal-vs-business split pain point
// and the legal note that these perks cannot substitute for minimum wage.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const MONTHLY_CLAIMS = [
  {employee:'Hari Thapa',type:'Mobile',amount:1500,cap:2000,month:'June 2025',status:'paid'},
  {employee:'Sunil Magar',type:'Fuel',amount:6200,cap:6000,month:'June 2025',status:'pending',
   flag_note:'Mileage log shows 12% over the monthly cap -- requires manager justification before payment.'},
  {employee:'Hari Thapa',type:'Fuel',amount:4800,cap:6000,month:'June 2025',status:'pending'},
]

export default function MobileFuelClaimPage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = MONTHLY_CLAIMS.filter(c=>!search||c.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📱" title="Mobile &amp; Fuel Claim"
        breadcrumb="Finance, Assets & Administration > Finance & Claims"
        gradient={G}
        stats={[
          {icon:'📱',label:'Active Claims',  value:MONTHLY_CLAIMS.length},
          {icon:'⚠',label:'Over Monthly Cap',   value:MONTHLY_CLAIMS.filter(c=>c.flag_note).length},
          {icon:'✅',label:'Paid This Cycle',        value:MONTHLY_CLAIMS.filter(c=>c.status==='paid').length},
          {icon:'⚖',label:'Wage Floor Protection',      value:'Enforced'},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="Submit Monthly Claim"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>An Allowance, Never a Wage Substitute:</strong> Mobile and fuel allowances are governed by your employment contract, not a statutory entitlement -- but they can never be used to bring your effective pay below the legal minimum wage.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map((c,i)=>{
          const pct = Math.min(Math.round(c.amount/c.cap*100),100)
          const isOver = c.amount > c.cap
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.employee,...c,impact_links:['Reimbursement']}})}}
              style={{background:'#fff',border:`1px solid ${c.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{c.employee}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{c.type} . {c.month}</div>
                </div>
                <div style={{fontSize:13,fontWeight:800,color:isOver?'#dc2626':A}}>NPR {c.amount.toLocaleString()}</div>
              </div>
              <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:isOver?'#ef4444':A,borderRadius:7}}/></div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:6}}>Cap: NPR {c.cap.toLocaleString()}/month</div>
              {c.flag_note&&<div style={{marginTop:8,fontSize:8,color:'#b45309'}}>⚠ {c.flag_note}</div>}
            </div>
          )
        })}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Submit Monthly Claim</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Claim Type" type="select" value="" onChange={()=>{}} accent={A} options={['Mobile','Fuel']}/>
              <Field label="Amount (NPR)" type="number" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Business Use Justification" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported -- helps with the personal-vs-business split"/>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Claims over the monthly cap auto-flag for manager justification -- never silently auto-approved.','Mileage logs cross-check against Travel Request entries to separate genuine business trips from personal use.','Caps are tiered by role -- field-based roles see a different ceiling than office-based ones, never one flat number.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

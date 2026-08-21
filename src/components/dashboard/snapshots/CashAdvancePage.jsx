// FILE: CashAdvancePage.jsx - Cash Advance
// (HR Services & Support > Employee Self Service)
// ESS-facing request UI over the EXISTING salary_advances (Payroll
// Processing session, already 50%-of-net-pay capped) -- extends it
// with the brief's explicit 3-tier chain: Employee -> Supervisor/
// Manager -> HR Manager/Senior Management.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const MY_ADVANCES = [
  { id:'a1', amount_npr:25000, reason:'Medical emergency for family member', repayment_plan:'2 installments', stage:'manager_review',
    expected_net_pay:60000, max_allowed:30000, submitted:'2025-06-20', impact_links:['Payroll Processing'] },
  { id:'a2', amount_npr:40000, reason:'Home renovation', repayment_plan:'1 installment', stage:'rejected',
    expected_net_pay:60000, max_allowed:30000, submitted:'2025-05-10',
    flag_note:'Exceeds the 50% net-pay cap (max NPR 30,000) -- rejected at HR review.' },
  { id:'a3', amount_npr:15000, reason:'Festival expenses', repayment_plan:'1 installment', stage:'disbursed',
    expected_net_pay:60000, max_allowed:30000, submitted:'2025-04-02', disbursed_at:'2025-04-04' },
]

const STAGE_CFG = {
  manager_review:{c:'#f59e0b',label:'Supervisor Review'},hr_review:{c:'#7c3aed',label:'HR Manager Review'},
  disbursed:{c:'#10b981',label:'Disbursed'},rejected:{c:'#ef4444',label:'Rejected'},

export default function CashAdvancePage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [amount, setAmount] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = MY_ADVANCES.filter(a=>!search||a.reason.toLowerCase().includes(search.toLowerCase()))
  const exceedsCap = amount && Number(amount) > 30000

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💵" title="Cash Advance"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'💵',label:'My Requests',  value:MY_ADVANCES.length},
          {icon:'✅',label:'Disbursed',       value:MY_ADVANCES.filter(a=>a.stage==='disbursed').length},
          {icon:'📐',label:'Max Allowed',        value:'50% of Net Pay'},
          {icon:'⚖',label:'Approval Chain',         value:'3 Tiers'},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="Request Cash Advance"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Employee &gt; Supervisor &gt; HR/Senior Management:</strong> Every request you submit is checked against the statutory deduction cap automatically, then routes through your manager before final approval by HR Manager or Senior Management.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search my requests..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(a=>{
          const sc = STAGE_CFG[a.stage]
          return (
            <div key={a.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.reason,...a}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>NPR {a.amount_npr.toLocaleString()}</div>
                  <div style={{fontSize:10,color:'#374151',marginTop:3}}>{a.reason}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{a.repayment_plan} . Submitted {a.submitted}</div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
              {a.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {a.flag_note}</div>}
              {a.disbursed_at&&<div style={{marginTop:8,fontSize:9,color:'#15803d'}}>✅ Disbursed {a.disbursed_at}</div>}
            </div>
          )
        })}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Request Cash Advance</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Amount Requested (NPR)" type="number" value={amount} onChange={setAmount} accent={A} required/>
              {exceedsCap&&<div style={{background:'#fef2f2',borderRadius:10,padding:'10px 14px',fontSize:9,color:'#991b1b',marginBottom:10}}>⚠ This exceeds the 50% net-pay cap (max NPR 30,000) -- your request will likely be rejected.</div>}
              <Field label="Reason" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <Field label="Preferred Repayment Plan" type="select" value="" onChange={()=>{}} accent={A} options={['1 installment','2 installments','3 installments']}/>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Cap calculated live against your actual expected net pay -- never a flat company-wide number.','Approved advances auto-schedule deduction against your selected installment plan in the next payroll cycle.','Repeated advance requests within a short window auto-flag for HR awareness, never silently repeated.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

// FILE: ForwardCashAdvanceRequestPage.jsx - Forward Cash Advance Request
// (HR Services & Support > Manager Self Service)
// Manager review + forward workflow over the EXISTING salary_advances
// (already cap-checked, already 3-tier-aware from ESS Batch 2) -- adds
// only the genuinely new "forward to alternate approver" branch.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const PENDING_ADVANCES = [
  { id:'a1', employee:'Bikash Rai', amount_npr:25000, reason:'Medical emergency for family member', expected_net_pay:60000, max_allowed:30000, exceeds_my_limit:false },
  { id:'a2', employee:'Maya Pradhan', amount_npr:45000, reason:'Home repair after storm damage', expected_net_pay:55000, max_allowed:27500, exceeds_my_limit:true,
    flag_note:'Exceeds your approval limit -- forward to Finance or HR Director required.' },
]

export default function ForwardCashAdvanceRequestPage() {
  const [search, setSearch] = useState('')
  const [forwarding, setForwarding] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = PENDING_ADVANCES.filter(a=>!search||a.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="↪" title="Forward Cash Advance Request"
        breadcrumb="HR Services & Support > Manager Self Service"
        gradient={G}
        stats={[
          {icon:'💵',label:'Pending Review',  value:PENDING_ADVANCES.length},
          {icon:'⚠',label:'Exceeds Your Limit',  value:PENDING_ADVANCES.filter(a=>a.exceeds_my_limit).length},
          {icon:'📐',label:'Cap Rule',               value:'50% of Net Pay'},
          {icon:'📋',label:'Audit Trail',               value:'Always Stamped'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Policy Checked Automatically:</strong> Each request shows the employee's exact cap against expected net pay. If it exceeds your approval authority, you'll forward it -- never approve outside policy by mistake.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(a=>(
          <div key={a.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.employee,...a,impact_links:['Cash Advance']}})}}
            style={{background:'#fff',border:`1.5px solid ${a.exceeds_my_limit?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px',borderLeft:`4px solid ${a.exceeds_my_limit?'#f59e0b':'#15803d'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{a.employee}</div>
                <div style={{fontSize:10,color:'#374151',marginTop:4}}>{a.reason}</div>
              </div>
              <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {a.amount_npr.toLocaleString()}</div>
            </div>
            <div style={{marginTop:10,fontSize:9,color:'#94a3b8'}}>Expected net pay: NPR {a.expected_net_pay.toLocaleString()} . Cap: NPR {a.max_allowed.toLocaleString()}</div>
            {a.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {a.flag_note}</div>}
            <div style={{display:'flex',gap:8,marginTop:12}}>
              {!a.exceeds_my_limit?(
                <button style={{flex:1,padding:11,borderRadius:10,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>
              ):(
                <button onClick={()=>setForwarding(a)} style={{flex:1,padding:11,borderRadius:10,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>↪ Forward to Finance</button>
              )}
              <button style={{padding:'11px 16px',borderRadius:10,border:'1px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontSize:10,cursor:'pointer'}}>❌ Reject</button>
            </div>
          </div>
        ))}
      </div>

      {forwarding&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setForwarding(null)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Forward: {forwarding.employee}</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Forward To" type="select" value="" onChange={()=>{}} accent={A} options={['HR Manager','VP Finance','HR Director']}/>
              <Field label="Justification Note" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Mandatory -- voice input supported"/>
              <button onClick={()=>setForwarding(null)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Forward Request</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Forwarding stamps the request with a full audit trail -- who forwarded, when, and why.','The next approver is notified in real time the moment you forward -- never a stalled email thread.','Cap calculations always reflect the employee\'s current expected net pay, never a stale estimate.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

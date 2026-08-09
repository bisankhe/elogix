// FILE: AdvanceSalaryPage.jsx - Advance Salary (Payroll Processing)
// Earned Wage Access (EWA)-style draw-down: 50% cap of upcoming net pay,
// one-off emergency framing, auto-scheduled single-cycle deduction.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'
const MAX_ADVANCE_PCT = 50

const ADVANCES = [
  { id:'as1', employee:'Sunita Rai', expected_net_npr:48000, requested_npr:20000, max_allowed_npr:24000,
    reason:'Family medical emergency', disbursed_date:'2025-06-19', deduction_pay_period:'2025-07', status:'disbursed',
    impact_links:['Automated Payroll'] },
  { id:'as2', employee:'Ramesh KC', expected_net_npr:35000, requested_npr:22000, max_allowed_npr:17500,
    reason:'Personal - rent due', disbursed_date:null, deduction_pay_period:null, status:'rejected',
    rejection_reason:'Requested amount exceeds the 50% cap of expected net pay (NPR 17,500 max).',
    impact_links:[] },
  { id:'as3', employee:'Bikash Rai', expected_net_npr:52000, requested_npr:15000, max_allowed_npr:26000,
    reason:'Emergency travel', disbursed_date:null, deduction_pay_period:'2025-07', status:'pending',
    impact_links:['Loan Management'] },
]

const STATUS_CFG = {pending:{c:'#f59e0b',bg:'#fffbeb',label:'Pending'},disbursed:{c:'#10b981',bg:'#f0fdf4',label:'Disbursed'},rejected:{c:'#ef4444',bg:'#fef2f2',label:'Rejected'}}

export default function AdvanceSalaryPage() {
  const [advances, setAdvances] = useState(ADVANCES)
  const [search, setSearch] = useState('')
  const [showRequest, setShowRequest] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = advances.filter(a=>!search||a.employee.toLowerCase().includes(search.toLowerCase()))
  const totalDisbursed = advances.filter(a=>a.status==='disbursed').reduce((s,a)=>s+a.requested_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💸" title="Advance Salary"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Processing"
        gradient={G}
        stats={[
          {icon:'💸',label:'Total Requests',  value:advances.length},
          {icon:'⏳',label:'Pending',          value:advances.filter(a=>a.status==='pending').length},
          {icon:'✅',label:'Disbursed',         value:'NPR '+totalDisbursed.toLocaleString()},
          {icon:'📊',label:'Cap',              value:MAX_ADVANCE_PCT+'% of Net Pay'},
        ]}
        onAdd={()=>setShowRequest(true)} addLabel="Request Advance"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>💡</span>
        <div style={{flex:1,minWidth:200}}><strong>Earned Wage Access (EWA) Style:</strong> Capped at {MAX_ADVANCE_PCT}% of expected upcoming net pay to prevent financial distress. Intended for one-off emergency scenarios - not a recurring substitute for budgeting. Recovery auto-scheduled as a single deduction in the very next pay cycle.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(a=>{
          const sc = STATUS_CFG[a.status]
          return (
            <div key={a.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.employee,...a}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,padding:'16px 18px',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8,marginBottom:10}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{a.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#374151',fontStyle:'italic'}}>"{a.reason}"</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {a.requested_npr.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>REQUESTED</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[{l:'Expected Net Pay',v:'NPR '+a.expected_net_npr.toLocaleString(),c:'#3b82f6'},
                  {l:'Max Allowed (50%)',v:'NPR '+a.max_allowed_npr.toLocaleString(),c:a.requested_npr>a.max_allowed_npr?'#ef4444':'#10b981'},
                  {l:'Deduct In',v:a.deduction_pay_period||'-',c:'#7c3aed'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:11,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
              {a.rejection_reason&&<div style={{marginTop:10,background:'#fef2f2',borderRadius:8,padding:'8px 12px',fontSize:10,color:'#991b1b'}}><strong>Rejection note:</strong> {a.rejection_reason}</div>}
            </div>
          )
        })}
      </div>

      {showRequest&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowRequest(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(560px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Request Salary Advance</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{background:'#eff6ff',borderRadius:10,padding:'10px 14px',marginBottom:10,fontSize:11,color:'#1e40af'}}>
                💰 Your maximum eligible advance: <strong>NPR 26,000</strong> (50% of expected net pay)
              </div>
              <Field label="Amount Requested (NPR)" type="number" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Reason" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported - emergency situations prioritized"/>
              <AIImpact color={A} lines={['Auto-blocked if request exceeds 50% of your expected next net pay.','Once approved, the full amount is auto-deducted from your very next payroll cycle.','No interest charged - this is an advance against earned wages, not a loan.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowRequest(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
                <button onClick={()=>setShowRequest(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'✅',label:'Approve',key:'approve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Advance Salary" columns={['Employee','Expected Net Pay','Requested','Max Allowed (50%)','Reason','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

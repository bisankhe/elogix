// FILE: LoanManagementPage.jsx - Loan Management (Payroll Processing)
// Amortization ledger: Principal/EMI/balance, eligibility cap (3 months basic),
// auto-recalc taxable income, default handling on early termination.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A = '#334155'
const MAX_LOAN_MONTHS_BASIC = 3

const LOANS = [
  { id:'l1', employee:'Hari Thapa', loan_type:'Emergency Loan', principal_npr:120000, interest_pct:5,
    tenure_months:12, emi_npr:10500, paid_installments:4, remaining_balance_npr:78000,
    basic_salary_npr:42000, max_eligible_npr:126000, status:'active',
    impact_links:['Salary Structure','Automated Payroll'] },
  { id:'l2', employee:'Maya Pradhan', loan_type:'Education Loan', principal_npr:80000, interest_pct:3,
    tenure_months:8, emi_npr:10300, paid_installments:8, remaining_balance_npr:0,
    basic_salary_npr:71000, max_eligible_npr:213000, status:'cleared',
    impact_links:[] },
  { id:'l3', employee:'Sunil Magar', loan_type:'Housing Advance', principal_npr:200000, interest_pct:6,
    tenure_months:24, emi_npr:8870, paid_installments:2, remaining_balance_npr:182260,
    basic_salary_npr:48000, max_eligible_npr:144000, status:'exceeds_cap',
    impact_links:['Compliance Setup'] },
]

const STATUS_CFG = {active:{c:'#3b82f6',bg:'#eff6ff',label:'Active'},cleared:{c:'#10b981',bg:'#f0fdf4',label:'Cleared'},exceeds_cap:{c:'#ef4444',bg:'#fef2f2',label:'Exceeds Cap'}}

export default function LoanManagementPage() {
  const [loans, setLoans] = useState(LOANS)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = loans.filter(l=>!search||l.employee.toLowerCase().includes(search.toLowerCase()))
  const totalOutstanding = loans.reduce((s,l)=>s+l.remaining_balance_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏦" title="Loan Management"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Processing"
        gradient={G}
        stats={[
          {icon:'🏦',label:'Active Loans',      value:loans.filter(l=>l.status==='active').length},
          {icon:'💰',label:'Total Outstanding',  value:'NPR '+totalOutstanding.toLocaleString()},
          {icon:'✅',label:'Cleared',             value:loans.filter(l=>l.status==='cleared').length},
          {icon:'⚠',label:'Exceeds Cap',         value:loans.filter(l=>l.status==='exceeds_cap').length},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="New Loan Request"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📋</span>
        <div style={{flex:1,minWidth:200}}><strong>Eligibility Cap:</strong> Maximum loan amount capped at {MAX_LOAN_MONTHS_BASIC} months' basic salary, auto-calculated per employee. EMI deductions automatically recalculate taxable income each pay run. Outstanding balances on early termination route to Full & Final Settlement for recovery.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(l=>{
          const sc = STATUS_CFG[l.status]
          const progressPct = Math.round((l.paid_installments/l.tenure_months)*100)
          return (
            <div key={l.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.employee,...l}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{l.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#374151',fontWeight:600}}>{l.loan_type}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:14,fontWeight:900,color:A}}>NPR {l.remaining_balance_npr.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>BALANCE</div>
                </div>
              </div>
              <div style={{padding:'12px 18px'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10}}>
                  {[{l:'Principal',v:'NPR '+l.principal_npr.toLocaleString(),c:'#3b82f6'},{l:'EMI',v:'NPR '+l.emi_npr.toLocaleString(),c:'#7c3aed'},
                    {l:'Eligible Cap',v:'NPR '+l.max_eligible_npr.toLocaleString(),c:'#10b981'},{l:'Progress',v:l.paid_installments+'/'+l.tenure_months,c:A}].map((s,i)=>(
                    <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                      <div style={{fontSize:11,fontWeight:800,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}>
                  <div style={{width:`${progressPct}%`,height:'100%',background:sc.c,borderRadius:7}}/>
                </div>
              </div>
              {l.flag_note&&<div style={{padding:'10px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠</strong> {l.flag_note}</div>}
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(580px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>New Loan Request</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 14px',marginBottom:10,fontSize:11,color:'#065f46'}}>
                💰 Your maximum eligible amount: <strong>NPR 144,000</strong> (3× basic salary)
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Loan Type" type="select" value="" onChange={()=>{}} accent={A} options={['Emergency Loan','Education Loan','Housing Advance','Medical Loan']}/>
                <Field label="Principal Amount (NPR)" type="number" value="" onChange={()=>{}} accent={A} required/>
                <Field label="Tenure (months)" type="number" value="" onChange={()=>{}} accent={A} required/>
                <Field label="Interest Rate (%)" type="number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <Field label="Reason" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['Auto-validates against the 3-month-basic eligibility cap before submission.','EMI auto-calculated and scheduled for recurring monthly payroll deduction.','Taxable income recalculated each cycle once EMI deduction begins.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Amortization Schedule',key:'view'},{icon:'✅',label:'Approve',key:'approve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Loan Management" columns={['Employee','Loan Type','Principal','Interest %','Tenure','EMI','Remaining Balance','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

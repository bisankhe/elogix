// FILE: MyLoanStatusPage.jsx - My Loan Status
// (HR Services & Support > Employee Self Service)
// Milestone tracker + EMI history, pure UI over the EXISTING
// employee_loans + loan_installments (Payroll Processing session) --
// the eligibility cap (3x basic salary) already computed there.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const MILESTONES = ['Application Received','Manager Approved','Finance Reviewed','Disbursed']

const MY_LOAN = {
  loan_type:'Emergency Personal Loan', principal:90000, interest_pct:5, tenure_months:12, emi:7875,
  milestone_idx:3, basic_salary:35000, max_eligible:105000,
  installments:[
    {month:'Jan 2025',amount:7875,status:'paid'},{month:'Feb 2025',amount:7875,status:'paid'},
    {month:'Mar 2025',amount:7875,status:'paid'},{month:'Apr 2025',amount:7875,status:'upcoming'},
  ],
}

export default function MyLoanStatusPage() {
  const [ctx, setCtx] = useState(null)
  const paidCount = MY_LOAN.installments.filter(i=>i.status==='paid').length
  const outstanding = MY_LOAN.principal - (paidCount*MY_LOAN.emi)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏦" title="My Loan Status"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'🏦',label:'Outstanding Balance',  value:'NPR '+outstanding.toLocaleString()},
          {icon:'📅',label:'EMI / Month',              value:'NPR '+MY_LOAN.emi.toLocaleString()},
          {icon:'✅',label:'Installments Paid',           value:paidCount+'/'+MY_LOAN.tenure_months},
          {icon:'📐',label:'Eligibility Cap',                value:'NPR '+MY_LOAN.max_eligible.toLocaleString()},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>Transparent, Always:</strong> Your eligibility cap (3x basic salary), full repayment schedule, and exact outstanding balance -- everything you'd otherwise have to ask HR for.</div>
      </div>

      {/* Milestone tracker */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>{MY_LOAN.loan_type}</div>
        <div style={{display:'flex',gap:4}}>
          {MILESTONES.map((m,i)=>(
            <div key={m} style={{flex:1,textAlign:'center'}}>
              <div style={{height:6,borderRadius:6,background:i<=MY_LOAN.milestone_idx?A:'#f1f5f9'}}/>
              <div style={{fontSize:7,color:i<=MY_LOAN.milestone_idx?A:'#94a3b8',fontWeight:i===MY_LOAN.milestone_idx?700:400,marginTop:4}}>{m}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginTop:18}}>
          <div style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'10px 6px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>NPR {MY_LOAN.principal.toLocaleString()}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Principal</div>
          </div>
          <div style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'10px 6px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{MY_LOAN.interest_pct}%</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Interest Rate</div>
          </div>
          <div style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'10px 6px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{MY_LOAN.tenure_months}mo</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Tenure</div>
          </div>
        </div>
      </div>

      {/* Installment history */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📅 Installment History</div>
        {MY_LOAN.installments.map((i,idx)=>(
          <div key={idx}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:i.month,...i,impact_links:['My Payroll']}})}}
            style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:idx<MY_LOAN.installments.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{i.month} -- NPR {i.amount.toLocaleString()}</span>
            <span style={{background:i.status==='paid'?'#f0fdf4':'#fffbeb',color:i.status==='paid'?'#15803d':'#b45309',fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{i.status}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Each installment deducts automatically through payroll -- no manual repayment step required.','Eligibility cap recalculates if your basic salary changes, never a stale, outdated limit.','Loan requests exceeding the cap auto-flag before submission, saving you a guaranteed rejection.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

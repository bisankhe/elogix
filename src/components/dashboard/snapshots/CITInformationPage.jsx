// FILE: CITInformationPage.jsx - Citizen Investment Trust (CIT) (Payroll & Compensation > Information)
// Voluntary investment ledger: contribution bracket (1-10%), tax-exempt cap
// tracking (1/3 income or NPR 500k), loan-against-fund balance, ESS transparency.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'
const TAX_EXEMPT_CAP_NPR = 500000

const CIT_LEDGER = [
  { id:'c1', employee:'Gita Maharjan', cit_account_no:'CIT-NLK-882140', contribution_pct:5,
    monthly_contrib_npr:2550, accumulated_balance_npr:153000, annual_income_npr:612000,
    tax_exempt_eligible_npr:204000, exceeds_exempt_cap:false, loan_outstanding_npr:0,
    deposit_status:'deposited', impact_links:['Letters - CIT','Tax Setup'] },
  { id:'c2', employee:'Maya Pradhan', cit_account_no:'CIT-NLK-882141', contribution_pct:10,
    monthly_contrib_npr:4800, accumulated_balance_npr:288000, annual_income_npr:576000,
    tax_exempt_eligible_npr:192000, exceeds_exempt_cap:true, loan_outstanding_npr:45000,
    deposit_status:'deposited', impact_links:['Loan Management'] },
  { id:'c3', employee:'Hari Thapa', cit_account_no:'CIT-NLK-882142', contribution_pct:0,
    monthly_contrib_npr:0, accumulated_balance_npr:0, annual_income_npr:504000,
    tax_exempt_eligible_npr:0, exceeds_exempt_cap:false, loan_outstanding_npr:0,
    deposit_status:'not_enrolled', impact_links:[] },
]

const STATUS_CFG = {deposited:{c:'#10b981',bg:'#f0fdf4',label:'Active - Deposited'},not_enrolled:{c:'#94a3b8',bg:'#f8fafc',label:'Not Enrolled'}}

export default function CITInformationPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = CIT_LEDGER.filter(c=>!search||c.employee.toLowerCase().includes(search.toLowerCase()))
  const enrolledCount = CIT_LEDGER.filter(c=>c.deposit_status==='deposited').length
  const exceedsCount = CIT_LEDGER.filter(c=>c.exceeds_exempt_cap).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏦" title="Citizen Investment Trust (CIT)"
        breadcrumb="Workforce Operations > Payroll & Compensation > Information"
        gradient={G}
        stats={[
          {icon:'👥',label:'Enrolled',           value:enrolledCount},
          {icon:'📊',label:'Contribution Range', value:'1% - 10%'},
          {icon:'⚠',label:'Exceeds Exempt Cap',  value:exceedsCount},
          {icon:'💰',label:'Tax-Exempt Cap',       value:'NPR 500K / ⅓ Income'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>💡</span>
        <div style={{flex:1,minWidth:200}}><strong>Voluntary, Tax-Advantaged:</strong> Employees choose their own contribution rate (1-10% of salary). Deductible up to one-third of taxable income OR NPR 500,000, whichever is lower - combined with SSF/insurance. Loans against the accumulated fund are available for housing/education.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(c=>{
          const sc = STATUS_CFG[c.deposit_status]
          return (
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.employee,...c}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{c.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                    {c.exceeds_exempt_cap&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⚠ Exceeds Exempt Cap</span>}
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{c.deposit_status!=='not_enrolled'?`Account: ${c.cit_account_no} . ${c.contribution_pct}% of salary`:'No active CIT account'}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {c.accumulated_balance_npr.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>ACCUMULATED BALANCE</div>
                </div>
              </div>
              {c.deposit_status!=='not_enrolled'&&(
                <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[{l:'Monthly Contribution',v:'NPR '+c.monthly_contrib_npr.toLocaleString(),c:'#3b82f6'},
                    {l:'Tax-Exempt Eligible',v:'NPR '+c.tax_exempt_eligible_npr.toLocaleString(),c:c.exceeds_exempt_cap?'#ef4444':'#10b981'},
                    {l:'Loan Outstanding',v:'NPR '+c.loan_outstanding_npr.toLocaleString(),c:c.loan_outstanding_npr>0?'#f59e0b':'#94a3b8'}].map((x,i)=>(
                    <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                      <div style={{fontSize:11,fontWeight:800,color:x.c}}>{x.v}</div>
                      <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{x.l}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full History',key:'view'},{icon:'💰',label:'Request Loan Against CIT',key:'loan'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

// FILE: SSFInformationPage.jsx - Social Security Fund (SSF) (Payroll & Compensation > Information)
// Per-employee statutory ledger: who contributed, employee 11% + employer 20%
// split, monthly deposit history, accrued balance, self-service transparency.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const SSF_LEDGER = [
  { id:'s1', employee:'Gita Maharjan', ssf_number:'SSF-2081-04521', basic_salary_npr:51000,
    employee_pct:11, employer_pct:20, employee_contrib_npr:5610, employer_contrib_npr:10200,
    total_monthly_npr:15810, accrued_balance_npr:189720, months_contributed:12, deposit_status:'deposited',
    deposit_date:'2025-06-25', impact_links:['Letters - SSF','Payslip Generation'] },
  { id:'s2', employee:'Bikash Rai', ssf_number:'SSF-2081-04522', basic_salary_npr:42000,
    employee_pct:11, employer_pct:20, employee_contrib_npr:4620, employer_contrib_npr:8400,
    total_monthly_npr:13020, accrued_balance_npr:117180, months_contributed:9, deposit_status:'pending',
    deposit_date:null, impact_links:[] },
  { id:'s3', employee:'Maya Pradhan', ssf_number:'SSF-2081-04523', basic_salary_npr:48000,
    employee_pct:11, employer_pct:20, employee_contrib_npr:5280, employer_contrib_npr:9600,
    total_monthly_npr:14880, accrued_balance_npr:178560, months_contributed:12, deposit_status:'deposited',
    deposit_date:'2025-06-25', impact_links:[] },
]

const STATUS_CFG = {deposited:{c:'#10b981',bg:'#f0fdf4',label:'Deposited'},pending:{c:'#f59e0b',bg:'#fffbeb',label:'Pending Deposit'}}

export default function SSFInformationPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = SSF_LEDGER.filter(s=>!search||s.employee.toLowerCase().includes(search.toLowerCase()))
  const totalDeposited = SSF_LEDGER.reduce((s,x)=>s+x.total_monthly_npr,0)
  const pendingCount = SSF_LEDGER.filter(s=>s.deposit_status==='pending').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🛡" title="Social Security Fund (SSF)"
        breadcrumb="Workforce Operations > Payroll & Compensation > Information"
        gradient={G}
        stats={[
          {icon:'👥',label:'Enrolled Employees', value:SSF_LEDGER.length},
          {icon:'💰',label:'This Month Total',     value:'NPR '+totalDeposited.toLocaleString()},
          {icon:'⏳',label:'Pending Deposit',       value:pendingCount},
          {icon:'📊',label:'Contribution Split',     value:'11% + 20%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Statutory Split:</strong> Employee contributes 11% of basic salary, Employer contributes 20% (total 31%) - both deposited to SSF each pay cycle. Late deposits incur 10% interest recovery and potential employer penalties. Every employee can view their own deposit history in real time via Employee Self-Service.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(s=>{
          const sc = STATUS_CFG[s.deposit_status]
          return (
            <div key={s.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.employee,...s}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{s.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>SSF No: {s.ssf_number} . {s.months_contributed} months contributed</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {s.accrued_balance_npr.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>ACCRUED BALANCE</div>
                </div>
              </div>
              <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[{l:`Employee (${s.employee_pct}%)`,v:'NPR '+s.employee_contrib_npr.toLocaleString(),c:'#3b82f6'},
                  {l:`Employer (${s.employer_pct}%)`,v:'NPR '+s.employer_contrib_npr.toLocaleString(),c:'#7c3aed'},
                  {l:'This Month Total',v:'NPR '+s.total_monthly_npr.toLocaleString(),c:'#10b981'}].map((x,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:11,fontWeight:800,color:x.c}}>{x.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{x.l}</div>
                  </div>
                ))}
              </div>
              {s.deposit_date&&<div style={{padding:'8px 18px',fontSize:9,color:'#94a3b8'}}>Last deposited: {s.deposit_date}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>📱 Employee Self-Service Preview</div>
        <AIImpact color={A} lines={['Every employee sees their own SSF number, accrued balance, and full deposit history.','Monthly contribution breakdown (employee vs employer share) shown transparently.','Auto-reminder sent if a deposit is delayed past the statutory deadline.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Deposit History',key:'view'},{icon:'📥',label:'Export Statement',key:'export'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

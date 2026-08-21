// FILE: FinalSettlementPage.jsx - Final Settlement (Payroll Finalization)
// Payroll-side view/wizard into the EXISTING fnf_settlements table (built in
// the Offboarding module) - gratuity 8.33%, leave encashment, severance,
// exit-clearance gate, 15-day statutory deadline countdown.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const SETTLEMENTS = [
  { id:'fs1', employee:'Sunil Magar', last_working_date:'2025-06-15', settlement_deadline:'2025-06-30', days_remaining:9,
    clearance_complete:true, unpaid_salary_npr:24000, leave_encashment_npr:38500, gratuity_npr:42600, overtime_npr:2100,
    total_earnings_npr:107200, tds_npr:8500, advance_recovery_npr:0, loan_recovery_npr:5200, total_deductions_npr:13700,
    net_payable_npr:93500, status:'ready_for_payout', impact_links:['Exit Clearance','Leave Encashment'] },
  { id:'fs2', employee:'Anjali Sharma', last_working_date:'2025-06-10', settlement_deadline:'2025-06-25', days_remaining:4,
    clearance_complete:false, unpaid_salary_npr:18000, leave_encashment_npr:21000, gratuity_npr:31200, overtime_npr:0,
    total_earnings_npr:70200, tds_npr:6200, advance_recovery_npr:3000, loan_recovery_npr:0, total_deductions_npr:9200,
    net_payable_npr:61000, status:'pending_clearance', clearance_note:'Laptop and ID card not yet returned to IT.',
    impact_links:['Asset Return'] },
  { id:'fs3', employee:'Hari Thapa', last_working_date:'2025-06-01', settlement_deadline:'2025-06-16', days_remaining:-5,
    clearance_complete:true, unpaid_salary_npr:42000, leave_encashment_npr:55000, gratuity_npr:48000, overtime_npr:0,
    total_earnings_npr:145000, tds_npr:12000, advance_recovery_npr:0, loan_recovery_npr:8000, total_deductions_npr:20000,
    net_payable_npr:125000, status:'overdue', impact_links:['Bank Transfer File'] },
]

const STATUS_CFG = {
  pending_clearance:{c:'#f59e0b',bg:'#fffbeb',label:'Pending Clearance'},
  ready_for_payout:{c:'#10b981',bg:'#f0fdf4',label:'Ready for Payout'},
  overdue:{c:'#ef4444',bg:'#fef2f2',label:'⚠ Overdue (15-Day Deadline)'},

export default function FinalSettlementPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = SETTLEMENTS.filter(s=>!search||s.employee.toLowerCase().includes(search.toLowerCase()))
  const overdueCount = SETTLEMENTS.filter(s=>s.status==='overdue').length
  const totalPayable = SETTLEMENTS.reduce((s,x)=>s+x.net_payable_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📤" title="Final Settlement"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Finalization"
        gradient={G}
        stats={[
          {icon:'📤',label:'Active Settlements', value:SETTLEMENTS.length},
          {icon:'⚠',label:'Overdue (15-Day)',    value:overdueCount},
          {icon:'🔒',label:'Pending Clearance',   value:SETTLEMENTS.filter(s=>s.status==='pending_clearance').length},
          {icon:'💰',label:'Total Payable',        value:'NPR '+totalPayable.toLocaleString()},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Nepal LA2074 Sections 49/53/145:</strong> Final settlement due within 15 days of last working date. Gratuity = 8.33% of basic remuneration (deposited to SSF). Leave encashment covers accumulated Home Leave (≤90d) and Sick Leave (≤45d). No payout is released until Exit Clearance confirms all company assets are returned.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(s=>{
          const sc = STATUS_CFG[s.status]
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
                  <div style={{fontSize:10,color:'#64748b'}}>Last working day: {s.last_working_date}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {s.net_payable_npr.toLocaleString()}</div>
                  <div style={{fontSize:8,color:s.days_remaining<0?'#ef4444':'#94a3b8',fontWeight:700}}>{s.days_remaining<0?`${Math.abs(s.days_remaining)}d OVERDUE`:`${s.days_remaining}d remaining`}</div>
                </div>
              </div>

              <div style={{padding:'12px 18px'}}>
                <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',marginBottom:6}}>EARNINGS</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
                  {[{l:'Unpaid Salary',v:s.unpaid_salary_npr},{l:'Leave Encashment',v:s.leave_encashment_npr},{l:'Gratuity (8.33%)',v:s.gratuity_npr},{l:'Overtime',v:s.overtime_npr}].map((x,i)=>(
                    <div key={i} style={{textAlign:'center',background:'#f0fdf4',borderRadius:8,padding:'6px 4px'}}>
                      <div style={{fontSize:10,fontWeight:800,color:'#15803d'}}>NPR {x.v.toLocaleString()}</div>
                      <div style={{fontSize:7,color:'#94a3b8',marginTop:2}}>{x.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',marginBottom:6}}>DEDUCTIONS</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                  {[{l:'TDS',v:s.tds_npr},{l:'Advance Recovery',v:s.advance_recovery_npr},{l:'Loan Recovery',v:s.loan_recovery_npr}].map((x,i)=>(
                    <div key={i} style={{textAlign:'center',background:'#fef2f2',borderRadius:8,padding:'6px 4px'}}>
                      <div style={{fontSize:10,fontWeight:800,color:'#dc2626'}}>NPR {x.v.toLocaleString()}</div>
                      <div style={{fontSize:7,color:'#94a3b8',marginTop:2}}>{x.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {s.clearance_note&&<div style={{padding:'10px 18px',background:'#fffbeb',fontSize:10,color:'#92400e'}}><strong>🔒 Clearance Blocked:</strong> {s.clearance_note}</div>}

              <div style={{padding:'10px 18px',display:'flex',justifyContent:'flex-end'}}>
                <button disabled={!s.clearance_complete} style={{padding:'8px 18px',borderRadius:8,border:'none',background:!s.clearance_complete?'#e2e8f0':A,color:!s.clearance_complete?'#94a3b8':'#fff',fontSize:11,fontWeight:700,cursor:!s.clearance_complete?'not-allowed':'pointer'}}>
                  {!s.clearance_complete?'🔒 Awaiting Clearance':'Release Final Payout'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Settlement',key:'view'},{icon:'📤',label:'Release Payout',key:'release'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

// FILE: AutomatedPayrollPage.jsx - Automated Payroll (Payroll Processing)
// End-to-end gross-to-net pay-run pipeline: Time&Attendance -> Variable Pay ->
// Deductions -> Tax&Billing, with stage progress tracker and one-click run.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const PIPELINE_STAGES = [
  {key:'attendance',label:'Time & Attendance',formula:'Gross = Base + Overtime',status:'complete',count:248},
  {key:'variable',label:'Variable Pay',formula:'+ Bonus + Incentives',status:'complete',count:248},
  {key:'deductions',label:'Deductions',formula:'- Loan Repayment - Advance Salary',status:'in_progress',count:201},
  {key:'tax_billing',label:'Tax & Billing',formula:'- Taxes - Deductions + Vendor Billing',status:'pending',count:0},
]

const RUN_RECORDS = [
  { id:'pr1', employee:'Gita Maharjan', dept:'IT', gross_npr:85000, deductions_npr:18420, net_npr:66580, status:'ready',
    impact_links:['Tax & Compliance','Salary Structure'] },
  { id:'pr2', employee:'Bikash Rai', dept:'IT', gross_npr:62000, deductions_npr:31460, net_npr:30540, status:'flagged',
    impact_links:['Loan Management','Deduction'] },
  { id:'pr3', employee:'Maya Pradhan', dept:'Finance', gross_npr:71000, deductions_npr:15730, net_npr:55270, status:'ready',
    impact_links:[] },
]

const STAGE_CFG = {complete:{c:'#10b981',icon:'✅'},in_progress:{c:'#f59e0b',icon:'🔄'},pending:{c:'#94a3b8',icon:'⏳'}}
const STATUS_CFG = {ready:{c:'#10b981',bg:'#f0fdf4',label:'Ready'},flagged:{c:'#ef4444',bg:'#fef2f2',label:'Flagged'}}

export default function AutomatedPayrollPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = RUN_RECORDS.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const flaggedCount = RUN_RECORDS.filter(r=>r.status==='flagged').length
  const totalNet = RUN_RECORDS.reduce((s,r)=>s+r.net_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚙" title="Automated Payroll"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Processing"
        gradient={G}
        stats={[
          {icon:'👥',label:'Employees in Run',  value:248},
          {icon:'🔄',label:'Current Stage',      value:'Deductions'},
          {icon:'⚠',label:'Flagged',            value:flaggedCount},
          {icon:'💰',label:'Total Net (Preview)', value:'NPR '+(totalNet/1000).toFixed(0)+'K'},
        ]}
        onAdd={()=>{}} addLabel="Run Pay Cycle" onExcel={()=>{}}/>

      {/* Pipeline tracker */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>🔄 Pay-Run Pipeline - June 2025</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
          {PIPELINE_STAGES.map((s,i)=>{
            const sc = STAGE_CFG[s.status]
            return (
              <div key={s.key} style={{background:`${sc.c}10`,border:`1.5px solid ${sc.c}33`,borderRadius:12,padding:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{fontSize:16}}>{sc.icon}</span>
                  <span style={{fontSize:9,color:sc.c,fontWeight:700}}>{s.count}/248</span>
                </div>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{s.label}</div>
                <div style={{fontSize:8,color:'#64748b',marginTop:3,fontFamily:'monospace'}}>{s.formula}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚙</span>
        <div style={{flex:1,minWidth:200}}><strong>Touchless Processing:</strong> Pulls directly from Time & Attendance, Salary Structure, Loan/Advance ledgers, and Tax Setup - zero manual re-entry. Deduction-cap violations (33% statutory limit) are auto-flagged before finalization, never silently processed.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status] || {c:'#64748b',bg:'#f8fafc',label:r.status,icon:'📋'}
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,padding:'16px 18px',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8,marginBottom:10}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{r.dept}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {r.net_npr.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>NET PAY</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[{l:'Gross',v:'NPR '+r.gross_npr.toLocaleString(),c:'#3b82f6'},{l:'Deductions',v:'NPR '+r.deductions_npr.toLocaleString(),c:'#ef4444'},{l:'Net',v:'NPR '+r.net_npr.toLocaleString(),c:'#10b981'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:11,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
              {r.flag_note&&<div style={{marginTop:10,background:'#fef2f2',borderRadius:8,padding:'8px 12px',fontSize:10,color:'#991b1b'}}><strong>⚠</strong> {r.flag_note}</div>}
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Payslip Preview',key:'view'},{icon:'⚠',label:'Resolve Flag',key:'resolve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

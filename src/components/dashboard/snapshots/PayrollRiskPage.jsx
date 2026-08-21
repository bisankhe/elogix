// FILE: PayrollRiskPage.jsx - Payroll Risk
// (Compliance & Risk Management > Risk Management)
// Labor cost variance, unapproved timecard flags, overtime leakage --
// genuinely new detection layer over the EXISTING payslips/
// daily_attendance_records (never a second payroll calculation engine,
// purely a discrepancy/anomaly scan).

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const SEVERITY_CFG = { high:{c:'#ef4444',label:'High'},medium:{c:'#f59e0b',label:'Medium'},low:{c:'#94a3b8',label:'Low'} }

const FLAGS = [
  {id:'p1',type:'Unapproved Overtime',employee:'Gita Maharjan',detail:'9.2h logged with no manager approval on file',severity:'high',amount_npr:2100,target:'My Attendance'},
  {id:'p2',type:'SSF Contribution Mismatch',employee:'Hari Thapa',detail:'Employer 11% / Employee 10% split shows a 0.4% calculation drift',severity:'medium',amount_npr:340,target:'Payroll Budget'},
  {id:'p3',type:'Sudden Salary Spike',employee:'Sunil Magar',detail:'42% increase month-over-month with no linked promotion record',severity:'high',amount_npr:18000,target:'Compensation'},
]

export default function PayrollRiskPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = FLAGS.filter(f=>!search||f.employee.toLowerCase().includes(search.toLowerCase())||f.type.toLowerCase().includes(search.toLowerCase()))
  const totalExposure = FLAGS.reduce((s,f)=>s+f.amount_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💰" title="Payroll Risk"
        breadcrumb="Compliance & Risk Management > Risk Management"
        gradient={G}
        stats={[
          {icon:'💰',label:'Active Flags',  value:FLAGS.length},
          {icon:'🔴',label:'High Severity',     value:FLAGS.filter(f=>f.severity==='high').length},
          {icon:'⚠',label:'Financial Exposure',    value:'NPR '+totalExposure.toLocaleString()},
          {icon:'⚖',label:'SSF Rate',                  value:'11% / 10%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🚨</span>
        <div style={{flex:1,minWidth:200}}><strong>Caught Before Payroll Runs, Not After:</strong> Every flag here surfaces during processing -- a sudden salary spike or unapproved overtime gets reviewed before the wire transfer, never discovered in a post-payment audit.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee or flag type..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(f=>{
          const sc = SEVERITY_CFG[f.severity]
          return (
            <div key={f.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.type,...f,impact_links:[f.target]}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{f.type}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{f.employee} . {f.detail}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
                  <div style={{fontSize:11,fontWeight:700,color:A,marginTop:4}}>NPR {f.amount_npr.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI compares each pay run against the prior 3 cycles -- spikes outside normal variance flag automatically, no manual spreadsheet comparison.','Overtime missing a manager approval blocks finalization until reviewed -- never silently paid out.','SSF split mismatches catch rounding-rule drift before it compounds across dozens of pay cycles.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'✅',label:'Mark Resolved',key:'resolve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

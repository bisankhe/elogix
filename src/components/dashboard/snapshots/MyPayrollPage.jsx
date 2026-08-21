// FILE: MyPayrollPage.jsx - My Payroll
// (HR Services & Support > Employee Self Service)
// Salary progression chart + current breakdown, pure UI over the
// EXISTING payslips table (Payroll Finalization session) -- never a
// second payroll calculation. Distinct from Payslip Download (the
// document archive); this is the analytical/visual view.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const PROGRESSION = [
  {month:'Jan',net:52000},{month:'Feb',net:52000},{month:'Mar',net:54200},{month:'Apr',net:52000},
  {month:'May',net:58500},{month:'Jun',net:52000},
]

const CURRENT_BREAKDOWN = {
  gross:62000, ssf_employee:6820, tds:2400, other_deductions:780, net:52000,
  ytd_gross:372000, ytd_net:310000,

export default function MyPayrollPage() {
  const [ctx, setCtx] = useState(null)
  const maxNet = Math.max(...PROGRESSION.map(p=>p.net))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💰" title="My Payroll"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'💰',label:'This Month Net',  value:'NPR '+CURRENT_BREAKDOWN.net.toLocaleString()},
          {icon:'📈',label:'YTD Gross',          value:'NPR '+CURRENT_BREAKDOWN.ytd_gross.toLocaleString()},
          {icon:'📊',label:'YTD Net',               value:'NPR '+CURRENT_BREAKDOWN.ytd_net.toLocaleString()},
          {icon:'🔒',label:'Bank Account',             value:'---- 9012'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>Section 34-35 Transparency:</strong> Every figure here is the exact same number locked into your payslip the moment payroll closes -- gross, deductions, and net, with full year-to-date visibility.</div>
      </div>

      {/* Salary progression chart */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📈 Salary Progression -- Last 6 Months</div>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',height:90}}>
          {PROGRESSION.map((p,i)=>(
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.month,...p,impact_links:['Payslip Download']}})}}
              style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <div style={{fontSize:8,fontWeight:700,color:A}}>{(p.net/1000).toFixed(0)}K</div>
              <div style={{width:'100%',background:A,borderRadius:'4px 4px 0 0',height:`${p.net/maxNet*70}px`}}/>
              <div style={{fontSize:8,color:'#94a3b8'}}>{p.month}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current month breakdown */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>💵 This Month's Breakdown</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div>
            <div style={{fontSize:9,fontWeight:700,color:'#15803d',marginBottom:8}}>EARNINGS</div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:6}}><span>Gross Pay</span><span style={{fontWeight:700}}>NPR {CURRENT_BREAKDOWN.gross.toLocaleString()}</span></div>
          </div>
          <div>
            <div style={{fontSize:9,fontWeight:700,color:'#dc2626',marginBottom:8}}>DEDUCTIONS</div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:6}}><span>SSF (Employee)</span><span>NPR {CURRENT_BREAKDOWN.ssf_employee.toLocaleString()}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:6}}><span>TDS</span><span>NPR {CURRENT_BREAKDOWN.tds.toLocaleString()}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:6}}><span>Other</span><span>NPR {CURRENT_BREAKDOWN.other_deductions.toLocaleString()}</span></div>
          </div>
        </div>
        <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between'}}>
          <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>Net Pay</span>
          <span style={{fontSize:16,fontWeight:900,color:A}}>NPR {CURRENT_BREAKDOWN.net.toLocaleString()}</span>
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Figures lock the instant payroll finalizes -- never an estimate that later changes underneath you.','Ask the AI assistant "why is my deduction higher this month?" for an instant, plain-language explanation.','Bank account details are masked here -- update them only through Profile Update with HR approval.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Payslip',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

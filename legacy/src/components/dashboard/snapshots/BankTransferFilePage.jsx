// FILE: BankTransferFilePage.jsx - Bank Transfer File (Payroll Finalization)
// Sequential wizard: Select Pay Group -> Choose Bank -> Generate File -> Export
// Log. Segregation-of-duties guard, $0 test-transaction verification status.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const EXPORT_LOG = [
  { id:'bt1', bank:'Nepal Investment Bank', format:'SIF (Bank Standard Format)', employees:248, total_npr:13420000,
    generated_by:'Dipesh Bhattarai (Finance Controller)', generated_at:'2025-06-21 09:15 AM', status:'transmitted',
    impact_links:['Payroll Approval'] },
  { id:'bt2', bank:'Standard Chartered Nepal', format:'ISO 20022 XML', employees:12, total_npr:840000,
    generated_by:'Dipesh Bhattarai (Finance Controller)', generated_at:'2025-06-15 02:00 PM', status:'transmitted',
    impact_links:[] },
]

const STATUS_CFG = {transmitted:{c:'#10b981',bg:'#f0fdf4',label:'Transmitted'},pending:{c:'#f59e0b',bg:'#fffbeb',label:'Pending'}}

export default function BankTransferFilePage() {
  const [wizardStep, setWizardStep] = useState(1)
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏦" title="Bank Transfer File"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Finalization"
        gradient={G}
        stats={[
          {icon:'🏦',label:'Files Generated',  value:EXPORT_LOG.length},
          {icon:'👥',label:'Employees Covered', value:260},
          {icon:'💰',label:'Total Transmitted',  value:'NPR '+((EXPORT_LOG.reduce((s,e)=>s+e.total_npr,0))/1000000).toFixed(1)+'M'},
          {icon:'🔒',label:'Segregation of Duties', value:'Enforced'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔐</span>
        <div style={{flex:1,minWidth:200}}><strong>Segregation of Duties:</strong> Only Finance Controller+ roles can generate/upload bank files - separate from the Payroll Processor who compiled the data. Per Nepal Labour Rule 21, salaries must be disbursed through formal banking channels.</div>
      </div>

      {/* Sequential wizard */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'22px 24px',marginBottom:18}}>
        <div style={{display:'flex',gap:6,marginBottom:18}}>
          {['Select Pay Group','Choose Bank','Generate File','Export Log'].map((s,i)=>(
            <div key={i} style={{flex:1,textAlign:'center'}}>
              <div style={{width:30,height:30,borderRadius:'50%',background:i+1<=wizardStep?A:'#f1f5f9',color:i+1<=wizardStep?'#fff':'#94a3b8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,margin:'0 auto 6px'}}>{i+1}</div>
              <div style={{fontSize:9,color:i+1<=wizardStep?A:'#94a3b8',fontWeight:i+1===wizardStep?700:400}}>{s}</div>
            </div>
          ))}
        </div>

        {wizardStep===1&&(<>
          <Field label="Pay Group" type="select" value="" onChange={()=>{}} accent={A} options={['All Employees - June 2025','Outsourced Staff Only','Finance Department Only']}/>
          <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 14px',fontSize:11,color:'#065f46'}}>248 employees, total NPR 13,420,000 - payroll already approved at Level 4.</div>
        </>)}
        {wizardStep===2&&(<>
          <Field label="Bank" type="select" value="" onChange={()=>{}} accent={A} options={['Nepal Investment Bank','Standard Chartered Nepal','Global IME Bank','Nabil Bank']}/>
          <Field label="File Format" type="select" value="" onChange={()=>{}} accent={A} options={['SIF (Bank Standard Format)','ISO 20022 XML','NACHA','CSV (Generic)']}/>
        </>)}
        {wizardStep===3&&(<>
          <div style={{background:'#fffbeb',borderRadius:10,padding:'12px 14px',marginBottom:10,fontSize:11,color:'#92400e'}}>
            🧪 <strong>$0 Test Transaction:</strong> A zero-amount pre-notification will be sent first to verify all routing/account numbers before the live file generates.
          </div>
          <AIImpact color={A} lines={['Pulls verified bank details directly from employee records - zero manual entry.','Auto-validates account number format against the selected bank\'s standard.','Encrypted file generated only after $0 test transaction succeeds.']}/>
        </>)}
        {wizardStep===4&&(
          <div style={{background:'#f0fdf4',borderRadius:10,padding:'16px',textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:8}}>✅</div>
            <div style={{fontSize:13,fontWeight:800,color:'#065f46'}}>File Generated & Logged</div>
            <div style={{fontSize:10,color:'#64748b',marginTop:4}}>nepal_investment_bank_june2025.sif - 248 records - NPR 13,420,000</div>
          </div>
        )}

        <div style={{display:'flex',gap:10,marginTop:18,flexWrap:'wrap'}}>
          {wizardStep>1&&<button onClick={()=>setWizardStep(wizardStep-1)} style={{padding:'12px 22px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Back</button>}
          <button onClick={()=>setWizardStep(Math.min(wizardStep+1,4))} style={{flex:1,minWidth:160,padding:12,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>{wizardStep<4?'Next':'Download File'}</button>
        </div>
      </div>

      {/* Export log */}
      <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>📋 Export History</div>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
        {EXPORT_LOG.map((e,i)=>{
          const sc = STATUS_CFG[e.status]
          return (
            <div key={e.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.bank,...e}})}}
              style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderBottom:i<EXPORT_LOG.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{e.bank} <span style={{background:sc.bg,color:sc.c,fontSize:8,fontWeight:700,padding:'1px 7px',borderRadius:20,marginLeft:6}}>{sc.label}</span></div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{e.format} . {e.employees} employees . NPR {e.total_npr.toLocaleString()} . {e.generated_at}</div>
              </div>
              <button style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#f8fafc',color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>📥 Re-Download</button>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View File Detail',key:'view'},{icon:'📥',label:'Re-Download',key:'download'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

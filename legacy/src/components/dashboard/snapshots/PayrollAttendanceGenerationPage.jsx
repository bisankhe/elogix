// FILE: PayrollAttendanceGenerationPage.jsx - Payroll Attendance Generation
// Zero-touch STP: aggregates approved attendance into payable-days/LOP/OT/SSF
// summary, pre-payroll discrepancy audit, one-click push to payroll engine.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const PAYROLL_BATCH = [
  { id:'pg1', employee:'Gita Maharjan', dept:'IT', payable_days:22, lop_days:0, ot_hours:4.5,
    ot_amount_npr:1968, ssf_contribution_npr:6480, discrepancy:null, ready:true,
    impact_links:['Full & Final Settlement','SSF Letters'] },
  { id:'pg2', employee:'Bikash Rai', dept:'IT', payable_days:20, lop_days:1, ot_hours:6,
    ot_amount_npr:2625, ssf_contribution_npr:5940, discrepancy:'1 unresolved missed-punch from June 20',
    ready:false, impact_links:['Attendance Approval','Missed Log In/Out Request'] },
  { id:'pg3', employee:'Maya Pradhan', dept:'Finance', payable_days:22, lop_days:0, ot_hours:2.1,
    ot_amount_npr:919, ssf_contribution_npr:7200, discrepancy:null, ready:true,
    impact_links:[] },
]

export default function PayrollAttendanceGenerationPage() {
  const [batch, setBatch] = useState(PAYROLL_BATCH)
  const [search, setSearch] = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [locked, setLocked] = useState(false)
  const [_gm, _sgm] = useState('')
  const notify = m => { _sgm(m); setTimeout(()=>_sgm(''),4000) }
  const [ctx, setCtx] = useState(null)

  const filtered = batch.filter(b=>!search||b.employee.toLowerCase().includes(search.toLowerCase()))
  const readyCount = batch.filter(b=>b.ready).length
  const discrepancyCount = batch.filter(b=>b.discrepancy).length
  const totalOTCost = batch.reduce((s,b)=>s+b.ot_amount_npr,0)
  const totalSSF = batch.reduce((s,b)=>s+b.ssf_contribution_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💰" title="Payroll Attendance Generation"
        breadcrumb="Workforce Operations > Attendance Management"
        gradient={G}
        stats={[
          {icon:'👥',label:'Employees in Batch', value:batch.length},
          {icon:'✅',label:'Ready to Push',        value:readyCount},
          {icon:'⚠',label:'Discrepancies',        value:discrepancyCount},
          {icon:'💰',label:'Total OT Cost',         value:'NPR '+totalOTCost.toLocaleString()},
        ]}
        onAdd={()=>{}} addLabel="Generate Batch" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {_gm&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#991b1b',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{_gm}</div>}
      {locked&&<div style={{background:'#fef2f2',border:'2px solid #dc2626',borderRadius:12,padding:'12px 16px',marginBottom:14,fontSize:12,color:'#991b1b',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>🔒 <strong>Attendance LOCKED for payroll.</strong> No edits allowed. HR Admin only can unfinalize.</span><button onClick={()=>{setLocked(false);notify('🔓 Attendance unfinalized by HR Admin')}} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#dc2626',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>HR: Unfinalize</button></div>}
      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚙</span>
        <div><strong>Zero-Touch Straight-Through Processing:</strong> Approved attendance auto-converts to payable days, Loss-of-Pay (LOP) deductions, overtime at 1.5×, and SSF contributions. Employees with unresolved discrepancies are held out of the push until resolved - protecting payroll accuracy.</div>
      </div>

      {discrepancyCount>0&&(
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:'#991b1b',marginBottom:4}}>⚠ Pre-Payroll Discrepancy Audit</div>
          <div style={{fontSize:10,color:'#991b1b'}}>{discrepancyCount} employee(s) have unresolved attendance issues - resolve via Attendance Approval before this batch can be finalized.</div>
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(b=>(
          <div key={b.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:b.employee,...b}})}}
            style={{background:'#fff',border:`1.5px solid ${b.discrepancy?'#fecaca':'#bbf7d0'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${b.ready?'#10b981':'#f59e0b'}`}}>
            <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:'1px solid #f1f5f9'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{b.employee}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{b.dept}</div>
              </div>
              <span style={{background:b.ready?'#f0fdf4':'#fffbeb',color:b.ready?'#15803d':'#b45309',fontSize:9,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{b.ready?'✅ Ready':'⏳ Held'}</span>
            </div>
            <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {[{l:'Payable Days',v:b.payable_days,c:'#10b981'},{l:'LOP Days',v:b.lop_days,c:b.lop_days>0?'#ef4444':'#10b981'},
                {l:'OT Hours',v:b.ot_hours+'h',c:A},{l:'OT Amount',v:'NPR '+b.ot_amount_npr,c:'#f59e0b'}].map((s,i)=>(
                <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                  <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:600,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{padding:'8px 18px',fontSize:10,color:'#64748b',borderTop:'1px solid #f8fafc'}}>SSF Contribution: NPR {b.ssf_contribution_npr.toLocaleString()}</div>
            {b.discrepancy&&<div style={{padding:'8px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠</strong> {b.discrepancy}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,display:'flex',gap:10}}>
        <button disabled={discrepancyCount>0} style={{flex:1,padding:14,borderRadius:12,border:'none',background:discrepancyCount>0?'#e2e8f0':G,color:discrepancyCount>0?'#94a3b8':'#fff',fontSize:14,fontWeight:700,cursor:discrepancyCount>0?'not-allowed':'pointer'}}>
          {discrepancyCount>0?`Resolve ${discrepancyCount} Discrepancies First`:`Push ${readyCount} Records to Payroll`}
        </button>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Breakdown',key:'view'},{icon:'⚠',label:'Resolve Discrepancy',key:'resolve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Payroll Attendance Batch" columns={['Employee','Department','Payable Days','LOP Days','OT Hours','OT Amount NPR','SSF Contribution NPR','Ready']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

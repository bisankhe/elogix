// FILE: LeaveAdjustmentPage.jsx - Leave Adjustment (Leave Operations)
// Secure HR-only override tool: retroactive corrections, bonus PTO grants,
// LWP conversions, mandatory documentation + immutable audit log.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A = '#334155'

const ADJUSTMENTS = [
  { id:'la1', employee:'Sunita Rai', leave_type:'Home/Annual Leave', adjustment_type:'Bonus Grant',
    days_delta:2, reason:'Recognition award - exceptional performance Q2', document_url:'award_letter.pdf',
    adjusted_by:'Priya Adhikari (HR Manager)', adjusted_at:'2025-06-20 11:00 AM', balance_before:16.5, balance_after:18.5,
    impact_links:['Leave Balance','Performance Review'] },
  { id:'la2', employee:'Bikash Rai', leave_type:'Home/Annual Leave', adjustment_type:'Retroactive Correction',
    days_delta:-1, reason:'Duplicate accrual entry from system migration, correcting overstated balance', document_url:'migration_audit.xlsx',
    adjusted_by:'System Admin', adjusted_at:'2025-06-18 09:30 AM', balance_before:13, balance_after:12,
    impact_links:[] },
  { id:'la3', employee:'Anjali Sharma', leave_type:'Unpaid Leave', adjustment_type:'Paid to LWP Conversion',
    days_delta:3, reason:'Exceeded sick leave balance - converted excess to Leave Without Pay per policy', document_url:'medical_cert.pdf',
    adjusted_by:'Priya Adhikari (HR Manager)', adjusted_at:'2025-06-15 03:00 PM', balance_before:0, balance_after:0,
    impact_links:['Payroll Attendance Generation','Full & Final Settlement'] },
]

const TYPE_CFG = {'Bonus Grant':{c:'#10b981',icon:'🎁'},'Retroactive Correction':{c:'#f59e0b',icon:'🔧'},'Paid to LWP Conversion':{c:'#ef4444',icon:'📉'}}

export default function LeaveAdjustmentPage() {
  const [adjustments, setAdjustments] = useState(ADJUSTMENTS)
  const [search, setSearch] = useState('')
  const [showAdjust, setShowAdjust] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = adjustments.filter(a=>!search||a.employee.toLowerCase().includes(search.toLowerCase()))
  const totalPositive = adjustments.filter(a=>a.days_delta>0).reduce((s,a)=>s+a.days_delta,0)
  const totalNegative = adjustments.filter(a=>a.days_delta<0).reduce((s,a)=>s+Math.abs(a.days_delta),0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔐" title="Leave Adjustment"
        breadcrumb="Workforce Operations > Leave Management > Leave Operations"
        gradient={G}
        stats={[
          {icon:'🔐',label:'Total Adjustments', value:adjustments.length},
          {icon:'➕',label:'Days Granted',        value:totalPositive.toFixed(1)},
          {icon:'➖',label:'Days Deducted',        value:totalNegative.toFixed(1)},
          {icon:'📋',label:'With Documentation',  value:adjustments.filter(a=>a.document_url).length},
        ]}
        onAdd={()=>setShowAdjust(true)} addLabel="New Adjustment"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔐</span>
        <div><strong>HR Admin Only - Secure Override:</strong> Every adjustment requires a reason and supporting documentation, and writes an immutable audit log entry (who, when, why, before/after balance). Retroactive changes to paid leave automatically flag downstream payroll for re-validation.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(a=>{
          const tc = TYPE_CFG[a.adjustment_type]
          return (
            <div key={a.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.employee,...a}})}}
              style={{background:'#fff',border:`1.5px solid ${tc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${tc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:42,height:42,borderRadius:10,background:`${tc.c}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{tc.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{a.employee}</span>
                    <span style={{background:`${tc.c}15`,color:tc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{a.adjustment_type}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{a.leave_type}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:a.days_delta>0?'#10b981':'#ef4444'}}>{a.days_delta>0?'+':''}{a.days_delta}d</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>{a.balance_before}d {'>'} {a.balance_after}d</div>
                </div>
              </div>
              <div style={{padding:'10px 20px',fontSize:10,color:'#374151',borderBottom:'1px solid #f8fafc'}}>{a.reason}</div>
              <div style={{padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:9,color:'#94a3b8'}}>
                <span>📎 {a.document_url}</span>
                <span>By {a.adjusted_by} . {a.adjusted_at}</span>
              </div>
            </div>
          )
        })}
      </div>

      {showAdjust&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdjust(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>New Leave Adjustment</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Employee" value="" onChange={()=>{}} accent={A} required/>
                <Field label="Leave Type" type="select" value="" onChange={()=>{}} accent={A} options={['Home/Annual Leave','Sick Leave','Unpaid Leave']}/>
                <Field label="Adjustment Type" type="select" value="" onChange={()=>{}} accent={A} options={['Bonus Grant','Retroactive Correction','Paid to LWP Conversion','Carry-Over Adjustment']}/>
                <Field label="Days (+/-)" type="number" value="" onChange={()=>{}} accent={A} required/>
              </div>
              <Field label="Reason (required)" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <div style={{margin:'10px 0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>Supporting Documentation (required)</div>
                <div style={{border:'2px dashed #cbd5e1',borderRadius:12,padding:'16px',textAlign:'center',background:'#f8fafc',cursor:'pointer'}}>
                  <div style={{fontSize:22,marginBottom:4}}>📎</div>
                  <div style={{fontSize:10,color:'#64748b'}}>Click or drag to upload</div>
                </div>
              </div>
              <AIImpact color={A} lines={['This action writes an immutable audit log entry - visible to compliance/audit at all times.','Retroactive paid-leave changes auto-flag the linked payroll batch for re-validation.','Employee receives an automatic notification with the reason and new balance.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowAdjust(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Apply Adjustment</button>
                <button onClick={()=>setShowAdjust(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Audit Detail',key:'view'},{icon:'📎',label:'View Document',key:'doc'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Leave Adjustments" columns={['Employee','Leave Type','Adjustment Type','Days Delta','Reason','Adjusted By','Date']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

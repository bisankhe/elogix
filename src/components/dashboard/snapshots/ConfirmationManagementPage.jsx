// FILE: ConfirmationManagementPage.jsx - Confirmation Management (Employee Movement)
// Note: distinct from Probation Module's day-90 decision - this is the org-wide
// "Pending Confirmations" command-center view across all active probations

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const CONFIRMATIONS = [
  { id:'cm1', employee:'Gita Maharjan', position:'Cloud Architect', join_date:'2025-06-16', probation_end:'2025-12-16',
    days_remaining:178, checklist:{performance_feedback:true,goals_achieved:true,manager_recommendation:true,confirmation_letter:false},
    manager:'Rajesh Sharma', risk_level:'low', impact_links:['Employee Timeline','Promotion & History'] },
  { id:'cm2', employee:'Hari Thapa', position:'DevOps Engineer', join_date:'2025-05-20', probation_end:'2025-11-20',
    days_remaining:152, checklist:{performance_feedback:true,goals_achieved:false,manager_recommendation:false,confirmation_letter:false},
    manager:'Bikash Shrestha', risk_level:'medium', impact_links:['60 Days Review'] },
  { id:'cm3', employee:'Sandeep Tamang', position:'Accountant', join_date:'2025-01-15', probation_end:'2025-07-15',
    days_remaining:24, checklist:{performance_feedback:true,goals_achieved:true,manager_recommendation:true,confirmation_letter:true},
    manager:'Sanjay Karki', risk_level:'urgent', impact_links:['Confirmation or Termination'] },
]

const RISK_CFG = {
  urgent:{c:'#ef4444',bg:'#fef2f2',label:'Decision Needed Now'},
  medium:{c:'#f59e0b',bg:'#fffbeb',label:'Action Needed Soon'},
  low:{c:'#10b981',bg:'#f0fdf4',label:'On Track'},
}
const CHECKLIST_LABELS = {performance_feedback:'Performance Feedback Collected',goals_achieved:'Goals Achieved',manager_recommendation:'Manager Recommendation',confirmation_letter:'Confirmation Letter Issued'}

export default function ConfirmationManagementPage() {
  const [confirmations] = useState(CONFIRMATIONS)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [search, setSearch] = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = confirmations.filter(c=>!search||c.employee.toLowerCase().includes(search.toLowerCase()))
  const urgentCount = confirmations.filter(c=>c.risk_level==='urgent').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Confirmation Management"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Movement"
        gradient={G}
        stats={[
          {icon:'📋',label:'Active Probations', value:confirmations.length},
          {icon:'🚨',label:'Urgent (≤30 days)',  value:urgentCount},
          {icon:'⏰',label:'Legal Cap',          value:'6 months'},
          {icon:'⚠',label:'Auto-Confirm Risk',  value:urgentCount},
        ]}
        onAdd={()=>notify('📋 Confirmation management record created')} addLabel="+ New Confirmation" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#991b1b',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074 - Implied Confirmation Risk:</strong> If no notice of confirmation or extension is given before the 6-month deadline, the worker is automatically considered confirmed by operation of law. This command center surfaces all active probations org-wide so no deadline is missed.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(c=>{
          const rc = RISK_CFG[c.risk_level]
          const doneCount = Object.values(c.checklist).filter(Boolean).length
          return (
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.employee,...c}})}}
              style={{background:'#fff',border:`1.5px solid ${rc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${rc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{c.employee}</span>
                    <span style={{background:rc.bg,color:rc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{rc.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{c.position} . Manager: {c.manager}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Joined {c.join_date} . Probation ends {c.probation_end}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:22,fontWeight:900,color:rc.c}}>{c.days_remaining}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>DAYS LEFT</div>
                </div>
              </div>

              <div style={{padding:'12px 20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:10}}>
                  <span style={{color:'#64748b'}}>Confirmation Checklist</span>
                  <span style={{fontWeight:700,color:rc.c}}>{doneCount}/4</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {Object.entries(c.checklist).map(([k,v])=>(
                    <div key={k} style={{textAlign:'center',background:v?'#f0fdf4':'#f8fafc',borderRadius:8,padding:'8px 4px',border:`1px solid ${v?'#bbf7d0':'#e2e8f0'}`}}>
                      <div style={{fontSize:14,color:v?'#10b981':'#cbd5e1'}}>{v?'✓':'○'}</div>
                      <div style={{fontSize:8,color:v?'#065f46':'#94a3b8',fontWeight:600,lineHeight:1.2,marginTop:2}}>{CHECKLIST_LABELS[k]}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{padding:'10px 20px',display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid #f8fafc'}}>
                <button style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>View Full Record</button>
                {c.risk_level==='urgent'&&<button style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Go to Decision</button>}
              </div>
            </div>
          )
        })}
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Record',key:'view'},{icon:'➡',label:'Go to Decision',key:'decision'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Confirmation Management" columns={['Employee','Position','Manager','Join Date','Probation End','Days Remaining','Checklist Complete','Risk Level']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

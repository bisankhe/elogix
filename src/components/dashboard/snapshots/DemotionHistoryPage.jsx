// FILE: DemotionHistoryPage.jsx - Demotion & History (Employee Movement)
// Strictly restricted: legal justification required, no unilateral salary cut without consent

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const DEMOTIONS = [
  { id:'d1', employee:'Dipak Rai', from_title:'Team Lead', to_title:'Senior Developer', dept:'Information Technology',
    effective_date:'2025-04-01', old_salary:110000, new_salary:110000, salary_changed:false,
    legal_basis:'restructuring', employee_consent:true, consent_date:'2025-03-25',
    pip_history:[],
    approved_by:'Rajesh Sharma (CTO)', hr_legal_review:true, status:'completed',
    impact_links:['Employee Timeline','Employment History'] },
  { id:'d2', employee:'Sunil Magar', from_title:'Branch Manager', to_title:'Senior Officer', dept:'Operations',
    effective_date:'2025-08-01', old_salary:95000, new_salary:95000, salary_changed:false,
    legal_basis:'disciplinary_alternative', employee_consent:false, consent_date:null,
    pip_history:[{date:'2025-02-01',outcome:'not_met'},{date:'2025-05-01',outcome:'not_met'}],
    approved_by:'Pending - HR Legal Review', hr_legal_review:false, status:'pending_legal_review',
    impact_links:['Disciplinary Records','Employee Timeline'] },
]

const STATUS_CFG = {completed:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Completed'},pending_legal_review:{c:'#f59e0b',bg:'#fffbeb',icon:'⚖',label:'Pending Legal Review'}}
const LEGAL_BASIS_LABELS = {restructuring:'Organizational Restructuring',disciplinary_alternative:'Alternative to Termination',voluntary:'Employee-Requested'}

export default function DemotionHistoryPage() {
  const [demotions, setDemotions] = useState(DEMOTIONS)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [selected, setSelected] = useState(null)

  const filtered = demotions.filter(d=>!search||d.employee.toLowerCase().includes(search.toLowerCase()))
  const salaryReducedCount = demotions.filter(d=>d.salary_changed).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📉" title="Demotion & History"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Movement"
        gradient={G}
        stats={[
          {icon:'📉',label:'Total Records',     value:demotions.length},
          {icon:'⚖',label:'Legal Review Done', value:demotions.filter(d=>d.hr_legal_review).length},
          {icon:'✅',label:'With Consent',       value:demotions.filter(d=>d.employee_consent).length},
          {icon:'🚫',label:'Salary Reduced',     value:salaryReducedCount},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Record Demotion"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'2px solid #fed7aa',borderRadius:12,padding:'12px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:20}}>🚫</span>
        <div>
          <strong>Nepal Labour Act 2074 - Critical Restriction:</strong> Demotion is generally PROHIBITED as a unilateral employer action unless it is (a) an agreed alternative to layoff/retrenchment, or (b) a result of specific disciplinary due process. If reassigned due to restructuring, <strong>remuneration cannot be reduced without mutual consent</strong>. Every record below requires HR Legal Review before finalization.
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(d=>{
          const sc = STATUS_CFG[d.status]
          return (
            <div key={d.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.employee,...d}})}}
              style={{background:'#fff',border:`1.5px solid ${d.status==='pending_legal_review'?'#fed7aa':sc.c+'33'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{d.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{LEGAL_BASIS_LABELS[d.legal_basis]}</span>
                  </div>
                  <div style={{fontSize:12,color:'#334155',fontWeight:600}}>{d.from_title} {'>'} {d.to_title}</div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{d.dept} . Effective {d.effective_date}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:14,fontWeight:900,color:d.salary_changed?'#ef4444':'#10b981'}}>{d.salary_changed?'Reduced':'Unchanged'}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>SALARY STATUS</div>
                </div>
              </div>

              <div style={{padding:'10px 20px',display:'flex',gap:16,flexWrap:'wrap',borderBottom:'1px solid #f8fafc'}}>
                <span style={{fontSize:10}}><span style={{color:d.employee_consent?'#10b981':'#ef4444',fontWeight:700}}>{d.employee_consent?'✓ Consent Obtained':'✗ No Consent on File'}</span>{d.consent_date&&` (${d.consent_date})`}</span>
                <span style={{fontSize:10}}><span style={{color:d.hr_legal_review?'#10b981':'#f59e0b',fontWeight:700}}>{d.hr_legal_review?'✓ Legal Review Complete':'⏳ Legal Review Pending'}</span></span>
                {d.pip_history.length>0&&<span style={{fontSize:10,color:'#64748b'}}>📋 {d.pip_history.length} prior PIP(s)</span>}
              </div>

              <div style={{padding:'10px 20px',fontSize:10,color:'#64748b',fontStyle:'italic',borderBottom:'1px solid #f8fafc'}}>
                <strong>Justification:</strong> {d.rationale}
              </div>

              <div style={{padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:10,color:'#64748b'}}>Approved by: <strong>{d.approved_by}</strong></span>
                <button onClick={()=>setSelected(d)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#fff7ed',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>Full Details</button>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'92vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Record Demotion</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 14px',fontSize:11,color:'#991b1b',marginBottom:16}}>
                ⚠ This action requires legal justification. Salary cannot be reduced without documented employee consent.
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Employee</label><select value={form.employee||''} onChange={e=>setForm(p=>({...p,employee:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Dipak Rai','Sunil Magar'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>New Title</label><input type="text" value={form.new_title||''} onChange={e=>setForm(p=>({...p,new_title:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Legal Basis</label><select value={form.legal_basis||''} onChange={e=>setForm(p=>({...p,legal_basis:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['restructuring','disciplinary_alternative','voluntary'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Effective Date</label><input type="date" value={form.effective_date||''} onChange={e=>setForm(p=>({...p,effective_date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
              </div>
              <label style={{display:'flex',gap:8,alignItems:'center',margin:'10px 0',fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="checkbox" style={{accentColor:A}}/> Employee has provided written consent to any salary change
              </label>
              <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Detailed Justification</label><textarea value={form.detailed_justification||''} onChange={e=>setForm(p=>({...p,detailed_justification:e.target.value}))} rows={3} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/></div>
              <AIImpact color={A} lines={['Routes to mandatory HR Legal Review before finalization.','Blocks salary reduction unless consent documented.','Permanently logged with full audit trail for tribunal defense if needed.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit for Legal Review</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'⚖',label:'Legal Review',key:'legal'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Demotion History" columns={['Employee','From Title','To Title','Legal Basis','Consent','Salary Changed','Legal Review','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

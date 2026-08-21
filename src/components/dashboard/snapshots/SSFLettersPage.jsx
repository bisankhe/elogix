// FILE: SSFLettersPage.jsx - Social Security Fund (SSF) Letters (Workforce Operations > Letters)
// Employer registration, employee enrollment (within 3mo), updates, withdrawal, dispute letters

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const LETTER_TYPES = [
  {key:'employer_registration',label:'Employer Registration',icon:'🏢',color:'#15803d'},
  {key:'employee_enrollment',label:'Employee Enrollment',icon:'👤',color:'#3b82f6'},
  {key:'data_update',label:'Data Update / Correction',icon:'✏',color:'#f59e0b'},
  {key:'separation_withdrawal',label:'Separation & Withdrawal',icon:'📤',color:'#ef4444'},
  {key:'dispute_refund',label:'Dispute / Refund',icon:'⚖',color:'#7c3aed'},
]

const LETTERS = [
  { id:'l1', type:'employee_enrollment', subject:'New Employee SSF Enrollment - Gita Maharjan',
    employee:'Gita Maharjan', reference_no:'SSF-ENR-2025-0412', date_sent:'2025-06-17',
    deadline:'2025-09-16', days_remaining:87, status:'submitted', ssf_no:'SSF-2025-998812',
    response_received:false, impact_links:['Employee Enrollment','Payroll Setup'] },
  { id:'l2', type:'separation_withdrawal', subject:'Final Contribution Clearance - Dipendra Yadav',
    employee:'Dipendra Yadav', reference_no:'SSF-SEP-2025-0089', date_sent:'2025-07-11',
    deadline:null, days_remaining:null, status:'acknowledged', ssf_no:'SSF-2024-887701',
    response_received:true, impact_links:['Full & Final Settlement','Exit Clearance'] },
  { id:'l3', type:'data_update', subject:'Salary Revision Update - Bikash Shrestha',
    employee:'Bikash Shrestha', reference_no:'SSF-UPD-2025-0156', date_sent:'2025-06-05',
    deadline:null, days_remaining:null, status:'draft', ssf_no:'SSF-2022-445102',
    response_received:false, impact_links:['Promotion & History'] },
]

const STATUS_CFG = {
  draft:{c:'#94a3b8',bg:'#f8fafc',icon:'📝',label:'Draft'},
  submitted:{c:'#3b82f6',bg:'#eff6ff',icon:'📤',label:'Submitted'},
  acknowledged:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Acknowledged'},
  rejected:{c:'#ef4444',bg:'#fef2f2',icon:'🚫',label:'Rejected - Action Needed'},

export default function SSFLettersPage() {
  const [letters, setLetters] = useState(LETTERS)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = letters.filter(l=>{
    if (filterType!=='all'&&l.type!==filterType) return false
    if (search&&!l.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const urgentEnrollments = letters.filter(l=>l.type==='employee_enrollment'&&l.days_remaining&&l.days_remaining<=14)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🛡" title="Social Security Fund (SSF) Letters"
        breadcrumb="Workforce Operations > Letters"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total Letters', value:letters.length},
          {icon:'⏳',label:'Pending Response',value:letters.filter(l=>l.status==='submitted').length},
          {icon:'✅',label:'Acknowledged',    value:letters.filter(l=>l.status==='acknowledged').length},
          {icon:'⚠',label:'Enrollment Due Soon',value:urgentEnrollments.length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Draft New Letter"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Contribution Based Social Security Act, 2074:</strong> Employer registration is mandatory for all formal-sector employers. New hires must be enrolled in SSF within 3 months of hiring. Letters required for enrollment, data updates, separation clearance, and dispute resolution.</div>
      </div>

      {urgentEnrollments.length>0&&(
        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#92400e'}}>
          <strong>⏰ 3-Month Enrollment Deadline Alert:</strong> {urgentEnrollments.map(l=>`${l.employee} (${l.days_remaining}d left)`).join(', ')}
        </div>
      )}

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Letter Types</option>
          {LETTER_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.map(l=>{
          const sc = STATUS_CFG[l.status]
          const tc = LETTER_TYPES.find(t=>t.key===l.type)
          return (
            <div key={l.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.subject,...l}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)',borderLeft:`5px solid ${tc?.color}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',flexWrap:'wrap'}}>
                <div style={{width:42,height:42,borderRadius:12,background:`${tc?.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{tc?.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{l.subject}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>Ref: {l.reference_no} . SSF No: {l.ssf_no} . Sent {l.date_sent}</div>
                  {l.deadline&&<div style={{fontSize:9,color:l.days_remaining<=14?'#ef4444':'#94a3b8',marginTop:2,fontWeight:l.days_remaining<=14?700:400}}>⏰ Deadline: {l.deadline} ({l.days_remaining} days)</div>}
                </div>
                <button style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#f0fdf4',color:A,fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>View / Download</button>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Draft SSF Letter (AI-Assisted)</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Letter Type" type="select" value="" onChange={()=>{}} accent={A} options={LETTER_TYPES.map(t=>t.label)}/>
                <Field label="Employee" type="select" value="" onChange={()=>{}} accent={A} options={['Sunita Rai','Hari Thapa']}/>
                <Field label="SSF Number (if existing)" value="" onChange={()=>{}} accent={A}/>
                <Field label="Effective Date" type="date" value="" onChange={()=>{}} accent={A}/>
              </div>
              <Field label="Additional Notes" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['AI auto-drafts using official SSF letter templates and exact legal language.','Pulls live data from employee profile, payroll, and contract.','Tracks 3-month enrollment deadline automatically.','Auto-generates reference number on submission.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Generate Letter</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Letter',key:'view'},{icon:'📥',label:'Download PDF',key:'download'},
        {icon:'📤',label:'Mark as Submitted',key:'submit'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="SSF Letters" columns={['Subject','Type','Employee','SSF No','Reference No','Date Sent','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

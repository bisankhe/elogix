// FILE: LabourDepartmentLettersPage.jsx - Labour Department Letters (Workforce Operations > Letters)
// Foreign worker permits, mass retrenchment 30-day notice, outsourcing reports, audits

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const LETTER_TYPES = [
  {key:'foreign_work_permit',label:'Foreign Worker Permit',icon:'🌍',color:'#3b82f6'},
  {key:'mass_retrenchment',label:'Mass Retrenchment Notice',icon:'📉',color:'#ef4444'},
  {key:'outsourcing_report',label:'Outsourcing Compliance Report',icon:'🤝',color:'#f59e0b'},
  {key:'dispute_resolution',label:'Dispute Resolution Request',icon:'⚖',color:'#7c3aed'},
  {key:'annual_audit',label:'Annual Labour Audit Filing',icon:'📋',color:'#15803d'},
]

const LETTERS = [
  { id:'l1', type:'foreign_work_permit', employee:'James Mitchell (Expat)', subject:'Work Permit Renewal - Senior Consultant',
    submitted_date:'2025-06-15', status:'submitted', reference_no:'DOL-2025-WP-4471', deadline:null,
    notes:'Local skill-gap advertisement published per Section 22 requirement prior to filing.',
    impact_links:['Employee Profile','Foreign Hire Compliance'] },
  { id:'l2', type:'mass_retrenchment', employee:'N/A (Department-wide: 8 staff)', subject:'30-Day Advance Retrenchment Notice - Customer Service Restructuring',
    submitted_date:'2025-06-10', status:'submitted', reference_no:'DOL-2025-RT-1182', deadline:'2025-07-10',
    notes:'Compensation calculated at 1 month salary per year of service, proportionate for <1yr.',
    impact_links:['Confirmation or Termination','Full & Final Settlement'] },
  { id:'l3', type:'outsourcing_report', employee:'N/A (Vendor: SecureGuard Pvt Ltd)', subject:'Vendor Non-Payment Notice - Security Staff Wages',
    submitted_date:null, status:'drafting', reference_no:null, deadline:'2025-06-30',
    notes:'Vendor failed to disburse Q2 wages to 6 outsourced security guards - main employer co-liability notice required.',
    impact_links:['Vendor Profile','Vendor Billing'] },
  { id:'l4', type:'annual_audit', employee:'N/A (Company-wide)', subject:'FY 2024-25 Annual Labour Compliance Report',
    submitted_date:null, status:'pending', reference_no:null, deadline:'2025-08-15',
    notes:'Required: workplace safety compliance, headcount report, contract register (10+ employee threshold met).',
    impact_links:[] },
]

const STATUS_CFG = {
  submitted:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Submitted'},
  drafting:{c:'#f59e0b',bg:'#fffbeb',icon:'✏',label:'Drafting'},
  pending:{c:'#94a3b8',bg:'#f8fafc',icon:'⏳',label:'Pending'},
}

export default function LabourDepartmentLettersPage() {
  const [letters, setLetters] = useState(LETTERS)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = letters.filter(l=>!search||l.subject.toLowerCase().includes(search.toLowerCase()))
  const upcomingDeadlines = letters.filter(l=>l.deadline && l.status!=='submitted')

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏛" title="Labour Department Letters"
        breadcrumb="Workforce Operations > Letters"
        gradient={G}
        stats={[
          {icon:'📨',label:'Total Letters',    value:letters.length},
          {icon:'✅',label:'Submitted',         value:letters.filter(l=>l.status==='submitted').length},
          {icon:'⏰',label:'Upcoming Deadlines',value:upcomingDeadlines.length},
          {icon:'🏛',label:'Authority',         value:'DoLOS'},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Draft New Letter (AI)"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Foreign worker permits require local-skill advertisement first (Section 22). Mass retrenchment needs 30-day advance written notice to local Labour Office. Companies with 10+ employees must file annual labour audits. Vendor non-payment to outsourced staff must be reported - main employer retains co-liability.</div>
      </div>

      {upcomingDeadlines.length>0&&(
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:'#991b1b',marginBottom:6}}>⏰ Upcoming Deadlines</div>
          {upcomingDeadlines.map((l,i)=><div key={i} style={{fontSize:10,color:'#991b1b'}}>{l.subject} - due {l.deadline}</div>)}
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search letters..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(l=>{
          const sc = STATUS_CFG[l.status]
          const lt = LETTER_TYPES.find(t=>t.key===l.type)
          return (
            <div key={l.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.subject,...l}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${lt?.color}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:42,height:42,borderRadius:12,background:`${lt?.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{lt?.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{l.subject}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{l.employee} . {lt?.label}</div>
                  {l.reference_no&&<div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>Ref: {l.reference_no} . Submitted {l.submitted_date}</div>}
                </div>
              </div>
              <div style={{padding:'10px 20px',fontSize:10,color:'#64748b',fontStyle:'italic'}}>{l.notes}</div>
              <div style={{padding:'10px 20px',display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid #f8fafc'}}>
                <button style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#fff7ed',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>View Letter</button>
                {l.status!=='submitted'&&<button style={{padding:'6px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>{l.status==='drafting'?'Finalize & Submit':'Draft Now (AI)'}</button>}
              </div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Draft Labour Department Letter (AI)</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:16}}>
                {LETTER_TYPES.map(t=>(
                  <div key={t.key} style={{padding:'12px',borderRadius:10,border:`1.5px solid ${t.color}33`,cursor:'pointer',display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{fontSize:18}}>{t.icon}</span><span style={{fontSize:11,fontWeight:700,color:t.color}}>{t.label}</span>
                  </div>
                ))}
              </div>
              <Field label="Subject / Reference Context" value="" onChange={()=>{}} accent={A}/>
              <Field label="Relevant Employee(s) / Department" value="" onChange={()=>{}} accent={A}/>
              <Field label="Additional Context" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input - AI drafts in compliant legal language"/>
              <AIImpact color={A} lines={['AI drafts in formal Nepali/English legal language per DoLOS standards.','Auto-validates against statutory deadlines (e.g., 30-day retrenchment notice).','Tracks submission status and reference number once filed.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Generate Draft Letter</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Letter',key:'view'},{icon:'📤',label:'Mark Submitted',key:'submit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📥',label:'Download PDF',key:'download'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Labour Department Letters" columns={['Subject','Type','Employee/Dept','Submitted Date','Reference No','Deadline','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

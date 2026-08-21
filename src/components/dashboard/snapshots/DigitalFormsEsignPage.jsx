// FILE: DigitalFormsEsignPage.jsx — Digital Forms & E-sign (Preboarding)
// Step-by-step wizard, embedded e-signature, auto IT/Facilities trigger on completion
// Nepal: Electronic Transactions Act 2063 — digital signature legally equal to physical; Labour Act 2074 S.10 written contract mandatory

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#3b0764 0%,#7e22ce 60%,#c084fc 100%)'
const A = '#7e22ce'

const FORM_TEMPLATES = [
  {key:'employment_contract', label:'Employment Contract', mandatory:true, icon:'📄'},
  {key:'nda', label:'Non-Disclosure Agreement (NDA)', mandatory:true, icon:'🔒'},
  {key:'handbook_ack', label:'Employee Handbook Acknowledgment', mandatory:true, icon:'📘'},
  {key:'tax_declaration', label:'Tax Declaration Form', mandatory:true, icon:'🧾'},
  {key:'direct_deposit', label:'Direct Deposit / Bank Authorization', mandatory:true, icon:'🏦'},
  {key:'code_of_conduct', label:'Code of Conduct Agreement', mandatory:true, icon:'⚖'},
  {key:'benefits_enrollment', label:'Benefits Enrollment Form', mandatory:false, icon:'🏥'},
  {key:'emergency_contact', label:'Emergency Contact Form', mandatory:true, icon:'🆘'},
]

const EMPLOYEES = [
  { id:'df1', employee_id:'EMP-2081-0142', name:'Gita Maharjan', position:'Cloud Architect',
    forms:{
      employment_contract:{status:'signed', signed_date:'2025-06-13 14:22', method:'DocuSign'},
      nda:{status:'signed', signed_date:'2025-06-13 14:25', method:'DocuSign'},
      handbook_ack:{status:'signed', signed_date:'2025-06-13 14:28', method:'DocuSign'},
      tax_declaration:{status:'signed', signed_date:'2025-06-13 14:31', method:'DocuSign'},
      direct_deposit:{status:'signed', signed_date:'2025-06-13 14:33', method:'DocuSign'},
      code_of_conduct:{status:'signed', signed_date:'2025-06-13 14:35', method:'DocuSign'},
      benefits_enrollment:{status:'pending', signed_date:null, method:null},
      emergency_contact:{status:'signed', signed_date:'2025-06-13 14:38', method:'DocuSign'},
    },
    completion_pct:88, all_mandatory_signed:true,
    it_triggered:true, facilities_triggered:true,
    status:'mandatory_complete' },
  { id:'df2', employee_id:'EMP-2081-0141', name:'Sunita Rai', position:'Senior Software Developer',
    forms:{
      employment_contract:{status:'signed', signed_date:'2025-06-15 10:05', method:'DocuSign'},
      nda:{status:'signed', signed_date:'2025-06-15 10:08', method:'DocuSign'},
      handbook_ack:{status:'pending', signed_date:null, method:null},
      tax_declaration:{status:'pending', signed_date:null, method:null},
      direct_deposit:{status:'not_sent', signed_date:null, method:null},
      code_of_conduct:{status:'pending', signed_date:null, method:null},
      benefits_enrollment:{status:'not_sent', signed_date:null, method:null},
      emergency_contact:{status:'pending', signed_date:null, method:null},
    },
    completion_pct:25, all_mandatory_signed:false,
    it_triggered:false, facilities_triggered:false,
    status:'in_progress' },
  { id:'df3', employee_id:'EMP-2081-0143', name:'Hari Adhikari', position:'HR Business Partner',
    forms: Object.fromEntries(FORM_TEMPLATES.map(f=>[f.key,{status:'not_sent',signed_date:null,method:null}])),
    completion_pct:0, all_mandatory_signed:false,
    it_triggered:false, facilities_triggered:false,
    status:'blocked' },
]

const FORM_STATUS_CFG = {signed:'#10b981', pending:'#f59e0b', not_sent:'#94a3b8'}
const OVERALL_CFG = {
  mandatory_complete:{c:'#10b981',bg:'#f0fdf4',label:'Mandatory Complete'},
  in_progress:        {c:'#f59e0b',bg:'#fffbeb',label:'In Progress'},
  blocked:             {c:'#ef4444',bg:'#fef2f2',label:'Blocked'},

const CTX = [
  {icon:'👁',label:'View All Forms',        key:'view'},
  {icon:'📧',label:'Resend for Signature',  key:'resend'},
  {icon:'🔄',label:'Generate Form Package', key:'generate'},
  {icon:'🔗',label:'Impact Analysis',       key:'impact'},
  {icon:'📤',label:'Export',                key:'export'},
]

export default function DigitalFormsEsignPage() {
  const [employees, setEmployees] = useState(EMPLOYEES)
  const [search, setSearch]       = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)
  const [signing, setSigning]     = useState(null)

  const filtered = employees.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase()))
  const fullyDone = employees.filter(e=>e.all_mandatory_signed).length
  const itTriggered = employees.filter(e=>e.it_triggered).length
  const avgCompletion = Math.round(employees.reduce((s,e)=>s+e.completion_pct,0)/employees.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="✍" title="Digital Forms & E-sign"
        breadcrumb="Employee Lifecycle > Onboarding > Preboarding"
        gradient={G}
        stats={[
          {icon:'✍',label:'In Pipeline',       value:employees.length},
          {icon:'✅',label:'Mandatory Complete', value:fullyDone},
          {icon:'💻',label:'IT Auto-Triggered',  value:itTriggered},
          {icon:'📊',label:'Avg Completion',     value:avgCompletion+'%'},
        ]}
        onAdd={()=>notify('📧 E-sign reminders sent via Email + WhatsApp + Viber')} addLabel="📧 Send Reminder" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#fdf4ff,#f5f3ff)',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#6b21a8'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Compliance:</strong> Electronic Transactions Act 2063 — e-signatures hold equal legal validity to physical signatures. Labour Act 2074 Section 10 mandates written employment contract before work begins. Signing employment contract auto-triggers IT & Facilities provisioning workflows.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(emp=>{
          const oc = OVERALL_CFG[emp.status]||OVERALL_CFG.in_progress
          return (
            <div key={emp.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:emp.name,impact_links:['Joining Checklist','IT Provisioning','Facilities Setup']}})}}
              style={{background:'#fff',border:`1.5px solid ${oc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${oc.c}`}}>

              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${oc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>✍</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:3,alignItems:'center'}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{emp.name}</span>
                    <span style={{background:oc.bg,color:oc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{oc.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{emp.employee_id} · {emp.position}</div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <span style={{fontSize:9,fontWeight:700,padding:'4px 10px',borderRadius:20,background:emp.it_triggered?'#f0fdf4':'#f8fafc',color:emp.it_triggered?'#15803d':'#94a3b8'}}>{emp.it_triggered?'✓':'-'} IT</span>
                  <span style={{fontSize:9,fontWeight:700,padding:'4px 10px',borderRadius:20,background:emp.facilities_triggered?'#f0fdf4':'#f8fafc',color:emp.facilities_triggered?'#15803d':'#94a3b8'}}>{emp.facilities_triggered?'✓':'-'} Facilities</span>
                </div>
              </div>

              <div style={{height:6,background:'#f1f5f9'}}>
                <div style={{width:`${emp.completion_pct}%`,height:'100%',background:oc.c,transition:'width .6s ease'}}/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:8,padding:'14px 20px'}}>
                {FORM_TEMPLATES.map(form=>{
                  const f = emp.forms[form.key]
                  const fc = FORM_STATUS_CFG[f.status]
                  return (
                    <div key={form.key}
                      onClick={()=>f.status==='pending'&&setSigning({emp:emp.name,form:form.label})}
                      style={{background:'#f8fafc',border:`1px solid ${fc}33`,borderRadius:10,padding:'8px 10px',cursor:f.status==='pending'?'pointer':'default'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:3}}>
                        <span style={{fontSize:10,fontWeight:700,color:'#0f172a',display:'flex',gap:4,alignItems:'center'}}>{form.icon} {form.label}{form.mandatory&&<span style={{color:'#ef4444'}}> *</span>}</span>
                      </div>
                      <span style={{fontSize:9,fontWeight:700,padding:'1px 7px',borderRadius:20,background:`${fc}18`,color:fc,textTransform:'capitalize'}}>{f.status.replace('_',' ')}</span>
                      {f.signed_date&&<div style={{fontSize:8,color:'#94a3b8',marginTop:3}}>{f.signed_date}</div>}
                    </div>
                  )
                })}
              </div>

              <div style={{padding:'8px 20px',background:'#f8fafc',fontSize:10,color:'#64748b',fontStyle:'italic',borderTop:'1px solid #f1f5f9'}}>🤖 {emp.ai_note}</div>

              <div style={{padding:'8px 14px',display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>View Documents</button>
                <button style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Send Reminder</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* e-signature simulation modal */}
      {signing&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:6000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setSigning(null)}>
          <div style={{background:'#fff',borderRadius:20,width:480,padding:'24px'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:6}}>e-Signature: {signing.form}</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:16}}>For: {signing.emp}</div>
            <div style={{border:'2px dashed #c4b5fd',borderRadius:14,padding:'30px',textAlign:'center',background:'#fdf4ff',marginBottom:16}}>
              <div style={{fontSize:32,marginBottom:8}}>✍️</div>
              <div style={{fontSize:12,color:'#6b21a8',fontWeight:700}}>Sign here to legally execute this document</div>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>Valid per Electronic Transactions Act 2063</div>
            </div>
            <button onClick={()=>setSigning(null)} style={{width:'100%',padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Apply Signature</button>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Digital Forms & E-sign" columns={['Employee ID','Name','Employment Contract','NDA','Handbook','Tax Form','Direct Deposit','Code of Conduct','Completion %']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

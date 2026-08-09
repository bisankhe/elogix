// FILE: OtherGovEntitiesLettersPage.jsx - Other Government Entities (Workforce Operations > Letters)
// OCR, Nepal Rastra Bank, Department of Industry, municipal/ward offices, immigration

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#475569 60%,#cbd5e1 100%)'
const A = '#475569'

const ENTITY_TYPES = [
  {key:'ocr',label:'Office of Company Registrar',icon:'🏛',color:'#3b82f6'},
  {key:'nrb',label:'Nepal Rastra Bank',icon:'🏦',color:'#15803d'},
  {key:'doi',label:'Department of Industry',icon:'🏭',color:'#f59e0b'},
  {key:'municipal',label:'Municipal / Ward Office',icon:'🏘',color:'#7c3aed'},
  {key:'immigration',label:'Department of Immigration',icon:'🛂',color:'#ef4444'},
  {key:'other',label:'Other',icon:'📋',color:'#64748b'},
]

const LETTERS = [
  { id:'l1', entity_type:'ocr', subject:'Annual Transaction Return Submission FY 2024/25',
    reference_no:'OCR-RTN-2025-0034', date_sent:'2025-06-15', deadline:'2025-07-15', days_remaining:24,
    status:'submitted', response_received:false, purpose:'Statutory annual compliance filing',
    impact_links:['Company Profile'] },
  { id:'l2', entity_type:'immigration', subject:'Work Permit Renewal Request - Foreign Employee',
    reference_no:'DOI-WP-2025-0019', date_sent:'2025-06-10', deadline:'2025-08-10', days_remaining:50,
    status:'under_review', response_received:false, purpose:'Foreign national work permit extension (Section 22/23 LA2074)',
    impact_links:['Employee Profile'] },
  { id:'l3', entity_type:'nrb', subject:'Foreign Equity Inflow Approval Request',
    reference_no:'NRB-FDI-2025-0007', date_sent:'2025-05-20', deadline:null, days_remaining:null,
    status:'acknowledged', response_received:true, purpose:'Foreign investment capital inflow clearance',
    impact_links:[] },
  { id:'l4', entity_type:'municipal', subject:'Business Operating License Renewal - Ward 5',
    reference_no:'WARD5-BL-2025-0211', date_sent:'2025-06-01', deadline:'2025-07-01', days_remaining:10,
    status:'draft', response_received:false, purpose:'Annual local-level operating permit renewal',
    impact_links:[] },
]

const STATUS_CFG = {
  draft:{c:'#94a3b8',bg:'#f8fafc',icon:'📝',label:'Draft'},
  submitted:{c:'#3b82f6',bg:'#eff6ff',icon:'📤',label:'Submitted'},
  under_review:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Under Review'},
  acknowledged:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Acknowledged'},
}

export default function OtherGovEntitiesLettersPage() {
  const [letters, setLetters] = useState(LETTERS)
  const [search, setSearch] = useState('')
  const [filterEntity, setFilterEntity] = useState('all')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = letters.filter(l=>{
    if (filterEntity!=='all'&&l.entity_type!==filterEntity) return false
    if (search&&!l.subject.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const pendingCount = letters.filter(l=>!l.response_received).length
  const urgentCount = letters.filter(l=>l.days_remaining!==null&&l.days_remaining<=15).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏛" title="Other Government Entities"
        breadcrumb="Workforce Operations > Letters"
        gradient={G}
        stats={[
          {icon:'✉',label:'Total Letters',   value:letters.length},
          {icon:'⏳',label:'Awaiting Response',value:pendingCount},
          {icon:'🚨',label:'Urgent (≤15 days)',value:urgentCount},
          {icon:'🏛',label:'Entity Types',     value:ENTITY_TYPES.length},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Draft New Letter"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>📋</span>
        <div><strong>Companies Act 2063 Compliance:</strong> Covers OCR transaction returns, Nepal Rastra Bank FDI/repatriation approvals, Department of Industry licensing, municipal/ward operating permits, and immigration work-permit correspondence - all requiring formal, legally-binding documentation.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by subject..."/>
        <select value={filterEntity} onChange={e=>setFilterEntity(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Entities</option>
          {ENTITY_TYPES.map(e=><option key={e.key} value={e.key}>{e.label}</option>)}
        </select>
      </div>

      {/* Entity quick-filter chips */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {ENTITY_TYPES.map(e=>{
          const count = letters.filter(l=>l.entity_type===e.key).length
          return (
            <button key={e.key} onClick={()=>setFilterEntity(filterEntity===e.key?'all':e.key)}
              style={{padding:'8px 14px',borderRadius:20,border:`1.5px solid ${filterEntity===e.key?e.color:'#e2e8f0'}`,
                background:filterEntity===e.key?`${e.color}10`:'#fff',cursor:'pointer',display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:13}}>{e.icon}</span>
              <span style={{fontSize:10,fontWeight:700,color:filterEntity===e.key?e.color:'#64748b'}}>{e.label}</span>
              <span style={{fontSize:9,color:'#94a3b8'}}>({count})</span>
            </button>
          )
        })}
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.map(l=>{
          const sc = STATUS_CFG[l.status]
          const entity = ENTITY_TYPES.find(e=>e.key===l.entity_type)
          return (
            <div key={l.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.subject,...l}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
              <div style={{width:44,height:44,borderRadius:12,background:`${entity?.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{entity?.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                  <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{l.subject}</span>
                  <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'1px 7px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{entity?.label} . Ref: {l.reference_no} . Sent {l.date_sent}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{l.purpose}</div>
                {l.days_remaining!==null&&<div style={{fontSize:10,color:l.days_remaining<=15?'#ef4444':'#94a3b8',fontWeight:l.days_remaining<=15?700:400,marginTop:2}}>⏰ Deadline {l.deadline} ({l.days_remaining} days remaining)</div>}
              </div>
              <button style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#f8fafc',color:A,fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>View</button>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Draft Letter to Government Entity</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Entity Type" type="select" value="" onChange={()=>{}} accent={A} options={ENTITY_TYPES.map(e=>e.label)}/>
                <Field label="Purpose" type="select" value="" onChange={()=>{}} accent={A} options={['Licensing/Approval','Annual Compliance Filing','FDI/Repatriation','Operational Permit','Dispute Resolution','Other']}/>
                <Field label="Subject" value="" onChange={()=>{}} accent={A} required/>
                <Field label="Reference Document #" value="" onChange={()=>{}} accent={A}/>
              </div>
              <Field label="Letter Content / Notes" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported - AI will draft formal letterhead language"/>
              <AIImpact color={A} lines={['AI auto-drafts formal letter matching the entity\'s required legal language.','Auto-tracks response deadlines and flags overdue follow-ups.','Stores acknowledgment receipts in the audit trail document repository.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Generate Draft (AI)</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Letter',key:'view'},{icon:'📥',label:'Download PDF',key:'download'},
        {icon:'📧',label:'Mark Submitted',key:'submit'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Other Government Entity Letters" columns={['Entity Type','Subject','Reference No','Date Sent','Deadline','Status','Response Received']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

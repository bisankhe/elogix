// FILE: OtherGovernmentEntitiesLettersPage.jsx - Other Government Entities (Workforce Operations > Letters)
// OCR filings, NRB foreign investment, Dept of Industry licenses, municipal/ward permits

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#164e63 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const ENTITIES = [
  {key:'ocr',label:'Office of Company Registrar',icon:'🏢',color:'#3b82f6'},
  {key:'nrb',label:'Nepal Rastra Bank',icon:'🏦',color:'#15803d'},
  {key:'doi',label:'Department of Industry',icon:'🏭',color:'#f59e0b'},
  {key:'municipal',label:'Municipal / Ward Office',icon:'🏛',color:'#7c3aed'},
  {key:'immigration',label:'Department of Immigration',icon:'🛂',color:'#ef4444'},
]

const LETTERS = [
  { id:'o1', entity:'ocr', subject:'Annual Transaction Return Filing - FY 2024-25',
    submitted_date:'2025-06-05', status:'submitted', reference_no:'OCR-ATR-99201',
    notes:'Statutory annual filing per Companies Act 2063 - financial records + board resolutions attached.',
    impact_links:[] },
  { id:'o2', entity:'nrb', subject:'Foreign Equity Inflow Approval Request',
    submitted_date:'2025-06-18', status:'under_review', reference_no:'NRB-FDI-33810',
    notes:'USD 250,000 equity investment from parent company - requires NRB approval before fund repatriation eligibility.',
    impact_links:[] },
  { id:'o3', entity:'doi', subject:'Industrial License Renewal - IT Service Category',
    submitted_date:null, status:'drafting', reference_no:null,
    notes:'License expires 2025-08-01 - renewal application in preparation.',
    impact_links:[] },
  { id:'o4', entity:'immigration', subject:'Work Permit Sponsorship Letter - Expat Hire',
    submitted_date:'2025-06-12', status:'submitted', reference_no:'IMM-WP-77234',
    notes:'Supporting letter for visa category change, linked to DoLOS work permit approval.',
    impact_links:['Employee Profile'] },
  { id:'o5', entity:'municipal', subject:'Business Operation Permit Renewal - KTM HQ',
    submitted_date:null, status:'pending', reference_no:null,
    notes:'Annual ward-level operation permit renewal due 2025-07-01.',
    impact_links:[] },
]

const STATUS_CFG = {
  submitted:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Submitted'},
  under_review:{c:'#3b82f6',bg:'#eff6ff',icon:'🔍',label:'Under Review'},
  drafting:{c:'#f59e0b',bg:'#fffbeb',icon:'✏',label:'Drafting'},
  pending:{c:'#94a3b8',bg:'#f8fafc',icon:'⏳',label:'Pending'},
}

export default function OtherGovernmentEntitiesLettersPage() {
  const [letters, setLetters] = useState(LETTERS)
  const [search, setSearch] = useState('')
  const [filterEntity, setFilterEntity] = useState('all')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = letters.filter(l=>{
    if (filterEntity!=='all'&&l.entity!==filterEntity) return false
    if (search&&!l.subject.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🌐" title="Other Government Entities"
        breadcrumb="Workforce Operations > Letters"
        gradient={G}
        stats={[
          {icon:'📨',label:'Total Letters', value:letters.length},
          {icon:'✅',label:'Submitted',      value:letters.filter(l=>l.status==='submitted').length},
          {icon:'🏛',label:'Entities',       value:ENTITIES.length},
          {icon:'⏳',label:'Pending',        value:letters.filter(l=>l.status==='pending'||l.status==='drafting').length},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Draft New Letter (AI)"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#155e75',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Companies Act 2063:</strong> Formal correspondence with OCR (filings), NRB (foreign investment/repatriation), Department of Industry (licensing), municipal offices (operation permits), and Immigration (expat work visas) establishes legally binding records and ensures regulatory transparency.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search letters..."/>
        <select value={filterEntity} onChange={e=>setFilterEntity(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Entities</option>
          {ENTITIES.map(e=><option key={e.key} value={e.key}>{e.label}</option>)}
        </select>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {ENTITIES.map(e=>{
          const count = letters.filter(l=>l.entity===e.key).length
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

      <div style={{display:'grid',gap:14}}>
        {filtered.map(l=>{
          const sc = STATUS_CFG[l.status]
          const ent = ENTITIES.find(e=>e.key===l.entity)
          return (
            <div key={l.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.subject,...l}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${ent?.color}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:42,height:42,borderRadius:12,background:`${ent?.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{ent?.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{l.subject}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{ent?.label}</div>
                  {l.reference_no&&<div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>Ref: {l.reference_no} . Submitted {l.submitted_date}</div>}
                </div>
              </div>
              <div style={{padding:'10px 20px',fontSize:10,color:'#64748b',fontStyle:'italic'}}>{l.notes}</div>
              <div style={{padding:'10px 20px',display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid #f8fafc'}}>
                <button style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#ecfeff',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>View Letter</button>
                {l.status!=='submitted'&&<button style={{padding:'6px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>{l.status==='drafting'?'Finalize & Submit':'Draft Now (AI)'}</button>}
              </div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Draft Government Letter (AI)</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Government Entity" type="select" value="" onChange={()=>{}} accent={A} options={ENTITIES.map(e=>e.label)}/>
              <Field label="Subject / Purpose" value="" onChange={()=>{}} accent={A}/>
              <Field label="Additional Context" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input - AI drafts in formal legal language"/>
              <AIImpact color={A} lines={['AI drafts using formal terminology specific to each entity.','Auto-pulls company registration/PAN/VAT data where relevant.','Tracks submission status and government reference number.']}/>
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
      {showExcel&&<ExcelModal title="Other Government Entities Letters" columns={['Subject','Entity','Submitted Date','Reference No','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

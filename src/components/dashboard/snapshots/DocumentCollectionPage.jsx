// FILE: DocumentCollectionPage.jsx — Document Collection (Preboarding)
// OCR-powered upload, drag-drop, role/location-aware checklist, real-time status tracking
// Nepal: Employer register requirements per Labour Act 2074, SSF enrollment documents

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#78350f 0%,#d97706 60%,#fcd34d 100%)'
const A = '#d97706'

const REQUIRED_DOCS = [
  {key:'citizenship', label:'Citizenship Certificate', mandatory:true},
  {key:'pan', label:'PAN Card', mandatory:true},
  {key:'academic', label:'Academic Certificates', mandatory:true},
  {key:'experience', label:'Experience Letters', mandatory:false},
  {key:'bank', label:'Bank Account Details (Voided Check)', mandatory:true},
  {key:'photo', label:'Passport-size Photo', mandatory:true},
  {key:'ssf', label:'SSF Registration Number', mandatory:true},
  {key:'medical', label:'Medical Fitness Certificate', mandatory:false},
]

const EMPLOYEES = [
  { id:'dc1', employee_id:'EMP-2081-0142', name:'Gita Maharjan', position:'Cloud Architect',
    documents:{
      citizenship:{status:'approved', uploaded:'2025-06-13', ocr_extracted:'Citizenship No. 12-34-56-78901'},
      pan:{status:'approved', uploaded:'2025-06-13', ocr_extracted:'PAN: 301456789'},
      academic:{status:'approved', uploaded:'2025-06-13', ocr_extracted:'M.Tech Computer Science, KU 2018'},
      experience:{status:'approved', uploaded:'2025-06-13', ocr_extracted:'5 yrs — TechCorp Nepal'},
      bank:{status:'approved', uploaded:'2025-06-14', ocr_extracted:'NIC Asia Bank, A/C ending 4421'},
      photo:{status:'approved', uploaded:'2025-06-13', ocr_extracted:null},
      ssf:{status:'approved', uploaded:'2025-06-14', ocr_extracted:'SSF No. 9988776655'},
      medical:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
    },
    completion_pct:88, ai_note:'7/8 documents approved. Medical certificate optional — not blocking.',
    status:'mostly_complete' },
  { id:'dc2', employee_id:'EMP-2081-0141', name:'Sunita Rai', position:'Senior Software Developer',
    documents:{
      citizenship:{status:'processing', uploaded:'2025-06-16', ocr_extracted:'Scanning in progress...'},
      pan:{status:'approved', uploaded:'2025-06-15', ocr_extracted:'PAN: 305678123'},
      academic:{status:'flagged', uploaded:'2025-06-15', ocr_extracted:'Image blurry — degree name unclear'},
      experience:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
      bank:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
      photo:{status:'approved', uploaded:'2025-06-15', ocr_extracted:null},
      ssf:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
      medical:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
    },
    completion_pct:38, ai_note:'Academic certificate flagged — poor image quality. Request re-upload. 4 mandatory docs still pending.',
    status:'in_progress' },
  { id:'dc3', employee_id:'EMP-2081-0143', name:'Hari Adhikari', position:'HR Business Partner',
    documents:{
      citizenship:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
      pan:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
      academic:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
      experience:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
      bank:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
      photo:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
      ssf:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
      medical:{status:'not_uploaded', uploaded:null, ocr_extracted:null},
    },
    completion_pct:0, ai_note:'No documents submitted yet. Reminder email scheduled — joining date in 5 days.',
    status:'not_started' },
]

const DOC_STATUS_CFG = {
  approved:{c:'#10b981',icon:'✓'}, processing:{c:'#3b82f6',icon:'⟳'},
  flagged:{c:'#ef4444',icon:'!'}, not_uploaded:{c:'#94a3b8',icon:'-'},
}
const OVERALL_CFG = {
  mostly_complete:{c:'#10b981',bg:'#f0fdf4',label:'Mostly Complete'},
  in_progress:    {c:'#f59e0b',bg:'#fffbeb',label:'In Progress'},
  not_started:    {c:'#ef4444',bg:'#fef2f2',label:'Not Started'},
}

const CTX = [
  {icon:'👁',label:'View All Documents',     key:'view'},
  {icon:'📧',label:'Send Reminder',           key:'remind'},
  {icon:'🔄',label:'Request Re-upload',       key:'reupload'},
  {icon:'✅',label:'Approve Document',        key:'approve'},
  {icon:'🔗',label:'Impact Analysis',         key:'impact'},
  {icon:'📤',label:'Export',                  key:'export'},
]

export default function DocumentCollectionPage() {
  const [employees, setEmployees] = useState(EMPLOYEES)
  const [search, setSearch]       = useState('')
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [selected, setSelected]   = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)
  const [dragOver, setDragOver]   = useState(null)

  const filtered = employees.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase()))

  const completeCount = employees.filter(e=>e.completion_pct>=85).length
  const avgCompletion = Math.round(employees.reduce((s,e)=>s+e.completion_pct,0)/employees.length)
  const flaggedDocs    = employees.reduce((s,e)=>s+Object.values(e.documents).filter(d=>d.status==='flagged').length,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📂" title="Document Collection"
        breadcrumb="Employee Lifecycle > Onboarding > Preboarding"
        gradient={G}
        stats={[
          {icon:'📂',label:'In Pipeline',     value:employees.length},
          {icon:'✅',label:'Mostly Complete',  value:completeCount},
          {icon:'📊',label:'Avg Completion',   value:avgCompletion+'%'},
          {icon:'⚠',label:'Flagged Docs',     value:flaggedDocs},
        ]}
        onAdd={()=>notify('📧 Document collection email sent to all pending employees')} addLabel="📧 Send Reminder" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}

      <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#92400e'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Compliance:</strong> Employer must maintain official employee register (Labour Act 2074). SSF registration mandatory for all permanent/regular workers from day one. OCR auto-extraction minimizes manual data entry into HRIS.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(emp=>{
          const oc = OVERALL_CFG[emp.status]||OVERALL_CFG.in_progress
          return (
            <div key={emp.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:emp.name,impact_links:['Digital Forms & E-sign','Joining Checklist']}})}}
              style={{background:'#fff',border:`1.5px solid ${oc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${oc.c}`}}>

              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${oc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📂</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:3,alignItems:'center'}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{emp.name}</span>
                    <span style={{background:oc.bg,color:oc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{oc.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{emp.employee_id} · {emp.position}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color:oc.c}}>{emp.completion_pct}%</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>COMPLETE</div>
                </div>
              </div>

              <div style={{height:6,background:'#f1f5f9'}}>
                <div style={{width:`${emp.completion_pct}%`,height:'100%',background:oc.c,transition:'width .6s ease'}}/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8,padding:'14px 20px'}}>
                {REQUIRED_DOCS.map(doc=>{
                  const d = emp.documents[doc.key]
                  const dc = DOC_STATUS_CFG[d.status]||DOC_STATUS_CFG.not_uploaded
                  return (
                    <div key={doc.key}
                      onDragOver={e=>{e.preventDefault();setDragOver(`${emp.id}-${doc.key}`)}}
                      onDragLeave={()=>setDragOver(null)}
                      onDrop={e=>{e.preventDefault();setDragOver(null);alert(`File dropped for ${doc.label} — OCR processing started`)}}
                      style={{background:dragOver===`${emp.id}-${doc.key}`?`${A}10`:'#f8fafc',
                        border:`1.5px dashed ${dragOver===`${emp.id}-${doc.key}`?A:dc.c+'44'}`,
                        borderRadius:10,padding:'8px 10px',cursor:'pointer'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:3}}>
                        <span style={{fontSize:10,fontWeight:700,color:'#0f172a',lineHeight:1.3}}>{doc.label}{doc.mandatory&&<span style={{color:'#ef4444'}}> *</span>}</span>
                        <span style={{fontSize:13,fontWeight:900,color:dc.c,flexShrink:0}}>{dc.icon}</span>
                      </div>
                      {d.uploaded&&<div style={{fontSize:8,color:'#94a3b8'}}>{d.uploaded}</div>}
                      {d.ocr_extracted&&<div style={{fontSize:8,color:dc.c,marginTop:2,fontStyle:'italic'}}>OCR: {d.ocr_extracted}</div>}
                      {d.status==='not_uploaded'&&<div style={{fontSize:8,color:'#94a3b8'}}>Drag & drop or click to upload</div>}
                    </div>
                  )
                })}
              </div>

              <div style={{padding:'8px 20px',background:'#f8fafc',fontSize:10,color:'#64748b',fontStyle:'italic',borderTop:'1px solid #f1f5f9'}}>🤖 {emp.ai_note}</div>

              <div style={{padding:'8px 14px',display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button onClick={()=>setSelected(emp)} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>Full View</button>
                <button style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Send Reminder</button>
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Document Collection" columns={['Employee ID','Name','Citizenship','PAN','Academic','Experience','Bank','Photo','SSF','Completion %']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Employee ID',selected?.employee_id],['Name',selected?.name],['Position',selected?.position],
        ['Completion',selected?.completion_pct+'%'],
        ...(selected?.documents?Object.entries(selected.documents).map(([k,v])=>[REQUIRED_DOCS.find(d=>d.key===k)?.label||k, v.status+(v.ocr_extracted?' — '+v.ocr_extracted:'')]):[]),
        ['AI Note',selected?.ai_note],
      ]}/>
    </div>
  )
}

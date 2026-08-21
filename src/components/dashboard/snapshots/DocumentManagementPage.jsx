// FILE: DocumentManagementPage.jsx - Document Management (Employee Documents)
// Drag-drop upload, OCR/NLP tagging, federated search, RBAC, retention schedule

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, Badge, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const DOC_CATEGORIES = [
  {key:'tax_forms',label:'Tax Forms',icon:'🧾',color:'#f59e0b'},
  {key:'certificates',label:'Certificates',icon:'🎓',color:'#7c3aed'},
  {key:'contracts',label:'Contracts',icon:'📜',color:'#10b981'},
  {key:'nda',label:'NDA',icon:'🔒',color:'#ef4444'},
  {key:'id_proof',label:'ID Proof',icon:'🪪',color:'#3b82f6'},
  {key:'medical',label:'Medical',icon:'🏥',color:'#ec4899'},
]

const DOCUMENTS = [
  { id:'d1', name:'Gita Maharjan_Citizenship.pdf', employee:'Gita Maharjan', category:'id_proof',
    tags:['Citizenship','Verified'], uploaded:'2025-06-17', size:'2.1 MB', uploaded_by:'Self-Service',
    ocr_processed:true, retention_until:'2030-06-17', access_level:'HR Only',
    impact_links:['Document Collection','Personal Information'] },
  { id:'d2', name:'Maya Pradhan_Employment_Contract.pdf', employee:'Maya Pradhan', category:'contracts',
    tags:['Contract','Signed','Regular'], uploaded:'2025-06-09', size:'540 KB', uploaded_by:'HR Admin',
    ocr_processed:true, retention_until:'2030-06-09', access_level:'HR + Finance',
    impact_links:['Contract Management','Digital Employee File'] },
  { id:'d3', name:'Hari Thapa_PAN_Certificate.pdf', employee:'Hari Thapa', category:'tax_forms',
    tags:['PAN','Tax'], uploaded:'2025-05-22', size:'1.3 MB', uploaded_by:'Self-Service',
    ocr_processed:true, retention_until:'2030-05-22', access_level:'HR + Finance',
    impact_links:['Personal Information'] },
  { id:'d4', name:'Gita Maharjan_NDA_Signed.pdf', employee:'Gita Maharjan', category:'nda',
    tags:['NDA','Confidential'], uploaded:'2025-06-18', size:'320 KB', uploaded_by:'HR Admin',
    ocr_processed:true, retention_until:'2030-06-18', access_level:'HR Only',
    impact_links:['Non-Disclosure Agreement'] },
  { id:'e5', name:'Maya Pradhan_CA_Certificate.pdf', employee:'Maya Pradhan', category:'certificates',
    tags:['CA','Professional'], uploaded:'2025-06-09', size:'890 KB', uploaded_by:'Self-Service',
    ocr_processed:false, retention_until:'2030-06-09', access_level:'HR Only',
    impact_links:[] },
]

const CTX = [
  {icon:'👁',label:'View Document',      key:'view'},
  {icon:'📥',label:'Download',            key:'download'},
  {icon:'🏷',label:'Edit Tags',           key:'tags'},
  {icon:'🔍',label:'OCR Re-process',      key:'ocr'},
  {icon:'🔗',label:'Impact Analysis',     key:'impact'},
  {icon:'🗑',label:'Delete (RBAC: HR)',   key:'delete',danger:true},
]

export default function DocumentManagementPage() {
  const [documents, setDocuments] = useState(DOCUMENTS)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [showUpload, setShowUpload] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const filtered = documents.filter(d=>{
    if (filterCat!=='all'&&d.category!==filterCat) return false
    if (search) {
      const s = search.toLowerCase()
      return d.name.toLowerCase().includes(s)||d.employee.toLowerCase().includes(s)||d.tags.some(t=>t.toLowerCase().includes(s))
    return true
  })

  const ocrPendingCount = documents.filter(d=>!d.ocr_processed).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📁" title="Document Management"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Documents"
        gradient={G}
        stats={[
          {icon:'📁',label:'Total Documents', value:documents.length},
          {icon:'🤖',label:'OCR Processed',    value:documents.filter(d=>d.ocr_processed).length},
          {icon:'⏳',label:'OCR Pending',      value:ocrPendingCount},
          {icon:'🔐',label:'Encrypted',        value:'AES-256'},
        ]}
        onAdd={()=>setShowUpload(true)} addLabel="Upload Document"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔐</span>
        <div><strong>Security & Compliance:</strong> AES-256 encryption at rest, TLS 1.3 in transit. Role-based access control restricts sensitive documents to HR/Finance. Nepal Labour Act 2074: records retained 5 years post-employment for audit and Labour Office inspection.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Federated search: filename, employee, tags, or text within PDFs..."/>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Categories</option>
          {DOC_CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      {/* Category quick-filter chips */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {DOC_CATEGORIES.map(c=>{
          const count = documents.filter(d=>d.category===c.key).length
          return (
            <button key={c.key} onClick={()=>setFilterCat(filterCat===c.key?'all':c.key)}
              style={{padding:'8px 14px',borderRadius:20,border:`1.5px solid ${filterCat===c.key?c.color:'#e2e8f0'}`,
                background:filterCat===c.key?`${c.color}10`:'#fff',cursor:'pointer',display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:13}}>{c.icon}</span>
              <span style={{fontSize:10,fontWeight:700,color:filterCat===c.key?c.color:'#64748b'}}>{c.label}</span>
              <span style={{fontSize:9,color:'#94a3b8'}}>({count})</span>
            </button>
          )
        })}
      </div>

      <div style={{display:'grid',gap:10}}>
        {filtered.map(d=>{
          const cat = DOC_CATEGORIES.find(c=>c.key===d.category)
          return (
            <div key={d.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.name,...d}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
              <div style={{width:44,height:44,borderRadius:12,background:`${cat?.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{cat?.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                  <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{d.name}</span>
                  {!d.ocr_processed&&<span style={{background:'#fffbeb',color:'#b45309',fontSize:8,fontWeight:700,padding:'1px 7px',borderRadius:20}}>OCR Pending</span>}
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{d.employee} . {d.size} . Uploaded {d.uploaded} by {d.uploaded_by}</div>
                <div style={{display:'flex',gap:4,marginTop:4,flexWrap:'wrap'}}>
                  {d.tags.map((t,i)=><span key={i} style={{background:'#f8fafc',color:'#475569',fontSize:9,padding:'1px 7px',borderRadius:20,border:'1px solid #e2e8f0'}}>{t}</span>)}
                  <span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:600,padding:'1px 7px',borderRadius:20}}>🔒 {d.access_level}</span>
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:9,color:'#94a3b8'}}>Retain until</div>
                <div style={{fontSize:10,fontWeight:700,color:A}}>{d.retention_until}</div>
              </div>
              <button style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>View</button>
            </div>
          )
        })}
      </div>

      {showUpload&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowUpload(false)}>
          <div style={{background:'#fff',borderRadius:20,width:580,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Upload Document</div></div>
            <div style={{padding:'22px 28px'}}>
              <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false)}}
                style={{border:`2px dashed ${dragOver?A:'#bfdbfe'}`,borderRadius:14,padding:'32px',textAlign:'center',marginBottom:16,background:dragOver?'#eff6ff':'#f0f9ff',cursor:'pointer'}}>
                <div style={{fontSize:36,marginBottom:8}}>📄</div>
                <div style={{fontSize:13,fontWeight:700,color:'#1d4ed8',marginBottom:4}}>Drag & Drop or Click to Upload</div>
                <div style={{fontSize:11,color:'#64748b'}}>PDF, DOC, JPG (Max 10MB). AI will auto-OCR and categorize.</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Employee</label><select value={form.employee||''} onChange={e=>setForm(p=>({...p,employee:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Gita Maharjan','Maya Pradhan','Hari Thapa'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Category</label><input type="text" value={form.category||''} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Access Level</label><select value={form.access_level||''} onChange={e=>setForm(p=>({...p,access_level:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['HR Only','HR + Finance','Manager + HR','Public (Directory)'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Tags (comma separated)</label><input type="text" value={form.tags_comma_separated||''} onChange={e=>setForm(p=>({...p,tags_comma_separated:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
              </div>
              <AIImpact color={A} lines={['AI auto-extracts text via OCR for federated search.','Auto-tags based on document content analysis.','RBAC enforced - sensitive docs hidden from unauthorized roles.','Retention countdown auto-set per Nepal LA2074 (5yr post-employment).']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowUpload(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Upload & Process</button>
                <button onClick={()=>setShowUpload(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Document Management" columns={['File Name','Employee','Category','Tags','Uploaded Date','Size','Access Level','Retention Until']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

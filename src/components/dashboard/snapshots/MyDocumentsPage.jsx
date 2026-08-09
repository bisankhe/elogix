// FILE: MyDocumentsPage.jsx - My Documents
// (HR Services & Support > Employee Self Service)
// ESS-facing personal vault -- pure UI over the EXISTING
// employee_documents (Employee Records session). Categorized tiles,
// expiry alerts, drag-and-drop upload. Never a second document table.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const CATEGORY_CFG = {
  tax_forms:{icon:'🧾',label:'Tax Forms'},certificates:{icon:'🏆',label:'Certificates'},contracts:{icon:'📜',label:'Contracts'},
  nda:{icon:'🔒',label:'NDA'},id_proof:{icon:'🪪',label:'ID Proof'},medical:{icon:'🏥',label:'Medical'},other:{icon:'📁',label:'Other'},
}

const MY_DOCUMENTS = [
  { id:'d1', file_name:'Employment_Contract_2025.pdf', category:'contracts', uploaded_at:'2025-01-15', expires_at:null },
  { id:'d2', file_name:'Citizenship_Certificate.pdf', category:'id_proof', uploaded_at:'2025-01-15', expires_at:null },
  { id:'d3', file_name:'PAN_Registration.pdf', category:'tax_forms', uploaded_at:'2025-02-01', expires_at:null },
  { id:'d4', file_name:'Work_Permit_Foreign.pdf', category:'id_proof', uploaded_at:'2024-08-10', expires_at:'2025-08-10',
    flag_note:'Expires in 43 days -- renewal recommended now.' },
]

export default function MyDocumentsPage() {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [showUpload, setShowUpload] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = MY_DOCUMENTS.filter(d=>{
    if (filterCat!=='all'&&d.category!==filterCat) return false
    if (search&&!d.file_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const expiringCount = MY_DOCUMENTS.filter(d=>d.expires_at).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📂" title="My Documents"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'📂',label:'Total Documents',  value:MY_DOCUMENTS.length},
          {icon:'⚠',label:'Expiring Soon',        value:expiringCount},
          {icon:'🔒',label:'Encryption',             value:'AES-256'},
          {icon:'👁',label:'Visibility',                value:'Only You + HR'},
        ]}
        onAdd={()=>setShowUpload(true)} addLabel="Upload Document"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Personal Digital Filing Cabinet:</strong> Encrypted, categorized, and visible only to you and HR -- never your manager or coworkers unless you choose to share.</div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search my documents..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          {['all',...Object.keys(CATEGORY_CFG)].map(c=>(
            <button key={c} onClick={()=>setFilterCat(c)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,whiteSpace:'nowrap',
                background:filterCat===c?'#fff':'transparent',color:filterCat===c?A:'#64748b',
                fontWeight:filterCat===c?700:400,boxShadow:filterCat===c?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {c==='all'?'All':CATEGORY_CFG[c].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}}>
        {filtered.map(d=>{
          const cc = CATEGORY_CFG[d.category]
          return (
            <div key={d.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.file_name,...d}})}}
              style={{background:'#fff',border:`1px solid ${d.expires_at?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px',textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:8}}>{cc.icon}</div>
              <div style={{fontSize:10,fontWeight:700,color:'#0f172a',wordBreak:'break-word'}}>{d.file_name}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:6}}>{cc.label} . {d.uploaded_at}</div>
              {d.flag_note&&<div style={{marginTop:8,fontSize:8,color:'#b45309'}}>⚠ {d.flag_note}</div>}
              <button style={{marginTop:10,padding:'5px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>📥 Download</button>
            </div>
          )
        })}
      </div>

      {showUpload&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowUpload(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(440px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Upload Document</div></div>
            <div style={{padding:'20px 24px'}}>
              <div style={{border:'2px dashed #bfdbfe',borderRadius:12,padding:'30px',textAlign:'center',background:'#eff6ff',marginBottom:14}}>
                <div style={{fontSize:24,marginBottom:6}}>📤</div>
                <div style={{fontSize:10,color:'#1e40af'}}>Drag and drop, or click to browse</div>
              </div>
              <button onClick={()=>setShowUpload(false)} style={{width:'100%',padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Upload</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Auto-tags documents by category on upload using OCR -- no manual filing required.','Expiry alerts fire at 90, 60, and 30 days for visas, permits, and certifications.','Newly uploaded versions never overwrite the old one silently -- full version history is preserved.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Document',key:'view'},{icon:'📥',label:'Download',key:'download'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

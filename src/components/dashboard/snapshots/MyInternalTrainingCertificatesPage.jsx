// FILE: MyInternalTrainingCertificatesPage.jsx - My Internal Training Certificates
// (HR Services & Support > Employee Self Service)
// Pure UI over the EXISTING v_my_credentials_employee (built explicitly
// as "the ESS view" in the Certificate Generation session) -- never a
// second certificate table. Adds the brief's one new capability: upload
// an EXTERNAL certificate for HR verification.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const MY_CERTIFICATES = [
  { id:'c1', course_title:'AWS Solutions Architect', issued_date:'2025-05-12', expires_date:'2028-05-12', status:'active', source:'internal', impact_links:['Course Management'] },
  { id:'c2', course_title:'OSH & Fire Safety Refresher', issued_date:'2025-04-18', expires_date:'2026-04-18', status:'active', source:'internal' },
  { id:'c3', course_title:'CI/CD Pipeline Mastery', issued_date:'2025-03-01', expires_date:null, status:'active', source:'internal' },
  { id:'c4', course_title:'Scrum Master Certification (external workshop)', issued_date:'2025-06-10', expires_date:null, status:'pending_verification', source:'external_upload',
    flag_note:'Awaiting HR verification before counting toward your professional KPI points.' },
]

export default function MyInternalTrainingCertificatesPage() {
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = MY_CERTIFICATES.filter(c=>!search||c.course_title.toLowerCase().includes(search.toLowerCase()))
  const totalCerts = MY_CERTIFICATES.filter(c=>c.status==='active').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏆" title="My Internal Training Certificates"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'🏆',label:'Total Certificates',  value:totalCerts},
          {icon:'⏳',label:'Pending Verification',   value:MY_CERTIFICATES.filter(c=>c.status==='pending_verification').length},
          {icon:'📅',label:'Expiring Soon',             value:0},
          {icon:'🔗',label:'Synced From',                 value:'Course Management'},
        ]}
        onAdd={()=>setShowUpload(true)} addLabel="Upload External Certificate"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎓</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Living Transcript:</strong> Internal certificates appear here automatically the moment a course completes -- nothing to request from HR. Completed an external workshop? Upload it for verification and it counts toward your professional KPIs too.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search my certificates..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(c=>(
          <div key={c.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.course_title,...c}})}}
            style={{background:'#fff',border:`1px solid ${c.status==='pending_verification'?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'18px',textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:8}}>{c.status==='pending_verification'?'⏳':'🏆'}</div>
            <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{c.course_title}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:6}}>Issued {c.issued_date}{c.expires_date&&` . Expires ${c.expires_date}`}</div>
            {c.source==='external_upload'&&<span style={{display:'inline-block',marginTop:6,background:'#eff6ff',color:'#1e40af',fontSize:7,fontWeight:600,padding:'2px 8px',borderRadius:20}}>External Upload</span>}
            {c.flag_note&&<div style={{marginTop:8,fontSize:8,color:'#b45309'}}>⚠ {c.flag_note}</div>}
            {c.status==='active'&&<button style={{marginTop:10,padding:'5px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>📥 Download PDF</button>}
          </div>
        ))}
      </div>

      {showUpload&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowUpload(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Upload External Certificate</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Certificate / Workshop Title" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Issuing Organization" value="" onChange={()=>{}} accent={A}/>
              <div style={{border:'2px dashed #e9d5ff',borderRadius:12,padding:'24px',textAlign:'center',background:'#faf5ff',marginBottom:14}}>
                <div style={{fontSize:22,marginBottom:6}}>📎</div>
                <div style={{fontSize:10,color:'#581c87'}}>Upload your certificate PDF for HR verification</div>
              </div>
              <button onClick={()=>setShowUpload(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit for Verification</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Internal certificates sync automatically from Course Management -- zero manual entry, ever.','External uploads route to HR for one-click legitimacy verification before counting toward your KPIs.','Expiry alerts fire well before a compliance certification lapses -- never an unequipped-and-unaware surprise.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Certificate',key:'view'},{icon:'📥',label:'Download',key:'download'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

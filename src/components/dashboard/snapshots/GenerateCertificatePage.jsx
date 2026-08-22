// FILE: GenerateCertificatePage.jsx - Generate Certificate
// (Performance & Talent > Talent Development > Learning & Development)
// Template engine + auto-issuance on course completion. Extends the
// EXISTING lms_certifications (Course Management) -- never duplicates
// course/enrollment data. Auto-issues for ANY completed course, not
// only recertification-tracked ones (this session's "little change").
//
// USER PERSONAS (explicit, per this session's instruction):
//  - HR/L&D Admin: builds templates, reviews auto-issue queue, bulk-generates
//  - Manager: sees team certificates issued, approves manual override requests
//  - Employee (ESS): views/downloads their own certificate, shares to LinkedIn

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const PERSONAS = {
  hr_admin: { label: 'HR / L&D Admin', icon:'🛡',
    data: ['Template builder', 'Auto-issue queue (last 24h)', 'Bulk generation tool', 'Brand/signature config'] },
  manager: { label: 'Manager', icon:'👔',
    data: ['Team certificates issued this month', 'Pending manual-override approvals', 'Department compliance snapshot'] },
  employee: { label: 'Employee (ESS)', icon:'🙋',
    data: ['My Credentials list', 'Download PDF / Share to LinkedIn', 'QR verify link', 'Renewal reminders'] },
}

const AUTO_ISSUE_QUEUE = [
  { id:'q1', employee:'Sunil Magar', course:'AWS Solutions Architect', completed_at:'2025-06-21 14:32', status:'issued', cert_id:'CERT-2025-0412' },
  { id:'q2', employee:'Anjali Sharma', course:'Strategic Planning for Managers', completed_at:'2025-06-21 09:10', status:'issued', cert_id:'CERT-2025-0413' },
  { id:'q3', employee:'Bikash Rai', course:'OSH & Fire Safety Refresher', completed_at:'2025-06-20 16:45', status:'pending_template', flag_note:'No active template assigned to this course -- using default.' },
]

const TEMPLATE_FIELDS = ['[Employee Name]','[Certification Title]','[Issue Date]','[Expiry Date]','[Signature]','[QR Verify Code]']

export default function GenerateCertificatePage() {
  const [persona, setPersona] = useState('hr_admin')
  const [search, setSearch] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = AUTO_ISSUE_QUEUE.filter(q=>!search||q.employee.toLowerCase().includes(search.toLowerCase()))
  const issuedToday = AUTO_ISSUE_QUEUE.filter(q=>q.status==='issued').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎓" title="Generate Certificate"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'✅',label:'Auto-Issued Today',  value:issuedToday},
          {icon:'⏳',label:'Pending Template',     value:AUTO_ISSUE_QUEUE.filter(q=>q.status==='pending_template').length},
          {icon:'📐',label:'Active Templates',     value:4},
          {icon:'📦',label:'Bulk Queue',            value:0},
        ]}
        onAdd={()=>setShowBuilder(true)} addLabel="New Template"/>

      {/* Persona switcher */}
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap',background:'#f1f5f9',padding:6,borderRadius:12}}>
        {Object.entries(PERSONAS).map(([key,p])=>(
          <button key={key} onClick={()=>setPersona(key)}
            style={{padding:'8px 14px',borderRadius:9,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
              background:persona===key?'#fff':'transparent',color:persona===key?A:'#64748b',
              fontWeight:persona===key?700:500,boxShadow:persona===key?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87'}}>
        <strong>{PERSONAS[persona].icon} {PERSONAS[persona].label} sees:</strong> {PERSONAS[persona].data.join(' . ')}
      </div>

      {persona==='hr_admin'&&(<>
        <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46'}}>
          <strong>⚡ Fully Automatic:</strong> Certificates issue the instant a course's progress hits 100% -- no manual click required for any completed course, not just recertification-tracked ones.
        </div>

        <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by employee or course..."/>
          <button onClick={()=>setShowBulk(true)} style={{padding:'10px 18px',borderRadius:10,border:`1px solid ${A}33`,background:'#faf5ff',color:A,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>📦 Bulk Generate</button>
        </div>

        <div style={{display:'grid',gap:12,marginTop:14}}>
          {filtered.map(q=>(
            <div key={q.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:q.employee,...q,impact_links:['Certification Tracking','Course Management']}})}}
              style={{background:'#fff',border:`1px solid ${q.status==='pending_template'?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{q.employee} - {q.course}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>Completed: {q.completed_at}</div>
              </div>
              {q.status==='issued'?<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>✅ {q.cert_id}</span>:
               <span style={{background:'#fffbeb',color:'#b45309',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>⏳ Pending Template</span>}
            </div>
          ))}
        </div>
      </>)}

      {persona==='manager'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}>
          {[{l:'Team Certs Issued',v:8,c:'#10b981'},{l:'Pending My Approval',v:1,c:'#f59e0b'},{l:'Team Compliance',v:'94%',c:'#7c3aed'}].map((s,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'18px'}}>
              <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:6}}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {persona==='employee'&&(
        <div style={{display:'grid',gap:12}}>
          {AUTO_ISSUE_QUEUE.filter(q=>q.status==='issued').map(q=>(
            <div key={q.id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>🏆 {q.course}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{q.cert_id} . Issued {q.completed_at.split(' ')[0]}</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button style={{padding:'6px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>📥 Download PDF</button>
                <button style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#faf5ff',color:A,fontSize:9,fontWeight:600,cursor:'pointer'}}>🔗 Share to LinkedIn</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBuilder&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowBuilder(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(620px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Certificate Template Builder</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Template Name" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Apply to Course(s)" type="select" value="" onChange={()=>{}} accent={A} options={['All Courses (default)','AWS Solutions Architect','OSH & Fire Safety Refresher']}/>
              <div style={{margin:'12px 0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:8}}>🎨 Drag-and-Drop Merge Tags</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {TEMPLATE_FIELDS.map((f,i)=>(<span key={i} style={{background:'#eff6ff',color:'#1e40af',fontSize:9,fontWeight:600,padding:'4px 10px',borderRadius:8,cursor:'grab'}}>{f}</span>))}
                </div>
                <div style={{marginTop:10,border:'2px dashed #e9d5ff',borderRadius:12,padding:'30px 16px',textAlign:'center',background:'#faf5ff'}}>
                  <div style={{fontSize:13,fontWeight:800,color:'#581c87'}}>Certificate of Completion</div>
                  <div style={{fontSize:10,color:'#7c3aed',marginTop:6}}>This certifies that <strong>[Employee Name]</strong> has completed <strong>[Certification Title]</strong></div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:10}}>Issued: [Issue Date] . Expires: [Expiry Date]</div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:6}}>🔲 [QR Verify Code]</div>
                </div>
              </div>
              <AIImpact color={A} lines={['Once published, this template auto-applies to every matching course completion -- no per-employee manual step.','QR code links to a public, tamper-proof verification page.','Notification sent to the employee and their reporting manager the moment a certificate is issued.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowBuilder(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Publish Template</button>
                <button onClick={()=>setShowBuilder(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulk&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowBulk(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Bulk Generate Certificates</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Course" type="select" value="" onChange={()=>{}} accent={A} options={['OSH & Fire Safety Refresher (298 completed)']}/>
              <Field label="Apply Template" type="select" value="" onChange={()=>{}} accent={A} options={['Default Certificate Template']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowBulk(false)} style={{flex:1,padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Generate All (298)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Certificate',key:'view'},{icon:'🔄',label:'Regenerate',key:'regen'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

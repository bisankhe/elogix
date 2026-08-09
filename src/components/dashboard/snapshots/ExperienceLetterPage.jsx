// FILE: ExperienceLetterPage.jsx - Experience Letter (Settlement & Documents)
// Strictly factual per LA2074 Section 150: tenure + position only, never subjective

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const SAMPLE_LETTER = `[NepHR Pro Pvt. Ltd. Letterhead]

CERTIFICATE OF EXPERIENCE

Date: July 12, 2025

This is to certify that Mr. Dipendra Yadav (Employee ID: EMP-0067) was employed with NepHR Pro Pvt. Ltd. from April 1, 2024 to July 10, 2025, in the position of Junior Accountant, Finance & Accounts Department.

During this period, his primary responsibilities included monthly financial reconciliation, vendor payment processing, and accounts payable management.

We wish him success in his future endeavors.

For NepHR Pro Pvt. Ltd.

_______________________
Priya Adhikari
HR Manager`

const LETTERS = [
  { id:'el1', employee:'Dipendra Yadav', position:'Junior Accountant', dept:'Finance & Accounts',
    join_date:'2024-04-01', lwd:'2025-07-10', tenure:'1 year 3 months',
    fnf_settled:true, requested_date:'2025-07-11', issued_date:'2025-07-12',
    status:'issued', digital_signature:true, format:'pdf',
    impact_links:['Relieving Letter','Full & Final Settlement'] },
  { id:'el2', employee:'Anjali Sharma', position:'Sales Executive', dept:'Sales & Marketing',
    join_date:'2025-02-10', lwd:'2025-06-22', tenure:'4 months',
    fnf_settled:false, requested_date:'2025-06-23', issued_date:null,
    status:'pending_request', digital_signature:false, format:null,
    impact_links:['Full & Final Settlement'] },
]

const STATUS_CFG = {
  issued:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Issued'},
  pending_request:{c:'#94a3b8',bg:'#f8fafc',icon:'⏳',label:'Awaiting Request'},
  drafting:{c:'#f59e0b',bg:'#fffbeb',icon:'✏',label:'Drafting'},
}

export default function ExperienceLetterPage() {
  const [letters, setLetters] = useState(LETTERS)
  const [search, setSearch] = useState('')
  const [showPreview, setShowPreview] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({employee:'',position:'',dept:'',join_date:'',lwd:'',tenure:''})
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const filtered = letters.filter(l=>!search||l.employee.toLowerCase().includes(search.toLowerCase()))
  const issuedCount = letters.filter(l=>l.status==='issued').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎓" title="Experience Letter"
        breadcrumb="Employee Lifecycle > Offboarding > Settlement & Documents"
        gradient={G}
        stats={[
          {icon:'🎓',label:'Total Requests', value:letters.length},
          {icon:'✅',label:'Issued',          value:issuedCount},
          {icon:'⏳',label:'Pending',         value:letters.length-issuedCount},
          {icon:'⚖',label:'Legal Basis',     value:'LA2074 §150'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ Generate Letter" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'2px solid #bfdbfe',borderRadius:12,padding:'12px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:20}}>⚖</span>
        <div><strong>Nepal Labour Act 2074 Section 150 - Strict Rules:</strong> Employer MUST provide this on request. Letter must be strictly factual - period of service and position held ONLY. Cannot be arbitrarily withheld. Cannot contain negative comments, regardless of departure reason (even dismissal). No subjective performance evaluation permitted.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(l=>{
          const sc = STATUS_CFG[l.status]
          return (
            <div key={l.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.employee,...l}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{l.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {!l.fnf_settled&&<span style={{background:'#fffbeb',color:'#b45309',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>F&F Pending (not a blocker)</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{l.position} . {l.dept}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{l.join_date} to {l.lwd} . Tenure: {l.tenure}</div>
                </div>
                {l.issued_date&&(
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:900,color:'#10b981'}}>{l.issued_date}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>ISSUED DATE</div>
                  </div>
                )}
              </div>

              <div style={{padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:10,color:'#64748b'}}>
                  Requested: {l.requested_date}
                  {l.digital_signature&&' . ✓ Digitally signed'}
                </span>
                <div style={{display:'flex',gap:6}}>
                  {l.status==='pending_request'?(
                    <button style={{padding:'6px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Generate Letter (AI)</button>
                  ):(
                    <>
                      <button onClick={()=>setShowPreview(l)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>Preview</button>
                      <button style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:11,fontWeight:700,cursor:'pointer'}}>Download PDF</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showPreview&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowPreview(null)}>
          <div style={{background:'#fff',borderRadius:16,width:640,maxHeight:'88vh',overflow:'auto',boxShadow:'0 40px 100px rgba(0,0,0,.4)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>Experience Letter Preview - {showPreview.employee}</span>
              <button onClick={()=>setShowPreview(null)} style={{background:'rgba(255,255,255,.2)',border:'none',color:'#fff',width:26,height:26,borderRadius:'50%',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:'24px 30px'}}>
              <div style={{background:'#fafaf9',border:'1px solid #e7e5e4',borderRadius:10,padding:'24px 28px',fontSize:11.5,lineHeight:1.8,color:'#1c1917',fontFamily:'Georgia, serif',whiteSpace:'pre-wrap'}}>
                {SAMPLE_LETTER}
              </div>
              <div style={{marginTop:14,background:'#eff6ff',borderRadius:10,padding:'10px 14px',fontSize:10,color:'#1e40af'}}>
                ✓ Strictly factual per LA2074 Section 150 - tenure and position only, no performance commentary.
              </div>
              <div style={{display:'flex',gap:10,marginTop:14}}>
                <button style={{flex:1,padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>📥 Download PDF</button>
                <button style={{flex:1,padding:12,borderRadius:10,border:`1.5px solid ${A}`,background:'#fff',color:A,fontSize:12,fontWeight:700,cursor:'pointer'}}>🔗 Export to LinkedIn</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:500,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>🎓 Generate Experience Letter</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>Strictly factual per Nepal Labour Act 2074 §150</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                {[['Employee Name *','employee','text'],['Position / Designation','position','text'],
                  ['Department','dept','text'],['Join Date *','join_date','date'],
                  ['Last Working Day *','lwd','date'],['Tenure (e.g. 1 year 3 months)','tenure','text'],
                ].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
              </div>
              <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:10,color:'#1e40af'}}>
                ⚖️ Per LA2074 §150: Letter must contain ONLY period of service and position held. No performance comments permitted, even for dismissed employees. Cannot be withheld.
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.employee||!form.join_date||!form.lwd){notify('⚠️ Employee, join date and LWD required');return}
                  setLetters(prev=>[...prev,{id:'el'+Date.now(),employee:form.employee,position:form.position||'Staff',dept:form.dept||'TBD',join_date:form.join_date,lwd:form.lwd,tenure:form.tenure||'TBD',fnf_settled:false,requested_date:new Date().toISOString().split('T')[0],issued_date:new Date().toISOString().split('T')[0],status:'issued',digital_signature:false,format:'pdf',impact_links:['Relieving Letter']}])
                  notify('✅ Experience letter generated for '+form.employee+' — available for download')
                  setShowAdd(false)
                }} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>🎓 Generate Experience Letter</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Preview Letter',key:'view'},{icon:'📥',label:'Download PDF',key:'download'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Experience Letters" columns={['Employee','Position','Department','Join Date','LWD','Tenure','Requested Date','Issued Date','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

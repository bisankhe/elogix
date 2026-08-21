// FILE: MyDigitalSignaturePage.jsx - My Digital Signature
// (HR Services & Support > Employee Self Service)
// Recurring "pending documents" inbox for any document needing
// e-signature (warning letters, policy acks, appraisal sign-offs) --
// distinct from the one-time onboarding DigitalSignatureCreationPage.
// MFA/OTP gate before applying a signature, per Electronic Transactions Act 2063.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const PENDING_DOCS = [
  { id:'p1', title:'Written Warning -- Attendance Policy 4.2', source:'Disciplinary Management', urgency:'high', received:'2025-06-22', impact_links:['Warning Letter'] },
  { id:'p2', title:'Updated Remote Work Policy -- Acknowledgment Required', source:'Internal Communication', urgency:'medium', received:'2025-06-18' },
  { id:'p3', title:'Q2 Performance Review -- Sign to Confirm Receipt', source:'Performance Appraisal', urgency:'low', received:'2025-06-15' },
]

const SIGNED_DOCS = [
  {title:'Annual Leave Policy 2025 Acknowledgment',signed_at:'2025-05-02'},
  {title:'NDA Renewal',signed_at:'2025-03-10'},
]

const URGENCY_CFG = { high:{c:'#ef4444',label:'Action Required'},medium:{c:'#f59e0b',label:'Review Soon'},low:{c:'#94a3b8',label:'Routine'} }

export default function MyDigitalSignaturePage() {
  const [search, setSearch] = useState('')
  const [signingDoc, setSigningDoc] = useState(null)
  const [otpStep, setOtpStep] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = PENDING_DOCS.filter(p=>!search||p.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="✍" title="My Digital Signature"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'✍',label:'Pending Signatures',  value:PENDING_DOCS.length},
          {icon:'⚠',label:'Action Required',        value:PENDING_DOCS.filter(p=>p.urgency==='high').length},
          {icon:'✅',label:'Signed This Year',         value:SIGNED_DOCS.length},
          {icon:'⚖',label:'Legal Basis',                value:'Electronic Transactions Act'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔐</span>
        <div style={{flex:1,minWidth:200}}><strong>No More Print-Sign-Scan:</strong> Every document needing your signature -- warning letters, policy updates, review sign-offs -- lands in one inbox. A one-time PIN confirms it's really you before any signature is legally applied.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search pending documents..."/>

      <div style={{display:'grid',gap:14,marginTop:14,marginBottom:18}}>
        {filtered.map(p=>{
          const uc = URGENCY_CFG[p.urgency]
          return (
            <div key={p.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.title,...p}})}}
              style={{background:'#fff',border:`1.5px solid ${uc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${uc.c}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{p.title}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>From {p.source} . Received {p.received}</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{background:`${uc.c}15`,color:uc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{uc.label}</span>
                <button onClick={()=>{setSigningDoc(p);setOtpStep(false);setAgreed(false)}} style={{padding:'7px 16px',borderRadius:9,border:'none',background:uc.c,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Review &amp; Sign</button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>✅ Recently Signed</div>
        {SIGNED_DOCS.map((s,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<SIGNED_DOCS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{s.title}</span><span style={{fontSize:9,color:'#94a3b8'}}>{s.signed_at}</span>
          </div>
        ))}
      </div>

      {signingDoc&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setSigningDoc(null)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(500px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>{signingDoc.title}</div></div>
            {!otpStep?(
              <div style={{padding:'20px 24px'}}>
                <div style={{background:'#f8fafc',borderRadius:10,padding:'16px',minHeight:120,fontSize:10,color:'#374151',marginBottom:14}}>
                  [Full document content displays here for review before signing]
                </div>
                <label style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,fontSize:10,color:'#374151'}}>
                  <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{accentColor:A}}/>
                  I have read and agree to the contents of this document
                </label>
                <button disabled={!agreed} onClick={()=>setOtpStep(true)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:agreed?G:'#cbd5e1',color:'#fff',fontSize:13,fontWeight:700,cursor:agreed?'pointer':'not-allowed'}}>Continue to Sign</button>
              </div>
            ):(
              <div style={{padding:'20px 24px',textAlign:'center'}}>
                <div style={{fontSize:10,color:'#374151',marginBottom:14}}>Enter the 6-digit code sent to your phone to confirm your signature</div>
                <input maxLength={6} placeholder="000000" style={{width:160,padding:'12px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:18,textAlign:'center',letterSpacing:6,marginBottom:14}}/>
                <button onClick={()=>setSigningDoc(null)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Apply Signature</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Every signature event is timestamped and stored in an encrypted, tamper-proof audit trail.','OTP verification prevents anyone but you from applying your signature -- even with device access.','Unsigned high-urgency documents auto-remind daily until acknowledged.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Preview Document',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

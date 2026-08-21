// FILE: AccessControlPage.jsx - Access Control
// (System Administration > User & Access)
// Field-level masking + MFA -- reuses the EXISTING mfa_enrollment
// (Security Risk session) directly, never a second MFA tracking table.
// Distinct from Role & Permission (which roles exist and what they
// can broadly do) -- this is the field-level masking and ad-hoc
// access-request layer underneath those roles.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const MASKED_FIELDS = [
  {field:'National ID / Citizenship Number',masked_for:'All roles except HR Manager, Super Admin',sample:'XXXX-XXXX-1234'},
  {field:'Bank Account Details',masked_for:'All roles except HR Manager, Finance',sample:'****6789'},
  {field:'Salary (Company Directory View)',masked_for:'Non-payroll roles',sample:'Hidden'},
]

const ACCESS_REQUESTS = [
  {requester:'Sunil Magar',resource:'Cross-team project dashboard -- Marketing',status:'pending_approval',approver:'Gita Maharjan'},
  {requester:'Bikash Rai',resource:'Vendor Billing read access (temporary, 14 days)',status:'approved',approver:'Hari Thapa'},
]

export default function AccessControlPage() {
  const [search, setSearch] = useState('')
  const [showRequest, setShowRequest] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = ACCESS_REQUESTS.filter(a=>!search||a.requester.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔐" title="Access Control"
        breadcrumb="System Administration > User & Access"
        gradient={G}
        stats={[
          {icon:'🔐',label:'MFA Adoption',  value:'76%'},
          {icon:'🛡',label:'Masked Field Types',  value:MASKED_FIELDS.length},
          {icon:'⏳',label:'Pending Requests',        value:ACCESS_REQUESTS.filter(a=>a.status==='pending_approval').length},
          {icon:'⏱',label:'Temporary Grants Active',      value:ACCESS_REQUESTS.filter(a=>a.resource.includes('temporary')).length},
        ]}
        onAdd={()=>setShowRequest(true)} addLabel="Request Access"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🛡</span>
        <div style={{flex:1,minWidth:200}}><strong>Masked by Default, Visible by Exception:</strong> National IDs, bank details, and salary figures stay masked everywhere except the specific roles that genuinely need them -- nobody has to remember to hide sensitive data, because it was never shown to begin with.</div>
      </div>

      <div style={{display:'grid',gap:14,marginBottom:18}}>
        {MASKED_FIELDS.map((m,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{m.field}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>Masked for: {m.masked_for}</div>
            </div>
            <span style={{fontFamily:'monospace',fontSize:10,color:'#94a3b8',background:'#f8fafc',padding:'4px 10px',borderRadius:8}}>{m.sample}</span>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search access requests..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map((a,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.requester,...a}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{a.requester}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{a.resource} . Approver: {a.approver}</div>
            </div>
            <span style={{background:a.status==='approved'?'#f0fdf4':'#fffbeb',color:a.status==='approved'?'#15803d':'#b45309',fontSize:8,fontWeight:700,padding:'3px 10px',borderRadius:20}}>
              {a.status==='approved'?'✓ Approved':'⏳ Pending'}
            </span>
          </div>
        ))}
      </div>

      {showRequest&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowRequest(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Request Access</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Resource Needed" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <Field label="Reason" type="textarea" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Duration" type="select" value="" onChange={()=>{}} accent={A} options={['Permanent','30 days','14 days','7 days']}/>
              <button onClick={()=>setShowRequest(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit for Approval</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Temporary grants expire automatically at the end of the requested duration -- never a forgotten exception that quietly becomes permanent.','MFA enforcement applies in the background -- a push notification to confirm, never a disruptive extra login screen.','Access requests route to the requester\'s actual manager, never a generic admin queue with no context.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

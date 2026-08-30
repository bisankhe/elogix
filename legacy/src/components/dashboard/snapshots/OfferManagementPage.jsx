// FILE: OfferManagementPage.jsx — Offer Management
// Role-based: Recruiter (draft/send) | Hiring Manager (propose) | Approver (approve) | Candidate (sign)
import { useState } from 'react'
import { ExcelModal, PageHeader, SearchBar, ContextMenu, Drawer } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const OFFERS = [
  { id:'of1', candidate:'Gita Maharjan', position:'Cloud Architect', dept:'IT', grade:'G7',
    status:'signed', proposed_by:'Rajesh Sharma', proposed_salary:185000,
    allowances:{housing:20000,transport:8000,medical:5000}, total_ctc:218000,
    start_date:'2025-08-01', offer_date:'2025-06-22', expiry_date:'2025-07-01',
    approval_chain:[
      {role:'Hiring Manager',by:'Rajesh Sharma',status:'approved',date:'2025-06-22'},
      {role:'Finance',by:'Sanjay Karki',status:'approved',date:'2025-06-23'},
      {role:'HR Director',by:'Priya Adhikari',status:'approved',date:'2025-06-23'},
    ],
    digital_signed:true, signed_date:'2025-06-25',
    bgv_status:'clear', negotiation_notes:'Candidate accepted without counter-offer.',
    impact_links:['Employee Joining','Account Creation','Payroll'] },
  { id:'of2', candidate:'Rajan Shrestha', position:'Senior SW Dev', dept:'IT', grade:'G6',
    status:'pending_candidate', proposed_by:'Rajesh Sharma', proposed_salary:110000,
    allowances:{housing:12000,transport:6000,medical:4000}, total_ctc:132000,
    start_date:'2025-08-15', offer_date:'2025-06-24', expiry_date:'2025-07-05',
    approval_chain:[
      {role:'Hiring Manager',by:'Rajesh Sharma',status:'approved',date:'2025-06-24'},
      {role:'Finance',by:'Sanjay Karki',status:'approved',date:'2025-06-24'},
      {role:'HR Director',by:'Priya Adhikari',status:'approved',date:'2025-06-24'},
    ],
    digital_signed:false, signed_date:null,
    bgv_status:'in_progress', negotiation_notes:'Offer sent. Awaiting candidate response by Jul 5.',
    impact_links:['Employee Joining','Account Creation'] },
  { id:'of3', candidate:'Maya Pradhan', position:'Finance Manager', dept:'Finance', grade:'G7',
    status:'pending_finance', proposed_by:'Anil Pandey', proposed_salary:148000,
    allowances:{housing:18000,transport:7000,medical:5000}, total_ctc:178000,
    start_date:'2025-08-01', offer_date:'2025-06-26', expiry_date:'2025-07-10',
    approval_chain:[
      {role:'Hiring Manager',by:'Anil Pandey',status:'approved',date:'2025-06-26'},
      {role:'Finance',by:'Sanjay Karki',status:'pending',date:null},
      {role:'HR Director',by:'Priya Adhikari',status:'waiting',date:null},
    ],
    digital_signed:false, signed_date:null,
    bgv_status:'flag', negotiation_notes:'BGV flag raised. Finance approval pending.',
    impact_links:['Background Verification','Finance'] },
  { id:'of4', candidate:'Sita Khadka', position:'HR Business Partner', dept:'HR', grade:'G5',
    status:'draft', proposed_by:'Priya Adhikari', proposed_salary:95000,
    allowances:{housing:10000,transport:5000,medical:3000}, total_ctc:113000,
    start_date:'2025-09-01', offer_date:null, expiry_date:null,
    approval_chain:[
      {role:'Hiring Manager',by:'Priya Adhikari',status:'pending',date:null},
      {role:'Finance',by:'Sanjay Karki',status:'waiting',date:null},
      {role:'HR Director',by:'Priya Adhikari',status:'waiting',date:null},
    ],
    digital_signed:false, signed_date:null,
    bgv_status:'clear', negotiation_notes:'Draft ready for review.',
    impact_links:['Background Verification','Employee Joining'] },
]

const STATUS_CFG = {
  draft:             {c:'#94a3b8',bg:'#f8fafc',b:'#e2e8f0',icon:'📝',label:'Draft'},
  pending_hiring_mgr:{c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'👔',label:'Pending Hiring Mgr'},
  pending_finance:   {c:'#3b82f6',bg:'#eff6ff',b:'#bfdbfe',icon:'💰',label:'Pending Finance'},
  pending_hr:        {c:'#8b5cf6',bg:'#f5f3ff',b:'#c4b5fd',icon:'👥',label:'Pending HR'},
  pending_candidate: {c:'#f97316',bg:'#fff7ed',b:'#fed7aa',icon:'📧',label:'Sent to Candidate'},
  negotiating:       {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'🤝',label:'Negotiating'},
  signed:            {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',icon:'✅',label:'Signed'},
  declined:          {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',icon:'❌',label:'Declined'},
}

const ROLE_VIEWS = [
  {id:'recruiter',  label:'Recruiter / TA', icon:'👤'},
  {id:'hiring_mgr', label:'Hiring Manager',  icon:'👔'},
  {id:'approver',   label:'Approver',        icon:'✅'},
  {id:'candidate',  label:'Candidate View',  icon:'📧'},
]

export default function OfferManagementPage() {
  const [offers, setOffers]     = useState(OFFERS)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [roleView, setRoleView] = useState('recruiter')
  const [showAdd, setShowAdd]   = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [selected, setSelected] = useState(null)
  const [ctx, setCtx]           = useState(null)
  const [msg, setMsg]           = useState('')
  const [noteModal, setNoteModal] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [form, setForm]         = useState({candidate:'',position:'',dept:'IT',grade:'G3',salary:'',housing:'',transport:'',medical:'',start_date:'',expiry_date:'',notes:''})
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = offers.filter(o=>{
    if (filter!=='all'&&o.status!==filter) return false
    if (search&&!o.candidate.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const approveOffer = (offerId) => {
    setOffers(prev=>prev.map(o=>{
      if(o.id!==offerId) return o
      const chain = [...o.approval_chain]
      const pendingIdx = chain.findIndex(s=>s.status==='pending')
      if(pendingIdx>=0){
        chain[pendingIdx]={...chain[pendingIdx],status:'approved',date:new Date().toISOString().split('T')[0]}
        if(pendingIdx+1<chain.length) chain[pendingIdx+1]={...chain[pendingIdx+1],status:'pending'}
      }
      const allApproved = chain.every(s=>s.status==='approved')
      return {...o,approval_chain:chain,status:allApproved?'pending_candidate':o.status}
    }))
    notify('✅ Offer approved — next approver notified')
    setNoteModal(null)
  }

  const sendToCandidate = (offer) => {
    setOffers(prev=>prev.map(o=>o.id===offer.id?{...o,status:'pending_candidate',offer_date:new Date().toISOString().split('T')[0]}:o))
    notify('📧 Offer sent to '+offer.candidate+' via Email + WhatsApp + Portal')
  }

  const signOffer = (offerId) => {
    setOffers(prev=>prev.map(o=>o.id===offerId?{...o,status:'signed',digital_signed:true,signed_date:new Date().toISOString().split('T')[0]}:o))
    notify('✅ Offer digitally signed! Employee joining triggered.')
  }

  const pendingCount = offers.filter(o=>!['signed','declined'].includes(o.status)).length
  const signedCount  = offers.filter(o=>o.status==='signed').length
  const totalCTC     = offers.reduce((s,o)=>s+o.total_ctc,0)

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="📋" title="Offer Management"
        breadcrumb="Employee Lifecycle > Recruitment > Offer Management"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total Offers',   value:offers.length},
          {icon:'⏳',label:'In Progress',    value:pendingCount},
          {icon:'✅',label:'Signed',          value:signedCount},
          {icon:'💰',label:'Total CTC/mo',   value:'NPR '+(totalCTC/100000).toFixed(1)+'L'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ Draft Offer"
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      {/* Role view switcher */}
      <div style={{display:'flex',gap:2,background:'#f1f5f9',padding:4,borderRadius:12,marginBottom:14,width:'fit-content'}}>
        {ROLE_VIEWS.map(r=>(
          <button key={r.id} onClick={()=>setRoleView(r.id)}
            style={{padding:'8px 16px',borderRadius:9,border:'none',cursor:'pointer',fontSize:10,
              background:roleView===r.id?'#fff':'transparent',color:roleView===r.id?A:'#64748b',
              fontWeight:roleView===r.id?700:400,boxShadow:roleView===r.id?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {r.icon} {r.label}
          </button>
        ))}
      </div>

      {/* Role guidance banner */}
      <div style={{background:`${A}08`,border:`1px solid ${A}22`,borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#064e3b'}}>
        {roleView==='recruiter'&&'👤 Recruiter: Draft and customize offer letters using templates. Input salary, allowances, start date. Submit through approval routing. Send final digital offer and track signature.'}
        {roleView==='hiring_mgr'&&'👔 Hiring Manager: Review and propose the initial compensation package. Initiate and participate in multi-step approval workflow. Confirm role expectations before offer.'}
        {roleView==='approver'&&'✅ Approver (Finance / Dept Head / HR Director): Review budget compliance, job level, and salary limits. Approve or reject the pending offer electronically.'}
        {roleView==='candidate'&&'📧 Candidate View: View the finalized offer letter. Negotiate terms or accept and digitally sign to confirm joining.'}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by candidate name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','draft','pending_finance','pending_candidate','signed'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 10px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,
                background:filter===s?'#fff':'transparent',color:filter===s?A:'#64748b',
                fontWeight:filter===s?700:400,boxShadow:filter===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(o=>{
          const sc = STATUS_CFG[o.status]||STATUS_CFG.draft
          const pendingStep = o.approval_chain.find(s=>s.status==='pending')
          const approvedSteps = o.approval_chain.filter(s=>s.status==='approved').length

          return (
            <div key={o.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:o.candidate,...o}})}}
              style={{background:'#fff',borderRadius:14,border:`1px solid ${sc.b}`,boxShadow:'0 2px 10px rgba(0,0,0,.04)',borderLeft:`5px solid ${sc.c}`}}>

              {/* Header */}
              <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{o.candidate}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {o.bgv_status==='flag'&&<span style={{background:'#fffbeb',color:'#b45309',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>⚠️ BGV Flag</span>}
                    {o.digital_signed&&<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>✍️ Digitally Signed</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{o.position} · {o.dept} · {o.grade} · Proposed by: {o.proposed_by}</div>
                  {o.offer_date&&<div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Offer Date: {o.offer_date} · Expiry: {o.expiry_date||'TBD'} · Start: {o.start_date}</div>}
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:A}}>NPR {o.total_ctc.toLocaleString()}<span style={{fontSize:9,fontWeight:400,color:'#94a3b8'}}>/mo CTC</span></div>
                  <div style={{fontSize:10,color:'#64748b'}}>Base: {o.proposed_salary.toLocaleString()} + Allowances</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}>
                {/* CTC breakdown */}
                <div style={{padding:'12px 18px',borderRight:'1px solid #f1f5f9'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:8}}>💰 Compensation Package</div>
                  {[['Base Salary',o.proposed_salary],['Housing Allowance',o.allowances.housing],['Transport Allowance',o.allowances.transport],['Medical Allowance',o.allowances.medical]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #f8fafc',fontSize:10}}>
                      <span style={{color:'#64748b'}}>{l}</span>
                      <span style={{fontWeight:700,color:'#0f172a'}}>NPR {v.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',fontSize:11,fontWeight:800,color:A}}>
                    <span>Total CTC/mo</span>
                    <span>NPR {o.total_ctc.toLocaleString()}</span>
                  </div>
                </div>
                {/* Approval chain */}
                <div style={{padding:'12px 18px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:8}}>Approval Chain ({approvedSteps}/{o.approval_chain.length})</div>
                  {o.approval_chain.map((step,i)=>(
                    <div key={i} style={{display:'flex',gap:8,alignItems:'center',marginBottom:6,padding:'6px 8px',borderRadius:8,
                      background:step.status==='approved'?'#f0fdf4':step.status==='pending'?`${A}08`:'#f8fafc',
                      border:`1px solid ${step.status==='approved'?'#bbf7d0':step.status==='pending'?A+'33':'#f1f5f9'}`}}>
                      <div style={{width:20,height:20,borderRadius:'50%',background:step.status==='approved'?'#10b981':step.status==='pending'?A:'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:900,flexShrink:0}}>
                        {step.status==='approved'?'✓':i+1}
                      </div>
                      <div style={{flex:1,fontSize:9}}>
                        <div style={{fontWeight:700,color:'#374151'}}>{step.role} — {step.by}</div>
                        {step.date&&<div style={{color:'#94a3b8'}}>{step.date}</div>}
                        {step.status==='waiting'&&<div style={{color:'#94a3b8'}}>Waiting...</div>}
                      </div>
                      {step.status==='pending'&&(roleView==='approver'||roleView==='recruiter')&&(
                        <button onClick={()=>approveOffer(o.id)} style={{padding:'3px 9px',borderRadius:6,border:'none',background:A,color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer',flexShrink:0}}>✅</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {o.negotiation_notes&&<div style={{padding:'8px 18px',fontSize:10,color:'#475569',fontStyle:'italic',borderTop:'1px solid #f8fafc'}}>📝 {o.negotiation_notes}</div>}

              {/* Footer actions */}
              <div style={{padding:'10px 16px',borderTop:'1px solid #f1f5f9',display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                <button onClick={()=>setSelected(o)} style={{padding:'6px 12px',borderRadius:7,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>👁 View</button>
                {/* Recruiter actions */}
                {roleView==='recruiter'&&o.status!=='signed'&&o.status!=='declined'&&(
                  <>
                    <button onClick={()=>notify('📄 Offer letter generated from template for '+o.candidate)} style={{padding:'6px 12px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>📄 Generate Letter</button>
                    {o.approval_chain.every(s=>s.status==='approved')&&<button onClick={()=>sendToCandidate(o)} style={{padding:'6px 12px',borderRadius:7,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📧 Send to Candidate</button>}
                  </>
                )}
                {/* Approver actions */}
                {roleView==='approver'&&pendingStep&&(
                  <button onClick={()=>approveOffer(o.id)} style={{padding:'6px 12px',borderRadius:7,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✅ Approve: {pendingStep.role}</button>
                )}
                {/* Candidate actions */}
                {roleView==='candidate'&&o.status==='pending_candidate'&&(
                  <>
                    <button onClick={()=>signOffer(o.id)} style={{padding:'6px 12px',borderRadius:7,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✍️ Accept & Sign</button>
                    <button onClick={()=>notify('🤝 Counter-offer request sent to HR for '+o.candidate)} style={{padding:'6px 12px',borderRadius:7,border:'1px solid #f59e0b',background:'#fffbeb',color:'#b45309',fontSize:10,cursor:'pointer'}}>🤝 Negotiate</button>
                    <button onClick={()=>{setOffers(prev=>prev.map(x=>x.id===o.id?{...x,status:'declined'}:x));notify('❌ Offer declined by candidate')}} style={{padding:'6px 12px',borderRadius:7,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:10,cursor:'pointer'}}>❌ Decline</button>
                  </>
                )}
                {/* Notify */}
                <button onClick={()=>notify('📧 Status notification sent for '+o.candidate)} style={{padding:'6px 12px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>📧 Notify</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Draft Offer Modal */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:560,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>📋 Draft Job Offer</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                {[['Candidate Name *','candidate','text'],['Position *','position','text'],
                  ['Base Salary (NPR) *','salary','number'],['Housing Allowance','housing','number'],
                  ['Transport Allowance','transport','number'],['Medical Allowance','medical','number'],
                  ['Start Date','start_date','date'],['Offer Expiry Date','expiry_date','date']].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                {[['Department','dept',['IT','Finance','HR','Operations','Sales']],
                  ['Grade','grade',['G1','G2','G3','G4','G5','G6','G7','G8']]].map(([l,f,opts])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <select value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Notes / Special Conditions</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2}
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
              {form.salary&&(
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:10,color:'#065f46'}}>
                  💰 Total CTC: NPR {(parseInt(form.salary||0)+parseInt(form.housing||0)+parseInt(form.transport||0)+parseInt(form.medical||0)).toLocaleString()}/mo
                </div>
              )}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.candidate||!form.position||!form.salary){notify('⚠️ Candidate, position and salary required');return}
                  const base=parseInt(form.salary)||0
                  const hou=parseInt(form.housing)||0
                  const tra=parseInt(form.transport)||0
                  const med=parseInt(form.medical)||0
                  setOffers(prev=>[...prev,{
                    id:'of'+Date.now(),candidate:form.candidate,position:form.position,
                    dept:form.dept,grade:form.grade,status:'draft',
                    proposed_by:'Current User',proposed_salary:base,
                    allowances:{housing:hou,transport:tra,medical:med},
                    total_ctc:base+hou+tra+med,
                    start_date:form.start_date||'TBD',offer_date:null,expiry_date:form.expiry_date||null,
                    approval_chain:[
                      {role:'Hiring Manager',by:'TBD',status:'pending',date:null},
                      {role:'Finance',by:'Sanjay Karki',status:'waiting',date:null},
                      {role:'HR Director',by:'Priya Adhikari',status:'waiting',date:null},
                    ],
                    digital_signed:false,signed_date:null,bgv_status:'pending',
                    negotiation_notes:form.notes||'Draft offer created.',
                    impact_links:['Employee Joining','Account Creation']
                  }])
                  notify('✅ Offer drafted for '+form.candidate+' — submitted for approval')
                  setShowAdd(false)
                  setForm({candidate:'',position:'',dept:'IT',grade:'G3',salary:'',housing:'',transport:'',medical:'',start_date:'',expiry_date:'',notes:''})
                }} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>📋 Create Offer Draft</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[{icon:'👁',label:'View',key:'view'},{icon:'✅',label:'Approve',key:'approve'},{icon:'📧',label:'Send to Candidate',key:'send'},{icon:'✍️',label:'Mark Signed',key:'sign'},{icon:'❌',label:'Decline',key:'decline',danger:true}]} onAction={(k,item)=>{if(k==='view')setSelected(item);if(k==='approve')approveOffer(item.id);if(k==='sign')signOffer(item.id)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Offer Management" columns={['Candidate','Position','Dept','Grade','Status','Base Salary','Total CTC','Offer Date','Start Date','Signed']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Candidate',selected?.candidate],['Position',selected?.position],['Department',selected?.dept],
        ['Grade',selected?.grade],['Status',selected?.status],
        ['Base Salary','NPR '+(selected?.proposed_salary||0).toLocaleString()],
        ['Total CTC','NPR '+(selected?.total_ctc||0).toLocaleString()+'/mo'],
        ['Start Date',selected?.start_date],['Offer Date',selected?.offer_date||'Draft'],
        ['Signed',selected?.digital_signed?'Yes — '+selected.signed_date:'Not yet'],
        ['BGV Status',selected?.bgv_status],['Notes',selected?.negotiation_notes],
      ]}/>
    </div>
  )
}

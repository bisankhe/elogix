// FILE: OfferAcceptancePage.jsx — Offer Acceptance (Preboarding)
// Secure digital offer package, OTP verification, audit trail, auto-conversion to employee record
// Nepal: Electronic Transactions Act 2063 grants e-signature legal validity equal to physical signature

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const OFFERS = [
  { id:'oa1', code:'OFR-2025-014', candidate:'Sunita Rai', candidate_nepali:'सुनिता राई',
    position:'Senior Software Developer', department:'IT', branch:'KTM HQ',
    employment_type:'regular', salary_npr:95000, probation_months:6,
    offer_sent:'2025-06-10', deadline:'2025-06-20', days_left:2,
    status:'pending_response', otp_verified:false, viewed_count:3, last_viewed:'2025-06-16',
    docusign_status:'sent', audit_trail:[
      {event:'Offer Generated', date:'2025-06-10 09:12', by:'Priya Adhikari (HR)'},
      {event:'Email Sent', date:'2025-06-10 09:15', by:'System'},
      {event:'Link Opened', date:'2025-06-11 14:30', by:'Candidate'},
      {event:'Link Opened', date:'2025-06-14 11:05', by:'Candidate'},
    ],
    ai_score:88, ai_note:'High engagement (3 views). Likely to accept. Consider follow-up call if no response by deadline.',
    impact_links:['Digital Forms & E-sign','Document Collection','Joining Checklist','Candidate Database'] },
  { id:'oa2', code:'OFR-2025-015', candidate:'Gita Maharjan', candidate_nepali:'गीता महर्जन',
    position:'Cloud Architect', department:'IT', branch:'KTM HQ',
    employment_type:'regular', salary_npr:180000, probation_months:6,
    offer_sent:'2025-06-08', deadline:'2025-06-18', days_left:0,
    status:'accepted', otp_verified:true, viewed_count:5, last_viewed:'2025-06-12',
    docusign_status:'completed', accepted_date:'2025-06-12', accepted_otp:'847291',
    audit_trail:[
      {event:'Offer Generated', date:'2025-06-08 10:00', by:'Priya Adhikari (HR)'},
      {event:'Email + SMS Sent', date:'2025-06-08 10:02', by:'System'},
      {event:'Link Opened', date:'2025-06-09 08:15', by:'Candidate'},
      {event:'OTP Verified', date:'2025-06-12 16:40', by:'Candidate (98XXXXXX21)'},
      {event:'Offer Accepted', date:'2025-06-12 16:42', by:'Candidate'},
      {event:'Employee ID Generated', date:'2025-06-12 16:43', by:'System (HRIM Auto-Sync)'},
    ],
    ai_score:100, ai_note:'Accepted within 4 days. Employee ID EMP-2081-0142 auto-generated. Preboarding workflow triggered.',
    employee_id:'EMP-2081-0142',
    impact_links:['Digital Forms & E-sign','Document Collection','Joining Checklist','Biometric Capture'] },
  { id:'oa3', code:'OFR-2025-013', candidate:'Dipak Thapa', candidate_nepali:'दिपक थापा',
    position:'Finance Manager', department:'Finance', branch:'KTM HQ',
    employment_type:'regular', salary_npr:145000, probation_months:6,
    offer_sent:'2025-06-01', deadline:'2025-06-11', days_left:-5,
    status:'expired', otp_verified:false, viewed_count:1, last_viewed:'2025-06-02',
    docusign_status:'expired',
    audit_trail:[
      {event:'Offer Generated', date:'2025-06-01 09:00', by:'Priya Adhikari (HR)'},
      {event:'Email Sent', date:'2025-06-01 09:02', by:'System'},
      {event:'Link Opened', date:'2025-06-02 19:20', by:'Candidate'},
      {event:'Deadline Passed', date:'2025-06-11 23:59', by:'System'},
    ],
    ai_score:22, ai_note:'EXPIRED: Single view, no response. Likely accepted competing offer. Recommend reopening vacancy.',
    impact_links:['Vacancy Management','Candidate Database'] },
  { id:'oa4', code:'OFR-2025-016', candidate:'Maya Pradhan', candidate_nepali:'माया प्रधान',
    position:'HR Business Partner', department:'HR', branch:'KTM HQ',
    employment_type:'regular', salary_npr:108000, probation_months:6,
    offer_sent:'2025-06-15', deadline:'2025-06-25', days_left:7,
    status:'declined', otp_verified:false, viewed_count:2, last_viewed:'2025-06-16',
    docusign_status:'declined', declined_reason:'Accepted offer from another company with higher compensation.',
    audit_trail:[
      {event:'Offer Generated', date:'2025-06-15 11:00', by:'Priya Adhikari (HR)'},
      {event:'Email Sent', date:'2025-06-15 11:02', by:'System'},
      {event:'Link Opened', date:'2025-06-16 09:10', by:'Candidate'},
      {event:'Offer Declined', date:'2025-06-16 09:25', by:'Candidate', note:'Reason provided'},
    ],
    ai_score:15, ai_note:'Declined — compensation gap. AI suggests benchmarking salary band against market rate.',
    impact_links:['Vacancy Management','Recruitment Analytics'] },
]

const STATUS_CFG = {
  pending_response: {c:'#f59e0b', bg:'#fffbeb', b:'#fde68a', icon:'⏳', label:'Pending Response'},
  accepted:          {c:'#10b981', bg:'#f0fdf4', b:'#bbf7d0', icon:'✅', label:'Accepted'},
  declined:          {c:'#ef4444', bg:'#fef2f2', b:'#fecaca', icon:'❌', label:'Declined'},
  expired:           {c:'#94a3b8', bg:'#f8fafc', b:'#e2e8f0', icon:'⌛', label:'Expired'},
}

const CTX = [
  {icon:'👁',label:'View Offer Package',     key:'view'},
  {icon:'📧',label:'Resend Offer',           key:'resend'},
  {icon:'📞',label:'Follow-up Call Reminder',key:'followup'},
  {icon:'📋',label:'View Audit Trail',       key:'audit'},
  {icon:'🔗',label:'Impact Analysis',        key:'impact'},
  {icon:'📤',label:'Export',                 key:'export'},
  {icon:'🚫',label:'Withdraw Offer',         key:'withdraw',danger:true},
]

export default function OfferAcceptancePage() {
  const [offers, setOffers]       = useState(OFFERS)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [selected, setSelected]   = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)

  const filtered = offers.filter(o=>{
    if (filterStatus!=='all'&&o.status!==filterStatus) return false
    if (search&&!o.candidate.toLowerCase().includes(search.toLowerCase())&&!o.position.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pending  = offers.filter(o=>o.status==='pending_response').length
  const accepted = offers.filter(o=>o.status==='accepted').length
  const acceptRate = Math.round(accepted/offers.filter(o=>o.status!=='pending_response').length*100) || 0

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📝" title="Offer Acceptance"
        breadcrumb="Employee Lifecycle > Onboarding > Preboarding"
        gradient={G}
        stats={[
          {icon:'📝',label:'Total Offers',    value:offers.length},
          {icon:'⏳',label:'Pending Response',value:pending},
          {icon:'✅',label:'Accepted',         value:accepted},
          {icon:'📊',label:'Acceptance Rate',  value:acceptRate+'%'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Generate Offer"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#065f46'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Compliance:</strong> Electronic Transactions Act 2063 — digital acceptance holds equal legal validity to physical signature. Written employment contract per Labour Act 2074 Section 10 follows in Digital Forms & E-sign step.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by candidate, position..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','pending_response','accepted','declined','expired'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(o=>{
          const sc = STATUS_CFG[o.status]||STATUS_CFG.pending_response
          return (
            <div key={o.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:o.candidate,...o}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.b}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>

              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📝</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:3,alignItems:'center'}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{o.candidate}</span>
                    <span style={{fontSize:10,color:'#94a3b8',fontStyle:'italic'}}>{o.candidate_nepali}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {o.otp_verified&&<span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>OTP Verified</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{o.code} · {o.position} · {o.department} · {o.branch}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Sent {o.offer_sent} · Deadline {o.deadline} {o.days_left>=0?`(${o.days_left}d left)`:'(expired)'}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:A}}>NPR {(o.salary_npr/1000).toFixed(0)}K</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>MONTHLY</div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>Probation: {o.probation_months}mo</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:0,padding:'12px 20px',borderBottom:'1px solid #f8fafc'}}>
                {[{l:'Views',v:o.viewed_count,c:'#3b82f6'},
                  {l:'AI Score',v:o.ai_score,c:o.ai_score>=70?'#10b981':o.ai_score>=40?'#f59e0b':'#ef4444'},
                  {l:'e-Sign',v:o.docusign_status,c:'#8b5cf6'},
                  {l:'Last Viewed',v:o.last_viewed,c:'#64748b'},
                ].map((s,i)=>(
                  <div key={i} style={{textAlign:'center'}}>
                    <div style={{fontSize:13,fontWeight:900,color:s.c,textTransform:'capitalize'}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                  </div>
                ))}
              </div>

              {o.employee_id&&(
                <div style={{padding:'8px 20px',background:'#eff6ff',fontSize:10,color:'#1d4ed8',fontWeight:700}}>
                  Employee ID Generated: {o.employee_id} — Preboarding workflow active
                </div>
              )}
              {o.declined_reason&&(
                <div style={{padding:'8px 20px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}>
                  Decline reason: {o.declined_reason}
                </div>
              )}

              <div style={{padding:'10px 20px',fontSize:10,color:'#64748b',fontStyle:'italic',background:'#f8fafc'}}>🤖 {o.ai_note}</div>

              <div style={{padding:'8px 14px',display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button onClick={()=>setSelected(o)} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#f0fdf4',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>View Audit Trail</button>
                {o.status==='pending_response'&&<button style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Resend</button>}
                {o.status==='expired'&&<button style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#f59e0b',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Reopen Vacancy</button>}
              </div>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Generate Offer Letter</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Candidate</label><select value={form.candidate||''} onChange={e=>setForm(p=>({...p,candidate:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Sunita Rai','Hari Adhikari','Sita Khadka'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Position</label><input type="text" value={form.position||''} onChange={e=>setForm(p=>({...p,position:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Employment Type</label><select value={form.employment_type||''} onChange={e=>setForm(p=>({...p,employment_type:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['regular','time_bound','work_based','part_time','casual'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Monthly Salary (NPR)</label><input type="number" value={form.monthly_salary_npr||''} onChange={e=>setForm(p=>({...p,monthly_salary_npr:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Probation Months</label><select value={form.probation_months||''} onChange={e=>setForm(p=>({...p,probation_months:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['1','2','3','4','5','6'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Response Deadline</label><input type="date" value={form.response_deadline||''} onChange={e=>setForm(p=>({...p,response_deadline:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
              </div>
              <AIImpact color={A} lines={['Offer link includes embedded OTP verification on acceptance.','Audit trail records every view, open, and action with timestamp.','Auto-deadline reminders sent at 3 days and 1 day remaining.','Acceptance auto-generates Employee ID and triggers Preboarding chain.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Generate & Send</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Save Draft</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={(k,item)=>{if(k==='view'||k==='audit')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Offer Acceptance" columns={['Code','Candidate','Position','Department','Salary NPR','Status','Sent Date','Deadline','Accepted Date']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Offer Code',selected?.code],['Candidate',selected?.candidate],['Position',selected?.position],
        ['Salary','NPR '+(selected?.salary_npr||0)],['Status',selected?.status],
        ['Sent',selected?.offer_sent],['Deadline',selected?.deadline],
        ['Audit Trail',selected?.audit_trail?.map(a=>`${a.date} — ${a.event} (${a.by})`).join('\n')],
        ['AI Note',selected?.ai_note],
      ]}/>
    </div>
  )
}

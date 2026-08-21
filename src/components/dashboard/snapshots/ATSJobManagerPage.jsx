// FILE: ATSJobManagerPage.jsx
// World-class ATS — Job Manager: Create, AI JD Gen, Multi-platform publish, approval workflow

import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const G  = 'linear-gradient(135deg,#065f46 0%,#047857 60%,#059669 100%)'
const GA = 'linear-gradient(135deg,#047857,#10b981)'
const P  = '#047857'
const VK = ''

const PLATFORMS = [
  { id:'company',   name:'Company Career Portal',  icon:'🌐', color:'#4338ca', active:true  },
  { id:'linkedin',  name:'LinkedIn Jobs',           icon:'💼', color:'#0077b5', active:true  },
  { id:'indeed',    name:'Indeed',                  icon:'🔵', color:'#003a9b', active:true  },
  { id:'facebook',  name:'Facebook Jobs',           icon:'📘', color:'#1877f2', active:false },
  { id:'instagram', name:'Instagram',               icon:'📸', color:'#e1306c', active:false },
  { id:'twitter',   name:'X (Twitter)',             icon:'🐦', color:'#000000', active:false },
  { id:'naukri',    name:'Naukri',                  icon:'🟠', color:'#ef4444', active:true  },
  { id:'glassdoor', name:'Glassdoor',               icon:'🟢', color:'#0caa41', active:false },
  { id:'google',    name:'Google Jobs',             icon:'🔍', color:'#4285f4', active:true  },
  { id:'merojob',   name:'MeroJob (Nepal)',         icon:'🇳🇵', color:'#dc2626', active:true  },
  { id:'jobaxle',   name:'JobAxle',                 icon:'⚙️', color:'#7c3aed', active:false },
  { id:'internal',  name:'Internal Portal',         icon:'🏢', color:'#64748b', active:true  },
]

const ACTIVE_JOBS = [
  { id:'j1', code:'JR-2024-001', title:'Senior Software Engineer', dept:'Engineering', status:'Published', openings:3, applied:127, platforms:['LinkedIn','Indeed','Company Portal','Google Jobs'], posted:'2024-01-15', deadline:'2024-02-15', priority:'High',   salary:'NPR 80K-120K', ai_jd:true  },
  { id:'j2', code:'JR-2024-002', title:'Finance Manager',          dept:'Finance',     status:'Published', openings:1, applied:84,  platforms:['LinkedIn','Indeed','Naukri'],                    posted:'2024-01-19', deadline:'2024-02-20', priority:'High',   salary:'NPR 90K-130K', ai_jd:true  },
  { id:'j3', code:'JR-2024-003', title:'HR Business Partner',      dept:'HR',          status:'Draft',     openings:2, applied:0,   platforms:[],                                               posted:'—',          deadline:'2024-02-28', priority:'Medium', salary:'NPR 70K-100K', ai_jd:false },
  { id:'j4', code:'JR-2024-004', title:'Product Manager',          dept:'Product',     status:'Approval',  openings:1, applied:56,  platforms:['LinkedIn','Indeed'],                            posted:'2024-01-22', deadline:'2024-03-01', priority:'High',   salary:'NPR 100K-150K',ai_jd:true  },
  { id:'j5', code:'JR-2024-005', title:'DevOps Engineer',          dept:'IT',          status:'Published', openings:2, applied:41,  platforms:['LinkedIn','Indeed','MeroJob'],                  posted:'2024-01-12', deadline:'2024-02-18', priority:'Medium', salary:'NPR 85K-115K', ai_jd:true  },
]

const APPROVAL_STAGES = ['Dept Head Approval', 'Finance / Budget Approval', 'HR Director Approval', 'CEO Approval (if applicable)']

const DEPTS = ['Engineering','Finance','HR','Product','IT','Marketing','Sales','Operations','Legal','Admin']
const JOB_TYPES = ['Full-time','Part-time','Contract','Internship','Remote','Hybrid']
const EXP_LEVELS = ['Entry Level (0-2 yrs)','Mid Level (3-5 yrs)','Senior (6-10 yrs)','Lead (10+ yrs)','Executive']

function PlatformBadge({ name }) {
  const p = PLATFORMS.find(x => x.name === name)
  return <span style={{ fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:8, background:p?`${p.color}15`:'#f1f5f9', color:p?.color||'#64748b', border:`1px solid ${p?.color||'#e2e8f0'}20` }}>{p?.icon} {name}</span>

function StatusBadge({ status }) {
  const cfg = { Published:['#f0fdf4','#15803d'], Draft:['#fef9c3','#854d0e'], Approval:['#dbeafe','#1e40af'], Closed:['#fee2e2','#dc2626'] }
  const [bg,cl] = cfg[status]||['#f8fafc','#64748b']
  return <span style={{ fontSize:8, fontWeight:800, padding:'2px 8px', borderRadius:8, background:bg, color:cl }}>{status}</span>

export default function ATSJobManagerPage() {
  const { navTo } = useApp()
  const [view, setView]           = useState('list')    // list | create | detail
  const [selJob, setSelJob]       = useState(null)
  const [genJD, setGenJD]         = useState(false)
  const [posting, setPosting]     = useState(false)
  const [msg, setMsg]             = useState('')
  const [platforms, setPlatforms] = useState(PLATFORMS)

  const [form, setForm] = useState({
    title:'', dept:'', jobType:'Full-time', expLevel:'Mid Level (3-5 yrs)',
    openings:1, salaryMin:'', salaryMax:'', currency:'NPR',
    deadline:'', priority:'Medium', remote:false,
    skills:'', responsibilities:'', requirements:'', benefits:'',
  })
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const notify = (m,ms=3000) => { setMsg(m); setTimeout(()=>setMsg(''),ms) }

  const generateJD = async () => {
    setGenJD(true)
    await new Promise(r=>setTimeout(r,2000))
    set('jd', `JOB TITLE: ${form.title || 'Software Engineer'}
DEPARTMENT: ${form.dept || 'Engineering'}
EMPLOYMENT TYPE: ${form.jobType} | EXPERIENCE: ${form.expLevel}

ABOUT THE ROLE
We are seeking an exceptional ${form.title||'professional'} to join our growing team. This is an exciting opportunity to make a meaningful impact at a dynamic, fast-growing organisation.

KEY RESPONSIBILITIES
${(form.responsibilities||'• Lead strategic initiatives and drive key outcomes\n• Collaborate with cross-functional teams to deliver projects\n• Mentor junior team members and contribute to knowledge sharing\n• Continuously improve processes and systems').split('\n').filter(Boolean).join('\n')}

REQUIRED QUALIFICATIONS
${(form.requirements||'• Relevant degree or equivalent experience\n• Strong communication and interpersonal skills\n• Proven track record of delivering results\n• Self-motivated with ability to work independently').split('\n').filter(Boolean).join('\n')}

KEY SKILLS
${form.skills ? form.skills.split(',').map(s=>`• ${s.trim()}`).join('\n') : '• Communication\n• Problem-solving\n• Team collaboration\n• Technical expertise'}

WHAT WE OFFER
${(form.benefits||'• Competitive salary: '+(form.salaryMin&&form.salaryMax?`${form.currency} ${form.salaryMin}–${form.salaryMax}/month`:'As per market standard')+'\n• Health insurance coverage\n• 18 days annual leave + 12 sick leave per year\n• Professional development opportunities\n• Provident Fund & Gratuity per Nepal Labour Act 2074').split('\n').filter(Boolean).join('\n')}

HOW TO APPLY
Apply through our official career portal or submit your updated CV with a cover letter to careers@company.com. Only shortlisted candidates will be contacted.

[AI-Generated Job Description — Review before publishing]`)
    setGenJD(false)
    notify('✅ AI Job Description generated! Review and edit before publishing.')

  const publishJob = async () => {
    const active = platforms.filter(p=>p.active)
    setPosting(true)
    await new Promise(r=>setTimeout(r,2500))
    setPosting(false)
    notify(`✅ Job posted to ${active.length} platforms! Auto-notifications sent to ${Math.floor(Math.random()*800+400)} matching candidates.`)
    setTimeout(()=>setView('list'),2000)

  const W = ({children,title}) => (
    <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0', boxShadow:'0 1px 6px rgba(0,0,0,.04)' }}>
      {title && <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:14, paddingBottom:10, borderBottom:'1px solid #f1f5f9' }}>{title}</div>}
      {children}
    </div>
  )

  const FI = ({label,value,onChange,type='text',placeholder,required,hint}) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>{label}{required&&<span style={{color:'#ef4444'}}> *</span>}</label>
      {hint && <div style={{ fontSize:9, color:'#94a3b8', marginBottom:4 }}>{hint}</div>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, outline:'none', boxSizing:'border-box' }}/>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, fontFamily:'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'18px 24px', boxShadow:'0 4px 20px rgba(4,120,87,.3)' }}>
        <div style={{ fontSize:8, color:'rgba(255,255,255,.5)', marginBottom:3, letterSpacing:1 }}>ATS · Employee Lifecycle · Recruitment & Hiring</div>
        <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>💼 Job Manager</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2 }}>AI JD Generator · Multi-platform posting · Approval workflow · Real-time tracking</div>
        <div style={{ display:'flex', gap:10, marginTop:12, alignItems:'center', flexWrap:'wrap' }}>
          {[{label:'Active Jobs',val:ACTIVE_JOBS.filter(j=>j.status==='Published').length},{label:'Total Applied',val:ACTIVE_JOBS.reduce((s,j)=>s+j.applied,0)},{label:'Pending Approval',val:1},{label:'Drafts',val:1}].map((s,i)=>(
            <div key={i} style={{ background:'rgba(255,255,255,.12)', borderRadius:10, padding:'6px 14px' }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.6)' }}>{s.label}</div>
              <div style={{ fontSize:16, fontWeight:900, color:'#fff' }}>{s.val}</div>
            </div>
          ))}
          {msg && <div style={{ marginLeft:'auto', fontSize:10, color:'rgba(255,255,255,.95)', fontWeight:700, background:'rgba(255,255,255,.15)', padding:'6px 14px', borderRadius:8 }}>{msg}</div>}
          <div style={{ marginLeft: msg?0:'auto', display:'flex', gap:8 }}>
            <button onClick={()=>setView('list')} style={{ padding:'7px 14px', borderRadius:10, border:'none', background:view==='list'?'rgba(255,255,255,.3)':'rgba(255,255,255,.1)', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>📋 All Jobs</button>
            <button onClick={()=>setView('create')} style={{ padding:'7px 14px', borderRadius:10, border:'none', background:'rgba(255,255,255,.2)', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>+ Create Job</button>
          </div>
        </div>
      </div>

      {/* ── JOB LIST ── */}
      {view==='list' && (
        <W title="💼 All Job Positions">
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Job Code','Position','Dept','Status','Openings','Applied','Platforms','Priority','Deadline','Actions'].map((h,i)=>(
                  <th key={i} style={{ padding:'9px 10px', textAlign:i<=1?'left':'center', fontSize:9, fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACTIVE_JOBS.map(j=>(
                <tr key={j.id} style={{ borderBottom:'1px solid #f8fafc' }}>
                  <td style={{ padding:'10px', fontSize:9, color:'#64748b', fontFamily:'monospace' }}>{j.code}</td>
                  <td style={{ padding:'10px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#0f172a' }}>{j.title}</div>
                    <div style={{ fontSize:8, color:'#94a3b8', marginTop:2 }}>{j.salary}</div>
                  </td>
                  <td style={{ padding:'10px', textAlign:'center', fontSize:9, color:'#64748b' }}>{j.dept}</td>
                  <td style={{ padding:'10px', textAlign:'center' }}><StatusBadge status={j.status}/></td>
                  <td style={{ padding:'10px', textAlign:'center', fontSize:11, fontWeight:700 }}>{j.openings}</td>
                  <td style={{ padding:'10px', textAlign:'center', fontSize:12, fontWeight:900, color:'#4338ca' }}>{j.applied}</td>
                  <td style={{ padding:'10px', textAlign:'center' }}>
                    <div style={{ display:'flex', gap:3, flexWrap:'wrap', justifyContent:'center', maxWidth:160 }}>
                      {j.platforms.slice(0,2).map((p,i)=><PlatformBadge key={i} name={p}/>)}
                      {j.platforms.length>2 && <span style={{ fontSize:8, color:'#94a3b8' }}>+{j.platforms.length-2}</span>}
                    </div>
                  </td>
                  <td style={{ padding:'10px', textAlign:'center' }}>
                    <span style={{ fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:8, background:j.priority==='High'?'#fef2f2':'#fffbeb', color:j.priority==='High'?'#dc2626':'#92400e' }}>{j.priority}</span>
                  </td>
                  <td style={{ padding:'10px', textAlign:'center', fontSize:9, color:'#64748b' }}>{j.deadline}</td>
                  <td style={{ padding:'10px', textAlign:'center' }}>
                    <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                      <button onClick={()=>{setSelJob(j);setView('detail')}} style={{ padding:'4px 10px', borderRadius:7, border:'none', background:'#eff6ff', color:'#1e40af', fontSize:8, fontWeight:700, cursor:'pointer' }}>View</button>
                      <button style={{ padding:'4px 8px', borderRadius:7, border:'none', background:'#f0fdf4', color:'#15803d', fontSize:8, fontWeight:700, cursor:'pointer' }}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </W>
      )}

      {/* ── CREATE JOB ── */}
      {view==='create' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <W title="📋 Job Details">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
                <FI label="Job Title" value={form.title} onChange={v=>set('title',v)} placeholder="e.g. Senior Software Engineer" required/>
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Department <span style={{color:'#ef4444'}}>*</span></label>
                  <select value={form.dept} onChange={e=>set('dept',e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, outline:'none', boxSizing:'border-box', background:'#fff' }}>
                    <option value="">Select Department</option>
                    {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Job Type</label>
                  <select value={form.jobType} onChange={e=>set('jobType',e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, outline:'none', boxSizing:'border-box', background:'#fff' }}>
                    {JOB_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Experience Level</label>
                  <select value={form.expLevel} onChange={e=>set('expLevel',e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, outline:'none', boxSizing:'border-box', background:'#fff' }}>
                    {EXP_LEVELS.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <FI label="Number of Openings" value={form.openings} onChange={v=>set('openings',v)} type="number" placeholder="1"/>
                <FI label="Application Deadline" value={form.deadline} onChange={v=>set('deadline',v)} type="date"/>
                <FI label="Salary Min" value={form.salaryMin} onChange={v=>set('salaryMin',v)} placeholder="e.g. 80000"/>
                <FI label="Salary Max" value={form.salaryMax} onChange={v=>set('salaryMax',v)} placeholder="e.g. 120000"/>
              </div>
              <FI label="Required Skills (comma separated)" value={form.skills} onChange={v=>set('skills',v)} placeholder="e.g. React, Node.js, PostgreSQL, AWS, Docker" hint="AI will use these to rank and match candidates automatically"/>
            </W>

            <W title="📝 Job Description">
              <div style={{ marginBottom:12 }}>
                <textarea value={form.responsibilities} onChange={e=>set('responsibilities',e.target.value)} rows={4} placeholder="Key Responsibilities (one per line starting with •)" style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, outline:'none', resize:'vertical', boxSizing:'border-box' }}/>
              </div>
              <div style={{ marginBottom:12 }}>
                <textarea value={form.requirements} onChange={e=>set('requirements',e.target.value)} rows={4} placeholder="Requirements & Qualifications (one per line starting with •)" style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, outline:'none', resize:'vertical', boxSizing:'border-box' }}/>
              </div>
              <div style={{ marginBottom:14 }}>
                <textarea value={form.benefits} onChange={e=>set('benefits',e.target.value)} rows={3} placeholder="Benefits & Perks (one per line)" style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, outline:'none', resize:'vertical', boxSizing:'border-box' }}/>
              </div>
              <button onClick={generateJD} disabled={genJD} style={{ padding:'10px 20px', borderRadius:10, border:'none', background:genJD?'#e2e8f0':GA, color:genJD?'#94a3b8':'#fff', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
                {genJD?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite'}}/>Generating AI JD...</>:'🤖 Generate AI Job Description'}
              </button>
            </W>

            {form.jd && (
              <W title="📄 AI-Generated Job Description — Review & Edit">
                <textarea value={form.jd} onChange={e=>set('jd',e.target.value)} rows={20} style={{ width:'100%', padding:'14px 16px', borderRadius:10, border:'1px solid #e2e8f0', fontSize:11, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'"Times New Roman",Georgia,serif', lineHeight:1.8, color:'#0f172a' }}/>
              </W>
            )}
          </div>

          {/* Sidebar: Platforms + Approval + Actions */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <W title="🌐 Publish Platforms">
              <div style={{ fontSize:9, color:'#64748b', marginBottom:12 }}>Select platforms to publish this job. Auto-notification sent to matching candidates on each platform.</div>
              {PLATFORMS.map(pl => (
                <div key={pl.id} onClick={()=>setPlatforms(p=>p.map(x=>x.id===pl.id?{...x,active:!x.active}:x))}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, border:`1.5px solid ${pl.active?pl.color:'#e2e8f0'}`, background:pl.active?`${pl.color}08`:'#fafafa', cursor:'pointer', marginBottom:6, transition:'all .15s' }}>
                  <span style={{ fontSize:16 }}>{pl.icon}</span>
                  <span style={{ flex:1, fontSize:10, fontWeight:pl.active?700:400, color:pl.active?pl.color:'#64748b' }}>{pl.name}</span>
                  <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${pl.active?pl.color:'#cbd5e1'}`, background:pl.active?pl.color:'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', flexShrink:0 }}>
                    {pl.active?'✓':''}
                  </div>
                </div>
              ))}
              <div style={{ marginTop:10, fontSize:9, color:'#94a3b8', textAlign:'center' }}>{platforms.filter(p=>p.active).length} platform{platforms.filter(p=>p.active).length!==1?'s':''} selected</div>
            </W>

            <W title="✅ Approval Workflow">
              {APPROVAL_STAGES.map((s,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:i<APPROVAL_STAGES.length-1?'1px solid #f8fafc':'' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:i===0?'#f0fdf4':i===1?'#f0fdf4':'#f8fafc', border:`2px solid ${i<2?'#10b981':'#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:i<2?'#10b981':'#94a3b8', flexShrink:0 }}>
                    {i<2?'✓':i+1}
                  </div>
                  <span style={{ fontSize:9, color:i<2?'#15803d':i===2?'#0f172a':'#94a3b8', fontWeight:i===2?700:400 }}>{s}</span>
                  {i===2&&<span style={{ fontSize:7, fontWeight:700, padding:'1px 6px', borderRadius:6, background:'#dbeafe', color:'#1e40af', marginLeft:'auto' }}>Pending</span>}
                </div>
              ))}
            </W>

            <W>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <button onClick={()=>notify('💾 Draft saved!')} style={{ padding:'10px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:11, fontWeight:600, cursor:'pointer' }}>💾 Save as Draft</button>
                <button onClick={()=>notify('📤 Submitted for approval!')} style={{ padding:'10px', borderRadius:10, border:'none', background:'#dbeafe', color:'#1e40af', fontSize:11, fontWeight:700, cursor:'pointer' }}>📤 Submit for Approval</button>
                <button onClick={publishJob} disabled={posting||!form.title.trim()} style={{ padding:'10px', borderRadius:10, border:'none', background:posting||!form.title.trim()?'#e2e8f0':G, color:'#fff', fontSize:11, fontWeight:800, cursor:posting||!form.title.trim()?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  {posting?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite'}}/>Publishing to {platforms.filter(p=>p.active).length} platforms...</>:`🚀 Publish to ${platforms.filter(p=>p.active).length} Platforms`}
                </button>
              </div>
            </W>
          </div>
        </div>
      )}

      {/* ── JOB DETAIL ── */}
      {view==='detail' && selJob && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
          <W title={`💼 ${selJob.title} (${selJob.code})`}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[{l:'Applications',v:selJob.applied,c:'#4338ca'},{l:'Shortlisted',v:Math.round(selJob.applied*.14),c:'#8b5cf6'},{l:'Salary Range',v:selJob.salary,c:'#10b981'}].map((s,i)=>(
                <div key={i} style={{ textAlign:'center', padding:'12px', background:'#f8fafc', borderRadius:10 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:9, color:'#64748b' }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
              {selJob.platforms.map((p,i)=><PlatformBadge key={i} name={p}/>)}
            </div>
            <div style={{ fontSize:10, color:'#374151', lineHeight:1.7, background:'#f8fafc', padding:'14px 16px', borderRadius:10 }}>
              <strong>{selJob.title}</strong> — {selJob.dept} Department<br/>
              Status: <StatusBadge status={selJob.status}/><br/>
              Openings: {selJob.openings} | Priority: {selJob.priority}<br/>
              Posted: {selJob.posted} | Deadline: {selJob.deadline}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button onClick={()=>navTo?.('ats-candidate-pipeline')} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:GA, color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>👥 View Candidates →</button>
              <button onClick={()=>setView('list')} style={{ padding:'10px 16px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontSize:10, cursor:'pointer' }}>← Back</button>
            </div>
            {[['Department',selJob.dept],['Openings',selJob.openings],['Priority',selJob.priority],['Posted',selJob.posted],['Deadline',selJob.deadline]].map(([l,v],i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f8fafc' }}>
                <span style={{ fontSize:9, color:'#94a3b8' }}>{l}</span>
                <span style={{ fontSize:9, fontWeight:700, color:'#0f172a' }}>{v}</span>
              </div>
            ))}
          </W>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

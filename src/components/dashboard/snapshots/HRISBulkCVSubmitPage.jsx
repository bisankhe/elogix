// FILE: HRISBulkCVSubmitPage.jsx -- HRIS Bulk CV Submission
// Multi-department vacancy management · Submit suitable CVs position-wise · Excel cover sheet
// Used by: HR Manager, Recruiter, Department Heads | Route: bulk-cv-submit
import { useState, useRef } from 'react'
import { useApp } from '../../../context/AppContext.jsx'
import { PageHeader } from './DeptSetupShared.jsx'

// ── HRIS Departments (replaces external clients)
const CLIENTS = [
  { id:'CL001', logo:'IT', name:'Information Technology',   contact:'Rajesh Sharma (CTO)',      email:'rajesh@company.com.np',  phone:'+977-9801234561', active_vacancies:4 },
  { id:'CL002', logo:'FN', name:'Finance & Accounts',       contact:'Sanjay Karki (CFO)',       email:'sanjay@company.com.np',  phone:'+977-9801234562', active_vacancies:2 },
  { id:'CL003', logo:'HR', name:'Human Resources',          contact:'Priya Adhikari (HR Head)', email:'priya@company.com.np',   phone:'+977-9801234563', active_vacancies:3 },
  { id:'CL004', logo:'OP', name:'Operations',               contact:'Maya Gurung (Ops Head)',   email:'maya@company.com.np',    phone:'+977-9801234564', active_vacancies:1 },
  { id:'CL005', logo:'MK', name:'Marketing & Sales',        contact:'Dev Thapa (Marketing Head)',email:'dev@company.com.np',   phone:'+977-9801234565', active_vacancies:2 },
]

const VACANCIES = {
  CL001:[ { id:'JB001', title:'Senior Software Engineer',  dept:'IT',        exp:'Senior (5-8 yrs)',  salary:'NPR 80K-120K', openings:2 }, { id:'JB005', title:'DevOps Engineer',       dept:'IT',        exp:'Senior (5-8 yrs)',  salary:'NPR 85K-120K', openings:1 } ],
  CL002:[ { id:'JB002', title:'Finance Manager',           dept:'Finance',   exp:'Senior (6-10 yrs)', salary:'NPR 90K-130K', openings:1 }, { id:'JB007', title:'Accountant',            dept:'Finance',   exp:'Mid (2-5 yrs)',     salary:'NPR 45K-65K',  openings:2 } ],
  CL003:[ { id:'JB003', title:'HR Business Partner',       dept:'HR',        exp:'Mid (3-6 yrs)',     salary:'NPR 70K-100K', openings:2 }, { id:'JB009', title:'HR Officer',            dept:'HR',        exp:'Entry (0-3 yrs)',   salary:'NPR 40K-55K',  openings:1 } ],
  CL004:[ { id:'JB008', title:'Operations Manager',        dept:'Operations',exp:'Senior (5-8 yrs)',  salary:'NPR 75K-110K', openings:1 } ],
  CL005:[ { id:'JB004', title:'Marketing Manager',         dept:'Marketing', exp:'Mid (3-6 yrs)',     salary:'NPR 60K-90K',  openings:1 } ],

const ALL_CANDIDATES = [
  { id:'C001', name:'Sanjay Thapa',    avatar:'ST', dob:'2055-04-12', age:26, gender:'Male',   phone:'+977-9801111111', email:'sanjay@email.com',   degree:'B.Tech Computer Science', university:'Tribhuvan University', grad_year:'2078', exp_yrs:7,  current_role:'Software Engineer', current_company:'InfoTech Nepal', salary_exp:105000, availability:'Immediate',   ai_score:94, grade:'S', skills:['React','Node.js','TypeScript','AWS','PostgreSQL','Docker'], address:'Baneshwor, Kathmandu', nationality:'Nepali', passport:'NA',  languages:['Nepali','English','Hindi'] },
  { id:'C002', name:'Anita Gurung',    avatar:'AG', dob:'2057-08-22', age:24, gender:'Female', phone:'+977-9802222222', email:'anita@email.com',    degree:'M.Sc Information Technology', university:'Pokhara University', grad_year:'2080', exp_yrs:5, current_role:'Frontend Developer', current_company:'Web Agency', salary_exp:95000, availability:'2 weeks',   ai_score:86, grade:'A', skills:['React','JavaScript','TypeScript','REST API','Git'], address:'Lalitpur', nationality:'Nepali', passport:'NA', languages:['Nepali','English'] },
  { id:'C003', name:'Bikash Maharjan', avatar:'BM', dob:'2054-11-05', age:27, gender:'Male',   phone:'+977-9803333333', email:'bikash@email.com',   degree:'B.E. Computer Engineering', university:'Kathmandu University', grad_year:'2077', exp_yrs:6, current_role:'Full Stack Developer', current_company:'Leapfrog Technology', salary_exp:110000, availability:'1 month',   ai_score:84, grade:'A', skills:['React','Node.js','AWS','Docker','MongoDB'], address:'Kirtipur', nationality:'Nepali', passport:'NA', languages:['Nepali','English'] },
  { id:'C005', name:'Dev Tamang',      avatar:'DT', dob:'2053-03-18', age:28, gender:'Male',   phone:'+977-9805555555', email:'dev@email.com',      degree:'M.Tech Software Engineering', university:'IIT Delhi', grad_year:'2078', exp_yrs:8, current_role:'Senior Software Engineer', current_company:'CloudTech Solutions', salary_exp:115000, availability:'3 months',  ai_score:94, grade:'S', skills:['React','Node.js','TypeScript','AWS','Docker','Kubernetes'], address:'Naxal, Kathmandu', nationality:'Nepali', passport:'PA1234567', languages:['Nepali','English','Hindi'] },
  { id:'C008', name:'Sunita Rai',      avatar:'SR', dob:'2056-07-30', age:25, gender:'Female', phone:'+977-9808888888', email:'sunita@email.com',   degree:'MBA Human Resource Management', university:'Tribhuvan University', grad_year:'2079', exp_yrs:5, current_role:'HR Officer', current_company:'Himalayan Holdings', salary_exp:88000, availability:'1 month',   ai_score:90, grade:'A', skills:['HR Management','Nepal Labour Act','Recruitment','Payroll','SSF'], address:'Thamel, Kathmandu', nationality:'Nepali', passport:'NA', languages:['Nepali','English','Hindi'] },
  { id:'C009', name:'Ramesh Koirala',  avatar:'RK', dob:'2052-12-10', age:29, gender:'Male',   phone:'+977-9809999999', email:'rameshk@email.com',  degree:'MBA HRM', university:'Pokhara University', grad_year:'2077', exp_yrs:7, current_role:'HR Manager', current_company:'Corporate Nepal', salary_exp:98000, availability:'2 months',  ai_score:88, grade:'A', skills:['HR Management','Recruitment','Labour Law','Training','SSF','PF'], address:'Bhaktapur', nationality:'Nepali', passport:'NA', languages:['Nepali','English'] },
  { id:'C011', name:'Arun KC',         avatar:'AK', dob:'2053-06-25', age:28, gender:'Male',   phone:'+977-9811111111', email:'arun@email.com',     degree:'B.E. Electronics & Communication', university:'Kathmandu University', grad_year:'2077', exp_yrs:9, current_role:'Network Lead', current_company:'Ncell Nepal', salary_exp:120000, availability:'3 months',  ai_score:93, grade:'S', skills:['Cisco','MPLS','BGP','Network Security','Juniper','Linux'], address:'Patan, Lalitpur', nationality:'Nepali', passport:'PA9876543', languages:['Nepali','English'] },
  { id:'C012', name:'Maya Pradhan',    avatar:'MP', dob:'2055-09-14', age:26, gender:'Female', phone:'+977-9812222222', email:'maya@email.com',     degree:'B.Tech Networks', university:'Tribhuvan University', grad_year:'2078', exp_yrs:6, current_role:'Network Engineer', current_company:'WorldLink', salary_exp:100000, availability:'1 month',   ai_score:87, grade:'A', skills:['Cisco','BGP','MPLS','Linux','Network Security'], address:'Swoyambhu', nationality:'Nepali', passport:'NA', languages:['Nepali','English'] },
  { id:'C014', name:'Dipak Limbu',     avatar:'DL', dob:'2056-02-08', age:25, gender:'Male',   phone:'+977-9814444444', email:'dipak@email.com',    degree:'B.Tech Information Technology', university:'Purbanchal University', grad_year:'2079', exp_yrs:5, current_role:'DevOps Engineer', current_company:'CloudFactory', salary_exp:95000, availability:'Immediate',   ai_score:88, grade:'A', skills:['Docker','Kubernetes','AWS','CI/CD','Terraform','Linux'], address:'Kalanki', nationality:'Nepali', passport:'NA', languages:['Nepali','English'] },
  { id:'C015', name:'Kabita Sharma',   avatar:'KS', dob:'2057-11-20', age:24, gender:'Female', phone:'+977-9815555555', email:'kabita@email.com',   degree:'B.Tech IT', university:'Tribhuvan University', grad_year:'2080', exp_yrs:4, current_role:'Junior DevOps', current_company:'TechMinds', salary_exp:82000, availability:'2 weeks',   ai_score:82, grade:'B', skills:['Docker','AWS','CI/CD','Linux','Jenkins'], address:'Imadol', nationality:'Nepali', passport:'NA', languages:['Nepali','English'] },
]

const GRADE_C = { S:{color:'#7c3aed',bg:'#f5f3ff',border:'#c4b5fd'}, A:{color:'#059669',bg:'#f0fdf4',border:'#6ee7b7'}, B:{color:'#1e40af',bg:'#eff6ff',border:'#93c5fd'}, C:{color:'#d97706',bg:'#fffbeb',border:'#fcd34d'}, D:{color:'#dc2626',bg:'#fef2f2',border:'#fca5a5'} }

// ── Excel Generator (CSV download) ─────────────────────────────
function generateExcel(candidates, client, vacancy, submittedBy) {
  const headers = ['S.N.','Candidate ID','Full Name','Gender','Date of Birth','Age','Nationality','Phone','Email','Highest Qualification','University/College','Graduation Year','Position Applied','Department','Experience (Years)','Current Role','Current Company','Expected Salary (NPR/mo)','Availability','AI Match Score','Grade','Key Skills','Address','Languages','Passport No.','Submitted To','Submitted By','Submission Date']
  const rows = candidates.map((c,i)=>[
    i+1, c.id, c.name, c.gender, c.dob, c.age, c.nationality, c.phone, c.email,
    c.degree, c.university, c.grad_year,
    vacancy?.title||'As per JD', vacancy?.dept||'—', c.exp_yrs,
    c.current_role, c.current_company, c.salary_exp,
    c.availability, c.ai_score+'%', c.grade,
    c.skills.join(' | '), c.address, c.languages.join(' / '), c.passport||'NA',
    client?.name||'—', submittedBy, new Date().toLocaleDateString('en-NP')
  ])
  const csv = [headers, ...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], {type:'text/csv'})
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `CV_Submission_${client?.name?.split(' ')[0]||'Client'}_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)

// ── Submission History ─────────────────────────────────────────
const INIT_HISTORY = [
  { id:'SUB001', client:'TechCorp Nepal Pvt. Ltd.', vacancy:'Senior React Developer', count:3, submitted_by:'Maya Pradhan', date:'2081-08-20', status:'Reviewed', client_feedback:'2 shortlisted for interview', method:'Email + WhatsApp' },
  { id:'SUB002', client:'Himalayan Bank Ltd.',       vacancy:'HR Business Partner',   count:2, submitted_by:'Anita Karki',  date:'2081-08-22', status:'Pending Review', client_feedback:'', method:'Email' },
  { id:'SUB003', client:'Ncell Axiata Ltd.',         vacancy:'Senior Network Engineer',count:3,submitted_by:'Maya Pradhan', date:'2081-08-25', status:'Interview Scheduled', client_feedback:'All 3 approved for interview', method:'Email + Portal' },
]

const inp = { width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }
const lbl = { fontSize:8.5, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }

export default function HRISBulkCVSubmitPage() {
  const { navigate } = useApp()
  const [step, setStep]                   = useState(0)
  const [selClient, setSelClient]         = useState(null)
  const [selVacancy, setSelVacancy]       = useState(null)
  const [selCandidates, setSelCandidates] = useState(new Set())
  const [coverNote, setCoverNote]         = useState('')
  const [sendEmail, setSendEmail]         = useState(true)
  const [sendWhatsApp, setSendWhatsApp]   = useState(true)
  const [sendPortal, setSendPortal]       = useState(true)
  const [history, setHistory]             = useState(INIT_HISTORY)
  const [view, setView]                   = useState('new')  // new | history
  const [msg, setMsg]                     = useState('')
  const [filterGrade, setFilterGrade]     = useState('All')
  const [search, setSearch]               = useState('')
  const [previewCand, setPreviewCand]     = useState(null)
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3500) }

  const STEPS = ['Select Client & Vacancy', 'Choose Candidates', 'Preview & Excel', 'Send & Confirm']

  const vacancies = selClient ? (VACANCIES[selClient.id] || []) : []
  const selCandObjs = ALL_CANDIDATES.filter(c => selCandidates.has(c.id))

  const filteredCands = ALL_CANDIDATES.filter(c => {
    if (filterGrade !== 'All' && c.grade !== filterGrade) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.skills.join(' ').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleCand = (id) => setSelCandidates(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll  = () => {
    if (selCandidates.size === filteredCands.length) setSelCandidates(new Set())
    else setSelCandidates(new Set(filteredCands.map(c=>c.id)))

  const handleSubmit = () => {
    const sub = {
      id: 'SUB' + String(history.length+1).padStart(3,'0'),
      client: selClient?.name, vacancy: selVacancy?.title,
      count: selCandidates.size, submitted_by: 'Maya Pradhan',
      date: new Date().toISOString().slice(0,10),
      status: 'Pending Review', client_feedback: '',
      method: [sendEmail&&'Email',sendWhatsApp&&'WhatsApp',sendPortal&&'Portal'].filter(Boolean).join(' + ')
    setHistory(p=>[sub,...p])
    notify(`✅ ${selCandidates.size} CVs submitted to ${selClient?.name}! Excel + notifications sent.`)
    setStep(0); setSelClient(null); setSelVacancy(null); setSelCandidates(new Set()); setCoverNote('')
    setView('history')

  const autoNote = () => {
    if (!selClient || !selVacancy || selCandidates.size === 0) return
    setCoverNote(`Dear ${selClient.contact},\n\nPlease find attached the CVs of ${selCandidates.size} shortlisted candidate${selCandidates.size>1?'s':''} for the position of ${selVacancy.title} at ${selClient.name}.\n\nAll candidates have been carefully screened by our AI-powered ATS and verified by our recruitment team. Each candidate's profile, qualifications, and expected salary have been summarized in the attached Excel sheet for your convenience.\n\nWe recommend reviewing the top ${Math.min(3,selCandidates.size)} candidates for first-round interviews. Please share your feedback at your earliest convenience.\n\nBest regards,\nFuture Recruitment Agency\nhr@futureagency.com.np | +977-01-4XXXXXX`)

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      {/* Candidate preview modal */}
      {previewCand && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setPreviewCand(null)}>
          <div style={{background:'#fff',borderRadius:16,maxWidth:520,width:'100%',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 24px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f)',padding:'14px 18px',borderRadius:'16px 16px 0 0',color:'#fff',display:'flex',gap:12,alignItems:'center'}}>
              <div style={{width:44,height:44,borderRadius:11,background:`linear-gradient(135deg,${GRADE_C[previewCand.grade]?.color},${GRADE_C[previewCand.grade]?.color}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'#fff'}}>{previewCand.avatar}</div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:900}}>{previewCand.name}</div><div style={{fontSize:9,opacity:.75}}>{previewCand.degree} · {previewCand.exp_yrs} yrs exp</div></div>
              <button onClick={()=>setPreviewCand(null)} style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',width:28,height:28,borderRadius:'50%',cursor:'pointer',fontSize:13}}>✕</button>
            </div>
            <div style={{padding:'16px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                {[['Phone',previewCand.phone],['Email',previewCand.email],['DOB',previewCand.dob+' (Age '+previewCand.age+')'],['Gender',previewCand.gender],['Nationality',previewCand.nationality],['Passport',previewCand.passport||'NA'],['Degree',previewCand.degree],['University',previewCand.university],['Grad Year',previewCand.grad_year],['Experience',previewCand.exp_yrs+' years'],['Current Role',previewCand.current_role],['Current Company',previewCand.current_company],['Salary Expected','NPR '+previewCand.salary_exp.toLocaleString()+'/mo'],['Availability',previewCand.availability],['Address',previewCand.address],['Languages',previewCand.languages.join(', ')]].map(([k,v])=>(
                  <div key={k} style={{padding:'6px 8px',background:'#f8fafc',borderRadius:7}}>
                    <div style={{fontSize:7.5,color:'#94a3b8'}}>{k}</div>
                    <div style={{fontSize:9,fontWeight:600,color:'#0f172a'}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:9,fontWeight:700,color:'#374151',marginBottom:5}}>Key Skills</div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{previewCand.skills.map(s=><span key={s} style={{fontSize:8,padding:'3px 8px',borderRadius:5,background:GRADE_C[previewCand.grade]?.bg,color:GRADE_C[previewCand.grade]?.color,border:`1px solid ${GRADE_C[previewCand.grade]?.border}`,fontWeight:600}}>{s}</span>)}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{toggleCand(previewCand.id);setPreviewCand(null)}} style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:selCandidates.has(previewCand.id)?'#fef2f2':'#1e40af',color:selCandidates.has(previewCand.id)?'#dc2626':'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                  {selCandidates.has(previewCand.id)?'❌ Remove from Selection':'✅ Add to Submission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f,#1e40af)',borderRadius:14,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:10}}>
          <div>
            <h2 style={{margin:0,fontSize:18,fontWeight:900}}>📤 Bulk CV Submission</h2>
            <p style={{margin:'3px 0 0',fontSize:9,opacity:.8}}>Submit multiple CVs to clients · Auto Excel generation · Email + WhatsApp + Portal delivery · Full tracking</p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {msg&&<span style={{fontSize:9,padding:'5px 12px',background:'rgba(255,255,255,.2)',borderRadius:8}}>{msg}</span>}
            <div style={{display:'flex',border:'1px solid rgba(255,255,255,.2)',borderRadius:9,overflow:'hidden'}}>
              {[['new','➕ New Submission'],['history','📋 History']].map(([v,l])=>(
                <button key={v} onClick={()=>setView(v)} style={{padding:'7px 14px',border:'none',background:view===v?'rgba(255,255,255,.2)':'transparent',color:'#fff',fontSize:9,fontWeight:view===v?800:400,cursor:'pointer'}}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:14}}>
          {[{l:'Total Submissions',v:history.length,c:'#60a5fa'},{l:'CVs Sent This Month',v:history.reduce((s,h)=>s+h.count,0),c:'#34d399'},{l:'Pending Feedback',v:history.filter(h=>h.status==='Pending Review').length,c:'#fbbf24'},{l:'Interviews Scheduled',v:history.filter(h=>h.status==='Interview Scheduled').length,c:'#a78bfa'}].map((s,i)=>(
            <div key={i} style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:7.5,opacity:.65}}>{s.l}</div></div>
          ))}
        </div>
      </div>

      {/* HISTORY VIEW */}
      {view==='history' && (
        <div>
          <div style={{fontSize:12,fontWeight:900,color:'#0f172a',marginBottom:12}}>CV Submission History</div>
          {history.map(h=>{
            const sc = h.status==='Reviewed'||h.status==='Interview Scheduled'?{c:'#059669',bg:'#f0fdf4',b:'#bbf7d0'}:h.status==='Pending Review'?{c:'#f59e0b',bg:'#fffbeb',b:'#fde68a'}:{c:'#64748b',bg:'#f8fafc',b:'#e2e8f0'}
            return (
              <div key={h.id} style={{background:'#fff',borderRadius:12,border:`1px solid ${sc.b}`,marginBottom:8,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                <div style={{background:sc.bg,padding:'10px 16px',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:2}}><span style={{fontSize:11,fontWeight:900,color:'#0f172a'}}>{h.vacancy}</span><span style={{fontSize:8,color:'#64748b'}}>→</span><span style={{fontSize:10,fontWeight:700,color:'#1e40af'}}>{h.client}</span></div>
                    <div style={{fontSize:9,color:'#64748b'}}>{h.id} · {h.count} CV{h.count>1?'s':''} submitted by {h.submitted_by} on {h.date} via {h.method}</div>
                  </div>
                  <span style={{fontSize:8.5,fontWeight:700,padding:'3px 10px',borderRadius:6,background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`}}>{h.status}</span>
                </div>
                {h.client_feedback && <div style={{padding:'8px 16px',fontSize:9,color:'#374151',borderTop:'1px solid #f1f5f9'}}>💬 Client: "{h.client_feedback}"</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* NEW SUBMISSION WIZARD */}
      {view==='new' && (
        <div>
          {/* Step progress */}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'14px 20px',marginBottom:14}}>
            <div style={{display:'flex',gap:0}}>
              {STEPS.map((s,i)=>(
                <div key={i} style={{flex:1,display:'flex',alignItems:'center'}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:step>=i?'#1e40af':'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:step>=i?'#fff':'#94a3b8',border:`2px solid ${step>=i?'#1e40af':'#e2e8f0'}`}}>{step>i?'✓':i+1}</div>
                    <div style={{fontSize:8,marginTop:4,color:step>=i?'#1e40af':'#94a3b8',fontWeight:step===i?800:400,textAlign:'center',maxWidth:100}}>{s}</div>
                  </div>
                  {i<STEPS.length-1&&<div style={{height:2,flex:1,background:step>i?'#1e40af':'#e2e8f0',margin:'0 4px',marginBottom:20}}/>}
                </div>
              ))}
            </div>
          </div>

          {/* STEP 0: Select Client & Vacancy */}
          {step===0&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>Select Department</div>
                {CLIENTS.map(c=>(
                  <div key={c.id} onClick={()=>{setSelClient(c);setSelVacancy(null)}}
                    style={{padding:'12px 14px',borderRadius:11,border:`2px solid ${selClient?.id===c.id?'#1e40af':'#f1f5f9'}`,background:selClient?.id===c.id?'#eff6ff':'#fff',cursor:'pointer',marginBottom:8,transition:'all .15s',display:'flex',gap:10,alignItems:'center'}}>
                    <div style={{width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#0f172a,#1e40af)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'#fff',flexShrink:0}}>{c.logo}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,fontWeight:800,color:'#0f172a'}}>{c.name}</div>
                      <div style={{fontSize:8.5,color:'#64748b'}}>{c.contact} · {c.active_vacancies} active vacancies</div>
                    </div>
                    {selClient?.id===c.id&&<span style={{fontSize:18,color:'#1e40af'}}>●</span>}
                  </div>
                ))}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>Select Vacancy</div>
                {!selClient ? (
                  <div style={{textAlign:'center',padding:'40px',color:'#94a3b8',background:'#f8fafc',borderRadius:11,border:'1px dashed #e2e8f0'}}>
                    <div style={{fontSize:28,marginBottom:8}}>←</div>
                    <div style={{fontSize:10}}>Select a department first</div>
                  </div>
                ) : vacancies.map(v=>(
                  <div key={v.id} onClick={()=>setSelVacancy(v)}
                    style={{padding:'12px 14px',borderRadius:11,border:`2px solid ${selVacancy?.id===v.id?'#7c3aed':'#f1f5f9'}`,background:selVacancy?.id===v.id?'#f5f3ff':'#fff',cursor:'pointer',marginBottom:8,transition:'all .15s'}}>
                    <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:2}}>{v.title}</div>
                    <div style={{fontSize:8.5,color:'#64748b'}}>{v.dept} · {v.exp} · {v.salary}</div>
                    {selVacancy?.id===v.id&&<div style={{fontSize:8,color:'#7c3aed',fontWeight:700,marginTop:4}}>✅ Selected</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: Choose Candidates */}
          {step===1&&(
            <div>
              <div style={{background:'#fff',borderRadius:11,border:'1px solid #e2e8f0',padding:'10px 14px',marginBottom:10,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                <div style={{position:'relative',flex:2,minWidth:160}}>
                  <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:12,color:'#94a3b8'}}>🔍</span>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search candidates, skills..."
                    style={{width:'100%',padding:'7px 10px 7px 30px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div style={{display:'flex',gap:5}}>
                  {['All','S','A','B','C'].map(g=>(
                    <button key={g} onClick={()=>setFilterGrade(g)}
                      style={{padding:'5px 10px',borderRadius:7,border:`1.5px solid ${filterGrade===g?(GRADE_C[g]?.color||'#1e40af'):'#e2e8f0'}`,background:filterGrade===g?(GRADE_C[g]?.bg||'#eff6ff'):'#fff',color:filterGrade===g?(GRADE_C[g]?.color||'#1e40af'):'#64748b',fontSize:8.5,fontWeight:filterGrade===g?700:400,cursor:'pointer'}}>
                      {g==='All'?'All Grades':'Grade '+g}
                    </button>
                  ))}
                </div>
                <button onClick={toggleAll} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:9,cursor:'pointer',fontWeight:600}}>
                  {selCandidates.size===filteredCands.length?'Deselect All':'Select All'}
                </button>
                <span style={{fontSize:10,fontWeight:700,color:'#1e40af',marginLeft:'auto'}}>{selCandidates.size} selected</span>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:10}}>
                {filteredCands.map(c=>{
                  const gc=GRADE_C[c.grade]||GRADE_C.B; const sel=selCandidates.has(c.id)
                  return (
                    <div key={c.id} style={{background:'#fff',borderRadius:12,border:`2px solid ${sel?gc.color:'#f1f5f9'}`,overflow:'hidden',transition:'all .15s',boxShadow:sel?`0 3px 14px ${gc.color}20`:'0 1px 4px rgba(0,0,0,.04)'}}>
                      <div style={{height:4,background:sel?gc.color:'#f1f5f9'}}/>
                      <div style={{padding:'12px 13px'}}>
                        <div style={{display:'flex',gap:9,alignItems:'flex-start',marginBottom:8}}>
                          <div style={{position:'relative',flexShrink:0}}>
                            <div style={{width:40,height:40,borderRadius:10,background:`linear-gradient(135deg,${gc.color},${gc.color}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color:'#fff'}}>{c.avatar}</div>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:11,fontWeight:900,color:'#0f172a',marginBottom:1}}>{c.name}</div>
                            <div style={{fontSize:8,color:'#64748b'}}>{c.degree.split(' ').slice(0,3).join(' ')} · {c.exp_yrs} yrs · {c.availability}</div>
                            <div style={{fontSize:8,color:'#94a3b8',marginTop:1}}>NPR {(c.salary_exp/1000).toFixed(0)}K/mo · {c.current_company}</div>
                          </div>
                          <div style={{display:'flex',flex:'column',gap:4,alignItems:'flex-end'}}>
                            <span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:5,background:gc.bg,color:gc.color,border:`1px solid ${gc.border}`}}>Grade {c.grade}</span>
                            <div style={{fontSize:11,fontWeight:900,color:gc.color,marginTop:3}}>{c.ai_score}%</div>
                          </div>
                        </div>
                        <div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:8}}>
                          {c.skills.slice(0,4).map(s=><span key={s} style={{fontSize:7.5,padding:'2px 6px',borderRadius:4,background:'#f8fafc',color:'#64748b',border:'1px solid #f1f5f9'}}>{s}</span>)}
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>setPreviewCand(c)} style={{flex:1,padding:'6px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8.5,cursor:'pointer',fontWeight:600}}>👁 Preview</button>
                          <button onClick={()=>toggleCand(c.id)}
                            style={{flex:2,padding:'6px',borderRadius:7,border:'none',background:sel?'#fef2f2':gc.color,color:sel?'#dc2626':'#fff',fontSize:8.5,cursor:'pointer',fontWeight:700}}>
                            {sel?'❌ Remove':'✅ Add to Submission'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Excel */}
          {step===2&&(
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:14}}>
                <div>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:12}}>
                    <div style={{background:'#0f172a',padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{fontSize:10,fontWeight:900,color:'#fff'}}>CV Submission List ({selCandObjs.length} candidates)</div>
                      <button onClick={()=>generateExcel(selCandObjs,selClient,selVacancy,'Maya Pradhan')}
                        style={{padding:'6px 14px',borderRadius:7,border:'none',background:'#059669',color:'#fff',fontSize:8.5,fontWeight:700,cursor:'pointer'}}>
                        📊 Download Excel (.csv)
                      </button>
                    </div>
                    <div style={{overflowX:'auto'}}>
                      <table style={{borderCollapse:'collapse',width:'100%',minWidth:700}}>
                        <thead>
                          <tr style={{background:'#f8fafc'}}>
                            {['S.N.','Name','Gender/Age','Qualification','Experience','Position Applied','Salary Exp.','Availability','Grade'].map(h=>(
                              <td key={h} style={{padding:'8px 10px',fontSize:8.5,fontWeight:700,color:'#374151',borderBottom:'2px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</td>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selCandObjs.map((c,i)=>{
                            const gc=GRADE_C[c.grade]
                            return (
                              <tr key={c.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafafa'}}>
                                <td style={{padding:'8px 10px',fontSize:9,fontWeight:700,color:'#1e40af'}}>{i+1}</td>
                                <td style={{padding:'8px 10px'}}>
                                  <div style={{fontSize:9.5,fontWeight:800,color:'#0f172a'}}>{c.name}</div>
                                  <div style={{fontSize:8,color:'#94a3b8'}}>{c.email}</div>
                                </td>
                                <td style={{padding:'8px 10px',fontSize:9,color:'#374151'}}>{c.gender}, {c.age} yrs</td>
                                <td style={{padding:'8px 10px'}}>
                                  <div style={{fontSize:9,color:'#374151',fontWeight:600}}>{c.degree.split(' ').slice(0,3).join(' ')}</div>
                                  <div style={{fontSize:8,color:'#94a3b8'}}>{c.university}</div>
                                </td>
                                <td style={{padding:'8px 10px',fontSize:9,color:'#374151',fontWeight:600}}>{c.exp_yrs} years<br/><span style={{fontSize:8,color:'#94a3b8'}}>{c.current_role}</span></td>
                                <td style={{padding:'8px 10px',fontSize:9,color:'#374151'}}>{selVacancy?.title||'—'}</td>
                                <td style={{padding:'8px 10px',fontSize:9,fontWeight:700,color:'#059669'}}>NPR {(c.salary_exp/1000).toFixed(0)}K</td>
                                <td style={{padding:'8px 10px',fontSize:9,color:'#374151'}}>{c.availability}</td>
                                <td style={{padding:'8px 10px'}}>
                                  <span style={{fontSize:8.5,fontWeight:700,padding:'2px 8px',borderRadius:5,background:gc?.bg,color:gc?.color,border:`1px solid ${gc?.border}`}}>{c.ai_score}% {c.grade}</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Cover note */}
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                      <div style={{fontSize:10,fontWeight:800,color:'#0f172a'}}>Cover Note / Covering Letter</div>
                      <button onClick={autoNote} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#7c3aed',color:'#fff',fontSize:8.5,fontWeight:700,cursor:'pointer'}}>✨ Auto-Generate</button>
                    </div>
                    <textarea value={coverNote} onChange={e=>setCoverNote(e.target.value)} rows={7}
                      placeholder="Type your cover note or click Auto-Generate..."
                      style={{width:'100%',padding:'9px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:9.5,outline:'none',resize:'vertical',boxSizing:'border-box',lineHeight:1.7}}/>
                  </div>
                </div>

                {/* Send options */}
                <div>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'14px',marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:12}}>Submission Summary</div>
                    {[['Client',selClient?.name],['Contact',selClient?.contact],['Email',selClient?.email],['Vacancy',selVacancy?.title],['Department',selVacancy?.dept],['CVs Included',selCandObjs.length+' candidates'],['Excel Sheet','Auto-generated (.csv)'],['Submitted By','Maya Pradhan']].map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f8fafc'}}>
                        <span style={{fontSize:8.5,color:'#94a3b8'}}>{k}</span>
                        <span style={{fontSize:8.5,fontWeight:600,color:'#374151',textAlign:'right',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'14px',marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:10}}>Delivery Channels</div>
                    {[['📧 Email to '+selClient?.contact,sendEmail,setSendEmail,'#1e40af'],['💬 WhatsApp to '+selClient?.phone,sendWhatsApp,setSendWhatsApp,'#25d366'],['🏢 Client Portal Upload',sendPortal,setSendPortal,'#7c3aed']].map(([l,v,setter,c])=>(
                      <div key={l} onClick={()=>setter(s=>!s)} style={{display:'flex',gap:9,alignItems:'center',padding:'9px 11px',borderRadius:9,border:`1.5px solid ${v?c+'40':'#f1f5f9'}`,background:v?c+'08':'#fff',cursor:'pointer',marginBottom:7,transition:'all .15s'}}>
                        <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${v?c:'#d1d5db'}`,background:v?c:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          {v&&<span style={{color:'#fff',fontSize:12,fontWeight:900}}>✓</span>}
                        </div>
                        <span style={{fontSize:9,fontWeight:v?700:400,color:v?c:'#64748b'}}>{l}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'#f0fdf4',borderRadius:10,padding:'12px',border:'1px solid #bbf7d0',fontSize:9,color:'#065f46',lineHeight:1.8}}>
                    ✅ Excel sheet with all candidate details auto-generated<br/>
                    ✅ CV files attached from ATS database<br/>
                    ✅ Submission logged in ATS for tracking<br/>
                    ✅ Client portal updated with shortlist
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{display:'flex',gap:10,marginTop:16}}>
            {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{padding:'9px 20px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:10,cursor:'pointer'}}>← Back</button>}
            <div style={{flex:1}}/>
            {step===0&&<button onClick={()=>{if(!selClient){notify('Select a client');return}if(!selVacancy){notify('Select a vacancy');return}setStep(1)}} style={{padding:'9px 24px',borderRadius:9,border:'none',background:'#1e40af',color:'#fff',fontSize:10,fontWeight:800,cursor:'pointer'}}>Next: Choose Candidates →</button>}
            {step===1&&<button onClick={()=>{if(selCandidates.size===0){notify('Select at least one candidate');return}setStep(2)}} style={{padding:'9px 24px',borderRadius:9,border:'none',background:'#1e40af',color:'#fff',fontSize:10,fontWeight:800,cursor:'pointer'}}>Next: Preview ({selCandidates.size} selected) →</button>}
            {step===2&&<button onClick={()=>setStep(3)} style={{padding:'9px 24px',borderRadius:9,border:'none',background:'#059669',color:'#fff',fontSize:10,fontWeight:800,cursor:'pointer'}}>Next: Send Submission →</button>}
            {step===3&&(
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>generateExcel(selCandObjs,selClient,selVacancy,'Maya Pradhan')} style={{padding:'10px 18px',borderRadius:9,border:'none',background:'#059669',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📊 Download Excel</button>
                <button onClick={handleSubmit} style={{padding:'10px 28px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#1e40af,#7c3aed)',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>📤 Submit CVs to {selClient?.name?.split(' ')[0]}</button>
              </div>
            )}
          </div>

          {/* Step 3 final confirm */}
          {step===3&&(
            <div style={{background:'#fff',borderRadius:13,border:'1px solid #e2e8f0',padding:'20px',marginTop:12}}>
              <div style={{fontSize:13,fontWeight:900,color:'#0f172a',marginBottom:14}}>📤 Final Confirmation</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div style={{background:'#eff6ff',borderRadius:10,padding:'14px',border:'1px solid #bfdbfe'}}>
                  <div style={{fontSize:10,fontWeight:800,color:'#1e40af',marginBottom:8}}>📋 What will be sent:</div>
                  <ul style={{margin:0,paddingLeft:14,fontSize:9,color:'#1e40af',lineHeight:2}}>
                    <li>{selCandObjs.length} candidate CV{selCandObjs.length>1?'s':''} (PDF files)</li>
                    <li>1 Excel summary sheet with all details</li>
                    <li>Covering letter / cover note</li>
                    <li>Candidate AI scores and grade comparison</li>
                    <li>Submission reference: SUB{String(history.length+1).padStart(3,'0')}</li>
                  </ul>
                </div>
                <div style={{background:'#f0fdf4',borderRadius:10,padding:'14px',border:'1px solid #bbf7d0'}}>
                  <div style={{fontSize:10,fontWeight:800,color:'#059669',marginBottom:8}}>📊 Excel Sheet Columns:</div>
                  <div style={{fontSize:8.5,color:'#065f46',lineHeight:2}}>
                    Name · Gender · Age · DOB · Nationality · Phone · Email · Qualification · University · Grad Year · Position Applied · Dept · Experience · Current Role · Salary Expected · Availability · AI Score · Grade · Skills · Address · Languages · Passport
                  </div>
                </div>
              </div>
              <div style={{background:'#fffbeb',borderRadius:9,padding:'10px 12px',border:'1px solid #fde68a',fontSize:9,color:'#92400e',lineHeight:1.7}}>
                ⚠️ <strong>Important:</strong> Once submitted, this will be logged in ATS. Client will receive notification via selected channels. You can track response in Submission History.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

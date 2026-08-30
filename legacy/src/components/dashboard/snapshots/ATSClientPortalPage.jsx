// ATSClientPortalPage.jsx -- Connected Client Company Portal
// Only registered companies from ATSClientCompanyPage can access
// Client sees: own vacancies, shortlisted candidates, interviews, placements, payroll
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const REGISTERED_COMPANIES = [
  { id:'CL001', logo:'TC', name:'TechCorp Nepal Pvt. Ltd.',      industry:'Information Technology', hq:'Kathmandu', status:'Active',           contract_type:'Retainer',            commission:'15%', monthly_fee:'NPR 50,000', contract_start:'2081-01-01', contract_end:'2082-01-01', contact_name:'Ramesh Koirala',  contact_email:'ramesh@techcorp.com.np',    contact_phone:'+977-9801234567', contact_title:'HR Director',             departments:['Engineering','Product','DevOps','QA','Design'],       handles_payroll:true,  payroll_employees:48 },
  { id:'CL002', logo:'HB', name:'Himalayan Bank Ltd.',            industry:'Banking & Finance',      hq:'Kathmandu', status:'Active',           contract_type:'Per Placement',        commission:'12%', monthly_fee:'--',         contract_start:'2081-03-01', contract_end:'2082-03-01', contact_name:'Sunita Shrestha', contact_email:'sunita@hbl.com.np',          contact_phone:'+977-9802345678', contact_title:'Head of HR',              departments:['Retail Banking','Operations','Compliance','IT','HR'],  handles_payroll:false, payroll_employees:0  },
  { id:'CL003', logo:'NC', name:'Ncell Axiata Ltd.',              industry:'Telecom',               hq:'Kathmandu', status:'Active',           contract_type:'Monthly Subscription', commission:'10%', monthly_fee:'NPR 80,000', contract_start:'2080-10-01', contract_end:'2081-10-01', contact_name:'Dev Maharjan',    contact_email:'dev@ncell.com.np',          contact_phone:'+977-9803456789', contact_title:'Talent Acquisition Lead', departments:['Network','Sales','Marketing','Finance'],              handles_payroll:true,  payroll_employees:32 },
  { id:'CL004', logo:'NA', name:'Nepal Airlines Corporation',     industry:'Aviation',               hq:'Kathmandu', status:'Pending Approval', contract_type:'Project-Based',        commission:'18%', monthly_fee:'--',         contract_start:'2081-09-01', contract_end:'2081-12-31', contact_name:'Priya Gurung',    contact_email:'priya@nepalairlines.com.np',contact_phone:'+977-9804567890', contact_title:'HR Manager',              departments:['Cabin Crew','Ground Operations','Engineering'],       handles_payroll:false, payroll_employees:0  },
  { id:'CL005', logo:'MM', name:'MeroMart E-commerce Pvt. Ltd.', industry:'E-Commerce',             hq:'Lalitpur',  status:'Active',           contract_type:'Per Placement',        commission:'14%', monthly_fee:'--',         contract_start:'2081-05-01', contract_end:'2082-05-01', contact_name:'Aarav Joshi',     contact_email:'aarav@meromart.com.np',     contact_phone:'+977-9805678901', contact_title:'People Head',             departments:['Tech','Marketing','Operations'],                      handles_payroll:false, payroll_employees:0  },
  { id:'CL006', logo:'GS', name:'Global Solutions Consulting',   industry:'Consulting',             hq:'Kathmandu', status:'On Hold',          contract_type:'Exclusive',            commission:'20%', monthly_fee:'NPR 20,000', contract_start:'2081-06-01', contract_end:'2082-06-01', contact_name:'Sita Maharjan',   contact_email:'sita@globalsol.com.np',     contact_phone:'+977-9806789012', contact_title:'Managing Director',       departments:['Consulting','Business Development'],                  handles_payroll:false, payroll_employees:0  },
]

const COMPANY_CANDIDATES = {
  CL001: [
    { id:'sc1', name:'Sanjay Thapa',   avatar:'ST', role:'Senior React Developer', dept:'Engineering', score:94, rank:'Gold',   status:'Interview Scheduled', shared:'2081-08-20', interview_date:'2081-09-02 10:00 AM', feedback:'', salary:'NPR 110,000' },
    { id:'sc2', name:'Anita Gurung',   avatar:'AG', role:'UX Designer',            dept:'Design',      score:88, rank:'Gold',   status:'Offer Accepted',      shared:'2081-08-18', interview_date:'2081-08-25 02:00 PM', feedback:'Excellent design portfolio. Creative and team-fit.', salary:'NPR 85,000' },
    { id:'sc3', name:'Bikash Maharjan',avatar:'BM', role:'DevOps Engineer',        dept:'DevOps',      score:85, rank:'Silver', status:'Pending Review',      shared:'2081-08-22', interview_date:'', feedback:'', salary:'NPR 95,000' },
    { id:'sc4', name:'Laxmi Karki',    avatar:'LK', role:'QA Engineer',            dept:'QA',          score:80, rank:'Silver', status:'Rejected by Client',  shared:'2081-08-15', interview_date:'2081-08-20 11:00 AM', feedback:'Good technical skills but culture mismatch.', salary:'NPR 70,000' },
  ],
  CL002: [
    { id:'sc5', name:'Laxmi K.',    avatar:'LK', role:'HR Business Partner', dept:'HR',         score:91, rank:'Gold',   status:'Offer Sent',     shared:'2081-08-19', interview_date:'2081-08-26 10:00 AM', feedback:'Strong HR background. Labour law expertise excellent.', salary:'NPR 90,000' },
    { id:'sc6', name:'Rohan Karki', avatar:'RK', role:'Risk Analyst',        dept:'Compliance', score:82, rank:'Silver', status:'Pending Review', shared:'2081-08-21', interview_date:'', feedback:'', salary:'NPR 75,000' },
  ],
  CL003: [
    { id:'sc7', name:'Dev Thapa',   avatar:'DT', role:'Network Engineer',  dept:'Network',  score:89, rank:'Gold',   status:'Interview Scheduled', shared:'2081-08-20', interview_date:'2081-09-01 02:00 PM', feedback:'', salary:'NPR 100,000' },
    { id:'sc8', name:'Priya Tamang',avatar:'PT', role:'Marketing Manager', dept:'Marketing',score:86, rank:'Gold',   status:'Offer Accepted',      shared:'2081-08-17', interview_date:'2081-08-24 11:00 AM', feedback:'Creative and data-driven. Perfect fit for digital strategy.', salary:'NPR 80,000' },
    { id:'sc9', name:'Rajan S.',    avatar:'RS', role:'Sales Executive',   dept:'Sales',    score:78, rank:'Silver', status:'Pending Review',      shared:'2081-08-23', interview_date:'', feedback:'', salary:'NPR 65,000' },
  ],
  CL004: [],
  CL005: [
    { id:'sc10', name:'Aarav KC', avatar:'AK', role:'Frontend Developer', dept:'Tech', score:84, rank:'Silver', status:'Pending Review', shared:'2081-08-25', interview_date:'', feedback:'', salary:'NPR 75,000' },
  ],
  CL006: [],
}

const COMPANY_VACANCIES = {
  CL001: [
    { id:'v1', title:'Senior React Developer', dept:'Engineering', status:'Active',  openings:2, candidates:4, posted:'2081-08-15', deadline:'2081-09-30', salary:'NPR 80K-120K' },
    { id:'v2', title:'DevOps Engineer',         dept:'DevOps',      status:'Active',  openings:1, candidates:3, posted:'2081-08-18', deadline:'2081-09-15', salary:'NPR 85K-110K' },
    { id:'v3', title:'QA Lead',                 dept:'QA',          status:'Active',  openings:1, candidates:2, posted:'2081-08-20', deadline:'2081-10-01', salary:'NPR 70K-90K' },
    { id:'v4', title:'UX Designer',             dept:'Design',      status:'Filled',  openings:1, candidates:6, posted:'2081-07-01', deadline:'2081-08-01', salary:'NPR 75K-95K' },
  ],
  CL002: [
    { id:'v5', title:'HR Business Partner',        dept:'HR',         status:'Active', openings:1, candidates:2, posted:'2081-08-19', deadline:'2081-09-20', salary:'NPR 80K-110K' },
    { id:'v6', title:'Risk & Compliance Analyst',  dept:'Compliance', status:'Active', openings:1, candidates:1, posted:'2081-08-21', deadline:'2081-09-25', salary:'NPR 65K-85K' },
  ],
  CL003: [
    { id:'v7', title:'Senior Network Engineer', dept:'Network',  status:'Active', openings:2, candidates:3, posted:'2081-08-20', deadline:'2081-09-25', salary:'NPR 90K-130K' },
    { id:'v8', title:'Marketing Manager',        dept:'Marketing',status:'Filled', openings:1, candidates:5, posted:'2081-08-10', deadline:'2081-09-01', salary:'NPR 75K-100K' },
    { id:'v9', title:'Finance Analyst',          dept:'Finance',  status:'Active', openings:1, candidates:0, posted:'2081-08-25', deadline:'2081-10-01', salary:'NPR 60K-80K' },
  ],
  CL004: [{ id:'v10', title:'Cabin Crew', dept:'Cabin Crew', status:'Pending', openings:3, candidates:0, posted:'2081-08-25', deadline:'2081-10-15', salary:'NPR 45K-65K' }],
  CL005: [
    { id:'v11', title:'Frontend Developer',     dept:'Tech',      status:'Active', openings:2, candidates:1, posted:'2081-08-25', deadline:'2081-09-30', salary:'NPR 60K-90K' },
    { id:'v12', title:'Digital Marketing Exec', dept:'Marketing', status:'Active', openings:1, candidates:0, posted:'2081-08-26', deadline:'2081-10-01', salary:'NPR 50K-70K' },
  ],
  CL006: [],
}

const COMPANY_PAYROLL = {
  CL001: {
    month:'Bhadra 2081', total_employees:48, total_gross:4840000, total_deduction:726000, total_net:4114000, ssf_employer:968000, status:'Processing',
    employees:[
      { id:'E001', name:'Ramesh Koirala',   dept:'Engineering', designation:'HR Director',            gross:150000, ssf:16500, tax:12000, deduction:28500, net:121500, status:'Processed' },
      { id:'E002', name:'Gita Maharjan',    dept:'Engineering', designation:'Senior React Developer', gross:110000, ssf:12100, tax:8000,  deduction:20100, net:89900,  status:'Processed' },
      { id:'E003', name:'Bikash Thapa',     dept:'DevOps',      designation:'DevOps Lead',            gross:125000, ssf:13750, tax:10000, deduction:23750, net:101250, status:'Pending' },
      { id:'E004', name:'Anita Gurung',     dept:'Design',      designation:'Senior UX Designer',     gross:90000,  ssf:9900,  tax:5000,  deduction:14900, net:75100,  status:'Processed' },
      { id:'E005', name:'Sanjay Shrestha',  dept:'QA',          designation:'QA Engineer',            gross:75000,  ssf:8250,  tax:3000,  deduction:11250, net:63750,  status:'Processed' },
    ]
  },
  CL003: {
    month:'Bhadra 2081', total_employees:32, total_gross:2880000, total_deduction:432000, total_net:2448000, ssf_employer:576000, status:'Finalized',
    employees:[
      { id:'N001', name:'Dev Maharjan',  dept:'Network',  designation:'Network Lead',      gross:130000, ssf:14300, tax:11000, deduction:25300, net:104700, status:'Processed' },
      { id:'N002', name:'Priya Tamang',  dept:'Marketing',designation:'Marketing Manager', gross:85000,  ssf:9350,  tax:4500,  deduction:13850, net:71150,  status:'Processed' },
      { id:'N003', name:'Rajan Karki',   dept:'Sales',    designation:'Sales Manager',     gross:90000,  ssf:9900,  tax:5500,  deduction:15400, net:74600,  status:'Processed' },
    ]
  },
}

const STATUS_C = {
  'Active':           { color:'#059669', bg:'#f0fdf4', border:'#bbf7d0' },
  'Pending Approval': { color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
  'On Hold':          { color:'#64748b', bg:'#f8fafc', border:'#e2e8f0' },
  'Blacklisted':      { color:'#dc2626', bg:'#fef2f2', border:'#fecaca' },
  'Completed':        { color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc' },
}
const CAND_C = {
  'Pending Review':'#f59e0b','Interview Scheduled':'#1e40af',
  'Offer Sent':'#7c3aed','Offer Accepted':'#059669','Rejected by Client':'#ef4444',
}

export default function ATSClientPortalPage() {
  const { navigate, user } = useApp()
  const isClientUser = user?.role === 'client'
  const [selCompanyId, setSelCompanyId] = useState(isClientUser ? (user?.company_id||'CL001') : 'CL001')
  const [tab, setTab]       = useState('overview')
  const [selCand, setSelCand] = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [msg, setMsg]       = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const company   = REGISTERED_COMPANIES.find(c=>c.id===selCompanyId) || REGISTERED_COMPANIES[0]
  const candidates = COMPANY_CANDIDATES[selCompanyId] || []
  const vacancies  = COMPANY_VACANCIES[selCompanyId] || []
  const payroll    = COMPANY_PAYROLL[selCompanyId]
  const sc         = STATUS_C[company.status] || STATUS_C['On Hold']

  const stats = {
    total_vacancies:  vacancies.length,
    active_vacancies: vacancies.filter(v=>v.status==='Active').length,
    filled:           vacancies.filter(v=>v.status==='Filled').length,
    shared:           candidates.length,
    pending:          candidates.filter(c=>c.status==='Pending Review').length,
    hired:            candidates.filter(c=>['Offer Sent','Offer Accepted'].includes(c.status)).length,
    interviews:       candidates.filter(c=>c.status==='Interview Scheduled').length,
  }

  const TABS = [
    { key:'overview',   label:'Company Overview' },
    { key:'vacancies',  label:'My Vacancies' },
    { key:'candidates', label:'Shortlisted CVs' },
    { key:'interviews', label:'Interviews' },
    { key:'placements', label:'Placements' },
    { key:'payroll',    label:'Payroll', show: company.handles_payroll },
    { key:'contract',   label:'My Contract' },
    { key:'support',    label:'Support' },
  ].filter(t=>t.show!==false)

  const inpS = { width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f,#4f46e5)',borderRadius:14,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',gap:14,alignItems:'center',flexWrap:'wrap',marginBottom:12}}>
          <div style={{width:56,height:56,borderRadius:14,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,flexShrink:0,border:'2px solid rgba(255,255,255,.3)'}}>{company.logo}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:17,fontWeight:900}}>{company.name}</div>
            <div style={{fontSize:9,opacity:.75,marginTop:2}}>{company.industry} · {company.hq} · {company.contact_title}: {company.contact_name}</div>
            <div style={{display:'flex',gap:6,marginTop:5,flexWrap:'wrap'}}>
              <span style={{fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:5,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`}}>{company.status}</span>
              <span style={{fontSize:8,padding:'2px 9px',borderRadius:5,background:'rgba(255,255,255,.15)',color:'#fff'}}>{company.id}</span>
              <span style={{fontSize:8,padding:'2px 9px',borderRadius:5,background:'rgba(255,255,255,.15)',color:'#fff'}}>{company.contract_type}</span>
              {company.handles_payroll && <span style={{fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:5,background:'rgba(255,200,0,.25)',color:'#fde68a',border:'1px solid rgba(255,200,0,.3)'}}>Payroll Managed</span>}
            </div>
          </div>
          {!isClientUser && (
            <div>
              <div style={{fontSize:8,color:'rgba(255,255,255,.5)',marginBottom:4,textAlign:'center'}}>Switch Company</div>
              <select value={selCompanyId} onChange={e=>setSelCompanyId(e.target.value)}
                style={{padding:'7px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:9,outline:'none',cursor:'pointer'}}>
                {REGISTERED_COMPANIES.map(c=><option key={c.id} value={c.id} style={{background:'#0f172a'}}>{c.logo} {c.name} ({c.status})</option>)}
              </select>
            </div>
          )}
          {msg&&<span style={{fontSize:9,padding:'5px 12px',background:'rgba(255,255,255,.2)',borderRadius:8}}>{msg}</span>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6,background:'rgba(255,255,255,.08)',borderRadius:10,padding:'8px 12px'}}>
          {[{l:'Vacancies',v:stats.total_vacancies,c:'#60a5fa'},{l:'Active',v:stats.active_vacancies,c:'#34d399'},{l:'Filled',v:stats.filled,c:'#a78bfa'},{l:'Shared CVs',v:stats.shared,c:'#fbbf24'},{l:'Pending',v:stats.pending,c:'#f87171'},{l:'Interviews',v:stats.interviews,c:'#60a5fa'},{l:'Hired',v:stats.hired,c:'#34d399'}].map((s,i)=>(
            <div key={i} style={{textAlign:'center'}}>
              <div style={{fontSize:16,fontWeight:900,color:s.c}}>{s.v}</div>
              <div style={{fontSize:7,opacity:.6}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status block */}
      {company.status==='Pending Approval' && (
        <div style={{background:'#fffbeb',borderRadius:12,padding:'20px',border:'2px solid #fde68a',marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:28,marginBottom:8}}>⏳</div>
          <div style={{fontSize:13,fontWeight:800,color:'#92400e',marginBottom:4}}>Account Pending Approval</div>
          <div style={{fontSize:10,color:'#92400e',lineHeight:1.7}}>Your company registration is under review. Full portal access will be granted once approved. Contact: hr@futureagency.com.np</div>
        </div>
      )}
      {company.status==='On Hold' && (
        <div style={{background:'#f8fafc',borderRadius:12,padding:'20px',border:'2px solid #e2e8f0',marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:28,marginBottom:8}}>🔒</div>
          <div style={{fontSize:13,fontWeight:800,color:'#374151',marginBottom:4}}>Account On Hold</div>
          <div style={{fontSize:10,color:'#64748b',lineHeight:1.7}}>Your portal access is temporarily on hold. Contact your account manager to resolve the issue.</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>{setTab(t.key);setSelCand(null)}}
            style={{padding:'8px 14px',borderRadius:9,border:tab!==t.key?'1px solid #e2e8f0':'none',background:tab===t.key?'#4f46e5':'#fff',color:tab===t.key?'#fff':'#475569',fontSize:9.5,fontWeight:tab===t.key?800:400,cursor:'pointer'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==='overview' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{background:'#fff',borderRadius:13,border:'1px solid #e2e8f0',padding:'16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>Company Details</div>
            {[['Company ID',company.id],['Industry',company.industry],['Headquarters',company.hq],['Contact Person',company.contact_name+' ('+company.contact_title+')'],['Email',company.contact_email],['Phone',company.contact_phone],['Contract Type',company.contract_type],['Commission Rate',company.commission],['Monthly Fee',company.monthly_fee],['Contract Period',company.contract_start+' to '+company.contract_end],['Payroll Service',company.handles_payroll?'Managed by Future ATS':'Not subscribed']].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f8fafc'}}>
                <span style={{fontSize:8.5,color:'#94a3b8'}}>{k}</span>
                <span style={{fontSize:8.5,fontWeight:600,color:'#374151',textAlign:'right',maxWidth:180,wordBreak:'break-all'}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[{l:'Active Vacancies',v:stats.active_vacancies,icon:'💼',c:'#4f46e5'},{l:'Shortlisted CVs',v:stats.shared,icon:'👥',c:'#7c3aed'},{l:'Interviews',v:stats.interviews,icon:'📅',c:'#f59e0b'},{l:'Hired/Offer',v:stats.hired,icon:'✅',c:'#059669'}].map(s=>(
                <div key={s.l} style={{background:'#fff',borderRadius:11,padding:'14px',border:'1px solid #e2e8f0',textAlign:'center'}}>
                  <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontSize:20,fontWeight:900,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:11,padding:'12px',border:'1px solid #e2e8f0'}}>
              <div style={{fontSize:9.5,fontWeight:700,color:'#374151',marginBottom:7}}>Hiring Departments</div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {company.departments.map(d=><span key={d} style={{fontSize:8,padding:'3px 9px',borderRadius:5,background:'#f5f3ff',color:'#7c3aed',border:'1px solid #e9d5ff',fontWeight:600}}>{d}</span>)}
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:11,padding:'12px',border:'1px solid #e2e8f0'}}>
              <div style={{fontSize:9.5,fontWeight:700,color:'#374151',marginBottom:7}}>Quick Actions</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                <button onClick={()=>setTab('vacancies')} style={{padding:'8px',borderRadius:8,border:'none',background:'#4f46e5',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Post Vacancy</button>
                <button onClick={()=>setTab('candidates')} style={{padding:'8px',borderRadius:8,border:'none',background:'#1e40af',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Review CVs</button>
                <button onClick={()=>notify('Message sent!')} style={{padding:'8px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:9,cursor:'pointer'}}>Message Agency</button>
                <button onClick={()=>notify('Report downloading...')} style={{padding:'8px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:9,cursor:'pointer'}}>Download Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VACANCIES */}
      {tab==='vacancies' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>Job Vacancies for {company.name}</div>
            <button onClick={()=>notify('Vacancy request sent to Future ATS!')} style={{padding:'8px 18px',borderRadius:9,border:'none',background:'#4f46e5',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>+ Request New Vacancy</button>
          </div>
          {vacancies.length===0 ? (
            <div style={{textAlign:'center',padding:'60px',background:'#fff',borderRadius:14,border:'1px dashed #e2e8f0'}}>
              <div style={{fontSize:36,marginBottom:12}}>💼</div>
              <div style={{fontSize:12,fontWeight:700,color:'#64748b',marginBottom:10}}>No vacancies yet</div>
              <button onClick={()=>notify('Vacancy request sent!')} style={{padding:'9px 22px',borderRadius:9,border:'none',background:'#4f46e5',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Request First Vacancy</button>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
              {vacancies.map(v=>(
                <div key={v.id} style={{background:'#fff',borderRadius:13,border:'1px solid #f1f5f9',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                  <div style={{height:4,background:v.status==='Active'?'#4f46e5':v.status==='Filled'?'#059669':'#f59e0b'}}/>
                  <div style={{padding:'14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                      <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{v.title}</div>
                      <span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:5,background:v.status==='Active'?'#f0fdf4':v.status==='Filled'?'#eff6ff':'#fffbeb',color:v.status==='Active'?'#059669':v.status==='Filled'?'#1e40af':'#f59e0b'}}>{v.status}</span>
                    </div>
                    <div style={{fontSize:8.5,color:'#64748b',marginBottom:8}}>{v.dept} · {v.openings} opening{v.openings>1?'s':''} · {v.salary}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:10}}>
                      {[{l:'CVs',v:v.candidates},{l:'Posted',v:v.posted.slice(5)},{l:'Deadline',v:v.deadline.slice(5)}].map(s=>(
                        <div key={s.l} style={{textAlign:'center',padding:'5px',background:'#f8fafc',borderRadius:6}}>
                          <div style={{fontSize:10,fontWeight:800,color:'#4f46e5'}}>{s.v}</div>
                          <div style={{fontSize:7,color:'#94a3b8'}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>setTab('candidates')} style={{width:'100%',padding:'7px',borderRadius:8,border:'none',background:'#4f46e5',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>View Candidates ({v.candidates})</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CANDIDATES */}
      {tab==='candidates' && (
        <div style={{display:'flex',gap:14}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>Shortlisted Candidates ({candidates.length})</div>
            {candidates.length===0 ? (
              <div style={{textAlign:'center',padding:'60px',background:'#fff',borderRadius:14,border:'1px dashed #e2e8f0'}}>
                <div style={{fontSize:36,marginBottom:10}}>👥</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>No candidates shortlisted yet for {company.name}.</div>
              </div>
            ) : candidates.map(c=>(
              <div key={c.id} onClick={()=>setSelCand(selCand?.id===c.id?null:c)}
                style={{background:'#fff',borderRadius:12,padding:'13px 15px',marginBottom:8,border:`2px solid ${selCand?.id===c.id?'#4f46e5':'#f1f5f9'}`,cursor:'pointer',transition:'border .1s'}}>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{width:42,height:42,borderRadius:11,background:`linear-gradient(135deg,${CAND_C[c.status]||'#64748b'},${CAND_C[c.status]||'#64748b'}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color:'#fff',flexShrink:0,position:'relative'}}>
                    {c.avatar}
                    <span style={{position:'absolute',bottom:-4,right:-4,fontSize:12}}>{c.rank==='Gold'?'🥇':c.rank==='Silver'?'🥈':'🥉'}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                      <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.name}</span>
                      <span style={{fontSize:7.5,fontWeight:700,padding:'2px 8px',borderRadius:5,background:(CAND_C[c.status]||'#64748b')+'15',color:CAND_C[c.status]||'#64748b'}}>{c.status}</span>
                    </div>
                    <div style={{fontSize:8.5,color:'#64748b'}}>{c.role} · {c.dept} · Salary: {c.salary}</div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Shared: {c.shared}{c.interview_date?' · Interview: '+c.interview_date:''}</div>
                  </div>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:c.score>=85?'#059669':c.score>=70?'#f59e0b':'#ef4444'}}>{c.score}%</div>
                    <div style={{fontSize:7.5,color:'#94a3b8'}}>AI Score</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,marginTop:10}}>
                  <button onClick={e=>{e.stopPropagation();notify('Interview scheduled for '+c.name+'!')}} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#1e40af',color:'#fff',fontSize:8.5,fontWeight:700,cursor:'pointer'}}>Schedule Interview</button>
                  <button onClick={e=>{e.stopPropagation();notify('Approved! Agency notified.')}} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#059669',color:'#fff',fontSize:8.5,fontWeight:700,cursor:'pointer'}}>Approve</button>
                  <button onClick={e=>{e.stopPropagation();notify('Rejected. Agency notified.')}} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#fef2f2',color:'#ef4444',fontSize:8.5,fontWeight:700,cursor:'pointer'}}>Reject</button>
                  <button onClick={e=>{e.stopPropagation();setSelCand(c)}} style={{padding:'5px 12px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8.5,cursor:'pointer'}}>View CV</button>
                </div>
              </div>
            ))}
          </div>
          {selCand && (
            <div style={{width:310,flexShrink:0,background:'#fff',borderRadius:13,border:'1px solid #e2e8f0',overflow:'hidden',position:'sticky',top:0,maxHeight:'80vh',overflowY:'auto'}}>
              <div style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',padding:'14px',color:'#fff'}}>
                <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:8}}>
                  <div style={{width:44,height:44,borderRadius:11,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900}}>{selCand.avatar}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:900}}>{selCand.name}</div>
                    <div style={{fontSize:8.5,opacity:.8}}>{selCand.role} · {selCand.dept}</div>
                    <div style={{fontSize:8.5,opacity:.7}}>Salary: {selCand.salary}</div>
                  </div>
                  <button onClick={()=>setSelCand(null)} style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',width:26,height:26,borderRadius:'50%',cursor:'pointer',fontSize:12}}>X</button>
                </div>
                <div style={{display:'flex',gap:8,background:'rgba(255,255,255,.1)',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{textAlign:'center',flex:1}}><div style={{fontSize:18,fontWeight:900}}>{selCand.score}%</div><div style={{fontSize:7,opacity:.7}}>AI Score</div></div>
                  <div style={{textAlign:'center',flex:1}}><div style={{fontSize:14}}>{selCand.rank==='Gold'?'🥇':selCand.rank==='Silver'?'🥈':'🥉'}</div><div style={{fontSize:7,opacity:.7}}>{selCand.rank}</div></div>
                  <div style={{textAlign:'center',flex:1}}><div style={{fontSize:10,fontWeight:800,color:(CAND_C[selCand.status]||'#fff')}}>{selCand.status.split(' ').slice(0,2).join(' ')}</div><div style={{fontSize:7,opacity:.7}}>Status</div></div>
                </div>
              </div>
              <div style={{padding:'14px'}}>
                {[['Shared',selCand.shared],['Interview',selCand.interview_date||'Not scheduled'],['Department',selCand.dept],['Role',selCand.role]].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f8fafc'}}>
                    <span style={{fontSize:8.5,color:'#94a3b8'}}>{k}</span>
                    <span style={{fontSize:8.5,fontWeight:600,color:'#374151'}}>{v}</span>
                  </div>
                ))}
                <div style={{marginTop:12,marginBottom:6}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#374151',marginBottom:5}}>Your Feedback</div>
                  {selCand.feedback ? (
                    <div style={{background:'#f0fdf4',borderRadius:8,padding:'9px',fontSize:9,color:'#065f46',lineHeight:1.6,border:'1px solid #bbf7d0'}}>{selCand.feedback}</div>
                  ) : (
                    <div>
                      <textarea value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} rows={3} placeholder="Add feedback about this candidate..." style={{width:'100%',padding:'7px 9px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:9,outline:'none',resize:'vertical',boxSizing:'border-box',lineHeight:1.5}}/>
                      <button onClick={()=>{if(feedbackText.trim()){notify('Feedback submitted!');setFeedbackText('')}}} disabled={!feedbackText.trim()}
                        style={{width:'100%',padding:'7px',borderRadius:7,border:'none',background:feedbackText.trim()?'#4f46e5':'#e2e8f0',color:feedbackText.trim()?'#fff':'#94a3b8',fontSize:9,fontWeight:700,cursor:feedbackText.trim()?'pointer':'default',marginTop:5}}>
                        Submit Feedback
                      </button>
                    </div>
                  )}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginTop:4}}>
                  <button onClick={()=>notify('Interview scheduled!')} style={{padding:'8px',borderRadius:8,border:'none',background:'#1e40af',color:'#fff',fontSize:8.5,fontWeight:700,cursor:'pointer'}}>Schedule Interview</button>
                  <button onClick={()=>notify('Approved for hire!')} style={{padding:'8px',borderRadius:8,border:'none',background:'#059669',color:'#fff',fontSize:8.5,fontWeight:700,cursor:'pointer'}}>Approve for Hire</button>
                  <button onClick={()=>notify('CV downloaded!')} style={{padding:'8px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:8.5,cursor:'pointer'}}>Download CV</button>
                  <button onClick={()=>notify('Candidate rejected!')} style={{padding:'8px',borderRadius:8,border:'1px solid #fecaca',background:'#fef2f2',color:'#ef4444',fontSize:8.5,cursor:'pointer'}}>Reject</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INTERVIEWS */}
      {tab==='interviews' && (
        <div>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>Scheduled Interviews</div>
          {candidates.filter(c=>c.interview_date).length===0 ? (
            <div style={{textAlign:'center',padding:'60px',background:'#fff',borderRadius:14,border:'1px dashed #e2e8f0'}}>
              <div style={{fontSize:36,marginBottom:10}}>📅</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>No interviews scheduled yet.</div>
            </div>
          ) : candidates.filter(c=>c.interview_date).map(c=>(
            <div key={c.id} style={{background:'#fff',borderRadius:12,padding:'14px 16px',marginBottom:8,border:'1px solid #f1f5f9',display:'flex',gap:12,alignItems:'center'}}>
              <div style={{width:42,height:42,borderRadius:11,background:'linear-gradient(135deg,#4f46e5,#6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'#fff',flexShrink:0}}>{c.avatar}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:2}}>{c.name}</div>
                <div style={{fontSize:8.5,color:'#64748b'}}>{c.role} · {c.dept}</div>
                <div style={{fontSize:8.5,color:'#4f46e5',fontWeight:600,marginTop:2}}>Interview: {c.interview_date}</div>
              </div>
              <span style={{fontSize:8.5,fontWeight:700,padding:'3px 10px',borderRadius:6,background:'#eef2ff',color:'#4f46e5',border:'1px solid #c7d2fe'}}>{c.status}</span>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>notify('Confirmed!')} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#059669',color:'#fff',fontSize:8.5,fontWeight:700,cursor:'pointer'}}>Confirm</button>
                <button onClick={()=>notify('Reschedule requested!')} style={{padding:'5px 12px',borderRadius:7,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8.5,cursor:'pointer'}}>Reschedule</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PLACEMENTS */}
      {tab==='placements' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
            {[{l:'Total Placed',v:stats.hired,icon:'✅',c:'#059669'},{l:'CVs Shared',v:stats.shared,icon:'👥',c:'#1e40af'},{l:'Conversion %',v:Math.round(stats.hired/Math.max(stats.shared,1)*100)+'%',icon:'📊',c:'#7c3aed'},{l:'Filled Vacancies',v:stats.filled,icon:'💼',c:'#f59e0b'}].map(s=>(
              <div key={s.l} style={{background:'#fff',borderRadius:11,padding:'14px',border:'1px solid #e2e8f0',textAlign:'center'}}>
                <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
                <div style={{fontSize:20,fontWeight:900,color:s.c}}>{s.v}</div>
                <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#f0fdf4',borderRadius:10,padding:'12px 14px',border:'1px solid #bbf7d0',fontSize:9.5,color:'#065f46',lineHeight:1.7}}>
            Successful placements: {candidates.filter(c=>c.status==='Offer Accepted').map(c=>c.name).join(', ')||'None yet'}.
            Commission: {company.commission} per placement, payable within 30 days of joining date.
          </div>
        </div>
      )}

      {/* PAYROLL */}
      {tab==='payroll' && (
        <div>
          {!company.handles_payroll ? (
            <div style={{textAlign:'center',padding:'60px',background:'#fff',borderRadius:14,border:'1px dashed #e2e8f0'}}>
              <div style={{fontSize:40,marginBottom:14}}>💰</div>
              <div style={{fontSize:14,fontWeight:800,color:'#374151',marginBottom:6}}>Payroll Service Not Subscribed</div>
              <div style={{fontSize:10,color:'#64748b',marginBottom:20,lineHeight:1.7}}>Future ATS is not currently managing payroll for {company.name}.<br/>Subscribe to our Payroll Management service to view and process employee salaries.</div>
              <button onClick={()=>notify('Payroll subscription request sent!')} style={{padding:'10px 28px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Subscribe to Payroll Service</button>
            </div>
          ) : payroll ? (
            <div>
              <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f)',borderRadius:13,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:12}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:900}}>Payroll Summary -- {payroll.month}</div>
                    <div style={{fontSize:9,opacity:.7,marginTop:2}}>{company.name} · {payroll.total_employees} Employees</div>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,padding:'4px 12px',borderRadius:7,background:payroll.status==='Finalized'?'#f0fdf4':'#fffbeb',color:payroll.status==='Finalized'?'#059669':'#f59e0b'}}>{payroll.status}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {[{l:'Total Gross',v:'NPR '+payroll.total_gross.toLocaleString(),c:'#60a5fa'},{l:'Total Deduction',v:'NPR '+payroll.total_deduction.toLocaleString(),c:'#f87171'},{l:'Total Net Pay',v:'NPR '+payroll.total_net.toLocaleString(),c:'#34d399'},{l:'SSF (Employer)',v:'NPR '+payroll.ssf_employer.toLocaleString(),c:'#fbbf24'}].map(s=>(
                    <div key={s.l} style={{background:'rgba(255,255,255,.08)',borderRadius:9,padding:'10px',textAlign:'center'}}>
                      <div style={{fontSize:12,fontWeight:900,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:7.5,opacity:.6,marginTop:2}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:10}}>
                <div style={{background:'#0f172a',display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 60px 60px 80px 80px',padding:'9px 14px',gap:8}}>
                  {['Employee','Designation','Department','Gross','SSF','Tax','Net Pay','Status'].map(h=><div key={h} style={{fontSize:8,fontWeight:700,color:'#64748b'}}>{h}</div>)}
                </div>
                {payroll.employees.map((emp,i)=>(
                  <div key={emp.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 80px 60px 60px 80px 80px',padding:'10px 14px',gap:8,borderBottom:'1px solid #f1f5f9',alignItems:'center',background:i%2===0?'#fff':'#fafafa'}}>
                    <div><div style={{fontSize:9.5,fontWeight:700,color:'#0f172a'}}>{emp.name}</div><div style={{fontSize:7.5,color:'#94a3b8'}}>{emp.id}</div></div>
                    <div style={{fontSize:8.5,color:'#64748b'}}>{emp.designation}</div>
                    <div style={{fontSize:8.5,color:'#64748b'}}>{emp.dept}</div>
                    <div style={{fontSize:9,fontWeight:700,color:'#059669'}}>NPR {emp.gross.toLocaleString()}</div>
                    <div style={{fontSize:9,color:'#64748b'}}>{emp.ssf.toLocaleString()}</div>
                    <div style={{fontSize:9,color:'#64748b'}}>{emp.tax.toLocaleString()}</div>
                    <div style={{fontSize:9,fontWeight:700,color:'#1e40af'}}>NPR {emp.net.toLocaleString()}</div>
                    <span style={{fontSize:7.5,fontWeight:700,padding:'2px 6px',borderRadius:4,background:emp.status==='Processed'?'#f0fdf4':'#fffbeb',color:emp.status==='Processed'?'#059669':'#f59e0b'}}>{emp.status}</span>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                <button onClick={()=>notify('Payroll PDF downloaded!')} style={{padding:'9px 18px',borderRadius:9,border:'none',background:'#ef4444',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Download PDF</button>
                <button onClick={()=>notify('Excel exported!')} style={{padding:'9px 18px',borderRadius:9,border:'none',background:'#059669',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Export Excel</button>
                <button onClick={()=>notify('Bank file ready!')} style={{padding:'9px 18px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:9,cursor:'pointer'}}>Bank Transfer File</button>
                <button onClick={()=>notify('Payslips sent!')} style={{padding:'9px 18px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:9,cursor:'pointer'}}>Send Payslips</button>
              </div>
              <div style={{background:'#fffbeb',borderRadius:9,padding:'10px 12px',border:'1px solid #fde68a',fontSize:9,color:'#92400e',lineHeight:1.7}}>
                Nepal Labour Act 2074: SSF (Employer 20% + Employee 11%) deducted. Tax per Income Tax Act 2058. Payroll processed by Future Recruitment Agency on behalf of {company.name}.
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* CONTRACT */}
      {tab==='contract' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{background:'#fff',borderRadius:13,border:'1px solid #e2e8f0',padding:'16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>Contract Details</div>
            {[['Contract Type',company.contract_type],['Commission Rate',company.commission],['Monthly Retainer',company.monthly_fee],['Contract Start',company.contract_start],['Contract End',company.contract_end],['Status',company.status]].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f8fafc'}}>
                <span style={{fontSize:9,color:'#94a3b8'}}>{k}</span>
                <span style={{fontSize:9,fontWeight:700,color:'#374151'}}>{v}</span>
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={()=>notify('Contract PDF downloaded!')} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#4f46e5',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Download Contract</button>
              <button onClick={()=>notify('Renewal request sent!')} style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:9,cursor:'pointer'}}>Request Renewal</button>
            </div>
          </div>
          <div style={{background:'#fff',borderRadius:13,border:'1px solid #e2e8f0',padding:'16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>Account Manager</div>
            <div style={{background:'#f8fafc',borderRadius:9,padding:'12px',border:'1px solid #e2e8f0',marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:2}}>Maya Pradhan</div>
              <div style={{fontSize:9,color:'#64748b',marginBottom:1}}>Senior Account Manager</div>
              <div style={{fontSize:9,color:'#1e40af'}}>maya@futureagency.com.np</div>
              <div style={{fontSize:9,color:'#059669',marginTop:1}}>+977-9801234567</div>
              <div style={{display:'flex',gap:6,marginTop:10}}>
                <button onClick={()=>notify('Email sent!')} style={{flex:1,padding:'7px',borderRadius:7,border:'none',background:'#1e40af',color:'#fff',fontSize:8.5,fontWeight:700,cursor:'pointer'}}>Email</button>
                <button onClick={()=>notify('WhatsApp sent!')} style={{flex:1,padding:'7px',borderRadius:7,border:'none',background:'#25d366',color:'#fff',fontSize:8.5,fontWeight:700,cursor:'pointer'}}>WhatsApp</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPPORT */}
      {tab==='support' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{background:'#fff',borderRadius:13,border:'1px solid #e2e8f0',padding:'16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>Message Us</div>
            <textarea rows={5} placeholder="Type your message to Future Recruitment Agency team..."
              style={{width:'100%',padding:'9px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,outline:'none',resize:'vertical',boxSizing:'border-box',lineHeight:1.6,marginBottom:10}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>notify('Message sent!')} style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:'#4f46e5',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Send Message</button>
              <button onClick={()=>notify('Meeting scheduled!')} style={{flex:1,padding:'9px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:9,cursor:'pointer'}}>Book Meeting</button>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[{icon:'📧',l:'Email',v:'hr@futureagency.com.np',c:'#1e40af'},{icon:'📱',l:'Phone',v:'+977-01-4XXXXXX',c:'#059669'},{icon:'💬',l:'WhatsApp',v:'+977-98XXXXXXXX',c:'#25d366'},{icon:'🕐',l:'Office Hours',v:'Sun-Fri 9:00 AM - 6:00 PM',c:'#7c3aed'}].map(c=>(
              <div key={c.l} style={{background:'#fff',borderRadius:10,padding:'12px 14px',border:'1px solid #e2e8f0',display:'flex',gap:10,alignItems:'center'}}>
                <div style={{fontSize:20}}>{c.icon}</div>
                <div><div style={{fontSize:8.5,color:'#94a3b8'}}>{c.l}</div><div style={{fontSize:10,fontWeight:700,color:c.c}}>{c.v}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

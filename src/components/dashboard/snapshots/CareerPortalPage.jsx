// FILE: CareerPortalPage.jsx - Career Portal (Recruiter + Candidate views)
import { useState } from 'react'
import { ExcelModal, PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const OPEN_JOBS = [
  {id:'j1',title:'Senior Software Developer',dept:'IT',location:'Kathmandu',type:'Full-Time',remote:'Hybrid',salary:'NPR 80K-130K',exp:'5+ years',posted:'2025-06-01',deadline:'2025-07-31',applicants:47,featured:true,tags:['React','Python','PostgreSQL']},
  {id:'j2',title:'HR Business Partner',dept:'HR',location:'Kathmandu',type:'Full-Time',remote:'On-site',salary:'NPR 90K-120K',exp:'4+ years',posted:'2025-06-05',deadline:'2025-08-15',applicants:22,featured:false,tags:['HRIS','Labour Law','Talent Acquisition']},
  {id:'j3',title:'Customer Service Rep',dept:'Customer',location:'Pokhara',type:'Full-Time',remote:'On-site',salary:'NPR 35K-50K',exp:'1+ years',posted:'2025-06-01',deadline:'2025-07-15',applicants:63,featured:false,tags:['Communication','CRM','Nepali & English']},
  {id:'j4',title:'Finance Manager',dept:'Finance',location:'Kathmandu',type:'Full-Time',remote:'On-site',salary:'NPR 130K-160K',exp:'7+ years',posted:'2025-04-15',deadline:'2025-06-30',applicants:18,featured:true,tags:['CA/ACCA','Tax','ERP']},
  {id:'j5',title:'Cloud Architect',dept:'IT',location:'Kathmandu',type:'Full-Time',remote:'Remote-friendly',salary:'NPR 160K-200K',exp:'8+ years',posted:'2025-06-13',deadline:'2025-09-30',applicants:5,featured:true,tags:['AWS','GCP','Kubernetes','DevOps']},
]

const COMPANY_STATS = [
  {icon:'👥',label:'Employees',value:'500+'},
  {icon:'🌍',label:'Locations',value:'4'},
  {icon:'🏆',label:'Est.',value:'2015'},
  {icon:'📈',label:'Growth',value:'32% YoY'},
]

const TESTIMONIALS = [
  {name:'Rina Shrestha',role:'Software Engineer',quote:'NepHR Pro has a culture of continuous learning. Best career decision!',avatar:'RS'},
  {name:'Bikash Karki',role:'Finance Analyst',quote:'Transparent leadership and great benefits. Highly recommend.',avatar:'BK'},
]

export default function CareerPortalPage() {
  const [portalView, setPortalView] = useState('candidate')
  const [search, setSearch]         = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterRemote, setFilterRemote] = useState('all')
  const [showApply, setShowApply]   = useState(null)
  const [showExcel, setShowExcel]   = useState(false)
  const [appStep, setAppStep]       = useState(1)

  const depts = [...new Set(OPEN_JOBS.map(j=>j.dept))]
  const filtered = OPEN_JOBS.filter(j=>{
    if (filterDept!=='all'&&j.dept!==filterDept) return false
    if (filterRemote!=='all'&&j.remote!==filterRemote) return false
    if (search&&!j.title.toLowerCase().includes(search.toLowerCase())&&!j.tags.join(' ').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div onClick={()=>{}}>
      <PageHeader icon="🌐" title="Career Portal"
        breadcrumb="Employee Lifecycle > Recruitment > Recruitment Management"
        gradient={G}
        stats={[
          {icon:'🟢',label:'Open Positions', value:OPEN_JOBS.length},
          {icon:'📩',label:'Applications YTD',value:OPEN_JOBS.reduce((s,j)=>s+j.applicants,0)},
          {icon:'⭐',label:'Featured Jobs',  value:OPEN_JOBS.filter(j=>j.featured).length},
          {icon:'🌍',label:'Locations',       value:4},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      {/* View toggle: Recruiter vs Candidate */}
      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:4,borderRadius:12,marginBottom:16,width:'fit-content'}}>
        {['candidate','recruiter'].map(v=>(
          <button key={v} onClick={()=>setPortalView(v)}
            style={{padding:'10px 24px',borderRadius:9,border:'none',cursor:'pointer',
              background:portalView===v?'#fff':'transparent',color:portalView===v?A:'#64748b',
              fontWeight:portalView===v?700:400,fontSize:12,boxShadow:portalView===v?'0 1px 4px rgba(0,0,0,.1)':'none'}}>
            {v==='candidate'?'Candidate View':'Recruiter View'}
          </button>
        ))}
      </div>

      {/* CANDIDATE VIEW */}
      {portalView==='candidate' && (
        <div>
          {/* Hero Banner */}
          <div style={{background:G,borderRadius:16,padding:'32px 32px',marginBottom:20,color:'#fff',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.1)'}}/>
            <div style={{position:'relative',zIndex:1}}>
              <div style={{fontSize:28,fontWeight:900,marginBottom:8}}>Join Our Growing Team</div>
              <div style={{fontSize:14,color:'rgba(255,255,255,.85)',marginBottom:20}}>Build the future of HR technology in Nepal. {OPEN_JOBS.length} open positions across {[...new Set(OPEN_JOBS.map(j=>j.location))].length} locations.</div>
              <div style={{display:'flex',gap:8}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search jobs, skills, departments..."
                  style={{flex:1,padding:'12px 16px',borderRadius:10,border:'none',fontSize:13,outline:'none',maxWidth:400}}/>
                <button style={{padding:'12px 24px',borderRadius:10,border:'none',background:'rgba(255,255,255,.2)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',backdropFilter:'blur(10px)'}}>Search</button>
              </div>
            </div>
          </div>

          {/* Company stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
            {COMPANY_STATS.map((s,i)=>(
              <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px',textAlign:'center'}}>
                <div style={{fontSize:22}}>{s.icon}</div>
                <div style={{fontSize:20,fontWeight:900,color:A,marginTop:4}}>{s.value}</div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
            <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
              style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
              <option value="all">All Departments</option>
              {depts.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filterRemote} onChange={e=>setFilterRemote(e.target.value)}
              style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
              <option value="all">All Work Types</option>
              <option value="Remote-friendly">Remote-friendly</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>

          {/* Job cards */}
          <div style={{display:'grid',gap:12}}>
            {filtered.map(job=>(
              <div key={job.id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'18px 20px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',borderLeft:job.featured?`4px solid ${A}`:'4px solid #e2e8f0'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
                  <div style={{width:44,height:44,borderRadius:12,background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                    {job.dept==='IT'?'💻':job.dept==='Finance'?'💰':job.dept==='HR'?'👥':'🎯'}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                      <span style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{job.title}</span>
                      {job.featured&&<span style={{background:'#fffbeb',color:'#b45309',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,border:'1px solid #fde68a'}}>⭐ Featured</span>}
                      <span style={{background:job.remote==='Remote-friendly'?'#f0fdf4':job.remote==='Hybrid'?'#eff6ff':'#f8fafc',color:job.remote==='Remote-friendly'?'#15803d':job.remote==='Hybrid'?'#1d4ed8':'#64748b',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{job.remote}</span>
                    </div>
                    <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>{job.dept} . {job.location} . {job.type} . {job.exp}</div>
                    <div style={{fontSize:11,fontWeight:700,color:'#10b981',marginBottom:6}}>{job.salary}</div>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      {job.tags.map((t,i)=><span key={i} style={{background:'#f8fafc',color:'#475569',fontSize:9,padding:'2px 8px',borderRadius:20,border:'1px solid #e2e8f0'}}>{t}</span>)}
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:10,color:'#94a3b8',marginBottom:2}}>Deadline: {job.deadline}</div>
                    <div style={{fontSize:10,color:'#94a3b8',marginBottom:10}}>{job.applicants} applicants</div>
                    <button onClick={()=>{setShowApply(job);setAppStep(1)}}
                      style={{padding:'9px 20px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                      Easy Apply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div style={{marginTop:20}}>
            <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:12}}>What our employees say</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {TESTIMONIALS.map((t,i)=>(
                <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'16px 18px'}}>
                  <div style={{fontSize:12,color:'#475569',fontStyle:'italic',marginBottom:10}}>"{t.quote}"</div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:`${A}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:A}}>{t.avatar}</div>
                    <div><div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{t.name}</div><div style={{fontSize:10,color:'#94a3b8'}}>{t.role}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RECRUITER VIEW */}
      {portalView==='recruiter' && (
        <div>
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',background:'linear-gradient(135deg,#f0f9ff,#eff6ff)',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>Active Job Postings</span>
              <button onClick={()=>setShowExcel(true)} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>Export</button>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    {['Position','Dept','Location','Deadline','Applicants','Status','Conversion','Actions'].map(h=>(
                      <th key={h} style={{padding:'11px 12px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OPEN_JOBS.map(j=>(
                    <tr key={j.id} style={{borderBottom:'1px solid #f8fafc'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
                      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={{padding:'10px 12px',fontWeight:700,color:'#0f172a'}}>{j.title}</td>
                      <td style={{padding:'10px 12px',color:'#64748b'}}>{j.dept}</td>
                      <td style={{padding:'10px 12px',color:'#64748b'}}>{j.location}</td>
                      <td style={{padding:'10px 12px',color:'#64748b',fontSize:10}}>{j.deadline}</td>
                      <td style={{padding:'10px 12px',fontWeight:700,color:A,textAlign:'center'}}>{j.applicants}</td>
                      <td style={{padding:'10px 12px'}}><span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>Live</span></td>
                      <td style={{padding:'10px 12px',color:'#10b981',fontWeight:700}}>{Math.round(j.applicants/(j.applicants+j.applicants*.8)*100)}%</td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{display:'flex',gap:5}}>
                          <button style={{padding:'4px 8px',borderRadius:6,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:9,cursor:'pointer',fontWeight:600}}>Edit</button>
                          <button style={{padding:'4px 8px',borderRadius:6,border:'none',background:G,color:'#fff',fontSize:9,cursor:'pointer',fontWeight:600}}>ATS</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Easy Apply Modal - 3-step wizard */}
      {showApply&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowApply(null)}>
          <div style={{background:'#fff',borderRadius:20,width:580,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
              <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>Apply: {showApply.title}</div>
              <div style={{display:'flex',gap:4,marginTop:10}}>
                {[1,2,3].map(s=>(
                  <div key={s} style={{flex:1,height:4,borderRadius:4,background:s<=appStep?'rgba(255,255,255,.9)':'rgba(255,255,255,.3)'}}/>
                ))}
              </div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:4}}>Step {appStep} of 3: {appStep===1?'Personal Info':appStep===2?'Upload CV':'Review & Submit'}</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              {appStep===1&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                  <div style={{gridColumn:'1/-1',marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:8}}>Personal Information (Voice input supported 🎤)</div>
                  </div>
                  {[['Full Name','text','e.g. Ram Prasad Sharma'],['Email','email','your@email.com'],['Phone','tel','98XXXXXXXX'],['Location','text','Kathmandu, Nepal'],['LinkedIn URL','url','Optional'],['Notice Period','select','']].map(([l,t,h],i)=>(
                    <div key={i} style={{marginBottom:12}}>
                      <label style={{fontSize:11,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                      {t==='select'?<select style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:12}}><option>Immediate</option><option>1 Month</option><option>2 Months</option></select>
                      :<input type={t} placeholder={h} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none'}}/>}
                    </div>
                  ))}
                </div>
              )}
              {appStep===2&&(
                <div>
                  <div style={{border:'2px dashed #bfdbfe',borderRadius:14,padding:'32px',textAlign:'center',marginBottom:16,background:'#f0f9ff',cursor:'pointer'}}>
                    <div style={{fontSize:36,marginBottom:8}}>📄</div>
                    <div style={{fontSize:13,fontWeight:700,color:'#1d4ed8',marginBottom:4}}>Upload CV / Resume</div>
                    <div style={{fontSize:11,color:'#64748b'}}>PDF, DOC, DOCX (Max 5MB). AI will auto-parse your details.</div>
                  </div>
                  <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'12px 14px',fontSize:11,color:'#065f46'}}>
                    🤖 <strong>AI Resume Parser:</strong> Your CV will be automatically scanned and matched against the job requirements. Top skills and experience will be highlighted for the recruiter.
                  </div>
                </div>
              )}
              {appStep===3&&(
                <div>
                  <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'16px',marginBottom:14}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#065f46',marginBottom:8}}>Application Summary</div>
                    <div style={{fontSize:11,color:'#475569'}}>Position: <strong>{showApply.title}</strong></div>
                    <div style={{fontSize:11,color:'#475569'}}>Department: {showApply.dept}</div>
                    <div style={{fontSize:11,color:'#475569'}}>Salary: {showApply.salary}</div>
                  </div>
                  <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'12px',fontSize:10,color:'#92400e'}}>
                    By submitting, you confirm your information is accurate and consent to data processing for recruitment purposes per Nepal data privacy guidelines.
                  </div>
                </div>
              )}
              <div style={{display:'flex',gap:10,marginTop:16}}>
                {appStep>1&&<button onClick={()=>setAppStep(p=>p-1)} style={{padding:'12px 20px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Back</button>}
                <button onClick={()=>appStep<3?setAppStep(p=>p+1):setShowApply(null)}
                  style={{flex:1,padding:13,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                  {appStep<3?'Continue':'Submit Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExcel&&<ExcelModal title="Career Portal" columns={['Job ID','Title','Department','Location','Type','Remote','Salary','Experience','Posted','Deadline','Applicants']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

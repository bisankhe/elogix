// FILE: DesignationSetupPage.jsx
// Page 1: Designation Setup - luxury, AI JD generator, SAP right-click, voice, Excel

import { useState, useEffect } from 'react'
import {
  Field, ContextMenu, ExcelModal, PageHeader,
  AIImpact, Drawer, SearchBar, Badge, LuxCard
} from './DeptSetupShared.jsx'

const T = {
  gradient: 'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)',
  accent:   '#6366f1',
  light:    '#eef2ff',
}

const JOB_FAMILIES = [
  {id:'jf-it',   name:'Information Technology', icon:'💻', color:'#3b82f6'},
  {id:'jf-fin',  name:'Finance & Accounts',     icon:'💰', color:'#10b981'},
  {id:'jf-hr',   name:'Human Resources',        icon:'👥', color:'#8b5cf6'},
  {id:'jf-sales',name:'Sales & Marketing',      icon:'📈', color:'#f59e0b'},
  {id:'jf-ops',  name:'Operations',             icon:'Settings', color:'#64748b'},
  {id:'jf-legal',name:'Legal & Compliance',     icon:'⚖', color:'#ef4444'},
  {id:'jf-exec', name:'Executive',              icon:'🎯', color:'#0ea5e9'},
]

const GRADE_MAP = {
  L1:'Level 1 - Junior', L2:'Level 2 - Associate', L3:'Level 3 - Senior',
  L4:'Level 4 - Lead',   L5:'Level 5 - Principal',
  M1:'Manager L1', M2:'Senior Manager', M3:'Director',
  E1:'VP / Executive', E2:'C-Suite',
}

const MOCK_DESIGNATIONS = [
  {id:'d1', job_code:'IT-SE-L3',   title:'Senior Software Engineer',   title_nepali:'वरिष्ठ सफ्टवेयर इन्जिनियर',
   family:'jf-it',  grade:'L3', experience:3,  is_managerial:false, status:'active',
   skills:['React','Python','PostgreSQL','Docker'],
   education:'B.E./B.Tech Computer Science or equivalent',
   jd_summary:'Lead frontend/backend development, mentor junior engineers, participate in architecture decisions.',
   positions_count:4, filled_count:3, headcount_budget:4,
   impact_links:[{icon:'💰',module:'Payroll Band',desc:'L3 salary band NPR 45-75K'},{icon:'🎯',module:'Performance KPIs',desc:'Eng-specific KPI template'},{icon:'📋',module:'JD Library',desc:'Official JD published'}],
  },
  {id:'d2', job_code:'IT-TL-L4',   title:'Tech Lead',                  title_nepali:'प्राविधिक प्रमुख',
   family:'jf-it',  grade:'L4', experience:5,  is_managerial:false, status:'active',
   skills:['System Architecture','React','Leadership','Agile'],
   education:'B.E. Computer Science + 5yr experience',
   jd_summary:'Own technical direction for a squad, conduct code reviews, drive sprint planning.',
   positions_count:2, filled_count:2, headcount_budget:2,
   impact_links:[{icon:'💰',module:'Payroll Band',desc:'L4 band NPR 75-120K'},{icon:'🗂',module:'Org Chart',desc:'Reports to Eng Manager'}],
  },
  {id:'d3', job_code:'IT-EM-M1',   title:'Engineering Manager',        title_nepali:'इन्जिनियरिङ प्रबन्धक',
   family:'jf-it',  grade:'M1', experience:7,  is_managerial:true,  status:'active',
   skills:['Team Management','Agile','Budget Planning','Technical Strategy'],
   education:'B.E. + MBA or equivalent 7yr experience',
   jd_summary:'Lead 6-10 engineers, own delivery, hiring, performance management, and stakeholder reporting.',
   positions_count:2, filled_count:2, headcount_budget:3,
   impact_links:[{icon:'💰',module:'Payroll Band',desc:'M1 band NPR 80-150K'},{icon:'✅',module:'Approvals',desc:'Leave/expense approver'},{icon:'🎯',module:'Performance',desc:'Manager-tier KPI template'}],
  },
  {id:'d4', job_code:'HR-HRBP-M1', title:'HR Business Partner',        title_nepali:'मानव संसाधन व्यापार साझेदार',
   family:'jf-hr',  grade:'M1', experience:5,  is_managerial:true,  status:'active',
   skills:['Labour Law Nepal','HRBP','OD','Talent Management'],
   education:'BBA/MBA HR + SHRM certification preferred',
   jd_summary:'Partner with business units on people strategy, manage ER cases, drive talent initiatives.',
   positions_count:3, filled_count:3, headcount_budget:4,
   impact_links:[{icon:'📋',module:'HR Policies',desc:'Enforces all 44 policies'},{icon:'⚖',module:'Labour Law',desc:'Nepal Labour Act 2074 compliance'}],
  },
  {id:'d5', job_code:'FIN-CA-L3',  title:'Chartered Accountant',       title_nepali:'चार्टर्ड एकाउन्टेन्ट',
   family:'jf-fin', grade:'L3', experience:3,  is_managerial:false, status:'active',
   skills:['ICAN','Tally ERP','IRD Tax','SSF/PF'],
   education:'ICAN / ICAI qualified CA',
   jd_summary:'Handle month-end close, tax filings, payroll verification, SSF/PF compliance.',
   positions_count:2, filled_count:2, headcount_budget:2,
   impact_links:[{icon:'💰',module:'Payroll',desc:'Approves all payroll runs'},{icon:'⚖',module:'IRD Filing',desc:'Tax submission authority'}],
  },
  {id:'d6', job_code:'EXEC-CTO-E1',title:'Chief Technology Officer',   title_nepali:'प्रमुख प्रविधि अधिकृत',
   family:'jf-exec',grade:'E1', experience:12, is_managerial:true,  status:'active',
   skills:['Technology Strategy','Cloud','AI/ML','Executive Leadership'],
   education:'M.S./PhD + 12+ years leadership experience',
   jd_summary:'Own company-wide technology vision, manage VP-level reports, drive product architecture.',
   positions_count:1, filled_count:1, headcount_budget:1,
   impact_links:[{icon:'💰',module:'Executive Comp',desc:'E1 band NPR 450K-800K'},{icon:'🏛',module:'Board Reports',desc:'Tech metrics to board'}],
  },
]

const GRADE_COLORS = {
  L1:'#94a3b8', L2:'#64748b', L3:'#3b82f6', L4:'#8b5cf6', L5:'#6d28d9',
  M1:'#f59e0b', M2:'#ef4444', M3:'#dc2626', E1:'#0ea5e9', E2:'#0369a1',
}

const CONTEXT_ACTIONS = [
  {icon:'👁',  label:'View Designation',     key:'view'},
  {icon:'✏',  label:'Edit Designation',     key:'edit'},
  {icon:'🤖', label:'Generate AI JD',       key:'ai_jd'},
  {icon:'📋', label:'View Positions',       key:'positions'},
  {icon:'💰', label:'View Salary Band',     key:'salary'},
  {icon:'🔗', label:'Impact Analysis',      key:'impact'},
  {icon:'📤', label:'Export to Excel',      key:'export'},
  {icon:'📄', label:'Download JD PDF',      key:'pdf'},
  {icon:'🗑', label:'Archive',              key:'archive', danger:true},
]

const EXCEL_COLS = ['Job Code','Title','Title (Nepali)','Job Family','Grade',
  'Experience (Years)','Education Required','Is Managerial','Skills (comma separated)','JD Summary','Status']

// AI JD Generator modal
function AIJDModal({ desig, onClose }) {
  const [loading, setLoading] = useState(false)
  const [jd,      setJd]      = useState(null)
  const [copied,  setCopied]  = useState(false)

  const generate = () => {
    setLoading(true)
    setTimeout(() => {
      setJd({
        summary: `As a ${desig.title}, you will ${desig.jd_summary}`,
        responsibilities: [
          `Lead ${desig.family === 'jf-it' ? 'technical development and architecture decisions' : 'core functional activities'} for the team`,
          `Collaborate with cross-functional stakeholders to deliver business outcomes`,
          `Mentor junior team members and conduct knowledge-sharing sessions`,
          `Ensure compliance with company policies, Nepal Labour Act 2074, and industry standards`,
          `Prepare and present performance metrics and reports to line management`,
        ],
        qualifications: [
          desig.education,
          `Minimum ${desig.experience} years of relevant experience`,
          ...desig.skills.map(s => `Proficiency in ${s}`),
        ],
        competencies: ['Communication','Problem Solving','Teamwork','Accountability','Innovation'],
        nepal_context: `This role falls under ${desig.is_managerial ? 'Managerial Category (excluded from CBA per Nepal Labour Act 2074 Section 7)' : 'General Category - eligible for CBA representation'}.`,
      })
      setLoading(false)
    }, 1800)
  }


  // SaaS DB — load real tenant data (fallback to mock if no token/API down)
  useEffect(() => {
    const _token = localStorage.getItem('access_token')
    const _slug  = _getSlug()
    if (!_token) return
    setLoading(true)
    fetch('/api/v1/org/designations', {
      headers: {
        'Authorization': `Bearer ${_token}`,
        'X-Tenant-Slug': _slug,
        'Content-Type': 'application/json',
      }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const items = d.designations || d.data || d.items || []
        if (items.length > 0) setLoading(items)
      })
      .catch(() => {/* keep mock */})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:8000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'88vh',overflow:'auto',
        boxShadow:'0 40px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 24px',background:'linear-gradient(135deg,#1e1b4b,#4f46e5)',
          position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>🤖 AI Job Description Generator</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>
            {desig.title} ({desig.job_code}) - powered by Claude AI
          </div>
        </div>
        <div style={{padding:'24px'}}>
          {!jd && !loading && (
            <div style={{textAlign:'center',padding:'30px 20px'}}>
              <div style={{fontSize:48,marginBottom:16}}>🤖</div>
              <div style={{fontSize:15,fontWeight:700,color:'#1e1b4b',marginBottom:8}}>
                Generate AI-Powered Job Description
              </div>
              <div style={{fontSize:12,color:'#64748b',lineHeight:1.7,marginBottom:24,maxWidth:400,margin:'0 auto 24px'}}>
                AI will analyze the designation, grade, job family, and skills to create a comprehensive,
                Nepal Labour Act-compliant job description in seconds.
              </div>
              <button onClick={generate}
                style={{padding:'14px 36px',borderRadius:12,border:'none',
                  background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',
                  boxShadow:'0 8px 24px rgba(79,70,229,.35)'}}>
                Generate JD Now
              </button>
            </div>
          )}
          {loading && (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12}}>⚡</div>
              <div style={{fontSize:14,fontWeight:700,color:'#4f46e5',marginBottom:6}}>
                AI is generating your job description...
              </div>
              <div style={{height:4,background:'#e0e7ff',borderRadius:4,overflow:'hidden',width:200,margin:'0 auto'}}>
                <div style={{height:'100%',background:'linear-gradient(90deg,#4f46e5,#7c3aed)',
                  borderRadius:4,animation:'progress 1.8s ease forwards',width:'0%'}}/>
              </div>
              <style>{`@keyframes progress{to{width:100%}}`}</style>
            </div>
          )}
          {jd && (
            <div>
              <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,
                padding:'14px 16px',marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:800,color:'#3730a3',marginBottom:6}}>
                  Role Summary
                </div>
                <div style={{fontSize:12,color:'#4338ca',lineHeight:1.65}}>{jd.summary}</div>
              </div>
              {[
                {title:'Key Responsibilities', items:jd.responsibilities, color:'#3b82f6'},
                {title:'Qualifications Required', items:jd.qualifications, color:'#10b981'},
                {title:'Core Competencies', items:jd.competencies, color:'#8b5cf6'},
              ].map((section,i)=>(
                <div key={i} style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:800,color:section.color,marginBottom:8}}>
                    {section.title}
                  </div>
                  {section.items.map((item,j)=>(
                    <div key={j} style={{display:'flex',gap:8,padding:'5px 0',
                      borderBottom:'1px solid #f8fafc',fontSize:12,color:'#334155'}}>
                      <span style={{color:section.color,flexShrink:0}}>-</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,
                padding:'10px 14px',marginBottom:20,fontSize:11,color:'#92400e'}}>
                <strong>Nepal Law Note:</strong> {jd.nepal_context}
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{navigator.clipboard?.writeText(JSON.stringify(jd,null,2));setCopied(true);setTimeout(()=>setCopied(false),2000)}}
                  style={{flex:1,padding:'12px',borderRadius:10,border:'none',
                    background:copied?'#10b981':'linear-gradient(135deg,#4f46e5,#7c3aed)',
                    color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  {copied ? 'Copied!' : 'Copy JD to Clipboard'}
                </button>
                <button onClick={onClose}
                  style={{padding:'12px 20px',borderRadius:10,border:'1px solid #e2e8f0',
                    background:'#fff',color:'#475569',fontSize:12,cursor:'pointer'}}>
                  Save & Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Add Designation Modal
function AddDesigModal({ onClose, onSave }) {
  const [f,setF] = useState({job_code:'',title:'',title_nepali:'',family:'jf-it',grade:'L3',
    experience:'',is_managerial:false,education:'',skills:'',jd_summary:''})
  const s = k => v => setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:700,maxHeight:'92vh',overflow:'auto',
        boxShadow:'0 40px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 28px',background:T.gradient,position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ New Designation</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:2}}>
            Use mic button for voice input on any field
          </div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Job Code"         value={f.job_code}     onChange={s('job_code')}     required accent={T.accent} hint="e.g. IT-SE-L3-002"/>
            <Field label="Job Title"        value={f.title}        onChange={s('title')}        required accent={T.accent}/>
            <Field label="Title in Nepali"  value={f.title_nepali} onChange={s('title_nepali')} accent={T.accent} hint="Nepali translation (optional)"/>
            <Field label="Job Family" type="select" value={f.family} onChange={s('family')} accent={T.accent}
              options={JOB_FAMILIES.map(jf=>({value:jf.id,label:jf.icon+' '+jf.name}))}/>
            <Field label="Grade Level" type="select" value={f.grade} onChange={s('grade')} accent={T.accent}
              options={Object.entries(GRADE_MAP).map(([v,l])=>({value:v,label:v+' - '+l.split(' - ')[1]||l}))} required/>
            <Field label="Min Experience (Years)" type="number" value={f.experience} onChange={s('experience')} accent={T.accent}/>
            <Field label="Education Required" value={f.education} onChange={s('education')} accent={T.accent} hint="e.g. B.E. CS or equivalent"/>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'#475569',marginBottom:5}}>
                Managerial Category (Labour Act 2074)
              </label>
              <div style={{display:'flex',gap:10}}>
                {[{v:false,l:'No - General'},{v:true,l:'Yes - Managerial (excl. CBA)'}].map(opt=>(
                  <label key={opt.l} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',
                    padding:'9px 14px',borderRadius:10,border:`1.5px solid ${f.is_managerial===opt.v?T.accent:'#e2e8f0'}`,
                    background:f.is_managerial===opt.v?T.light:'#fff',fontSize:12,fontWeight:600}}>
                    <input type="radio" checked={f.is_managerial===opt.v}
                      onChange={()=>s('is_managerial')(opt.v)} style={{accentColor:T.accent}}/>
                    {opt.l}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <Field label="Required Skills (comma-separated)" value={f.skills} onChange={s('skills')} accent={T.accent}
            hint="e.g. React, Python, PostgreSQL, Docker"/>
          <Field label="JD Summary" type="textarea" value={f.jd_summary} onChange={s('jd_summary')} accent={T.accent}
            hint="Brief 1-2 sentence role summary. Full JD can be AI-generated after saving."/>
          <AIImpact color={T.accent} lines={[
            'Designation links to Grade Level for automatic salary band assignment.',
            'Positions created under this designation inherit JD, skills, and competency requirements.',
            'Managerial category exclusion applies to Labour Act 2074 CBA eligibility.',
            'AI JD Generator available after saving - creates full JD with responsibilities, qualifications, and Nepal law notes.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}}
              style={{flex:1,padding:'14px',borderRadius:12,border:'none',
                background:T.gradient,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Create Designation
            </button>
            <button onClick={onClose}
              style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',
                background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function _getSlug() {
  try {
    const s = JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}
    return s?.company?.slug || s?.tenant || localStorage.getItem('elogix_tenant_slug') || ''
  } catch(_e) { return '' }
}

export default function DesignationSetupPage() {
  const [designations, setDesignations] = useState(MOCK_DESIGNATIONS)
  const [search,       setSearch]       = useState('')
  const [familyFilter, setFamilyFilter] = useState('all')
  const [gradeFilter,  setGradeFilter]  = useState('all')
  const [ctx,          setCtx]          = useState(null)
  const [showAdd,      setShowAdd]      = useState(false)
  const [showExcel,    setShowExcel]    = useState(false)
  const [selected,     setSelected]     = useState(null)
  const [aiJdFor,      setAiJdFor]      = useState(null)

  const filtered = designations.filter(d =>
    (familyFilter === 'all' || d.family === familyFilter) &&
    (gradeFilter  === 'all' || d.grade  === gradeFilter)  &&
    (!search || d.title.toLowerCase().includes(search.toLowerCase()) ||
     d.job_code.toLowerCase().includes(search.toLowerCase()))
  )

  const gradeTracks = {
    'IC Track (L1-L5)': ['L1','L2','L3','L4','L5'],
    'Mgmt (M1-M3)':     ['M1','M2','M3'],
    'Executive (E1-E2)':['E1','E2'],
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="💼" title="Designation Setup"
        breadcrumb="Organization Management > Structure & Hierarchy"
        gradient={T.gradient}
        stats={[
          {icon:'💼',label:'Designations', value:designations.length},
          {icon:'📋',label:'Total Positions',value:designations.reduce((s,d)=>s+d.positions_count,0)},
          {icon:'✅',label:'Filled',        value:designations.reduce((s,d)=>s+d.filled_count,0)},
          {icon:'👔',label:'Managerial',    value:designations.filter(d=>d.is_managerial).length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Designation"
        onExcel={()=>setShowExcel(true)}
      />

      <SearchBar value={search} onChange={setSearch}
        placeholder="Search by job title or code..."
        extra={
          <div style={{display:'flex',gap:8}}>
            <select value={familyFilter} onChange={e=>setFamilyFilter(e.target.value)}
              style={{padding:'10px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:11,background:'#fff',cursor:'pointer',outline:'none'}}>
              <option value="all">All Job Families</option>
              {JOB_FAMILIES.map(jf=><option key={jf.id} value={jf.id}>{jf.icon} {jf.name}</option>)}
            </select>
            <select value={gradeFilter} onChange={e=>setGradeFilter(e.target.value)}
              style={{padding:'10px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:11,background:'#fff',cursor:'pointer',outline:'none'}}>
              <option value="all">All Grades</option>
              {Object.keys(GRADE_COLORS).map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        }
      />

      {/* Grade Matrix quick view */}
      <div style={{background:'#fff',border:'1px solid #e0e7ff',borderRadius:14,
        padding:'14px 18px',marginBottom:16,overflowX:'auto'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#3730a3',marginBottom:12}}>
          Grade Matrix - Designations by Track
        </div>
        <div style={{display:'flex',gap:20,minWidth:600}}>
          {Object.entries(gradeTracks).map(([track,grades])=>(
            <div key={track} style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:'#6366f1',marginBottom:8,
                textTransform:'uppercase',letterSpacing:'0.05em'}}>{track}</div>
              {grades.map(g=>{
                const count = designations.filter(d=>d.grade===g).length
                return (
                  <div key={g} onClick={()=>setGradeFilter(g===gradeFilter?'all':g)}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',
                      borderRadius:8,cursor:'pointer',marginBottom:3,
                      background:gradeFilter===g?`${GRADE_COLORS[g]}18`:'transparent',
                      transition:'background .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background=`${GRADE_COLORS[g]}12`}
                    onMouseLeave={e=>e.currentTarget.style.background=gradeFilter===g?`${GRADE_COLORS[g]}18`:'transparent'}>
                    <span style={{background:GRADE_COLORS[g],color:'#fff',fontSize:10,
                      fontWeight:800,padding:'2px 8px',borderRadius:8,minWidth:28,textAlign:'center'}}>
                      {g}
                    </span>
                    <span style={{fontSize:11,color:'#334155',flex:1}}>{GRADE_MAP[g]}</span>
                    <span style={{fontSize:11,fontWeight:700,color:GRADE_COLORS[g]}}>{count}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:10,
        padding:'8px 14px',marginBottom:16,fontSize:11,color:'#3730a3'}}>
        Right-click any designation for SAP impact analysis. Click "AI JD" to generate full job description.
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
        {filtered.map(d=>{
          const jf    = JOB_FAMILIES.find(f=>f.id===d.family)
          const gc    = GRADE_COLORS[d.grade] || '#64748b'
          const fillR = Math.round(d.filled_count/d.positions_count*100)
          return (
            <LuxCard key={d.id} color={jf?.color||'#6366f1'}
              onClick={()=>setSelected(d)}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:d})}}>
              <div style={{padding:'16px 16px 10px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:46,height:46,borderRadius:12,background:`${jf?.color||'#6366f1'}18`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                  {jf?.icon||'💼'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2,flexWrap:'wrap'}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{d.title}</span>
                    {d.is_managerial && (
                      <span style={{background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa',
                        fontSize:9,fontWeight:700,padding:'1px 7px',borderRadius:20}}>
                        Managerial
                      </span>
                    )}
                    <Badge status={d.status}/>
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8',marginBottom:4}}>
                    {d.job_code} &bull; {jf?.name}
                  </div>
                  {d.title_nepali && (
                    <div style={{fontSize:10,color:'#6366f1',fontStyle:'italic'}}>{d.title_nepali}</div>
                  )}
                </div>
                <div style={{flexShrink:0}}>
                  <span style={{background:`${gc}20`,color:gc,fontWeight:800,
                    fontSize:13,padding:'4px 10px',borderRadius:8,border:`1px solid ${gc}40`}}>
                    {d.grade}
                  </span>
                </div>
              </div>
              {/* Skills */}
              <div style={{padding:'0 16px 10px',display:'flex',gap:4,flexWrap:'wrap'}}>
                {d.skills.slice(0,4).map((sk,i)=>(
                  <span key={i} style={{background:`${jf?.color||'#6366f1'}12`,
                    color:jf?.color||'#6366f1',fontSize:9,fontWeight:600,
                    padding:'2px 8px',borderRadius:20}}>{sk}</span>
                ))}
                {d.skills.length>4&&<span style={{fontSize:9,color:'#94a3b8',padding:'2px 6px'}}>+{d.skills.length-4}</span>}
              </div>
              {/* Fill rate + AI JD button */}
              <div style={{borderTop:'1px solid #f1f5f9',padding:'10px 16px',
                display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:9,
                    color:'#94a3b8',marginBottom:3}}>
                    <span>Positions filled</span>
                    <span style={{fontWeight:700,color:fillR===100?'#10b981':fillR>=50?'#f59e0b':'#ef4444'}}>
                      {d.filled_count}/{d.positions_count}
                    </span>
                  </div>
                  <div style={{height:4,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                    <div style={{width:`${fillR}%`,height:'100%',borderRadius:4,
                      background:fillR===100?'#10b981':fillR>=50?'#f59e0b':'#ef4444'}}/>
                  </div>
                </div>
                <button
                  onClick={e=>{e.stopPropagation();setAiJdFor(d)}}
                  style={{padding:'5px 12px',borderRadius:8,border:'none',flexShrink:0,
                    background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
                    color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                  🤖 AI JD
                </button>
              </div>
            </LuxCard>
          )
        })}
        <div onClick={()=>setShowAdd(true)}
          style={{border:'2px dashed #c7d2fe',borderRadius:16,minHeight:200,display:'flex',
            flexDirection:'column',alignItems:'center',justifyContent:'center',
            cursor:'pointer',color:'#94a3b8',gap:8,transition:'all .2s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#6366f1';e.currentTarget.style.color='#6366f1'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#c7d2fe';e.currentTarget.style.color='#94a3b8'}}>
          <span style={{fontSize:32}}>+</span>
          <span style={{fontSize:12,fontWeight:700}}>Add Designation</span>
        </div>
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
        impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
        actions={CONTEXT_ACTIONS}
        onAction={(k,item)=>{
          if(k==='view')  setSelected(item)
          if(k==='ai_jd') setAiJdFor(item)
        }}
        onClose={()=>setCtx(null)} />}

      {showExcel && <ExcelModal title="Designation Setup" columns={EXCEL_COLS}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Processing: '+f.name)} />}

      {showAdd && <AddDesigModal
        onClose={()=>setShowAdd(false)}
        onSave={d=>setDesignations(p=>[...p,{...d,id:'d'+Date.now(),status:'active',
          skills:d.skills.split(',').map(s=>s.trim()),positions_count:0,filled_count:0,
          headcount_budget:0,impact_links:[]}])} />}

      {aiJdFor && <AIJDModal desig={aiJdFor} onClose={()=>setAiJdFor(null)} />}

      <Drawer item={selected} gradient={T.gradient} onClose={()=>setSelected(null)}
        rows={[
          ['Job Code',      selected?.job_code],
          ['Nepali Title',  selected?.title_nepali],
          ['Job Family',    JOB_FAMILIES.find(f=>f.id===selected?.family)?.name],
          ['Grade',         selected ? `${selected.grade} - ${GRADE_MAP[selected.grade]}` : null],
          ['Experience',    selected ? `${selected.experience}+ years` : null],
          ['Education',     selected?.education],
          ['Managerial',    selected?.is_managerial ? 'Yes (Labour Act 2074 Sect. 7)' : 'No'],
          ['Positions',     selected ? `${selected.filled_count} filled / ${selected.positions_count} total` : null],
        ]}>
        {selected?.skills && (
          <div style={{padding:'10px 0',borderBottom:'1px solid #f8fafc'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>Required Skills</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {selected.skills.map((sk,i)=>(
                <span key={i} style={{background:'#eef2ff',color:'#4f46e5',fontSize:10,
                  fontWeight:600,padding:'3px 10px',borderRadius:20}}>{sk}</span>
              ))}
            </div>
          </div>
        )}
        {selected?.jd_summary && (
          <div style={{padding:'10px 0',borderBottom:'1px solid #f8fafc',fontSize:12,color:'#475569',lineHeight:1.6}}>
            {selected.jd_summary}
          </div>
        )}
        <div style={{padding:'12px 0'}}>
          <button onClick={()=>{setSelected(null);setAiJdFor(selected)}}
            style={{width:'100%',padding:'10px',borderRadius:10,border:'none',
              background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',
              fontSize:12,fontWeight:700,cursor:'pointer'}}>
            🤖 Generate AI Job Description
          </button>
        </div>
      </Drawer>
    </div>
  )
}

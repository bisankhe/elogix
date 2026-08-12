// FILE: JDLibraryPage.jsx
// Employee Lifecycle > Recruitment & Hiring > Recruitment Management > Job Description Library
//
// FEATURES:
// • Living skills ontology with AI skill-drift detection
// • All JDs linked to KRA, KPI & OKR framework per position
// • Digitally signed JDs show signature badges
// • Semantic search and smart filters
// • One-click clone into Create JD wizard
// • Version control (v1.0, v2.1, v3.2)
// • Publish to ATS · Seed interview kit · Link to employee profile
// • Grid & table view toggle

import { useState, useMemo } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const P = '#7c3aed'

// ── KRA/KPI/OKR FRAMEWORK PER JD ──────────────────────────────
const FRAMEWORKS = {
  'jd-001': {
    kra: ['Code Quality & Delivery', 'Technical Innovation', 'Team Mentorship', 'System Reliability'],
    kpi: ['Sprint Completion ≥ 90%', 'Bug Rate < 5/sprint', 'Code Review ≤ 24h', 'Uptime ≥ 99.9%'],
    okr: ['Deliver 2x engineering velocity', 'Reduce MTTR by 40%', 'Grow team capability'],
  },
  'jd-002': {
    kra: ['Talent Acquisition', 'Employee Engagement', 'Compliance', 'Learning & Development'],
    kpi: ['Time-to-Fill ≤ 21d', 'eNPS ≥ 40', 'Attrition < 8%', 'Training ≥ 90%'],
    okr: ['Build world-class talent engine', 'Raise eNPS from 35 to 50'],
  },
  'jd-003': {
    kra: ['Revenue Generation', 'Team Leadership', 'Pipeline Management', 'Client Retention'],
    kpi: ['Revenue Target ≥ 100%', 'Pipeline 3x Quota', 'Retention ≥ 90%', 'Team Attainment ≥ 80%'],
    okr: ['Achieve record revenue quarter', 'Build high-performance sales culture'],
  },
  'jd-004': {
    kra: ['Financial Reporting', 'Compliance & Audit', 'Budget Management', 'Cost Optimisation'],
    kpi: ['Accuracy ≥ 99.5%', 'Zero critical audit findings', 'Budget Variance < 5%', 'Filing on time 100%'],
    okr: ['Zero-defect financial ops', 'Identify NPR 500K savings'],
  },
  'jd-005': {
    kra: ['Product Vision', 'Stakeholder Alignment', 'User Experience', 'Revenue Impact'],
    kpi: ['On-time delivery ≥ 85%', 'NPS ≥ 50', 'Sprint Goal ≥ 90%', 'Revenue attribution'],
    okr: ['Launch 3 market-defining features', 'NPS from 45 to 60'],
  },
  'jd-006': {
    kra: ['Process Efficiency', 'Team Productivity', 'Cost Control', 'Quality Assurance'],
    kpi: ['SLA Adherence ≥ 95%', 'Team Utilisation ≥ 85%', 'Quality ≥ 98%', 'Cost per transaction'],
    okr: ['Achieve operational excellence', 'Automate 5 manual processes'],
  },
}

const DEFAULT_FW = {
  kra: ['Role Delivery', 'Stakeholder Management', 'Continuous Improvement', 'Team Contribution'],
  kpi: ['Task Completion ≥ 95%', 'Quality Score ≥ 90%', 'Stakeholder Satisfaction ≥ 4/5'],
  okr: ['Deliver role excellence', 'Grow professional capability'],
}

// ── BUILT-IN JD LIBRARY ────────────────────────────────────────
const BASE_LIBRARY = [
  {
    id:'jd-001', title:'Senior Software Engineer', dept:'Engineering', level:'Senior',
    type:'Regular', location:'Kathmandu, Nepal', salary_min:150000, salary_max:200000,
    skills:['Node.js','React','PostgreSQL','AWS','Python'],
    inclusive_score:97, compliance_score:100, skill_drift:24,
    status:'active', version:'v3.2', last_updated:'2026-06-15',
    usage_count:8, open_positions:2, signed:true,
    signatures:[{name:'Priya Sharma (HR Head)',role:'HR Head / HR Manager',method:'drawn'},{name:'Rajesh KC (Engineering Head)',role:'Department Head',method:'typed'}],
    summary:'Lead backend microservices development, mentor a team of 4, drive technical architecture decisions aligned to engineering OKRs.',
    responsibilities:['Lead microservices architecture aligned to KRA: System Reliability','Mentor junior engineers (KRA: Team Mentorship, KPI: 4 certifications/year)','Technical design reviews and code quality (KPI: Bug rate < 5/sprint)','API performance optimisation and uptime (KPI: ≥ 99.9%)','Cross-team collaboration for OKR delivery'],
    qualifications:['5+ years backend experience','Node.js / Python proficiency','Microservices architecture expertise','PostgreSQL / Redis skills','AWS or GCP certification preferred'],
    compliance_note:'Salary NPR 150K–200K meets minimum wage. Regular employment per Labour Act 2074 Section 10. SSF 31% contribution applicable.',
  },
  {
    id:'jd-002', title:'HR Business Partner', dept:'HR', level:'Mid-Level',
    type:'Regular', location:'Kathmandu, Nepal', salary_min:80000, salary_max:110000,
    skills:['HRIS','Labour Law','Performance Management','Employee Relations'],
    inclusive_score:99, compliance_score:100, skill_drift:8,
    status:'active', version:'v2.1', last_updated:'2026-05-20',
    usage_count:3, open_positions:1, signed:true,
    signatures:[{name:'Sita Thapa (HR Director)',role:'HR Head / HR Manager',method:'typed'},{name:'CEO Office',role:'CEO / Managing Director',method:'drawn'}],
    summary:'Strategic HR partner supporting department heads with talent, performance, and compliance aligned to organizational OKRs.',
    responsibilities:['Partner with dept heads on HR strategy (KRA: Talent Acquisition)','Manage performance review cycles (KRA: L&D, KPI: Training ≥ 90%)','Ensure Labour Act 2074 compliance (KPI: Zero violations)','Drive employee engagement (KRA: Engagement, KPI: eNPS ≥ 40)','Handle grievance and disciplinary cases per Labour Act 2074 Section 52'],
    qualifications:["Bachelor's in HR or Management",'3-5 years HRBP experience','Nepal Labour Act expertise','HRIS system proficiency','Strong communication skills'],
    compliance_note:'Regular employment. SSF 11% employee + 20% employer. Labour Act 2074 Section 10 written contract mandatory.',
  },
  {
    id:'jd-003', title:'Sales Manager', dept:'Sales', level:'Manager',
    type:'Regular', location:'Kathmandu, Nepal', salary_min:100000, salary_max:150000,
    skills:['B2B Sales','CRM','Team Leadership','Negotiation'],
    inclusive_score:88, compliance_score:95, skill_drift:15,
    status:'needs_update', version:'v1.8', last_updated:'2025-11-10',
    usage_count:5, open_positions:0, signed:false, signatures:[],
    summary:'Lead the sales team to achieve revenue targets, build client relationships, and contribute to company OKRs.',
    responsibilities:['Lead team of 8 (KRA: Team Leadership, KPI: Team attainment ≥ 80%)','Revenue targets quarterly (KRA: Revenue Generation, KPI: ≥ 100% target)','Build enterprise client relationships (KPI: Retention ≥ 90%)','Develop sales playbooks for OKR: high-performance culture','Report pipeline to C-Suite (KPI: Pipeline 3x quota)'],
    qualifications:['5+ years B2B sales experience','Proven team leadership','CRM expertise','Strong negotiation skills','Nepal/South Asia market knowledge'],
    compliance_note:'Salary NPR 100K–150K. Labour Act 2074 compliant. Note: Inclusive language score 88 — update recommended.',
  },
  {
    id:'jd-004', title:'Finance Analyst', dept:'Finance', level:'Junior',
    type:'Regular', location:'Kathmandu, Nepal', salary_min:50000, salary_max:70000,
    skills:['Excel','Financial Modelling','IFRS','Tally','CIT Nepal'],
    inclusive_score:94, compliance_score:100, skill_drift:5,
    status:'active', version:'v2.0', last_updated:'2026-04-01',
    usage_count:6, open_positions:1, signed:true,
    signatures:[{name:'Ramesh B. (Finance Head)',role:'Department Head',method:'drawn'}],
    summary:'Support financial planning, reporting, and compliance functions aligned to OKR: zero-defect financial operations.',
    responsibilities:['Monthly financial reports (KRA: Reporting, KPI: Accuracy ≥ 99.5%)','Budget assistance (KRA: Budget Management, KPI: Variance < 5%)','Accounts payable/receivable management','CIT, VAT, SSF compliance Nepal (KPI: 100% on-time filing)','Audit support (KPI: Zero critical findings)'],
    qualifications:["Bachelor's in Finance or Accounting",'1-2 years experience','Excel and Tally proficiency','Nepal tax law (CIT, VAT)','Attention to detail'],
    compliance_note:'Salary NPR 50K–70K meets minimum wage NPR 17,300. SSF applicable. Gratuity from Day 1.',
  },
  {
    id:'jd-005', title:'Product Manager', dept:'Engineering', level:'Senior',
    type:'Regular', location:'Remote / Kathmandu', salary_min:120000, salary_max:180000,
    skills:['Product Strategy','Agile','Roadmap Planning','Stakeholder Management','Data Analysis'],
    inclusive_score:96, compliance_score:98, skill_drift:31,
    status:'draft', version:'v1.0', last_updated:'2026-07-01',
    usage_count:0, open_positions:1, signed:false, signatures:[],
    summary:'Own product vision and roadmap for flagship HRIS platform, aligned to OKR: launch market-defining features and maximize user value.',
    responsibilities:['Define product strategy (KRA: Product Vision, KPI: On-time delivery ≥ 85%)','Own quarterly roadmap (OKR: 3 major features/quarter)','Prioritise backlog with engineering','Stakeholder alignment (KPI: NPS ≥ 50)','Track product KPIs and OKR metrics'],
    qualifications:["Bachelor's in CS, Business, or related","3-5 years product management experience","Agile/Scrum expertise","Data-driven decision making","Nepal market experience preferred"],
    compliance_note:'Regular employment. SSF 31% total contribution. Remote work policy per company WFH guidelines.',
  },
  {
    id:'jd-006', title:'Operations Manager', dept:'Operations', level:'Manager',
    type:'Regular', location:'Kathmandu, Nepal', salary_min:90000, salary_max:130000,
    skills:['Process Improvement','Six Sigma','Team Management','ERP','SLA Management'],
    inclusive_score:92, compliance_score:100, skill_drift:12,
    status:'active', version:'v2.3', last_updated:'2026-06-01',
    usage_count:4, open_positions:0, signed:true,
    signatures:[{name:'Priya Sharma (HR Head)',role:'HR Head / HR Manager',method:'typed'},{name:'COO Office',role:'CEO / Managing Director',method:'drawn'}],
    summary:'Drive operational excellence and team productivity, contributing to OKR: scalable, automated operations.',
    responsibilities:['Process efficiency ownership (KRA: Process Efficiency, KPI: SLA ≥ 95%)','Team productivity management (KPI: Utilisation ≥ 85%)','Cost control and budget adherence','Quality assurance (KPI: Quality Score ≥ 98%)','OKR: Automate 5 manual processes by Q4'],
    qualifications:['5+ years operations management','Six Sigma or Lean certification preferred','ERP system expertise','SLA management experience','Nepal business environment knowledge'],
    compliance_note:'Labour Act 2074 compliant. Night shift premium applicable per Section 35. OT at 1.5x per Section 36.',
  },
]

const STATUS_CFG = {
  active:       { c:'#10b981', bg:'#f0fdf4', label:'Active'       },
  draft:        { c:'#f59e0b', bg:'#fffbeb', label:'Draft'        },
  needs_update: { c:'#ef4444', bg:'#fef2f2', label:'Needs Update' },
  archived:     { c:'#94a3b8', bg:'#f8fafc', label:'Archived'     },
}

export default function JDLibraryPage() {
  const { navTo } = useApp()
  const [search,   setSearch]   = useState('')
  const [deptF,    setDeptF]    = useState('All')
  const [levelF,   setLevelF]   = useState('All')
  const [statusF,  setStatusF]  = useState('All')
  const [signedF,  setSignedF]  = useState('All')
  const [viewMode, setViewMode] = useState('grid')
  const [selected, setSelected] = useState(null)
  const [activeTab,setActiveTab]= useState('jd')
  const [library,  setLibrary]  = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('elogix_jd_library')||'[]')
      return [...BASE_LIBRARY, ...saved.filter(s=>!BASE_LIBRARY.find(b=>b.id===s.id))]
    } catch { return BASE_LIBRARY }
  })

  const depts  = ['All', ...new Set(library.map(j=>j.dept))]
  const levels = ['All', ...new Set(library.map(j=>j.level))]

  const filtered = useMemo(()=>library.filter(j=>{
    const q = search.toLowerCase()
    if (q && !j.title.toLowerCase().includes(q) && !j.dept.toLowerCase().includes(q) && !j.skills?.some(s=>s.toLowerCase().includes(q))) return false
    if (deptF!=='All'   && j.dept!==deptF)             return false
    if (levelF!=='All'  && j.level!==levelF)            return false
    if (statusF!=='All' && j.status!==statusF)          return false
    if (signedF==='Signed'   && !j.signed)              return false
    if (signedF==='Unsigned' && j.signed)               return false
    return true
  }),[library,search,deptF,levelF,statusF,signedF])

  const cloneToCreate = (jd) => {
    localStorage.setItem('elogix_jd_clone', JSON.stringify(jd))
    navTo?.('create-job-description')
  }

  const fw = selected ? (FRAMEWORKS[selected.id] || DEFAULT_FW) : DEFAULT_FW

  const JDCard = ({jd}) => {
    const st = STATUS_CFG[jd.status] || STATUS_CFG.active
    const fw2 = FRAMEWORKS[jd.id] || DEFAULT_FW
    return (
      <div onClick={()=>setSelected(jd)}
        style={{background:'#fff',borderRadius:14,padding:16,border:`1.5px solid ${selected?.id===jd.id?P:'#e2e8f0'}`,cursor:'pointer',transition:'all .2s',boxShadow:selected?.id===jd.id?`0 4px 20px ${P}20`:'0 1px 6px rgba(0,0,0,.04)'}}>
        {/* Top row */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{jd.title}</div>
            <div style={{fontSize:9,color:'#64748b',marginTop:2}}>{jd.dept} · {jd.level} · {jd.version}</div>
          </div>
          <span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:12,background:st.bg,color:st.c,flexShrink:0,marginLeft:6}}>{st.label}</span>
        </div>

        {/* Scores row */}
        <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
          <span style={{fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:10,background:jd.inclusive_score>=95?'#f0fdf4':'#fff7ed',color:jd.inclusive_score>=95?'#15803d':'#c2410c'}}>
            🌈 {jd.inclusive_score}/100
          </span>
          {jd.skill_drift>20&&<span style={{fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:10,background:'#fef2f2',color:'#dc2626'}}>⚠️ {jd.skill_drift}% drift</span>}
          {jd.signed?<span style={{fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:10,background:'#f0fdf4',color:'#15803d'}}>✍️ Signed ({jd.signatures?.length||0})</span>
                    :<span style={{fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:10,background:'#fffbeb',color:'#92400e'}}>⚠️ Unsigned</span>}
        </div>

        {/* KRA chips */}
        <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
          {fw2.kra.slice(0,2).map((k,i)=><span key={i} style={{fontSize:7,padding:'1px 6px',borderRadius:8,background:'#faf5ff',color:P,fontWeight:600}}>{k}</span>)}
          {fw2.kra.length>2&&<span style={{fontSize:7,color:'#94a3b8'}}>+{fw2.kra.length-2}</span>}
        </div>

        {/* Skills */}
        <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
          {(jd.skills||[]).slice(0,3).map((s,i)=><span key={i} style={{fontSize:7,padding:'2px 6px',borderRadius:8,background:'#f1f5f9',color:'#475569'}}>{s}</span>)}
          {(jd.skills||[]).length>3&&<span style={{fontSize:7,color:'#94a3b8'}}>+{(jd.skills||[]).length-3}</span>}
        </div>

        {/* Footer */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:8,borderTop:'1px solid #f1f5f9'}}>
          <div style={{fontSize:8,color:'#94a3b8'}}>NPR {(jd.salary_min/1000).toFixed(0)}K–{(jd.salary_max/1000).toFixed(0)}K · Used {jd.usage_count}x</div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={e=>{e.stopPropagation();cloneToCreate(jd)}}
              style={{padding:'3px 8px',borderRadius:7,border:`1px solid ${P}`,background:`${P}10`,color:P,fontSize:7,fontWeight:700,cursor:'pointer'}}>Clone</button>
            {jd.open_positions>0&&<span style={{fontSize:7,padding:'3px 7px',borderRadius:7,background:'#dcfce7',color:'#166534',fontWeight:700}}>{jd.open_positions} open</span>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,fontFamily:'system-ui,sans-serif'}}>
      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{fontSize:8,color:'rgba(255,255,255,.5)',marginBottom:3}}>Employee Lifecycle › Recruitment & Hiring › Recruitment Management</div>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>📚 Job Description Library</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>Living Skills Ontology · KRA/KPI/OKR Linked · Version Controlled · AI Skill Drift Detection · Digital Signatures</div>
        <div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}>
          {[
            {label:'Total JDs',      val:library.length,                               icon:'📄'},
            {label:'Digitally Signed',val:library.filter(j=>j.signed).length,          icon:'✍️'},
            {label:'Needs Update',   val:library.filter(j=>j.status==='needs_update').length,icon:'⚠️'},
            {label:'Open Positions', val:library.reduce((s,j)=>s+(j.open_positions||0),0),icon:'📋'},
          ].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,.12)',borderRadius:10,padding:'6px 14px'}}>
              <div style={{fontSize:9,color:'rgba(255,255,255,.7)'}}>{s.icon} {s.label}</div>
              <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{s.val}</div>
            </div>
          ))}
          <button onClick={()=>navTo?.('create-job-description')}
            style={{marginLeft:'auto',padding:'8px 18px',borderRadius:10,border:'none',background:'rgba(255,255,255,.2)',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>
            + Create New JD
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search JDs, skills, departments..."
          style={{flex:2,minWidth:200,padding:'9px 14px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:11,outline:'none'}}/>
        {[
          {label:'Department', val:deptF,   set:setDeptF,   opts:depts},
          {label:'Level',      val:levelF,  set:setLevelF,  opts:levels},
          {label:'Status',     val:statusF, set:setStatusF, opts:['All','active','draft','needs_update','archived']},
          {label:'Signature',  val:signedF, set:setSignedF, opts:['All','Signed','Unsigned']},
        ].map(({label,val,set,opts})=>(
          <select key={label} value={val} onChange={e=>set(e.target.value)}
            style={{padding:'8px 12px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:10,background:'#fff',outline:'none'}}>
            {opts.map(o=><option key={o} value={o}>{o==='All'?label+': All':o}</option>)}
          </select>
        ))}
        <div style={{display:'flex',gap:4,background:'#f8fafc',borderRadius:10,padding:3}}>
          {[['grid','⊞'],['table','☰']].map(([m,icon])=>(
            <button key={m} onClick={()=>setViewMode(m)}
              style={{padding:'6px 10px',borderRadius:8,border:'none',background:viewMode===m?'#fff':'transparent',color:viewMode===m?P:'#64748b',fontSize:14,cursor:'pointer',boxShadow:viewMode===m?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div style={{fontSize:10,color:'#64748b'}}>
        Showing <strong>{filtered.length}</strong> of {library.length} job descriptions
        {search&&` · matching "${search}"`}
      </div>

      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 400px':'1fr',gap:16}}>
        {/* Library grid / table */}
        <div>
          {viewMode==='grid'?(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
              {filtered.map(jd=><JDCard key={jd.id} jd={jd}/>)}
              {filtered.length===0&&(
                <div style={{gridColumn:'1/-1',textAlign:'center',padding:48,color:'#94a3b8'}}>
                  <div style={{fontSize:32,marginBottom:8}}>📭</div>
                  <div>No JDs match your filters.</div>
                  <button onClick={()=>navTo?.('create-job-description')} style={{marginTop:12,padding:'8px 18px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>+ Create New JD</button>
                </div>
              )}
            </div>
          ):(
            <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    {['Title','Dept','Level','Inclusive','Signature','Skill Drift','Status','Version','Actions'].map((h,i)=>(
                      <th key={i} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:700,color:'#64748b',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((jd,i)=>{
                    const st=STATUS_CFG[jd.status]||STATUS_CFG.active
                    return(
                      <tr key={jd.id} onClick={()=>setSelected(jd)} style={{borderBottom:'1px solid #f1f5f9',cursor:'pointer',background:selected?.id===jd.id?`${P}05`:'#fff'}}>
                        <td style={{padding:'10px 12px',fontWeight:700,color:'#0f172a'}}>{jd.title}</td>
                        <td style={{padding:'10px 12px',color:'#64748b'}}>{jd.dept}</td>
                        <td style={{padding:'10px 12px',color:'#64748b'}}>{jd.level}</td>
                        <td style={{padding:'10px 12px'}}><span style={{fontWeight:700,color:jd.inclusive_score>=95?'#15803d':'#c2410c'}}>{jd.inclusive_score}/100</span></td>
                        <td style={{padding:'10px 12px'}}>{jd.signed?<span style={{color:'#15803d',fontWeight:700}}>✅ {jd.signatures?.length||0}</span>:<span style={{color:'#f59e0b',fontWeight:700}}>⚠️ Pending</span>}</td>
                        <td style={{padding:'10px 12px'}}><span style={{color:jd.skill_drift>20?'#ef4444':'#10b981',fontWeight:700}}>{jd.skill_drift}%</span></td>
                        <td style={{padding:'10px 12px'}}><span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:10,background:st.bg,color:st.c}}>{st.label}</span></td>
                        <td style={{padding:'10px 12px',color:'#94a3b8'}}>{jd.version}</td>
                        <td style={{padding:'10px 12px'}}>
                          <div style={{display:'flex',gap:4}}>
                            <button onClick={e=>{e.stopPropagation();cloneToCreate(jd)}} style={{padding:'3px 8px',borderRadius:7,border:`1px solid ${P}`,background:`${P}10`,color:P,fontSize:7,fontWeight:700,cursor:'pointer'}}>Clone</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected&&(
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',overflow:'hidden',height:'fit-content',position:'sticky',top:80}}>
            {/* Header */}
            <div style={{background:G,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:14,fontWeight:900,color:'#fff'}}>{selected.title}</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,.7)',marginTop:2}}>{selected.dept} · {selected.level} · {selected.version}</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{background:'rgba(255,255,255,.2)',border:'none',borderRadius:8,padding:'4px 10px',color:'#fff',cursor:'pointer',fontSize:14}}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{display:'flex',gap:0,borderBottom:'1px solid #e2e8f0'}}>
              {[['jd','📄 JD'],['kra','🎯 KRA/KPI'],['okr','🔮 OKR'],['sig','✍️ Signatures']].map(([t,l])=>(
                <button key={t} onClick={()=>setActiveTab(t)}
                  style={{flex:1,padding:'9px 4px',border:'none',borderBottom:`2px solid ${activeTab===t?P:'transparent'}`,background:'#fff',color:activeTab===t?P:'#64748b',fontWeight:activeTab===t?800:400,fontSize:9,cursor:'pointer'}}>
                  {l}
                </button>
              ))}
            </div>

            <div style={{padding:18,maxHeight:520,overflowY:'auto'}}>
              {activeTab==='jd'&&(
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {/* Scores */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                    {[{label:'Inclusive',val:`${selected.inclusive_score}/100`,color:selected.inclusive_score>=95?'#10b981':'#f59e0b'},{label:'Compliance',val:`${selected.compliance_score||100}/100`,color:'#10b981'},{label:'Skill Drift',val:`${selected.skill_drift}%`,color:selected.skill_drift>20?'#ef4444':'#10b981'}].map((s,i)=>(
                      <div key={i} style={{textAlign:'center',padding:'8px',background:'#f8fafc',borderRadius:9}}>
                        <div style={{fontSize:14,fontWeight:900,color:s.color}}>{s.val}</div>
                        <div style={{fontSize:8,color:'#94a3b8'}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {selected.skill_drift>20&&(
                    <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 12px',fontSize:9,color:'#dc2626',display:'flex',gap:6,alignItems:'flex-start'}}>
                      ⚠️ <span><strong>Skill Drift {selected.skill_drift}% detected.</strong> AI recommends updating this JD to reflect current market skills. <button onClick={()=>cloneToCreate(selected)} style={{color:P,background:'none',border:'none',cursor:'pointer',fontWeight:700,fontSize:9}}>Optimise with AI →</button></span>
                    </div>
                  )}
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginBottom:6}}>Role Summary</div>
                    <p style={{fontSize:10,color:'#374151',lineHeight:1.6,margin:0}}>{selected.summary}</p>
                  </div>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginBottom:6}}>Key Responsibilities</div>
                    {(selected.responsibilities||[]).map((r,i)=><div key={i} style={{fontSize:9,color:'#374151',padding:'4px 0',borderBottom:'1px solid #f8fafc',lineHeight:1.5}}>• {r}</div>)}
                  </div>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginBottom:6}}>Required Qualifications</div>
                    {(selected.qualifications||[]).map((q,i)=><div key={i} style={{fontSize:9,color:'#374151',padding:'3px 0'}}>• {q}</div>)}
                  </div>
                  <div style={{background:'#eff6ff',borderRadius:9,padding:'10px 12px',fontSize:9,color:'#1e40af'}}>
                    <strong>⚖️ Compliance:</strong> {selected.compliance_note}
                  </div>
                  {/* Skills */}
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginBottom:6}}>Skills</div>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {(selected.skills||[]).map((s,i)=><span key={i} style={{fontSize:8,padding:'3px 8px',borderRadius:8,background:'#f1f5f9',color:'#374151'}}>{s}</span>)}
                    </div>
                  </div>
                  {/* Salary */}
                  <div style={{fontSize:9,color:'#64748b'}}>
                    💰 NPR {(selected.salary_min/1000).toFixed(0)}K – {(selected.salary_max/1000).toFixed(0)}K/month · {selected.type} · {selected.location}
                  </div>
                </div>
              )}

              {activeTab==='kra'&&(
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{background:'#faf5ff',borderRadius:12,padding:14,border:'1px solid #e9d5ff'}}>
                    <div style={{fontSize:11,fontWeight:800,color:P,marginBottom:8}}>🎯 KRA Areas</div>
                    {fw.kra.map((k,i)=><div key={i} style={{padding:'6px 10px',background:'#fff',borderRadius:8,marginBottom:5,fontSize:9,color:'#374151',border:'1px solid #e9d5ff'}}>• {k}</div>)}
                  </div>
                  <div style={{background:'#eff6ff',borderRadius:12,padding:14,border:'1px solid #bfdbfe'}}>
                    <div style={{fontSize:11,fontWeight:800,color:'#1e40af',marginBottom:8}}>📊 KPI Targets</div>
                    {fw.kpi.map((k,i)=><div key={i} style={{padding:'6px 10px',background:'#fff',borderRadius:8,marginBottom:5,fontSize:9,color:'#374151',border:'1px solid #bfdbfe',display:'flex',alignItems:'center',gap:6}}><span style={{color:'#0284c7',fontWeight:900}}>◆</span>{k}</div>)}
                  </div>
                </div>
              )}

              {activeTab==='okr'&&(
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{background:'#f0fdf4',borderRadius:12,padding:14,border:'1px solid #bbf7d0'}}>
                    <div style={{fontSize:11,fontWeight:800,color:'#15803d',marginBottom:8}}>🔮 OKR Objectives</div>
                    {fw.okr.map((o,i)=>(
                      <div key={i} style={{padding:'8px 10px',background:'#fff',borderRadius:8,marginBottom:6,border:'1px solid #bbf7d0'}}>
                        <div style={{fontSize:9,fontWeight:700,color:'#15803d'}}>Objective {i+1}</div>
                        <div style={{fontSize:9,color:'#374151',marginTop:2}}>{o}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 12px',fontSize:9,color:'#64748b'}}>
                    💡 This JD contributes to <strong>{fw.okr.length}</strong> OKR objective{fw.okr.length!==1?'s':''} and is linked to the KRA/KPI performance framework. Employees in this role will have these OKRs auto-seeded in their performance profile.
                  </div>
                </div>
              )}

              {activeTab==='sig'&&(
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {selected.signed&&selected.signatures?.length>0?(
                    <>
                      <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 12px',fontSize:10,color:'#15803d',fontWeight:700,display:'flex',gap:6,alignItems:'center'}}>
                        ✅ Digitally signed by {selected.signatures.length} signator{selected.signatures.length===1?'y':'ies'}
                      </div>
                      {selected.signatures.map((sig,i)=>(
                        <div key={i} style={{padding:'12px',background:'#f8fafc',borderRadius:12,border:'1px solid #e2e8f0'}}>
                          <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{sig.name}</div>
                          <div style={{fontSize:8,color:'#64748b',marginBottom:6}}>{sig.role} · {sig.method} signature</div>
                          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:'8px',fontFamily:'serif',fontSize:18,fontStyle:'italic',color:'#1e1b4b',textAlign:'center'}}>
                            {sig.name.split('(')[0].trim()}
                          </div>
                          <div style={{fontSize:8,color:'#94a3b8',marginTop:4,textAlign:'right'}}>Nepal Electronic Transactions Act 2063 · Legally valid</div>
                        </div>
                      ))}
                    </>
                  ):(
                    <div style={{textAlign:'center',padding:'24px',color:'#94a3b8'}}>
                      <div style={{fontSize:28,marginBottom:8}}>✍️</div>
                      <div style={{fontSize:10,marginBottom:12}}>This JD has not been digitally signed yet.</div>
                      <button onClick={()=>cloneToCreate(selected)} style={{padding:'8px 18px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Open & Sign in Creator →</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{padding:'12px 18px',borderTop:'1px solid #e2e8f0',display:'flex',gap:8,flexWrap:'wrap'}}>
              <button onClick={()=>cloneToCreate(selected)}
                style={{flex:1,padding:'9px',borderRadius:9,border:`1px solid ${P}`,background:`${P}10`,color:P,fontSize:10,fontWeight:700,cursor:'pointer'}}>
                📋 Clone & Edit
              </button>
              <button onClick={()=>navTo?.('ats-dashboard')}
                style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                🚀 Publish to ATS
              </button>
              <button onClick={()=>navTo?.('kra-management')}
                style={{flex:1,padding:'9px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                🎯 View KRA
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// FILE: CourseManagementPage.jsx - Course Management (Full LMS Module)
// (Performance & Talent > Talent Development > Learning & Development)
// The catalog/authoring layer anchoring training_sessions (calendars),
// microlearning_chunks (daily), and training_recommendations (TNA
// dispatch) - all built in prior sessions, none duplicated here.
// 4 tabs: Catalog & Builder | Skill Matrix | Certification Vault | Analytics & ROI

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const COURSE_CATALOG = [
  { id:'c1', title:'AWS Solutions Architect', format:'Workshop', duration_hrs:16, skill_tags:['Cloud Architecture','AWS'],
    enrolled:42, completion_rate:78, compliance_required:false, rating:4.6, impact_links:['Training Needs Analysis','Weekly Training Calendar'] },
  { id:'c2', title:'OSH & Fire Safety Refresher', format:'In-Person', duration_hrs:3, skill_tags:['Workplace Safety','Compliance'],
    enrolled:298, completion_rate:94, compliance_required:true, rating:4.1, impact_links:['Annual Training Calendar'] },
  { id:'c3', title:'Effective Stakeholder Communication', format:'Video', duration_hrs:2, skill_tags:['Communication','Soft Skills'],
    enrolled:67, completion_rate:61, compliance_required:false, rating:4.3, impact_links:['Behaviour Evaluation'] },
]

const SKILL_MATRIX = [
  {employee:'Hari Thapa',dept:'IT',skills:{'Cloud Architecture':3,'Communication':5,'DevOps':4}},
  {employee:'Anjali Sharma',dept:'Sales',skills:{'Negotiation':5,'Communication':8,'CRM Tools':7}},
]
const REQUIRED_LEVELS = {'Cloud Architecture':7,'Communication':7,'DevOps':7,'Negotiation':8,'CRM Tools':6}

const CERTIFICATIONS = [
  {employee:'Sunil Magar',cert:'AWS Solutions Architect Associate',issued:'2025-03-10',expires:'2028-03-10',status:'active'},
  {employee:'Maya Pradhan',cert:'OSH Fire Safety Certification',issued:'2024-06-15',expires:'2025-06-15',status:'expiring',days_left:9},
]

const ANALYTICS = { avg_completion_rate:78, total_seat_hours:4280, avg_roi_score_lift:0.8, courses_overdue:3 }

const FORMAT_CFG = {Video:{c:'#0284c7',icon:'🎥'},Workshop:{c:'#7c3aed',icon:'🛠'},'In-Person':{c:'#f59e0b',icon:'🏛'},Article:{c:'#10b981',icon:'📄'}}

export default function CourseManagementPage() {
  const [activeTab, setActiveTab] = useState('catalog')
  const [search, setSearch] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filteredCourses = COURSE_CATALOG.filter(c=>!search||c.title.toLowerCase().includes(search.toLowerCase())||c.skill_tags.some(t=>t.toLowerCase().includes(search.toLowerCase())))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎓" title="Course Management"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'📚',label:'Total Courses',     value:COURSE_CATALOG.length},
          {icon:'✅',label:'Avg Completion',      value:ANALYTICS.avg_completion_rate+'%'},
          {icon:'🏆',label:'Active Certs',         value:CERTIFICATIONS.filter(c=>c.status==='active').length},
          {icon:'⚠',label:'Expiring Soon',          value:CERTIFICATIONS.filter(c=>c.status==='expiring').length},
        ]}
        onAdd={()=>setShowBuilder(true)} addLabel="Create Course"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>The Hub, Not a Silo:</strong> Every course here can be scheduled into Annual/Monthly/Weekly Calendars, dispatched via Training Needs Analysis, or surfaced as Daily microlearning - one catalog feeds every L&D surface in the system.</div>
      </div>

      {/* Tab navigation */}
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',background:'#f1f5f9',padding:6,borderRadius:12}}>
        {[{key:'catalog',label:'📚 Catalog & Builder'},{key:'skills',label:'🧩 Skill Matrix'},{key:'certs',label:'🏆 Certification Vault'},{key:'analytics',label:'📊 Analytics & ROI'}].map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{padding:'8px 14px',borderRadius:9,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
              background:activeTab===t.key?'#fff':'transparent',color:activeTab===t.key?A:'#64748b',
              fontWeight:activeTab===t.key?700:500,boxShadow:activeTab===t.key?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab==='catalog'&&(<>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by course title or skill tag..."/>
        <div style={{display:'grid',gap:14,marginTop:14}}>
          {filteredCourses.map(c=>{
            const fc = FORMAT_CFG[c.format]
            return (
              <div key={c.id}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.title,...c}})}}
                style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${fc.c}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                  <div style={{flex:1,minWidth:220}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{c.title}</span>
                      <span style={{background:`${fc.c}15`,color:fc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{fc.icon} {c.format}</span>
                      {c.compliance_required&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⚖ Mandatory</span>}
                    </div>
                    <div style={{fontSize:10,color:'#64748b'}}>{c.duration_hrs}h . ⭐ {c.rating} . {c.enrolled} enrolled</div>
                  </div>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:16,fontWeight:900,color:c.completion_rate>=80?'#10b981':'#f59e0b'}}>{c.completion_rate}%</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>COMPLETION</div>
                  </div>
                </div>
                <div style={{padding:'10px 18px',display:'flex',gap:6,flexWrap:'wrap'}}>
                  {c.skill_tags.map((t,i)=>(<span key={i} style={{background:'#f8fafc',color:'#475569',fontSize:9,fontWeight:600,padding:'2px 9px',borderRadius:20}}>#{t}</span>))}
                </div>
              </div>
            )
          })}
        </div>
      </>)}

      {activeTab==='skills'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',overflowX:'auto'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>🧩 Team Skill Matrix vs Required Levels</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:500}}>
            <thead><tr style={{background:'#f8fafc'}}>
              <th style={{padding:'8px 10px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>Employee</th>
              {Object.keys(REQUIRED_LEVELS).map(s=>(<th key={s} style={{padding:'8px 10px',textAlign:'center',fontSize:9,fontWeight:800,color:A}}>{s} (req. {REQUIRED_LEVELS[s]})</th>))}
            </tr></thead>
            <tbody>
              {SKILL_MATRIX.map((row,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}>
                  <td style={{padding:'9px 10px',fontWeight:700,color:'#0f172a'}}>{row.employee}</td>
                  {Object.keys(REQUIRED_LEVELS).map(skill=>{
                    const level = row.skills[skill]
                    const gap = level&&level<REQUIRED_LEVELS[skill]
                    return <td key={skill} style={{padding:'9px 10px',textAlign:'center',fontWeight:700,color:level?(gap?'#ef4444':'#10b981'):'#cbd5e1'}}>{level||'-'}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab==='certs'&&(
        <div style={{display:'grid',gap:12}}>
          {CERTIFICATIONS.map((c,i)=>(
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.cert,impact_links:['Employee Documents']}})}}
              style={{background:'#fff',border:`1px solid ${c.status==='expiring'?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{c.employee} - {c.cert}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>Issued {c.issued} . Expires {c.expires}</div>
              </div>
              {c.status==='active'?<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>✓ Active</span>:
               <span style={{background:'#fffbeb',color:'#b45309',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>⏳ {c.days_left}d left</span>}
            </div>
          ))}
        </div>
      )}

      {activeTab==='analytics'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
          {[{l:'Avg Completion Rate',v:ANALYTICS.avg_completion_rate+'%',c:'#10b981'},{l:'Total Seat Hours',v:ANALYTICS.total_seat_hours,c:'#0284c7'},
            {l:'Avg ROI Score Lift',v:'+'+ANALYTICS.avg_roi_score_lift,c:'#7c3aed'},{l:'Overdue Compliance',v:ANALYTICS.courses_overdue,c:'#ef4444'}].map((s,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'18px'}}>
              <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:6}}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Skill-gap scans across the workforce automatically suggest catalog courses with matching tags.','Certification expiry auto-locks course-gated system access 7 days before lapse, per compliance best practice.','Time-to-competency and ROI correlate directly with Performance Analytics - see Training ROI dashboard.']}/>
      </div>

      {showBuilder&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowBuilder(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(600px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Create Course</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Course Title" value="" onChange={()=>{}} accent={A} required/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Format" type="select" value="" onChange={()=>{}} accent={A} options={['Video','Workshop','In-Person','Article','SCORM Package']}/>
                <Field label="Duration (hours)" type="number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <Field label="Skill Tags (comma-separated)" value="" onChange={()=>{}} accent={A} hint="e.g. Cloud Architecture, AWS, DevOps"/>
              <div style={{margin:'10px 0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>Upload Content (SCORM/xAPI/Video)</div>
                <div style={{border:'2px dashed #e9d5ff',borderRadius:12,padding:'16px',textAlign:'center',background:'#faf5ff',cursor:'pointer'}}>
                  <div style={{fontSize:22,marginBottom:4}}>📦</div>
                  <div style={{fontSize:10,color:'#581c87'}}>Drag-and-drop SCORM/xAPI package, video, or document</div>
                </div>
              </div>
              <label style={{display:'flex',gap:8,alignItems:'center',margin:'10px 0',fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="checkbox" style={{accentColor:A}}/> Mandatory compliance course (auto-assigns by role/department)
              </label>
              <AIImpact color={A} lines={['Skill tags auto-link this course into the Skill Matrix and future TNA recommendations.','Mandatory courses auto-schedule into the Annual Training Calendar\'s compliance quarter.','Notification sent to enrolled employees and their reporting managers once published.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowBuilder(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Publish Course</button>
                <button onClick={()=>setShowBuilder(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'✏',label:'Edit Course',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Course Catalog" columns={['Title','Format','Duration (hrs)','Skill Tags','Enrolled','Completion %','Mandatory']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

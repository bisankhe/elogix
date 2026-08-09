// FILE: CampusHiringPage.jsx - Campus Hiring
// University CRM, alumni tracking, on-spot assessment, internship/apprentice agreements

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const UNIVERSITIES = [
  { id:'u1', name:'Kathmandu University', nepali:'काठमाडौं विश्वविद्यालय', tier:'tier_1',
    relationship_years:5, alumni_hired:18, avg_performance:4.3, retention_pct:89,
    upcoming_event:'2025-08-15', students_registered:142, status:'active',
    impact_links:['Hiring Event Branding','Culture Showcase'] },
  { id:'u2', name:'Tribhuvan University (IOE)', nepali:'त्रिभुवन विश्वविद्यालय', tier:'tier_1',
    relationship_years:7, alumni_hired:31, avg_performance:4.1, retention_pct:82,
    upcoming_event:'2025-07-20', students_registered:298, status:'active',
    impact_links:['Hiring Event Branding','Recruitment Campaign'] },
  { id:'u3', name:'Pokhara University', nepali:'पोखरा विश्वविद्यालय', tier:'tier_2',
    relationship_years:2, alumni_hired:6, avg_performance:3.9, retention_pct:75,
    upcoming_event:'2025-09-05', students_registered:64, status:'active',
    impact_links:['Hiring Event Branding'] },
  { id:'u4', name:'Purbanchal University', nepali:'पूर्वाञ्चल विश्वविद्यालय', tier:'tier_2',
    relationship_years:1, alumni_hired:2, avg_performance:3.7, retention_pct:100,
    upcoming_event:null, students_registered:0, status:'new',
    impact_links:[] },
]

const INTERNS = [
  { id:'i1', name:'Suman Thapa', university:'KU', program:'Software Internship', status:'active',
    start_date:'2025-06-01', end_date:'2025-08-31', stipend_npr:15000, mentor:'Bikash Shrestha',
    performance_score:4.5, conversion_likely:true, agreement_signed:true },
  { id:'i2', name:'Anisha Gurung', university:'TU (IOE)', program:'Finance Internship', status:'active',
    start_date:'2025-05-15', end_date:'2025-08-15', stipend_npr:12000, mentor:'Sanjay Karki',
    performance_score:4.2, conversion_likely:true, agreement_signed:true },
  { id:'i3', name:'Rohit Khadka', university:'Pokhara University', program:'HR Internship', status:'completed',
    start_date:'2025-03-01', end_date:'2025-05-31', stipend_npr:10000, mentor:'Priya Adhikari',
    performance_score:3.8, conversion_likely:false, agreement_signed:true },
]

const TIER_CFG = {tier_1:{c:'#7c3aed',label:'Tier 1 Partner'}, tier_2:{c:'#3b82f6',label:'Tier 2'}}
const CTX = [
  {icon:'👁',label:'View University Profile', key:'view'},
  {icon:'📅',label:'Schedule Campus Event',    key:'event'},
  {icon:'📋',label:'View Alumni Performance',  key:'alumni'},
  {icon:'🔗',label:'Impact Analysis',          key:'impact'},
  {icon:'📤',label:'Export',                   key:'export'},
]

export default function CampusHiringPage() {
  const [tab, setTab]             = useState('universities')

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [universities, setUniversities] = useState(UNIVERSITIES)
  const [interns, setInterns]     = useState(INTERNS)
  const [search, setSearch]       = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)

  const totalAlumni = universities.reduce((s,u)=>s+u.alumni_hired,0)
  const activeInterns = interns.filter(i=>i.status==='active').length
  const conversionLikely = interns.filter(i=>i.conversion_likely).length

  const filteredU = universities.filter(u=>!search||u.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎓" title="Campus Hiring"
        breadcrumb="Employee Lifecycle > Recruitment > Employer Branding"
        gradient={G}
        stats={[
          {icon:'🏫',label:'University Partners',value:universities.length},
          {icon:'👨‍🎓',label:'Alumni Hired',         value:totalAlumni},
          {icon:'📋',label:'Active Interns',       value:activeInterns},
          {icon:'🎯',label:'Conversion Likely',    value:conversionLikely},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add University"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Compliance:</strong> Internship/apprentice arrangements require formal agreements defining hours, stipend, and tenure per Labour Act 2074. No persons under 18 in non-approved roles. Branding materials must not feature minors.</div>
      </div>

      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:4,borderRadius:10,marginBottom:14,width:'fit-content'}}>
        {['universities','interns'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:'9px 20px',borderRadius:8,border:'none',cursor:'pointer',background:tab===t?'#fff':'transparent',
              color:tab===t?A:'#64748b',fontWeight:tab===t?700:400,fontSize:12,boxShadow:tab===t?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {t==='universities'?'University Partners':'Active Interns'}
          </button>
        ))}
      </div>

      {tab==='universities'&&(
        <>
          <SearchBar value={search} onChange={setSearch} placeholder="Search universities..."/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))',gap:14,marginTop:12}}>
            {filteredU.map(u=>{
              const tc = TIER_CFG[u.tier]||TIER_CFG.tier_2
              return (
                <LuxCard key={u.id} color={tc.c}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:u.name,...u}})}}>
                  <div style={{padding:'16px 16px 10px'}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{u.name}</span>
                      <span style={{background:`${tc.c}15`,color:tc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{tc.label}</span>
                    </div>
                    <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic',marginBottom:8}}>{u.nepali}</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
                      {[{l:'Alumni Hired',v:u.alumni_hired,c:tc.c},{l:'Avg Perf',v:u.avg_performance,c:'#10b981'},{l:'Retention',v:u.retention_pct+'%',c:'#3b82f6'}].map((s,i)=>(
                        <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'6px 4px'}}>
                          <div style={{fontSize:13,fontWeight:900,color:s.c}}>{s.v}</div>
                          <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:'#64748b'}}>Partnership: {u.relationship_years}yr . {u.students_registered} students registered</div>
                    {u.upcoming_event&&<div style={{marginTop:6,background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'5px 8px',fontSize:10,color:'#92400e'}}>📅 Next campus event: {u.upcoming_event}</div>}
                  </div>
                  <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                    <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${tc.c}12`,color:tc.c,fontSize:10,fontWeight:700,cursor:'pointer'}}>Schedule Event</button>
                    <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>View Alumni</button>
                  </div>
                </LuxCard>
              )
            })}
          </div>
        </>
      )}

      {tab==='interns'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#f0fdf4,#eff6ff)'}}>
                  {['Name','University','Program','Period','Stipend','Mentor','Performance','Convert?','Agreement'].map(h=>(
                    <th key={h} style={{padding:'11px 12px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {interns.map(i=>(
                  <tr key={i.id} style={{borderBottom:'1px solid #f8fafc'}}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:i.name,impact_links:['Talent Pool']}})}}>
                    <td style={{padding:'10px 12px',fontWeight:700,color:'#0f172a'}}>{i.name}</td>
                    <td style={{padding:'10px 12px',color:'#64748b'}}>{i.university}</td>
                    <td style={{padding:'10px 12px',color:'#64748b',fontSize:10}}>{i.program}</td>
                    <td style={{padding:'10px 12px',color:'#94a3b8',fontSize:10}}>{i.start_date} to {i.end_date}</td>
                    <td style={{padding:'10px 12px',fontWeight:700,color:'#10b981'}}>NPR {i.stipend_npr.toLocaleString()}</td>
                    <td style={{padding:'10px 12px',color:'#64748b',fontSize:10}}>{i.mentor}</td>
                    <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:i.performance_score>=4?'#10b981':'#f59e0b'}}>{i.performance_score}/5</td>
                    <td style={{padding:'10px 12px',textAlign:'center'}}><span style={{color:i.conversion_likely?'#10b981':'#94a3b8',fontWeight:700}}>{i.conversion_likely?'✓ Yes':'No'}</span></td>
                    <td style={{padding:'10px 12px',textAlign:'center'}}><span style={{color:i.agreement_signed?'#10b981':'#ef4444',fontWeight:700}}>{i.agreement_signed?'✓':'✗'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add University Partnership</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>University Name</label><input type="text" value={form.university_name||''} onChange={e=>setForm(p=>({...p,university_name:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Tier</label><select value={form.tier||''} onChange={e=>setForm(p=>({...p,tier:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['tier_1','tier_2'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Primary Contact</label><input type="text" value={form.primary_contact||''} onChange={e=>setForm(p=>({...p,primary_contact:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Departments to Target</label><input type="text" value={form.departments_to_target||''} onChange={e=>setForm(p=>({...p,departments_to_target:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
              </div>
              <AIImpact color={A} lines={['Alumni performance auto-tracked once hired via this pipeline.','University ranked by retention + performance metrics.','Internship agreements link to formal LA2074 contract templates.','Campus events sync with Hiring Event Branding module.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Partnership</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Campus Hiring" columns={['University','Tier','Alumni Hired','Avg Performance','Retention %','Students Registered']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

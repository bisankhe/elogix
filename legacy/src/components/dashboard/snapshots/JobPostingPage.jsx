// FILE: JobPostingPage.jsx - Job Posting
// Multi-channel distribution, bias scanner, AI JD writer, Nepal LA2074

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c084fc 100%)'
const A = '#7c3aed'

const JOB_BOARDS = [
  {id:'jb1',name:'MoLESS Portal',       icon:'🇳🇵',required:true,  color:'#dc2626', desc:'Nepal Labour Ministry - Mandatory per LA2074'},
  {id:'jb2',name:'LinkedIn',            icon:'💼',required:false, color:'#0369a1', desc:'Professional network - 2M+ Nepal users'},
  {id:'jb3',name:'Merojob.com.np',      icon:'🌐',required:false, color:'#059669', desc:'Nepal top job portal'},
  {id:'jb4',name:'Kumarijob.com',       icon:'🌐',required:false, color:'#0891b2', desc:'Nepal IT-focused job portal'},
  {id:'jb5',name:'JobsNepal.net',       icon:'🌐',required:false, color:'#7c3aed', desc:'General Nepal job portal'},
  {id:'jb6',name:'Company Website',     icon:'🏢',required:false, color:'#64748b', desc:'Career page on elogix.com.np'},
  {id:'jb7',name:'National Newspaper',  icon:'📰',required:true,  color:'#dc2626', desc:'Mandatory per Nepal LA2074 Section 11'},
]

const POSTINGS = [
  { id:'jp1', title:'Senior Software Developer', dept:'IT', status:'live',
    published_date:'2025-06-01', expiry_date:'2025-07-31',
    boards:['jb1','jb2','jb3','jb7'], views:342, applications:47, clicks:289,
    bias_score:92, la_compliant:true, jrf_no:'JRF-2025-001',
    salary_range:'NPR 80K-130K', location:'Kathmandu HQ',
    impact_links:['Vacancy Management','ATS Dashboard','Career Portal'] },
  { id:'jp2', title:'Customer Service Representative', dept:'Customer', status:'live',
    published_date:'2025-06-01', expiry_date:'2025-07-15',
    boards:['jb1','jb3','jb6'], views:189, applications:63, clicks:156,
    bias_score:88, la_compliant:false, jrf_no:'JRF-2025-004',
    salary_range:'NPR 35K-50K', location:'Pokhara',
    impact_links:['Vacancy Management','ATS Dashboard'] },
  { id:'jp3', title:'Finance Manager', dept:'Finance', status:'live',
    published_date:'2025-04-15', expiry_date:'2025-06-30',
    boards:['jb1','jb2','jb7'], views:98, applications:18, clicks:82,
    bias_score:95, la_compliant:true, jrf_no:'JRF-2025-003',
    salary_range:'NPR 130K-160K', location:'Kathmandu HQ',
    impact_links:['Vacancy Management','ATS Dashboard','Finance'] },
  { id:'jp4', title:'Cloud Architect', dept:'IT', status:'draft',
    published_date:null, expiry_date:null,
    boards:[], views:0, applications:0, clicks:0,
    bias_score:null, la_compliant:false, jrf_no:'JRF-2025-005',
    salary_range:'NPR 160K-200K', location:'Kathmandu HQ',
    impact_links:['Vacancy Management','ATS Dashboard'] },
]

const STATUS_CFG = {
  live:   {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',icon:'🟢',label:'Live'},
  draft:  {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'✏',label:'Draft'},
  closed: {c:'#64748b',bg:'#f8fafc',b:'#e2e8f0',icon:'🔒',label:'Closed'},
  paused: {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',icon:'⏸',label:'Paused'},
}
const CTX = [
  {icon:'👁',label:'Preview Posting',        key:'preview'},
  {icon:'📢',label:'Distribute to All Boards',key:'distribute'},
  {icon:'🤖',label:'AI Bias Scanner',         key:'bias'},
  {icon:'✏',label:'Edit JD',                 key:'edit'},
  {icon:'📊',label:'View Analytics',          key:'analytics'},
  {icon:'🔗',label:'Impact Analysis',         key:'impact'},
  {icon:'📤',label:'Export',                  key:'export'},
  {icon:'🔒',label:'Close Posting',           key:'close', danger:true},
]

export default function JobPostingPage() {
  const [postings, setPostings] = useState(POSTINGS)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showExcel, setShowExcel]   = useState(false)
  const [ctx, setCtx]         = useState(null)
  const [selected, setSelected] = useState(null)
  const [selectedBoards, setSelectedBoards] = useState({'jb1':true,'jb7':true})
  const [aiJD, setAiJD] = useState('')
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({vacancy:'',title:'',dept:'IT',location:'',salary:'',deadline:''})

  const filtered = postings.filter(p=>{
    if (filterStatus!=='all'&&p.status!==filterStatus) return false
    if (search&&!p.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalViews = postings.reduce((s,p)=>s+p.views,0)
  const totalApps  = postings.reduce((s,p)=>s+p.applications,0)
  const liveCount  = postings.filter(p=>p.status==='live').length
  const nonCompliant = postings.filter(p=>!p.la_compliant).length

  const generateAI = () => {
    setGenerating(true)
    setTimeout(()=>{
      setAiJD(`**Senior Software Developer - eLogix HRMS**\n\nWe are seeking a talented Senior Software Developer to join our growing IT team at Kathmandu HQ.\n\n**Responsibilities:**\n- Design and develop scalable backend systems using Python/Flask and React\n- Lead code reviews and mentor junior developers\n- Collaborate with HR stakeholders to deliver digital solutions\n\n**Requirements:**\n- 5+ years software development experience\n- Strong proficiency in React, Python, PostgreSQL\n- Bachelor's degree in Computer Science or related field\n\n**Salary:** NPR 80,000 - 130,000 per month\n\n*eLogix HRMS is an equal opportunity employer. We do not discriminate on the basis of religion, sex, caste, race, or ethnicity.*`)
      setGenerating(false)
    },1500)
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📢" title="Job Posting"
        breadcrumb="Employee Lifecycle > Recruitment > Recruitment Management"
        gradient={G}
        stats={[
          {icon:'🟢',label:'Live Postings', value:liveCount},
          {icon:'👁',label:'Total Views',    value:totalViews},
          {icon:'📩',label:'Applications',   value:totalApps},
          {icon:'⚠',label:'Non-Compliant',  value:nonCompliant},
        ]}
        onAdd={()=>setShowCreate(true)} addLabel="Create Posting"
        onExcel={()=>setShowExcel(true)}/>

      {nonCompliant>0&&(
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#991b1b',display:'flex',gap:10}}>
          <span style={{fontSize:18}}>⚖</span>
          <div><strong>{nonCompliant} posting(s) not LA2074 compliant!</strong> Nepal Labour Act 2074 Section 11: Mandatory national newspaper advertisement + MoLESS portal posting required before accepting applications.</div>
        </div>
      )}

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search postings..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','live','draft','closed','paused'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(p=>{
          const sc = STATUS_CFG[p.status]||STATUS_CFG.draft
          return (
            <div key={p.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.title,...p}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.b}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>

              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:3,alignItems:'center'}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{p.title}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {!p.la_compliant&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>LA2074 Non-Compliant</span>}
                    {p.bias_score&&<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>Bias Score: {p.bias_score}/100</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{p.jrf_no} . {p.dept} . {p.location} . {p.salary_range}</div>
                  {p.published_date&&<div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Published: {p.published_date} . Expires: {p.expiry_date}</div>}
                </div>
                {p.status==='live'&&(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,60px)',gap:8,flexShrink:0}}>
                    {[{l:'Views',v:p.views,c:'#3b82f6'},{l:'Clicks',v:p.clicks,c:'#8b5cf6'},{l:'Applied',v:p.applications,c:'#10b981'}].map((s,i)=>(
                      <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:10,padding:'6px 4px'}}>
                        <div style={{fontSize:14,fontWeight:900,color:s.c}}>{s.v}</div>
                        <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Job boards */}
              <div style={{padding:'10px 20px',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',borderBottom:'1px solid #f8fafc'}}>
                <span style={{fontSize:10,color:'#94a3b8',flexShrink:0}}>Published on:</span>
                {p.boards.length>0 ? JOB_BOARDS.filter(jb=>p.boards.includes(jb.id)).map(jb=>(
                  <span key={jb.id} style={{background:`${jb.color}12`,color:jb.color,border:`1px solid ${jb.color}33`,fontSize:10,fontWeight:600,padding:'2px 10px',borderRadius:20}}>
                    {jb.icon} {jb.name}
                  </span>
                )) : <span style={{color:'#f59e0b',fontSize:10,fontWeight:700}}>Not yet published to any boards</span>}
              </div>

              <div style={{padding:'8px 14px',display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button onClick={()=>setSelected(p)} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>View</button>
                {p.status==='draft'&&<button onClick={()=>setPostings(prev=>prev.map(x=>x.id===p.id?{...x,status:'live',published_date:new Date().toISOString().split('T')[0]}:x))} style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Publish Now</button>}
                {p.status==='live'&&<button style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#1d4ed8',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Distribute</button>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create posting modal with AI JD Generator */}
      {showCreate&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCreate(false)}>
          <div style={{background:'#fff',borderRadius:20,width:760,maxHeight:'92vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Create Job Posting</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>AI JD Generator + Multi-channel distribution + Bias scanner</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                {[['Link to Vacancy (JRF)','vacancy','text'],['Job Title *','title','text'],['Location','location','text'],['Salary Range (NPR)','salary','text'],['Application Deadline','deadline','date']].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Department</label>
                  <select value={form.dept} onChange={e=>setForm(p=>({...p,dept:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    {['IT','Finance','HR','Operations','Sales','Customer Service','Facilities'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* AI JD Generator */}
              <div style={{background:'linear-gradient(135deg,#f5f3ff,#ede9fe)',border:'1px solid #c4b5fd',borderRadius:12,padding:'14px 16px',marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#3730a3'}}>🤖 AI Job Description Generator</div>
                  <button onClick={generateAI} style={{padding:'7px 16px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                    {generating?'Generating...':'Generate JD'}
                  </button>
                </div>
                {aiJD ? (
                  <textarea value={aiJD} onChange={e=>setAiJD(e.target.value)}
                    style={{width:'100%',height:200,padding:'10px',borderRadius:8,border:'1px solid #c4b5fd',fontSize:11,resize:'vertical',fontFamily:'inherit',color:'#334155'}}/>
                ) : (
                  <div style={{padding:'20px',textAlign:'center',color:'#8b5cf6',fontSize:11}}>Click "Generate JD" to create an AI-powered job description with built-in bias detection</div>
                )}
              </div>

              {/* Job board selection */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:10}}>Publish to Job Boards</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {JOB_BOARDS.map(jb=>(
                    <label key={jb.id} style={{display:'flex',gap:10,alignItems:'center',padding:'8px 12px',borderRadius:10,border:`1px solid ${selectedBoards[jb.id]?jb.color+'44':'#e2e8f0'}`,background:selectedBoards[jb.id]?`${jb.color}08`:'#fff',cursor:'pointer'}}>
                      <input type="checkbox" checked={!!selectedBoards[jb.id]} onChange={e=>setSelectedBoards(p=>({...p,[jb.id]:e.target.checked}))} style={{accentColor:jb.color}}/>
                      <span style={{fontSize:14}}>{jb.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{jb.name}{jb.required&&<span style={{color:'#dc2626',fontSize:9}}> *Required</span>}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{jb.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <AIImpact color={A} lines={['AI scans JD for gender/caste bias before publishing.','One-click syndication to all selected boards.','LA2074: National newspaper + MoLESS posting mandatory.','Candidate applications auto-flow into ATS pipeline.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.title){alert('Job title required');return}
                  setPostings(prev=>[...prev,{
                    id:'jp'+Date.now(),title:form.title,dept:form.dept,status:'draft',
                    published_date:null,expiry_date:form.deadline||null,
                    boards:[],views:0,applications:0,clicks:0,
                    bias_score:null,la_compliant:false,jrf_no:form.vacancy||'JRF-NEW',
                    salary_range:form.salary||'TBD',location:form.location||'KTM HQ',
                    impact_links:['Vacancy Management','ATS Dashboard']
                  }])
                  setShowCreate(false)
                  setForm({vacancy:'',title:'',dept:'IT',location:'',salary:'',deadline:''})
                }} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>📢 Create Job Posting</button>
                <button onClick={()=>setShowCreate(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Save Draft</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Job Postings" columns={['Title','Department','Status','Published Date','Expiry Date','Boards','Views','Clicks','Applications','Bias Score','LA Compliant']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Title',selected?.title],['Department',selected?.dept],['Location',selected?.location],
        ['Salary Range',selected?.salary_range],['Status',selected?.status],
        ['Published',selected?.published_date||'Not published'],['Expires',selected?.expiry_date||'N/A'],
        ['Views',selected?.views],['Applications',selected?.applications],
        ['Bias Score',selected?.bias_score?selected.bias_score+'/100':'Not scanned'],
        ['LA2074 Compliant',selected?.la_compliant?'Yes':'NO - Action Required'],
      ]}/>
    </div>
  )
}

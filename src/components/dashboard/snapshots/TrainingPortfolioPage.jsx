// FILE: TrainingPortfolioPage.jsx - Training Portfolio
// (Performance & Talent > Talent Development > Career Development)
// "Netflix-style" personal portfolio -- pure consumption over the
// EXISTING v_my_learning_path + v_my_credentials_employee (Course
// Management / Certificate Generation). Never duplicates course or
// certification data; just a curated, career-pathing-aware personal view.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const MY_PORTFOLIO = [
  { id:'p1', title:'AWS Solutions Architect', format:'Workshop', progress_pct:65, cpe_hours:16, linked_to_path:'Senior Software Engineer', impact_links:['Career Pathing','Course Management'] },
  { id:'p2', title:'CI/CD Pipeline Mastery', format:'Video', progress_pct:100, cpe_hours:8, linked_to_path:null, impact_links:['Certification Tracking'] },
  { id:'p3', title:'OSH & Fire Safety Refresher', format:'In-Person', progress_pct:100, cpe_hours:3, linked_to_path:null, impact_links:[] },
]

const MY_CERTIFICATES = [
  {title:'CI/CD Pipeline Mastery',issued:'2025-05-12',cpe_hours:8},
  {title:'OSH & Fire Safety Refresher',issued:'2025-04-18',cpe_hours:3},
]

const RECOMMENDED_FOR_YOU = [
  {title:'System Design Fundamentals',reason:'Closes a gap on your Senior Software Engineer path',format:'Video'},
  {title:'AWS Cloud Practitioner Certification',reason:'Prerequisite for your in-progress Solutions Architect course',format:'Workshop'},
]

const FORMAT_CFG = {Video:{c:'#0284c7',icon:'🎥'},Workshop:{c:'#7c3aed',icon:'🛠'},'In-Person':{c:'#f59e0b',icon:'🏛'}}

export default function TrainingPortfolioPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const totalCPE = MY_PORTFOLIO.reduce((s,p)=>s+p.cpe_hours,0)
  const filtered = MY_PORTFOLIO.filter(p=>!search||p.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎬" title="Training Portfolio"
        breadcrumb="Performance & Talent Management > Talent Development > Career Development"
        gradient={G}
        stats={[
          {icon:'📚',label:'Courses in Portfolio', value:MY_PORTFOLIO.length},
          {icon:'🏆',label:'Certificates Earned',     value:MY_CERTIFICATES.length},
          {icon:'⏱',label:'Total CPE Hours',           value:totalCPE},
          {icon:'🎯',label:'Linked to Career Path',     value:MY_PORTFOLIO.filter(p=>p.linked_to_path).length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎬</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Personal Learning Catalog:</strong> Every course, certificate, and CPE hour you've earned, surfaced the way a streaming app surfaces what to watch next -- not buried in HR paperwork.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search your portfolio..."/>

      {/* Tile-based course grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14,marginTop:14,marginBottom:18}}>
        {filtered.map(p=>{
          const fc = FORMAT_CFG[p.format]
          return (
            <div key={p.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.title,...p}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
              <div style={{height:60,background:`${fc.c}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>{fc.icon}</div>
              <div style={{padding:'12px 14px'}}>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:6}}>{p.title}</div>
                <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden',marginBottom:6}}><div style={{width:`${p.progress_pct}%`,height:'100%',background:p.progress_pct===100?'#10b981':A,borderRadius:6}}/></div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:8,color:'#94a3b8'}}>
                  <span>{p.cpe_hours}h CPE</span><span>{p.progress_pct}%</span>
                </div>
                {p.linked_to_path&&<div style={{marginTop:6,fontSize:8,color:A,fontWeight:600}}>🗺 {'>'} {p.linked_to_path}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* AI Recommendations */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🤖 Recommended for You</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
          {RECOMMENDED_FOR_YOU.map((r,i)=>(
            <div key={i} style={{background:'#fff7ed',borderRadius:12,padding:'12px 14px'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{r.title}</div>
              <div style={{fontSize:9,color:'#92400e',marginTop:4}}>{r.reason}</div>
              <button style={{marginTop:8,padding:'5px 12px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Add to Portfolio</button>
            </div>
          ))}
        </div>
      </div>

      {/* Certificates */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🏆 Certificates</div>
        {MY_CERTIFICATES.map((c,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<MY_CERTIFICATES.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,fontWeight:600,color:'#0f172a'}}>{c.title}</span>
            <span style={{fontSize:9,color:'#94a3b8'}}>{c.issued} . {c.cpe_hours}h CPE</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Recommendations weigh your active Career Pathing target roles above generic popularity.','CPE/CPD hour totals export-ready for professional license renewal.','Portfolio auto-updates the instant a course completes -- no manual syncing.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

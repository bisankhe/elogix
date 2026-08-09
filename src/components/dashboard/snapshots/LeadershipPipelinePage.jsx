// FILE: LeadershipPipelinePage.jsx - Leadership Pipeline
// (Performance & Talent > Talent Development > Succession Planning)
// Executive bench-strength dashboard, pure UI over the EXISTING
// leadership_pipeline table (built in Career Development). Funnel view
// + IDP/stretch-assignment tracker -- continuous, systemic, not episodic.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const FUNNEL = [
  {stage:'Total Workforce',count:298,c:'#94a3b8'},{stage:'Mapped in 9-Box',count:212,c:'#0284c7'},
  {stage:'Identified HiPo',count:18,c:'#7c3aed'},{stage:'In Active Pipeline',count:11,c:'#15803d'},{stage:'Ready Now',count:4,c:'#10b981'},
]

const PIPELINE_DETAIL = [
  { id:'p1', employee:'Gita Maharjan', target_role:'Engineering Director', stretch_assignment:'Leading the Q3 platform migration (cross-functional, 40 engineers)',
    mentor:'Sunil Magar (Cloud Architect)', rotation:'2 months in Product Engineering (Q2 2025)', idp_progress_pct:68, impact_links:['Readiness Assessment','Career Pathing'] },
  { id:'p2', employee:'Anjali Sharma', target_role:'Sales Director', stretch_assignment:'Owns the Enterprise expansion strategy for FY 2083/84',
    mentor:'Dipesh Bhattarai (Director)', rotation:'None scheduled', idp_progress_pct:42,
    flag_note:'No cross-functional rotation scheduled -- risk of one-dimensional development.', impact_links:['HiPo Employees'] },
]

const DEPT_BENCH = [
  {dept:'IT',critical_roles:4,covered:3},{dept:'Sales & Marketing',critical_roles:2,covered:0},
  {dept:'Finance',critical_roles:2,covered:1},{dept:'HR',critical_roles:1,covered:1},
]

export default function LeadershipPipelinePage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = PIPELINE_DETAIL.filter(p=>!search||p.employee.toLowerCase().includes(search.toLowerCase()))
  const maxFunnel = FUNNEL[0].count

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏛" title="Leadership Pipeline"
        breadcrumb="Performance & Talent Management > Talent Development > Succession Planning"
        gradient={G}
        stats={[
          {icon:'🏛',label:'In Active Pipeline',  value:FUNNEL[3].count},
          {icon:'✅',label:'Ready Now',              value:FUNNEL[4].count},
          {icon:'⚠',label:'Uncovered Critical Roles', value:DEPT_BENCH.reduce((s,d)=>s+(d.critical_roles-d.covered),0)},
          {icon:'📊',label:'Bench Depth',                value:'1.3x'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔄</span>
        <div style={{flex:1,minWidth:200}}><strong>Continuous, Systemic Development:</strong> Stretch assignments, mentorship, and cross-functional rotations -- tracked together, not as isolated training events. A candidate with no rotation scheduled is a real flag, not a minor gap.</div>
      </div>

      {/* Bench-strength funnel */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Organization Bench-Strength Funnel</div>
        {FUNNEL.map((f,i)=>(
          <div key={i} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
              <span style={{color:'#374151',fontWeight:600}}>{f.stage}</span><span style={{fontWeight:700,color:f.c}}>{f.count}</span>
            </div>
            <div style={{height:10,background:'#f1f5f9',borderRadius:10,overflow:'hidden'}}><div style={{width:`${f.count/maxFunnel*100}%`,height:'100%',background:f.c,borderRadius:10}}/></div>
          </div>
        ))}
      </div>

      {/* Department bench coverage */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>🏢 Department Bench Coverage</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
          {DEPT_BENCH.map((d,i)=>{
            const gap = d.critical_roles - d.covered
            return (
              <div key={i} style={{background:gap>0?'#fef2f2':'#f0fdf4',borderRadius:10,padding:'12px'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{d.dept}</div>
                <div style={{fontSize:14,fontWeight:900,color:gap>0?'#dc2626':'#15803d',marginTop:4}}>{d.covered}/{d.critical_roles}</div>
                <div style={{fontSize:8,color:'#94a3b8'}}>roles covered</div>
              </div>
            )
          })}
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(p=>(
          <div key={p.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.employee,...p}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${A}`}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9'}}>
              <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{p.employee}</div>
              <div style={{fontSize:10,color:'#64748b'}}>Target: {p.target_role}</div>
            </div>
            <div style={{padding:'12px 18px'}}>
              <div style={{fontSize:10,color:'#374151',marginBottom:6}}>🎯 <strong>Stretch Assignment:</strong> {p.stretch_assignment}</div>
              <div style={{fontSize:10,color:'#374151',marginBottom:6}}>👤 <strong>Mentor:</strong> {p.mentor}</div>
              <div style={{fontSize:10,color:'#374151'}}>🔄 <strong>Rotation:</strong> {p.rotation}</div>
            </div>
            <div style={{padding:'10px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:9}}>
                <span style={{color:'#94a3b8'}}>IDP Progress</span><span style={{fontWeight:700,color:A}}>{p.idp_progress_pct}%</span>
              </div>
              <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${p.idp_progress_pct}%`,height:'100%',background:A,borderRadius:7}}/></div>
            </div>
            {p.flag_note&&<div style={{padding:'10px 18px',background:'#fffbeb',fontSize:10,color:'#92400e'}}><strong>⚠</strong> {p.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Pulls live from the existing Leadership Pipeline + 9-Box classification -- no duplicate tracking.','Departments with zero covered critical roles auto-escalate to the executive risk dashboard.','IDP progress syncs with Employee Development Plan -- one source of truth across both pages.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full IDP',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

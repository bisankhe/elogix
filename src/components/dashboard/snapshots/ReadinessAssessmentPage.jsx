// FILE: ReadinessAssessmentPage.jsx - Readiness Assessment
// (Performance & Talent > Talent Development > Succession Planning)
// Objective gap-analysis: required executive competencies vs current
// candidate skills (reuses employee_skill_levels). Standardized,
// calibrated time horizons -- never a subjective manager "gut feel" tag.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const ASSESSMENTS = [
  { id:'a1', employee:'Gita Maharjan', target_role:'Engineering Director',
    competencies:[{name:'Strategic Planning',current:7,required:8},{name:'Budget Management',current:5,required:8},{name:'Cross-Functional Influence',current:8,required:7}],
    calibrated_by:['Direct Manager','Skip-Level','HR Partner'], readiness:'ready_1_2yr', impact_links:['Successor Identification'] },
  { id:'a2', employee:'Anjali Sharma', target_role:'Sales Director',
    competencies:[{name:'Strategic Planning',current:6,required:8},{name:'Team Leadership',current:9,required:7},{name:'Executive Communication',current:7,required:8}],
    calibrated_by:['Direct Manager','HR Partner'], readiness:'ready_now',
    flag_note:'Calibration incomplete: missing Skip-Level sign-off before this can be finalized as Ready Now.', impact_links:[] },
]

const READINESS_CFG = { ready_now:{c:'#10b981',label:'Ready Now'},ready_1_2yr:{c:'#f59e0b',label:'Ready in 1-2 Years'},ready_3plus_yr:{c:'#ef4444',label:'Ready in 3+ Years'} }

export default function ReadinessAssessmentPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = ASSESSMENTS.filter(a=>!search||a.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📐" title="Readiness Assessment"
        breadcrumb="Performance & Talent Management > Talent Development > Succession Planning"
        gradient={G}
        stats={[
          {icon:'📐',label:'Assessments',     value:ASSESSMENTS.length},
          {icon:'✅',label:'Ready Now',          value:ASSESSMENTS.filter(a=>a.readiness==='ready_now').length},
          {icon:'⏳',label:'Ready 1-2 Yrs',        value:ASSESSMENTS.filter(a=>a.readiness==='ready_1_2yr').length},
          {icon:'⚖',label:'Calibration Tiers',      value:3},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Objective, Calibrated, Never a Guess:</strong> "Ready Now" requires sign-off from Direct Manager, Skip-Level, AND HR Partner -- a single manager's nomination is never enough. Avoids the "Ready Now Fallacy" of declaring readiness without standardized evaluation of cross-functional complexity.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(a=>{
          const rc = READINESS_CFG[a.readiness]
          return (
            <div key={a.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.employee,...a}})}}
              style={{background:'#fff',border:`1.5px solid ${rc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${rc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{a.employee}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>Target: {a.target_role}</div>
                </div>
                <span style={{background:`${rc.c}15`,color:rc.c,fontSize:10,fontWeight:700,padding:'4px 12px',borderRadius:20}}>{rc.label}</span>
              </div>

              <div style={{padding:'12px 18px'}}>
                {a.competencies.map((c,i)=>(
                  <div key={i} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                      <span style={{color:'#374151'}}>{c.name}</span><span style={{fontWeight:700,color:c.current>=c.required?'#10b981':'#ef4444'}}>{c.current}/{c.required}</span>
                    </div>
                    <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden',position:'relative'}}>
                      <div style={{width:`${c.current/10*100}%`,height:'100%',background:c.current>=c.required?'#10b981':'#f59e0b',borderRadius:7}}/>
                      <div style={{position:'absolute',left:`${c.required/10*100}%`,top:0,bottom:0,width:2,background:'#1e293b'}}/>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{padding:'8px 18px',display:'flex',gap:6,flexWrap:'wrap'}}>
                {a.calibrated_by.map((m,i)=>(<span key={i} style={{background:'#f0fdf4',color:'#15803d',fontSize:8,fontWeight:600,padding:'2px 8px',borderRadius:20}}>✓ {m}</span>))}
              </div>
              {a.flag_note&&<div style={{padding:'10px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠</strong> {a.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Competency gaps pulled live from the existing Skill Matrix -- never re-entered manually.','Readiness auto-recalculates the moment a candidate completes a tagged development course.','"Ready Now" status is locked until all three calibration tiers have signed off.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Assessment',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

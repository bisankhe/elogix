// FILE: EffectivenessOfTrainingPage.jsx - Effectiveness of Training
// (Performance & Talent > Talent Development > Learning & Development)
// Kirkpatrick Level 3/4: pre/post performance correlation, NOT just
// completion or CSAT. Requires a baseline -- flags courses launched
// without one. Cross-references the EXISTING performance_appraisals.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const EFFECTIVENESS_DATA = [
  { id:'e1', course:'AWS Solutions Architect', has_baseline:true, pre_score:3.1, post_score:3.9, days_since:90,
    applied_on_job_pct:74, correlation_note:'Strong correlation: 74% of participants closed a related Performance Appraisal goal within 90 days.',
    impact_links:['Performance Appraisal','Training ROI'] },
  { id:'e2', course:'CI/CD Pipeline Mastery', has_baseline:true, pre_score:2.8, post_score:3.2, days_since:45,
    applied_on_job_pct:38, correlation_note:'Weak transfer: only 38% show measurable on-job application -- recommend reinforcement coaching.',
    impact_links:['Performance Appraisal'] },
  { id:'e3', course:'New Manager Leadership Bootcamp', has_baseline:false, pre_score:null, post_score:null, days_since:null,
    applied_on_job_pct:null, correlation_note:null,
    flag_note:'No baseline established before launch -- post-training growth cannot be accurately measured.', impact_links:[] },
]

export default function EffectivenessOfTrainingPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = EFFECTIVENESS_DATA.filter(e=>!search||e.course.toLowerCase().includes(search.toLowerCase()))
  const missingBaselineCount = EFFECTIVENESS_DATA.filter(e=>!e.has_baseline).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📈" title="Effectiveness of Training"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'📈',label:'Courses Measured',  value:EFFECTIVENESS_DATA.filter(e=>e.has_baseline).length},
          {icon:'⚠',label:'Missing Baseline',     value:missingBaselineCount},
          {icon:'✅',label:'Strong Transfer',       value:EFFECTIVENESS_DATA.filter(e=>e.applied_on_job_pct>=60).length},
          {icon:'📊',label:'Model',                  value:'Kirkpatrick L3/L4'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>Transfer, Not Just Completion:</strong> Measures whether learning actually changed on-the-job behavior (Kirkpatrick Level 3) and business results (Level 4) -- cross-referenced against real Performance Appraisal data, not self-reported confidence. A course launched without a pre-training baseline cannot have its effectiveness honestly measured.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by course name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(e=>(
          <div key={e.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.course,...e}})}}
            style={{background:'#fff',border:`1px solid ${!e.has_baseline?'#fed7aa':'#e2e8f0'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${!e.has_baseline?'#f59e0b':e.applied_on_job_pct>=60?'#10b981':'#ef4444'}`}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9'}}>
              <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{e.course}</div>
            </div>
            {e.has_baseline?(<>
              <div style={{padding:'12px 18px',display:'flex',gap:20,alignItems:'center'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:'#94a3b8',marginBottom:3}}>Pre-Training Score</div>
                  <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${e.pre_score/5*100}%`,height:'100%',background:'#94a3b8',borderRadius:8}}/></div>
                </div>
                <span style={{fontSize:11,fontWeight:800,color:'#64748b'}}>{e.pre_score}/5</span>
              </div>
              <div style={{padding:'4px 18px 12px',display:'flex',gap:20,alignItems:'center'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:'#94a3b8',marginBottom:3}}>Post-Training Score ({e.days_since}d later)</div>
                  <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${e.post_score/5*100}%`,height:'100%',background:A,borderRadius:8}}/></div>
                </div>
                <span style={{fontSize:11,fontWeight:800,color:A}}>{e.post_score}/5</span>
              </div>
              <div style={{padding:'10px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f8fafc'}}>
                <span style={{fontSize:10,color:'#374151'}}>On-the-Job Application Rate</span>
                <span style={{fontSize:14,fontWeight:900,color:e.applied_on_job_pct>=60?'#10b981':'#ef4444'}}>{e.applied_on_job_pct}%</span>
              </div>
              <div style={{padding:'10px 18px',fontSize:10,color:'#374151'}}>{e.correlation_note}</div>
            </>):(
              <div style={{padding:'14px 18px',background:'#fff7ed',fontSize:10,color:'#92400e'}}><strong>⚠</strong> {e.flag_note}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Pre-training baselines auto-required before a course can launch with effectiveness tracking enabled.','On-job application rate computed by correlating course completion with subsequent Performance Appraisal goal closures.','Courses with low application rates auto-flag for content review or reinforcement coaching design.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Analysis',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

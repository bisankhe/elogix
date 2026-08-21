// FILE: ProductivityAnalyticsPage.jsx - Productivity Analytics
// (Performance & Talent > Goal & Performance > Performance Analytics)
// Collaboration heatmap, training-ROI bar chart, predictive completion
// curves. Outcome-over-output framing - privacy-conscious by design.
// Consumes v_employeewise_workload / v_departmentwise_workload.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#164e63 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const HEATMAP_DAYS = ['Mon','Tue','Wed','Thu','Fri']
const HEATMAP_DATA = {
  'Sales & Marketing':[8,9,7,8,5],'IT':[6,7,9,8,4],'Finance':[7,8,8,9,6],'Customer Service':[5,6,7,6,4],

const TRAINING_ROI = [
  {course:'Agile Project Management',pre_score:3.1,post_score:3.9,participants:8},
  {course:'Strategic Stakeholder Communication',pre_score:2.8,post_score:3.6,participants:5},
  {course:'Cloud Architecture Certification',pre_score:3.4,post_score:4.2,participants:6},
]

const PREDICTIVE_PROJECTS = [
  {project:'Q3 Platform Migration',confidence_pct:78,predicted_completion:'2025-08-15',status:'on_track'},
  {project:'Customer Portal Redesign',confidence_pct:45,predicted_completion:'2025-09-20',status:'at_risk',
   flag_note:'Velocity dropped 30% over last 2 sprints - recommend resourcing review.'},
]

function heatColor(val) {
  if (val>=8) return '#15803d'
  if (val>=6) return '#65a30d'
  if (val>=4) return '#eab308'
  return '#dc2626'

export default function ProductivityAnalyticsPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filteredDepts = Object.keys(HEATMAP_DATA).filter(d=>!search||d.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📈" title="Productivity Analytics"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Analytics"
        gradient={G}
        stats={[
          {icon:'📈',label:'Avg Output Score',  value:'7.1/10'},
          {icon:'🎓',label:'Training Programs',   value:TRAINING_ROI.length},
          {icon:'🔮',label:'Projects Tracked',     value:PREDICTIVE_PROJECTS.length},
          {icon:'⚠',label:'At Risk',               value:PREDICTIVE_PROJECTS.filter(p=>p.status==='at_risk').length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#155e75',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🛡</span>
        <div style={{flex:1,minWidth:200}}><strong>Outcome, Never Surveillance:</strong> These metrics measure team-level output and project velocity - never individual keystrokes, screen time, or activity monitoring. Aggregated at the department level specifically to avoid the "activity vs. output" trap and protect employee privacy.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by department name..."/>

      {/* Collaboration heatmap */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginTop:14,marginBottom:18,overflowX:'auto'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>🔥 Weekly Output Heatmap (Department-Level)</div>
        <div style={{display:'grid',gridTemplateColumns:`140px repeat(${HEATMAP_DAYS.length},48px)`,gap:4,minWidth:380}}>
          <div></div>
          {HEATMAP_DAYS.map(d=>(<div key={d} style={{textAlign:'center',fontSize:9,color:'#94a3b8',fontWeight:700}}>{d}</div>))}
          {filteredDepts.map(dept=>(
            <>
              <div key={dept} style={{fontSize:10,fontWeight:700,color:'#374151',display:'flex',alignItems:'center'}}>{dept}</div>
              {HEATMAP_DATA[dept].map((val,i)=>(
                <div key={i}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:`${dept} - ${HEATMAP_DAYS[i]}`,impact_links:['Workload Analysis']}})}}
                  style={{height:36,borderRadius:6,background:heatColor(val),display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff'}}>{val}</div>
              ))}
            </>
          ))}
        </div>
      </div>

      {/* Training ROI bar chart */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>🎓 Training Initiative ROI (Pre vs Post Performance Score)</div>
        {TRAINING_ROI.map((t,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:4}}>{t.course} <span style={{color:'#94a3b8',fontWeight:400}}>({t.participants} participants)</span></div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:8,color:'#94a3b8',width:30}}>Pre</span>
              <div style={{flex:1,height:10,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}><div style={{width:`${t.pre_score/5*100}%`,height:'100%',background:'#94a3b8'}}/></div>
              <span style={{fontSize:9,fontWeight:700,color:'#64748b',width:30}}>{t.pre_score}</span>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center',marginTop:3}}>
              <span style={{fontSize:8,color:A,width:30}}>Post</span>
              <div style={{flex:1,height:10,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}><div style={{width:`${t.post_score/5*100}%`,height:'100%',background:A}}/></div>
              <span style={{fontSize:9,fontWeight:700,color:A,width:30}}>{t.post_score}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Predictive completion indicators */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>🔮 Predictive Project Completion</div>
        {PREDICTIVE_PROJECTS.map((p,i)=>(
          <div key={i} style={{marginBottom:14,paddingBottom:12,borderBottom:i<PREDICTIVE_PROJECTS.length-1?'1px solid #f8fafc':'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{p.project}</span>
              <span style={{fontSize:10,fontWeight:800,color:p.confidence_pct>=70?'#10b981':'#f59e0b'}}>{p.confidence_pct}% confidence</span>
            </div>
            <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${p.confidence_pct}%`,height:'100%',background:p.confidence_pct>=70?'#10b981':'#f59e0b',borderRadius:7}}/></div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Predicted completion: {p.predicted_completion}</div>
            {p.flag_note&&<div style={{marginTop:6,background:'#fffbeb',borderRadius:8,padding:'6px 10px',fontSize:9,color:'#92400e'}}>⚠ {p.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Labor cost per productive unit calculated by cross-referencing Payroll with output data.','Training ROI auto-links to the Training Recommendation module for targeted upskilling.','Burnout risk cross-checked against Workload Analysis before flagging any productivity dip.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

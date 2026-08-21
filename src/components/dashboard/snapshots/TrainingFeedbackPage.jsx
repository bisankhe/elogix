// FILE: TrainingFeedbackPage.jsx - Training Feedback
// (Performance & Talent > Talent Development > Learning & Development)
// Kirkpatrick Level 1 pulse survey, auto-triggered 48h post-completion.
// Action-oriented questions ("how will you apply this"), not generic
// "smile sheet" instructor ratings. Negative feedback auto-escalates.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const FEEDBACK_RESPONSES = [
  { id:'f1', employee:'Sunil Magar', course:'AWS Solutions Architect', csat:5,
    application_answer:'I\'ll use the VPC peering setup to fix our staging environment access issue this week.',
    submitted_at:'2025-06-22', status:'positive', impact_links:['Course Management'] },
  { id:'f2', employee:'Bikash Rai', course:'CI/CD Pipeline Mastery', csat:2,
    submitted_at:'2025-06-21', status:'negative', flag_note:'Auto-escalated to L&D Lead: CSAT below 3 threshold.', impact_links:['Course Management'] },
]

const COURSE_SCORECARD = [
  {course:'AWS Solutions Architect',completion_rate:78,avg_csat:4.6,responses:34},
  {course:'CI/CD Pipeline Mastery',completion_rate:62,avg_csat:3.1,responses:11},
]

export default function TrainingFeedbackPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = FEEDBACK_RESPONSES.filter(f=>!search||f.employee.toLowerCase().includes(search.toLowerCase()))
  const negativeCount = FEEDBACK_RESPONSES.filter(f=>f.status==='negative').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💬" title="Training Feedback"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'💬',label:'Responses This Month', value:FEEDBACK_RESPONSES.length},
          {icon:'⭐',label:'Avg CSAT',                value:'3.85/5'},
          {icon:'⚠',label:'Auto-Escalated',           value:negativeCount},
          {icon:'⏱',label:'Sent',                       value:'48h post-completion'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Beyond the "Smile Sheet":</strong> Pulse surveys ask "How will you apply this to your current work?" -- not just "Did you like the trainer?" This is Kirkpatrick Level 1, auto-triggered 48 hours post-completion while the experience is still fresh. Negative feedback (CSAT &lt; 3) routes directly to the L&D Lead.</div>
      </div>

      {/* Course scorecard */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📊 Course Scorecard</div>
        {COURSE_SCORECARD.map((c,i)=>(
          <div key={i} style={{padding:'8px 0',borderBottom:i<COURSE_SCORECARD.length-1?'1px solid #f8fafc':'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{c.course}</span>
              <span style={{fontSize:10,color:c.avg_csat>=4?'#10b981':'#f59e0b',fontWeight:700}}>⭐ {c.avg_csat}/5 ({c.responses} responses)</span>
            </div>
            <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}><div style={{width:`${c.completion_rate}%`,height:'100%',background:A,borderRadius:6}}/></div>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(f=>(
          <div key={f.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.employee,...f}})}}
            style={{background:'#fff',border:`1.5px solid ${f.status==='negative'?'#fecaca':'#e2e8f0'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${f.status==='negative'?'#ef4444':'#10b981'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{f.employee}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{f.course}</div>
              </div>
              <div style={{fontSize:16}}>{'⭐'.repeat(f.csat)}{'☆'.repeat(5-f.csat)}</div>
            </div>
            <div style={{padding:'10px 18px',fontSize:10,color:'#374151'}}><strong>How will you apply this?</strong> "{f.application_answer}"</div>
            {f.flag_note&&<div style={{padding:'10px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠</strong> {f.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Survey auto-triggers 48 hours post-completion -- close enough to recall accurately, far enough to reflect real application.','CSAT below 3 auto-routes to the L&D Lead for course content review.','Level 3 (Behavior) follow-up auto-schedules at 90 days, correlating against Performance Appraisal data.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Response',key:'view'},{icon:'📧',label:'Notify L&D Lead',key:'notify'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

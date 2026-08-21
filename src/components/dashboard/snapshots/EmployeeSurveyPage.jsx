// FILE: EmployeeSurveyPage.jsx - Employee Survey
// (Employee Experience & Culture > Employee Engagement)
// Pulse vs annual surveys, under-3-minutes design, slider/rating-scale
// UI, anonymity toggle. AI sentiment analysis on open-ended text.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const PENDING_SURVEYS = [
  { id:'s1', title:'How connected do you feel to your team?', type:'pulse', est_minutes:2, deadline:'2025-06-28' },
  { id:'s2', title:'Annual Engagement & Culture Survey 2025', type:'annual', est_minutes:12, deadline:'2025-07-15' },
]

const RESULTS_SUMMARY = [
  { survey:'Q2 Pulse: Team Connection', avg_score:7.8, response_rate:78, sentiment:'positive' },
  { survey:'Q1 Pulse: Workload Balance', avg_score:5.9, response_rate:71, sentiment:'mixed',
    flag_note:'Sentiment analysis flagged repeated mentions of "burnout" -- escalated to department heads.' },
]

export default function EmployeeSurveyPage() {
  const [search, setSearch] = useState('')
  const [activeSurvey, setActiveSurvey] = useState(null)
  const [rating, setRating] = useState(5)
  const [anonymous, setAnonymous] = useState(true)
  const [ctx, setCtx] = useState(null)

  const filtered = RESULTS_SUMMARY.filter(r=>!search||r.survey.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Employee Survey"
        breadcrumb="Employee Experience & Culture > Employee Engagement"
        gradient={G}
        stats={[
          {icon:'📊',label:'Pending Surveys',  value:PENDING_SURVEYS.length},
          {icon:'✅',label:'Avg Response Rate',  value:'75%'},
          {icon:'⏱',label:'Avg Completion Time',  value:'2.4 min'},
          {icon:'💚',label:'Avg Sentiment',          value:'Positive'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⏱</span>
        <div style={{flex:1,minWidth:200}}><strong>Pulse Over Annual:</strong> Short, frequent checks beat heavy yearly reviews -- designed to complete in under 3 minutes. Anonymous by default unless you choose to share your name.</div>
      </div>

      {/* Pending surveys banner */}
      <div style={{display:'grid',gap:12,marginBottom:18}}>
        {PENDING_SURVEYS.map(s=>(
          <div key={s.id} style={{background:'#fff',border:`1.5px solid ${A}33`,borderRadius:14,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{s.title}</div>
              <div style={{fontSize:9,color:'#94a3b8'}}>{s.type==='pulse'?'Pulse Survey':'Annual Survey'} . ~{s.est_minutes} min . Due {s.deadline}</div>
            </div>
            <button onClick={()=>{setActiveSurvey(s);setRating(5)}} style={{padding:'8px 18px',borderRadius:10,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Start Survey</button>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search past survey results..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map((r,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.survey,...r,impact_links:['Engagement Dashboard']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{r.survey}</span>
              <span style={{fontSize:14,fontWeight:900,color:A}}>{r.avg_score}/10</span>
            </div>
            <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden',marginBottom:8}}><div style={{width:`${r.response_rate}%`,height:'100%',background:A,borderRadius:7}}/></div>
            <div style={{fontSize:9,color:'#94a3b8'}}>{r.response_rate}% response rate . Sentiment: {r.sentiment}</div>
            {r.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {r.flag_note}</div>}
          </div>
        ))}
      </div>

      {activeSurvey&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setActiveSurvey(null)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>{activeSurvey.title}</div></div>
            <div style={{padding:'22px 24px'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:10}}>Rate from 1 (low) to 10 (high)</div>
              <input type="range" min="1" max="10" value={rating} onChange={e=>setRating(e.target.value)} style={{width:'100%',accentColor:A}}/>
              <div style={{textAlign:'center',fontSize:22,fontWeight:900,color:A,margin:'8px 0'}}>{rating}</div>
              <textarea placeholder="Anything you'd like to add? (optional, voice input supported)" style={{width:'100%',minHeight:70,borderRadius:10,border:'1px solid #e2e8f0',padding:10,fontSize:11,resize:'vertical'}}/>
              <label style={{display:'flex',gap:8,alignItems:'center',marginTop:12,fontSize:10,color:'#374151'}}>
                <input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)} style={{accentColor:A}}/>
                Submit anonymously
              </label>
              <button onClick={()=>setActiveSurvey(null)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',marginTop:14}}>Submit</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI sentiment analysis scans open-text responses for burnout, disengagement, or safety signals -- auto-escalating when needed.','Results roll up into the Engagement Dashboard the moment a survey closes.','Survey fatigue auto-monitored -- frequency throttles if response rates start dropping.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Results',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

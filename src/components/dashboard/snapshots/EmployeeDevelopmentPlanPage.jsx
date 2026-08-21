// FILE: EmployeeDevelopmentPlanPage.jsx - Employee Development Plan (EDP)
// (Performance & Talent > Talent Development > Career Development)
// Living document, not an annual checkbox. Modular grid: milestones,
// continuous check-in log (reuses continuous_feedback_entries), short/
// long-term goal split, peer recognition board.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const MY_EDP = {
  employee:'Hari Thapa', last_updated:'2025-06-20',
  short_term_goals:[
    {goal:'Complete AWS Solutions Architect course',progress_pct:65,target_date:'2025-08-15'},
    {goal:'Shadow 2 client architecture reviews',progress_pct:30,target_date:'2025-07-30'},
  ],
  long_term_goals:[
    {goal:'Reach Senior Software Engineer within 18 months',progress_pct:42,target_date:'2027-01-01'},
  ],
  checkins:[
    {date:'2025-06-18',by:'Manager',note:'Good progress on AWS course. Discussed pairing with Sunil on the next architecture review.'},
    {date:'2025-06-05',by:'Self',note:'Feeling behind on the client-shadowing goal due to sprint workload -- need to reprioritize.'},
  ],

export default function EmployeeDevelopmentPlanPage() {
  const [search, setSearch] = useState('')
  const [showCheckin, setShowCheckin] = useState(false)
  const [ctx, setCtx] = useState(null)

  const overallProgress = Math.round([...MY_EDP.short_term_goals,...MY_EDP.long_term_goals].reduce((s,g)=>s+g.progress_pct,0)/(MY_EDP.short_term_goals.length+MY_EDP.long_term_goals.length))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📘" title="Employee Development Plan"
        breadcrumb="Performance & Talent Management > Talent Development > Career Development"
        gradient={G}
        stats={[
          {icon:'📘',label:'Overall Progress',  value:overallProgress+'%'},
          {icon:'🎯',label:'Active Goals',         value:MY_EDP.short_term_goals.length+MY_EDP.long_term_goals.length},
          {icon:'💬',label:'Check-Ins Logged',       value:MY_EDP.checkins.length},
          {icon:'📅',label:'Last Updated',             value:MY_EDP.last_updated},
        ]}
        onAdd={()=>setShowCheckin(true)} addLabel="Log Check-In"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔄</span>
        <div style={{flex:1,minWidth:200}}><strong>A Living Document, Not an Annual Checkbox:</strong> Employee and manager collaborate on the same screen year-round. Continuous check-ins replace the once-a-year surprise review -- goals can be revised any time work realities shift.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:18}}>
        {/* Short-term goals */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>⚡ Short-Term Goals</div>
          {MY_EDP.short_term_goals.map((g,i)=>(
            <div key={i} style={{marginBottom:14}}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:g.goal,impact_links:['Training Portfolio']}})}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
                <span style={{color:'#374151',fontWeight:600}}>{g.goal}</span><span style={{fontWeight:700,color:A}}>{g.progress_pct}%</span>
              </div>
              <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${g.progress_pct}%`,height:'100%',background:A,borderRadius:7}}/></div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:3}}>Target: {g.target_date}</div>
            </div>
          ))}
        </div>

        {/* Long-term goals */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🌅 Long-Term Goals</div>
          {MY_EDP.long_term_goals.map((g,i)=>(
            <div key={i} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
                <span style={{color:'#374151',fontWeight:600}}>{g.goal}</span><span style={{fontWeight:700,color:'#7c3aed'}}>{g.progress_pct}%</span>
              </div>
              <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${g.progress_pct}%`,height:'100%',background:'#7c3aed',borderRadius:7}}/></div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:3}}>Target: {g.target_date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Continuous check-in log */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>💬 Continuous Check-In Log</div>
        {MY_EDP.checkins.map((c,i)=>(
          <div key={i} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:i<MY_EDP.checkins.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{background:c.by==='Manager'?'#eff6ff':'#f0fdf4',color:c.by==='Manager'?'#1e40af':'#15803d',fontSize:8,fontWeight:700,padding:'3px 9px',borderRadius:20,flexShrink:0,alignSelf:'flex-start'}}>{c.by}</span>
            <div>
              <div style={{fontSize:10,color:'#374151'}}>{c.note}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:3}}>{c.date}</div>
            </div>
          </div>
        ))}
      </div>

      {showCheckin&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCheckin(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Log Check-In</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Note" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowCheckin(false)} style={{flex:1,padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save Check-In</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI suggests stretch assignments and mentorship pairings that close the exact gaps blocking your long-term goal.','Automated reminders nudge both employee and manager if a goal hasn\'t moved in 30 days.','Plan stays linked to Career Pathing -- progress here directly raises your skill-match % on target roles.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

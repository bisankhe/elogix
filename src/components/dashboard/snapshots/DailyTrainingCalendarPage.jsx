// FILE: DailyTrainingCalendarPage.jsx - Daily Training Calendar
// (Performance & Talent > Talent Development > Learning & Development)
// Mobile-first "Today's Agenda": hourly intervals, daily progress bar,
// floating action button for quiz/AI Coach/flashcards.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#164e63 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const TODAY_AGENDA = [
  {time:'9:00 AM',title:'Daily Standup + Quick Quiz: SSF Basics',type:'quiz',duration:'10 min',completed:true},
  {time:'11:30 AM',title:'Microlearning: Constructive Feedback',type:'micro',duration:'5 min',completed:true},
  {time:'2:00 PM',title:'Live Session: Cloud Architecture Module 3',type:'live',duration:'2 hrs',completed:false},
  {time:'4:30 PM',title:'Flashcard Review: Compliance Terms',type:'flashcard',duration:'15 min',completed:false},
]

const TYPE_CFG = {
  quiz:{c:'#7c3aed',icon:'❓'},micro:{c:'#10b981',icon:'⚡'},live:{c:'#0284c7',icon:'🎥'},flashcard:{c:'#f59e0b',icon:'🗂'},
}

export default function DailyTrainingCalendarPage() {
  const [showFAB, setShowFAB] = useState(false)
  const [ctx, setCtx] = useState(null)

  const completedCount = TODAY_AGENDA.filter(a=>a.completed).length
  const progressPct = Math.round(completedCount/TODAY_AGENDA.length*100)

  return (
    <div onClick={()=>{setCtx(null);setShowFAB(false)}} style={{position:'relative',minHeight:'80vh'}}>
      <PageHeader icon="☀" title="Daily Training Calendar"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'☀',label:"Today's Sessions", value:TODAY_AGENDA.length},
          {icon:'✅',label:'Completed',          value:completedCount},
          {icon:'📊',label:'Daily Progress',      value:progressPct+'%'},
          {icon:'⚡',label:'Microlearning Time',  value:'20 min'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      {/* Daily progress banner */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px',marginBottom:18}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12}}>
          <span style={{fontWeight:800,color:'#0f172a'}}>🎯 Daily Goal Progress</span>
          <span style={{fontWeight:800,color:progressPct===100?'#10b981':A}}>{progressPct===100?'✅ Daily Goal Completed!':`${completedCount}/${TODAY_AGENDA.length} done`}</span>
        </div>
        <div style={{height:12,background:'#f1f5f9',borderRadius:12,overflow:'hidden'}}>
          <div style={{width:`${progressPct}%`,height:'100%',background:progressPct===100?'#10b981':A,borderRadius:12}}/>
        </div>
      </div>

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#155e75',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📱</span>
        <div style={{flex:1,minWidth:200}}><strong>Bite-Sized, Mobile-First:</strong> Clean, focused list of today's microlearning, live sessions, and quick quizzes - no clutter. Designed to fit naturally between work tasks, not compete with them.</div>
      </div>

      {/* Agenda list */}
      <div style={{display:'grid',gap:12}}>
        {TODAY_AGENDA.map((a,i)=>{
          const tc = TYPE_CFG[a.type]
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.title,impact_links:['Course Management']}})}}
              style={{background:'#fff',border:`1px solid ${a.completed?'#bbf7d0':'#e2e8f0'}`,borderRadius:14,padding:'14px 18px',display:'flex',gap:14,alignItems:'center'}}>
              <div style={{textAlign:'center',flexShrink:0,width:64}}>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{a.time}</div>
              </div>
              <span style={{fontSize:20,flexShrink:0}}>{tc.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:700,color:a.completed?'#94a3b8':'#0f172a',textDecoration:a.completed?'line-through':'none'}}>{a.title}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{a.duration}</div>
              </div>
              {a.completed?<span style={{fontSize:16,flexShrink:0}}>✅</span>:<button style={{padding:'6px 14px',borderRadius:8,border:'none',background:tc.c,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer',flexShrink:0}}>{a.type==='live'?'Join':'Start'}</button>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI Coach adapts tomorrow\'s microlearning difficulty based on today\'s quiz performance.','Daily completion streaks tracked for self-service gamified motivation.','Manager sees team-wide daily completion rates - never individual session timestamps.']}/>
      </div>

      {/* Floating action button */}
      <div style={{position:'fixed',bottom:28,right:28,zIndex:4000}} onClick={ev=>ev.stopPropagation()}>
        {showFAB&&(
          <div style={{position:'absolute',bottom:64,right:0,display:'flex',flexDirection:'column',gap:8,marginBottom:8}}>
            {[{icon:'❓',label:'Daily Quiz'},{icon:'🤖',label:'AI Coach'},{icon:'🗂',label:'Flashcards'}].map((b,i)=>(
              <button key={i} style={{display:'flex',gap:8,alignItems:'center',padding:'10px 16px',borderRadius:24,border:'none',background:'#fff',boxShadow:'0 4px 12px rgba(0,0,0,.15)',color:'#0f172a',fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                <span>{b.icon}</span>{b.label}
              </button>
            ))}
          </div>
        )}
        <button onClick={()=>setShowFAB(!showFAB)} style={{width:56,height:56,borderRadius:'50%',border:'none',background:G,color:'#fff',fontSize:24,boxShadow:'0 4px 16px rgba(0,0,0,.2)',cursor:'pointer'}}>{showFAB?'×':'+'}</button>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

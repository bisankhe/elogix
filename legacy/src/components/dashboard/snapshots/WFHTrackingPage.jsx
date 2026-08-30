// FILE: WFHTrackingPage.jsx - Work From Home Tracking (Daily Attendance)
// Outcome-first dashboard: OKR/task completion over surveillance, passive
// login/logout time-tracking (not keystroke/mouse logging), team timezone
// overlay, core-collaboration-hours window, burnout/well-being pulse,
// transparent consent banner on what's actually measured.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#164e63 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const TEAM = [
  { id:'w1', employee:'Maya Pradhan', dept:'Finance', status:'focusing', login:'09:05 AM', logout:null,
    tasks_completed:4, tasks_total:6, okr_progress:78, last_active:'2 min ago',
    burnout_risk:'low', core_hours_compliant:true, weekly_wfh_days:3,
    impact_links:['Employee Movement','Leave Balance'] },
  { id:'w2', employee:'Sanjay Karki', dept:'Finance', status:'in_meeting', login:'08:50 AM', logout:null,
    tasks_completed:7, tasks_total:8, okr_progress:92, last_active:'now',
    burnout_risk:'low', core_hours_compliant:true, weekly_wfh_days:2,
    impact_links:[] },
  { id:'w3', employee:'Bikash Rai', dept:'IT', status:'away', login:'09:30 AM', logout:null,
    tasks_completed:1, tasks_total:5, okr_progress:35, last_active:'1h 40min ago',
    burnout_risk:'medium', core_hours_compliant:true, weekly_wfh_days:5,
    impact_links:['Performance Review'] },
  { id:'w4', employee:'Anjali Sharma', dept:'Sales', status:'focusing', login:'07:15 AM', logout:null,
    tasks_completed:5, tasks_total:5, okr_progress:100, last_active:'5 min ago',
    burnout_risk:'high', core_hours_compliant:false, weekly_wfh_days:5,
    note:'Logged in before 7 AM three days this week - flagged for always-on/burnout risk, not productivity concern.',
    impact_links:['Wellbeing Program'] },
]

const STATUS_CFG = {
  focusing:{c:'#10b981',bg:'#f0fdf4',icon:'🎯',label:'Focusing'},
  in_meeting:{c:'#3b82f6',bg:'#eff6ff',icon:'👥',label:'In a Meeting'},
  away:{c:'#94a3b8',bg:'#f8fafc',icon:'☕',label:'Away'},
  offline:{c:'#ef4444',bg:'#fef2f2',icon:'⚪',label:'Offline'},
}
const BURNOUT_CFG = {low:{c:'#10b981',label:'Low Risk'},medium:{c:'#f59e0b',label:'Watch'},high:{c:'#ef4444',label:'Burnout Risk'}}

const CORE_HOURS = {start:'1:00 PM',end:'4:00 PM',label:'Kathmandu Core Collaboration Window'}

export default function WFHTrackingPage() {
  const [team, setTeam] = useState(TEAM)
  const [search, setSearch] = useState('')
  const [showLogModal, setShowLogModal] = useState(false)
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = team.filter(t=>!search||t.employee.toLowerCase().includes(search.toLowerCase()))
  const avgOKR = Math.round(team.reduce((s,t)=>s+t.okr_progress,0)/team.length)
  const burnoutRiskCount = team.filter(t=>t.burnout_risk==='high').length
  const activeNow = team.filter(t=>t.status!=='offline').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏠" title="Work From Home Tracking"
        breadcrumb="Workforce Operations > Attendance Management > Daily Attendance"
        gradient={G}
        stats={[
          {icon:'🏠',label:'WFH Today',        value:team.length},
          {icon:'🟢',label:'Active Now',        value:activeNow},
          {icon:'🎯',label:'Avg OKR Progress',  value:avgOKR+'%'},
          {icon:'⚠',label:'Burnout Risk',      value:burnoutRiskCount},
        ]}
        onAdd={()=>setShowLogModal(true)} addLabel="Log Today's WFH"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:10,fontSize:11,color:'#155e75',display:'flex',gap:10,alignItems:'flex-start'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1}}>
          <strong>Outcome Over Surveillance - What We Track:</strong> Passive login/logout timestamps, task and OKR completion, and core-hours availability. <strong>What we never track:</strong> keystrokes, mouse movement, screenshots, or webcam. This is fully disclosed in your employment contract per Nepal Labour Act 2074 Section 28.
          <button onClick={()=>setShowPrivacyInfo(true)} style={{marginLeft:8,color:A,fontWeight:700,background:'none',border:'none',cursor:'pointer',textDecoration:'underline',fontSize:11}}>View full data policy</button>
        </div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#0f172a',display:'flex',gap:10,alignItems:'center'}}>
        <span style={{fontSize:18}}>🕐</span>
        <div><strong>{CORE_HOURS.label}:</strong> {CORE_HOURS.start} - {CORE_HOURS.end} - synchronous meetings expected; outside this window, async/focus work is the default. No after-hours messaging expected.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(t=>{
          const sc = STATUS_CFG[t.status]
          const bc = BURNOUT_CFG[t.burnout_risk]
          return (
            <div key={t.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.employee,...t}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{padding:'16px 16px 10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{t.employee}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{t.dept} . WFH {t.weekly_wfh_days}d/week</div>
                  </div>
                  <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,flexShrink:0}}>{sc.icon} {sc.label}</span>
                </div>

                <div style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:9}}>
                    <span style={{color:'#64748b'}}>OKR / Task Progress</span><span style={{fontWeight:700,color:A}}>{t.okr_progress}%</span>
                  </div>
                  <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}>
                    <div style={{width:`${t.okr_progress}%`,height:'100%',background:t.okr_progress>=70?'#10b981':t.okr_progress>=40?'#f59e0b':'#ef4444',borderRadius:7}}/>
                  </div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:3}}>{t.tasks_completed}/{t.tasks_total} tasks completed today</div>
                </div>

                <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>
                  <span style={{background:`${bc.c}15`,color:bc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{bc.label}</span>
                  {!t.core_hours_compliant&&<span style={{background:'#fffbeb',color:'#b45309',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⏰ Off-Hours Activity</span>}
                </div>

                {t.note&&<div style={{background:'#fef2f2',borderRadius:8,padding:'6px 10px',fontSize:9,color:'#991b1b',marginBottom:8}}>{t.note}</div>}

                <div style={{fontSize:9,color:'#94a3b8'}}>Logged in {t.login} . Last active {t.last_active}</div>
              </div>
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>View Tasks</button>
                <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>💬 Message</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Log WFH modal */}
      {showLogModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowLogModal(false)}>
          <div style={{background:'#fff',borderRadius:20,width:560,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Log Today's WFH Status</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Date" type="date" value="2025-06-21" onChange={()=>{}} accent={A}/>
                <Field label="Status" type="select" value="" onChange={()=>{}} accent={A} options={['Focusing','In a Meeting','Away','Offline']}/>
              </div>
              <Field label="Today's Planned Tasks (one per line)" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['Login/logout time auto-captured passively - no manual punch needed.','Task completion auto-syncs from connected project tools (Jira/Asana/Trello).','AI monitors for after-hours patterns to flag burnout risk, never to penalize output.','Core collaboration hours (1-4 PM) auto-highlighted on your calendar.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowLogModal(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Save</button>
                <button onClick={()=>setShowLogModal(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy/data policy modal */}
      {showPrivacyInfo&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowPrivacyInfo(false)}>
          <div style={{background:'#fff',borderRadius:20,width:520,maxHeight:'85vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:16,fontWeight:900,color:'#fff'}}>WFH Data Collection Policy</div></div>
            <div style={{padding:'22px 28px',fontSize:11,color:'#374151',lineHeight:1.7}}>
              <div style={{fontWeight:800,color:'#10b981',marginBottom:6}}>✓ What we collect</div>
              <ul style={{paddingLeft:18,marginBottom:14}}>
                <li>Login/logout timestamps (passive, system-level)</li>
                <li>Task and OKR completion status from your project tools</li>
                <li>Availability status you set yourself (Focusing/Meeting/Away)</li>
                <li>Aggregate, anonymized core-hours compliance trends</li>
              </ul>
              <div style={{fontWeight:800,color:'#ef4444',marginBottom:6}}>✗ What we never collect</div>
              <ul style={{paddingLeft:18,marginBottom:14}}>
                <li>Keystrokes or mouse movement</li>
                <li>Screenshots or screen recordings</li>
                <li>Webcam or microphone access</li>
                <li>Activity outside your stated working hours</li>
              </ul>
              <div style={{background:'#ecfeff',borderRadius:10,padding:'10px 14px',fontSize:10,color:'#155e75'}}>
                This complies with Nepal Labour Act 2074 Section 28 (attendance record-keeping) while respecting your right to off-hours rest and privacy. Full policy is part of your employment contract.
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Task Log',key:'view'},{icon:'💬',label:'Send Message',key:'message'},
        {icon:'🌱',label:'Wellbeing Check-in',key:'wellbeing'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="WFH Tracking" columns={['Employee','Department','Status','Login Time','Tasks Completed','Tasks Total','OKR Progress %','Burnout Risk','Weekly WFH Days']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

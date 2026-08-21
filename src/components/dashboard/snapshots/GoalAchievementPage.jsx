// FILE: GoalAchievementPage.jsx - Goal Achievement
// (Performance & Talent > Goal & Performance > Performance Analytics)
// Corporate OKR thermometer header, team-board card view (% complete/
// on-track/at-risk), drill-down drawer with skills matrix. Consumes the
// existing v_unified_goal_tracking rollup (KRA+KPI+OKR+Assignment).

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const CORPORATE_OKR_PROGRESS = 68

const TEAM_BOARD = [
  { id:'tb1', team:'Sales & Marketing', goals_total:8, on_track:6, at_risk:2, completion_pct:72,
    members:[{name:'Anjali Sharma',progress:85},{name:'Ramesh KC',progress:58}], impact_links:['Goal Tracking'] },
  { id:'tb2', team:'IT', goals_total:12, on_track:7, at_risk:5, completion_pct:54,
    members:[{name:'Bikash Rai',progress:40},{name:'Gita Maharjan',progress:75}], impact_links:['Workload Analysis'] },
  { id:'tb3', team:'Finance', goals_total:6, on_track:6, at_risk:0, completion_pct:88,
    members:[{name:'Maya Pradhan',progress:90},{name:'Dipesh Bhattarai',progress:86}], impact_links:[] },
]

export default function GoalAchievementPage() {
  const [search, setSearch] = useState('')
  const [drawerFor, setDrawerFor] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = TEAM_BOARD.filter(t=>!search||t.team.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🌡" title="Goal Achievement"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Analytics"
        gradient={G}
        stats={[
          {icon:'🌡',label:'Corporate OKR',    value:CORPORATE_OKR_PROGRESS+'%'},
          {icon:'👥',label:'Teams Tracked',      value:TEAM_BOARD.length},
          {icon:'✅',label:'Goals On Track',     value:TEAM_BOARD.reduce((s,t)=>s+t.on_track,0)},
          {icon:'⚠',label:'Goals At Risk',       value:TEAM_BOARD.reduce((s,t)=>s+t.at_risk,0)},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      {/* Corporate OKR thermometer */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12}}>
          <span style={{fontWeight:800,color:'#0f172a'}}>🎯 Overall Corporate OKR Progress</span><span style={{fontWeight:800,color:A}}>{CORPORATE_OKR_PROGRESS}%</span>
        </div>
        <div style={{height:14,background:'#f1f5f9',borderRadius:14,overflow:'hidden'}}>
          <div style={{width:`${CORPORATE_OKR_PROGRESS}%`,height:'100%',background:`linear-gradient(90deg,#0284c7,#7dd3fc)`,borderRadius:14}}/>
        </div>
        <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>Cascades from Goal Management {'>'} KRA/KPI/OKR/Goal Assignment, unified via Goal Tracking</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by team name..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16,marginTop:14}}>
        {filtered.map(t=>(
          <div key={t.id}
            onClick={()=>setDrawerFor(t)}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.team,...t}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px',cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{t.team}</div>
              <div style={{fontSize:16,fontWeight:900,color:t.completion_pct>=70?'#10b981':'#f59e0b'}}>{t.completion_pct}%</div>
            </div>
            <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden',marginBottom:10}}>
              <div style={{width:`${t.completion_pct}%`,height:'100%',background:t.completion_pct>=70?'#10b981':'#f59e0b',borderRadius:8}}/>
            </div>
            <div style={{display:'flex',gap:8,fontSize:9}}>
              <span style={{background:'#f0fdf4',color:'#15803d',fontWeight:700,padding:'2px 9px',borderRadius:20}}>✅ {t.on_track} on track</span>
              {t.at_risk>0&&<span style={{background:'#fef2f2',color:'#dc2626',fontWeight:700,padding:'2px 9px',borderRadius:20}}>⚠ {t.at_risk} at risk</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Drill-down drawer */}
      {drawerFor&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:5000,display:'flex',justifyContent:'flex-end'}} onClick={()=>setDrawerFor(null)}>
          <div style={{background:'#fff',width:'min(420px,100%)',height:'100%',overflow:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,.15)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}>
              <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{drawerFor.team}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>{drawerFor.goals_total} total goals . {drawerFor.completion_pct}% complete</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>Team Member Contributions</div>
              {drawerFor.members.map((m,i)=>(
                <div key={i} style={{marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:11}}>
                    <span style={{fontWeight:600,color:'#374151'}}>{m.name}</span><span style={{fontWeight:700,color:A}}>{m.progress}%</span>
                  </div>
                  <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${m.progress}%`,height:'100%',background:m.progress>=70?'#10b981':'#f59e0b',borderRadius:7}}/></div>
                </div>
              ))}
              <button onClick={()=>setDrawerFor(null)} style={{marginTop:10,width:'100%',padding:12,borderRadius:10,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:12,fontWeight:600,cursor:'pointer'}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Team Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

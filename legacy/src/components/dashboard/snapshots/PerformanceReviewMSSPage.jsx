// FILE: PerformanceReviewMSSPage.jsx - Performance Review (MSS)
// (HR Services & Support > Manager Self Service)
// Manager-facing wizard: Self-Evaluation -> Manager Assessment -> HR
// Review state machine, 360 radar chart. Distinct from the EXISTING
// PerformanceReviewPage (the collaborative whole-cycle discussion
// view) -- this is the manager's review QUEUE across their whole team.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const STAGES = ['Self-Evaluation','Manager Assessment','HR Review']

const TEAM_REVIEWS = [
  { id:'r1', employee:'Hari Thapa', stage_idx:1, self_eval_score:7.5, three_sixty:{communication:8,leadership:6,delivery:9,collaboration:7}, due:'2025-06-28' },
  { id:'r2', employee:'Bikash Rai', stage_idx:0, self_eval_score:null, due:'2025-07-02' },
  { id:'r3', employee:'Sunil Magar', stage_idx:1, self_eval_score:8.2, three_sixty:{communication:7,leadership:9,delivery:8,collaboration:8}, due:'2025-06-24',
    flag_note:'4 days overdue -- complete your assessment to avoid delaying the cycle.' },
]

export default function PerformanceReviewMSSPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = TEAM_REVIEWS.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const overdueCount = TEAM_REVIEWS.filter(r=>r.flag_note).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📝" title="Performance Review"
        breadcrumb="HR Services & Support > Manager Self Service"
        gradient={G}
        stats={[
          {icon:'📝',label:'Team Reviews',  value:TEAM_REVIEWS.length},
          {icon:'⚠',label:'Overdue',           value:overdueCount},
          {icon:'⏳',label:'Awaiting Your Assessment', value:TEAM_REVIEWS.filter(r=>r.stage_idx===1).length},
          {icon:'✅',label:'Cycle Completion',              value:Math.round(TEAM_REVIEWS.filter(r=>r.stage_idx>=1).length/TEAM_REVIEWS.length*100)+'%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>A Conversation, Not a Checkbox:</strong> Step through Self-Evaluation {'>'} Manager Assessment {'>'} HR Review with full 360 context -- never a rushed, generic comment.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search team reviews..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>(
          <div key={r.id} onClick={()=>setSelected(r)}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r,impact_links:['Performance Review']}})}}
            style={{background:'#fff',border:`1px solid ${r.flag_note?'#fecaca':'#e2e8f0'}`,borderRadius:16,padding:'16px 18px',cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{r.employee}</div>
              <span style={{fontSize:9,color:'#94a3b8'}}>Due {r.due}</span>
            </div>
            <div style={{display:'flex',gap:4}}>
              {STAGES.map((s,i)=>(
                <div key={s} style={{flex:1,textAlign:'center'}}>
                  <div style={{height:6,borderRadius:6,background:i<=r.stage_idx?A:'#f1f5f9'}}/>
                  <div style={{fontSize:7,color:i<=r.stage_idx?A:'#94a3b8',fontWeight:i===r.stage_idx?700:400,marginTop:4}}>{s}</div>
                </div>
              ))}
            </div>
            {r.flag_note&&<div style={{marginTop:10,fontSize:9,color:'#dc2626'}}>⚠ {r.flag_note}</div>}
          </div>
        ))}
      </div>

      {selected&&selected.three_sixty&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:5000,display:'flex',justifyContent:'flex-end'}} onClick={()=>setSelected(null)}>
          <div style={{background:'#fff',width:'min(440px,100%)',height:'100%',overflow:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,.15)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}>
              <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{selected.employee}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>Self-eval score: {selected.self_eval_score}/10</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>360 Feedback Summary</div>
              {Object.entries(selected.three_sixty).map(([k,v])=>(
                <div key={k} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                    <span style={{color:'#374151',textTransform:'capitalize'}}>{k}</span><span style={{fontWeight:700,color:A}}>{v}/10</span>
                  </div>
                  <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${v*10}%`,height:'100%',background:A,borderRadius:7}}/></div>
                </div>
              ))}
              <textarea placeholder="Your manager assessment notes..." style={{width:'100%',minHeight:80,borderRadius:10,border:'1px solid #e2e8f0',padding:10,fontSize:10,marginTop:10}}/>
              <button style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',marginTop:12}}>Submit Manager Assessment {'>'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags uncalibrated language (vague praise, no specific examples) before you submit.','360 scores pull live from the existing feedback cycle -- never a separate, re-entered number.','Reviews overdue 3+ days escalate visibly here and to HR, never silently slipping past the cycle.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Cycle',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

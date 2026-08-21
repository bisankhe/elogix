// FILE: CareerPathingPage.jsx - Career Pathing
// (Performance & Talent > Talent Development > Career Development)
// Interactive node-based Career Journey Map: current role -> adjacent/
// target roles, skill-gap indicator (reuses employee_skill_levels),
// pay-band preview (reuses salary_range_bands), suggested mentors.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const CURRENT_ROLE = { title:'Software Engineer II', dept:'IT', level:'L4' }

const TARGET_ROLES = [
  { id:'t1', title:'Senior Software Engineer', type:'vertical', skill_match_pct:78, pay_band:'L5: NPR 95K-125K',
    required_skills:[{skill:'Cloud Architecture',gap:4},{skill:'System Design',gap:2},{skill:'Mentoring',gap:1}],
    mentors:['Sunil Magar (Cloud Architect)'], impact_links:['Skill Gap Matrix','Salary Structure'] },
  { id:'t2', title:'Engineering Manager', type:'vertical', skill_match_pct:52, pay_band:'L5: NPR 100K-135K',
    required_skills:[{skill:'Leadership',gap:5},{skill:'Budget Planning',gap:6},{skill:'Conflict Resolution',gap:4}],
    mentors:['Dipesh Bhattarai (Engineering Director)'], impact_links:['Leadership Development'] },
  { id:'t3', title:'Solutions Architect', type:'lateral', skill_match_pct:64, pay_band:'L4: NPR 85K-110K',
    required_skills:[{skill:'Cloud Architecture',gap:4},{skill:'Client Communication',gap:3}],
    mentors:['Sunil Magar (Cloud Architect)'], impact_links:[] },
]

const TYPE_CFG = {vertical:{c:'#7c3aed',icon:'⬆',label:'Promotion Path'},lateral:{c:'#0284c7',icon:'↔',label:'Lateral Move'}}

export default function CareerPathingPage() {
  const [selectedRole, setSelectedRole] = useState(null)
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗺" title="Career Pathing"
        breadcrumb="Performance & Talent Management > Talent Development > Career Development"
        gradient={G}
        stats={[
          {icon:'📍',label:'Current Role',     value:CURRENT_ROLE.title},
          {icon:'🗺',label:'Mapped Paths',       value:TARGET_ROLES.length},
          {icon:'🎯',label:'Best Match',          value:Math.max(...TARGET_ROLES.map(t=>t.skill_match_pct))+'%'},
          {icon:'👥',label:'Suggested Mentors',    value:[...new Set(TARGET_ROLES.flatMap(t=>t.mentors))].length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🧭</span>
        <div style={{flex:1,minWidth:200}}><strong>Try On a Future Role:</strong> Click any target node to see exactly which skills close the gap, what the pay band looks like, and who can mentor you there. No guessing about upward mobility.</div>
      </div>

      {/* Career journey map */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'28px 20px',marginBottom:18}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:24}}>
          {/* Current role node */}
          <div style={{background:G,color:'#fff',borderRadius:16,padding:'16px 28px',textAlign:'center',boxShadow:'0 4px 14px rgba(124,58,237,.3)'}}>
            <div style={{fontSize:9,opacity:.8}}>YOU ARE HERE</div>
            <div style={{fontSize:14,fontWeight:900}}>{CURRENT_ROLE.title}</div>
            <div style={{fontSize:9,opacity:.8}}>{CURRENT_ROLE.dept} . {CURRENT_ROLE.level}</div>
          </div>

          <div style={{width:2,height:24,background:'#e9d5ff'}}/>

          {/* Target role nodes */}
          <div style={{display:'flex',gap:16,flexWrap:'wrap',justifyContent:'center'}}>
            {TARGET_ROLES.map(t=>{
              const tc = TYPE_CFG[t.type]
              return (
                <div key={t.id} onClick={()=>setSelectedRole(t)}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.title,...t}})}}
                  style={{background:'#fff',border:`2px solid ${tc.c}`,borderRadius:14,padding:'14px 20px',textAlign:'center',cursor:'pointer',minWidth:160,transition:'transform .15s'}}>
                  <div style={{fontSize:8,color:tc.c,fontWeight:700}}>{tc.icon} {tc.label}</div>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginTop:4}}>{t.title}</div>
                  <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden',marginTop:8}}>
                    <div style={{width:`${t.skill_match_pct}%`,height:'100%',background:t.skill_match_pct>=70?'#10b981':'#f59e0b',borderRadius:6}}/>
                  </div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>{t.skill_match_pct}% skill match</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Role detail panel */}
      {selectedRole&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:5000,display:'flex',justifyContent:'flex-end'}} onClick={()=>setSelectedRole(null)}>
          <div style={{background:'#fff',width:'min(420px,100%)',height:'100%',overflow:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,.15)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}>
              <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{selectedRole.title}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>💰 {selectedRole.pay_band}</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>Required Skills to Close</div>
              {selectedRole.required_skills.map((s,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc'}}>
                  <span style={{fontSize:11,color:'#374151'}}>{s.skill}</span>
                  <span style={{fontSize:10,fontWeight:700,color:'#ef4444'}}>gap of {s.gap}</span>
                </div>
              ))}
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',margin:'16px 0 10px'}}>Suggested Mentors</div>
              {selectedRole.mentors.map((m,i)=>(<div key={i} style={{fontSize:11,color:'#374151',marginBottom:4}}>👤 {m}</div>))}
              <button style={{width:'100%',padding:13,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',marginTop:16}}>Start Development Plan for This Role {'>'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Skill match % auto-recalculates as you complete courses tagged to each required competency.','Required competencies auto-update as role profiles evolve -- no manual remapping.','Pay bands pulled live from Salary Structure, never a stale, manually-typed figure.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Path',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

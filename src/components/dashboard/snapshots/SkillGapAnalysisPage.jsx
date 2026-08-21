// FILE: SkillGapAnalysisPage.jsx - Skill Gap Analysis
// (Performance & Talent > Talent Development > Learning & Development)
// Page 2: the assessment/calibration layer. Manager + HR review a
// Matrix cell, compare Required vs Actual, get AI-recommended adjacent
// skills, and act via the Action Drawer (Assign Course / Start PDP /
// Submit Training Request).

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const PENDING_CALIBRATIONS = [
  { id:'g1', employee:'Hari Thapa', dept:'IT', skill:'Cloud Architecture', actual:3, required:7, gap:4,
    calibration_status:'awaiting_hr', manager_note:'Self-rated 3 in last review; agrees gap is real.',
    adjacent_skills:['Infrastructure as Code','Containerization (Docker/K8s)'],
    impact_links:['Skill Gap Matrix','Performance Appraisal'] },
  { id:'g2', employee:'Bikash Rai', dept:'IT', skill:'Leadership', actual:3, required:7, gap:4,
    calibration_status:'calibrated', manager_note:'Confirmed via 360 feedback -- consistent low score across raters.',
    adjacent_skills:['Conflict Resolution','Delegation'],
    impact_links:['360 Degree Feedback'] },
]

const STATUS_CFG = {awaiting_hr:{c:'#f59e0b',bg:'#fffbeb',label:'Awaiting HR Review'},calibrated:{c:'#10b981',bg:'#f0fdf4',label:'Calibrated - Ready to Act'}}

export default function SkillGapAnalysisPage() {
  const [search, setSearch] = useState('')
  const [drawerFor, setDrawerFor] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = PENDING_CALIBRATIONS.filter(g=>!search||g.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Skill Gap Analysis"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'📊',label:'Gaps Under Review',  value:PENDING_CALIBRATIONS.length},
          {icon:'⏳',label:'Awaiting HR',           value:PENDING_CALIBRATIONS.filter(g=>g.calibration_status==='awaiting_hr').length},
          {icon:'✅',label:'Calibrated',             value:PENDING_CALIBRATIONS.filter(g=>g.calibration_status==='calibrated').length},
          {icon:'🤖',label:'AI Adjacent Skills',     value:PENDING_CALIBRATIONS.reduce((s,g)=>s+g.adjacent_skills.length,0)},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Manager + HR Calibration, Not Assumption:</strong> Every gap pulled from the Matrix requires explicit confirmation before action - eliminating reliance on unverified self-ratings. Once calibrated, AI suggests adjacent skills and the Action Drawer opens for course assignment, PDP, or formal training request.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(g=>{
          const sc = STATUS_CFG[g.calibration_status]
          return (
            <div key={g.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:g.employee,...g}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{g.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{g.dept} . {g.skill}</div>
                </div>
              </div>

              <div style={{padding:'14px 18px'}}>
                <div style={{display:'flex',gap:20,alignItems:'center',marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,color:'#94a3b8',marginBottom:3}}>Required Score</div>
                    <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${g.required*10}%`,height:'100%',background:'#94a3b8',borderRadius:8}}/></div>
                  </div>
                  <span style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{g.required}/10</span>
                </div>
                <div style={{display:'flex',gap:20,alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,color:'#94a3b8',marginBottom:3}}>Current Score</div>
                    <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${g.actual*10}%`,height:'100%',background:sc.c,borderRadius:8}}/></div>
                  </div>
                  <span style={{fontSize:11,fontWeight:800,color:sc.c}}>{g.actual}/10</span>
                </div>
              </div>

              <div style={{padding:'10px 18px',fontSize:10,color:'#374151'}}>📝 {g.manager_note}</div>
              <div style={{padding:'8px 18px',display:'flex',gap:6,flexWrap:'wrap'}}>
                {g.adjacent_skills.map((s,i)=>(<span key={i} style={{background:'#eff6ff',color:'#1e40af',fontSize:8,fontWeight:600,padding:'2px 8px',borderRadius:20}}>🤖 {s}</span>))}
              </div>

              <div style={{padding:'10px 18px'}}>
                <button onClick={()=>setDrawerFor(g)} style={{padding:'8px 18px',borderRadius:10,border:'none',background:sc.c,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  {g.calibration_status==='awaiting_hr'?'Confirm Calibration':'Open Action Drawer'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action drawer */}
      {drawerFor&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:5000,display:'flex',justifyContent:'flex-end'}} onClick={()=>setDrawerFor(null)}>
          <div style={{background:'#fff',width:'min(420px,100%)',height:'100%',overflow:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,.15)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}>
              <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{drawerFor.employee}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>{drawerFor.skill} . gap of {drawerFor.gap} points</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              {drawerFor.calibration_status==='awaiting_hr'&&(
                <button style={{width:'100%',padding:13,borderRadius:10,border:'none',background:'#10b981',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',marginBottom:10}}>✅ HR Confirms Calibration</button>
              )}
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>Choose an Action</div>
              <button style={{width:'100%',padding:13,borderRadius:10,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:12,fontWeight:700,cursor:'pointer',marginBottom:8}}>📚 Assign Course from LMS</button>
              <button style={{width:'100%',padding:13,borderRadius:10,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:12,fontWeight:600,cursor:'pointer',marginBottom:8}}>📈 Start Individual Development Plan</button>
              <button style={{width:'100%',padding:13,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>📝 Submit Training Request {'>'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Adjacent-skill suggestions weigh the employee\'s stated career goals alongside the raw gap.','Calibration requires explicit manager AND HR sign-off -- self-ratings alone never auto-trigger action.','Every action routes back into the Matrix, keeping the heatmap continuously fresh.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Profile',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

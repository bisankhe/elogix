// FILE: Feedback360Page.jsx - 360 Degree Feedback (Performance & Talent > Goal & Performance > Performance Evaluation)
// Results/insights view over RELEASED pms_360 cycles (cycle management
// itself lives in Goal Management > 360 Degree PMS) - strengths, blind
// spots, development-focused summary, used for growth not formal rating.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#164e63 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const RELEASED_RESULTS = [
  { id:'r1', employee:'Bikash Rai', cycle:'Q3 2026 Mid-Cycle', reviewer_count:5, top_strength:'Technical Skill (avg 8.5/10)',
    used_for:'development_only', impact_links:['360 Degree PMS','Individual Development Plan'] },
  { id:'r2', employee:'Anjali Sharma', cycle:'Q3 2026 Mid-Cycle', reviewer_count:6, top_strength:'Teamwork (avg 9.1/10)',
    used_for:'development_only', impact_links:['Continuous Feedback'] },
]

export default function Feedback360Page() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = RELEASED_RESULTS.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎯" title="360 Degree Feedback"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Evaluation"
        gradient={G}
        stats={[
          {icon:'🎯',label:'Released Cycles', value:RELEASED_RESULTS.length},
          {icon:'👥',label:'Avg Reviewers',     value:'5.5'},
          {icon:'🔒',label:'Development Only',  value:'100%'},
          {icon:'📈',label:'Linked to IDP',     value:RELEASED_RESULTS.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#155e75',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Development Only, Never Formal Rating:</strong> Per global best practice, 360 feedback results shown here are used exclusively to inform growth conversations and IDPs - never as a direct input to the Performance Appraisal score, to preserve psychological safety and honest peer input. Manage active review cycles in Goal Management {'>'} 360 Degree PMS.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(r=>(
          <div key={r.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${A}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{r.cycle} . {r.reviewer_count} reviewers</div>
              </div>
              <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>🔒 Development Use Only</span>
            </div>
            <div style={{padding:'14px 18px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
              <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 14px'}}>
                <div style={{fontSize:9,fontWeight:700,color:'#15803d',marginBottom:4}}>💪 TOP STRENGTH</div>
                <div style={{fontSize:11,color:'#065f46'}}>{r.top_strength}</div>
              </div>
              <div style={{background:'#fffbeb',borderRadius:10,padding:'10px 14px'}}>
                <div style={{fontSize:9,fontWeight:700,color:'#92400e',marginBottom:4}}>👁 BIGGEST BLIND SPOT</div>
                <div style={{fontSize:11,color:'#78350f'}}>{r.biggest_blind_spot}</div>
              </div>
            </div>
            <div style={{padding:'10px 18px',display:'flex',gap:8}}>
              <button style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#ecfeff',color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>📈 View Full Radar (360 PMS)</button>
              <button style={{padding:'6px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#64748b',fontSize:10,fontWeight:600,cursor:'pointer'}}>📝 Add to IDP</button>
            </div>
          </div>
        ))}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Radar Chart',key:'view'},{icon:'📝',label:'Add to Development Plan',key:'idp'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

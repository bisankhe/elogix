// FILE: TrainingNeedsAnalysisPage.jsx - Training Needs Analysis (TNA)
// (Performance & Talent > Talent Development > Learning & Development)
// The DIAGNOSTIC/PRIORITIZATION layer: consumes TNI's flagged needs,
// links to performance/OKR data, prioritizes by business impact, and
// dispatches to course assignment - the "single click" handoff.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const ANALYZED_NEEDS = [
  { id:'a1', source_need:'DevOps / CI-CD Practices', dept:'IT', employees_affected:6,
    linked_okr:'Modernize Internal Engineering Tooling (40% complete)', performance_link:'3 missed sprint OKRs this quarter',
    business_impact:'high', priority_score:88, recommended_course:'CI/CD Pipeline Mastery', recommended_provider:'Internal LMS',
    status:'approved', impact_links:['Training Recommendation','OKR Management'] },
  { id:'a2', source_need:'Strategic Negotiation', dept:'Sales', employees_affected:1,
    linked_okr:'Close NPR 2M new business this quarter', performance_link:'Appraisal note: strong technical close, weak on enterprise deal structuring',
    business_impact:'medium', priority_score:62, recommended_course:'Advanced Sales Negotiation', recommended_provider:'External - Coursera',
    status:'under_review', impact_links:['Performance Appraisal'] },
  { id:'a3', source_need:'Cloud Architecture', dept:'IT', employees_affected:1,
    linked_okr:'N/A', performance_link:'Behaviour Evaluation flagged Communication; root cause traced to skill gap, not soft-skill issue',
    business_impact:'medium', priority_score:55, recommended_course:'AWS Solutions Architect', recommended_provider:'External - AWS Training',
    status:'under_review', impact_links:['Behaviour Evaluation'] },
]

const IMPACT_CFG = {high:{c:'#ef4444',bg:'#fef2f2'},medium:{c:'#f59e0b',bg:'#fffbeb'},low:{c:'#10b981',bg:'#f0fdf4'}}
const STATUS_CFG = {under_review:{c:'#f59e0b',bg:'#fffbeb',label:'Under Review'},approved:{c:'#10b981',bg:'#f0fdf4',label:'Approved - Dispatching'}}

export default function TrainingNeedsAnalysisPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = ANALYZED_NEEDS.filter(a=>!search||a.source_need.toLowerCase().includes(search.toLowerCase()))
  const totalAffected = ANALYZED_NEEDS.reduce((s,a)=>s+a.employees_affected,0)
  const highImpactCount = ANALYZED_NEEDS.filter(a=>a.business_impact==='high').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Training Needs Analysis"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'📊',label:'Needs Analyzed',     value:ANALYZED_NEEDS.length},
          {icon:'👥',label:'Employees Affected',  value:totalAffected},
          {icon:'🚨',label:'High Business Impact', value:highImpactCount},
          {icon:'✅',label:'Approved',              value:ANALYZED_NEEDS.filter(a=>a.status==='approved').length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Business-Linked, Not Subjective:</strong> Every analyzed need is cross-referenced against OKR misses or Performance Appraisal evidence - never approved on employee preference alone. Priority score weighs business impact against employees affected, so HR spends budget where it moves the needle.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by competency or department..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(a=>{
          const ic = IMPACT_CFG[a.business_impact]
          const sc = STATUS_CFG[a.status]
          return (
            <div key={a.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.source_need,...a}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${ic.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div style={{flex:1,minWidth:220}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{a.source_need}</span>
                    <span style={{background:ic.bg,color:ic.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{a.business_impact} impact</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{a.dept} . {a.employees_affected} employee(s) affected</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:A}}>{a.priority_score}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>PRIORITY SCORE</div>
                </div>
              </div>

              <div style={{padding:'10px 18px',display:'grid',gridTemplateColumns:'1fr',gap:6,borderBottom:'1px solid #f8fafc'}}>
                <div style={{fontSize:9,color:'#7c3aed'}}>🎯 Linked OKR: {a.linked_okr}</div>
                <div style={{fontSize:9,color:'#64748b'}}>📝 Performance link: {a.performance_link}</div>
              </div>

              <div style={{padding:'12px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>📚 {a.recommended_course}</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>{a.recommended_provider}</div>
                </div>
                {a.status==='under_review'&&<button style={{padding:'7px 16px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ Approve & Dispatch</button>}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Priority score = business impact weighting × employees affected × OKR/performance correlation strength.','One click on "Approve & Dispatch" assigns the course via Training Recommendation - no manual LMS hand-off.','Post-training, results auto-feed into Training ROI on the Performance Analytics dashboard.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Analysis',key:'view'},{icon:'✅',label:'Approve & Dispatch',key:'approve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

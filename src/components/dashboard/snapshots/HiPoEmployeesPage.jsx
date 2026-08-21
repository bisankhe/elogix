// FILE: HiPoEmployeesPage.jsx - HiPo Employees (High Potential)
// (Performance & Talent > Talent Development > Succession Planning)
// Dedicated identification/tracking page over the EXISTING
// leadership_pipeline.is_hipo flag. Balances current performance with
// future capacity -- learning agility, ambiguity tolerance, leadership
// motivation -- not just tenure or a single high score.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const HIPO_LIST = [
  { id:'h1', employee:'Anjali Sharma', dept:'Sales', tenure_years:1.8,
    indicators:{learning_agility:9,ambiguity_tolerance:8,leadership_motivation:9},
    engagement_score:88, flight_risk:'low', development_track:'Emerging Leader Program',
    impact_links:['Talent Mapping','Leadership Pipeline'] },
  { id:'h2', employee:'Gita Maharjan', dept:'IT', tenure_years:3.2,
    indicators:{learning_agility:9,ambiguity_tolerance:9,leadership_motivation:8},
    engagement_score:91, flight_risk:'low', development_track:'Senior IC Leadership Track',
    impact_links:['Readiness Assessment'] },
  { id:'h3', employee:'Sunil Magar', dept:'IT', tenure_years:2.5,
    indicators:{learning_agility:8,ambiguity_tolerance:7,leadership_motivation:6},
    engagement_score:62, flight_risk:'high', development_track:'Technical Leadership Track',
    flag_note:'Engagement dropped 18pts this quarter despite strong indicators -- disengagement risk for a key HiPo.', impact_links:[] },
]

export default function HiPoEmployeesPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = HIPO_LIST.filter(h=>!search||h.employee.toLowerCase().includes(search.toLowerCase()))
  const atRiskCount = HIPO_LIST.filter(h=>h.flight_risk==='high').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⭐" title="HiPo Employees (High Potential)"
        breadcrumb="Performance & Talent Management > Talent Development > Succession Planning"
        gradient={G}
        stats={[
          {icon:'⭐',label:'Identified HiPos',  value:HIPO_LIST.length},
          {icon:'✅',label:'Low Flight Risk',     value:HIPO_LIST.filter(h=>h.flight_risk==='low').length},
          {icon:'⚠',label:'Disengagement Risk',    value:atRiskCount},
          {icon:'📈',label:'Avg Engagement',        value:Math.round(HIPO_LIST.reduce((s,h)=>s+h.engagement_score,0)/HIPO_LIST.length)+'%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🧠</span>
        <div style={{flex:1,minWidth:200}}><strong>Potential, Not Just Performance:</strong> A high performer who excels at their current job isn't automatically HiPo. Identification weighs learning agility, comfort with ambiguity, and genuine leadership motivation -- the scalable traits that predict executive-level success.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(h=>(
          <div key={h.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:h.employee,...h}})}}
            style={{background:'#fff',border:`1.5px solid ${h.flight_risk==='high'?'#fecaca':'#e2e8f0'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${h.flight_risk==='high'?'#ef4444':'#4338ca'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>⭐ {h.employee}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{h.dept} . {h.tenure_years} yrs tenure</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:18,fontWeight:900,color:h.engagement_score>=75?'#10b981':'#ef4444'}}>{h.engagement_score}%</div>
                <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>ENGAGEMENT</div>
              </div>
            </div>
            <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {Object.entries(h.indicators).map(([k,v])=>(
                <div key={k} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                  <div style={{fontSize:13,fontWeight:800,color:A}}>{v}/10</div>
                  <div style={{fontSize:7,color:'#94a3b8',marginTop:2,textTransform:'capitalize'}}>{k.replace(/_/g,' ')}</div>
                </div>
              ))}
            </div>
            <div style={{padding:'8px 18px'}}><span style={{background:'#eef2ff',color:'#4338ca',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>🌱 {h.development_track}</span></div>
            {h.flag_note&&<div style={{padding:'10px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠</strong> {h.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Indicators sourced from 360 feedback, learning-agility assessments, and project-stretch outcomes -- never tenure alone.','Engagement drops of 15+ points auto-trigger a manager check-in alert for at-risk HiPos.','HiPo status syncs directly with Career Pathing and Talent Mapping -- no duplicate data entry.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Profile',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

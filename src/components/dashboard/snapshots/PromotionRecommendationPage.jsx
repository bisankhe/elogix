// FILE: PromotionRecommendationPage.jsx - Promotion Recommendation (Performance & Talent > Goal & Performance)
// AI-flagged readiness (tenure + performance + compa-ratio), multi-manager
// calibration to remove proximity/gut-feel bias, salary-band comparison.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const CANDIDATES = [
  { id:'pr1', employee:'Gita Maharjan', current_role:'Software Engineer II', next_role:'Senior Software Engineer',
    tenure_years:3.2, avg_appraisal_rating:4.4, compa_ratio:0.92, readiness_score:88,
    calibration_status:'reviewed', calibrated_by:['Direct Manager','Skip-Level','HR Partner'],
    salary_band_current:'L4: NPR 70K-90K', salary_band_next:'L5: NPR 95K-125K',
    status:'recommended', impact_links:['Performance Appraisal','Salary Structure'] },
  { id:'pr2', employee:'Ramesh KC', current_role:'Sales Executive', next_role:'Senior Sales Executive',
    tenure_years:1.8, avg_appraisal_rating:3.6, compa_ratio:1.05, readiness_score:54,
    calibration_status:'pending', calibrated_by:['Direct Manager'],
    salary_band_current:'L3: NPR 50K-65K', salary_band_next:'L4: NPR 68K-85K',
    flag_note:'Tenure below typical 2-year minimum for this band - flagged for calibration discussion, not auto-rejected.',
    status:'under_review', impact_links:[] },
]

const STATUS_CFG = {recommended:{c:'#10b981',bg:'#f0fdf4',label:'Recommended'},under_review:{c:'#f59e0b',bg:'#fffbeb',label:'Under Calibration Review'}}

export default function PromotionRecommendationPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = CANDIDATES.filter(c=>!search||c.employee.toLowerCase().includes(search.toLowerCase()))
  const recommendedCount = CANDIDATES.filter(c=>c.status==='recommended').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📈" title="Promotion Recommendation"
        breadcrumb="Performance & Talent Management > Goal & Performance"
        gradient={G}
        stats={[
          {icon:'📈',label:'AI-Flagged Candidates', value:CANDIDATES.length},
          {icon:'✅',label:'Recommended',             value:recommendedCount},
          {icon:'⏳',label:'Under Calibration',       value:CANDIDATES.filter(c=>c.status==='under_review').length},
          {icon:'⚖',label:'Bias Check',                value:'Multi-Manager'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Data-Backed, Not Gut-Feel:</strong> Readiness score combines tenure, average appraisal rating, and compa-ratio positioning. Multi-manager calibration sessions (Direct Manager + Skip-Level + HR Partner) review every candidate to eliminate proximity bias toward co-located or in-office staff.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(c=>{
          const sc = STATUS_CFG[c.status]
          return (
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.employee,...c}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div style={{flex:1,minWidth:220}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{c.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{c.current_role} {'>'} {c.next_role}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color:sc.c}}>{c.readiness_score}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>READINESS SCORE</div>
                </div>
              </div>
              <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[{l:'Tenure',v:c.tenure_years+' yrs',c:'#3b82f6'},{l:'Avg Appraisal',v:c.avg_appraisal_rating+'/5',c:'#10b981'},{l:'Compa-Ratio',v:c.compa_ratio,c:'#7c3aed'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:'10px 18px',display:'flex',gap:14,fontSize:9,color:'#64748b',flexWrap:'wrap'}}>
                <span>💰 Current: {c.salary_band_current}</span>
                <span>{'>'} Next: {c.salary_band_next}</span>
              </div>
              <div style={{padding:'8px 18px',display:'flex',gap:6,flexWrap:'wrap'}}>
                {c.calibrated_by.map((m,i)=>(<span key={i} style={{background:'#f0fdf4',color:'#15803d',fontSize:8,fontWeight:600,padding:'2px 8px',borderRadius:20}}>✓ {m}</span>))}
              </div>
              {c.flag_note&&<div style={{padding:'10px 18px',background:'#fffbeb',fontSize:10,color:'#92400e'}}><strong>⚠</strong> {c.flag_note}</div>}
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Profile',key:'view'},{icon:'✅',label:'Approve Promotion',key:'approve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

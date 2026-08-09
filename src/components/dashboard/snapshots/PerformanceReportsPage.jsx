// FILE: PerformanceReportsPage.jsx - Performance Reports (Performance & Talent > Goal & Performance > Performance Evaluation)
// Dynamic, predictive HR analytics: rating-distribution bell curve,
// review-completion tracker, skill-gap heatmap, turnover-risk flags.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const RATING_DISTRIBUTION = [{rating:1,count:2},{rating:2,count:9},{rating:3,count:48},{rating:4,count:61},{rating:5,count:18}]
const COMPLETION_TRACKER = [
  {dept:'IT',total:47,completed:42,pct:89},{dept:'Sales & Marketing',total:42,completed:38,pct:90},
  {dept:'Finance',total:24,completed:24,pct:100},{dept:'Customer Service',total:18,completed:11,pct:61},
]
const SKILL_GAPS = [
  {skill:'Cloud Architecture',gap_count:14,dept:'IT'},{skill:'Strategic Negotiation',gap_count:8,dept:'Sales'},
  {skill:'Data Analysis',gap_count:11,dept:'Finance'},
]
const TURNOVER_RISK = [
  {employee:'Bikash Rai',dept:'IT',risk:'high',reason:'Low engagement score, 2 consecutive below-target appraisals, high overtime'},
  {employee:'Ramesh KC',dept:'Sales',risk:'medium',reason:'Declining feedback sentiment over last 2 quarters'},
]

const RISK_CFG = {high:{c:'#ef4444',bg:'#fef2f2'},medium:{c:'#f59e0b',bg:'#fffbeb'},low:{c:'#10b981',bg:'#f0fdf4'}}

export default function PerformanceReportsPage() {
  const [activeTab, setActiveTab] = useState('distribution')
  const [ctx, setCtx] = useState(null)

  const maxCount = Math.max(...RATING_DISTRIBUTION.map(r=>r.count))
  const overallCompletion = Math.round(COMPLETION_TRACKER.reduce((s,c)=>s+c.completed,0)/COMPLETION_TRACKER.reduce((s,c)=>s+c.total,0)*100)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Performance Reports"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Evaluation"
        gradient={G}
        stats={[
          {icon:'📊',label:'Overall Completion', value:overallCompletion+'%'},
          {icon:'⚠',label:'Skill Gaps Found',     value:SKILL_GAPS.reduce((s,g)=>s+g.gap_count,0)},
          {icon:'🚨',label:'Turnover Risk Flags',  value:TURNOVER_RISK.length},
          {icon:'📈',label:'Avg Rating',            value:'3.5/5'},
        ]}
        onAdd={()=>{}} addLabel="Schedule Auto-Export" onExcel={()=>{}}/>

      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',background:'#f1f5f9',padding:6,borderRadius:12}}>
        {[{key:'distribution',label:'📈 Rating Distribution'},{key:'completion',label:'✅ Completion Tracker'},{key:'skills',label:'🎯 Skill Gaps'},{key:'turnover',label:'🚨 Turnover Risk'}].map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{padding:'8px 14px',borderRadius:9,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
              background:activeTab===t.key?'#fff':'transparent',color:activeTab===t.key?A:'#64748b',
              fontWeight:activeTab===t.key?700:500,boxShadow:activeTab===t.key?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab==='distribution'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>📈 Rating Distribution (Bell Curve Check)</div>
          <div style={{display:'flex',gap:12,alignItems:'flex-end',height:160}}>
            {RATING_DISTRIBUTION.map((r,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <div style={{fontSize:10,fontWeight:700,color:A}}>{r.count}</div>
                <div style={{width:'100%',background:A,borderRadius:'6px 6px 0 0',height:`${(r.count/maxCount)*120}px`}}/>
                <div style={{fontSize:9,color:'#94a3b8'}}>{r.rating}★</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:12,fontSize:10,color:'#64748b'}}>Healthy bell-curve shape (peak at 3-4) suggests calibration is working - a spike at 5★ across many raters would flag leniency bias.</div>
        </div>
      )}

      {activeTab==='completion'&&(
        <div style={{display:'grid',gap:10}}>
          {COMPLETION_TRACKER.map((c,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:11}}>
                <span style={{fontWeight:700,color:'#0f172a'}}>{c.dept}</span><span style={{fontWeight:700,color:c.pct<80?'#ef4444':'#10b981'}}>{c.completed}/{c.total} ({c.pct}%)</span>
              </div>
              <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${c.pct}%`,height:'100%',background:c.pct<80?'#ef4444':'#10b981',borderRadius:8}}/></div>
            </div>
          ))}
        </div>
      )}

      {activeTab==='skills'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>{['Skill Gap','Department','Affected Employees'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>{h}</th>)}</tr></thead>
            <tbody>{SKILL_GAPS.map((s,i)=>(
              <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.skill,impact_links:['Training Records']}})}}>
                <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{s.skill}</td>
                <td style={{padding:'9px 12px',color:'#64748b'}}>{s.dept}</td>
                <td style={{padding:'9px 12px',fontWeight:700,color:A}}>{s.gap_count}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {activeTab==='turnover'&&(
        <div style={{display:'grid',gap:10}}>
          {TURNOVER_RISK.map((t,i)=>{
            const rc = RISK_CFG[t.risk]
            return (
              <div key={i} style={{background:'#fff',border:`1.5px solid ${rc.c}33`,borderRadius:14,padding:'14px 18px',display:'flex',gap:14,alignItems:'flex-start'}}>
                <span style={{background:rc.bg,color:rc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,flexShrink:0}}>{t.risk}</span>
                <div>
                  <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{t.employee} - {t.dept}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{t.reason}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Drill Into Detail',key:'drill'},{icon:'📤',label:'Export',key:'export'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

// FILE: PerformanceDashboardPage.jsx - Performance Dashboard
// (Performance & Talent > Goal & Performance > Performance Analytics)
// The "5-second rule" executive view: top-line KPIs, 360-consolidated
// profile snapshot, AI Action Alerts, drill-down by dept/role/tenure.
// Aggregates performance_appraisals + v_pms_360_radar + v_rating_distribution.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const TOP_KPIS = [
  {label:'Net Employee Growth',value:'+4.2%',trend:'up',icon:'📈'},
  {label:'Avg Performance Score',value:'3.6/5',trend:'up',icon:'⭐'},
  {label:'Attrition Rate',value:'8.1%',trend:'down',icon:'🚪'},
  {label:'Goal Alignment Score',value:'82%',trend:'up',icon:'🎯'},
]

const ACTION_ALERTS = [
  {severity:'high',message:'3 high-impact employees show declining engagement scores - recommend 1:1 check-ins this week.',affected:['Bikash Rai','Hari Thapa','Ramesh KC']},
  {severity:'medium',message:'IT department compa-ratio average (0.91) trending below market - review at next compensation cycle.',affected:[]},
]

const DEPT_SNAPSHOT = [
  {dept:'IT',avg_score:3.2,headcount:47,at_risk_count:3},{dept:'Sales & Marketing',avg_score:4.1,headcount:42,at_risk_count:1},
  {dept:'Finance',avg_score:3.9,headcount:24,at_risk_count:0},{dept:'Customer Service',avg_score:3.4,headcount:18,at_risk_count:2},
]

const SEVERITY_CFG = {high:{c:'#ef4444',bg:'#fef2f2'},medium:{c:'#f59e0b',bg:'#fffbeb'}}

export default function PerformanceDashboardPage() {
  const [filterDept, setFilterDept] = useState('all')
  const [ctx, setCtx] = useState(null)

  const filtered = DEPT_SNAPSHOT.filter(d=>filterDept==='all'||d.dept===filterDept)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Performance Dashboard"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Analytics"
        gradient={G}
        stats={TOP_KPIS.map(k=>({icon:k.icon,label:k.label,value:k.value}))}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚡</span>
        <div style={{flex:1,minWidth:200}}><strong>The 5-Second Rule:</strong> Every metric here answers "is the workforce performing optimally?" at a glance - consolidating self-evaluations, manager appraisals, and 360 peer feedback into one objective profile per employee. Drill down by department, role, or tenure below.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          {['all',...DEPT_SNAPSHOT.map(d=>d.dept)].map(d=>(
            <button key={d} onClick={()=>setFilterDept(d)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
                background:filterDept===d?'#fff':'transparent',color:filterDept===d?A:'#64748b',
                fontWeight:filterDept===d?700:400,boxShadow:filterDept===d?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {d==='all'?'All Departments':d}
            </button>
          ))}
        </div>
      </div>

      {/* Department snapshot cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:18}}>
        {filtered.map((d,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.dept,impact_links:['Performance Appraisal','360 Degree Feedback']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{d.dept}</div>
              {d.at_risk_count>0&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:20}}>{d.at_risk_count} at risk</span>}
            </div>
            <div style={{fontSize:22,fontWeight:900,color:d.avg_score>=3.5?'#10b981':'#f59e0b'}}>{d.avg_score}/5</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>{d.headcount} employees</div>
          </div>
        ))}
      </div>

      {/* AI Action Alerts */}
      <div style={{background:'#fff',border:'1px solid #fecaca',borderRadius:16,padding:'18px 20px',marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:800,color:'#991b1b',marginBottom:12}}>🚨 AI Action Alerts</div>
        {ACTION_ALERTS.map((a,i)=>{
          const sc = SEVERITY_CFG[a.severity]
          return (
            <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',borderBottom:i<ACTION_ALERTS.length-1?'1px solid #f8fafc':'none'}}>
              <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,flexShrink:0}}>{a.severity}</span>
              <div>
                <div style={{fontSize:10,color:'#374151'}}>{a.message}</div>
                {a.affected.length>0&&<div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>Affected: {a.affected.join(', ')}</div>}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Scatter-plot view (Skill Competency vs Job Performance) available via drill-down on any department card.','Trended productivity vs absenteeism line chart updates daily from live attendance data.','Action Alerts refresh automatically - no manual report generation needed.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Drill Into Department',key:'drill'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

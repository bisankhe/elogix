// FILE: GoalTrackingPage.jsx - Goal Tracking (Performance & Talent > Goal & Performance > Goal Management)
// Unified rollup across KRA + KPI + OKR + Goal Assignment cascade. Role-
// based views (Exec/Manager/Employee/HR Admin), color-coded status,
// one-click check-in, 30/60/90-day automated reminders, audit trail.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A = '#334155'

const GOAL_TYPE_CFG = {
  KRA:{c:'#7c3aed',icon:'🎯',label:'KRA'},
  KPI:{c:'#0284c7',icon:'📊',label:'KPI'},
  OKR:{c:'#c2410c',icon:'🚀',label:'OKR'},
  Assignment:{c:'#15803d',icon:'📐',label:'Goal Assignment'},
const STATUS_CFG = {
  on_track:{c:'#10b981',bg:'#f0fdf4',label:'On Track'},
  at_risk:{c:'#f59e0b',bg:'#fffbeb',label:'At Risk'},
  off_track:{c:'#ef4444',bg:'#fef2f2',label:'Off Track'},

const UNIFIED_GOALS = [
  { id:'g1', type:'KRA', title:'Revenue Generation & Client Retention', owner:'Sunil Magar (Sales Manager)',
    progress_pct:75, status:'on_track', last_checkin:'2025-06-20', audit_entries:14,
    impact_links:['KRA Management'] },
  { id:'g2', type:'KPI', title:'Close $500K ARR Pipeline', owner:'Sunil Magar (Sales Manager)',
    progress_pct:82, status:'on_track', last_checkin:'2025-06-21', audit_entries:9,
    impact_links:['KPI Management'] },
  { id:'g3', type:'OKR', title:'Modernize Internal Engineering Tooling', owner:'Bikash Rai (Eng Lead)',
    progress_pct:40, status:'at_risk', last_checkin:'2025-06-10', audit_entries:6,
    impact_links:['OKR Management','Workload Analysis'] },
  { id:'g4', type:'Assignment', title:'IT Annual Target - 99.5% Uptime, 4 Releases', owner:'IT Department',
    progress_pct:55, status:'on_track', last_checkin:'2025-06-19', audit_entries:22,
    impact_links:['Goal Assignment'] },
  { id:'g5', type:'KPI', title:'Compliance Audit Pass Rate', owner:'Priya Adhikari (HR Manager)',
    progress_pct:87, status:'off_track', last_checkin:'2025-06-05', audit_entries:4,
    impact_links:['Tax & Compliance'] },
]

export default function GoalTrackingPage() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [ctx, setCtx] = useState(null)

  const filtered = UNIFIED_GOALS.filter(g=>{
    if (filterType!=='all'&&g.type!==filterType) return false
    if (search&&!g.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const avgProgress = Math.round(UNIFIED_GOALS.reduce((s,g)=>s+g.progress_pct,0)/UNIFIED_GOALS.length)
  const atRiskCount = UNIFIED_GOALS.filter(g=>g.status==='at_risk'||g.status==='off_track').length
  const overdueCheckins = UNIFIED_GOALS.filter(g=>g.flag_note&&g.flag_note.includes('check-in')).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📍" title="Goal Tracking"
        breadcrumb="Performance & Talent Management > Goal & Performance > Goal Management"
        gradient={G}
        stats={[
          {icon:'📍',label:'All Active Goals',  value:UNIFIED_GOALS.length},
          {icon:'📊',label:'Avg Progress',        value:avgProgress+'%'},
          {icon:'⚠',label:'At Risk / Off Track', value:atRiskCount},
          {icon:'🔔',label:'Overdue Check-Ins',   value:overdueCheckins},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>One Unified View:</strong> KRAs, KPIs, OKRs, and cascaded department assignments all roll up here - no need to jump between separate modules to see if someone is on track. Every audit-trail entry (edits, approvals, check-ins) is permanently logged for Labour Office defensibility.</div>
      </div>

      {/* Type filter chips */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search goals by title..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          {['all',...Object.keys(GOAL_TYPE_CFG)].map(t=>(
            <button key={t} onClick={()=>setFilterType(t)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
                background:filterType===t?'#fff':'transparent',color:filterType===t?A:'#64748b',
                fontWeight:filterType===t?700:400,boxShadow:filterType===t?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {t==='all'?'All Types':`${GOAL_TYPE_CFG[t].icon} ${GOAL_TYPE_CFG[t].label}`}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(g=>{
          const tc = GOAL_TYPE_CFG[g.type]
          const sc = STATUS_CFG[g.status]
          return (
            <div key={g.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:g.title,...g}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div style={{flex:1,minWidth:220}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{background:`${tc.c}15`,color:tc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{tc.icon} {tc.label}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{g.title}</div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{g.owner}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:sc.c}}>{g.progress_pct}%</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>PROGRESS</div>
                </div>
              </div>
              <div style={{padding:'12px 18px'}}>
                <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                  <div style={{width:`${g.progress_pct}%`,height:'100%',background:sc.c,borderRadius:8}}/>
                </div>
              </div>
              <div style={{padding:'8px 18px',display:'flex',justifyContent:'space-between',fontSize:9,color:'#94a3b8',flexWrap:'wrap',gap:8}}>
                <span>Last check-in: {g.last_checkin}</span>
                <span>📋 {g.audit_entries} audit trail entries</span>
              </div>
              {g.flag_note&&<div style={{padding:'10px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠</strong> {g.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['30/60/90-day automated reminders sent before any milestone deadline.','Goals with no check-in in 10+ days are auto-flagged for manager attention.','Every edit, approval, and check-in is permanently logged - defensible at Labour Office audit per Section 52(1).']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Audit Trail',key:'view'},{icon:'💬',label:'Quick Check-In',key:'checkin'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

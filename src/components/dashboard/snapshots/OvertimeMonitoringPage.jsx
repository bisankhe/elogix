// FILE: OvertimeMonitoringPage.jsx - Overtime & Monitoring (Attendance Management)
// Org-wide command center: labor-cost-by-department heatmap, OT trend chart,
// proactive burnout-threshold alerts, ghost/unauthorized-OT detection feed.

import { useState } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const DEPT_OT_COST = [
  {dept:'Customer Service',ot_hours:142,ot_cost_npr:212000,headcount:56,risk:'high'},
  {dept:'Sales & Marketing',ot_hours:98,ot_cost_npr:147000,headcount:42,risk:'medium'},
  {dept:'Information Technology',ot_hours:64,ot_cost_npr:96000,headcount:47,risk:'low'},
  {dept:'Finance & Accounts',ot_hours:22,ot_cost_npr:33000,headcount:24,risk:'low'},
]

const OT_TREND = [{month:'Jan',hours:280},{month:'Feb',hours:310},{month:'Mar',hours:295},{month:'Apr',hours:340},{month:'May',hours:380},{month:'Jun',hours:326}]

const BURNOUT_ALERTS = [
  {employee:'Bikash Rai',dept:'IT',weekly_ot_hours:22,cap:24,pct:92,note:'Approaching weekly OT cap - 2 hours remaining before mandatory rest enforcement.'},
  {employee:'Sunil Magar',dept:'Customer Service',weekly_ot_hours:24,cap:24,pct:100,note:'At the LA2074 24hr/week OT cap - further OT this week is illegal without contract exception.'},
]

const GHOST_OT_FLAGS = [
  {employee:'Anjali Sharma',date:'2025-06-20',detail:'Logged 2.5hrs OT with no prior manager pre-approval request on file.',severity:'high'},
  {employee:'Ramesh KC',date:'2025-06-19',detail:'OT claimed outside assigned shift window - possible buddy-punch or system clock drift.',severity:'medium'},
]

function MiniBarChart({data,color}) {
  const max = Math.max(...data.map(d=>d.hours))
  return (
    <div style={{display:'flex',gap:6,alignItems:'flex-end',height:60}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,textAlign:'center'}}>
          <div style={{height:`${(d.hours/max)*48}px`,background:color,borderRadius:'4px 4px 0 0',marginBottom:4}}/>
          <div style={{fontSize:8,color:'#94a3b8'}}>{d.month}</div>
        </div>
      ))}
    </div>
  )
}

const RISK_CFG = {high:{c:'#ef4444',bg:'#fef2f2'},medium:{c:'#f59e0b',bg:'#fffbeb'},low:{c:'#10b981',bg:'#f0fdf4'}}

export default function OvertimeMonitoringPage() {
  const [_nm, _snm] = useState("")
  const notify = m => { _snm(m); setTimeout(()=>_snm(""),3000) }
  const [ctx, setCtx] = useState(null)
  const totalOTCost = DEPT_OT_COST.reduce((s,d)=>s+d.ot_cost_npr,0)
  const totalOTHours = DEPT_OT_COST.reduce((s,d)=>s+d.ot_hours,0)

  return (
    <div onClick={()=>setCtx(null)}>
      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}
      <PageHeader icon="📊" title="Overtime & Monitoring"
        breadcrumb="Workforce Operations > Attendance Management"
        gradient={G}
        stats={[
          {icon:'⏱',label:'Total OT Hours (Month)', value:totalOTHours},
          {icon:'💰',label:'Total OT Cost',           value:'NPR '+(totalOTCost/1000).toFixed(0)+'K'},
          {icon:'⚠',label:'Burnout Alerts',           value:BURNOUT_ALERTS.length},
          {icon:'🚨',label:'Ghost OT Flags',          value:GHOST_OT_FLAGS.length},
        ]}
        onAdd={()=>notify('Overtime logged')} addLabel="+ Log Overtime" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> OT capped at 4hrs/day, 24hrs/week, paid at 150%. Employee consent required before assigning OT. Workers under 18 cannot be deployed in overtime. This dashboard proactively flags approaching/breached limits - not just after-the-fact reporting.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:4}}>📈 OT Hours Trend (6 Months)</div>
          <div style={{fontSize:10,color:'#94a3b8',marginBottom:14}}>Steady climb since April - investigate department drivers below</div>
          <MiniBarChart data={OT_TREND} color={A}/>
        </div>

        <div style={{background:'#fff',border:'1px solid #fecaca',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#991b1b',marginBottom:12}}>⚠ Burnout Threshold Alerts</div>
          {BURNOUT_ALERTS.map((b,i)=>(
            <div key={i} style={{background:b.pct>=100?'#fef2f2':'#fffbeb',borderRadius:10,padding:'10px 12px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{b.employee}</span>
                <span style={{fontSize:11,fontWeight:800,color:b.pct>=100?'#dc2626':'#b45309'}}>{b.weekly_ot_hours}/{b.cap}h</span>
              </div>
              <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden',marginBottom:6}}>
                <div style={{width:`${b.pct}%`,height:'100%',background:b.pct>=100?'#dc2626':'#f59e0b',borderRadius:6}}/>
              </div>
              <div style={{fontSize:9,color:'#64748b'}}>{b.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Department labor-cost heatmap */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔥 Department OT Cost Heatmap</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {DEPT_OT_COST.map((d,i)=>{
            const rc = RISK_CFG[d.risk]
            return (
              <div key={i}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.dept,impact_links:['Overtime Management','Payroll Setup']}})}}
                style={{background:rc.bg,border:`2px solid ${rc.c}33`,borderRadius:12,padding:'14px 12px',textAlign:'center',cursor:'pointer'}}>
                <div style={{fontSize:18,fontWeight:900,color:rc.c}}>{d.ot_hours}h</div>
                <div style={{fontSize:9,fontWeight:700,color:'#0f172a',marginTop:4,lineHeight:1.3}}>{d.dept}</div>
                <div style={{fontSize:8,color:'#64748b',marginTop:4}}>NPR {(d.ot_cost_npr/1000).toFixed(0)}K . {d.headcount} HC</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ghost OT detection */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🚨 Unauthorized / "Ghost" OT Detection</div>
        {GHOST_OT_FLAGS.map((g,i)=>(
          <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',borderBottom:i<GHOST_OT_FLAGS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{background:g.severity==='high'?'#fef2f2':'#fffbeb',color:g.severity==='high'?'#dc2626':'#b45309',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20,flexShrink:0}}>{g.severity}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{g.employee} <span style={{color:'#94a3b8',fontWeight:400}}>. {g.date}</span></div>
              <div style={{fontSize:10,color:'#64748b'}}>{g.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'🔍',label:'Drill into Department',key:'drill'},{icon:'📤',label:'Export Report',key:'export'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

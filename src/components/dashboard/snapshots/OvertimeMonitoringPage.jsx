// FILE: src/components/dashboard/snapshots/OvertimeMonitoringPage.jsx
// eLogix HRMS — Overtime & Monitoring (Attendance Management)
// Labor-cost heatmap, OT trend chart, burnout alerts, ghost OT detection
// FIXED: msg is not defined (was _nm/_snm)
// ADDED: tenant-wise access, SaaS DB integration, scrollbar
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'
import { resolveTenantAccess, getSessionSlug } from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e){ return {} }
}

const DEPT_OT_COST = [
  {dept:'Customer Service',  ot_hours:142, ot_cost_npr:212000, headcount:56, risk:'high'},
  {dept:'Sales & Marketing', ot_hours:98,  ot_cost_npr:147000, headcount:42, risk:'medium'},
  {dept:'Information Tech',  ot_hours:64,  ot_cost_npr:96000,  headcount:47, risk:'low'},
  {dept:'Finance & Accounts',ot_hours:22,  ot_cost_npr:33000,  headcount:24, risk:'low'},
]
const OT_TREND = [
  {month:'Jan',hours:280},{month:'Feb',hours:310},{month:'Mar',hours:295},
  {month:'Apr',hours:340},{month:'May',hours:380},{month:'Jun',hours:326},
]
const BURNOUT_ALERTS = [
  {employee:'Bikash Rai',   dept:'IT',               weekly_ot_hours:22, cap:24, pct:92,  note:'Approaching weekly OT cap - 2 hours remaining.'},
  {employee:'Sunil Magar',  dept:'Customer Service', weekly_ot_hours:24, cap:24, pct:100, note:'At the LA2074 24hr/week OT cap — further OT is illegal.'},
]
const GHOST_OT_FLAGS = [
  {employee:'Anjali Sharma', date:'2025-06-20', detail:'2.5hrs OT logged with no prior manager pre-approval.', severity:'high'},
  {employee:'Ramesh KC',     date:'2025-06-19', detail:'OT claimed outside assigned shift window — possible buddy-punch.', severity:'medium'},
]
const RISK_CFG = {
  high  : {c:'#ef4444', bg:'#fef2f2'},
  medium: {c:'#f59e0b', bg:'#fffbeb'},
  low   : {c:'#10b981', bg:'#f0fdf4'},
}

function MiniBarChart({data, color}) {
  const max = Math.max(...data.map(d => d.hours))
  return (
    <div style={{display:'flex', gap:6, alignItems:'flex-end', height:60}}>
      {data.map((d, i) => (
        <div key={i} style={{flex:1, textAlign:'center'}}>
          <div style={{height:`${(d.hours/max)*48}px`, background:color, borderRadius:'4px 4px 0 0', marginBottom:4}}/>
          <div style={{fontSize:8, color:'#94a3b8'}}>{d.month}</div>
        </div>
      ))}
    </div>
  )
}

export default function OvertimeMonitoringPage() {
  const slug    = getSessionSlug()
  const access  = resolveTenantAccess(slug)
  const sess    = getSession()
  const company = sess.company || {}

  if (!access.hasAccess('attendance')) {
    return <AccessDenied moduleName="Overtime & Monitoring" />
  }

  const [deptOT,    setDeptOT]    = useState(DEPT_OT_COST)
  const [burnout,   setBurnout]   = useState(BURNOUT_ALERTS)
  const [ghostOT,   setGhostOT]   = useState(GHOST_OT_FLAGS)
  const [msg,       setMsg]       = useState('')    // ✅ FIX: was _nm/_snm
  const [ctx,       setCtx]       = useState(null)
  const [loading,   setLoading]   = useState(false)

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  // SaaS DB: load tenant OT data
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    setLoading(true)
    fetch('/api/v1/overtime/summary', {
      headers: {'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug}
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (data.dept_ot?.length)  setDeptOT(data.dept_ot)
        if (data.burnout?.length)  setBurnout(data.burnout)
        if (data.ghost_ot?.length) setGhostOT(data.ghost_ot)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const totalOTCost  = deptOT.reduce((s, d) => s + d.ot_cost_npr, 0)
  const totalOTHours = deptOT.reduce((s, d) => s + d.ot_hours, 0)

  return (
    <div style={{position:'fixed', inset:0, fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#fff7ed', display:'flex', flexDirection:'column', overflow:'hidden'}}
      onClick={() => setCtx(null)}>

      {/* Toast */}
      {msg && <div style={{position:'fixed', bottom:20, right:20, zIndex:9999,
        background:msg.startsWith('❌')?'#fef2f2':'#f0fdf4',
        border:`1px solid ${msg.startsWith('❌')?'#fecaca':'#bbf7d0'}`,
        borderRadius:10, padding:'10px 18px', fontSize:11, fontWeight:600,
        color:msg.startsWith('❌')?'#dc2626':'#065f46',
        boxShadow:'0 4px 16px rgba(0,0,0,.12)'}}>
        {msg}
      </div>}

      {/* Header */}
      <div style={{background:G, padding:'12px 20px', color:'#fff', flexShrink:0}}>
        <div style={{fontSize:10, opacity:.7, marginBottom:2}}>
          Workforce Operations › Attendance Management › Overtime Monitoring
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8}}>
          <div>
            <div style={{fontSize:17, fontWeight:900}}>📊 Overtime & Monitoring</div>
            <div style={{fontSize:10, opacity:.8}}>
              {company.name || 'Company'} · LA 2074: max 4h/day, 24h/week, 150% pay
              {loading ? ' · Loading...' : ''}
            </div>
          </div>
          <button onClick={() => notify('✅ Overtime logged')}
            style={{padding:'7px 14px', borderRadius:8, border:'none',
              background:'#fff', color:A, fontSize:11, fontWeight:700, cursor:'pointer'}}>
            + Log Overtime
          </button>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12}}>
          {[
            {icon:'⏱', label:'Total OT Hours', v:totalOTHours},
            {icon:'💰', label:'Total OT Cost',  v:`NPR ${(totalOTCost/1000).toFixed(0)}K`},
            {icon:'⚠️', label:'Burnout Alerts', v:burnout.length},
            {icon:'🚨', label:'Ghost OT Flags', v:ghostOT.length},
          ].map(s => (
            <div key={s.label} style={{background:'rgba(255,255,255,.12)', borderRadius:8,
              padding:'7px 10px', textAlign:'center', border:'1px solid rgba(255,255,255,.2)'}}>
              <div style={{fontSize:14}}>{s.icon}</div>
              <div style={{fontSize:15, fontWeight:900, lineHeight:1, marginTop:2}}>{s.v}</div>
              <div style={{fontSize:9, opacity:.75, marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nepal Labour Act banner */}
      <div style={{background:'#fff7ed', borderBottom:'1px solid #fed7aa', padding:'8px 20px',
        fontSize:11, color:'#7c2d12', display:'flex', gap:8, flexShrink:0}}>
        <span style={{fontSize:16}}>⚖️</span>
        <div><strong>Nepal Labour Act 2074:</strong> OT capped at 4hrs/day, 24hrs/week, paid at 150%.
          Worker consent required. Under-18 workers cannot do OT.</div>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1, overflowY:'auto', overflowX:'hidden', padding:'16px 20px',
        scrollbarWidth:'thin', scrollbarColor:'#94a3b8 #f1f5f9'}}>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14}}>
          {/* OT trend */}
          <div style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'16px 18px'}}>
            <div style={{fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:4}}>
              📈 OT Hours Trend (6 Months)
            </div>
            <div style={{fontSize:10, color:'#94a3b8', marginBottom:12}}>
              Steady climb since April — investigate department drivers
            </div>
            <MiniBarChart data={OT_TREND} color={A}/>
          </div>

          {/* Burnout alerts */}
          <div style={{background:'#fff', border:'1px solid #fecaca', borderRadius:14, padding:'16px 18px'}}>
            <div style={{fontSize:12, fontWeight:800, color:'#991b1b', marginBottom:12}}>
              ⚠️ Burnout Threshold Alerts
            </div>
            {burnout.map((b, i) => (
              <div key={i} style={{background:b.pct>=100?'#fef2f2':'#fffbeb', borderRadius:10,
                padding:'10px 12px', marginBottom:8}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                  <div>
                    <span style={{fontSize:11, fontWeight:700, color:'#0f172a'}}>{b.employee}</span>
                    <span style={{fontSize:9, color:'#64748b', marginLeft:6}}>{b.dept}</span>
                  </div>
                  <span style={{fontSize:11, fontWeight:800,
                    color:b.pct>=100?'#dc2626':'#b45309'}}>{b.weekly_ot_hours}/{b.cap}h</span>
                </div>
                <div style={{height:6, background:'#f1f5f9', borderRadius:6, overflow:'hidden', marginBottom:6}}>
                  <div style={{width:`${b.pct}%`, height:'100%',
                    background:b.pct>=100?'#dc2626':'#f59e0b', borderRadius:6}}/>
                </div>
                <div style={{fontSize:9, color:'#64748b'}}>{b.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dept heatmap */}
        <div style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
          padding:'16px 18px', marginBottom:14}}>
          <div style={{fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:12}}>
            🔥 Department OT Cost Heatmap
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10}}>
            {deptOT.map((d, i) => {
              const rc = RISK_CFG[d.risk]
              return (
                <div key={i}
                  onContextMenu={ev => { ev.preventDefault(); setCtx({x:ev.clientX, y:ev.clientY,
                    item:{name:d.dept, impact_links:['Overtime Management','Payroll Setup']}}) }}
                  style={{background:rc.bg, border:`2px solid ${rc.c}33`, borderRadius:12,
                    padding:'14px 12px', textAlign:'center', cursor:'pointer'}}>
                  <div style={{fontSize:20, fontWeight:900, color:rc.c}}>{d.ot_hours}h</div>
                  <div style={{fontSize:10, fontWeight:700, color:'#0f172a', marginTop:4, lineHeight:1.3}}>{d.dept}</div>
                  <div style={{fontSize:8, color:'#64748b', marginTop:4}}>
                    NPR {(d.ot_cost_npr/1000).toFixed(0)}K · {d.headcount} HC
                  </div>
                  <span style={{display:'inline-block', marginTop:6, fontSize:8, fontWeight:700,
                    padding:'1px 8px', borderRadius:20, background:rc.bg, color:rc.c,
                    border:`1px solid ${rc.c}33`}}>
                    {d.risk.toUpperCase()} RISK
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ghost OT */}
        <div style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'16px 18px'}}>
          <div style={{fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:12}}>
            🚨 Unauthorized / "Ghost" OT Detection
          </div>
          {ghostOT.map((g, i) => (
            <div key={i} style={{display:'flex', gap:12, alignItems:'flex-start', padding:'10px 0',
              borderBottom:i < ghostOT.length-1 ? '1px solid #f8fafc' : 'none'}}>
              <span style={{background:g.severity==='high'?'#fef2f2':'#fffbeb',
                color:g.severity==='high'?'#dc2626':'#b45309',
                fontSize:9, fontWeight:700, padding:'2px 9px', borderRadius:20, flexShrink:0}}>
                {g.severity.toUpperCase()}
              </span>
              <div style={{flex:1}}>
                <div style={{fontSize:11, fontWeight:700, color:'#0f172a'}}>
                  {g.employee} <span style={{color:'#94a3b8', fontWeight:400}}>· {g.date}</span>
                </div>
                <div style={{fontSize:10, color:'#64748b'}}>{g.detail}</div>
              </div>
              <button onClick={() => notify(`⚠️ Investigation flagged for ${g.employee}`)}
                style={{padding:'4px 10px', borderRadius:6, border:'1px solid #fecaca',
                  background:'#fef2f2', color:'#dc2626', fontSize:9, fontWeight:700,
                  cursor:'pointer', flexShrink:0}}>
                Investigate
              </button>
            </div>
          ))}
        </div>
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links}
        actions={[
          {icon:'🔍', label:'Drill into Department', key:'drill'},
          {icon:'📤', label:'Export Report',         key:'export'},
          {icon:'🔗', label:'Impact Analysis',       key:'impact'},
        ]} onAction={() => {}} onClose={() => setCtx(null)}/>}
    </div>
  )
}

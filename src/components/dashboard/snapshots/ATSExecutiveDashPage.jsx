// ATSExecutiveDashPage.jsx — CEO/CFO/Board-Level Executive Dashboard
// KPIs, Workforce Planning, Hiring Forecast, Cost Analysis, Headcount Gap
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const KPI = [
  { icon:'👥', label:'Total Headcount',     value:'284',        sub:'across all depts',       trend:'+12 this quarter',  c:'#1e40af', up:true  },
  { icon:'🎯', label:'Open Positions',       value:'21',         sub:'8 urgent, 13 planned',   trend:'↑3 from last month', c:'#f59e0b', up:false },
  { icon:'⏱', label:'Avg Time to Hire',     value:'18 days',    sub:'vs 26d industry avg',    trend:'↓8d improvement',   c:'#059669', up:true  },
  { icon:'💰', label:'Total Hiring Cost',    value:'NPR 9.45L',  sub:'YTD FY 2081',            trend:'↓15% vs last FY',   c:'#059669', up:true  },
  { icon:'📈', label:'Offer Acceptance',     value:'88%',        sub:'of all offers made',     trend:'↑4% vs Q2',         c:'#8b5cf6', up:true  },
  { icon:'🏆', label:'Quality of Hire',      value:'82%',        sub:'manager rating 90d',     trend:'↑3pts vs last yr',  c:'#0891b2', up:true  },
  { icon:'🔄', label:'Attrition Rate',       value:'8.2%',       sub:'voluntary, annualised',  trend:'↓1.4% improvement', c:'#059669', up:true  },
  { icon:'💼', label:'Revenue per Hire',     value:'NPR 2.4Cr',  sub:'annualised contribution',trend:'↑18% vs last yr',   c:'#10b981', up:true  },
]

const DEPT_HC = [
  { dept:'Technology',  current:82, open:9, budget:90,  attritionRisk:3 },
  { dept:'Finance',     current:34, open:2, budget:36,  attritionRisk:1 },
  { dept:'HR',          current:18, open:1, budget:20,  attritionRisk:0 },
  { dept:'Marketing',   current:22, open:2, budget:25,  attritionRisk:2 },
  { dept:'Operations',  current:68, open:5, budget:72,  attritionRisk:4 },
  { dept:'Sales',       current:41, open:2, budget:44,  attritionRisk:2 },
  { dept:'Customer Svc',current:19, open:0, budget:20,  attritionRisk:1 },
]

const FORECAST = [
  { month:'Shrawan',  planned:4, projected_cost:180000 },
  { month:'Bhadra',   planned:6, projected_cost:270000 },
  { month:'Ashwin',   planned:8, projected_cost:360000 },
  { month:'Kartik',   planned:3, projected_cost:135000 },
]

const RECRUITER_PERF = [
  { name:'Maya Pradhan',    hires:12, time_to_hire:16, cost_per_hire:38000, nps:82, target_hit:true  },
  { name:'Anita Gurung',    hires:9,  time_to_hire:21, cost_per_hire:47000, nps:76, target_hit:true  },
  { name:'Bikash Shrestha', hires:14, time_to_hire:14, cost_per_hire:32000, nps:88, target_hit:true  },
  { name:'Ramesh Koirala',  hires:6,  time_to_hire:28, cost_per_hire:58000, nps:68, target_hit:false },
]

function SBar({ val, max, color='#3b82f6' }) {
  return (
    <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
      <div style={{ width:Math.round(val/max*100)+'%', height:'100%', background:color, borderRadius:4, transition:'width .4s' }}/>
    </div>
  )
}

export default function ATSExecutiveDashPage() {
  const { navigate } = useApp()
  const [period, setPeriod] = useState('FY 2081')
  const [tab, setTab] = useState('overview')

  const totalBudget = DEPT_HC.reduce((s,d) => s + d.budget, 0)
  const totalCurrent = DEPT_HC.reduce((s,d) => s + d.current, 0)
  const totalOpen = DEPT_HC.reduce((s,d) => s + d.open, 0)
  const forecastCost = FORECAST.reduce((s,f) => s + f.projected_cost, 0)

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0891b2 100%)', borderRadius:14, padding:'18px 24px', marginBottom:16, color:'#fff', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.04)' }}/>
        <div style={{ position:'absolute', bottom:-40, right:120, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.03)' }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:11, opacity:.6, marginBottom:4, letterSpacing:'.08em', textTransform:'uppercase' }}>eLogix HRMS · Executive Command</div>
            <h2 style={{ margin:0, fontSize:22, fontWeight:900 }}>Executive Dashboard</h2>
            <p style={{ margin:'4px 0 0', fontSize:10, opacity:.7 }}>Board-level hiring intelligence · Workforce planning · Cost analytics · Recruiter performance</p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding:'7px 12px', borderRadius:8, border:'none', background:'rgba(255,255,255,.15)', color:'#fff', fontSize:9, outline:'none' }}>
              {['FY 2081','Q4 2081','Q3 2081','Last 12 Months'].map(p => <option key={p} style={{ color:'#000' }}>{p}</option>)}
            </select>
            <button onClick={() => alert('Board report exported!')} style={{ padding:'7px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,.3)', background:'transparent', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>
              Export Board Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:10, marginBottom:18 }}>
        {KPI.map((k,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:13, padding:'14px 16px', border:'1px solid #f1f5f9', boxShadow:'0 1px 6px rgba(0,0,0,.05)' }}>
            <div style={{ fontSize:22, marginBottom:8 }}>{k.icon}</div>
            <div style={{ fontSize:20, fontWeight:900, color:k.c, marginBottom:3 }}>{k.value}</div>
            <div style={{ fontSize:9, fontWeight:700, color:'#0f172a', marginBottom:2 }}>{k.label}</div>
            <div style={{ fontSize:8, color:'#94a3b8', marginBottom:4 }}>{k.sub}</div>
            <div style={{ fontSize:8, fontWeight:700, color:k.up?'#059669':'#ef4444' }}>{k.trend}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {[['overview','Overview'],['workforce','Workforce Planning'],['cost','Cost Analysis'],['recruiters','Recruiter Performance'],['forecast','Hiring Forecast']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'8px 14px', borderRadius:9, border:`1.5px solid ${tab===t?'#0891b2':'#e2e8f0'}`, background:tab===t?'#ecfeff':'#fff', color:tab===t?'#0891b2':'#64748b', fontSize:10, fontWeight:tab===t?800:400, cursor:'pointer' }}>{l}</button>
        ))}
      </div>

      {tab==='overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {/* Dept headcount */}
          <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:14 }}>Department Headcount vs Budget</div>
            {DEPT_HC.map((d,i) => (
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, marginBottom:4 }}>
                  <span style={{ fontWeight:600, color:'#334155' }}>{d.dept}</span>
                  <div style={{ display:'flex', gap:10 }}>
                    {d.open > 0 && <span style={{ color:'#f59e0b', fontWeight:700 }}>{d.open} open</span>}
                    {d.attritionRisk > 2 && <span style={{ color:'#ef4444', fontWeight:700 }}>⚠ risk</span>}
                    <span style={{ color:'#1e40af', fontWeight:800 }}>{d.current}/{d.budget}</span>
                  </div>
                </div>
                <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden', position:'relative' }}>
                  <div style={{ width:Math.round(d.current/d.budget*100)+'%', height:'100%', background: d.current/d.budget > 0.95 ? '#ef4444' : d.current/d.budget > 0.85 ? '#f59e0b' : '#3b82f6', borderRadius:4 }}/>
                </div>
              </div>
            ))}
            <div style={{ marginTop:14, padding:'10px 12px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', fontSize:10 }}>
              <span style={{ color:'#64748b' }}>Total Headcount</span>
              <span style={{ fontWeight:900, color:'#0f172a' }}>{totalCurrent} / {totalBudget} ({Math.round(totalCurrent/totalBudget*100)}% filled)</span>
            </div>
          </div>

          {/* AI Insights for Board */}
          <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:14 }}>AI Board Insights</div>
            {[
              { level:'Critical', color:'#ef4444', bg:'#fef2f2', msg:'Technology team at 91% capacity. 9 open roles at risk of delaying Q4 product launch. Recommend emergency hiring budget of NPR 12L.' },
              { level:'Warning',  color:'#f59e0b', bg:'#fffbeb', msg:'Operations has 4 high-attrition-risk employees. Average tenure below 18 months. Retention intervention recommended.' },
              { level:'Positive', color:'#059669', bg:'#f0fdf4', msg:'Time-to-hire improved 31% YoY. Cost-per-hire down 15%. AI screening has eliminated 340 hours of manual CV review.' },
              { level:'Forecast', color:'#1e40af', bg:'#eff6ff', msg:'At current growth rate, headcount will exceed approved budget ceiling in Chaitra. Recommend budget revision before Q1 2082.' },
            ].map((ins, i) => (
              <div key={i} style={{ background:ins.bg, borderRadius:9, padding:'10px 13px', marginBottom:8, border:`1px solid ${ins.color}20` }}>
                <div style={{ fontSize:8, fontWeight:800, color:ins.color, marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em' }}>{ins.level}</div>
                <div style={{ fontSize:9, color:'#334155', lineHeight:1.6 }}>{ins.msg}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='workforce' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:14 }}>Headcount Gap Analysis</div>
              <div style={{ background:'#1e3a5f', color:'#fff', display:'grid', gridTemplateColumns:'130px 60px 60px 60px 70px', padding:'8px 12px', fontSize:9, fontWeight:700, gap:8, borderRadius:'8px 8px 0 0' }}>
                {['Department','Current','Budget','Gap','Attrition Risk'].map(h => <div key={h} style={{ textAlign:h!=='Department'?'center':'left' }}>{h}</div>)}
              </div>
              {DEPT_HC.map((d,i) => {
                const gap = d.budget - d.current
                return (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'130px 60px 60px 60px 70px', padding:'9px 12px', borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#f8fafc', gap:8, alignItems:'center' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'#0f172a' }}>{d.dept}</div>
                    <div style={{ textAlign:'center', fontSize:12, fontWeight:700, color:'#1e40af' }}>{d.current}</div>
                    <div style={{ textAlign:'center', fontSize:12, fontWeight:700, color:'#64748b' }}>{d.budget}</div>
                    <div style={{ textAlign:'center', fontSize:12, fontWeight:900, color:gap>5?'#ef4444':gap>2?'#f59e0b':'#059669' }}>
                      {gap > 0 ? '-'+gap : 'Full'}
                    </div>
                    <div style={{ textAlign:'center' }}>
                      {[...Array(5)].map((_,ri) => (
                        <span key={ri} style={{ color: ri < d.attritionRisk ? '#ef4444' : '#e2e8f0', fontSize:10 }}>●</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:14 }}>90-Day Workforce Plan</div>
              {[
                { action:'Hire 9 Technology roles',        priority:'Critical', owner:'Bikash S.', deadline:'2081-10-15', status:'In Progress' },
                { action:'Operations backfill 3 exits',    priority:'High',     owner:'Maya P.',   deadline:'2081-10-30', status:'Requisition Raised' },
                { action:'Marketing team expansion x2',   priority:'Medium',   owner:'Anita G.',  deadline:'2081-11-15', status:'JD Draft' },
                { action:'HR succession planning — VP',   priority:'Medium',   owner:'Maya P.',   deadline:'2081-12-01', status:'Planning' },
                { action:'Internship batch Q4 (10 hires)',priority:'Low',      owner:'HR Team',   deadline:'2081-12-15', status:'Planned' },
              ].map((p,i) => (
                <div key={i} style={{ padding:'10px 12px', background:'#f8fafc', borderRadius:9, marginBottom:8, border:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#0f172a', flex:1 }}>{p.action}</span>
                    <span style={{ fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:6, background:p.priority==='Critical'?'#fef2f2':p.priority==='High'?'#fff7ed':p.priority==='Medium'?'#fffbeb':'#f8fafc', color:p.priority==='Critical'?'#dc2626':p.priority==='High'?'#c2410c':p.priority==='Medium'?'#92400e':'#64748b' }}>{p.priority}</span>
                  </div>
                  <div style={{ fontSize:8, color:'#94a3b8' }}>Owner: {p.owner} · Deadline: {p.deadline} · {p.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab==='cost' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
            {[
              { l:'Total Hiring Cost YTD', v:'NPR 9,45,000', c:'#1e40af', sub:'All sources, all roles' },
              { l:'Avg Cost per Hire',      v:'NPR 45,000',   c:'#059669', sub:'↓15% vs last year' },
              { l:'Forecast Next 90 Days',  v:'NPR '+Math.round(forecastCost/100)*100, c:'#f59e0b', sub:FORECAST.reduce((s,f)=>s+f.planned,0)+' planned hires' },
            ].map((s,i) => (
              <div key={i} style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #f1f5f9', textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:900, color:s.c }}>{s.v}</div>
                <div style={{ fontSize:10, fontWeight:700, color:'#0f172a', marginTop:4 }}>{s.l}</div>
                <div style={{ fontSize:8, color:'#94a3b8' }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:14 }}>Cost by Source Channel</div>
            {[
              { src:'LinkedIn',      cost:96000,  hires:8, cph:12000  },
              { src:'Indeed',        cost:32000,  hires:4, cph:8000   },
              { src:'MeroJob',       cost:9000,   hires:3, cph:3000   },
              { src:'Referrals',     cost:15000,  hires:4, cph:3750   },
              { src:'Career Portal', cost:0,      hires:6, cph:0      },
              { src:'Agencies',      cost:450000, hires:6, cph:75000  },
            ].map((s,i) => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f8fafc', flexWrap:'wrap' }}>
                <div style={{ width:100, fontSize:9, fontWeight:700, color:'#0f172a' }}>{s.src}</div>
                <div style={{ flex:1 }}>
                  <SBar val={s.cost} max={450000} color={s.cost===0?'#10b981':'#3b82f6'}/>
                </div>
                <div style={{ textAlign:'right', minWidth:140 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'#1e40af' }}>{s.cost===0?'Free':'NPR '+s.cost.toLocaleString()}</span>
                  <span style={{ fontSize:8, color:'#94a3b8', marginLeft:8 }}>{s.hires} hires · CPH: {s.cph===0?'Free':'NPR '+s.cph.toLocaleString()}</span>
                </div>
              </div>
            ))}
            <div style={{ marginTop:12, padding:'9px 12px', background:'#fffbeb', borderRadius:8, border:'1px solid #fde68a', fontSize:9, color:'#92400e' }}>
              Agencies are 15x more expensive per hire than Career Portal. AI screening reduces agency dependency — projected 40% agency cost reduction in FY 2082.
            </div>
          </div>
        </div>
      )}

      {tab==='recruiters' && (
        <div>
          <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:14 }}>Recruiter Performance Leaderboard</div>
            <div style={{ background:'#1e3a5f', color:'#fff', display:'grid', gridTemplateColumns:'140px 70px 90px 100px 80px 80px', padding:'9px 14px', fontSize:9, fontWeight:700, gap:8, borderRadius:'8px 8px 0 0' }}>
              {['Recruiter','Hires','Time to Hire','Cost/Hire','NPS','Target'].map(h => <div key={h} style={{ textAlign:h!=='Recruiter'?'center':'left' }}>{h}</div>)}
            </div>
            {RECRUITER_PERF.sort((a,b) => b.hires - a.hires).map((r,i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'140px 70px 90px 100px 80px 80px', padding:'11px 14px', borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#f8fafc', gap:8, alignItems:'center' }}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:i===0?'#fef9c3':i===1?'#f1f5f9':i===2?'#fff7ed':'#f8fafc', border:`2px solid ${i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':'#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0 }}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </div>
                  <span style={{ fontSize:9, fontWeight:700, color:'#0f172a' }}>{r.name}</span>
                </div>
                <div style={{ textAlign:'center', fontSize:16, fontWeight:900, color:'#1e40af' }}>{r.hires}</div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:r.time_to_hire<=18?'#059669':'#f59e0b' }}>{r.time_to_hire}d</div>
                  <SBar val={30-r.time_to_hire} max={20} color={r.time_to_hire<=18?'#059669':'#f59e0b'}/>
                </div>
                <div style={{ textAlign:'center', fontSize:11, fontWeight:700, color:r.cost_per_hire<=40000?'#059669':'#f59e0b' }}>
                  NPR {r.cost_per_hire.toLocaleString()}
                </div>
                <div style={{ textAlign:'center', fontSize:13, fontWeight:900, color:r.nps>=80?'#059669':'#f59e0b' }}>{r.nps}</div>
                <div style={{ textAlign:'center' }}>
                  <span style={{ fontSize:9, fontWeight:800, padding:'3px 9px', borderRadius:7, background:r.target_hit?'#d1fae5':'#fee2e2', color:r.target_hit?'#065f46':'#dc2626' }}>{r.target_hit?'On Track':'Below'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='forecast' && (
        <div>
          <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:4 }}>Hiring Forecast — Next 4 Months</div>
            <div style={{ fontSize:9, color:'#64748b', marginBottom:16 }}>Based on approved headcount plan + attrition risk + seasonal patterns</div>
            <div style={{ display:'flex', gap:12, alignItems:'flex-end', height:160, marginBottom:14 }}>
              {FORECAST.map((f,i) => (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{ fontSize:10, fontWeight:900, color:'#1e40af' }}>{f.planned}</div>
                  <div style={{ width:'100%', background:'linear-gradient(180deg,#3b82f6,#1e40af)', borderRadius:'6px 6px 0 0', height:Math.round(f.planned/10*120)+'px', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:4 }}>
                    <span style={{ fontSize:8, color:'rgba(255,255,255,.7)' }}>hires</span>
                  </div>
                  <div style={{ fontSize:9, color:'#64748b', fontWeight:600 }}>{f.month}</div>
                  <div style={{ fontSize:8, color:'#94a3b8' }}>NPR {(f.projected_cost/1000).toFixed(0)}K</div>
                </div>
              ))}
            </div>
            <div style={{ background:'#f0fdf4', borderRadius:9, padding:'10px 14px', border:'1px solid #bbf7d0', fontSize:9, color:'#065f46' }}>
              Total planned hires: <strong>{FORECAST.reduce((s,f)=>s+f.planned,0)}</strong> · Projected cost: <strong>NPR {forecastCost.toLocaleString()}</strong> · Recommended budget release: <strong>Q4 2081</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

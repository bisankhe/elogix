// FILE: WorklifeBalancePage.jsx — Work-Life Balance Dashboard
// Research-backed metrics: workload, overtime, burnout risk, satisfaction scores
import { useState } from 'react'
const G = 'linear-gradient(135deg,#064e3b 0%,#10b981 60%,#6ee7b7 100%)'
const A = '#10b981'

const METRICS = [
  { label:'Avg Work Hours/Week',  value:'44.2h',  bench:'40h',  status:'warning', icon:'⏰', color:'#f59e0b', trend:'+2h vs last month' },
  { label:'Overtime Rate',        value:'22%',    bench:'<15%', status:'risk',    icon:'🔴', color:'#ef4444', trend:'↑5% vs last quarter' },
  { label:'Leave Utilization',    value:'67%',    bench:'>80%', status:'warning', icon:'🏖️', color:'#f59e0b', trend:'Many not using full leave' },
  { label:'Remote Work Days/mo',  value:'4.2d',   bench:'5-8d', status:'ok',      icon:'🏠', color:'#3b82f6', trend:'↑ vs last year' },
  { label:'Meeting Hours/Week',   value:'12.4h',  bench:'<10h', status:'risk',    icon:'📋', color:'#ef4444', trend:'Too many meetings' },
  { label:'Focus/Deep Work hrs',  value:'18h/wk', bench:'>20h', status:'warning', icon:'🎯', color:'#f59e0b', trend:'Fragmented by meetings' },
  { label:'eNPS Score',           value:'38',     bench:'>50',  status:'warning', icon:'⭐', color:'#8b5cf6', trend:'Improving (+4 vs Q2)' },
  { label:'Wellness Program Part.', value:'54%',  bench:'>70%', status:'warning', icon:'💪', color:'#f59e0b', trend:'New programs added Q3' },
]
const DEPT_SCORES = [
  { dept:'IT',          wlb:62, overtime:28, stress:'High',   topIssue:'Too many meetings & on-call',  color:'#ef4444' },
  { dept:'Finance',     wlb:71, overtime:22, stress:'Medium', topIssue:'Month-end crunch',              color:'#f59e0b' },
  { dept:'HR',          wlb:78, overtime:12, stress:'Low',    topIssue:'High employee volume',          color:'#10b981' },
  { dept:'Marketing',   wlb:74, overtime:15, stress:'Low',    topIssue:'Campaign deadlines',            color:'#10b981' },
  { dept:'Operations',  wlb:58, overtime:35, stress:'High',   topIssue:'Shift work & physical demands', color:'#ef4444' },
  { dept:'Admin',       wlb:82, overtime:5,  stress:'Low',    topIssue:'Limited growth opportunities',  color:'#10b981' },
]
const BURNOUT = [
  {range:'Low Risk (WLB 75+)',   count:32, pct:27, color:'#10b981'},
  {range:'Medium Risk (50–74)',  count:58, pct:49, color:'#f59e0b'},
  {range:'High Risk (<50)',      count:30, pct:25, color:'#ef4444'},
]
const INITIATIVES = [
  {icon:'🏖️',title:'Mandatory Leave',    desc:'Employees must use min 15 days AL per year (Nepal Labour Act)',status:'Active'},
  {icon:'🏠',title:'Flexible Work',       desc:'1 WFH day per week for eligible roles',                       status:'Active'},
  {icon:'🧘',title:'Wellness Wednesdays', desc:'30-min wellness session every Wednesday noon',                status:'Active'},
  {icon:'📵',title:'No-Meeting Fridays',  desc:'Friday afternoons reserved for deep work',                   status:'Pilot'},
  {icon:'💆',title:'EAP — Counseling',   desc:'Free 3 sessions/year with external counselor',                status:'Coming Q4'},
]

export default function WorklifeBalancePage() {
  const [tab, setTab] = useState('overview')
  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff'}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:900}}>⚖️ Work-Life Balance Dashboard</h2>
        <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>Workload · Overtime · Burnout Risk · Satisfaction · Wellness Initiatives · Nepal Labour Act compliance</p>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {['overview','by-dept','burnout','initiatives'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'8px 18px',borderRadius:9,border:tab!==t?'1px solid #e2e8f0':'none',background:tab===t?A:'#fff',color:tab===t?'#fff':'#475569',fontSize:10,fontWeight:tab===t?800:400,cursor:'pointer'}}>
            {t==='overview'?'📊 Overview':t==='by-dept'?'🏢 By Department':t==='burnout'?'🔥 Burnout Risk':'🌱 Initiatives'}
          </button>
        ))}
      </div>

      {tab==='overview'&&(
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10,marginBottom:14}}>
            {METRICS.map(m=>(
              <div key={m.label} style={{background:'#fff',borderRadius:12,border:`1px solid ${m.color}30`,padding:'14px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:18}}>{m.icon}</span>
                  <span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,background:m.status==='ok'?'#d1fae5':m.status==='warning'?'#fef9c3':'#fee2e2',color:m.status==='ok'?'#059669':m.status==='warning'?'#b45309':'#dc2626'}}>{m.status==='ok'?'✅ Good':m.status==='warning'?'⚠️ Fair':'🔴 Risk'}</span>
                </div>
                <div style={{fontSize:22,fontWeight:900,color:m.color}}>{m.value}</div>
                <div style={{fontSize:10,fontWeight:700,color:'#374151',marginTop:2}}>{m.label}</div>
                <div style={{fontSize:8,color:'#94a3b8',marginTop:3}}>Benchmark: {m.bench}</div>
                <div style={{fontSize:8,color:m.color,marginTop:2}}>{m.trend}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'14px 18px',fontSize:10,color:'#92400e'}}>
            ⚖️ <strong>Nepal Labour Act 2074 — Key Obligations:</strong> Max 48 hours/week · Overtime at 1.5x rate · Mandatory 12 days annual leave · 5 days sick leave · 15 days maternity leave (at least). HR must track and ensure compliance.
          </div>
        </>
      )}

      {tab==='by-dept'&&(
        <div style={{display:'grid',gap:10}}>
          {DEPT_SCORES.map(d=>(
            <div key={d.dept} style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'14px 18px',display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{flex:'0 0 120px'}}>
                <div style={{fontWeight:800,fontSize:12,color:'#0f172a'}}>{d.dept}</div>
                <div style={{fontSize:9,color:'#64748b',marginTop:2}}>Top issue: {d.topIssue}</div>
              </div>
              <div style={{flex:1,minWidth:180}}>
                <div style={{fontSize:9,marginBottom:4,color:'#64748b'}}>WLB Score</div>
                <div style={{height:14,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}>
                  <div style={{height:'100%',width:d.wlb+'%',background:d.color,borderRadius:7,transition:'width .4s'}}/>
                </div>
              </div>
              <div style={{textAlign:'center',minWidth:60}}>
                <div style={{fontSize:22,fontWeight:900,color:d.color}}>{d.wlb}</div>
                <div style={{fontSize:8,color:'#94a3b8'}}>WLB Score</div>
              </div>
              <div style={{textAlign:'center',minWidth:60}}>
                <div style={{fontSize:18,fontWeight:900,color:'#ef4444'}}>{d.overtime}%</div>
                <div style={{fontSize:8,color:'#94a3b8'}}>Overtime</div>
              </div>
              <span style={{fontSize:9,fontWeight:700,padding:'4px 12px',borderRadius:20,background:d.color+'18',color:d.color}}>{d.stress} Stress</span>
            </div>
          ))}
        </div>
      )}

      {tab==='burnout'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
            {BURNOUT.map(b=>(
              <div key={b.range} style={{background:'#fff',borderRadius:12,border:`2px solid ${b.color}30`,padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:28,fontWeight:900,color:b.color,marginBottom:4}}>{b.count}</div>
                <div style={{fontSize:10,fontWeight:700,color:'#374151'}}>{b.range}</div>
                <div style={{fontSize:20,fontWeight:800,color:b.color,marginTop:4}}>{b.(pct||0)}%</div>
                <div style={{height:6,background:'#f1f5f9',borderRadius:3,marginTop:8,overflow:'hidden'}}>
                  <div style={{height:'100%',width:b.(pct||0)+'%',background:b.color,borderRadius:3}}/>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔥 Burnout Risk Factors</div>
            {[['Excessive Overtime (>48h/week)','32 employees','#ef4444'],['Unused Annual Leave (>15 days remaining)','18 employees','#f59e0b'],['No WFH access','24 employees','#f59e0b'],['No wellness program participation','54 employees','#94a3b8'],['High-stress department (Ops/IT)','30 employees','#ef4444']].map(([f,c,col])=>(
              <div key={f} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f1f5f9',fontSize:10}}>
                <span style={{color:'#374151'}}>{f}</span>
                <span style={{fontWeight:700,color:col}}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='initiatives'&&(
        <div style={{display:'grid',gap:10}}>
          {INITIATIVES.map(i=>(
            <div key={i.title} style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'14px 18px',display:'flex',gap:14,alignItems:'center'}}>
              <div style={{width:46,height:46,borderRadius:12,background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{i.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{i.title}</div>
                <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{i.desc}</div>
              </div>
              <span style={{fontSize:9,fontWeight:700,padding:'4px 12px',borderRadius:20,flexShrink:0,
                background:i.status==='Active'?'#d1fae5':i.status==='Pilot'?'#fef9c3':'#f1f5f9',
                color:i.status==='Active'?'#059669':i.status==='Pilot'?'#b45309':'#94a3b8'}}>{i.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

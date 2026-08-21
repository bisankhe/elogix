// FILE: RiskAlertsPage.jsx - Risk Alerts
// (Compliance & Risk Management > Risk Management)
// The unified, configurable alert feed spanning EVERY risk domain --
// pure aggregation, never a duplicate alert engine per category. Each
// alert ships with a direct "resolve" action, addressing the brief's
// explicit "lack of remediation workflow" pain point.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const DOMAIN_COLORS = { Compliance:'#0284c7',Payroll:'#c2410c',Attrition:'#4338ca',Security:'#15803d' }

const ALERTS = [
  {id:'a1',domain:'Attrition',title:'3 High-Risk Exits Identified',detail:'Engineering team flight-risk score crossed threshold this week',severity:'high',time:'2 hours ago'},
  {id:'a2',domain:'Payroll',title:'Overtime Exceeds Threshold',detail:'Gita Maharjan logged 22h overtime this week -- approaching the 24h statutory cap',severity:'high',time:'5 hours ago'},
  {id:'a3',domain:'Compliance',title:'Work Permit Expiring',detail:'2 foreign-national work permits expire within 30 days',severity:'medium',time:'1 day ago'},
  {id:'a4',domain:'Security',title:'Unusual Login Pattern',detail:'Payroll data accessed outside business hours from a new device',severity:'high',time:'1 day ago'},
]

export default function RiskAlertsPage() {
  const [search, setSearch] = useState('')
  const [filterDomain, setFilterDomain] = useState('all')
  const [ctx, setCtx] = useState(null)

  const filtered = ALERTS.filter(a=>{
    if (filterDomain!=='all'&&a.domain!==filterDomain) return false
    if (search&&!a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const highCount = ALERTS.filter(a=>a.severity==='high').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔔" title="Risk Alerts"
        breadcrumb="Compliance & Risk Management > Risk Management"
        gradient={G}
        stats={[
          {icon:'🔔',label:'Active Alerts',  value:ALERTS.length},
          {icon:'🔴',label:'High Severity',     value:highCount},
          {icon:'🧩',label:'Domains Reporting',    value:[...new Set(ALERTS.map(a=>a.domain))].length},
          {icon:'⚙',label:'Configure Rules',          value:'Available'},
        ]}
        onAdd={()=>{}} addLabel="Configure Alert Rule"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Every Alert Has a Resolve Path:</strong> No alert here is just a notification -- each one links directly to the action needed to close it, addressing the "alert fatigue with no remediation" problem head-on.</div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search alerts..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          {['all','Compliance','Payroll','Attrition','Security'].map(d=>(
            <button key={d} onClick={()=>setFilterDomain(d)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,whiteSpace:'nowrap',
                background:filterDomain===d?'#fff':'transparent',color:filterDomain===d?A:'#64748b',
                fontWeight:filterDomain===d?700:400,boxShadow:filterDomain===d?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {d==='all'?'All':d}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(a=>{
          const dc = DOMAIN_COLORS[a.domain]
          return (
            <div key={a.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.title,...a,impact_links:[a.domain+' Risk']}})}}
              style={{background:'#fff',border:`1px solid ${a.severity==='high'?'#fecaca':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                  <span style={{background:`${dc}15`,color:dc,fontSize:7,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{a.domain}</span>
                  {a.severity==='high'&&<span style={{fontSize:7,fontWeight:700,color:'#dc2626'}}>🔴 HIGH</span>}
                </div>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{a.title}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{a.detail}</div>
                <div style={{fontSize:8,color:'#cbd5e1',marginTop:4}}>{a.time}</div>
              </div>
              <button style={{padding:'7px 16px',borderRadius:9,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer',flexShrink:0}}>Resolve {'>'}</button>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Alert rules are configurable per domain -- never a one-size-fits-all threshold that buries real signals in noise.','Resolving an alert here updates the source record directly -- never a disconnected acknowledgment that fixes nothing.','Critical alerts route to the right manager automatically based on reporting line, never sitting in a generic inbox.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'✅',label:'Resolve',key:'resolve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

// FILE: VendorPerformancePage.jsx - Vendor Performance Scorecards
// Weighted KPIs: Quality 40%, Delivery 25%, Cost 20%, Service 15%

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#312e81 0%,#4f46e5 60%,#818cf8 100%)'
const A = '#4f46e5'

const SCORECARDS = [
  { id:'sc1', vendor_code:'VND-001', vendor_name:'ShieldGuard Nepal Pvt. Ltd.',
    service:'Security Services', period:'H1 2025', tier:'preferred',
    kpis:{
      quality:   {score:92, target:85, weight:40, label:'Quality / Incident Rate'},
      delivery:  {score:97, target:90, weight:25, label:'Delivery / Fill Rate'},
      cost:      {score:88, target:90, weight:20, label:'Cost Efficiency'},
      service:   {score:94, target:85, weight:15, label:'Responsiveness'},
    },
    overall_score:93, overall_risk:'low', trend:'improving',
    sla_compliance:96, incidents:0, response_time_hrs:1.2,
    renewal_recommendation:'Renew with expanded scope',
    ai_summary:'Excellent performer across all 4 KPI dimensions. Eligible for Preferred Tier extension.',
    last_review:'2025-06-01', next_review:'2025-12-01',
    impact_links:['SLA Contract','Vendor Billing','Clearance'] },
  { id:'sc2', vendor_code:'VND-002', vendor_name:'CleanPro Services Nepal',
    service:'Housekeeping', period:'H1 2025', tier:'approved',
    kpis:{
      quality:   {score:85, target:85, weight:40, label:'Cleanliness Standards'},
      delivery:  {score:91, target:90, weight:25, label:'Coverage Rate'},
      cost:      {score:92, target:90, weight:20, label:'Cost vs Budget'},
      service:   {score:79, target:85, weight:15, label:'Complaint Resolution'},
    },
    overall_score:87, overall_risk:'low', trend:'stable',
    sla_compliance:88, incidents:2, response_time_hrs:3.5,
    renewal_recommendation:'Renew with service improvement clause',
    ai_summary:'Good performance. Service responsiveness below target. Address complaint resolution.',
    last_review:'2025-06-01', next_review:'2025-12-01',
    impact_links:['SLA Contract','Vendor Billing'] },
  { id:'sc3', vendor_code:'VND-003', vendor_name:'TechStaff Solutions Pvt.',
    service:'IT Support Staff', period:'H1 2025', tier:'approved',
    kpis:{
      quality:   {score:72, target:85, weight:40, label:'Skill Match / Quality'},
      delivery:  {score:88, target:90, weight:25, label:'Availability Rate'},
      cost:      {score:61, target:90, weight:20, label:'Cost vs Contract'},
      service:   {score:75, target:85, weight:15, label:'SLA Response'},
    },
    overall_score:73, overall_risk:'high', trend:'declining',
    sla_compliance:74, incidents:4, response_time_hrs:6.5,
    renewal_recommendation:'Performance review required before renewal',
    ai_summary:'ALERT: Cost KPI at 61% due to billing rate discrepancy. Quality slipping. Formal warning recommended.',
    last_review:'2025-06-01', next_review:'2025-08-01',
    impact_links:['Compliance Alert','Vendor Billing','SLA Contract','Clearance'] },
  { id:'sc4', vendor_code:'VND-004', vendor_name:'SalaryExpert Payroll Nepal',
    service:'Payroll Processing', period:'H1 2025', tier:'preferred',
    kpis:{
      quality:   {score:99, target:99.5, weight:40, label:'Payroll Accuracy'},
      delivery:  {score:100,target:100,  weight:25, label:'On-time Delivery'},
      cost:      {score:95, target:90,   weight:20, label:'Value for Money'},
      service:   {score:98, target:95,   weight:15, label:'Support Response'},
    },
    overall_score:99, overall_risk:'low', trend:'stable',
    sla_compliance:99, incidents:0, response_time_hrs:0.5,
    renewal_recommendation:'Renew long-term (3+ years)',
    ai_summary:'Near-perfect scorecard. Market-best payroll accuracy. Strategic long-term partner.',
    last_review:'2025-06-01', next_review:'2025-12-01',
    impact_links:['SLA Contract','Finance','Vendor Billing'] },
]

const TREND = {improving:'📈',stable:'➡',declining:'📉'}
const RISK_CFG = {low:{c:'#10b981',bg:'#f0fdf4'},high:{c:'#ef4444',bg:'#fef2f2'},medium:{c:'#f59e0b',bg:'#fffbeb'}}
const CTX = [
  {icon:'👁',label:'View Full Scorecard',     key:'view'},
  {icon:'📊',label:'KPI Drill-Down',          key:'kpi'},
  {icon:'⚠',label:'Issue Warning Letter',     key:'warn'},
  {icon:'🔄',label:'Schedule Review',         key:'review'},
  {icon:'📋',label:'View Agreement',          key:'agreement'},
  {icon:'🔗',label:'Impact Analysis',         key:'impact'},
  {icon:'📤',label:'Export Scorecard',        key:'export'},
]

export default function VendorPerformancePage() {
  const [cards, setCards]     = useState(SCORECARDS)
  const [search, setSearch]   = useState('')
  const [filterRisk, setFilterRisk] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]         = useState(null)

  const filtered = cards.filter(c=>{
    if (filterRisk!=='all'&&c.overall_risk!==filterRisk) return false
    if (search&&!c.vendor_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const avgScore  = Math.round(cards.reduce((s,c)=>s+c.overall_score,0)/cards.length)
  const highRisk  = cards.filter(c=>c.overall_risk==='high').length
  const preferred = cards.filter(c=>c.tier==='preferred').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Vendor Performance Scorecards"
        breadcrumb="Organization Management > Vendor / Outsource Management"
        gradient={G}
        stats={[
          {icon:'📊',label:'Avg Score',   value:avgScore+'/100'},
          {icon:'⭐',label:'Preferred Tier',value:preferred},
          {icon:'⚠',label:'High Risk',    value:highRisk},
          {icon:'📋',label:'Scorecards',  value:cards.length},
        ]}
        onAdd={()=>{}} addLabel="Generate Scorecard"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#f5f3ff,#eff6ff)',border:'1px solid #c4b5fd',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Weighted KPI Framework:</strong> Quality 40% + Delivery 25% + Cost 20% + Service 15% = Overall Score. Below 80% triggers formal performance review. Below 70% triggers notice/termination.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search vendor scorecards..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','low','medium','high'].map(r=>(
            <button key={r} onClick={()=>setFilterRisk(r)}
              style={{padding:'8px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,
                background:filterRisk===r?'#fff':'transparent',color:filterRisk===r?A:'#64748b',
                fontWeight:filterRisk===r?700:400,boxShadow:filterRisk===r?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {r==='all'?'All Risk':r.charAt(0).toUpperCase()+r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:16}}>
        {filtered.map(c=>{
          const rc = RISK_CFG[c.overall_risk]||RISK_CFG.low
          const totalWeightedScore = Object.values(c.kpis).reduce((s,k)=>s+k.score*k.weight/100,0)
          return (
            <LuxCard key={c.id} color={A} onClick={()=>setSelected(c)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.vendor_name,...c}})}}>
              <div style={{padding:'16px 16px 10px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:52,height:52,borderRadius:14,background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>📊</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{c.vendor_name}</span>
                    <span style={{background:rc.bg,color:rc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{c.overall_risk} risk</span>
                    <span style={{fontSize:16}}>{TREND[c.trend]}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{c.service} . {c.period}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:28,fontWeight:900,color:c.overall_score>=90?'#10b981':c.overall_score>=80?A:'#ef4444'}}>{c.overall_score}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>OVERALL</div>
                </div>
              </div>

              {/* KPI bars */}
              <div style={{padding:'0 16px 10px'}}>
                {Object.entries(c.kpis).map(([key,kpi])=>{
                  const color = kpi.score>=kpi.target?'#10b981':kpi.score>=kpi.target-10?'#f59e0b':'#ef4444'
                  return (
                    <div key={key} style={{marginBottom:7}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
                        <span style={{color:'#475569'}}>{kpi.label} <span style={{color:'#94a3b8'}}>({kpi.weight}%)</span></span>
                        <span style={{fontWeight:800,color}}>{kpi.score}<span style={{color:'#94a3b8',fontWeight:400}}>/{kpi.target}</span></span>
                      </div>
                      <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden',position:'relative'}}>
                        <div style={{width:`${kpi.target}%`,position:'absolute',height:'100%',borderRight:'2px dashed #94a3b8',opacity:.4}}/>
                        <div style={{width:`${kpi.score}%`,height:'100%',background:color,borderRadius:6,transition:'width .6s ease'}}/>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{padding:'8px 16px',background:'#f8fafc',borderTop:'1px solid #f1f5f9',fontSize:10,color:'#64748b',fontStyle:'italic',lineHeight:1.5}}>
                {c.ai_summary}
              </div>

              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                <span style={{flex:1,fontSize:10,color:'#64748b'}}>SLA: {c.sla_compliance}% . Incidents: {c.incidents} . Resp: {c.response_time_hrs}h</span>
                <button onClick={ev=>{ev.stopPropagation();setSelected(c)}} style={{padding:'6px 12px',borderRadius:8,border:`1px solid ${A}33`,background:'#f5f3ff',color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>Scorecard</button>
                {c.overall_risk==='high'&&<button onClick={ev=>ev.stopPropagation()} style={{padding:'6px 12px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Warn</button>}
              </div>
            </LuxCard>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Vendor Performance" columns={['Vendor Code','Vendor Name','Period','Quality Score','Delivery Score','Cost Score','Service Score','Overall Score','SLA Compliance','Incidents','Risk Level','Recommendation']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Vendor',selected?.vendor_name],['Service',selected?.service],['Period',selected?.period],
        ['Overall Score',selected?.overall_score+'/100'],['Risk Level',selected?.overall_risk],['Trend',selected?.trend],
        ['Quality Score',selected?.kpis?.quality?.score+'/'+selected?.kpis?.quality?.target],
        ['Delivery Score',selected?.kpis?.delivery?.score+'/'+selected?.kpis?.delivery?.target],
        ['Cost Score',selected?.kpis?.cost?.score+'/'+selected?.kpis?.cost?.target],
        ['Service Score',selected?.kpis?.service?.score+'/'+selected?.kpis?.service?.target],
        ['SLA Compliance',selected?.sla_compliance+'%'],['Incidents',selected?.incidents],
        ['Response Time',selected?.response_time_hrs+'h avg'],
        ['Recommendation',selected?.renewal_recommendation],['AI Summary',selected?.ai_summary],
        ['Next Review',selected?.next_review],
      ]}/>
    </div>
  )
}

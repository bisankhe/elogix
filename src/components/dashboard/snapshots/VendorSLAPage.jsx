// FILE: VendorSLAPage.jsx - SLA & Contract Performance Dashboard
// Real-time KPI tracking, auto-breach detection, performance-based penalties

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#312e81 0%,#4f46e5 60%,#818cf8 100%)'
const A = '#4f46e5'

const SLAS = [
  { id:'s1', contract_code:'AGR-2025-001', vendor_code:'REC-001', vendor_name:'MidPoint Staffing Nepal',
    contract_type:'MSA', period:'Jan-Jun 2025', status:'on_track',
    overall_score:96, overall_status:'excellent',
    kpis:[
      {name:'Time-to-Hire',target:21,actual:18,unit:'days',met:true, weight:25,score:100},
      {name:'Quality of Hire (12-mo retention)',target:85,actual:91,unit:'%',met:true,weight:30,score:100},
      {name:'Fill Rate',target:85,actual:88,unit:'%',met:true,weight:25,score:100},
      {name:'Response Time to Job Order',target:4,actual:2,unit:'hrs',met:true,weight:10,score:100},
      {name:'Diversity Placement',target:35,actual:32,unit:'%',met:false,weight:10,score:60},
    ],
    breaches:[], penalties_npr:0, bonuses_npr:25000,
    last_review:'2025-06-01', next_review:'2025-09-01',
    ai_insight:'Excellent performance. Exceeds on 4/5 KPIs. Recommend bonus payment of NPR 25,000.',
    trend:'improving', breach_count:0,
    impact_links:['Vendor Profile','Agreement','Billing','BGV'] },
  { id:'s2', contract_code:'AGR-2025-003', vendor_code:'VND-005', vendor_name:'QuickHire Outsource Pvt.',
    contract_type:'Outsource Agreement', period:'Jan-Jun 2025', status:'breach',
    overall_score:58, overall_status:'critical',
    kpis:[
      {name:'Fill Rate',target:90,actual:95,unit:'%',met:true,weight:20,score:100},
      {name:'Worker Attendance Rate',target:90,actual:78,unit:'%',met:false,weight:25,score:40},
      {name:'SSF Payment Compliance',target:100,actual:0,unit:'%',met:false,weight:30,score:0},
      {name:'Replacement SLA (on departure)',target:3,actual:7,unit:'days',met:false,weight:15,score:30},
      {name:'Invoice Accuracy',target:98,actual:91,unit:'%',met:false,weight:10,score:50},
    ],
    breaches:[
      {kpi:'SSF Payment Compliance',severity:'critical',date:'2025-04-01',action:'Legal notice issued'},
      {kpi:'Worker Attendance Rate',severity:'high',date:'2025-05-15',action:'Warning letter sent'},
    ],
    penalties_npr:45000, bonuses_npr:0,
    last_review:'2025-06-01', next_review:'2025-07-01',
    ai_insight:'CRITICAL: SSF non-compliance triggers Nepal LA2074 Section 64 co-liability. Immediate action required. Consider termination.',
    trend:'declining', breach_count:2,
    impact_links:['Compliance Alert','Labour Act 2074','Agreement','Legal'] },
  { id:'s3', contract_code:'AGR-2024-004', vendor_code:'VND-004', vendor_name:'SalaryExpert Payroll Nepal',
    contract_type:'MSA', period:'Jan-Jun 2025', status:'on_track',
    overall_score:99, overall_status:'excellent',
    kpis:[
      {name:'Payroll Processing Accuracy',target:99.5,actual:99.9,unit:'%',met:true,weight:35,score:100},
      {name:'On-time Payroll Delivery',target:25,actual:24,unit:'day of month',met:true,weight:30,score:100},
      {name:'SSF Filing Accuracy',target:100,actual:100,unit:'%',met:true,weight:20,score:100},
      {name:'Error Rate',target:0.5,actual:0.1,unit:'%',met:true,weight:15,score:100},
    ],
    breaches:[], penalties_npr:0, bonuses_npr:15000,
    last_review:'2025-06-01', next_review:'2025-09-01',
    ai_insight:'Near-perfect performance. Market-best error rate. Eligible for preferred long-term partnership.',
    trend:'stable', breach_count:0,
    impact_links:['Billing','Agreement','Vendor Profile'] },
]

const SCORE_CFG = {
  excellent: {c:'#10b981',bg:'#f0fdf4',label:'Excellent'},
  good:      {c:'#3b82f6',bg:'#eff6ff',label:'Good'},
  average:   {c:'#f59e0b',bg:'#fffbeb',label:'Average'},
  critical:  {c:'#ef4444',bg:'#fef2f2',label:'Critical Breach'},
}
const TREND_ICONS = {improving:'📈',stable:'➡',declining:'📉'}
const CTX_ACTIONS = [
  {icon:'👁',label:'View Full SLA Report',key:'view'},
  {icon:'📊',label:'KPI Drill-Down',key:'kpi'},
  {icon:'⚠',label:'Log SLA Breach',key:'breach'},
  {icon:'💰',label:'Apply Penalty/Bonus',key:'penalty'},
  {icon:'📋',label:'View Agreement',key:'agreement'},
  {icon:'🔔',label:'Escalate to Management',key:'escalate'},
  {icon:'🔗',label:'Impact Analysis',key:'impact'},
  {icon:'📤',label:'Export Report',key:'export'},
]

export default function VendorSLAPage() {
  const [slas, setSLAs] = useState(SLAS)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = slas.filter(s=>{
    if (filterStatus!=='all'&&s.status!==filterStatus) return false
    if (search&&!s.vendor_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const breachCount = slas.reduce((s,sl)=>s+sl.breach_count,0)
  const avgScore = Math.round(slas.reduce((s,sl)=>s+sl.overall_score,0)/slas.length)
  const totalPenalties = slas.reduce((s,sl)=>s+sl.penalties_npr,0)
  const totalBonuses = slas.reduce((s,sl)=>s+sl.bonuses_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="SLA & Contract Performance"
        breadcrumb="Organization Management > Vendor / Outsource Management"
        gradient={G}
        stats={[
          {icon:'📊',label:'Avg SLA Score',   value:avgScore+'%'},
          {icon:'⚠',label:'Active Breaches',  value:breachCount},
          {icon:'💸',label:'Penalties Applied',value:'NPR '+(totalPenalties/1000).toFixed(0)+'K'},
          {icon:'🎁',label:'Bonuses Earned',   value:'NPR '+(totalBonuses/1000).toFixed(0)+'K'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New SLA Config"
        onExcel={()=>setShowExcel(true)}/>

      {breachCount>0 && (
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#991b1b'}}>
          <span style={{fontSize:18}}>🚨</span>
          <div><strong>{breachCount} SLA breach(es) detected!</strong> Escalation workflows triggered. Nepal Labour Act 2074 Section 64 co-liability may be activated for SSF non-compliance.</div>
        </div>
      )}

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search vendor SLA records..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','on_track','breach','at_risk'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'8px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,
                background:filterStatus===s?'#fff':'transparent',
                color:filterStatus===s?A:'#64748b',fontWeight:filterStatus===s?700:400,
                boxShadow:filterStatus===s?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':s==='on_track'?'On Track':s==='breach'?'In Breach':'At Risk'}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:16}}>
        {filtered.map(sl=>{
          const sc = SCORE_CFG[sl.overall_status]||SCORE_CFG.good
          return (
            <div key={sl.id}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:sl.vendor_name,...sl}})}}
              style={{background:'#fff',border:`1px solid ${sl.status==='breach'?'#fecaca':'#e2e8f0'}`,
                borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,.05)',
                borderLeft:`5px solid ${sc.c}`}}>

              {/* Header */}
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
                <div style={{width:52,height:52,borderRadius:14,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>📊</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{sl.vendor_name}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
                    <span style={{fontSize:16}}>{TREND_ICONS[sl.trend]}</span>
                    {sl.breach_count>0 && <span style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⚠ {sl.breach_count} Breach(es)</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{sl.contract_code} . {sl.contract_type} . Period: {sl.period}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:32,fontWeight:900,color:sc.c}}>{sl.overall_score}</div>
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:700}}>OVERALL SCORE</div>
                </div>
              </div>

              {/* KPI Grid */}
              <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:10}}>KPI Performance</div>
                <div style={{display:'grid',gap:8}}>
                  {sl.kpis.map((kpi,i)=>(
                    <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:10,alignItems:'center',padding:'7px 10px',borderRadius:10,background:kpi.met?'#f0fdf4':'#fef2f2',border:`1px solid ${kpi.met?'#bbf7d0':'#fecaca'}`}}>
                      <div>
                        <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{kpi.name}</span>
                        <span style={{fontSize:9,color:'#94a3b8',marginLeft:8}}>Weight: {kpi.weight}%</span>
                      </div>
                      <div style={{textAlign:'center',fontSize:11,color:'#64748b'}}>
                        Target: <strong>{kpi.target}{kpi.unit==='%'?'%':' '+kpi.unit}</strong>
                      </div>
                      <div style={{textAlign:'center',fontSize:11,fontWeight:700,color:kpi.met?'#10b981':'#ef4444'}}>
                        Actual: {kpi.actual}{kpi.unit==='%'?'%':' '+kpi.unit}
                      </div>
                      <div style={{fontSize:12,fontWeight:800,color:kpi.met?'#10b981':'#ef4444'}}>
                        {kpi.met?'✓':'✗'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breaches */}
              {sl.breaches.length>0 && (
                <div style={{padding:'10px 20px',background:'#fef2f2',borderBottom:'1px solid #fecaca'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#991b1b',marginBottom:6}}>Active Breaches</div>
                  {sl.breaches.map((b,i)=>(
                    <div key={i} style={{fontSize:11,color:'#dc2626',padding:'4px 0',borderBottom:'1px solid #fecaca',display:'flex',justifyContent:'space-between'}}>
                      <span><strong>{b.kpi}</strong> - {b.severity.toUpperCase()} - {b.date}</span>
                      <span style={{color:'#64748b'}}>{b.action}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Penalties/Bonuses + AI */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}>
                <div style={{padding:'12px 20px',borderRight:'1px solid #f1f5f9'}}>
                  <div style={{display:'flex',gap:12}}>
                    {sl.penalties_npr>0 && (
                      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'8px 12px',flex:1}}>
                        <div style={{fontSize:14,fontWeight:900,color:'#dc2626'}}>NPR {(sl.penalties_npr/1000).toFixed(0)}K</div>
                        <div style={{fontSize:9,color:'#94a3b8',fontWeight:700}}>PENALTIES APPLIED</div>
                      </div>
                    )}
                    {sl.bonuses_npr>0 && (
                      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'8px 12px',flex:1}}>
                        <div style={{fontSize:14,fontWeight:900,color:'#15803d'}}>NPR {(sl.bonuses_npr/1000).toFixed(0)}K</div>
                        <div style={{fontSize:9,color:'#94a3b8',fontWeight:700}}>BONUS EARNED</div>
                      </div>
                    )}
                  </div>
                  <div style={{marginTop:8,fontSize:10,color:'#64748b'}}>
                    Last Review: {sl.last_review} . Next: {sl.next_review}
                  </div>
                </div>
                <div style={{padding:'12px 20px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#334155',marginBottom:4}}>AI Recommendation</div>
                  <div style={{fontSize:11,color:'#64748b',fontStyle:'italic'}}>{sl.ai_insight}</div>
                </div>
              </div>

              <div style={{borderTop:'1px solid #f1f5f9',padding:'10px 16px',display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button onClick={()=>setSelected(sl)}
                  style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                  Full Report
                </button>
                {sl.status==='breach' && (
                  <button style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                    Escalate Now
                  </button>
                )}
                <button style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  Generate Report
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* SLA Config Modal */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:700,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Configure SLA for Vendor</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>SMART-R KPI setup. Auto breach detection enabled.</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px',marginBottom:16}}>
                <Field label="Vendor" type="select" value="" onChange={()=>{}} required accent={A}
                  options={['Select vendor...']}/>
                <Field label="Contract Reference" value="" onChange={()=>{}} accent={A}/>
                <Field label="Review Period" type="select" value="" onChange={()=>{}} accent={A}
                  options={['Monthly','Quarterly','Semi-Annual','Annual']}/>
                <Field label="Penalty Rate (%)" type="number" value="" onChange={()=>{}} accent={A} hint="% deducted per breach"/>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:10}}>Define KPIs (SMART-R Framework)</div>
                {['Primary KPI 1','Primary KPI 2','Secondary KPI 1'].map((label,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:8,marginBottom:8,alignItems:'end'}}>
                    <Field label={label} value="" onChange={()=>{}} accent={A}/>
                    <Field label="Target" type="number" value="" onChange={()=>{}} accent={A}/>
                    <Field label="Unit" type="select" value="" onChange={()=>{}} accent={A} options={['%','days','hrs','NPR']}/>
                    <Field label="Weight %" type="number" value="" onChange={()=>{}} accent={A}/>
                  </div>
                ))}
              </div>
              <AIImpact color={A} lines={[
                'AI monitors KPIs in real-time and auto-flags breaches.',
                'Performance-based penalties/bonuses calculated automatically.',
                'Nepal LA2074 Section 64 triggers if SSF/wage KPIs breach.',
                'Monthly AI scorecard generated for each vendor.',
              ]}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Configure SLA</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX_ACTIONS} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel && <ExcelModal title="SLA Performance" columns={['Contract Code','Vendor','Period','Overall Score','KPI 1','KPI 2','KPI 3','Breaches','Penalties','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Contract',selected?.contract_code],['Type',selected?.contract_type],['Period',selected?.period],
        ['Overall Score',selected?.overall_score+'/100'],['Status',selected?.overall_status],
        ['Trend',selected?.trend],['Breaches',selected?.breach_count],
        ['Penalties','NPR '+(selected?.penalties_npr||0)],['Bonuses','NPR '+(selected?.bonuses_npr||0)],
        ['Last Review',selected?.last_review],['Next Review',selected?.next_review],
        ['AI Insight',selected?.ai_insight],
      ]}/>
    </div>
  )
}

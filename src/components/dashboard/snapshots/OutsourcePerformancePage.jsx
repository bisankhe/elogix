// FILE: OutsourcePerformancePage.jsx - Page 6: Vendor Performance Dashboard
import { useState, useEffect } from 'react'
import { ExcelModal, PageHeader, ContextMenu } from './DeptSetupShared.jsx'

const T = { gradient:'linear-gradient(135deg,#7c2d12 0%,#f97316 100%)', accent:'#ea580c', light:'#fff7ed' }

const MOCK_VENDORS = [
  { id:'v1', name:'ShieldGuard Nepal Pvt. Ltd.', service:'Security Services',
    workers:45, contract_end:'2026-12-31', overall_score:91,
    kpis:{
      fill_rate:     {score:96, target:95, met:true,  label:'Fill Rate',        unit:'%', desc:'Workers deployed vs contracted'},
      attendance:    {score:97, target:90, met:true,  label:'Avg Attendance',   unit:'%', desc:'Monthly average'},
      compliance:    {score:94, target:90, met:true,  label:'Legal Compliance', unit:'%', desc:'SSF, insurance, min wage'},
      sla_response:  {score:22, target:30, met:true,  label:'Incident Response',unit:'min',desc:'Average response time (lower=better)'},
      billing_acc:   {score:100,target:98, met:true,  label:'Billing Accuracy', unit:'%', desc:'Invoices without disputes'},
      turnover:      {score:8,  target:15, met:true,  label:'Worker Turnover',  unit:'%', desc:'Annual turnover rate (lower=better)'},
    },
    months_history:[{m:'Apr',s:88},{m:'May',s:90},{m:'Jun',s:91}],
    recommendation:'Renew contract. Top performer. Consider expanding to Pokhara branch.',
    risk:'low', icon:'🔐', color:'#ef4444',
    impact_links:[{icon:'📋',module:'Contract Renewal',desc:'Recommended to renew Dec 2026'},{icon:'💰',module:'Billing',desc:'Zero disputes in 6 months'}],
  },
  { id:'v2', name:'CleanPro Services Nepal', service:'Housekeeping',
    workers:18, contract_end:'2026-06-30', overall_score:84,
    kpis:{
      fill_rate:     {score:90, target:95, met:false, label:'Fill Rate',        unit:'%', desc:'2 positions unfilled'},
      attendance:    {score:91, target:90, met:true,  label:'Avg Attendance',   unit:'%', desc:'Monthly average'},
      compliance:    {score:91, target:90, met:true,  label:'Legal Compliance', unit:'%', desc:'All paid on time'},
      sla_response:  {score:null,target:null,met:true, label:'N/A',             unit:'', desc:'No incidents this period'},
      billing_acc:   {score:100,target:98, met:true,  label:'Billing Accuracy', unit:'%', desc:'No disputes'},
      turnover:      {score:12, target:15, met:true,  label:'Worker Turnover',  unit:'%', desc:'Annual rate'},
    },
    months_history:[{m:'Apr',s:80},{m:'May',s:82},{m:'Jun',s:84}],
    recommendation:'Good performance. Address 2 unfilled positions before renewal discussion.',
    risk:'low', icon:'🧹', color:'#10b981',
    impact_links:[{icon:'⚠',module:'Vacancy',desc:'2 positions unfilled since March'}],
  },
  { id:'v3', name:'TechStaff Solutions Pvt. Ltd.', service:'IT Support Staff',
    workers:12, contract_end:'2026-09-15', overall_score:72,
    kpis:{
      fill_rate:     {score:80, target:95, met:false, label:'Fill Rate',        unit:'%', desc:'3 positions unfilled'},
      attendance:    {score:88, target:90, met:false, label:'Avg Attendance',   unit:'%', desc:'Below target'},
      compliance:    {score:87, target:90, met:false, label:'Legal Compliance', unit:'%', desc:'SSF delay 2 months'},
      sla_response:  {score:6.2,target:4,  met:false, label:'Ticket Resolution',unit:'hr', desc:'L1 tickets exceeding SLA'},
      billing_acc:   {score:92, target:98, met:false, label:'Billing Accuracy', unit:'%', desc:'NPR 15K dispute Jun 2026'},
      turnover:      {score:22, target:15, met:false, label:'Worker Turnover',  unit:'%', desc:'High turnover concern'},
    },
    months_history:[{m:'Apr',s:78},{m:'May',s:75},{m:'Jun',s:72}],
    recommendation:'Performance improving. Issue formal warning for SLA breaches. Require action plan within 30 days.',
    risk:'high', icon:'💻', color:'#3b82f6',
    impact_links:[{icon:'⚠',module:'SLA Breach',desc:'Multiple KPI misses'},{icon:'💰',module:'Billing Dispute',desc:'NPR 15K pending resolution'}],
  },
  { id:'v4', name:'NepCatering Services', service:'Cafeteria & Catering',
    workers:8, contract_end:'2026-03-31', overall_score:62,
    kpis:{
      fill_rate:     {score:80, target:90, met:false, label:'Fill Rate',        unit:'%', desc:'2 positions vacant'},
      attendance:    {score:83, target:88, met:false, label:'Avg Attendance',   unit:'%', desc:'Regularly below target'},
      compliance:    {score:72, target:90, met:false, label:'Legal Compliance', unit:'%', desc:'Insurance not paid 3 months'},
      sla_response:  {score:null,target:null,met:true, label:'N/A',             unit:'', desc:'N/A'},
      billing_acc:   {score:100,target:98, met:true,  label:'Billing Accuracy', unit:'%', desc:'No billing disputes'},
      turnover:      {score:35, target:20, met:false, label:'Worker Turnover',  unit:'%', desc:'Critically high turnover'},
    },
    months_history:[{m:'Apr',s:68},{m:'May',s:65},{m:'Jun',s:62}],
    recommendation:'CRITICAL: Non-compliance with Labour Act 2074 (insurance not paid). Issue termination notice if not resolved within 15 days.',
    risk:'critical', icon:'🍽', color:'#f59e0b',
    impact_links:[{icon:'⚠',module:'Co-Liability',desc:'Main employer risk if workers unpaid'},{icon:'⚖',module:'Labour Act',desc:'Mandatory to report to Labour Office'}],
  },
]

const RISK_COLORS = {
  low:'#10b981', medium:'#f59e0b', high:'#ef4444', critical:'#dc2626'
}

const CONTEXT_ACTIONS = [
  {icon:'👁', label:'View Scorecard',       key:'view'},
  {icon:'📊', label:'Full Dashboard',       key:'dashboard'},
  {icon:'⚠', label:'Issue Warning Letter', key:'warning'},
  {icon:'📋', label:'Renewal Decision',    key:'renewal'},
  {icon:'📤', label:'Export Scorecard',    key:'export'},
  {icon:'🗑', label:'Terminate Contract',  key:'terminate', danger:true},
]


function _getSlug() {
  try {
    const s = JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}
    return s?.company?.slug || s?.tenant || localStorage.getItem('elogix_tenant_slug') || ''
  } catch(_e) { return '' }
}

export default function OutsourcePerformancePage() {
  const [vendors,   ] = useState(MOCK_VENDORS)
  const [_apiLoading, _setApiLoading] = useState(false)
  const [ctx,       setCtx]       = useState(null)
  const [selected,  setSelected]  = useState(null)
  const [showExcel, setShowExcel] = useState(false)


  // SaaS DB — load real tenant data (fallback to mock if no token/API down)
  useEffect(() => {
    const _token = localStorage.getItem('access_token')
    const _slug  = _getSlug()
    if (!_token) return
    _setApiLoading(true)
    fetch('/api/v1/vendor/performance', {
      headers: {
        'Authorization': `Bearer ${_token}`,
        'X-Tenant-Slug': _slug,
        'Content-Type': 'application/json',
      }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const items = d.records || d.data || d.items || []
        if (items.length > 0) setCtx(items)
      })
      .catch(() => {/* keep mock */})
      .finally(() => _setApiLoading(false))
  }, [])

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="📊" title="Vendor Performance"
        breadcrumb="Organization Management > Workforce Configuration > Employment Type > Outsource"
        gradient={T.gradient}
        stats={[
          {icon:'🏆',label:'Top Performer',  value:vendors.reduce((a,v)=>v.overall_score>a.overall_score?v:a,vendors[0]).name.split(' ')[0]},
          {icon:'📊',label:'Avg Score',      value:Math.round(vendors.reduce((s,v)=>s+v.overall_score,0)/vendors.length)+'%'},
          {icon:'⚠', label:'Below Threshold',value:vendors.filter(v=>v.overall_score<80).length+' vendors'},
          {icon:'🚨',label:'Critical Risk',  value:vendors.filter(v=>v.risk==='critical').length+' vendor'},
        ]}
        onAdd={()=>{}} addLabel="Generate Scorecards"
        onExcel={()=>setShowExcel(true)}
      />

      {/* Critical alert */}
      {vendors.filter(v=>v.risk==='critical').map((v,i)=>(
        <div key={i} style={{background:'#fef2f2',border:'2px solid #fecaca',borderRadius:12,
          padding:'12px 16px',marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:800,color:'#dc2626',marginBottom:6}}>
            CRITICAL: {v.name} - Labour Act 2074 Non-Compliance
          </div>
          <div style={{fontSize:11,color:'#991b1b',lineHeight:1.6}}>
            {v.recommendation}<br/>
            <strong>Labour Act 2074 Obligation:</strong> Main employer must report non-payment to Labour Office within 15 days.
          </div>
        </div>
      ))}

      {/* Vendor scorecards */}
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {vendors.map(vendor=>{
          const rc = RISK_COLORS[vendor.risk]
          const kpiList = Object.values(vendor.kpis).filter(k=>k.label!=='N/A')
          const metCount = kpiList.filter(k=>k.met).length
          return (
            <div key={vendor.id}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:vendor.name,...vendor}})}}
              style={{background:'#fff',borderRadius:16,border:`1px solid ${vendor.overall_score<70?'#fecaca':'#e2e8f0'}`,
                boxShadow:'0 2px 8px rgba(0,0,0,.05)',overflow:'hidden',
                borderLeft:`4px solid ${rc}`}}>
              {/* Header */}
              <div style={{padding:'16px 18px',display:'flex',gap:14,alignItems:'center'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${vendor.color}18`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>
                  {vendor.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{vendor.name}</span>
                    <span style={{background:`${rc}18`,color:rc,fontSize:10,fontWeight:700,
                      padding:'2px 8px',borderRadius:20,textTransform:'capitalize'}}>
                      {vendor.risk} Risk
                    </span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>
                    {vendor.service} &bull; {vendor.workers} workers &bull; Contract ends {vendor.contract_end}
                  </div>
                  <div style={{fontSize:11,color:vendor.overall_score>=80?'#15803d':vendor.overall_score>=70?'#b45309':'#dc2626',
                    marginTop:3,fontWeight:600}}>
                    AI Rec: {vendor.recommendation}
                  </div>
                </div>
                {/* Overall score ring */}
                <div style={{flexShrink:0,textAlign:'center'}}>
                  <svg viewBox="0 0 36 36" width={60} height={60}>
                    <circle cx={18} cy={18} r={15} fill="none" stroke="#f1f5f9" strokeWidth={4}/>
                    <circle cx={18} cy={18} r={15} fill="none" stroke={rc}
                      strokeWidth={4}
                      strokeDasharray={`${vendor.overall_score*.942} 100`}
                      strokeLinecap="round" transform="rotate(-90 18 18)"/>
                    <text x={18} y={21} textAnchor="middle" fontSize={8} fontWeight={700}
                      fill={rc}>{vendor.overall_score}</text>
                  </svg>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Score</div>
                </div>
              </div>

              {/* KPI Grid */}
              <div style={{padding:'0 18px 14px',display:'grid',
                gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8}}>
                {kpiList.map((kpi,i)=>(
                  <div key={i} style={{background:kpi.met?'#f0fdf4':'#fef2f2',
                    border:`1px solid ${kpi.met?'#bbf7d0':'#fecaca'}`,borderRadius:10,padding:'8px 10px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:3}}>
                      <div style={{fontSize:10,color:'#64748b',fontWeight:600}}>{kpi.label}</div>
                      <span style={{fontSize:14}}>{kpi.met?'✅':'❌'}</span>
                    </div>
                    <div style={{fontSize:14,fontWeight:900,color:kpi.met?'#15803d':'#dc2626'}}>
                      {kpi.score!=null?kpi.score+kpi.unit:'-'}
                    </div>
                    <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{kpi.desc}</div>
                  </div>
                ))}
              </div>

              {/* Trend + Actions */}
              <div style={{borderTop:'1px solid #f1f5f9',padding:'10px 18px',
                display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <span style={{fontSize:11,color:'#64748b',fontWeight:600}}>Trend:</span>
                  {vendor.months_history.map((h,i)=>(
                    <div key={i} style={{textAlign:'center'}}>
                      <div style={{height:h.s*0.35,width:18,background:
                        h.s>=90?'#10b981':h.s>=80?'#f59e0b':'#ef4444',
                        borderRadius:'3px 3px 0 0',display:'flex',alignItems:'flex-end'}}/>
                      <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{h.m}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:8}}>
                  {vendor.overall_score < 70 && (
                    <button style={{padding:'7px 14px',borderRadius:8,border:'none',
                      background:'#fef2f2',color:'#dc2626',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                      Issue Warning
                    </button>
                  )}
                  {vendor.risk==='critical' && (
                    <button style={{padding:'7px 14px',borderRadius:8,border:'none',
                      background:'#dc2626',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                      Terminate Contract
                    </button>
                  )}
                  <button style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',
                    background:'#fff',color:'#475569',fontSize:11,cursor:'pointer'}}>
                    Download Scorecard
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
        impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
        actions={CONTEXT_ACTIONS}
        onAction={()=>{}} onClose={()=>setCtx(null)} />}
      {showExcel && <ExcelModal title="Vendor Performance"
        columns={['Vendor','Service','Workers','Overall Score','Fill Rate','Attendance','Compliance','Billing Accuracy','Turnover','Risk','Recommendation']}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Importing: '+f.name)} />}
    </div>
  )
}

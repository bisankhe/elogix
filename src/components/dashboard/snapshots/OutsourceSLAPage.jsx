// FILE: OutsourceSLAPage.jsx - Page 2: Outsource SLA & Contract Management

import { useState, useEffect } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const T = { gradient:'linear-gradient(135deg,#0369a1 0%,#0ea5e9 100%)', accent:'#0369a1', light:'#f0f9ff' }

const MOCK_CONTRACTS = [
  { id:'c1', contract_no:'SLA-2024-001', vendor:'ShieldGuard Nepal Pvt. Ltd.',
    service:'Security Services', agency_code:'LS-MoLESS-2024-0012',
    type:'Service Agreement', start:'2024-01-01', end:'2026-12-31',
    value_npr:2700000, workers_allowed:50, workers_deployed:45,
    status:'active', compliance_pct:94, renewal_alert_days:180,
    days_remaining:199,
    sla_kpis:[
      {kpi:'Minimum Fill Rate',   target:'95%',  actual:'96%',  met:true},
      {kpi:'Incident Response',   target:'<30min',actual:'22min',met:true},
      {kpi:'Monthly Attendance',  target:'>90%', actual:'96%',  met:true},
      {kpi:'Certification Valid', target:'100%', actual:'100%', met:true},
    ],
    clauses:['Workers cannot be assigned to core security strategy functions',
             'Agency must maintain NPR 15,000/month minimum wage per Labour Act 2074',
             'Security clearance certificates required for all workers',
             'Agency responsible for PF, SSF, and insurance per Nepal law',
             'Main employer monitors attendance and wage payment monthly'],
    impact_links:[{icon:'💰',module:'Billing',desc:'NPR 225K/mo invoice'},{icon:'📅',module:'Attendance',desc:'Monthly verification'},{icon:'⚖',module:'Labour Act',desc:'Section 52-60 outsource rules'}],
    icon:'🔐', color:'#ef4444',
  },
  { id:'c2', contract_no:'SLA-2024-002', vendor:'CleanPro Services Nepal',
    service:'Housekeeping & Sanitation', agency_code:'LS-MoLESS-2024-0034',
    type:'Service Agreement', start:'2024-07-01', end:'2026-06-30',
    value_npr:864000, workers_allowed:20, workers_deployed:18,
    status:'active', compliance_pct:91, renewal_alert_days:120,
    days_remaining:381,
    sla_kpis:[
      {kpi:'Cleaning Completion Rate',target:'>95%', actual:'93%',  met:false},
      {kpi:'Monthly Attendance',      target:'>88%', actual:'91%',  met:true},
      {kpi:'Compliance Inspection',   target:'Pass', actual:'Pass', met:true},
    ],
    clauses:['Housekeeping limited to non-core facility maintenance',
             'Eco-friendly cleaning products as per EHS policy',
             'Agency must pay workers within 1 month of each month end'],
    impact_links:[{icon:'💰',module:'Billing',desc:'NPR 72K/mo'},{icon:'⚖',module:'Labour Act',desc:'Non-core service compliance'}],
    icon:'🧹', color:'#10b981',
  },
  { id:'c3', contract_no:'SLA-2023-089', vendor:'TechStaff Solutions Pvt. Ltd.',
    service:'IT Support Staff', agency_code:'LS-MoLESS-2023-0089',
    type:'Managed Service', start:'2023-10-01', end:'2026-09-15',
    value_npr:2160000, workers_allowed:15, workers_deployed:12,
    status:'active', compliance_pct:87, renewal_alert_days:90,
    days_remaining:458,
    sla_kpis:[
      {kpi:'Ticket Resolution (L1)',target:'<4hr',actual:'6.2hr',met:false},
      {kpi:'Monthly Attendance',    target:'>85%',actual:'88%',  met:true},
      {kpi:'Skill Certification',   target:'100%',actual:'83%',  met:false},
    ],
    clauses:['IT support limited to helpdesk and hardware - not core development',
             'Workers must not access production databases or source code',
             'Agency provides worker insurance and social security'],
    impact_links:[{icon:'⚠',module:'Co-Employment Risk',desc:'Verify not core IT functions'},{icon:'💰',module:'Billing',desc:'NPR 180K/mo'}],
    icon:'💻', color:'#3b82f6',
  },
  { id:'c4', contract_no:'SLA-2023-156', vendor:'NepCatering Services',
    service:'Cafeteria & Catering', agency_code:'LS-MoLESS-2023-0156',
    type:'Service Agreement', start:'2023-04-01', end:'2026-03-31',
    value_npr:576000, workers_allowed:10, workers_deployed:8,
    status:'renewal_due', compliance_pct:72, renewal_alert_days:90,
    days_remaining:290,
    sla_kpis:[
      {kpi:'Food Safety Standards', target:'Pass',actual:'Conditional',met:false},
      {kpi:'Monthly Attendance',    target:'>85%',actual:'83%',        met:false},
      {kpi:'Hygiene Inspection',    target:'A Grade',actual:'B Grade', met:false},
    ],
    clauses:['Food safety certification mandatory for all workers',
             'Agency must maintain food handler certificates current',
             'Monthly inspection by main employer EHS team'],
    impact_links:[{icon:'⚠',module:'SLA Alert',desc:'Score 72% - below threshold'},{icon:'💰',module:'Billing',desc:'NPR 48K/mo'}],
    icon:'🍽', color:'#f59e0b',
  },
]

const CONTEXT_ACTIONS = [
  {icon:'👁', label:'View Contract',        key:'view'},
  {icon:'✏', label:'Edit SLA',            key:'edit'},
  {icon:'📋', label:'View KPI Dashboard',  key:'kpi'},
  {icon:'🔔', label:'Set Renewal Alert',   key:'alert'},
  {icon:'📄', label:'Download Contract PDF',key:'pdf'},
  {icon:'🔗', label:'Impact Analysis',     key:'impact'},
  {icon:'📤', label:'Export Excel',        key:'export'},
  {icon:'🗑', label:'Terminate Contract',  key:'terminate', danger:true},
]

// Add SLA Modal
function AddSLAModal({ onClose, onSave }) {
  const [_apiLoading, _setApiLoading] = useState(false)
  const [f,setF] = useState({contract_no:'',vendor:'',service:'',agency_code:'',type:'Service Agreement',start:'',end:'',value_npr:'',workers_allowed:'',notes:''})
  const s = k => v => setF(p=>({...p,[k]:v}))

  // SaaS DB — load real tenant data (fallback to mock if no token/API down)
  useEffect(() => {
    const _token = localStorage.getItem('access_token')
    const _slug  = _getSlug()
    if (!_token) return
    _setApiLoading(true)
    fetch('/api/v1/sla', {
      headers: {
        'Authorization': `Bearer ${_token}`,
        'X-Tenant-Slug': _slug,
        'Content-Type': 'application/json',
      }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const items = d.slas || d.data || d.items || []
        if (items.length > 0) setF(items)
      })
      .catch(() => {/* keep mock */})
      .finally(() => _setApiLoading(false))
  }, [])

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:700,maxHeight:'92vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 28px',background:T.gradient,position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ New SLA / Contract</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:2}}>Voice input supported - click mic on any field</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Contract Number" value={f.contract_no} onChange={s('contract_no')} required accent={T.accent} hint="e.g. SLA-2025-005"/>
            <Field label="Vendor / Agency" value={f.vendor} onChange={s('vendor')} required accent={T.accent}/>
            <Field label="Service Type" type="select" value={f.service} onChange={s('service')} accent={T.accent}
              options={['Security Services','Housekeeping & Sanitation','IT Support Staff','Cafeteria & Catering','Driver & Transport','Gardening & Maintenance','Call Center Support','Other Non-Core Service']} required/>
            <Field label="Agency License Code (MoLESS)" value={f.agency_code} onChange={s('agency_code')} required accent={T.accent}
              hint="MoLESS registered - mandatory per Labour Act 2074"/>
            <Field label="Contract Type" type="select" value={f.type} onChange={s('type')} accent={T.accent}
              options={['Service Agreement','Managed Service','Time & Materials','Fixed Price','Master Service Agreement']}/>
            <Field label="Contract Value (NPR)" type="number" value={f.value_npr} onChange={s('value_npr')} accent={T.accent}/>
            <Field label="Start Date" type="date" value={f.start} onChange={s('start')} required accent={T.accent}/>
            <Field label="End Date" type="date" value={f.end} onChange={s('end')} required accent={T.accent}/>
            <Field label="Max Workers Allowed" type="number" value={f.workers_allowed} onChange={s('workers_allowed')} accent={T.accent}/>
          </div>
          <Field label="Contract Notes / Key Clauses" type="textarea" value={f.notes} onChange={s('notes')} accent={T.accent}
            hint="Key SLA commitments, worker rights clauses per Nepal Labour Act 2074"/>
          <AIImpact color={T.accent} lines={[
            'Contract links to Billing for monthly invoice auto-validation against approved timesheets.',
            'SLA KPIs auto-track attendance, compliance, and incident metrics.',
            'Labour Act 2074 Section 52-60: Main employer co-liable if agency fails to pay workers.',
            'Alert will trigger 90 days before contract end for renewal decision.',
            'Workers must be on agency payroll - never direct company payroll.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}}
              style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:T.gradient,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Create SLA Contract
            </button>
            <button onClick={onClose}
              style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function _getSlug() {
  try {
    const s = JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}
    return s?.company?.slug || s?.tenant || localStorage.getItem('elogix_tenant_slug') || ''
  } catch(_e) { return '' }
}

export default function OutsourceSLAPage() {
  const [contracts, setContracts] = useState(MOCK_CONTRACTS)
  const [ctx,       setCtx]       = useState(null)
  const [showAdd,   setShowAdd]   = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [search,    setSearch]    = useState('')

  const filtered = contracts.filter(c =>
    !search || c.vendor.toLowerCase().includes(search.toLowerCase()) ||
    c.contract_no.toLowerCase().includes(search.toLowerCase())
  )

  const alerts = contracts.filter(c => c.days_remaining <= 180 && c.status === 'active')
  const lowSLA  = contracts.filter(c => c.compliance_pct < 80)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="📋" title="SLA & Contract"
        breadcrumb="Organization Management > Workforce Configuration > Employment Type > Outsource"
        gradient={T.gradient}
        stats={[
          {icon:'📋',label:'Active Contracts',value:contracts.filter(c=>c.status==='active').length},
          {icon:'💰',label:'Total Contract Value',value:'NPR '+(contracts.reduce((s,c)=>s+c.value_npr,0)/1e6).toFixed(2)+'M'},
          {icon:'⚠', label:'Renewal Alerts',value:alerts.length},
          {icon:'📊',label:'Avg Compliance',value:Math.round(contracts.reduce((s,c)=>s+c.compliance_pct,0)/contracts.length)+'%'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New SLA"
        onExcel={()=>setShowExcel(true)}
      />

      {/* Alerts */}
      {(alerts.length > 0 || lowSLA.length > 0) && (
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:800,color:'#dc2626',marginBottom:8}}>Contract Alerts</div>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {alerts.map((c,i)=>(
              <div key={i} style={{fontSize:11,color:'#991b1b',display:'flex',gap:8,alignItems:'center'}}>
                <span>🔔</span>
                <span><strong>{c.vendor}</strong> - {c.contract_no} expires in {c.days_remaining} days ({c.end})</span>
              </div>
            ))}
            {lowSLA.map((c,i)=>(
              <div key={i} style={{fontSize:11,color:'#991b1b',display:'flex',gap:8,alignItems:'center'}}>
                <span>⚠️</span>
                <span><strong>{c.vendor}</strong> - SLA compliance {c.compliance_pct}% below 80% threshold</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search contracts by vendor or number..."/>

      <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:'8px 14px',marginBottom:14,fontSize:11,color:'#0369a1'}}>
        Right-click any contract for KPI dashboard, renewal alerts, and impact analysis
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {filtered.map(c=>{
          const allKPIsMet = c.sla_kpis.every(k=>k.met)
          const kpisMet = c.sla_kpis.filter(k=>k.met).length
          const statusColor = c.status==='active'?'#10b981':c.status==='renewal_due'?'#f59e0b':'#ef4444'
          return (
            <div key={c.id}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:c.vendor,...c}})}}
              style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',
                boxShadow:'0 2px 8px rgba(0,0,0,.05)',overflow:'hidden',
                borderLeft:`4px solid ${c.color}`}}>
              {/* Header */}
              <div style={{padding:'16px 18px',display:'flex',gap:14,alignItems:'center'}}>
                <div style={{width:46,height:46,borderRadius:12,background:`${c.color}18`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                  {c.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{c.vendor}</span>
                    <span style={{background:`${statusColor}18`,color:statusColor,fontSize:10,fontWeight:700,
                      padding:'2px 8px',borderRadius:20}}>
                      {c.status==='renewal_due'?'Renewal Due':c.status.charAt(0).toUpperCase()+c.status.slice(1)}
                    </span>
                    {!allKPIsMet&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                      {c.sla_kpis.length-kpisMet} KPI Breach
                    </span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>
                    {c.contract_no} &bull; {c.service} &bull; Workers: {c.workers_deployed}/{c.workers_allowed}
                  </div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>
                    Agency: <strong style={{color:'#334155'}}>{c.agency_code}</strong>
                    &bull; {c.start} to {c.end} &bull; {c.days_remaining} days left
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                  <div style={{textAlign:'center',padding:'8px 14px',background:'#f8fafc',borderRadius:10}}>
                    <div style={{fontSize:18,fontWeight:900,color:c.compliance_pct>=90?'#10b981':c.compliance_pct>=80?'#f59e0b':'#ef4444'}}>{c.compliance_pct}%</div>
                    <div style={{fontSize:9,color:'#94a3b8'}}>Compliance</div>
                  </div>
                  <div style={{textAlign:'center',padding:'4px 14px',background:'#f0fdf4',borderRadius:8}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#10b981'}}>NPR {(c.value_npr/1000).toFixed(0)}K</div>
                    <div style={{fontSize:9,color:'#94a3b8'}}>Total Value</div>
                  </div>
                </div>
              </div>

              {/* SLA KPIs */}
              <div style={{borderTop:'1px solid #f1f5f9',padding:'10px 18px',display:'flex',gap:10,flexWrap:'wrap'}}>
                {c.sla_kpis.map((kpi,i)=>(
                  <div key={i} style={{background:kpi.met?'#f0fdf4':'#fef2f2',
                    border:`1px solid ${kpi.met?'#bbf7d0':'#fecaca'}`,
                    borderRadius:10,padding:'6px 12px',fontSize:11}}>
                    <div style={{fontWeight:600,color:kpi.met?'#15803d':'#dc2626',marginBottom:2}}>{kpi.kpi}</div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{color:'#64748b'}}>Target: {kpi.target}</span>
                      <span style={{fontWeight:700,color:kpi.met?'#15803d':'#dc2626'}}>Actual: {kpi.actual}</span>
                      <span>{kpi.met?'✅':'❌'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Key clauses preview */}
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 18px',
                display:'flex',gap:4,flexWrap:'wrap'}}>
                {c.clauses.slice(0,2).map((cl,i)=>(
                  <span key={i} style={{fontSize:10,color:'#64748b',background:'#f8fafc',
                    padding:'3px 8px',borderRadius:6,border:'1px solid #f1f5f9'}}>
                    {cl.substring(0,60)}...
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
        impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
        actions={CONTEXT_ACTIONS}
        onAction={(k,item)=>{if(k==='view')setSelected(item)}}
        onClose={()=>setCtx(null)} />}
      {showAdd && <AddSLAModal onClose={()=>setShowAdd(false)}
        onSave={c=>setContracts(p=>[...p,{...c,id:'c'+Date.now(),status:'active',compliance_pct:100,days_remaining:365,sla_kpis:[],clauses:[],workers_deployed:0,icon:'📋',color:'#3b82f6',impact_links:[]}])} />}
      {showExcel && <ExcelModal title="SLA & Contracts"
        columns={['Contract No','Vendor','Service','Agency Code','Type','Start','End','Value (NPR)','Workers Allowed','Status']}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Importing: '+f.name)} />}

      <Drawer item={selected} gradient={T.gradient} onClose={()=>setSelected(null)}
        rows={[
          ['Contract No',      selected?.contract_no],
          ['Service',          selected?.service],
          ['Agency License',   selected?.agency_code],
          ['Type',             selected?.type],
          ['Contract Period',  selected ? `${selected.start} to ${selected.end}` : null],
          ['Days Remaining',   selected?.days_remaining],
          ['Workers',          selected ? `${selected.workers_deployed}/${selected.workers_allowed}` : null],
          ['Total Value',      selected ? 'NPR '+(selected.value_npr/1000).toFixed(0)+'K' : null],
          ['Compliance',       selected?.compliance_pct+'%'],
        ]}>
        {selected?.clauses && (
          <div style={{padding:'10px 0'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>Key Contract Clauses</div>
            {selected.clauses.map((cl,i)=>(
              <div key={i} style={{fontSize:11,color:'#475569',padding:'4px 0',borderBottom:'1px solid #f8fafc',
                display:'flex',gap:6}}>
                <span style={{color:'#0369a1',flexShrink:0}}>{i+1}.</span>{cl}
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  )
}

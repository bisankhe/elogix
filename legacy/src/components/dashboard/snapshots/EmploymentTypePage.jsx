// FILE: EmploymentTypePage.jsx - Insource & Outsource Overview
// FIXED: Configure button works, click item → shows detail panel on right, responsive layout
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const T = { gradient:'linear-gradient(135deg,#1e40af 0%,#7c3aed 100%)', accent:'#1e40af', light:'#eff6ff' }

const INSOURCE_TYPES = [
  { id:'reg',  code:'REG',        name:'Regular / Permanent',  nepali:'नियमित',       desc:'Continuous open-ended employment. Full statutory benefits per Nepal Labour Act 2074.',    count:820, icon:'🏅', color:'#10b981', la_section:'Section 10(a)', benefits:['PF (10%)','SSF','Gratuity','Medical','All Leaves','Maternity/Paternity'], max_probation_months:6,  cba_eligible:true,  written_required:true,  ai_note:'Highest compliance burden. Full benefits mandatory.' },
  { id:'prob', code:'PROB',       name:'Probation',             nepali:'परीक्षाकाल',   desc:'Max 6 months trial before confirmation. Nepal law maximum.',                               count:68,  icon:'🔄', color:'#f59e0b', la_section:'Section 10',    benefits:['PF (10%)','SSF','Medical','Sick Leave'],                            max_probation_months:6,  cba_eligible:false, written_required:true,  ai_note:'Must confirm or terminate within 6 months. Alert at 5 months.' },
  { id:'tb',   code:'CONTRACT-TB',name:'Time-Based Contract',   nepali:'समय-सीमित',   desc:'Fixed duration. Auto-terminates at period end.',                                          count:92,  icon:'📅', color:'#06b6d4', la_section:'Section 10(c)', benefits:['PF (10%)','SSF','Medical','Annual Leave'],                          max_probation_months:null,cba_eligible:false, written_required:true,  ai_note:'Alert HR 60 days before expiry. Can extend by agreement.' },
  { id:'wb',   code:'CONTRACT-WB',name:'Work-Based Contract',   nepali:'कार्य-आधारित',desc:'Tied to project completion. Ends on deliverable.',                                        count:45,  icon:'🎯', color:'#8b5cf6', la_section:'Section 10(b)', benefits:['PF (10%)','SSF','Medical','Leave'],                                 max_probation_months:null,cba_eligible:false, written_required:true,  ai_note:'Define deliverables clearly. Misclassification risk if ongoing.' },
  { id:'pt',   code:'PT',         name:'Part-Time',             nepali:'अल्पकालीन',   desc:'Max 35 hrs/week per Nepal law. Proportional benefits.',                                   count:58,  icon:'⏰', color:'#84cc16', la_section:'Section 10(e)', benefits:['PF (prorated)','SSF (prorated)','Leave (50%)'],                     max_probation_months:3,  cba_eligible:true,  written_required:true,  ai_note:'Cannot restrict from other employment unless written in contract.' },
  { id:'cas',  code:'CASUAL',     name:'Casual',                nepali:'अनियमित',     desc:'Max 7 days/month. No written contract required. At-will.',                                count:34,  icon:'🔀', color:'#f97316', la_section:'Section 10(d)', benefits:['Minimum wage applies'],                                             max_probation_months:null,cba_eligible:false, written_required:false, ai_note:'Only category without written contract. Alert if exceeds 7 days/month.' },
]

const OUTSOURCE_TYPES = [
  { id:'out-sec',   vendor:'ShieldGuard Nepal Pvt. Ltd.', service:'Security Services',      workers:45, contract_end:'2026-12-31', compliance_pct:94, billing_monthly:225000, sla_score:88, attendance_pct:96, icon:'🔐', color:'#ef4444', licensed:true, agency_code:'LS-MoLESS-2024-0012', dept:'All Departments',   desc:'24/7 security coverage for all premises. Gate monitoring, CCTV management, visitor management.' },
  { id:'out-house', vendor:'CleanPro Services Nepal',      service:'Housekeeping & Sanitation',workers:18, contract_end:'2026-06-30', compliance_pct:91, billing_monthly:72000,  sla_score:82, attendance_pct:91, icon:'🧹', color:'#10b981', licensed:true, agency_code:'LS-MoLESS-2024-0034', dept:'KTM HQ All Floors', desc:'Daily cleaning, waste management, sanitization of office spaces and common areas.' },
  { id:'out-it',    vendor:'TechStaff Solutions Pvt. Ltd.',service:'IT Support Staff',        workers:12, contract_end:'2026-09-15', compliance_pct:87, billing_monthly:180000, sla_score:79, attendance_pct:88, icon:'💻', color:'#3b82f6', licensed:true, agency_code:'LS-MoLESS-2023-0089', dept:'IT Helpdesk',       desc:'L1 helpdesk support, hardware troubleshooting, printer/network support for non-core IT functions.' },
  { id:'out-cafe',  vendor:'NepCatering Services',          service:'Cafeteria & Catering',   workers:8,  contract_end:'2026-03-31', compliance_pct:72, billing_monthly:48000,  sla_score:68, attendance_pct:83, icon:'🍽', color:'#f59e0b', licensed:true, agency_code:'LS-MoLESS-2023-0156', dept:'HQ Cafeteria',      desc:'Daily meal preparation, cafeteria operations, special event catering for company functions.' },
]

// Config settings per employment type
const DEFAULT_CONFIG = {
  probation_duration_months: 6,
  overtime_eligibility: true,
  annual_leave_days: 18,
  sick_leave_days: 12,
  festival_leave_days: 13,
  ssf_required: true,
  pf_rate_pct: 10,
  notice_period_days: 30,
  auto_confirmation_reminder_days: 30,
}

export default function EmploymentTypePage() {
  const { navTo } = useApp()
  const [tab,       setTab]       = useState('insource')
  const [ctx,       setCtx]       = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [selected,  setSelected]  = useState(null)       // clicked item for detail panel
  const [showConfig,setShowConfig]= useState(false)       // configure modal
  const [configItem,setConfigItem]= useState(null)        // which item being configured
  const [config,    setConfig]    = useState(DEFAULT_CONFIG)
  const [msg,       setMsg]       = useState('')

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const totalInsource  = INSOURCE_TYPES.reduce((s,t)=>s+t.count,0)
  const totalOutsource = OUTSOURCE_TYPES.reduce((s,v)=>s+v.workers,0)
  const totalWorkers   = totalInsource + totalOutsource

  const openConfigure = (item, e) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    setConfigItem(item)
    setShowConfig(true)
  }

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="👥" title="Insource & Outsource"
        breadcrumb="Organization Management > Insource & Outsource"
        gradient={T.gradient}
        stats={[
          {icon:'👥',label:'Total Workforce',  value:totalWorkers},
          {icon:'🏅',label:'Direct (Insource)',value:totalInsource},
          {icon:'🏭',label:'Outsourced',       value:totalOutsource},
          {icon:'📊',label:'Outsource %',      value:Math.round(totalOutsource/totalWorkers*100)+'%'},
        ]}
        onAdd={()=>openConfigure({name:'New Employment Type'},null)} addLabel="⚙️ Configure"
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46'}}>{msg}</div>}

      {/* Nepal Law Alert */}
      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#dc2626',marginBottom:6}}>⚖️ Nepal Labour Act 2074 — Outsource Restrictions</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10,fontSize:10,color:'#991b1b'}}>
          <div>Only <strong>non-core</strong> work can be outsourced (Security, Housekeeping, Catering, Support)</div>
          <div>Must use <strong>licensed labour supplier</strong> agencies only (MoLESS registered)</div>
          <div>If unlicensed or core work: outsourced workers <strong>become your direct employees</strong></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:2,background:'#f1f5f9',padding:4,borderRadius:12,marginBottom:16,border:'1px solid #e2e8f0'}}>
        {[{id:'insource',label:'🏅 Insource (Direct)',count:totalInsource},{id:'outsource',label:'🏭 Outsource (Vendor)',count:totalOutsource},{id:'summary',label:'📊 Summary',count:null}].map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setSelected(null)}}
            style={{flex:1,padding:'10px 12px',borderRadius:9,border:'none',cursor:'pointer',
              background:tab===t.id?'#fff':'transparent',color:tab===t.id?'#0f172a':'#64748b',
              fontWeight:tab===t.id?700:400,fontSize:11,boxShadow:tab===t.id?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {t.label}{t.count!==null&&<span style={{marginLeft:5,fontSize:10,fontWeight:700,color:tab===t.id?T.accent:'#94a3b8'}}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── INSOURCE TAB ── */}
      {tab==='insource' && (
        <div style={{display:'grid',gridTemplateColumns:selected?'1fr 380px':'1fr',gap:14,transition:'grid-template-columns .2s'}}>
          {/* Left: list */}
          <div>
            <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:10,padding:'8px 14px',marginBottom:14,fontSize:11,color:'#3730a3'}}>
              Nepal Labour Act 2074, Section 10: 5 legal employment categories. <strong>Click any card</strong> to see full details on the right.
            </div>
            <div style={{display:'grid',gridTemplateColumns:selected?'1fr':'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
              {INSOURCE_TYPES.map(type=>(
                <div key={type.id}
                  onClick={()=>setSelected(selected?.id===type.id?null:type)}
                  onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{...type,name:type.name}})}}
                  style={{background:'#fff',borderRadius:14,border:`2px solid ${selected?.id===type.id?type.color:'#e2e8f0'}`,cursor:'pointer',overflow:'hidden',
                    boxShadow:selected?.id===type.id?`0 4px 16px ${type.color}30`:'0 1px 4px rgba(0,0,0,.04)',transition:'all .15s'}}>
                  <div style={{padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
                    <div style={{width:44,height:44,borderRadius:12,background:`${type.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{type.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:2}}>
                        <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{type.name}</span>
                        <span style={{background:`${type.color}18`,color:type.color,fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:20}}>{type.la_section}</span>
                      </div>
                      <div style={{fontSize:10,color:'#64748b',fontStyle:'italic',marginBottom:2}}>{type.nepali}</div>
                      <div style={{fontSize:10,color:'#475569'}}>{type.desc}</div>
                    </div>
                    <div style={{textAlign:'center',flexShrink:0}}>
                      <div style={{fontSize:18,fontWeight:900,color:type.color}}>{type.count}</div>
                      <div style={{fontSize:8,color:'#94a3b8'}}>staff</div>
                    </div>
                  </div>
                  <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {type.benefits.slice(0,3).map((b,i)=><span key={i} style={{background:`${type.color}10`,color:type.color,fontSize:8,fontWeight:600,padding:'2px 7px',borderRadius:20}}>{b}</span>)}
                      {type.benefits.length>3&&<span style={{fontSize:8,color:'#94a3b8'}}>+{type.benefits.length-3}</span>}
                    </div>
                    <button onClick={e=>openConfigure(type,e)} style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${type.color}40`,background:`${type.color}10`,color:type.color,fontSize:9,fontWeight:700,cursor:'pointer'}}>⚙️ Configure</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: detail panel */}
          {selected && (
            <div style={{background:'#fff',borderRadius:16,border:`2px solid ${selected.color}`,overflow:'hidden',alignSelf:'start',position:'sticky',top:20}}>
              <div style={{background:`linear-gradient(135deg,${selected.color},${selected.color}99)`,padding:'16px 18px',color:'#fff'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontSize:18}}>{selected.icon}</div>
                    <div style={{fontSize:14,fontWeight:900,marginTop:4}}>{selected.name}</div>
                    <div style={{fontSize:10,opacity:.8,marginTop:2}}>{selected.nepali} · {selected.la_section}</div>
                  </div>
                  <button onClick={()=>setSelected(null)} style={{background:'rgba(255,255,255,.2)',border:'none',color:'#fff',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:12}}>✕</button>
                </div>
                <div style={{fontSize:22,fontWeight:900,marginTop:8}}>{selected.count.toLocaleString()} <span style={{fontSize:11,fontWeight:400,opacity:.8}}>employees</span></div>
              </div>
              <div style={{padding:'16px 18px'}}>
                <div style={{fontSize:11,color:'#475569',lineHeight:1.7,marginBottom:12}}>{selected.desc}</div>
                <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:6}}>📋 Benefits & Entitlements</div>
                {selected.benefits.map((b,i)=>(
                  <div key={i} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:'1px solid #f1f5f9',fontSize:10}}>
                    <span style={{color:selected.color,fontWeight:700}}>✓</span><span style={{color:'#374151'}}>{b}</span>
                  </div>
                ))}
                <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    ['Max Probation', selected.max_probation_months ? selected.max_probation_months+'mo':'N/A'],
                    ['CBA Eligible',  selected.cba_eligible?'Yes':'No'],
                    ['Written Contract', selected.written_required?'Required':'Not required'],
                    ['LA Section',    selected.la_section],
                  ].map(([k,v])=>(
                    <div key={k} style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px'}}>
                      <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>{k}</div>
                      <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginTop:2}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,background:`${selected.color}08`,borderRadius:10,padding:'10px 12px',fontSize:10,color:'#475569',fontStyle:'italic',borderLeft:`3px solid ${selected.color}`}}>
                  🤖 {selected.ai_note}
                </div>
                <button onClick={e=>openConfigure(selected,e)} style={{marginTop:14,width:'100%',padding:'10px',borderRadius:10,border:'none',background:`linear-gradient(135deg,${selected.color},${selected.color}cc)`,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  ⚙️ Configure {selected.name} Settings
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── OUTSOURCE TAB ── */}
      {tab==='outsource' && (
        <div style={{display:'grid',gridTemplateColumns:selected?'1fr 380px':'1fr',gap:14}}>
          <div>
            <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
              {[{icon:'⚖️',label:'Licensed Agencies',value:OUTSOURCE_TYPES.filter(v=>v.licensed).length+'/'+OUTSOURCE_TYPES.length,color:'#10b981'},
                {icon:'👥',label:'Total Outsourced',value:totalOutsource,color:'#3b82f6'},
                {icon:'💰',label:'Monthly Billing',value:'NPR '+(OUTSOURCE_TYPES.reduce((s,v)=>s+v.billing_monthly,0)/1000).toFixed(0)+'K',color:'#f59e0b'},
                {icon:'📊',label:'Avg SLA Score',value:Math.round(OUTSOURCE_TYPES.reduce((s,v)=>s+v.sla_score,0)/OUTSOURCE_TYPES.length)+'%',color:'#8b5cf6'},
              ].map((s,i)=>(
                <div key={i} style={{background:'#fff',border:`1px solid ${s.color}25`,borderRadius:12,padding:'12px 16px',flex:1,minWidth:130,borderLeft:`3px solid ${s.color}`}}>
                  <div style={{fontSize:16}}>{s.icon}</div>
                  <div style={{fontSize:18,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:600}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
              {[['📋 SLA & Contracts','sla-contract'],['👥 Vendor Employees','outsource-employees'],['💰 Billing & Invoice','outsource-billing'],['📅 Attendance','outsource-attendance']].map(([l,p])=>(
                <button key={p} onClick={()=>navTo(p)} style={{padding:'8px 14px',borderRadius:9,border:'none',background:'#f1f5f9',color:'#374151',fontSize:10,fontWeight:700,cursor:'pointer'}}>{l}</button>
              ))}
            </div>
            <div style={{display:'grid',gap:10}}>
              {OUTSOURCE_TYPES.map(vendor=>{
                const slaOk = vendor.sla_score>=80
                return (
                  <div key={vendor.id} onClick={()=>setSelected(selected?.id===vendor.id?null:vendor)}
                    onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{...vendor,name:vendor.vendor}})}}
                    style={{background:'#fff',borderRadius:12,border:`2px solid ${selected?.id===vendor.id?vendor.color:'#e2e8f0'}`,padding:'14px 16px',cursor:'pointer',display:'flex',gap:14,alignItems:'center',boxShadow:selected?.id===vendor.id?`0 4px 14px ${vendor.color}25`:'none',transition:'all .15s'}}>
                    <div style={{width:44,height:44,borderRadius:12,background:`${vendor.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{vendor.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{vendor.vendor}</div>
                      <div style={{fontSize:10,color:'#64748b'}}>{vendor.service} · {vendor.dept}</div>
                      <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                        <span style={{background:'#f0fdf4',color:'#15803d',fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:20}}>Licensed: {vendor.agency_code.split('-').slice(-1)[0]}</span>
                        <span style={{background:slaOk?'#f0fdf4':'#fef2f2',color:slaOk?'#15803d':'#dc2626',fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:20}}>SLA: {vendor.sla_score}%</span>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,textAlign:'center',flexShrink:0}}>
                      {[{l:'Workers',v:vendor.workers,c:vendor.color},{l:'Att%',v:vendor.attendance_pct+'%',c:'#10b981'},{l:'NPR/mo',v:(vendor.billing_monthly/1000).toFixed(0)+'K',c:'#f59e0b'}].map((s,i)=>(
                        <div key={i}><div style={{fontSize:12,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:8,color:'#94a3b8'}}>{s.l}</div></div>
                      ))}
                    </div>
                    <button onClick={e=>openConfigure(vendor,e)} style={{padding:'7px 12px',borderRadius:8,border:`1px solid ${vendor.color}40`,background:`${vendor.color}10`,color:vendor.color,fontSize:9,fontWeight:700,cursor:'pointer',flexShrink:0}}>⚙️ Config</button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right detail panel for outsource */}
          {selected && selected.vendor && (
            <div style={{background:'#fff',borderRadius:16,border:`2px solid ${selected.color}`,overflow:'hidden',alignSelf:'start',position:'sticky',top:20}}>
              <div style={{background:`linear-gradient(135deg,${selected.color},${selected.color}99)`,padding:'16px 18px',color:'#fff'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:18}}>{selected.icon}</div>
                    <div style={{fontSize:13,fontWeight:900,marginTop:4}}>{selected.vendor}</div>
                    <div style={{fontSize:10,opacity:.8}}>{selected.service}</div>
                  </div>
                  <button onClick={()=>setSelected(null)} style={{background:'rgba(255,255,255,.2)',border:'none',color:'#fff',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:12}}>✕</button>
                </div>
              </div>
              <div style={{padding:'16px 18px'}}>
                <div style={{fontSize:10,color:'#475569',lineHeight:1.7,marginBottom:12}}>{selected.desc}</div>
                {[['Workers Deployed',selected.workers],['Department',selected.dept],['SLA Score',selected.sla_score+'%'],['Attendance Rate',selected.attendance_pct+'%'],['Monthly Billing','NPR '+(selected.billing_monthly/1000).toFixed(0)+'K'],['Contract End',selected.contract_end],['Compliance',selected.compliance_pct+'%'],['Agency License',selected.agency_code],['LA Compliant',selected.licensed?'Yes — Licensed Agency':'Not Verified']].map(([k,v])=>(
                  <div key={k} style={{display:'flex',padding:'6px 0',borderBottom:'1px solid #f1f5f9',fontSize:10}}>
                    <span style={{color:'#64748b',width:130,flexShrink:0}}>{k}</span>
                    <span style={{fontWeight:700,color:'#0f172a'}}>{v}</span>
                  </div>
                ))}
                <button onClick={e=>openConfigure(selected,e)} style={{marginTop:14,width:'100%',padding:'10px',borderRadius:10,border:'none',background:`linear-gradient(135deg,${selected.color},${selected.color}cc)`,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  ⚙️ Configure Vendor Settings
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUMMARY TAB ── */}
      {tab==='summary' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'18px 20px'}}>
            <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>Workforce Mix (Total: {totalWorkers.toLocaleString()})</div>
            {[...INSOURCE_TYPES.map(t=>({name:t.name,count:t.count,color:t.color,icon:t.icon})),...OUTSOURCE_TYPES.map(v=>({name:v.service,count:v.workers,color:v.color,icon:v.icon}))].map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:'1px solid #f8fafc'}}>
                <span style={{flexShrink:0}}>{t.icon}</span>
                <span style={{flex:1,fontSize:11,color:'#334155'}}>{t.name}</span>
                <div style={{width:100,height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}><div style={{width:`${t.count/totalWorkers*100}%`,height:'100%',background:t.color,borderRadius:3}}/></div>
                <span style={{fontSize:11,fontWeight:700,color:t.color,width:35,textAlign:'right'}}>{t.count}</span>
              </div>
            ))}
          </div>
          <div style={{background:'linear-gradient(135deg,#f5f3ff,#eff6ff)',border:'1px solid #c4b5fd',borderRadius:14,padding:'18px 20px'}}>
            <div style={{fontSize:13,fontWeight:800,color:'#1e1b4b',marginBottom:10}}>AI Workforce Compliance Check</div>
            {[{ok:true,text:'All outsourced vendors are MoLESS licensed'},{ok:true,text:'Outsourced roles are non-core (permitted under Labour Act 2074)'},{ok:false,text:'NepCatering SLA score (68%) below 70% threshold'},{ok:true,text:'Probation periods within 6-month Nepal law maximum'},{ok:false,text:'4 employees approaching probation expiry in next 30 days'}].map((c,i)=>(
              <div key={i} style={{display:'flex',gap:8,padding:'7px 0',borderBottom:'1px solid rgba(124,58,237,.1)',fontSize:11}}>
                <span style={{flexShrink:0,fontSize:14}}>{c.ok?'✅':'⚠️'}</span>
                <span style={{color:c.ok?'#166534':'#991b1b'}}>{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONFIGURE MODAL ── */}
      {showConfig && configItem && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowConfig(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:520,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:T.gradient,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>⚙️ Configure: {configItem.name||configItem.vendor||'Employment Type'}</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>Adjust settings for this employment category</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              {[
                ['Probation Duration (months)','probation_duration_months','number'],
                ['Annual Leave Days','annual_leave_days','number'],
                ['Sick Leave Days','sick_leave_days','number'],
                ['Festival Leave Days','festival_leave_days','number'],
                ['PF Rate (%)','pf_rate_pct','number'],
                ['Notice Period (days)','notice_period_days','number'],
                ['Confirmation Reminder (days before)','auto_confirmation_reminder_days','number'],
              ].map(([label,field,type])=>(
                <div key={field} style={{marginBottom:14}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{label}</label>
                  <input type={type} value={config[field]} onChange={e=>setConfig(p=>({...p,[field]:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
              <div style={{marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151'}}>SSF Required</label>
                <div onClick={()=>setConfig(p=>({...p,ssf_required:!p.ssf_required}))} style={{width:44,height:24,borderRadius:12,background:config.ssf_required?T.accent:'#e2e8f0',cursor:'pointer',position:'relative'}}>
                  <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:config.ssf_required?23:3,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151'}}>Overtime Eligible</label>
                <div onClick={()=>setConfig(p=>({...p,overtime_eligibility:!p.overtime_eligibility}))} style={{width:44,height:24,borderRadius:12,background:config.overtime_eligibility?T.accent:'#e2e8f0',cursor:'pointer',position:'relative'}}>
                  <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:config.overtime_eligibility?23:3,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{notify('✅ Configuration saved for '+( configItem.name||configItem.vendor));setShowConfig(false)}}
                  style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:T.gradient,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>💾 Save Configuration</button>
                <button onClick={()=>setShowConfig(false)} style={{padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[{icon:'👁',label:'View Details',key:'view'},{icon:'⚙️',label:'Configure',key:'config'},{icon:'📋',label:'View Employees',key:'employees'},{icon:'📤',label:'Export',key:'export'}]} onAction={(k,item)=>{if(k==='view')setSelected(item);if(k==='config')openConfigure(item,null)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Employment Type" columns={['Type Code','Name','LA Section','Count','Benefits','Written Contract','CBA Eligible']} onClose={()=>setShowExcel(false)} onImport={f=>notify('Importing: '+f.name)}/>}
    </div>
  )
}

// FILE: VendorAgreementPage.jsx - Vendor Agreement Management
// CLM with smart-contract alerts, e-signature, version control

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#f97316 100%)'
const A = '#c2410c'

const AGREEMENTS = [
  { id:'ag1', code:'AGR-2025-001', vendor_code:'REC-001', vendor_name:'MidPoint Staffing Nepal',
    type:'MSA', status:'active', version:'v3.1',
    signed_date:'2023-01-15', effective_date:'2023-01-20', expiry_date:'2026-01-19',
    renewal_alert_days:90, days_to_expiry:365, auto_renew:true,
    signed_by_us:'Raj Kumar Sharma (CEO)', signed_by_vendor:'Manisha Shrestha (MD)',
    e_signature_provider:'DocuSign', signature_hash:'DS-2023-A1B2C3',
    value_npr:1200000, currency:'NPR',
    key_terms:['6-month exclusivity on IT roles','Replacement guarantee 90 days','Quality-of-hire SLA 85%','Payment Net 30'],
    attachments:['MSA_Final_Signed.pdf','Rate_Card_2025.pdf','Amendment_1.pdf'],
    ai_risk_score:12, ai_recommendation:'Low risk. Strong terms. Consider renegotiating rate card at renewal.',
    versions:[{v:'v3.1',date:'2025-01-15',change:'Rate card updated'},{v:'v3.0',date:'2024-01-15',change:'Annual renewal'},{v:'v2.0',date:'2023-01-15',change:'Scope expanded to Finance'}],
    impact_links:['Vendor Profile','SLA & Contract','BGV','Billing'] },
  { id:'ag2', code:'AGR-2025-002', vendor_code:'VND-003', vendor_name:'SecureCheck Nepal',
    type:'Service Agreement', status:'active', version:'v2.0',
    signed_date:'2024-03-01', effective_date:'2024-03-05', expiry_date:'2026-03-04',
    renewal_alert_days:60, days_to_expiry:245, auto_renew:false,
    signed_by_us:'Sanjay Karki (CFO)', signed_by_vendor:'Sushant KC (Director)',
    e_signature_provider:'Adobe Sign', signature_hash:'AS-2024-X9Y8Z7',
    value_npr:480000, currency:'NPR',
    key_terms:['Per-check pricing model','48-hour standard turnaround','24-hour express at premium','GDPR/SOC2 compliance mandatory'],
    attachments:['BGV_Service_Agreement.pdf','Data_Processing_Agreement.pdf'],
    ai_risk_score:8, ai_recommendation:'Excellent terms. Blockchain verification clause is market-leading.',
    versions:[{v:'v2.0',date:'2024-03-01',change:'Added blockchain BGV clause'},{v:'v1.0',date:'2022-03-01',change:'Initial agreement'}],
    impact_links:['BGV','Vendor Profile','Billing'] },
  { id:'ag3', code:'AGR-2025-003', vendor_code:'VND-005', vendor_name:'QuickHire Outsource Pvt.',
    type:'Outsource Agreement', status:'expiring_soon', version:'v1.2',
    signed_date:'2023-04-01', effective_date:'2023-04-05', expiry_date:'2026-04-04',
    renewal_alert_days:90, days_to_expiry:45, auto_renew:false,
    signed_by_us:'Priya Sharma (HR Head)', signed_by_vendor:'Bikash Rai (MD)',
    e_signature_provider:'DocuSign', signature_hash:'DS-2023-Q4R5S6',
    value_npr:720000, currency:'NPR',
    key_terms:['Non-core work only (LA 2074 S.52)','Minimum wage compliance mandatory','SSF payment verification quarterly','Main employer co-liability acknowledged'],
    attachments:['Outsource_Agreement.pdf','LA2074_Compliance_Annex.pdf'],
    ai_risk_score:67, ai_recommendation:'EXPIRING IN 45 DAYS. SSF non-compliance noted. Renegotiate or terminate.',
    versions:[{v:'v1.2',date:'2024-04-01',change:'LA2074 compliance annex added'},{v:'v1.0',date:'2023-04-01',change:'Initial agreement'}],
    impact_links:['Compliance Alert','Labour Act 2074','Vendor Profile'] },
  { id:'ag4', code:'AGR-2024-004', vendor_code:'VND-004', vendor_name:'SalaryExpert Payroll Nepal',
    type:'MSA', status:'active', version:'v4.0',
    signed_date:'2022-06-01', effective_date:'2022-06-15', expiry_date:'2027-06-14',
    renewal_alert_days:120, days_to_expiry:730, auto_renew:true,
    signed_by_us:'Raj Kumar Sharma (CEO)', signed_by_vendor:'Amrit Pradhan (CEO)',
    e_signature_provider:'DocuSign', signature_hash:'DS-2022-M7N8O9',
    value_npr:2400000, currency:'NPR',
    key_terms:['Monthly payroll processing by 25th','SSF auto-filing included','IRD TDS compliance','Error rate SLA < 0.5%'],
    attachments:['Payroll_MSA_Signed.pdf','DPA.pdf','Rate_Schedule.pdf'],
    ai_risk_score:5, ai_recommendation:'Excellent long-term agreement. Market-best error rate SLA.',
    versions:[{v:'v4.0',date:'2022-06-01',change:'5-year MSA, SSF auto-filing added'},{v:'v3.0',date:'2019-06-01',change:'Previous 3-year term'}],
    impact_links:['Billing','SLA','Vendor Profile'] },
]

const STATUS_CFG = {
  active:        {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',label:'Active',icon:'✅'},
  expiring_soon: {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',label:'Expiring Soon',icon:'⏰'},
  expired:       {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',label:'Expired',icon:'❌'},
  draft:         {c:'#64748b',bg:'#f8fafc',b:'#e2e8f0',label:'Draft',icon:'📝'},
  terminated:    {c:'#dc2626',bg:'#fef2f2',b:'#fca5a5',label:'Terminated',icon:'🚫'},
}
const CTX_ACTIONS = [
  {icon:'👁',label:'View Agreement',key:'view'},
  {icon:'✏',label:'Create Amendment',key:'amend'},
  {icon:'🔄',label:'Initiate Renewal',key:'renew'},
  {icon:'📥',label:'Download PDF',key:'download'},
  {icon:'✍',label:'Send for e-Signature',key:'sign'},
  {icon:'📊',label:'SLA Performance',key:'sla'},
  {icon:'🔗',label:'Impact Analysis',key:'impact'},
  {icon:'📤',label:'Export',key:'export'},
  {icon:'🚫',label:'Terminate Agreement',key:'terminate',danger:true},
]

export default function VendorAgreementPage() {
  const [agreements, setAgreements] = useState(AGREEMENTS)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = agreements.filter(a=>{
    if (filterStatus!=='all'&&a.status!==filterStatus) return false
    if (search&&!a.vendor_name.toLowerCase().includes(search.toLowerCase())&&!a.code.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const active = agreements.filter(a=>a.status==='active').length
  const expiring = agreements.filter(a=>a.status==='expiring_soon').length
  const totalValue = agreements.reduce((s,a)=>s+a.value_npr,0)
  const avgRisk = Math.round(agreements.reduce((s,a)=>s+a.ai_risk_score,0)/agreements.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Vendor Agreement Management"
        breadcrumb="Organization Management > Vendor / Outsource Management"
        gradient={G}
        stats={[
          {icon:'📋',label:'Active Agreements', value:active},
          {icon:'⏰',label:'Expiring Soon',      value:expiring},
          {icon:'💰',label:'Total Value',        value:'NPR '+(totalValue/100000).toFixed(1)+'L'},
          {icon:'🤖',label:'Avg AI Risk',        value:avgRisk+'/100'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Agreement"
        onExcel={()=>setShowExcel(true)}/>

      {expiring>0 && (
        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#92400e'}}>
          <span style={{fontSize:18}}>⏰</span>
          <div><strong>{expiring} agreement(s) expiring soon!</strong> AI recommends initiating renewal process immediately. Auto-alerts sent to Legal & Procurement teams.</div>
        </div>
      )}

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search agreements by vendor, code..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','active','expiring_soon','expired','draft'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'8px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':s.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(ag=>{
          const sc = STATUS_CFG[ag.status]||STATUS_CFG.active
          return (
            <div key={ag.id}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:ag.vendor_name,...ag}})}}
              style={{background:'#fff',border:`1px solid ${sc.b}`,borderRadius:16,overflow:'hidden',
                boxShadow:'0 2px 12px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>

              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📋</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{ag.vendor_name}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{ag.type} {ag.version}</span>
                    {ag.auto_renew && <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>Auto-Renew ON</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{ag.code} . Signed {ag.signed_date} . Expires {ag.expiry_date}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>e-Sign: {ag.e_signature_provider} . Hash: {ag.signature_hash}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {(ag.value_npr/1000).toFixed(0)}K</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>Contract Value</div>
                  <div style={{fontSize:11,fontWeight:700,color:ag.days_to_expiry<=60?'#ef4444':ag.days_to_expiry<=90?'#f59e0b':'#10b981',marginTop:2}}>
                    {ag.days_to_expiry} days remaining
                  </div>
                </div>
              </div>

              {/* Days remaining bar */}
              <div style={{padding:'8px 20px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
                <div style={{height:6,background:'#e2e8f0',borderRadius:6,overflow:'hidden'}}>
                  <div style={{
                    width:`${Math.min(ag.days_to_expiry/365*100,100)}%`,height:'100%',borderRadius:6,
                    background:ag.days_to_expiry<=60?'#ef4444':ag.days_to_expiry<=90?'#f59e0b':'#10b981',
                    transition:'width .6s ease'
                  }}/>
                </div>
              </div>

              {/* Key terms + AI */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}>
                <div style={{padding:'12px 20px',borderRight:'1px solid #f1f5f9'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>Key Terms</div>
                  {ag.key_terms.map((t,i)=>(
                    <div key={i} style={{fontSize:10,color:'#64748b',padding:'3px 0',borderBottom:'1px solid #f8fafc',display:'flex',gap:6}}>
                      <span style={{color:A,fontWeight:700}}>.</span>{t}
                    </div>
                  ))}
                </div>
                <div style={{padding:'12px 20px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>AI Risk Assessment</div>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                    <div style={{flex:1,height:8,background:'#e2e8f0',borderRadius:8,overflow:'hidden'}}>
                      <div style={{width:`${ag.ai_risk_score}%`,height:'100%',background:ag.ai_risk_score<=20?'#10b981':ag.ai_risk_score<=50?'#f59e0b':'#ef4444',borderRadius:8}}/>
                    </div>
                    <span style={{fontSize:13,fontWeight:900,color:ag.ai_risk_score<=20?'#10b981':ag.ai_risk_score<=50?'#f59e0b':'#ef4444',flexShrink:0}}>{ag.ai_risk_score}/100</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b',fontStyle:'italic'}}>{ag.ai_recommendation}</div>
                  <div style={{marginTop:8,fontSize:10,color:'#94a3b8'}}>
                    Versions: {ag.versions.map(v=>v.v).join(' . ')}
                  </div>
                </div>
              </div>

              <div style={{borderTop:'1px solid #f1f5f9',padding:'10px 16px',display:'flex',gap:8,flexWrap:'wrap'}}>
                {ag.attachments.map((att,i)=>(
                  <span key={i} style={{background:'#f8fafc',color:'#475569',fontSize:10,padding:'4px 10px',borderRadius:8,border:'1px solid #e2e8f0',cursor:'pointer',display:'flex',gap:5,alignItems:'center'}}>
                    📎 {att}
                  </span>
                ))}
                <div style={{marginLeft:'auto',display:'flex',gap:8}}>
                  <button onClick={()=>setSelected(ag)}
                    style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    View Details
                  </button>
                  {ag.status==='expiring_soon' && (
                    <button style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#f59e0b',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                      Renew Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX_ACTIONS} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>+ Create New Agreement</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>CLM with e-signature integration. Voice input supported.</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div style={{gridColumn:'1/-1',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 14px',marginBottom:4}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#065f46',marginBottom:2}}>📋 Contract Number (Auto-Generated by System)</div>
                  <div style={{fontSize:13,fontWeight:900,color:'#065f46',fontFamily:'monospace',letterSpacing:1}}>CNT-{String(new Date().getFullYear())}-{String(agreements.length+1).padStart(4,'0')}</div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:1}}>AI-generated unique contract ID — cannot be edited</div>
                </div>
                <Field label="Vendor" type="select" value="" onChange={()=>{}} accent={A} options={['Select vendor...']}/>
                <Field label="Agreement Type" type="select" value="" onChange={()=>{}} accent={A}
                  options={['MSA — Master Service Agreement','Service Agreement','Outsource Agreement','Manpower Outsourcing Contract','Cleaning Services Agreement','Gardening & Landscaping Services','Technical Services Contract','Plumbing & Maintenance Services','Security Services Agreement','IT Support Services','Catering & Cafeteria Services','Transport & Logistics Services','Consulting Agreement','NDA — Non-Disclosure','Amendment / Addendum','SLA — Service Level Agreement']}/>
                <Field label="Effective Date" type="date" value="" onChange={()=>{}} accent={A}/>
                <Field label="Expiry Date" type="date" value="" onChange={()=>{}} accent={A}/>
                <Field label="Renewal Alert Days" type="number" value="90" onChange={()=>{}} accent={A}/>
                <Field label="e-Signature Provider" type="select" value="" onChange={()=>{}} accent={A}
                  options={['DocuSign','Adobe Sign','Manual']}/>
                <Field label="Contract Value (NPR)" type="number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <AIImpact color={A} lines={[
                'AI will flag risk clauses and suggest market-standard terms.',
                'Auto-alerts at 120/90/60/30 days before expiry to Legal & HR.',
                'Version control: every amendment tracked with diff view.',
                'Nepal LA2074 outsource agreements require Section 52 compliance clause.',
              ]}/>
              <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:12,padding:'12px 14px',marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:'#4c1d95',marginBottom:6}}>🤖 AI Contract Generation + Digital Signature</div>
                <div style={{fontSize:10,color:'#5b21b6',lineHeight:1.6,marginBottom:10}}>Fill the form fields above, then click <strong>Generate AI Contract</strong> — Claude AI will draft a full legal contract based on your inputs, service type, and Nepal Labour Act 2074 requirements. The contract will then be sent to the vendor for digital e-signature via DocuSign / Adobe Sign.</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                  <div style={{fontSize:9,color:'#6d28d9'}}>✅ Nepal LA 2074 S.52 compliance clause auto-added</div>
                  <div style={{fontSize:9,color:'#6d28d9'}}>✅ SSF & minimum wage clauses auto-included</div>
                  <div style={{fontSize:9,color:'#6d28d9'}}>✅ Termination & renewal terms auto-generated</div>
                  <div style={{fontSize:9,color:'#6d28d9'}}>✅ Digital signature link sent to vendor email</div>
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:'linear-gradient(135deg,#4c1d95,#7c3aed)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>🤖 Generate AI Contract</button>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>💾 Save Draft</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 20px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showExcel && <ExcelModal title="Vendor Agreements" columns={['Code','Vendor','Type','Version','Status','Signed Date','Expiry Date','Value NPR','Auto Renew','Key Terms']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Code',selected?.code],['Type',selected?.type],['Version',selected?.version],['Status',selected?.status],
        ['Signed Date',selected?.signed_date],['Effective Date',selected?.effective_date],['Expiry Date',selected?.expiry_date],
        ['Days Remaining',selected?.days_to_expiry],['Auto Renew',selected?.auto_renew?'Yes':'No'],
        ['Signed By (Us)',selected?.signed_by_us],['Signed By (Vendor)',selected?.signed_by_vendor],
        ['e-Sign Provider',selected?.e_signature_provider],['Signature Hash',selected?.signature_hash],
        ['Contract Value','NPR '+(selected?.value_npr/1000||0).toFixed(0)+'K'],
        ['AI Risk Score',selected?.ai_risk_score+'/100'],['AI Recommendation',selected?.ai_recommendation],
      ]}/>
    </div>
  )
}

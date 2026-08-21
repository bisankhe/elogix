// FILE: VendorListingPage.jsx - Vendor Listing & Marketplace
// App-store-style vendor directory, AI-search, tier-based marketplace

import { useState, useEffect } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#38bdf8 100%)'
const A = '#0284c7'

const CATEGORIES = [
  { id:'c1', key:'recruitment',    label:'Recruitment',      icon:'🎯', color:'#7c3aed', count:4 },
  { id:'c2', key:'bgv',            label:'BGV Services',     icon:'🔍', color:'#059669', count:2 },
  { id:'c3', key:'payroll',        label:'Payroll Services', icon:'💰', color:'#d97706', count:3 },
  { id:'c4', key:'outsource',      label:'Outsource Staffing',icon:'🏭',color:'#dc2626', count:5 },
  { id:'c5', key:'benefits',       label:'Benefits Admin',   icon:'🏥', color:'#0891b2', count:2 },
  { id:'c6', key:'training',       label:'Training & L&D',   icon:'📚', color:'#9333ea', count:3 },
]

const VENDORS = [
  { id:'v1',code:'VND-001',name:'MidPoint Staffing Nepal',nepali:'मिडपोइन्ट स्टाफिङ',
    category:'recruitment',tags:['IT','Finance','Engineering'],
    regions:['Kathmandu','Pokhara','Biratnagar'],tier:'preferred',rating:4.8,reviews:127,
    response_time:'2 hrs',ai_match_score:97,is_verified:true,is_licensed:true,
    price_tier:'premium',founding_year:2015,emp_count:85,clients:43,
    services:['IT Recruitment','Finance Hiring','Bulk Hiring','Executive Search'],
    color:'#7c3aed',logo:'🎯',status:'active',
    specialties:['Nepal Labour Law Expert','GDPR Compliant'],
    impact_links:['Vendor Profile','BGV','Agreement','SLA','Billing']},
  { id:'v2',code:'VND-002',name:'TalentBridge HR Solutions',nepali:'टालेन्टब्रिज एचआर',
    category:'recruitment',tags:['Sales','Marketing','Admin'],
    regions:['Kathmandu','Lalitpur'],tier:'approved',rating:4.3,reviews:89,
    response_time:'4 hrs',ai_match_score:82,is_verified:true,is_licensed:true,
    price_tier:'standard',founding_year:2018,emp_count:32,clients:28,
    services:['General Staffing','Sales Hiring','Temp Staffing'],
    color:'#0369a1',logo:'🌉',status:'active',
    specialties:['Fast Turnaround'],
    impact_links:['Vendor Profile','BGV','Agreement']},
  { id:'v3',code:'VND-003',name:'SecureCheck Nepal',nepali:'सेक्युरचेक नेपाल',
    category:'bgv',tags:['Identity','Criminal','Financial'],
    regions:['Nepal-wide'],tier:'preferred',rating:4.9,reviews:214,
    response_time:'1 hr',ai_match_score:99,is_verified:true,is_licensed:true,
    price_tier:'premium',founding_year:2012,emp_count:145,clients:89,
    services:['Identity Verification','Criminal Background','Financial Check','Blockchain BGV'],
    color:'#059669',logo:'🔐',status:'active',
    specialties:['Blockchain Verified','GDPR SOC2'],
    impact_links:['BGV','Vendor Profile','Compliance']},
  { id:'v4',code:'VND-004',name:'SalaryExpert Payroll Nepal',nepali:'सालरी एक्सपर्ट',
    category:'payroll',tags:['Payroll','SSF','Tax'],
    regions:['Nepal-wide'],tier:'preferred',rating:4.7,reviews:156,
    response_time:'3 hrs',ai_match_score:94,is_verified:true,is_licensed:true,
    price_tier:'premium',founding_year:2010,emp_count:210,clients:127,
    services:['Monthly Payroll','SSF Filing','TDS Compliance','Leave Encashment'],
    color:'#d97706',logo:'💸',status:'active',
    specialties:['Nepal IRD Partner','SSF Auto-Filing'],
    impact_links:['Billing','SLA','Agreement']},
  { id:'v5',code:'VND-005',name:'QuickHire Outsource Pvt.',nepali:'क्विकहायर आउटसोर्स',
    category:'outsource',tags:['Security','Housekeeping','Support'],
    regions:['Kathmandu','Chitwan'],tier:'standard',rating:3.7,reviews:45,
    response_time:'8 hrs',ai_match_score:61,is_verified:false,is_licensed:true,
    price_tier:'economy',founding_year:2020,emp_count:18,clients:12,
    services:['Security Guards','Housekeeping','Drivers','Support Staff'],
    color:'#dc2626',logo:'🏭',status:'watch',
    specialties:['Low Cost','High Volume'],
    impact_links:['Compliance Alert','BGV','Agreement']},
  { id:'v6',code:'VND-006',name:'HRBenefits Nepal',nepali:'एचआर बेनिफिट्स नेपाल',
    category:'benefits',tags:['Health','Insurance','Gratuity'],
    regions:['Nepal-wide'],tier:'approved',rating:4.5,reviews:72,
    response_time:'2 hrs',ai_match_score:88,is_verified:true,is_licensed:true,
    price_tier:'standard',founding_year:2016,emp_count:67,clients:48,
    services:['Group Insurance','Gratuity Admin','Festival Bonus','Medical Claims'],
    color:'#0891b2',logo:'🏥',status:'active',
    specialties:['Nepal Insurance Board Reg'],
    impact_links:['Billing','Agreement','SLA']},
]

const TIER_CFG = {
  preferred:{c:'#7c3aed',bg:'#f5f3ff',icon:'⭐'},
  approved:{c:'#0369a1',bg:'#eff6ff',icon:'✓'},
  standard:{c:'#64748b',bg:'#f8fafc',icon:'.'},
  watch:{c:'#ef4444',bg:'#fef2f2',icon:'⚠'},
const CTX_ACTIONS = [
  {icon:'👁',label:'View Vendor Profile',key:'view'},
  {icon:'📝',label:'Request Proposal (RFP)',key:'rfp'},
  {icon:'📋',label:'View Agreement',key:'agreement'},
  {icon:'🔍',label:'BGV Status',key:'bgv'},
  {icon:'⭐',label:'Rate This Vendor',key:'rate'},
  {icon:'🔗',label:'Impact Analysis',key:'impact'},
  {icon:'📤',label:'Export Profile',key:'export'},
  {icon:'⚠',label:'Delist Vendor',key:'delist',danger

:true},
]


// ── Tenant context ────────────────────────────────────────────
function useCompanyCtx() {
  const auth   = (() => { try { return JSON.parse(localStorage.getItem('elogix_auth')||'{}') } catch { return {} } })()
  const regCos = (() => { try { return JSON.parse(localStorage.getItem('elogix_registered_companies')||'{}') } catch { return {} } })()
  const slug   = auth.company?.slug || auth.user?.company || 'demo'
  return {
    company_id:   auth.company?.id || slug,
    company_name: auth.company?.name || regCos[slug]?.name || 'Your Company',
    company_slug: slug,
    plan:         auth.company?.plan || 'trial',
    currency:     auth.company?.currency || 'NPR',
    token:        localStorage.getItem('elogix_token') || auth.token || '',

export default function VendorListingPage() {
  const ctx = useCompanyCtx()  // Tenant scope

  const [vendors, setVendors] = useState(VENDORS)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterTier, setFilterTier] = useState('all')
  const [sortBy, setSortBy] = useState('ai_match_score')
  const [view, setView] = useState('marketplace')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = vendors
    .filter(v=>{
      if (filterCat!=='all' && v.category!==filterCat) return false
      if (filterTier!=='all' && v.tier!==filterTier) return false
      if (search && !v.name.toLowerCase().includes(search.toLowerCase()) &&
          !v.services.join(' ').toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a,b)=>sortBy==='rating'?(b.rating-a.rating):(b.ai_match_score-a.ai_match_score))

  const verified = vendors.filter(v=>v.is_verified).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏪" title="Vendor Listing & Marketplace"
        breadcrumb="Organization Management > Vendor / Outsource Management"
        gradient={G}
        stats={[
          {icon:'🏪',label:'Total Vendors',  value:vendors.length},
          {icon:'✅',label:'Verified',        value:verified},
          {icon:'⭐',label:'Preferred',        value:vendors.filter(v=>v.tier==='preferred').length},
          {icon:'🏷',label:'Categories',      value:CATEGORIES.length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Vendor"
        onExcel={()=>setShowExcel(true)}/>

      {/* Category pills - App-store style */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <button onClick={()=>setFilterCat('all')}
          style={{padding:'8px 16px',borderRadius:20,border:`1.5px solid ${filterCat==='all'?A:'#e2e8f0'}`,background:filterCat==='all'?'#eff6ff':'#fff',color:filterCat==='all'?A:'#64748b',fontSize:11,fontWeight:filterCat==='all'?700:400,cursor:'pointer'}}>
          All Categories
        </button>
        {CATEGORIES.map(c=>(
          <button key={c.key} onClick={()=>setFilterCat(c.key)}
            style={{padding:'8px 16px',borderRadius:20,border:`1.5px solid ${filterCat===c.key?c.color:'#e2e8f0'}`,background:filterCat===c.key?`${c.color}12`:'#fff',color:filterCat===c.key?c.color:'#64748b',fontSize:11,fontWeight:filterCat===c.key?700:400,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
            {c.icon} {c.label} <span style={{background:'#f1f5f9',borderRadius:10,fontSize:9,padding:'0 5px',marginLeft:2}}>{c.count}</span>
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search vendors, services, specializations..."/>
        <select value={filterTier} onChange={e=>setFilterTier(e.target.value)}
          style={{padding:'9px 14px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Tiers</option>
          <option value="preferred">Preferred</option>
          <option value="approved">Approved</option>
          <option value="standard">Standard</option>
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{padding:'9px 14px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="ai_match_score">Sort: AI Match Score</option>
          <option value="rating">Sort: Rating</option>
        </select>
        {['marketplace','table'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'9px 14px',borderRadius:9,border:`1.5px solid ${view===v?A:'#e2e8f0'}`,background:view===v?'#eff6ff':'#fff',color:view===v?A:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>
            {v==='marketplace'?'Marketplace':'Table'}
          </button>
        ))}
      </div>

      {/* MARKETPLACE VIEW */}
      {view==='marketplace' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
          {filtered.map(v=>{
            const tc = TIER_CFG[v.tier]||TIER_CFG.standard
            const catCfg = CATEGORIES.find(c=>c.key===v.category)
            return (
              <LuxCard key={v.id} color={catCfg?.color||A} onClick={()=>setSelected(v)}
                onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:v.name,...v}})}}>
                <div style={{padding:'14px 16px 8px',display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:52,height:52,borderRadius:14,background:`${catCfg?.color||A}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>{v.logo}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                      <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{v.name}</span>
                      {v.is_verified && <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:20}}>✓ Verified</span>}
                    </div>
                    <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic',marginBottom:3}}>{v.nepali}</div>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      <span style={{background:tc.bg,color:tc.c,fontSize:9,fontWeight:700,padding:'1px 7px',borderRadius:20}}>{tc.icon} {v.tier}</span>
                      <span style={{background:`${catCfg?.color||A}12`,color:catCfg?.color||A,fontSize:9,padding:'1px 7px',borderRadius:20,fontWeight:600}}>{catCfg?.label}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:v.ai_match_score>=90?'#10b981':v.ai_match_score>=70?'#f59e0b':'#ef4444'}}>{v.ai_match_score}%</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>AI MATCH</div>
                  </div>
                </div>

                {/* Rating + stats */}
                <div style={{padding:'0 16px 8px',display:'flex',gap:12,alignItems:'center',fontSize:11}}>
                  <div style={{display:'flex',gap:2}}>
                    {[1,2,3,4,5].map(s=><span key={s} style={{color:s<=Math.round(v.rating)?'#f59e0b':'#e2e8f0',fontSize:13}}>★</span>)}
                  </div>
                  <span style={{fontWeight:700,color:'#0f172a'}}>{v.rating}</span>
                  <span style={{color:'#94a3b8'}}>({v.reviews} reviews)</span>
                  <span style={{color:'#64748b',marginLeft:'auto'}}>⏱ {v.response_time}</span>
                </div>

                {/* Services */}
                <div style={{padding:'0 16px 8px',display:'flex',gap:4,flexWrap:'wrap'}}>
                  {v.services.slice(0,3).map((s,i)=>(
                    <span key={i} style={{background:'#f8fafc',color:'#475569',fontSize:9,padding:'2px 8px',borderRadius:20,border:'1px solid #e2e8f0'}}>{s}</span>
                  ))}
                  {v.services.length>3 && <span style={{fontSize:9,color:'#94a3b8',padding:'2px 8px'}}>+{v.services.length-3} more</span>}
                </div>

                {/* Regions */}
                <div style={{padding:'0 16px 10px',fontSize:10,color:'#64748b'}}>
                  <span>📍 {v.regions.join(' . ')}</span>
                </div>

                {v.specialties?.length>0 && (
                  <div style={{padding:'0 14px 10px',display:'flex',gap:4,flexWrap:'wrap'}}>
                    {v.specialties.map((sp,i)=>(
                      <span key={i} style={{background:'#fef9c3',color:'#854d0e',fontSize:9,fontWeight:600,padding:'2px 7px',borderRadius:20,border:'1px solid #fde68a'}}>{sp}</span>
                    ))}
                  </div>
                )}

                <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                  <button onClick={e=>e.stopPropagation()}
                    style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                    Request Proposal
                  </button>
                  <button onClick={e=>{e.stopPropagation();setSelected(v)}}
                    style={{padding:'7px 12px',borderRadius:8,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:11,cursor:'pointer'}}>
                    View
                  </button>
                </div>
              </LuxCard>
            )
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {view==='table' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#f0f9ff,#eff6ff)'}}>
                  {['Code','Vendor','Category','Tier','Rating','AI Match','Response','Regions','Clients','Status'].map(h=>(
                    <th key={h} style={{padding:'12px 12px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v=>{
                  return (
                    <tr key={v.id} style={{borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                      onClick={()=>setSelected(v)}
                      onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:v.name,...v}})}}
                      onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
                      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:10,fontWeight:700,color:A}}>{v.code}</td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <span style={{fontSize:18}}>{v.logo}</span>
                          <div>
                            <div style={{fontWeight:700,color:'#0f172a'}}>{v.name}</div>
                            {v.is_verified && <span style={{fontSize:9,color:'#15803d',fontWeight:700}}>✓ Verified</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{padding:'10px 12px'}}><span style={{background:`${catCfg?.color||A}12`,color:catCfg?.color||A,fontSize:9,padding:'2px 8px',borderRadius:20,fontWeight:600}}>{catCfg?.icon} {catCfg?.label}</span></td>
                      <td style={{padding:'10px 12px'}}><span style={{background:tc.bg,color:tc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{tc.icon} {v.tier}</span></td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{display:'flex',gap:2,alignItems:'center'}}>
                          <span style={{color:'#f59e0b',fontSize:12}}>★</span>
                          <span style={{fontWeight:700}}>{v.rating}</span>
                          <span style={{color:'#94a3b8',fontSize:9}}>({v.reviews})</span>
                        </div>
                      </td>
                      <td style={{padding:'10px 12px',fontWeight:800,color:v.ai_match_score>=90?'#10b981':v.ai_match_score>=70?'#f59e0b':'#ef4444'}}>{v.ai_match_score}%</td>
                      <td style={{padding:'10px 12px',color:'#64748b',fontSize:11}}>{v.response_time}</td>
                      <td style={{padding:'10px 12px',fontSize:10,color:'#64748b'}}>{v.regions.join(', ')}</td>
                      <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:A}}>{v.clients}</td>
                      <td style={{padding:'10px 12px'}}><Badge status={v.status}/></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX_ACTIONS} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>+ Add Vendor to Directory</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Vendor Code" value="" onChange={()=>{}} required accent={A} hint="e.g. VND-007"/>
                <Field label="Vendor Name" value="" onChange={()=>{}} required accent={A}/>
                <Field label="Category" type="select" value="" onChange={()=>{}} accent={A}
                  options={CATEGORIES.map(c=>c.label)}/>
                <Field label="Tier" type="select" value="" onChange={()=>{}} accent={A}
                  options={['preferred','approved','standard']}/>
                <Field label="Regions Served" value="" onChange={()=>{}} accent={A}/>
                <Field label="Website" value="" onChange={()=>{}} accent={A}/>
              </div>
              <div style={{display:'flex',gap:10,marginTop:16}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add to Directory</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showExcel && <ExcelModal title="Vendor Listing" columns={['Code','Name','Category','Tier','Rating','Regions','Services','AI Match','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Code',selected?.code],['Category',selected?.category],['Tier',selected?.tier],
        ['Rating',selected?.rating+' / 5.0 ('+selected?.reviews+' reviews)'],
        ['AI Match Score',selected?.ai_match_score+'%'],
        ['Response Time',selected?.response_time],['Regions',selected?.regions?.join(', ')],
        ['Clients',selected?.clients],['Est.',selected?.founding_year],
        ['Services',selected?.services?.join(', ')],
        ['Specialties',selected?.specialties?.join(', ')],
        ['Price Tier',selected?.price_tier],
      ]}/>
    </div>
  )

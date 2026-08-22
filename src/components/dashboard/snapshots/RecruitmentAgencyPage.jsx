// FILE: RecruitmentAgencyPage.jsx
// Recruitment Agency / Vendor Profile - Luxury HRIS
// AI-driven scoring, Nepal Labour Act 2074 Section 59 compliance

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#7c3aed 100%)'
const A = '#4338ca'

const AGENCIES = [
  { id:'a1', code:'REC-001', name:'MidPoint Staffing Nepal', name_nepali:'मिडपोइन्ट स्टाफिङ नेपाल',
    type:'recruitment', service_categories:['IT Recruitment','Finance','Engineering'],
    license_no:'LS-DOL-2024-0021', license_expiry:'2026-12-31', is_licensed:true,
    contact:'Manisha Shrestha', phone:'9801234567', email:'manisha@midpoint.com.np',
    address:'New Baneshwor, Kathmandu', pan_no:'304567890',
    ssf_registered:true, insurance_valid:true,
    placements_ytd:124, avg_time_to_hire:18, quality_score:91, fill_rate:88,
    specializations:['Tech','Finance','Operations'],
    tier:'preferred', status:'active', risk:'low',
    ai_score:91, ai_recommendation:'Preferred partner. Consistently high fill rates.',
    candidates_placed:124, avg_salary_placed:65000, diversity_score:72,
    agreement_expiry:'2026-12-31', sla_compliance:96,
    impact_links:['Vendor Agreement','SLA & Contract','BGV','Vendor Listing','Billing'] },
  { id:'a2', code:'REC-002', name:'TalentBridge HR Solutions', name_nepali:'टालेन्टब्रिज एचआर',
    type:'recruitment', service_categories:['General Staffing','Sales','Marketing'],
    license_no:'LS-DOL-2023-0087', license_expiry:'2026-06-30', is_licensed:true,
    contact:'Rajan Pandey', phone:'9812345678', email:'rajan@talentbridge.com.np',
    address:'Lazimpat, Kathmandu', pan_no:'312345678',
    ssf_registered:true, insurance_valid:true,
    placements_ytd:89, avg_time_to_hire:24, quality_score:82, fill_rate:79,
    specializations:['Sales','Marketing','Admin'],
    tier:'approved', status:'active', risk:'low',
    ai_score:82, ai_recommendation:'Solid performer. Room to improve time-to-hire.',
    candidates_placed:89, avg_salary_placed:45000, diversity_score:68,
    agreement_expiry:'2026-06-30', sla_compliance:88,
    impact_links:['Vendor Agreement','SLA & Contract','Billing'] },
  { id:'a3', code:'REC-003', name:'Executive Hunt Nepal', name_nepali:'एक्जिक्युटिव हन्ट नेपाल',
    type:'executive_search', service_categories:['C-Suite','Director Level','VP Search'],
    license_no:'LS-DOL-2024-0156', license_expiry:'2026-09-15', is_licensed:true,
    contact:'Priya Adhikari', phone:'9823456789', email:'priya@exechunt.com.np',
    address:'Durbar Marg, Kathmandu', pan_no:'323456789',
    ssf_registered:true, insurance_valid:false,
    placements_ytd:12, avg_time_to_hire:45, quality_score:95, fill_rate:72,
    specializations:['C-Suite','Finance Directors','CTO/CIO'],
    tier:'approved', status:'active', risk:'medium',
    ai_score:87, ai_recommendation:'Excellent for senior roles. Insurance lapsed - action needed.',
    candidates_placed:12, avg_salary_placed:220000, diversity_score:55,
    agreement_expiry:'2026-09-15', sla_compliance:90,
    impact_links:['BGV','Vendor Agreement','SLA & Contract'] },
  { id:'a4', code:'REC-004', name:'QuickHire Outsource Pvt.', name_nepali:'क्विकहायर आउटसोर्स',
    type:'outsource_staffing', service_categories:['Security','Housekeeping','Support'],
    license_no:'LS-DOL-2022-0334', license_expiry:'2026-03-31', is_licensed:true,
    contact:'Bikash Rai', phone:'9834567890', email:'info@quickhire.com.np',
    address:'Gongabu, Kathmandu', pan_no:'334567890',
    ssf_registered:false, insurance_valid:true,
    placements_ytd:342, avg_time_to_hire:5, quality_score:71, fill_rate:95,
    specializations:['Security','Cleaning','Transport'],
    tier:'standard', status:'watch', risk:'high',
    ai_score:62, ai_recommendation:'High volume but SSF non-compliant. Escalate immediately.',
    candidates_placed:342, avg_salary_placed:18000, diversity_score:61,
    agreement_expiry:'2026-03-31', sla_compliance:74,
    impact_links:['Labour Act 2074 Compliance','SSF Alert','Billing','BGV'] },
]

const TIER_CFG = {
  preferred: { c:'#7c3aed', bg:'#f5f3ff', b:'#c4b5fd', icon:'⭐' },
  approved:  { c:'#0369a1', bg:'#eff6ff', b:'#bae6fd', icon:'✓' },
  standard:  { c:'#64748b', bg:'#f8fafc', b:'#e2e8f0', icon:'-' },
  watch:     { c:'#ef4444', bg:'#fef2f2', b:'#fecaca', icon:'⚠' },
}
const RISK_CFG = {
  low:    { c:'#10b981', bg:'#f0fdf4', b:'#bbf7d0' },
  medium: { c:'#f59e0b', bg:'#fffbeb', b:'#fde68a' },
  high:   { c:'#ef4444', bg:'#fef2f2', b:'#fecaca' },
}

const CTX_ACTIONS = [
  {icon:'👁', label:'View Full Profile',       key:'view'},
  {icon:'📋', label:'View Agreement',           key:'agreement'},
  {icon:'📊', label:'SLA Performance',          key:'sla'},
  {icon:'🔍', label:'Background Verification',  key:'bgv'},
  {icon:'💰', label:'Billing & Invoices',        key:'billing'},
  {icon:'🤖', label:'AI Score Analysis',         key:'ai'},
  {icon:'🔗', label:'Impact Analysis',           key:'impact'},
  {icon:'📤', label:'Export Profile',            key:'export'},
  {icon:'⚠', label:'Raise Compliance Flag',     key:'flag', danger:true},
]

function AddAgencyModal({ onClose, onSave }) {
  const [f,setF] = useState({ code:'', name:'', name_nepali:'', type:'recruitment',
    license_no:'', license_expiry:'', pan_no:'', contact:'', phone:'', email:'', address:'',
    specializations:'', tier:'approved' })
  const s = k => v => setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:740,maxHeight:'92vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.35)'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ Register Recruitment Agency</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:3}}>Voice input enabled. DOL license mandatory per Nepal Labour Act 2074 Section 59.</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:11,color:'#991b1b'}}>
            <strong>Nepal Labour Act 2074, Section 59:</strong> Only agencies with a valid DOL Labour Supply License can supply workers. Engaging an unlicensed agency makes you directly liable for workers.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Agency Code" value={f.code} onChange={s('code')} required accent={A} hint="e.g. REC-005"/>
            <Field label="Agency Name" value={f.name} onChange={s('name')} required accent={A}/>
            <Field label="Agency Name (Nepali)" value={f.name_nepali} onChange={s('name_nepali')} accent={A}/>
            <Field label="Agency Type" type="select" value={f.type} onChange={s('type')} accent={A} required
              options={['recruitment','executive_search','outsource_staffing','temp_staffing','background_screening','payroll_processing']}/>
            <Field label="DOL License No." value={f.license_no} onChange={s('license_no')} required accent={A} hint="LS-DOL-YYYY-NNNN"/>
            <Field label="License Expiry" type="date" value={f.license_expiry} onChange={s('license_expiry')} accent={A}/>
            <Field label="PAN No." value={f.pan_no} onChange={s('pan_no')} accent={A}/>
            <Field label="Tier" type="select" value={f.tier} onChange={s('tier')} accent={A}
              options={['preferred','approved','standard']}/>
            <Field label="Contact Person" value={f.contact} onChange={s('contact')} accent={A}/>
            <Field label="Phone" value={f.phone} onChange={s('phone')} accent={A}/>
            <Field label="Email" value={f.email} onChange={s('email')} accent={A}/>
            <Field label="Address" value={f.address} onChange={s('address')} accent={A}/>
            <Field label="Specializations" value={f.specializations} onChange={s('specializations')} accent={A} hint="IT, Finance, Operations (comma separated)"/>
          </div>
          <AIImpact color={A} lines={[
            'Agency profile links to Vendor Agreement, BGV, SLA & Contract, and Billing modules.',
            'AI scoring will run monthly: quality-of-hire, time-to-hire, fill rate, diversity.',
            'DOL license expiry tracked with 90-day auto-alert to Compliance team.',
            'Nepal LA2074 Section 64: You are co-liable for wages/SSF if agency fails to pay.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Register Agency</button>
            <button onClick={onClose} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RecruitmentAgencyPage() {
  const [agencies, setAgencies] = useState(AGENCIES)
  const [view, setView] = useState('cards')
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = agencies.filter(a => {
    if (filterTier !== 'all' && a.tier !== filterTier) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
        !a.code.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const total = agencies.length
  const preferred = agencies.filter(a=>a.tier==='preferred').length
  const avgScore = Math.round(agencies.reduce((s,a)=>s+a.ai_score,0)/agencies.length)
  const totalPlaced = agencies.reduce((s,a)=>s+a.placements_ytd,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏢" title="Recruitment Agency / Vendor Profile"
        breadcrumb="Organization Management > Vendor / Outsource Management"
        gradient={G}
        stats={[
          {icon:'🏢',label:'Total Agencies',  value:total},
          {icon:'⭐',label:'Preferred',        value:preferred},
          {icon:'🤖',label:'Avg AI Score',     value:avgScore+'%'},
          {icon:'👤',label:'Placements YTD',  value:totalPlaced},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Register Agency"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#fdf4ff,#eff6ff)',border:'1px solid #c4b5fd',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:12}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074, Section 59-64:</strong> Agencies must hold DOL Labour Supply License. Main employer co-liable for wages, SSF, insurance. Max 2 service types per agency.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search agencies by name, code, specialization..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:10}}>
          {['all','preferred','approved','standard','watch'].map(t=>(
            <button key={t} onClick={()=>setFilterTier(t)}
              style={{padding:'8px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,fontWeight:filterTier===t?700:400,
                background:filterTier===t?'#fff':'transparent',color:filterTier===t?A:'#64748b',
                boxShadow:filterTier===t?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
              {t==='all'?'All':t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        {['cards','table'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'9px 14px',borderRadius:9,border:`1.5px solid ${view===v?A:'#e2e8f0'}`,background:view===v?'#f5f3ff':'#fff',color:view===v?A:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>
            {v==='cards'?'Cards':'Table'}
          </button>
        ))}
      </div>

      {view==='cards' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:14}}>
          {filtered.map(a=>{
            const tc = TIER_CFG[a.tier]||TIER_CFG.standard
            const rc = RISK_CFG[a.risk]||RISK_CFG.low
            return (
              <LuxCard key={a.id} color={tc.c} onClick={()=>setSelected(a)}
                onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:a.name,...a}})}}>
                <div style={{padding:'14px 16px 0',display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:52,height:52,borderRadius:14,background:`${tc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>🏢</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                      <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{a.name}</span>
                      <span style={{background:tc.bg,color:tc.c,border:`1px solid ${tc.b}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{tc.icon} {a.tier.toUpperCase()}</span>
                      <span style={{background:rc.bg,color:rc.c,border:`1px solid ${rc.b}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{a.risk}</span>
                    </div>
                    <div style={{fontSize:10,color:'#64748b',marginBottom:2}}>{a.code} . {a.type.replace('_',' ')}</div>
                    <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic'}}>{a.name_nepali}</div>
                    <div style={{fontSize:10,color:'#10b981',marginTop:2}}>DOL: {a.license_no}</div>
                  </div>
                </div>

                {/* AI Score bar */}
                <div style={{margin:'10px 16px 6px',background:'#f8fafc',borderRadius:10,padding:'10px 12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:10}}>
                    <span style={{color:'#64748b',fontWeight:600}}>AI Performance Score</span>
                    <span style={{color:a.ai_score>=85?'#10b981':a.ai_score>=70?'#f59e0b':'#ef4444',fontWeight:800}}>{a.ai_score}/100</span>
                  </div>
                  <div style={{height:8,background:'#e2e8f0',borderRadius:8,overflow:'hidden'}}>
                    <div style={{width:`${a.ai_score}%`,height:'100%',borderRadius:8,background:`linear-gradient(90deg,${tc.c},${tc.c}88)`,transition:'width .7s ease'}}/>
                  </div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:4,fontStyle:'italic'}}>{a.ai_recommendation}</div>
                </div>

                {/* KPI Grid */}
                <div style={{padding:'0 14px 10px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
                  {[
                    {l:'Placed YTD',v:a.placements_ytd,c:tc.c},
                    {l:'Time-to-Hire',v:a.avg_time_to_hire+'d',c:'#f59e0b'},
                    {l:'Quality',v:a.quality_score+'%',c:a.quality_score>=85?'#10b981':'#f59e0b'},
                    {l:'Fill Rate',v:a.fill_rate+'%',c:a.fill_rate>=85?'#10b981':'#f59e0b'},
                  ].map((s,i)=>(
                    <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'5px 3px'}}>
                      <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Specializations */}
                <div style={{padding:'0 14px 8px',display:'flex',gap:4,flexWrap:'wrap'}}>
                  {a.specializations.map((sp,i)=>(
                    <span key={i} style={{background:`${tc.c}12`,color:tc.c,fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{sp}</span>
                  ))}
                </div>

                {/* Compliance flags */}
                <div style={{padding:'0 14px 10px',display:'flex',gap:5,flexWrap:'wrap'}}>
                  {[['DOL License',a.is_licensed],['SSF Reg',a.ssf_registered],['Insurance',a.insurance_valid]].map(([l,ok])=>(
                    <span key={l} style={{background:ok?'#f0fdf4':'#fef2f2',color:ok?'#15803d':'#dc2626',border:`1px solid ${ok?'#bbf7d0':'#fecaca'}`,fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20}}>
                      {ok?'✓':'✗'} {l}
                    </span>
                  ))}
                  <span style={{background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bae6fd',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20}}>
                    SLA {a.sla_compliance}%
                  </span>
                </div>

                <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                  <button onClick={e=>{e.stopPropagation();setSelected(a)}}
                    style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${tc.c}12`,color:tc.c,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    View Profile
                  </button>
                  <button onClick={e=>e.stopPropagation()}
                    style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    Agreement
                  </button>
                  <button onClick={e=>e.stopPropagation()}
                    style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#fffbeb',color:'#b45309',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    SLA
                  </button>
                </div>
              </LuxCard>
            )
          })}
        </div>
      )}

      {view==='table' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#f5f3ff,#eff6ff)'}}>
                  {['Code','Agency','Type','Tier','DOL License','Placed YTD','Time-to-Hire','Quality','Fill Rate','AI Score','Status'].map(h=>(
                    <th key={h} style={{padding:'12px 12px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a=>{
                  return (
                    <tr key={a.id} style={{borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                      onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:a.name,...a}})}}
                      onMouseEnter={e=>e.currentTarget.style.background='#f5f3ff'}
                      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:10,fontWeight:700,color:A}}>{a.code}</td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{fontWeight:700,color:'#0f172a',fontSize:12}}>{a.name}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{a.name_nepali}</div>
                      </td>
                      <td style={{padding:'10px 12px'}}><span style={{background:`${tc.c}12`,color:tc.c,fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:600,textTransform:'capitalize'}}>{a.type.replace('_',' ')}</span></td>
                      <td style={{padding:'10px 12px'}}><span style={{background:tc.bg,color:tc.c,border:`1px solid ${tc.b}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{tc.icon} {a.tier}</span></td>
                      <td style={{padding:'10px 12px',fontSize:10,color:'#10b981',fontWeight:600}}>{a.license_no}</td>
                      <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:tc.c}}>{a.placements_ytd}</td>
                      <td style={{padding:'10px 12px',textAlign:'center',color:'#f59e0b',fontWeight:700}}>{a.avg_time_to_hire}d</td>
                      <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:a.quality_score>=85?'#10b981':'#f59e0b'}}>{a.quality_score}%</td>
                      <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:a.fill_rate>=85?'#10b981':'#f59e0b'}}>{a.fill_rate}%</td>
                      <td style={{padding:'10px 12px',textAlign:'center'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{flex:1,height:5,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                            <div style={{width:`${a.ai_score}%`,height:'100%',background:tc.c,borderRadius:3}}/>
                          </div>
                          <span style={{fontSize:10,fontWeight:800,color:tc.c,flexShrink:0}}>{a.ai_score}</span>
                        </div>
                      </td>
                      <td style={{padding:'10px 12px'}}><Badge status={a.status}/></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX_ACTIONS} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showAdd && <AddAgencyModal onClose={()=>setShowAdd(false)} onSave={a=>setAgencies(p=>[...p,{...a,id:'a'+Date.now(),placements_ytd:0,avg_time_to_hire:0,quality_score:0,fill_rate:0,ai_score:0,ai_recommendation:'New agency. Awaiting first placement data.',is_licensed:true,ssf_registered:false,insurance_valid:false,sla_compliance:100,risk:'medium',impact_links:['Vendor Agreement','SLA & Contract']}])}/>}
      {showExcel && <ExcelModal title="Recruitment Agency Profile" columns={['Agency Code','Name','Nepali Name','Type','DOL License','License Expiry','PAN No','Tier','Contact','Phone','Email','Address','Specializations']} onClose={()=>setShowExcel(false)} onImport={f=>alert('Importing: '+f.name)}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Code',selected?.code],['Type',selected?.type],['Tier',selected?.tier?.toUpperCase()],
        ['DOL License',selected?.license_no],['License Expiry',selected?.license_expiry],
        ['PAN',selected?.pan_no],['Contact',selected?.contact],
        ['Phone',selected?.phone],['Email',selected?.email],
        ['Placements YTD',selected?.placements_ytd],['Time-to-Hire',selected?.avg_time_to_hire+' days'],
        ['Quality Score',selected?.quality_score+'%'],['Fill Rate',selected?.fill_rate+'%'],
        ['AI Score',selected?.ai_score+'/100'],['SLA Compliance',selected?.sla_compliance+'%'],
        ['Diversity Score',selected?.diversity_score+'%'],
        ['AI Recommendation',selected?.ai_recommendation],
      ]}/>
    </div>
  )
}

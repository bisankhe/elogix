// FILE: VendorOutsourceMappingPage.jsx
// Vendor & Outsource Employee Mapping - Luxury HRIS Page
// Nepal Labour Act 2074 Section 52-60 compliant

import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0f172a 0%,#1e40af 60%,#7c3aed 100%)'
const A = '#1e40af'

// -- Mock Data -------------------------------------------------
const VENDORS = [
  { id:'v1', code:'VND-001', name:'ShieldGuard Nepal Pvt. Ltd.', name_nepali:'शिल्डगार्ड नेपाल', service:'Security Services',
    moless:'LS-MoLESS-2024-0012', license_expiry:'2026-12-31', is_licensed:true,
    workers:45, active:43, pending:2, compliance:94, risk:'low',
    contact:'Ram Prasad Sharma', phone:'9801234567', email:'info@shieldguard.com.np',
    contract_end:'2026-12-31', billing_npr:225000,
    workers_list:[
      {id:'VE-001',name:'Ramesh Shrestha',role:'Security Guard',branch:'KTM HQ',status:'active',id_ok:true,bg_ok:true,ssf:true,insurance:true},
      {id:'VE-002',name:'Sita Tamang',role:'Security Guard',branch:'KTM HQ',status:'active',id_ok:true,bg_ok:true,ssf:true,insurance:true},
      {id:'VE-003',name:'Bikash Rai',role:'Shift Supervisor',branch:'Pokhara',status:'active',id_ok:true,bg_ok:false,ssf:true,insurance:true},
    ],
    impact_links:[{m:'SLA & Contract',i:'📋'},{m:'Billing & Invoice',i:'💰'},{m:'Attendance',i:'📅'},{m:'HR Policies',i:'⚖'}]},
  { id:'v2', code:'VND-002', name:'CleanPro Services Nepal', name_nepali:'क्लिनप्रो सर्विसेज', service:'Housekeeping',
    moless:'LS-MoLESS-2024-0034', license_expiry:'2026-06-30', is_licensed:true,
    workers:18, active:18, pending:0, compliance:91, risk:'low',
    contact:'Sunita Gurung', phone:'9812345678', email:'info@cleanpro.com.np',
    contract_end:'2026-06-30', billing_npr:72000,
    workers_list:[
      {id:'VE-010',name:'Priya Gurung',role:'Housekeeper',branch:'KTM HQ',status:'active',id_ok:true,bg_ok:true,ssf:true,insurance:true},
    ],
    impact_links:[{m:'SLA & Contract',i:'📋'},{m:'Billing & Invoice',i:'💰'},{m:'Labour Act 2074',i:'⚖'}]},
  { id:'v3', code:'VND-003', name:'TechStaff Solutions Pvt. Ltd.', name_nepali:'टेकस्टाफ सोल्युसन्स', service:'IT Support Staff',
    moless:'LS-MoLESS-2023-0089', license_expiry:'2026-09-15', is_licensed:true,
    workers:12, active:10, pending:2, compliance:78, risk:'medium',
    contact:'Anil Pandey', phone:'9823456789', email:'info@techstaff.com.np',
    contract_end:'2026-09-15', billing_npr:180000,
    workers_list:[
      {id:'VE-020',name:'Hari Thapa',role:'L1 Helpdesk',branch:'KTM HQ',status:'active',id_ok:true,bg_ok:true,ssf:false,insurance:true},
      {id:'VE-021',name:'Maya KC',role:'L1 Helpdesk',branch:'Pokhara',status:'pending',id_ok:true,bg_ok:false,ssf:false,insurance:false},
    ],
    impact_links:[{m:'Co-Employment Risk',i:'⚠'},{m:'Billing & Invoice',i:'💰'}]},
  { id:'v4', code:'VND-004', name:'NepCatering Services', name_nepali:'नेपकेटरिङ सर्विसेज', service:'Cafeteria & Catering',
    moless:'LS-MoLESS-2023-0156', license_expiry:'2026-03-31', is_licensed:true,
    workers:8, active:7, pending:1, compliance:62, risk:'high',
    contact:'Gita Adhikari', phone:'9834567890', email:'info@nepcatering.com.np',
    contract_end:'2026-03-31', billing_npr:48000,
    workers_list:[],
    impact_links:[{m:'SLA Alert',i:'🚨'},{m:'Labour Act 2074',i:'⚖'},{m:'Billing',i:'💰'}]},
]

const RISK_CFG = { low:{c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',l:'Low Risk'}, medium:{c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',l:'Medium'}, high:{c:'#ef4444',bg:'#fef2f2',b:'#fecaca',l:'High Risk'} }
const CTX_ACTIONS = [
  {icon:'👁',label:'View Vendor Profile',key:'view'},
  {icon:'👥',label:'View Workers Roster',key:'workers'},
  {icon:'📋',label:'View SLA Contract',key:'sla'},
  {icon:'💰',label:'Billing & Invoice',key:'billing'},
  {icon:'📅',label:'Attendance Records',key:'attendance'},
  {icon:'⚖',label:'Nepal Law Check',key:'law'},
  {icon:'🔗',label:'Impact Analysis',key:'impact'},
  {icon:'📤',label:'Export to Excel',key:'export'},
  {icon:'🗑',label:'Terminate Mapping',key:'terminate',danger:true},
]

// Add Vendor Modal
function AddVendorModal({onClose,onSave}) {
  const [f,setF] = useState({code:'',name:'',service:'',moless:'',contact:'',phone:'',email:'',contract_end:'',billing:''})
  const s=k=>v=>setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:720,maxHeight:'92vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.35)'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ Map New Vendor / Agency</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:3}}>Voice input available on all fields. MoLESS license mandatory per Labour Act 2074.</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:11,color:'#dc2626'}}>
            <strong>Nepal Labour Act 2074, Section 52:</strong> Only MoLESS-licensed agencies allowed. Using unlicensed agency = workers become direct employees of your company.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Vendor Code" value={f.code} onChange={s('code')} required accent={A} hint="e.g. VND-005"/>
            <Field label="Vendor / Agency Name" value={f.name} onChange={s('name')} required accent={A}/>
            <Field label="Service Category" type="select" value={f.service} onChange={s('service')} accent={A} required
              options={['Security Services','Housekeeping & Sanitation','IT Support Staff','Cafeteria & Catering','Driver & Transport','Gardening & Landscaping','Call Center Support','Business Assistance','Other Non-Core']}/>
            <Field label="MoLESS License No." value={f.moless} onChange={s('moless')} required accent={A} hint="LS-MoLESS-YYYY-NNNN"/>
            <Field label="Contact Person" value={f.contact} onChange={s('contact')} accent={A}/>
            <Field label="Phone" value={f.phone} onChange={s('phone')} accent={A}/>
            <Field label="Email" value={f.email} onChange={s('email')} accent={A}/>
            <Field label="Contract End Date" type="date" value={f.contract_end} onChange={s('contract_end')} accent={A}/>
            <Field label="Monthly Billing (NPR)" type="number" value={f.billing} onChange={s('billing')} accent={A}/>
          </div>
          <AIImpact color={A} lines={[
            'Vendor mapped as Extended Workforce - NOT on company payroll (co-employment prevention).',
            'MoLESS license will be verified and expiry-tracked with 90-day alert.',
            'All deployed workers assigned VE- prefix IDs (distinct from direct employees).',
            'Attendance, billing, and SSF payment verification become HR obligations.',
          ]}/>
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <button onClick={()=>{onSave(f);onClose()}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Map Vendor</button>
            <button onClick={onClose} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VendorOutsourceMappingPage() {
  const { navTo } = useApp()
  const [vendors, setVendors] = useState(VENDORS)
  const [tab, setTab] = useState('vendors')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showWorkers, setShowWorkers] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = vendors.filter(v => !search ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.code.toLowerCase().includes(search.toLowerCase()) ||
    v.service.toLowerCase().includes(search.toLowerCase())
  )

  const totalWorkers = vendors.reduce((s,v)=>s+v.workers,0)
  const avgCompliance = Math.round(vendors.reduce((s,v)=>s+v.compliance,0)/vendors.length)
  const highRisk = vendors.filter(v=>v.risk==='high').length
  const totalBilling = vendors.reduce((s,v)=>s+v.billing_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="🏭" title="Vendor & Outsource Employee Mapping"
        breadcrumb="Organization Management > Workforce Configuration"
        gradient={G}
        stats={[
          {icon:'🏭',label:'Active Vendors', value:vendors.length},
          {icon:'👷',label:'Total Workers',  value:totalWorkers},
          {icon:'📊',label:'Avg Compliance', value:avgCompliance+'%'},
          {icon:'💰',label:'Monthly Billing',value:'NPR '+(totalBilling/1000).toFixed(0)+'K'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Map Vendor"
        onExcel={()=>setShowExcel(true)}
      />

      {/* Nepal law alert */}
      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:12,alignItems:'center'}}>
        <span style={{fontSize:20}}>⚖</span>
        <div style={{fontSize:11,color:'#991b1b'}}>
          <strong>Labour Act 2074 Compliance:</strong> All outsourced workers must come from MoLESS-licensed agencies. Non-core work only.
          Main employer co-liable for wages/SSF/insurance if agency fails to pay. {highRisk>0&&<strong style={{color:'#dc2626'}}>{highRisk} vendor(s) need immediate action!</strong>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:2,background:'#f1f5f9',padding:4,borderRadius:12,marginBottom:16,border:'1px solid #e2e8f0'}}>
        {[{id:'vendors',label:'🏭 Vendor Registry',count:vendors.length},
          {id:'workers',label:'👷 All Workers',count:totalWorkers},
          {id:'compliance',label:'⚖ Compliance Map',count:null}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:'10px 12px',borderRadius:9,border:'none',cursor:'pointer',
              background:tab===t.id?'#fff':'transparent',
              color:tab===t.id?'#0f172a':'#64748b',
              fontWeight:tab===t.id?700:400,fontSize:12,
              boxShadow:tab===t.id?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {t.label}{t.count!==null&&<span style={{marginLeft:6,background:tab===t.id?'#eff6ff':'#e2e8f0',color:tab===t.id?'#1e40af':'#94a3b8',fontSize:10,padding:'1px 7px',borderRadius:10,fontWeight:700}}>{t.count}</span>}
          </button>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search vendors by name, code, or service..."/>

      {/* VENDORS TAB */}
      {tab==='vendors' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:14,marginTop:12}}>
          {filtered.map(v=>{
            const rc = RISK_CFG[v.risk]
            return (
              <LuxCard key={v.id} color={rc.c}
                onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:v.name,...v}})}}
                onClick={()=>setSelected(v)}>
                <div style={{padding:'16px 16px 10px',display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:50,height:50,borderRadius:14,background:`${rc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🏢</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                      <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{v.name}</span>
                      <span style={{background:rc.bg,color:rc.c,border:`1px solid ${rc.b}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{rc.l}</span>
                    </div>
                    <div style={{fontSize:10,color:'#64748b',marginBottom:2}}>{v.code} &bull; {v.service}</div>
                    <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic'}}>{v.name_nepali}</div>
                    <div style={{fontSize:10,color:'#10b981',marginTop:3}}>
                      MoLESS: <strong>{v.moless}</strong>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',padding:'0 16px 10px',gap:8}}>
                  {[
                    {l:'Workers', v:v.workers, c:'#3b82f6'},
                    {l:'Active',  v:v.active,  c:'#10b981'},
                    {l:'Compliance',v:v.compliance+'%',c:v.compliance>=90?'#10b981':v.compliance>=80?'#f59e0b':'#ef4444'},
                    {l:'Billing', v:'NPR '+(v.billing_npr/1000).toFixed(0)+'K',c:'#f59e0b'},
                  ].map((s,i)=>(
                    <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'6px 4px'}}>
                      <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Compliance bar */}
                <div style={{padding:'0 16px 12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
                    <span style={{color:'#64748b',fontWeight:600}}>SLA Compliance</span>
                    <span style={{color:v.compliance>=90?'#10b981':v.compliance>=80?'#f59e0b':'#ef4444',fontWeight:700}}>{v.compliance}%</span>
                  </div>
                  <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}>
                    <div style={{width:`${v.compliance}%`,height:'100%',background:v.compliance>=90?'#10b981':v.compliance>=80?'#f59e0b':'#ef4444',borderRadius:6,transition:'width .6s ease'}}/>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                  <button onClick={e=>{e.stopPropagation();setShowWorkers(v)}}
                    style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#eff6ff',color:'#1d4ed8',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    👷 Workers ({v.workers})
                  </button>
                  <button onClick={e=>{e.stopPropagation();navTo('outsource-sla-contract')}}
                    style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    📋 SLA
                  </button>
                  <button onClick={e=>{e.stopPropagation();navTo('outsource-billing')}}
                    style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#fffbeb',color:'#b45309',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    💰 Billing
                  </button>
                </div>
              </LuxCard>
            )
          })}
        </div>
      )}

      {/* WORKERS TAB */}
      {tab==='workers' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',marginTop:12}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#f8fafc,#eff6ff)'}}>
                  {['Worker ID','Name','Role','Vendor','Branch','ID','BG','SSF','Insurance','Status'].map(h=>(
                    <th key={h} style={{padding:'12px 14px',textAlign:'left',fontSize:10,fontWeight:800,color:'#1e40af',borderBottom:'2px solid #e0e7ff',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.flatMap(v=>v.workers_list.map(w=>(
                  <tr key={w.id} style={{borderBottom:'1px solid #f8fafc'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:10,color:'#1e40af',fontWeight:700}}>{w.id}</td>
                    <td style={{padding:'10px 14px',fontWeight:700,color:'#0f172a'}}>{w.name}</td>
                    <td style={{padding:'10px 14px',color:'#64748b'}}>{w.role}</td>
                    <td style={{padding:'10px 14px'}}><span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:600}}>{v.name.split(' ')[0]}</span></td>
                    <td style={{padding:'10px 14px',color:'#64748b'}}>{w.branch}</td>
                    {[w.id_ok,w.bg_ok,w.ssf,w.insurance].map((ok,i)=>(
                      <td key={i} style={{padding:'10px 14px',textAlign:'center'}}>
                        <span style={{background:ok?'#f0fdf4':'#fef2f2',color:ok?'#15803d':'#dc2626',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{ok?'✓':'✗'}</span>
                      </td>
                    ))}
                    <td style={{padding:'10px 14px'}}><Badge status={w.status}/></td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPLIANCE TAB */}
      {tab==='compliance' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:12}}>
          {vendors.map(v=>{
            const checks = [
              {l:'MoLESS Licensed',  ok:v.is_licensed},
              {l:'License Valid',    ok:new Date(v.license_expiry)>new Date()},
              {l:'Contract Active',  ok:new Date(v.contract_end)>new Date()},
              {l:'All Workers ID Verified',  ok:v.workers_list.every(w=>w.id_ok)},
              {l:'All BG Verified',  ok:v.workers_list.every(w=>w.bg_ok)},
              {l:'SSF Current',      ok:v.workers_list.every(w=>w.ssf)},
              {l:'Insurance Active', ok:v.workers_list.every(w=>w.insurance)},
            ]
            return (
              <div key={v.id} style={{background:'#fff',border:`1px solid ${rc.b}`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${rc.c}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{v.name}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{v.service}</div>
                  </div>
                  <div style={{background:rc.bg,color:rc.c,border:`1px solid ${rc.b}`,fontSize:10,fontWeight:700,padding:'4px 12px',borderRadius:20}}>{v.compliance}%</div>
                </div>
                {checks.map((c,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f8fafc',fontSize:11}}>
                    <span style={{color:'#475569'}}>{c.l}</span>
                    <span style={{color:c.ok?'#10b981':'#ef4444',fontWeight:700}}>{c.ok?'PASS':'FAIL'}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Workers Drawer */}
      {showWorkers && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:4000,display:'flex',justifyContent:'flex-end'}} onClick={()=>setShowWorkers(null)}>
          <div style={{background:'#fff',width:480,height:'100%',overflow:'auto',boxShadow:'-10px 0 40px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px',position:'sticky',top:0}}>
              <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{showWorkers.name}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.7)'}}>{showWorkers.workers} workers mapped</div>
              <button onClick={()=>setShowWorkers(null)} style={{position:'absolute',top:16,right:16,background:'rgba(255,255,255,.2)',border:'none',color:'#fff',width:28,height:28,borderRadius:'50%',cursor:'pointer',fontSize:14}}>✕</button>
            </div>
            <div style={{padding:'16px 24px'}}>
              {showWorkers.workers_list.length===0
                ? <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>No workers mapped yet</div>
                : showWorkers.workers_list.map(w=>(
                  <div key={w.id} style={{background:'#f8fafc',borderRadius:12,padding:'12px 14px',marginBottom:10,border:'1px solid #e2e8f0'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontWeight:700,color:'#0f172a',fontSize:13}}>{w.name}</span>
                      <Badge status={w.status}/>
                    </div>
                    <div style={{fontSize:11,color:'#64748b',marginBottom:6}}>{w.id} &bull; {w.role} &bull; {w.branch}</div>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      {[['ID',w.id_ok],['BG',w.bg_ok],['SSF',w.ssf],['Insurance',w.insurance]].map(([l,ok])=>(
                        <span key={l} style={{background:ok?'#f0fdf4':'#fef2f2',color:ok?'#15803d':'#dc2626',border:`1px solid ${ok?'#bbf7d0':'#fecaca'}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{ok?'✓':'✗'} {l}</span>
                      ))}
                    </div>
                  </div>
                ))
              }
              <button style={{width:'100%',padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',marginTop:8}}>
                + Add Worker to Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links?.map(l=>l.m)} actions={CTX_ACTIONS} onAction={(k,item)=>{if(k==='view')setSelected(item);if(k==='workers')setShowWorkers(item)}} onClose={()=>setCtx(null)}/>}
      {showAdd && <AddVendorModal onClose={()=>setShowAdd(false)} onSave={v=>setVendors(p=>[...p,{...v,id:'v'+Date.now(),workers:0,active:0,pending:0,compliance:100,risk:'low',billing_npr:parseFloat(v.billing||0),workers_list:[],impact_links:[]}])}/>}
      {showExcel && <ExcelModal title="Vendor & Outsource Mapping" columns={['Vendor Code','Name','Service','MoLESS License','Contact','Phone','Email','Contract End','Monthly Billing']} onClose={()=>setShowExcel(false)} onImport={f=>alert('Importing: '+f.name)}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Vendor Code',selected?.code],['Service',selected?.service],
        ['MoLESS License',selected?.moless],['License Expiry',selected?.license_expiry],
        ['Workers',selected?.workers],['Active',selected?.active],
        ['Compliance',selected?.compliance+'%'],['Risk Level',selected?.risk?.toUpperCase()],
        ['Contract End',selected?.contract_end],['Monthly Billing','NPR '+(selected?.billing_npr/1000||0).toFixed(0)+'K'],
        ['Contact',selected?.contact],['Email',selected?.email],
      ]}/>
    </div>
  )
}

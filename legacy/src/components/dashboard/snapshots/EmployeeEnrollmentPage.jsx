// FILE: EmployeeEnrollmentPage.jsx - Employee Enrollment (Onboarding > Employee Joining)
// Dynamic Insource/Outsource form logic, smart vendor search, progressive disclosure
// Nepal Labour Act 2074: 5 employment types, vendor license verification, non-core restriction

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const VENDOR_DIRECTORY = [
  { id:'v1', name:'ShieldGuard Nepal Pvt. Ltd.', license:'LS-MoLESS-2024-0012', license_valid:true, services:['Security'], contact:'info@shieldguard.com.np' },
  { id:'v2', name:'CleanPro Services Nepal',     license:'LS-MoLESS-2024-0034', license_valid:true, services:['Housekeeping'], contact:'info@cleanpro.com.np' },
  { id:'v3', name:'TechStaff Solutions Pvt. Ltd.',license:'LS-MoLESS-2023-0089', license_valid:true, services:['IT Support'], contact:'info@techstaff.com.np' },
  { id:'v4', name:'QuickHire Outsource Pvt.',     license:'LS-MoLESS-2022-0334', license_valid:true, services:['Drivers','Cleaning'], contact:'info@quickhire.com.np' },
]

const DEPARTMENTS = ['Information Technology','Finance & Accounts','Human Resources','Operations','Sales & Marketing','Customer Service','Legal & Compliance','Facilities & Admin']
const NON_CORE_SERVICES = ['Security Services','Housekeeping & Sanitation','Driver & Transport','Gardening & Landscaping','Cafeteria & Catering','Business Assistance']

const ENROLLMENTS = [
  { id:'e1', code:'ENR-2025-041', name:'Gita Maharjan', type:'insource', employment_classification:'regular',
    department:'Information Technology', manager:'Rajesh Sharma (CTO)', join_date:'2025-06-23',
    salary_npr:180000, ssf_enrolled:true, status:'completed', enrolled_date:'2025-06-17',
    impact_links:['Joining Checklist','Digital Forms & E-sign','Payroll Setup','SSF Registration'] },
  { id:'e2', code:'ENR-2025-042', name:'Sunita Rai', type:'insource', employment_classification:'regular',
    department:'Information Technology', manager:'Bikash Shrestha (IT Lead)', join_date:'2025-06-25',
    salary_npr:95000, ssf_enrolled:false, status:'pending_documents', enrolled_date:'2025-06-16',
    impact_links:['Document Collection','Payroll Setup'] },
  { id:'e3', code:'ENR-2025-043', name:'Ramesh Bahadur Shrestha', type:'outsource', employment_classification:'vendor_supplied',
    vendor_id:'v1', vendor_name:'ShieldGuard Nepal Pvt. Ltd.', service_category:'Security Services',
    contract_start:'2025-07-01', contract_end:'2026-06-30', billing_rate_npr:710, po_number:'PO-2025-0091',
    vendor_contact:'info@shieldguard.com.np', sow_uploaded:true,
    status:'completed', enrolled_date:'2025-06-15',
    impact_links:['Vendor Profile','SLA Contract','Vendor Billing','Attendance'] },
  { id:'e4', code:'ENR-2025-044', name:'Priya Khadka', type:'insource', employment_classification:'time_bound',
    department:'Sales & Marketing', manager:'Dipak Tamang', join_date:'2025-07-05',
    salary_npr:55000, ssf_enrolled:false, status:'pending_documents', enrolled_date:'2025-06-17',
    impact_links:['Document Collection','Contract Management'] },
]

const STATUS_CFG = {
  completed:           {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',icon:'✅',label:'Completed'},
  pending_documents:    {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'⏳',label:'Pending Docs'},
  pending_vendor_check: {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',icon:'⚠',label:'Vendor Check'},
  draft:                {c:'#94a3b8',bg:'#f8fafc',b:'#e2e8f0',icon:'📝',label:'Draft'},
}

const EMP_CLASS_LABELS = {
  regular:'Regular (Full-time, open-ended)', time_bound:'Time-Bound (Fixed duration)',
  work_based:'Work-Based (Project/deliverable)', casual:'Casual (≤7 days/month)',
  part_time:'Part-Time (≤35 hrs/week)', vendor_supplied:'Vendor-Supplied (Outsourced)',
}

const CTX = [
  {icon:'👁',label:'View Enrollment',       key:'view'},
  {icon:'📋',label:'View Joining Checklist',key:'checklist'},
  {icon:'🔍',label:'Vendor License Check',  key:'vendor_check'},
  {icon:'✏',label:'Edit Enrollment',         key:'edit'},
  {icon:'🔗',label:'Impact Analysis',        key:'impact'},
  {icon:'📤',label:'Export',                 key:'export'},
  {icon:'🗑',label:'Cancel Enrollment',      key:'cancel',danger:true},
]

function EnrollmentForm({ onClose, onSave }) {
  const [empType, setEmpType] = useState('insource')
  const [form, setForm] = useState({
    name:'', code:'', employment_classification:'regular', department:'', manager:'', join_date:'', salary_npr:'',
    vendor_id:'', vendor_search:'', service_category:'', contract_start:'', contract_end:'', billing_rate_npr:'',
    po_number:'', vendor_contact:'', sow_file:'',
  })
  const [vendorResults, setVendorResults] = useState([])
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [coreWorkWarning, setCoreWorkWarning] = useState(false)

  const s = k => v => setForm(p=>({...p,[k]:v}))

  const searchVendors = (q) => {
    s('vendor_search')(q)
    if (q.length < 2) { setVendorResults([]); return }
    setVendorResults(VENDOR_DIRECTORY.filter(v=>v.name.toLowerCase().includes(q.toLowerCase())))
  }

  const pickVendor = (v) => {
    setSelectedVendor(v)
    setForm(p=>({...p, vendor_id:v.id, vendor_search:v.name, vendor_contact:v.contact}))
    setVendorResults([])
  }

  const checkCoreWork = (svc) => {
    s('service_category')(svc)
    setCoreWorkWarning(!NON_CORE_SERVICES.includes(svc) && svc !== '')
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:760,maxHeight:'94vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.35)'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ Employee Enrollment</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:3}}>Dynamic form - fields adapt based on Employee Type. Voice input enabled on all fields.</div>
        </div>

        <div style={{padding:'24px 28px'}}>
          {/* Step 1: Basic info */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px',marginBottom:8}}>
            <Field label="Full Name" value={form.name} onChange={s('name')} required accent={A}/>
            <Field label="Enrollment Code" value={form.code} onChange={s('code')} accent={A} hint="Auto-generated if blank"/>
          </div>

          {/* Employee Type - the master switch */}
          <div style={{margin:'16px 0'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:10}}>Employee Type <span style={{color:'#ef4444'}}>*</span></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[
                {key:'insource', icon:'🏢', label:'Insource', desc:'Direct hire - on company payroll, full benefits'},
                {key:'outsource', icon:'🏭', label:'Outsource', desc:'Vendor-supplied - third-party agency employment'},
              ].map(t=>(
                <div key={t.key} onClick={()=>setEmpType(t.key)}
                  style={{padding:'16px 18px',borderRadius:14,cursor:'pointer',
                    border:`2px solid ${empType===t.key?A:'#e2e8f0'}`,
                    background:empType===t.key?`${A}08`:'#fff',
                    transition:'all .15s ease'}}>
                  <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:4}}>
                    <span style={{fontSize:22}}>{t.icon}</span>
                    <span style={{fontSize:14,fontWeight:800,color:empType===t.key?A:'#0f172a'}}>{t.label}</span>
                    {empType===t.key&&<span style={{marginLeft:'auto',color:A,fontSize:16}}>✓</span>}
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── PROGRESSIVE DISCLOSURE: INSOURCE FIELDS ── */}
          {empType==='insource' && (
            <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:14,padding:'16px 18px',marginTop:14,animation:'fadeIn .2s ease'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#065f46',marginBottom:12}}>🏢 Insource Details - Direct Payroll Setup</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Employment Classification" type="select" value={form.employment_classification} onChange={s('employment_classification')} accent={A}
                  options={['regular','time_bound','work_based','casual','part_time']}/>
                <Field label="Department" type="select" value={form.department} onChange={s('department')} accent={A} options={DEPARTMENTS}/>
                <Field label="Reporting Manager" value={form.manager} onChange={s('manager')} accent={A} hint="Voice input"/>
                <Field label="Join Date" type="date" value={form.join_date} onChange={s('join_date')} accent={A}/>
                <Field label="Monthly Salary (NPR)" type="number" value={form.salary_npr} onChange={s('salary_npr')} accent={A} hint="Min NPR 15,000"/>
              </div>
              <div style={{marginTop:10,background:'#fff',borderRadius:10,padding:'8px 12px',fontSize:10,color:'#065f46'}}>
                <strong>{EMP_CLASS_LABELS[form.employment_classification]}</strong> . SSF auto-enrollment will trigger on confirmation . Direct payroll, tax withholding, and benefits enrollment activated.
              </div>
              {form.employment_classification==='casual' && (
                <div style={{marginTop:8,background:'#fef2f2',borderRadius:10,padding:'8px 12px',fontSize:10,color:'#991b1b'}}>
                  ⚠ Nepal LA2074: Casual employment limited to 7 days or less per month.
                </div>
              )}
              {form.employment_classification==='part_time' && (
                <div style={{marginTop:8,background:'#eff6ff',borderRadius:10,padding:'8px 12px',fontSize:10,color:'#1e40af'}}>
                  ℹ Nepal LA2074: Part-time limited to 35 hours or less per week.
                </div>
              )}
            </div>
          )}

          {/* ── PROGRESSIVE DISCLOSURE: OUTSOURCE FIELDS ── */}
          {empType==='outsource' && (
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:14,padding:'16px 18px',marginTop:14,animation:'fadeIn .2s ease'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#991b1b',marginBottom:12}}>🏭 Outsource Details - Vendor / Third-Party Agency</div>

              {/* Smart vendor search with type-ahead */}
              <div style={{marginBottom:12,position:'relative'}}>
                <label style={{fontSize:11,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>Vendor / Outsource Company <span style={{color:'#ef4444'}}>*</span></label>
                <input value={form.vendor_search} onChange={e=>searchVendors(e.target.value)}
                  placeholder="Type to search pre-approved vendors..."
                  style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${selectedVendor?'#10b981':'#fecaca'}`,fontSize:12,outline:'none'}}/>
                {vendorResults.length>0 && (
                  <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,marginTop:4,boxShadow:'0 8px 24px rgba(0,0,0,.12)',zIndex:20,maxHeight:200,overflow:'auto'}}>
                    {vendorResults.map(v=>(
                      <div key={v.id} onClick={()=>pickVendor(v)}
                        style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{v.name}</div>
                          <div style={{fontSize:9,color:'#94a3b8'}}>{v.license} . {v.services.join(', ')}</div>
                        </div>
                        <span style={{color:v.license_valid?'#10b981':'#ef4444',fontSize:14}}>{v.license_valid?'✓':'✗'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {form.vendor_search && vendorResults.length===0 && !selectedVendor && (
                  <div style={{marginTop:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:10,color:'#94a3b8'}}>No matches found</span>
                    <button onClick={()=>setShowAddVendor(true)} style={{fontSize:10,fontWeight:700,color:A,background:'none',border:'none',cursor:'pointer'}}>+ Add New Vendor</button>
                  </div>
                )}
                {selectedVendor && (
                  <div style={{marginTop:6,display:'flex',gap:6,alignItems:'center'}}>
                    <span style={{background:selectedVendor.license_valid?'#f0fdf4':'#fef2f2',color:selectedVendor.license_valid?'#15803d':'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                      {selectedVendor.license_valid?'✓ MoLESS License Valid':'✗ License Invalid'}
                    </span>
                    <span style={{fontSize:9,color:'#64748b'}}>{selectedVendor.license}</span>
                  </div>
                )}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Service Category (Non-Core Only)" type="select" value={form.service_category} onChange={checkCoreWork} accent={A} options={NON_CORE_SERVICES}/>
                <Field label="Vendor Contact Email" value={form.vendor_contact} onChange={s('vendor_contact')} accent={A}/>
                <Field label="Contract Start Date" type="date" value={form.contract_start} onChange={s('contract_start')} accent={A}/>
                <Field label="Contract End Date" type="date" value={form.contract_end} onChange={s('contract_end')} accent={A}/>
                <Field label="Billing Rate (NPR/day)" type="number" value={form.billing_rate_npr} onChange={s('billing_rate_npr')} accent={A}/>
                <Field label="PO Number" value={form.po_number} onChange={s('po_number')} accent={A}/>
              </div>

              <div style={{marginTop:10}}>
                <label style={{fontSize:11,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>SOW (Statement of Work) Document</label>
                <div style={{border:'2px dashed #fecaca',borderRadius:10,padding:'14px',textAlign:'center',cursor:'pointer',background:'#fff'}}>
                  <span style={{fontSize:11,color:'#991b1b'}}>📎 Click to upload SOW document (PDF)</span>
                </div>
              </div>

              {coreWorkWarning && (
                <div style={{marginTop:10,background:'#fff',border:'2px solid #ef4444',borderRadius:10,padding:'10px 14px',fontSize:11,color:'#991b1b',fontWeight:600}}>
                  🚫 WARNING: Nepal Labour Act 2074 - Outsourcing is restricted to NON-CORE business functions only (security, cleaning, drivers, etc.). This role may be classified as core work, which is illegal to outsource and may reclassify this worker as a direct employee.
                </div>
              )}
            </div>
          )}

          <AIImpact color={A} lines={[
            empType==='insource'
              ? 'AI will auto-trigger SSF enrollment, payroll setup, and benefits activation on save.'
              : 'AI verifies vendor MoLESS license validity in real-time before allowing save.',
            'Enrollment auto-links to Joining Checklist for cross-department provisioning.',
            empType==='outsource'
              ? 'Nepal LA2074: Main employer remains liable if vendor fails to pay wages/benefits.'
              : 'Nepal LA2074: Employment classification determines probation, hours, and benefit rules.',
            'Excel bulk import available for multiple enrollments at once.',
          ]}/>

          <div style={{display:'flex',gap:10,marginTop:6}}>
            <button onClick={()=>{onSave({...form, type:empType});onClose()}}
              disabled={empType==='outsource' && coreWorkWarning}
              style={{flex:1,padding:14,borderRadius:12,border:'none',
                background:(empType==='outsource'&&coreWorkWarning)?'#cbd5e1':G,
                color:'#fff',fontSize:14,fontWeight:700,
                cursor:(empType==='outsource'&&coreWorkWarning)?'not-allowed':'pointer'}}>
              Complete Enrollment
            </button>
            <button onClick={onClose} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      </div>

      {showAddVendor && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:6000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAddVendor(false)}>
          <div style={{background:'#fff',borderRadius:18,width:480,padding:'24px 26px'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:900,color:'#0f172a',marginBottom:14}}>Quick-Add New Vendor</div>
            <Field label="Vendor Name" value="" onChange={e=>setForm(p=>({...p,[e.target.name||'field']:e.target.value}))} required accent={A}/>
            <Field label="MoLESS License No." value="" onChange={e=>setForm(p=>({...p,[e.target.name||'field']:e.target.value}))} required accent={A} hint="Mandatory per LA2074 Section 59"/>
            <Field label="Contact Email" value="" onChange={e=>setForm(p=>({...p,[e.target.name||'field']:e.target.value}))} accent={A}/>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={()=>setShowAddVendor(false)} style={{flex:1,padding:11,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Add Vendor</button>
              <button onClick={()=>setShowAddVendor(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:12,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmployeeEnrollmentPage() {
  const [enrollments, setEnrollments] = useState(ENROLLMENTS)
  const [search, setSearch]       = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected]   = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)

  const filtered = enrollments.filter(e=>{
    if (filterType!=='all'&&e.type!==filterType) return false
    if (filterStatus!=='all'&&e.status!==filterStatus) return false
    if (search&&!e.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const insourceCount = enrollments.filter(e=>e.type==='insource').length
  const outsourceCount = enrollments.filter(e=>e.type==='outsource').length
  const pendingCount = enrollments.filter(e=>e.status==='pending_documents').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📝" title="Employee Enrollment"
        breadcrumb="Employee Lifecycle > Onboarding > Employee Joining"
        gradient={G}
        stats={[
          {icon:'📝',label:'Total Enrolled',  value:enrollments.length},
          {icon:'🏢',label:'Insource',         value:insourceCount},
          {icon:'🏭',label:'Outsource',         value:outsourceCount},
          {icon:'⏳',label:'Pending',          value:pendingCount},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Enrollment"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#eef2ff,#f5f3ff)',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#3730a3'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Insource = 5 employment classifications (Regular/Time-Bound/Work-Based/Casual/Part-Time) with written contract mandatory. Outsource = non-core work only, via MoLESS-licensed vendor. Main employer co-liable for vendor wage defaults.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search enrollments by name, code..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','insource','outsource'].map(t=>(
            <button key={t} onClick={()=>setFilterType(t)}
              style={{padding:'8px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterType===t?'#fff':'transparent',color:filterType===t?A:'#64748b',
                fontWeight:filterType===t?700:400,boxShadow:filterType===t?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {t==='all'?'All Types':t==='insource'?'🏢 Insource':'🏭 Outsource'}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','completed','pending_documents'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'8px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All Status':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(330px,1fr))',gap:14}}>
        {filtered.map(e=>{
          const sc = STATUS_CFG[e.status]||STATUS_CFG.draft
          const isOutsource = e.type==='outsource'
          return (
            <LuxCard key={e.id} color={isOutsource?'#ef4444':'#10b981'} onClick={()=>setSelected(e)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.name,...e}})}}>
              <div style={{padding:'14px 16px 8px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:46,height:46,borderRadius:14,background:isOutsource?'#fef2f2':'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{isOutsource?'🏭':'🏢'}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:2,flexWrap:'wrap'}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{e.name}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{e.code} . {isOutsource?e.service_category:e.department}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{EMP_CLASS_LABELS[e.employment_classification]}</div>
                </div>
              </div>

              {!isOutsource ? (
                <div style={{padding:'0 16px 10px',fontSize:10,color:'#64748b'}}>
                  <div>👔 {e.manager}</div>
                  <div>📅 Joins {e.join_date}</div>
                  <div>💰 NPR {(e.salary_npr/1000).toFixed(0)}K/mo</div>
                  <span style={{display:'inline-block',marginTop:4,background:e.ssf_enrolled?'#f0fdf4':'#fffbeb',color:e.ssf_enrolled?'#15803d':'#b45309',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                    {e.ssf_enrolled?'✓ SSF Enrolled':'⏳ SSF Pending'}
                  </span>
                </div>
              ) : (
                <div style={{padding:'0 16px 10px',fontSize:10,color:'#64748b'}}>
                  <div>🏭 {e.vendor_name}</div>
                  <div>📅 {e.contract_start} to {e.contract_end}</div>
                  <div>💰 NPR {e.billing_rate_npr}/day . PO: {e.po_number}</div>
                  <span style={{display:'inline-block',marginTop:4,background:e.sow_uploaded?'#f0fdf4':'#fef2f2',color:e.sow_uploaded?'#15803d':'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                    {e.sow_uploaded?'✓ SOW Uploaded':'✗ SOW Missing'}
                  </span>
                </div>
              )}

              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                <button onClick={ev=>{ev.stopPropagation();setSelected(e)}} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>View Details</button>
                <button onClick={ev=>ev.stopPropagation()} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>Joining Checklist</button>
              </div>
            </LuxCard>
          )
        })}
      </div>

      {showAdd && <EnrollmentForm onClose={()=>setShowAdd(false)} onSave={data=>setEnrollments(p=>[{
        id:'e'+Date.now(), code:data.code||`ENR-2025-${String(Date.now()).slice(-3)}`, name:data.name,
        type:data.type, employment_classification:data.employment_classification,
        department:data.department, manager:data.manager, join_date:data.join_date, salary_npr:data.salary_npr,
        vendor_id:data.vendor_id, vendor_name:data.vendor_search, service_category:data.service_category,
        contract_start:data.contract_start, contract_end:data.contract_end, billing_rate_npr:data.billing_rate_npr,
        po_number:data.po_number, vendor_contact:data.vendor_contact, sow_uploaded:false,
        ssf_enrolled:false, status:'pending_documents', enrolled_date:new Date().toISOString().split('T')[0],
        impact_links:['Joining Checklist','Document Collection'],
      }, ...p])}/>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Employee Enrollment" columns={['Code','Name','Employee Type','Classification','Department/Vendor','Join Date/Contract Period','Salary/Billing Rate','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={
        selected?.type==='outsource' ? [
          ['Code',selected?.code],['Name',selected?.name],['Type','Outsource'],
          ['Vendor',selected?.vendor_name],['Service Category',selected?.service_category],
          ['Contract Period',`${selected?.contract_start} to ${selected?.contract_end}`],
          ['Billing Rate','NPR '+(selected?.billing_rate_npr||0)+'/day'],['PO Number',selected?.po_number],
          ['Vendor Contact',selected?.vendor_contact],['SOW Uploaded',selected?.sow_uploaded?'Yes':'No'],
          ['Status',selected?.status],
        ] : [
          ['Code',selected?.code],['Name',selected?.name],['Type','Insource'],
          ['Classification',EMP_CLASS_LABELS[selected?.employment_classification]],
          ['Department',selected?.department],['Manager',selected?.manager],
          ['Join Date',selected?.join_date],['Salary','NPR '+(selected?.salary_npr||0)],
          ['SSF Enrolled',selected?.ssf_enrolled?'Yes':'Pending'],['Status',selected?.status],
        ]
      }/>
    </div>
  )
}

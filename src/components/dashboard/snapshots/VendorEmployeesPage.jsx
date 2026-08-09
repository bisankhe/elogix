// FILE: VendorEmployeesPage.jsx
// Vendor Employees - Contingent Workforce Portal
// Nepal Labour Act 2074 Section 52-64 compliant, AI-driven risk scoring

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#6d28d9 60%,#a78bfa 100%)'
const A = '#6d28d9'

const VE_LIST = [
  { id:'ve1', emp_id:'VE-001', name:'Ramesh Bahadur Shrestha', name_nepali:'रमेश बहादुर श्रेष्ठ',
    role:'Security Guard', service_category:'Security Services',
    vendor_code:'VND-001', vendor_name:'ShieldGuard Nepal Pvt. Ltd.',
    contract_start:'2024-07-01', contract_end:'2026-06-30', days_remaining:365,
    assigned_branch:'KTM HQ', assigned_dept:'Facilities', shift:'Night (22:00-06:00)',
    status:'active', gender:'Male', phone:'9801234567', emergency:'Sita Shrestha 9812345678',
    photo:'RS',
    id_verified:true, bg_verified:true, ssf_paid:true, insurance_active:true, min_wage_ok:true,
    monthly_wage:18500, badge_no:'B-2024-041', has_badge:true, has_system_access:false,
    ai_ghost_risk:12, ai_compliance:96, certifications:['Security License','First Aid'],
    last_attendance:'2025-06-16', attendance_pct:97, leave_balance:8,
    impact_links:['SLA & Contract','Billing','Attendance','BGV','Leave Requests'] },
  { id:'ve2', emp_id:'VE-002', name:'Sunita Gurung', name_nepali:'सुनिता गुरुङ',
    role:'Housekeeper', service_category:'Housekeeping & Sanitation',
    vendor_code:'VND-002', vendor_name:'CleanPro Services Nepal',
    contract_start:'2024-09-01', contract_end:'2026-08-31', days_remaining:440,
    assigned_branch:'KTM HQ', assigned_dept:'Facilities', shift:'Morning (06:00-14:00)',
    status:'active', gender:'Female', phone:'9823456789', emergency:'Ram Gurung 9834567890',
    photo:'SG',
    id_verified:true, bg_verified:true, ssf_paid:true, insurance_active:true, min_wage_ok:true,
    monthly_wage:16500, badge_no:'B-2024-055', has_badge:true, has_system_access:false,
    ai_ghost_risk:8, ai_compliance:98, certifications:['Housekeeping Certificate'],
    last_attendance:'2025-06-16', attendance_pct:99, leave_balance:12,
    impact_links:['Billing','Attendance','Leave Requests'] },
  { id:'ve3', emp_id:'VE-003', name:'Bikash Tamang', name_nepali:'बिकास तामाङ',
    role:'IT Helpdesk L1', service_category:'IT Support Staff',
    vendor_code:'VND-003', vendor_name:'TechStaff Solutions Pvt. Ltd.',
    contract_start:'2025-01-15', contract_end:'2026-01-14', days_remaining:212,
    assigned_branch:'KTM HQ', assigned_dept:'IT', shift:'General (09:00-18:00)',
    status:'active', gender:'Male', phone:'9845678901', emergency:'Mina Tamang 9856789012',
    photo:'BT',
    id_verified:true, bg_verified:false, ssf_paid:false, insurance_active:true, min_wage_ok:true,
    monthly_wage:22000, badge_no:'B-2025-008', has_badge:true, has_system_access:false,
    ai_ghost_risk:35, ai_compliance:71, certifications:['CompTIA A+'],
    last_attendance:'2025-06-15', attendance_pct:88, leave_balance:5,
    impact_links:['Co-Employment Risk','BGV Alert','SSF Alert','Billing'] },
  { id:'ve4', emp_id:'VE-004', name:'Puja Maharjan', name_nepali:'पुजा महर्जन',
    role:'Driver', service_category:'Driver & Transport',
    vendor_code:'VND-001', vendor_name:'ShieldGuard Nepal Pvt. Ltd.',
    contract_start:'2024-04-01', contract_end:'2025-03-31', days_remaining:-78,
    assigned_branch:'Pokhara Office', assigned_dept:'Admin', shift:'General (09:00-18:00)',
    status:'contract_expired', gender:'Female', phone:'9867890123', emergency:'-',
    photo:'PM',
    id_verified:true, bg_verified:true, ssf_paid:false, insurance_active:false, min_wage_ok:true,
    monthly_wage:17000, badge_no:'B-2024-012', has_badge:false, has_system_access:false,
    ai_ghost_risk:78, ai_compliance:42, certifications:['Driving License A'],
    last_attendance:'2025-03-31', attendance_pct:94, leave_balance:0,
    impact_links:['Compliance Alert','Contract Expired','Offboarding Required'] },
  { id:'ve5', emp_id:'VE-005', name:'Hari Prasad Rai', name_nepali:'हरि प्रसाद राई',
    role:'Security Guard', service_category:'Security Services',
    vendor_code:'VND-001', vendor_name:'ShieldGuard Nepal Pvt. Ltd.',
    contract_start:'2025-03-01', contract_end:'2027-02-28', days_remaining:620,
    assigned_branch:'Biratnagar Office', assigned_dept:'Facilities', shift:'Evening (14:00-22:00)',
    status:'active', gender:'Male', phone:'9812398765', emergency:'Kamala Rai 9823498765',
    photo:'HR',
    id_verified:true, bg_verified:true, ssf_paid:true, insurance_active:true, min_wage_ok:true,
    monthly_wage:18000, badge_no:'B-2025-021', has_badge:true, has_system_access:false,
    ai_ghost_risk:5, ai_compliance:99, certifications:['Security License'],
    last_attendance:'2025-06-16', attendance_pct:100, leave_balance:10,
    impact_links:['SLA & Contract','Billing','Attendance'] },
]

const CTX_ACTIONS = [
  {icon:'👁',label:'View Full Profile',      key:'view'},
  {icon:'📅',label:'View Attendance',         key:'attendance'},
  {icon:'🏖',label:'Leave Requests',           key:'leave'},
  {icon:'💰',label:'Cash Advance',             key:'cash'},
  {icon:'💼',label:'Assets Assigned',          key:'assets'},
  {icon:'⚖',label:'Nepal Law Check (LA2074)', key:'law'},
  {icon:'🔍',label:'BGV Status',               key:'bgv'},
  {icon:'🔗',label:'Impact Analysis',          key:'impact'},
  {icon:'📤',label:'Export Profile',           key:'export'},
  {icon:'🚪',label:'Offboard / Terminate',     key:'offboard', danger:true},
]

function AddVEModal({onClose, onSave}) {
  const [f,setF] = useState({emp_id:'',name:'',role:'',vendor_code:'',shift:'',monthly_wage:'',contract_start:'',contract_end:'',branch:'',service_category:''})
  const s=k=>v=>setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:720,maxHeight:'92vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.35)'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ Onboard Vendor Employee</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:3}}>Voice input enabled. VE- prefix ID assigned. Nepal LA2074 Section 64 obligations apply.</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:11,color:'#991b1b'}}>
            <strong>Nepal Labour Act 2074 Section 64:</strong> Main employer must verify vendor license, ensure minimum wage (NPR 15,000), SSF payment, and provide equal workplace facilities. Worker cannot be engaged in core business functions.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Employee ID (VE- prefix)" value={f.emp_id} onChange={s('emp_id')} required accent={A} hint="e.g. VE-006"/>
            <Field label="Full Name" value={f.name} onChange={s('name')} required accent={A}/>
            <Field label="Full Name (Nepali)" value={f.name_nepali} onChange={s('name_nepali')} accent={A}/>
            <Field label="Service Category" type="select" value={f.service_category} onChange={s('service_category')} accent={A} required
              options={['Security Services','Housekeeping & Sanitation','Driver & Transport','IT Support Staff','Cafeteria & Catering','Gardening','Call Center Support','Business Assistance']}/>
            <Field label="Role / Designation" value={f.role} onChange={s('role')} required accent={A}/>
            <Field label="Vendor / Agency" type="select" value={f.vendor_code} onChange={s('vendor_code')} accent={A} required
              options={['VND-001 ShieldGuard Nepal','VND-002 CleanPro Services','VND-003 TechStaff Solutions','VND-004 QuickHire Outsource']}/>
            <Field label="Assigned Branch" type="select" value={f.branch} onChange={s('branch')} accent={A}
              options={['KTM HQ','Pokhara Office','Biratnagar Office','Birgunj Office']}/>
            <Field label="Shift" type="select" value={f.shift} onChange={s('shift')} accent={A}
              options={['General (09:00-18:00)','Morning (06:00-14:00)','Evening (14:00-22:00)','Night (22:00-06:00)']}/>
            <Field label="Contract Start" type="date" value={f.contract_start} onChange={s('contract_start')} accent={A}/>
            <Field label="Contract End" type="date" value={f.contract_end} onChange={s('contract_end')} accent={A}/>
            <Field label="Monthly Wage (NPR)" type="number" value={f.monthly_wage} onChange={s('monthly_wage')} accent={A} hint="Min NPR 15,000"/>
          </div>
          <AIImpact color={A} lines={[
            'VE- prefix ID distinguishes vendor workers from direct employees.',
            'Wage must be >= NPR 15,000. SSF and Insurance verified at onboarding.',
            'Has badge access = TRUE. Has system access = ALWAYS FALSE (co-employment prevention).',
            'AI ghost risk score and compliance score tracked monthly.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Onboard Vendor Employee</button>
            <button onClick={onClose} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VendorEmployeesPage() {
  const [employees, setEmployees] = useState(VE_LIST)
  const [view, setView] = useState('cards')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterVendor, setFilterVendor] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = employees.filter(e=>{
    if (filterStatus!=='all'&&e.status!==filterStatus) return false
    if (filterVendor!=='all'&&e.vendor_code!==filterVendor) return false
    if (search&&!e.name.toLowerCase().includes(search.toLowerCase())&&!e.emp_id.toLowerCase().includes(search.toLowerCase())&&!e.role.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const active = employees.filter(e=>e.status==='active').length
  const expired = employees.filter(e=>e.status==='contract_expired').length
  const highRisk = employees.filter(e=>e.ai_ghost_risk>50).length
  const ssfIssues = employees.filter(e=>!e.ssf_paid).length

  const vendors = [...new Set(employees.map(e=>e.vendor_code))]

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="👷" title="Vendor Employees"
        breadcrumb="Organization Management > Vendor / Outsource Employee Management"
        gradient={G}
        stats={[
          {icon:'👷',label:'Total Workers',   value:employees.length},
          {icon:'✅',label:'Active',           value:active},
          {icon:'⏰',label:'Contract Expired', value:expired},
          {icon:'⚠',label:'SSF Issues',       value:ssfIssues},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Onboard Worker"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#991b1b'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074, Section 64:</strong> Main employer co-liable for wages, SSF, insurance. Non-core work only. Equal facilities mandatory. Attendance records required.
          {highRisk>0 && <strong style={{color:'#dc2626'}}> {highRisk} high ghost-risk worker(s) detected!</strong>}
        </div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, VE-ID, role..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:10}}>
          {['all','active','contract_expired'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'8px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':s==='active'?'Active':'Expired'}
            </button>
          ))}
        </div>
        <select value={filterVendor} onChange={e=>setFilterVendor(e.target.value)}
          style={{padding:'9px 14px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Vendors</option>
          {vendors.map(v=><option key={v} value={v}>{v}</option>)}
        </select>
        {['cards','table'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'9px 14px',borderRadius:9,border:`1.5px solid ${view===v?A:'#e2e8f0'}`,background:view===v?'#ede9fe':'#fff',color:view===v?A:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>
            {v==='cards'?'Cards':'Table'}
          </button>
        ))}
      </div>

      {view==='cards' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
          {filtered.map(e=>{
            const riskColor = e.ai_ghost_risk>50?'#ef4444':e.ai_ghost_risk>25?'#f59e0b':'#10b981'
            return (
              <LuxCard key={e.id} color={expired?'#ef4444':A} onClick={()=>setSelected(e)}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.name,...e}})}}>
                {expired && <div style={{background:'#fef2f2',padding:'4px 14px',fontSize:9,fontWeight:800,color:'#dc2626',borderBottom:'1px solid #fecaca'}}>CONTRACT EXPIRED - OFFBOARDING REQUIRED</div>}
                <div style={{padding:'14px 16px 8px',display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:48,height:48,borderRadius:14,background:`${expired?'#ef4444':A}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:expired?'#dc2626':A,flexShrink:0}}>{e.photo}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a',marginBottom:1}}>{e.name}</div>
                    <div style={{fontSize:9,color:'#94a3b8',fontStyle:'italic',marginBottom:2}}>{e.name_nepali}</div>
                    <div style={{fontSize:10,color:A,fontWeight:700,fontFamily:'monospace'}}>{e.emp_id}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{e.role} . {e.vendor_name.split(' ')[0]}</div>
                  </div>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:900,color:riskColor}}>{e.ai_compliance}%</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>COMPLIANCE</div>
                  </div>
                </div>

                <div style={{padding:'0 14px 8px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
                  {[
                    {l:'Attendance', v:e.attendance_pct+'%', c:e.attendance_pct>=95?'#10b981':'#f59e0b'},
                    {l:'Leave Bal',  v:e.leave_balance+'d',   c:'#3b82f6'},
                    {l:'Days Left',  v:e.days_remaining>0?e.days_remaining+'d':'Expired', c:e.days_remaining>90?'#10b981':e.days_remaining>0?'#f59e0b':'#ef4444'},
                  ].map((s,i)=>(
                    <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'5px 3px'}}>
                      <div style={{fontSize:11,fontWeight:800,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                    </div>
                  ))}
                </div>

                <div style={{padding:'0 14px 8px',display:'flex',gap:4,flexWrap:'wrap'}}>
                  {[['ID',e.id_verified],['BG',e.bg_verified],['SSF',e.ssf_paid],['Insurance',e.insurance_active]].map(([l,ok])=>(
                    <span key={l} style={{background:ok?'#f0fdf4':'#fef2f2',color:ok?'#15803d':'#dc2626',border:`1px solid ${ok?'#bbf7d0':'#fecaca'}`,fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20}}>
                      {ok?'✓':'✗'} {l}
                    </span>
                  ))}
                  {e.has_badge && <span style={{background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bae6fd',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20}}>Badge</span>}
                </div>

                <div style={{padding:'0 14px 8px',fontSize:10,color:'#64748b'}}>
                  <span>📍 {e.assigned_branch} . {e.shift.split(' ')[0]}</span>
                  {e.ai_ghost_risk>25 && <span style={{marginLeft:8,color:riskColor,fontWeight:700}}>Ghost Risk: {e.ai_ghost_risk}%</span>}
                </div>

                <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 10px',display:'flex',gap:5}}>
                  <button onClick={ev=>{ev.stopPropagation();setSelected(e)}} style={{flex:1,padding:'7px',borderRadius:7,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>Profile</button>
                  <button onClick={ev=>ev.stopPropagation()} style={{flex:1,padding:'7px',borderRadius:7,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>Attendance</button>
                  {expired && <button onClick={ev=>ev.stopPropagation()} style={{flex:1,padding:'7px',borderRadius:7,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer'}}>Offboard</button>}
                </div>
              </LuxCard>
            )
          })}
        </div>
      )}

      {view==='table' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#ede9fe,#eff6ff)'}}>
                  {['VE-ID','Name','Role','Vendor','Branch','Shift','Contract End','Attendance','Compliance','ID','BG','SSF','Ins','Status'].map(h=>(
                    <th key={h} style={{padding:'11px 10px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e=>(
                  <tr key={e.id} style={{borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                    onClick={()=>setSelected(e)}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.name,...e}})}}
                    onMouseEnter={ev=>ev.currentTarget.style.background='#ede9fe'}
                    onMouseLeave={ev=>ev.currentTarget.style.background='#fff'}>
                    <td style={{padding:'9px 10px',fontFamily:'monospace',fontSize:10,fontWeight:800,color:A}}>{e.emp_id}</td>
                    <td style={{padding:'9px 10px'}}>
                      <div style={{fontWeight:700,color:'#0f172a',fontSize:11}}>{e.name}</div>
                      <div style={{fontSize:9,color:'#94a3b8'}}>{e.name_nepali}</div>
                    </td>
                    <td style={{padding:'9px 10px',color:'#475569',fontSize:10}}>{e.role}</td>
                    <td style={{padding:'9px 10px',color:'#64748b',fontSize:10}}>{e.vendor_code}</td>
                    <td style={{padding:'9px 10px',fontSize:10,color:'#64748b'}}>{e.assigned_branch}</td>
                    <td style={{padding:'9px 10px',fontSize:10,color:'#64748b'}}>{e.shift.split(' ')[0]}</td>
                    <td style={{padding:'9px 10px',fontSize:10,color:e.days_remaining<0?'#dc2626':e.days_remaining<90?'#f59e0b':'#10b981',fontWeight:700}}>{e.contract_end}</td>
                    <td style={{padding:'9px 10px',textAlign:'center',fontWeight:700,color:e.attendance_pct>=95?'#10b981':'#f59e0b'}}>{e.attendance_pct}%</td>
                    <td style={{padding:'9px 10px',textAlign:'center',fontWeight:700,color:e.ai_compliance>=90?'#10b981':e.ai_compliance>=70?'#f59e0b':'#ef4444'}}>{e.ai_compliance}%</td>
                    {[e.id_verified,e.bg_verified,e.ssf_paid,e.insurance_active].map((ok,i)=>(
                      <td key={i} style={{padding:'9px 10px',textAlign:'center'}}><span style={{color:ok?'#10b981':'#ef4444',fontWeight:700}}>{ok?'✓':'✗'}</span></td>
                    ))}
                    <td style={{padding:'9px 10px'}}><Badge status={e.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX_ACTIONS} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showAdd && <AddVEModal onClose={()=>setShowAdd(false)} onSave={e=>setEmployees(p=>[...p,{...e,id:'ve'+Date.now(),status:'active',ai_ghost_risk:0,ai_compliance:100,attendance_pct:0,leave_balance:0,days_remaining:365,id_verified:false,bg_verified:false,ssf_paid:false,insurance_active:false,has_badge:false,has_system_access:false,photo:e.name?.substring(0,2).toUpperCase()||'VE',impact_links:['Billing','Attendance','BGV']}])}/>}
      {showExcel && <ExcelModal title="Vendor Employees" columns={['VE-ID','Name','Nepali Name','Role','Service Category','Vendor Code','Branch','Shift','Contract Start','Contract End','Monthly Wage NPR','Phone','Emergency Contact']} onClose={()=>setShowExcel(false)} onImport={f=>alert('Importing: '+f.name)}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['VE-ID',selected?.emp_id],['Role',selected?.role],['Service Category',selected?.service_category],
        ['Vendor',selected?.vendor_name],['Branch',selected?.assigned_branch],['Shift',selected?.shift],
        ['Contract Period',`${selected?.contract_start} to ${selected?.contract_end}`],
        ['Days Remaining',selected?.days_remaining],
        ['Monthly Wage','NPR '+(selected?.monthly_wage||0)],
        ['Attendance',selected?.attendance_pct+'%'],['Leave Balance',selected?.leave_balance+' days'],
        ['Compliance Score',selected?.ai_compliance+'%'],['Ghost Risk',selected?.ai_ghost_risk+'%'],
        ['Badge No',selected?.badge_no],['Phone',selected?.phone],
        ['Emergency Contact',selected?.emergency],
        ['Certifications',selected?.certifications?.join(', ')],
        ['Status',selected?.status],
      ]}/>
    </div>
  )
}

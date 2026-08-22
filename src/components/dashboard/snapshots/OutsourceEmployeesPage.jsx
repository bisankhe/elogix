// FILE: OutsourceEmployeesPage.jsx - Page 3: Outsource Employees

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const T = { gradient:'linear-gradient(135deg,#065f46 0%,#10b981 100%)', accent:'#065f46', light:'#f0fdf4' }

const MOCK_EMPLOYEES = [
  {id:'oe1', emp_id:'OUT-001', name:'Ramesh Shrestha', nepali:'रमेश श्रेष्ठ',
   vendor:'ShieldGuard Nepal', service:'Security', role:'Security Guard',
   assigned_to:'Kathmandu HQ - Gate 1', shift:'Night (10PM-6AM)',
   join_date:'2024-01-15', contract_end:'2026-12-31',
   attendance_pct:98, wage_npr:18000, insurance:true, ssf_paid:true,
   status:'active', id_verified:true, bg_verified:true,
   skills:['Security Protocol','First Aid','Fire Safety'],
   icon:'🔐', color:'#ef4444',
   impact_links:[{icon:'📅',module:'Attendance',desc:'Night shift tracker'},{icon:'💰',module:'Agency Billing',desc:'Included in monthly invoice'}],
  },
  {id:'oe2', emp_id:'OUT-002', name:'Sita Tamang', nepali:'सिता तामाङ',
   vendor:'CleanPro Services Nepal', service:'Housekeeping', role:'Housekeeping Staff',
   assigned_to:'All Floors - KTM HQ', shift:'Day (7AM-3PM)',
   join_date:'2024-07-10', contract_end:'2026-06-30',
   attendance_pct:91, wage_npr:16500, insurance:true, ssf_paid:true,
   status:'active', id_verified:true, bg_verified:true,
   skills:['Cleaning Protocols','Chemical Handling','EHS Compliance'],
   icon:'🧹', color:'#10b981',
   impact_links:[{icon:'📅',module:'Attendance',desc:'Day shift tracker'},{icon:'⚖',module:'Safety',desc:'EHS compliance required'}],
  },
  {id:'oe3', emp_id:'OUT-003', name:'Bikash Rai', nepali:'विकास राई',
   vendor:'TechStaff Solutions', service:'IT Support', role:'L1 Helpdesk Technician',
   assigned_to:'IT Helpdesk - KTM HQ', shift:'Day (9AM-6PM)',
   join_date:'2023-10-15', contract_end:'2026-09-15',
   attendance_pct:88, wage_npr:22000, insurance:true, ssf_paid:false,
   status:'active', id_verified:true, bg_verified:true,
   skills:['Windows OS','Network Troubleshooting','Hardware Repair'],
   icon:'💻', color:'#3b82f6',
   impact_links:[{icon:'⚠',module:'SSF Alert',desc:'Agency SSF payment overdue'},{icon:'📅',module:'Attendance',desc:'88% rate - below target'}],
  },
  {id:'oe4', emp_id:'OUT-004', name:'Priya Gurung', nepali:'प्रिया गुरुङ',
   vendor:'ShieldGuard Nepal', service:'Security', role:'Security Guard',
   assigned_to:'Kathmandu HQ - Parking', shift:'Day (6AM-2PM)',
   join_date:'2024-02-01', contract_end:'2026-12-31',
   attendance_pct:95, wage_npr:18000, insurance:true, ssf_paid:true,
   status:'active', id_verified:true, bg_verified:false,
   skills:['Security Protocol','CCTV Monitoring'],
   icon:'🔐', color:'#ef4444',
   impact_links:[{icon:'⚠',module:'Background Check',desc:'BG verification pending'},{icon:'📅',module:'Attendance',desc:'95% attendance'}],
  },
  {id:'oe5', emp_id:'OUT-005', name:'Hari Thapa', nepali:'हरि थापा',
   vendor:'NepCatering Services', service:'Cafeteria', role:'Kitchen Staff',
   assigned_to:'HQ Cafeteria - Ground Floor', shift:'Day (7AM-4PM)',
   join_date:'2023-04-10', contract_end:'2026-03-31',
   attendance_pct:83, wage_npr:16000, insurance:false, ssf_paid:false,
   status:'warning', id_verified:true, bg_verified:true,
   skills:['Food Handling','Kitchen Safety','HACCP'],
   icon:'🍽', color:'#f59e0b',
   impact_links:[{icon:'⚠',module:'Compliance Alert',desc:'Insurance & SSF not paid by agency'},{icon:'⚖',module:'Labour Act',desc:'Main employer co-liable if unpaid'}],
  },
]

const CONTEXT_ACTIONS = [
  {icon:'👁', label:'View Profile',          key:'view'},
  {icon:'✏', label:'Edit Details',          key:'edit'},
  {icon:'📅', label:'View Attendance',       key:'attendance'},
  {icon:'🔍', label:'Verify Background',     key:'bg'},
  {icon:'⚖', label:'Labour Law Check',     key:'law'},
  {icon:'⚠', label:'Raise Compliance Flag', key:'flag'},
  {icon:'📤', label:'Export Profile',        key:'export'},
  {icon:'🚫', label:'End Assignment',        key:'end', danger:true},
]

export default function OutsourceEmployeesPage() {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES)
  const [ctx,       setCtx]       = useState(null)
  const [showAdd,   setShowAdd]   = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')

  const filtered = employees.filter(e =>
    (filter==='all'||e.status===filter||e.vendor.toLowerCase().includes(filter.toLowerCase())) &&
    (!search||e.name.toLowerCase().includes(search.toLowerCase())||e.emp_id.toLowerCase().includes(search.toLowerCase()))
  )

  const [groupBy, setGroupBy] = useState('all') // 'all' | 'by-company' | 'by-dept'

  const warnings = employees.filter(e=>e.status==='warning'||!e.ssf_paid||!e.insurance||!e.bg_verified)

  // Group employees by vendor company
  const byCompany = employees.reduce((acc, e) => {
    if (!acc[e.vendor]) acc[e.vendor] = []
    acc[e.vendor].push(e)
    return acc
  }, {})

  // Group employees by assigned department/location
  const byDept = employees.reduce((acc, e) => {
    const dept = e.assigned_to.split('-')[0].trim()
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(e)
    return acc
  }, {})

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="👷" title="Outsource Employees"
        breadcrumb="Organization Management > Workforce Configuration > Employment Type > Outsource"
        gradient={T.gradient}
        stats={[
          {icon:'👷',label:'Total Workers',     value:employees.length},
          {icon:'✅',label:'Compliant',          value:employees.filter(e=>e.status==='active'&&e.ssf_paid&&e.insurance&&e.bg_verified).length},
          {icon:'⚠', label:'Compliance Issues', value:warnings.length},
          {icon:'📊',label:'Avg Attendance',     value:Math.round(employees.reduce((s,e)=>s+e.attendance_pct,0)/employees.length)+'%'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Worker"
        onExcel={()=>setShowExcel(true)}
      />

      {/* Compliance alerts */}
      {warnings.length > 0 && (
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:800,color:'#dc2626',marginBottom:6}}>
            Labour Act 2074 Compliance Alerts - Main Employer Co-Liability Risk
          </div>
          {employees.filter(e=>!e.ssf_paid).map((e,i)=>(
            <div key={i} style={{fontSize:11,color:'#991b1b',padding:'3px 0',display:'flex',gap:6}}>
              <span>⚠️</span><span><strong>{e.name}</strong> ({e.vendor}) - Agency has NOT paid SSF. Main employer is co-liable per Labour Act 2074.</span>
            </div>
          ))}
          {employees.filter(e=>!e.insurance).map((e,i)=>(
            <div key={i} style={{fontSize:11,color:'#991b1b',padding:'3px 0',display:'flex',gap:6}}>
              <span>⚠️</span><span><strong>{e.name}</strong> ({e.vendor}) - Insurance not provided. Mandatory per Labour Act 2074.</span>
            </div>
          ))}
          {employees.filter(e=>!e.bg_verified).map((e,i)=>(
            <div key={i} style={{fontSize:11,color:'#b45309',padding:'3px 0',display:'flex',gap:6}}>
              <span>🔍</span><span><strong>{e.name}</strong> - Background verification pending. Required for security-related roles.</span>
            </div>
          ))}
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name or employee ID..."
        extra={
          <div style={{display:'flex',gap:5}}>
            {['all','active','warning'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:'8px 14px',borderRadius:20,border:`1.5px solid ${filter===f?T.accent:'#e2e8f0'}`,
                  background:filter===f?T.light:'#fff',color:filter===f?T.accent:'#64748b',
                  fontSize:11,fontWeight:600,cursor:'pointer'}}>
                {f==='all'?'All':f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        }/>

      {/* Group-by selector */}
      <div style={{display:'flex',gap:6,marginBottom:10,background:'#f1f5f9',padding:3,borderRadius:10}}>
        {[['all','All Employees'],['by-company','By Outsource Company'],['by-dept','By Department']].map(([k,l])=>(
          <button key={k} onClick={()=>setGroupBy(k)}
            style={{flex:1,padding:'8px 10px',borderRadius:8,border:'none',cursor:'pointer',fontSize:10,
              background:groupBy===k?'#fff':'transparent',color:groupBy===k?T.accent:'#64748b',
              fontWeight:groupBy===k?700:400,boxShadow:groupBy===k?'0 1px 4px rgba(0,0,0,.08)':'none'}}>{l}</button>
        ))}
      </div>
      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'8px 14px',marginBottom:14,fontSize:11,color:'#166534'}}>
        {groupBy==='all'?'Right-click any worker for compliance check, background verification, and Labour Act 2074 co-liability analysis':groupBy==='by-company'?'Grouped by outsource company — see which vendors supply staff to which departments':'Grouped by department — see which departments use outsource staff and from which companies'}
      </div>

      {/* GROUPED BY COMPANY */}
      {groupBy==='by-company' && (
        <div style={{display:'grid',gap:14}}>
          {Object.entries(byCompany).map(([company, workers])=>(
            <div key={company} style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{background:'linear-gradient(135deg,#f0fdf4,#fff)',padding:'12px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#065f46'}}>{company}</div>
                <div style={{display:'flex',gap:10,fontSize:10,color:'#64748b'}}>
                  <span>👷 {workers.length} workers</span>
                  <span>📅 Avg att: {Math.round(workers.reduce((s,e)=>s+e.attendance_pct,0)/workers.length)}%</span>
                  <span>Depts: {[...new Set(workers.map(e=>e.assigned_to.split('-')[0].trim()))].join(', ')}</span>
                </div>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                  <thead><tr style={{background:'#f8fafc'}}>{['Name','Role','Assigned To','Shift','Attendance','Status'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:9,fontWeight:700,color:'#64748b'}}>{h}</th>)}</tr></thead>
                  <tbody>{workers.map((e,i)=>(
                    <tr key={e.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                      <td style={{padding:'8px 12px',fontWeight:700}}>{e.name}</td>
                      <td style={{padding:'8px 12px',color:'#475569'}}>{e.role}</td>
                      <td style={{padding:'8px 12px',color:'#64748b',fontSize:9}}>{e.assigned_to}</td>
                      <td style={{padding:'8px 12px',color:'#64748b'}}>{e.shift.split('(')[0].trim()}</td>
                      <td style={{padding:'8px 12px'}}><span style={{color:e.attendance_pct>=90?'#10b981':'#f59e0b',fontWeight:700}}>{e.attendance_pct}%</span></td>
                      <td style={{padding:'8px 12px'}}>{[!e.ssf_paid&&'SSF⚠',!e.insurance&&'Ins⚠',!e.bg_verified&&'BGV⚠'].filter(Boolean).join(' ')||'✅'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GROUPED BY DEPT */}
      {groupBy==='by-dept' && (
        <div style={{display:'grid',gap:14}}>
          {Object.entries(byDept).map(([dept, workers])=>(
            <div key={dept} style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{background:'linear-gradient(135deg,#eff6ff,#fff)',padding:'12px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#1e40af'}}>📍 {dept}</div>
                <div style={{display:'flex',gap:10,fontSize:10,color:'#64748b'}}>
                  <span>👷 {workers.length} outsource staff</span>
                  <span>Companies: {[...new Set(workers.map(e=>e.vendor.split(' ')[0]))].join(', ')}</span>
                </div>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                  <thead><tr style={{background:'#f8fafc'}}>{['Name','Vendor Company','Role','Shift','Attendance','Compliance'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:9,fontWeight:700,color:'#64748b'}}>{h}</th>)}</tr></thead>
                  <tbody>{workers.map((e,i)=>(
                    <tr key={e.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                      <td style={{padding:'8px 12px',fontWeight:700}}>{e.name}</td>
                      <td style={{padding:'8px 12px',color:'#475569',fontSize:9}}>{e.vendor}</td>
                      <td style={{padding:'8px 12px',color:'#64748b'}}>{e.role}</td>
                      <td style={{padding:'8px 12px',color:'#64748b'}}>{e.shift.split('(')[0].trim()}</td>
                      <td style={{padding:'8px 12px'}}><span style={{color:e.attendance_pct>=90?'#10b981':'#f59e0b',fontWeight:700}}>{e.attendance_pct}%</span></td>
                      <td style={{padding:'8px 12px'}}>{[!e.ssf_paid&&'SSF⚠',!e.insurance&&'Ins⚠',!e.bg_verified&&'BGV⚠'].filter(Boolean).join(' ')||'✅ OK'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ALL EMPLOYEES (cards) */}
      {groupBy==='all' && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
        {filtered.map(emp=>{
          const hasIssues = !emp.ssf_paid||!emp.insurance||!emp.bg_verified||emp.status==='warning'
          return (
            <LuxCard key={emp.id} color={hasIssues?'#ef4444':emp.color}
              onClick={()=>setSelected(emp)}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:emp.name,...emp}})}}>
              {hasIssues && (
                <div style={{background:'#fef2f2',padding:'6px 14px',fontSize:10,
                  color:'#dc2626',fontWeight:700,borderBottom:'1px solid #fecaca'}}>
                  Compliance Alert - Action Required
                </div>
              )}
              <div style={{padding:'14px 14px 10px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${emp.color}22`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                  {emp.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{emp.name}</span>
                    <Badge status={emp.status}/>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{emp.emp_id} &bull; {emp.role}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>
                    {emp.vendor} &bull; {emp.assigned_to}
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic',marginTop:1}}>{emp.nepali}</div>
                </div>
              </div>
              {/* Compliance indicators */}
              <div style={{padding:'0 14px 10px',display:'flex',gap:6,flexWrap:'wrap'}}>
                {[
                  {ok:emp.id_verified,   label:'ID Verified'},
                  {ok:emp.bg_verified,   label:'BG Check'},
                  {ok:emp.ssf_paid,      label:'SSF Paid'},
                  {ok:emp.insurance,     label:'Insurance'},
                ].map((c,i)=>(
                  <span key={i} style={{background:c.ok?'#f0fdf4':'#fef2f2',
                    color:c.ok?'#15803d':'#dc2626',
                    border:`1px solid ${c.ok?'#bbf7d0':'#fecaca'}`,
                    fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                    {c.ok?'✓':'✗'} {c.label}
                  </span>
                ))}
              </div>
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 14px',
                display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[
                  {l:'Attendance',v:emp.attendance_pct+'%',c:emp.attendance_pct>=90?'#10b981':'#f59e0b'},
                  {l:'Wage/mo',   v:'NPR '+(emp.wage_npr/1000).toFixed(0)+'K',c:'#3b82f6'},
                  {l:'Shift',     v:emp.shift.split('(')[0].trim(),c:'#64748b'},
                ].map((s,i)=>(
                  <div key={i} style={{textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:700,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:9,color:'#94a3b8'}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </LuxCard>
          )
        })}
      </div>

      }

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
        impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
        actions={CONTEXT_ACTIONS}
        onAction={(k,item)=>{if(k==='view')setSelected(item)}}
        onClose={()=>setCtx(null)} />}
      {showExcel && <ExcelModal title="Outsource Employees"
        columns={['EMP ID','Name','Vendor','Service','Role','Assigned To','Shift','Wage (NPR)','ID Verified','BG Verified','SSF Paid','Insurance','Status']}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Importing: '+f.name)} />}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'20px 28px',background:T.gradient,position:'sticky',top:0,zIndex:10}}>
              <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ Add Outsource Worker</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:2}}>Voice input supported on all fields</div>
            </div>
            <div style={{padding:'24px 28px'}}>
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'12px 14px',marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:'#dc2626',marginBottom:4}}>Nepal Labour Act 2074 Notice</div>
                <div style={{fontSize:11,color:'#991b1b',lineHeight:1.6}}>
                  Outsource workers must be employed by a licensed agency. Do NOT add to direct company payroll.
                  Main employer must verify agency pays minimum wage, SSF, and insurance.
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Vendor / Agency" type="select" accent={T.accent}
                  options={['ShieldGuard Nepal','CleanPro Services Nepal','TechStaff Solutions','NepCatering Services']} value="" onChange={()=>{}}/>
                <Field label="Worker Name" value="" onChange={()=>{}} required accent={T.accent}/>
                <Field label="Role" value="" onChange={()=>{}} accent={T.accent}/>
                <Field label="Assigned Location" value="" onChange={()=>{}} accent={T.accent}/>
                <Field label="Shift" type="select" value="" onChange={()=>{}} accent={T.accent}
                  options={['Day (6AM-2PM)','Day (9AM-6PM)','Evening (2PM-10PM)','Night (10PM-6AM)','Flexible']}/>
                <Field label="Monthly Wage (NPR)" type="number" value="" onChange={()=>{}} accent={T.accent}
                  hint="Must be >= NPR 15,000 (Nepal minimum wage)"/>
                <Field label="Join Date" type="date" value="" onChange={()=>{}} accent={T.accent}/>
                <Field label="Contract End Date" type="date" value="" onChange={()=>{}} accent={T.accent}/>
              </div>
              <AIImpact color={T.accent} lines={[
                'Outsource worker will be tracked separately from direct employees.',
                'ID and background verification required before first day on site.',
                'Main employer must verify agency SSF and insurance payments monthly.',
                'Worker cannot access internal HR systems, payroll, or confidential data.',
              ]}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)}
                  style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:T.gradient,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                  Add Outsource Worker
                </button>
                <button onClick={()=>setShowAdd(false)}
                  style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Drawer item={selected} gradient={T.gradient} onClose={()=>setSelected(null)}
        rows={[
          ['Employee ID',   selected?.emp_id],
          ['Nepali Name',   selected?.nepali],
          ['Vendor',        selected?.vendor],
          ['Service',       selected?.service],
          ['Role',          selected?.role],
          ['Assigned To',   selected?.assigned_to],
          ['Shift',         selected?.shift],
          ['Join Date',     selected?.join_date],
          ['Contract End',  selected?.contract_end],
          ['Monthly Wage',  selected ? 'NPR '+selected.wage_npr.toLocaleString() : null],
          ['Attendance',    selected?.attendance_pct+'%'],
          ['ID Verified',   selected?.id_verified?'Yes':'No'],
          ['BG Verified',   selected?.bg_verified?'Yes':'Pending'],
          ['SSF Paid',      selected?.ssf_paid?'Yes - Agency confirmed':'NOT PAID - Action needed'],
          ['Insurance',     selected?.insurance?'Yes':'NOT PROVIDED - Action needed'],
        ]}/>
    </div>
  )
}

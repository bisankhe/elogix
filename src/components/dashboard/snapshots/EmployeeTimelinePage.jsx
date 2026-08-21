// FILE: EmployeeTimelinePage.jsx — Employee Timeline (Employee Movement)
// ESS: own timeline only | HR/Manager: choose any employee
// Professional git-commit style, multi-employee support
import { useState } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#3b82f6 100%)'
const A = '#1e3a5f'

const ALL_EMPLOYEES = [
  { emp_id:'EMP-0029', name:'Bikash Shrestha', position:'Senior IT Lead', dept:'Information Technology' },
  { emp_id:'EMP-0054', name:'Ramesh KC', position:'Accountant', dept:'Finance & Accounts' },
  { emp_id:'EMP-0089', name:'Priya Khadka', position:'Customer Service Officer', dept:'Customer Service' },
  { emp_id:'EMP-0042', name:'Sunil Magar', position:'Sales Officer', dept:'Sales & Marketing' },
]

const ALL_EVENTS = {
  'EMP-0029':[
    {id:'ev1',date:'2022-08-15',type:'hire',title:'Joined as IT Lead',dept:'IT',approver:'Rajesh Sharma (CTO)',notes:'Hired via referral. Started at NPR 95,000/mo.',visible_to:'all'},
    {id:'ev2',date:'2023-02-15',type:'confirmation',title:'Confirmed as Permanent',dept:'IT',approver:'Rajesh Sharma (CTO)',notes:'Successfully completed 6-month probation.',visible_to:'all'},
    {id:'ev3',date:'2024-01-10',type:'salary_change',title:'Annual Increment — NPR 95K→105K',dept:'IT',approver:'Rajesh Sharma (CTO)',notes:'10.5% increase based on performance review.',visible_to:'all'},
    {id:'ev4',date:'2024-11-20',type:'disciplinary',title:'Verbal Warning (Restricted)',dept:'IT',approver:'Priya Adhikari (HR)',notes:'Details restricted — HR Admin only.',visible_to:'hr_only'},
    {id:'ev5',date:'2025-06-01',type:'promotion',title:'Promoted to Senior IT Lead',dept:'IT',approver:'Rajesh Sharma (CTO)',notes:'NPR 120K→150K. Recognized for cloud migration leadership.',visible_to:'all'},
  ],
  'EMP-0054':[
    {id:'ev6',date:'2021-03-01',type:'hire',title:'Joined as Junior Accountant',dept:'Finance',approver:'Sanjay Karki (CFO)',notes:'Entry-level hire. NPR 30,000/mo.',visible_to:'all'},
    {id:'ev7',date:'2021-09-01',type:'confirmation',title:'Confirmed as Permanent',dept:'Finance',approver:'Sanjay Karki (CFO)',notes:'Passed probation review.',visible_to:'all'},
    {id:'ev8',date:'2022-04-10',type:'salary_change',title:'Annual Increment',dept:'Finance',approver:'Sanjay Karki (CFO)',notes:'NPR 30K→34K.',visible_to:'all'},
    {id:'ev9',date:'2023-07-15',type:'promotion',title:'Promoted to Accountant',dept:'Finance',approver:'Sanjay Karki (CFO)',notes:'NPR 34K→45K.',visible_to:'all'},
    {id:'ev10',date:'2025-07-15',type:'transfer',title:'Internal Transfer — AP to Treasury',dept:'Finance',approver:'Sanjay Karki (CFO)',notes:'Same dept, same branch, same salary.',visible_to:'all'},
  ],
  'EMP-0089':[
    {id:'ev11',date:'2023-11-01',type:'hire',title:'Joined as CS Executive',dept:'Customer Service',approver:'Anil Bista',notes:'Fresh graduate hire.',visible_to:'all'},
    {id:'ev12',date:'2024-05-01',type:'confirmation',title:'Confirmed as Permanent',dept:'Customer Service',approver:'Anil Bista',notes:'Good performance in probation.',visible_to:'all'},
    {id:'ev13',date:'2025-08-01',type:'transfer',title:'Transfer to Pokhara Branch',dept:'Customer Service',approver:'Anil Bista',notes:'Voluntary geographic request.',visible_to:'all'},
  ],
  'EMP-0042':[
    {id:'ev14',date:'2024-01-15',type:'hire',title:'Joined as Sales Officer',dept:'Sales',approver:'Dipak Tamang',notes:'Experienced hire. NPR 38,000/mo.',visible_to:'all'},
    {id:'ev15',date:'2025-04-18',type:'disciplinary',title:'Written Warning Issued',dept:'Sales',approver:'Priya Adhikari (HR)',notes:'Frequent late arrival — 7 occurrences.',visible_to:'hr_only'},
  ],

const TYPE_CFG = {
  hire:         {c:'#10b981',icon:'🎉',label:'Hired'},
  promotion:    {c:'#7c3aed',icon:'📈',label:'Promotion'},
  demotion:     {c:'#f97316',icon:'📉',label:'Demotion'},
  transfer:     {c:'#0891b2',icon:'🔄',label:'Transfer'},
  confirmation: {c:'#3b82f6',icon:'✅',label:'Confirmation'},
  salary_change:{c:'#84cc16',icon:'💰',label:'Salary Change'},
  disciplinary: {c:'#dc2626',icon:'⚠️', label:'Disciplinary'},

// Simulate mode: 'ess' = employee self-service (own only), 'hr' = HR/manager (all employees)
export default function EmployeeTimelinePage() {
  const [mode, setMode]         = useState('hr')  // 'ess' | 'hr'
  const [selEmp, setSelEmp]     = useState('EMP-0029')
  const [filterType, setFilterType] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [search, setSearch]     = useState('')
  const [ctx, setCtx]           = useState(null)

  // ESS: locked to current user (simulated as first employee)
  const ESS_EMP = ALL_EMPLOYEES[0]
  const displayEmp = mode==='ess' ? ESS_EMP : ALL_EMPLOYEES.find(e=>e.emp_id===selEmp)||ALL_EMPLOYEES[0]
  const events     = ALL_EVENTS[displayEmp.emp_id]||[]
  const filtered   = events.filter(e=>{
    if (filterType!=='all'&&e.type!==filterType) return false
    if (search&&!e.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const tenure_years = ((Date.now()-new Date(events[0]?.date).getTime())/(1000*60*60*24*365)).toFixed(1)
  const promotionCount = events.filter(e=>e.type==='promotion').length
  const transferCount  = events.filter(e=>e.type==='transfer').length

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="🛤️" title="Employee Timeline"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Movement"
        gradient={G}
        stats={[
          {icon:'📅',label:'Total Events', value:events.length},
          {icon:'📈',label:'Promotions',   value:promotionCount},
          {icon:'🔄',label:'Transfers',    value:transferCount},
          {icon:'⏳',label:'Tenure',       value:tenure_years+' yrs'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      {/* Mode switcher */}
      <div style={{display:'flex',gap:2,background:'#f1f5f9',padding:4,borderRadius:12,marginBottom:14,width:'fit-content'}}>
        {[['ess','👤 Employee Self-Service (Own Timeline)'],['hr','👥 HR / Manager View (All Employees)']].map(([k,l])=>(
          <button key={k} onClick={()=>setMode(k)}
            style={{padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontSize:10,
              background:mode===k?'#fff':'transparent',color:mode===k?A:'#64748b',
              fontWeight:mode===k?700:400,boxShadow:mode===k?'0 1px 4px rgba(0,0,0,.1)':'none'}}>{l}</button>
        ))}
      </div>

      {mode==='ess'&&(
        <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af'}}>
          👤 <strong>Employee Self-Service Mode:</strong> You are viewing your own career timeline. Only publicly visible events are shown. Restricted entries (HR/disciplinary) are hidden from this view.
        </div>
      )}

      {/* Employee selector (HR mode only) */}
      {mode==='hr'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 18px',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:10}}>Select Employee to View Timeline</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
            {ALL_EMPLOYEES.map(emp=>(
              <div key={emp.emp_id} onClick={()=>setSelEmp(emp.emp_id)}
                style={{padding:'10px 12px',borderRadius:10,border:`2px solid ${selEmp===emp.emp_id?A:'#e2e8f0'}`,
                  background:selEmp===emp.emp_id?`${A}08`:'#fff',cursor:'pointer',transition:'all .15s'}}>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:A,flexShrink:0}}>
                    {emp.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{emp.name}</div>
                    <div style={{fontSize:9,color:'#64748b'}}>{emp.emp_id} · {emp.dept}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee header */}
      <div style={{background:G,borderRadius:16,padding:'18px 24px',marginBottom:16,display:'flex',gap:16,alignItems:'center'}}>
        <div style={{width:54,height:54,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'#fff',border:'2px solid rgba(255,255,255,.4)'}}>
          {displayEmp.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
        </div>
        <div>
          <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{displayEmp.name}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.8)'}}>{displayEmp.position} · {displayEmp.dept} · {displayEmp.emp_id}</div>
        </div>
        <div style={{marginLeft:'auto',background:'rgba(255,255,255,.15)',borderRadius:10,padding:'8px 14px',textAlign:'center'}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>{events.length}</div>
          <div style={{fontSize:8,color:'rgba(255,255,255,.7)'}}>CAREER EVENTS</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search timeline events..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          <button onClick={()=>setFilterType('all')} style={{padding:'6px 10px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,background:filterType==='all'?'#fff':'transparent',color:filterType==='all'?A:'#64748b',fontWeight:filterType==='all'?700:400}}>All</button>
          {Object.entries(TYPE_CFG).map(([k,v])=>(
            <button key={k} onClick={()=>setFilterType(k)} style={{padding:'6px 10px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,whiteSpace:'nowrap',background:filterType===k?'#fff':'transparent',color:filterType===k?v.c:'#64748b',fontWeight:filterType===k?700:400}}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Git-commit style timeline */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,padding:'28px 32px'}}>
        {filtered.length===0&&<div style={{textAlign:'center',color:'#94a3b8',fontSize:12,padding:'20px'}}>No events match the current filter.</div>}
        <div style={{position:'relative',paddingLeft:36}}>
          <div style={{position:'absolute',left:13,top:8,bottom:8,width:2,background:'linear-gradient(to bottom,#e2e8f0,#cbd5e1)'}}/>
          {filtered.map((ev,i)=>{
            const tc = TYPE_CFG[ev.type]||TYPE_CFG.hire
            const isExpanded   = expanded===ev.id
            const isRestricted = ev.visible_to==='hr_only'&&mode==='ess'
            return (
              <div key={ev.id} style={{position:'relative',marginBottom:i<filtered.length-1?22:0}}
                onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:ev.title,impact_links:['Transfer & History','Disciplinary Records','Promotion & History']}})}}>
                <div style={{position:'absolute',left:-36,top:0,width:28,height:28,borderRadius:'50%',background:tc.c,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#fff',border:'3px solid #fff',boxShadow:`0 0 0 2px ${tc.c}33,0 2px 6px rgba(0,0,0,.1)`,zIndex:1}}>
                  {tc.icon}
                </div>
                <div onClick={()=>!isRestricted&&setExpanded(isExpanded?null:ev.id)}
                  style={{background:isRestricted?'#fef2f2':'#f8fafc',borderRadius:14,padding:'14px 18px',cursor:isRestricted?'not-allowed':'pointer',border:`1px solid ${tc.c}22`,transition:'all .1s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                    <div>
                      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                        <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{ev.title}</span>
                        <span style={{background:`${tc.c}15`,color:tc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{tc.label}</span>
                        {isRestricted&&<span style={{background:'#1c1917',color:'#fca5a5',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>🔒 HR Only</span>}
                      </div>
                      <div style={{fontSize:10,color:'#64748b',marginTop:4}}>{ev.date} · {ev.dept} · Approved by {ev.approver}</div>
                    </div>
                    {!isRestricted&&<div style={{fontSize:9,color:'#94a3b8'}}>{isExpanded?'▲ Less':'▼ Details'}</div>}
                  </div>
                  {isExpanded&&!isRestricted&&(
                    <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #e2e8f0',fontSize:11,color:'#374151',lineHeight:1.6}}>
                      {ev.notes}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export Timeline',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

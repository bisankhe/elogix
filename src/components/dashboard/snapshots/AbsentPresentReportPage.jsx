// FILE: AbsentPresentReportPage.jsx
// eLogix HRMS — Absent / Present Report
// Shows P/A/leave per employee per day — colour-coded per leave type
// Login/logout indicator: green dot=logged in, red=absent/no log
// Digital signature: Prepared / Verified / Approved
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect, useRef } from 'react'

const G  = 'linear-gradient(135deg,#14532d 0%,#15803d 55%,#86efac 100%)'
const A  = '#15803d'

// ── Colour map (matches DutyRoster) ──────────────────────────
const CODE_STYLE = {
  P:   { bg:'#f0fdf4', text:'#166534', border:'#86efac', dot:'#22c55e',  label:'Present'         },
  A:   { bg:'#fef2f2', text:'#7f1d1d', border:'#fca5a5', dot:'#dc2626',  label:'Absent'          },
  W:   { bg:'#f0fdf4', text:'#166534', border:'#86efac', dot:'#16a34a',  label:'Weekly Off'      },
  PH:  { bg:'#fdf2f8', text:'#831843', border:'#f0abfc', dot:'#d946ef',  label:'Public Holiday'  },
  CL:  { bg:'#fff7ed', text:'#9a3412', border:'#fed7aa', dot:'#f97316',  label:'Casual Leave'    },
  EL:  { bg:'#ecfdf5', text:'#065f46', border:'#6ee7b7', dot:'#10b981',  label:'Earned Leave'    },
  SL:  { bg:'#eff6ff', text:'#1e40af', border:'#bfdbfe', dot:'#3b82f6',  label:'Sick Leave'      },
  ML:  { bg:'#fdf4ff', text:'#6b21a8', border:'#e9d5ff', dot:'#a855f7',  label:'Maternity Leave' },
  BL:  { bg:'#f1f5f9', text:'#334155', border:'#cbd5e1', dot:'#64748b',  label:'Bereavement'     },
  CWL: { bg:'#fefce8', text:'#713f12', border:'#fef08a', dot:'#eab308',  label:'Child Welfare'   },
  HD:  { bg:'#fff1f2', text:'#9f1239', border:'#fda4af', dot:'#f43f5e',  label:'Half Day'        },
  S:   { bg:'#fffbeb', text:'#92400e', border:'#fcd34d', dot:'#f59e0b',  label:'Substitute'      },
  ND:  { bg:'#1e1b4b', text:'#c7d2fe', border:'#4338ca', dot:'#818cf8',  label:'Night Duty'      },
  OT:  { bg:'#fffbeb', text:'#78350f', border:'#fcd34d', dot:'#d97706',  label:'Overtime'        },
  WFH: { bg:'#f0f9ff', text:'#075985', border:'#7dd3fc', dot:'#0ea5e9',  label:'Work From Home'  },
}

const DEPTS = ['All','Management','Human Resources','Finance','IT','Sales','Operations']

const pad2 = n => String(n).padStart(2,'0')

function genRows(month, year, dept) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const names = [
    ['Ram Thapa','Senior Officer',true],['Sita Shrestha','HR Manager',true],
    ['Hari Maharjan','Finance Officer',true],['Gita Tamang','IT Lead',true],
    ['Maya Gurung','Recruiter',true],['Binod Rai','Sales Executive',false],
    ['Sunita KC','Procurement',true],['Rajesh Sharma','Operations',true],
    ['Puja Karki','Department Head',true],['Deepak Joshi','HR Officer',false],
  ]
  const leavePool = ['P','P','P','P','P','W','EL','CL','SL','A','PH','HD']
  return names.map(([name,desig], idx) => {
    const empId = `EMP-${String(idx+1).padStart(4,'0')}`
    const deptName = dept === 'All' ? DEPTS[1 + idx%6] : dept
    const days = []
    let presentCount=0, absentCount=0, leaveCount=0, woffCount=0
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month-1, d).getDay()
      let code
      if (dow===0||dow===6) { code='W'; woffCount++ }
      else {
        code = leavePool[(idx*7+d) % leavePool.length]
        if (code==='P') presentCount++
        else if (code==='A') absentCount++
        else leaveCount++
      }
      // login/logout times (only present days)
      const hasLog = code==='P'
      const loginH  = hasLog ? (8 + Math.floor(Math.random()*2)) : null
      const loginM  = hasLog ? Math.floor(Math.random()*30) : null
      const logoutH = hasLog ? (17 + Math.floor(Math.random()*2)) : null
      const logoutM = hasLog ? Math.floor(Math.random()*60) : null
      days.push({
        code,
        login:  hasLog ? `${pad2(loginH)}:${pad2(loginM)}`  : null,
        logout: hasLog ? `${pad2(logoutH)}:${pad2(logoutM)}` : null,
      })
    }
    const workingDays = daysInMonth - woffCount
    const pct = workingDays > 0 ? Math.round(presentCount/workingDays*100) : 0
    return { sn:idx+1, empId, name, desig, dept:deptName, days, presentCount, absentCount, leaveCount, woffCount, pct }
  })
}

const inp = {padding:'7px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',
  fontSize:10,outline:'none',fontFamily:'inherit',width:'100%',boxSizing:'border-box',background:'#fff'}

const DayCell = ({ day, showTime }) => {
  const s = CODE_STYLE[day.code] || CODE_STYLE.P
  const hasLog = !!day.login
  return (
    <td style={{padding:'2px',textAlign:'center',minWidth:showTime?80:28,
      background:s.bg,border:`1px solid ${s.border}`,verticalAlign:'middle'}}>
      {apiLoading && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:48,color:'#7c3aed'}}>
          <div style={{textAlign:'center',fontSize:13,fontWeight:600}}>
            <div style={{fontSize:32,marginBottom:8}}>⟳</div>Loading...
          </div>
        </div>
      )}
      {apiError && !apiLoading && (
        <div style={{padding:'10px 16px',background:'#fef2f2',border:'1px solid #fecaca',
          borderRadius:8,margin:'0 0 12px',fontSize:12,color:'#dc2626',fontWeight:600}}>
          ⚠️ {apiError}
        </div>
      )}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
        {/* Status indicator dot */}
        <div style={{display:'flex',alignItems:'center',gap:2}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:hasLog?'#22c55e':'#dc2626',
            display:'inline-block',boxShadow:`0 0 4px ${hasLog?'#22c55e':'#dc2626'}`}}/>
          <span style={{fontSize:9,fontWeight:800,color:s.text}}>{day.code}</span>
        </div>
        {showTime && hasLog && (
          <div style={{fontSize:7,color:s.text,opacity:.8,lineHeight:1.2}}>
            <div>▲{day.login}</div>
            <div>▼{day.logout}</div>
          </div>
        )}
      </div>
    </td>
  )
}

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}}
}
function _getTenantCtx() {
  const s=_getSession()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug)}
}

export default function AbsentPresentReportPage() {
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const today = new Date()
  const [month,    setMonth]   = useState(today.getMonth()+1)
  const [year,     setYear]    = useState(today.getFullYear())
  const [dept,     setDept]    = useState('All')
  const [showTime, setShowTime]= useState(false)
  const [showSig,  setShowSig] = useState(false)
  const [msg,      setMsg]     = useState('')
  const [sigs, setSigs] = useState({
    prepared: {name:'',designation:'',date:today.toISOString().split('T')[0],signed:false},
    verified: {name:'',designation:'',date:today.toISOString().split('T')[0],signed:false},
    approved: {name:'',designation:'',date:today.toISOString().split('T')[0],signed:false},
  })
  const fileRef = useRef(null)
  const notify = m=>{setMsg(m);setTimeout(()=>setMsg(''),3500)}

  const daysInMonth = new Date(year, month, 0).getDate()
  const monthName = new Date(year,month-1,1).toLocaleString('default',{month:'long'})
  const rows = genRows(month, year, dept)

  const dayHeaders = []
  for(let d=1;d<=daysInMonth;d++){
    const dow=new Date(year,month-1,d).getDay()
    const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    dayHeaders.push({d,day:dayNames[dow],isWeekend:dow===0||dow===6})
  }

  // Summary stats
  const totalP = rows.reduce((s,r)=>s+r.presentCount,0)
  const totalA = rows.reduce((s,r)=>s+r.absentCount,0)
  const totalL = rows.reduce((s,r)=>s+r.leaveCount,0)

  const SigBox = ({role}) => {
    const s=sigs[role]
    const titles={prepared:'✍️ Prepared By',verified:'✅ Verified By',approved:'🏛 Approved By'}
    return (
      <div style={{flex:1,border:`2px solid ${s.signed?'#bbf7d0':'#e2e8f0'}`,borderRadius:12,
        padding:'14px',background:s.signed?'#f0fdf4':'#fff',minWidth:160}}>
        <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:8}}>{titles[role]}</div>
        {s.signed?(
          <div>
            <div style={{fontFamily:'Georgia,serif',fontSize:16,color:A,fontStyle:'italic',
              borderBottom:`2px solid ${A}`,paddingBottom:4,marginBottom:4}}>{s.name}</div>
            <div style={{fontSize:10,fontWeight:700}}>{s.name}</div>
            <div style={{fontSize:9,color:'#64748b'}}>{s.designation}</div>
            <div style={{fontSize:9,color:'#94a3b8'}}>{s.date}</div>
            <span style={{marginTop:6,display:'inline-block',background:'#f0fdf4',color:'#059669',
              fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,border:'1px solid #bbf7d0'}}>
              ✅ eLogix Digital Signature
            </span>
          </div>
        ):(
          <div>
            <div style={{height:36,borderBottom:'1px dashed #cbd5e1',color:'#94a3b8',
              fontSize:10,fontStyle:'italic',display:'flex',alignItems:'flex-end',paddingBottom:4}}>
              Awaiting signature...
            </div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Name / Designation / Date</div>
          </div>
        )}
      </div>
    )
  }

  // ── Tenant-isolated API load ───────────────────────────────────────
  useEffect(() => {
    const {token,slug,valid} = _getTenantCtx()
    if (!valid) { setApiLoading(false); return }
    setApiLoading(true); setApiError(null)
    fetch('/api/v1/attendance-reports/absent-present', {
      headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}
    })
      .then(r=>{ if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')} if(!r.ok)throw new Error(`Error ${r.status}`); return r.json() })
      .then(d=>{ const p=d.records||d.data||d; if(p) setApiData(p) })
      .catch(err=>setApiError(err.message))
      .finally(()=>setApiLoading(false))
  },[])

  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f0fdf4'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',
        border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:11,
        color:'#065f46',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:440}}>{msg}</div>}

      {/* HEADER */}
      <div style={{background:G,padding:'16px 22px',color:'#fff',marginBottom:14,borderRadius:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>📊 Absent / Present Report</div>
            <div style={{fontSize:10,opacity:.8}}>
              eLogix HRMS · {monthName} {year} · {dept} · 🟢 = Log-in exists · 🔴 = No log
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>fileRef.current?.click()} style={{padding:'7px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
              📊 Import
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e=>notify(`📂 ${e.target.files[0]?.name}`)} style={{display:'none'}}/>
            </button>
            <button onClick={()=>notify('📤 Exporting...')} style={{padding:'7px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📤 Export</button>
            <button onClick={()=>notify('🖨 Printing...')} style={{padding:'7px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>🖨 Print</button>
            <button onClick={()=>setShowSig(true)} style={{padding:'7px 14px',borderRadius:9,border:'none',background:'#fff',color:A,fontSize:10,fontWeight:800,cursor:'pointer'}}>✍️ Sign</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}>
          <div style={{flex:'1 1 100px'}}>
            <div style={{fontSize:8,opacity:.7,marginBottom:3}}>Month</div>
            <select value={month} onChange={e=>setMonth(+e.target.value)} style={{...inp,padding:'6px 10px'}}>
              {Array.from({length:12},(_,i)=>i+1).map(m=>(
                <option key={m} value={m}>{new Date(2024,m-1).toLocaleString('default',{month:'long'})}</option>
              ))}
            </select>
          </div>
          <div style={{flex:'1 1 80px'}}>
            <div style={{fontSize:8,opacity:.7,marginBottom:3}}>Year</div>
            <select value={year} onChange={e=>setYear(+e.target.value)} style={{...inp,padding:'6px 10px'}}>
              {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
            </select>
          </div>
          <div style={{flex:'2 1 140px'}}>
            <div style={{fontSize:8,opacity:.7,marginBottom:3}}>Department</div>
            <select value={dept} onChange={e=>setDept(e.target.value)} style={{...inp,padding:'6px 10px'}}>
              {DEPTS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,paddingBottom:2}}>
            <input type="checkbox" checked={showTime} onChange={e=>setShowTime(e.target.checked)} style={{cursor:'pointer'}}/>
            <span style={{fontSize:9,opacity:.85}}>Show Login/Logout times</span>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{display:'flex',gap:12,marginTop:12,flexWrap:'wrap'}}>
          {[['👥','Staff',rows.length],['✅','Total Present',totalP],['❌','Total Absent',totalA],
            ['📅','Leave Days',totalL],['📊','Avg Attendance',`${Math.round(totalP/(rows.length||1)/daysInMonth*100)||0}%`]
          ].map(([ic,lb,v])=>(
            <div key={lb} style={{background:'rgba(255,255,255,.14)',borderRadius:9,padding:'7px 13px',textAlign:'center',minWidth:80}}>
              <div style={{fontSize:14,fontWeight:900}}>{v}</div>
              <div style={{fontSize:8,opacity:.75}}>{ic} {lb}</div>
            </div>
          ))}
        </div>
      </div>

      {/* LEGEND */}
      <div style={{background:'#fff',borderRadius:12,padding:'10px 16px',marginBottom:12,
        boxShadow:'0 1px 6px rgba(0,0,0,.06)',display:'flex',flexWrap:'wrap',gap:7}}>
        <div style={{fontSize:9,fontWeight:700,color:'#374151',alignSelf:'center',marginRight:4}}>Legend:</div>
        {Object.entries(CODE_STYLE).map(([code,s])=>(
          <span key={code} style={{display:'inline-flex',alignItems:'center',gap:4,
            background:s.bg,color:s.text,border:`1px solid ${s.border}`,
            fontSize:8.5,fontWeight:700,padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap'}}>
            <span style={{width:6,height:6,background:s.dot,borderRadius:'50%',display:'inline-block'}}/>
            {code} = {s.label}
          </span>
        ))}
        <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:8.5,fontWeight:700,
          padding:'2px 8px',borderRadius:20,background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#166534'}}>
          🟢 = Login/logout recorded
        </span>
        <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:8.5,fontWeight:700,
          padding:'2px 8px',borderRadius:20,background:'#fef2f2',border:'1px solid #fca5a5',color:'#7f1d1d'}}>
          🔴 = No log / Absent
        </span>
      </div>

      {/* TABLE */}
      <div style={{background:'#fff',borderRadius:14,boxShadow:'0 2px 8px rgba(0,0,0,.06)',
        overflow:'auto',marginBottom:14,
        scrollbarWidth:'thin',scrollbarColor:`${A} #e2e8f0`}}>
        <style>{`::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:#f1f5f9}::-webkit-scrollbar-thumb{background:${A};border-radius:4px}`}</style>
        <table style={{width:'max-content',minWidth:'100%',borderCollapse:'collapse',fontSize:9}}>
          <thead style={{position:'sticky',top:0,zIndex:5}}>
            <tr style={{background:'#14532d'}}>
              <th colSpan={5+daysInMonth+4} style={{padding:'7px 14px',textAlign:'center',
                fontSize:12,fontWeight:900,color:'#fff'}}>
                ABSENT / PRESENT REPORT — eLogix HRMS · {monthName} {year} · {dept}
              </th>
            </tr>
            <tr style={{background:'#15803d'}}>
              {[['S#',35],['Emp ID',70],['Name',130],['Designation',100],['Dept',100]].map(([h,w])=>(
                <th key={h} style={{padding:'7px 8px',color:'#fff',fontWeight:700,fontSize:9,
                  width:w,minWidth:w,whiteSpace:'nowrap',borderRight:'1px solid rgba(255,255,255,.2)',
                  position:'sticky',top:0,textAlign:'center'}}>
                  {h}
                </th>
              ))}
              {dayHeaders.map(({d,day,isWeekend})=>(
                <th key={d} style={{padding:'5px 2px',textAlign:'center',color:'#fff',fontWeight:700,
                  fontSize:8.5,minWidth:showTime?80:28,width:showTime?80:28,
                  background:isWeekend?'#166534':'#15803d',
                  borderRight:'1px solid rgba(255,255,255,.15)',position:'sticky',top:0}}>
                  <div>{d}</div><div style={{fontSize:7,opacity:.75}}>{day}</div>
                </th>
              ))}
              {[['P',50],['A',40],['L',40],['Att%',50]].map(([h,w])=>(
                <th key={h} style={{padding:'7px 8px',color:'#bbf7d0',fontWeight:700,fontSize:9,
                  width:w,minWidth:w,textAlign:'center',borderLeft:'1px solid rgba(255,255,255,.3)',
                  position:'sticky',top:0}}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row,ri)=>(
              <tr key={row.sn}
                style={{background:ri%2===0?'#fff':'#f8fafc'}}
                onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'}
                onMouseLeave={e=>e.currentTarget.style.background=ri%2===0?'#fff':'#f8fafc'}>
                <td style={{padding:'5px 8px',textAlign:'center',fontWeight:700,color:'#64748b',borderBottom:'1px solid #f1f5f9'}}>{row.sn}</td>
                <td style={{padding:'5px 8px',textAlign:'center',fontFamily:'monospace',fontSize:9,color:'#15803d',borderBottom:'1px solid #f1f5f9'}}>{row.empId}</td>
                <td style={{padding:'5px 8px',fontWeight:700,color:'#0f172a',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{row.name}</td>
                <td style={{padding:'5px 8px',fontSize:9,color:'#475569',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{row.desig}</td>
                <td style={{padding:'5px 8px',fontSize:9,color:'#64748b',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{row.dept}</td>
                {row.days.map((day,di)=><DayCell key={di} day={day} showTime={showTime}/>)}
                <td style={{padding:'5px 8px',textAlign:'center',fontWeight:800,color:'#15803d',borderBottom:'1px solid #f1f5f9',background:'#f0fdf4',borderLeft:'2px solid #bbf7d0'}}>{row.presentCount}</td>
                <td style={{padding:'5px 8px',textAlign:'center',fontWeight:800,color:'#dc2626',borderBottom:'1px solid #f1f5f9',background:'#fef2f2'}}>{row.absentCount}</td>
                <td style={{padding:'5px 8px',textAlign:'center',fontWeight:800,color:'#d97706',borderBottom:'1px solid #f1f5f9',background:'#fffbeb'}}>{row.leaveCount}</td>
                <td style={{padding:'5px 8px',textAlign:'center',fontWeight:800,
                  color:row.pct>=90?'#059669':row.pct>=75?'#d97706':'#dc2626',
                  borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>{row.pct}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{background:'#14532d',color:'#fff'}}>
              <td colSpan={5} style={{padding:'8px 12px',fontWeight:800,fontSize:10}}>TOTALS</td>
              {dayHeaders.map(({d})=>(
                <td key={d} style={{padding:'4px 2px',textAlign:'center',fontSize:8,
                  color:'#bbf7d0',fontWeight:700}}>
                  {rows.filter(r=>r.days[d-1]?.code==='P').length}
                </td>
              ))}
              <td style={{padding:'8px',textAlign:'center',fontWeight:800,color:'#86efac'}}>{totalP}</td>
              <td style={{padding:'8px',textAlign:'center',fontWeight:800,color:'#fca5a5'}}>{totalA}</td>
              <td style={{padding:'8px',textAlign:'center',fontWeight:800,color:'#fde68a'}}>{totalL}</td>
              <td style={{padding:'8px',textAlign:'center',fontWeight:800,color:'#bbf7d0'}}>
                {Math.round(totalP/(rows.length||1)/daysInMonth*100)||0}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* DIGITAL SIGNATURE PANEL */}
      <div style={{background:'#fff',borderRadius:14,padding:'18px',boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:13}}>✍️ Digital Signatures — Absent/Present Report</div>
          <button onClick={()=>setShowSig(true)} style={{padding:'7px 16px',borderRadius:9,border:'none',
            background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✍️ Sign Report</button>
        </div>
        <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
          {['prepared','verified','approved'].map(role=><SigBox key={role} role={role}/>)}
        </div>
      </div>

      {/* SIGNATURE MODAL */}
      {showSig&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSig(false)}>
          <div style={{background:'#fff',borderRadius:18,width:620,maxWidth:'96vw',maxHeight:'92vh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>✍️ Digital Signature Panel</div>
              <div style={{fontSize:10,opacity:.8}}>Absent/Present Report — {monthName} {year} · {dept}</div>
            </div>
            <div style={{padding:'20px 22px'}}>
              {['prepared','verified','approved'].map(role=>{
                const sig=sigs[role]
                const titles={prepared:'✍️ Prepared By (HR/Admin)',verified:'✅ Verified By (HOD/Dept Head)',approved:'🏛 Approved By (HR Manager)'}
                return (
                  <div key={role} style={{marginBottom:20,padding:'16px',borderRadius:12,
                    border:`2px solid ${sig.signed?'#bbf7d0':'#e2e8f0'}`,
                    background:sig.signed?'#f0fdf4':'#f8fafc'}}>
                    <div style={{fontWeight:800,fontSize:12,marginBottom:10}}>{titles[role]}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                      {[['Full Name *','name'],['Designation *','designation']].map(([lb,k])=>(
                        <div key={k}>
                          <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                          <input value={sig[k]} onChange={e=>setSigs(p=>({...p,[role]:{...p[role],[k]:e.target.value,signed:false}}))}
                            style={{...inp,fontSize:11}} placeholder={lb.replace(' *','')}/>
                        </div>
                      ))}
                    </div>
                    <div style={{marginBottom:10}}>
                      <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Date *</label>
                      <input type="date" value={sig.date} onChange={e=>setSigs(p=>({...p,[role]:{...p[role],date:e.target.value,signed:false}}))}
                        style={{...inp,width:'50%'}}/>
                    </div>
                    {!sig.signed?(
                      <button onClick={()=>{
                        if(!sig.name||!sig.designation){notify(`⚠️ Fill name & designation for ${role}`);return}
                        setSigs(p=>({...p,[role]:{...p[role],signed:true}}))
                        notify(`✅ ${role} signature applied — ${sig.name}`)
                      }} style={{padding:'8px 18px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        ✍️ Apply Signature
                      </button>
                    ):(
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontFamily:'Georgia,serif',fontSize:20,color:A,fontStyle:'italic'}}>{sig.name}</span>
                        <span style={{background:'#f0fdf4',color:'#059669',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,border:'1px solid #bbf7d0'}}>✅ Signed · {sig.date}</span>
                        <button onClick={()=>setSigs(p=>({...p,[role]:{...p[role],signed:false}}))} style={{padding:'4px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer',color:'#64748b'}}>Clear</button>
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  const all=['prepared','verified','approved'].every(r=>sigs[r].signed)
                  if(!all){notify('⚠️ All 3 signatures required');return}
                  notify('✅ Report signed, verified & approved — locked in eLogix HRMS')
                  setShowSig(false)
                }} style={{flex:1,padding:'11px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  🔒 Finalise Report
                </button>
                <button onClick={()=>setShowSig(false)} style={{padding:'11px 18px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

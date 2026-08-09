// FILE: MonthlyAttendancePage.jsx
// eLogix HRMS — Monthly Attendance Register
// Payroll-linked · Auto-generated · Digital Signature · Nepal Labour Act 2074
import { useState, useRef } from 'react'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#38bdf8 100%)'
const A = '#0369a1'

const CODE_STYLE = {
  P:   {bg:'#f0fdf4',text:'#166534',border:'#86efac',dot:'#22c55e',label:'Present'},
  A:   {bg:'#fef2f2',text:'#7f1d1d',border:'#fca5a5',dot:'#dc2626',label:'Absent'},
  W:   {bg:'#f0f9ff',text:'#0c4a6e',border:'#bae6fd',dot:'#38bdf8',label:'Weekly Off'},
  PH:  {bg:'#fdf2f8',text:'#831843',border:'#f0abfc',dot:'#d946ef',label:'Public Holiday'},
  CL:  {bg:'#fff7ed',text:'#9a3412',border:'#fed7aa',dot:'#f97316',label:'Casual Leave'},
  EL:  {bg:'#ecfdf5',text:'#065f46',border:'#6ee7b7',dot:'#10b981',label:'Earned Leave'},
  SL:  {bg:'#eff6ff',text:'#1e40af',border:'#bfdbfe',dot:'#3b82f6',label:'Sick Leave'},
  ML:  {bg:'#fdf4ff',text:'#6b21a8',border:'#e9d5ff',dot:'#a855f7',label:'Maternity Leave'},
  BL:  {bg:'#f1f5f9',text:'#334155',border:'#cbd5e1',dot:'#64748b',label:'Bereavement'},
  CWL: {bg:'#fefce8',text:'#713f12',border:'#fef08a',dot:'#eab308',label:'Child Welfare'},
  HD:  {bg:'#fff1f2',text:'#9f1239',border:'#fda4af',dot:'#f43f5e',label:'Half Day'},
  ND:  {bg:'#1e1b4b',text:'#c7d2fe',border:'#4338ca',dot:'#818cf8',label:'Night Duty'},
  OT:  {bg:'#fffbeb',text:'#78350f',border:'#fcd34d',dot:'#d97706',label:'Overtime'},
  WFH: {bg:'#f0f9ff',text:'#075985',border:'#7dd3fc',dot:'#0ea5e9',label:'Work From Home'},
}

const DEPTS = ['All','Management','HR','Finance','IT','Sales','Operations','Procurement']
const pad2  = n => String(n).padStart(2,'0')

function genRows(month, year) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const names = [
    ['Ram Thapa','Senior Officer','Management',45000],
    ['Sita Shrestha','HR Manager','HR',75000],
    ['Hari Maharjan','Finance Officer','Finance',55000],
    ['Gita Tamang','IT Lead','IT',80000],
    ['Maya Gurung','Recruiter','HR',48000],
    ['Binod Rai','Sales Exec','Sales',42000],
    ['Sunita KC','Procurement','Procurement',50000],
    ['Rajesh Sharma','Ops Head','Operations',60000],
    ['Puja Karki','Dept Head','Management',90000],
    ['Deepak Joshi','HR Officer','HR',40000],
    ['Anita Basnet','Supervisor','Operations',38000],
    ['Sanjay Bhattarai','Team Lead','Sales',52000],
  ]
  const allCodes = ['P','P','P','P','W','EL','CL','SL','A','PH','HD','ND','WFH']
  return names.map(([name,desig,dept,salary],idx) => {
    const empId = `EMP-${String(idx+1).padStart(4,'0')}`
    const days = []
    let present=0, absent=0, leave=0, nd=0, woff=0
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month-1, d).getDay()
      let code
      if (dow===0||dow===6) { code='W'; woff++ }
      else {
        code = allCodes[(idx*7+d) % allCodes.length]
        if (code==='P') present++
        else if (code==='A') absent++
        else if (code==='ND') { nd++; present++ }
        else leave++
      }
      const hasLog = code==='P'||code==='ND'||code==='WFH'
      const loginH  = hasLog ? 8+Math.floor(Math.random()*2) : null
      const loginM  = hasLog ? Math.floor(Math.random()*30)  : null
      const logoutH = hasLog ? (code==='ND' ? 18+Math.floor(Math.random()*4) : 17+Math.floor(Math.random()*2)) : null
      const logoutM = hasLog ? Math.floor(Math.random()*60) : null
      days.push({
        code,
        login:  hasLog ? `${pad2(loginH)}:${pad2(loginM)}`   : null,
        logout: hasLog ? `${pad2(logoutH)}:${pad2(logoutM)}` : null,
      })
    }
    const workingDays = daysInMonth - woff
    const lopDays  = absent
    const lopAmt   = Math.round(salary / workingDays * lopDays)
    const netSalary= salary - lopAmt
    return { sn:idx+1, empId, name, desig, dept, salary, days, present, absent, leave, nd, woff, workingDays, lopDays, lopAmt, netSalary }
  })
}

const inp = {
  padding:'7px 10px', borderRadius:8, border:'1.5px solid #e2e8f0',
  fontSize:10, outline:'none', fontFamily:'inherit',
  width:'100%', boxSizing:'border-box', background:'#fff'
}

const DayCell = ({ day }) => {
  const s = CODE_STYLE[day.code] || CODE_STYLE.P
  const isNight = day.code === 'ND'
  return (
    <td style={{padding:'2px',textAlign:'center',minWidth:28,
      background:s.bg,border:`1px solid ${s.border}`,verticalAlign:'middle'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
        <div style={{display:'flex',alignItems:'center',gap:2}}>
          <span style={{width:5,height:5,borderRadius:'50%',
            background:day.login?'#22c55e':'#dc2626',display:'inline-block',
            boxShadow:`0 0 3px ${day.login?'#22c55e':'#dc2626'}`}}/>
          <span style={{fontSize:8.5,fontWeight:800,color:s.text,
            textShadow:isNight?'0 0 4px #818cf8':undefined}}>
            {day.code}
          </span>
        </div>
      </div>
    </td>
  )
}

const today = new Date()
const INIT_SIGS = {
  prepared:{ name:'',designation:'',date:today.toISOString().split('T')[0],signed:false },
  verified: { name:'',designation:'',date:today.toISOString().split('T')[0],signed:false },
  approved: { name:'',designation:'',date:today.toISOString().split('T')[0],signed:false },
}

export default function MonthlyAttendancePage() {
  const [month,    setMonth]    = useState(today.getMonth()+1)
  const [year,     setYear]     = useState(today.getFullYear())
  const [dept,     setDept]     = useState('All')
  const [showSig,  setShowSig]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [sigs,     setSigs]     = useState(INIT_SIGS)
  const fileRef = useRef(null)
  const notify  = m => { setMsg(m); setTimeout(()=>setMsg(''), 3500) }

  const daysInMonth = new Date(year, month, 0).getDate()
  const mon = new Date(year, month-1).toLocaleString('default', {month:'long'})
  const allRows = genRows(month, year)
  const rows = dept==='All' ? allRows : allRows.filter(r=>r.dept===dept)

  const dayHdrs = []
  for (let d=1; d<=daysInMonth; d++) {
    const dow = new Date(year, month-1, d).getDay()
    dayHdrs.push({ d, day:['Su','Mo','Tu','We','Th','Fr','Sa'][dow], isWeekend:dow===0||dow===6 })
  }

  const SigBox = ({ role }) => {
    const s = sigs[role]
    const titles = {
      prepared: '✍️ Prepared By',
      verified: '✅ Verified By',
      approved: '🏛 Approved By',
    }
    return (
      <div style={{flex:1,border:`2px solid ${s.signed?'#bae6fd':'#e2e8f0'}`,borderRadius:12,
        padding:'14px',background:s.signed?'#f0f9ff':'#fff',minWidth:160}}>
        <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:8}}>{titles[role]}</div>
        {s.signed ? (
          <div>
            <div style={{fontFamily:'Georgia,serif',fontSize:16,color:A,fontStyle:'italic',
              borderBottom:`2px solid ${A}`,paddingBottom:4,marginBottom:4}}>{s.name}</div>
            <div style={{fontSize:10,fontWeight:700}}>{s.name}</div>
            <div style={{fontSize:9,color:'#64748b'}}>{s.designation}</div>
            <div style={{fontSize:9,color:'#94a3b8'}}>{s.date}</div>
            <span style={{marginTop:6,display:'inline-block',background:'#f0f9ff',color:A,
              fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,border:'1px solid #bae6fd'}}>
              ✅ eLogix Digital Signature
            </span>
          </div>
        ) : (
          <div>
            <div style={{height:36,borderBottom:'1px dashed #cbd5e1',color:'#94a3b8',
              fontSize:10,fontStyle:'italic',display:'flex',alignItems:'flex-end',paddingBottom:4}}>
              Awaiting...
            </div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Name / Designation / Date</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f0f7ff'}}>
      {msg && (
        <div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0f9ff',
          border:'1px solid #bae6fd',borderRadius:10,padding:'10px 18px',fontSize:11,
          color:'#0c4a6e',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:440}}>
          {msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{background:G,padding:'16px 22px',color:'#fff',marginBottom:14,borderRadius:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>📋 Monthly Attendance Register</div>
            <div style={{fontSize:10,opacity:.8}}>
              eLogix HRMS · Auto-generated · Payroll-linked · {mon} {year} · {dept}
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>fileRef.current?.click()}
              style={{padding:'7px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
              📊 Import
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                onChange={e=>notify(`📂 ${e.target.files[0]?.name}`)} style={{display:'none'}}/>
            </button>
            <button onClick={()=>notify('📤 Exporting monthly attendance...')}
              style={{padding:'7px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
              📤 Export
            </button>
            <button onClick={()=>notify('💰 Syncing with payroll...')}
              style={{padding:'7px 14px',borderRadius:9,border:'none',background:'#fde68a',
                color:'#78350f',fontSize:10,fontWeight:800,cursor:'pointer'}}>
              💰 Sync Payroll
            </button>
            <button onClick={()=>setShowSig(true)}
              style={{padding:'7px 14px',borderRadius:9,border:'none',background:'#fff',
                color:A,fontSize:10,fontWeight:800,cursor:'pointer'}}>
              ✍️ Sign
            </button>
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
        </div>

        {/* Stats */}
        <div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}>
          {[
            ['👥','Staff',rows.length],
            ['✅','Present',rows.reduce((s,r)=>s+r.present,0)],
            ['❌','Absent',rows.reduce((s,r)=>s+r.absent,0)],
            ['🌙','Night Duty',rows.reduce((s,r)=>s+r.nd,0)],
            ['💰','Total LOP',`NPR ${rows.reduce((s,r)=>s+r.lopAmt,0).toLocaleString()}`],
          ].map(([ic,lb,v])=>(
            <div key={lb} style={{background:'rgba(255,255,255,.14)',borderRadius:9,
              padding:'7px 13px',textAlign:'center',minWidth:80}}>
              <div style={{fontSize:13,fontWeight:900}}>{v}</div>
              <div style={{fontSize:8,opacity:.75}}>{ic} {lb}</div>
            </div>
          ))}
        </div>
      </div>

      {/* LEGEND */}
      <div style={{background:'#fff',borderRadius:12,padding:'10px 16px',marginBottom:12,
        boxShadow:'0 1px 6px rgba(0,0,0,.06)',display:'flex',flexWrap:'wrap',gap:7}}>
        {Object.entries(CODE_STYLE).map(([code,s])=>(
          <span key={code} style={{display:'inline-flex',alignItems:'center',gap:4,
            background:s.bg,color:s.text,border:`1px solid ${s.border}`,
            fontSize:8.5,fontWeight:700,padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap'}}>
            <span style={{width:6,height:6,background:s.dot,borderRadius:'50%',display:'inline-block'}}/>
            {`${code}=${s.label}`}
          </span>
        ))}
        <span style={{fontSize:8.5,color:'#374151',display:'flex',alignItems:'center',gap:4}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',display:'inline-block'}}/>
          {'🟢=Log exists'}
          <span style={{width:6,height:6,borderRadius:'50%',background:'#dc2626',display:'inline-block',marginLeft:8}}/>
          {'🔴=No log'}
        </span>
      </div>

      {/* TABLE */}
      <div style={{background:'#fff',borderRadius:14,boxShadow:'0 2px 8px rgba(0,0,0,.06)',
        overflow:'auto',marginBottom:14,
        scrollbarWidth:'thin',scrollbarColor:`${A} #e2e8f0`}}>
        <style>{`::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:#f1f5f9}::-webkit-scrollbar-thumb{background:${A};border-radius:4px}`}</style>
        <table style={{width:'max-content',minWidth:'100%',borderCollapse:'collapse',fontSize:9}}>
          <thead style={{position:'sticky',top:0,zIndex:5}}>
            <tr style={{background:'#0c4a6e'}}>
              <th colSpan={5+daysInMonth+7} style={{padding:'7px 14px',textAlign:'center',
                fontSize:12,fontWeight:900,color:'#fff'}}>
                MONTHLY ATTENDANCE REGISTER — eLogix HRMS · {mon} {year} · {dept}
              </th>
            </tr>
            <tr style={{background:'#0369a1'}}>
              {[['S#',35],['Emp ID',70],['Name',130],['Desig.',100],['Dept',80]].map(([h,w])=>(
                <th key={h} style={{padding:'7px 6px',color:'#fff',fontWeight:700,fontSize:9,
                  width:w,minWidth:w,whiteSpace:'nowrap',
                  borderRight:'1px solid rgba(255,255,255,.2)',
                  position:'sticky',top:0,textAlign:'center'}}>
                  {h}
                </th>
              ))}
              {dayHdrs.map(({d,day,isWeekend})=>(
                <th key={d} style={{padding:'5px 2px',textAlign:'center',color:'#fff',fontWeight:700,
                  fontSize:8.5,minWidth:28,width:28,
                  background:isWeekend?'#075985':'#0369a1',
                  borderRight:'1px solid rgba(255,255,255,.15)',position:'sticky',top:0}}>
                  <div>{d}</div>
                  <div style={{fontSize:6.5,opacity:.75}}>{day}</div>
                </th>
              ))}
              {[['P','#bbf7d0'],['A','#fca5a5'],['L','#fde68a'],['ND','#c7d2fe'],
                ['WO','#bae6fd'],['LOP Days','#fca5a5'],['Net Salary','#86efac']].map(([h,c])=>(
                <th key={h} style={{padding:'7px 6px',color:c,fontWeight:700,fontSize:8.5,
                  minWidth:h.length>4?75:40,textAlign:'center',
                  borderLeft:'1px solid rgba(255,255,255,.2)',position:'sticky',top:0}}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row,ri)=>(
              <tr key={row.sn}
                style={{background:ri%2===0?'#fff':'#f8fafc'}}
                onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'}
                onMouseLeave={e=>e.currentTarget.style.background=ri%2===0?'#fff':'#f8fafc'}>
                <td style={{padding:'5px 6px',textAlign:'center',fontWeight:700,color:'#64748b',borderBottom:'1px solid #f1f5f9'}}>{row.sn}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontFamily:'monospace',fontSize:9,color:A,borderBottom:'1px solid #f1f5f9'}}>{row.empId}</td>
                <td style={{padding:'5px 6px',fontWeight:700,color:'#0f172a',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{row.name}</td>
                <td style={{padding:'5px 6px',fontSize:9,color:'#475569',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{row.desig}</td>
                <td style={{padding:'5px 6px',fontSize:9,color:'#64748b',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{row.dept}</td>
                {row.days.map((day,di)=><DayCell key={di} day={day}/>)}
                <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:'#15803d',borderBottom:'1px solid #f1f5f9',background:'#f0fdf4',borderLeft:'2px solid #bbf7d0'}}>{row.present}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:'#dc2626',borderBottom:'1px solid #f1f5f9',background:'#fef2f2'}}>{row.absent}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:'#d97706',borderBottom:'1px solid #f1f5f9',background:'#fffbeb'}}>{row.leave}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:'#4338ca',borderBottom:'1px solid #f1f5f9',background:'#f5f3ff'}}>{row.nd}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontWeight:700,color:'#0369a1',borderBottom:'1px solid #f1f5f9'}}>{row.woff}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontWeight:700,color:'#dc2626',borderBottom:'1px solid #f1f5f9',background:'#fef2f2'}}>{row.lopDays}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:'#059669',borderBottom:'1px solid #f1f5f9',background:'#f0fdf4',whiteSpace:'nowrap'}}>
                  {row.netSalary.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{background:'#0c4a6e',color:'#fff',position:'sticky',bottom:0}}>
              <td colSpan={5} style={{padding:'8px 12px',fontWeight:800,fontSize:10}}>TOTALS</td>
              {dayHdrs.map(({d})=>(
                <td key={d} style={{padding:'3px 2px',textAlign:'center',fontSize:8,color:'#bae6fd',fontWeight:700}}>
                  {rows.filter(r=>['P','ND'].includes(r.days[d-1]?.code)).length}
                </td>
              ))}
              <td style={{padding:'8px 6px',textAlign:'center',fontWeight:800,color:'#bbf7d0'}}>{rows.reduce((s,r)=>s+r.present,0)}</td>
              <td style={{padding:'8px 6px',textAlign:'center',fontWeight:800,color:'#fca5a5'}}>{rows.reduce((s,r)=>s+r.absent,0)}</td>
              <td style={{padding:'8px 6px',textAlign:'center',fontWeight:800,color:'#fde68a'}}>{rows.reduce((s,r)=>s+r.leave,0)}</td>
              <td style={{padding:'8px 6px',textAlign:'center',fontWeight:800,color:'#c7d2fe'}}>{rows.reduce((s,r)=>s+r.nd,0)}</td>
              <td style={{padding:'8px 6px',textAlign:'center',color:'#bae6fd'}}>{rows.reduce((s,r)=>s+r.woff,0)}</td>
              <td style={{padding:'8px 6px',textAlign:'center',fontWeight:800,color:'#fca5a5'}}>{rows.reduce((s,r)=>s+r.lopDays,0)}</td>
              <td style={{padding:'8px 6px',textAlign:'center',fontWeight:800,color:'#86efac',whiteSpace:'nowrap'}}>
                NPR {rows.reduce((s,r)=>s+r.netSalary,0).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* DIGITAL SIGNATURES */}
      <div style={{background:'#fff',borderRadius:14,padding:'18px',
        boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={{fontWeight:800,fontSize:13}}>✍️ Digital Signatures — Monthly Attendance Register</div>
            <div style={{fontSize:10,color:'#64748b',marginTop:2}}>
              eLogix HRMS auto-generated · Payroll-linked · {mon} {year}
            </div>
          </div>
          <button onClick={()=>setShowSig(true)}
            style={{padding:'7px 16px',borderRadius:9,border:'none',
              background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
            ✍️ Open Signature Panel
          </button>
        </div>
        <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
          <SigBox role="prepared"/>
          <SigBox role="verified"/>
          <SigBox role="approved"/>
        </div>
        <div style={{marginTop:12,padding:'10px 14px',background:'#fffbeb',
          border:'1px solid #fde68a',borderRadius:9,fontSize:10,color:'#92400e'}}>
          💰 <b>Payroll Note:</b> Net Salary = Basic Salary − LOP Deduction (Absent × Daily Rate).
          Once all 3 signatures are applied, this register is locked and cannot be modified
          without HR Manager override.
        </div>
      </div>

      {/* SIGNATURE MODAL */}
      {showSig && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={()=>setShowSig(false)}>
          <div style={{background:'#fff',borderRadius:18,width:640,maxWidth:'96vw',
            maxHeight:'93vh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>✍️ Digital Signature Panel</div>
              <div style={{fontSize:10,opacity:.8}}>Monthly Attendance Register · {mon} {year} · {dept}</div>
              <div style={{fontSize:9,opacity:.7,marginTop:2}}>
                All signatures are digitally timestamped and stored in eLogix HRMS
              </div>
            </div>
            <div style={{padding:'20px 22px'}}>
              {['prepared','verified','approved'].map(role => {
                const sig = sigs[role]
                const titles = {
                  prepared: '✍️ Prepared By (HR Officer / Admin)',
                  verified: '✅ Verified By (Head of Department / HR Manager)',
                  approved: '🏛 Approved By (HR Director / General Manager)',
                }
                return (
                  <div key={role} style={{marginBottom:20,padding:'16px',borderRadius:12,
                    border:`2px solid ${sig.signed?'#bae6fd':'#e2e8f0'}`,
                    background:sig.signed?'#f0f9ff':'#f8fafc'}}>
                    <div style={{fontWeight:800,fontSize:12,marginBottom:10}}>{titles[role]}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                      {[['Full Name *','name'],['Designation *','designation']].map(([lb,k])=>(
                        <div key={k}>
                          <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                          <input
                            value={sig[k]}
                            onChange={e=>setSigs(p=>({...p,[role]:{...p[role],[k]:e.target.value,signed:false}}))}
                            style={{...inp,fontSize:11}}
                            placeholder={lb.replace(' *','')}/>
                        </div>
                      ))}
                    </div>
                    <div style={{marginBottom:12}}>
                      <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Date *</label>
                      <input
                        type="date"
                        value={sig.date}
                        onChange={e=>setSigs(p=>({...p,[role]:{...p[role],date:e.target.value,signed:false}}))}
                        style={{...inp,width:'45%'}}/>
                    </div>
                    {!sig.signed ? (
                      <button onClick={()=>{
                        if (!sig.name||!sig.designation) { notify(`⚠️ Name & designation required for ${role}`); return }
                        setSigs(p=>({...p,[role]:{...p[role],signed:true}}))
                        notify(`✅ ${role} signed — ${sig.name} (${sig.designation}) · ${sig.date}`)
                      }} style={{padding:'9px 20px',borderRadius:9,border:'none',
                        background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        ✍️ Apply Digital Signature
                      </button>
                    ) : (
                      <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                        <span style={{fontFamily:'Georgia,serif',fontSize:22,color:A,fontStyle:'italic'}}>
                          {sig.name}
                        </span>
                        <span style={{background:'#f0f9ff',color:A,fontSize:9,fontWeight:700,
                          padding:'3px 10px',borderRadius:20,border:'1px solid #bae6fd'}}>
                          ✅ Signed · {sig.date}
                        </span>
                        <button onClick={()=>setSigs(p=>({...p,[role]:{...p[role],signed:false}}))}
                          style={{padding:'5px 10px',borderRadius:7,border:'1px solid #e2e8f0',
                            background:'#fff',fontSize:9,cursor:'pointer',color:'#64748b'}}>
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  const all = ['prepared','verified','approved'].every(r=>sigs[r].signed)
                  if (!all) { notify('⚠️ All 3 digital signatures required to finalise'); return }
                  notify('🔒 Monthly Attendance Register signed, verified & approved — locked for payroll processing')
                  setShowSig(false)
                }} style={{flex:1,padding:'11px',borderRadius:9,border:'none',
                  background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  🔒 Finalise & Send to Payroll
                </button>
                <button onClick={()=>setShowSig(false)}
                  style={{padding:'11px 18px',borderRadius:9,border:'1px solid #e2e8f0',
                    background:'#fff',fontSize:11,cursor:'pointer'}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

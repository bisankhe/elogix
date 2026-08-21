// FILE: DailyAttendanceLogPage.jsx — Daily Attendance Log In / Log Out
// Columns: Sl.No | Shift | Employee | Designation | Department | Login1 | Logout1 | Total1
//          Login2 | Logout2 | Total2 | Hrs Worked | Lunch-in | Lunch-out | Total3
//          Break-in1 | Break-out1 | Total4 | Break-in2 | Break-out2 | Total5
//          Total Breaks | Net Hrs Worked | Night Duty | Status
// Night Duty flag → auto feeds NightDutyAllowancePage → Payroll
import { useState, useRef, useCallback } from 'react'

const G  = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#38bdf8 100%)'
const GN = 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#6366f1 100%)'
const A  = '#0369a1'

const DEPARTMENTS = ['All Staffs','Management','Human Resources','Finance & Accounts',
  'Information Technology','Sales & Marketing','Operations','Procurement',
  'Customer Service','Legal','Administration','Learning & Development']
const DESIGNATIONS = ['CEO','General Manager','Deputy GM','Manager','Assistant Manager',
  'Senior Officer','Officer','Junior Officer','Senior Executive','Executive',
  'Senior Associate','Associate','Supervisor','Team Lead','Intern','Trainee']
const SHIFTS     = ['All','Day','Morning','Evening','Night','Split','Rotational']
const EMP_STATUS = ['Permanent','Contract','Probation','Part-Time','Intern','Outsource']

const FIRST = ['Ram','Shyam','Hari','Sita','Gita','Maya','Binod','Sunil','Priya','Anil',
  'Bikash','Sunita','Rajesh','Puja','Deepak','Anita','Sanjay','Rupa','Nabin','Sabita',
  'Kamal','Kamala','Roshan','Rekha','Nirmal','Nirmala','Dipak','Dipika','Arjun','Asha']
const LAST  = ['Thapa','Shrestha','Maharjan','Tamang','Gurung','Rai','Limbu','Karki',
  'Basnet','Adhikari','KC','Bhattarai','Sharma','Poudel','Joshi','Hamal']
const rand  = a => a[Math.floor(Math.random()*a.length)]
const pad2  = n => String(n).padStart(2,'0')

function genEmployees(n=80) {
  const rows = []
  for (let i=1;i<=n;i++) {
    const shift = rand(['Day','Day','Day','Morning','Evening','Night','Split'])
    const isNight = shift === 'Night' || (shift === 'Split' && Math.random()>0.6)
    const li1h = isNight ? 21 : 8+Math.floor(Math.random()*2)
    const li1m = Math.floor(Math.random()*30)
    const lo1h = isNight ? 24+Math.floor(Math.random()*2) : 13
    const lo1m = Math.floor(Math.random()*30)
    const li2h = isNight ? (lo1h%24)+1 : 13
    const li2m = Math.floor(Math.random()*20)
    const lo2h = isNight ? li2h+4 : 17+Math.floor(Math.random()*2)
    const lo2m = Math.floor(Math.random()*60)
    const t1 = ((lo1h*60+lo1m)-(li1h*60+li1m))/60
    const t2 = ((lo2h*60+lo2m)-(li2h*60+li2m))/60
    const hw  = t1+t2
    const lunchMins = isNight ? 20 : 30+Math.floor(Math.random()*20)
    const tb = (lunchMins+15+15)/60
    const net = Math.max(0, hw-tb)
    const present = Math.random() > 0.07
    rows.push({
      sl:i,
      empId:`EMP-${String(i).padStart(4,'0')}`,
      name:`${rand(FIRST)} ${rand(LAST)}`,
      designation: rand(DESIGNATIONS),
      dept: DEPARTMENTS[Math.floor(Math.random()*(DEPARTMENTS.length-1))+1],
      shift,
      login1:    present ? `${pad2(li1h%24)}:${pad2(li1m)}`  : '—',
      logout1:   present ? `${pad2(lo1h%24)}:${pad2(lo1m)}`  : '—',
      total1:    present ? t1.toFixed(2)  : '0.00',
      login2:    present ? `${pad2(li2h%24)}:${pad2(li2m)}`  : '—',
      logout2:   present ? `${pad2(lo2h%24)}:${pad2(lo2m)}`  : '—',
      total2:    present ? t2.toFixed(2)  : '0.00',
      hoursWorked: present ? hw.toFixed(2)  : '0.00',
      lunchIn:   present ? `${pad2(isNight?0:12)}:${pad2(Math.floor(Math.random()*30))}` : '—',
      lunchOut:  present ? `${pad2(isNight?0:13)}:${pad2(lunchMins)}` : '—',
      total3:    present ? (lunchMins/60).toFixed(2) : '0.00',
      brk1in:    present ? `${pad2(isNight?23:10)}:00` : '—',
      brk1out:   present ? `${pad2(isNight?23:10)}:15` : '—',
      total4:    present ? '0.25' : '0.00',
      brk2in:    present ? `${pad2(isNight?3:15)}:00`  : '—',
      brk2out:   present ? `${pad2(isNight?3:15)}:15`  : '—',
      total5:    present ? '0.25' : '0.00',
      totalBreaks: present ? tb.toFixed(2)  : '0.00',
      netHrs:    present ? net.toFixed(2) : '0.00',
      isNightDuty: present && isNight,
      status: rand(EMP_STATUS),
      present,
      late: present && !isNight && li1h>=9,
    })
  return rows

const INIT_ROWS = genEmployees(80)
const inp = {padding:'7px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:10,
  outline:'none',background:'#fff',width:'100%',boxSizing:'border-box',fontFamily:'inherit'}

const CH = ({lbl,sub,w=70,bg=A}) => (
  <th style={{padding:'7px 5px',textAlign:'center',fontSize:8,fontWeight:700,color:'#fff',
    whiteSpace:'nowrap',width:w,minWidth:w,borderRight:'1px solid rgba(255,255,255,.15)',
    verticalAlign:'middle',lineHeight:1.3,background:bg,position:'sticky',top:0,zIndex:2}}>
    {lbl}{sub&&<><br/><span style={{fontWeight:400,opacity:.75,fontSize:7}}>{sub}</span></>}
  </th>
)
const GH = ({lbl,span,bg}) => (
  <th colSpan={span} style={{padding:'5px 6px',textAlign:'center',fontSize:8,fontWeight:700,
    color:'#fff',borderRight:'2px solid rgba(255,255,255,.25)',background:bg,
    position:'sticky',top:0,zIndex:2}}>
    {lbl}
  </th>
)

export default function DailyAttendanceLogPage() {
  const today = new Date().toISOString().split('T')[0]
  const [rows, setRows]       = useState(INIT_ROWS)
  const [date, setDate]       = useState(today)
  const [dept, setDept]       = useState('All Staffs')
  const [shift, setShift]     = useState('All')
  const [search, setSearch]   = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editSl, setEditSl]   = useState(null)
  const [msg, setMsg]         = useState('')
  const [form, setForm]       = useState({
    name:'',empId:'',designation:'',dept:'',shift:'Day',status:'Permanent',
    login1:'',logout1:'',login2:'',logout2:'',
    lunchIn:'',lunchOut:'',brk1in:'',brk1out:'',brk2in:'',brk2out:'',
  })
  const fileRef = useRef(null)
  const notify  = m => { setMsg(m); setTimeout(()=>setMsg(''),3500) }
  const sf = (k,v) => setForm(p=>({...p,[k]:v}))

  const filtered = rows.filter(r => {
    if (dept!=='All Staffs' && r.dept!==dept) return false
    if (shift!=='All' && r.shift!==shift) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) &&
        !r.empId.includes(search) && !r.designation.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalStaff  = filtered.length
  const present     = filtered.filter(r=>r.present).length
  const absent      = totalStaff - present
  const late        = filtered.filter(r=>r.late).length
  const nightDuty   = filtered.filter(r=>r.isNightDuty).length
  const avgNet      = filtered.length ? (filtered.reduce((s,r)=>s+parseFloat(r.netHrs||0),0)/filtered.length).toFixed(2) : '0.00'

  const calcHrs = (a,b) => {
    if (!a||!b||a==='—'||b==='—') return 0
    const [ah,am] = a.split(':').map(Number)
    const [bh,bm] = b.split(':').map(Number)
    return Math.max(0,((bh*60+bm)-(ah*60+am))/60)

  const handleSave = () => {
    if (!form.name||!form.empId) { notify('⚠️ Name and Employee ID required'); return }
    const t1 = calcHrs(form.login1, form.logout1)
    const t2 = calcHrs(form.login2, form.logout2)
    const hw = t1+t2
    const t3 = calcHrs(form.lunchIn, form.lunchOut)
    const t4 = calcHrs(form.brk1in, form.brk1out)
    const t5 = calcHrs(form.brk2in, form.brk2out)
    const tb = t3+t4+t5
    const net = Math.max(0, hw-tb)
    const isNight = form.shift==='Night'
    const entry = {
      ...form, sl: editSl!==null ? editSl : rows.length+1,
      total1:t1.toFixed(2), total2:t2.toFixed(2), hoursWorked:hw.toFixed(2),
      total3:t3.toFixed(2), total4:t4.toFixed(2), total5:t5.toFixed(2),
      totalBreaks:tb.toFixed(2), netHrs:net.toFixed(2),
      isNightDuty:isNight, present:true,
      late: !isNight && form.login1>='09:00',
    if (editSl!==null) {
      setRows(p=>p.map(r=>r.sl===editSl?entry:r))
      notify('✅ Record updated — Night duty synced to allowance register')
    } else {
      setRows(p=>[...p,entry])
      notify('✅ Attendance added' + (isNight?' · 🌙 Night duty allowance queued for payroll':''))
    setShowAdd(false); setEditSl(null)
    setForm({name:'',empId:'',designation:'',dept:'',shift:'Day',status:'Permanent',login1:'',logout1:'',login2:'',logout2:'',lunchIn:'',lunchOut:'',brk1in:'',brk1out:'',brk2in:'',brk2out:''})

  const handleEdit = r => {
    setForm({name:r.name,empId:r.empId,designation:r.designation||'',dept:r.dept,shift:r.shift,status:r.status,
      login1:r.login1==='—'?'':r.login1,logout1:r.logout1==='—'?'':r.logout1,
      login2:r.login2==='—'?'':r.login2,logout2:r.logout2==='—'?'':r.logout2,
      lunchIn:r.lunchIn==='—'?'':r.lunchIn,lunchOut:r.lunchOut==='—'?'':r.lunchOut,
      brk1in:r.brk1in==='—'?'':r.brk1in,brk1out:r.brk1out==='—'?'':r.brk1out,
      brk2in:r.brk2in==='—'?'':r.brk2in,brk2out:r.brk2out==='—'?'':r.brk2out,
    })
    setEditSl(r.sl); setShowAdd(true)

  const exportCSV = () => {
    const h=['Sl.No','Emp ID','Name','Designation','Department','Shift','Login1','Logout1','Total1','Login2','Logout2','Total2','Hrs Worked','Lunch-In','Lunch-Out','Total3','Brk-In1','Brk-Out1','Total4','Brk-In2','Brk-Out2','Total5','Total Breaks','Net Hrs','Night Duty','Status']
    const r=[h.join(',')]
    filtered.forEach(x=>r.push([x.sl,x.empId,`"${x.name}"`,`"${x.designation||''}"`,`"${x.dept}"`,x.shift,x.login1,x.logout1,x.total1,x.login2,x.logout2,x.total2,x.hoursWorked,x.lunchIn,x.lunchOut,x.total3,x.brk1in,x.brk1out,x.total4,x.brk2in,x.brk2out,x.total5,x.totalBreaks,x.netHrs,x.isNightDuty?'YES':'NO',x.status].join(',')))
    const blob=new Blob([r.join('\n')],{type:'text/csv'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`DailyAttendance_${date}.csv`;a.click()
    notify('📤 Exported to CSV')

  const SC = {Permanent:'#1d4ed8',Contract:'#d97706',Probation:'#7c3aed','Part-Time':'#0891b2',Intern:'#059669',Outsource:'#dc2626'}

  return (
    <div style={{fontFamily:'system-ui,sans-serif',height:'100vh',display:'flex',flexDirection:'column',background:'#f0f7ff'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:11,color:'#065f46',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:420}}>{msg}</div>}

      {/* HEADER */}
      <div style={{background:G,padding:'14px 20px',color:'#fff',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>📋 Daily Attendance Log — Login & Logout</div>
            <div style={{fontSize:10,opacity:.8,marginTop:2}}>All Shifts · All Departments · 🌙 Night Duty Detection → Payroll Sync</div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button onClick={()=>fileRef.current?.click()} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>
              📊 Import Excel<input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" onChange={e=>notify(`📂 ${e.target.files[0]?.name} imported`)} style={{display:'none'}}/>
            </button>
            <button onClick={exportCSV} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>📤 Export CSV</button>
            <button onClick={()=>notify('🖨 Sending to printer...')} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>🖨 Print</button>
            <button onClick={()=>{setEditSl(null);setShowAdd(true)}} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#fff',color:A,fontSize:9,fontWeight:800,cursor:'pointer'}}>+ Add Entry</button>
          </div>
        </div>
        {/* Stats */}
        <div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}>
          {[['👥','Total',totalStaff],['✅','Present',present],['❌','Absent',absent],['⏰','Late',late],['🌙','Night Duty',nightDuty],['⌛','Avg Net',avgNet+'h']].map(([ic,lb,v])=>(
            <div key={lb} style={{background:'rgba(255,255,255,.12)',borderRadius:8,padding:'6px 12px',textAlign:'center',minWidth:70}}>
              <div style={{fontSize:16,fontWeight:900}}>{v}</div>
              <div style={{fontSize:8,opacity:.75}}>{ic} {lb}</div>
            </div>
          ))}
          {nightDuty>0&&<div style={{background:'rgba(99,102,241,.4)',borderRadius:8,padding:'6px 12px',border:'1px solid rgba(165,180,252,.5)'}}>
            <div style={{fontSize:9,color:'#c7d2fe',fontWeight:700}}>🌙 {nightDuty} night duty records queued → Night Duty Allowance → Payroll</div>
          </div>}
        </div>
      </div>

      {/* FILTERS */}
      <div style={{background:'#fff',padding:'8px 16px',flexShrink:0,boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
        {[['📅 Date','date',date,v=>setDate(v),'date'],['🏢 Department','dept',null,null,'dept-sel'],['⏱ Shift','shift',null,null,'shift-sel']].map(([label,key,val,setter,type])=>(
          <div key={key} style={{flex:'1 1 120px',minWidth:110}}>
            <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>{label}</label>
            {type==='date'&&<input type="date" value={val} onChange={e=>setter(e.target.value)} style={inp}/>}
            {type==='dept-sel'&&<select value={dept} onChange={e=>setDept(e.target.value)} style={inp}>
              {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select>}
            {type==='shift-sel'&&<select value={shift} onChange={e=>setShift(e.target.value)} style={inp}>
              {SHIFTS.map(s=><option key={s}>{s}</option>)}</select>}
          </div>
        ))}
        <div style={{flex:'2 1 180px',minWidth:160}}>
          <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>🔍 Search Name / ID / Designation</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={inp}/>
        </div>
        <button onClick={()=>{setSearch('');setDept('All Staffs');setShift('All');setDate(today)}}
          style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:9,cursor:'pointer',color:'#64748b',whiteSpace:'nowrap'}}>↺ Reset</button>
      </div>

      {/* Report info bar */}
      <div style={{background:'#fff',borderBottom:'1px solid #f1f5f9',padding:'4px 16px',flexShrink:0,display:'flex',gap:12,fontSize:8.5,color:'#475569',flexWrap:'wrap'}}>
        <span>📁 <b>Dept:</b> {dept}</span><span>📅 <b>Date:</b> {date}</span>
        <span>🖨 <b>Printed:</b> {new Date().toLocaleDateString('en-NP')}</span>
        <span>👤 <b>By:</b> HR Administrator</span>
        <span style={{marginLeft:'auto',fontWeight:700}}>📊 {filtered.length} / {rows.length} records shown</span>
      </div>

      {/* TABLE WRAPPER — scrollable both X and Y with scroll bars at bottom/right */}
      <div style={{flex:1,overflow:'auto',position:'relative',
        scrollbarWidth:'thin',scrollbarColor:`${A} #e2e8f0`}}>
        <style>{`
          ::-webkit-scrollbar{width:10px;height:10px}
          ::-webkit-scrollbar-track{background:#f1f5f9;border-radius:5px}
          ::-webkit-scrollbar-thumb{background:${A};border-radius:5px}
          ::-webkit-scrollbar-thumb:hover{background:#0c4a6e}
          ::-webkit-scrollbar-corner{background:#f1f5f9}
        `}</style>

        <table style={{width:'max-content',minWidth:'100%',borderCollapse:'collapse',fontSize:9.5}}>
          <thead style={{position:'sticky',top:0,zIndex:10}}>
            {/* GROUP ROW */}
            <tr>
              <GH lbl="EMPLOYEE INFO"      span={7}  bg="#0c4a6e"/>
              <GH lbl="SESSION 1"          span={3}  bg="#14532d"/>
              <GH lbl="SESSION 2"          span={3}  bg="#92400e"/>
              <GH lbl="HRS WORKED"         span={1}  bg="#164e63"/>
              <GH lbl="LUNCH BREAK"        span={3}  bg="#7f1d1d"/>
              <GH lbl="BREAK 1"            span={3}  bg="#581c87"/>
              <GH lbl="BREAK 2"            span={3}  bg="#134e4a"/>
              <GH lbl="SUMMARY"            span={2}  bg="#1e3a5f"/>
              <GH lbl="NIGHT / STATUS"     span={3}  bg="#1e1b4b"/>
            </tr>
            {/* COLUMN ROW */}
            <tr>
              {/* Employee info */}
              <CH lbl="Sl.No"       w={45}  bg="#0c4a6e"/>
              <CH lbl="Emp ID"      w={80}  bg="#0c4a6e"/>
              <CH lbl="Employee Name" w={140} bg="#0c4a6e"/>
              <CH lbl="Designation" w={120} bg="#0c4a6e"/>
              <CH lbl="Department"  w={115} bg="#0c4a6e"/>
              <CH lbl="Shift"       w={70}  bg="#0c4a6e"/>
              <CH lbl="Emp Status"  w={80}  bg="#0c4a6e"/>
              {/* Session 1 */}
              <CH lbl="Login 1"  sub="HH:MM" w={65} bg="#14532d"/>
              <CH lbl="Logout 1" sub="HH:MM" w={65} bg="#14532d"/>
              <CH lbl="Total 1"  sub="hrs"   w={55} bg="#14532d"/>
              {/* Session 2 */}
              <CH lbl="Login 2"  sub="HH:MM" w={65} bg="#92400e"/>
              <CH lbl="Logout 2" sub="HH:MM" w={65} bg="#92400e"/>
              <CH lbl="Total 2"  sub="hrs"   w={55} bg="#92400e"/>
              {/* Hrs worked */}
              <CH lbl="Hrs Worked" sub="T1+T2" w={70} bg="#164e63"/>
              {/* Lunch */}
              <CH lbl="Lunch In"  sub="HH:MM" w={65} bg="#7f1d1d"/>
              <CH lbl="Lunch Out" sub="HH:MM" w={65} bg="#7f1d1d"/>
              <CH lbl="Total 3"   sub="hrs"   w={55} bg="#7f1d1d"/>
              {/* Break 1 */}
              <CH lbl="Brk-In 1"  sub="HH:MM" w={65} bg="#581c87"/>
              <CH lbl="Brk-Out 1" sub="HH:MM" w={65} bg="#581c87"/>
              <CH lbl="Total 4"   sub="hrs"   w={55} bg="#581c87"/>
              {/* Break 2 */}
              <CH lbl="Brk-In 2"  sub="HH:MM" w={65} bg="#134e4a"/>
              <CH lbl="Brk-Out 2" sub="HH:MM" w={65} bg="#134e4a"/>
              <CH lbl="Total 5"   sub="hrs"   w={55} bg="#134e4a"/>
              {/* Summary */}
              <CH lbl="Total Breaks" sub="hrs" w={70} bg="#1e3a5f"/>
              <CH lbl="Net Hrs"  sub="Worked" w={65}  bg="#1e3a5f"/>
              {/* Night/Status */}
              <CH lbl="Night Duty" w={80}  bg="#1e1b4b"/>
              <CH lbl="Emp Status" w={85}  bg="#1e1b4b"/>
              <CH lbl="Action"     w={75}  bg="#1e1b4b"/>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r,i) => {
              const netNum = parseFloat(r.netHrs)
              const netClr = !r.present?'#dc2626':netNum>=8?'#059669':netNum>=6?'#d97706':'#dc2626'
              const sc = SC[r.status]||'#64748b'
              const rowBg = r.isNightDuty ? '#f5f3ff' : !r.present ? '#fef2f2' : r.late ? '#fffbeb' : i%2===0?'#fff':'#f8fafc'
              return (
                <tr key={r.sl}
                  style={{background:rowBg,transition:'background .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                  <td style={{padding:'5px 6px',textAlign:'center',fontWeight:700,color:'#64748b',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{r.sl}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontFamily:'monospace',fontSize:8.5,color:A,borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{r.empId}</td>
                  <td style={{padding:'5px 7px',fontWeight:700,color:'#0f172a',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>
                    {r.isNightDuty&&<span style={{marginRight:3,fontSize:10}}>🌙</span>}
                    {!r.present&&<span style={{marginRight:3,fontSize:10}}>🔴</span>}
                    {r.late&&r.present&&!r.isNightDuty&&<span style={{marginRight:3,fontSize:10}}>🟡</span>}
                    {r.present&&!r.late&&!r.isNightDuty&&<span style={{marginRight:3,fontSize:10}}>🟢</span>}
                    {r.name}
                  </td>
                  <td style={{padding:'5px 6px',fontSize:8.5,color:'#475569',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{r.designation}</td>
                  <td style={{padding:'5px 6px',fontSize:8.5,color:'#475569',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{r.dept}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{background:r.shift==='Night'?GN:'#eff6ff',color:r.shift==='Night'?'#fff':'#1d4ed8',fontSize:7.5,fontWeight:700,padding:'2px 6px',borderRadius:20}}>{r.shift}</span>
                  </td>
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{background:sc+'15',color:sc,fontSize:7.5,fontWeight:700,padding:'2px 6px',borderRadius:20,border:`1px solid ${sc}30`}}>{r.status}</span>
                  </td>
                  {/* Session 1 */}
                  {[r.login1,r.logout1,r.total1].map((v,j)=>(
                    <td key={j} style={{padding:'5px 6px',textAlign:'center',fontFamily:'monospace',fontSize:9,color:v==='—'?'#94a3b8':'#0f172a',borderBottom:'1px solid #f1f5f9'}}>{v}</td>
                  ))}
                  {/* Session 2 */}
                  {[r.login2,r.logout2,r.total2].map((v,j)=>(
                    <td key={j} style={{padding:'5px 6px',textAlign:'center',fontFamily:'monospace',fontSize:9,color:v==='—'?'#94a3b8':'#0f172a',borderBottom:'1px solid #f1f5f9'}}>{v}</td>
                  ))}
                  {/* Hrs Worked */}
                  <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:netClr,borderBottom:'1px solid #f1f5f9',background:'#f0f9ff'}}>{r.hoursWorked}</td>
                  {/* Lunch */}
                  {[r.lunchIn,r.lunchOut,r.total3].map((v,j)=>(
                    <td key={j} style={{padding:'5px 6px',textAlign:'center',fontFamily:'monospace',fontSize:8.5,color:v==='—'?'#94a3b8':'#475569',borderBottom:'1px solid #f1f5f9'}}>{v}</td>
                  ))}
                  {/* Break 1 */}
                  {[r.brk1in,r.brk1out,r.total4].map((v,j)=>(
                    <td key={j} style={{padding:'5px 6px',textAlign:'center',fontFamily:'monospace',fontSize:8.5,color:v==='—'?'#94a3b8':'#475569',borderBottom:'1px solid #f1f5f9'}}>{v}</td>
                  ))}
                  {/* Break 2 */}
                  {[r.brk2in,r.brk2out,r.total5].map((v,j)=>(
                    <td key={j} style={{padding:'5px 6px',textAlign:'center',fontFamily:'monospace',fontSize:8.5,color:v==='—'?'#94a3b8':'#475569',borderBottom:'1px solid #f1f5f9'}}>{v}</td>
                  ))}
                  {/* Summary */}
                  <td style={{padding:'5px 6px',textAlign:'center',fontWeight:700,color:'#dc2626',borderBottom:'1px solid #f1f5f9',background:'#fff7ed'}}>{r.totalBreaks}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:netClr,borderBottom:'1px solid #f1f5f9',background:'#f0fdf4'}}>{r.netHrs}</td>
                  {/* Night duty */}
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9',background:r.isNightDuty?'#f5f3ff':'transparent'}}>
                    {r.isNightDuty
                      ? <span style={{background:GN,color:'#fff',fontSize:8,fontWeight:800,padding:'3px 8px',borderRadius:20,whiteSpace:'nowrap'}}>🌙 YES</span>
                      : <span style={{color:'#94a3b8',fontSize:9}}>—</span>}
                  </td>
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{background:sc+'15',color:sc,fontSize:7.5,fontWeight:700,padding:'2px 6px',borderRadius:20}}>{r.status}</span>
                  </td>
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9'}}>
                    <button onClick={()=>handleEdit(r)} style={{padding:'3px 8px',borderRadius:6,border:'none',background:A+'18',color:A,fontSize:8,fontWeight:700,cursor:'pointer'}}>✏️</button>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* FOOTER TOTALS */}
          <tfoot>
            <tr style={{background:'#0c4a6e',color:'#fff',position:'sticky',bottom:0}}>
              <td colSpan={5} style={{padding:'7px 10px',fontWeight:800,fontSize:10}}>TOTALS — {filtered.length} employees</td>
              <td colSpan={8}/>
              <td style={{padding:'7px',textAlign:'center',fontWeight:800,color:'#bae6fd'}}>
                {filtered.reduce((s,r)=>s+parseFloat(r.hoursWorked||0),0).toFixed(2)}
              </td>
              <td colSpan={9}/>
              <td style={{padding:'7px',textAlign:'center',fontWeight:800,color:'#fca5a5'}}>
                {filtered.reduce((s,r)=>s+parseFloat(r.totalBreaks||0),0).toFixed(2)}
              </td>
              <td style={{padding:'7px',textAlign:'center',fontWeight:800,color:'#86efac'}}>
                {filtered.reduce((s,r)=>s+parseFloat(r.netHrs||0),0).toFixed(2)}
              </td>
              <td style={{padding:'7px',textAlign:'center',fontSize:9,color:'#c4b5fd',fontWeight:700}}>🌙 {nightDuty}</td>
              <td colSpan={2}/>
            </tr>
          </tfoot>
        </table>

        {filtered.length===0&&<div style={{padding:'40px',textAlign:'center',color:'#94a3b8',fontSize:12}}>No records found.</div>}
      </div>

      {/* Legend */}
      <div style={{background:'#fff',padding:'5px 16px',borderTop:'1px solid #f1f5f9',flexShrink:0,display:'flex',gap:14,fontSize:8.5,color:'#64748b',flexWrap:'wrap'}}>
        {[['🟢','Present & On Time'],['🟡','Late Arrival'],['🔴','Absent'],['🌙','Night Duty → Auto Queued for Night Duty Allowance → Payroll']].map(([ic,lb])=>(
          <span key={lb}>{ic} {lb}</span>
        ))}
      </div>

      {/* ADD/EDIT MODAL */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:12}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:16,padding:0,width:700,maxWidth:'97vw',maxHeight:'94vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'13px 20px',borderRadius:'16px 16px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>{editSl?'✏️ Edit':'+ Add'} Attendance Entry</div>
              <div style={{fontSize:9,opacity:.8,marginTop:1}}>Times HH:MM 24-hr · Net Hrs auto-calculated · 🌙 Night shift auto-flags for allowance</div>
            </div>
            <div style={{padding:'16px 20px'}}>
              {/* Employee Info */}
              <div style={{fontSize:10,fontWeight:800,color:A,borderBottom:'1px solid #f1f5f9',paddingBottom:5,marginBottom:10}}>👤 Employee Information</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
                {[['Employee Name *','name','text'],['Employee ID *','empId','text']].map(([l,k,t])=>(
                  <div key={k}><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>{l}</label>
                  <input type={t} value={form[k]} onChange={e=>sf(k,e.target.value)} style={inp} placeholder={l.replace(' *','')+' ...'}/></div>
                ))}
                <div><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>Designation</label>
                  <select value={form.designation} onChange={e=>sf('designation',e.target.value)} style={inp}>
                    <option value="">— Select —</option>{DESIGNATIONS.map(d=><option key={d}>{d}</option>)}
                  </select></div>
                <div><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>Department</label>
                  <select value={form.dept} onChange={e=>sf('dept',e.target.value)} style={inp}>
                    <option value="">— Select —</option>{DEPARTMENTS.slice(1).map(d=><option key={d}>{d}</option>)}
                  </select></div>
                <div><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>Shift</label>
                  <select value={form.shift} onChange={e=>sf('shift',e.target.value)} style={inp}>
                    {SHIFTS.slice(1).map(s=><option key={s}>{s}</option>)}
                  </select></div>
                <div><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>Employment Status</label>
                  <select value={form.status} onChange={e=>sf('status',e.target.value)} style={inp}>
                    {EMP_STATUS.map(s=><option key={s}>{s}</option>)}
                  </select></div>
              </div>
              {form.shift==='Night'&&<div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:8,padding:'7px 12px',marginBottom:12,fontSize:9,color:'#6d28d9',fontWeight:600}}>🌙 Night Shift Detected — This record will auto-queue for Night Duty Allowance calculation and payroll processing.</div>}
              {/* Sessions */}
              {[['🟢 Session 1','login1','logout1','#14532d'],['🟡 Session 2','login2','logout2','#92400e']].map(([label,lk,ok,clr])=>(
                <div key={lk}>
                  <div style={{fontSize:9,fontWeight:800,color:clr,borderBottom:'1px solid #f1f5f9',paddingBottom:4,marginBottom:8}}>{label}</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                    {[[`Login (${lk})`,lk],[`Logout (${ok})`,ok]].map(([l,k])=>(
                      <div key={k}><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>{l}</label>
                      <input type="time" value={form[k]} onChange={e=>sf(k,e.target.value)} style={inp}/></div>
                    ))}
                  </div>
                </div>
              ))}
              {/* Breaks */}
              <div style={{fontSize:9,fontWeight:800,color:'#7f1d1d',borderBottom:'1px solid #f1f5f9',paddingBottom:4,marginBottom:8}}>⏸ Lunch & Breaks</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
                {[['Lunch In','lunchIn'],['Lunch Out','lunchOut'],['Break 1 In','brk1in'],['Break 1 Out','brk1out'],['Break 2 In','brk2in'],['Break 2 Out','brk2out']].map(([l,k])=>(
                  <div key={k}><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>{l}</label>
                  <input type="time" value={form[k]} onChange={e=>sf(k,e.target.value)} style={inp}/></div>
                ))}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={handleSave} style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>💾 {editSl?'Update':'Save'}</button>
                <button onClick={()=>{setShowAdd(false);setEditSl(null)}} style={{padding:'10px 16px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

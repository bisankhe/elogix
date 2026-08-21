// FILE: OvertimeLogPage.jsx — Overtime Log & Approval
// Includes Designation column + Night OT detection
// Process: Supervisor/Manager/HOD → Approve: HOD/Payroll Officer/HR Manager
import { useState, useRef } from 'react'

const G  = 'linear-gradient(135deg,#7f1d1d 0%,#b91c1c 55%,#f97316 100%)'
const GA = 'linear-gradient(135deg,#14532d 0%,#15803d 60%,#86efac 100%)'
const GN = 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#6366f1 100%)'
const A  = '#b91c1c'

const DEPARTMENTS = ['All Staffs','Management','Human Resources','Finance & Accounts',
  'Information Technology','Sales & Marketing','Operations','Procurement',
  'Customer Service','Legal','Administration','Learning & Development']
const DESIGNATIONS = ['CEO','General Manager','Deputy GM','Manager','Assistant Manager',
  'Senior Officer','Officer','Junior Officer','Senior Executive','Executive',
  'Senior Associate','Associate','Supervisor','Team Lead','Intern','Trainee']
const SHIFTS        = ['Day','Morning','Evening','Night','Split','Rotational']
const OT_TYPES      = ['Weekday OT','Weekend OT','Public Holiday OT','Special OT','Night OT']
const OT_RATES      = ['1.0×','1.5×','2.0×','2.5×','3.0×']
const PERIODS       = ['Daily','Weekly','Bi-Monthly','Monthly']
const PROCESS_ROLES = ['Supervisor','Manager','HOD']
const APPROVE_ROLES = ['HOD','Payroll Officer','HR Manager']

const OT_STATUS = {
  pending:    {c:'#d97706',bg:'#fffbeb',b:'#fde68a',icon:'⏳',l:'Pending'},
  processing: {c:'#0891b2',bg:'#f0f9ff',b:'#bae6fd',icon:'🔄',l:'Processing'},
  approved:   {c:'#059669',bg:'#f0fdf4',b:'#bbf7d0',icon:'✅',l:'Approved'},
  rejected:   {c:'#dc2626',bg:'#fef2f2',b:'#fecaca',icon:'❌',l:'Rejected'},
  paid:       {c:'#7c3aed',bg:'#f5f3ff',b:'#ddd6fe',icon:'💰',l:'Paid'},

const pad2 = n=>String(n).padStart(2,'0')
const rand = a=>a[Math.floor(Math.random()*a.length)]
const FIRST=['Ram','Shyam','Hari','Sita','Gita','Maya','Binod','Sunil','Priya','Anil','Bikash','Sunita','Rajesh','Puja','Deepak','Anita','Sanjay']
const LAST=['Thapa','Shrestha','Maharjan','Tamang','Gurung','Rai','Limbu','Karki','Basnet','Adhikari','KC','Bhattarai','Sharma','Poudel']

function genOTRows(n=65) {
  const rows=[]
  for(let i=1;i<=n;i++){
    const dept  = DEPARTMENTS[Math.floor(Math.random()*(DEPARTMENTS.length-1))+1]
    const shift = rand(SHIFTS)
    const otType= rand(OT_TYPES)
    const otRate= rand(OT_RATES)
    const isNight = shift==='Night'||otType==='Night OT'
    const li1h  = isNight?21:8+Math.floor(Math.random()*1)
    const lo1h  = isNight?25:13
    const li2h  = isNight?26:13
    const lo2h  = isNight?31:17+Math.floor(Math.random()*1)
    const li1m=Math.floor(Math.random()*30), lo1m=Math.floor(Math.random()*30)
    const li2m=Math.floor(Math.random()*20), lo2m=Math.floor(Math.random()*30)
    const otStartH = lo2h, otStartM = lo2m
    const otHrs = 1+Math.floor(Math.random()*4)
    const otEndH = otStartH+otHrs, otEndM = otStartM
    const regularHrs=((lo1h*60+lo1m)-(li1h*60+li1m)+(lo2h*60+lo2m)-(li2h*60+li2m))/60
    const otHrsNum=otHrs+(otStartM/60)
    const baseSalary=25000+Math.floor(Math.random()*75000)
    const hourlyRate=Math.round(baseSalary/22/8)
    const mult=parseFloat(otRate.replace('×',''))
    const otPay=Math.round(otHrsNum*hourlyRate*mult)
    const statuses=['pending','processing','approved','rejected','paid']
    const status=rand(statuses)
    rows.push({
      sl:i,
      empId:`EMP-${String(i).padStart(4,'0')}`,
      name:`${rand(FIRST)} ${rand(LAST)}`,
      designation: rand(DESIGNATIONS),
      dept, shift, isNight,
      login1:`${pad2(li1h%24)}:${pad2(li1m)}`,
      logout1:`${pad2(lo1h%24)}:${pad2(lo1m)}`,
      login2:`${pad2(li2h%24)}:${pad2(li2m)}`,
      logout2:`${pad2(lo2h%24)}:${pad2(lo2m)}`,
      regularHrs:regularHrs.toFixed(2),
      otStart:`${pad2(otStartH%24)}:${pad2(otStartM)}`,
      otEnd:`${pad2(Math.min(otEndH,23+24)%24)}:${pad2(otEndM)}`,
      otHrs:otHrsNum.toFixed(2),
      otType, otRate, hourlyRate, otPay,
      totalPay:otPay, baseSalary,
      status,
      processedBy: status!=='pending'?rand(PROCESS_ROLES):'—',
      approvedBy:  ['approved','paid'].includes(status)?rand(APPROVE_ROLES):'—',
      remarks:     status==='rejected'?'Not pre-approved':'—',
    })
  return rows

const ALL_OT = genOTRows(65)
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

export default function OvertimeLogPage() {
  const today = new Date().toISOString().split('T')[0]
  const [rows, setRows]         = useState(ALL_OT)
  const [period, setPeriod]     = useState('Daily')
  const [dept, setDept]         = useState('All Staffs')
  const [shift, setShift]       = useState('All')
  const [otType, setOtType]     = useState('All')
  const [statusF, setStatusF]   = useState('All')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo]     = useState(today)
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [showApprove, setShowApprove] = useState(null)
  const [bulkSel, setBulkSel]   = useState([])
  const [editSl, setEditSl]     = useState(null)
  const [msg, setMsg]           = useState('')
  const [form, setForm]         = useState({name:'',empId:'',designation:'',dept:'',shift:'Day',
    login1:'',logout1:'',login2:'',logout2:'',otStart:'',otEnd:'',
    otType:'Weekday OT',otRate:'1.5×',remarks:'',baseSalary:''})
  const fileRef = useRef(null)
  const notify  = m => { setMsg(m); setTimeout(()=>setMsg(''),4000) }
  const sf = (k,v) => setForm(p=>({...p,[k]:v}))

  const filtered = rows.filter(r => {
    if (dept!=='All Staffs'&&r.dept!==dept) return false
    if (shift!=='All'&&r.shift!==shift) return false
    if (otType!=='All'&&r.otType!==otType) return false
    if (statusF!=='All'&&r.status!==statusF) return false
    if (search&&!r.name.toLowerCase().includes(search.toLowerCase())&&
        !r.empId.includes(search)&&!r.designation.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalOTHrs = filtered.reduce((s,r)=>s+parseFloat(r.otHrs||0),0).toFixed(2)
  const totalOTPay = filtered.reduce((s,r)=>s+(r.otPay||0),0)
  const nightCount = filtered.filter(r=>r.isNight).length
  const pending    = filtered.filter(r=>r.status==='pending').length
  const approved   = filtered.filter(r=>r.status==='approved').length

  const toggleBulk = sl => setBulkSel(p=>p.includes(sl)?p.filter(x=>x!==sl):[...p,sl])
  const toggleAll  = ()  => setBulkSel(bulkSel.length===filtered.length?[]:filtered.map(r=>r.sl))

  const bulkProcess = () => {
    setRows(p=>p.map(r=>bulkSel.includes(r.sl)&&r.status==='pending'?{...r,status:'processing',processedBy:'Supervisor'}:r))
    notify(`🔄 ${bulkSel.length} OT records sent for approval`); setBulkSel([])
  const bulkApprove = () => {
    setRows(p=>p.map(r=>bulkSel.includes(r.sl)&&r.status==='processing'?{...r,status:'approved',approvedBy:'HR Manager'}:r))
    notify(`✅ ${bulkSel.length} OT records approved`); setBulkSel([])
  const doApprove = (sl,action,by,remarks='') => {
    setRows(p=>p.map(r=>r.sl===sl?{...r,status:action,approvedBy:by,remarks}:r))
    notify(action==='approved'?`✅ OT approved by ${by}`:`❌ OT rejected by ${by}`)
    setShowApprove(null)

  const calcHrs = (a,b) => {
    if (!a||!b) return 0
    const [ah,am]=a.split(':').map(Number),[bh,bm]=b.split(':').map(Number)
    return Math.max(0,((bh*60+bm)-(ah*60+am))/60)
  const handleSave = () => {
    if (!form.name||!form.empId){notify('⚠️ Name and Employee ID required');return}
    const reg = calcHrs(form.login1,form.logout1)+calcHrs(form.login2,form.logout2)
    const otH = calcHrs(form.otStart,form.otEnd)
    const base= parseFloat(form.baseSalary)||30000
    const hr  = Math.round(base/22/8)
    const mult= parseFloat(form.otRate.replace('×',''))
    const pay = Math.round(otH*hr*mult)
    const isNight = form.shift==='Night'||form.otType==='Night OT'
    const entry = {...form, sl:editSl!==null?editSl:rows.length+1,
      regularHrs:reg.toFixed(2), otHrs:otH.toFixed(2),
      hourlyRate:hr, otPay:pay, totalPay:pay, isNight,
      status: editSl!==null ? rows.find(r=>r.sl===editSl)?.status||'pending' : 'pending',
      processedBy:'—', approvedBy:'—',
    if (editSl!==null) {
      setRows(p=>p.map(r=>r.sl===editSl?entry:r))
      notify('✅ OT record updated')
    } else {
      setRows(p=>[...p,entry])
      notify('✅ OT added — status: Pending' + (isNight?' 🌙 Night OT queued for allowance':''))
    setShowAdd(false); setEditSl(null)
    setForm({name:'',empId:'',designation:'',dept:'',shift:'Day',login1:'',logout1:'',login2:'',logout2:'',otStart:'',otEnd:'',otType:'Weekday OT',otRate:'1.5×',remarks:'',baseSalary:''})

  const exportCSV = () => {
    const h=['Sl','EmpID','Name','Designation','Dept','Shift','Login1','Logout1','Login2','Logout2','Reg Hrs','OT Start','OT End','OT Hrs','OT Type','OT Rate','Hr Rate','OT Pay NPR','Status','Processed By','Approved By','Night OT','Remarks']
    const r=[h.join(',')]
    filtered.forEach(x=>r.push([x.sl,x.empId,`"${x.name}"`,`"${x.designation||''}"`,`"${x.dept}"`,x.shift,x.login1,x.logout1,x.login2,x.logout2,x.regularHrs,x.otStart,x.otEnd,x.otHrs,x.otType,x.otRate,x.hourlyRate,x.otPay,x.status,x.processedBy,x.approvedBy,x.isNight?'YES':'NO',`"${x.remarks}"`].join(',')))
    const blob=new Blob([r.join('\n')],{type:'text/csv'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`OT_Log_${dateFrom}.csv`;a.click()
    notify('📤 Exported to CSV')

  return (
    <div style={{fontFamily:'system-ui,sans-serif',height:'100vh',display:'flex',flexDirection:'column',background:'#fff7f7'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:11,color:'#065f46',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:420}}>{msg}</div>}

      {/* HEADER */}
      <div style={{background:G,padding:'14px 20px',color:'#fff',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>⚡ Overtime Log & Approval</div>
            <div style={{fontSize:10,opacity:.8,marginTop:2}}>Auto/Manual OT · 🌙 Night OT → Allowance → Payroll · Bulk Processing · Multi-Level Approval</div>
            <div style={{fontSize:9,opacity:.7,marginTop:2}}>Process: Supervisor / Manager / HOD → Approve: HOD / Payroll Officer / HR Manager</div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button onClick={()=>fileRef.current?.click()} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>
              📊 Import Excel<input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" onChange={e=>notify(`📂 ${e.target.files[0]?.name}`)} style={{display:'none'}}/>
            </button>
            <button onClick={exportCSV} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>📤 Export</button>
            <button onClick={()=>notify('⚙️ OT auto-calculated from biometric data')} style={{padding:'7px 12px',borderRadius:8,border:'none',background:'#fff',color:A,fontSize:9,fontWeight:800,cursor:'pointer'}}>⚙️ Auto Calculate</button>
            <button onClick={()=>{setEditSl(null);setShowAdd(true)}} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>+ Add OT Entry</button>
          </div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}>
          {[['👥','Staff',filtered.length],['⌛','OT Hrs',totalOTHrs+'h'],['💰','OT Pay','NPR '+totalOTPay.toLocaleString()],['🌙','Night OT',nightCount],['⏳','Pending',pending],['✅','Approved',approved]].map(([ic,lb,v])=>(
            <div key={lb} style={{background:'rgba(255,255,255,.12)',borderRadius:8,padding:'6px 12px',textAlign:'center',minWidth:75}}>
              <div style={{fontSize:15,fontWeight:900}}>{v}</div>
              <div style={{fontSize:8,opacity:.75}}>{ic} {lb}</div>
            </div>
          ))}
          {nightCount>0&&<div style={{background:'rgba(99,102,241,.35)',borderRadius:8,padding:'6px 12px',border:'1px solid rgba(165,180,252,.5)'}}>
            <div style={{fontSize:9,color:'#c7d2fe',fontWeight:700}}>🌙 {nightCount} Night OT → auto-feeds Night Duty Allowance → Payroll</div>
          </div>}
        </div>
      </div>

      {/* PERIOD + FILTERS */}
      <div style={{background:'#fff',padding:'8px 16px',flexShrink:0,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
        <div style={{display:'flex',gap:6,marginBottom:8}}>
          {PERIODS.map(p=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${period===p?A:'#e2e8f0'}`,background:period===p?A+'15':'#fff',color:period===p?A:'#64748b',fontSize:9,fontWeight:period===p?800:400,cursor:'pointer'}}>
              {p==='Daily'?'📅':p==='Weekly'?'📆':p==='Bi-Monthly'?'📊':'📁'} {p}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{flex:'1 1 110px',minWidth:100}}>
            <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>📅 From</label>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inp}/>
          </div>
          <div style={{flex:'1 1 110px',minWidth:100}}>
            <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>📅 To</label>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={inp}/>
          </div>
          <div style={{flex:'1 1 130px'}}>
            <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>🏢 Department</label>
            <select value={dept} onChange={e=>setDept(e.target.value)} style={inp}>
              {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{flex:'1 1 100px'}}>
            <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>⏱ Shift</label>
            <select value={shift} onChange={e=>setShift(e.target.value)} style={inp}>
              <option>All</option>{SHIFTS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{flex:'1 1 110px'}}>
            <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>⚡ OT Type</label>
            <select value={otType} onChange={e=>setOtType(e.target.value)} style={inp}>
              <option>All</option>{OT_TYPES.map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{flex:'1 1 100px'}}>
            <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>📌 Status</label>
            <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={inp}>
              <option>All</option>{Object.keys(OT_STATUS).map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{flex:'2 1 160px'}}>
            <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>🔍 Search Name / ID / Designation</label>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={inp}/>
          </div>
        </div>
      </div>

      {/* BULK BAR */}
      {bulkSel.length>0&&(
        <div style={{background:'#fff',padding:'6px 16px',flexShrink:0,display:'flex',gap:8,alignItems:'center',borderBottom:'2px solid #fde68a'}}>
          <span style={{fontSize:10,fontWeight:700,color:'#92400e'}}>⚡ {bulkSel.length} selected</span>
          <button onClick={bulkProcess} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#0891b2',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>🔄 Bulk Process</button>
          <button onClick={bulkApprove} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#059669',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>✅ Bulk Approve</button>
          <button onClick={()=>{setRows(p=>p.map(r=>bulkSel.includes(r.sl)?{...r,status:'rejected',remarks:'Bulk rejected'}:r));notify('❌ Bulk rejected');setBulkSel([])}} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#dc2626',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>❌ Bulk Reject</button>
          <button onClick={()=>setBulkSel([])} style={{padding:'5px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer'}}>✕</button>
        </div>
      )}

      {/* TABLE WRAPPER — scrollable X and Y with scrollbars at bottom/right */}
      <div style={{flex:1,overflow:'auto',position:'relative',
        scrollbarWidth:'thin',scrollbarColor:`${A} #e2e8f0`}}>
        <style>{`
          ::-webkit-scrollbar{width:10px;height:10px}
          ::-webkit-scrollbar-track{background:#f1f5f9;border-radius:5px}
          ::-webkit-scrollbar-thumb{background:${A};border-radius:5px}
          ::-webkit-scrollbar-thumb:hover{background:#7f1d1d}
          ::-webkit-scrollbar-corner{background:#f1f5f9}
        `}</style>

        <table style={{width:'max-content',minWidth:'100%',borderCollapse:'collapse',fontSize:9.5}}>
          <thead style={{position:'sticky',top:0,zIndex:10}}>
            {/* GROUP ROW */}
            <tr>
              <GH lbl="SEL" span={2} bg="#1e293b"/>
              <GH lbl="EMPLOYEE INFO" span={7} bg="#0c4a6e"/>
              <GH lbl="REGULAR ATTENDANCE" span={4} bg="#14532d"/>
              <GH lbl="OVERTIME DETAILS" span={5} bg="#7f1d1d"/>
              <GH lbl="OT PAY CALCULATION" span={4} bg="#78350f"/>
              <GH lbl="APPROVAL WORKFLOW" span={4} bg="#2e1065"/>
              <GH lbl="ACTION" span={1} bg="#1e293b"/>
            </tr>
            {/* COLUMN ROW */}
            <tr>
              <th style={{padding:'7px 5px',background:'#1e293b',color:'#fff',fontSize:9,width:30,position:'sticky',top:0}}>
                <input type="checkbox" checked={bulkSel.length===filtered.length&&filtered.length>0} onChange={toggleAll} style={{cursor:'pointer'}}/>
              </th>
              <CH lbl="Sl.No"        w={42}  bg="#1e293b"/>
              <CH lbl="Emp ID"       w={80}  bg="#0c4a6e"/>
              <CH lbl="Name"         w={130} bg="#0c4a6e"/>
              <CH lbl="Designation"  w={115} bg="#0c4a6e"/>
              <CH lbl="Department"   w={110} bg="#0c4a6e"/>
              <CH lbl="Shift"        w={65}  bg="#0c4a6e"/>
              <CH lbl="Night OT"     w={65}  bg="#0c4a6e"/>
              <CH lbl="Emp Status"   w={75}  bg="#0c4a6e"/>
              <CH lbl="Login 1" sub="HH:MM" w={65} bg="#14532d"/>
              <CH lbl="Logout 1" sub="HH:MM" w={65} bg="#14532d"/>
              <CH lbl="Login 2" sub="HH:MM" w={65} bg="#14532d"/>
              <CH lbl="Logout 2" sub="HH:MM" w={65} bg="#14532d"/>
              <CH lbl="OT Start" sub="HH:MM" w={65} bg="#7f1d1d"/>
              <CH lbl="OT End"   sub="HH:MM" w={65} bg="#7f1d1d"/>
              <CH lbl="OT Hrs"   sub="total" w={60} bg="#7f1d1d"/>
              <CH lbl="OT Type"  w={90} bg="#7f1d1d"/>
              <CH lbl="OT Rate"  w={55} bg="#7f1d1d"/>
              <CH lbl="Hr Rate" sub="NPR" w={70} bg="#78350f"/>
              <CH lbl="OT Pay"  sub="NPR" w={80} bg="#78350f"/>
              <CH lbl="Reg Hrs" w={65}   bg="#78350f"/>
              <CH lbl="Total Pay" sub="NPR" w={80} bg="#78350f"/>
              <CH lbl="Status"       w={90} bg="#2e1065"/>
              <CH lbl="Processed By" w={90} bg="#2e1065"/>
              <CH lbl="Approved By"  w={90} bg="#2e1065"/>
              <CH lbl="Remarks"      w={100} bg="#2e1065"/>
              <CH lbl="Action"       w={110} bg="#1e293b"/>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r,i) => {
              const sc = OT_STATUS[r.status]||OT_STATUS.pending
              const isSel = bulkSel.includes(r.sl)
              const rowBg = isSel?'#fef3c7':r.isNight?'#f5f3ff':i%2===0?'#fff':'#fafafa'
              return (
                <tr key={r.sl} style={{background:rowBg,transition:'background .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#fff7ed'}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9'}}>
                    <input type="checkbox" checked={isSel} onChange={()=>toggleBulk(r.sl)} style={{cursor:'pointer'}}/>
                  </td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontWeight:700,color:'#64748b',borderBottom:'1px solid #f1f5f9',fontSize:9}}>{r.sl}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontFamily:'monospace',fontSize:8.5,color:'#0369a1',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{r.empId}</td>
                  <td style={{padding:'5px 7px',fontWeight:700,color:'#0f172a',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap',fontSize:9}}>{r.name}</td>
                  <td style={{padding:'5px 6px',fontSize:8.5,color:'#475569',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{r.designation}</td>
                  <td style={{padding:'5px 6px',fontSize:8.5,color:'#475569',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{r.dept}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{background:r.shift==='Night'?GN:'#eff6ff',color:r.shift==='Night'?'#fff':'#1d4ed8',fontSize:7.5,fontWeight:700,padding:'2px 6px',borderRadius:20}}>{r.shift}</span>
                  </td>
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9',background:r.isNight?'#f5f3ff':'transparent'}}>
                    {r.isNight
                      ? <span style={{background:GN,color:'#fff',fontSize:7.5,fontWeight:800,padding:'2px 7px',borderRadius:20}}>🌙 YES</span>
                      : <span style={{color:'#94a3b8',fontSize:9}}>—</span>}
                  </td>
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{background:'#f1f5f9',color:'#475569',fontSize:7.5,fontWeight:600,padding:'2px 6px',borderRadius:20}}>Permanent</span>
                  </td>
                  {[r.login1,r.logout1,r.login2,r.logout2].map((v,j)=>(
                    <td key={j} style={{padding:'5px 6px',textAlign:'center',fontFamily:'monospace',fontSize:9,color:'#374151',borderBottom:'1px solid #f1f5f9'}}>{v}</td>
                  ))}
                  <td style={{padding:'5px 6px',textAlign:'center',fontFamily:'monospace',fontSize:9,fontWeight:700,color:'#b91c1c',borderBottom:'1px solid #f1f5f9',background:'#fff7f7'}}>{r.otStart}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontFamily:'monospace',fontSize:9,fontWeight:700,color:'#b91c1c',borderBottom:'1px solid #f1f5f9',background:'#fff7f7'}}>{r.otEnd}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:'#b91c1c',borderBottom:'1px solid #f1f5f9',background:'#fff7f7'}}>{r.otHrs}h</td>
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9',background:'#fff7f7'}}>
                    <span style={{background:A+'18',color:A,fontSize:7.5,fontWeight:700,padding:'2px 6px',borderRadius:20,whiteSpace:'nowrap'}}>{r.otType}</span>
                  </td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:'#d97706',borderBottom:'1px solid #f1f5f9',background:'#fff7f7'}}>{r.otRate}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,color:'#475569',borderBottom:'1px solid #f1f5f9',background:'#fffbeb'}}>{r.hourlyRate?.toLocaleString()}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:'#059669',borderBottom:'1px solid #f1f5f9',background:'#fffbeb'}}>{r.otPay?.toLocaleString()}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,color:'#475569',borderBottom:'1px solid #f1f5f9',background:'#fffbeb'}}>{r.regularHrs}h</td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:'#7c3aed',borderBottom:'1px solid #f1f5f9',background:'#fffbeb'}}>{r.totalPay?.toLocaleString()}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{background:sc.bg,color:sc.c,fontSize:8,fontWeight:700,padding:'3px 7px',borderRadius:20,border:`1px solid ${sc.b}`,whiteSpace:'nowrap'}}>{sc.icon} {sc.l}</span>
                  </td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontSize:8,color:'#475569',borderBottom:'1px solid #f1f5f9'}}>{r.processedBy}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontSize:8,color:'#475569',borderBottom:'1px solid #f1f5f9'}}>{r.approvedBy}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',fontSize:8,color:'#94a3b8',borderBottom:'1px solid #f1f5f9',maxWidth:100}}>{r.remarks}</td>
                  <td style={{padding:'5px 6px',textAlign:'center',borderBottom:'1px solid #f1f5f9'}}>
                    <div style={{display:'flex',gap:3,justifyContent:'center'}}>
                      <button onClick={()=>{setForm({name:r.name,empId:r.empId,designation:r.designation||'',dept:r.dept,shift:r.shift,login1:r.login1,logout1:r.logout1,login2:r.login2,logout2:r.logout2,otStart:r.otStart,otEnd:r.otEnd,otType:r.otType,otRate:r.otRate,remarks:r.remarks,baseSalary:String(r.baseSalary||30000)});setEditSl(r.sl);setShowAdd(true)}} style={{padding:'3px 7px',borderRadius:6,border:'none',background:'#eff6ff',color:'#1d4ed8',fontSize:7.5,fontWeight:700,cursor:'pointer'}}>✏️</button>
                      {r.status==='pending'&&<button onClick={()=>{setRows(p=>p.map(x=>x.sl===r.sl?{...x,status:'processing',processedBy:'Supervisor'}:x));notify('🔄 Sent for approval')}} style={{padding:'3px 7px',borderRadius:6,border:'none',background:'#f0f9ff',color:'#0891b2',fontSize:7.5,fontWeight:700,cursor:'pointer'}}>🔄</button>}
                      {r.status==='processing'&&<button onClick={()=>setShowApprove(r)} style={{padding:'3px 7px',borderRadius:6,border:'none',background:'#f0fdf4',color:'#059669',fontSize:7.5,fontWeight:700,cursor:'pointer'}}>✅</button>}
                      {['pending','processing'].includes(r.status)&&<button onClick={()=>{setRows(p=>p.map(x=>x.sl===r.sl?{...x,status:'rejected',remarks:'Rejected'}:x));notify('❌ Rejected')}} style={{padding:'3px 7px',borderRadius:6,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:7.5,fontWeight:700,cursor:'pointer'}}>❌</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* FOOTER */}
          <tfoot>
            <tr style={{background:'#1e293b',color:'#fff',position:'sticky',bottom:0}}>
              <td colSpan={3} style={{padding:'7px 10px',fontWeight:800,fontSize:10}}>TOTALS — {filtered.length} staff</td>
              <td colSpan={8}/>
              <td colSpan={2}/>
              <td style={{padding:'7px',textAlign:'center',fontWeight:800,color:'#fca5a5'}}>{totalOTHrs}h</td>
              <td colSpan={2}/>
              <td/>
              <td style={{padding:'7px',textAlign:'center',fontWeight:800,color:'#86efac'}}>
                NPR {filtered.reduce((s,r)=>s+(r.otPay||0),0).toLocaleString()}
              </td>
              <td/>
              <td style={{padding:'7px',textAlign:'center',fontWeight:800,color:'#c4b5fd'}}>
                NPR {filtered.reduce((s,r)=>s+(r.totalPay||0),0).toLocaleString()}
              </td>
              <td colSpan={5}/>
            </tr>
          </tfoot>
        </table>
        {filtered.length===0&&<div style={{padding:'40px',textAlign:'center',color:'#94a3b8',fontSize:12}}>No OT records found.</div>}
      </div>

      {/* LEGEND */}
      <div style={{background:'#fff',padding:'5px 16px',borderTop:'1px solid #f1f5f9',flexShrink:0,display:'flex',gap:10,fontSize:8.5,color:'#64748b',flexWrap:'wrap'}}>
        {Object.entries(OT_STATUS).map(([k,v])=>(
          <span key={k} style={{background:v.bg,color:v.c,padding:'2px 8px',borderRadius:20,border:`1px solid ${v.b}`,fontWeight:600}}>{v.icon} {v.l}</span>
        ))}
        <span style={{marginLeft:'auto',opacity:.6}}>🌙 Night OT → auto-feeds Night Duty Allowance page → Payroll processing</span>
      </div>

      {/* APPROVE MODAL */}
      {showApprove&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:12}} onClick={()=>setShowApprove(null)}>
          <div style={{background:'#fff',borderRadius:16,padding:0,width:460,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:GA,padding:'13px 20px',borderRadius:'16px 16px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>✅ Approve OT — {showApprove.name}</div>
              <div style={{fontSize:9,opacity:.8}}>{showApprove.designation} · {showApprove.dept} · {showApprove.otHrs}h · NPR {showApprove.otPay?.toLocaleString()}</div>
            </div>
            <div style={{padding:'16px 20px'}}>
              <div style={{background:'#f8fafc',borderRadius:8,padding:'10px',marginBottom:12,fontSize:9.5,lineHeight:1.9}}>
                <div>👤 <b>{showApprove.name}</b> ({showApprove.empId})</div>
                <div>🎯 <b>Designation:</b> {showApprove.designation}</div>
                <div>🏢 <b>Dept:</b> {showApprove.dept} · <b>Shift:</b> {showApprove.shift}</div>
                <div>⚡ <b>OT:</b> {showApprove.otStart}→{showApprove.otEnd} ({showApprove.otHrs}h) · {showApprove.otType} · {showApprove.otRate}</div>
                <div>💰 <b>Pay:</b> NPR {showApprove.otPay?.toLocaleString()} {showApprove.isNight&&'🌙 (Night OT — feeds Night Duty Allowance)'}</div>
              </div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:8.5,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Approved By *</label>
                <select id="approver" style={inp}>{APPROVE_ROLES.map(r=><option key={r}>{r}</option>)}</select>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:8.5,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Remarks</label>
                <textarea id="remarks" rows={2} style={{...inp,resize:'vertical',fontFamily:'inherit'}} placeholder="Approval note..."/>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{const by=document.getElementById('approver').value,rm=document.getElementById('remarks').value;doApprove(showApprove.sl,'approved',by,rm||'Approved')}} style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:GA,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>✅ Approve</button>
                <button onClick={()=>{const by=document.getElementById('approver').value,rm=document.getElementById('remarks').value||'Rejected';doApprove(showApprove.sl,'rejected',by,rm)}} style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:'#dc2626',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>❌ Reject</button>
                <button onClick={()=>setShowApprove(null)} style={{padding:'10px 14px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:12}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:16,padding:0,width:700,maxWidth:'97vw',maxHeight:'94vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'13px 20px',borderRadius:'16px 16px 0 0',color:'#fff'}}>
              <div style={{fontSize:13,fontWeight:900}}>{editSl?'✏️ Edit':'+ Add'} OT Entry</div>
              <div style={{fontSize:9,opacity:.8,marginTop:1}}>OT Pay auto-calculated · 🌙 Night shift auto-flags for Night Duty Allowance</div>
            </div>
            <div style={{padding:'16px 20px'}}>
              <div style={{fontSize:9,fontWeight:800,color:A,borderBottom:'1px solid #f1f5f9',paddingBottom:4,marginBottom:10}}>👤 Employee</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:12}}>
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
                    {SHIFTS.map(s=><option key={s}>{s}</option>)}
                  </select></div>
                <div><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>Base Salary (NPR/month)</label>
                  <input type="number" value={form.baseSalary} onChange={e=>sf('baseSalary',e.target.value)} style={inp} placeholder="e.g. 35000"/></div>
              </div>
              {(form.shift==='Night'||form.otType==='Night OT')&&<div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:8,padding:'7px 12px',marginBottom:10,fontSize:9,color:'#6d28d9',fontWeight:600}}>🌙 Night Shift/OT Detected — auto-feeds Night Duty Allowance page → Payroll on approval.</div>}
              <div style={{fontSize:9,fontWeight:800,color:'#14532d',borderBottom:'1px solid #f1f5f9',paddingBottom:4,marginBottom:8}}>🟢 Regular Attendance</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
                {[['Login 1','login1'],['Logout 1','logout1'],['Login 2','login2'],['Logout 2','logout2']].map(([l,k])=>(
                  <div key={k}><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>{l}</label>
                  <input type="time" value={form[k]} onChange={e=>sf(k,e.target.value)} style={inp}/></div>
                ))}
              </div>
              <div style={{fontSize:9,fontWeight:800,color:A,borderBottom:'1px solid #f1f5f9',paddingBottom:4,marginBottom:8}}>⚡ Overtime</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
                {[['OT Start','otStart'],['OT End','otEnd']].map(([l,k])=>(
                  <div key={k}><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>{l}</label>
                  <input type="time" value={form[k]} onChange={e=>sf(k,e.target.value)} style={inp}/></div>
                ))}
                <div><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>OT Type</label>
                  <select value={form.otType} onChange={e=>sf('otType',e.target.value)} style={inp}>
                    {OT_TYPES.map(o=><option key={o}>{o}</option>)}
                  </select></div>
                <div><label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>OT Rate</label>
                  <select value={form.otRate} onChange={e=>sf('otRate',e.target.value)} style={inp}>
                    {OT_RATES.map(r=><option key={r}>{r}</option>)}
                  </select></div>
              </div>
              {form.otStart&&form.otEnd&&form.baseSalary&&(()=>{
                const [sh,sm]=form.otStart.split(':').map(Number),[eh,em]=form.otEnd.split(':').map(Number)
                const hrs=Math.max(0,((eh*60+em)-(sh*60+sm))/60)
                const base=parseFloat(form.baseSalary)||0
                const hr=Math.round(base/22/8)
                const mult=parseFloat(form.otRate?.replace('×','')||1.5)
                return <div style={{background:'linear-gradient(135deg,#f0fdf4,#fffbeb)',border:'1px solid #bbf7d0',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:9}}>
                  <b style={{color:'#065f46'}}>💰 OT Pay Preview:</b>
                  <span style={{marginLeft:10}}>{hrs.toFixed(2)}h × NPR {hr}/hr × {mult}× = </span>
                  <b style={{color:'#059669',fontSize:11}}> NPR {Math.round(hrs*hr*mult).toLocaleString()}</b>
                </div>
              })()}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>Remarks / Reason</label>
                <textarea value={form.remarks} onChange={e=>sf('remarks',e.target.value)} rows={2} style={{...inp,resize:'vertical',fontFamily:'inherit'}} placeholder="Reason for overtime..."/>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={handleSave} style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>💾 {editSl?'Update':'Save'}</button>
                <button onClick={()=>{setShowAdd(false);setEditSl(null)}} style={{padding:'10px 14px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

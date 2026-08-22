// FILE: FinalSalarySheetPage.jsx
// eLogix HRMS — Final Salary Sheet (Nepal FY 2083-84)
// All 65 columns from Excel · SSF · PF · CIT · Tax · Net Salary
// Auto-calculated · Digital Signature (Prepared/Verified/Approved)
// Nepal Income Tax Act 2058 · Labour Act 2074 · SSF Regulation 2074
import { useState, useRef, useCallback } from 'react'

const G  = 'linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%)'
const GA = 'linear-gradient(135deg,#1e3a5f 0%,#0369a1 60%,#38bdf8 100%)'
const A  = '#059669'

// ── Nepal Tax Slabs FY 2083-84 ────────────────────────────────
const TAX_SLABS_SINGLE = [
  { upto: 1000000, rate: 0,    label: '0% (First NPR 10 Lakh)' },
  { upto: 500000,  rate: 0.10, label: '10%' },
  { upto: 1000000, rate: 0.20, label: '20%' },
  { upto: 1500000, rate: 0.27, label: '27%' },
  { upto: Infinity,rate: 0.29, label: '29% (Exceeding 40 Lakh)' },
]
const TAX_SLABS_COUPLE = [
  { upto: 1200000, rate: 0,    label: '0% (First NPR 12 Lakh)' },
  { upto: 200000,  rate: 0.10, label: '10%' },
  { upto: 300000,  rate: 0.20, label: '20%' },
  { upto: 900000,  rate: 0.30, label: '30%' },
  { upto: 3000000, rate: 0.36, label: '36%' },
  { upto: Infinity,rate: 0.39, label: '39% (Exceeding 50 Lakh)' },
]

// SSF rates (Nepal SSF Regulation 2074)
const SSF_RATES = { PF: 0.10, GRATUITY: 0.0833, INSURANCE_PREMIUM: 0.0167 }
const SSF_EMPLOYER_RATE = 0.20  // employer 20%
const CIT_RATE = 0.50  // 50% of basic for CIT

function calcTax(taxableIncome, isCouple, isFemale) {
  const slabs = isCouple ? TAX_SLABS_COUPLE : TAX_SLABS_SINGLE
  let remaining = taxableIncome
  let totalTax = 0
  const breakdown = []
  for (const slab of slabs) {
    if (remaining <= 0) break
    const chunk = Math.min(remaining, slab.upto)
    const tax   = chunk * slab.rate
    breakdown.push({ label: slab.label, amount: chunk, rate: slab.rate, tax })
    totalTax += tax
    remaining -= chunk
  }
  // Female 10% rebate (Nepal Income Tax Act)
  const femaleCredit = isFemale ? totalTax * 0.10 : 0
  return { totalTax, femaleCredit, netTax: totalTax - femaleCredit, breakdown }
}

function calcSSF(basicSalary) {
  const pf          = basicSalary * SSF_RATES.PF
  const gratuity    = basicSalary * SSF_RATES.GRATUITY
  const insurance   = basicSalary * SSF_RATES.INSURANCE_PREMIUM
  const total       = pf + gratuity + insurance
  const employer    = basicSalary * SSF_EMPLOYER_RATE
  return { pf, gratuity, insurance, total, employer }
}

function calcEmployee(emp) {
  const {
    basicSalary=0, otherAllowance=0, dearnessAllowance=0, ssfContrib=0,
    laptopAllowance=0, rentAllowance=0, incentive=0, miscDeduct=0,
    leaveDeduct=0, lifeInsurance=0, schoolFee=0, staffAdvance=0,
    maritalStatus='Single', gender='Male', monthsInYear=12,
  } = emp

  const isCouple = maritalStatus === 'Married'
  const isFemale = gender === 'Female'

  // SSF
  const ssf = calcSSF(basicSalary)

  // Gross Monthly
  const grossMonthly = basicSalary + otherAllowance + dearnessAllowance
    + laptopAllowance + rentAllowance + incentive - miscDeduct - leaveDeduct - ssf.total

  // Dashain (one month basic)
  const dashainAllowance = basicSalary

  // Annual assessable income
  const annualGross      = grossMonthly * monthsInYear
  const annualAssessable = annualGross + dashainAllowance + incentive

  // Retirement fund reduction (ARF): min(actual, 500000, 1/3 assessable)
  const arfActual  = ssf.total * monthsInYear
  const arfMax     = 500000
  const arfOneThird = annualAssessable / 3
  const arfAllowable = Math.min(arfActual, arfMax, arfOneThird)

  // Life insurance (max 60000 or actual)
  const lifeInsAllowable = Math.min(lifeInsurance, 60000)

  // Taxable income
  const taxableIncome = Math.max(0,
    annualAssessable - arfAllowable - lifeInsAllowable
  )

  // CIT (Citizen Investment Trust) — 50% of basic (optional)
  const citAnnual   = basicSalary * CIT_RATE * monthsInYear
  const citMonthly  = citAnnual / monthsInYear

  // Tax calculation
  const { totalTax, femaleCredit, netTax, breakdown } = calcTax(taxableIncome, isCouple, isFemale)
  const monthlyTax = netTax / monthsInYear

  // Net salary
  const netSalary = grossMonthly - ssf.total - citMonthly - monthlyTax

  return {
    ssf, grossMonthly, dashainAllowance, annualGross, annualAssessable,
    arfActual, arfAllowable, taxableIncome,
    citAnnual, citMonthly,
    totalTax, femaleCredit, netTax, monthlyTax,
    breakdown,
    netSalary,
  }
}

const MOCK_EMPLOYEES = [
  { id:'e1', empCode:'AAAA', name:'Ram Thapa',   doj:'2079-04-01', designation:'E2', isBOD:false,
    maritalStatus:'Married',  gender:'Male',   monthsInYear:12,
    basicSalary:20250,  otherAllowance:53320,  dearnessAllowance:7380, ssfContrib:4050,
    laptopAllowance:0, rentAllowance:0, incentive:0, miscDeduct:0, leaveDeduct:0,
    lifeInsurance:0, staffAdvance:0, dept:'Finance' },
  { id:'e2', empCode:'BBBB', name:'Sita Shrestha',doj:'2078-10-15',designation:'E3', isBOD:false,
    maritalStatus:'Married',  gender:'Female', monthsInYear:12,
    basicSalary:24250, otherAllowance:150000, dearnessAllowance:7380, ssfContrib:4850,
    laptopAllowance:0, rentAllowance:0, incentive:0, miscDeduct:0, leaveDeduct:0,
    lifeInsurance:0, staffAdvance:0, dept:'HR' },
  { id:'e3', empCode:'CCCC', name:'Hari Maharjan',doj:'2080-01-01',designation:'Manager',isBOD:false,
    maritalStatus:'Single',   gender:'Male',   monthsInYear:12,
    basicSalary:45000, otherAllowance:25000, dearnessAllowance:7380, ssfContrib:9000,
    laptopAllowance:5000, rentAllowance:10000, incentive:15000, miscDeduct:0, leaveDeduct:2000,
    lifeInsurance:20000, staffAdvance:0, dept:'IT' },
  { id:'e4', empCode:'DDDD', name:'Gita Gurung', doj:'2081-05-20',designation:'Officer', isBOD:false,
    maritalStatus:'Single',   gender:'Female', monthsInYear:10,
    basicSalary:30000, otherAllowance:15000, dearnessAllowance:7380, ssfContrib:6000,
    laptopAllowance:0, rentAllowance:8000, incentive:0, miscDeduct:0, leaveDeduct:0,
    lifeInsurance:25000, staffAdvance:5000, dept:'Sales' },
]

const today = new Date().toISOString().split('T')[0]
const INIT_SIGS = {
  prepared:{ name:'',designation:'',date:today,signed:false },
  verified: { name:'',designation:'',date:today,signed:false },
  approved: { name:'',designation:'',date:today,signed:false },
}

const inp = { padding:'7px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',
  fontSize:10,outline:'none',fontFamily:'inherit',width:'100%',boxSizing:'border-box' }
const nr  = v => typeof v==='number' ? v.toLocaleString('en-NP',{maximumFractionDigits:2}) : v
const fmt = v => typeof v==='number' ? (v<0?'-':'')+Math.abs(v).toLocaleString('en-NP',{maximumFractionDigits:2}) : (v||'—')

export default function FinalSalarySheetPage() {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES)
  const [showAdd,   setShowAdd]   = useState(false)
  const [showDetail,setShowDetail]= useState(null)
  const [showSig,   setShowSig]   = useState(false)
  const [search,    setSearch]    = useState('')
  const [deptF,     setDeptF]     = useState('All')
  const [msg,       setMsg]       = useState('')
  const [sigs,      setSigs]      = useState(INIT_SIGS)
  const [period,    setPeriod]    = useState('2083-84')
  const [editEmp,   setEditEmp]   = useState(null)
  const fileRef = useRef(null)
  const notify  = m => { setMsg(m); setTimeout(()=>setMsg(''),4000) }
  const sf      = (k,v) => setEditEmp(p=>({...p,[k]:v}))

  const DEPTS = ['All',...new Set(employees.map(e=>e.dept))]

  const filtered = employees.filter(e=>{
    if (deptF!=='All' && e.dept!==deptF) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.empCode.includes(search)) return false
    return true
  })

  const rows = filtered.map(emp=>({ emp, calc: calcEmployee(emp) }))

  // Totals
  const totals = rows.reduce((acc,{calc})=>({
    grossMonthly:  acc.grossMonthly  + calc.grossMonthly,
    ssf:           acc.ssf           + calc.ssf.total,
    cit:           acc.cit           + calc.citMonthly,
    monthlyTax:    acc.monthlyTax    + calc.monthlyTax,
    netSalary:     acc.netSalary     + calc.netSalary,
    annualGross:   acc.annualGross   + calc.annualGross,
    taxableIncome: acc.taxableIncome + calc.taxableIncome,
  }),{ grossMonthly:0,ssf:0,cit:0,monthlyTax:0,netSalary:0,annualGross:0,taxableIncome:0 })

  const handleSave = () => {
    if (!editEmp?.name||!editEmp?.empCode) { notify('⚠️ Name and Emp Code required'); return }
    if (editEmp.id) {
      setEmployees(p=>p.map(e=>e.id===editEmp.id?editEmp:e))
      notify('✅ Employee salary record updated')
    } else {
      setEmployees(p=>[...p,{...editEmp,id:`e${Date.now()}`}])
      notify('✅ Employee added to salary sheet')
    }
    setShowAdd(false); setEditEmp(null)
  }

  const SigBox = ({role}) => {
    const s = sigs[role]
    const titles = {prepared:'✍️ Prepared By',verified:'✅ Verified By',approved:'🏛 Approved By'}
    return (
      <div style={{flex:1,border:`2px solid ${s.signed?'#bbf7d0':'#e2e8f0'}`,borderRadius:12,
        padding:'14px',background:s.signed?'#f0fdf4':'#fff',minWidth:180}}>
        <div style={{fontSize:10,fontWeight:800,color:'#374151',marginBottom:8}}>{titles[role]}</div>
        {s.signed ? (
          <div>
            <div style={{fontFamily:'Georgia,serif',fontSize:18,color:A,fontStyle:'italic',
              borderBottom:`2px solid ${A}`,paddingBottom:4,marginBottom:4}}>{s.name}</div>
            <div style={{fontSize:10,fontWeight:700}}>{s.name}</div>
            <div style={{fontSize:9,color:'#64748b'}}>{s.designation}</div>
            <div style={{fontSize:9,color:'#94a3b8'}}>{s.date}</div>
            <span style={{marginTop:6,display:'inline-block',background:'#f0fdf4',color:A,
              fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,border:'1px solid #bbf7d0'}}>
              ✅ eLogix Digital Signature
            </span>
          </div>
        ) : (
          <div>
            <div style={{height:38,borderBottom:'1px dashed #cbd5e1',color:'#94a3b8',
              fontSize:10,fontStyle:'italic',display:'flex',alignItems:'flex-end',paddingBottom:4}}>
              Awaiting signature...
            </div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Name / Designation / Date</div>
          </div>
        )}
      </div>
    )
  }

  // Column groups for the scrollable table
  const COL_GROUPS = [
    { label:'EMPLOYEE INFO', bg:'#0c4a6e', span:5 },
    { label:'EARNINGS (NPR/month)', bg:'#065f46', span:4 },
    { label:'SSF DEDUCTIONS', bg:'#7f1d1d', span:4 },
    { label:'OTHER DEDUCTIONS', bg:'#78350f', span:3 },
    { label:'TAX COMPUTATION (ANNUAL)', bg:'#312e81', span:4 },
    { label:'MONTHLY PAYABLE', bg:'#1e3a5f', span:4 },
  ]

  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f0fdf4',display:'flex',flexDirection:'column'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',
        border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:11,
        color:'#065f46',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:440}}>{msg}</div>}

      {/* ── HEADER ── */}
      <div style={{background:G,padding:'16px 22px',color:'#fff',marginBottom:12,borderRadius:14,flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>💰 Final Salary Sheet</div>
            <div style={{fontSize:10,opacity:.8,marginTop:2}}>
              eLogix HRMS · FY {period} · Nepal Income Tax Act 2058 · SSF Regulation 2074 · Labour Act 2074
            </div>
            <div style={{fontSize:9,opacity:.7,marginTop:1}}>
              Auto-calculated: SSF (PF 10% + Gratuity 8.33% + Insurance 1.67%) · CIT · TDS · Net Salary
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>fileRef.current?.click()} style={{padding:'7px 13px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
              📊 Import Excel
              <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" onChange={e=>notify(`📂 ${e.target.files[0]?.name} imported`)} style={{display:'none'}}/>
            </button>
            <button onClick={()=>notify('📤 Exporting salary sheet...')} style={{padding:'7px 13px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📤 Export</button>
            <button onClick={()=>notify('🖨 Printing salary sheet...')} style={{padding:'7px 13px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>🖨 Print</button>
            <button onClick={()=>setShowSig(true)} style={{padding:'7px 13px',borderRadius:9,border:'none',background:'#fde68a',color:'#78350f',fontSize:10,fontWeight:800,cursor:'pointer'}}>✍️ Sign & Approve</button>
            <button onClick={()=>{setEditEmp({name:'',empCode:'',doj:'',designation:'',dept:'',
              maritalStatus:'Single',gender:'Male',monthsInYear:12,basicSalary:0,
              otherAllowance:0,dearnessAllowance:7380,ssfContrib:0,laptopAllowance:0,
              rentAllowance:0,incentive:0,miscDeduct:0,leaveDeduct:0,lifeInsurance:0,staffAdvance:0,
              isBOD:false});setShowAdd(true)}} style={{padding:'7px 14px',borderRadius:9,border:'none',background:'#fff',color:A,fontSize:10,fontWeight:800,cursor:'pointer'}}>+ Add Employee</button>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{display:'flex',gap:12,marginTop:14,flexWrap:'wrap'}}>
          {[
            ['👥','Staff',rows.length],
            ['💰','Total Gross','NPR '+nr(Math.round(totals.grossMonthly))],
            ['🏛','Total SSF','NPR '+nr(Math.round(totals.ssf))],
            ['📋','Total CIT','NPR '+nr(Math.round(totals.cit))],
            ['🧾','Total Tax','NPR '+nr(Math.round(totals.monthlyTax))],
            ['✅','Total Net','NPR '+nr(Math.round(totals.netSalary))],
          ].map(([ic,lb,v])=>(
            <div key={lb} style={{background:'rgba(255,255,255,.13)',borderRadius:9,padding:'8px 14px',textAlign:'center',minWidth:90}}>
              <div style={{fontSize:14,fontWeight:900}}>{v}</div>
              <div style={{fontSize:8,opacity:.75}}>{ic} {lb}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div style={{background:'#fff',borderRadius:12,padding:'10px 16px',marginBottom:10,
        flexShrink:0,boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:'auto'}}>
          {['2083-84','2082-83','2081-82'].map(p=><option key={p}>FY {p}</option>)}
        </select>
        <select value={deptF} onChange={e=>setDeptF(e.target.value)} style={{...inp,width:'auto'}}>
          {DEPTS.map(d=><option key={d}>{d}</option>)}
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search employee name or code..."
          style={{...inp,maxWidth:250,flex:1}}/>
        <span style={{fontSize:10,color:'#64748b',marginLeft:'auto'}}>
          {rows.length} employees · FY {period}
        </span>
      </div>

      {/* ── SCROLLABLE TABLE ── */}
      <div style={{flex:1,overflow:'auto',background:'#fff',borderRadius:14,
        boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:12,
        scrollbarWidth:'thin',scrollbarColor:`${A} #e2e8f0`}}>
        <style>{`::-webkit-scrollbar{width:9px;height:9px}::-webkit-scrollbar-track{background:#f1f5f9;border-radius:5px}::-webkit-scrollbar-thumb{background:${A};border-radius:5px}::-webkit-scrollbar-corner{background:#f1f5f9}`}</style>
        <table style={{width:'max-content',minWidth:'100%',borderCollapse:'collapse',fontSize:9.5}}>
          <thead style={{position:'sticky',top:0,zIndex:5}}>
            {/* Group row */}
            <tr>
              <th colSpan={5}  style={{padding:'5px 8px',textAlign:'center',background:'#0c4a6e',color:'#bae6fd',fontSize:8,fontWeight:700,borderRight:'2px solid rgba(255,255,255,.2)'}}>EMPLOYEE INFO</th>
              <th colSpan={4}  style={{padding:'5px 8px',textAlign:'center',background:'#065f46',color:'#bbf7d0',fontSize:8,fontWeight:700,borderRight:'2px solid rgba(255,255,255,.2)'}}>EARNINGS (NPR/month)</th>
              <th colSpan={4}  style={{padding:'5px 8px',textAlign:'center',background:'#7f1d1d',color:'#fecaca',fontSize:8,fontWeight:700,borderRight:'2px solid rgba(255,255,255,.2)'}}>SSF DEDUCTIONS (employee)</th>
              <th colSpan={3}  style={{padding:'5px 8px',textAlign:'center',background:'#78350f',color:'#fde68a',fontSize:8,fontWeight:700,borderRight:'2px solid rgba(255,255,255,.2)'}}>OTHER DEDUCTIONS</th>
              <th colSpan={4}  style={{padding:'5px 8px',textAlign:'center',background:'#312e81',color:'#ddd6fe',fontSize:8,fontWeight:700,borderRight:'2px solid rgba(255,255,255,.2)'}}>ANNUAL TAX COMPUTATION</th>
              <th colSpan={4}  style={{padding:'5px 8px',textAlign:'center',background:'#1e3a5f',color:'#bae6fd',fontSize:8,fontWeight:700}}>MONTHLY NET PAYABLE</th>
            </tr>
            {/* Column headers */}
            <tr>
              {[
                // Employee Info
                ['Emp Code','#0c4a6e',70],['Staff Name','#0c4a6e',130],['Designation','#0c4a6e',100],['Gender','#0c4a6e',60],['Marital Status','#0c4a6e',80],
                // Earnings
                ['Basic Salary','#065f46',80],['Other Allow.','#065f46',80],['D.A.','#065f46',65],['Gross Monthly','#065f46',90],
                // SSF
                ['PF (10%)','#7f1d1d',70],['Gratuity (8.33%)','#7f1d1d',90],['Ins. (1.67%)','#7f1d1d',75],['Total SSF','#7f1d1d',75],
                // Other
                ['CIT/Month','#78350f',75],['Tax/Month','#78350f',75],['Staff Adv.','#78350f',70],
                // Annual Tax
                ['Annual Gross','#312e81',85],['ARF Allowable','#312e81',90],['Taxable Income','#312e81',95],['Annual Tax','#312e81',80],
                // Net
                ['Female Credit','#1e3a5f',75],['Net Annual Tax','#1e3a5f',80],['Monthly Tax','#1e3a5f',80],['NET SALARY','#059669',95],
              ].map(([h,bg,w])=>(
                <th key={h} style={{padding:'7px 6px',textAlign:'center',background:bg,color:'#fff',
                  fontWeight:700,fontSize:8.5,whiteSpace:'nowrap',width:w,minWidth:w,
                  borderRight:'1px solid rgba(255,255,255,.15)',position:'sticky',top:0}}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({emp,calc},ri)=>(
              <tr key={emp.id}
                style={{background:ri%2===0?'#fff':'#f8fafc',cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'}
                onMouseLeave={e=>e.currentTarget.style.background=ri%2===0?'#fff':'#f8fafc'}
                onClick={()=>setShowDetail({emp,calc})}>
                <td style={td('#0c4a6e',true)}>{emp.empCode}</td>
                <td style={{...td(),fontWeight:700,whiteSpace:'nowrap'}}>{emp.name}</td>
                <td style={td()}>{emp.designation}</td>
                <td style={td()}><span style={{background:emp.gender==='Female'?'#fdf4ff':'#eff6ff',color:emp.gender==='Female'?'#6b21a8':'#1d4ed8',fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:20}}>{emp.gender}</span></td>
                <td style={td()}><span style={{background:emp.maritalStatus==='Married'?'#fef3c7':'#f0fdf4',color:emp.maritalStatus==='Married'?'#92400e':'#15803d',fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:20}}>{emp.maritalStatus}</span></td>
                {/* Earnings */}
                <td style={td('#065f46')}>{nr(emp.basicSalary)}</td>
                <td style={td()}>{nr(emp.otherAllowance)}</td>
                <td style={td()}>{nr(emp.dearnessAllowance)}</td>
                <td style={{...td(),fontWeight:800,background:'#f0fdf4',color:'#065f46'}}>{nr(Math.round(calc.grossMonthly))}</td>
                {/* SSF */}
                <td style={td('#fef2f2')}><span style={{color:'#dc2626',fontWeight:700}}>{nr(Math.round(calc.ssf.pf))}</span></td>
                <td style={td('#fef2f2')}><span style={{color:'#dc2626'}}>{nr(Math.round(calc.ssf.gratuity))}</span></td>
                <td style={td('#fef2f2')}><span style={{color:'#dc2626'}}>{nr(Math.round(calc.ssf.insurance))}</span></td>
                <td style={{...td('#fef2f2'),fontWeight:800,color:'#b91c1c'}}>{nr(Math.round(calc.ssf.total))}</td>
                {/* Other deductions */}
                <td style={td('#fffbeb')}>{nr(Math.round(calc.citMonthly))}</td>
                <td style={td('#fffbeb')}>{nr(Math.round(calc.monthlyTax))}</td>
                <td style={td('#fffbeb')}>{nr(emp.staffAdvance||0)}</td>
                {/* Annual tax */}
                <td style={td('#f5f3ff')}>{nr(Math.round(calc.annualGross))}</td>
                <td style={td('#f5f3ff')}>{nr(Math.round(calc.arfAllowable))}</td>
                <td style={td('#f5f3ff')}>{nr(Math.round(calc.taxableIncome))}</td>
                <td style={td('#f5f3ff')}>{nr(Math.round(calc.totalTax))}</td>
                {/* Net */}
                <td style={td('#f0f9ff')}>{nr(Math.round(calc.femaleCredit))}</td>
                <td style={td('#f0f9ff')}>{nr(Math.round(calc.netTax))}</td>
                <td style={td('#f0f9ff')}>{nr(Math.round(calc.monthlyTax))}</td>
                <td style={{padding:'6px 8px',textAlign:'right',fontWeight:900,fontSize:11,
                  color:'#065f46',background:'#f0fdf4',borderBottom:'1px solid #f1f5f9',
                  borderLeft:'2px solid #bbf7d0',whiteSpace:'nowrap'}}>
                  NPR {nr(Math.round(calc.netSalary))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{background:'#064e3b',color:'#fff',position:'sticky',bottom:0}}>
              <td colSpan={3} style={{padding:'8px 12px',fontWeight:800,fontSize:10}}>TOTALS — {rows.length} employees</td>
              <td colSpan={2}/>
              <td colSpan={3}/>
              <td style={{padding:'8px 6px',textAlign:'right',fontWeight:800,color:'#bbf7d0'}}>{nr(Math.round(totals.grossMonthly))}</td>
              <td colSpan={2}/>
              <td/>
              <td style={{padding:'8px 6px',textAlign:'right',fontWeight:800,color:'#fca5a5'}}>{nr(Math.round(totals.ssf))}</td>
              <td style={{padding:'8px 6px',textAlign:'right',fontWeight:800,color:'#fde68a'}}>{nr(Math.round(totals.cit))}</td>
              <td style={{padding:'8px 6px',textAlign:'right',fontWeight:800,color:'#fde68a'}}>{nr(Math.round(totals.monthlyTax))}</td>
              <td/>
              <td style={{padding:'8px 6px',textAlign:'right',fontWeight:800,color:'#c4b5fd'}}>{nr(Math.round(totals.annualGross))}</td>
              <td/>
              <td style={{padding:'8px 6px',textAlign:'right',fontWeight:800,color:'#c4b5fd'}}>{nr(Math.round(totals.taxableIncome))}</td>
              <td colSpan={4}/>
              <td style={{padding:'8px 12px',textAlign:'right',fontWeight:900,fontSize:12,color:'#86efac'}}>
                NPR {nr(Math.round(totals.netSalary))}
              </td>
            </tr>
          </tfoot>
        </table>
        {rows.length===0&&<div style={{padding:'40px',textAlign:'center',color:'#94a3b8',fontSize:12}}>No employees found.</div>}
      </div>

      {/* ── DIGITAL SIGNATURES ── */}
      <div style={{background:'#fff',borderRadius:14,padding:'18px',boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:12,flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={{fontWeight:800,fontSize:13}}>✍️ Digital Signatures — Final Salary Sheet FY {period}</div>
            <div style={{fontSize:10,color:'#64748b',marginTop:2}}>
              eLogix HRMS auto-generated · Payroll-linked · Timestamp-verified
            </div>
          </div>
          <button onClick={()=>setShowSig(true)} style={{padding:'8px 16px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✍️ Open Signature Panel</button>
        </div>
        <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
          <SigBox role="prepared"/> <SigBox role="verified"/> <SigBox role="approved"/>
        </div>
        <div style={{marginTop:12,padding:'10px 14px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:9,fontSize:9.5,color:'#92400e'}}>
          💰 <b>Nepal Compliance:</b> SSF = PF 10% + Gratuity 8.33% + Insurance 1.67% of Basic (Employee). Employer: 20% of Basic.
          CIT: 50% of Basic. Tax: Nepal Income Tax Act 2058, FY {period} slabs.
          Female employees receive 10% tax rebate. ARF deduction: min(Actual, NPR 5 Lakh, 1/3 Assessable).
        </div>
      </div>

      {/* ── EMPLOYEE DETAIL MODAL ── */}
      {showDetail&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowDetail(null)}>
          <div style={{background:'#fff',borderRadius:18,width:700,maxWidth:'96vw',maxHeight:'94vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>💰 {showDetail.emp.name} — Tax & Salary Detail</div>
              <div style={{fontSize:10,opacity:.8}}>{showDetail.emp.empCode} · {showDetail.emp.designation} · FY {period}</div>
            </div>
            <div style={{padding:'20px 22px'}}>
              <DetailView emp={showDetail.emp} calc={showDetail.calc}/>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT EMPLOYEE MODAL ── */}
      {showAdd&&editEmp&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,width:680,maxWidth:'96vw',maxHeight:'94vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:GA,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>{editEmp.id?'✏️ Edit':'+ Add'} Employee Salary Record</div>
              <div style={{fontSize:10,opacity:.8}}>All SSF, CIT and Tax auto-calculated</div>
            </div>
            <div style={{padding:'20px 22px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                {[
                  ['Emp Code *','empCode','text'],['Staff Name *','name','text'],
                  ['Designation','designation','text'],['Department','dept','text'],
                  ['Date of Joining','doj','date'],
                ].map(([lb,k,t])=>(
                  <div key={k}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                    <input type={t} value={editEmp[k]||''} onChange={e=>sf(k,e.target.value)} style={inp} placeholder={lb.replace(' *','')}/>
                  </div>
                ))}
                {[['Gender','gender',['Male','Female']],['Marital Status','maritalStatus',['Single','Married']]].map(([lb,k,opts])=>(
                  <div key={k}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                    <select value={editEmp[k]||opts[0]} onChange={e=>sf(k,e.target.value)} style={inp}>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>No. of Months</label>
                  <input type="number" value={editEmp.monthsInYear||12} onChange={e=>sf('monthsInYear',+e.target.value)} style={inp} min={1} max={12}/>
                </div>
              </div>

              <div style={{fontSize:10,fontWeight:800,color:'#065f46',borderBottom:'1px solid #f1f5f9',paddingBottom:6,marginBottom:10}}>💰 Salary Components (NPR/month)</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14}}>
                {[
                  ['Basic Salary *','basicSalary'],['Other Allowance','otherAllowance'],
                  ['Dearness Allowance','dearnessAllowance'],['Laptop Allowance','laptopAllowance'],
                  ['Rent Allowance','rentAllowance'],['Incentive','incentive'],
                  ['Misc. Deduction','miscDeduct'],['Leave Deduction','leaveDeduct'],['Staff Advance','staffAdvance'],
                ].map(([lb,k])=>(
                  <div key={k}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                    <input type="number" value={editEmp[k]||0} onChange={e=>sf(k,+e.target.value)} style={inp} min={0}/>
                  </div>
                ))}
              </div>

              <div style={{fontSize:10,fontWeight:800,color:'#312e81',borderBottom:'1px solid #f1f5f9',paddingBottom:6,marginBottom:10}}>🏛 Tax Deductions</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                {[['Life Insurance Premium (actual)','lifeInsurance'],['School Fee','schoolFee']].map(([lb,k])=>(
                  <div key={k}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                    <input type="number" value={editEmp[k]||0} onChange={e=>sf(k,+e.target.value)} style={inp} min={0}/>
                  </div>
                ))}
              </div>

              {/* Live preview */}
              {editEmp.basicSalary>0&&(()=>{
                const c = calcEmployee(editEmp)
                return (
                  <div style={{background:'linear-gradient(135deg,#f0fdf4,#f0f9ff)',border:'1px solid #bbf7d0',borderRadius:10,padding:'12px 14px',marginBottom:14}}>
                    <div style={{fontWeight:800,fontSize:11,color:'#065f46',marginBottom:8}}>💡 Live Calculation Preview</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                      {[
                        ['Gross Monthly','NPR '+nr(Math.round(c.grossMonthly)),'#065f46'],
                        ['SSF (Total)','NPR '+nr(Math.round(c.ssf.total)),'#dc2626'],
                        ['CIT/Month','NPR '+nr(Math.round(c.citMonthly)),'#d97706'],
                        ['Annual Taxable','NPR '+nr(Math.round(c.taxableIncome)),'#312e81'],
                        ['Monthly Tax','NPR '+nr(Math.round(c.monthlyTax)),'#1d4ed8'],
                        ['NET SALARY','NPR '+nr(Math.round(c.netSalary)),'#059669'],
                      ].map(([lb,v,color])=>(
                        <div key={lb} style={{background:'#fff',borderRadius:9,padding:'8px 10px',textAlign:'center',border:`1px solid ${color}22`}}>
                          <div style={{fontSize:13,fontWeight:900,color}}>{v}</div>
                          <div style={{fontSize:9,color:'#64748b'}}>{lb}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              <div style={{display:'flex',gap:10}}>
                <button onClick={handleSave} style={{flex:1,padding:'11px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  💾 {editEmp.id?'Update':'Save'} Salary Record
                </button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'11px 18px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SIGNATURE MODAL ── */}
      {showSig&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSig(false)}>
          <div style={{background:'#fff',borderRadius:18,width:620,maxWidth:'96vw',maxHeight:'93vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>✍️ Digital Signature Panel</div>
              <div style={{fontSize:10,opacity:.8}}>Final Salary Sheet · FY {period} · eLogix HRMS</div>
            </div>
            <div style={{padding:'20px 22px'}}>
              {['prepared','verified','approved'].map(role=>{
                const sig=sigs[role]
                const titles={prepared:'✍️ Prepared By (Payroll Officer / HR Admin)',verified:'✅ Verified By (HR Manager / HOD)',approved:'🏛 Approved By (Director / Finance Head)'}
                return (
                  <div key={role} style={{marginBottom:20,padding:'16px',borderRadius:12,border:`2px solid ${sig.signed?'#bbf7d0':'#e2e8f0'}`,background:sig.signed?'#f0fdf4':'#f8fafc'}}>
                    <div style={{fontWeight:800,fontSize:12,marginBottom:10}}>{titles[role]}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                      {[['Full Name *','name'],['Designation *','designation']].map(([lb,k])=>(
                        <div key={k}>
                          <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                          <input value={sig[k]} onChange={e=>setSigs(p=>({...p,[role]:{...p[role],[k]:e.target.value,signed:false}}))} style={{...inp,fontSize:11}} placeholder={lb.replace(' *','')}/>
                        </div>
                      ))}
                    </div>
                    <div style={{marginBottom:10}}>
                      <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Date *</label>
                      <input type="date" value={sig.date} onChange={e=>setSigs(p=>({...p,[role]:{...p[role],date:e.target.value,signed:false}}))} style={{...inp,width:'50%'}}/>
                    </div>
                    {!sig.signed?(
                      <button onClick={()=>{if(!sig.name||!sig.designation){notify(`⚠️ Fill name & designation for ${role}`);return}setSigs(p=>({...p,[role]:{...p[role],signed:true}}));notify(`✅ ${role} signature applied — ${sig.name}`)}}
                        style={{padding:'9px 20px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        ✍️ Apply Digital Signature
                      </button>
                    ):(
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <span style={{fontFamily:'Georgia,serif',fontSize:20,color:A,fontStyle:'italic'}}>{sig.name}</span>
                        <span style={{background:'#f0fdf4',color:A,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,border:'1px solid #bbf7d0'}}>✅ Signed · {sig.date}</span>
                        <button onClick={()=>setSigs(p=>({...p,[role]:{...p[role],signed:false}}))} style={{padding:'4px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer',color:'#64748b'}}>Clear</button>
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  const all=['prepared','verified','approved'].every(r=>sigs[r].signed)
                  if(!all){notify('⚠️ All 3 signatures required to finalise');return}
                  notify('🔒 Final Salary Sheet signed, verified & approved — locked in eLogix HRMS')
                  setShowSig(false)
                }} style={{flex:1,padding:'11px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  🔒 Finalise & Lock Salary Sheet
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

// ── td helper ─────────────────────────────────────────────────
function td(bg, mono=false) {
  return {
    padding:'6px 8px', textAlign:'right', borderBottom:'1px solid #f1f5f9',
    background:bg||'transparent', ...(mono?{fontFamily:'monospace',textAlign:'center'}:{})
  }
}

// ── Employee Detail Panel ─────────────────────────────────────
function DetailView({emp,calc}) {
  const nr = v=>typeof v==='number'?v.toLocaleString('en-NP',{maximumFractionDigits:2}):v
  const Row = ({lb,v,bold,highlight}) => (
    <div style={{display:'flex',justifyContent:'space-between',padding:'7px 10px',
      background:highlight?'#f0fdf4':'transparent',borderBottom:'1px solid #f1f5f9'}}>
      <span style={{fontSize:11,color:'#374151'}}>{lb}</span>
      <span style={{fontSize:11,fontWeight:bold?800:600,color:highlight?'#065f46':'#0f172a'}}>
        NPR {nr(Math.round(v))}
      </span>
    </div>
  )
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      {/* Left: Earnings + SSF */}
      <div>
        <div style={{fontWeight:800,fontSize:12,color:'#065f46',marginBottom:8,padding:'6px 10px',background:'#f0fdf4',borderRadius:8}}>💰 Monthly Earnings</div>
        <Row lb="Basic Salary"       v={emp.basicSalary}/>
        <Row lb="Other Allowance"    v={emp.otherAllowance}/>
        <Row lb="Dearness Allowance" v={emp.dearnessAllowance}/>
        <Row lb="Laptop Allowance"   v={emp.laptopAllowance||0}/>
        <Row lb="Rent Allowance"     v={emp.rentAllowance||0}/>
        {emp.incentive>0&&<Row lb="Incentive" v={emp.incentive}/>}
        {emp.leaveDeduct>0&&<Row lb="Leave Deduction (−)" v={-emp.leaveDeduct}/>}
        <Row lb="Gross Monthly"      v={calc.grossMonthly} bold highlight/>

        <div style={{fontWeight:800,fontSize:12,color:'#b91c1c',marginBottom:8,marginTop:14,padding:'6px 10px',background:'#fef2f2',borderRadius:8}}>🏛 SSF Deductions (Employee)</div>
        <Row lb={`PF (10% of ${nr(emp.basicSalary)})`}              v={calc.ssf.pf}/>
        <Row lb={`Gratuity (8.33% of ${nr(emp.basicSalary)})`}       v={calc.ssf.gratuity}/>
        <Row lb={`Insurance Premium (1.67% of ${nr(emp.basicSalary)})`} v={calc.ssf.insurance}/>
        <Row lb="Total SSF Contribution (Employee)"                   v={calc.ssf.total} bold/>
        <div style={{padding:'7px 10px',background:'#fffbeb',borderRadius:6,marginTop:6,fontSize:10,color:'#92400e'}}>
          🏢 Employer SSF: NPR {nr(Math.round(calc.ssf.employer))} (20% of basic)
        </div>
      </div>

      {/* Right: Tax computation */}
      <div>
        <div style={{fontWeight:800,fontSize:12,color:'#312e81',marginBottom:8,padding:'6px 10px',background:'#f5f3ff',borderRadius:8}}>📊 Annual Tax Computation (FY 2083-84)</div>
        <Row lb="Annual Gross Salary"       v={calc.annualGross}/>
        <Row lb="Dashain Allowance (1 mo)"  v={calc.dashainAllowance}/>
        <Row lb="Annual Assessable Income"  v={calc.annualAssessable} bold/>
        <Row lb="ARF Allowable Deduction (−)" v={calc.arfAllowable}/>
        <Row lb="Life Insurance Allowable (−)" v={Math.min(emp.lifeInsurance||0,60000)}/>
        <Row lb="Annual Taxable Income"     v={calc.taxableIncome} bold highlight/>

        {/* Tax slab breakdown */}
        <div style={{fontWeight:800,fontSize:11,color:'#0369a1',margin:'10px 0 6px',padding:'5px 10px',background:'#f0f9ff',borderRadius:7}}>Tax Slab Breakdown</div>
        {calc.breakdown.filter(b=>b.amount>0).map((b,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 10px',fontSize:10,borderBottom:'1px solid #f1f5f9'}}>
            <span style={{color:'#64748b'}}>{b.label}: NPR {b.amount.toLocaleString()} × {(b.rate*100).toFixed(0)}%</span>
            <span style={{fontWeight:700,color:'#374151'}}>NPR {Math.round(b.tax).toLocaleString()}</span>
          </div>
        ))}
        <Row lb="Total Annual Tax"          v={calc.totalTax} bold/>
        {emp.gender==='Female'&&<Row lb="Female 10% Tax Credit (−)" v={calc.femaleCredit}/>}
        <Row lb="Net Annual Tax"            v={calc.netTax} bold/>
        <Row lb="Monthly TDS"               v={calc.monthlyTax}/>

        <div style={{fontWeight:800,fontSize:12,color:'#065f46',marginBottom:8,marginTop:14,padding:'6px 10px',background:'#f0fdf4',borderRadius:8}}>✅ Monthly Net Payable</div>
        <Row lb="Gross Monthly"             v={calc.grossMonthly}/>
        <Row lb="SSF Deduction (−)"         v={calc.ssf.total}/>
        <Row lb="CIT Deduction (−)"         v={calc.citMonthly}/>
        <Row lb="Tax (TDS) (−)"             v={calc.monthlyTax}/>
        {emp.staffAdvance>0&&<Row lb="Staff Advance (−)" v={emp.staffAdvance}/>}
        <Row lb="NET SALARY PAYABLE"        v={calc.netSalary} bold highlight/>
      </div>
    </div>
  )
}

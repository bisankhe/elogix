// FILE: TaxCalculatorPage.jsx
// eLogix HRMS — Tax Calculator (SSF · PF · CIT · Income Tax)
// FY 2083-84 Nepal slabs · Interactive individual calculator
// eLogix Technologies · www.elogix.com.np
import { useState, useMemo } from 'react'

const G = 'linear-gradient(135deg,#312e81 0%,#4338ca 55%,#818cf8 100%)'
const A = '#4338ca'

// ── FY 2083-84 Tax Slabs ─────────────────────────────────────
const SLABS = {
  single: [
    { upto:1000000, rate:0,    label:'First NPR 10 Lakh',  color:'#059669', bg:'#f0fdf4' },
    { upto:500000,  rate:0.10, label:'Next NPR 5 Lakh',    color:'#0369a1', bg:'#eff6ff' },
    { upto:1000000, rate:0.20, label:'Next NPR 10 Lakh',   color:'#7c3aed', bg:'#f5f3ff' },
    { upto:1500000, rate:0.27, label:'Next NPR 15 Lakh',   color:'#d97706', bg:'#fffbeb' },
    { upto:Infinity,rate:0.29, label:'Exceeding NPR 40 Lakh',color:'#dc2626',bg:'#fef2f2'},
  ],
  couple:[
    { upto:1200000, rate:0,    label:'First NPR 12 Lakh',  color:'#059669', bg:'#f0fdf4' },
    { upto:200000,  rate:0.10, label:'Next NPR 2 Lakh',    color:'#0369a1', bg:'#eff6ff' },
    { upto:300000,  rate:0.20, label:'Next NPR 3 Lakh',    color:'#7c3aed', bg:'#f5f3ff' },
    { upto:900000,  rate:0.30, label:'Next NPR 9 Lakh',    color:'#d97706', bg:'#fffbeb' },
    { upto:3000000, rate:0.36, label:'Next NPR 30 Lakh',   color:'#dc2626', bg:'#fef2f2' },
    { upto:Infinity,rate:0.39, label:'Exceeding NPR 50 Lakh',color:'#7f1d1d',bg:'#fef2f2'},
  ],
}

// FY 2082-83 (previous year for comparison)
const SLABS_PREV = {
  single:[
    {upto:500000, rate:0,   label:'0%'},{upto:200000,rate:0.10,label:'10%'},
    {upto:300000, rate:0.20,label:'20%'},{upto:1000000,rate:0.30,label:'30%'},
    {upto:3000000,rate:0.36,label:'36%'},{upto:Infinity,rate:0.39,label:'39%'},
  ],
}

function calcTaxFull({
  basicSalary,otherAllowance,dearnessAllowance,laptopAllowance,rentAllowance,
  incentive,monthsInYear,maritalStatus,gender,
  pfActual,gratuityActual,insuranceActual,
  lifeInsurance,schoolFee,dashainInclude,
}) {
  const isCouple = maritalStatus==='Married'
  const isFemale = gender==='Female'
  const slabs    = isCouple ? SLABS.couple : SLABS.single

  // SSF (employee)
  const pfRate        = pfActual || (basicSalary * 0.10)
  const gratuityRate  = gratuityActual || (basicSalary * 0.0833)
  const insuranceRate = insuranceActual || (basicSalary * 0.0167)
  const ssfTotal      = pfRate + gratuityRate + insuranceRate
  const ssfEmployer   = basicSalary * 0.20

  // Monthly salary
  const monthlyGross = basicSalary + otherAllowance + dearnessAllowance
    + laptopAllowance + rentAllowance + incentive - ssfTotal

  // Annual
  const annualGross  = monthlyGross * monthsInYear
  const dashainAmt   = dashainInclude ? basicSalary : 0
  const annualAssessable = annualGross + dashainAmt + (incentive * monthsInYear)

  // ARF deduction
  const arfActual    = ssfTotal * monthsInYear
  const arfMax       = 500000
  const arfOneThird  = annualAssessable / 3
  const arfAllowable = Math.min(arfActual, arfMax, arfOneThird)

  // Insurance
  const insAllowable = Math.min(lifeInsurance||0, 60000)

  // School fee
  const schoolAllowable = Math.min(schoolFee||0, 25000)

  // Taxable
  const taxableIncome = Math.max(0, annualAssessable - arfAllowable - insAllowable - schoolAllowable)

  // Slab breakdown
  let remaining = taxableIncome, totalTax = 0
  const breakdown = []
  for (const slab of slabs) {
    if (remaining <= 0) break
    const chunk = Math.min(remaining, slab.upto === Infinity ? remaining : slab.upto)
    const tax   = chunk * slab.rate
    breakdown.push({ ...slab, amount:chunk, tax, pct: taxableIncome>0 ? chunk/taxableIncome*100 : 0 })
    totalTax += tax
    remaining -= chunk
  }

  const femaleCredit   = isFemale ? totalTax * 0.10 : 0
  const netTax         = totalTax - femaleCredit
  const monthlyTax     = netTax / monthsInYear

  // CIT
  const citMonthly     = basicSalary * 0.50

  // Previous year comparison
  let prevTax = 0, prevRemaining = taxableIncome
  for (const slab of SLABS_PREV.single) {
    if (prevRemaining <= 0) break
    const chunk = Math.min(prevRemaining, slab.upto === Infinity ? prevRemaining : slab.upto)
    prevTax += chunk * slab.rate
    prevRemaining -= chunk
  }

  return {
    ssfTotal, ssfEmployer, pfRate, gratuityRate, insuranceRate,
    monthlyGross, annualGross, dashainAmt, annualAssessable,
    arfActual, arfAllowable, insAllowable, schoolAllowable, taxableIncome,
    breakdown, totalTax, femaleCredit, netTax, monthlyTax,
    citMonthly, prevTax,
    netSalary: monthlyGross - ssfTotal - citMonthly - monthlyTax,
    effectiveRate: taxableIncome > 0 ? (netTax / taxableIncome * 100) : 0,
  }
}

const inp = {padding:'8px 11px',borderRadius:8,border:'1.5px solid #e2e8f0',
  fontSize:11,outline:'none',fontFamily:'inherit',width:'100%',boxSizing:'border-box'}
const nr  = v => typeof v==='number'&&!isNaN(v) ? Math.round(v).toLocaleString('en-NP') : '0'

export default function TaxCalculatorPage() {
  const [form, setForm] = useState({
    name:'',empCode:'',gender:'Female',maritalStatus:'Married',
    designation:'',department:'',monthsInYear:12,dashainInclude:true,
    basicSalary:24250,otherAllowance:150000,dearnessAllowance:7380,
    laptopAllowance:0,rentAllowance:0,incentive:0,
    pfActual:0,gratuityActual:0,insuranceActual:0,
    lifeInsurance:0,schoolFee:0,
  })
  const [tab, setTab] = useState('calculator')
  const [msg, setMsg] = useState('')
  const notify = m=>{setMsg(m);setTimeout(()=>setMsg(''),3500)}
  const sf = (k,v)=>setForm(p=>({...p,[k]:v}))

  const calc = useMemo(()=>calcTaxFull(form),[form])

  const InfoRow = ({lb,v,sub,bold,highlight,color})=>(
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
      padding:'8px 12px',background:highlight?'#f5f3ff':'transparent',
      borderBottom:'1px solid #f1f5f9',borderRadius:highlight?6:0}}>
      <div>
        <div style={{fontSize:11,color:'#374151',fontWeight:bold?700:400}}>{lb}</div>
        {sub&&<div style={{fontSize:9,color:'#94a3b8'}}>{sub}</div>}
      </div>
      <div style={{fontSize:bold?13:11,fontWeight:bold?800:600,color:color||'#0f172a',whiteSpace:'nowrap'}}>
        NPR {nr(v)}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f5f3ff'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f5f3ff',
        border:'1px solid #ddd6fe',borderRadius:10,padding:'10px 18px',fontSize:11,
        color:'#4c1d95',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:440}}>{msg}</div>}

      {/* HEADER */}
      <div style={{background:G,padding:'16px 22px',color:'#fff',marginBottom:16,borderRadius:14}}>
        <div style={{fontSize:18,fontWeight:900}}>🧮 Nepal Tax Calculator</div>
        <div style={{fontSize:10,opacity:.8,marginTop:2}}>
          FY 2083-84 · SSF · PF · Gratuity · CIT · Income Tax · Female Credit · ARF Deduction
        </div>
        <div style={{fontSize:9,opacity:.7,marginTop:1}}>
          Nepal Income Tax Act 2058 · SSF Regulation 2074 · Labour Act 2074 · IRD Nepal
        </div>
        {/* Slab summary pills */}
        <div style={{display:'flex',gap:6,marginTop:12,flexWrap:'wrap'}}>
          {(form.maritalStatus==='Married'?SLABS.couple:SLABS.single).map((s,i)=>(
            <span key={i} style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.3)',
              color:'#fff',fontSize:8.5,fontWeight:700,padding:'3px 9px',borderRadius:20}}>
              {s.label}: {(s.rate*100).toFixed(0)}%
            </span>
          ))}
          {form.gender==='Female'&&<span style={{background:'#fde68a',color:'#92400e',fontSize:8.5,fontWeight:800,padding:'3px 9px',borderRadius:20}}>Female 10% Rebate ✓</span>}
        </div>
      </div>

      {/* TABS */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[['calculator','🧮 Calculator'],['slabs','📊 Tax Slabs FY 2083-84'],['ssf','🏛 SSF Guide'],['changes','📋 YoY Changes']].map(([id,lb])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:'8px 16px',borderRadius:20,border:`1.5px solid ${tab===id?A:'#e2e8f0'}`,
              background:tab===id?A+'15':'#fff',color:tab===id?A:'#64748b',
              fontSize:11,fontWeight:tab===id?800:400,cursor:'pointer'}}>
            {lb}
          </button>
        ))}
      </div>

      {/* ── CALCULATOR TAB ── */}
      {tab==='calculator'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr',gap:16}}>
          {/* Input panel */}
          <div style={{background:'#fff',borderRadius:14,padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:16,color:'#312e81'}}>📝 Employee Details</div>

            {/* Personal */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[['Name','name','text'],['Emp Code','empCode','text'],['Designation','designation','text'],['Department','department','text']].map(([lb,k,t])=>(
                <div key={k}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                  <input type={t} value={form[k]} onChange={e=>sf(k,e.target.value)} style={inp} placeholder={lb}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Gender</label>
                <select value={form.gender} onChange={e=>sf('gender',e.target.value)} style={inp}>
                  <option>Male</option><option>Female</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Marital Status</label>
                <select value={form.maritalStatus} onChange={e=>sf('maritalStatus',e.target.value)} style={inp}>
                  <option>Single</option><option>Married</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Months in Fiscal Year</label>
                <input type="number" value={form.monthsInYear} onChange={e=>sf('monthsInYear',+e.target.value)} style={inp} min={1} max={12}/>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,paddingTop:18}}>
                <input type="checkbox" checked={form.dashainInclude} onChange={e=>sf('dashainInclude',e.target.checked)} style={{width:14,height:14,cursor:'pointer'}}/>
                <label style={{fontSize:10,fontWeight:600,color:'#374151',cursor:'pointer'}}>Include Dashain Allowance</label>
              </div>
            </div>

            {/* Salary */}
            <div style={{fontWeight:800,fontSize:12,color:'#065f46',marginBottom:8,paddingBottom:5,borderBottom:'1px solid #f1f5f9'}}>💰 Monthly Salary Components</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[
                ['Basic Salary (NPR)','basicSalary'],
                ['Other Allowances','otherAllowance'],
                ['Dearness Allowance','dearnessAllowance'],
                ['Laptop Allowance','laptopAllowance'],
                ['Rent Allowance','rentAllowance'],
                ['Incentive','incentive'],
              ].map(([lb,k])=>(
                <div key={k}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                  <input type="number" value={form[k]} onChange={e=>sf(k,+e.target.value)} style={inp} min={0}/>
                </div>
              ))}
            </div>

            {/* Tax deductions */}
            <div style={{fontWeight:800,fontSize:12,color:'#312e81',marginBottom:8,paddingBottom:5,borderBottom:'1px solid #f1f5f9'}}>🏛 Tax Deductions (Optional)</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[
                ['Life Insurance (actual)','lifeInsurance'],
                ['School Fee (annual)','schoolFee'],
              ].map(([lb,k])=>(
                <div key={k}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                  <input type="number" value={form[k]} onChange={e=>sf(k,+e.target.value)} style={inp} min={0}/>
                </div>
              ))}
            </div>

            {/* SSF override */}
            <div style={{fontWeight:800,fontSize:12,color:'#7f1d1d',marginBottom:8,paddingBottom:5,borderBottom:'1px solid #f1f5f9'}}>🏦 SSF (leave 0 to auto-calculate)</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              {[['PF Amount','pfActual'],['Gratuity Amount','gratuityActual'],['Insurance Amt','insuranceActual']].map(([lb,k])=>(
                <div key={k}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                  <input type="number" value={form[k]} onChange={e=>sf(k,+e.target.value)} style={inp} min={0} placeholder="auto"/>
                </div>
              ))}
            </div>
          </div>

          {/* Results panel */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Net salary card */}
            <div style={{background:G,borderRadius:14,padding:'20px',color:'#fff',textAlign:'center'}}>
              <div style={{fontSize:11,opacity:.8,marginBottom:6}}>NET MONTHLY SALARY</div>
              <div style={{fontSize:32,fontWeight:900,letterSpacing:-1}}>NPR {nr(calc.netSalary)}</div>
              <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:14,flexWrap:'wrap'}}>
                {[['Gross','grossMonthly','#bbf7d0'],['SSF','ssfTotal','#fca5a5'],['CIT','citMonthly','#fde68a'],['Tax/Mo','monthlyTax','#c4b5fd']].map(([lb,k,color])=>(
                  <div key={lb} style={{background:'rgba(255,255,255,.13)',borderRadius:9,padding:'8px 14px',textAlign:'center'}}>
                    <div style={{fontSize:14,fontWeight:800,color}}>{nr(calc[k])}</div>
                    <div style={{fontSize:8,opacity:.75}}>{lb}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,fontSize:10,opacity:.7}}>
                Effective Tax Rate: {calc.effectiveRate.toFixed(2)}%
                {form.gender==='Female'&&' · Female 10% Rebate Applied'}
              </div>
            </div>

            {/* Breakdown */}
            <div style={{background:'#fff',borderRadius:14,padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
              <div style={{fontWeight:800,fontSize:12,marginBottom:12,color:'#312e81'}}>📊 Annual Tax Computation</div>
              <InfoRow lb="Monthly Gross Salary" v={calc.monthlyGross}/>
              <InfoRow lb={`Annual Gross (×${form.monthsInYear})`} v={calc.annualGross}/>
              {form.dashainInclude&&<InfoRow lb="Dashain Allowance" v={calc.dashainAmt}/>}
              <InfoRow lb="Annual Assessable Income" v={calc.annualAssessable} bold/>
              <div style={{height:8}}/>
              <InfoRow lb="ARF Allowable Deduction (−)" v={calc.arfAllowable} color='#059669'
                sub={`min(Actual NPR ${nr(calc.arfActual)}, NPR 5 Lakh, 1/3 Assessable)`}/>
              {calc.insAllowable>0&&<InfoRow lb="Life Insurance Deduction (−)" v={calc.insAllowable} color='#059669' sub="Max NPR 60,000"/>}
              {calc.schoolAllowable>0&&<InfoRow lb="School Fee Deduction (−)" v={calc.schoolAllowable} color='#059669' sub="Max NPR 25,000"/>}
              <InfoRow lb="Annual Taxable Income" v={calc.taxableIncome} bold highlight/>

              {/* Slab bars */}
              <div style={{marginTop:10,marginBottom:10}}>
                {calc.breakdown.filter(b=>b.amount>0).map((b,i)=>(
                  <div key={i} style={{marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:9.5,marginBottom:3}}>
                      <span style={{color:'#374151',fontWeight:600}}>{b.label} ({(b.rate*100).toFixed(0)}%)</span>
                      <span style={{color:b.color,fontWeight:700}}>NPR {nr(b.tax)}</span>
                    </div>
                    <div style={{height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${b.(pct||0)}%`,background:b.color,borderRadius:4,transition:'width .4s'}}/>
                    </div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:1}}>NPR {nr(b.amount)} taxable</div>
                  </div>
                ))}
              </div>

              <InfoRow lb="Total Annual Tax" v={calc.totalTax} bold/>
              {form.gender==='Female'&&<InfoRow lb="Female 10% Credit (−)" v={calc.femaleCredit} color='#059669'/>}
              <InfoRow lb="Net Annual Tax" v={calc.netTax} bold highlight/>
              <InfoRow lb="Monthly TDS" v={calc.monthlyTax} bold color='#dc2626'/>

              <div style={{height:8}}/>
              <div style={{background:'#fffbeb',borderRadius:9,padding:'10px 14px',fontSize:10,color:'#92400e'}}>
                📅 Previous FY (2082-83) Tax: NPR {nr(calc.prevTax)}&nbsp;·&nbsp;
                Change: <span style={{fontWeight:800,color:calc.netTax>calc.prevTax?'#dc2626':'#059669'}}>
                  {calc.netTax>calc.prevTax?'+':''}{nr(calc.netTax-calc.prevTax)}
                </span>
              </div>
            </div>

            {/* SSF breakdown */}
            <div style={{background:'#fff',borderRadius:14,padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
              <div style={{fontWeight:800,fontSize:12,marginBottom:10,color:'#7f1d1d'}}>🏛 SSF Breakdown</div>
              {[
                ['PF (Employee 10%)',calc.pfRate,'#dc2626'],
                ['Gratuity (8.33%)',calc.gratuityRate,'#d97706'],
                ['Insurance (1.67%)',calc.insuranceRate,'#7c3aed'],
                ['Total Employee SSF',calc.ssfTotal,'#b91c1c'],
                ['Employer SSF (20%)',calc.ssfEmployer,'#059669'],
              ].map(([lb,v,color])=>(
                <div key={lb} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f1f5f9'}}>
                  <span style={{fontSize:11,color:'#374151'}}>{lb}</span>
                  <span style={{fontSize:11,fontWeight:700,color}}>NPR {nr(v)}</span>
                </div>
              ))}
              <div style={{marginTop:8,fontSize:9.5,color:'#64748b',background:'#fef2f2',borderRadius:8,padding:'8px 12px'}}>
                Total SSF per month: Employee NPR {nr(calc.ssfTotal)} + Employer NPR {nr(calc.ssfEmployer)} = NPR {nr(calc.ssfTotal+calc.ssfEmployer)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAX SLABS TAB ── */}
      {tab==='slabs'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {[['Single',SLABS.single],['Couple (Married)',SLABS.couple]].map(([title,slabs])=>(
            <div key={title} style={{background:'#fff',borderRadius:14,padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
              <div style={{fontWeight:800,fontSize:13,marginBottom:14,color:'#312e81'}}>
                📊 FY 2083-84 — Assessed as {title}
              </div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{background:'#f5f3ff'}}>
                    {['Salary Slab','Rate','Tax on Slab','Cumul. Tax'].map(h=>(
                      <th key={h} style={{padding:'9px 10px',textAlign:'right',fontSize:9,fontWeight:700,color:'#4c1d95',borderBottom:'1px solid #e2e8f0'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slabs.map((s,i)=>{
                    const cumulArr = slabs.slice(0,i+1).map((x,j)=>Math.min(x.upto===Infinity?Infinity:x.upto,x.upto)*x.rate)
                    const cumulTax = slabs.slice(0,i).reduce((sum,x)=>(x.upto===Infinity?0:x.upto)*x.rate+sum,0) + (s.upto===Infinity?0:s.upto)*s.rate
                    return (
                      <tr key={i} style={{background:s.bg}}>
                        <td style={{padding:'9px 10px',color:s.color,fontWeight:700}}>{s.label}</td>
                        <td style={{padding:'9px 10px',textAlign:'right',fontWeight:800,color:s.color,fontSize:13}}>{(s.rate*100).toFixed(0)}%</td>
                        <td style={{padding:'9px 10px',textAlign:'right',color:'#374151'}}>
                          {s.upto!==Infinity ? `NPR ${nr(s.upto*s.rate)}` : 'Variable'}
                        </td>
                        <td style={{padding:'9px 10px',textAlign:'right',fontWeight:700,color:s.color}}>
                          {s.upto!==Infinity ? `NPR ${nr(cumulTax)}` : '29% of excess'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {title.includes('Single')&&(
                <div style={{marginTop:12,padding:'10px 14px',background:'#fdf4ff',border:'1px solid #e9d5ff',borderRadius:9,fontSize:10,color:'#6b21a8'}}>
                  👩 Female employees: 10% rebate on total tax liability
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── SSF GUIDE TAB ── */}
      {tab==='ssf'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:'#fff',borderRadius:14,padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
            <div style={{fontWeight:800,fontSize:13,color:'#7f1d1d',marginBottom:14}}>🏛 SSF Heads (Social Security Fund)</div>
            {[
              ['PF (Provident Fund)','Employee: 10% of Basic',  'Employer: 10% of Basic','#dc2626'],
              ['Gratuity',          'Employee: 8.33% of Basic', 'Employer: 8.33% of Basic','#d97706'],
              ['Insurance Premium', 'Employee: 1.67% of Basic', 'Employer: 1.67% of Basic','#7c3aed'],
              ['Total Employee SSF','20% of Basic (combined)','','#b91c1c'],
              ['Employer Total',    '20% of Basic (PF+Gratuity+Insurance)','','#059669'],
            ].map(([lb,emp,empr,color])=>(
              <div key={lb} style={{marginBottom:12,padding:'12px',borderRadius:9,background:'#f8fafc',border:`1px solid ${color}22`}}>
                <div style={{fontWeight:700,fontSize:11,color:color,marginBottom:4}}>{lb}</div>
                <div style={{fontSize:10,color:'#374151'}}>{emp}</div>
                {empr&&<div style={{fontSize:10,color:'#64748b'}}>{empr}</div>}
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:14,padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
            <div style={{fontWeight:800,fontSize:13,color:'#065f46',marginBottom:14}}>📋 ARF & Other Deductions</div>
            {[
              ['Approved Retirement Fund (ARF)','Min of: (1) Actual, (2) NPR 5 Lakh, (3) 1/3 of Assessable Income','#059669'],
              ['Life Insurance Premium','Max NPR 60,000 per annum','#0369a1'],
              ['Health Insurance','Max NPR 20,000 per annum','#7c3aed'],
              ['House Insurance','Max NPR 5,000 per annum','#d97706'],
              ['School Fee','NPR 25,000 or 25% of annual fee, whichever is lower','#dc2626'],
              ['CIT (Citizen Investment Trust)','50% of Basic Salary (standard deduction)','#0891b2'],
            ].map(([lb,desc,color])=>(
              <div key={lb} style={{marginBottom:10,padding:'10px 12px',borderRadius:9,background:'#f8fafc',borderLeft:`3px solid ${color}`}}>
                <div style={{fontWeight:700,fontSize:11,color:color,marginBottom:3}}>{lb}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CHANGES TAB ── */}
      {tab==='changes'&&(
        <div style={{background:'#fff',borderRadius:14,padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
          <div style={{fontWeight:800,fontSize:13,color:'#312e81',marginBottom:16}}>📋 Changes FY 2082-83 → 2083-84 (Single)</div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:500}}>
              <thead>
                <tr style={{background:'#f5f3ff'}}>
                  {['Slab','FY 2082-83 (Old)','FY 2083-84 (New)','Tax Rate','Change'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'center',fontSize:10,fontWeight:700,color:'#312e81',borderBottom:'1px solid #e2e8f0'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['0% Slab','NPR 5 Lakh','NPR 10 Lakh','0%','🟢 Doubled — more tax-free income'],
                  ['10% Slab','NPR 2 Lakh','NPR 5 Lakh','10%','🟢 Expanded'],
                  ['20% Slab','NPR 3 Lakh','NPR 10 Lakh','20%','🟢 Expanded'],
                  ['27%/30% Slab','NPR 10 Lakh @ 30%','NPR 15 Lakh @ 27%','27%','🟢 Rate reduced 3%'],
                  ['Top Slab','36–39%','29%','29%','🟢 Rate reduced significantly'],
                ].map(([slab,old,nw,rate,change],i)=>(
                  <tr key={i} style={{background:i%2===0?'#fff':'#f8fafc'}}>
                    <td style={{padding:'10px 12px',fontWeight:700,color:'#312e81'}}>{slab}</td>
                    <td style={{padding:'10px 12px',textAlign:'center',color:'#dc2626'}}>{old}</td>
                    <td style={{padding:'10px 12px',textAlign:'center',color:'#059669',fontWeight:700}}>{nw}</td>
                    <td style={{padding:'10px 12px',textAlign:'center',fontWeight:800,color:'#0369a1'}}>{rate}</td>
                    <td style={{padding:'10px 12px',fontSize:10,color:'#374151'}}>{change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[
              ['📝 Other Key Provisions (Other Provisions Sheet)',['Remote workers: max NPR 3 Lakh deductible from income','Incapacitated persons: extra 50% on applicable tax slab','Resident with health insurance: deduct actual or NPR 20,000','Remote worker allowance: 75% rebate on applicable slab','Female employees: 10% tax rebate on total liability','Foreign income: 25% included in assessable income','SSF PF deductions qualify for ARF (up to NPR 5 Lakh)'],'#312e81'],
              ['🏦 Approved Retirement Fund (Retirement Fund Sheet)',['Allowable = min(Actual, NPR 5 Lakh, 1/3 Assessable)','SSF includes: PF + Gratuity + Insurance','Remaining balance taxed at 5% (after retirement)','50% of total deposit paid at retirement — tax free','Health insurance max: NPR 20,000','House insurance max: NPR 5,000'],'#065f46'],
            ].map(([title,points,color])=>(
              <div key={title} style={{background:'#f8fafc',borderRadius:12,padding:'14px',border:`1px solid ${color}22`}}>
                <div style={{fontWeight:700,fontSize:11,color,marginBottom:10}}>{title}</div>
                {points.map((p,i)=>(
                  <div key={i} style={{fontSize:10,color:'#374151',padding:'4px 0',borderBottom:'1px solid #f1f5f9',display:'flex',gap:8}}>
                    <span style={{color,fontWeight:700,flexShrink:0}}>{i+1}.</span>{p}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

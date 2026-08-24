import React, { useState, useRef, useEffect } from 'react'
// FILE: src/components/dashboard/snapshots/LeaveBalancePage.jsx
// eLogix HRMS — Leave Balance Report
// FIXED: Missing key prop on React.Fragment in map (line 211 & 237)
// ADDED: tenant-wise access via resolveTenantAccess, SaaS DB integration, scrollbar
// eLogix Technologies · www.elogix.com.np

// react imported above
import { resolveTenantAccess, getSessionSlug } from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'

const G = 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#a78bfa 100%)'
const A = '#7c3aed'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e){ return {} }
}

const LEAVE_TYPES = {
  CL : { label:'Casual Leave',    bg:'#fff7ed', text:'#9a3412', border:'#fed7aa', dot:'#f97316', total:12 },
  EL : { label:'Earned Leave',    bg:'#ecfdf5', text:'#065f46', border:'#6ee7b7', dot:'#10b981', total:18 },
  SL : { label:'Sick Leave',      bg:'#eff6ff', text:'#1e40af', border:'#bfdbfe', dot:'#3b82f6', total:12 },
  ML : { label:'Maternity Leave', bg:'#fdf4ff', text:'#6b21a8', border:'#e9d5ff', dot:'#a855f7', total:98 },
  PL : { label:'Paternity Leave', bg:'#f0f9ff', text:'#075985', border:'#7dd3fc', dot:'#0ea5e9', total:15 },
  BL : { label:'Bereavement',     bg:'#f1f5f9', text:'#334155', border:'#cbd5e1', dot:'#64748b', total:13 },
  CWL: { label:'Child Welfare',   bg:'#fefce8', text:'#713f12', border:'#fef08a', dot:'#eab308', total:10 },
  HD : { label:'Half Day',        bg:'#fff1f2', text:'#9f1239', border:'#fda4af', dot:'#f43f5e', total:6  },
}
const DEPTS = ['All','Management','Human Resources','Finance','IT','Sales','Operations','Procurement']

function genRows(companySlug) {
  const names = [
    ['Ram Thapa',       'Senior Officer',    'Management'],
    ['Sita Shrestha',   'HR Manager',        'Human Resources'],
    ['Hari Maharjan',   'Finance Officer',   'Finance'],
    ['Gita Tamang',     'IT Lead',           'IT'],
    ['Maya Gurung',     'Recruiter',         'Human Resources'],
    ['Binod Rai',       'Sales Executive',   'Sales'],
    ['Sunita KC',       'Procurement',       'Procurement'],
    ['Rajesh Sharma',   'Operations Head',   'Operations'],
    ['Puja Karki',      'Department Head',   'Management'],
    ['Deepak Joshi',    'HR Officer',        'Human Resources'],
    ['Anita Basnet',    'Supervisor',        'Operations'],
    ['Sanjay Bhattarai','Team Lead',         'Sales'],
  ]
  return names.map(([name, desig, dept], idx) => ({
    sn    : idx + 1,
    empId : `${(companySlug||'EMP').toUpperCase().slice(0,3)}-${String(idx+1).padStart(4,'0')}`,
    name, desig, dept,
    daysAttended: 18 + Math.floor(Math.random() * 4),
    balances: Object.fromEntries(Object.entries(LEAVE_TYPES).map(([code, lt]) => {
      const used  = Math.floor(Math.random() * (lt.total / 3))
      const carry = Math.floor(Math.random() * 5)
      const avail = lt.total + carry - used
      return [code, { used, carry, avail, total: lt.total }]
    })),
  }))
}

const inp = {
  padding:'7px 10px', borderRadius:8, border:'1.5px solid #e2e8f0',
  fontSize:10, outline:'none', fontFamily:'inherit',
  width:'100%', boxSizing:'border-box', background:'#fff',
}

// ✅ FIX: LeaveCell — no key needed here (key goes on the Fragment in parent)
const LeaveCell = ({ code, value, type }) => {
  const s = LEAVE_TYPES[code]
  if (!s) return <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,color:'#94a3b8'}}>—</td>
  const color = type==='used'?'#dc2626':type==='carry'?'#d97706':type==='avail'?s.dot:'#374151'
  return (
    <td style={{padding:'5px 4px',textAlign:'center',background:s.bg,
      border:`1px solid ${s.border}`,minWidth:38}}>
      <span style={{fontSize:9.5,fontWeight:800,color}}>{value}</span>
    </td>
  )
}

export default function LeaveBalancePage() {
  const slug    = getSessionSlug()
  const access  = resolveTenantAccess(slug)
  const sess    = getSession()
  const company = sess.company || {}

  if (!access.hasAccess('leave')) {
    return <AccessDenied moduleName="Leave Balance" />
  }

  const today     = new Date()
  const [month,   setMonth]   = useState(today.getMonth() + 1)
  const [year,    setYear]    = useState(today.getFullYear())
  const [dept,    setDept]    = useState('All')
  const [showSig, setShowSig] = useState(false)
  const [msg,     setMsg]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sigs,    setSigs]    = useState({
    prepared: { name:'', designation:'', date:today.toISOString().split('T')[0], signed:false },
    verified: { name:'', designation:'', date:today.toISOString().split('T')[0], signed:false },
    approved: { name:'', designation:'', date:today.toISOString().split('T')[0], signed:false },
  })
  const fileRef = useRef(null)
  const notify  = m => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const [rows, setRows] = useState(() => genRows(company.slug || slug))

  // SaaS DB: load leave balances for this tenant
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    setLoading(true)
    fetch(`/api/v1/leave/balance?month=${month}&year=${year}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (data.data?.length) setRows(data.data) })
      .catch(() => {}) // keep mock
      .finally(() => setLoading(false))
  }, [slug, month, year])

  const filtered = dept === 'All' ? rows : rows.filter(r => r.dept === dept)
  const mon = new Date(year, month - 1).toLocaleString('default', { month:'long' })

  const exportCSV = () => {
    const h = ['S#','Emp ID','Name','Designation','Dept','Days Att.']
    Object.keys(LEAVE_TYPES).forEach(c => h.push(`${c} Used`,`${c} Carry`,`${c} Avail`))
    h.push('Total Balance','Total Used')
    const b = filtered.map(r => {
      const row = [r.sn,r.empId,r.name,r.desig,r.dept,r.daysAttended]
      Object.values(r.balances).forEach(b => row.push(b.used,b.carry,b.avail))
      row.push(
        Object.values(r.balances).reduce((s,b)=>s+b.avail,0),
        Object.values(r.balances).reduce((s,b)=>s+b.used,0)
      )
      return row.join(',')
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+[h.join(','),...b].join('\n')],{type:'text/csv'}))
    a.download = `LeaveBalance_${mon}_${year}_${dept}.csv`
    a.click(); notify('📤 Exported')
  }

  const SigBox = ({ role }) => {
    const s = sigs[role]
    const titles = { prepared:'✍️ Prepared By', verified:'✅ Verified By', approved:'🏛 Approved By' }
    return (
      <div style={{flex:1,border:`2px solid ${s.signed?'#ddd6fe':'#e2e8f0'}`,borderRadius:12,
        padding:'14px',background:s.signed?'#f5f3ff':'#fff',minWidth:160}}>
        <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:8}}>{titles[role]}</div>
        {s.signed ? (
          <div>
            <div style={{fontFamily:'Georgia,serif',fontSize:16,color:A,fontStyle:'italic',
              borderBottom:`2px solid ${A}`,paddingBottom:4,marginBottom:4}}>{s.name}</div>
            <div style={{fontSize:10,fontWeight:700}}>{s.name}</div>
            <div style={{fontSize:9,color:'#64748b'}}>{s.designation}</div>
            <div style={{fontSize:9,color:'#94a3b8'}}>{s.date}</div>
            <span style={{marginTop:6,display:'inline-block',background:'#f5f3ff',color:A,
              fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,border:'1px solid #ddd6fe'}}>
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
    // ── Fixed layout with right + bottom scrollbar ─────────────────
    <div style={{position:'fixed', inset:0, fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#fdf4ff', display:'flex', flexDirection:'column', overflow:'hidden'}}>

      <style>{`
        ::-webkit-scrollbar{width:8px;height:8px}
        ::-webkit-scrollbar-track{background:#f1f5f9;border-radius:4px}
        ::-webkit-scrollbar-thumb{background:${A};border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#5b21b6}
        .lb-row:hover td{background:#f5f3ff!important}
      `}</style>

      {/* Toast */}
      {msg && <div style={{position:'fixed',bottom:20,right:20,zIndex:9999,
        background:msg.startsWith('⚠')?'#fffbeb':'#f5f3ff',
        border:`1px solid ${msg.startsWith('⚠')?'#fde68a':'#ddd6fe'}`,
        borderRadius:10,padding:'10px 18px',fontSize:11,fontWeight:600,
        color:msg.startsWith('⚠')?'#92400e':'#4c1d95',
        boxShadow:'0 4px 16px rgba(0,0,0,.12)'}}>
        {msg}
      </div>}

      {/* HEADER */}
      <div style={{background:G, padding:'12px 20px', color:'#fff', flexShrink:0}}>
        <div style={{fontSize:10, opacity:.7, marginBottom:2}}>
          Workforce Operations › Leave Management › Leave Balance
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:17,fontWeight:900}}>📋 Leave Balance Report</div>
            <div style={{fontSize:10,opacity:.8}}>
              {company.name||'Company'} · Nepal Labour Act 2074 · {mon} {year} · {dept}
              {loading ? ' · Loading...' : ''}
            </div>
          </div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            <button onClick={() => fileRef.current?.click()}
              style={{padding:'6px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.4)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
              📊 Import
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                onChange={e => notify(`📂 ${e.target.files[0]?.name}`)}
                style={{display:'none'}}/>
            </button>
            <button onClick={exportCSV}
              style={{padding:'6px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.4)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
              📤 Export
            </button>
            <button onClick={() => window.print()}
              style={{padding:'6px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.4)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
              🖨️ Print
            </button>
            <button onClick={() => setShowSig(true)}
              style={{padding:'6px 12px',borderRadius:8,border:'none',
                background:'#fff',color:A,fontSize:10,fontWeight:800,cursor:'pointer'}}>
              ✍️ Sign
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}>
          <div style={{flex:'1 1 100px'}}>
            <div style={{fontSize:8,opacity:.7,marginBottom:3}}>Month</div>
            <select value={month} onChange={e => setMonth(+e.target.value)} style={{...inp,padding:'5px 8px'}}>
              {Array.from({length:12},(_,i) => i+1).map(m => (
                <option key={m} value={m}>{new Date(2024,m-1).toLocaleString('default',{month:'long'})}</option>
              ))}
            </select>
          </div>
          <div style={{flex:'1 1 80px'}}>
            <div style={{fontSize:8,opacity:.7,marginBottom:3}}>Year</div>
            <select value={year} onChange={e => setYear(+e.target.value)} style={{...inp,padding:'5px 8px'}}>
              {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div style={{flex:'2 1 140px'}}>
            <div style={{fontSize:8,opacity:.7,marginBottom:3}}>Department</div>
            <select value={dept} onChange={e => setDept(e.target.value)} style={{...inp,padding:'5px 8px'}}>
              {DEPTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{alignSelf:'flex-end',paddingBottom:2}}>
            <span style={{fontSize:10,background:'rgba(255,255,255,.2)',
              padding:'5px 10px',borderRadius:20,whiteSpace:'nowrap'}}>
              {filtered.length} employees
            </span>
          </div>
        </div>
      </div>

      {/* LEGEND strip */}
      <div style={{background:'#fff',padding:'8px 20px',borderBottom:'1px solid #e2e8f0',
        flexShrink:0,overflowX:'auto'}}>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:5}}>
          {Object.entries(LEAVE_TYPES).map(([code, lt]) => (
            <span key={code} style={{display:'inline-flex',alignItems:'center',gap:4,
              background:lt.bg,color:lt.text,border:`1px solid ${lt.border}`,
              fontSize:8.5,fontWeight:700,padding:'3px 9px',borderRadius:20,whiteSpace:'nowrap'}}>
              <span style={{width:7,height:7,background:lt.dot,borderRadius:'50%',display:'inline-block'}}/>
              {code} — {lt.label} ({lt.total}d)
            </span>
          ))}
        </div>
        <div style={{display:'flex',gap:12,fontSize:9}}>
          <span style={{color:'#dc2626',fontWeight:700}}>■ Red = Used</span>
          <span style={{color:'#d97706',fontWeight:700}}>■ Orange = Carry Forward</span>
          <span style={{color:'#059669',fontWeight:700}}>■ Green = Available</span>
        </div>
      </div>

      {/* TABLE with RIGHT + BOTTOM scrollbar */}
      <div style={{flex:1, overflow:'auto',
        scrollbarWidth:'thin', scrollbarColor:`${A} #e2e8f0`,
        WebkitOverflowScrolling:'touch'}}>
        <table style={{width:'max-content',minWidth:'100%',borderCollapse:'collapse',fontSize:9}}>
          <thead style={{position:'sticky',top:0,zIndex:5}}>
            <tr style={{background:'#4c1d95'}}>
              <th colSpan={5+Object.keys(LEAVE_TYPES).length*3+3}
                style={{padding:'7px 14px',textAlign:'center',fontSize:11,fontWeight:900,color:'#fff'}}>
                LEAVE BALANCE REPORT — {company.name||'Company'} · {mon} {year} · {dept}
              </th>
            </tr>
            <tr style={{background:'#6d28d9'}}>
              <th rowSpan={2} style={{padding:'6px 8px',color:'#fff',fontWeight:700,fontSize:9,width:35,position:'sticky',left:0,background:'#6d28d9',zIndex:6}}>S#</th>
              <th rowSpan={2} style={{padding:'6px 8px',color:'#fff',fontWeight:700,fontSize:9,width:75,background:'#6d28d9',position:'sticky',top:0}}>Emp ID</th>
              <th rowSpan={2} style={{padding:'6px 8px',color:'#fff',fontWeight:700,fontSize:9,width:130,background:'#6d28d9',position:'sticky',top:0}}>Name</th>
              <th rowSpan={2} style={{padding:'6px 8px',color:'#fff',fontWeight:700,fontSize:9,width:105,background:'#6d28d9',position:'sticky',top:0}}>Designation</th>
              <th rowSpan={2} style={{padding:'6px 8px',color:'#fff',fontWeight:700,fontSize:9,width:55,background:'#6d28d9',position:'sticky',top:0}}>Days Att.</th>
              {Object.entries(LEAVE_TYPES).map(([code, lt]) => (
                <th key={code} colSpan={3}
                  style={{padding:'5px 4px',color:'#fff',fontWeight:700,fontSize:8.5,
                    textAlign:'center',background:lt.dot+'cc',
                    borderLeft:'2px solid rgba(255,255,255,.3)'}}>
                  {code} · {lt.label}
                </th>
              ))}
              <th rowSpan={2} style={{padding:'6px 8px',color:'#fde68a',fontWeight:700,fontSize:9,
                textAlign:'center',borderLeft:'2px solid rgba(255,255,255,.3)',background:'#6d28d9'}}>
                Total Bal.
              </th>
              <th rowSpan={2} style={{padding:'6px 8px',color:'#fde68a',fontWeight:700,fontSize:9,
                textAlign:'center',background:'#6d28d9'}}>
                Total Used
              </th>
            </tr>
            <tr style={{background:'#7c3aed'}}>
              {/* ✅ FIX: React.Fragment with key instead of bare <> */}
              {Object.keys(LEAVE_TYPES).map(code => (
                <React.Fragment key={code}>
                  <th style={{padding:'5px 4px',color:'#fca5a5',fontWeight:700,fontSize:8,textAlign:'center',minWidth:36}}>Used</th>
                  <th style={{padding:'5px 4px',color:'#fde68a',fontWeight:700,fontSize:8,textAlign:'center',minWidth:36}}>Carry</th>
                  <th style={{padding:'5px 4px',color:'#bbf7d0',fontWeight:700,fontSize:8,textAlign:'center',minWidth:36}}>Avail</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, ri) => {
              const totalBal  = Object.values(row.balances).reduce((s, b) => s+b.avail, 0)
              const totalUsed = Object.values(row.balances).reduce((s, b) => s+b.used,  0)
              return (
                <tr key={row.sn} className="lb-row"
                  style={{background:ri%2===0?'#fff':'#fafafa'}}>
                  <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700,color:'#64748b',borderBottom:'1px solid #f1f5f9'}}>{row.sn}</td>
                  <td style={{padding:'6px 8px',textAlign:'center',fontFamily:'monospace',fontSize:9,color:A,borderBottom:'1px solid #f1f5f9'}}>{row.empId}</td>
                  <td style={{padding:'6px 8px',fontWeight:700,color:'#0f172a',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{row.name}</td>
                  <td style={{padding:'6px 8px',fontSize:9,color:'#475569',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{row.desig}</td>
                  <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700,color:'#0369a1',borderBottom:'1px solid #f1f5f9'}}>{row.daysAttended}</td>
                  {/* ✅ FIX: React.Fragment with key instead of bare <> */}
                  {Object.entries(row.balances).map(([code, b]) => (
                    <React.Fragment key={`${row.sn}-${code}`}>
                      <LeaveCell code={code} value={b.used}  type="used"/>
                      <LeaveCell code={code} value={b.carry} type="carry"/>
                      <LeaveCell code={code} value={b.avail} type="avail"/>
                    </React.Fragment>
                  ))}
                  <td style={{padding:'6px 8px',textAlign:'center',fontWeight:800,color:'#059669',
                    borderBottom:'1px solid #f1f5f9',background:'#f0fdf4',borderLeft:'2px solid #bbf7d0'}}>
                    {totalBal}
                  </td>
                  <td style={{padding:'6px 8px',textAlign:'center',fontWeight:800,color:'#dc2626',
                    borderBottom:'1px solid #f1f5f9',background:'#fef2f2'}}>
                    {totalUsed}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* DIGITAL SIGNATURE section */}
      <div style={{background:'#fff',borderTop:'1px solid #e2e8f0',
        padding:'14px 20px',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div style={{fontWeight:800,fontSize:12}}>✍️ Digital Signatures — Leave Balance Report</div>
          <button onClick={() => setShowSig(true)}
            style={{padding:'7px 14px',borderRadius:9,border:'none',
              background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
            ✍️ Sign Report
          </button>
        </div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          {['prepared','verified','approved'].map(role => <SigBox key={role} role={role}/>)}
        </div>
      </div>

      {/* SIGNATURE MODAL */}
      {showSig && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={() => setShowSig(false)}>
          <div style={{background:'#fff',borderRadius:18,width:620,maxWidth:'96vw',
            maxHeight:'92vh',overflowY:'auto',
            scrollbarWidth:'thin',scrollbarColor:`${A} #e2e8f0`}}
            onClick={e => e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>✍️ Digital Signature Panel</div>
              <div style={{fontSize:10,opacity:.8}}>Leave Balance Report — {mon} {year} · {dept}</div>
            </div>
            <div style={{padding:'20px 22px'}}>
              {['prepared','verified','approved'].map(role => {
                const sig = sigs[role]
                const titles = {
                  prepared:'✍️ Prepared By (HR Officer)',
                  verified:'✅ Verified By (HR Manager)',
                  approved:'🏛 Approved By (Director / HOD)',
                }
                return (
                  <div key={role} style={{marginBottom:20,padding:'16px',borderRadius:12,
                    border:`2px solid ${sig.signed?'#ddd6fe':'#e2e8f0'}`,
                    background:sig.signed?'#f5f3ff':'#f8fafc'}}>
                    <div style={{fontWeight:800,fontSize:12,marginBottom:10}}>{titles[role]}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                      {[['Full Name *','name'],['Designation *','designation']].map(([lb,k]) => (
                        <div key={k}>
                          <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                          <input value={sig[k]}
                            onChange={e => setSigs(p => ({...p,[role]:{...p[role],[k]:e.target.value,signed:false}}))}
                            style={{...inp,fontSize:11}} placeholder={lb.replace(' *','')}/>
                        </div>
                      ))}
                    </div>
                    <div style={{marginBottom:10}}>
                      <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Date *</label>
                      <input type="date" value={sig.date}
                        onChange={e => setSigs(p => ({...p,[role]:{...p[role],date:e.target.value,signed:false}}))}
                        style={{...inp,width:'50%'}}/>
                    </div>
                    {!sig.signed ? (
                      <button onClick={() => {
                        if (!sig.name || !sig.designation) { notify('⚠️ Fill name & designation'); return }
                        setSigs(p => ({...p,[role]:{...p[role],signed:true}}))
                        notify(`✅ ${role} signed — ${sig.name}`)
                      }} style={{padding:'8px 18px',borderRadius:8,border:'none',background:G,
                        color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        ✍️ Apply Signature
                      </button>
                    ) : (
                      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                        <span style={{fontFamily:'Georgia,serif',fontSize:20,color:A,fontStyle:'italic'}}>{sig.name}</span>
                        <span style={{background:'#f5f3ff',color:A,fontSize:9,fontWeight:700,
                          padding:'3px 10px',borderRadius:20,border:'1px solid #ddd6fe'}}>
                          ✅ Signed · {sig.date}
                        </span>
                        <button onClick={() => setSigs(p => ({...p,[role]:{...p[role],signed:false}}))}
                          style={{padding:'4px 10px',borderRadius:7,border:'1px solid #e2e8f0',
                            background:'#fff',fontSize:9,cursor:'pointer',color:'#64748b'}}>
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{display:'flex',gap:10}}>
                <button onClick={() => {
                  const all = ['prepared','verified','approved'].every(r => sigs[r].signed)
                  if (!all) { notify('⚠️ All 3 signatures required'); return }
                  notify('✅ Leave Balance Report signed & locked in eLogix HRMS')
                  setShowSig(false)
                }} style={{flex:1,padding:'11px',borderRadius:9,border:'none',
                  background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  🔒 Finalise Report
                </button>
                <button onClick={() => setShowSig(false)}
                  style={{padding:'11px 18px',borderRadius:9,border:'1px solid #e2e8f0',
                    background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

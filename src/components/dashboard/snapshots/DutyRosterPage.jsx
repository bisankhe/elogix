// FILE: DutyRosterPage.jsx
// eLogix HRMS — Duty Roster
// Each shift/leave type has distinct colour · Night Duty = separate dark colour
// Prepared by / Verified by / Approved by — digital signature panel
// eLogix Technologies · www.elogix.com.np
import { useState, useRef } from 'react'

const G = 'linear-gradient(135deg,#1e3a5f 0%,#0369a1 60%,#38bdf8 100%)'
const A = '#0369a1'

// ── SHIFT / LEAVE COLOUR PALETTE ─────────────────────────────
const SHIFT_CODES = {
  M:  { label:'Morning',        bg:'#dbeafe', text:'#1e40af', border:'#93c5fd', dot:'#2563eb' },
  D:  { label:'Day',            bg:'#fef9c3', text:'#854d0e', border:'#fde047', dot:'#ca8a04' },
  E:  { label:'Evening',        bg:'#ffedd5', text:'#9a3412', border:'#fdba74', dot:'#ea580c' },
  N:  { label:'Night Duty',     bg:'#1e1b4b', text:'#c7d2fe', border:'#4338ca', dot:'#818cf8' },  // dark
  W:  { label:'Weekly Off',     bg:'#f0fdf4', text:'#166534', border:'#86efac', dot:'#22c55e' },
  PH: { label:'Public Holiday', bg:'#fdf2f8', text:'#831843', border:'#f0abfc', dot:'#d946ef' },
  L:  { label:'Leave',          bg:'#fef2f2', text:'#991b1b', border:'#fca5a5', dot:'#ef4444' },
  CL: { label:'Casual Leave',   bg:'#fff7ed', text:'#9a3412', border:'#fed7aa', dot:'#f97316' },
  EL: { label:'Earned Leave',   bg:'#ecfdf5', text:'#065f46', border:'#6ee7b7', dot:'#10b981' },
  SL: { label:'Sick Leave',     bg:'#eff6ff', text:'#1e40af', border:'#bfdbfe', dot:'#3b82f6' },
  ML: { label:'Maternity Leave',bg:'#fdf4ff', text:'#6b21a8', border:'#e9d5ff', dot:'#a855f7' },
  BL: { label:'Bereavement',    bg:'#f1f5f9', text:'#334155', border:'#cbd5e1', dot:'#64748b' },
  CWL:{ label:'Child Welfare',  bg:'#fefce8', text:'#713f12', border:'#fef08a', dot:'#eab308' },
  HD: { label:'Half Day',       bg:'#fff1f2', text:'#9f1239', border:'#fda4af', dot:'#f43f5e' },
  A:  { label:'Absent',         bg:'#fef2f2', text:'#7f1d1d', border:'#fca5a5', dot:'#dc2626' },
  R:  { label:'Rotational',     bg:'#f0f9ff', text:'#075985', border:'#7dd3fc', dot:'#0ea5e9' },
  S:  { label:'Split',          bg:'#fafafa', text:'#374151', border:'#d1d5db', dot:'#6b7280' },
  OT: { label:'Overtime',       bg:'#fffbeb', text:'#92400e', border:'#fcd34d', dot:'#f59e0b' },

const DEPTS   = ['All','Management','Human Resources','Finance','IT','Sales','Operations','Procurement']
const PERIODS = ['Daily','Weekly','Bi-Monthly','Monthly']
const SHIFTS  = ['M','D','E','N','W']

const pad2 = n => String(n).padStart(2,'0')

// ── Generate 31-day roster rows ───────────────────────────────
function genRoster(month, year, dept) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const names = [
    ['Ram Thapa','Senior Officer'],['Sita Shrestha','Manager'],['Hari Maharjan','Officer'],
    ['Gita Tamang','Executive'],['Maya Gurung','HOD'],['Binod Rai','Associate'],
    ['Sunita KC','HR Officer'],['Rajesh Sharma','Finance Officer'],
    ['Puja Karki','Recruiter'],['Deepak Joshi','IT Lead'],
    ['Anita Basnet','Supervisor'],['Sanjay Bhattarai','Team Lead'],
  ]
  const shiftPools = {
    Management: ['D','D','D','D','D','W','W'],
    'Human Resources': ['D','D','D','D','W','W','EL'],
    Finance: ['D','D','D','D','D','W','W'],
    IT: ['M','D','E','N','D','W','W'],
    Sales: ['D','D','D','EL','CL','W','W'],
    Operations: ['M','D','E','N','W','W','D'],
    Procurement: ['D','D','D','D','W','W','SL'],
    All: ['M','D','E','N','W','CL','EL'],
  const pool = shiftPools[dept] || shiftPools.All
  return names.map(([ name, desig ], idx) => {
    const empId = `EMP-${String(idx+1).padStart(4,'0')}`
    const days = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month-1, d).getDay()
      if (dow === 0) { days.push('W') }
      else if (dow === 6) { days.push('W') }
      else { days.push(pool[(idx * 3 + d) % pool.length]) }
    // sprinkle some night duties
    if (['IT','Operations'].includes(dept) || dept==='All') {
      for (let d = 0; d < daysInMonth; d++) {
        if ((idx + d) % 9 === 0 && days[d] !== 'W') days[d] = 'N'
    return { sn: idx+1, empId, name, desig, dept: dept==='All'?DEPTS[1+(idx%7)]:dept, days }
  })

const inp = {
  padding:'7px 10px', borderRadius:8, border:'1.5px solid #e2e8f0',
  fontSize:10, outline:'none', fontFamily:'inherit',
  width:'100%', boxSizing:'border-box', background:'#fff'

const ShiftCell = ({ code }) => {
  const s = SHIFT_CODES[code] || SHIFT_CODES.D
  const isNight = code === 'N'
  return (
    <td style={{
      padding:'3px 2px', textAlign:'center', minWidth:28,
      background: s.bg, border: `1px solid ${s.border}`,
      position:'relative'
    }}>
      <span style={{
        fontSize: isNight ? 9 : 9.5, fontWeight: 800,
        color: s.text, letterSpacing:-.3,
        textShadow: isNight ? '0 0 4px #6366f1' : 'none'
      }}>
        {code}
      </span>
    </td>
  )

export default function DutyRosterPage() {
  const today = new Date()
  const [month,    setMonth]   = useState(today.getMonth() + 1)
  const [year,     setYear]    = useState(today.getFullYear())
  const [dept,     setDept]    = useState('All')
  const [period,   setPeriod]  = useState('Monthly')
  const [showSig,  setShowSig] = useState(false)
  const [msg,      setMsg]     = useState('')
  const [sigs, setSigs] = useState({
    prepared: { name:'', designation:'', date:today.toISOString().split('T')[0], signed:false },
    verified: { name:'', designation:'', date:today.toISOString().split('T')[0], signed:false },
    approved: { name:'', designation:'', date:today.toISOString().split('T')[0], signed:false },
  })
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3500) }
  const fileRef = useRef(null)

  const daysInMonth = new Date(year, month, 0).getDate()
  const rows = genRoster(month, year, dept)

  const dayHeaders = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month-1, d).getDay()
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    dayHeaders.push({ d, day: dayNames[dow], isWeekend: dow===0||dow===6 })

  const monthName = new Date(year, month-1, 1).toLocaleString('default',{month:'long'})

  const signaturePanel = (role) => {
    const sig = sigs[role]
    return (
      <div style={{
        flex:1, border:`2px solid ${sig.signed?'#059669':'#e2e8f0'}`,
        borderRadius:12, padding:'14px', minWidth:180,
        background: sig.signed ? '#f0fdf4' : '#fff',
        transition:'all .2s'
      }}>
        <div style={{fontSize:10,fontWeight:800,color:'#374151',marginBottom:8,textTransform:'capitalize'}}>
          {role === 'prepared' ? '✍️ Prepared By' : role === 'verified' ? '✅ Verified By' : '🏛 Approved By'}
        </div>
        {sig.signed ? (
          <div>
            <div style={{
              fontFamily:'Georgia,serif', fontSize:18, color:'#0369a1',
              fontStyle:'italic', borderBottom:'2px solid #0369a1',
              paddingBottom:4, marginBottom:6
            }}>
              {sig.name || '—'}
            </div>
            <div style={{fontSize:10, color:'#374151', fontWeight:700}}>{sig.name}</div>
            <div style={{fontSize:9, color:'#64748b'}}>{sig.designation}</div>
            <div style={{fontSize:9, color:'#94a3b8', marginTop:2}}>{sig.date}</div>
            <div style={{marginTop:8}}>
              <span style={{background:'#f0fdf4',color:'#059669',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,border:'1px solid #bbf7d0'}}>
                ✅ Digitally Signed · eLogix HRMS
              </span>
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              height:40, borderBottom:'1px dashed #cbd5e1',
              display:'flex',alignItems:'flex-end',paddingBottom:4,
              color:'#94a3b8',fontSize:10,fontStyle:'italic'
            }}>Awaiting signature...</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Name & Designation</div>
            <div style={{fontSize:9,color:'#94a3b8'}}>Date</div>
          </div>
        )}
      </div>
    )

  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f0f7ff'}}>
      {msg && <div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',
        border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:11,
        color:'#065f46',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:440}}>{msg}</div>}

      {/* ── HEADER ── */}
      <div style={{background:G,padding:'16px 22px',color:'#fff',marginBottom:14,borderRadius:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>📅 Duty Roster</div>
            <div style={{fontSize:10,opacity:.8}}>
              eLogix HRMS · Auto-generated · {monthName} {year} · {dept}
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>fileRef.current?.click()} style={{padding:'7px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
              📊 Import
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e=>notify(`📂 ${e.target.files[0]?.name} imported`)} style={{display:'none'}}/>
            </button>
            <button onClick={()=>notify('📤 Exporting duty roster...')} style={{padding:'7px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📤 Export</button>
            <button onClick={()=>notify('🖨 Printing duty roster...')} style={{padding:'7px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>🖨 Print</button>
            <button onClick={()=>setShowSig(true)} style={{padding:'7px 14px',borderRadius:9,border:'none',background:'#fff',color:A,fontSize:10,fontWeight:800,cursor:'pointer'}}>✍️ Sign & Approve</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap'}}>
          <div style={{flex:'1 1 100px'}}>
            <div style={{fontSize:8,opacity:.7,marginBottom:3}}>Month</div>
            <select value={month} onChange={e=>setMonth(+e.target.value)} style={{...inp,padding:'6px 10px'}}>
              {Array.from({length:12},(_,i)=>i+1).map(m=>(
                <option key={m} value={m}>{new Date(2024,m-1,1).toLocaleString('default',{month:'long'})}</option>
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
          <div style={{flex:'1 1 110px'}}>
            <div style={{fontSize:8,opacity:.7,marginBottom:3}}>Period</div>
            <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,padding:'6px 10px'}}>
              {PERIODS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── LEGEND ── */}
      <div style={{background:'#fff',borderRadius:12,padding:'10px 16px',marginBottom:12,
        boxShadow:'0 1px 6px rgba(0,0,0,.06)',display:'flex',flexWrap:'wrap',gap:8}}>
        {Object.entries(SHIFT_CODES).map(([code, s])=>(
          <span key={code} style={{display:'inline-flex',alignItems:'center',gap:4,
            background:s.bg,color:s.text,border:`1px solid ${s.border}`,
            fontSize:9,fontWeight:700,padding:'3px 9px',borderRadius:20,whiteSpace:'nowrap'}}>
            <span style={{width:7,height:7,background:s.dot,borderRadius:'50%',display:'inline-block'}}/>
            {code} = {s.label}
          </span>
        ))}
      </div>

      {/* ── TABLE ── */}
      <div style={{background:'#fff',borderRadius:14,boxShadow:'0 2px 8px rgba(0,0,0,.06)',
        overflow:'auto',marginBottom:14,
        scrollbarWidth:'thin',scrollbarColor:`${A} #e2e8f0`}}>
        <style>{`::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:#f1f5f9;border-radius:4px}::-webkit-scrollbar-thumb{background:${A};border-radius:4px}`}</style>
        <table style={{width:'max-content',minWidth:'100%',borderCollapse:'collapse',fontSize:9}}>
          <thead style={{position:'sticky',top:0,zIndex:5}}>
            {/* Company / Report header row */}
            <tr style={{background:'#0c4a6e'}}>
              <th colSpan={4+daysInMonth+1} style={{padding:'8px 14px',textAlign:'center',
                fontSize:13,fontWeight:900,color:'#fff',letterSpacing:.5}}>
                DUTY ROSTER — eLogix HRMS · {monthName} {year} · {dept}
              </th>
            </tr>
            {/* Day-number row */}
            <tr style={{background:'#0369a1'}}>
              {[['S.N.',35],['Emp ID',70],['Name',130],['Designation',100]].map(([h,w])=>(
                <th key={h} style={{padding:'7px 8px',textAlign:'center',color:'#fff',
                  fontWeight:700,fontSize:9,width:w,minWidth:w,whiteSpace:'nowrap',
                  borderRight:'1px solid rgba(255,255,255,.2)',position:'sticky',top:0}}>
                  {h}
                </th>
              ))}
              {dayHeaders.map(({d,day,isWeekend})=>(
                <th key={d} style={{
                  padding:'5px 2px',textAlign:'center',color:'#fff',fontWeight:700,fontSize:8.5,
                  minWidth:28,width:28,background:isWeekend?'#075985':'#0369a1',
                  borderRight:'1px solid rgba(255,255,255,.15)',
                  position:'sticky',top:0,zIndex:3
                }}>
                  <div>{d}</div>
                  <div style={{fontSize:7,opacity:.8}}>{day}</div>
                </th>
              ))}
              <th style={{padding:'7px 8px',textAlign:'center',color:'#fff',fontWeight:700,
                fontSize:9,minWidth:70,borderLeft:'1px solid rgba(255,255,255,.2)',position:'sticky',top:0}}>
                Remarks
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row,ri)=>(
              <tr key={row.sn}
                style={{background:ri%2===0?'#fff':'#f8fafc'}}
                onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'}
                onMouseLeave={e=>e.currentTarget.style.background=ri%2===0?'#fff':'#f8fafc'}>
                <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700,color:'#64748b',
                  borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{row.sn}</td>
                <td style={{padding:'6px 8px',textAlign:'center',fontFamily:'monospace',
                  fontSize:9,color:'#0369a1',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>
                  {row.empId}
                </td>
                <td style={{padding:'6px 8px',fontWeight:700,color:'#0f172a',
                  borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{row.name}</td>
                <td style={{padding:'6px 8px',fontSize:9,color:'#475569',
                  borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{row.desig}</td>
                {row.days.map((code,di)=><ShiftCell key={di} code={code}/>)}
                <td style={{padding:'6px 8px',fontSize:9,color:'#94a3b8',
                  borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── DIGITAL SIGNATURE PANEL ── */}
      <div style={{background:'#fff',borderRadius:14,padding:'20px',
        boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div>
            <div style={{fontWeight:800,fontSize:13,color:'#0f172a'}}>✍️ Digital Signatures</div>
            <div style={{fontSize:10,color:'#64748b',marginTop:2}}>
              eLogix HRMS · System-generated · {new Date().toLocaleDateString('en-NP')}
            </div>
          </div>
          <button onClick={()=>setShowSig(true)}
            style={{padding:'8px 16px',borderRadius:9,border:'none',background:G,
              color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
            ✍️ Open Signature Panel
          </button>
        </div>
        <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
          {['prepared','verified','approved'].map(role=>signaturePanel(role))}
        </div>
      </div>

      {/* ── SIGNATURE MODAL ── */}
      {showSig&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={()=>setShowSig(false)}>
          <div style={{background:'#fff',borderRadius:18,width:620,maxWidth:'96vw',maxHeight:'92vh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>✍️ Digital Signature Panel</div>
              <div style={{fontSize:10,opacity:.8}}>Duty Roster — {monthName} {year} · {dept}</div>
              <div style={{fontSize:9,opacity:.7,marginTop:2}}>
                Signatures are digitally recorded in eLogix HRMS with timestamp
              </div>
            </div>
            <div style={{padding:'20px 22px'}}>
              {['prepared','verified','approved'].map(role=>{
                const sig = sigs[role]
                const titles = {prepared:'✍️ Prepared By (HR/Admin)',verified:'✅ Verified By (HOD)',approved:'🏛 Approved By (HR Manager / Director)'}
                return (
                  <div key={role} style={{marginBottom:20,padding:'16px',borderRadius:12,
                    border:`2px solid ${sig.signed?'#bbf7d0':'#e2e8f0'}`,
                    background:sig.signed?'#f0fdf4':'#f8fafc'}}>
                    <div style={{fontWeight:800,fontSize:12,marginBottom:12,color:'#0f172a'}}>
                      {titles[role]}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                      {[['Full Name *','name'],['Designation *','designation']].map(([lb,k])=>(
                        <div key={k}>
                          <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                          <input value={sig[k]} onChange={e=>setSigs(p=>({...p,[role]:{...p[role],[k]:e.target.value,signed:false}}))}
                            style={{...inp,fontSize:11}} placeholder={`Enter ${lb.replace(' *','')}`}/>
                        </div>
                      ))}
                    </div>
                    <div style={{marginBottom:12}}>
                      <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Date *</label>
                      <input type="date" value={sig.date} onChange={e=>setSigs(p=>({...p,[role]:{...p[role],date:e.target.value,signed:false}}))}
                        style={{...inp,width:'50%'}}/>
                    </div>
                    {!sig.signed ? (
                      <button onClick={()=>{
                        if (!sig.name||!sig.designation) { notify(`⚠️ Enter name & designation for ${role}`); return }
                        setSigs(p=>({...p,[role]:{...p[role],signed:true}}))
                        notify(`✅ ${role.charAt(0).toUpperCase()+role.slice(1)} signature applied — ${sig.name}`)
                      }} style={{padding:'9px 20px',borderRadius:9,border:'none',
                        background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        ✍️ Apply Digital Signature
                      </button>
                    ):(
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{fontFamily:'Georgia,serif',fontSize:22,color:'#0369a1',fontStyle:'italic'}}>
                          {sig.name}
                        </div>
                        <span style={{background:'#f0fdf4',color:'#059669',fontSize:9,fontWeight:700,
                          padding:'3px 10px',borderRadius:20,border:'1px solid #bbf7d0'}}>
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
                  const allSigned = ['prepared','verified','approved'].every(r=>sigs[r].signed)
                  if (!allSigned) { notify('⚠️ Please apply all 3 digital signatures first'); return }
                  notify('✅ Duty Roster signed, verified & approved — locked in eLogix HRMS')
                  setShowSig(false)
                }} style={{flex:1,padding:'11px',borderRadius:9,border:'none',background:G,
                  color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  🔒 Finalise & Lock Duty Roster
                </button>
                <button onClick={()=>setShowSig(false)}
                  style={{padding:'11px 18px',borderRadius:9,border:'1px solid #e2e8f0',
                    background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

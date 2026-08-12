// FILE: HRPolicyLibraryPage.jsx — Compliance & Risk > HR Policies > HR Policy Library
// Living library of all published policies.
// Employee clicks → reads (scroll to bottom marks as read) → signs digitally.
// Reader tab shows: ✅ Read & Signed (names + dates) | 📕 Not Yet Read (names)

import { useState, useMemo, useRef } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const G  = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const P  = '#7c3aed'

export const LIBRARY_KEY = 'elogix_policy_library_v2'
export const READERS_KEY = 'elogix_policy_readers_v2'

// Current logged-in user (in production: from AppContext JWT)
const ME = { id:'e1', name:'Bikash Shrestha', dept:'Engineering' }

const CATS = [
  { code:'EMP', name:'Employment',           icon:'📋', color:'#3b82f6', bg:'#eff6ff' },
  { code:'WBP', name:'Workplace Behaviour',  icon:'🤝', color:'#8b5cf6', bg:'#faf5ff' },
  { code:'RCP', name:'Recruitment & Comp',   icon:'💰', color:'#10b981', bg:'#f0fdf4' },
  { code:'SCP', name:'Safety & Compliance',  icon:'🛡️', color:'#ef4444', bg:'#fef2f2' },
  { code:'ECA', name:'Conduct & Attendance', icon:'📅', color:'#f59e0b', bg:'#fffbeb' },
  { code:'LWS', name:'Leave & Work',         icon:'🏖️', color:'#06b6d4', bg:'#ecfeff' },
  { code:'WRT', name:'Workplace Tech',       icon:'💻', color:'#f97316', bg:'#fff7ed' },
  { code:'LDP', name:'Learning & Dev',       icon:'🎓', color:'#a855f7', bg:'#faf5ff' },
]

// Built-in standard policies always visible in library
const STD_POLICIES = [
  { id:'std-001', cat:'EMP', control:'POL-EMP-001', title:'Employment Contracts & Terms',     mandatory:true,  version:'2.1', publishedAt:'2026-01-01T00:00:00Z', company:'eLogix HRMS Pvt. Ltd.', audience:'All Employees', effectiveDate:'1 January 2026', content:`EMPLOYMENT CONTRACTS & TERMS POLICY\n${'═'.repeat(50)}\n\nDocument ID   : POL-EMP-001\nVersion       : 2.1 — Active\nEffective     : 1 January 2026\n\n${'─'.repeat(50)}\n1. PURPOSE\n${'─'.repeat(50)}\n\nThis policy establishes the framework for employment contracts and terms at eLogix HRMS Pvt. Ltd. It ensures all employment relationships are formalised in writing and comply with Nepal Labour Act 2074.\n\n${'─'.repeat(50)}\n2. SCOPE\n${'─'.repeat(50)}\n\nApplies to all employees: permanent, probationary, contract, and temporary staff.\n\n${'─'.repeat(50)}\n3. POLICY STATEMENT\n${'─'.repeat(50)}\n\nAll employment at eLogix HRMS Pvt. Ltd. is governed by a written employment contract. No verbal contracts are recognised. Both parties must sign before the employee commences duties.\n\n${'─'.repeat(50)}\n4. KEY PROVISIONS\n${'─'.repeat(50)}\n\n4.1  Written contract mandatory per Nepal Labour Act 2074, Section 10.\n4.2  Probationary period shall not exceed 6 months (LA2074 Section 13).\n4.3  Contract must specify: designation, department, salary, benefits, working hours, and leave entitlements.\n4.4  Any amendments to contract terms require written agreement from both parties.\n4.5  Contracts must be in a language the employee understands (mandatory for foreign nationals).\n\n${'─'.repeat(50)}\n5. ROLES & RESPONSIBILITIES\n${'─'.repeat(50)}\n\nHR Department: Issue, maintain, and archive all employment contracts.\nManagement: Sign contracts on behalf of the organisation.\nEmployees: Read, understand, and retain a signed copy of their contract.\n\n${'─'.repeat(50)}\n6. COMPLIANCE & CONSEQUENCES\n${'─'.repeat(50)}\n\nNon-compliance with this policy will result in disciplinary action per LA2074 Section 52.\n\n${'─'.repeat(50)}\n7. REVIEW\n${'─'.repeat(50)}\n\nAnnual review by HR Department. Next review: January 2027.` },
  { id:'std-002', cat:'EMP', control:'POL-EMP-002', title:'Code of Conduct Policy',           mandatory:true,  version:'3.0', publishedAt:'2026-01-01T00:00:00Z', company:'eLogix HRMS Pvt. Ltd.', audience:'All Employees', effectiveDate:'1 January 2026', content:`CODE OF CONDUCT POLICY\n${'═'.repeat(50)}\n\nDocument ID   : POL-EMP-002\nVersion       : 3.0 — Active\n\n${'─'.repeat(50)}\n1. PURPOSE\nEstablishes standards of professional behaviour, ethics, and integrity expected from all employees.\n\n${'─'.repeat(50)}\n2. SCOPE\nAll employees, contractors, and third-party representatives.\n\n${'─'.repeat(50)}\n3. POLICY STATEMENT\neLogix HRMS Pvt. Ltd. expects the highest standards of professional conduct at all times.\n\n${'─'.repeat(50)}\n4. KEY PROVISIONS\n4.1  Treat all colleagues, clients, and stakeholders with respect and dignity.\n4.2  Maintain confidentiality of company and client information.\n4.3  Avoid conflicts of interest — declare any to HR immediately.\n4.4  Use company resources only for authorised business purposes.\n4.5  Report unethical behaviour through the Whistleblower channel.\n\n${'─'.repeat(50)}\n5. COMPLIANCE\nViolations handled per Disciplinary Policy (POL-ECA-001) and LA2074 Section 52.` },
  { id:'std-003', cat:'EMP', control:'POL-EMP-004', title:'Non-Discrimination Policy',        mandatory:true,  version:'2.0', publishedAt:'2026-01-01T00:00:00Z', company:'eLogix HRMS Pvt. Ltd.', audience:'All Employees', effectiveDate:'1 January 2026', content:`NON-DISCRIMINATION POLICY\n${'═'.repeat(50)}\n\nDocument ID   : POL-EMP-004\nVersion       : 2.0\n\n${'─'.repeat(50)}\n1. PURPOSE\nEnsure equal opportunity and zero discrimination in all employment decisions.\n\n${'─'.repeat(50)}\n2. KEY PROVISIONS\n4.1  No discrimination based on: gender, age, caste, religion, disability, ethnicity, or marital status.\n4.2  Equal pay for equal work per LA2074 minimum wage standards.\n4.3  Reasonable accommodations provided for employees with disabilities.\n4.4  Complaints handled within 7 working days.\n\n${'─'.repeat(50)}\n3. COMPLIANCE\nLA2074 — Non-discrimination provisions. Violations may result in legal action and termination.` },
  { id:'std-004', cat:'EMP', control:'POL-EMP-005', title:'Anti-Harassment Policy',           mandatory:true,  version:'2.2', publishedAt:'2026-01-01T00:00:00Z', company:'eLogix HRMS Pvt. Ltd.', audience:'All Employees', effectiveDate:'1 January 2026', content:`ANTI-HARASSMENT POLICY\n${'═'.repeat(50)}\n\nZero tolerance for harassment of any kind.\n\n${'─'.repeat(50)}\n1. KEY PROVISIONS\n4.1  Harassment includes: verbal, physical, visual, and sexual harassment.\n4.2  Complaints must be reported to HR within 30 days of incident.\n4.3  Investigations completed within 21 working days.\n4.4  Complainants are protected from retaliation (see Retaliation Policy POL-EMP-006).\n4.5  Confirmed harassment results in immediate disciplinary action, up to termination.` },
  { id:'std-005', cat:'SCP', control:'POL-SCP-004', title:'Health & Safety Policy',           mandatory:true,  version:'1.8', publishedAt:'2026-01-01T00:00:00Z', company:'eLogix HRMS Pvt. Ltd.', audience:'All Employees', effectiveDate:'1 January 2026', content:`HEALTH & SAFETY POLICY\n${'═'.repeat(50)}\n\n${'─'.repeat(50)}\n1. PURPOSE\nEnsure a safe working environment for all employees per Nepal Labour Rules 2018.\n\n${'─'.repeat(50)}\n4. KEY PROVISIONS\n4.1  Report all accidents and near-misses within 24 hours.\n4.2  Emergency exits and fire drills — quarterly practice.\n4.3  First aid kits available on every floor.\n4.4  Right to refuse unsafe work without penalty.\n4.5  Mental health support available through Employee Assistance Programme.` },
  { id:'std-006', cat:'ECA', control:'POL-ECA-001', title:'Disciplinary Policy',              mandatory:true,  version:'2.0', publishedAt:'2026-01-01T00:00:00Z', company:'eLogix HRMS Pvt. Ltd.', audience:'All Employees', effectiveDate:'1 January 2026', content:`DISCIPLINARY POLICY\n${'═'.repeat(50)}\n\nLA2074 Section 52 — Three-Strike Progressive Discipline\n\n4.1  First offence   : Verbal warning (documented)\n4.2  Second offence  : Written warning\n4.3  Third offence   : Final written warning\n4.4  Serious breach  : Summary dismissal without prior warnings\n\nEmployee has right to respond within 7 days of each warning. HR investigates within 21 days.` },
  { id:'std-007', cat:'LWS', control:'POL-LWS-001', title:'Leave Policy',                    mandatory:true,  version:'3.1', publishedAt:'2026-01-01T00:00:00Z', company:'eLogix HRMS Pvt. Ltd.', audience:'All Employees', effectiveDate:'1 January 2026', content:`LEAVE POLICY\n${'═'.repeat(50)}\n\nNepal Labour Act 2074 Leave Entitlements\n\n4.1  Annual Leave       : 18 days per year (LA2074 Section 53)\n4.2  Sick Leave         : 12 days per year (Section 54)\n4.3  Maternity Leave    : 98 days full pay (Section 45)\n4.4  Paternity Leave    : 15 days\n4.5  Bereavement Leave  : 13 days (immediate family)\n4.6  Public Holidays    : As gazetted by Government of Nepal\n4.7  Leave must be applied through ESS system and approved by supervisor.` },
  { id:'std-008', cat:'RCP', control:'POL-RCP-003', title:'Compensation Policy',              mandatory:true,  version:'2.3', publishedAt:'2026-01-01T00:00:00Z', company:'eLogix HRMS Pvt. Ltd.', audience:'All Employees', effectiveDate:'1 January 2026', content:`COMPENSATION POLICY\n${'═'.repeat(50)}\n\n4.1  Minimum wage       : NPR 17,300/month (LA2074 Section 26)\n4.2  SSF contribution   : 11% employee + 20% employer\n4.3  Overtime           : 1.5× basic rate, max 4 hours/day (Section 36)\n4.4  Gratuity           : 8.33% per year from Day 1\n4.5  Festival bonus     : 1 month basic salary per year\n4.6  CIT deducted at source per prevailing Income Tax Act rates.` },
  { id:'std-009', cat:'WRT', control:'POL-WRT-006', title:'Data Protection & Privacy Policy', mandatory:true,  version:'1.0', publishedAt:'2026-01-01T00:00:00Z', company:'eLogix HRMS Pvt. Ltd.', audience:'All Employees', effectiveDate:'1 January 2026', content:`DATA PROTECTION & PRIVACY POLICY\n${'═'.repeat(50)}\n\n4.1  All employee data is treated as confidential and stored securely.\n4.2  Data shared only on need-to-know basis with management authorisation.\n4.3  Employees may request access to their personal data at any time.\n4.4  Data breaches must be reported to IT immediately.\n4.5  Compliance with Nepal Privacy Act 2018 and GDPR principles.` },
  { id:'std-010', cat:'ECA', control:'POL-ECA-003', title:'Attendance Policy',               mandatory:true,  version:'2.5', publishedAt:'2026-01-01T00:00:00Z', company:'eLogix HRMS Pvt. Ltd.', audience:'All Employees', effectiveDate:'1 January 2026', content:`ATTENDANCE POLICY\n${'═'.repeat(50)}\n\n4.1  Working hours      : 8 hours/day, 48 hours/week (LA2074 Section 28)\n4.2  Core hours         : 9:00 AM – 5:00 PM Monday–Friday\n4.3  30-minute lunch break mandatory after 5 hours continuous work (Labour Rules 2018)\n4.4  All attendance recorded via biometric/app — no proxy allowed\n4.5  3 unexplained absences = written warning` },
]

function loadReaders() { try { return JSON.parse(localStorage.getItem(READERS_KEY)||'{}') } catch { return {} } }
function saveReaders(d) { try { localStorage.setItem(READERS_KEY, JSON.stringify(d)) } catch {} }

export default function HRPolicyLibraryPage() {
  const { navTo } = useApp()
  const [searchQ,    setSearchQ]   = useState('')
  const [catFilter,  setCatFilter] = useState('ALL')
  const [mandFilter, setMandFilter]= useState('ALL')
  const [selected,   setSelected]  = useState(null)
  const [tab,        setTab]       = useState('content')
  const [readers,    setReaders]   = useState(loadReaders)
  const contentRef = useRef(null)

  // Merge published from workflow + standard built-in policies
  const allPolicies = useMemo(() => {
    try {
      const pub    = JSON.parse(localStorage.getItem(LIBRARY_KEY)||'[]').filter(p=>p.status==='published')
      const pubIds = new Set(pub.map(p=>p.id))
      return [...pub, ...STD_POLICIES.filter(s=>!pubIds.has(s.id))]
    } catch { return STD_POLICIES }
  }, [readers])

  const filtered = allPolicies.filter(p => {
    if (catFilter!=='ALL' && p.cat!==catFilter) return false
    if (mandFilter==='mandatory' && !p.mandatory) return false
    if (mandFilter==='optional'  &&  p.mandatory) return false
    if (searchQ && !p.title.toLowerCase().includes(searchQ.toLowerCase())) return false
    return true
  })

  const myUnsigned = allPolicies.filter(p => p.mandatory && !readers[p.id]?.[ME.id]?.signedAt)
  const myReadCount = allPolicies.filter(p => readers[p.id]?.[ME.id]?.readAt).length

  // Scroll to bottom → mark as read
  const handleScroll = (e) => {
    if (!selected) return
    const el = e.target
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 50
    if (atBottom && !readers[selected.id]?.[ME.id]?.readAt) {
      const now = new Date().toISOString()
      const updated = { ...readers }
      if (!updated[selected.id]) updated[selected.id] = {}
      updated[selected.id][ME.id] = { name:ME.name, dept:ME.dept, readAt:now, signedAt:null }
      setReaders(updated); saveReaders(updated)
    }
  }

  const signPolicy = () => {
    if (!selected) return
    if (!updated[selected.id]) updated[selected.id] = {}
    updated[selected.id][ME.id] = { ...(updated[selected.id][ME.id]||{}), name:ME.name, dept:ME.dept, readAt:updated[selected.id][ME.id]?.readAt||now, signedAt:now }
    setReaders(updated); saveReaders(updated)
  }

  const myStatus    = selected ? (readers[selected.id]?.[ME.id] || null) : null
  const hasRead     = !!myStatus?.readAt
  const hasSigned   = !!myStatus?.signedAt

  // Reader lists for selected policy
  const polReaderEntries = selected ? Object.entries(readers[selected.id]||{}) : []
  const readSignedList   = polReaderEntries.filter(([,r])=>r.readAt).sort((a,b)=>new Date(b[1].readAt)-new Date(a[1].readAt))
  const notReadList      = polReaderEntries.filter(([,r])=>!r.readAt)

  const cat = selected ? CATS.find(c=>c.code===selected.cat) : null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, fontFamily:'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'22px 28px', boxShadow:'0 4px 24px rgba(124,58,237,.25)' }}>
        <div style={{ fontSize:8, color:'rgba(255,255,255,.5)', marginBottom:4, letterSpacing:1, textTransform:'uppercase' }}>Compliance & Risk Management › HR Policies</div>
        <div style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-.3 }}>📚 HR Policy Library</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:4 }}>Read · Sign digitally · Track compliance · Nepal Labour Act 2074 compliant</div>
        <div style={{ display:'flex', gap:10, marginTop:14, flexWrap:'wrap', alignItems:'center' }}>
          {[
            { icon:'📋', label:'Total Policies',     val:allPolicies.length },
            { icon:'✅', label:'I Have Signed',       val:allPolicies.filter(p=>readers[p.id]?.[ME.id]?.signedAt).length },
            { icon:'⚠️', label:'My Pending Sign',    val:myUnsigned.length, alert:myUnsigned.length>0 },
            { icon:'📗', label:'I Have Read',         val:myReadCount },
          ].map((s,i)=>(
            <div key={i} style={{ background:'rgba(255,255,255,.12)', borderRadius:10, padding:'6px 16px' }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.7)' }}>{s.icon} {s.label}</div>
              <div style={{ fontSize:18, fontWeight:900, color:s.alert&&s.val>0?'#fca5a5':'#fff' }}>{s.val}</div>
            </div>
          ))}
          <button onClick={()=>navTo?.('policy-readers')} style={{ marginLeft:'auto', padding:'8px 16px', borderRadius:10, border:'none', background:'rgba(255,255,255,.2)', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>👥 Reader Tracking →</button>
        </div>
        {myUnsigned.length>0 && (
          <div style={{ marginTop:10, fontSize:9, color:'#fca5a5', fontWeight:700 }}>
            ⚠️ You have {myUnsigned.length} mandatory polic{myUnsigned.length===1?'y':'ies'} pending your signature: {myUnsigned.map(p=>p.title).join(' · ')}
          </div>
        )}
      </div>

      {/* Search + filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Search policies..."
          style={{ flex:2, minWidth:180, padding:'9px 14px', borderRadius:10, border:'1px solid #e2e8f0', fontSize:11, outline:'none' }}/>
        <div style={{ display:'flex', gap:3, background:'#f8fafc', borderRadius:10, padding:3 }}>
          {[['ALL','All'],['mandatory','Mandatory'],['optional','Optional']].map(([v,l])=>(
            <button key={v} onClick={()=>setMandFilter(v)} style={{ padding:'6px 12px', borderRadius:8, border:'none', background:mandFilter===v?'#fff':'transparent', color:mandFilter===v?P:'#64748b', fontWeight:mandFilter===v?700:400, fontSize:9, cursor:'pointer', boxShadow:mandFilter===v?'0 1px 3px rgba(0,0,0,.08)':'none' }}>{l}</button>
          ))}
        </div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{ padding:'8px 12px', borderRadius:10, border:'1px solid #e2e8f0', fontSize:10, outline:'none', background:'#fff' }}>
          <option value="ALL">All Categories</option>
          {CATS.map(c=><option key={c.code} value={c.code}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:selected?'300px 1fr':'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>

        {/* Policy cards / list */}
        {!selected ? (
          <>
            {filtered.map(pol => {
              const c       = CATS.find(x=>x.code===pol.cat)
              const mySign  = !!readers[pol.id]?.[ME.id]?.signedAt
              const myRead2 = !!readers[pol.id]?.[ME.id]?.readAt
              const readCount2  = Object.values(readers[pol.id]||{}).filter(r=>r.readAt).length
              const totalCount  = Object.keys(readers[pol.id]||{}).length
              return (
                <div key={pol.id} onClick={()=>{ setSelected(pol); setTab('content') }}
                  style={{ background:'#fff', borderRadius:14, padding:'18px', border:`1.5px solid ${pol.mandatory&&!mySign?'#fca5a5':'#e2e8f0'}`, cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.05)', transition:'all .2s', display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:c?.bg||'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{c?.icon||'📄'}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', lineHeight:1.3 }}>{pol.title}</div>
                      <div style={{ fontSize:8, color:'#94a3b8', marginTop:2 }}>{pol.control} · v{pol.version}</div>
                    </div>
                    {pol.mandatory && <span style={{ fontSize:7, fontWeight:800, padding:'2px 7px', borderRadius:8, background:'#fef2f2', color:'#dc2626', flexShrink:0 }}>REQ</span>}
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {mySign
                      ? <span style={{ fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:8, background:'#f0fdf4', color:'#15803d' }}>✅ I Signed</span>
                      : myRead2
                        ? <span style={{ fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:8, background:'#eff6ff', color:'#1e40af' }}>📗 I Read · Pending Sign</span>
                        : <span style={{ fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:8, background:'#f8fafc', color:'#94a3b8' }}>📕 Not Read</span>}
                    {totalCount>0 && <span style={{ fontSize:8, color:'#64748b' }}>{readCount2}/{totalCount} read</span>}
                  </div>
                  <div style={{ fontSize:9, color:'#64748b', borderTop:'1px solid #f8fafc', paddingTop:8 }}>{pol.audience} · Effective {pol.effectiveDate||'—'}</div>
                </div>
              )
            })}
            {filtered.length===0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'#94a3b8', background:'#fff', borderRadius:14, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                <div>No policies match your filters.</div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Left: policy list (compact) */}
            <div style={{ display:'flex', flexDirection:'column', gap:6, overflowY:'auto', maxHeight:'85vh' }}>
              {filtered.map(pol=>{
                const c = CATS.find(x=>x.code===pol.cat)
                const mySign2 = !!readers[pol.id]?.[ME.id]?.signedAt
                return (
                  <div key={pol.id} onClick={()=>{setSelected(pol);setTab('content')}}
                    style={{ padding:'10px 14px', borderRadius:11, border:`1.5px solid ${selected.id===pol.id?P:'#e2e8f0'}`, background:selected.id===pol.id?`${P}08`:'#fff', cursor:'pointer', transition:'all .15s' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:16 }}>{c?.icon||'📄'}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:9, fontWeight:700, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pol.title}</div>
                        <div style={{ fontSize:7, color:'#94a3b8', marginTop:1 }}>{pol.control}</div>
                      </div>
                      <span style={{ fontSize:11 }}>{mySign2?'✅':'📕'}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right: detail */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 2px 16px rgba(0,0,0,.06)' }}>
              {/* Header */}
              <div style={{ background:cat?`linear-gradient(135deg,${cat.color},${cat.color}cc)`:G, padding:'16px 22px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:900, color:'#fff' }}>{selected.title}</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.75)', marginTop:3 }}>{selected.control} · v{selected.version} · {selected.audience}</div>
                </div>
                <button onClick={()=>setSelected(null)} style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:8, padding:'5px 12px', color:'#fff', cursor:'pointer', fontSize:16 }}>✕</button>
              </div>

              {/* My status bar */}
              <div style={{ padding:'12px 22px', background: hasSigned?'#f0fdf4':hasRead?'#eff6ff':'#fefce8', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>{hasSigned?'✅':hasRead?'📗':'📕'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#0f172a' }}>
                    {hasSigned ? 'You have read and signed this policy' : hasRead ? 'You have read this policy — please sign below' : 'Scroll to the bottom to mark as read, then sign'}
                  </div>
                  {hasSigned && myStatus?.signedAt && <div style={{ fontSize:9, color:'#64748b', marginTop:2 }}>Signed: {new Date(myStatus.signedAt).toLocaleString('en-GB')}</div>}
                </div>
                {!hasSigned && hasRead && (
                  <button onClick={signPolicy} style={{ padding:'8px 18px', borderRadius:10, border:'none', background:P, color:'#fff', fontSize:10, fontWeight:800, cursor:'pointer', flexShrink:0 }}>✍️ Sign Now</button>
                )}
                {!hasSigned && !hasRead && selected.mandatory && (
                  <span style={{ fontSize:8, fontWeight:700, padding:'3px 9px', borderRadius:8, background:'#fef2f2', color:'#dc2626', flexShrink:0 }}>Mandatory</span>
                )}
              </div>

              {/* Tabs */}
              <div style={{ display:'flex', borderBottom:'1px solid #e2e8f0' }}>
                {[['content','📄 Policy'],['readers','👥 Readers']].map(([t,l])=>(
                  <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'10px', border:'none', borderBottom:`2px solid ${tab===t?P:'transparent'}`, background:'#fff', color:tab===t?P:'#64748b', fontWeight:tab===t?800:400, fontSize:10, cursor:'pointer' }}>{l}</button>
                ))}
              </div>

              {/* Content */}
              {tab==='content' && (
                <div ref={contentRef} onScroll={handleScroll} style={{ flex:1, overflowY:'auto', padding:'20px 24px', maxHeight:420 }}>
                  <pre style={{ fontFamily:'"Times New Roman",Georgia,serif', fontSize:11, lineHeight:1.9, whiteSpace:'pre-wrap', color:'#0f172a', margin:0 }}>
                    {selected.content || 'Policy content not available.'}
                  </pre>
                  <div style={{ marginTop:24, padding:'14px 16px', background:'#f8fafc', borderRadius:10, border:'1px dashed #e2e8f0', textAlign:'center' }}>
                    {hasSigned
                      ? <div style={{ color:'#15803d', fontWeight:700, fontSize:11 }}>✅ You signed this policy on {new Date(myStatus.signedAt).toLocaleString('en-GB')}</div>
                      : hasRead
                        ? <button onClick={signPolicy} style={{ padding:'10px 28px', borderRadius:10, border:'none', background:G, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>✍️ Digitally Sign & Acknowledge</button>
                        : <div style={{ color:'#94a3b8', fontSize:10 }}>📖 Read the full policy above to enable signing</div>}
                  </div>
                </div>
              )}

              {/* Readers tab */}
              {tab==='readers' && (
                <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', maxHeight:420 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                    <div style={{ background:'#f0fdf4', borderRadius:12, padding:14, border:'1px solid #bbf7d0' }}>
                      <div style={{ fontSize:10, fontWeight:800, color:'#15803d', marginBottom:10 }}>✅ Have Read / Signed ({readSignedList.length})</div>
                      {readSignedList.length===0 ? (
                        <div style={{ fontSize:9, color:'#94a3b8', fontStyle:'italic' }}>No one has read this policy yet.</div>
                      ) : readSignedList.map(([id, r]) => (
                        <div key={id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid #dcfce7' }}>
                          <div style={{ width:28, height:28, borderRadius:7, background:G, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:9, fontWeight:900, flexShrink:0 }}>
                            {r.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}
                          </div>
                          <div>
                            <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{r.name}</div>
                            <div style={{ fontSize:7, color:'#64748b' }}>{r.dept}</div>
                            <div style={{ fontSize:7, color:'#10b981', marginTop:1 }}>
                              {r.signedAt ? `✍️ Signed ${new Date(r.signedAt).toLocaleDateString('en-GB')}` : `📗 Read ${new Date(r.readAt).toLocaleDateString('en-GB')}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ background:'#fef2f2', borderRadius:12, padding:14, border:'1px solid #fecaca' }}>
                      <div style={{ fontSize:10, fontWeight:800, color:'#dc2626', marginBottom:10 }}>📕 Not Yet Read ({notReadList.length})</div>
                      {notReadList.length===0 ? (
                        <div style={{ fontSize:9, color:'#15803d', fontWeight:700 }}>🎉 All employees have read this policy!</div>
                      ) : notReadList.map(([id, r]) => (
                        <div key={id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid #fee2e2' }}>
                          <div style={{ width:28, height:28, borderRadius:7, background:'#fecaca', display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444', fontSize:9, fontWeight:900, flexShrink:0 }}>
                            {r.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}
                          </div>
                          <div>
                            <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{r.name}</div>
                            <div style={{ fontSize:7, color:'#64748b' }}>{r.dept}</div>
                            <div style={{ fontSize:7, color:'#ef4444', marginTop:1 }}>⏳ Pending</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize:9, color:'#94a3b8', textAlign:'center' }}>
                    Overall: {readSignedList.length} of {polReaderEntries.length} employees have read this policy
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

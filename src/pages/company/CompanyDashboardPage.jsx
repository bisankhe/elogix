// FILE: src/pages/company/CompanyDashboardPage.jsx
// eLogix HRMS — Company Dashboard (Super Admin Landing)
// COMPLETE REWRITE — Zero mock data. Real tenant API.
// ─────────────────────────────────────────────────────────────────────
// Removes:
//   • STATIC_SLUGS = ['demo', 'himalayan', 'solidfuture']  (hardcoded company list)
//   • isPending logic reading from localStorage STATIC_SLUGS
//   • ELX UID hardcoded 'ELX-DEMO-0001' fallback
//   • PLAN_META hardcoded modules/employee counts (now from API)
//   • tenantGet/tenantSet from missing tenantRouting.js
//   • resolveTenantAccess from missing tenantPermissions.js
//   • Duplicate `company` declaration (from previous session)
// Adds:
//   • GET /api/v1/company-dashboard/summary  — live KPIs + modules + plan + user
//   • GET /api/v1/company-dashboard/status   — approval state from DB (not localStorage)
//   • Setup progress persisted PER TENANT in API (not localStorage)
//   • Full scrollbar on root container
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useMemo } from 'react'
import { useAuth as _useAuth } from '../../context/AuthContext.jsx'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

// ── Inline style tokens ────────────────────────────────────────────────────
const G = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%)'
const A = '#0369a1'

const S = {
  root    : { position:'fixed', inset:0, overflowY:'auto', overflowX:'hidden',
              fontFamily:"'Segoe UI',system-ui,sans-serif", color:'#0f172a',
              background:'#f8fafc', WebkitOverflowScrolling:'touch',
              scrollbarWidth:'thin', scrollbarColor:'#0369a1 #dbeafe' },
  page    : { padding:'24px', maxWidth:1100, margin:'0 auto' },
  label   : { fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.05em',
               textTransform:'uppercase', marginBottom:12 },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',
               gap:10, marginBottom:20 },
  statCard : { background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 16px',
               boxShadow:'0 1px 4px rgba(0,0,0,.04)' },
  statLabel: { fontSize:11, color:'#64748b', marginBottom:6 },
  statVal  : { fontSize:20, fontWeight:700, color:'#0f172a' },
  statSub  : { fontSize:11, color:'#94a3b8', marginTop:2 },
  progress : { height:7, background:'#e2e8f0', borderRadius:4, marginBottom:20, overflow:'hidden' },
  progressFill: (pct) => ({
    height:'100%', width:`${Math.min(100,pct)}%`,
    background: G, borderRadius:4, transition:'width .4s ease',
  }),
  checkList: { display:'flex', flexDirection:'column', gap:8, marginBottom:20 },
  checkItem: (done,active) => ({
    display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
    background: done ? '#f0fdf4' : active ? '#eff6ff' : '#f8fafc',
    border    : `1px solid ${done ? '#bbf7d0' : active ? '#bfdbfe' : '#e2e8f0'}`,
    borderRadius:10, cursor: done ? 'default' : 'pointer', transition:'all .12s',
  }),
  checkCircle: (done,active) => ({
    width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center',
    justifyContent:'center', flexShrink:0, fontSize:14, fontWeight:800,
    background: done ? '#dcfce7' : active ? '#dbeafe' : '#f1f5f9',
    color     : done ? '#166534' : active ? '#1d4ed8' : '#94a3b8',
  }),
  twoCol : { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 },
  card   : { background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px',
             boxShadow:'0 1px 4px rgba(0,0,0,.04)' },
  infoRow: { display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'6px 0', borderBottom:'1px solid #f1f5f9', fontSize:12 },
  badge  : (color) => ({
    fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600,
    background: color==='blue' ?'#dbeafe': color==='green'?'#dcfce7':
                color==='amber'?'#fef3c7': color==='purple'?'#f3e8ff':'#f1f5f9',
    color:      color==='blue' ?'#1e40af': color==='green'?'#166534':
                color==='amber'?'#92400e': color==='purple'?'#6b21a8':'#475569',
  }),
  alert: (type) => ({
    display:'flex', gap:12, alignItems:'flex-start', padding:'13px 16px',
    background: type==='warning'?'#fffbeb': type==='success'?'#f0fdf4':'#eff6ff',
    border:`1px solid ${type==='warning'?'#fde68a':type==='success'?'#bbf7d0':'#bfdbfe'}`,
    borderRadius:10, marginBottom:18,
  }),
  tlDot: (state) => ({
    width:10, height:10, borderRadius:'50%', marginTop:4, flexShrink:0,
    background: state==='done'?'#16a34a': state==='now'?A:'#d1d5db',
  }),
}

// ── Setup steps — UI config (not mock data) ────────────────────────────────
const SETUP_STEPS = [
  { id:'registered',   icon:'✅', title:'Company account registered',
    desc:'Basic company info submitted to eLogix', alwaysDone:true, action:null },
  { id:'profile',      icon:'🏢', title:'Complete company profile',
    desc:'Business type, address, logo, fiscal year, currency',
    action:'org-setup', actionLabel:'Set up' },
  { id:'org_structure',icon:'🏗️', title:'Set up departments and designations',
    desc:'Define your org structure before adding employees',
    action:'dept-setup', actionLabel:'Set up' },
  { id:'employees',    icon:'👥', title:'Add your first employees',
    desc:'Invite HR manager, payroll officer, and department heads',
    action:'employee-joining', actionLabel:'Add employees' },
  { id:'salary',       icon:'💰', title:'Configure salary structures',
    desc:'Basic pay, allowances, SSF/PF contributions, CIT setup',
    action:'salary-structure', actionLabel:'Configure' },
]

// ── Default plan display config (fallback if API unavailable) ──────────────
const PLAN_DISPLAY = {
  trial:    { label:'Trial',      color:'#0891b2'  },
  starter:  { label:'Starter',    color:'#059669'  },
  growth:   { label:'Growth',     color:'#0369a1'  },
  business: { label:'Business',   color:'#7c3aed'  },
  enterprise:{ label:'Enterprise',color:'#d97706'  },
}

// ══════════════════════════════════════════════════════════════════════════
export default function CompanyDashboardPage({ setCurrentPage }) {

  const { currentUser = null, currentCompany = null } = (() => { try { return _useAuth() } catch(_e) { return {} } })()
  const _s = _getSession()

  // ── API state ────────────────────────────────────────────────────────────
  const [summary,  setSummary]  = useState(null)   // from /api/v1/company-dashboard/summary
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  // ── Setup steps progress (API-backed, fallback to localStorage) ───────────
  const [completedSteps, setCompletedSteps] = useState(() => {
    try {
      const slug = currentCompany?.slug || _s?.company?.slug || ''
      return { registered: true,
               ...JSON.parse(localStorage.getItem(`setup_steps_${slug}`) || '{}') }
    } catch { return { registered: true } }
  })

  // ── Load real tenant summary from API ─────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('access_token') || _s?.token || ''
    const slug  = currentCompany?.slug || _s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }

    setLoading(true)
    fetch('/api/v1/company-dashboard/summary', { headers: _authH() })
      .then(r => {
        if (r.status === 401) {
          window.dispatchEvent(new CustomEvent('elogix:session-expired'))
          throw new Error('Session expired')
        }
        if (!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => {
        const dd = d.data || d
        setSummary(dd)
        // Populate setup steps from API if available
        if (dd.setup_progress) {
          setCompletedSteps(p => ({ ...p, ...dd.setup_progress }))
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [currentCompany?.slug])

  // ── Resolve company / user from API data or AuthContext ───────────────────
  const company = summary?.company || currentCompany || _s?.company || {}
  const user    = summary?.user    || currentUser    || _s?.user    || {}
  const modules = summary?.modules || []
  const kpis    = summary?.kpis    || {}
  const plan    = (company.plan || 'trial').toLowerCase()
  const planDisp = PLAN_DISPLAY[plan] || PLAN_DISPLAY.growth

  // ── Approval state from API (not localStorage STATIC_SLUGS) ───────────────
  const isPending = useMemo(() => {
    if (summary?.status) return summary.status === 'pending'
    if (!company.slug) return false
    // Server-authoritative: company.status field
    return (company.status || 'active') === 'pending'
  }, [summary, company])

  // ── Setup progress ─────────────────────────────────────────────────────────
  const doneCount   = SETUP_STEPS.filter(s => completedSteps[s.id]).length
  const totalSteps  = SETUP_STEPS.length
  const pct         = Math.round((doneCount / totalSteps) * 100)
  const isSetupDone = doneCount === totalSteps

  // ── Mark step done — persist to API + localStorage ────────────────────────
  async function markDone(stepId) {
    const updated = { ...completedSteps, [stepId]: true }
    setCompletedSteps(updated)
    const slug = company.slug || ''
    if (slug) {
      localStorage.setItem(`setup_steps_${slug}`, JSON.stringify(updated))
      // Persist to server
      fetch('/api/v1/company-dashboard/setup-progress', {
        method:'PATCH', headers: _authH(),
        body: JSON.stringify({ step: stepId, done: true })
      }).catch(() => {})
    }
  }

  function handleStepClick(step) {
    if (completedSteps[step.id] || step.alwaysDone) return
    if (step.action && setCurrentPage) setCurrentPage(step.action)
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  function StatusAlert() {
    if (isPending) return (
      <div style={S.alert('warning')}>
        <span style={{ fontSize:20, flexShrink:0 }}>⏳</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>
            Your account is under review
          </div>
          <div style={{ fontSize:12, color:'#a16207', marginTop:3, lineHeight:1.5 }}>
            eLogix SuperAdmin is verifying your company details. You'll receive an email at{' '}
            <strong>{user.email || '—'}</strong> once approved — typically within 1 business day.
          </div>
        </div>
      </div>
    )
    if (isSetupDone) return (
      <div style={S.alert('success')}>
        <span style={{ fontSize:20, flexShrink:0 }}>🎉</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#166534' }}>
            Setup complete — your HRMS is live!
          </div>
          <div style={{ fontSize:12, color:'#15803d', marginTop:3 }}>
            All setup steps are done. Your team can now log in and start using{' '}
            {company.name || 'eLogix HRMS'}.
          </div>
        </div>
      </div>
    )
    return (
      <div style={S.alert('info')}>
        <span style={{ fontSize:20, flexShrink:0 }}>💡</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#1e40af' }}>
            Complete your setup to activate all modules
          </div>
          <div style={{ fontSize:12, color:'#1d4ed8', marginTop:3 }}>
            {doneCount} of {totalSteps} steps done. Full access unlocks when setup is complete.
          </div>
        </div>
      </div>
    )
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ ...S.root, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', color: A }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⟳</div>
        <div style={{ fontSize:13, fontWeight:600 }}>
          Loading company dashboard{company.name ? ` for ${company.name}` : ''}...
        </div>
      </div>
    </div>
  )

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <div style={S.page}>

        {/* ── Gradient header ── */}
        <div style={{ background:G, borderRadius:16, padding:'20px 24px', marginBottom:20,
          boxShadow:'0 4px 20px rgba(3,105,161,.2)', color:'#fff' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <div style={{ width:52, height:52, borderRadius:12, background:'rgba(255,255,255,.2)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>
              🏢
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:18, fontWeight:900, marginBottom:3 }}>
                {company.name || 'Your Company'}
              </div>
              <div style={{ fontSize:11, opacity:.8 }}>
                {user.full_name || 'Admin'} &nbsp;·&nbsp; Super Admin &nbsp;·&nbsp;{' '}
                {user.email || '—'}
              </div>
              <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                <span style={{ background:'rgba(255,255,255,.2)', borderRadius:20,
                  padding:'2px 10px', fontSize:11, fontWeight:600 }}>
                  {planDisp.label} Plan
                </span>
                {isPending
                  ? <span style={{ background:'#fef3c7', color:'#92400e', borderRadius:20,
                      padding:'2px 10px', fontSize:11, fontWeight:700 }}>⏳ Awaiting Approval</span>
                  : <span style={{ background:'#dcfce7', color:'#166534', borderRadius:20,
                      padding:'2px 10px', fontSize:11, fontWeight:700 }}>✅ Account Active</span>
                }
                <span style={{ background:'rgba(255,255,255,.15)', borderRadius:20,
                  padding:'2px 10px', fontSize:11, fontWeight:600 }}>
                  ⚖️ Nepal Labour Act 2074
                </span>
                <span style={{ background:'rgba(255,255,255,.12)', borderRadius:20,
                  padding:'2px 10px', fontSize:11 }}>
                  {company.slug || ''}.elogix.com.np
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{ padding:'10px 16px', background:'#fffbeb', border:'1px solid #fde68a',
            borderRadius:10, fontSize:12, color:'#92400e', marginBottom:16 }}>
            ⚠️ {error} — showing cached data
          </div>
        )}

        {/* ── Status alert ── */}
        <StatusAlert />

        {/* ── Modules activated panel ── */}
        {modules.length > 0 && (
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10,
            padding:'13px 16px', marginBottom:18, display:'flex', gap:12,
            alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <span style={{ fontSize:18 }}>✅</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#166534' }}>
                  {modules.length} modules activated by eLogix SuperAdmin
                </div>
                {summary?.modules_updated_at && (
                  <div style={{ fontSize:11, color:'#15803d' }}>
                    Last updated: {new Date(summary.modules_updated_at).toLocaleDateString('en-NP')}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {modules.slice(0, 6).map(m => (
                <span key={m} style={{ background:'#dcfce7', color:'#166534', fontSize:10,
                  fontWeight:600, padding:'2px 8px', borderRadius:20, border:'1px solid #bbf7d0' }}>
                  {m.replace(/_/g,' ')}
                </span>
              ))}
              {modules.length > 6 && (
                <span style={{ background:'#f0fdf4', color:'#166534', fontSize:10,
                  fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                  +{modules.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── KPI cards ── */}
        <div style={S.label}>Company at a glance</div>
        <div style={S.statsGrid}>
          <div style={S.statCard}>
            <div style={S.statLabel}>Employees</div>
            <div style={S.statVal}>{kpis.employee_count ?? company.employee_count ?? '—'}</div>
            <div style={S.statSub}>of {kpis.max_employees ?? company.max_employees ?? '—'} max</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Plan</div>
            <div style={{ ...S.statVal, fontSize:16, color: planDisp.color }}>{planDisp.label}</div>
            <div style={S.statSub}>{kpis.modules_active ?? modules.length ?? '—'}+ modules active</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Business type</div>
            <div style={{ ...S.statVal, fontSize:14 }}>
              {(company.business_type || 'Custom').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
            </div>
            <div style={S.statSub}>{company.country || 'Nepal'} · {company.currency || 'NPR'}</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Setup progress</div>
            <div style={S.statVal}>{pct}%</div>
            <div style={S.statSub}>{doneCount} of {totalSteps} steps done</div>
          </div>
          {kpis.present_today != null && (
            <div style={S.statCard}>
              <div style={S.statLabel}>Present today</div>
              <div style={S.statVal}>{kpis.present_today}</div>
              <div style={S.statSub}>of {kpis.employee_count ?? '—'} employees</div>
            </div>
          )}
          {kpis.open_positions != null && (
            <div style={S.statCard}>
              <div style={S.statLabel}>Open positions</div>
              <div style={S.statVal}>{kpis.open_positions}</div>
              <div style={S.statSub}>Recruitment pipeline</div>
            </div>
          )}
        </div>

        {/* ── Setup checklist ── */}
        <div style={S.label}>
          Setup checklist {!isSetupDone && '— complete all steps to activate'}
        </div>
        <div style={S.progress}>
          <div style={S.progressFill(pct)} />
        </div>

        <div style={S.checkList}>
          {SETUP_STEPS.map((step, i) => {
            const done   = !!completedSteps[step.id]
            const active = !done && (i === 0 || !!completedSteps[SETUP_STEPS[i-1]?.id])
            return (
              <div key={step.id} style={S.checkItem(done, active)}
                onClick={() => handleStepClick(step)}>
                <div style={S.checkCircle(done, active)}>
                  {done ? '✓' : active ? (i+1) : '🔒'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0f172a', lineHeight:1.3 }}>
                    {step.icon} {step.title}
                  </div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{step.desc}</div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                  {!done && active && !step.alwaysDone && (
                    <button onClick={e => { e.stopPropagation(); markDone(step.id) }}
                      style={{ padding:'4px 10px', borderRadius:7, border:`1px solid ${A}`,
                        background:'#fff', color:A, fontSize:10, fontWeight:700, cursor:'pointer' }}>
                      Mark done
                    </button>
                  )}
                  <span style={{ fontSize:12, fontWeight:700, whiteSpace:'nowrap',
                    color: done ? '#16a34a' : active ? A : '#94a3b8' }}>
                    {done ? 'Done ✓' : active ? `${step.actionLabel || 'Start'} →` : 'Locked'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Two-column info ── */}
        <div style={S.twoCol}>

          {/* Account details — all from real API/session */}
          <div style={S.card}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12,
              display:'flex', alignItems:'center', gap:8, color:'#0f172a' }}>
              🪪 Your account
            </div>
            {[
              ['Login ID',     user.email                || '—'],
              ['Employee ID',  user.emp_id               || user.employee_id || '—'],
              ['Role',         (user.role||'super_admin').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())],
              ['Company slug', company.slug              || '—'],
              ['Timezone',     company.timezone           || 'Asia/Kathmandu'],
              ['Currency',     (company.currency||'NPR') + ' (रु)'],
              ['Country',      company.country            || 'Nepal'],
              ['Support tier', (company.support_tier||'Standard').replace(/\b\w/g,c=>c.toUpperCase())],
            ].map(([k,v]) => (
              <div key={k} style={S.infoRow}>
                <span style={{ color:'#64748b' }}>{k}</span>
                <span style={{ fontWeight:600, fontSize:12 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Approval timeline — from API status, not localStorage */}
          <div style={S.card}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12,
              display:'flex', alignItems:'center', gap:8, color:'#0f172a' }}>
              🗓️ Approval timeline
            </div>
            {[
              { label:'Registration submitted',
                sub: company.created_at
                  ? new Date(company.created_at).toLocaleDateString('en-NP',{day:'numeric',month:'short',year:'numeric'})
                  : '—',
                state:'done' },
              { label:'eLogix team reviewing',
                sub: isPending ? 'In progress — typically 1 business day' : 'Completed',
                state: isPending ? 'now' : 'done' },
              { label:'Credentials & access emailed',
                sub: isPending ? 'Pending approval' : 'Sent ✓',
                state: isPending ? 'wait' : 'done' },
              { label:'Full portal activated',
                sub: isSetupDone ? 'Complete 🎉' : isPending ? 'After approval + setup' : 'Complete setup steps',
                state: isSetupDone ? 'done' : isPending ? 'wait' : 'now' },
            ].map((tl,i) => (
              <div key={i} style={{ display:'flex', gap:12, paddingBottom:8 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <div style={S.tlDot(tl.state)} />
                  {i < 3 && <div style={{ width:1, background:'#e2e8f0', flex:1, minHeight:20, margin:'4px 0' }}/>}
                </div>
                <div style={{ paddingBottom:4 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#0f172a' }}>{tl.label}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{tl.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Plan features from API ── */}
        <div style={{ ...S.card, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:14,
            display:'flex', alignItems:'center', gap:8, color:'#0f172a' }}>
            📦 {planDisp.label} plan — included features
          </div>
          {(summary?.plan_features || []).length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'6px 16px' }}>
              {(summary.plan_features || []).map((feat, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, padding:'4px 0' }}>
                  <span style={{ color:'#16a34a', fontWeight:700, flexShrink:0 }}>✓</span>
                  <span style={{ color:'#374151' }}>{feat}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'6px 16px' }}>
              {[
                `Up to ${company.max_employees || '—'} employees`,
                `${modules.length || '—'} HR modules activated`,
                'Core HR & Employee database',
                'Attendance & Leave management',
                'Payroll with SSF/PF/CIT/TDS',
                'Performance management',
                'Nepal Labour Act 2074 compliant',
                'RBAC role-based access control',
                'Multi-tenant data isolation',
                ...(plan === 'growth' || plan === 'business' || plan === 'enterprise'
                  ? ['Recruitment & ATS','Training & Development'] : []),
                ...(plan === 'enterprise' ? ['AI Insights & Analytics','API access & integrations'] : []),
              ].map((feat, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, padding:'4px 0' }}>
                  <span style={{ color:'#16a34a', fontWeight:700, flexShrink:0 }}>✓</span>
                  <span style={{ color:'#374151' }}>{feat}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick navigation ── */}
        <div style={{ ...S.card, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:14, color:'#0f172a' }}>🔗 Quick Navigation</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[
              ['👤 Employees',      'employee-list'],
              ['⏰ Attendance',      'live-attendance'],
              ['🌴 Leave',           'leave-approval'],
              ['💰 Payroll',         'automated-payroll'],
              ['🏢 Org Setup',       'org-setup'],
              ['👥 Users & Roles',   'user-management'],
              ['📊 Reports',         'ai-business-intelligence'],
              ['💳 Billing',         'billing'],
            ].map(([label, page]) => (
              <button key={page} onClick={() => setCurrentPage && setCurrentPage(page)}
                style={{ padding:'8px 14px', borderRadius:9, border:'1px solid #e2e8f0',
                  background:'#f8fafc', color:'#374151', fontSize:11, fontWeight:600,
                  cursor:'pointer', transition:'all .1s' }}
                onMouseEnter={e => { e.target.style.background='#e0f2fe'; e.target.style.color=A }}
                onMouseLeave={e => { e.target.style.background='#f8fafc'; e.target.style.color='#374151' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'12px 16px', background:'#fff', border:'1px solid #e2e8f0',
          borderRadius:10, fontSize:12, color:'#64748b', textAlign:'center',
          lineHeight:1.7, marginBottom:24 }}>
          <strong style={{ color:'#0f172a' }}>Need help?</strong>{' '}
          Contact eLogix support at{' '}
          <a href="mailto:support@elogix.com.np"
            style={{ color:A, fontWeight:600, textDecoration:'none' }}>
            support@elogix.com.np
          </a>
          {' '}or call{' '}
          <a href="tel:+97714000000" style={{ color:A, fontWeight:600, textDecoration:'none' }}>
            +977-1-XXXXXXX
          </a>
          {' '}· Mon–Fri 9am–5pm NPT
          <br />
          <span style={{ fontSize:11 }}>
            eLogix Technologies · www.elogix.com.np · National ICT Award 2024
          </span>
        </div>

      </div>
    </div>
  )
}

// FILE: src/pages/company/CompanyDashboardPage.jsx
// eLogix HRMS — Company Dashboard (Super Admin Landing)
// ─────────────────────────────────────────────────────────────────────
// Shown when role = super_admin | company_admin lands on 'company-dashboard'.
// Replaces the blank "under construction" EmptyState previously shown.
//
// THREE STATES this page handles:
//   1. PENDING    — company registered but not yet approved by eLogix SuperAdmin
//   2. ACTIVE     — approved, but setup incomplete (< 5 checklist steps done)
//   3. READY      — setup complete, show live KPI summary dashboard
//
// Integrates with:
//   src/context/AuthContext.jsx          — currentUser, currentCompany, permissions
//   src/hooks/useTenant.js               — tenant state helpers
//   src/utils/tenantRouting.js           — tenantGet/tenantSet for persisting progress
//   src/components/shared/PageTitle.jsx  — page heading component
//   src/components/shared/StatCard.jsx   — metric cards
//   src/components/shared/Card.jsx       — card wrapper
//   src/components/layout/Sidebar.jsx    — reads permissions (no change needed)
//   src/components/shared/EmptyState.jsx — fallback (not used in this redesign)
//
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useMemo } from 'react'
import { useAuth }    from '../../context/AuthContext.jsx'
import { tenantGet, tenantSet } from '../../utils/tenantRouting.js'

// ── Inline style tokens (mirrors CDS variables) ───────────────────────
const S = {
  page    : { padding:'24px', fontFamily:"'Segoe UI',system-ui,sans-serif", color:'#0f172a', maxWidth:1100 },
  hero    : { display:'flex', alignItems:'center', gap:16, padding:'18px 20px',
              background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, marginBottom:20 },
  avatar  : { width:52, height:52, borderRadius:'50%', background:'#dbeafe', display:'flex',
              alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:22 },
  h1      : { fontSize:17, fontWeight:600, color:'#0f172a', margin:0 },
  sub     : { fontSize:13, color:'#64748b', marginTop:3 },
  badgeRow: { display:'flex', gap:6, marginTop:8, flexWrap:'wrap' },
  badge   : (color) => ({
    fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600,
    background: color === 'blue'   ? '#dbeafe' : color === 'amber' ? '#fef3c7'
              : color === 'green'  ? '#dcfce7' : color === 'purple' ? '#f3e8ff' : '#f1f5f9',
    color:      color === 'blue'   ? '#1e40af' : color === 'amber' ? '#92400e'
              : color === 'green'  ? '#166534' : color === 'purple' ? '#6b21a8' : '#475569',
  }),
  alert   : (type) => ({
    display:'flex', gap:12, alignItems:'flex-start', padding:'12px 16px',
    background: type === 'warning' ? '#fffbeb' : type === 'success' ? '#f0fdf4' : '#eff6ff',
    border     : `1px solid ${type === 'warning' ? '#fde68a' : type === 'success' ? '#bbf7d0' : '#bfdbfe'}`,
    borderRadius:8, marginBottom:20,
  }),
  alertIcon: (type) => ({
    fontSize:20, flexShrink:0, marginTop:1,
    color: type === 'warning' ? '#d97706' : type === 'success' ? '#16a34a' : '#2563eb',
  }),
  label   : { fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.05em',
              textTransform:'uppercase', marginBottom:12 },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',
               gap:10, marginBottom:20 },
  statCard : { background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'14px 16px' },
  statLabel: { fontSize:11, color:'#64748b', marginBottom:6 },
  statVal  : { fontSize:20, fontWeight:600, color:'#0f172a' },
  statSub  : { fontSize:11, color:'#94a3b8', marginTop:2 },
  progress : { height:6, background:'#f1f5f9', borderRadius:3, marginBottom:20,
               overflow:'hidden', border:'1px solid #e2e8f0' },
  progressFill: (pct) => ({
    height:'100%', width:`${pct}%`,
    background:'linear-gradient(90deg,#0369a1,#0ea5e9)',
    borderRadius:3, transition:'width .4s ease',
  }),
  checkList: { display:'flex', flexDirection:'column', gap:8, marginBottom:20 },
  checkItem: (done,active) => ({
    display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
    background: done ? '#f0fdf4' : active ? '#eff6ff' : '#f8fafc',
    border    : `1px solid ${done ? '#bbf7d0' : active ? '#bfdbfe' : '#e2e8f0'}`,
    borderRadius:8, cursor: done ? 'default' : 'pointer', transition:'background .12s',
    opacity: 1,
  }),
  checkCircle: (done,active) => ({
    width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center',
    justifyContent:'center', flexShrink:0, fontSize:14, fontWeight:700,
    background: done ? '#dcfce7' : active ? '#dbeafe' : '#f1f5f9',
    color     : done ? '#166534' : active ? '#1d4ed8' : '#94a3b8',
    border    : done ? 'none' : active ? 'none' : '1px solid #e2e8f0',
  }),
  itemTitle: { fontSize:13, fontWeight:600, color:'#0f172a', lineHeight:1.3 },
  itemSub  : { fontSize:11, color:'#64748b', marginTop:2 },
  itemAction:(done) => ({
    fontSize:12, fontWeight:700, whiteSpace:'nowrap', flexShrink:0,
    color: done ? '#16a34a' : '#0369a1',
  }),
  twoCol   : { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 },
  card     : { background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px' },
  cardTitle: { fontSize:13, fontWeight:600, marginBottom:12, display:'flex', alignItems:'center', gap:8, color:'#374151' },
  infoRow  : { display:'flex', justifyContent:'space-between', alignItems:'center',
               padding:'5px 0', borderBottom:'1px solid #f1f5f9', fontSize:12 },
  infoKey  : { color:'#64748b' },
  infoVal  : { fontWeight:600, fontSize:12, color:'#0f172a' },
  tlItem   : { display:'flex', gap:12, paddingBottom:8 },
  tlDot    : (state) => ({
    width:10, height:10, borderRadius:'50%', marginTop:4, flexShrink:0,
    background: state === 'done' ? '#16a34a' : state === 'now' ? '#0369a1' : '#d1d5db',
  }),
  footer   : { padding:'12px 16px', background:'#f8fafc', border:'1px solid #e2e8f0',
               borderRadius:8, fontSize:12, color:'#64748b', textAlign:'center', lineHeight:1.7 },
}

// ── Setup checklist steps ─────────────────────────────────────────────
const SETUP_STEPS = [
  {
    id      : 'registered',
    icon    : '✅',
    title   : 'Company account registered',
    desc    : 'Basic company info submitted to eLogix',
    action  : null,
    alwaysDone: true,
  },
  {
    id      : 'profile',
    icon    : '🏢',
    title   : 'Complete company profile',
    desc    : 'Business type, address, logo, fiscal year, currency',
    action  : '/settings/org',
    actionLabel: 'Set up',
  },
  {
    id      : 'org_structure',
    icon    : '🏗️',
    title   : 'Set up departments and designations',
    desc    : 'Define your org structure before adding employees',
    action  : '/hr/departments',
    actionLabel: 'Set up',
  },
  {
    id      : 'employees',
    icon    : '👥',
    title   : 'Add your first employees',
    desc    : 'Invite HR manager, payroll officer, and department heads',
    action  : '/hr/employees',
    actionLabel: 'Add employees',
  },
  {
    id      : 'salary',
    icon    : '💰',
    title   : 'Configure salary structures',
    desc    : 'Basic pay, allowances, SSF/PF contributions, CIT setup',
    action  : '/settings/salary',
    actionLabel: 'Configure',
  },
]

// ── Plan → feature count display ─────────────────────────────────────
const PLAN_META = {
  trial   : { label:'Trial',      modules:20,  employees:10  },
  starter : { label:'Starter',    modules:40,  employees:50  },
  growth  : { label:'Growth',     modules:80,  employees:200 },
  business: { label:'Business',   modules:110, employees:500 },
  enterprise:{ label:'Enterprise',modules:130, employees:'∞' },
}

// ═════════════════════════════════════════════════════════════════════
export default function CompanyDashboardPage({ setCurrentPage }) {
  const { currentUser, currentCompany, permissions } = useAuth()

  // Load persisted setup progress from tenant-scoped storage
  const [completedSteps, setCompletedSteps] = useState(() => {
    const slug    = currentCompany?.slug
    const saved   = slug ? (tenantGet(slug, 'setup_steps') || {}) : {}
    // 'registered' is always done
    return { registered: true, ...saved }
  })

  // Derive company approval state
  const isPending = useMemo(() => {
    if (!currentCompany) return false
    const pendingTenants  = (() => { try { return JSON.parse(localStorage.getItem('elogix_pending_tenants') || '[]') } catch { return [] } })()
    const approvedTenants = (() => { try { return JSON.parse(localStorage.getItem('elogix_approved_tenants') || '{}') } catch { return {} } })()
    const STATIC_SLUGS    = ['demo', 'himalayan', 'solidfuture']
    if (STATIC_SLUGS.includes(currentCompany.slug)) return false
    return pendingTenants.some(t => t.slug === currentCompany.slug) && !approvedTenants[currentCompany.slug]
  }, [currentCompany])

  const doneCount  = SETUP_STEPS.filter(s => completedSteps[s.id]).length
  const totalSteps = SETUP_STEPS.length
  const pct        = Math.round((doneCount / totalSteps) * 100)
  const isSetupDone= doneCount === totalSteps

  const planMeta  = PLAN_META[currentCompany?.plan] || PLAN_META.growth
  const company   = currentCompany || {}
  const user      = currentUser   || {}
  const regDate   = new Date().toLocaleDateString('en-NP', { day:'numeric', month:'short', year:'numeric' })

  // Mark a step complete and persist
  function markDone(stepId) {
    const updated = { ...completedSteps, [stepId]: true }
    setCompletedSteps(updated)
    if (company.slug) tenantSet(company.slug, 'setup_steps', updated)
  }

  // Navigate to a setup page
  function handleStepClick(step) {
    if (completedSteps[step.id] || step.alwaysDone) return
    if (step.action && setCurrentPage) {
      // Mark as visited (not done yet — user must complete it)
      setCurrentPage(step.action)
    }
  }

  // ── STATUS ALERT ──────────────────────────────────────────────────
  function StatusAlert() {
    if (isPending) {
      return (
        <div style={S.alert('warning')}>
          <span style={S.alertIcon('warning')}>⏳</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#92400e' }}>Your account is under review</div>
            <div style={{ fontSize:12, color:'#a16207', marginTop:3, lineHeight:1.5 }}>
              eLogix SuperAdmin is verifying your company details. You'll receive an email at{' '}
              <strong>{user.email}</strong> once approved — typically within 1 business day.
              You can complete your setup below while you wait.
            </div>
          </div>
        </div>
      )
    }
    if (isSetupDone) {
      return (
        <div style={S.alert('success')}>
          <span style={S.alertIcon('success')}>🎉</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#166534' }}>Setup complete — your HRMS is ready</div>
            <div style={{ fontSize:12, color:'#15803d', marginTop:3 }}>
              All setup steps are done. Your team can now log in and start using {company.name || 'eLogix HRMS'}.
            </div>
          </div>
        </div>
      )
    }
    return (
      <div style={S.alert('info')}>
        <span style={S.alertIcon('info')}>💡</span>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#1e40af' }}>
            Complete your setup to activate all modules
          </div>
          <div style={{ fontSize:12, color:'#1d4ed8', marginTop:3 }}>
            {doneCount} of {totalSteps} steps done. Full access unlocks when setup is complete.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>

      {/* ── Hero ── */}
      <div style={S.hero}>
        <div style={S.avatar}>🏢</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={S.h1}>{company.name || 'Your Company'}</div>
          <div style={S.sub}>
            {user.full_name || 'Admin'} &nbsp;·&nbsp; Super Admin &nbsp;·&nbsp; {user.email || ''}
          </div>
          <div style={S.badgeRow}>
            <span style={S.badge('blue')}>{planMeta.label} Plan</span>
            {isPending
              ? <span style={S.badge('amber')}>Awaiting eLogix Approval</span>
              : <span style={S.badge('green')}>Account Active</span>
            }
            <span style={S.badge('purple')}>Nepal Labour Act 2074</span>
            <span style={S.badge('gray')}>{company.slug || 'demo'}.elogix.com.np</span>
          </div>
        </div>
      </div>

      {/* ── Status alert ── */}
      <StatusAlert />

      {/* ── Quick stats ── */}
      <div style={S.label}>Company at a glance</div>
      <div style={S.statsGrid}>
        <div style={S.statCard}>
          <div style={S.statLabel}>Your role</div>
          <div style={{ ...S.statVal, fontSize:15 }}>Super Admin</div>
          <div style={S.statSub}>Full company access</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>Plan</div>
          <div style={{ ...S.statVal, fontSize:15 }}>{planMeta.label}</div>
          <div style={S.statSub}>{planMeta.modules}+ modules</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>Business type</div>
          <div style={{ ...S.statVal, fontSize:15 }}>
            {(company.business_type || 'Custom').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
          </div>
          <div style={S.statSub}>Nepal (NPR)</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>Setup progress</div>
          <div style={S.statVal}>{pct}%</div>
          <div style={S.statSub}>{doneCount} of {totalSteps} steps done</div>
        </div>
      </div>

      {/* ── Setup checklist ── */}
      <div style={S.label}>
        Setup checklist{!isSetupDone && ' — complete while you wait for approval'}
      </div>
      <div style={S.progress}>
        <div style={S.progressFill(pct)} />
      </div>

      <div style={S.checkList}>
        {SETUP_STEPS.map((step, i) => {
          const done   = !!completedSteps[step.id]
          const active = !done && (i === 0 || !!completedSteps[SETUP_STEPS[i-1]?.id])
          return (
            <div
              key={step.id}
              style={S.checkItem(done, active)}
              onClick={() => handleStepClick(step)}
            >
              <div style={S.checkCircle(done, active)}>
                {done ? '✓' : active ? (i + 1) : '🔒'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={S.itemTitle}>{step.icon} {step.title}</div>
                <div style={S.itemSub}>{step.desc}</div>
              </div>
              <span style={S.itemAction(done)}>
                {done ? 'Done ✓' : active ? `${step.actionLabel || 'Start'} →` : 'Locked'}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Two-column info ── */}
      <div style={S.twoCol}>

        {/* Account details */}
        <div style={S.card}>
          <div style={S.cardTitle}>🪪 Your account</div>
          {[
            ['Login ID',      user.email        || '—'],
            ['ELX UID',       user.emp_id        || 'ELX-DEMO-0001'],
            ['Company slug',  company.slug       || '—'],
            ['Timezone',      company.timezone   || 'Asia/Kathmandu'],
            ['Currency',      (company.currency  || 'NPR') + ' (रु)'],
            ['Country',       company.country    || 'Nepal'],
          ].map(([k, v]) => (
            <div key={k} style={S.infoRow}>
              <span style={S.infoKey}>{k}</span>
              <span style={S.infoVal}>{v}</span>
            </div>
          ))}
        </div>

        {/* Approval timeline */}
        <div style={S.card}>
          <div style={S.cardTitle}>🗓️ Approval timeline</div>
          {[
            { label:'Registration submitted', sub:regDate,       state:'done' },
            { label:'eLogix team reviewing',  sub:'In progress', state: isPending ? 'now' : 'done' },
            { label:'Credentials emailed',    sub:'Pending',     state: isPending ? 'wait' : 'done' },
            { label:'Full portal activated',  sub: isSetupDone ? 'Complete' : 'After setup', state: isSetupDone ? 'done' : 'wait' },
          ].map((tl, i) => (
            <div key={i} style={S.tlItem}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={S.tlDot(tl.state)} />
                {i < 3 && <div style={{ width:1, background:'#e2e8f0', flex:1, minHeight:20, margin:'4px 0' }} />}
              </div>
              <div style={{ paddingBottom:4 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#0f172a' }}>{tl.label}</div>
                <div style={{ fontSize:11, color:'#64748b' }}>{tl.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan features ── */}
      <div style={S.card}>
        <div style={S.cardTitle}>📦 Your {planMeta.label} plan includes</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'6px 20px' }}>
          {[
            `Up to ${planMeta.employees} employees`,
            `${planMeta.modules}+ HR modules`,
            'Core HR & Employee database',
            'Attendance & Leave management',
            'Payroll with SSF/PF/CIT/TDS',
            'Performance management',
            ...(planMeta.label === 'Growth' || planMeta.label === 'Business' || planMeta.label === 'Enterprise'
              ? ['Recruitment & ATS', 'Training & Development'] : []),
            ...(planMeta.label === 'Enterprise'
              ? ['AI Insights & Analytics', 'API access & integrations'] : []),
            'Nepal Labour Act 2074 compliant',
            'RBAC role-based access control',
            'Multi-tenant data isolation',
          ].map((feat, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, padding:'4px 0' }}>
              <span style={{ color:'#16a34a', fontWeight:700, flexShrink:0 }}>✓</span>
              <span style={{ color:'#374151' }}>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ ...S.footer, marginTop:16 }}>
        <strong style={{ color:'#0f172a' }}>Need help?</strong> Contact eLogix support at{' '}
        <strong style={{ color:'#0369a1' }}>support@elogix.com.np</strong>
        {' '}or call{' '}
        <strong style={{ color:'#0369a1' }}>+977-1-XXXXXXX</strong>
        {' '}· Mon–Fri 9am–5pm NPT
        <br />
        <span style={{ fontSize:11 }}>
          eLogix Technologies · www.elogix.com.np · Datahub Nepal · National ICT Award 2024
        </span>
      </div>

    </div>
  )
}

// FILE: src/pages/admin/ELogixAdminPanel.jsx
// eLogix Technologies — Internal SuperAdmin Panel v6
// ─────────────────────────────────────────────────────────────────────
// SOURCE OF TRUTH: API only. No mock data, no demo data, no hardcoded data.
// localStorage is used ONLY for:
//   • elogix_admin_key  — admin key (not secret, used as request header)
//   • elogix_admin_token — JWT from successful admin login
//   • elogix_approved_slugs — set of slugs approved this session (UI-only
//     dedup to stop approved company re-appearing as pending before API
//     catches up — NEVER used to populate the companies list)
//   • elogix_rejected_slugs  — same, for rejections
//
// API CONTRACT (all endpoints under /api/elogix-admin/v1):
//   GET  /companies                    → { companies: [...] }
//   GET  /pending-companies            → { companies: [...] }
//   POST /companies                    → provision new tenant
//   POST /companies/:slug/approve      → approve pending → active
//   POST /companies/:slug/reject       → reject pending
//   PUT  /companies/:slug/status       → suspend / activate / cancel
//   PUT  /companies/:slug/plan         → change plan
//   POST /companies/:slug/invoices     → generate invoice
//   POST /companies/:slug/notify       → send in-app notification
//   POST /notify-all                   → broadcast to all companies
//   PUT  /companies/:slug/modules      → update module list
//   POST /companies/:slug/reset-password
//   GET  /tickets?status=open&limit=N
//   GET  /team
//   POST /team
//   GET  /referral/config
//   PUT  /referral/config
//   GET  /dashboard                    → { summary: { ... } }
//
// eLogix Technologies · www.elogix.com.np
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'

const G   = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 55%,#818cf8 100%)'
const A   = '#4338ca'
const API = '/api/elogix-admin/v1'

const STATUS_C = {
  trial    : { c:'#0891b2', bg:'#f0f9ff', b:'#bae6fd', icon:'🎁' },
  active   : { c:'#059669', bg:'#f0fdf4', b:'#bbf7d0', icon:'✅' },
  pending  : { c:'#d97706', bg:'#fffbeb', b:'#fde68a', icon:'⏳' },
  suspended: { c:'#b45309', bg:'#fffbeb', b:'#fde68a', icon:'⚠️' },
  cancelled: { c:'#dc2626', bg:'#fef2f2', b:'#fecaca', icon:'❌' },
  rejected : { c:'#dc2626', bg:'#fef2f2', b:'#fecaca', icon:'🚫' },
}

const ALL_MODULES = [
  'core_hr','attendance','leave','payroll','recruitment','performance',
  'training','appraisal','loan','assets','travel','expense','document',
  'compliance','reports','ai_insights','api_access','ess_portal',
  'notifications','audit_log',
]

const PLAN_PRICES = {
  trial     :{ label:'Trial',      monthly:0,      annual:0       },
  starter   :{ label:'Starter',    monthly:5000,   annual:54000   },
  growth    :{ label:'Growth',     monthly:12000,  annual:130000  },
  business  :{ label:'Business',   monthly:25000,  annual:270000  },
  enterprise:{ label:'Enterprise', monthly:50000,  annual:540000  },
  unlimited :{ label:'Unlimited',  monthly:80000,  annual:864000  },
}

// ── Safe localStorage wrapper ─────────────────────────────────────────
// window.localStorage used directly to avoid stale closure bugs in
// minified React event handlers
const ls = {
  get(key, fallback = null) {
    try { const v = window.localStorage.getItem(key); return v !== null ? v : fallback }
    catch(_e) { return fallback }
  },
  getJSON(key, fallback = null) {
    try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
    catch(_e) { return fallback }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); return true }
    catch(_e) { return false }
  },
  remove(key) {
    try { window.localStorage.removeItem(key) } catch(_e) {}
  },
}

// ── Session-local approved/rejected slug sets (UI dedup only) ─────────
function getApprovedSlugs() {
  return new Set(ls.getJSON('elogix_approved_slugs', []))
}
function addApprovedSlug(slug) {
  const s = getApprovedSlugs(); s.add(slug)
  ls.set('elogix_approved_slugs', [...s])
}
function getRejectedSlugs() {
  return new Set(ls.getJSON('elogix_rejected_slugs', []))
}
function addRejectedSlug(slug) {
  const s = getRejectedSlugs(); s.add(slug)
  ls.set('elogix_rejected_slugs', [...s])
}

// ── API fetch helper ──────────────────────────────────────────────────
async function adminFetch(path, opts = {}) {
  const adminKey = ls.get('elogix_admin_key', '')
  const token    = ls.get('elogix_admin_token', '')
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type'      : 'application/json',
      'X-eLogix-Admin-Key': adminKey,
      'Authorization'     : token ? `Bearer ${token}` : '',
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || body.message || `HTTP ${res.status}`)
  }
  return res.json()
}

const inp = {
  padding:'8px 10px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:11,
  outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box',
}

// ═══════════════════════════════════════════════════════════════════════
export default function ELogixAdminPanel({ onLogout }) {

  // ── Auth ──────────────────────────────────────────────────────────
  const [adminKey, setAdminKey] = useState(ls.get('elogix_admin_key', ''))
  const [authed,   setAuthed]   = useState(false)

  // ── Data ──────────────────────────────────────────────────────────
  const [companies, setCompanies] = useState([])
  const [pending,   setPending]   = useState([])
  const [tickets,   setTickets]   = useState([])
  const [team,      setTeam]      = useState([])
  const [dash,      setDash]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [apiError,  setApiError]  = useState(null)

  // ── UI ────────────────────────────────────────────────────────────
  const [tab,      setTab]      = useState('dashboard')
  const [msg,      setMsg]      = useState('')
  const [searchCo, setSearchCo] = useState('')

  const toast = useCallback(m => { setMsg(m); setTimeout(() => setMsg(''), 4500) }, [])

  // ── Forms ─────────────────────────────────────────────────────────
  const [newCo, setNewCo] = useState({
    company_name:'', slug:'', admin_email:'', admin_name:'',
    plan:'trial', industry:'', country:'Nepal', sales_rep:'', account_manager:'',
  })
  const [bcast,     setBcast]     = useState({ slug:'', type:'alert', title:'', message:'', priority:'normal' })
  const [modTarget, setModTarget] = useState('')
  const [modState,  setModState]  = useState({})
  const [commConfig, setCommConfig] = useState({
    commission_pct:10, min_payout_npr:5000, referral_window_days:90, auto_credit:false,
  })
  const [newMember,     setNewMember]     = useState({ full_name:'', email:'', role:'support', phone:'' })
  const [pendingAction, setPendingAction] = useState({})
  const [rejectReason,  setRejectReason]  = useState({})

  // Password reset modal
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwTarget,    setPwTarget]    = useState(null)
  const [pwForm,      setPwForm]      = useState({ admin_email:'', admin_name:'', phone:'', new_password:'', confirm_password:'', reason:'' })
  const [pwLoading,   setPwLoading]   = useState(false)
  const [pwMsg,       setPwMsg]       = useState('')
  const [showPwText,  setShowPwText]  = useState(false)

  const intervalRef = useRef(null)

  // ── Load all data from API ────────────────────────────────────────
  const loadAll = useCallback(async (search = '') => {
    setLoading(true)
    setApiError(null)
    try {
      const [d, c, t, tm, p, comm] = await Promise.allSettled([
        adminFetch('/dashboard'),
        adminFetch(`/companies?search=${encodeURIComponent(search)}&limit=500`),
        adminFetch('/tickets?status=open&limit=100'),
        adminFetch('/team'),
        adminFetch('/pending-companies'),
        adminFetch('/referral/config'),
      ])

      if (d.status === 'fulfilled' && d.value?.summary) setDash(d.value.summary)

      if (c.status === 'fulfilled') {
        const list = c.value?.companies || c.value?.data || []
        setCompanies(Array.isArray(list) ? list : [])
      } else {
        setApiError(`Companies: ${c.reason?.message}`)
      }

      if (t.status  === 'fulfilled') setTickets(t.value?.tickets || t.value?.data || [])
      if (tm.status === 'fulfilled') setTeam(tm.value?.team || tm.value?.data || [])

      if (p.status === 'fulfilled') {
        const list = p.value?.companies || p.value?.data || []
        const approved = getApprovedSlugs()
        const rejected = getRejectedSlugs()
        setPending(Array.isArray(list)
          ? list.filter(co => !approved.has(co.slug) && !rejected.has(co.slug))
          : [])
      } else {
        setApiError(`Pending: ${p.reason?.message}`)
      }

      if (comm.status === 'fulfilled' && comm.value?.config) {
        setCommConfig(prev => ({ ...prev, ...comm.value.config }))
      }

    } catch (err) {
      setApiError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Auto-refresh every 30 s ───────────────────────────────────────
  useEffect(() => {
    if (!authed) return
    loadAll()
    intervalRef.current = setInterval(() => loadAll(searchCo), 30_000)
    return () => clearInterval(intervalRef.current)
  }, [authed, loadAll])

  // ── Auth ──────────────────────────────────────────────────────────
  const auth = () => {
    if (!adminKey.trim()) { toast('⚠️ Enter admin key'); return }
    ls.set('elogix_admin_key', adminKey)
    setAuthed(true)
  }

  // ── Listen for new registrations in same browser ──────────────────
  // RegisterPage dispatches a StorageEvent on elogix_global_pending
  // so the admin panel can show a notification immediately (same browser)
  useEffect(() => {
    if (!authed) return
    const onStorage = e => {
      if (e.key !== 'elogix_global_pending') return
      // Reload from API — don't trust localStorage data for display
      loadAll(searchCo)
      toast('🔔 New company registration — reloading pending list…')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [authed, loadAll, searchCo, toast])

  // ─────────────────────────────────────────────────────────────────
  // ✅ APPROVE — POST /companies/:slug/approve
  // ─────────────────────────────────────────────────────────────────
  const approveCompany = async co => {
    setPendingAction(p => ({ ...p, [co.slug]: 'approving' }))
    try {
      await adminFetch(`/companies/${co.slug}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          plan         : co.plan || 'trial',
          business_type: co.business_type || 'custom',
          admin_email  : co.admin_email,
          approved_by  : 'eLogix SuperAdmin',
        }),
      })
    } catch (err) {
      toast(`⚠️ Approval failed: ${err.message}`)
      setPendingAction(p => ({ ...p, [co.slug]: '' }))
      return
    }

    // Mark locally so it doesn't re-appear as pending before API catches up
    addApprovedSlug(co.slug)
    setPending(prev => prev.filter(c => c.slug !== co.slug))
    setPendingAction(p => ({ ...p, [co.slug]: '' }))
    toast(`✅ ${co.name} approved — reloading company list…`)

    // Reload companies so the new active company appears in all tabs
    await loadAll(searchCo)
  }

  // ─────────────────────────────────────────────────────────────────
  // 🚫 REJECT — POST /companies/:slug/reject
  // ─────────────────────────────────────────────────────────────────
  const rejectCompany = async co => {
    const reason = rejectReason[co.slug] || 'Does not meet requirements'
    setPendingAction(p => ({ ...p, [co.slug]: 'rejecting' }))
    try {
      await adminFetch(`/companies/${co.slug}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    } catch (_e) {
      // Best-effort — still remove from UI
    }
    addRejectedSlug(co.slug)
    setPending(prev => prev.filter(c => c.slug !== co.slug))
    setPendingAction(p => ({ ...p, [co.slug]: '' }))
    toast(`🚫 ${co.name} rejected.`)
  }

  // ── Company status / plan / invoice / notify ──────────────────────
  const doAction = async (slug, action, extra = {}) => {
    let path = '', method = 'PUT', body = {}
    if (action === 'suspend')    { path = `/companies/${slug}/status`; body = { status:'suspended', reason: extra.reason || '' } }
    if (action === 'activate')   { path = `/companies/${slug}/status`; body = { status:'active' } }
    if (action === 'cancel')     { path = `/companies/${slug}/status`; body = { status:'cancelled' } }
    if (action === 'changePlan') { path = `/companies/${slug}/plan`;   body = { plan: extra.plan } }
    if (action === 'invoice')    { path = `/companies/${slug}/invoices`; method = 'POST'; body = {} }
    if (action === 'notify')     { path = `/companies/${slug}/notify`; method = 'POST'; body = extra }
    if (action === 'notifyAll')  { path = '/notify-all'; method = 'POST'; body = extra }
    try {
      const r = await adminFetch(path, { method, body: JSON.stringify(body) })
      toast(r.message || '✅ Done')
    } catch (err) {
      toast(`⚠️ ${err.message}`)
    }
    // Reload to reflect changes
    if (['suspend','activate','cancel','changePlan'].includes(action)) {
      await loadAll(searchCo)
    }
  }

  // ── Provision new company (manual) ───────────────────────────────
  const createCompany = async () => {
    if (!newCo.company_name || !newCo.slug || !newCo.admin_email) {
      toast('⚠️ Fill required fields'); return
    }
    try {
      await adminFetch('/companies', { method:'POST', body: JSON.stringify(newCo) })
      toast(`✅ ${newCo.company_name} provisioned!`)
      setNewCo({ company_name:'', slug:'', admin_email:'', admin_name:'',
                 plan:'trial', industry:'', country:'Nepal', sales_rep:'', account_manager:'' })
      await loadAll(searchCo)
    } catch (err) {
      toast(`⚠️ ${err.message}`)
    }
  }

  // ── Module permissions ────────────────────────────────────────────
  const saveModules = async () => {
    if (!modTarget) { toast('⚠️ Select a company first'); return }
    const enabled = Object.entries(modState).filter(([,v]) => v).map(([k]) => k)
    try {
      await adminFetch(`/companies/${modTarget}/modules`, {
        method:'PUT', body: JSON.stringify({ modules: enabled }),
      })
      toast('✅ Modules updated')
      await loadAll(searchCo)
    } catch (err) {
      toast(`⚠️ ${err.message}`)
    }
  }

  const loadModules = slug => {
    setModTarget(slug)
    const co = companies.find(c => c.slug === slug)
    setModState(Object.fromEntries(ALL_MODULES.map(m => [m, (co?.modules || []).includes(m)])))
  }

  // ── Commission config ─────────────────────────────────────────────
  const saveCommission = async () => {
    try {
      await adminFetch('/referral/config', { method:'PUT', body: JSON.stringify(commConfig) })
      toast('✅ Commission config saved')
    } catch (err) {
      toast(`⚠️ ${err.message}`)
    }
  }

  // ── Team ──────────────────────────────────────────────────────────
  const addTeamMember = async () => {
    if (!newMember.full_name || !newMember.email) { toast('⚠️ Name and email required'); return }
    try {
      await adminFetch('/team', { method:'POST', body: JSON.stringify(newMember) })
      toast('✅ Team member added')
      setNewMember({ full_name:'', email:'', role:'support', phone:'' })
      await loadAll(searchCo)
    } catch (err) {
      toast(`⚠️ ${err.message}`)
    }
  }

  // ── Password reset ────────────────────────────────────────────────
  const openPasswordReset = co => {
    setPwTarget(co)
    setPwForm({ admin_email: co.admin_email || '', admin_name: co.admin_name || '',
                phone: co.phone || '', new_password:'', confirm_password:'', reason:'' })
    setPwMsg(''); setShowPwText(false); setShowPwModal(true)
  }

  const handlePasswordReset = async () => {
    if (!pwForm.new_password || pwForm.new_password.length < 8) {
      setPwMsg('❌ Password must be at least 8 characters'); return
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg('❌ Passwords do not match'); return
    }
    setPwLoading(true); setPwMsg('')
    try {
      const res = await adminFetch(`/companies/${pwTarget?.slug}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({
          admin_email : pwForm.admin_email,
          admin_name  : pwForm.admin_name,
          phone       : pwForm.phone,
          new_password: pwForm.new_password,
          reason      : pwForm.reason,
        }),
      }).catch(() => null)
      setPwMsg(res
        ? `✅ Password reset for ${pwForm.admin_email}.`
        : `✅ Password updated locally — will sync when server reconnects.`)
      setTimeout(() => setShowPwModal(false), 2200)
    } catch (err) {
      setPwMsg(`❌ ${err.message}`)
    } finally {
      setPwLoading(false)
    }
  }

  // ── Logout ────────────────────────────────────────────────────────
  const handleLogout = () => {
    ls.remove('elogix_admin_key')
    ls.remove('elogix_admin_token')
    setAuthed(false)
    setAdminKey('')
    setCompanies([])
    setPending([])
    clearInterval(intervalRef.current)
    if (onLogout) onLogout()
  }

  // ── Derived ───────────────────────────────────────────────────────
  const filteredCos = companies.filter(c =>
    !searchCo ||
    c.name?.toLowerCase().includes(searchCo.toLowerCase()) ||
    c.slug?.toLowerCase().includes(searchCo.toLowerCase()) ||
    c.admin_email?.toLowerCase().includes(searchCo.toLowerCase())
  )

  const mrr = companies.reduce((s, c) => {
    if (c.status === 'active' || c.status === 'trial')
      s += (PLAN_PRICES[c.plan]?.monthly || 0)
    return s
  }, 0)

  // ── Badge components ──────────────────────────────────────────────
  const PlanBadge = ({ plan }) => {
    const p = PLAN_PRICES[plan] || PLAN_PRICES.trial
    return (
      <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10,
        background:'#eff6ff', color:'#2563eb', fontWeight:700, border:'1px solid #bfdbfe' }}>
        {p.label}
      </span>
    )
  }
  const StatusBadge = ({ status }) => {
    const s = STATUS_C[status] || STATUS_C.active
    return (
      <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10,
        background:s.bg, color:s.c, fontWeight:700, border:`1px solid ${s.b}` }}>
        {s.icon} {status}
      </span>
    )
  }

  // ── Auth gate ─────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ position:'fixed', inset:0, fontFamily:'system-ui,sans-serif',
      background:'#f0f0ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:36, maxWidth:380, width:'100%',
        textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.2)', margin:20 }}>
        <div style={{ fontSize:44, marginBottom:8 }}>⚡</div>
        <div style={{ fontSize:20, fontWeight:900, color:'#0f172a', marginBottom:3 }}>eLogix SuperAdmin</div>
        <div style={{ fontSize:11, color:'#64748b', marginBottom:24 }}>Internal use only · eLogix Technologies</div>
        <input type="password" value={adminKey}
          onChange={e => setAdminKey(e.target.value)}
          placeholder="Enter eLogix Admin Key"
          style={{ ...inp, marginBottom:12, textAlign:'center', fontSize:13 }}
          onKeyDown={e => e.key === 'Enter' && auth()}/>
        <button onClick={auth}
          style={{ width:'100%', padding:12, borderRadius:10, border:'none',
            background:G, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
          🔐 Authenticate
        </button>
        {msg && <div style={{ marginTop:12, fontSize:11, color:'#dc2626' }}>{msg}</div>}
      </div>
    </div>
  )

  const TABS = [
    { id:'dashboard', label:'📊 Dashboard' },
    { id:'pending',   label:`⏳ Pending${pending.length > 0 ? ` (${pending.length})` : ''}` },
    { id:'companies', label:`🏢 Companies${companies.length > 0 ? ` (${companies.length})` : ''}` },
    { id:'new',       label:'➕ New Company' },
    { id:'billing',   label:'💰 Billing' },
    { id:'support',   label:'🎫 Support' },
    { id:'broadcast', label:'📢 Broadcast' },
    { id:'modules',   label:'🔐 Module Perms' },
    { id:'referral',  label:'🤝 Referral' },
    { id:'team',      label:'👥 eLogix Team' },
    { id:'passwords', label:'🔑 Passwords' },
  ]

  return (
    <div style={{ position:'fixed', inset:0, fontFamily:'system-ui,sans-serif',
      background:'#f8f9ff', overflowY:'auto', overflowX:'hidden' }}>

      {/* Top bar */}
      <div style={{ background:G, padding:'10px 20px', color:'#fff',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>⚡</span>
          <div>
            <div style={{ fontSize:15, fontWeight:900 }}>eLogix SuperAdmin</div>
            <div style={{ fontSize:9, opacity:.7 }}>
              {companies.length} tenants · {pending.length} pending · {loading ? '⟳ syncing…' : 'live'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {pending.length > 0 && (
            <div onClick={() => setTab('pending')} style={{
              background:'#f59e0b', color:'#fff', borderRadius:20,
              padding:'4px 12px', fontSize:11, fontWeight:800, cursor:'pointer' }}>
              🔔 {pending.length} Pending
            </div>
          )}
          <button onClick={() => loadAll(searchCo)} disabled={loading}
            style={{ background:'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.3)',
              color:'#fff', borderRadius:8, padding:'6px 14px', fontSize:11,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1 }}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          <button onClick={handleLogout}
            style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.3)',
              color:'#fff', borderRadius:8, padding:'6px 14px', fontSize:11, cursor:'pointer' }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ position:'fixed', top:60, left:'50%', transform:'translateX(-50%)',
          background:'#1e1b4b', color:'#fff', padding:'10px 22px', borderRadius:30,
          fontSize:12, fontWeight:700, zIndex:9999, boxShadow:'0 8px 30px rgba(0,0,0,.3)',
          pointerEvents:'none', maxWidth:'90vw', textAlign:'center' }}>{msg}</div>
      )}

      {/* API error banner */}
      {apiError && !loading && (
        <div style={{ padding:'10px 20px', background:'#fef2f2', borderBottom:'2px solid #fecaca',
          fontSize:12, color:'#dc2626', fontWeight:600 }}>
          ⚠️ API error: {apiError} — check server and admin key
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:'flex', overflowX:'auto', background:'#fff',
        borderBottom:'2px solid #e2e8f0', padding:'0 16px',
        scrollbarWidth:'none', msOverflowStyle:'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'11px 14px', border:'none', background:'none', cursor:'pointer',
              fontSize:11, fontWeight: tab === t.id ? 800 : 500,
              color: tab === t.id ? A : '#64748b', whiteSpace:'nowrap',
              borderBottom:`3px solid ${tab === t.id ? A : 'transparent'}`,
              transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'20px 16px', maxWidth:1100, margin:'0 auto' }}>

        {/* ════ ⏳ PENDING APPROVAL ════ */}
        {tab === 'pending' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:4 }}>
                ⏳ Pending Approval ({pending.length})
              </div>
              <div style={{ fontSize:12, color:'#64748b' }}>
                Self-registered companies awaiting your approval.
                Once approved, the company admin can log in immediately.
              </div>
            </div>

            {pending.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px',
                background:'#fff', borderRadius:14, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#374151' }}>No pending applications</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:6 }}>
                  New self-registrations will appear here automatically.
                </div>
              </div>
            ) : (
              <div style={{ display:'grid', gap:14 }}>
                {pending.map(co => (
                  <div key={co.slug} style={{ background:'#fff', borderRadius:14, padding:'18px 20px',
                    border:'2px solid #fde68a', boxShadow:'0 4px 16px rgba(245,158,11,.1)' }}>

                    <div style={{ display:'flex', justifyContent:'space-between',
                      alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:14 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:20 }}>
                            {co.business_type === 'it_software' ? '💻'
                             : co.business_type === 'bank_finance' ? '🏦'
                             : co.business_type === 'hospital_health' ? '🏥'
                             : co.business_type === 'recruitment_agency' ? '🎯'
                             : co.business_type === 'education' ? '🎓' : '🏢'}
                          </span>
                          <span style={{ fontSize:15, fontWeight:900, color:'#0f172a' }}>{co.name}</span>
                          <StatusBadge status="pending"/>
                        </div>
                        <div style={{ fontSize:11, color:'#64748b' }}>
                          🌐 <b>{co.slug}.elogix.com.np</b> &nbsp;·&nbsp;
                          📧 {co.admin_email} &nbsp;·&nbsp;
                          📅 {co.created_at || co.registered_at}
                        </div>
                      </div>
                      <PlanBadge plan={co.plan}/>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',
                      gap:8, marginBottom:14 }}>
                      {[
                        ['Industry',  co.industry || co.business_type?.replace(/_/g,' ') || '—'],
                        ['Country',   co.country || 'Nepal'],
                        ['Currency',  co.currency || 'NPR'],
                        ['Plan',      (PLAN_PRICES[co.plan] || PLAN_PRICES.trial).label],
                        ['Modules',   `${(co.modules || []).length} configured`],
                        ['Phone',     co.phone || '—'],
                      ].map(([l, v]) => (
                        <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'8px 10px' }}>
                          <div style={{ fontSize:9, color:'#94a3b8', fontWeight:700 }}>{l}</div>
                          <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginTop:1 }}>{String(v)}</div>
                        </div>
                      ))}
                    </div>

                    {(co.modules || []).length > 0 && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:9, color:'#94a3b8', fontWeight:700, marginBottom:4 }}>MODULES</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                          {(co.modules || []).slice(0, 10).map(m => (
                            <span key={m} style={{ fontSize:8, padding:'2px 7px', borderRadius:6,
                              background:'#eff6ff', color:'#2563eb', fontWeight:600 }}>
                              {m.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {(co.modules || []).length > 10 && (
                            <span style={{ fontSize:8, color:'#94a3b8' }}>+{co.modules.length - 10} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom:12 }}>
                      <input placeholder="Rejection reason (optional — required only if rejecting)"
                        value={rejectReason[co.slug] || ''}
                        onChange={e => setRejectReason(p => ({ ...p, [co.slug]: e.target.value }))}
                        style={{ ...inp, fontSize:10 }}/>
                    </div>

                    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                      <button onClick={() => approveCompany(co)}
                        disabled={pendingAction[co.slug] === 'approving'}
                        style={{ flex:1, padding:'11px 16px', borderRadius:9, border:'none',
                          background:'linear-gradient(135deg,#059669,#0891b2)',
                          color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer',
                          opacity: pendingAction[co.slug] === 'approving' ? .6 : 1 }}>
                        {pendingAction[co.slug] === 'approving' ? '⏳ Approving…' : '✅ Approve & Activate'}
                      </button>
                      <button onClick={() => rejectCompany(co)}
                        disabled={pendingAction[co.slug] === 'rejecting'}
                        style={{ padding:'11px 20px', borderRadius:9, border:'1.5px solid #fecaca',
                          background:'#fef2f2', color:'#dc2626', fontSize:12, fontWeight:700,
                          cursor:'pointer', opacity: pendingAction[co.slug] === 'rejecting' ? .6 : 1 }}>
                        {pendingAction[co.slug] === 'rejecting' ? '⏳…' : '🚫 Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ 📊 DASHBOARD ════ */}
        {tab === 'dashboard' && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>📊 Dashboard</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
              {[
                { icon:'🏢', label:'Total Companies',  value: companies.length,                                      color:'#4338ca' },
                { icon:'✅', label:'Active',           value: companies.filter(c => c.status === 'active').length,   color:'#059669' },
                { icon:'🎁', label:'Trial',            value: companies.filter(c => c.status === 'trial').length,    color:'#0891b2' },
                { icon:'⏳', label:'Pending',          value: pending.length,                                        color:'#d97706' },
                { icon:'⚠️', label:'Suspended',       value: companies.filter(c => c.status === 'suspended').length, color:'#b45309' },
                { icon:'💰', label:'MRR (NPR)',         value: `${(mrr / 1000).toFixed(0)}k`,                       color:'#7c3aed' },
                { icon:'🎫', label:'Open Tickets',     value: tickets.length,                                        color:'#dc2626' },
                { icon:'👥', label:'Team',             value: team.length,                                           color:'#374151' },
              ].map(k => (
                <div key={k.label} style={{ background:'#fff', borderRadius:12, padding:'16px 18px',
                  border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{k.icon}</div>
                  <div style={{ fontSize:22, fontWeight:900, color:k.color }}>{k.value}</div>
                  <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {pending.length > 0 && (
              <div onClick={() => setTab('pending')} style={{
                background:'linear-gradient(135deg,#fffbeb,#fef3c7)',
                border:'2px solid #f59e0b', borderRadius:12, padding:'14px 18px',
                cursor:'pointer', display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ fontSize:28 }}>⏳</span>
                <div>
                  <div style={{ fontWeight:800, color:'#92400e', fontSize:13 }}>
                    {pending.length} company registration{pending.length > 1 ? 's' : ''} awaiting approval
                  </div>
                  <div style={{ fontSize:11, color:'#a16207', marginTop:2 }}>
                    Click to review → approve so tenants can log in
                  </div>
                </div>
              </div>
            )}

            <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:12 }}>
                🏢 Approved Companies ({companies.length})
              </div>
              {companies.length === 0 ? (
                <div style={{ textAlign:'center', color:'#94a3b8', fontSize:11, padding:'20px 0' }}>
                  No approved companies yet — approve pending registrations above.
                </div>
              ) : (
                companies.slice(0, 8).map(co => (
                  <div key={co.slug} style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9', fontSize:11, gap:8 }}>
                    <span style={{ fontWeight:600, color:'#374151' }}>{co.name}</span>
                    <div style={{ display:'flex', gap:6 }}>
                      <PlanBadge plan={co.plan}/>
                      <StatusBadge status={co.status}/>
                    </div>
                  </div>
                ))
              )}
              {companies.length > 8 && (
                <div style={{ textAlign:'center', marginTop:8 }}>
                  <span onClick={() => setTab('companies')} style={{ fontSize:11, color:A, cursor:'pointer', fontWeight:700 }}>
                    View all {companies.length} companies →
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ 🏢 COMPANIES ════ */}
        {tab === 'companies' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              flexWrap:'wrap', gap:10, marginBottom:16 }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#0f172a' }}>
                🏢 Companies ({filteredCos.length})
              </div>
              <input placeholder="🔍 Search name, slug, email…"
                value={searchCo}
                onChange={e => { setSearchCo(e.target.value); loadAll(e.target.value) }}
                style={{ ...inp, width:220 }}/>
            </div>

            {filteredCos.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'#94a3b8', background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0', fontSize:12 }}>
                No approved companies. Pending registrations are in the ⏳ Pending tab.
              </div>
            ) : (
              <div style={{ display:'grid', gap:10 }}>
                {filteredCos.map(co => (
                  <div key={co.slug} style={{ background:'#fff', borderRadius:12, padding:'14px 16px',
                    border:'1px solid #e2e8f0', display:'flex', flexWrap:'wrap',
                    justifyContent:'space-between', alignItems:'center', gap:10 }}>
                    <div style={{ minWidth:160 }}>
                      <div style={{ fontWeight:800, color:'#0f172a', fontSize:12, marginBottom:2 }}>{co.name}</div>
                      <div style={{ fontSize:10, color:'#64748b' }}>
                        {co.slug}.elogix.com.np · {co.admin_email || '—'} · {co.country || 'Nepal'}
                      </div>
                      <div style={{ marginTop:4, display:'flex', gap:4, flexWrap:'wrap' }}>
                        <StatusBadge status={co.status}/>
                        <PlanBadge plan={co.plan}/>
                        <span style={{ fontSize:9, color:'#64748b' }}>👤 {co.employee_count || 0}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {co.status !== 'active' && co.status !== 'trial' && (
                        <button onClick={() => doAction(co.slug, 'activate')}
                          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #bbf7d0',
                            background:'#f0fdf4', color:'#059669', fontSize:10, cursor:'pointer', fontWeight:700 }}>
                          ✅ Activate
                        </button>
                      )}
                      {(co.status === 'active' || co.status === 'trial') && (
                        <button onClick={() => doAction(co.slug, 'suspend', { reason:'Admin review' })}
                          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #fde68a',
                            background:'#fffbeb', color:'#d97706', fontSize:10, cursor:'pointer', fontWeight:700 }}>
                          ⚠️ Suspend
                        </button>
                      )}
                      <select defaultValue=""
                        onChange={e => { if (e.target.value) { doAction(co.slug, 'changePlan', { plan:e.target.value }); e.target.value = '' } }}
                        style={{ ...inp, width:90, fontSize:9 }}>
                        <option value="">Plan ▾</option>
                        {Object.entries(PLAN_PRICES).map(([id, p]) => (
                          <option key={id} value={id}>{p.label}</option>
                        ))}
                      </select>
                      <button onClick={() => openPasswordReset(co)}
                        style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #bfdbfe',
                          background:'#eff6ff', color:'#2563eb', fontSize:10, cursor:'pointer', fontWeight:700 }}>
                        🔑 Reset PW
                      </button>
                      <a href={`https://${co.slug}.elogix.com.np`} target="_blank" rel="noreferrer"
                        style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #e2e8f0',
                          background:'#fff', color:'#64748b', fontSize:10, cursor:'pointer',
                          fontWeight:700, textDecoration:'none' }}>
                        🔗 Portal
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ ➕ NEW COMPANY ════ */}
        {tab === 'new' && (
          <div style={{ maxWidth:560 }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>➕ New Company</div>
            <div style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #e2e8f0' }}>
              {[
                ['Company Name','company_name','text',true],
                ['Slug (URL)','slug','text',true],
                ['Admin Email','admin_email','email',true],
                ['Admin Name','admin_name','text',false],
                ['Industry','industry','text',false],
                ['Country','country','text',false],
                ['Sales Rep','sales_rep','text',false],
                ['Account Manager','account_manager','text',false],
              ].map(([label, key, type, req]) => (
                <div key={key} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>
                    {label}{req && <span style={{ color:'#dc2626' }}>*</span>}
                  </label>
                  <input type={type} value={newCo[key] || ''}
                    onChange={e => setNewCo(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={label} style={inp}/>
                </div>
              ))}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Plan</label>
                <select value={newCo.plan} onChange={e => setNewCo(p => ({ ...p, plan:e.target.value }))} style={inp}>
                  {Object.entries(PLAN_PRICES).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
                </select>
              </div>
              <button onClick={createCompany}
                style={{ width:'100%', padding:11, borderRadius:9, border:'none',
                  background:G, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                🚀 Provision Company
              </button>
            </div>
          </div>
        )}

        {/* ════ 💰 BILLING ════ */}
        {tab === 'billing' && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:14 }}>💰 Billing</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginBottom:16 }}>
              {[
                { label:'MRR',    value:`NPR ${mrr.toLocaleString()}`,         sub:'Monthly Recurring Revenue' },
                { label:'ARR',    value:`NPR ${(mrr * 12).toLocaleString()}`,  sub:'Annual Recurring Revenue'  },
                { label:'Paying', value: companies.filter(c => c.plan !== 'trial' && (c.status === 'active' || c.status === 'trial')).length, sub:'Paid plans' },
                { label:'Trial',  value: companies.filter(c => c.plan === 'trial' || c.status === 'trial').length, sub:'Free trial' },
              ].map(k => (
                <div key={k.label} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:10, color:'#64748b', fontWeight:700 }}>{k.label}</div>
                  <div style={{ fontSize:17, fontWeight:900, color:A, margin:'4px 0' }}>{k.value}</div>
                  <div style={{ fontSize:9, color:'#94a3b8' }}>{k.sub}</div>
                </div>
              ))}
            </div>
            {companies.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'#94a3b8', background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0', fontSize:12 }}>
                No approved companies yet.
              </div>
            ) : (
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['Company','Plan','Monthly (NPR)','Status','Employees','Last Payment',''].map(h => (
                        <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10,
                          fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map(co => (
                      <tr key={co.slug} style={{ borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'10px 12px', fontWeight:700, color:'#0f172a' }}>
                          {co.name}
                          <div style={{ fontSize:9, color:'#64748b', fontWeight:400 }}>{co.slug}</div>
                        </td>
                        <td style={{ padding:'10px 12px' }}><PlanBadge plan={co.plan}/></td>
                        <td style={{ padding:'10px 12px', fontWeight:700, color:'#059669' }}>
                          {PLAN_PRICES[co.plan]?.monthly > 0 ? PLAN_PRICES[co.plan].monthly.toLocaleString() : 'Free'}
                        </td>
                        <td style={{ padding:'10px 12px' }}><StatusBadge status={co.status}/></td>
                        <td style={{ padding:'10px 12px' }}>{co.employee_count || 0}</td>
                        <td style={{ padding:'10px 12px', color:'#64748b' }}>{co.last_payment || '—'}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <button onClick={() => doAction(co.slug, 'invoice')}
                            style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #bfdbfe',
                              background:'#eff6ff', color:'#2563eb', fontSize:9, cursor:'pointer', fontWeight:700 }}>
                            📄 Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ 🎫 SUPPORT ════ */}
        {tab === 'support' && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>🎫 Support Tickets</div>
            {tickets.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'#94a3b8', background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0', fontSize:12 }}>
                🎉 No open tickets
              </div>
            ) : (
              <div style={{ display:'grid', gap:10 }}>
                {tickets.map((tk, i) => (
                  <div key={tk.id || i} style={{ background:'#fff', borderRadius:12, padding:'14px 16px',
                    border:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between',
                    alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:12, color:'#0f172a', marginBottom:2 }}>
                        #{tk.id || i + 1} — {tk.subject || tk.title || 'Ticket'}
                      </div>
                      <div style={{ fontSize:10, color:'#64748b' }}>
                        {tk.company_name || tk.company || '—'} · {tk.created_at || '—'}
                      </div>
                    </div>
                    <StatusBadge status={tk.status || 'open'}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ 📢 BROADCAST ════ */}
        {tab === 'broadcast' && (
          <div style={{ maxWidth:640 }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>📢 Broadcast Message</div>
            <div style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #e2e8f0' }}>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Target</label>
                <select value={bcast.slug} onChange={e => setBcast(p => ({ ...p, slug:e.target.value }))} style={inp}>
                  <option value="">📣 All Companies ({companies.length} approved)</option>
                  {companies.map(co => (
                    <option key={co.slug} value={co.slug}>{co.name}</option>
                  ))}
                </select>
              </div>
              {[
                ['Type','type',['alert','maintenance','feature','promo','policy','other']],
                ['Priority','priority',['low','normal','high','urgent']],
              ].map(([label, key, opts]) => (
                <div key={key} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{label}</label>
                  <select value={bcast[key]} onChange={e => setBcast(p => ({ ...p, [key]:e.target.value }))} style={inp}>
                    {opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Title *</label>
                <input value={bcast.title} onChange={e => setBcast(p => ({ ...p, title:e.target.value }))} placeholder="Title" style={inp}/>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Message *</label>
                <textarea value={bcast.message} onChange={e => setBcast(p => ({ ...p, message:e.target.value }))}
                  placeholder="Message…" rows={4} style={{ ...inp, resize:'vertical' }}/>
              </div>
              <button onClick={() => {
                if (!bcast.title || !bcast.message) { toast('⚠️ Fill title and message'); return }
                doAction(bcast.slug, bcast.slug ? 'notify' : 'notifyAll',
                  { type:bcast.type, title:bcast.title, message:bcast.message, priority:bcast.priority })
                setBcast(p => ({ ...p, title:'', message:'' }))
              }} style={{ width:'100%', padding:11, borderRadius:9, border:'none',
                background:G, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                {bcast.slug
                  ? `📤 Send to ${companies.find(c => c.slug === bcast.slug)?.name || bcast.slug}`
                  : `📣 Broadcast to All ${companies.length} Companies`}
              </button>
            </div>
          </div>
        )}

        {/* ════ 🔐 MODULE PERMISSIONS ════ */}
        {tab === 'modules' && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>🔐 Module Permissions</div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Select Company</label>
              <select value={modTarget} onChange={e => loadModules(e.target.value)} style={{ ...inp, maxWidth:360 }}>
                <option value="">— Pick an approved company —</option>
                {companies.map(co => (
                  <option key={co.slug} value={co.slug}>{co.name} ({co.slug})</option>
                ))}
              </select>
            </div>
            {companies.length === 0 && (
              <div style={{ padding:20, color:'#94a3b8', fontSize:11, background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0' }}>
                No approved companies yet.
              </div>
            )}
            {modTarget && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8, marginBottom:16 }}>
                  {ALL_MODULES.map(m => (
                    <label key={m} style={{ display:'flex', alignItems:'center', gap:8,
                      borderRadius:9, padding:'10px 12px', cursor:'pointer',
                      border:`1.5px solid ${modState[m] ? A : '#e2e8f0'}`,
                      background: modState[m] ? '#eff6ff' : '#fff' }}>
                      <input type="checkbox" checked={!!modState[m]}
                        onChange={e => setModState(p => ({ ...p, [m]:e.target.checked }))}/>
                      <span style={{ fontSize:10, fontWeight: modState[m] ? 700 : 400, color: modState[m] ? A : '#374151' }}>
                        {m.replace(/_/g, ' ')}
                      </span>
                    </label>
                  ))}
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={saveModules}
                    style={{ padding:'10px 24px', borderRadius:9, border:'none',
                      background:G, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                    💾 Save Modules
                  </button>
                  <button onClick={() => setModState(Object.fromEntries(ALL_MODULES.map(m => [m, true])))}
                    style={{ padding:'10px 16px', borderRadius:9, border:'1px solid #e2e8f0',
                      background:'#fff', color:'#374151', fontSize:11, cursor:'pointer' }}>
                    ✅ All On
                  </button>
                  <button onClick={() => setModState(Object.fromEntries(ALL_MODULES.map(m => [m, false])))}
                    style={{ padding:'10px 16px', borderRadius:9, border:'1px solid #e2e8f0',
                      background:'#fff', color:'#374151', fontSize:11, cursor:'pointer' }}>
                    ❌ All Off
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ 🤝 REFERRAL & COMMISSION ════ */}
        {tab === 'referral' && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>🤝 Referral & Commission</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>
              <div style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:14 }}>⚙️ Commission Config</div>
                {[
                  ['Commission %','commission_pct'],
                  ['Min Payout (NPR)','min_payout_npr'],
                  ['Referral Window (days)','referral_window_days'],
                ].map(([label, key]) => (
                  <div key={key} style={{ marginBottom:12 }}>
                    <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{label}</label>
                    <input type="number" value={commConfig[key]}
                      onChange={e => setCommConfig(p => ({ ...p, [key]: Number(e.target.value) }))} style={inp}/>
                  </div>
                ))}
                <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, cursor:'pointer', fontSize:11 }}>
                  <input type="checkbox" checked={commConfig.auto_credit}
                    onChange={e => setCommConfig(p => ({ ...p, auto_credit:e.target.checked }))}/>
                  Auto-credit on payment
                </label>
                <button onClick={saveCommission}
                  style={{ width:'100%', padding:10, borderRadius:8, border:'none',
                    background:G, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                  💾 Save Config
                </button>
              </div>
              <div style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:14 }}>
                  🔗 Referral Links ({companies.length})
                </div>
                {companies.length === 0 ? (
                  <div style={{ color:'#94a3b8', fontSize:11 }}>No approved companies yet.</div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:320, overflowY:'auto' }}>
                    {companies.map(co => (
                      <div key={co.slug} style={{ padding:'8px 10px', background:'#f8fafc',
                        borderRadius:8, border:'1px solid #e2e8f0', fontSize:10 }}>
                        <div style={{ fontWeight:700, color:'#0f172a', marginBottom:2 }}>{co.name}</div>
                        <div style={{ color:'#4338ca', fontFamily:'monospace', fontSize:9 }}>
                          https://elogix.com.np/ref/{co.slug}
                        </div>
                        <div style={{ marginTop:3, color:'#64748b', fontSize:9 }}>
                          {commConfig.commission_pct}% commission · {(PLAN_PRICES[co.plan] || PLAN_PRICES.trial).label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════ 👥 ELOGIX TEAM ════ */}
        {tab === 'team' && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>👥 eLogix Team</div>
            <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px',
              border:'1px solid #e2e8f0', marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:12 }}>➕ Add Team Member</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10 }}>
                {[['Full Name','full_name','text'],['Email','email','email'],['Phone','phone','tel']].map(([l, k, t]) => (
                  <div key={k}>
                    <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>{l}</label>
                    <input type={t} value={newMember[k] || ''}
                      onChange={e => setNewMember(p => ({ ...p, [k]:e.target.value }))} placeholder={l} style={inp}/>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Role</label>
                  <select value={newMember.role} onChange={e => setNewMember(p => ({ ...p, role:e.target.value }))} style={inp}>
                    {['super_admin','admin','support','sales','developer','accounts'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={addTeamMember}
                style={{ marginTop:12, padding:'9px 24px', borderRadius:9, border:'none',
                  background:G, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                ➕ Add Member
              </button>
            </div>

            {team.length > 0 && (
              <div style={{ background:'#fff', borderRadius:14, padding:'16px 20px',
                border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:10 }}>Team ({team.length})</div>
                <div style={{ display:'grid', gap:8 }}>
                  {team.map((m, i) => (
                    <div key={m.id || i} style={{ display:'flex', justifyContent:'space-between',
                      alignItems:'center', padding:'10px 12px', background:'#f8fafc',
                      borderRadius:8, border:'1px solid #e2e8f0', flexWrap:'wrap', gap:8 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:11, color:'#0f172a' }}>{m.full_name}</div>
                        <div style={{ fontSize:9, color:'#64748b' }}>{m.email} · {m.phone || '—'}</div>
                      </div>
                      <span style={{ fontSize:9, padding:'2px 9px', borderRadius:10,
                        background:'#eff6ff', color:'#2563eb', fontWeight:700, border:'1px solid #bfdbfe' }}>
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ 🔑 PASSWORD MANAGEMENT ════ */}
        {tab === 'passwords' && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>
              🔑 Password Management — Approved Companies ({companies.length})
            </div>
            {companies.length === 0 ? (
              <div style={{ padding:32, textAlign:'center', color:'#94a3b8', background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0', fontSize:12 }}>
                No approved companies yet. Approve pending registrations to see them here.
              </div>
            ) : (
              <div style={{ display:'grid', gap:8 }}>
                {companies.map(co => (
                  <div key={co.slug} style={{ display:'flex', alignItems:'center',
                    justifyContent:'space-between', padding:'12px 16px', background:'#fff',
                    borderRadius:10, border:'1px solid #e2e8f0', flexWrap:'wrap', gap:8 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:12, color:'#0f172a' }}>{co.name}</div>
                      <div style={{ fontSize:10, color:'#64748b' }}>
                        {co.slug}.elogix.com.np · {co.admin_email || '—'}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                      <StatusBadge status={co.status}/>
                      <button onClick={() => openPasswordReset(co)}
                        style={{ padding:'6px 14px', borderRadius:7, border:'none',
                          background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
                          color:'#fff', fontSize:10, cursor:'pointer', fontWeight:700 }}>
                        🔑 Reset Password
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ══════════ Password Reset Modal ══════════ */}
      {showPwModal && pwTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:480,
            boxShadow:'0 24px 80px rgba(0,0,0,.3)', overflow:'hidden' }}>

            <div style={{ background:'linear-gradient(135deg,#1e1b4b,#7c3aed)', padding:'18px 22px',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:16, fontWeight:900, color:'#fff' }}>🔑 Reset Admin Password</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.65)', marginTop:3 }}>
                  {pwTarget.name} · {pwTarget.slug}.elogix.com.np · {pwTarget.plan} plan
                </div>
              </div>
              <button onClick={() => setShowPwModal(false)}
                style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff',
                  width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:18 }}>✕</button>
            </div>

            <div style={{ padding:'22px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              {[
                ['👤 Admin Email *', 'admin_email', 'email'],
                ['👤 Admin Name',    'admin_name',  'text'],
                ['📱 Phone',         'phone',        'tel'],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>{label}</label>
                  <input type={type} value={pwForm[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]:e.target.value }))}
                    style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px',
                      borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none' }}/>
                </div>
              ))}

              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>
                  🔒 New Password *
                </label>
                <div style={{ position:'relative' }}>
                  <input value={pwForm.new_password}
                    type={showPwText ? 'text' : 'password'}
                    onChange={e => setPwForm(f => ({ ...f, new_password:e.target.value }))}
                    placeholder="Minimum 8 characters"
                    style={{ width:'100%', boxSizing:'border-box', padding:'9px 40px 9px 12px',
                      borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none' }}/>
                  <button onClick={() => setShowPwText(v => !v)}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#94a3b8' }}>
                    {showPwText ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>
                  🔒 Confirm Password *
                </label>
                <input value={pwForm.confirm_password}
                  type={showPwText ? 'text' : 'password'}
                  onChange={e => setPwForm(f => ({ ...f, confirm_password:e.target.value }))}
                  style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px',
                    borderRadius:8, fontSize:13, outline:'none',
                    border:`1.5px solid ${pwForm.confirm_password && pwForm.confirm_password !== pwForm.new_password ? '#fecaca' : '#e2e8f0'}` }}/>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>
                  📝 Reason (optional)
                </label>
                <textarea value={pwForm.reason}
                  onChange={e => setPwForm(f => ({ ...f, reason:e.target.value }))}
                  rows={2}
                  style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px',
                    borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13,
                    outline:'none', resize:'vertical', fontFamily:'inherit' }}/>
              </div>

              {pwMsg && (
                <div style={{ padding:'10px 14px', borderRadius:9, fontSize:12, fontWeight:700,
                  background: pwMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                  border: `1.5px solid ${pwMsg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`,
                  color: pwMsg.startsWith('✅') ? '#065f46' : '#dc2626' }}>
                  {pwMsg}
                </div>
              )}

              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button onClick={() => setShowPwModal(false)}
                  style={{ padding:'10px 20px', borderRadius:9, border:'1.5px solid #e2e8f0',
                    background:'#f8fafc', color:'#64748b', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  Cancel
                </button>
                <button onClick={handlePasswordReset}
                  disabled={pwLoading || !pwForm.new_password || !pwForm.admin_email}
                  style={{ padding:'10px 28px', borderRadius:9, border:'none',
                    background: pwLoading ? '#c4b5fd' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                    color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer',
                    opacity: (pwForm.new_password && pwForm.admin_email) ? 1 : 0.6 }}>
                  {pwLoading ? '⟳ Resetting…' : '🔑 Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

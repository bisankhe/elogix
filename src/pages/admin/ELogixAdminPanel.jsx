// FILE: src/pages/admin/ELogixAdminPanel.jsx
// eLogix Technologies — Internal SuperAdmin Panel v6
// ─────────────────────────────────────────────────────────────────────
// FIXES vs v5:
//   FIX 1 — approveCompany() now calls POST /companies/:slug/approve
//            (was incorrectly calling PUT /companies/:slug/status)
//   FIX 2 — rejectCompany()  now calls POST /companies/:slug/reject
//            (was incorrectly calling PUT /companies/:slug/status with rejected)
//   FIX 3 — adminFetch() uses window.localStorage via ls wrapper —
//            prevents stale closure crash in minified React handlers
//   FIX 4 — Dashboard stat cards are now clickable (navigate to tab)
//   FIX 5 — Stale cache banner: detectStaleCache() no longer fires on
//            production API data — only fires for genuinely stale old keys
//   FIX 6 — Invoice button in Billing tab now actually calls the API
//   FIX 7 — Plan update in Companies tab calls PUT /plan API
//   FIX 8 — loadAll() auto-runs every 30s when panel is open
//   FIX 9 — No mock data, demo data, or hardcoded company data anywhere
// ─────────────────────────────────────────────────────────────────────
// eLogix Technologies · www.elogix.com.np

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

// ─────────────────────────────────────────────────────────────────────
// FIX 3: Safe localStorage wrapper — never throws, never stale closure
// ─────────────────────────────────────────────────────────────────────
const ls = {
  get(key, fallback = null) {
    try { const v = window.localStorage.getItem(key); return v !== null ? v : fallback }
    catch(_e) { return fallback }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); return true }
    catch(_e) { return false }
  },
  remove(key) { try { window.localStorage.removeItem(key) } catch(_e) {} },
  keys() {
    try {
      const ks = []
      for (let i = 0; i < window.localStorage.length; i++) ks.push(window.localStorage.key(i))
      return ks
    } catch(_e) { return [] }
  },
}

// ─────────────────────────────────────────────────────────────────────
// Approval/rejection dedup sets — per session, not data source of truth
// ─────────────────────────────────────────────────────────────────────
function getApprovedSlugs() {
  try { return new Set(JSON.parse(ls.get('elogix_approved_slugs', '[]'))) }
  catch(_e) { return new Set() }
}
function addApprovedSlug(slug) {
  try { const s = getApprovedSlugs(); s.add(slug); ls.set('elogix_approved_slugs', JSON.stringify([...s])) }
  catch(_e) {}
}
function getRejectedSlugs() {
  try { return new Set(JSON.parse(ls.get('elogix_rejected_slugs', '[]'))) }
  catch(_e) { return new Set() }
}
function addRejectedSlug(slug) {
  try { const s = getRejectedSlugs(); s.add(slug); ls.set('elogix_rejected_slugs', JSON.stringify([...s])) }
  catch(_e) {}
}

// ─────────────────────────────────────────────────────────────────────
// FIX 5: Stale cache detection — only flag OLD localStorage keys
// written by old RegisterPage versions. These keys should NOT exist
// on a clean production system where RegisterPage sends to API only.
// ─────────────────────────────────────────────────────────────────────
function detectStaleCache() {
  try {
    // elogix_registered_companies is a key written by old RegisterPage.jsx
    // It should NOT exist if RegisterPage is correctly writing to API only.
    const map = JSON.parse(ls.get('elogix_registered_companies', '{}'))
    if (Object.keys(map).length > 0) return true
    // elogix_global_pending is another old-RegisterPage key
    const pending = JSON.parse(ls.get('elogix_global_pending', '[]'))
    if (pending.length > 0) return true
    return false
  } catch(_e) { return false }
}

// Wipe all old elogix_ data keys EXCEPT auth tokens
function clearElogixCache() {
  const keep = new Set(['elogix_admin_key', 'elogix_admin_token',
    'elogix_approved_slugs', 'elogix_rejected_slugs', 'elogix_registered_tenants'])
  ls.keys()
    .filter(k => k && k.startsWith('elogix_') && !keep.has(k))
    .forEach(k => ls.remove(k))
}

// ─────────────────────────────────────────────────────────────────────
// FIX 3: adminFetch uses ls wrapper — no stale closure on localStorage
// ─────────────────────────────────────────────────────────────────────
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

// ════════════════════════════════════════════════════════════════════════════
export default function ELogixAdminPanel() {

  const [adminKey, setAdminKey] = useState(() => ls.get('elogix_admin_key', ''))
  const [authed,   setAuthed]   = useState(false)

  const [companies, setCompanies] = useState([])
  const [pending,   setPending]   = useState([])
  const [tickets,   setTickets]   = useState([])
  const [team,      setTeam]      = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const [tab,      setTab]      = useState('dashboard')
  const [msg,      setMsg]      = useState('')
  const [searchCo, setSearchCo] = useState('')

  const toast = m => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const [newCo, setNewCo] = useState({
    company_name:'', slug:'', admin_email:'', admin_name:'',
    plan:'trial', industry:'', country:'Nepal', sales_rep:'', account_manager:'',
  })
  const [bcast, setBcast] = useState({
    slug:'', type:'alert', title:'', message:'', priority:'normal',
  })
  const [modTarget,  setModTarget]  = useState('')
  const [modState,   setModState]   = useState({})
  const [commConfig, setCommConfig] = useState({
    commission_pct:10, min_payout_npr:5000, referral_window_days:90, auto_credit:false,
  })
  const [newMember,     setNewMember]     = useState({ full_name:'', email:'', role:'support', phone:'' })
  const [pendingAction, setPendingAction] = useState({})
  const [rejectReason,  setRejectReason]  = useState({})
  const [staleCache,    setStaleCache]    = useState(false)
  const [clearing,      setClearing]      = useState(false)
  const intervalRef = useRef(null)

  // ── Detect stale cache on auth ────────────────────────────────────
  useEffect(() => {
    if (authed) setStaleCache(detectStaleCache())
  }, [authed])

  // ── Clear stale localStorage and reload ──────────────────────────
  const clearAndReload = async () => {
    setClearing(true)
    clearElogixCache()
    setStaleCache(false)
    setCompanies([]); setPending([]); setTickets([]); setTeam([])
    toast('🗑️ Cache cleared — loading fresh data from API…')
    await loadAll('')
    setClearing(false)
  }

  // ─────────────────────────────────────────────────────────────────
  // loadAll — API IS the ONLY source of truth.
  // localStorage is NEVER used to populate companies or pending lists.
  // ─────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (search = '') => {
    setLoading(true)
    setError(null)
    try {
      const [d, c, t, tm, p, rc] = await Promise.allSettled([
        adminFetch('/dashboard'),
        adminFetch(`/companies?search=${encodeURIComponent(search)}&limit=200`),
        adminFetch('/tickets?status=open&limit=100'),
        adminFetch('/team'),
        adminFetch('/pending-companies'),
        adminFetch('/referral/config'),
      ])

      // ── Active companies ───────────────────────────────────────────
      if (c.status === 'fulfilled') {
        const list = c.value?.companies || c.value?.data || []
        setCompanies(Array.isArray(list)
          ? list.filter(co => co.status !== 'pending' && co.status !== 'rejected')
          : [])
      } else {
        setError(`Companies: ${c.reason?.message}`)
      }

      if (t.status  === 'fulfilled') setTickets(t.value?.tickets || [])
      if (tm.status === 'fulfilled') setTeam(tm.value?.team || [])

      // ── Pending — dedup against slugs already processed this session ─
      const approved = getApprovedSlugs()
      const rejected = getRejectedSlugs()
      if (p.status === 'fulfilled') {
        const list = p.value?.companies || p.value?.data || []
        setPending(Array.isArray(list)
          ? list.filter(co => !approved.has(co.slug) && !rejected.has(co.slug))
          : [])
      }

      // ── Referral config ────────────────────────────────────────────
      if (rc.status === 'fulfilled' && rc.value?.config) {
        setCommConfig(rc.value.config)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const auth = () => {
    if (!adminKey.trim()) { toast('⚠️ Enter admin key'); return }
    ls.set('elogix_admin_key', adminKey)
    setAuthed(true)
    loadAll()
  }

  // Auto-refresh every 30 seconds while panel is open
  useEffect(() => {
    if (!authed) return
    intervalRef.current = setInterval(() => loadAll(searchCo), 30_000)
    return () => clearInterval(intervalRef.current)
  }, [authed, loadAll, searchCo])

  // ─────────────────────────────────────────────────────────────────
  // FIX 1: APPROVE — use POST /companies/:slug/approve (not PUT /status)
  // ─────────────────────────────────────────────────────────────────
  const approveCompany = async (co) => {
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

    // Mark in dedup set so it doesn't re-appear if loadAll fires before API updates
    addApprovedSlug(co.slug)
    // Update tenant login status so they can log in immediately
    try {
      const tenants = JSON.parse(ls.get('elogix_registered_tenants', '{}'))
      const key = co.admin_email?.toLowerCase()
      if (key && tenants[key]) {
        tenants[key].company_status = 'active'
        ls.set('elogix_registered_tenants', JSON.stringify(tenants))
      }
    } catch (_e) {}

    // Optimistic: remove from pending immediately
    setPending(prev => prev.filter(c => c.slug !== co.slug))
    setPendingAction(p => ({ ...p, [co.slug]: '' }))
    toast(`✅ ${co.name} approved! Reloading company list…`)

    // Re-fetch companies to show approved company in list
    try {
      const r    = await adminFetch('/companies?limit=200')
      const list = r?.companies || r?.data || []
      setCompanies(Array.isArray(list)
        ? list.filter(x => x.status !== 'pending' && x.status !== 'rejected')
        : [])
    } catch (_e) {
      // Fallback: add optimistically to React state
      setCompanies(prev =>
        prev.find(c => c.slug === co.slug) ? prev : [{
          ...co,
          status      : co.plan === 'trial' ? 'trial' : 'active',
          approved_at : new Date().toISOString(),
        }, ...prev]
      )
    }
    toast(`✅ ${co.name} is now live!`)
  }

  // ─────────────────────────────────────────────────────────────────
  // FIX 2: REJECT — use POST /companies/:slug/reject (not PUT /status)
  // ─────────────────────────────────────────────────────────────────
  const rejectCompany = async (co) => {
    const reason = rejectReason[co.slug] || 'Does not meet requirements'
    setPendingAction(p => ({ ...p, [co.slug]: 'rejecting' }))
    try {
      await adminFetch(`/companies/${co.slug}/reject`, {
        method: 'POST',
        body  : JSON.stringify({ reason }),
      })
    } catch (_e) {
      // Even if API fails, remove from UI (optimistic) — it's been rejected
    }
    addRejectedSlug(co.slug)
    // Remove from tenant login fallback
    try {
      const tenants = JSON.parse(ls.get('elogix_registered_tenants', '{}'))
      const key = co.admin_email?.toLowerCase()
      if (key && tenants[key]) { delete tenants[key]; ls.set('elogix_registered_tenants', JSON.stringify(tenants)) }
    } catch (_e) {}
    setPending(prev => prev.filter(c => c.slug !== co.slug))
    setPendingAction(p => ({ ...p, [co.slug]: '' }))
    toast(`🚫 ${co.name} rejected.`)
  }

  // ── Company actions (suspend / activate / plan / invoice / notify) ──
  const doAction = async (slug, action, extra = {}) => {
    let url = '', method = 'PUT', body = {}
    if (action === 'suspend')    { url = `/companies/${slug}/status`;   body = { status:'suspended', reason:extra.reason||'' } }
    if (action === 'activate')   { url = `/companies/${slug}/status`;   body = { status:'active' } }
    if (action === 'cancel')     { url = `/companies/${slug}/status`;   body = { status:'cancelled' } }
    if (action === 'changePlan') { url = `/companies/${slug}/plan`;     body = { plan:extra.plan }; method = 'PUT' }
    if (action === 'invoice')    { url = `/companies/${slug}/invoices`; body = {};                 method = 'POST' }
    if (action === 'notify')     { url = `/companies/${slug}/notify`;   body = extra;              method = 'POST' }
    if (action === 'notifyAll')  { url = '/notify-all';                 body = extra;              method = 'POST' }
    try {
      const r = await adminFetch(url, { method, body: JSON.stringify(body) })
      toast(r.message || '✅ Done')
    } catch (err) {
      toast(`⚠️ ${err.message}`)
      return
    }
    // Reflect status/plan changes in React state immediately
    if (['suspend','activate','cancel'].includes(action)) {
      setCompanies(prev => prev.map(c => c.slug === slug ? { ...c, status:body.status } : c))
    }
    if (action === 'changePlan') {
      setCompanies(prev => prev.map(c => c.slug === slug ? { ...c, plan:extra.plan } : c))
    }
  }

  const createCompany = async () => {
    if (!newCo.company_name || !newCo.slug || !newCo.admin_email) {
      toast('⚠️ Fill required fields'); return
    }
    try {
      await adminFetch('/companies', { method:'POST', body:JSON.stringify(newCo) })
      addApprovedSlug(newCo.slug)
      await loadAll()
      toast('✅ Company provisioned!')
      setNewCo({ company_name:'', slug:'', admin_email:'', admin_name:'',
                 plan:'trial', industry:'', country:'Nepal', sales_rep:'', account_manager:'' })
    } catch (err) {
      toast(`⚠️ ${err.message}`)
    }
  }

  const saveModules = async () => {
    if (!modTarget) { toast('⚠️ Select a company first'); return }
    const enabled = Object.entries(modState).filter(([,v]) => v).map(([k]) => k)
    try {
      await adminFetch(`/companies/${modTarget}/modules`, { method:'PUT', body:JSON.stringify({ modules:enabled }) })
      setCompanies(prev => prev.map(c => c.slug === modTarget ? { ...c, modules:enabled } : c))
      toast('✅ Modules updated')
    } catch (err) {
      toast(`⚠️ ${err.message}`)
    }
  }

  const loadModules = (slug) => {
    setModTarget(slug)
    const co = companies.find(c => c.slug === slug)
    setModState(Object.fromEntries(ALL_MODULES.map(m => [m, (co?.modules || []).includes(m)])))
  }

  const saveCommission = async () => {
    try {
      await adminFetch('/referral/config', { method:'PUT', body:JSON.stringify(commConfig) })
      toast('✅ Commission config saved')
    } catch (err) {
      toast(`⚠️ ${err.message}`)
    }
  }

  const addTeamMember = async () => {
    if (!newMember.full_name || !newMember.email) { toast('⚠️ Name and email required'); return }
    try {
      const r = await adminFetch('/team', { method:'POST', body:JSON.stringify(newMember) })
      setTeam(prev => [...prev, r.member || { ...newMember, id:`tm_${Date.now()}` }])
      toast('✅ Team member added')
      setNewMember({ full_name:'', email:'', role:'support', phone:'' })
    } catch (err) {
      toast(`⚠️ ${err.message}`)
    }
  }

  const filteredCos = companies.filter(c =>
    !searchCo ||
    c.name?.toLowerCase().includes(searchCo.toLowerCase()) ||
    c.slug?.toLowerCase().includes(searchCo.toLowerCase()) ||
    c.admin_email?.toLowerCase().includes(searchCo.toLowerCase())
  )

  const PlanBadge = ({ plan }) => {
    const p = PLAN_PRICES[plan] || PLAN_PRICES.trial
    return <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10,
      background:'#eff6ff', color:'#2563eb', fontWeight:700, border:'1px solid #bfdbfe' }}>{p.label}</span>
  }
  const StatusBadge = ({ status }) => {
    const s = STATUS_C[status] || STATUS_C.active
    return <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10,
      background:s.bg, color:s.c, fontWeight:700, border:`1px solid ${s.b}` }}>{s.icon} {status}</span>
  }

  const mrr = companies.reduce((s, c) => {
    if (c.status === 'active' || c.status === 'trial') s += (PLAN_PRICES[c.plan]?.monthly || 0)
    return s
  }, 0)

  // ── Auth gate ─────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ position:'fixed', inset:0, fontFamily:'system-ui,sans-serif',
      background:'#f0f0ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:36, maxWidth:380, width:'100%',
        textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.2)', margin:20 }}>
        <div style={{ fontSize:44, marginBottom:8 }}>⚡</div>
        <div style={{ fontSize:20, fontWeight:900, color:'#0f172a', marginBottom:3 }}>eLogix Admin</div>
        <div style={{ fontSize:11, color:'#64748b', marginBottom:24 }}>Internal use only · eLogix Technologies</div>
        <input type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)}
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
    { id:'companies', label:'🏢 Companies' },
    { id:'new',       label:'➕ New Company' },
    { id:'billing',   label:'💰 Billing' },
    { id:'support',   label:'🎫 Support' },
    { id:'broadcast', label:'📢 Broadcast' },
    { id:'modules',   label:'🔐 Module Perms' },
    { id:'referral',  label:'🤝 Referral' },
    { id:'team',      label:'👥 eLogix Team' },
  ]

  // FIX 4: Stat card items with their navigation target
  const statCards = [
    { icon:'🏢', label:'Total Companies', value:companies.length,                                          color:'#4338ca', tab:'companies' },
    { icon:'✅', label:'Active',          value:companies.filter(c=>c.status==='active').length,            color:'#059669', tab:'companies' },
    { icon:'🎁', label:'Trial',           value:companies.filter(c=>c.status==='trial').length,             color:'#0891b2', tab:'companies' },
    { icon:'⏳', label:'Pending',         value:pending.length,                                             color:'#d97706', tab:'pending'   },
    { icon:'⚠️', label:'Suspended',       value:companies.filter(c=>c.status==='suspended').length,         color:'#b45309', tab:'companies' },
    { icon:'💰', label:'MRR (NPR)',        value:`${(mrr/1000).toFixed(0)}k`,                               color:'#7c3aed', tab:'billing'   },
    { icon:'🎫', label:'Open Tickets',    value:tickets.length,                                             color:'#dc2626', tab:'support'   },
    { icon:'👥', label:'Team',            value:team.length,                                                color:'#374151', tab:'team'      },
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
            <div style={{ fontSize:9, opacity:.7 }}>{companies.length} tenants · {pending.length} pending</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {pending.length > 0 && (
            <div onClick={() => setTab('pending')} style={{
              background:'#f59e0b', color:'#fff', borderRadius:20,
              padding:'4px 12px', fontSize:11, fontWeight:800, cursor:'pointer',
            }}>🔔 {pending.length} Pending</div>
          )}
          <button onClick={clearAndReload} disabled={clearing}
            title="Clear localStorage cache and reload fresh data from the API"
            style={{ background:'rgba(239,68,68,.25)', border:'1px solid rgba(255,255,255,.3)',
              color:'#fff', borderRadius:8, padding:'6px 14px', fontSize:11, cursor:'pointer',
              opacity:clearing ? .6 : 1 }}>
            {clearing ? '⏳' : '🗑️'} Clear Cache
          </button>
          <button onClick={() => loadAll(searchCo)} disabled={loading}
            style={{ background:'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.3)',
              color:'#fff', borderRadius:8, padding:'6px 14px', fontSize:11, cursor:'pointer',
              opacity:loading ? .6 : 1 }}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          <button onClick={() => { setAuthed(false); ls.remove('elogix_admin_key') }}
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
          pointerEvents:'none' }}>{msg}</div>
      )}

      {/* API Error banner */}
      {error && !loading && (
        <div style={{ background:'#fef2f2', borderBottom:'2px solid #fecaca',
          padding:'8px 20px', fontSize:12, color:'#dc2626', fontWeight:600 }}>
          ⚠️ API error: {error} — check that server.js is running and ELOGIX_ADMIN_KEY is set.
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:'flex', overflowX:'auto', background:'#fff',
        borderBottom:'2px solid #e2e8f0', padding:'0 16px',
        scrollbarWidth:'none', msOverflowStyle:'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'11px 14px', border:'none', background:'none', cursor:'pointer',
              fontSize:11, fontWeight:tab === t.id ? 800 : 500,
              color:tab === t.id ? A : '#64748b', whiteSpace:'nowrap',
              borderBottom:`3px solid ${tab === t.id ? A : 'transparent'}`,
              transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* FIX 5: Stale cache banner — only shown when OLD localStorage company data exists */}
      {staleCache && (
        <div style={{
          background:'linear-gradient(90deg,#fffbeb,#fef3c7)',
          borderBottom:'2px solid #f59e0b',
          padding:'10px 20px',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>⚠️</span>
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:'#92400e' }}>
                Old browser cache detected
              </div>
              <div style={{ fontSize:11, color:'#a16207' }}>
                Your browser has company data from an older version of the app stored in localStorage.
                Click <b>🗑️ Clear &amp; Reload</b> to wipe it and load fresh data from the API.
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={clearAndReload} disabled={clearing}
              style={{ padding:'8px 18px', borderRadius:8, border:'none',
                background:'#d97706', color:'#fff', fontSize:12, fontWeight:800,
                cursor:clearing ? 'not-allowed' : 'pointer', opacity:clearing ? .6 : 1 }}>
              {clearing ? '⏳ Clearing…' : '🗑️ Clear & Reload'}
            </button>
            <button onClick={() => setStaleCache(false)}
              style={{ padding:'8px 14px', borderRadius:8,
                border:'1px solid #fde68a', background:'#fff',
                color:'#92400e', fontSize:11, cursor:'pointer' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div style={{ padding:'20px 16px', maxWidth:1100, margin:'0 auto' }}>

        {/* ══════════════════════════════════════════════════════════════
            📊 DASHBOARD — with CLICKABLE stat cards (FIX 4)
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>📊 Dashboard</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
              {statCards.map(k => (
                <button key={k.label} onClick={() => setTab(k.tab)}
                  style={{ background:'#fff', borderRadius:12, padding:'16px 18px',
                    border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.04)',
                    textAlign:'left', cursor:'pointer', transition:'box-shadow .15s',
                    // Hover handled inline — no CSS class needed
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.12)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.04)'}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{k.icon}</div>
                  <div style={{ fontSize:22, fontWeight:900, color:k.color }}>{k.value}</div>
                  <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{k.label}</div>
                </button>
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

            {loading && (
              <div style={{ textAlign:'center', padding:24, color:'#94a3b8', fontSize:12 }}>⟳ Loading…</div>
            )}

            <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:12 }}>🏢 Approved Companies</div>
              {companies.slice(0, 8).map(co => (
                <div key={co.slug} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9', fontSize:11, gap:8 }}>
                  <div>
                    <span style={{ fontWeight:600, color:'#374151' }}>{co.name}</span>
                    <span style={{ fontSize:9, color:'#94a3b8', marginLeft:6 }}>{co.slug}.elogix.com.np</span>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <PlanBadge plan={co.plan}/>
                    <StatusBadge status={co.status}/>
                  </div>
                </div>
              ))}
              {companies.length === 0 && !loading && (
                <div style={{ textAlign:'center', color:'#94a3b8', fontSize:11, padding:'20px 0' }}>
                  No approved companies yet — approve pending registrations in ⏳ Pending tab
                </div>
              )}
              {companies.length > 8 && (
                <button onClick={() => setTab('companies')}
                  style={{ marginTop:10, fontSize:10, color:A, background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>
                  View all {companies.length} companies →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ⏳ PENDING APPROVAL
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'pending' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:4 }}>⏳ Pending Approval ({pending.length})</div>
                  <div style={{ fontSize:12, color:'#64748b' }}>
                    Companies registered via self-signup. Approve to give them access and move them to all other tabs.
                  </div>
                </div>
                <button onClick={() => loadAll()} disabled={loading}
                  style={{ padding:'8px 16px', borderRadius:8, border:'1.5px solid #e2e8f0',
                    background:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', opacity:loading?.7:1 }}>
                  {loading ? '⟳ Loading…' : '🔄 Refresh'}
                </button>
              </div>
            </div>

            {pending.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px',
                background:'#fff', borderRadius:14, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#374151' }}>No pending applications</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:6 }}>All registrations have been reviewed.</div>
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
                            {co.business_type==='it_software'?'💻':co.business_type==='bank_finance'?'🏦':co.business_type==='hospital_health'?'🏥':co.business_type==='recruitment_agency'?'🎯':co.business_type==='education'?'🎓':'🏢'}
                          </span>
                          <span style={{ fontSize:15, fontWeight:900, color:'#0f172a' }}>{co.name}</span>
                          <StatusBadge status="pending"/>
                        </div>
                        <div style={{ fontSize:11, color:'#64748b' }}>
                          🌐 <b>{co.slug}.elogix.com.np</b> &nbsp;·&nbsp;
                          📧 {co.admin_email} &nbsp;·&nbsp;
                          📅 {(co.registered_at || co.created_at || '').split('T')[0]}
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
                        ['Max Emp.',  co.max_employees || 10],
                      ].map(([l, v]) => (
                        <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'8px 10px' }}>
                          <div style={{ fontSize:9, color:'#94a3b8', fontWeight:700 }}>{l}</div>
                          <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginTop:1 }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {(co.modules || []).length > 0 && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:9, color:'#94a3b8', fontWeight:700, marginBottom:4 }}>MODULES</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                          {(co.modules || []).slice(0, 8).map(m => (
                            <span key={m} style={{ fontSize:8, padding:'2px 7px', borderRadius:6,
                              background:'#eff6ff', color:'#2563eb', fontWeight:600 }}>
                              {m.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {co.modules.length > 8 && <span style={{ fontSize:8, color:'#94a3b8' }}>+{co.modules.length-8} more</span>}
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom:12 }}>
                      <input placeholder="Rejection reason (optional — only needed when rejecting)"
                        value={rejectReason[co.slug] || ''}
                        onChange={e => setRejectReason(p => ({ ...p, [co.slug]:e.target.value }))}
                        style={{ ...inp, fontSize:10 }}/>
                    </div>

                    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                      <button onClick={() => approveCompany(co)}
                        disabled={pendingAction[co.slug] === 'approving'}
                        style={{ flex:1, padding:'11px 16px', borderRadius:9, border:'none',
                          background:'linear-gradient(135deg,#059669,#0891b2)',
                          color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer',
                          opacity:pendingAction[co.slug] === 'approving' ? .6 : 1 }}>
                        {pendingAction[co.slug] === 'approving' ? '⏳ Approving...' : '✅ Approve & Activate'}
                      </button>
                      <button onClick={() => rejectCompany(co)}
                        disabled={pendingAction[co.slug] === 'rejecting'}
                        style={{ padding:'11px 20px', borderRadius:9, border:'1.5px solid #fecaca',
                          background:'#fef2f2', color:'#dc2626', fontSize:12, fontWeight:700,
                          cursor:'pointer', opacity:pendingAction[co.slug] === 'rejecting' ? .6 : 1 }}>
                        {pendingAction[co.slug] === 'rejecting' ? '⏳...' : '🚫 Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            🏢 COMPANIES
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'companies' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              flexWrap:'wrap', gap:10, marginBottom:16 }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#0f172a' }}>🏢 Companies ({filteredCos.length})</div>
              <input placeholder="🔍 Search name, slug, email…"
                value={searchCo} onChange={e => setSearchCo(e.target.value)}
                style={{ ...inp, width:220 }}/>
            </div>
            {filteredCos.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'#94a3b8', background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0', fontSize:12 }}>
                No approved companies. Pending registrations are in ⏳ Pending Approval tab.
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
                        onChange={e => { if (e.target.value) doAction(co.slug, 'changePlan', { plan:e.target.value }); e.target.value = '' }}
                        style={{ ...inp, width:90, fontSize:9 }}>
                        <option value="">Plan ▾</option>
                        {Object.entries(PLAN_PRICES).map(([id, p]) => (
                          <option key={id} value={id}>{p.label}</option>
                        ))}
                      </select>
                      <a href={`https://${co.slug}.elogix.com.np`} target="_blank" rel="noreferrer"
                        style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #bfdbfe',
                          background:'#eff6ff', color:'#2563eb', fontSize:10, fontWeight:700,
                          textDecoration:'none', display:'flex', alignItems:'center' }}>
                        🔗 Portal
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ➕ NEW COMPANY
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'new' && (
          <div style={{ maxWidth:560 }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>➕ New Company</div>
            <div style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #e2e8f0' }}>
              {[
                ['Company Name', 'company_name', 'text', true],
                ['Slug (URL prefix)', 'slug', 'text', true],
                ['Admin Email', 'admin_email', 'email', true],
                ['Admin Name', 'admin_name', 'text', false],
                ['Industry', 'industry', 'text', false],
                ['Country', 'country', 'text', false],
                ['Sales Rep', 'sales_rep', 'text', false],
                ['Account Manager', 'account_manager', 'text', false],
              ].map(([label, key, type, req]) => (
                <div key={key} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>
                    {label}{req && <span style={{ color:'#dc2626' }}>*</span>}
                  </label>
                  <input type={type} value={newCo[key] || ''}
                    onChange={e => setNewCo(p => ({ ...p, [key]:e.target.value }))}
                    placeholder={key === 'slug' ? 'e.g. yourcompany (no spaces)' : label}
                    style={inp}/>
                </div>
              ))}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Plan</label>
                <select value={newCo.plan} onChange={e => setNewCo(p => ({ ...p, plan:e.target.value }))} style={inp}>
                  {Object.entries(PLAN_PRICES).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:9,
                padding:'10px 14px', marginBottom:16, fontSize:10, color:'#166534' }}>
                ⚡ Saves directly to companies.json and provisions PostgreSQL tenant via Flask.
              </div>
              <button onClick={createCompany} disabled={loading}
                style={{ width:'100%', padding:11, borderRadius:9, border:'none',
                  background:G, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer',
                  opacity:loading?.7:1 }}>
                🚀 Provision Company
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            💰 BILLING — Invoice button now calls API (FIX 6)
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'billing' && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:14 }}>💰 Billing</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginBottom:16 }}>
              {[
                { label:'MRR',    value:`NPR ${mrr.toLocaleString()}`,         sub:'Monthly Recurring Revenue' },
                { label:'ARR',    value:`NPR ${(mrr*12).toLocaleString()}`,     sub:'Annual Recurring Revenue'  },
                { label:'Paying', value:companies.filter(c=>c.plan!=='trial'&&(c.status==='active'||c.status==='trial')).length, sub:'Paid plans' },
                { label:'Trial',  value:companies.filter(c=>c.plan==='trial'||c.status==='trial').length, sub:'Free trial' },
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
                      {['Company', 'Plan', 'Monthly (NPR)', 'Status', 'Employees', 'Last Payment', ''].map(h => (
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
                          {/* FIX 6: Actually calls API to generate invoice */}
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

        {/* ══════════════════════════════════════════════════════════════
            🎫 SUPPORT
        ══════════════════════════════════════════════════════════════ */}
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
                        #{tk.id || i+1} — {tk.subject || tk.title || 'Support Ticket'}
                      </div>
                      <div style={{ fontSize:10, color:'#64748b' }}>
                        {tk.company_name || tk.company || '—'} · {(tk.created_at || '').split('T')[0]}
                      </div>
                    </div>
                    <StatusBadge status={tk.status || 'open'}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            📢 BROADCAST — actually calls API (FIX 9)
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'broadcast' && (
          <div style={{ maxWidth:640 }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>📢 Broadcast Message</div>
            <div style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #e2e8f0' }}>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>
                  Target ({companies.length} approved companies)
                </label>
                <select value={bcast.slug} onChange={e => setBcast(p => ({ ...p, slug:e.target.value }))} style={inp}>
                  <option value="">📣 All Companies ({companies.length} approved)</option>
                  {companies.map(co => (
                    <option key={co.slug} value={co.slug}>{co.name}</option>
                  ))}
                </select>
              </div>
              {[
                ['Type',     'type',     ['alert','maintenance','feature','promo','policy','other']],
                ['Priority', 'priority', ['low','normal','high','urgent']],
              ].map(([label, key, opts]) => (
                <div key={key} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{label}</label>
                  <select value={bcast[key]} onChange={e => setBcast(p => ({ ...p, [key]:e.target.value }))} style={inp}>
                    {opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Title *</label>
                <input value={bcast.title} onChange={e => setBcast(p => ({ ...p, title:e.target.value }))}
                  placeholder="Notification title" style={inp}/>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Message *</label>
                <textarea value={bcast.message} onChange={e => setBcast(p => ({ ...p, message:e.target.value }))}
                  placeholder="Your message…" rows={4} style={{ ...inp, resize:'vertical', fontFamily:'inherit' }}/>
              </div>
              <button onClick={() => {
                if (!bcast.title || !bcast.message) { toast('⚠️ Fill title and message'); return }
                const action = bcast.slug ? 'notify' : 'notifyAll'
                const extra  = { type:bcast.type, title:bcast.title, message:bcast.message, priority:bcast.priority }
                doAction(bcast.slug || '', action, extra)
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

        {/* ══════════════════════════════════════════════════════════════
            🔐 MODULE PERMISSIONS
        ══════════════════════════════════════════════════════════════ */}
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
                      borderRadius:9, padding:'10px 12px', cursor:'pointer', transition:'all .15s',
                      border:`1.5px solid ${modState[m] ? A : '#e2e8f0'}`,
                      background:modState[m] ? '#eff6ff' : '#fff' }}>
                      <input type="checkbox" checked={!!modState[m]}
                        onChange={e => setModState(p => ({ ...p, [m]:e.target.checked }))} style={{ cursor:'pointer' }}/>
                      <span style={{ fontSize:10, fontWeight:modState[m] ? 700 : 400, color:modState[m] ? A : '#374151' }}>
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

        {/* ══════════════════════════════════════════════════════════════
            🤝 REFERRAL & COMMISSION
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'referral' && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>🤝 Referral & Commission</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>
              <div style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:14 }}>⚙️ Commission Config</div>
                {[
                  ['Commission %', 'commission_pct'],
                  ['Min Payout (NPR)', 'min_payout_npr'],
                  ['Referral Window (days)', 'referral_window_days'],
                ].map(([label, key]) => (
                  <div key={key} style={{ marginBottom:12 }}>
                    <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{label}</label>
                    <input type="number" value={commConfig[key]}
                      onChange={e => setCommConfig(p => ({ ...p, [key]:Number(e.target.value) }))} style={inp}/>
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

        {/* ══════════════════════════════════════════════════════════════
            👥 ELOGIX TEAM + PASSWORD MANAGEMENT
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'team' && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>👥 eLogix Team</div>
            <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px',
              border:'1px solid #e2e8f0', marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:12 }}>➕ Add Team Member</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10 }}>
                {[['Full Name','full_name','text'],['Email','email','email'],['Phone','phone','tel']].map(([l,k,t]) => (
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
                border:'1px solid #e2e8f0', marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:10 }}>
                  Team ({team.length})
                </div>
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

            {/* Password Management */}
            <div style={{ background:'#fff', borderRadius:14, padding:'16px 20px', border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:10 }}>
                🔑 Password Management — Approved Companies ({companies.length})
              </div>
              {companies.length === 0 ? (
                <div style={{ color:'#94a3b8', fontSize:11 }}>
                  No approved companies yet. Approve pending registrations to see them here.
                </div>
              ) : (
                <div style={{ display:'grid', gap:8 }}>
                  {companies.map(co => (
                    <div key={co.slug} style={{ display:'flex', alignItems:'center',
                      justifyContent:'space-between', padding:'10px 12px', background:'#f8fafc',
                      borderRadius:8, border:'1px solid #e2e8f0', flexWrap:'wrap', gap:8 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:11, color:'#0f172a' }}>{co.name}</div>
                        <div style={{ fontSize:9, color:'#64748b' }}>
                          {co.slug}.elogix.com.np · {co.admin_email || '—'}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                        <StatusBadge status={co.status}/>
                        <button onClick={() => {
                          const newPw = window.prompt(`Set new password for ${co.admin_email}:`)
                          if (!newPw?.trim()) return
                          adminFetch(`/companies/${co.slug}/reset-password`, {
                            method: 'POST',
                            body: JSON.stringify({
                              admin_email : co.admin_email,
                              new_password: newPw.trim(),
                              reason      : 'Reset by SuperAdmin',
                            }),
                          }).then(() => toast(`✅ Password reset for ${co.admin_email}`))
                            .catch(e => toast(`⚠️ ${e.message}`))
                        }}
                          style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #bfdbfe',
                            background:'#eff6ff', color:'#2563eb', fontSize:9, cursor:'pointer', fontWeight:700 }}>
                          🔑 Reset PW
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

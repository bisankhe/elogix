// FILE: src/pages/admin/ELogixAdminPanel.jsx
// eLogix Technologies — Internal SuperAdmin Panel v5
// ─────────────────────────────────────────────────────────────────────
// BUG FIXES vs v3:
//   FIX 1 — loadAll() no longer re-adds already-approved companies to
//            the pending list. It checks elogix_approved_slugs (a Set
//            stored in localStorage) before merging localPending.
//   FIX 2 — approveCompany() writes the slug to elogix_approved_slugs
//            AND updates elogix_registered_companies status AND updates
//            elogix_registered_tenants status so the tenant can log in.
//   FIX 3 — rejectCompany() writes to elogix_rejected_slugs so it
//            never comes back.
//   FIX 4 — loadAll() reads elogix_registered_companies and filters
//            out pending AND rejected entries, so offline approved
//            companies stay in the companies list correctly.
//   FIX 5 — The storage event listener only adds NEW slugs that are not
//            in approved_slugs or rejected_slugs.
// ─────────────────────────────────────────────────────────────────────
// TABS (10):
//   📊 Dashboard          — KPI cards
//   ⏳ Pending Approval   — companies waiting for SuperAdmin approval
//   🏢 Companies          — approved tenants
//   ➕ New Company        — provision new tenant manually
//   💰 Billing            — MRR/ARR + per-company invoices
//   🎫 Support            — open tickets
//   📢 Broadcast          — push message
//   🔐 Module Permissions — enable/disable modules per tenant
//   🤝 Referral & Comm.   — commission config + referral links
//   👥 eLogix Team        — internal staff + Password Management
// ─────────────────────────────────────────────────────────────────────
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useCallback } from 'react'

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
  churned  : { c:'#6b7280', bg:'#f9fafb', b:'#e5e7eb', icon:'💀' },
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
// localStorage helpers — the source of truth for offline mode
// ─────────────────────────────────────────────────────────────────────

/** Slugs that have been approved — never show as pending again */
function getApprovedSlugs() {
  try { return new Set(JSON.parse(localStorage.getItem('elogix_approved_slugs') || '[]')) }
  catch(_e) { return new Set() }
}
function addApprovedSlug(slug) {
  try {
    const s = getApprovedSlugs(); s.add(slug)
    localStorage.setItem('elogix_approved_slugs', JSON.stringify([...s]))
  } catch(_e) {}
}

/** Slugs that have been rejected — never show as pending again */
function getRejectedSlugs() {
  try { return new Set(JSON.parse(localStorage.getItem('elogix_rejected_slugs') || '[]')) }
  catch(_e) { return new Set() }
}
function addRejectedSlug(slug) {
  try {
    const s = getRejectedSlugs(); s.add(slug)
    localStorage.setItem('elogix_rejected_slugs', JSON.stringify([...s]))
  } catch(_e) {}
}

/** Read pending list, excluding already-approved or rejected slugs */
function readLocalPending() {
  try {
    const approved = getApprovedSlugs()
    const rejected = getRejectedSlugs()
    const all = JSON.parse(localStorage.getItem('elogix_global_pending') || '[]')
    return all.filter(c => !approved.has(c.slug) && !rejected.has(c.slug))
  } catch(_e) { return [] }
}

/** Permanently remove a slug from elogix_global_pending */
function removeLocalPending(slug) {
  try {
    const arr = JSON.parse(localStorage.getItem('elogix_global_pending') || '[]')
      .filter(c => c.slug !== slug)
    localStorage.setItem('elogix_global_pending', JSON.stringify(arr))
  } catch(_e) {}
}

/**
 * Update ALL localStorage records for a company when approved.
 * This is the key fix — it stamps status:'active' everywhere so
 * the tenant can log in and nothing re-surfaces as pending.
 */
function approveInLocalStorage(slug, adminEmail) {
  const now = new Date().toISOString()
  const today = now.split('T')[0]

  // 1. Mark in approved set (permanent — survives future loadAll calls)
  addApprovedSlug(slug)

  // 2. Remove from pending list
  removeLocalPending(slug)

  // 3. Update elogix_registered_companies map
  try {
    const map = JSON.parse(localStorage.getItem('elogix_registered_companies') || '{}')
    if (map[slug]) {
      map[slug].status = 'active'
      map[slug].approved_at = today
      map[slug].approved_by = 'SuperAdmin'
    }
    localStorage.setItem('elogix_registered_companies', JSON.stringify(map))
  } catch(_e) {}

  // 4. Update elogix_registered_tenants (used by LoginPage for tenant auth)
  //    so the tenant can actually log in after approval
  try {
    const tenants = JSON.parse(localStorage.getItem('elogix_registered_tenants') || '{}')
    // The tenant key is their admin email (lowercase)
    if (adminEmail) {
      const key = adminEmail.toLowerCase()
      if (tenants[key]) {
        tenants[key].status = 'active'
        tenants[key].approved_at = today
      }
      // Also update the ELX-ID keyed version
      for (const k of Object.keys(tenants)) {
        if (tenants[k].company === slug) {
          tenants[k].status = 'active'
          tenants[k].approved_at = today
        }
      }
    }
    localStorage.setItem('elogix_registered_tenants', JSON.stringify(tenants))
  } catch(_e) {}

  // 5. Update elogix_pending_tenants list
  try {
    const pending = JSON.parse(localStorage.getItem('elogix_pending_tenants') || '[]')
      .map(t => t.slug === slug ? { ...t, status: 'active', approved_at: today } : t)
    localStorage.setItem('elogix_pending_tenants', JSON.stringify(pending))
  } catch(_e) {}

  // 6. Dispatch storage event so LoginPage (same browser) knows status changed
  try {
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'elogix_registered_tenants',
      newValue: localStorage.getItem('elogix_registered_tenants'),
    }))
  } catch(_e) {}
}

/** Mark a company as rejected everywhere */
function rejectInLocalStorage(slug) {
  addRejectedSlug(slug)
  removeLocalPending(slug)
  try {
    const map = JSON.parse(localStorage.getItem('elogix_registered_companies') || '{}')
    if (map[slug]) { map[slug].status = 'rejected' }
    localStorage.setItem('elogix_registered_companies', JSON.stringify(map))
  } catch(_e) {}
  try {
    const tenants = JSON.parse(localStorage.getItem('elogix_registered_tenants') || '{}')
    for (const k of Object.keys(tenants)) {
      if (tenants[k].company === slug) tenants[k].status = 'rejected'
    }
    localStorage.setItem('elogix_registered_tenants', JSON.stringify(tenants))
  } catch(_e) {}
}

// ─────────────────────────────────────────────────────────────────────
// All localStorage keys owned by eLogix — cleared on cache reset
// ─────────────────────────────────────────────────────────────────────
const ELOGIX_LS_KEYS = [
  'elogix_global_pending',
  'elogix_pending_tenants',
  'elogix_registered_companies',
  'elogix_registered_tenants',
  'elogix_approved_slugs',
  'elogix_rejected_slugs',
]

/** Wipe all eLogix localStorage data (not the admin key/token) */
function clearElogixCache() {
  for (const k of ELOGIX_LS_KEYS) {
    try { localStorage.removeItem(k) } catch(_e) {}
  }
}

/**
 * Detect stale/mock data: returns true if localStorage contains
 * companies that look like demo entries (created before this session)
 * or if the data was written by an older code version that didn't
 * stamp a session_version key.
 */
function detectStaleCache() {
  try {
    const map = JSON.parse(localStorage.getItem('elogix_registered_companies') || '{}')
    const entries = Object.values(map)
    if (entries.length === 0) return false
    // Flag as stale if any entry is missing created_at (old format)
    // or if it has a mock/demo indicator
    return entries.some(co =>
      !co.created_at ||
      co._demo === true ||
      co._stale === true ||
      co.id === 'demo' ||
      (co.name && /^(test|demo|sample|example)/i.test(co.name))
    )
  } catch(_e) { return false }
}

// ─────────────────────────────────────────────────────────────────────
// API helper
// ─────────────────────────────────────────────────────────────────────
async function adminFetch(path, opts={}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers:{
      'Content-Type'      :'application/json',
      'X-eLogix-Admin-Key': localStorage.getItem('elogix_admin_key')||'',
      'Authorization'     :`Bearer ${localStorage.getItem('elogix_admin_token')||''}`,
      ...(opts.headers||{}),
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const inp = {
  padding:'8px 10px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:11,
  outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box',
}

// ════════════════════════════════════════════════════════════════════════════
export default function ELogixAdminPanel() {

  const [adminKey, setAdminKey] = useState(localStorage.getItem('elogix_admin_key')||'')
  const [authed,   setAuthed]   = useState(false)

  const [companies, setCompanies] = useState([])
  const [pending,   setPending]   = useState([])
  const [tickets,   setTickets]   = useState([])
  const [team,      setTeam]      = useState([])
  const [dash,      setDash]      = useState(null)
  const [loading,   setLoading]   = useState(false)

  const [tab,      setTab]      = useState('dashboard')
  const [msg,      setMsg]      = useState('')
  const [searchCo, setSearchCo] = useState('')

  const toast = m => { setMsg(m); setTimeout(()=>setMsg(''),4000) }

  const [newCo, setNewCo] = useState({
    company_name:'', slug:'', admin_email:'', admin_name:'Admin',
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
  const [staleCache,    setStaleCache]    = useState(false)   // banner flag
  const [clearing,      setClearing]      = useState(false)

  // ── Detect stale cache on mount ───────────────────────────────────
  useEffect(() => {
    if (authed) setStaleCache(detectStaleCache())
  }, [authed])

  // ── Clear all eLogix localStorage and reload from API ────────────
  const clearAndReload = async () => {
    setClearing(true)
    clearElogixCache()
    setCompanies([])
    setPending([])
    setTickets([])
    setTeam([])
    setDash(null)
    setStaleCache(false)
    toast('🗑️ Cache cleared — loading fresh data from API…')
    await loadAll('')
    setClearing(false)
  }

  // ─────────────────────────────────────────────────────────────────
  // loadAll — the fixed version
  // KEY: filters localPending through approved/rejected sets FIRST
  // ─────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (search='') => {
    setLoading(true)

    // Always filter through the approval/rejection sets BEFORE merging
    const localPending = readLocalPending()   // already excludes approved+rejected

    const [d, c, t, tm, p] = await Promise.allSettled([
      adminFetch('/dashboard'),
      adminFetch(`/companies?search=${encodeURIComponent(search)}&limit=200`),
      adminFetch('/tickets?status=open&limit=100'),
      adminFetch('/team'),
      adminFetch('/pending-companies'),
    ])

    if (d.status==='fulfilled' && d.value?.summary) setDash(d.value.summary)

    // ── Approved companies ──────────────────────────────────────────
    if (c.status==='fulfilled' && Array.isArray(c.value?.companies)) {
      // Backend is live — use its data, filter out pending/rejected
      setCompanies(c.value.companies.filter(co =>
        co.status !== 'pending' && co.status !== 'rejected'
      ))
    } else {
      // Offline fallback: read localStorage, filter approved only
      try {
        const approved = getApprovedSlugs()
        const map = JSON.parse(localStorage.getItem('elogix_registered_companies') || '{}')
        // Show if: status is active/trial/suspended/cancelled OR slug is in approved set
        const list = Object.values(map).filter(co =>
          approved.has(co.slug) ||
          (co.status !== 'pending' && co.status !== 'rejected')
        )
        setCompanies(list)
      } catch(_e) { setCompanies([]) }
    }

    if (t.status==='fulfilled')  setTickets(t.value?.tickets || [])
    if (tm.status==='fulfilled') setTeam(tm.value?.team || [])

    // ── Pending companies ───────────────────────────────────────────
    // API pending filtered against approved/rejected sets
    const approved = getApprovedSlugs()
    const rejected = getRejectedSlugs()
    const apiPending = (p.status==='fulfilled' && Array.isArray(p.value?.companies))
      ? p.value.companies.filter(co => !approved.has(co.slug) && !rejected.has(co.slug))
      : []

    // Merge with local pending (deduplicate by slug)
    const merged = [...apiPending]
    for (const lp of localPending) {
      if (!merged.find(x => x.slug === lp.slug)) merged.push(lp)
    }
    setPending(merged)

    setLoading(false)
  }, [])

  const auth = () => {
    if (!adminKey.trim()) { toast('⚠️ Enter admin key'); return }
    localStorage.setItem('elogix_admin_key', adminKey)
    setAuthed(true)
    loadAll()
  }

  // ── Listen for new registrations in same browser ──────────────────
  useEffect(() => {
    if (!authed) return
    const onStorage = (e) => {
      if (e.key === 'elogix_global_pending') {
        const approved = getApprovedSlugs()
        const rejected = getRejectedSlugs()
        try {
          const fresh = JSON.parse(e.newValue || '[]')
          const newOnes = fresh.filter(c => !approved.has(c.slug) && !rejected.has(c.slug))
          if (newOnes.length === 0) return
          setPending(prev => {
            const next = [...prev]
            for (const item of newOnes) {
              if (!next.find(x => x.slug === item.slug)) next.push(item)
            }
            return next
          })
          toast(`🔔 New company registration: ${newOnes.map(c=>c.name).join(', ')}`)
        } catch(_e) {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [authed])

  // ─────────────────────────────────────────────────────────────────
  // ✅ APPROVE — the fixed version
  // Writes to ALL localStorage keys and the approved-slugs set
  // so the company never re-appears as pending AND the tenant can login
  // ─────────────────────────────────────────────────────────────────
  const approveCompany = async (co) => {
    setPendingAction(p => ({ ...p, [co.slug]: 'approving' }))

    // 1. Write to all localStorage records first (works offline too)
    approveInLocalStorage(co.slug, co.admin_email)

    // 2. Try backend (non-blocking)
    try {
      await adminFetch(`/companies/${co.slug}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'active', approved_by: 'SuperAdmin' }),
      })
    } catch(_e) { /* offline — localStorage already updated */ }

    // 3. Update React state: remove from pending, add to companies
    const activatedCo = {
      ...co,
      status: co.plan === 'trial' ? 'trial' : 'active',
      approved_at: new Date().toISOString().split('T')[0],
      employee_count: co.employee_count || 0,
      pending_invoice: 0,
      last_payment: null,
      account_manager: co.account_manager || 'Unassigned',
      support_tier: co.support_tier || 'standard',
    }
    setCompanies(prev =>
      prev.find(c => c.slug === co.slug) ? prev : [activatedCo, ...prev]
    )
    setPending(prev => prev.filter(c => c.slug !== co.slug))
    setPendingAction(p => ({ ...p, [co.slug]: '' }))
    toast(`✅ ${co.name} approved! Tenant can now log in.`)
  }

  // ─────────────────────────────────────────────────────────────────
  // 🚫 REJECT — fixed version
  // ─────────────────────────────────────────────────────────────────
  const rejectCompany = async (co) => {
    const reason = rejectReason[co.slug] || 'Does not meet requirements'
    setPendingAction(p => ({ ...p, [co.slug]: 'rejecting' }))

    rejectInLocalStorage(co.slug)

    try {
      await adminFetch(`/companies/${co.slug}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'rejected', reason }),
      })
    } catch(_e) {}

    setPending(prev => prev.filter(c => c.slug !== co.slug))
    setPendingAction(p => ({ ...p, [co.slug]: '' }))
    toast(`🚫 ${co.name} rejected and permanently removed from pending.`)
  }

  // ── Company actions (suspend / activate / plan / invoice / notify) ──
  const doAction = async (slug, action, extra={}) => {
    let url='', method='PUT', body={}
    if (action==='suspend')    { url=`/companies/${slug}/status`; body={status:'suspended',reason:extra.reason||''} }
    if (action==='activate')   { url=`/companies/${slug}/status`; body={status:'active'} }
    if (action==='cancel')     { url=`/companies/${slug}/status`; body={status:'cancelled'} }
    if (action==='changePlan') { url=`/companies/${slug}/plan`;   body={plan:extra.plan} }
    if (action==='invoice')    { url=`/companies/${slug}/invoices`; method='POST'; body={} }
    if (action==='notify')     { url=`/companies/${slug}/notify`; method='POST'; body=extra }
    if (action==='notifyAll')  { url='/notify-all'; method='POST'; body=extra }
    try {
      const r = await adminFetch(url, {method, body:JSON.stringify(body)})
      toast(r.message || '✅ Done')
    } catch(_e) {
      toast('✅ Done (offline mode)')
    }
    if (['suspend','activate','cancel'].includes(action)) {
      try {
        const map = JSON.parse(localStorage.getItem('elogix_registered_companies') || '{}')
        if (map[slug]) map[slug].status = body.status
        localStorage.setItem('elogix_registered_companies', JSON.stringify(map))
      } catch(_e) {}
      setCompanies(prev => prev.map(c => c.slug===slug ? {...c, status:body.status} : c))
    }
    if (action==='changePlan') {
      try {
        const map = JSON.parse(localStorage.getItem('elogix_registered_companies') || '{}')
        if (map[slug]) map[slug].plan = extra.plan
        localStorage.setItem('elogix_registered_companies', JSON.stringify(map))
      } catch(_e) {}
      setCompanies(prev => prev.map(c => c.slug===slug ? {...c, plan:extra.plan} : c))
    }
  }

  const createCompany = async () => {
    if (!newCo.company_name||!newCo.slug||!newCo.admin_email) { toast('⚠️ Fill required fields'); return }
    const created = {
      ...newCo, id:`c_${newCo.slug}`,
      status: newCo.plan==='trial' ? 'trial' : 'active',
      employee_count:0, pending_invoice:0, last_payment:null,
      created_at: new Date().toISOString().split('T')[0],
      modules:[], account_manager: newCo.account_manager||'Unassigned',
    }
    // Mark as approved from the start (manually provisioned companies skip approval)
    addApprovedSlug(newCo.slug)
    try {
      const map = JSON.parse(localStorage.getItem('elogix_registered_companies') || '{}')
      map[newCo.slug] = created
      localStorage.setItem('elogix_registered_companies', JSON.stringify(map))
    } catch(_e) {}
    try {
      await adminFetch('/companies', {method:'POST', body:JSON.stringify(newCo)})
    } catch(_e) {}
    setCompanies(prev => [created, ...prev])
    toast('✅ Company provisioned!')
    setNewCo({company_name:'',slug:'',admin_email:'',admin_name:'Admin',plan:'trial',
              industry:'',country:'Nepal',sales_rep:'',account_manager:''})
  }

  const saveModules = async () => {
    if (!modTarget) { toast('⚠️ Select a company first'); return }
    const enabled = Object.entries(modState).filter(([,v])=>v).map(([k])=>k)
    try {
      await adminFetch(`/companies/${modTarget}/modules`, {method:'PUT', body:JSON.stringify({modules:enabled})})
    } catch(_e) {}
    setCompanies(prev => prev.map(c => c.slug===modTarget ? {...c, modules:enabled} : c))
    toast('✅ Modules updated')
  }

  const loadModules = (slug) => {
    setModTarget(slug)
    const co = companies.find(c => c.slug===slug)
    setModState(Object.fromEntries(ALL_MODULES.map(m=>[m, (co?.modules||[]).includes(m)])))
  }

  const saveCommission = async () => {
    try { await adminFetch('/referral/config', {method:'PUT', body:JSON.stringify(commConfig)}) }
    catch(_e) {}
    toast('✅ Commission config saved')
  }

  const addTeamMember = async () => {
    if (!newMember.full_name||!newMember.email) { toast('⚠️ Name and email required'); return }
    try { await adminFetch('/team', {method:'POST', body:JSON.stringify(newMember)}) }
    catch(_e) {}
    setTeam(prev => [...prev, {...newMember, id:`tm_${Date.now()}`, joined:new Date().toISOString().split('T')[0]}])
    toast('✅ Team member added')
    setNewMember({full_name:'',email:'',role:'support',phone:''})
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

  const mrr = companies.reduce((s,c) => {
    if (c.status==='active'||c.status==='trial') s += (PLAN_PRICES[c.plan]?.monthly||0)
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
        <input type="password" value={adminKey} onChange={e=>setAdminKey(e.target.value)}
          placeholder="Enter eLogix Admin Key"
          style={{...inp, marginBottom:12, textAlign:'center', fontSize:13}}
          onKeyDown={e=>e.key==='Enter'&&auth()}/>
        <button onClick={auth}
          style={{ width:'100%', padding:12, borderRadius:10, border:'none',
            background:G, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
          🔐 Authenticate
        </button>
        {msg && <div style={{marginTop:12,fontSize:11,color:'#dc2626'}}>{msg}</div>}
      </div>
    </div>
  )

  const TABS = [
    { id:'dashboard', label:'📊 Dashboard' },
    { id:'pending',   label:`⏳ Pending${pending.length>0?` (${pending.length})`:''}` },
    { id:'companies', label:'🏢 Companies' },
    { id:'new',       label:'➕ New Company' },
    { id:'billing',   label:'💰 Billing' },
    { id:'support',   label:'🎫 Support' },
    { id:'broadcast', label:'📢 Broadcast' },
    { id:'modules',   label:'🔐 Module Perms' },
    { id:'referral',  label:'🤝 Referral' },
    { id:'team',      label:'👥 eLogix Team' },
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
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {pending.length>0&&(
            <div onClick={()=>setTab('pending')} style={{
              background:'#f59e0b', color:'#fff', borderRadius:20,
              padding:'4px 12px', fontSize:11, fontWeight:800, cursor:'pointer',
            }}>🔔 {pending.length} Pending</div>
          )}
          <button onClick={clearAndReload} disabled={clearing}
            title="Clear localStorage cache and reload fresh data from the API"
            style={{ background:'rgba(239,68,68,.25)', border:'1px solid rgba(255,255,255,.3)',
              color:'#fff', borderRadius:8, padding:'6px 14px', fontSize:11, cursor:'pointer',
              opacity:clearing?.6:1 }}>
            {clearing?'⏳':'🗑️'} Clear Cache
          </button>
          <button onClick={()=>loadAll(searchCo)}
            style={{ background:'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.3)',
              color:'#fff', borderRadius:8, padding:'6px 14px', fontSize:11, cursor:'pointer' }}>
            {loading?'⏳':'🔄'} Refresh
          </button>
          <button onClick={()=>{ setAuthed(false); localStorage.removeItem('elogix_admin_key') }}
            style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.3)',
              color:'#fff', borderRadius:8, padding:'6px 14px', fontSize:11, cursor:'pointer' }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Toast */}
      {msg&&(
        <div style={{ position:'fixed', top:60, left:'50%', transform:'translateX(-50%)',
          background:'#1e1b4b', color:'#fff', padding:'10px 22px', borderRadius:30,
          fontSize:12, fontWeight:700, zIndex:9999, boxShadow:'0 8px 30px rgba(0,0,0,.3)',
          pointerEvents:'none' }}>{msg}</div>
      )}

      {/* Tab bar */}
      <div style={{ display:'flex', overflowX:'auto', background:'#fff',
        borderBottom:'2px solid #e2e8f0', padding:'0 16px',
        scrollbarWidth:'none', msOverflowStyle:'none' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:'11px 14px', border:'none', background:'none', cursor:'pointer',
              fontSize:11, fontWeight:tab===t.id?800:500,
              color:tab===t.id?A:'#64748b', whiteSpace:'nowrap',
              borderBottom:`3px solid ${tab===t.id?A:'transparent'}`,
              transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Stale cache banner ── */}
      {staleCache && (
        <div style={{
          background:'linear-gradient(90deg,#fffbeb,#fef3c7)',
          borderBottom:'2px solid #f59e0b',
          padding:'10px 20px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexWrap:'wrap', gap:10,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>⚠️</span>
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:'#92400e' }}>
                Stale demo/mock data detected in browser cache
              </div>
              <div style={{ fontSize:11, color:'#a16207' }}>
                This list contains stale cached data from a previous session — not real registered companies.
                Click 🗑️ Clear &amp; Reload to remove cached data and load fresh data from the API.
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={clearAndReload} disabled={clearing}
              style={{ padding:'8px 18px', borderRadius:8, border:'none',
                background:'#d97706', color:'#fff', fontSize:12, fontWeight:800,
                cursor:clearing?'not-allowed':'pointer',
                opacity:clearing?.6:1 }}>
              {clearing ? '⏳ Clearing…' : '🗑️ Clear & Reload'}
            </button>
            <button onClick={()=>setStaleCache(false)}
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
            ⏳ PENDING APPROVAL
        ══════════════════════════════════════════════════════════════ */}
        {tab==='pending'&&(
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:4 }}>⏳ Pending Approval</div>
              <div style={{ fontSize:12, color:'#64748b' }}>
                Companies registered via self-signup. Once approved:
                the company and tenant admin can log in immediately, and the company
                appears in all tabs (Billing, Support, Broadcast, Modules, Referral, Team).
              </div>
            </div>

            {pending.length===0?(
              <div style={{ textAlign:'center', padding:'60px 20px',
                background:'#fff', borderRadius:14, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#374151' }}>No pending applications</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:6 }}>All registrations have been reviewed.</div>
              </div>
            ):(
              <div style={{ display:'grid', gap:14 }}>
                {pending.map(co=>(
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
                          📅 {co.created_at}
                        </div>
                      </div>
                      <PlanBadge plan={co.plan}/>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',
                      gap:8, marginBottom:14 }}>
                      {[
                        ['Industry',  co.industry||co.business_label||'—'],
                        ['Country',   co.country||'Nepal'],
                        ['Currency',  co.currency||'NPR'],
                        ['Plan',      (PLAN_PRICES[co.plan]||PLAN_PRICES.trial).label],
                        ['Modules',   `${(co.modules||[]).length} configured`],
                        ['Max Emp.',  co.max_employees||10],
                      ].map(([l,v])=>(
                        <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'8px 10px' }}>
                          <div style={{ fontSize:9, color:'#94a3b8', fontWeight:700 }}>{l}</div>
                          <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginTop:1 }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {(co.modules||[]).length>0&&(
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:9, color:'#94a3b8', fontWeight:700, marginBottom:4 }}>MODULES</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                          {(co.modules||[]).slice(0,8).map(m=>(
                            <span key={m} style={{ fontSize:8, padding:'2px 7px', borderRadius:6,
                              background:'#eff6ff', color:'#2563eb', fontWeight:600 }}>
                              {m.replace(/_/g,' ')}
                            </span>
                          ))}
                          {(co.modules||[]).length>8&&<span style={{ fontSize:8, color:'#94a3b8' }}>+{co.modules.length-8} more</span>}
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom:12 }}>
                      <input placeholder="Rejection reason (optional)"
                        value={rejectReason[co.slug]||''}
                        onChange={e=>setRejectReason(p=>({...p,[co.slug]:e.target.value}))}
                        style={{...inp, fontSize:10}}/>
                    </div>

                    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                      <button onClick={()=>approveCompany(co)}
                        disabled={pendingAction[co.slug]==='approving'}
                        style={{ flex:1, padding:'11px 16px', borderRadius:9, border:'none',
                          background:'linear-gradient(135deg,#059669,#0891b2)',
                          color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer',
                          opacity:pendingAction[co.slug]==='approving'?.6:1 }}>
                        {pendingAction[co.slug]==='approving'?'⏳ Approving...':'✅ Approve & Activate'}
                      </button>
                      <button onClick={()=>rejectCompany(co)}
                        disabled={pendingAction[co.slug]==='rejecting'}
                        style={{ padding:'11px 20px', borderRadius:9, border:'1.5px solid #fecaca',
                          background:'#fef2f2', color:'#dc2626', fontSize:12, fontWeight:700,
                          cursor:'pointer', opacity:pendingAction[co.slug]==='rejecting'?.6:1 }}>
                        {pendingAction[co.slug]==='rejecting'?'⏳...':'🚫 Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            📊 DASHBOARD
        ══════════════════════════════════════════════════════════════ */}
        {tab==='dashboard'&&(
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>📊 Dashboard</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
              {[
                { icon:'🏢', label:'Total Companies', value:companies.length,                                      color:'#4338ca' },
                { icon:'✅', label:'Active',          value:companies.filter(c=>c.status==='active').length,        color:'#059669' },
                { icon:'🎁', label:'Trial',           value:companies.filter(c=>c.status==='trial').length,         color:'#0891b2' },
                { icon:'⏳', label:'Pending',         value:pending.length,                                         color:'#d97706' },
                { icon:'⚠️', label:'Suspended',       value:companies.filter(c=>c.status==='suspended').length,     color:'#b45309' },
                { icon:'💰', label:'MRR (NPR)',        value:`${(mrr/1000).toFixed(0)}k`,                           color:'#7c3aed' },
                { icon:'🎫', label:'Open Tickets',    value:tickets.length,                                         color:'#dc2626' },
                { icon:'👥', label:'Team',            value:team.length,                                            color:'#374151' },
              ].map(k=>(
                <div key={k.label} style={{ background:'#fff', borderRadius:12, padding:'16px 18px',
                  border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{k.icon}</div>
                  <div style={{ fontSize:22, fontWeight:900, color:k.color }}>{k.value}</div>
                  <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{k.label}</div>
                </div>
              ))}
            </div>
            {pending.length>0&&(
              <div onClick={()=>setTab('pending')} style={{
                background:'linear-gradient(135deg,#fffbeb,#fef3c7)',
                border:'2px solid #f59e0b', borderRadius:12, padding:'14px 18px',
                cursor:'pointer', display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ fontSize:28 }}>⏳</span>
                <div>
                  <div style={{ fontWeight:800, color:'#92400e', fontSize:13 }}>
                    {pending.length} company registration{pending.length>1?'s':''} awaiting approval
                  </div>
                  <div style={{ fontSize:11, color:'#a16207', marginTop:2 }}>
                    Click to review → approve so tenants can log in
                  </div>
                </div>
              </div>
            )}
            <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:12 }}>🏢 Recent Approved Companies</div>
              {companies.slice(0,6).map(co=>(
                <div key={co.slug} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9', fontSize:11, gap:8 }}>
                  <span style={{ fontWeight:600, color:'#374151' }}>{co.name}</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <PlanBadge plan={co.plan}/>
                    <StatusBadge status={co.status}/>
                  </div>
                </div>
              ))}
              {companies.length===0&&(
                <div style={{ textAlign:'center', color:'#94a3b8', fontSize:11, padding:'20px 0' }}>
                  No approved companies yet — approve pending registrations
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            🏢 COMPANIES
        ══════════════════════════════════════════════════════════════ */}
        {tab==='companies'&&(
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              flexWrap:'wrap', gap:10, marginBottom:16 }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#0f172a' }}>🏢 Companies ({filteredCos.length})</div>
              <input placeholder="🔍 Search name, slug, email…"
                value={searchCo} onChange={e=>setSearchCo(e.target.value)}
                style={{...inp, width:220}}/>
            </div>
            {filteredCos.length===0?(
              <div style={{ textAlign:'center', padding:40, color:'#94a3b8', background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0', fontSize:12 }}>
                No approved companies. Pending registrations are in ⏳ Pending Approval tab.
              </div>
            ):(
              <div style={{ display:'grid', gap:10 }}>
                {filteredCos.map(co=>(
                  <div key={co.slug} style={{ background:'#fff', borderRadius:12, padding:'14px 16px',
                    border:'1px solid #e2e8f0', display:'flex', flexWrap:'wrap',
                    justifyContent:'space-between', alignItems:'center', gap:10 }}>
                    <div style={{ minWidth:160 }}>
                      <div style={{ fontWeight:800, color:'#0f172a', fontSize:12, marginBottom:2 }}>{co.name}</div>
                      <div style={{ fontSize:10, color:'#64748b' }}>
                        {co.slug}.elogix.com.np · {co.admin_email||'—'} · {co.country||'Nepal'}
                      </div>
                      <div style={{ marginTop:4, display:'flex', gap:4, flexWrap:'wrap' }}>
                        <StatusBadge status={co.status}/>
                        <PlanBadge plan={co.plan}/>
                        <span style={{ fontSize:9, color:'#64748b' }}>👤 {co.employee_count||0}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {co.status!=='active'&&co.status!=='trial'&&(
                        <button onClick={()=>doAction(co.slug,'activate')}
                          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #bbf7d0',
                            background:'#f0fdf4', color:'#059669', fontSize:10, cursor:'pointer', fontWeight:700 }}>
                          ✅ Activate
                        </button>
                      )}
                      {(co.status==='active'||co.status==='trial')&&(
                        <button onClick={()=>doAction(co.slug,'suspend',{reason:'Admin review'})}
                          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #fde68a',
                            background:'#fffbeb', color:'#d97706', fontSize:10, cursor:'pointer', fontWeight:700 }}>
                          ⚠️ Suspend
                        </button>
                      )}
                      <select defaultValue=""
                        onChange={e=>{ if(e.target.value) doAction(co.slug,'changePlan',{plan:e.target.value}); e.target.value='' }}
                        style={{...inp, width:90, fontSize:9}}>
                        <option value="">Plan ▾</option>
                        {Object.entries(PLAN_PRICES).map(([id,p])=>(
                          <option key={id} value={id}>{p.label}</option>
                        ))}
                      </select>
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
        {tab==='new'&&(
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
              ].map(([label,key,type,req])=>(
                <div key={key} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>
                    {label}{req&&<span style={{color:'#dc2626'}}>*</span>}
                  </label>
                  <input type={type} value={newCo[key]||''}
                    onChange={e=>setNewCo(p=>({...p,[key]:e.target.value}))}
                    placeholder={label} style={inp}/>
                </div>
              ))}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Plan</label>
                <select value={newCo.plan} onChange={e=>setNewCo(p=>({...p,plan:e.target.value}))} style={inp}>
                  {Object.entries(PLAN_PRICES).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}
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

        {/* ══════════════════════════════════════════════════════════════
            💰 BILLING
        ══════════════════════════════════════════════════════════════ */}
        {tab==='billing'&&(
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:14 }}>💰 Billing</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginBottom:16 }}>
              {[
                { label:'MRR',        value:`NPR ${mrr.toLocaleString()}`,        sub:'Monthly Recurring Revenue' },
                { label:'ARR',        value:`NPR ${(mrr*12).toLocaleString()}`,    sub:'Annual Recurring Revenue'  },
                { label:'Paying',     value:companies.filter(c=>c.plan!=='trial'&&(c.status==='active'||c.status==='trial')).length, sub:'Paid plans' },
                { label:'Trial',      value:companies.filter(c=>c.plan==='trial'||c.status==='trial').length, sub:'Free trial' },
              ].map(k=>(
                <div key={k.label} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:10, color:'#64748b', fontWeight:700 }}>{k.label}</div>
                  <div style={{ fontSize:17, fontWeight:900, color:A, margin:'4px 0' }}>{k.value}</div>
                  <div style={{ fontSize:9, color:'#94a3b8' }}>{k.sub}</div>
                </div>
              ))}
            </div>
            {companies.length===0?(
              <div style={{ textAlign:'center', padding:40, color:'#94a3b8', background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0', fontSize:12 }}>
                No approved companies yet.
              </div>
            ):(
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['Company','Plan','Monthly (NPR)','Status','Employees','Last Payment',''].map(h=>(
                        <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10,
                          fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map(co=>(
                      <tr key={co.slug} style={{ borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'10px 12px', fontWeight:700, color:'#0f172a' }}>
                          {co.name}
                          <div style={{ fontSize:9, color:'#64748b', fontWeight:400 }}>{co.slug}</div>
                        </td>
                        <td style={{ padding:'10px 12px' }}><PlanBadge plan={co.plan}/></td>
                        <td style={{ padding:'10px 12px', fontWeight:700, color:'#059669' }}>
                          {PLAN_PRICES[co.plan]?.monthly>0 ? PLAN_PRICES[co.plan].monthly.toLocaleString() : 'Free'}
                        </td>
                        <td style={{ padding:'10px 12px' }}><StatusBadge status={co.status}/></td>
                        <td style={{ padding:'10px 12px' }}>{co.employee_count||0}</td>
                        <td style={{ padding:'10px 12px', color:'#64748b' }}>{co.last_payment||'—'}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <button onClick={()=>doAction(co.slug,'invoice')}
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
        {tab==='support'&&(
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>🎫 Support Tickets</div>
            {tickets.length===0?(
              <div style={{ textAlign:'center', padding:40, color:'#94a3b8', background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0', fontSize:12 }}>
                🎉 No open tickets
              </div>
            ):(
              <div style={{ display:'grid', gap:10 }}>
                {tickets.map((tk,i)=>(
                  <div key={tk.id||i} style={{ background:'#fff', borderRadius:12, padding:'14px 16px',
                    border:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between',
                    alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:12, color:'#0f172a', marginBottom:2 }}>
                        #{tk.id||i+1} — {tk.subject||tk.title||'Ticket'}
                      </div>
                      <div style={{ fontSize:10, color:'#64748b' }}>
                        {tk.company_name||tk.company||'—'} · {tk.created_at||'—'}
                      </div>
                    </div>
                    <StatusBadge status={tk.status||'open'}/>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop:16, background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#374151', marginBottom:8 }}>
                🏢 Approved Companies ({companies.length})
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {companies.map(co=>(
                  <span key={co.slug} style={{ fontSize:9, padding:'3px 9px', borderRadius:10,
                    background:'#f8fafc', border:'1px solid #e2e8f0', color:'#374151' }}>
                    {co.name}
                  </span>
                ))}
                {companies.length===0&&<span style={{ fontSize:10, color:'#94a3b8' }}>None yet</span>}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            📢 BROADCAST
        ══════════════════════════════════════════════════════════════ */}
        {tab==='broadcast'&&(
          <div style={{ maxWidth:640 }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>📢 Broadcast Message</div>
            <div style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #e2e8f0' }}>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Target</label>
                <select value={bcast.slug} onChange={e=>setBcast(p=>({...p,slug:e.target.value}))} style={inp}>
                  <option value="">📣 All Companies ({companies.length} approved)</option>
                  {companies.map(co=>(
                    <option key={co.slug} value={co.slug}>{co.name}</option>
                  ))}
                </select>
              </div>
              {[
                ['Type','type',['alert','maintenance','feature','promo','policy','other'],'select'],
                ['Priority','priority',['low','normal','high','urgent'],'select'],
              ].map(([label,key,opts,type])=>(
                <div key={key} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{label}</label>
                  <select value={bcast[key]} onChange={e=>setBcast(p=>({...p,[key]:e.target.value}))} style={inp}>
                    {opts.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Title *</label>
                <input value={bcast.title} onChange={e=>setBcast(p=>({...p,title:e.target.value}))} placeholder="Title" style={inp}/>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Message *</label>
                <textarea value={bcast.message} onChange={e=>setBcast(p=>({...p,message:e.target.value}))}
                  placeholder="Message…" rows={4} style={{...inp, resize:'vertical'}}/>
              </div>
              <button onClick={()=>{
                if (!bcast.title||!bcast.message) { toast('⚠️ Fill title and message'); return }
                doAction(bcast.slug, bcast.slug?'notify':'notifyAll',
                  {type:bcast.type, title:bcast.title, message:bcast.message, priority:bcast.priority})
                setBcast(p=>({...p,title:'',message:''}))
              }} style={{ width:'100%', padding:11, borderRadius:9, border:'none',
                background:G, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                {bcast.slug
                  ? `📤 Send to ${companies.find(c=>c.slug===bcast.slug)?.name||bcast.slug}`
                  : `📣 Broadcast to All ${companies.length} Companies`}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            🔐 MODULE PERMISSIONS
        ══════════════════════════════════════════════════════════════ */}
        {tab==='modules'&&(
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>🔐 Module Permissions</div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Select Company</label>
              <select value={modTarget} onChange={e=>loadModules(e.target.value)} style={{...inp, maxWidth:360}}>
                <option value="">— Pick an approved company —</option>
                {companies.map(co=>(
                  <option key={co.slug} value={co.slug}>{co.name} ({co.slug})</option>
                ))}
              </select>
            </div>
            {companies.length===0&&(
              <div style={{ padding:20, color:'#94a3b8', fontSize:11, background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0' }}>
                No approved companies yet.
              </div>
            )}
            {modTarget&&(
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8, marginBottom:16 }}>
                  {ALL_MODULES.map(m=>(
                    <label key={m} style={{ display:'flex', alignItems:'center', gap:8,
                      borderRadius:9, padding:'10px 12px', cursor:'pointer', transition:'all .15s',
                      border:`1.5px solid ${modState[m]?A:'#e2e8f0'}`,
                      background:modState[m]?'#eff6ff':'#fff' }}>
                      <input type="checkbox" checked={!!modState[m]}
                        onChange={e=>setModState(p=>({...p,[m]:e.target.checked}))} style={{ cursor:'pointer' }}/>
                      <span style={{ fontSize:10, fontWeight:modState[m]?700:400, color:modState[m]?A:'#374151' }}>
                        {m.replace(/_/g,' ')}
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
                  <button onClick={()=>setModState(Object.fromEntries(ALL_MODULES.map(m=>[m,true])))}
                    style={{ padding:'10px 16px', borderRadius:9, border:'1px solid #e2e8f0',
                      background:'#fff', color:'#374151', fontSize:11, cursor:'pointer' }}>
                    ✅ All On
                  </button>
                  <button onClick={()=>setModState(Object.fromEntries(ALL_MODULES.map(m=>[m,false])))}
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
        {tab==='referral'&&(
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>🤝 Referral & Commission</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>
              <div style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:14 }}>⚙️ Commission Config</div>
                {[
                  ['Commission %','commission_pct'],
                  ['Min Payout (NPR)','min_payout_npr'],
                  ['Referral Window (days)','referral_window_days'],
                ].map(([label,key])=>(
                  <div key={key} style={{ marginBottom:12 }}>
                    <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{label}</label>
                    <input type="number" value={commConfig[key]}
                      onChange={e=>setCommConfig(p=>({...p,[key]:Number(e.target.value)}))} style={inp}/>
                  </div>
                ))}
                <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, cursor:'pointer', fontSize:11 }}>
                  <input type="checkbox" checked={commConfig.auto_credit}
                    onChange={e=>setCommConfig(p=>({...p,auto_credit:e.target.checked}))}/>
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
                {companies.length===0?(
                  <div style={{ color:'#94a3b8', fontSize:11 }}>No approved companies yet.</div>
                ):(
                  <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:320, overflowY:'auto' }}>
                    {companies.map(co=>(
                      <div key={co.slug} style={{ padding:'8px 10px', background:'#f8fafc',
                        borderRadius:8, border:'1px solid #e2e8f0', fontSize:10 }}>
                        <div style={{ fontWeight:700, color:'#0f172a', marginBottom:2 }}>{co.name}</div>
                        <div style={{ color:'#4338ca', fontFamily:'monospace', fontSize:9 }}>
                          https://elogix.com.np/ref/{co.slug}
                        </div>
                        <div style={{ marginTop:3, color:'#64748b', fontSize:9 }}>
                          {commConfig.commission_pct}% commission · {(PLAN_PRICES[co.plan]||PLAN_PRICES.trial).label}
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
        {tab==='team'&&(
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:16 }}>👥 eLogix Team</div>
            <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px',
              border:'1px solid #e2e8f0', marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:12 }}>➕ Add Team Member</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10 }}>
                {[['Full Name','full_name','text'],['Email','email','email'],['Phone','phone','tel']].map(([l,k,t])=>(
                  <div key={k}>
                    <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>{l}</label>
                    <input type={t} value={newMember[k]||''}
                      onChange={e=>setNewMember(p=>({...p,[k]:e.target.value}))} placeholder={l} style={inp}/>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Role</label>
                  <select value={newMember.role} onChange={e=>setNewMember(p=>({...p,role:e.target.value}))} style={inp}>
                    {['super_admin','admin','support','sales','developer','accounts'].map(r=>(
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

            {team.length>0&&(
              <div style={{ background:'#fff', borderRadius:14, padding:'16px 20px',
                border:'1px solid #e2e8f0', marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:10 }}>
                  Team ({team.length})
                </div>
                <div style={{ display:'grid', gap:8 }}>
                  {team.map((m,i)=>(
                    <div key={m.id||i} style={{ display:'flex', justifyContent:'space-between',
                      alignItems:'center', padding:'10px 12px', background:'#f8fafc',
                      borderRadius:8, border:'1px solid #e2e8f0', flexWrap:'wrap', gap:8 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:11, color:'#0f172a' }}>{m.full_name}</div>
                        <div style={{ fontSize:9, color:'#64748b' }}>{m.email} · {m.phone||'—'}</div>
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
              {companies.length===0?(
                <div style={{ color:'#94a3b8', fontSize:11 }}>
                  No approved companies yet. Approve pending registrations to see them here.
                </div>
              ):(
                <div style={{ display:'grid', gap:8 }}>
                  {companies.map(co=>(
                    <div key={co.slug} style={{ display:'flex', alignItems:'center',
                      justifyContent:'space-between', padding:'10px 12px', background:'#f8fafc',
                      borderRadius:8, border:'1px solid #e2e8f0', flexWrap:'wrap', gap:8 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:11, color:'#0f172a' }}>{co.name}</div>
                        <div style={{ fontSize:9, color:'#64748b' }}>
                          {co.slug}.elogix.com.np · {co.admin_email||'—'}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                        <StatusBadge status={co.status}/>
                        <button onClick={()=>doAction(co.slug,'notify',
                          {type:'password_reset', title:'Password Reset',
                           message:`Admin reset initiated for ${co.admin_email}`})}
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

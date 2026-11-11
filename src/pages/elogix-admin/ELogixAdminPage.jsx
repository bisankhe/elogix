// FILE: src/pages/elogix-admin/ELogixAdminPage.jsx
// eLogix Technologies — Internal SuperAdmin Panel
// VERSION: FINAL — All stale data bugs fixed
// ─────────────────────────────────────────────────────────────────────
// CRITICAL FIXES vs previous version:
//   1. On mount → wipes elogix_registered_companies + elogix_global_pending
//      from localStorage BEFORE any state is set. This is the root cause of
//      "subisu limited / Mainawati Steels / HR Hub" appearing.
//   2. loadFromAPI() is the ONLY data source for companies list.
//      No localStorage reads for company data, ever.
//   3. Stat cards are clickable buttons that navigate to the relevant tab.
//   4. Invoice button calls POST /companies/:slug/invoices (not just toast).
//   5. Plan change calls PUT /companies/:slug/plan API.
//   6. Broadcast and Notify modals use controlled state + call API.
//   7. Approval calls POST /companies/:slug/approve (correct endpoint).
//   8. Reject calls POST /companies/:slug/reject (correct endpoint).
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import TenantModulePermissionPage from '../../components/dashboard/snapshots/TenantModulePermissionPage.jsx'
import ReferralCommissionPage     from '../../components/dashboard/snapshots/ReferralCommissionPage.jsx'

const G   = 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#6366f1 100%)'
const A   = '#4338ca'
const API = '/api/elogix-admin/v1'

const inp = {
  width:'100%', padding:'9px 12px', borderRadius:8,
  border:'1.5px solid #e2e8f0', fontSize:11, outline:'none',
  fontFamily:'inherit', boxSizing:'border-box',
}

const PLAN_COLORS = {
  trial:'#10b981', starter:'#0891b2', growth:'#0369a1',
  business:'#7c3aed', enterprise:'#d97706', unlimited:'#dc2626',
}
const PLAN_PRICES = {
  trial:0, starter:5000, growth:12000, business:25000, enterprise:45000, unlimited:75000,
}
const STATUS_COLORS = {
  trial    :{ bg:'#f0fdf4', c:'#059669', b:'#bbf7d0', icon:'🆓' },
  active   :{ bg:'#eff6ff', c:'#0369a1', b:'#bae6fd', icon:'✅' },
  pending  :{ bg:'#fffbeb', c:'#d97706', b:'#fde68a', icon:'⏳' },
  suspended:{ bg:'#fffbeb', c:'#d97706', b:'#fde68a', icon:'⏸'  },
  cancelled:{ bg:'#fef2f2', c:'#dc2626', b:'#fecaca', icon:'❌' },
  rejected :{ bg:'#fef2f2', c:'#dc2626', b:'#fecaca', icon:'🚫' },
}
const MAX_EMPLOYEES_BY_PLAN = {
  trial:10, starter:50, growth:250, business:500, enterprise:1000, unlimited:999999,
}

// ─────────────────────────────────────────────────────────────────────
// Safe localStorage wrapper — never throws, works in minified builds
// ─────────────────────────────────────────────────────────────────────
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
  remove(key) { try { window.localStorage.removeItem(key) } catch(_e) {} },
  keys() {
    try { const ks=[]; for(let i=0;i<window.localStorage.length;i++) ks.push(window.localStorage.key(i)); return ks }
    catch(_e) { return [] }
  },
}

// ─────────────────────────────────────────────────────────────────────
// NUCLEAR OPTION: wipe ALL old stale elogix localStorage keys
// Called on EVERY mount — this is what prevents demo data from appearing
// ─────────────────────────────────────────────────────────────────────
function nukeStaleCacheKeys() {
  // These keys were written by old RegisterPage.jsx / old ELogixAdminPanel.jsx
  // They must NEVER be used as a data source for the admin panel
  const staleKeys = [
    'elogix_registered_companies',
    'elogix_global_pending',
    'elogix_pending_companies',
    'elogix_companies_cache',
    'elogix_companies',
    'elogix_all_companies',
  ]
  staleKeys.forEach(k => ls.remove(k))

  // Also wipe any key that looks like a company slug cache
  ls.keys().filter(k =>
    k && k.startsWith('elogix_') &&
    !['elogix_admin_key','elogix_admin_token','elogix_admin_user',
      'elogix_registered_tenants','elogix_session','elogix_auth',
      'elogix_token','elogix_access_token'].includes(k)
  ).forEach(k => ls.remove(k))
}

// ─────────────────────────────────────────────────────────────────────
// Admin auth headers — reads from window.localStorage at call time
// ─────────────────────────────────────────────────────────────────────
function adminHeaders() {
  const adminKey = ls.get('elogix_admin_key', '')

  // Token can be stored in multiple places depending on login flow:
  // 1. localStorage elogix_admin_token  (set by LoginPage on login)
  // 2. localStorage access_token        (set by LoginPage as fallback)
  // 3. sessionStorage elogix_session    (the full session object)
  let token = ls.get('elogix_admin_token', '') || ls.get('access_token', '')
  if (!token) {
    try {
      const sess = JSON.parse(sessionStorage.getItem('elogix_session') || 'null')
      token = sess?.token || sess?.access_token || ''
      // Persist it to localStorage so future calls find it
      if (token) window.localStorage.setItem('elogix_admin_token', token)
    } catch(_e) {}
  }

  return {
    'Content-Type'      : 'application/json',
    'X-eLogix-Admin-Key': adminKey,
    'Authorization'     : token ? `Bearer ${token}` : '',
  }
}

async function apiFetch(method, path, body) {
  const opts = { method, headers: adminHeaders() }
  if (body) opts.body = JSON.stringify(body)
  const res  = await fetch(`${API}${path}`, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)
  return data
}

function downloadCSV(data, filename) {
  if (!data?.length) return
  const headers = Object.keys(data[0])
  const rows    = data.map(row => headers.map(h => JSON.stringify(String(row[h]??''))).join(','))
  const csv     = [headers.join(','), ...rows].join('\n')
  const blob    = new Blob([csv], { type:'text/csv;charset=utf-8;' })
  const url     = URL.createObjectURL(blob)
  const a       = Object.assign(document.createElement('a'), { href:url, download:filename })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ════════════════════════════════════════════════════════════════════════════
export default function ELogixAdminPage({ onLogout }) {

  const [tab,            setTab]            = useState('dashboard')
  const [companies,      setCompanies]      = useState([])
  const [pendingTenants, setPendingTenants] = useState([])
  const [tickets,        setTickets]        = useState([])
  const [invoices,       setInvoices]       = useState([])
  const [team,           setTeam]           = useState([])

  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected,     setSelected]     = useState(null)
  const [apiLoading,   setApiLoading]   = useState(false)
  const [apiError,     setApiError]     = useState(null)
  const [msg,          setMsg]          = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showNotifyModal, setShowNotifyModal] = useState(null)
  const [showPwModal,     setShowPwModal]     = useState(false)
  const [pwTarget,        setPwTarget]        = useState(null)

  const [createForm, setCreateForm] = useState({
    company_name:'', slug:'', admin_email:'', admin_name:'',
    plan:'starter', industry:'', country:'Nepal', phone:'',
    account_manager:'', sales_rep:'',
  })
  const [pwForm, setPwForm] = useState({
    admin_name:'', admin_email:'', phone:'',
    new_password:'', confirm_password:'', reason:'',
  })
  const [pwLoading,  setPwLoading]  = useState(false)
  const [pwMsg,      setPwMsg]      = useState('')
  const [showPwText, setShowPwText] = useState(false)

  // Controlled state for Broadcast and Notify modals
  const [bcastForm, setBcastForm] = useState({ type:'alert', priority:'normal', title:'', message:'', target:'all' })
  const [notifyForm, setNotifyForm] = useState({ title:'', message:'' })

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 4500) }

  // ─────────────────────────────────────────────────────────────────
  // MOUNT: nuke stale keys BEFORE loading any data from API
  // This is the definitive fix for subisu/Mainawati/HR Hub appearing
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    nukeStaleCacheKeys()
    loadFromAPI()
    const interval = setInterval(() => loadFromAPI(), 30_000)
    return () => clearInterval(interval)
  }, [])

  // ─────────────────────────────────────────────────────────────────
  // loadFromAPI — API IS the ONLY source of truth for company data
  // localStorage is NEVER read for company lists here
  // ─────────────────────────────────────────────────────────────────
  const loadFromAPI = useCallback(async () => {
    setApiLoading(true)
    setApiError(null)
    try {
      const h = adminHeaders()

      const [cosRes, pendRes, tixRes, tmRes] = await Promise.allSettled([
        fetch(`${API}/companies?limit=500`, { headers:h }),
        fetch(`${API}/pending-companies`,    { headers:h }),
        fetch(`${API}/tickets?status=open&limit=100`, { headers:h }),
        fetch(`${API}/team`,                 { headers:h }),
      ])

      // Active / approved companies
      if (cosRes.status === 'fulfilled' && cosRes.value.ok) {
        const d   = await cosRes.value.json()
        const raw = d.companies || d.data || []
        setCompanies(raw.filter(c => c.status !== 'pending' && c.status !== 'rejected').map(normalizeCompany))
      } else {
        const errText = cosRes.status === 'rejected'
          ? cosRes.reason?.message
          : `HTTP ${cosRes.value?.status}`
        setApiError(`Companies API: ${errText}`)
      }

      // Pending registrations
      if (pendRes.status === 'fulfilled' && pendRes.value.ok) {
        const d   = await pendRes.value.json()
        const raw = d.companies || d.data || []
        setPendingTenants(raw.map(co => ({
          ...normalizeCompany(co),
          status       : co.status || 'pending',
          registered_at: co.registered_at || co.created_at || new Date().toISOString(),
        })))
      }

      if (tixRes.status === 'fulfilled' && tixRes.value.ok) {
        const d = await tixRes.value.json(); setTickets(d.tickets || d.data || [])
      }
      if (tmRes.status === 'fulfilled' && tmRes.value.ok) {
        const d = await tmRes.value.json(); setTeam(d.team || d.data || [])
      }
    } catch(err) {
      setApiError('API unavailable — ' + err.message)
    } finally {
      setApiLoading(false)
    }
  }, [])

  function normalizeCompany(co) {
    return {
      id             : co.id || `api_${co.slug}`,
      slug           : co.slug   || '',
      name           : co.name   || co.company_name || co.slug || 'Unknown',
      plan           : co.plan   || 'trial',
      status         : co.status || 'active',
      business_type  : co.business_type || 'custom',
      industry       : co.industry || co.business_type?.replace(/_/g,' ') || '',
      admin_email    : co.admin_email    || '',
      admin_name     : co.admin_name     || '',
      phone          : co.phone          || '',
      country        : co.country        || 'Nepal',
      currency       : co.currency       || 'NPR',
      employee_count : co.employee_count || 0,
      max_employees  : co.max_employees  || MAX_EMPLOYEES_BY_PLAN[co.plan] || 10,
      account_manager: co.account_manager || '',
      support_tier   : co.support_tier   || 'standard',
      pending_invoice: co.pending_invoice || 0,
      last_payment   : co.last_payment   || null,
      created_at     : (co.created_at || co.registered_at || '').split('T')[0],
      approved_at    : (co.approved_at || co.created_at   || '').split('T')[0],
      modules        : co.modules || [],
    }
  }

  // ── Status / plan actions ─────────────────────────────────────────
  const handleAction = async (slug, action, extra = {}) => {
    const newStatus = action === 'reactivate' ? 'active'
                    : action === 'suspend'     ? 'suspended'
                    : 'cancelled'
    setCompanies(p => p.map(c => c.slug === slug ? { ...c, status:newStatus } : c))
    notify(action === 'suspend'    ? `⏸ ${slug} suspended`
         : action === 'reactivate' ? `✅ ${slug} reactivated`
         : `❌ ${slug} cancelled`)
    setSelected(null)
    try {
      const res = await fetch(`${API}/companies/${slug}/status`, {
        method:'PUT', headers:adminHeaders(),
        body: JSON.stringify({ status:newStatus, ...extra }),
      })
      if (!res.ok) { notify('⚠️ Status change failed — reloading'); await loadFromAPI() }
    } catch(_e) { notify('⚠️ Network error — reloading'); await loadFromAPI() }
  }

  // ── Approve pending tenant ────────────────────────────────────────
  // FIX: calls POST /companies/:slug/approve (not PUT /status)
  const approveTenant = async (tenant) => {
    setPendingTenants(prev => prev.filter(t => t.slug !== tenant.slug))
    try {
      const res = await fetch(`${API}/companies/${tenant.slug}/approve`, {
        method:'POST', headers:adminHeaders(),
        body: JSON.stringify({
          plan         : tenant.plan || 'trial',
          business_type: tenant.business_type || 'custom',
          admin_email  : tenant.admin_email,
          approved_by  : 'eLogix SuperAdmin',
        }),
      })
      if (res.ok) {
        notify(`✅ ${tenant.name} approved! Tenant can now log in.`)
        // Update offline login fallback — only elogix_registered_tenants (not companies)
        const ru = ls.getJSON('elogix_registered_tenants', {})
        const k  = tenant.admin_email?.toLowerCase()
        if (ru && k && ru[k]) { ru[k].company_status = 'active'; ls.set('elogix_registered_tenants', ru) }
        await loadFromAPI()
      } else {
        setPendingTenants(prev => [...prev, tenant])
        const err = await res.json().catch(() => ({}))
        notify(`⚠️ Approval failed: ${err.message || err.error || res.status}`)
      }
    } catch(_e) {
      setPendingTenants(prev => [...prev, tenant])
      notify(`⚠️ Network error — could not approve ${tenant.name}`)
    }
  }

  const approveWithPassword = (t) => {
    const pw = window.prompt(`Set password for ${t.admin_email}\n(Cancel = keep registered password):`)
    if (pw?.trim()) {
      const ru = ls.getJSON('elogix_registered_tenants', {})
      const k  = t.admin_email?.toLowerCase()
      if (ru && k && ru[k]) { ru[k].pw = pw.trim(); ls.set('elogix_registered_tenants', ru) }
    }
    approveTenant(t)
  }

  // ── Reject pending tenant ─────────────────────────────────────────
  // FIX: calls POST /companies/:slug/reject (not PUT /status)
  const rejectTenant = async (tenant) => {
    setPendingTenants(prev => prev.filter(t => t.slug !== tenant.slug))
    try {
      await fetch(`${API}/companies/${tenant.slug}/reject`, {
        method:'POST', headers:adminHeaders(),
        body: JSON.stringify({ reason:'Rejected by SuperAdmin' }),
      })
    } catch(_e) {}
    const ru = ls.getJSON('elogix_registered_tenants', {})
    if (ru && tenant.admin_email) { delete ru[tenant.admin_email.toLowerCase()]; ls.set('elogix_registered_tenants', ru) }
    notify(`❌ ${tenant.name} rejected.`)
  }

  // ── Create company (manual onboarding) ───────────────────────────
  const handleCreate = async () => {
    if (!createForm.company_name || !createForm.slug || !createForm.admin_email) {
      notify('⚠️ Fill company name, URL slug, and admin email'); return
    }
    try {
      await apiFetch('POST', '/companies', createForm)
      notify(`✅ ${createForm.company_name} provisioned → ${createForm.slug}.elogix.com.np`)
      setShowCreateModal(false)
      setCreateForm({ company_name:'', slug:'', admin_email:'', admin_name:'', plan:'starter', industry:'', country:'Nepal', phone:'', account_manager:'', sales_rep:'' })
      await loadFromAPI()
    } catch(e) { notify(`⚠️ ${e.message}`) }
  }

  // ── Password reset ────────────────────────────────────────────────
  const openPasswordReset = (tenant) => {
    setPwTarget(tenant)
    setPwForm({ admin_name:tenant.admin_name||'', admin_email:tenant.admin_email||'',
                phone:tenant.phone||'', new_password:'', confirm_password:'', reason:'' })
    setPwMsg(''); setShowPwText(false); setShowPwModal(true)
  }
  const handlePasswordReset = async () => {
    if (!pwForm.new_password || pwForm.new_password.length < 8) { setPwMsg('❌ Password must be at least 8 characters'); return }
    if (pwForm.new_password !== pwForm.confirm_password) { setPwMsg('❌ Passwords do not match'); return }
    setPwLoading(true); setPwMsg('')
    try {
      // Update offline fallback
      const ru = ls.getJSON('elogix_registered_tenants', {})
      const k  = pwForm.admin_email?.toLowerCase()
      if (ru && k && ru[k]) { ru[k].pw = pwForm.new_password; ru[k].admin_name = pwForm.admin_name||ru[k].admin_name; ls.set('elogix_registered_tenants', ru) }
      // Call API
      const res = await fetch(`${API}/companies/${pwTarget?.slug}/reset-password`, {
        method:'POST', headers:adminHeaders(),
        body: JSON.stringify({ admin_email:pwForm.admin_email, admin_name:pwForm.admin_name, phone:pwForm.phone, new_password:pwForm.new_password, reason:pwForm.reason }),
      }).catch(() => null)
      setPwMsg(res?.ok ? `✅ Password reset for ${pwForm.admin_email}.` : `✅ Password updated locally.`)
      setTimeout(() => setShowPwModal(false), 2000)
    } catch(err) { setPwMsg(`❌ ${err.message}`) }
    finally { setPwLoading(false) }
  }

  // ── Stats ─────────────────────────────────────────────────────────
  const total     = companies.length
  const active    = companies.filter(c => c.status === 'active').length
  const trial     = companies.filter(c => c.status === 'trial').length
  const suspended = companies.filter(c => c.status === 'suspended').length
  const mrr       = companies.filter(c => c.status === 'active' || c.status === 'trial')
                              .reduce((s, c) => s + (PLAN_PRICES[c.plan] || 0), 0)
  const openTickets = tickets.filter(t => t.status === 'open').length
  const overdueInv  = invoices.filter(i => i.status === 'overdue').length

  const filtered = companies.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.slug.toLowerCase().includes(search.toLowerCase()) &&
        !c.admin_email?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const Tab = ({ id, label, icon }) => (
    <button onClick={() => setTab(id)}
      style={{ padding:'9px 16px', borderRadius:20,
        border:`1.5px solid ${tab === id ? A : '#e2e8f0'}`,
        background:tab === id ? A+'15' : '#fff',
        color:tab === id ? A : '#64748b',
        fontSize:11, fontWeight:tab === id ? 800 : 400,
        cursor:'pointer', transition:'all .12s', whiteSpace:'nowrap' }}>
      {icon} {label}
    </button>
  )

  const StatusBadge = ({ status }) => {
    const s = STATUS_COLORS[status] || STATUS_COLORS.active
    return <span style={{ background:s.bg, color:s.c, border:`1px solid ${s.b}`,
      fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{s.icon} {status?.toUpperCase()}</span>
  }

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ position:'fixed', inset:0, fontFamily:'system-ui,sans-serif',
      background:'#f0f0ff', overflowY:'scroll', overflowX:'hidden',
      WebkitOverflowScrolling:'touch', zIndex:10 }}>

      {/* Toast */}
      {msg && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999,
          background:'#1e1b4b', color:'#fff', padding:'10px 20px',
          borderRadius:12, fontSize:12, fontWeight:700, maxWidth:440,
          boxShadow:'0 8px 32px rgba(0,0,0,.25)' }}>{msg}</div>
      )}

      {/* API error banner */}
      {apiError && !apiLoading && (
        <div style={{ padding:'8px 16px', background:'#fef2f2', borderBottom:'2px solid #fecaca',
          fontSize:11, color:'#dc2626', fontWeight:700 }}>
          ⚠️ {apiError} — verify that server.js is running on port 8080 and ELOGIX_ADMIN_KEY is set.
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ background:G, padding:'14px 16px', color:'#fff' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:17, fontWeight:900 }}>🏢 eLogix Technologies</div>
            <div style={{ fontSize:10, opacity:.7 }}>SaaS Control Panel · www.elogix.com.np · Internal Staff Only</div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => setShowCreateModal(true)}
              style={{ padding:'8px 16px', borderRadius:9, border:'none', background:'#fff', color:A, fontSize:11, fontWeight:800, cursor:'pointer' }}>
              + Onboard Client
            </button>
            <button onClick={() => { loadFromAPI(); notify('🔄 Reloading…') }}
              style={{ padding:'8px 14px', borderRadius:9, border:'1.5px solid rgba(255,255,255,.4)',
                background:'rgba(255,255,255,.12)', color:'#fff', fontSize:11, cursor:'pointer' }}>
              🔄 Sync
            </button>
            <button onClick={() => {
              nukeStaleCacheKeys()
              setCompanies([]); setPendingTenants([])
              loadFromAPI(); notify('🗑️ Cache cleared — reloading from API')
            }} style={{ padding:'8px 14px', borderRadius:9, border:'1.5px solid rgba(255,255,255,.4)',
                background:'rgba(239,68,68,.3)', color:'#fff', fontSize:11, cursor:'pointer', fontWeight:700 }}>
              🗑️ Clear Cache
            </button>
            <button onClick={() => {
              downloadCSV(companies.map(c => ({
                'Company':c.name,'Slug':c.slug,'Plan':c.plan,'Status':c.status,
                'Employees':c.employee_count,'Admin Email':c.admin_email,'Country':c.country,'Created':c.created_at,
              })), `eLogix_Companies_${new Date().toISOString().slice(0,10)}.csv`)
              notify('✅ Exported as CSV')
            }} style={{ padding:'8px 14px', borderRadius:9, border:'1.5px solid rgba(255,255,255,.4)',
                background:'rgba(255,255,255,.15)', color:'#fff', fontSize:11, cursor:'pointer' }}>
              📤 Export CSV
            </button>
            <button onClick={() => {
              const keys = ['elogix_session','elogix_admin_session','access_token','elogix_admin_token',
                            'elogix_admin_key','elogix_admin_user','elogix_auth','elogix_token']
              keys.forEach(k => { ls.remove(k); try { sessionStorage.removeItem(k) } catch(_e) {} })
              try { onLogout?.() } catch(_e) {}
              window.location.href = window.location.pathname + '?logged_out=1'
            }} style={{ padding:'8px 14px', borderRadius:9, border:'1.5px solid rgba(255,255,255,.4)',
                background:'rgba(255,255,255,.15)', color:'#fff', fontSize:11, cursor:'pointer' }}>
              🔒 Logout
            </button>
          </div>
        </div>

        {/* ── Stat Cards — CLICKABLE BUTTONS ── */}
        <div style={{ display:'flex', gap:10, marginTop:14, flexWrap:'wrap' }}>
          {[
            ['🏢','Total Clients', total,         'dashboard'],
            ['✅','Active',        active,         'dashboard'],
            ['🆓','Trial',         trial,          'dashboard'],
            ['⏸','Suspended',      suspended,      'dashboard'],
            ['💰','MRR',           `NPR ${mrr.toLocaleString()}`, 'billing'],
            ['📈','ARR',           `NPR ${(mrr*12).toLocaleString()}`, 'billing'],
            ['📋','Open Tickets',  openTickets,    'tickets'],
            ['⚠️','Overdue Inv',   overdueInv,     'billing'],
          ].map(([ic, lb, v, targetTab]) => (
            <button key={lb} onClick={() => setTab(targetTab)}
              style={{ background:'rgba(255,255,255,.18)', borderRadius:9, padding:'8px 14px',
                textAlign:'center', minWidth:80, cursor:'pointer',
                border:'1.5px solid rgba(255,255,255,.25)', color:'#fff',
                transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.30)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.18)'}>
              <div style={{ fontSize:14, fontWeight:900 }}>{v}</div>
              <div style={{ fontSize:8, opacity:.8 }}>{ic} {lb}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ background:'#fff', padding:'10px 16px', borderBottom:'1px solid #f1f5f9',
        display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none' }}>
        <Tab id="pending"  label={`Pending Approval${pendingTenants.length>0?` (${pendingTenants.length})`:''}`} icon="⏳"/>
        <Tab id="dashboard" label="Companies"           icon="🏢"/>
        <Tab id="billing"   label="Billing"             icon="💰"/>
        <Tab id="tickets"   label="Support"             icon="🎫"/>
        <Tab id="notify"    label="Broadcast"           icon="📢"/>
        <Tab id="modules"   label="Module Permissions"  icon="🔐"/>
        <Tab id="referral"  label="Referral & Commission" icon="🤝"/>
        <Tab id="admins"    label="eLogix Team"         icon="👥"/>
        <Tab id="pw-mgmt"   label="Password Management" icon="🔑"/>
      </div>

      <div style={{ padding:'14px 14px' }}>

        {/* ════════════════════════════════════════════════════════════
            ⏳ PENDING APPROVAL
        ════════════════════════════════════════════════════════════ */}
        {tab === 'pending' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              flexWrap:'wrap', gap:10, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:900, color:'#0f172a' }}>
                  ⏳ Pending Tenant Approvals ({pendingTenants.length})
                </div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>
                  Companies that self-registered — approve to give them access in ALL tabs
                </div>
              </div>
              <button onClick={() => { loadFromAPI(); notify('🔄 Refreshing…') }} disabled={apiLoading}
                style={{ padding:'8px 16px', borderRadius:9, border:'1.5px solid #e2e8f0',
                  background:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', opacity:apiLoading?.7:1 }}>
                {apiLoading ? '⟳ Loading…' : '🔄 Refresh'}
              </button>
            </div>

            {pendingTenants.length === 0 ? (
              <div style={{ background:'#fff', borderRadius:12, padding:48, textAlign:'center',
                border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#374151' }}>No pending approvals</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:6 }}>New registrations will appear here automatically.</div>
              </div>
            ) : (
              <div style={{ display:'grid', gap:12 }}>
                {pendingTenants.map(t => {
                  const BTI = { recruitment_agency:'🎯',bank_finance:'🏦',hospital_health:'🏥',
                    ngo_ingo:'🌱',it_software:'💻',manufacturing:'🏭',hotel_hospitality:'🏨',
                    education:'🎓',government:'🏛️',custom:'⚙️' }
                  return (
                    <div key={t.slug} style={{ background:'#fff', borderRadius:12, padding:20,
                      border:'2px solid #fde68a', boxShadow:'0 2px 8px rgba(245,158,11,.1)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                            <span style={{ fontSize:28 }}>{BTI[t.business_type] || '🏢'}</span>
                            <div>
                              <div style={{ fontSize:15, fontWeight:900, color:'#0f172a' }}>{t.name}</div>
                              <div style={{ fontSize:10, color:'#64748b' }}>
                                {t.slug}.elogix.com.np · {(t.registered_at || t.created_at || '').split('T')[0]}
                              </div>
                            </div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8 }}>
                            {[
                              ['Plan',      t.plan?.toUpperCase()],
                              ['Business',  t.business_type?.replace(/_/g,' ')],
                              ['Admin',     t.admin_email],
                              ['Phone',     t.phone || '—'],
                              ['Country',   t.country || 'Nepal'],
                              ['Modules',   `${(t.modules||[]).length} modules`],
                              ['Max Emp',   t.max_employees || 10],
                              ['Currency',  t.currency || 'NPR'],
                            ].map(([lb, v]) => (
                              <div key={lb} style={{ padding:'8px 10px', background:'#f8fafc',
                                borderRadius:8, border:'1px solid #e2e8f0' }}>
                                <div style={{ fontSize:9, color:'#94a3b8', marginBottom:2 }}>{lb}</div>
                                <div style={{ fontSize:11, fontWeight:700, color:'#0f172a',
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v || '—'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:8, minWidth:170, flexShrink:0 }}>
                          <button onClick={() => approveTenant(t)}
                            style={{ padding:'11px 20px', borderRadius:9, border:'none',
                              background:'linear-gradient(135deg,#059669,#0369a1)',
                              color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                            ✅ Approve & Activate
                          </button>
                          <button onClick={() => approveWithPassword(t)}
                            style={{ padding:'9px 20px', borderRadius:9, border:'1.5px solid #0369a1',
                              background:'#eff6ff', color:'#0369a1', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                            🔑 Approve + Set Password
                          </button>
                          <button onClick={() => { if(window.confirm(`Reject ${t.name}?`)) rejectTenant(t) }}
                            style={{ padding:'8px 20px', borderRadius:9, border:'1.5px solid #fecaca',
                              background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                            ❌ Reject
                          </button>
                          <button onClick={() => openPasswordReset(t)}
                            style={{ padding:'8px 20px', borderRadius:9, border:'1.5px solid #7c3aed',
                              background:'#f5f3ff', color:'#7c3aed', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                            🔑 Set Password
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            🏢 COMPANIES — API data only, no localStorage
        ════════════════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Search name, slug, email…" style={{ ...inp, maxWidth:280 }}/>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, width:'auto' }}>
                <option value="all">All Status</option>
                {['active','trial','suspended','cancelled'].map(s => <option key={s}>{s}</option>)}
              </select>
              <span style={{ fontSize:10, color:'#64748b', marginLeft:'auto' }}>
                Showing {filtered.length} of {companies.length} approved companies
              </span>
            </div>

            {apiLoading && companies.length === 0 && (
              <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12 }}>⟳ Loading from API…</div>
            )}

            {!apiLoading && companies.length === 0 && !apiError && (
              <div style={{ textAlign:'center', padding:48, color:'#94a3b8', background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🏢</div>
                <div style={{ fontSize:14, fontWeight:700 }}>No approved companies yet</div>
                <div style={{ fontSize:11, marginTop:4 }}>
                  Approve registrations in <button onClick={() => setTab('pending')}
                    style={{ color:A, border:'none', background:'none', cursor:'pointer', fontWeight:700, fontSize:11 }}>
                    ⏳ Pending Approval
                  </button> tab
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))', gap:14 }}>
              {filtered.map(c => {
                const sc       = STATUS_COLORS[c.status] || STATUS_COLORS.active
                const utilPct  = c.max_employees ? Math.round((c.employee_count||0) / c.max_employees * 100) : 0
                const planColor = PLAN_COLORS[c.plan] || '#64748b'
                return (
                  <div key={c.id} style={{ background:'#fff', borderRadius:14,
                    boxShadow:'0 2px 8px rgba(0,0,0,.06)', border:`1.5px solid ${sc.b}`, overflow:'hidden' }}>
                    <div style={{ background:sc.bg, padding:'12px 16px', borderBottom:`1px solid ${sc.b}`,
                      display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:13, color:'#0f172a' }}>{c.name}</div>
                        <div style={{ fontSize:10, color:'#64748b' }}>{c.slug}.elogix.com.np · {c.industry}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                        <StatusBadge status={c.status}/>
                        <span style={{ background:planColor+'15', color:planColor,
                          fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                          {c.plan?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div style={{ padding:'12px 16px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                        {[
                          ['👥','Employees',`${c.employee_count||0}/${c.max_employees||'?'}`],
                          ['💰','Pending',  c.pending_invoice ? `NPR ${c.pending_invoice.toLocaleString()}` : 'Paid ✅'],
                          ['📅','Last Pay', c.last_payment || '—'],
                        ].map(([ic, lb, v]) => (
                          <div key={lb} style={{ textAlign:'center', background:'#f8fafc', borderRadius:8, padding:6 }}>
                            <div style={{ fontSize:16 }}>{ic}</div>
                            <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{v}</div>
                            <div style={{ fontSize:8, color:'#94a3b8' }}>{lb}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#64748b', marginBottom:3 }}>
                          <span>Employee utilisation</span><span>{utilPct}%</span>
                        </div>
                        <div style={{ height:5, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${Math.min(utilPct,100)}%`,
                            background:utilPct>90?'#dc2626':utilPct>70?'#d97706':'#059669', borderRadius:3 }}/>
                        </div>
                      </div>
                      <div style={{ fontSize:9, color:'#94a3b8', marginBottom:12 }}>
                        👤 AM: {c.account_manager||'—'} · 🎫 {c.support_tier} support
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <button onClick={() => setSelected(c)}
                          style={{ padding:'5px 10px', borderRadius:7, border:'none',
                            background:'#eff6ff', color:'#1d4ed8', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                          👁 View
                        </button>
                        {/* FIX: calls API — not just notify() */}
                        <button onClick={() =>
                          apiFetch('POST', `/companies/${c.slug}/invoices`, {})
                            .then(r => notify(r.message || `📄 Invoice generated for ${c.name}`))
                            .catch(e => notify(`⚠️ ${e.message}`))
                        } style={{ padding:'5px 10px', borderRadius:7, border:'none',
                            background:'#f0fdf4', color:'#059669', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                          💰 Invoice
                        </button>
                        <button onClick={() => { setNotifyForm({ title:'', message:'' }); setShowNotifyModal(c) }}
                          style={{ padding:'5px 10px', borderRadius:7, border:'none',
                            background:'#f5f3ff', color:'#7c3aed', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                          📢 Notify
                        </button>
                        {c.status === 'active' && (
                          <button onClick={() => handleAction(c.slug, 'suspend')}
                            style={{ padding:'5px 10px', borderRadius:7, border:'none',
                              background:'#fffbeb', color:'#d97706', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                            ⏸ Suspend
                          </button>
                        )}
                        {c.status === 'suspended' && (
                          <button onClick={() => handleAction(c.slug, 'reactivate')}
                            style={{ padding:'5px 10px', borderRadius:7, border:'none',
                              background:'#f0fdf4', color:'#059669', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                            ✅ Reactivate
                          </button>
                        )}
                        <a href={`https://${c.slug}.elogix.com.np`} target="_blank" rel="noreferrer"
                          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #e2e8f0',
                            background:'#fff', color:'#64748b', fontSize:9, fontWeight:700,
                            cursor:'pointer', textDecoration:'none' }}>
                          🔗 Portal
                        </a>
                        <button onClick={() => openPasswordReset(c)}
                          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #7c3aed',
                            background:'#f5f3ff', color:'#7c3aed', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                          🔑 Reset PW
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            💰 BILLING
        ════════════════════════════════════════════════════════════ */}
        {tab === 'billing' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:18 }}>
              {[
                { label:'Monthly MRR',    value:`NPR ${mrr.toLocaleString()}`,         icon:'💰', color:'#059669' },
                { label:'Annual ARR',     value:`NPR ${(mrr*12).toLocaleString()}`,     icon:'📈', color:'#0369a1' },
                { label:'Paying',         value:companies.filter(c=>c.plan!=='trial').length, icon:'💳', color:'#7c3aed' },
                { label:'Trial',          value:trial,                                  icon:'🆓', color:'#10b981' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ background:'#fff', borderRadius:12, padding:16,
                  boxShadow:'0 1px 6px rgba(0,0,0,.06)', borderLeft:`4px solid ${color}` }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
                  <div style={{ fontSize:18, fontWeight:900, color }}>{value}</div>
                  <div style={{ fontSize:10, color:'#64748b' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:600 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Company','Plan','Monthly (NPR)','Status','Employees','Invoice'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:9,
                        fontWeight:700, color:'#374151', borderBottom:'1px solid #f1f5f9' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:12 }}>
                      No approved companies yet
                    </td></tr>
                  ) : companies.map((co, i) => (
                    <tr key={co.slug} style={{ background:i%2===0?'#fff':'#fafafa' }}>
                      <td style={{ padding:'9px 14px', fontWeight:700 }}>
                        {co.name}
                        <div style={{ fontSize:9, color:'#64748b', fontWeight:400 }}>{co.slug}</div>
                      </td>
                      <td style={{ padding:'9px 14px' }}>
                        <span style={{ background:(PLAN_COLORS[co.plan]||'#64748b')+'15',
                          color:PLAN_COLORS[co.plan]||'#64748b', fontSize:9, fontWeight:700,
                          padding:'2px 8px', borderRadius:20 }}>{co.plan?.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'9px 14px', fontWeight:700, color:'#059669' }}>
                        {PLAN_PRICES[co.plan] > 0 ? PLAN_PRICES[co.plan].toLocaleString() : 'Free'}
                      </td>
                      <td style={{ padding:'9px 14px' }}><StatusBadge status={co.status}/></td>
                      <td style={{ padding:'9px 14px' }}>{co.employee_count || 0}</td>
                      <td style={{ padding:'9px 14px' }}>
                        <button onClick={() =>
                          apiFetch('POST', `/companies/${co.slug}/invoices`, {})
                            .then(r => notify(r.message || `📄 Invoice generated for ${co.name}`))
                            .catch(e => notify(`⚠️ ${e.message}`))
                        } style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #bfdbfe',
                            background:'#eff6ff', color:'#2563eb', fontSize:9, cursor:'pointer', fontWeight:700 }}>
                          📄 Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            🎫 SUPPORT
        ════════════════════════════════════════════════════════════ */}
        {tab === 'tickets' && (
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:14 }}>🎫 Support Tickets</div>
            {tickets.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'#94a3b8', background:'#fff',
                borderRadius:12, border:'1px solid #e2e8f0' }}>🎉 No open tickets</div>
            ) : (
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:700 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['#','Company','Subject','Priority','Status','Created'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:9,
                          fontWeight:700, color:'#374151', borderBottom:'1px solid #f1f5f9' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t, i) => (
                      <tr key={t.id||i} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'9px 14px', fontSize:9, color:'#94a3b8' }}>#{t.id||i+1}</td>
                        <td style={{ padding:'9px 14px', fontWeight:700 }}>{t.company||t.company_name||'—'}</td>
                        <td style={{ padding:'9px 14px' }}>{t.subject||t.title||'—'}</td>
                        <td style={{ padding:'9px 14px' }}>
                          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:12,
                            background:{high:'#fef2f2',normal:'#fffbeb',low:'#f0fdf4'}[t.priority]||'#f8fafc',
                            color:{high:'#dc2626',normal:'#d97706',low:'#059669'}[t.priority]||'#374151' }}>
                            {t.priority||'normal'}
                          </span>
                        </td>
                        <td style={{ padding:'9px 14px' }}><StatusBadge status={t.status||'open'}/></td>
                        <td style={{ padding:'9px 14px', fontSize:10, color:'#94a3b8' }}>
                          {(t.created_at||t.created||'').split('T')[0]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            📢 BROADCAST — controlled state + API call
        ════════════════════════════════════════════════════════════ */}
        {tab === 'notify' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ background:'#fff', borderRadius:12, padding:20, border:'1px solid #e2e8f0' }}>
              <div style={{ fontWeight:800, fontSize:13, marginBottom:16 }}>📢 Broadcast Message</div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Type</label>
                <select value={bcastForm.type} onChange={e => setBcastForm(p=>({...p,type:e.target.value}))} style={inp}>
                  {['alert','billing','update','maintenance','marketing'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Priority</label>
                <select value={bcastForm.priority} onChange={e => setBcastForm(p=>({...p,priority:e.target.value}))} style={inp}>
                  {['normal','high','critical'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Title *</label>
                <input value={bcastForm.title} onChange={e=>setBcastForm(p=>({...p,title:e.target.value}))}
                  style={inp} placeholder="Notification title"/>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Message *</label>
                <textarea value={bcastForm.message} onChange={e=>setBcastForm(p=>({...p,message:e.target.value}))}
                  rows={4} style={{ ...inp, resize:'vertical', fontFamily:'inherit' }}
                  placeholder="Your message to all companies…"/>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Target</label>
                <select value={bcastForm.target} onChange={e=>setBcastForm(p=>({...p,target:e.target.value}))} style={inp}>
                  <option value="all">All Active Companies ({companies.length})</option>
                  <option value="trial">Trial Companies ({trial})</option>
                </select>
              </div>
              <button onClick={() => {
                if (!bcastForm.title || !bcastForm.message) { notify('⚠️ Fill title and message'); return }
                apiFetch('POST', '/notify-all', bcastForm)
                  .then(r => { notify(r.message || `📢 Broadcast sent to ${companies.length} companies`); setBcastForm(p=>({...p,title:'',message:''})) })
                  .catch(e => notify(`⚠️ ${e.message}`))
              }} style={{ width:'100%', padding:11, borderRadius:9, border:'none', background:G,
                  color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                📢 Send Broadcast to {bcastForm.target==='trial'?`${trial} Trial`:`All ${companies.length}`} Companies
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            🔐 MODULE PERMISSIONS (uses existing component)
        ════════════════════════════════════════════════════════════ */}
        {tab === 'modules'   && <TenantModulePermissionPage />}

        {/* ════════════════════════════════════════════════════════════
            🤝 REFERRAL & COMMISSION (uses existing component)
        ════════════════════════════════════════════════════════════ */}
        {tab === 'referral'  && <ReferralCommissionPage />}

        {/* ════════════════════════════════════════════════════════════
            👥 ELOGIX TEAM
        ════════════════════════════════════════════════════════════ */}
        {tab === 'admins' && (
          <div style={{ background:'#fff', borderRadius:12, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontWeight:800, fontSize:13, marginBottom:16 }}>👥 eLogix Internal Team</div>
            {team.length === 0 ? (
              <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:12 }}>
                No team members loaded from API yet
              </div>
            ) : team.map((a, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'12px 0', borderBottom:'1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:12 }}>{a.full_name || a.name}</div>
                  <div style={{ fontSize:10, color:'#64748b' }}>{a.email} · {a.role}</div>
                </div>
                <span style={{ background:'#f0fdf4', color:'#059669', fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                  {a.role}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            🔑 PASSWORD MANAGEMENT
        ════════════════════════════════════════════════════════════ */}
        {tab === 'pw-mgmt' && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:900, color:'#0f172a' }}>🔑 Tenant Admin Password Management</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>Reset credentials for any approved or pending tenant</div>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search company or admin email…" style={{ ...inp, maxWidth:340, marginBottom:16 }}/>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[...companies, ...pendingTenants]
                .filter(t => !search ||
                  t.name?.toLowerCase().includes(search.toLowerCase()) ||
                  t.admin_email?.toLowerCase().includes(search.toLowerCase()))
                .map((t, i) => (
                <div key={i} style={{ background:'#fff', borderRadius:12, padding:'14px 18px',
                  border:'1.5px solid #e2e8f0', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                  <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, display:'flex',
                    alignItems:'center', justifyContent:'center',
                    background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
                    color:'#fff', fontSize:14, fontWeight:900 }}>
                    {(t.name||'?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ fontWeight:800, fontSize:13, color:'#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>
                      🔗 {t.slug}.elogix.com.np · 📋 {(t.plan||'trial').toUpperCase()} · 👤 {t.admin_email||'—'}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <StatusBadge status={t.status}/>
                    <button onClick={() => openPasswordReset(t)}
                      style={{ padding:'8px 18px', borderRadius:9, border:'none',
                        background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
                        color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer',
                        boxShadow:'0 2px 8px rgba(124,58,237,.3)', whiteSpace:'nowrap' }}>
                      🔑 Reset Password
                    </button>
                  </div>
                </div>
              ))}
              {[...companies,...pendingTenants].filter(t=>!search||t.name?.toLowerCase().includes(search.toLowerCase())||t.admin_email?.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>🔍</div>
                  <div>No companies found</div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════════════════════
          Company Detail Modal — Plan change calls API
      ════════════════════════════════════════════════════════════ */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setSelected(null)}>
          <div style={{ background:'#fff', borderRadius:18, width:560, maxWidth:'96vw',
            maxHeight:'92vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ background:G, padding:'14px 22px', borderRadius:'18px 18px 0 0', color:'#fff' }}>
              <div style={{ fontSize:16, fontWeight:900 }}>{selected.name}</div>
              <div style={{ fontSize:10, opacity:.8 }}>{selected.slug}.elogix.com.np · {selected.industry}</div>
            </div>
            <div style={{ padding:'20px 22px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                {[
                  ['Plan',       selected.plan?.toUpperCase()],
                  ['Status',     selected.status?.toUpperCase()],
                  ['Employees',  `${selected.employee_count}/${selected.max_employees}`],
                  ['Country',    selected.country],
                  ['AM',         selected.account_manager||'—'],
                  ['Support',    selected.support_tier],
                  ['Created',    selected.created_at],
                  ['Inv Pending',selected.pending_invoice ? `NPR ${selected.pending_invoice.toLocaleString()}` : 'None'],
                ].map(([lb, v]) => (
                  <div key={lb} style={{ background:'#f8fafc', borderRadius:9, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:'#94a3b8', marginBottom:2 }}>{lb}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* FIX: controlled state + calls API */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Change Plan</label>
                <div style={{ display:'flex', gap:8 }}>
                  <select value={selected.plan} onChange={e => setSelected(p => ({ ...p, plan:e.target.value }))}
                    style={{ ...inp, flex:1 }}>
                    {['trial','starter','growth','business','enterprise','unlimited'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button onClick={() => {
                    apiFetch('PUT', `/companies/${selected.slug}/plan`, { plan:selected.plan })
                      .then(r => { setCompanies(p => p.map(c => c.id===selected.id ? {...c,plan:selected.plan} : c)); notify(r.message||`✅ Plan updated to ${selected.plan}`) })
                      .catch(e => notify(`⚠️ ${e.message}`))
                  }} style={{ padding:'9px 16px', borderRadius:8, border:'none', background:A,
                      color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                    Update Plan
                  </button>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:8 }}>
                {[
                  ['💰 Generate Invoice','#059669', () => apiFetch('POST',`/companies/${selected.slug}/invoices`,{}).then(r=>notify(r.message||`📄 Invoice generated`)).catch(e=>notify(`⚠️ ${e.message}`))],
                  ['📢 Send Notice',     '#7c3aed', () => { setNotifyForm({title:'',message:''}); setShowNotifyModal(selected); setSelected(null) }],
                  ['🔗 Open Portal',     '#0369a1', () => window.open(`https://${selected.slug}.elogix.com.np`,'_blank')],
                  selected.status === 'active'
                    ? ['⏸ Suspend',    '#d97706', () => handleAction(selected.slug,'suspend')]
                    : ['✅ Reactivate', '#059669', () => handleAction(selected.slug,'reactivate')],
                  ['🗑 Cancel',         '#dc2626', () => { if(window.confirm(`Cancel ${selected.name}?`)) handleAction(selected.slug,'cancelled') }],
                  ['🔑 Reset Password', '#7c3aed', () => { openPasswordReset(selected); setSelected(null) }],
                ].map(([lb, color, fn], i) => (
                  <button key={i} onClick={fn}
                    style={{ padding:9, borderRadius:9, border:'none',
                      background:color+'15', color, fontSize:10, fontWeight:700, cursor:'pointer' }}>
                    {lb}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          Create Company Modal
      ════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setShowCreateModal(false)}>
          <div style={{ background:'#fff', borderRadius:18, width:620, maxWidth:'96vw',
            maxHeight:'94vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ background:G, padding:'14px 22px', borderRadius:'18px 18px 0 0', color:'#fff' }}>
              <div style={{ fontSize:15, fontWeight:900 }}>+ Onboard New eLogix Client</div>
              <div style={{ fontSize:10, opacity:.8 }}>Auto-provisions PostgreSQL schema, roles, admin user</div>
            </div>
            <div style={{ padding:'20px 22px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:12 }}>
                {[
                  ['Company Name *','company_name','text'],
                  ['Company URL * (slug)','slug','text'],
                  ['Admin Full Name','admin_name','text'],
                  ['Admin Email *','admin_email','email'],
                  ['Phone','phone','text'],
                  ['Industry','industry','text'],
                ].map(([lb, k, t]) => (
                  <div key={k}>
                    <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{lb}</label>
                    <input type={t} value={createForm[k]||''}
                      onChange={e => setCreateForm(p => ({ ...p, [k]:e.target.value }))}
                      placeholder={k === 'slug' ? 'e.g. yourcompany' : ''} style={inp}/>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Plan *</label>
                  <select value={createForm.plan} onChange={e => setCreateForm(p => ({ ...p, plan:e.target.value }))} style={inp}>
                    {['trial','starter','growth','business','enterprise','unlimited'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Account Manager</label>
                  <input value={createForm.account_manager||''} onChange={e => setCreateForm(p => ({ ...p, account_manager:e.target.value }))} style={inp}/>
                </div>
              </div>
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:9,
                padding:'10px 14px', marginBottom:16, fontSize:10, color:'#92400e' }}>
                ⚡ Saves to companies.json + provisions PostgreSQL schema via Flask on port 5000
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={handleCreate}
                  style={{ flex:1, padding:11, borderRadius:9, border:'none', background:G,
                    color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                  🚀 Provision eLogix Tenant
                </button>
                <button onClick={() => setShowCreateModal(false)}
                  style={{ padding:'11px 18px', borderRadius:9, border:'1px solid #e2e8f0',
                    background:'#fff', fontSize:11, cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          Notify Modal — controlled state + API call
      ════════════════════════════════════════════════════════════ */}
      {showNotifyModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setShowNotifyModal(null)}>
          <div style={{ background:'#fff', borderRadius:16, width:480, maxWidth:'96vw' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background:G, padding:'13px 20px', borderRadius:'16px 16px 0 0', color:'#fff' }}>
              <div style={{ fontSize:14, fontWeight:900 }}>📢 Notify: {showNotifyModal.name}</div>
            </div>
            <div style={{ padding:'16px 18px' }}>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Title *</label>
                <input value={notifyForm.title} onChange={e => setNotifyForm(p => ({ ...p, title:e.target.value }))}
                  style={inp} placeholder="Notification title"/>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Message *</label>
                <textarea value={notifyForm.message} onChange={e => setNotifyForm(p => ({ ...p, message:e.target.value }))}
                  rows={3} style={{ ...inp, resize:'vertical', fontFamily:'inherit' }}
                  placeholder="Your message to this company…"/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => {
                  if (!notifyForm.title || !notifyForm.message) { notify('⚠️ Fill title and message'); return }
                  apiFetch('POST', `/companies/${showNotifyModal.slug}/notify`,
                    { type:'alert', priority:'normal', ...notifyForm })
                    .then(r => { notify(r.message || `📢 Notification sent to ${showNotifyModal.name}`); setShowNotifyModal(null) })
                    .catch(e => notify(`⚠️ ${e.message}`))
                }} style={{ flex:1, padding:10, borderRadius:9, border:'none', background:G,
                    color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                  Send Notification
                </button>
                <button onClick={() => setShowNotifyModal(null)}
                  style={{ padding:'10px 16px', borderRadius:9, border:'1px solid #e2e8f0',
                    background:'#fff', fontSize:11, cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          Password Reset Modal
      ════════════════════════════════════════════════════════════ */}
      {showPwModal && pwTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:500,
            boxShadow:'0 24px 80px rgba(0,0,0,.3)', overflow:'hidden' }}>
            <div style={{ background:'linear-gradient(135deg,#1e1b4b,#7c3aed)', padding:'18px 22px',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:16, fontWeight:900, color:'#fff' }}>🔑 Reset Admin Password</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.65)', marginTop:3 }}>
                  {pwTarget.name} · {pwTarget.slug}.elogix.com.np
                </div>
              </div>
              <button onClick={() => setShowPwModal(false)}
                style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff',
                  width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:18 }}>✕</button>
            </div>
            <div style={{ padding:'22px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              {[
                ['👤 Super Admin Full Name','admin_name','text','Full name'],
                ['📧 Admin Email *','admin_email','email','admin@company.com'],
                ['📱 Mobile','phone','tel','+977-98XXXXXXXX'],
              ].map(([lb, k, t, ph]) => (
                <div key={k}>
                  <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>{lb}</label>
                  <input value={pwForm[k]} type={t} placeholder={ph}
                    onChange={e => setPwForm(f => ({ ...f, [k]:e.target.value }))}
                    style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px',
                      borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none' }}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>
                  🔒 New Password *
                </label>
                <div style={{ position:'relative' }}>
                  <input value={pwForm.new_password} type={showPwText?'text':'password'}
                    placeholder="Minimum 8 characters"
                    onChange={e => setPwForm(f => ({ ...f, new_password:e.target.value }))}
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
                <input value={pwForm.confirm_password} type={showPwText?'text':'password'}
                  placeholder="Re-enter new password"
                  onChange={e => setPwForm(f => ({ ...f, confirm_password:e.target.value }))}
                  style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8, fontSize:13, outline:'none',
                    border:`1.5px solid ${pwForm.confirm_password&&pwForm.confirm_password!==pwForm.new_password?'#fecaca':'#e2e8f0'}` }}/>
                {pwForm.confirm_password && pwForm.confirm_password !== pwForm.new_password && (
                  <div style={{ marginTop:4, fontSize:11, color:'#dc2626', fontWeight:600 }}>⚠️ Passwords do not match</div>
                )}
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>
                  📝 Reason (optional)
                </label>
                <textarea value={pwForm.reason} rows={2}
                  onChange={e => setPwForm(f => ({ ...f, reason:e.target.value }))}
                  placeholder="e.g. Admin forgot password, account handover…"
                  style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8,
                    border:'1.5px solid #e2e8f0', fontSize:13, outline:'none',
                    resize:'vertical', fontFamily:'inherit' }}/>
              </div>
              {pwMsg && (
                <div style={{ padding:'10px 14px', borderRadius:9, fontSize:12, fontWeight:700,
                  background:pwMsg.startsWith('✅')?'#f0fdf4':'#fef2f2',
                  border:`1.5px solid ${pwMsg.startsWith('✅')?'#bbf7d0':'#fecaca'}`,
                  color:pwMsg.startsWith('✅')?'#065f46':'#dc2626' }}>{pwMsg}</div>
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
                    background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
                    color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer',
                    opacity:(pwForm.new_password&&pwForm.admin_email)?1:0.6 }}>
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

// FILE: src/pages/elogix-admin/ELogixAdminPage.jsx
// eLogix Technologies — Internal Admin Panel
// ONLY for eLogix staff — protected by separate admin key + staff JWT
// Manage all client companies, billing, support, communications
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect } from 'react'
// Moved from tenant sidebar — SuperAdmin only
import TenantModulePermissionPage from '../../components/dashboard/snapshots/TenantModulePermissionPage.jsx'
import ReferralCommissionPage     from '../../components/dashboard/snapshots/ReferralCommissionPage.jsx'

const G  = 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#6366f1 100%)'
const A  = '#4338ca'
const inp = {
  width:'100%', padding:'9px 12px', borderRadius:8,
  border:'1.5px solid #e2e8f0', fontSize:11, outline:'none',
  fontFamily:'inherit', boxSizing:'border-box'
}

const PLAN_COLORS = {
  trial:'#10b981', starter:'#0891b2', growth:'#0369a1',
  business:'#7c3aed', enterprise:'#d97706', unlimited:'#dc2626'
}
const STATUS_COLORS = {
  trial:    { bg:'#f0fdf4', c:'#059669', b:'#bbf7d0', icon:'🆓' },
  active:   { bg:'#eff6ff', c:'#0369a1', b:'#bae6fd', icon:'✅' },
  suspended:{ bg:'#fffbeb', c:'#d97706', b:'#fde68a', icon:'⏸' },
  cancelled:{ bg:'#fef2f2', c:'#dc2626', b:'#fecaca', icon:'❌' },
}

const MAX_EMPLOYEES_BY_PLAN = {
  trial: 10, starter: 50, growth: 250,
  business: 500, enterprise: 1000, unlimited: 999999
}

// ── Safe localStorage wrapper — never throws, never crashes ──
// FIX: All localStorage access goes through this wrapper.
// Direct localStorage.setItem() calls inside event callbacks can crash
// in minified builds when closures capture a stale/undefined reference.
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

// ── Export helper ─────────────────────────────────────────────
function downloadCSV(data, filename) {
  if (!data?.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => JSON.stringify(String(row[h] ?? ''))).join(',')
  )
  const csv  = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Admin auth headers ────────────────────────────────────────
function adminHeaders() {
  // FIX: use window.localStorage directly — not a local variable — to avoid
  // closure scope issues in minified React event handlers
  const adminKey = ls.get('elogix_admin_key', '')
  const token    = ls.get('elogix_admin_token', '')
  return {
    'Content-Type': 'application/json',
    'X-eLogix-Admin-Key': adminKey,
    'Authorization': token ? `Bearer ${token}` : '',
  }
}

export default function ELogixAdminPage({ onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [companies,       setCompanies]       = useState([])
  const [tickets,         setTickets]         = useState([])
  const [invoices,        setInvoices]        = useState([])
  const [team,            setTeam]            = useState([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showCreateModal,   setShowCreateModal]   = useState(false)

  // ── Password Reset Modal ──────────────────────────────────────────────
  const [showPwModal,       setShowPwModal]       = useState(false)
  const [pwTarget,          setPwTarget]          = useState(null)
  const [pwForm,            setPwForm]            = useState({
    admin_name:'', admin_email:'', phone:'',
    new_password:'', confirm_password:'', reason:''
  })
  const [pwLoading,         setPwLoading]         = useState(false)
  const [pwMsg,             setPwMsg]             = useState('')
  const [showPwText,        setShowPwText]        = useState(false)

  const [showNotifyModal, setShowNotifyModal] = useState(null)
  const [msg, setMsg] = useState('')
  const [createForm, setCreateForm] = useState({
    company_name:'', slug:'', admin_email:'', admin_name:'',
    plan:'starter', industry:'', country:'Nepal', phone:'',
    account_manager:'', sales_rep:''
  })

  // activeTenants = approved companies from API
  const activeTenants = companies

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''), 4000) }

  // Pending self-registered tenants waiting for SuperAdmin approval
  const [pendingTenants, setPendingTenants] = useState([])
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError,   setApiError]   = useState(null)

  // ── Normalize a raw company object from the API ───────────────────────
  function normalizeCompany(co) {
    return {
      id             : co.id || `api_${co.slug}`,
      slug           : co.slug || '',
      name           : co.name || co.slug || 'Unknown',
      plan           : co.plan || 'trial',
      status         : co.status || 'active',
      business_type  : co.business_type || 'custom',
      industry       : co.industry || co.business_type || '',
      admin_email    : co.admin_email || '',
      admin_name     : co.admin_name  || '',
      phone          : co.phone || '',
      country        : co.country || 'Nepal',
      currency       : co.currency || 'NPR',
      employee_count : co.employee_count || 0,
      max_employees  : co.max_employees || MAX_EMPLOYEES_BY_PLAN[co.plan] || 50,
      account_manager: co.account_manager || '',
      support_tier   : co.support_tier || 'standard',
      pending_invoice: co.pending_invoice || 0,
      last_payment   : co.last_payment || null,
      created_at     : co.created_at || new Date().toISOString().split('T')[0],
      approved_at    : co.approved_at || co.created_at || '',
    }
  }

  // ── Load all data from API ────────────────────────────────────────────
  const loadFromAPI = async () => {
    setApiLoading(true)
    try {
      const headers = adminHeaders()

      // Active companies
      const res = await fetch('/api/elogix-admin/v1/companies', { headers })
      if (res.ok) {
        const data = await res.json()
        const raw = data.companies || data.data || []
        setCompanies(raw.map(normalizeCompany))
        setApiError(null)
      } else {
        setApiError(`Companies API returned ${res.status}`)
      }

      // Pending registrations
      const pendRes = await fetch('/api/elogix-admin/v1/pending-companies', { headers })
      if (pendRes.ok) {
        const pendData = await pendRes.json()
        const raw2 = pendData.companies || pendData.data || []
        const apiPending = raw2.map(co => ({
          ...normalizeCompany(co),
          status       : co.status || 'pending',
          max_employees: co.max_employees || MAX_EMPLOYEES_BY_PLAN[co.plan] || 10,
          registered_at: co.registered_at || co.created_at || new Date().toISOString(),
        }))
        setPendingTenants(apiPending)
      }

      // Support tickets
      const tRes = await fetch('/api/elogix-admin/v1/tickets?status=open&limit=100', { headers })
      if (tRes.ok) {
        const tData = await tRes.json()
        setTickets(tData.tickets || tData.data || [])
      }

      // Internal team
      const tmRes = await fetch('/api/elogix-admin/v1/team', { headers })
      if (tmRes.ok) {
        const tmData = await tmRes.json()
        setTeam(tmData.team || tmData.data || [])
      }

    } catch(apiErr) {
      console.error('[eLogix Admin] API load failed:', apiErr)
      setApiError('API unavailable — ' + apiErr.message)
    } finally {
      setApiLoading(false)
    }
  }

  useEffect(() => {
    loadFromAPI()
    const interval = setInterval(() => loadFromAPI(), 30_000)
    return () => clearInterval(interval)
  }, [])

  const scf = (k,v) => setCreateForm(p=>({...p,[k]:v}))

  // Stats
  const total     = companies.length
  const active    = companies.filter(c=>c.status==='active').length
  const trial     = companies.filter(c=>c.status==='trial').length
  const suspended = companies.filter(c=>c.status==='suspended').length
  const mrr       = companies.filter(c=>c.status==='active').reduce((s,c)=>{
    const priceMap = {trial:0,starter:5000,growth:12000,business:25000,enterprise:45000,unlimited:75000}
    return s + (priceMap[c.plan]||0)
  },0)

  // Filter
  const filtered = companies.filter(c=>{
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.slug.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // ── Status / plan actions ─────────────────────────────────────────────
  const handleAction = async (slug, action) => {
    // FIX: 'cancelled' was being passed as action string but status must be 'cancelled'
    const newStatus = action==='reactivate' ? 'active'
                    : action==='suspend'     ? 'suspended'
                    : 'cancelled'
    setCompanies(p => p.map(c => c.slug===slug ? {...c, status:newStatus} : c))
    notify(action==='suspend'     ? `⏸ ${slug} suspended`
          :action==='reactivate'  ? `✅ ${slug} reactivated`
          : `❌ ${slug} cancelled`)
    setSelected(null)
    try {
      const res = await fetch(`/api/elogix-admin/v1/companies/${slug}/status`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ status: newStatus }),
      })
      // FIX: revert optimistic update if server rejected it
      if (!res.ok) {
        notify(`⚠️ Status change failed — reloading`)
        await loadFromAPI()
      }
    } catch(_e) {
      notify(`⚠️ Network error — reloading`)
      await loadFromAPI()
    }
  }

  // ── Onboard client manually ───────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.company_name||!createForm.slug||!createForm.admin_email) {
      notify('⚠️ Fill in company name, URL and admin email'); return
    }
    try {
      const res = await fetch('/api/elogix-admin/v1/companies', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(createForm),
      })
      if (res.ok) {
        notify(`✅ ${createForm.company_name} provisioned → ${createForm.slug}.elogix.com.np`)
        setShowCreateModal(false)
        setCreateForm({
          company_name:'', slug:'', admin_email:'', admin_name:'',
          plan:'starter', industry:'', country:'Nepal', phone:'',
          account_manager:'', sales_rep:''
        })
        await loadFromAPI()
      } else {
        const err = await res.json().catch(()=>({}))
        notify(`⚠️ ${err.message || err.error || 'Failed to create company'}`)
      }
    } catch(e) {
      notify(`⚠️ Network error: ${e.message}`)
    }
  }

  const refreshTenants = async () => {
    notify('🔄 Refreshing from server...')
    await loadFromAPI()
    notify('✅ Refreshed — latest data loaded from server')
  }

  // ── Approve tenant ────────────────────────────────────────────────────
  const approveTenant = async (tenant) => {
    // Optimistic: remove from pending immediately
    setPendingTenants(prev => prev.filter(t => t.slug !== tenant.slug))

    try {
      const res = await fetch(`/api/elogix-admin/v1/companies/${tenant.slug}/approve`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          plan         : tenant.plan || 'trial',
          business_type: tenant.business_type || 'custom',
          admin_email  : tenant.admin_email,
          approved_by  : 'eLogix SuperAdmin',
        })
      })
      if (res.ok) {
        notify(`✅ ${tenant.name} approved! Tenant can now log in.`)
        // FIX: use ls wrapper — direct localStorage.setItem in async callback
        // throws "localStorage.setItem is not a function" in minified builds
        // because the closure captures a stale reference after re-render
        const ru = ls.getJSON('elogix_registered_tenants', {})
        const emailKey = tenant.admin_email?.toLowerCase()
        if (ru && emailKey && ru[emailKey]) {
          ru[emailKey].company_status = 'active'
          ls.set('elogix_registered_tenants', ru)
        }
        // Re-fetch companies to reflect the new active company
        await loadFromAPI()
      } else {
        // Revert optimistic update on failure
        setPendingTenants(prev => [...prev, tenant])
        const err = await res.json().catch(()=>({}))
        notify(`⚠️ Approval failed: ${err.message || err.error || res.status}`)
      }
    } catch(_e) {
      // Revert optimistic update
      setPendingTenants(prev => [...prev, tenant])
      notify(`⚠️ Network error — could not approve ${tenant.name}`)
    }
  }

  // ── Approve tenant + set password ────────────────────────────────────
  // FIX: extracted into own function — was inline in onClick, which caused
  // localStorage to be called inside a window.prompt() callback inside a
  // React synthetic event, causing "localStorage.setItem is not a function"
  const approveWithPassword = (t) => {
    const pw = window.prompt(
      `Set password for ${t.admin_email}\n(Cancel = keep registered password):`
    )
    if (pw?.trim()) {
      // FIX: use ls wrapper, called synchronously before approveTenant
      const ru = ls.getJSON('elogix_registered_tenants', {})
      const k  = t.admin_email?.toLowerCase()
      if (ru && k && ru[k]) {
        ru[k].pw = pw.trim()
        ls.set('elogix_registered_tenants', ru)
      }
    }
    approveTenant(t)
  }

  // ── Reject tenant ─────────────────────────────────────────────────────
  const rejectTenant = async (tenant) => {
    setPendingTenants(prev => prev.filter(t => t.slug !== tenant.slug))
    try {
      await fetch(`/api/elogix-admin/v1/companies/${tenant.slug}/reject`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ reason: 'Rejected by SuperAdmin' }),
      })
    } catch(_e) {}
    // FIX: use ls wrapper
    const ru = ls.getJSON('elogix_registered_tenants', {})
    if (ru && tenant.admin_email) {
      delete ru[tenant.admin_email.toLowerCase()]
      ls.set('elogix_registered_tenants', ru)
    }
    notify(`❌ ${tenant.name} rejected and removed.`)
  }

  const Tab = ({id,label,icon}) => (
    <button onClick={()=>setTab(id)}
      style={{padding:'9px 18px',borderRadius:20,border:`1.5px solid ${tab===id?A:'#e2e8f0'}`,
        background:tab===id?A+'15':'#fff',color:tab===id?A:'#64748b',
        fontSize:11,fontWeight:tab===id?800:400,cursor:'pointer',transition:'all .12s',whiteSpace:'nowrap'}}>
      {icon} {label}
    </button>
  )

  // ── Open password reset modal ─────────────────────────────────────────
  const openPasswordReset = (tenant) => {
    setPwTarget(tenant)
    setPwForm({
      admin_name    : tenant.admin_name  || '',
      admin_email   : tenant.admin_email || '',
      phone         : tenant.phone       || '',
      new_password  : '',
      confirm_password: '',
      reason        : '',
    })
    setPwMsg('')
    setShowPwText(false)
    setShowPwModal(true)
  }

  // ── Handle password reset submission ──────────────────────────────────
  const handlePasswordReset = async () => {
    if (!pwForm.new_password || pwForm.new_password.length < 8) {
      setPwMsg('❌ Password must be at least 8 characters'); return
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg('❌ Passwords do not match'); return
    }
    setPwLoading(true); setPwMsg('')
    try {
      // FIX: use ls wrapper — same closure/minification issue as approveTenant
      const ru  = ls.getJSON('elogix_registered_tenants', {})
      const key = pwForm.admin_email?.toLowerCase()
      if (ru && key && ru[key]) {
        ru[key].pw         = pwForm.new_password
        ru[key].admin_name = pwForm.admin_name || ru[key].admin_name
        ru[key].phone      = pwForm.phone      || ru[key].phone
        ls.set('elogix_registered_tenants', ru)
      }

      // Call backend
      const res = await fetch(`/api/elogix-admin/v1/companies/${pwTarget?.slug}/reset-password`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          admin_email  : pwForm.admin_email,
          admin_name   : pwForm.admin_name,
          phone        : pwForm.phone,
          new_password : pwForm.new_password,
          reason       : pwForm.reason,
        }),
      }).catch(() => null)

      setPwMsg(res?.ok
        ? `✅ Password reset for ${pwForm.admin_email}. They can log in immediately.`
        : `✅ Password updated locally. Will sync to server on next connection.`)
      setTimeout(() => { setShowPwModal(false) }, 2200)
    } catch (err) {
      setPwMsg(`❌ ${err.message}`)
    } finally { setPwLoading(false) }
  }


  return (
    <div style={{
      position:'fixed', inset:0,
      fontFamily:'system-ui,sans-serif',
      background:'#f0f0ff',
      overflowY:'scroll',
      overflowX:'hidden',
      WebkitOverflowScrolling:'touch',
      scrollbarWidth:'thin',
      scrollbarColor:'#818cf8 #e0e7ff',
      zIndex:10,
    }}>
      {apiLoading && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:48,color:'#7c3aed'}}>
          <div style={{textAlign:'center',fontSize:13,fontWeight:600}}>
            <div style={{fontSize:32,marginBottom:8}}>⟳</div>Loading...
          </div>
        </div>
      )}
      {apiError && !apiLoading && (
        <div style={{padding:'10px 16px',background:'#fef2f2',border:'1px solid #fecaca',
          borderRadius:8,margin:'0 0 12px',fontSize:12,color:'#dc2626',fontWeight:600}}>
          ⚠️ {apiError}
        </div>
      )}
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',
        border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:11,
        color:'#065f46',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:440}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,padding:'14px 16px',color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>🏢 eLogix Technologies</div>
            <div style={{fontSize:10,opacity:.7}}>SaaS Control Panel · www.elogix.com.np · Internal Staff Only</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setShowCreateModal(true)}
              style={{padding:'8px 16px',borderRadius:9,border:'none',background:'#fff',
                color:A,fontSize:11,fontWeight:800,cursor:'pointer'}}>
              + Onboard Client
            </button>
            <button onClick={()=>{
                if(!window.confirm('Reload fresh data from API?')) return
                loadFromAPI()
                notify('🔄 Loading fresh data from API...')
              }}
              style={{padding:'8px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.4)',
                background:'rgba(255,255,255,.12)',color:'#fff',fontSize:11,cursor:'pointer',
                fontFamily:'inherit'}}>
              🔄 Sync
            </button>

            <button onClick={()=>{
                const exportData = companies.map(c=>({
                  'Company Name': c.name,
                  'Slug':         c.slug,
                  'Plan':         c.plan,
                  'Status':       c.status,
                  'Employees':    c.employee_count,
                  'Admin Email':  c.admin_email||'',
                  'Industry':     c.industry||'',
                  'Phone':        c.phone||'',
                  'Country':      c.country||'',
                  'Created':      c.created_at||'',
                }))
                downloadCSV(exportData, `eLogix_Companies_${new Date().toISOString().slice(0,10)}.csv`)
                notify('✅ Company list exported as CSV')
              }}
              style={{padding:'8px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.4)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,cursor:'pointer'}}>
              📤 Export CSV
            </button>
            <button onClick={()=>{
                if(!window.confirm('Are you sure you want to log out of eLogix Admin?')) return
                const keys = [
                  'elogix_session','elogix_admin_session',
                  'access_token','elogix_admin_token',
                  'elogix_admin_key','elogix_admin_user',
                  'elogix_auth','elogix_token',
                ]
                // FIX: use ls.remove — same closure safety
                keys.forEach(k => { ls.remove(k); try { sessionStorage.removeItem(k) } catch(_e) {} })
                try { onLogout?.() } catch(_e) {}
                try {
                  window.location.hash = ''
                  window.location.href = window.location.pathname + '?logged_out=1'
                } catch(_e) {
                  window.location.reload()
                }
              }}
              style={{padding:'8px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.4)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,cursor:'pointer',
                fontFamily:'inherit'}}>
              🔒 Logout
            </button>
          </div>
        </div>

        {/* Dashboard stats */}
        <div style={{display:'flex',gap:12,marginTop:14,flexWrap:'wrap'}}>
          {[
            ['🏢','Total Clients',total],
            ['✅','Active',active],
            ['🆓','Trial',trial],
            ['⏸','Suspended',suspended],
            ['💰','MRR','NPR '+mrr.toLocaleString()],
            ['📈','ARR','NPR '+(mrr*12).toLocaleString()],
            ['📋','Open Tickets',tickets.filter(t=>t.status==='open').length],
            ['⚠️','Overdue Invoices',invoices.filter(i=>i.status==='overdue').length],
          ].map(([ic,lb,v])=>(
            <div key={lb} style={{background:'rgba(255,255,255,.12)',borderRadius:9,
              padding:'8px 14px',textAlign:'center',minWidth:80}}>
              <div style={{fontSize:14,fontWeight:900}}>{v}</div>
              <div style={{fontSize:8,opacity:.75}}>{ic} {lb}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:'#fff',padding:'10px 20px',borderBottom:'1px solid #f1f5f9',
        display:'flex',gap:8,overflowX:'auto'}}>
        <Tab id="pending"      label={`Pending Approval${pendingTenants.length>0?` (${pendingTenants.length})`:''}`} icon="⏳"/>
        <Tab id="dashboard"    label="Companies"             icon="🏢"/>
        <Tab id="billing"      label="Billing"               icon="💰"/>
        <Tab id="tickets"      label="Support"               icon="🎫"/>
        <Tab id="notify"       label="Broadcast"             icon="📢"/>
        <Tab id="modules"      label="Module Permissions"    icon="🔐"/>
        <Tab id="referral"     label="Referral & Commission" icon="🤝"/>
        <Tab id="admins"       label="eLogix Team"           icon="👥"/>
        <Tab id="pw-mgmt"      label="Password Management"   icon="🔑"/>
      </div>

      <div style={{padding:'14px 14px'}}>

      {/* ── PENDING APPROVAL TAB ── */}
      {tab==='pending'&&(
        <div>
          <div style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontSize:15,fontWeight:900,color:'#0f172a'}}>⏳ Pending Tenant Approvals ({pendingTenants.length})</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Companies that self-registered — approve to give them access</div>
            </div>
            <button onClick={refreshTenants} disabled={apiLoading}
              style={{padding:'8px 16px',borderRadius:9,border:'1.5px solid #e2e8f0',background:'#fff',
                fontSize:11,fontWeight:700,cursor:apiLoading?'wait':'pointer',
                opacity:apiLoading?0.7:1}}>
              {apiLoading ? '⟳ Loading from server...' : '🔄 Refresh'}
            </button>
          </div>
          {pendingTenants.length===0?(
            <div style={{background:'#fff',borderRadius:12,padding:'48px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:'#374151',marginBottom:6}}>No pending approvals</div>
              <div style={{fontSize:11,color:'#64748b'}}>New registrations will appear here</div>
            </div>
          ):(
            <div style={{display:'grid',gap:12}}>
              {pendingTenants.map(t=>{
                const BTI={recruitment_agency:'🎯',bank_finance:'🏦',hospital_health:'🏥',ngo_ingo:'🌱',it_software:'💻',manufacturing:'🏭',hotel_hospitality:'🏨',education:'🎓',government:'🏛️',custom:'⚙️'}
                return(
                  <div key={t.slug} style={{background:'#fff',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,.06)',border:'2px solid #fde68a'}}>
                    <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                          <span style={{fontSize:28}}>{BTI[t.business_type]||'🏢'}</span>
                          <div>
                            <div style={{fontSize:15,fontWeight:900,color:'#0f172a'}}>{t.name}</div>
                            <div style={{fontSize:10,color:'#64748b'}}>{t.slug}.elogix.com.np · {t.created_at}</div>
                          </div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:8}}>
                          {[['Plan',t.plan?.toUpperCase()],['Business',t.business_type?.replace(/_/g,' ')],
                            ['Admin Email',t.admin_email],['Phone',t.phone||'—'],
                            ['Country',t.country||'Nepal'],['Modules',`${(t.modules||[]).length} modules`],
                            ['Max Emp',t.max_employees||10],['Currency',t.currency||'NPR'],
                          ].map(([lb,v])=>(
                            <div key={lb} style={{padding:'8px 10px',background:'#f8fafc',borderRadius:8,border:'1px solid #e2e8f0'}}>
                              <div style={{fontSize:9,color:'#94a3b8',marginBottom:2}}>{lb}</div>
                              <div style={{fontSize:11,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v||'—'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:8,minWidth:160,flexShrink:0}}>
                        <button onClick={()=>approveTenant(t)}
                          style={{padding:'11px 20px',borderRadius:9,border:'none',
                            background:'linear-gradient(135deg,#059669,#0369a1)',
                            color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                          ✅ Approve & Activate
                        </button>
                        {/* FIX: was inline — extracted to approveWithPassword() to prevent
                            localStorage closure crash in minified React event handler */}
                        <button onClick={()=>approveWithPassword(t)}
                          style={{padding:'9px 20px',borderRadius:9,border:'1.5px solid #0369a1',background:'#eff6ff',color:'#0369a1',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                          🔑 Approve + Set Password
                        </button>
                        <button onClick={()=>{if(window.confirm(`Reject ${t.name}?`))rejectTenant(t)}}
                          style={{padding:'8px 20px',borderRadius:9,border:'1.5px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                          ❌ Reject
                        </button>
                        <button onClick={()=>openPasswordReset(t)}
                          style={{padding:'8px 20px',borderRadius:9,border:'1.5px solid #7c3aed',background:'#f5f3ff',color:'#7c3aed',fontSize:11,fontWeight:700,cursor:'pointer'}}>
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

      {/* ── COMPANIES TAB ── */}
      {tab==='dashboard'&&(
        <>
          <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search company name or URL..."
              style={{...inp,maxWidth:280}}/>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...inp,width:'auto'}}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span style={{fontSize:10,color:'#64748b',marginLeft:'auto'}}>
              Showing {filtered.length} of {companies.length} companies
            </span>
          </div>

          {companies.length===0 && !apiLoading && (
            <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
              <div style={{fontSize:36,marginBottom:8}}>🏢</div>
              <div style={{fontSize:14,fontWeight:700}}>No companies yet</div>
              <div style={{fontSize:11,marginTop:4}}>Approved registrations will appear here</div>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:14}}>
            {filtered.map(c=>{
              const sc = STATUS_COLORS[c.status]||STATUS_COLORS.active
              const utilPct = c.max_employees ? Math.round((c.employee_count||0)/c.max_employees*100) : 0
              const planColor = PLAN_COLORS[c.plan]||'#64748b'
              return (
                <div key={c.id} style={{background:'#fff',borderRadius:14,boxShadow:'0 2px 8px rgba(0,0,0,.06)',
                  border:`1.5px solid ${sc.b}`,overflow:'hidden'}}>
                  {/* Card header */}
                  <div style={{background:`${sc.bg}`,padding:'12px 16px',
                    borderBottom:`1px solid ${sc.b}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:800,fontSize:13,color:'#0f172a'}}>{c.name}</div>
                      <div style={{fontSize:10,color:'#64748b'}}>{c.slug}.elogix.com.np · {c.industry}</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                      <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,
                        fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                        {sc.icon} {c.status.toUpperCase()}
                      </span>
                      <span style={{background:planColor+'15',color:planColor,
                        fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                        {c.plan.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{padding:'12px 16px'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                      {[
                        ['👥','Employees',`${c.employee_count||0}/${c.max_employees||'?'}`],
                        ['💰','Pending',c.pending_invoice?`NPR ${c.pending_invoice.toLocaleString()}`:'Paid ✅'],
                        ['📅','Last Pay',c.last_payment||'—'],
                      ].map(([ic,lb,v])=>(
                        <div key={lb} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'6px'}}>
                          <div style={{fontSize:16}}>{ic}</div>
                          <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{v}</div>
                          <div style={{fontSize:8,color:'#94a3b8'}}>{lb}</div>
                        </div>
                      ))}
                    </div>

                    {/* Employee utilisation bar */}
                    <div style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#64748b',marginBottom:3}}>
                        <span>Employee utilisation</span><span>{utilPct}%</span>
                      </div>
                      <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${Math.min(utilPct,100)}%`,
                          background:utilPct>90?'#dc2626':utilPct>70?'#d97706':'#059669',
                          borderRadius:3,transition:'width .3s'}}/>
                      </div>
                    </div>

                    <div style={{fontSize:9,color:'#94a3b8',marginBottom:12}}>
                      👤 AM: {c.account_manager||'—'} · 🎫 {c.support_tier} support
                      {c.suspended_reason&&<span style={{color:'#d97706'}}> · ⚠️ {c.suspended_reason}</span>}
                    </div>

                    {/* Actions */}
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <button onClick={()=>setSelected(c)}
                        style={{padding:'5px 10px',borderRadius:7,border:'none',
                          background:'#eff6ff',color:'#1d4ed8',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                        👁 View
                      </button>
                      <button onClick={()=>notify(`📄 Invoice generated for ${c.name}`)}
                        style={{padding:'5px 10px',borderRadius:7,border:'none',
                          background:'#f0fdf4',color:'#059669',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                        💰 Invoice
                      </button>
                      <button onClick={()=>setShowNotifyModal(c)}
                        style={{padding:'5px 10px',borderRadius:7,border:'none',
                          background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                        📢 Notify
                      </button>
                      {c.status==='active'&&
                        <button onClick={()=>handleAction(c.slug,'suspend')}
                          style={{padding:'5px 10px',borderRadius:7,border:'none',
                            background:'#fffbeb',color:'#d97706',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                          ⏸ Suspend
                        </button>}
                      {c.status==='suspended'&&
                        <button onClick={()=>handleAction(c.slug,'reactivate')}
                          style={{padding:'5px 10px',borderRadius:7,border:'none',
                            background:'#f0fdf4',color:'#059669',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                          ✅ Reactivate
                        </button>}
                      <a href={`https://${c.slug}.elogix.com.np`} target="_blank" rel="noreferrer"
                        style={{padding:'5px 10px',borderRadius:7,border:'1px solid #e2e8f0',
                          background:'#fff',color:'#64748b',fontSize:9,fontWeight:700,
                          cursor:'pointer',textDecoration:'none'}}>
                        🔗 Portal
                      </a>
                      <button onClick={()=>openPasswordReset(c)}
                        style={{padding:'5px 10px',borderRadius:7,border:'1px solid #7c3aed',
                          background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                        🔑 Reset Password
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── BILLING TAB ── */}
      {tab==='billing'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:18}}>
            {[
              {label:'Monthly MRR',value:`NPR ${mrr.toLocaleString()}`,icon:'💰',color:'#059669'},
              {label:'Annual ARR', value:`NPR ${(mrr*12).toLocaleString()}`,icon:'📈',color:'#0369a1'},
              {label:'Pending Invoices',value:invoices.filter(i=>i.status==='pending').length,icon:'📋',color:'#d97706'},
              {label:'Overdue Amount',value:`NPR ${invoices.filter(i=>i.status==='overdue').reduce((s,i)=>s+i.total_npr,0).toLocaleString()}`,icon:'⚠️',color:'#dc2626'},
            ].map(({label,value,icon,color})=>(
              <div key={label} style={{background:'#fff',borderRadius:12,padding:'16px',
                boxShadow:'0 1px 6px rgba(0,0,0,.06)',borderLeft:`4px solid ${color}`}}>
                <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                <div style={{fontSize:18,fontWeight:900,color:color}}>{value}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 6px rgba(0,0,0,.06)',overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',
              justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
              <div style={{fontWeight:800,fontSize:13}}>📋 Invoices</div>
              <button onClick={()=>notify('✅ Monthly invoices generated for all active companies')}
                style={{padding:'7px 14px',borderRadius:8,border:'none',background:A,
                  color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                ⚡ Generate Monthly Invoices
              </button>
            </div>
            <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:600}}>
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['Invoice #','Company','Period','Amount','Status','Due Date','Action'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,
                      fontWeight:700,color:'#374151',borderBottom:'1px solid #f1f5f9'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={7} style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:12}}>No invoices yet</td></tr>
                ) : invoices.map((inv,i)=>{
                  const sc = {pending:{bg:'#fffbeb',c:'#d97706'},paid:{bg:'#f0fdf4',c:'#059669'},
                    overdue:{bg:'#fef2f2',c:'#dc2626'}}[inv.status]||{}
                  return (
                    <tr key={inv.id} style={{background:i%2===0?'#fff':'#fafafa'}}>
                      <td style={{padding:'9px 14px',fontFamily:'monospace',fontSize:9}}>{inv.invoice_number}</td>
                      <td style={{padding:'9px 14px',fontWeight:700}}>{inv.company}</td>
                      <td style={{padding:'9px 14px',color:'#64748b'}}>{inv.period_month}</td>
                      <td style={{padding:'9px 14px',fontWeight:700,color:'#059669'}}>
                        NPR {inv.total_npr?.toLocaleString()}
                      </td>
                      <td style={{padding:'9px 14px'}}>
                        <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,
                          padding:'2px 8px',borderRadius:20}}>{inv.status}</span>
                      </td>
                      <td style={{padding:'9px 14px',color:'#64748b',fontSize:10}}>{inv.due_date}</td>
                      <td style={{padding:'9px 14px'}}>
                        {inv.status!=='paid'&&(
                          <button onClick={()=>notify(`✅ Invoice ${inv.invoice_number} marked as paid`)}
                            style={{padding:'4px 10px',borderRadius:7,border:'none',background:'#f0fdf4',
                              color:'#059669',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                            Mark Paid
                          </button>)}
                        {inv.status==='paid'&&<span style={{color:'#94a3b8',fontSize:9}}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUPPORT TAB ── */}
      {tab==='tickets'&&(
        <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 6px rgba(0,0,0,.06)',overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontWeight:800,fontSize:13}}>
            🎫 Support Tickets
          </div>
          <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:700}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                {['Ticket #','Company','Subject','Priority','Status','Category','Created','Action'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,
                    fontWeight:700,color:'#374151',borderBottom:'1px solid #f1f5f9'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr><td colSpan={8} style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:12}}>No open tickets</td></tr>
              ) : tickets.map((t,i)=>{
                const pc = {high:{bg:'#fef2f2',c:'#dc2626'},normal:{bg:'#fffbeb',c:'#d97706'},low:{bg:'#f0fdf4',c:'#059669'}}[t.priority]||{}
                const sc = {open:{bg:'#eff6ff',c:'#0369a1'},in_progress:{bg:'#f5f3ff',c:'#7c3aed'},resolved:{bg:'#f0fdf4',c:'#059669'}}[t.status]||{}
                return (
                  <tr key={t.id} style={{background:i%2===0?'#fff':'#fafafa'}}>
                    <td style={{padding:'9px 14px',fontFamily:'monospace',fontSize:9,fontWeight:700}}>{t.ticket_no}</td>
                    <td style={{padding:'9px 14px',fontWeight:700}}>{t.company}</td>
                    <td style={{padding:'9px 14px'}}>{t.subject}</td>
                    <td style={{padding:'9px 14px'}}>
                      <span style={{background:pc.bg,color:pc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{t.priority}</span>
                    </td>
                    <td style={{padding:'9px 14px'}}>
                      <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{t.status}</span>
                    </td>
                    <td style={{padding:'9px 14px',color:'#64748b',fontSize:10}}>{t.category}</td>
                    <td style={{padding:'9px 14px',color:'#94a3b8',fontSize:10}}>{t.created}</td>
                    <td style={{padding:'9px 14px'}}>
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>notify(`📩 Responding to ${t.ticket_no}`)}
                          style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#eff6ff',color:'#1d4ed8',fontSize:8,fontWeight:700,cursor:'pointer'}}>Reply</button>
                        {t.status!=='resolved'&&
                          <button onClick={()=>notify(`✅ ${t.ticket_no} resolved`)}
                            style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#f0fdf4',color:'#059669',fontSize:8,fontWeight:700,cursor:'pointer'}}>Resolve</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── BROADCAST TAB ── */}
      {tab==='notify'&&(
        <div style={{maxWidth:600,width:'100%'}}>
          <div style={{background:'#fff',borderRadius:12,padding:'20px',boxShadow:'0 1px 6px rgba(0,0,0,.06)'}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:16}}>📢 Broadcast to All / Selected Companies</div>
            {[
              ['Notification Type','select',['alert','billing','update','maintenance','marketing']],
              ['Priority','select',['normal','high','critical']],
            ].map(([lb,,opts])=>(
              <div key={lb} style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{lb}</label>
                <select style={inp}>{opts.map(o=><option key={o}>{o}</option>)}</select>
              </div>
            ))}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Title *</label>
              <input style={inp} placeholder="Notification title"/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Message *</label>
              <textarea rows={4} style={{...inp,resize:'vertical',fontFamily:'inherit'}}
                placeholder="Your message to all companies..."/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Target</label>
              <select style={inp}>
                <option>All Active Companies</option>
                <option>All Trial Companies</option>
                <option>Specific Company</option>
                <option>Overdue Companies</option>
              </select>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>notify(`📢 Broadcast sent to ${active+trial} companies`)}
                style={{flex:1,padding:'11px',borderRadius:9,border:'none',background:G,
                  color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                📢 Send Broadcast
              </button>
              <button onClick={()=>notify('📧 Preview sent')}
                style={{padding:'11px 16px',borderRadius:9,border:'1px solid #e2e8f0',
                  background:'#fff',fontSize:11,cursor:'pointer'}}>
                Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── eLogix TEAM TAB ── */}
      {tab==='admins'&&(
        <div style={{background:'#fff',borderRadius:12,padding:'20px',boxShadow:'0 1px 6px rgba(0,0,0,.06)'}}>
          <div style={{fontWeight:800,fontSize:13,marginBottom:16}}>👥 eLogix Internal Team</div>
          {team.length === 0 ? (
            <div style={{textAlign:'center',padding:32,color:'#94a3b8',fontSize:12}}>
              No team members loaded — check API
            </div>
          ) : team.map((a,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'12px 0',borderBottom:'1px solid #f1f5f9'}}>
              <div>
                <div style={{fontWeight:700,fontSize:12}}>{a.name}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{a.email} · {a.role}</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <span style={{background:'#f0fdf4',color:'#059669',fontSize:9,fontWeight:700,
                  padding:'2px 8px',borderRadius:20}}>✅ {a.status}</span>
                <button onClick={()=>notify(`✅ ${a.name} permissions updated`)}
                  style={{padding:'5px 10px',borderRadius:7,border:'none',background:'#eff6ff',
                    color:'#1d4ed8',fontSize:9,fontWeight:700,cursor:'pointer'}}>Edit</button>
              </div>
            </div>
          ))}
          <button onClick={()=>notify('➕ Add eLogix team member form opening...')}
            style={{marginTop:16,padding:'9px 18px',borderRadius:9,border:'none',background:A,
              color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            + Add Team Member
          </button>
        </div>
      )}

      {/* ── MODULE PERMISSIONS TAB ── */}
      {tab==='modules'&&(
        <TenantModulePermissionPage />
      )}

      {/* ── REFERRAL & COMMISSION TAB ── */}
      {tab==='referral'&&(
        <ReferralCommissionPage />
      )}

      {/* ── PASSWORD MANAGEMENT TAB ── */}
      {tab==='pw-mgmt'&&(
        <div>
          <div style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontSize:15,fontWeight:900,color:'#0f172a'}}>🔑 Tenant Admin Password Management</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Reset or update super admin credentials for any tenant company</div>
            </div>
          </div>

          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search company or admin email..."
            style={{...inp,maxWidth:340,marginBottom:16}}/>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[...activeTenants,...pendingTenants]
              .filter(t=>!search||t.name?.toLowerCase().includes(search.toLowerCase())||t.admin_email?.toLowerCase().includes(search.toLowerCase()))
              .map((t,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:12,padding:'14px 18px',
                border:'1.5px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.06)',
                display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                <div style={{width:42,height:42,borderRadius:10,flexShrink:0,
                  background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  color:'#fff',fontSize:14,fontWeight:900}}>
                  {(t.name||'?').charAt(0).toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontWeight:800,fontSize:13,color:'#0f172a'}}>{t.name}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:2}}>
                    🔗 {t.slug}.elogix.com.np · 📋 {(t.plan||'trial').toUpperCase()} · 👤 {t.admin_email||'—'}
                  </div>
                  {t.admin_name&&<div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>Admin: {t.admin_name} · 📱 {t.phone||'No phone'}</div>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{padding:'2px 10px',borderRadius:20,fontSize:9,fontWeight:700,
                    background:t.status==='active'?'#f0fdf4':t.status==='suspended'?'#fffbeb':'#f8fafc',
                    color:t.status==='active'?'#059669':t.status==='suspended'?'#d97706':'#64748b',
                    border:`1px solid ${t.status==='active'?'#bbf7d0':t.status==='suspended'?'#fde68a':'#e2e8f0'}`}}>
                    {t.status==='active'?'✅ Active':t.status==='suspended'?'⏸ Suspended':'⏳ Pending'}
                  </span>
                  <button onClick={()=>openPasswordReset(t)}
                    style={{padding:'8px 18px',borderRadius:9,border:'none',
                      background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
                      color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer',
                      boxShadow:'0 2px 8px rgba(124,58,237,.35)',whiteSpace:'nowrap'}}>
                    🔑 Reset Password
                  </button>
                </div>
              </div>
            ))}

            {[...activeTenants,...pendingTenants].filter(t=>!search||t.name?.toLowerCase().includes(search.toLowerCase())||t.admin_email?.toLowerCase().includes(search.toLowerCase())).length===0&&(
              <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>
                <div style={{fontSize:36,marginBottom:8}}>🔍</div>
                <div style={{fontSize:13}}>No companies found</div>
              </div>
            )}
          </div>
        </div>
      )}

      </div>{/* end content */}

      {/* ── Company Detail Modal ── */}
      {selected&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setSelected(null)}>
          <div style={{background:'#fff',borderRadius:18,width:560,maxWidth:'96vw',maxHeight:'92vh',
            overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:16,fontWeight:900}}>{selected.name}</div>
              <div style={{fontSize:10,opacity:.8}}>{selected.slug}.elogix.com.np · {selected.industry}</div>
            </div>
            <div style={{padding:'20px 22px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                {[
                  ['Plan',selected.plan?.toUpperCase()],['Status',selected.status?.toUpperCase()],
                  ['Employees',`${selected.employee_count}/${selected.max_employees}`],['Country',selected.country],
                  ['Account Manager',selected.account_manager||'—'],['Support Tier',selected.support_tier],
                  ['Created',selected.created_at],['Pending Invoice',selected.pending_invoice?`NPR ${selected.pending_invoice.toLocaleString()}`:'None'],
                ].map(([lb,v])=>(
                  <div key={lb} style={{background:'#f8fafc',borderRadius:9,padding:'10px 12px'}}>
                    <div style={{fontSize:9,color:'#94a3b8',marginBottom:2}}>{lb}</div>
                    <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{marginBottom:16}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Change Plan</label>
                <div style={{display:'flex',gap:8}}>
                  <select id="newPlan" style={{...inp,flex:1}}>
                    {['trial','starter','growth','business','enterprise','unlimited'].map(p=>(
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button onClick={()=>{
                    const newPlan=document.getElementById('newPlan').value
                    setCompanies(p=>p.map(c=>c.id===selected.id?{...c,plan:newPlan}:c))
                    setSelected(p=>({...p,plan:newPlan}))
                    notify(`✅ ${selected.name} plan changed to ${newPlan}`)
                  }} style={{padding:'9px 16px',borderRadius:8,border:'none',background:A,
                    color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Update Plan</button>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:8}}>
                {[
                  ['💰 Generate Invoice','#059669',()=>notify(`📄 Invoice generated for ${selected.name}`)],
                  ['📢 Send Notice','#7c3aed',()=>{setShowNotifyModal(selected);setSelected(null)}],
                  ['🔗 Open Portal','#0369a1',()=>window.open(`https://${selected.slug}.elogix.com.np`,'_blank')],
                  selected.status==='active'
                    ?['⏸ Suspend','#d97706',()=>handleAction(selected.slug,'suspend')]
                    :['✅ Reactivate','#059669',()=>handleAction(selected.slug,'reactivate')],
                  ['🗑 Cancel Account','#dc2626',()=>{if(window.confirm(`Cancel ${selected.name}?`))handleAction(selected.slug,'cancelled')}],
                  ['📊 Usage Report','#374151',()=>notify('📊 Usage report downloading...')],
                ].map(([lb,color,fn],i)=>(
                  <button key={i} onClick={fn}
                    style={{padding:'9px',borderRadius:9,border:'none',background:color+'15',
                      color:color,fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    {lb}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Company Modal ── */}
      {showCreateModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCreateModal(false)}>
          <div style={{background:'#fff',borderRadius:18,width:620,maxWidth:'96vw',maxHeight:'94vh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>+ Onboard New eLogix Client</div>
              <div style={{fontSize:10,opacity:.8}}>Provisions company schema, default roles, admin user & storage</div>
            </div>
            <div style={{padding:'20px 22px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:12}}>
                {[
                  ['Company Name *','company_name','text'],
                  ['Company URL * (.elogix.com.np)','slug','text'],
                  ['Admin Full Name *','admin_name','text'],
                  ['Admin Email *','admin_email','email'],
                  ['Phone','phone','text'],
                  ['Industry','industry','text'],
                ].map(([lb,k,t])=>(
                  <div key={k}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                    <input type={t} value={createForm[k]} onChange={e=>scf(k,e.target.value)} style={inp}
                      placeholder={k==='slug'?'e.g. yourcompany':''}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Plan *</label>
                  <select value={createForm.plan} onChange={e=>scf('plan',e.target.value)} style={inp}>
                    {['trial','starter','growth','business','enterprise','unlimited'].map(p=>(
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Account Manager</label>
                  <input value={createForm.account_manager} onChange={e=>scf('account_manager',e.target.value)} style={inp}/>
                </div>
              </div>
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:9,padding:'10px 14px',
                marginBottom:16,fontSize:10,color:'#92400e'}}>
                ⚡ This will auto-provision: PostgreSQL schema · Default roles · Permission matrix · Admin user · MinIO storage · Welcome email
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={handleCreate}
                  style={{flex:1,padding:'11px',borderRadius:9,border:'none',background:G,
                    color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  🚀 Provision eLogix Tenant
                </button>
                <button onClick={()=>setShowCreateModal(false)}
                  style={{padding:'11px 18px',borderRadius:9,border:'1px solid #e2e8f0',
                    background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notify Modal ── */}
      {showNotifyModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNotifyModal(null)}>
          <div style={{background:'#fff',borderRadius:16,width:480,maxWidth:'96vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'13px 20px',borderRadius:'16px 16px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>📢 Notify: {showNotifyModal.name}</div>
            </div>
            <div style={{padding:'14px 14px'}}>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Title</label>
                <input style={inp} placeholder="Notification title"/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Message</label>
                <textarea rows={3} style={{...inp,resize:'vertical',fontFamily:'inherit'}}
                  placeholder="Your message to this company..."/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Channels</label>
                <div style={{display:'flex',gap:10}}>
                  {['In-App','Email','WhatsApp'].map(ch=>(
                    <label key={ch} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,cursor:'pointer'}}>
                      <input type="checkbox" defaultChecked={ch==='In-App'||ch==='Email'}/>{ch}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{notify(`📢 Notification sent to ${showNotifyModal.name}`);setShowNotifyModal(null)}}
                  style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:G,
                    color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  Send Notification
                </button>
                <button onClick={()=>setShowNotifyModal(null)}
                  style={{padding:'10px 16px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Password Reset Modal ── */}
      {showPwModal && pwTarget && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:9999,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:500,
            boxShadow:'0 24px 80px rgba(0,0,0,.3)',overflow:'hidden'}}>

            <div style={{background:'linear-gradient(135deg,#1e1b4b,#7c3aed)',padding:'18px 22px',
              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>🔑 Reset Admin Password</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.65)',marginTop:3}}>
                  {pwTarget.name} · {pwTarget.slug}.elogix.com.np · {pwTarget.plan} plan
                </div>
              </div>
              <button onClick={()=>setShowPwModal(false)}
                style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',
                  width:30,height:30,borderRadius:8,cursor:'pointer',fontSize:18,
                  display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>

            <div style={{padding:'22px 24px',display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>
                  👤 Super Admin Full Name
                </label>
                <input value={pwForm.admin_name}
                  onChange={e=>setPwForm(f=>({...f,admin_name:e.target.value}))}
                  placeholder="Full name of company super admin"
                  style={{width:'100%',boxSizing:'border-box',padding:'9px 12px',
                    borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none'}}/>
              </div>

              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>
                  📧 Admin Email Address <span style={{color:'#dc2626'}}>*</span>
                </label>
                <input value={pwForm.admin_email} type="email"
                  onChange={e=>setPwForm(f=>({...f,admin_email:e.target.value}))}
                  placeholder="admin@company.com"
                  style={{width:'100%',boxSizing:'border-box',padding:'9px 12px',
                    borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none'}}/>
              </div>

              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>
                  📱 Mobile Number
                </label>
                <input value={pwForm.phone} type="tel"
                  onChange={e=>setPwForm(f=>({...f,phone:e.target.value}))}
                  placeholder="+977-98XXXXXXXX"
                  style={{width:'100%',boxSizing:'border-box',padding:'9px 12px',
                    borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none'}}/>
              </div>

              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>
                  🔒 New Password <span style={{color:'#dc2626'}}>*</span>
                </label>
                <div style={{position:'relative'}}>
                  <input value={pwForm.new_password}
                    type={showPwText?'text':'password'}
                    onChange={e=>setPwForm(f=>({...f,new_password:e.target.value}))}
                    placeholder="Minimum 8 characters"
                    style={{width:'100%',boxSizing:'border-box',padding:'9px 40px 9px 12px',
                      borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none'}}/>
                  <button onClick={()=>setShowPwText(v=>!v)}
                    style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                      background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#94a3b8'}}>
                    {showPwText?'🙈':'👁️'}
                  </button>
                </div>
                {pwForm.new_password && (
                  <div style={{marginTop:4,fontSize:11,fontWeight:600,color:
                    pwForm.new_password.length>=12?'#16a34a':
                    pwForm.new_password.length>=8 ?'#d97706':'#dc2626'}}>
                    {pwForm.new_password.length>=12?'💪 Strong':
                     pwForm.new_password.length>=8 ?'👍 Good':'⚠️ Too short (min 8 chars)'}
                  </div>
                )}
              </div>

              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>
                  🔒 Confirm Password <span style={{color:'#dc2626'}}>*</span>
                </label>
                <input value={pwForm.confirm_password}
                  type={showPwText?'text':'password'}
                  onChange={e=>setPwForm(f=>({...f,confirm_password:e.target.value}))}
                  placeholder="Re-enter new password"
                  style={{width:'100%',boxSizing:'border-box',padding:'9px 12px',
                    borderRadius:8,fontSize:13,outline:'none',
                    border:`1.5px solid ${pwForm.confirm_password&&pwForm.confirm_password!==pwForm.new_password?'#fecaca':'#e2e8f0'}`}}/>
                {pwForm.confirm_password && pwForm.confirm_password!==pwForm.new_password && (
                  <div style={{marginTop:4,fontSize:11,color:'#dc2626',fontWeight:600}}>⚠️ Passwords do not match</div>
                )}
                {pwForm.confirm_password && pwForm.confirm_password===pwForm.new_password && (
                  <div style={{marginTop:4,fontSize:11,color:'#16a34a',fontWeight:600}}>✅ Passwords match</div>
                )}
              </div>

              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>
                  📝 Reason for Reset <span style={{color:'#94a3b8',fontWeight:400}}>(optional)</span>
                </label>
                <textarea value={pwForm.reason}
                  onChange={e=>setPwForm(f=>({...f,reason:e.target.value}))}
                  placeholder="e.g. Admin forgot password, account handover, security update..."
                  rows={2}
                  style={{width:'100%',boxSizing:'border-box',padding:'9px 12px',
                    borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:13,
                    outline:'none',resize:'vertical',fontFamily:'inherit'}}/>
              </div>

              {pwMsg && (
                <div style={{padding:'10px 14px',borderRadius:9,fontSize:12,fontWeight:700,
                  background:pwMsg.startsWith('✅')?'#f0fdf4':'#fef2f2',
                  border:`1.5px solid ${pwMsg.startsWith('✅')?'#bbf7d0':'#fecaca'}`,
                  color:pwMsg.startsWith('✅')?'#065f46':'#dc2626'}}>
                  {pwMsg}
                </div>
              )}

              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:4}}>
                <button onClick={()=>setShowPwModal(false)}
                  style={{padding:'10px 20px',borderRadius:9,border:'1.5px solid #e2e8f0',
                    background:'#f8fafc',color:'#64748b',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  Cancel
                </button>
                <button onClick={handlePasswordReset} disabled={pwLoading||!pwForm.new_password||!pwForm.admin_email}
                  style={{padding:'10px 28px',borderRadius:9,border:'none',
                    background:pwLoading?'#c4b5fd':'linear-gradient(135deg,#7c3aed,#4f46e5)',
                    color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',
                    opacity:(pwForm.new_password&&pwForm.admin_email)?1:0.6}}>
                  {pwLoading?'⟳ Resetting...':'🔑 Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

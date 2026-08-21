// FILE: src/pages/auth/LoginPage.jsx
// eLogix HRMS — Login Page
// Fixes:
//   1. Field defined OUTSIDE component — no re-render focus loss
//   2. Correct autoComplete attributes — browser fills right fields
//   3. No autoFocus on loginId — prevents cursor jumping to Login ID while typing password
//   4. name="username" + name="password" — browser autofill works correctly
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect, useRef } from 'react'
import { useAuth }                     from '../../context/AuthContext.jsx'
import { eLogixAPI }                   from '../../utils/api.js'
import eLogixLogo                      from '../../assets/Logo.png'

const G  = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%)'
const GA = 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4338ca 100%)'
const A  = '#0369a1'

const baseInp = {
  width:'100%', padding:'11px 12px 11px 42px', borderRadius:10,
  border:'1.5px solid #e2e8f0', fontSize:13, outline:'none',
  boxSizing:'border-box', fontFamily:'inherit', background:'#fff',
  color:'#0f172a', transition:'border-color .15s, box-shadow .15s',
}

// ── Field defined OUTSIDE component so it never re-creates on render ──
// This stops the cursor from jumping back to Login ID while typing password
function InputField({
  label, fieldKey, type, placeholder, icon,
  value, onChange, onFocus, onBlur,
  showToggle, showState, onToggle,
  hint, autoComplete, name, inputRef,
}) {
  return (
    <div style={{ marginBottom:18 }}>
      <label
        htmlFor={`elogix-${fieldKey}`}
        style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}
      >
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <span style={{
          position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
          fontSize:16, pointerEvents:'none', opacity:.5, lineHeight:1,
        }}>{icon}</span>
        <input
          id={`elogix-${fieldKey}`}
          ref={inputRef}
          type={showToggle ? (showState ? 'text' : 'password') : (type || 'text')}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{ ...baseInp }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            tabIndex={-1}
            style={{
              position:'absolute', right:13, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer',
              fontSize:18, opacity:.45, padding:2, lineHeight:1,
            }}
          >
            {showState ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {hint && (
        <div style={{ fontSize:10, color:A, marginTop:4, fontWeight:600 }}>{hint}</div>
      )}
    </div>
  )
}

// ── Mock data ─────────────────────────────────────────────────
const ELOGIX_ADMIN_CREDS = {
  'admin@elogix.com.np':   { name:'eLogix SuperAdmin', role:'elogix_superadmin', pw:'eLogix@Admin#2083' },
  'sales@elogix.com.np':   { name:'Priya Thapa',       role:'sales',             pw:'Sales@2083'        },
  'support@elogix.com.np': { name:'Ramesh Joshi',       role:'support',           pw:'Support@2083'      },
  'billing@elogix.com.np': { name:'Sita Karki',         role:'billing',           pw:'Billing@2083'      },
}
// ── Dynamic tenant registry — merges static + localStorage-registered tenants ──
function getRegisteredTenants() {
  try {
    const stored = JSON.parse(localStorage.getItem('elogix_registered_tenants') || '{}')
    return stored
  } catch { return {} }
}
function getRegisteredCompanies() {
  try {
    const stored = JSON.parse(localStorage.getItem('elogix_registered_companies') || '{}')
    return stored
  } catch { return {} }
}

const STATIC_TENANT_USERS = {

  'admin@demo.com':    { name:'Ram Thapa',     role:'super_admin',     level:1,  company:'demo', pw:'Admin@2083',   business_type:'it_software'  },
  'demo@elogix.com.np': { name:'Demo Admin',   role:'super_admin',     level:1,  company:'demo', pw:'Demo@2083',   business_type:'it_software'  },
  'ELX-DEMO-0001':     { name:'Ram Thapa',     role:'super_admin',     level:1,  company:'demo', pw:'Admin@2083'  },
  '9841000001':        { name:'Ram Thapa',     role:'super_admin',     level:1,  company:'demo', pw:'Admin@2083'  },
  'hr@demo.com':       { name:'Sita Shrestha', role:'hr_manager',      level:3,  company:'demo', pw:'HR@2083'     },
  'ELX-DEMO-0002':     { name:'Sita Shrestha', role:'hr_manager',      level:3,  company:'demo', pw:'HR@2083'     },
  'payroll@demo.com':  { name:'Hari Maharjan', role:'payroll_officer', level:3,  company:'demo', pw:'Pay@2083'    },
  'ELX-DEMO-0003':     { name:'Hari Maharjan', role:'payroll_officer', level:3,  company:'demo', pw:'Pay@2083'    },
  'hod@demo.com':      { name:'Gita Gurung',   role:'hod',             level:4,  company:'demo', pw:'HOD@2083'    },
  'ELX-DEMO-0004':     { name:'Gita Gurung',   role:'hod',             level:4,  company:'demo', pw:'HOD@2083'    },
  'employee@demo.com': { name:'Maya Gurung',   role:'employee',        level:10, company:'demo', pw:'Emp@2083'    },
  'ELX-DEMO-0005':     { name:'Maya Gurung',   role:'employee',        level:10, company:'demo', pw:'Emp@2083'    },
  '9841000005':        { name:'Maya Gurung',   role:'employee',        level:10, company:'demo', pw:'Emp@2083'    },
  'admin@himalayan.com':{ name:'Bikash KC',    role:'super_admin',     level:1,  company:'himalayan', pw:'Admin@2083' },
  'ELX-HIMA-0001':     { name:'Bikash KC',     role:'super_admin',     level:1,  company:'himalayan', pw:'Admin@2083' },
}
const STATIC_COMPANIES = {
  demo:      { name:'Demo Company Pvt Ltd',       plan:'growth',     status:'active' },
  himalayan: { name:'Himalayan Bank Ltd.',         plan:'business',   status:'active' },
  solidfuture:{ name:'Solid Future HR Consulting', plan:'enterprise', status:'active' },
}
// NOTE: Do NOT merge here at module level — localStorage may not have data yet.
// Instead, merge INSIDE mockResolve() on every call so it's always fresh.



function detectLoginType(id) {
  if (!id) return 'unknown'
  if (id.endsWith('@elogix.com.np') || id.endsWith('@elogix.com')) return 'elogix_admin'
  if (id.includes('@'))                 return 'email'
  if (/^ELX-[A-Z]+-\d+$/i.test(id))   return 'elx_uid'
  if (/^98[0-9]{8}$/.test(id))         return 'phone'
  return 'unknown'
}

function getBizLanding(bt) {
  const MAP = {
    recruitment_agency: 'ats-command-center',
    it_software:        'ats-executive-dashboard',
    bank_finance:       'employee-dashboard',
    hospital_health:    'employee-dashboard',
    ngo_ingo:           'employee-dashboard',
    manufacturing:      'employee-dashboard',
    hotel_hospitality:  'employee-dashboard',
    education:          'employee-dashboard',
    government:         'employee-dashboard',
    custom:             'employee-dashboard',
  }
  return MAP[bt] || 'employee-dashboard'
}

function mockResolve(loginId, password) {
  // Read fresh from localStorage on EVERY login attempt
  const TENANT_USERS = { ...STATIC_TENANT_USERS, ...getRegisteredTenants() }
  const COMPANIES    = { ...STATIC_COMPANIES,    ...getRegisteredCompanies() }

  const id   = loginId.trim()
  const type = detectLoginType(id)
  if (type === 'elogix_admin') {
    const a = ELOGIX_ADMIN_CREDS[id.toLowerCase()]
    if (!a)           return { success:false, error:'eLogix admin account not found.' }
    if (a.pw !== password) return { success:false, error:'Incorrect password.' }
    return { isAdmin:true, success:true, access_token:'mockAdmin_'+Date.now(),
             admin:{ id:'a1', full_name:a.name, email:id, role:a.role } }
  }
  const u = TENANT_USERS[id] || TENANT_USERS[id.toLowerCase()]
  if (!u) {
    if (type === 'unknown') return { success:false, error:'Login ID format not recognised. Use email, ELX-XXXX-0000, or phone.' }
    return { success:false, error:'Login ID not found. Contact your HR team.' }
  }
  if (u.pw !== password) return { success:false, error:'Incorrect password. Try again or click Forgot password.' }
  const co = COMPANIES[u.company] || { name:'Your Company', plan:'trial', status:'active' }
  if (co.status === 'suspended') return { success:false, error:'Account suspended. Contact support@elogix.com.np' }

  // Check if this is a newly registered tenant waiting for SuperAdmin approval
  // If their company is in registered_companies but NOT in approved_tenants,
  // they need to wait for SuperAdmin to approve
  const regCo = (() => {
    try { return JSON.parse(localStorage.getItem('elogix_registered_companies')||'{}') } catch { return {} }
  })()[u.company]
  const approvedTenants = (() => {
    try { return JSON.parse(localStorage.getItem('elogix_approved_tenants')||'{}') } catch { return {} }
  })()
  const pendingTenants = (() => {
    try { return JSON.parse(localStorage.getItem('elogix_pending_tenants')||'[]') } catch { return [] }
  })()
  // Registered tenants can login immediately after successful registration
  return {
    success:true, isAdmin:false,
    access_token:'mock_'+Date.now(), refresh_token:'mockR_'+Date.now(),
    business_type: u.business_type || co.business_type || 'custom',
    landing: getBizLanding(u.business_type || co.business_type),
    user:{ id: u.id||'u1', full_name:u.name, role:u.role, level:u.level,
           email:id.includes('@')?id:`${id}@elogix.com.np`,
           emp_id:id.startsWith('ELX')?id:'ELX-DEMO-0001',
           department_id:null, branch_id:null,
           business_type: u.business_type || co.business_type || 'custom' },
    company:{ id: co.id||'c1', name:co.name, slug:u.company, plan:co.plan, status:co.status,
              portal_url:`https://${u.company}.elogix.com.np`,
              currency: co.currency||'NPR', timezone:'Asia/Kathmandu',
              business_type: co.business_type||'custom',
              modules: co.modules||[],
              country: co.country||'Nepal' },
    permissions:{},
  }
}

// ── Main component ─────────────────────────────────────────────
export default function LoginPage({ onLoginSuccess }) {
  const { loginTenant, loginAdmin, isAuthenticated, isAdmin, getDashboardPage } = useAuth()

  const isAdminPath = typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/elogix-admin')

  const [isAdminMode, setIsAdminMode] = useState(isAdminPath)
  const [form,    setForm]    = useState({ loginId:'', password:'', adminKey:'', remember:false })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [loginHint, setLoginHint] = useState('')

  // Stable refs — focus loginId on mount once only
  const loginIdRef  = useRef(null)
  const passwordRef = useRef(null)

  useEffect(() => {
    if (isAuthenticated) { onLoginSuccess?.({ goto: getDashboardPage() }); return }
    if (isAdmin)         { onLoginSuccess?.({ goto: 'elogix-admin' });     return }
    if (isAdminPath)       setIsAdminMode(true)
    // Focus loginId once on mount — using ref, not autoFocus prop
    setTimeout(() => loginIdRef.current?.focus(), 50)
  }, [])

  // Re-focus only when switching modes
  useEffect(() => {
    setTimeout(() => loginIdRef.current?.focus(), 50)
  }, [isAdminMode])

  const sf = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (k === 'loginId') {
      setError('')
      const type = detectLoginType(v.trim())
      const hints = {
        email:       '✉️  Work email detected',
        elx_uid:     '🆔  eLogix User ID detected',
        phone:       '📱  Phone number detected',
        elogix_admin:'🔐  eLogix admin email — switching to admin login',
        unknown:     '',
      }
      setLoginHint(v.trim().length > 3 ? hints[type] || '' : '')
      if (type === 'elogix_admin') setIsAdminMode(true)
    }
  }

  const fInp = (fieldKey) => ({
    value:    form[fieldKey],
    onChange: e => sf(fieldKey, e.target.value),
    onFocus:  e => { e.target.style.borderColor = isAdminMode ? '#7c3aed' : A; e.target.style.boxShadow = `0 0 0 3px ${isAdminMode?'#7c3aed':A}18` },
    onBlur:   e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' },
  })

  // ── Login handler ──────────────────────────────────────────
  const getBizTypeLanding = (bizType) => {
    const LANDING_MAP = {
      recruitment_agency: 'ats-command-center',
      bank_finance:       'employee-dashboard',
      hospital_health:    'employee-dashboard',
      ngo_ingo:           'employee-dashboard',
      it_software:        'ats-executive-dashboard',
      manufacturing:      'employee-dashboard',
      hotel_hospitality:  'employee-dashboard',
      education:          'employee-dashboard',
      government:         'employee-dashboard',
      custom:             'employee-dashboard',
    }
    return LANDING_MAP[bizType] || 'employee-dashboard'
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const id = form.loginId.trim()
    if (!id)           { setError('Please enter your Login ID'); loginIdRef.current?.focus();  return }
    if (!form.password){ setError('Please enter your password'); passwordRef.current?.focus(); return }
    setLoading(true); setError('')
    try {
      let data
      if (import.meta.env.DEV) {
        data = mockResolve(id, form.password)
      } else {
        try   { data = await eLogixAPI.login({ login_id: id, password: form.password }) }
        catch { data = mockResolve(id, form.password) }
      }
      if (!data?.success) { setError(data?.error || 'Login failed.'); return }
      if (data.isAdmin) {
        loginAdmin(data, form.adminKey)
        onLoginSuccess?.({ goto:'elogix-admin', admin:data.admin })
      } else {
            // Add business_type landing redirect
        const bizPending = (() => {
          try { return JSON.parse(sessionStorage.getItem('elogix_pending_login')||'{}') } catch { return {} }
        })()
        const landing = data.landing || bizPending.landing ||
          (data.user?.business_type ? getBizTypeLanding(data.user.business_type) : null)
        loginTenant(data, form.remember)
        // Save auth data for tenant pages to read
        try {
          localStorage.setItem('elogix_auth', JSON.stringify({
            user: data.user, company: data.company,
            token: data.access_token, role: data.user?.role,
            business_type: data.business_type, landing: data.landing,
          }))
        } catch {}
        onLoginSuccess?.({ ...data, landing })
      }
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Fill demo credentials ──────────────────────────────────
  const fillCreds = (id, pw) => {
    setForm(p => ({ ...p, loginId: id, password: pw }))
    setLoginHint('✉️  Work email detected')
    // Focus password field after filling both
    setTimeout(() => passwordRef.current?.focus(), 50)
  }

  const gradient = isAdminMode ? GA : G

  return (
    <div style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1fr',
      fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif", background:'#f0f4f8' }}>

      {/* ════ LEFT — Brand panel ════ */}
      <div style={{ background:gradient, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', padding:'52px 48px',
        position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-90, right:-90, width:260, height:260,
          background:'rgba(255,255,255,.06)', borderRadius:'50%', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-70, left:-70, width:200, height:200,
          background:'rgba(255,255,255,.04)', borderRadius:'50%', pointerEvents:'none' }}/>

        {/* Logo */}
        <div style={{ width:116, height:116, borderRadius:26,
          background:'rgba(255,255,255,.13)', border:'1.5px solid rgba(255,255,255,.22)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 8px 40px rgba(0,0,0,.28)', marginBottom:22,
          position:'relative', zIndex:1, flexShrink:0 }}>
          <img src={eLogixLogo} alt="eLogix"
            style={{ width:86, height:86, objectFit:'contain', borderRadius:18 }}
            onError={e=>{ e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="font-size:52px">🏢</span>' }}/>
        </div>

        <div style={{ fontSize:40, fontWeight:900, color:'#fff', letterSpacing:-.5,
          marginBottom:4, position:'relative', zIndex:1 }}>eLogix</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', marginBottom:6,
          letterSpacing:.4, position:'relative', zIndex:1, textAlign:'center' }}>
          {isAdminMode ? 'SuperAdmin Control Panel' : 'AI-Powered HR Management System'}
        </div>
        <div style={{ fontSize:9, color:'rgba(255,255,255,.38)', marginBottom:44,
          position:'relative', zIndex:1 }}>
          eLogix Technologies · www.elogix.com.np · Datahub Nepal
        </div>

        <div style={{ width:'100%', maxWidth:310, position:'relative', zIndex:1 }}>
          {(isAdminMode ? [
            ['🏢','Manage all client companies & tenants'],
            ['📊','MRR · ARR · Billing dashboard'],
            ['⚡','Instant tenant provisioning'],
            ['📢','Broadcast system notifications'],
            ['🎫','Support ticket management'],
            ['🔐','Full immutable audit trail'],
          ] : [
            ['🤖','AI-Powered HR intelligence & insights'],
            ['🛡️','Zero-trust multi-tenant data security'],
            ['📊','130+ modules · Real-time analytics'],
            ['⚖️','Nepal Labour Act 2074 compliant'],
            ['💰','SSF · PF · CIT · TDS auto-calculated'],
            ['🌐','Multi-department role hierarchy'],
          ]).map(([ic, tx], i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:13,
              color:'rgba(255,255,255,.88)', fontSize:11.5, marginBottom:12 }}>
              <span style={{ fontSize:17, width:22, textAlign:'center', flexShrink:0 }}>{ic}</span>{tx}
            </div>
          ))}
        </div>
      </div>

      {/* ════ RIGHT — Form panel ════ */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
        padding:'44px 56px', overflowY:'auto', background:'#f8fafc' }}>
        <div style={{ width:'100%', maxWidth:400 }}>

          {/* Logo + heading */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ width:70, height:70, borderRadius:18, background:'#fff',
              boxShadow:'0 4px 24px rgba(0,0,0,.10)', display:'inline-flex',
              alignItems:'center', justifyContent:'center', marginBottom:16, padding:8 }}>
              <img src={eLogixLogo} alt="eLogix" style={{ width:54, height:54, objectFit:'contain' }}
                onError={e=>{ e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="font-size:36px">🏢</span>' }}/>
            </div>
            <div style={{ fontSize:24, fontWeight:900, color:'#0f172a', marginBottom:5, letterSpacing:-.3 }}>
              {isAdminMode ? 'eLogix Admin' : 'eLogix HRMS'}
            </div>
            <div style={{ fontSize:12, color:'#64748b', lineHeight:1.5 }}>
              {isAdminMode
                ? 'Internal access — eLogix Technologies staff only'
                : 'Sign in with your Login ID and password'}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
              padding:'10px 14px', marginBottom:20, fontSize:11.5, color:'#dc2626',
              display:'flex', alignItems:'flex-start', gap:8, lineHeight:1.5 }}>
              <span style={{ flexShrink:0 }}>⚠️</span>{error}
            </div>
          )}

          {/* ── SINGLE FORM — handles both tenant + admin ── */}
          {/* autocomplete="on" tells browser this is a login form — fills username+password correctly */}
          <form onSubmit={handleLogin} autoComplete="on" noValidate>

            <InputField
              label="Login ID"
              fieldKey="loginId"
              name="username"
              type="text"
              placeholder="Email · ELX-XXXX-0000 · Phone"
              icon="👤"
              autoComplete="username"
              inputRef={loginIdRef}
              hint={loginHint}
              {...fInp('loginId')}
            />

            <InputField
              label="Password"
              fieldKey="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              icon="🔒"
              autoComplete="current-password"
              inputRef={passwordRef}
              showToggle
              showState={showPw}
              onToggle={() => setShowPw(x => !x)}
              {...fInp('password')}
            />

            {/* Admin key — only shown when admin email detected */}
            {isAdminMode && (
              <InputField
                label="Admin Key (optional)"
                fieldKey="adminKey"
                name="adminKey"
                type="password"
                placeholder="eLogix admin security key"
                icon="🗝️"
                autoComplete="off"
                showToggle
                showState={showKey}
                onToggle={() => setShowKey(x => !x)}
                {...fInp('adminKey')}
              />
            )}

            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:24 }}>
              <label style={{ display:'flex', alignItems:'center', gap:7,
                fontSize:12, cursor:'pointer', color:'#374151', userSelect:'none' }}>
                <input type="checkbox" checked={form.remember}
                  onChange={e => setForm(p => ({ ...p, remember: e.target.checked }))}
                  style={{ cursor:'pointer', width:14, height:14 }}/>
                Keep me signed in
              </label>
              <a href="/forgot-password"
                style={{ fontSize:11.5, color:A, fontWeight:700, textDecoration:'none' }}>
                Forgot password?
              </a>
            </div>

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'14px', borderRadius:11, border:'none',
              background: loading ? '#94a3b8' : gradient,
              color:'#fff', fontSize:14, fontWeight:800,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(3,105,161,.32)',
              transition:'all .15s', letterSpacing:.1 }}>
              {loading ? '⏳ Signing in…' : 'Sign In →'}
            </button>

            {isAdminMode && (
              <button type="button"
                onClick={() => { setIsAdminMode(false); setError(''); setForm(p=>({...p,loginId:'',password:''})) }}
                style={{ width:'100%', marginTop:10, padding:'11px', borderRadius:11,
                  border:'1px solid #e2e8f0', background:'#fff', color:'#64748b',
                  fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                ← Back to Staff Login
              </button>
            )}

            {!isAdminMode && (
              <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#64748b' }}>
                New to eLogix?{' '}
                <a href="/register" style={{ color:A, fontWeight:700, textDecoration:'none' }}>
                  Start free 14-day trial
                </a>
              </div>
            )}
          </form>

          {/* ── Login ID format guide ── */}
          {!isAdminMode && (
            <div style={{ marginTop:22, padding:'14px 16px', background:'#f0f9ff',
              border:'1px solid #bae6fd', borderRadius:12, fontSize:10.5, color:'#0c4a6e' }}>
              <div style={{ fontWeight:800, marginBottom:10, fontSize:11 }}>
                💡 Login ID — 3 formats accepted:
              </div>
              {[
                ['✉️','Work Email',     'ran.thapa@himalayan.com', 'Most common. Your company email.'],
                ['🆔','eLogix User ID','ELX-HIMA-0042',           'Assigned by eLogix. Globally unique.'],
                ['📱','Nepal Mobile',  '9841234567',               '10-digit mobile. Set by your HR team.'],
              ].map(([ic, label, ex, desc]) => (
                <div key={label} style={{ display:'flex', gap:10, marginBottom:9, alignItems:'flex-start' }}>
                  <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{ic}</span>
                  <div>
                    <div style={{ fontWeight:700, color:'#0369a1' }}>{label}</div>
                    <code style={{ background:'#e0f2fe', padding:'1px 6px', borderRadius:4,
                      fontSize:10, color:'#0c4a6e', fontFamily:'monospace' }}>{ex}</code>
                    <div style={{ color:'#64748b', marginTop:2, fontSize:10 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Dev demo credentials ── */}
          <details style={{ marginTop:16 }}>
            <summary style={{ fontSize:10, color:'#94a3b8', cursor:'pointer',
              userSelect:'none', listStyle:'none', display:'flex',
              alignItems:'center', gap:5, padding:'6px 0' }}>
              <span>🧪</span>
              <span style={{ textDecoration:'underline dotted' }}>Dev demo credentials</span>
            </summary>
            <div style={{ marginTop:10, padding:'14px', background:'#fefce8',
              border:'1px solid #fde68a', borderRadius:10, fontSize:10 }}>

              <div style={{ fontWeight:800, color:'#4c1d95', marginBottom:8, fontSize:10.5 }}>
                🔐 eLogix SuperAdmin
              </div>
              <div style={{ background:'#f5f3ff', border:'1px solid #ddd6fe',
                borderRadius:8, padding:'8px 12px', marginBottom:14 }}>
                {[['Login ID','admin@elogix.com.np'],['Password','eLogix@Admin#2083']].map(([lb,v])=>(
                  <div key={lb} style={{ display:'flex', gap:8, marginBottom:4, fontSize:10 }}>
                    <span style={{ color:'#64748b', minWidth:64 }}>{lb}:</span>
                    <code style={{ background:'#ede9fe', padding:'1px 6px', borderRadius:4,
                      color:'#4c1d95', fontFamily:'monospace', fontSize:10 }}>{v}</code>
                  </div>
                ))}
                <button type="button"
                  onClick={() => fillCreds('admin@elogix.com.np','eLogix@Admin#2083')}
                  style={{ marginTop:6, padding:'4px 10px', borderRadius:6, border:'1px solid #ddd6fe',
                    background:'#f5f3ff', fontSize:9, cursor:'pointer', color:'#4c1d95', fontFamily:'inherit' }}>
                  ← Fill credentials
                </button>
              </div>

              <div style={{ fontWeight:800, color:'#0c4a6e', marginBottom:8, fontSize:10.5 }}>
                🏢 Demo Company Tenant Users
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {[
                  ['Super Admin',     'admin@demo.com',   'ELX-DEMO-0001', 'Admin@2083'],
                  ['HR Manager',      'hr@demo.com',      'ELX-DEMO-0002', 'HR@2083'],
                  ['Payroll Officer', 'payroll@demo.com', 'ELX-DEMO-0003', 'Pay@2083'],
                  ['Employee',        'employee@demo.com','ELX-DEMO-0005', 'Emp@2083'],
                ].map(([role, email, uid, pw]) => (
                  <div key={email} style={{ background:'#fffbeb', border:'1px solid #fde68a',
                    borderRadius:8, padding:'8px 10px',
                    display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:700, color:'#92400e', fontSize:10 }}>{role}</div>
                      <code style={{ fontSize:9, color:'#713f12' }}>{email}</code>
                      <span style={{ color:'#d97706', fontSize:9 }}> · {uid}</span>
                      <div style={{ fontSize:9, color:'#92400e', marginTop:1 }}>pw: <b>{pw}</b></div>
                    </div>
                    <button type="button"
                      onClick={() => fillCreds(email, pw)}
                      style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #fde68a',
                        background:'#fff7ed', fontSize:9, cursor:'pointer',
                        color:'#92400e', fontFamily:'inherit', fontWeight:700, whiteSpace:'nowrap' }}>
                      Fill →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* Footer */}
          <div style={{ textAlign:'center', marginTop:28, paddingTop:18,
            borderTop:'1px solid #e2e8f0', fontSize:10, color:'#94a3b8', lineHeight:2 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, marginBottom:2 }}>
              <img src={eLogixLogo} alt="" style={{ width:14, height:14, objectFit:'contain', opacity:.4 }}
                onError={e => e.target.style.display='none'}/>
              <span style={{ fontWeight:600 }}>eLogix Technologies · www.elogix.com.np</span>
            </div>
            <div style={{ fontSize:9 }}>
              support@elogix.com.np · National ICT Award 2024 · Datahub Nepal
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

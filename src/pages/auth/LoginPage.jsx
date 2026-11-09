// FILE: src/pages/auth/LoginPage.jsx
// eLogix HRMS — World-Class Login Page
// ─────────────────────────────────────────────────────────────────────────
// FEATURES:
//   ✅ Two-panel layout (brand left + form right)
//   ✅ Auto-detect login type: email / ELX-UID / phone → auto admin mode
//   ✅ Slug field with autocomplete (tenant login)
//   ✅ Remember me checkbox
//   ✅ Show/hide password toggle
//   ✅ Login ID format guide panel
//   ✅ Approval flow info panel on left
//   ✅ Forgot password modal (sends request to SuperAdmin)
//   ✅ Admin key field (eLogix staff)
//   ✅ FIXED API paths: POST /api/v1/auth/login, POST /api/elogix-admin/v1/login
//   ✅ FIXED slug autocomplete: GET /api/v1/auth/slugs
//   ✅ Zero missing imports — fully self-contained
//   ✅ REMOVED: DEV_ADMINS hardcoded credential fallback (security fix)
//       → Network errors now show a proper "server not reachable" message
//       → Never bypass authentication even when backend is down
//
// eLogix Technologies · www.elogix.com.np
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'

const G  = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%)'
const GA = 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4338ca 100%)'
const A  = '#0369a1'

const baseInp = {
  width:'100%', padding:'12px 14px 12px 44px', borderRadius:10,
  border:'1.5px solid #e2e8f0', fontSize:13, outline:'none',
  boxSizing:'border-box', fontFamily:'inherit', background:'#fff',
  color:'#0f172a', transition:'border-color .15s, box-shadow .15s',
}

function _getSession() {
  try {
    const s = JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    )
    if (s?.user || s?.admin) return s
  } catch (_) {}
  return null
}

function _getLandingRoute(role) {
  const map = {
    elogix_superadmin: 'elogix-admin',
    elogix_admin     : 'elogix-admin',
    elogix_staff     : 'elogix-admin',
    elogix_sales     : 'elogix-admin',
    elogix_support   : 'elogix-admin',
    elogix_billing   : 'elogix-admin',
    super_admin      : 'company-dashboard',
    company_admin    : 'company-dashboard',
    executive        : 'executive-dashboard',
    hr_manager       : 'hr-manager-dashboard',
    hr_officer       : 'hr-manager-dashboard',
    payroll_officer  : 'payroll-dashboard',
    payroll_manager  : 'payroll-dashboard',
    hod              : 'department-dashboard',
    department_head  : 'department-dashboard',
    branch_manager   : 'employee-dashboard',
    finance_officer  : 'finance-dashboard',
    recruiter        : 'recruitment-dashboard',
    team_lead        : 'employee-dashboard',
    supervisor       : 'employee-dashboard',
    manager          : 'employee-dashboard',
    employee         : 'employee-dashboard',
  }
  return map[role] || 'company-dashboard'
}

function detectLoginType(id) {
  if (!id) return 'unknown'
  if (id.endsWith('@elogix.com.np') || id.endsWith('@elogix.com')) return 'elogix_admin'
  if (id.includes('@'))               return 'email'
  if (/^ELX-[A-Z]+-\d+$/i.test(id)) return 'elx_uid'
  if (/^98[0-9]{8}$/.test(id))       return 'phone'
  return 'unknown'
}

// Defined OUTSIDE component to prevent focus-loss re-render on keystroke
function InputField({
  label, fieldKey, type, placeholder, icon,
  value, onChange, onFocus, onBlur,
  showToggle, showState, onToggle,
  hint, autoComplete, name, inputRef, list,
}) {
  return (
    <div style={{ marginBottom:18 }}>
      <label htmlFor={`elogix-${fieldKey}`}
        style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6, letterSpacing:'.03em' }}>
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <span style={{
          position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
          fontSize:16, pointerEvents:'none', opacity:.5, lineHeight:1,
        }}>{icon}</span>
        <input
          id={`elogix-${fieldKey}`} ref={inputRef} list={list}
          type={showToggle ? (showState ? 'text' : 'password') : (type || 'text')}
          name={name} value={value} onChange={onChange}
          placeholder={placeholder} autoComplete={autoComplete}
          style={{ ...baseInp }}
          onFocus={onFocus} onBlur={onBlur}
        />
        {showToggle && (
          <button type="button" onClick={onToggle} tabIndex={-1} style={{
            position:'absolute', right:13, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', cursor:'pointer',
            fontSize:18, opacity:.45, padding:2, lineHeight:1,
          }}>
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

// ══════════════════════════════════════════════════════════════════════════
export default function LoginPage({ onLoginSuccess, onRegister }) {

  const [isAdminMode, setIsAdminMode] = useState(false)
  const [form,        setForm]        = useState({
    slug:'', loginId:'', password:'', adminKey:'', remember:false,
  })
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [showKey,   setShowKey]   = useState(false)
  const [loginHint, setLoginHint] = useState('')
  const [slugSugs,  setSlugSugs]  = useState([])

  const [forgotMode,  setForgotMode]  = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent,  setForgotSent]  = useState(false)
  const [forgotErr,   setForgotErr]   = useState('')
  const [forgotLoad,  setForgotLoad]  = useState(false)

  const loginIdRef  = useRef(null)
  const passwordRef = useRef(null)

  // Auto-redirect if already logged in
  useEffect(() => {
    const sess = _getSession()
    if (sess?.user?.role) {
      const route = _getLandingRoute(sess.user.role)
      if (onLoginSuccess) onLoginSuccess({ goto: route })
      else window.location.hash = `#${route}`
    }
    if (sess?.admin?.role) {
      if (onLoginSuccess) onLoginSuccess({ goto: 'elogix-admin' })
      else window.location.hash = '#elogix-admin'
    }
    setTimeout(() => loginIdRef.current?.focus(), 80)
  }, [])

  useEffect(() => {
    setTimeout(() => loginIdRef.current?.focus(), 80)
  }, [isAdminMode])

  // Load slug autocomplete — GET /api/v1/auth/slugs
  useEffect(() => {
    if (isAdminMode) return
    fetch('/api/v1/auth/slugs')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.slugs?.length) setSlugSugs(d.slugs) })
      .catch(() => {})
  }, [isAdminMode])

  const sf = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (k === 'loginId') {
      setError('')
      const type  = detectLoginType(v.trim())
      const hints = {
        email       : '✉️  Work email detected',
        elx_uid     : '🆔  eLogix User ID detected',
        phone       : '📱  Phone number detected',
        elogix_admin: '🔐  eLogix admin email — switching to admin mode',
        unknown     : '',
      }
      setLoginHint(v.trim().length > 3 ? (hints[type] || '') : '')
      if (type === 'elogix_admin') setIsAdminMode(true)
    }
  }

  const fInp = fieldKey => ({
    value   : form[fieldKey],
    onChange: e => sf(fieldKey, e.target.value),
    onFocus : e => {
      e.target.style.borderColor = isAdminMode ? '#7c3aed' : A
      e.target.style.boxShadow   = `0 0 0 3px ${isAdminMode ? '#7c3aed22' : A + '22'}`
    },
    onBlur  : e => {
      e.target.style.borderColor = '#e2e8f0'
      e.target.style.boxShadow   = 'none'
    },
  })

  // ── Login submit ────────────────────────────────────────────────────────
  const handleLogin = async e => {
    e.preventDefault()
    const id = form.loginId.trim()

    if (!id)            { setError('Please enter your Login ID');           loginIdRef.current?.focus();  return }
    if (!form.password) { setError('Please enter your password');           passwordRef.current?.focus(); return }
    if (!isAdminMode && !form.slug.trim()) {
      setError('Please enter your company workspace slug'); return
    }

    setLoading(true); setError('')

    try {
      if (isAdminMode) {
        // ── eLogix staff login ──────────────────────────────────────────
        // POST /api/elogix-admin/v1/login
        // Requires X-eLogix-Admin-Key header (from env ELOGIX_ADMIN_KEY)
        const adminKey = form.adminKey.trim() ||
                         (typeof window !== 'undefined' ? window.localStorage.getItem('elogix_admin_key') : null) ||
                         ''

        // Network errors are NOT silently swallowed — if the server is down
        // the user must fix the server, not log in with a hardcoded backdoor.
        const res  = await fetch('/api/elogix-admin/v1/login', {
          method : 'POST',
          headers: {
            'Content-Type'      : 'application/json',
            'X-eLogix-Admin-Key': adminKey,
          },
          body: JSON.stringify({ email: id.toLowerCase(), password: form.password }),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok || !data.success) {
          setError(data.error || data.message || 'Invalid credentials — check email, password and admin key')
          setLoading(false)
          return
        }

        const adminToken = data.token || data.access_token
        if (adminToken) {
          try { window.localStorage.setItem('elogix_admin_token', adminToken) } catch (_) {}
          try { window.localStorage.setItem('access_token', adminToken)       } catch (_) {}
        }

        const sess = {
          token   : adminToken,
          admin   : { ...(data.user || {}), role: data.user?.role || 'elogix_superadmin' },
          user    : { ...(data.user || {}), role: data.user?.role || 'elogix_superadmin' },
          company : { name: 'eLogix Technologies', slug: 'elogix' },
          is_admin: true,
        }
        try { sessionStorage.setItem('elogix_session', JSON.stringify(sess)) } catch (_) {}
        if (onLoginSuccess) onLoginSuccess({ goto: 'elogix-admin', admin: data.user })
        else window.location.hash = '#elogix-admin'

      } else {
        // ── Tenant company login ────────────────────────────────────────
        // POST /api/v1/auth/login
        const tenantSlug = form.slug.trim().toLowerCase()
        const res  = await fetch('/api/v1/auth/login', {
          method : 'POST',
          headers: {
            'Content-Type' : 'application/json',
            'X-Tenant-Id'  : tenantSlug,
            'X-Tenant-Slug': tenantSlug,
          },
          body: JSON.stringify({
            email       : id.includes('@') ? id.toLowerCase() : undefined,
            identifier  : id,
            password    : form.password,
            company_slug: tenantSlug,
            slug        : tenantSlug,
          }),
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok || data.error) {
          setError(data.error || data.message || 'Invalid credentials — check your email and password')
          setLoading(false)
          return
        }

        const sess = {
          token  : data.token || data.access_token,
          user   : data.user,
          company: data.company || { slug: tenantSlug },
          landing: _getLandingRoute(data.user?.role),
        }
        try {
          if (form.remember) {
            window.localStorage.setItem('elogix_session', JSON.stringify(sess))
          } else {
            sessionStorage.setItem('elogix_session', JSON.stringify(sess))
          }
          window.localStorage.setItem('access_token', sess.token || '')
        } catch (_) {}

        const route = _getLandingRoute(data.user?.role)
        if (onLoginSuccess) onLoginSuccess({ ...data, goto: route })
        else window.location.hash = `#${route}`
      }
    } catch (netErr) {
      // Network-level error (fetch failed — server down or network offline)
      // No hardcoded credential fallback — authentication MUST go through the server.
      setError(
        `Cannot reach the server — make sure the backend is running. ` +
        `(${netErr.message || 'Network error'})`
      )
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot password ─────────────────────────────────────────────────────
  const handleForgot = async () => {
    if (!forgotEmail.trim()) { setForgotErr('Please enter your email'); return }
    setForgotLoad(true); setForgotErr('')
    try {
      await fetch('/api/v1/auth/forgot-password', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email: forgotEmail.trim() }),
      })
      setForgotSent(true)
    } catch (_) {
      setForgotErr('Could not send reset request — please email support@elogix.com.np directly.')
    } finally {
      setForgotLoad(false)
    }
  }

  const gradient = isAdminMode ? GA : G

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'row',
      fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif",
      background:'#f0f4f8', overflowY:'auto', overflowX:'hidden',
      WebkitOverflowScrolling:'touch', flexWrap:'wrap',
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        .elogix-form-wrap { animation: fadeUp .35s ease both; }
        .elogix-brand { flex: 0 0 46% !important; min-height:100vh !important; }
        .elogix-right { flex: 1 1 54% !important; min-width:320px !important; overflow-y:auto !important; }
        @media (max-width:720px) {
          .elogix-brand { display:none !important; }
          .elogix-right { flex:1 1 100% !important; min-height:100vh; padding:24px 16px !important; }
        }
        ::-webkit-scrollbar        { width:5px; }
        ::-webkit-scrollbar-track  { background:#dbeafe; }
        ::-webkit-scrollbar-thumb  { background:#0369a1; border-radius:4px; }
        .elogix-btn-main:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 8px 24px rgba(3,105,161,.38) !important; }
        .elogix-btn-main { transition:all .15s !important; }
        .elogix-link:hover { text-decoration:underline; }
      `}</style>

      {/* ══════════ LEFT — Brand panel ══════════ */}
      <div className="elogix-brand" style={{
        background: gradient, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'52px 44px', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-90,  right:-90, width:260, height:260, background:'rgba(255,255,255,.06)', borderRadius:'50%', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-70, left:-70, width:200, height:200, background:'rgba(255,255,255,.04)', borderRadius:'50%', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'40%', right:-40, width:120, height:120, background:'rgba(255,255,255,.03)', borderRadius:'50%', pointerEvents:'none' }}/>

        <div style={{
          width:110, height:110, borderRadius:24,
          background:'rgba(255,255,255,.13)', border:'1.5px solid rgba(255,255,255,.24)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 8px 40px rgba(0,0,0,.28)', marginBottom:20,
          position:'relative', zIndex:1, fontSize:54,
        }}>⚡</div>

        <div style={{ fontSize:38, fontWeight:900, color:'#fff', letterSpacing:-.5, marginBottom:2, position:'relative', zIndex:1 }}>eLogix</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.75)', marginBottom:4, letterSpacing:.3, position:'relative', zIndex:1 }}>
          {isAdminMode ? 'SuperAdmin Control Panel' : 'AI-Powered HR Management System'}
        </div>
        <div style={{ fontSize:9.5, color:'rgba(255,255,255,.4)', marginBottom:42, position:'relative', zIndex:1 }}>
          eLogix Technologies · www.elogix.com.np
        </div>

        <div style={{ width:'100%', maxWidth:300, position:'relative', zIndex:1 }}>
          {(isAdminMode ? [
            ['🏢','Manage all client companies & tenants'],
            ['📊','MRR · ARR · Billing dashboard'],
            ['⚡','Instant tenant provisioning & approval'],
            ['📢','Broadcast system notifications'],
            ['🎫','Support ticket management'],
            ['🔐','Full immutable audit trail'],
          ] : [
            ['🤖','AI-powered HR intelligence & automation'],
            ['🛡️','Zero-trust multi-tenant data security'],
            ['📊','130+ modules · Real-time analytics'],
            ['⚖️','Nepal Labour Act 2074 compliant'],
            ['💰','SSF · PF · CIT · TDS auto-calculated'],
            ['🌐','Multi-department role-based access'],
          ]).map(([ic, tx], i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12,
              color:'rgba(255,255,255,.88)', fontSize:11.5, marginBottom:11,
            }}>
              <span style={{ fontSize:17, width:22, textAlign:'center', flexShrink:0 }}>{ic}</span>
              {tx}
            </div>
          ))}
        </div>

        {!isAdminMode && (
          <div style={{
            marginTop:30, width:'100%', maxWidth:300, position:'relative', zIndex:1,
            background:'rgba(255,255,255,.1)', borderRadius:12, padding:'14px 16px',
            border:'1px solid rgba(255,255,255,.18)',
          }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#fff', marginBottom:8 }}>ℹ️ How to get access</div>
            {[
              ['1️⃣','Register your company below'],
              ['2️⃣','SuperAdmin reviews & approves'],
              ['3️⃣','Credentials sent via email / WhatsApp / Viber'],
              ['4️⃣','Log in here with your credentials'],
            ].map(([n, t]) => (
              <div key={n} style={{ display:'flex', gap:8, fontSize:9.5, color:'rgba(255,255,255,.8)', marginBottom:5, alignItems:'flex-start' }}>
                <span style={{ flexShrink:0 }}>{n}</span><span>{t}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════ RIGHT — Form panel ══════════ */}
      <div className="elogix-right" style={{
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        padding:'36px 24px', background:'#f8fafc',
      }}>
        <div className="elogix-form-wrap" style={{ width:'100%', maxWidth:430, paddingBottom:40 }}>

          <div style={{ textAlign:'center', marginBottom:30 }}>
            <div style={{
              width:68, height:68, borderRadius:18, background:'#fff',
              boxShadow:'0 4px 24px rgba(0,0,0,.10)', display:'inline-flex',
              alignItems:'center', justifyContent:'center', marginBottom:14, fontSize:34,
            }}>⚡</div>
            <div style={{ fontSize:23, fontWeight:900, color:'#0f172a', marginBottom:4, letterSpacing:-.3 }}>
              {isAdminMode ? 'eLogix Admin Login' : 'Sign in to eLogix HRMS'}
            </div>
            <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6 }}>
              {isAdminMode
                ? 'Internal access — eLogix Technologies staff only'
                : 'Enter your Login ID and password provided by eLogix SuperAdmin'}
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
              padding:'10px 14px', marginBottom:20, fontSize:11.5, color:'#dc2626',
              display:'flex', alignItems:'flex-start', gap:8, lineHeight:1.5,
            }}>
              <span style={{ flexShrink:0 }}>⚠️</span>{error}
            </div>
          )}

          <form onSubmit={handleLogin} autoComplete="on" noValidate>

            {/* Company slug — tenant only */}
            {!isAdminMode && (
              <div style={{ marginBottom:18 }}>
                <label htmlFor="elogix-slug" style={{
                  fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6, letterSpacing:'.03em',
                }}>
                  Company Workspace
                </label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, opacity:.5 }}>🏢</span>
                  <input
                    id="elogix-slug"
                    value={form.slug}
                    onChange={e => { setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'') })); setError('') }}
                    placeholder="your-company-slug"
                    list="slug-suggestions"
                    autoComplete="organization"
                    style={{ ...baseInp }}
                    onFocus={e => { e.target.style.borderColor = A; e.target.style.boxShadow = `0 0 0 3px ${A}22` }}
                    onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                  />
                  {slugSugs.length > 0 && (
                    <datalist id="slug-suggestions">
                      {slugSugs.map(s => <option key={s} value={s}/>)}
                    </datalist>
                  )}
                </div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                  Provided by eLogix SuperAdmin · letters, numbers, hyphens only (e.g. <strong>himalayan-bank</strong>)
                </div>
              </div>
            )}

            {/* Login ID */}
            <InputField
              label="Login ID" fieldKey="loginId" name="username" type="text"
              placeholder="Email · ELX-COMP-0000 · 98XXXXXXXX"
              icon="👤" autoComplete="username" inputRef={loginIdRef} hint={loginHint}
              {...fInp('loginId')}
            />

            {/* Password */}
            <InputField
              label="Password" fieldKey="password" name="password" type="password"
              placeholder="Enter your password"
              icon="🔒" autoComplete="current-password" inputRef={passwordRef}
              showToggle showState={showPw} onToggle={() => setShowPw(x => !x)}
              {...fInp('password')}
            />

            {/* Admin key — admin mode only */}
            {isAdminMode && (
              <InputField
                label="Admin Key (optional)" fieldKey="adminKey" name="adminKey" type="password"
                placeholder="eLogix admin security key"
                icon="🗝️" autoComplete="off"
                showToggle showState={showKey} onToggle={() => setShowKey(x => !x)}
                {...fInp('adminKey')}
              />
            )}

            {/* Remember me + Forgot password */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <label style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, cursor:'pointer', color:'#374151', userSelect:'none' }}>
                <input type="checkbox" checked={form.remember}
                  onChange={e => setForm(p => ({ ...p, remember: e.target.checked }))}
                  style={{ cursor:'pointer', width:14, height:14, accentColor: A }}/>
                Keep me signed in
              </label>
              <span className="elogix-link"
                onClick={() => setForgotMode(true)}
                style={{ fontSize:11.5, color:A, fontWeight:700, cursor:'pointer' }}>
                Forgot password?
              </span>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="elogix-btn-main" style={{
              width:'100%', padding:'14px', borderRadius:11, border:'none',
              background: loading ? '#94a3b8' : gradient,
              color:'#fff', fontSize:14, fontWeight:800,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(3,105,161,.32)',
              letterSpacing:.1,
            }}>
              {loading ? '⏳ Signing in…' : isAdminMode ? '🔐 Sign In as Admin' : '🚀 Sign In →'}
            </button>

            {/* Back to tenant mode */}
            {isAdminMode && (
              <button type="button"
                onClick={() => { setIsAdminMode(false); setError(''); setForm(p => ({ ...p, loginId:'', password:'', adminKey:'' })) }}
                style={{
                  width:'100%', marginTop:10, padding:'11px', borderRadius:11,
                  border:'1px solid #e2e8f0', background:'#fff', color:'#64748b',
                  fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600,
                }}>
                ← Back to Company Login
              </button>
            )}

            {/* Register link */}
            {!isAdminMode && (
              <div style={{ textAlign:'center', marginTop:18, fontSize:12, color:'#64748b' }}>
                New to eLogix?{' '}
                <span className="elogix-link"
                  onClick={() => onRegister ? onRegister() : (window.location.pathname = '/register')}
                  style={{ color:A, fontWeight:700, cursor:'pointer' }}>
                  Register your company →
                </span>
              </div>
            )}
          </form>

          {/* Login ID format guide */}
          {!isAdminMode && (
            <div style={{
              marginTop:24, padding:'14px 16px', background:'#f0f9ff',
              border:'1px solid #bae6fd', borderRadius:12, fontSize:10.5, color:'#0c4a6e',
            }}>
              <div style={{ fontWeight:800, marginBottom:10, fontSize:11 }}>💡 Login ID — 3 formats accepted:</div>
              {[
                ['✉️','Work Email',    'ram.thapa@himalayan.com', 'Most common. Your company email.'],
                ['🆔','eLogix User ID','ELX-HIMA-0042',           'Assigned by eLogix. Globally unique.'],
                ['📱','Nepal Mobile',  '9841234567',               '10-digit mobile. Set by your HR team.'],
              ].map(([ic, label, ex, desc]) => (
                <div key={label} style={{ display:'flex', gap:10, marginBottom:9, alignItems:'flex-start' }}>
                  <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{ic}</span>
                  <div>
                    <div style={{ fontWeight:700, color:'#0369a1' }}>{label}</div>
                    <code style={{ background:'#e0f2fe', padding:'1px 6px', borderRadius:4, fontSize:10, color:'#0c4a6e', fontFamily:'monospace' }}>{ex}</code>
                    <div style={{ color:'#64748b', marginTop:2, fontSize:10 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign:'center', marginTop:20, fontSize:10, color:'#cbd5e1' }}>
            eLogix Technologies · www.elogix.com.np<br/>
            Need help? <a href="mailto:support@elogix.com.np" style={{ color:A }}>support@elogix.com.np</a>
          </div>
        </div>
      </div>

      {/* ══════════ Forgot Password Modal ══════════ */}
      {forgotMode && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:400,
            boxShadow:'0 20px 60px rgba(0,0,0,.25)', overflow:'hidden' }}>
            <div style={{ background:gradient, padding:'18px 22px',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:15, fontWeight:900, color:'#fff' }}>🔑 Forgot Password</div>
              <button onClick={() => { setForgotMode(false); setForgotSent(false); setForgotErr('') }}
                style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff',
                  width:28, height:28, borderRadius:7, cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
            <div style={{ padding:'20px 24px' }}>
              {forgotSent ? (
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>📧</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#374151', marginBottom:8 }}>Request Sent!</div>
                  <div style={{ fontSize:11, color:'#64748b', lineHeight:1.6 }}>
                    If <b>{forgotEmail}</b> is registered, the eLogix SuperAdmin will
                    contact you with reset instructions within 1 business day.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:16, lineHeight:1.6 }}>
                    Enter your registered email address. The eLogix SuperAdmin will manually
                    reset your password and notify you via email, WhatsApp or Viber.
                  </div>
                  <input type="email" value={forgotEmail}
                    onChange={e => { setForgotEmail(e.target.value); setForgotErr('') }}
                    placeholder="your.email@company.com"
                    style={{ ...baseInp, paddingLeft:14, marginBottom:12 }}/>
                  {forgotErr && (
                    <div style={{ fontSize:11, color:'#dc2626', marginBottom:10 }}>⚠️ {forgotErr}</div>
                  )}
                  <button onClick={handleForgot} disabled={forgotLoad}
                    style={{ width:'100%', padding:11, borderRadius:9, border:'none',
                      background: forgotLoad ? '#94a3b8' : gradient,
                      color:'#fff', fontSize:12, fontWeight:800, cursor: forgotLoad ? 'not-allowed' : 'pointer' }}>
                    {forgotLoad ? '⏳ Sending…' : '📤 Send Reset Request'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

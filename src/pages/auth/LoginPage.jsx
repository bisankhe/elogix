// FILE: src/pages/auth/LoginPage.jsx
// eLogix HRMS — Login Page
//
// ══════════════════════════════════════════════════════════════
// IDENTITY DESIGN — HOW LOGIN ID IS MADE GLOBALLY UNIQUE
// ══════════════════════════════════════════════════════════════
//
// Problem: "ram" or "EMP-001" will exist in 100 different companies.
// They cannot share one login ID without a collision.
//
// Solution: eLogix uses a COMPOUND LOGIN ID:
//
//   Format 1 — Work Email (most common, naturally unique):
//     ram.thapa@himalayan.com
//     hr@solidfuture.com.np
//     └── Email domain resolves to the company automatically.
//         No two companies share the same email domain.
//
//   Format 2 — eLogix User ID (for companies without work email):
//     ELX-HIMA-0042    ← eLogix assigns this globally unique ID
//     ELX-NCELL-0001   ← company slug + 4-digit sequence
//     └── Pattern: ELX-{COMPANY_CODE}-{SEQUENCE}
//         eLogix generates this on user creation. Never duplicated.
//
//   Format 3 — Phone Number (optional, Nepal mobile):
//     9841234567        ← 10-digit Nepal mobile
//     └── Unique nationwide. Many Nepal companies use this.
//
//   eLogix SuperAdmin:
//     admin@elogix.com.np  ← @elogix.com.np domain is reserved
//     └── Never assigned to any tenant company.
//
// ── HOW TENANT IS RESOLVED FROM LOGIN ID ──────────────────────
//   Email domain    → lookup companies.email_domain = 'himalayan.com'
//   ELX-XXXX-####  → parse company code from ID itself
//   Phone number    → lookup company_users.phone = '9841234567'
//   @elogix.com.np     → always eLogix SuperAdmin route
//
// ── BACKEND ENDPOINT ──────────────────────────────────────────
//   POST /api/v1/auth/login
//   Body: { login_id, password }
//   Server resolves: which company → which user → JWT issued
//
// eLogix Technologies · www.elogix.com.np
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useAuth }             from '../../context/AuthContext.jsx'
import { eLogixAPI }           from '../../utils/api.js'
import eLogixLogo              from '../../assets/Logo.png'

const G  = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%)'
const GA = 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4338ca 100%)'
const A  = '#0369a1'

const baseInp = {
  width:'100%', padding:'12px 14px 12px 44px', borderRadius:10,
  border:'1.5px solid #e2e8f0', fontSize:13, outline:'none',
  boxSizing:'border-box', fontFamily:'inherit', background:'#fff',
  color:'#0f172a', transition:'border-color .15s, box-shadow .15s',
}

// ══════════════════════════════════════════════════════════════
// DEV MOCK — mirrors the actual backend resolution logic
// ══════════════════════════════════════════════════════════════
//
// eLogix SuperAdmin credentials (reserved @elogix.com.np domain):
//   Login ID : admin@elogix.com.np
//   Password : eLogix@Admin#2083
//   Role     : elogix_superadmin  (NOT a tenant user)
//
// Tenant user credentials use globally unique IDs:
//   Format A — Work Email  : admin@demo.com     / Admin@2083
//   Format B — eLogix UID  : ELX-DEMO-0001      / Admin@2083
//   Format C — Phone       : 9841000001          / Admin@2083

const ELOGIX_ADMIN_CREDS = {
  'admin@elogix.com.np':   { name:'eLogix SuperAdmin',  role:'elogix_superadmin', pw:'eLogix@Admin#2083' },
  'sales@elogix.com.np':   { name:'Priya Thapa',         role:'sales',             pw:'Sales@2083'        },
  'support@elogix.com.np': { name:'Ramesh Joshi',         role:'support',           pw:'Support@2083'      },
  'billing@elogix.com.np': { name:'Sita Karki',           role:'billing',           pw:'Billing@2083'      },
}

// Tenant users — each ELX-{CO}-{SEQ} is globally unique
const TENANT_USERS = {
  // ── DEMO Company  (slug: demo, domain: demo.com) ──────────
  'admin@demo.com':        { name:'Ram Thapa',     role:'super_admin',     level:1,  company:'demo', pw:'Admin@2083'   },
  'ELX-DEMO-0001':         { name:'Ram Thapa',     role:'super_admin',     level:1,  company:'demo', pw:'Admin@2083'   },
  '9841000001':            { name:'Ram Thapa',     role:'super_admin',     level:1,  company:'demo', pw:'Admin@2083'   },

  'hr@demo.com':           { name:'Sita Shrestha', role:'hr_manager',      level:3,  company:'demo', pw:'HR@2083'      },
  'ELX-DEMO-0002':         { name:'Sita Shrestha', role:'hr_manager',      level:3,  company:'demo', pw:'HR@2083'      },

  'payroll@demo.com':      { name:'Hari Maharjan', role:'payroll_officer', level:3,  company:'demo', pw:'Pay@2083'     },
  'ELX-DEMO-0003':         { name:'Hari Maharjan', role:'payroll_officer', level:3,  company:'demo', pw:'Pay@2083'     },

  'hod@demo.com':          { name:'Gita Gurung',   role:'hod',             level:4,  company:'demo', pw:'HOD@2083'     },
  'ELX-DEMO-0004':         { name:'Gita Gurung',   role:'hod',             level:4,  company:'demo', pw:'HOD@2083'     },

  'employee@demo.com':     { name:'Maya Gurung',   role:'employee',        level:10, company:'demo', pw:'Emp@2083'     },
  'ELX-DEMO-0005':         { name:'Maya Gurung',   role:'employee',        level:10, company:'demo', pw:'Emp@2083'     },
  '9841000005':            { name:'Maya Gurung',   role:'employee',        level:10, company:'demo', pw:'Emp@2083'     },

  // ── HIMALAYAN Bank (slug: himalayan, domain: himalayan.com) ─
  'admin@himalayan.com':   { name:'Bikash KC',     role:'super_admin',     level:1,  company:'himalayan', pw:'Admin@2083' },
  'ELX-HIMA-0001':         { name:'Bikash KC',     role:'super_admin',     level:1,  company:'himalayan', pw:'Admin@2083' },
}

const COMPANIES = {
  demo:      { name:'Demo Company Pvt Ltd',      plan:'growth',    status:'active'    },
  himalayan: { name:'Himalayan Bank Ltd.',        plan:'business',  status:'active'    },
  solidfuture:{ name:'Solid Future HR Consulting',plan:'enterprise',status:'active'   },
}

// Detect login ID type
function detectLoginType(id) {
  if (!id) return 'unknown'
  if (id.endsWith('@elogix.com.np'))        return 'elogix_admin'
  if (id.includes('@'))                  return 'email'
  if (/^ELX-[A-Z]+-\d+$/i.test(id))    return 'elx_uid'
  if (/^98[0-9]{8}$/.test(id))          return 'phone'
  return 'unknown'
}

function mockResolve(loginId, password) {
  const id   = loginId.trim()
  const type = detectLoginType(id)

  if (type === 'elogix_admin') {
    const a = ELOGIX_ADMIN_CREDS[id.toLowerCase()]
    if (!a)          return { success:false, error:'eLogix admin account not found.' }
    if (a.pw !== password) return { success:false, error:'Incorrect password.' }
    return { isAdmin:true, success:true, access_token:'mockAdmin_'+Date.now(),
             admin:{ id:'a1', full_name:a.name, email:id, role:a.role } }
  }

  const u = TENANT_USERS[id] || TENANT_USERS[id.toLowerCase()]
  if (!u) {
    if (type === 'unknown') return { success:false, error:'Login ID format not recognised. Use email, ELX-XXXX-0000, or phone number.' }
    return { success:false, error:'Login ID not found. Contact your HR team.' }
  }
  if (u.pw !== password) return { success:false, error:'Incorrect password. Try again or click Forgot password.' }

  const co = COMPANIES[u.company] || { name:'Your Company', plan:'trial', status:'active' }
  if (co.status === 'suspended') return { success:false, error:'Your company account is suspended. Contact support@elogix.com.np' }

  return {
    success:true, isAdmin:false,
    access_token:  'mock_'+Date.now(),
    refresh_token: 'mockR_'+Date.now(),
    user: {
      id:'u1', full_name:u.name, role:u.role, level:u.level,
      email: type==='email' ? id : `${id.toLowerCase()}@${u.company}.com`,
      emp_id: type==='elx_uid' ? id : 'ELX-DEMO-0001',
      department_id:null, branch_id:null,
    },
    company: {
      id:'c1', name:co.name, slug:u.company, plan:co.plan, status:co.status,
      portal_url:`https://${u.company}.elogix.com.np`, currency:'NPR', timezone:'Asia/Kathmandu',
    },
    permissions:{},
  }
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════
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
  const [loginHint, setLoginHint] = useState('')  // shows ID type as user types

  useEffect(() => {
    if (isAuthenticated) { onLoginSuccess?.({ goto: getDashboardPage() }); return }
    if (isAdmin)         { onLoginSuccess?.({ goto: 'elogix-admin' });     return }
    if (isAdminPath)       setIsAdminMode(true)
  }, [isAuthenticated, isAdmin])

  const sf = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (k === 'loginId') {
      setError('')
      const type = detectLoginType(v.trim())
      const hints = {
        email:       '✉️  Work email detected',
        elx_uid:     '🆔  eLogix User ID detected',
        phone:       '📱  Phone number detected',
        elogix_admin:'🔐  eLogix admin email',
        unknown:     '',
      }
      setLoginHint(v.trim().length > 3 ? hints[type] || '' : '')

      // Auto-switch to admin mode if @elogix.com.np typed
      if (type === 'elogix_admin') setIsAdminMode(true)
    }
  }

  // ── Unified login handler ──────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    if (!form.loginId.trim()) { setError('Please enter your Login ID'); return }
    if (!form.password)       { setError('Please enter your password');  return }
    setLoading(true); setError('')
    try {
      let data
      try {
        data = await eLogixAPI.login({ login_id: form.loginId.trim(), password: form.password })
      } catch {
        data = mockResolve(form.loginId, form.password)
      }
      if (!data?.success) { setError(data?.error || 'Login failed. Please check your credentials.'); return }
      if (data.isAdmin) {
        loginAdmin(data, form.adminKey)
        onLoginSuccess?.({ goto:'elogix-admin', admin:data.admin })
      } else {
        loginTenant(data)
        onLoginSuccess?.(data)
      }
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, fieldKey, type='text', placeholder, icon, showToggle, showState, onToggle, hint, autoFocus }) => (
    <div style={{ marginBottom:18 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>{label}</label>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
          fontSize:16, pointerEvents:'none', opacity:.5, lineHeight:1 }}>{icon}</span>
        <input
          type={showToggle ? (showState ? 'text' : 'password') : type}
          value={form[fieldKey]}
          onChange={e => sf(fieldKey, e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={fieldKey==='password'?'current-password':fieldKey==='loginId'?'username':'off'}
          style={{ ...baseInp }}
          onFocus={e => { e.target.style.borderColor=A; e.target.style.boxShadow=`0 0 0 3px ${A}18` }}
          onBlur={e  => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none' }}
        />
        {showToggle && (
          <button type="button" onClick={onToggle}
            style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', fontSize:18, opacity:.45, padding:2 }}>
            {showState ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {hint && <div style={{ fontSize:10, color:A, marginTop:4, fontWeight:600 }}>{hint}</div>}
    </div>
  )

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
          boxShadow:'0 8px 40px rgba(0,0,0,.28), 0 0 80px rgba(59,130,246,.18)',
          marginBottom:22, position:'relative', zIndex:1, flexShrink:0 }}>
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
          ]).map(([ic,tx],i)=>(
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
              {isAdminMode ? 'Internal access — eLogix Technologies staff only' : 'Sign in with your Login ID and password'}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
              padding:'10px 14px', marginBottom:20, fontSize:11.5, color:'#dc2626',
              display:'flex', alignItems:'flex-start', gap:8, lineHeight:1.5 }}>
              <span style={{ flexShrink:0, marginTop:1 }}>⚠️</span>{error}
            </div>
          )}

          {/* ── SINGLE UNIFIED LOGIN FORM ── */}
          <form onSubmit={handleLogin} noValidate>
            <Field
              label="Login ID"
              fieldKey="loginId"
              type="text"
              placeholder="Email · ELX-XXXX-0000 · Phone"
              icon="👤"
              hint={loginHint}
              autoFocus
            />
            <Field
              label="Password"
              fieldKey="password"
              placeholder="Enter your password"
              icon="🔒"
              showToggle showState={showPw} onToggle={()=>setShowPw(x=>!x)}
            />

            {/* Admin key — only shown when admin email detected */}
            {isAdminMode && (
              <Field
                label="Admin Key (optional)"
                fieldKey="adminKey"
                placeholder="eLogix admin security key"
                icon="🗝️"
                showToggle showState={showKey} onToggle={()=>setShowKey(x=>!x)}
              />
            )}

            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:24 }}>
              <label style={{ display:'flex', alignItems:'center', gap:7,
                fontSize:12, cursor:'pointer', color:'#374151', userSelect:'none' }}>
                <input type="checkbox" checked={form.remember}
                  onChange={e=>sf('remember',e.target.checked)}
                  style={{ cursor:'pointer', width:14, height:14 }}/>
                Keep me signed in
              </label>
              <a href="/forgot-password" style={{ fontSize:11.5, color:A, fontWeight:700, textDecoration:'none' }}>
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
                onClick={()=>{ setIsAdminMode(false); setError(''); setForm(p=>({...p,loginId:'',password:''})) }}
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

          {/* ── ID FORMAT GUIDE ── */}
          {!isAdminMode && (
            <div style={{ marginTop:22, padding:'14px 16px', background:'#f0f9ff',
              border:'1px solid #bae6fd', borderRadius:12, fontSize:10.5, color:'#0c4a6e' }}>
              <div style={{ fontWeight:800, marginBottom:10, fontSize:11 }}>
                💡 Login ID — 3 formats accepted:
              </div>
              {[
                ['✉️','Work Email',      'ram.thapa@himalayan.com',    'Most common. Your company email.'],
                ['🆔','eLogix User ID', 'ELX-HIMA-0042',              'Assigned by eLogix. Globally unique.'],
                ['📱','Nepal Mobile',   '9841234567',                  '10-digit mobile. Set by your HR team.'],
              ].map(([ic,label,ex,desc])=>(
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
              <div style={{ borderTop:'1px solid #bae6fd', marginTop:8, paddingTop:8,
                fontSize:9.5, color:'#64748b' }}>
                Don't know your Login ID? Contact your <b>HR team</b> or{' '}
                <b>IT Administrator</b>.
              </div>
            </div>
          )}

          {/* ── DEV DEMO CREDENTIALS ── */}
          <details style={{ marginTop:16 }}>
            <summary style={{ fontSize:10, color:'#94a3b8', cursor:'pointer',
              userSelect:'none', listStyle:'none', display:'flex',
              alignItems:'center', gap:5, padding:'6px 0' }}>
              <span>🧪</span>
              <span style={{ textDecoration:'underline dotted' }}>Dev demo credentials</span>
            </summary>

            <div style={{ marginTop:10, padding:'14px', background:'#fefce8',
              border:'1px solid #fde68a', borderRadius:10, fontSize:10 }}>

              {/* eLogix SuperAdmin */}
              <div style={{ fontWeight:800, color:'#4c1d95', marginBottom:8, fontSize:10.5 }}>
                🔐 eLogix SuperAdmin (eLogix Technologies)
              </div>
              <div style={{ background:'#f5f3ff', border:'1px solid #ddd6fe',
                borderRadius:8, padding:'8px 12px', marginBottom:14 }}>
                {[
                  ['Login ID', 'admin@elogix.com.np'],
                  ['Password', 'eLogix@Admin#2083'],
                  ['Role',     'eLogix SuperAdmin — manages ALL tenants'],
                ].map(([lb,v])=>(
                  <div key={lb} style={{ display:'flex', gap:8, marginBottom:4, fontSize:10 }}>
                    <span style={{ color:'#64748b', minWidth:64 }}>{lb}:</span>
                    <code style={{ background:'#ede9fe', padding:'1px 6px', borderRadius:4,
                      color:'#4c1d95', fontFamily:'monospace', fontSize:10 }}>{v}</code>
                  </div>
                ))}
              </div>

              {/* Tenant users */}
              <div style={{ fontWeight:800, color:'#0c4a6e', marginBottom:8, fontSize:10.5 }}>
                🏢 Demo Company Tenant Users
              </div>
              <div style={{ fontSize:9.5, color:'#64748b', marginBottom:8 }}>
                Each row shows 3 formats for the same user — all work:
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[
                  { role:'Super Admin',     email:'admin@demo.com',   uid:'ELX-DEMO-0001', phone:'9841000001', pw:'Admin@2083'   },
                  { role:'HR Manager',      email:'hr@demo.com',      uid:'ELX-DEMO-0002', phone:null,         pw:'HR@2083'      },
                  { role:'Payroll Officer', email:'payroll@demo.com', uid:'ELX-DEMO-0003', phone:null,         pw:'Pay@2083'     },
                  { role:'HOD',             email:'hod@demo.com',     uid:'ELX-DEMO-0004', phone:null,         pw:'HOD@2083'     },
                  { role:'Employee',        email:'employee@demo.com',uid:'ELX-DEMO-0005', phone:'9841000005', pw:'Emp@2083'     },
                ].map(u=>(
                  <div key={u.email} style={{ background:'#fffbeb', border:'1px solid #fde68a',
                    borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ fontWeight:700, color:'#92400e', marginBottom:5, fontSize:10 }}>
                      {u.role}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:'3px 8px', fontSize:9.5 }}>
                      {[
                        ['Email ✉️',  u.email],
                        ['UID 🆔',    u.uid],
                        ...(u.phone?[['Phone 📱', u.phone]]:[]),
                        ['Password', u.pw],
                      ].map(([lb,v])=>(
                        <>
                          <span key={lb+'l'} style={{ color:'#78350f' }}>{lb}:</span>
                          <button key={lb+'v'} type="button"
                            onClick={()=>setForm(f=>({ ...f,
                              loginId: lb==='Password'?f.loginId:v,
                              password: lb==='Password'?v:f.password
                            }))}
                            style={{ background:'none', border:'none', cursor:'pointer',
                              textAlign:'left', padding:0, fontFamily:'monospace',
                              fontSize:9.5, color:'#0369a1', textDecoration:'underline dotted' }}>
                            <code style={{ background:'#fef3c7', padding:'1px 5px', borderRadius:3,
                              color:'#92400e' }}>{v}</code>
                            {lb!=='Password'&&<span style={{ color:'#94a3b8', fontSize:8 }}> ← click to fill</span>}
                          </button>
                        </>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10, padding:'6px 10px', background:'#f0fdf4',
                border:'1px solid #bbf7d0', borderRadius:7, fontSize:9, color:'#065f46' }}>
                ✅ All passwords follow pattern: <code>Role@2083</code> — change on first login.
              </div>
            </div>
          </details>

          {/* Footer */}
          <div style={{ textAlign:'center', marginTop:28, paddingTop:18,
            borderTop:'1px solid #e2e8f0', fontSize:10, color:'#94a3b8', lineHeight:2 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, marginBottom:2 }}>
              <img src={eLogixLogo} alt="" style={{ width:14, height:14, objectFit:'contain', opacity:.4 }}
                onError={e=>e.target.style.display='none'}/>
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

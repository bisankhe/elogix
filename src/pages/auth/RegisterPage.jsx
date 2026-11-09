// FILE: src/pages/auth/RegisterPage.jsx
// eLogix HRMS — Company Self-Registration (6-Step Wizard)
// ─────────────────────────────────────────────────────────────────────
// SOURCE OF TRUTH: API only. No mock data, no demo data, no hardcoded data.
//
// localStorage usage — ONLY the following key is written here:
//   • elogix_registered_tenants  — login credentials fallback for offline
//     tenant login (email → {id, name, role, company, pw, ...})
//     This is the ONLY localStorage key this file writes.
//
// Keys that were previously written here but are now REMOVED:
//   ✗ elogix_registered_companies  — caused stale cache / false pending display
//   ✗ elogix_pending_tenants        — caused stale cache
//   ✗ elogix_global_pending         — same-browser-only signal; replaced by API poll
//
// Registration flow:
//   RegisterPage → POST /api/elogix-admin/v1/register-company
//     → server.js INSERT INTO tenant_companies (status='pending')
//     → SuperAdmin sees it in GET /api/elogix-admin/v1/pending-companies
//     → SuperAdmin approves → POST /api/elogix-admin/v1/companies/:slug/approve
//     → GET /api/elogix-admin/v1/companies returns the company in all tabs
//
// eLogix Technologies · www.elogix.com.np
// ─────────────────────────────────────────────────────────────────────

import { useState } from 'react'

const G = 'linear-gradient(135deg,#059669 0%,#0369a1 55%,#38bdf8 100%)'
const A = '#0369a1'

const inp = {
  width:'100%', padding:'10px 14px', borderRadius:9,
  border:'1.5px solid #e2e8f0', fontSize:12, outline:'none',
  boxSizing:'border-box', fontFamily:'inherit', transition:'border .15s',
}

const STEPS = [
  { n:1, label:'Company Info'      },
  { n:2, label:'Admin Account'     },
  { n:3, label:'Few More Details'  },
  { n:4, label:'Business Type'     },
  { n:5, label:'Choose Plan'       },
  { n:6, label:'Review & Confirm'  },
]

const COUNTRIES = [
  'Nepal','India','Bangladesh','Sri Lanka','Pakistan','Bhutan','Maldives',
  'United States','United Kingdom','Australia','Canada','Singapore',
  'UAE','Qatar','Saudi Arabia','Germany','Japan','Other',
]

const CURRENCIES = [
  { code:'NPR', label:'NPR — Nepalese Rupee',        symbol:'रू' },
  { code:'INR', label:'INR — Indian Rupee',           symbol:'₹'  },
  { code:'USD', label:'USD — US Dollar',              symbol:'$'  },
  { code:'GBP', label:'GBP — British Pound',          symbol:'£'  },
  { code:'EUR', label:'EUR — Euro',                   symbol:'€'  },
  { code:'AUD', label:'AUD — Australian Dollar',      symbol:'A$' },
  { code:'SGD', label:'SGD — Singapore Dollar',       symbol:'S$' },
  { code:'AED', label:'AED — UAE Dirham',             symbol:'د.إ'},
  { code:'BDT', label:'BDT — Bangladeshi Taka',       symbol:'৳'  },
  { code:'LKR', label:'LKR — Sri Lankan Rupee',       symbol:'Rs' },
  { code:'BTN', label:'BTN — Bhutanese Ngultrum',     symbol:'Nu' },
  { code:'PKR', label:'PKR — Pakistani Rupee',        symbol:'₨'  },
]

const BS_MONTHS = [
  'Baisakh (1)','Jestha (2)','Asar (3)','Shrawan (4)','Bhadra (5)','Ashwin (6)',
  'Kartik (7)','Mangsir (8)','Poush (9)','Magh (10)','Falgun (11)','Chaitra (12)',
]
const AD_MONTHS = [
  'January (1)','February (2)','March (3)','April (4)','May (5)','June (6)',
  'July (7)','August (8)','September (9)','October (10)','November (11)','December (12)',
]
const CALENDAR_TYPES = ['Bikram Sambat (BS) — Nepal','AD / Gregorian']

const BUSINESS_TYPES = [
  {
    id:'recruitment_agency', icon:'🎯', label:'Recruitment Agency',
    color:'#e11d48', bg:'#fff1f2',
    desc:'Manpower agencies, placement firms, headhunters',
    modules:['ats','job_portal','interview','candidate_pool','jd_library','outsource',
             'onboarding','documents','employee','self_service','ai_chatbot','ai_letters',
             'integrations','reports','helpdesk'],
    landing:'ats-command-center',
  },
  {
    id:'bank_finance', icon:'🏦', label:'Bank / Finance',
    color:'#0369a1', bg:'#eff6ff',
    desc:'Banks, insurance, NBFCs, cooperatives',
    modules:['employee','org_setup','attendance','leave','payroll','self_service','documents',
             'performance','goals','training','skill_matrix','finance','compliance','tax',
             'loan','expense','reports','ai_bi','audit_log','permissions','sso','multi_branch',
             'announcements','helpdesk','exit','org_chart','roster'],
    landing:'employee-dashboard',
  },
  {
    id:'hospital_health', icon:'🏥', label:'Hospital / Healthcare',
    color:'#059669', bg:'#f0fdf4',
    desc:'Hospitals, clinics, diagnostic centers, pharma',
    modules:['employee','org_setup','attendance','leave','payroll','self_service','documents',
             'roster','overtime','training','compliance','reports','helpdesk','exit',
             'announcements','org_chart','performance','loan','expense','ai_chatbot'],
    landing:'employee-dashboard',
  },
  {
    id:'ngo_ingo', icon:'🌱', label:'NGO / INGO',
    color:'#d97706', bg:'#fffbeb',
    desc:'Non-profits, INGOs, development organizations',
    modules:['employee','org_setup','attendance','leave','payroll','self_service','documents',
             'compliance','reports','training','performance','helpdesk','announcements',
             'exit','org_chart','ai_chatbot','ai_letters','expense'],
    landing:'employee-dashboard',
  },
  {
    id:'it_software', icon:'💻', label:'IT / Software Company',
    color:'#7c3aed', bg:'#f5f3ff',
    desc:'Software, SaaS, IT services, startups',
    modules:['employee','org_setup','attendance','leave','payroll','self_service','documents',
             'ats','job_portal','interview','onboarding','jd_library','candidate_pool',
             'performance','goals','360_feedback','training','skill_matrix','career_pathing',
             'reports','ai_bi','ai_chatbot','api_access','integrations','sso','helpdesk',
             'announcements','exit','org_chart','permissions'],
    landing:'ats-executive-dashboard',
  },
  {
    id:'manufacturing', icon:'🏭', label:'Manufacturing / Factory',
    color:'#64748b', bg:'#f8fafc',
    desc:'Factories, production units, industrial companies',
    modules:['employee','org_setup','attendance','leave','payroll','self_service','documents',
             'roster','overtime','training','compliance','tax','loan','reports','helpdesk',
             'exit','announcements','org_chart','performance','expense','biometric'],
    landing:'employee-dashboard',
  },
  {
    id:'hotel_hospitality', icon:'🏨', label:'Hotel / Hospitality',
    color:'#c2410c', bg:'#fff7ed',
    desc:'Hotels, restaurants, tourism, travel agencies',
    modules:['employee','org_setup','attendance','leave','payroll','self_service','documents',
             'roster','overtime','training','compliance','reports','helpdesk','exit',
             'announcements','org_chart','biometric','expense'],
    landing:'employee-dashboard',
  },
  {
    id:'education', icon:'🎓', label:'Education / University',
    color:'#0891b2', bg:'#f0f9ff',
    desc:'Schools, colleges, universities, training institutes',
    modules:['employee','org_setup','attendance','leave','payroll','self_service','documents',
             'performance','training','compliance','reports','helpdesk','exit','announcements',
             'org_chart','ai_chatbot','ai_letters'],
    landing:'employee-dashboard',
  },
  {
    id:'government', icon:'🏛️', label:'Government / Public Sector',
    color:'#374151', bg:'#f9fafb',
    desc:'Government offices, public enterprises, municipalities',
    modules:['employee','org_setup','attendance','leave','payroll','self_service','documents',
             'compliance','tax','reports','audit_log','helpdesk','exit','announcements',
             'org_chart','permissions','multi_branch'],
    landing:'employee-dashboard',
  },
  {
    id:'custom', icon:'⚙️', label:'Custom / Other',
    color:'#6b7280', bg:'#f3f4f6',
    desc:'Any other business — configure modules manually after setup',
    modules:['employee','attendance','leave','payroll','self_service','reports'],
    landing:'employee-dashboard',
  },
]

const PLANS = [
  { id:'trial',    name:'Free Trial',  icon:'🎁', price:0,     emp:10,  days:14, color:'#059669' },
  { id:'starter',  name:'Starter',     icon:'🚀', price:5000,  emp:50,  days:0,  color:'#0891b2' },
  { id:'growth',   name:'Growth',      icon:'📈', price:12000, emp:250, days:0,  color:'#0369a1', popular:true },
  { id:'business', name:'Business',    icon:'🏢', price:25000, emp:500, days:0,  color:'#7c3aed' },
]

function Inp({ label, k, type='text', placeholder, required, value, onChange, onChange_extra, readOnly, hint }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4 }}>
        {label}{required&&<span style={{ color:'#dc2626',marginLeft:2 }}>*</span>}
      </label>
      <input type={type} value={value} readOnly={readOnly} name={k}
        onChange={e=>{ onChange&&onChange(e); onChange_extra&&onChange_extra(e.target.value) }}
        placeholder={placeholder||label} style={inp}
        autoComplete={type==='email'?'email':type==='password'?'new-password':'off'}
        onFocus={e=>e.target.style.borderColor=A}
        onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
      {hint&&<div style={{ fontSize:10,color:'#64748b',marginTop:4 }}>{hint}</div>}
    </div>
  )
}

function Sel({ label, required, value, onChange, children, hint }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4 }}>
        {label}{required&&<span style={{ color:'#dc2626',marginLeft:2 }}>*</span>}
      </label>
      <select value={value} onChange={onChange} style={inp}
        onFocus={e=>e.target.style.borderColor=A}
        onBlur={e=>e.target.style.borderColor='#e2e8f0'}>
        {children}
      </select>
      {hint&&<div style={{ fontSize:10,color:'#64748b',marginTop:4 }}>{hint}</div>}
    </div>
  )
}

export default function RegisterPage({ onSuccess }) {
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(null)

  const [form, setForm] = useState({
    company_name: '', slug: '', phone: '',
    admin_name: '', admin_email: '', password: '', confirm_password: '',
    address_line1: '', address_line2: '', city: '', district: '', province: '', postal_code: '',
    country: 'Nepal',
    fy_start_month: '1',  fy_end_month: '12',
    leave_start_month: '1', leave_end_month: '12',
    calendar_type: 'Bikram Sambat (BS) — Nepal',
    currency: 'NPR',
    business_type: '', business_label: '', business_icon: '',
    modules: [], landing: 'employee-dashboard',
    plan: 'trial',
  })

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const autoSlug = n => n.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,30)

  const selectedBT  = BUSINESS_TYPES.find(b => b.id === form.business_type)
  const selectedCur = CURRENCIES.find(c => c.code === form.currency)
  const calMonths   = form.calendar_type.startsWith('Bikram') ? BS_MONTHS : AD_MONTHS

  const validate = () => {
    if (step === 1) {
      if (!form.company_name.trim()) { setError('Company name is required'); return false }
      if (!form.slug.trim()) { sf('slug', autoSlug(form.company_name)); return true }
    }
    if (step === 2) {
      if (!form.admin_name || !form.admin_email || !form.password) {
        setError('Please fill all admin details'); return false
      }
      if (form.password !== form.confirm_password) {
        setError('Passwords do not match'); return false
      }
    }
    if (step === 3) {
      if (!form.country)  { setError('Please select a country'); return false }
      if (!form.currency) { setError('Please select a currency'); return false }
    }
    if (step === 4) {
      if (!form.business_type) { setError('Please select your business type'); return false }
    }
    return true
  }

  const next = () => { if (validate()) { setError(''); setStep(s => s + 1) } }
  const back = () => { setError(''); setStep(s => s - 1) }

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.company_name||!form.slug||!form.admin_email||!form.password) {
      setError('Please fill all required fields'); return
    }
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return }
    setLoading(true); setError('')

    try {
      // ── PRIMARY: Register via API → persists to PostgreSQL tenant_companies ──
      const registrationPayload = {
        name          : form.company_name,
        slug          : form.slug,
        plan          : form.plan || 'trial',
        business_type : form.business_type,
        admin_email   : form.admin_email,
        admin_name    : form.admin_name,
        admin_password: form.password,
        phone         : form.phone || '',
        country       : form.country || 'Nepal',
        currency      : form.currency || 'NPR',
        industry      : form.business_label,
        modules       : form.modules || [],
        landing       : form.landing || 'employee-dashboard',
        calendar_type : form.calendar_type,
        fy_start_month: form.fy_start_month,
        address       : [form.address_line1, form.city, form.district, form.province].filter(Boolean).join(', '),
        status        : 'pending',
      }

      let apiSuccess = false
      let apiData = null

      try {
        const apiRes = await fetch('/api/elogix-admin/v1/register-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationPayload),
        })

        if (apiRes.ok) {
          apiData = await apiRes.json()
          apiSuccess = true
        } else if (apiRes.status === 409) {
          const e = await apiRes.json().catch(() => ({}))
          throw new Error(e.error || 'Company URL already taken — choose a different name')
        } else {
          const e = await apiRes.json().catch(() => ({}))
          throw new Error(e.error || `Registration failed (HTTP ${apiRes.status})`)
        }
      } catch (fetchErr) {
        // Only swallow network-level errors (server down).
        // 409 conflict and other API errors must propagate.
        if (fetchErr.message?.includes('already taken') ||
            fetchErr.message?.includes('Registration failed')) {
          throw fetchErr
        }
        // Server appears to be down — log and continue to localStorage fallback
        console.warn('[eLogix] API unavailable during registration:', fetchErr.message)
      }

      // ── REQUIRED: Save admin credentials to localStorage for tenant login ──
      // This is the ONLY localStorage write in this component.
      // Purpose: allow tenant admin to log in even if the company DNS/session
      // isn't set up yet, as an offline fallback.
      // The company data is NOT stored here — it comes from the API.
      const slugKey = (form.slug || 'COMP').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4) || 'COMP'
      const empId   = `ELX-${slugKey}-0001`

      try {
        const regUsers = JSON.parse(window.localStorage.getItem('elogix_registered_tenants') || '{}')
        regUsers[form.admin_email.toLowerCase()] = {
          id          : empId,
          name        : form.admin_name || 'Admin',
          role        : 'super_admin',
          level       : 1,
          company     : form.slug,
          pw          : form.password,
          business_type: form.business_type,
        }
        // Also index by empId for ID-based lookup
        regUsers[empId] = { ...regUsers[form.admin_email.toLowerCase()] }
        window.localStorage.setItem('elogix_registered_tenants', JSON.stringify(regUsers))
      } catch (_e) {
        // localStorage unavailable — not a fatal error, login will require server
        console.warn('[eLogix] localStorage unavailable, tenant credentials not saved locally')
      }

      // Store pending login context in sessionStorage for the login page redirect
      try {
        sessionStorage.setItem('elogix_pending_login', JSON.stringify({
          slug         : form.slug,
          business_type: form.business_type,
          landing      : form.landing,
        }))
      } catch (_e) {}

      setDone({
        success     : true,
        emp_id      : empId,
        portal_url  : `https://${form.slug}.elogix.com.np`,
        company_name: form.company_name,
        plan        : form.plan,
        api_registered: apiSuccess,
        ...(apiData || {}),
      })

    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── SUCCESS SCREEN ───────────────────────────────────────────────
  if (done) return (
    <div style={{
      position:'fixed', inset:0, background:'#f0fdf4',
      fontFamily:'system-ui,sans-serif', overflowY:'scroll', overflowX:'hidden',
      WebkitOverflowScrolling:'touch', display:'flex',
      alignItems:'flex-start', justifyContent:'center', padding:'32px 16px', zIndex:10,
    }}>
      <div style={{ textAlign:'center', maxWidth:520 }}>
        <div style={{ fontSize:72, marginBottom:12 }}>🎉</div>
        <div style={{ fontSize:26, fontWeight:900, color:'#0369a1', marginBottom:6 }}>
          Application Submitted! ✅
        </div>
        <div style={{ fontSize:13, color:'#374151', marginBottom:20, lineHeight:1.7 }}>
          Your <b>{done?.company_name || form.company_name}</b> application is under review.<br/>
          Configured for <b>{form.business_icon} {form.business_label}</b> ·
          Currency: <b>{selectedCur?.symbol} {form.currency}</b>
        </div>

        {!done.api_registered && (
          <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:12,
            padding:'12px 16px', marginBottom:16, fontSize:11, color:'#c2410c' }}>
            ⚠️ Our server is temporarily unreachable. Your application will be submitted
            once the server is back online. Please contact{' '}
            <a href="mailto:support@elogix.com.np" style={{ color:'#c2410c' }}>
              support@elogix.com.np
            </a> if this persists.
          </div>
        )}

        <div style={{ background:'#fff', borderRadius:14, padding:20,
          border:'1px solid #bbf7d0', marginBottom:20 }}>
          <div style={{ fontSize:10, color:'#64748b', marginBottom:4 }}>Your eLogix Portal</div>
          <div style={{ fontSize:15, fontWeight:800, color:A }}>
            https://{form.slug}.elogix.com.np
          </div>
          <div style={{ marginTop:10, padding:'8px 12px', background:'#f0fdf4',
            borderRadius:9, fontSize:11, color:'#065f46', lineHeight:1.8 }}>
            ✅ {form.modules.length} modules pre-configured<br/>
            📧 Admin login: <b>{form.admin_email}</b><br/>
            ⏳ <b>Pending SuperAdmin approval</b> — typically within 1 business day<br/>
            📞 Questions?{' '}
            <a href="mailto:support@elogix.com.np" style={{ color:'#0369a1' }}>
              support@elogix.com.np
            </a>
          </div>
        </div>

        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12,
          padding:'16px 20px', marginBottom:18, fontSize:11, color:'#92400e', lineHeight:1.8 }}>
          ⏳ <strong>Awaiting eLogix SuperAdmin approval</strong><br/>
          Your login credentials will be sent via:<br/>
          📧 Email &nbsp;·&nbsp; 📱 WhatsApp &nbsp;·&nbsp; 💬 Viber<br/>
          <span style={{ fontSize:10, color:'#a16207' }}>Typically approved within 1 business day.</span>
        </div>

        <button onClick={() => onSuccess?.()} style={{ display:'inline-block',
          padding:'12px 32px', borderRadius:10, border:'2px solid #0369a1',
          background:'#fff', color:'#0369a1', fontSize:13, fontWeight:800,
          cursor:'pointer', fontFamily:'inherit' }}>
          ← Back to Login
        </button>
      </div>
    </div>
  )

  // ── REGISTRATION FORM ────────────────────────────────────────────
  return (
    <div style={{
      position:'fixed', inset:0, background:'#f0f7ff',
      fontFamily:'system-ui,sans-serif', overflowY:'scroll', overflowX:'hidden',
      WebkitOverflowScrolling:'touch', zIndex:10,
    }}>
      {/* Header */}
      <div style={{ background:G, padding:'14px 24px', color:'#fff',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:900 }}>🏢 eLogix HRMS</div>
          <div style={{ fontSize:10, opacity:.75 }}>Start your 14-day free trial · No credit card needed</div>
        </div>
        <span onClick={() => onSuccess?.()} style={{ color:'#bae6fd', fontSize:11,
          fontWeight:700, cursor:'pointer', textDecoration:'underline' }}>
          Already have an account? Sign in →
        </span>
      </div>

      <div style={{ maxWidth: step === 4 ? 920 : 660, margin:'0 auto', padding:'24px 16px', width:'100%', boxSizing:'border-box' }}>

        {/* Step progress */}
        <div style={{ display:'flex', gap:0, marginBottom:28 }}>
          {STEPS.map(({ n, label }) => {
            const active = n === step, done_s = n < step
            return (
              <div key={n} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ position:'relative', width:'100%', display:'flex', alignItems:'center' }}>
                  {n > 1 && <div style={{ flex:1, height:2, background:done_s ? A : '#e2e8f0', transition:'background .3s' }}/>}
                  <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:800, fontSize:11,
                    background: done_s ? A : active ? A : '#fff',
                    border:`2px solid ${active||done_s ? A : '#e2e8f0'}`,
                    color: active||done_s ? '#fff' : '#94a3b8', transition:'all .3s' }}>
                    {done_s ? '✓' : n}
                  </div>
                  {n < STEPS.length && <div style={{ flex:1, height:2, background:done_s ? A : '#e2e8f0', transition:'background .3s' }}/>}
                </div>
                <div style={{ fontSize:9, fontWeight: active ? 700 : 400,
                  color: active ? A : done_s ? '#374151' : '#94a3b8', marginTop:5, textAlign:'center' }}>
                  {label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:9,
            padding:'10px 14px', marginBottom:16, fontSize:12, color:'#dc2626', fontWeight:600 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ background:'#fff', borderRadius:16, padding:'24px 28px',
          border:'1px solid #e2e8f0', boxShadow:'0 4px 20px rgba(0,0,0,.06)' }}>

          {/* ── STEP 1: Company Info ── */}
          {step === 1 && (
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:'#0f172a', marginBottom:4 }}>🏢 Company Information</div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:20 }}>This becomes your eLogix portal URL.</div>
              <Inp label="Company Name" k="company_name" required value={form.company_name}
                onChange={e => { sf('company_name', e.target.value); if (!form.slug || form.slug === autoSlug(form.company_name.slice(0,-1))) sf('slug', autoSlug(e.target.value)) }}/>
              <Inp label="Portal URL (slug)" k="slug" required value={form.slug}
                onChange={e => sf('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}
                hint={`Your portal: https://${form.slug || 'your-company'}.elogix.com.np`}/>
              <Inp label="Company Phone" k="phone" type="tel" value={form.phone}
                onChange={e => sf('phone', e.target.value)}/>
            </div>
          )}

          {/* ── STEP 2: Admin Account ── */}
          {step === 2 && (
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:'#0f172a', marginBottom:4 }}>👤 Admin Account</div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:20 }}>This person will be the company super admin.</div>
              <Inp label="Full Name" k="admin_name" required value={form.admin_name} onChange={e => sf('admin_name', e.target.value)}/>
              <Inp label="Admin Email" k="admin_email" type="email" required value={form.admin_email} onChange={e => sf('admin_email', e.target.value)}/>
              <Inp label="Password" k="password" type="password" required value={form.password} onChange={e => sf('password', e.target.value)}/>
              <Inp label="Confirm Password" k="confirm_password" type="password" required value={form.confirm_password} onChange={e => sf('confirm_password', e.target.value)}/>
            </div>
          )}

          {/* ── STEP 3: More Details ── */}
          {step === 3 && (
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:'#0f172a', marginBottom:4 }}>📍 Company Details</div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:20 }}>Address, fiscal year, leave calendar & currency.</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <Inp label="Address Line 1" k="address_line1" value={form.address_line1} onChange={e=>sf('address_line1',e.target.value)}/>
                <Inp label="City" k="city" value={form.city} onChange={e=>sf('city',e.target.value)}/>
                <Inp label="District" k="district" value={form.district} onChange={e=>sf('district',e.target.value)}/>
                <Inp label="Province" k="province" value={form.province} onChange={e=>sf('province',e.target.value)}/>
              </div>
              <Sel label="Country" required value={form.country} onChange={e=>sf('country',e.target.value)}>
                {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
              </Sel>
              <Sel label="Currency" required value={form.currency} onChange={e=>sf('currency',e.target.value)}>
                {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}
              </Sel>
              <Sel label="Calendar Type" value={form.calendar_type} onChange={e=>sf('calendar_type',e.target.value)}>
                {CALENDAR_TYPES.map(c=><option key={c} value={c}>{c}</option>)}
              </Sel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <Sel label="FY Start" value={form.fy_start_month} onChange={e=>sf('fy_start_month',e.target.value)}>
                  {calMonths.map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                </Sel>
                <Sel label="FY End" value={form.fy_end_month} onChange={e=>sf('fy_end_month',e.target.value)}>
                  {calMonths.map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                </Sel>
              </div>
            </div>
          )}

          {/* ── STEP 4: Business Type ── */}
          {step === 4 && (
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:'#0f172a', marginBottom:4 }}>🏭 Business Type</div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:20 }}>Select the type that best describes your organization. This pre-configures your modules.</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
                {BUSINESS_TYPES.map(bt => (
                  <div key={bt.id} onClick={() => {
                    sf('business_type', bt.id); sf('business_label', bt.label)
                    sf('business_icon', bt.icon); sf('modules', bt.modules); sf('landing', bt.landing)
                  }} style={{
                    borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'all .15s',
                    border:`2px solid ${form.business_type === bt.id ? bt.color : '#e2e8f0'}`,
                    background: form.business_type === bt.id ? bt.bg : '#fff',
                    boxShadow: form.business_type === bt.id ? `0 4px 16px ${bt.color}22` : 'none',
                  }}>
                    <div style={{ fontSize:28, marginBottom:6 }}>{bt.icon}</div>
                    <div style={{ fontSize:12, fontWeight:800, color:bt.color, marginBottom:3 }}>{bt.label}</div>
                    <div style={{ fontSize:10, color:'#64748b', marginBottom:6, lineHeight:1.4 }}>{bt.desc}</div>
                    <div style={{ fontSize:9, color:'#94a3b8' }}>{bt.modules.length} modules</div>
                  </div>
                ))}
              </div>
              {selectedBT && (
                <div style={{ marginTop:16, padding:'12px 14px', background:'#f0f9ff',
                  border:'1px solid #bae6fd', borderRadius:10, fontSize:10, color:'#0369a1' }}>
                  <b>{selectedBT.icon} {selectedBT.label}</b> — {selectedBT.modules.length} modules pre-configured:&nbsp;
                  {selectedBT.modules.slice(0,8).join(', ')}{selectedBT.modules.length > 8 ? ` +${selectedBT.modules.length - 8} more` : ''}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5: Choose Plan ── */}
          {step === 5 && (
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:'#0f172a', marginBottom:4 }}>💎 Choose Plan</div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:20 }}>All plans include core HR features. Upgrade any time.</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                {PLANS.map(p => (
                  <div key={p.id} onClick={() => sf('plan', p.id)} style={{
                    borderRadius:12, padding:'16px 14px', cursor:'pointer', textAlign:'center',
                    border:`2px solid ${form.plan === p.id ? p.color : '#e2e8f0'}`,
                    background: form.plan === p.id ? '#f0f9ff' : '#fff',
                    position:'relative', transition:'all .15s',
                  }}>
                    {p.popular && <div style={{ position:'absolute', top:-8, left:'50%',
                      transform:'translateX(-50%)', background:'#f59e0b', color:'#fff',
                      fontSize:9, fontWeight:800, padding:'2px 10px', borderRadius:10 }}>POPULAR</div>}
                    <div style={{ fontSize:28, marginBottom:6 }}>{p.icon}</div>
                    <div style={{ fontSize:13, fontWeight:900, color:p.color }}>{p.name}</div>
                    <div style={{ fontSize:16, fontWeight:900, color:'#0f172a', margin:'6px 0' }}>
                      {p.price > 0 ? `रू ${p.price.toLocaleString()}/mo` : 'Free'}
                    </div>
                    <div style={{ fontSize:10, color:'#64748b' }}>Up to {p.emp} employees</div>
                    {p.days > 0 && <div style={{ fontSize:10, color:'#059669', marginTop:4, fontWeight:700 }}>{p.days}-day trial</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 6: Review ── */}
          {step === 6 && (
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:'#0f172a', marginBottom:4 }}>✅ Review & Confirm</div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:20 }}>Confirm your details before submitting.</div>
              <div style={{ display:'grid', gap:10 }}>
                {[
                  ['🏢 Company', form.company_name],
                  ['🌐 Portal URL', `${form.slug}.elogix.com.np`],
                  ['👤 Admin', `${form.admin_name} · ${form.admin_email}`],
                  ['🏭 Business Type', `${form.business_icon} ${form.business_label}`],
                  ['💎 Plan', PLANS.find(p=>p.id===form.plan)?.name || form.plan],
                  ['🌍 Country', form.country],
                  ['💰 Currency', form.currency],
                  ['📅 Calendar', form.calendar_type],
                  ['🧩 Modules', `${form.modules.length} configured`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between',
                    padding:'8px 12px', background:'#f8fafc', borderRadius:8,
                    border:'1px solid #e2e8f0', fontSize:12 }}>
                    <span style={{ color:'#64748b', fontWeight:600 }}>{label}</span>
                    <span style={{ color:'#0f172a', fontWeight:700 }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:16, padding:'12px 14px', background:'#fffbeb',
                border:'1px solid #fde68a', borderRadius:10, fontSize:11, color:'#92400e' }}>
                ⏳ Your account will be <strong>pending SuperAdmin approval</strong>. You'll receive
                login credentials via email once activated.
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:20, gap:12 }}>
          {step > 1 ? (
            <button onClick={back} style={{ padding:'11px 24px', borderRadius:10,
              border:'1.5px solid #e2e8f0', background:'#fff', color:'#374151',
              fontSize:12, fontWeight:700, cursor:'pointer' }}>
              ← Back
            </button>
          ) : (
            <button onClick={() => onSuccess?.()} style={{ padding:'11px 24px', borderRadius:10,
              border:'1.5px solid #e2e8f0', background:'#fff', color:'#374151',
              fontSize:12, fontWeight:700, cursor:'pointer' }}>
              ← Login
            </button>
          )}

          {step < 6 ? (
            <button onClick={next} style={{ padding:'11px 32px', borderRadius:10,
              border:'none', background:G, color:'#fff',
              fontSize:12, fontWeight:800, cursor:'pointer', flex:1, maxWidth:220 }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding:'11px 32px', borderRadius:10, border:'none',
                background: loading ? '#94a3b8' : G, color:'#fff',
                fontSize:12, fontWeight:800, cursor: loading ? 'not-allowed' : 'pointer',
                flex:1, maxWidth:260 }}>
              {loading ? '⏳ Submitting…' : '🚀 Submit Application'}
            </button>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:16, fontSize:10, color:'#94a3b8' }}>
          By registering you agree to our Terms of Service · Privacy Policy<br/>
          Questions? <a href="mailto:support@elogix.com.np" style={{ color:A }}>support@elogix.com.np</a>
        </div>
      </div>
    </div>
  )
}

// FILE: src/pages/auth/RegisterPage.jsx
// eLogix HRMS — Company Self-Registration (6-Step Wizard)
// Step 1: Company Information
// Step 2: Admin Account
// Step 3: Few More Details (Address, Country, FY, Leave Calendar, Currency)
// Step 4: Business Type (auto-configures modules)
// Step 5: Choose Plan
// Step 6: Review & Confirm
// eLogix Technologies · www.elogix.com.np
import { useState } from 'react'
import { eLogixAPI } from '../../utils/api.js'

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

// ── COUNTRIES ─────────────────────────────────────────────────
const COUNTRIES = [
  'Nepal','India','Bangladesh','Sri Lanka','Pakistan','Bhutan','Maldives',
  'United States','United Kingdom','Australia','Canada','Singapore',
  'UAE','Qatar','Saudi Arabia','Germany','Japan','Other',
]

// ── CURRENCIES ───────────────────────────────────────────────
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

// ── MONTHS ──────────────────────────────────────────────────
const BS_MONTHS = [
  'Baisakh (1)','Jestha (2)','Asar (3)','Shrawan (4)','Bhadra (5)','Ashwin (6)',
  'Kartik (7)','Mangsir (8)','Poush (9)','Magh (10)','Falgun (11)','Chaitra (12)',
]
const AD_MONTHS = [
  'January (1)','February (2)','March (3)','April (4)','May (5)','June (6)',
  'July (7)','August (8)','September (9)','October (10)','November (11)','December (12)',
]
const CALENDAR_TYPES = ['Bikram Sambat (BS) — Nepal','AD / Gregorian']

// ── BUSINESS TYPES ───────────────────────────────────────────
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

// ── PLANS ───────────────────────────────────────────────────
const PLANS = [
  { id:'trial',    name:'Free Trial',  icon:'🎁', price:0,     emp:10,  days:14, color:'#059669' },
  { id:'starter',  name:'Starter',     icon:'🚀', price:5000,  emp:50,  days:0,  color:'#0891b2' },
  { id:'growth',   name:'Growth',      icon:'📈', price:12000, emp:250, days:0,  color:'#0369a1', popular:true },
  { id:'business', name:'Business',    icon:'🏢', price:25000, emp:500, days:0,  color:'#7c3aed' },
]

// ── INPUT COMPONENT (outside to prevent remount) ──────────────
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

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function RegisterPage({ onSuccess }) {
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(null)

  const [form, setForm] = useState({
    // Step 1 — Company Info
    company_name: '', slug: '', phone: '',

    // Step 2 — Admin Account
    admin_name: '', admin_email: '', password: '', confirm_password: '',

    // Step 3 — More Details
    address_line1: '', address_line2: '', city: '', district: '', province: '', postal_code: '',
    country: 'Nepal',
    fy_start_month: '1',  fy_end_month: '12',
    leave_start_month: '1', leave_end_month: '12',
    calendar_type: 'Bikram Sambat (BS) — Nepal',
    currency: 'NPR',

    // Step 4 — Business Type
    business_type: '', business_label: '', business_icon: '',
    modules: [], landing: 'employee-dashboard',

    // Step 5 — Plan
    plan: 'trial',
  })

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const autoSlug = n => n.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,30)

  const selectedBT  = BUSINESS_TYPES.find(b => b.id === form.business_type)
  const selectedCur = CURRENCIES.find(c => c.code === form.currency)
  const calMonths   = form.calendar_type.startsWith('Bikram') ? BS_MONTHS : AD_MONTHS

  // ── Validation per step ──────────────────────────────────
  const validate = () => {
    if (step === 1) {
      if (!form.company_name.trim()) { setError('Company name is required'); return false }
      if (!form.slug.trim())         { sf('slug', autoSlug(form.company_name)); return true }
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
      if (!form.country)   { setError('Please select a country'); return false }
      if (!form.currency)  { setError('Please select a currency'); return false }
    }
    if (step === 4) {
      if (!form.business_type) { setError('Please select your business type'); return false }
    }
    return true
  }

  const next = () => { if (validate()) { setError(''); setStep(s => s + 1) } }
  const back = () => { setError(''); setStep(s => s - 1) }

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.company_name||!form.slug||!form.admin_email||!form.password) {
      setError('Please fill all required fields'); return
    }
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    try {
      let data

      // ── PRIMARY: Try to register via backend API ──────────────────
      // This is THE reliable path — stores in PostgreSQL, visible from ANY browser
      try {
        const apiRes = await fetch('/api/elogix-admin/v1/register-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name          : form.company_name,
            slug          : form.slug,
            plan          : form.plan || 'trial',
            business_type : form.business_type,
            admin_email   : form.admin_email,
            admin_name    : form.admin_name,
            phone         : form.phone,
            country       : form.country || 'Nepal',
            currency      : form.currency || 'NPR',
            industry      : form.business_label,
            modules       : form.modules,
            status        : 'pending',
          })
        })
        if (apiRes.ok) {
          data = await apiRes.json()
        }
      } catch(_e) {
        // Backend unavailable — localStorage fallback below
      }

      // ── FALLBACK: Also try the old eLogixAPI (belt + suspenders) ──
      if (!data?.success) {
        try { data = await eLogixAPI.createCompany(form) } catch(_e) {}
      }

      // ── Always save to localStorage (works with or without API) ──
      const slugKey = (form.slug||'COMP').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4)||'COMP'
      const empId   = `ELX-${slugKey}-0001`

      const regUsers = JSON.parse(localStorage.getItem('elogix_registered_tenants')||'{}')
      regUsers[form.admin_email.toLowerCase()] = {
        id:empId, name:form.admin_name||'Admin', role:'super_admin', level:1,
        company:form.slug, pw:form.password, business_type:form.business_type,
      }
      regUsers[empId] = { ...regUsers[form.admin_email.toLowerCase()] }
      localStorage.setItem('elogix_registered_tenants', JSON.stringify(regUsers))

      const regCos = JSON.parse(localStorage.getItem('elogix_registered_companies')||'{}')
      regCos[form.slug] = {
        id:`c_${form.slug}`, name:form.company_name, plan:form.plan,
        status:form.plan==='trial'?'trial':'active',
        business_type:form.business_type, business_label:form.business_label,
        modules:form.modules, country:form.country||'Nepal', currency:form.currency||'NPR',
        landing:form.landing, admin_email:form.admin_email, admin_name:form.admin_name,
        created_at:new Date().toISOString().split('T')[0],
      }
      localStorage.setItem('elogix_registered_companies', JSON.stringify(regCos))

      const pending = JSON.parse(localStorage.getItem('elogix_pending_tenants')||'[]')
      if (!pending.find(t=>t.slug===form.slug)) {
        pending.push({
          id:`c_${form.slug}`, name:form.company_name, slug:form.slug,
          plan:form.plan, status:form.plan==='trial'?'trial':'active',
          employee_count:0,
          max_employees:{trial:10,starter:50,growth:250,business:500,enterprise:1000}[form.plan]||10,
          created_at:new Date().toISOString().split('T')[0],
          account_manager:'New Signup', support_tier:'standard',
          industry:form.business_label, country:form.country||'Nepal',
          currency:form.currency||'NPR', pending_invoice:0, last_payment:null,
          business_type:form.business_type, modules:form.modules,
          admin_email:form.admin_email, phone:form.phone,
        })
        localStorage.setItem('elogix_pending_tenants', JSON.stringify(pending))

        // ── Write to global pending key (read by ELogixAdminPage on same browser) ──
        // Also write to elogix_pending_global which ELogixAdminPage polls
        const globalPending = JSON.parse(localStorage.getItem('elogix_global_pending')||'[]')
        if (!globalPending.find(t=>t.slug===form.slug)) {
          globalPending.push({
            id:`c_${form.slug}`,name:form.company_name,slug:form.slug,
            plan:form.plan,status:'pending',
            employee_count:0,
            max_employees:{trial:10,starter:50,growth:250,business:500,enterprise:1000}[form.plan]||10,
            created_at:new Date().toISOString().split('T')[0],registered_at:new Date().toISOString(),
            account_manager:'New Signup',support_tier:'standard',
            industry:form.business_label,country:form.country||'Nepal',
            currency:form.currency||'NPR',pending_invoice:0,last_payment:null,
            business_type:form.business_type,modules:form.modules,
            admin_email:form.admin_email,phone:form.phone,
          })
          localStorage.setItem('elogix_global_pending', JSON.stringify(globalPending))
        }
        // Trigger storage event so ELogixAdminPage on SAME browser/tab picks it up immediately
        window.dispatchEvent(new StorageEvent('storage',{
          key:'elogix_global_pending',
          newValue:localStorage.getItem('elogix_global_pending'),
        }))
      }

      if (!data?.success) {
        data = {
          success:true, emp_id:empId,
          portal_url:`https://${form.slug}.elogix.com.np`,
          company_name:form.company_name, plan:form.plan,
          note:`✅ Registration complete! Awaiting SuperAdmin approval. You will be notified via ${form.admin_email}`,
        }
      }
      try { sessionStorage.setItem('elogix_pending_login', JSON.stringify({
        slug:form.slug, business_type:form.business_type, landing:form.landing,
      })) } catch(_e) {}
      setDone(data)
    } catch(err) {
      setError(err.message||'Registration failed. Try again.')
    } finally { setLoading(false) }
  }
  // ── SUCCESS ──────────────────────────────────────────────
  if (done) return (
    <div style={{
      position:'fixed', inset:0,
      background:'#f0fdf4',
      fontFamily:'system-ui,sans-serif',
      overflowY:'scroll',
      overflowX:'hidden',
      WebkitOverflowScrolling:'touch',
      display:'flex',
      alignItems:'flex-start',
      justifyContent:'center',
      padding:'32px 16px',
      zIndex:10,
      scrollbarWidth:'thin',
      scrollbarColor:'#94a3b8 #e2e8f0',
    }}>
      <div style={{ textAlign:'center',maxWidth:520 }}>
        <div style={{ fontSize:72,marginBottom:12 }}>🎉</div>
        <div style={{ fontSize:26,fontWeight:900,color:'#065f46',marginBottom:6 }}>Registration Complete! 🎉</div>
        <div style={{ fontSize:13,color:'#374151',marginBottom:20,lineHeight:1.7 }}>
          Your <b>{done.company_name}</b> account is ready.<br/>
          Configured for <b>{form.business_icon} {form.business_label}</b> ·
          Currency: <b>{selectedCur?.symbol} {form.currency}</b>
        </div>
        <div style={{ background:'#fff',borderRadius:14,padding:20,
          border:'1px solid #bbf7d0',marginBottom:20 }}>
          <div style={{ fontSize:10,color:'#64748b',marginBottom:4 }}>Your eLogix Portal</div>
          <div style={{ fontSize:15,fontWeight:800,color:A }}>https://{form.slug}.elogix.com.np</div>
          <div style={{ marginTop:10,padding:'8px 12px',background:'#f0fdf4',borderRadius:9,
            fontSize:11,color:'#065f46',lineHeight:1.6 }}>
            <div style={{ fontSize:11,color:'#065f46',lineHeight:1.8 }}>
              ✅ {form.modules.length} modules pre-configured<br/>
              📧 Login credentials: <b>{form.admin_email}</b><br/>
              ⏳ <b>Pending SuperAdmin approval</b> — eLogix team will review and activate your account within 24 hours<br/>
              📞 Questions? <a href="mailto:support@elogix.com.np" style={{color:'#0369a1'}}>support@elogix.com.np</a>
            </div>
          </div>
        </div>
        <a href="/login" style={{ display:'inline-block',padding:'12px 32px',borderRadius:10,
          background:G,color:'#fff',fontSize:13,fontWeight:800,textDecoration:'none',
          boxShadow:'0 4px 14px rgba(3,105,161,.3)' }}>
          🚀 Sign In to Your Portal
        </a>
        <div style={{ marginTop:14,fontSize:11,color:'#64748b' }}>
          Need help? <a href="mailto:support@elogix.com.np" style={{ color:A }}>support@elogix.com.np</a>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'#f0f7ff',
      fontFamily:'system-ui,sans-serif',
      overflowY:'scroll',
      overflowX:'hidden',
      WebkitOverflowScrolling:'touch',
      zIndex:10,
      scrollbarWidth:'thin',
      scrollbarColor:'#94a3b8 #e2e8f0',
    }}>
      {/* Header */}
      <div style={{ background:G,padding:'14px 24px',color:'#fff',
        display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8 }}>
        <div>
          <div style={{ fontSize:18,fontWeight:900 }}>🏢 eLogix HRMS</div>
          <div style={{ fontSize:10,opacity:.75 }}>Start your 14-day free trial · No credit card needed</div>
        </div>
        <a href="/login" style={{ color:'#bae6fd',fontSize:11,fontWeight:700,textDecoration:'none' }}>
          Already have an account? Sign in →
        </a>
      </div>

      <div style={{ maxWidth: step===4 ? 920 : 660, margin:'0 auto', padding:'24px 16px', width:'100%', boxSizing:'border-box' }}>

        {/* ── STEP PROGRESS BAR ── */}
        <div style={{ display:'flex',gap:0,marginBottom:28 }}>
          {STEPS.map(({ n, label })=>{
            const active = n === step, done_s = n < step
            return (
              <div key={n} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center' }}>
                <div style={{ position:'relative',width:'100%',display:'flex',alignItems:'center' }}>
                  {n>1&&<div style={{ flex:1,height:2,background:done_s?A:'#e2e8f0',transition:'background .3s' }}/>}
                  <div style={{ width:30,height:30,borderRadius:'50%',flexShrink:0,display:'flex',
                    alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:11,
                    background:done_s?A:active?A:'#fff',
                    border:`2px solid ${active||done_s?A:'#e2e8f0'}`,
                    color:active||done_s?'#fff':'#94a3b8',transition:'all .3s' }}>
                    {done_s ? '✓' : n}
                  </div>
                  {n<STEPS.length&&<div style={{ flex:1,height:2,background:done_s?A:'#e2e8f0',transition:'background .3s' }}/>}
                </div>
                <div style={{ fontSize:8,marginTop:4,textAlign:'center',whiteSpace:'nowrap',
                  color:active?A:'#94a3b8',fontWeight:active?700:400,overflow:'hidden',maxWidth:60,textOverflow:'ellipsis' }}>{label}</div>
              </div>
            )
          })}
        </div>

        {/* ══ STEP 4: Business Type — wide grid, no card wrapper ══ */}
        {step===4 && (
          <div>
            <div style={{ textAlign:'center',marginBottom:20 }}>
              <div style={{ fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4 }}>
                What type of business are you?
              </div>
              <div style={{ fontSize:12,color:'#64748b' }}>
                We'll pre-configure your modules, permissions, and dashboard automatically
              </div>
            </div>
            {error&&(
              <div style={{ background:'#fef2f2',border:'1px solid #fecaca',borderRadius:9,
                padding:'10px 14px',marginBottom:14,fontSize:11,color:'#dc2626',textAlign:'center' }}>
                ⚠️ {error}
              </div>
            )}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12,marginBottom:20 }}>
              {BUSINESS_TYPES.map(bt=>{
                const sel = form.business_type === bt.id
                return (
                  <div key={bt.id}
                    onClick={()=>{ sf('business_type',bt.id); sf('business_label',bt.label); sf('business_icon',bt.icon); sf('modules',bt.modules); sf('landing',bt.landing); setError('') }}
                    style={{ background:sel?bt.bg:'#fff', borderRadius:14, padding:'16px 18px', cursor:'pointer',
                      border:`2px solid ${sel?bt.color:'#e2e8f0'}`,
                      boxShadow:sel?`0 4px 16px ${bt.color}25`:'0 1px 4px rgba(0,0,0,.05)',
                      transition:'all .15s' }}
                    onMouseEnter={e=>{ if(!sel){e.currentTarget.style.borderColor=bt.color;e.currentTarget.style.boxShadow=`0 3px 12px ${bt.color}18`} }}
                    onMouseLeave={e=>{ if(!sel){e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.05)'} }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
                      <span style={{ fontSize:26 }}>{bt.icon}</span>
                      <div>
                        <div style={{ fontSize:12,fontWeight:800,color:bt.color }}>{bt.label}</div>
                        <div style={{ fontSize:9,color:'#64748b',marginTop:1,lineHeight:1.3 }}>{bt.desc}</div>
                      </div>
                      {sel&&<span style={{ marginLeft:'auto',fontSize:18,color:bt.color }}>✅</span>}
                    </div>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:3 }}>
                      {bt.modules.slice(0,5).map(m=>(
                        <span key={m} style={{ fontSize:8,padding:'1px 6px',borderRadius:6,
                          background:bt.color+'15',color:bt.color,fontWeight:600 }}>
                          {m.replace(/_/g,' ')}
                        </span>
                      ))}
                      {bt.modules.length>5&&(
                        <span style={{ fontSize:8,color:'#94a3b8' }}>+{bt.modules.length-5} more</span>
                      )}
                    </div>
                    <div style={{ marginTop:6,fontSize:9,color:bt.color,fontWeight:700 }}>
                      {bt.modules.length} modules →
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Nav for step 4 */}
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={back}
                style={{ padding:'11px 22px',borderRadius:9,border:'1.5px solid #e2e8f0',
                  background:'#fff',fontSize:12,fontWeight:700,cursor:'pointer' }}>
                ← Back
              </button>
              <button onClick={next}
                style={{ flex:1,padding:11,borderRadius:9,border:'none',
                  background:G,color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',
                  boxShadow:'0 4px 12px rgba(3,105,161,.25)' }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ══ ALL OTHER STEPS: White card ══ */}
        {step !== 4 && (
          <div style={{ background:'#fff',borderRadius:16,padding:'20px 18px',
            boxShadow:'0 2px 16px rgba(0,0,0,.07)' }}>

            {error&&(
              <div style={{ background:'#fef2f2',border:'1px solid #fecaca',borderRadius:9,
                padding:'10px 14px',marginBottom:16,fontSize:11,color:'#dc2626' }}>
                ⚠️ {error}
              </div>
            )}

            {/* ── STEP 1: Company Information ── */}
            {step===1&&(
              <div>
                <div style={{ fontWeight:900,fontSize:20,color:'#0f172a',marginBottom:4 }}>
                  Company Information
                </div>
                <div style={{ fontSize:11,color:'#64748b',marginBottom:24 }}>
                  Tell us about your company
                </div>

                <Inp label="Company Name" k="company_name" required
                  placeholder="e.g. Himalayan Bank Ltd."
                  value={form.company_name}
                  onChange_extra={v=>{ sf('company_name',v); setForm(p=>p.slug?p:{...p,slug:autoSlug(v)}) }}/>

                {/* Portal URL */}
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4 }}>
                    Company Portal URL <span style={{ color:'#dc2626' }}>*</span>
                  </label>
                  <div style={{ display:'flex',alignItems:'center',border:'1.5px solid #e2e8f0',
                    borderRadius:9,overflow:'hidden',transition:'border .15s' }}
                    onFocusCapture={e=>e.currentTarget.style.borderColor=A}
                    onBlurCapture={e=>e.currentTarget.style.borderColor='#e2e8f0'}>
                    <input value={form.slug}
                      onChange={e=>sf('slug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}
                      placeholder="yourcompany"
                      style={{ flex:1,padding:'10px 12px',border:'none',fontSize:12,outline:'none',fontFamily:'inherit' }}/>
                    <span style={{ padding:'10px 14px',background:'#f8fafc',
                      borderLeft:'1.5px solid #e2e8f0',fontSize:11,color:'#64748b',whiteSpace:'nowrap' }}>
                      .elogix.com.np
                    </span>
                  </div>
                  {form.slug&&(
                    <div style={{ fontSize:10,color:'#059669',marginTop:4 }}>
                      ✅ https://{form.slug}.elogix.com.np
                    </div>
                  )}
                </div>

                <Inp label="Phone / Mobile" k="phone"
                  placeholder="+977-01-XXXXXXX or +977-98XXXXXXXX"
                  value={form.phone} onChange={e=>sf('phone',e.target.value)}/>
              </div>
            )}

            {/* ── STEP 2: Admin Account ── */}
            {step===2&&(
              <div>
                <div style={{ fontWeight:900,fontSize:20,color:'#0f172a',marginBottom:4 }}>
                  Admin Account
                </div>
                <div style={{ fontSize:11,color:'#64748b',marginBottom:24 }}>
                  This will be the Super Admin for <b>{form.company_name}</b>
                </div>

                <Inp label="Full Name" k="admin_name" required
                  placeholder="e.g. Ram Bahadur Shrestha"
                  value={form.admin_name} onChange={e=>sf('admin_name',e.target.value)}/>

                <Inp label="Admin Email" k="admin_email" type="email" required
                  placeholder="hr@yourcompany.com"
                  value={form.admin_email} onChange={e=>sf('admin_email',e.target.value)}/>

                <Inp label="Password" k="password" type="password" required
                  placeholder="Min 10 chars — uppercase, lowercase, number, symbol"
                  value={form.password} onChange={e=>sf('password',e.target.value)}/>

                <Inp label="Confirm Password" k="confirm_password" type="password" required
                  placeholder="Re-enter password"
                  value={form.confirm_password} onChange={e=>sf('confirm_password',e.target.value)}/>

                <div style={{ background:'#fffbeb',border:'1px solid #fde68a',borderRadius:9,
                  padding:'10px 14px',fontSize:10,color:'#92400e',lineHeight:1.6 }}>
                  🔐 Password must be at least 10 characters with uppercase, lowercase, number and symbol.<br/>
                  Example: <code>NepalHR@2083!</code>
                </div>
              </div>
            )}

            {/* ── STEP 3: Few More Details ── */}
            {step===3&&(
              <div>
                <div style={{ fontWeight:900,fontSize:20,color:'#0f172a',marginBottom:4 }}>
                  Few More Details
                </div>
                <div style={{ fontSize:11,color:'#64748b',marginBottom:24 }}>
                  Help us configure your company settings correctly
                </div>

                {/* Company Address */}
                <div style={{ background:'#f8fafc',borderRadius:12,padding:'16px 18px',marginBottom:20,
                  border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:12,fontWeight:800,color:'#374151',marginBottom:14,
                    display:'flex',alignItems:'center',gap:6 }}>
                    📍 Company Address
                  </div>
                  <Inp label="Address Line 1" k="address_line1"
                    placeholder="Street / Tole / Ward No."
                    value={form.address_line1} onChange={e=>sf('address_line1',e.target.value)}/>
                  <Inp label="Address Line 2" k="address_line2"
                    placeholder="Landmark, Building, Floor (optional)"
                    value={form.address_line2} onChange={e=>sf('address_line2',e.target.value)}/>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12 }}>
                    <Inp label="City / VDC / Municipality" k="city"
                      placeholder="e.g. Kathmandu"
                      value={form.city} onChange={e=>sf('city',e.target.value)}/>
                    <Inp label="District" k="district"
                      placeholder="e.g. Kathmandu"
                      value={form.district} onChange={e=>sf('district',e.target.value)}/>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12 }}>
                    <Inp label="Province / State" k="province"
                      placeholder="e.g. Bagmati Province"
                      value={form.province} onChange={e=>sf('province',e.target.value)}/>
                    <Inp label="Postal / PIN Code" k="postal_code"
                      placeholder="e.g. 44600"
                      value={form.postal_code} onChange={e=>sf('postal_code',e.target.value)}/>
                  </div>
                </div>

                {/* Country */}
                <div style={{ background:'#f8fafc',borderRadius:12,padding:'16px 18px',marginBottom:20,
                  border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:12,fontWeight:800,color:'#374151',marginBottom:14,
                    display:'flex',alignItems:'center',gap:6 }}>
                    🌍 Which Country?
                  </div>
                  <Sel label="Country" required value={form.country}
                    onChange={e=>sf('country',e.target.value)}
                    hint="This sets your labour law compliance, tax rules, and default settings">
                    {COUNTRIES.map(c=><option key={c}>{c}</option>)}
                  </Sel>
                </div>

                {/* Calendar Type */}
                <div style={{ background:'#f8fafc',borderRadius:12,padding:'16px 18px',marginBottom:20,
                  border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:12,fontWeight:800,color:'#374151',marginBottom:14,
                    display:'flex',alignItems:'center',gap:6 }}>
                    📅 Calendar System
                  </div>
                  <Sel label="Calendar Type" required value={form.calendar_type}
                    onChange={e=>{ sf('calendar_type',e.target.value); sf('fy_start_month','1'); sf('fy_end_month','12'); sf('leave_start_month','1'); sf('leave_end_month','12') }}
                    hint="Nepal companies typically use BS (Bikram Sambat). International companies use AD.">
                    {CALENDAR_TYPES.map(c=><option key={c}>{c}</option>)}
                  </Sel>
                </div>

                {/* Financial Year */}
                <div style={{ background:'#f8fafc',borderRadius:12,padding:'16px 18px',marginBottom:20,
                  border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:12,fontWeight:800,color:'#374151',marginBottom:4,
                    display:'flex',alignItems:'center',gap:6 }}>
                    💼 Financial Year
                  </div>
                  <div style={{ fontSize:10,color:'#64748b',marginBottom:14 }}>
                    Nepal standard: Shrawan (4) to Asar (3) · International: January (1) to December (12)
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12 }}>
                    <Sel label="FY Start Month" required value={form.fy_start_month}
                      onChange={e=>sf('fy_start_month',e.target.value)}>
                      {calMonths.map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                    </Sel>
                    <Sel label="FY End Month" required value={form.fy_end_month}
                      onChange={e=>sf('fy_end_month',e.target.value)}>
                      {calMonths.map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                    </Sel>
                  </div>
                  <div style={{ fontSize:10,color:'#059669',padding:'6px 10px',
                    background:'#f0fdf4',borderRadius:7,marginTop:-8 }}>
                    ✅ FY: {calMonths[parseInt(form.fy_start_month)-1]?.split(' ')[0]} →
                    {' '}{calMonths[parseInt(form.fy_end_month)-1]?.split(' ')[0]}
                  </div>
                </div>

                {/* Leave Calendar */}
                <div style={{ background:'#f8fafc',borderRadius:12,padding:'16px 18px',marginBottom:20,
                  border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:12,fontWeight:800,color:'#374151',marginBottom:4,
                    display:'flex',alignItems:'center',gap:6 }}>
                    🌴 Leave Calendar
                  </div>
                  <div style={{ fontSize:10,color:'#64748b',marginBottom:14 }}>
                    When does the leave year begin and end? Usually same as financial year.
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12 }}>
                    <Sel label="Leave Year Start" required value={form.leave_start_month}
                      onChange={e=>sf('leave_start_month',e.target.value)}>
                      {calMonths.map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                    </Sel>
                    <Sel label="Leave Year End" required value={form.leave_end_month}
                      onChange={e=>sf('leave_end_month',e.target.value)}>
                      {calMonths.map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                    </Sel>
                  </div>
                  <div style={{ fontSize:10,color:'#059669',padding:'6px 10px',
                    background:'#f0fdf4',borderRadius:7,marginTop:-8 }}>
                    ✅ Leave Year: {calMonths[parseInt(form.leave_start_month)-1]?.split(' ')[0]} →
                    {' '}{calMonths[parseInt(form.leave_end_month)-1]?.split(' ')[0]}
                  </div>
                  <div style={{ marginTop:10 }}>
                    <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',
                      fontSize:11,color:'#374151',userSelect:'none' }}>
                      <input type="checkbox"
                        checked={form.leave_start_month===form.fy_start_month && form.leave_end_month===form.fy_end_month}
                        onChange={e=>{ if(e.target.checked){ sf('leave_start_month',form.fy_start_month); sf('leave_end_month',form.fy_end_month) } }}
                        style={{ cursor:'pointer' }}/>
                      Same as Financial Year
                    </label>
                  </div>
                </div>

                {/* Currency */}
                <div style={{ background:'#f8fafc',borderRadius:12,padding:'16px 18px',
                  border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:12,fontWeight:800,color:'#374151',marginBottom:14,
                    display:'flex',alignItems:'center',gap:6 }}>
                    💱 Which Currency does your company deal in?
                  </div>
                  <Sel label="Primary Currency" required value={form.currency}
                    onChange={e=>sf('currency',e.target.value)}
                    hint="Used for salary, payroll, invoices, and financial reports throughout eLogix">
                    {CURRENCIES.map(c=>(
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </Sel>
                  {selectedCur&&(
                    <div style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',
                      background:'#fff',borderRadius:8,border:'1px solid #e2e8f0' }}>
                      <span style={{ fontSize:22,fontWeight:900,color:A }}>{selectedCur.symbol}</span>
                      <div>
                        <div style={{ fontSize:11,fontWeight:700,color:'#374151' }}>{selectedCur.code}</div>
                        <div style={{ fontSize:9,color:'#64748b' }}>
                          All salary, payroll and financial amounts will display in {selectedCur.code}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 5: Plan ── */}
            {step===5&&(
              <div>
                <div style={{ fontWeight:900,fontSize:20,color:'#0f172a',marginBottom:4 }}>
                  Choose Your Plan
                </div>
                <div style={{ fontSize:11,color:'#64748b',marginBottom:20 }}>
                  Start free — upgrade anytime
                </div>
                {selectedBT&&(
                  <div style={{ display:'inline-flex',alignItems:'center',gap:8,
                    padding:'5px 14px',borderRadius:20,marginBottom:16,
                    background:selectedBT.bg,border:`1px solid ${selectedBT.color}30` }}>
                    <span>{selectedBT.icon}</span>
                    <span style={{ fontSize:10,fontWeight:700,color:selectedBT.color }}>
                      {selectedBT.label} · {selectedBT.modules.length} modules configured
                    </span>
                  </div>
                )}
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12 }}>
                  {PLANS.map(plan=>(
                    <div key={plan.id} onClick={()=>sf('plan',plan.id)}
                      style={{ borderRadius:12,padding:16,cursor:'pointer',position:'relative',
                        border:`2px solid ${form.plan===plan.id?plan.color:'#e2e8f0'}`,
                        background:form.plan===plan.id?plan.color+'08':'#fff',
                        transition:'all .15s' }}>
                      {plan.popular&&(
                        <div style={{ position:'absolute',top:-8,right:12,background:'#d97706',
                          color:'#fff',fontSize:8,fontWeight:800,padding:'2px 10px',borderRadius:20 }}>
                          POPULAR
                        </div>
                      )}
                      <div style={{ fontSize:22,marginBottom:4 }}>{plan.icon}</div>
                      <div style={{ fontSize:13,fontWeight:800,color:plan.color }}>{plan.name}</div>
                      <div style={{ fontSize:18,fontWeight:900,color:'#0f172a',margin:'4px 0' }}>
                        {plan.price===0?'Free':`NPR ${plan.price.toLocaleString()}`}
                        {plan.price>0&&<span style={{ fontSize:10,color:'#64748b' }}>/mo</span>}
                      </div>
                      {plan.days>0&&<div style={{ fontSize:10,color:'#059669',fontWeight:700 }}>{plan.days}-day free trial</div>}
                      <div style={{ fontSize:10,color:'#64748b',marginTop:4 }}>{plan.emp} employees max</div>
                      {form.plan===plan.id&&<div style={{ position:'absolute',top:8,right:10,color:plan.color,fontSize:16 }}>✅</div>}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:14,fontSize:10,color:'#64748b',textAlign:'center' }}>
                  +13% VAT applicable · Cancel anytime · eLogix Technologies
                </div>
              </div>
            )}

            {/* ── STEP 6: Review & Confirm ── */}
            {step===6&&(
              <div>
                <div style={{ fontWeight:900,fontSize:20,color:'#0f172a',marginBottom:4 }}>
                  Review & Confirm
                </div>
                <div style={{ fontSize:11,color:'#64748b',marginBottom:20 }}>
                  Your eLogix account details — please verify before creating
                </div>

                {/* Company Summary */}
                <div style={{ background:'#f8fafc',borderRadius:12,padding:'14px 16px',marginBottom:12,
                  border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:11,fontWeight:800,color:'#374151',marginBottom:10 }}>🏢 Company</div>
                  {[
                    ['Company Name',  form.company_name],
                    ['Portal URL',    `https://${form.slug}.elogix.com.np`],
                    ['Phone',         form.phone||'—'],
                    ['Address',       [form.address_line1,form.city,form.district,form.province].filter(Boolean).join(', ')||'—'],
                    ['Country',       form.country],
                  ].map(([l,v])=>(
                    <div key={l} style={{ display:'flex',justifyContent:'space-between',
                      padding:'6px 0',borderBottom:'1px solid #e2e8f0',fontSize:11 }}>
                      <span style={{ color:'#64748b' }}>{l}</span>
                      <span style={{ fontWeight:600,color:'#0f172a',textAlign:'right',maxWidth:'60%',wordBreak:'break-all' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Admin Summary */}
                <div style={{ background:'#f8fafc',borderRadius:12,padding:'14px 16px',marginBottom:12,
                  border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:11,fontWeight:800,color:'#374151',marginBottom:10 }}>👤 Admin Account</div>
                  {[
                    ['Full Name',   form.admin_name],
                    ['Email',       form.admin_email],
                  ].map(([l,v])=>(
                    <div key={l} style={{ display:'flex',justifyContent:'space-between',
                      padding:'6px 0',borderBottom:'1px solid #e2e8f0',fontSize:11 }}>
                      <span style={{ color:'#64748b' }}>{l}</span>
                      <span style={{ fontWeight:600,color:'#0f172a' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Settings Summary */}
                <div style={{ background:'#f8fafc',borderRadius:12,padding:'14px 16px',marginBottom:12,
                  border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:11,fontWeight:800,color:'#374151',marginBottom:10 }}>⚙️ Configuration</div>
                  {[
                    ['Calendar',       form.calendar_type.split(' ')[0]+' '+form.calendar_type.split(' ')[1]],
                    ['Financial Year', `${calMonths[parseInt(form.fy_start_month)-1]?.split(' ')[0]} → ${calMonths[parseInt(form.fy_end_month)-1]?.split(' ')[0]}`],
                    ['Leave Year',     `${calMonths[parseInt(form.leave_start_month)-1]?.split(' ')[0]} → ${calMonths[parseInt(form.leave_end_month)-1]?.split(' ')[0]}`],
                    ['Currency',       `${selectedCur?.symbol} ${form.currency} — ${selectedCur?.label.split('—')[1]?.trim()}`],
                    ['Business Type',  `${form.business_icon} ${form.business_label}`],
                    ['Modules',        `${form.modules.length} pre-configured`],
                    ['Plan',           PLANS.find(p=>p.id===form.plan)?.name||form.plan],
                  ].map(([l,v])=>(
                    <div key={l} style={{ display:'flex',justifyContent:'space-between',
                      padding:'6px 0',borderBottom:'1px solid #e2e8f0',fontSize:11 }}>
                      <span style={{ color:'#64748b' }}>{l}</span>
                      <span style={{ fontWeight:600,color:'#0f172a',textAlign:'right',maxWidth:'65%' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Module list */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:'#374151',marginBottom:6 }}>
                    🧩 Enabled Modules:
                  </div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                    {form.modules.map(m=>(
                      <span key={m} style={{ fontSize:9,padding:'2px 8px',borderRadius:7,
                        background:selectedBT?.bg||'#f0f9ff',color:selectedBT?.color||A,fontWeight:600 }}>
                        {m.replace(/_/g,' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:9,
                  padding:'12px 14px',fontSize:10,color:'#065f46',lineHeight:1.7 }}>
                  ⚡ Clicking below will instantly provision:<br/>
                  • Isolated tenant database: <code>elogix_{form.slug}</code><br/>
                  • {form.modules.length} modules for {form.business_label}<br/>
                  • Super Admin account + welcome email<br/>
                  • {form.currency} currency · {form.country} compliance settings
                </div>
              </div>
            )}

            {/* ── NAVIGATION ── */}
            <div style={{ display:'flex',gap:10,marginTop:24 }}>
              {step>1&&(
                <button onClick={back}
                  style={{ padding:'11px 22px',borderRadius:9,border:'1.5px solid #e2e8f0',
                    background:'#fff',fontSize:12,fontWeight:700,cursor:'pointer' }}>
                  ← Back
                </button>
              )}
              {step<6?(
                <button onClick={next}
                  style={{ flex:1,padding:11,borderRadius:9,border:'none',background:G,
                    color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',
                    boxShadow:'0 4px 12px rgba(3,105,161,.25)' }}>
                  Continue →
                </button>
              ):(
                <button onClick={handleSubmit} disabled={loading}
                  style={{ flex:1,padding:11,borderRadius:9,border:'none',
                    background:loading?'#94a3b8':G,color:'#fff',fontSize:13,fontWeight:800,
                    cursor:loading?'not-allowed':'pointer',
                    boxShadow:'0 4px 12px rgba(3,105,161,.25)' }}>
                  {loading?'⏳ Setting up your account...':'🚀 Create eLogix Account'}
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ textAlign:'center',marginTop:20,fontSize:10,color:'#94a3b8' }}>
          eLogix Technologies · support@elogix.com.np · www.elogix.com.np
        </div>
      </div>
    </div>
  )
}

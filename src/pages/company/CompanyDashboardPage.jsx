// FILE: src/pages/company/CompanyDashboardPage.jsx
// eLogix HRMS — Tenant Company Dashboard
// First page tenant super_admin sees after login
// Shows: company info, modules, employee count, quick actions
// Reads from localStorage auth + hits /api/v1/dashboard/company
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect } from 'react'

const A = '#0369a1'
const G = 'linear-gradient(135deg,#0c4a6e,#0369a1,#38bdf8)'

const BT_CFG = {
  recruitment_agency: { icon:'🎯', label:'Recruitment Agency',  color:'#e11d48' },
  bank_finance:       { icon:'🏦', label:'Bank / Finance',      color:'#0369a1' },
  hospital_health:    { icon:'🏥', label:'Hospital / Healthcare',color:'#059669' },
  ngo_ingo:           { icon:'🌱', label:'NGO / INGO',          color:'#d97706' },
  it_software:        { icon:'💻', label:'IT / Software',        color:'#7c3aed' },
  manufacturing:      { icon:'🏭', label:'Manufacturing',        color:'#64748b' },
  hotel_hospitality:  { icon:'🏨', label:'Hotel / Hospitality', color:'#c2410c' },
  education:          { icon:'🎓', label:'Education',           color:'#0891b2' },
  government:         { icon:'🏛️', label:'Government',          color:'#374151' },
  custom:             { icon:'⚙️', label:'Custom',              color:'#6b7280' },
}

const PLAN_CFG = {
  trial:      { label:'14-Day Free Trial', color:'#059669', emp:10   },
  starter:    { label:'Starter',           color:'#0891b2', emp:50   },
  growth:     { label:'Growth',            color:'#0369a1', emp:250  },
  business:   { label:'Business',          color:'#7c3aed', emp:500  },
  enterprise: { label:'Enterprise',        color:'#d97706', emp:1000 },
  unlimited:  { label:'Unlimited',         color:'#0f172a', emp:9999 },
}

const QUICK_ACTIONS = [
  { icon:'👤', label:'Add Employee',         route:'add-employee',      color:'#0369a1' },
  { icon:'📅', label:'Mark Attendance',      route:'attendance-today',  color:'#059669' },
  { icon:'🏖️', label:'Leave Requests',       route:'leave-requests',   color:'#d97706' },
  { icon:'💰', label:'Run Payroll',          route:'payroll-processing',color:'#7c3aed' },
  { icon:'🎯', label:'Post Job',             route:'ats-job-postings',  color:'#e11d48' },
  { icon:'📊', label:'View Reports',         route:'reports',           color:'#0891b2' },
  { icon:'⚙️', label:'Company Settings',     route:'company-setup',     color:'#374151' },
  { icon:'👥', label:'Manage Users',         route:'user-management',   color:'#64748b' },
]

export default function CompanyDashboardPage() {
  const [dashData, setDashData] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  // ── Load tenant data ────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Try real API first
        const token = localStorage.getItem('elogix_token') ||
          JSON.parse(localStorage.getItem('elogix_auth')||'{}').token
        if (token) {
          const res = await fetch('/api/v1/dashboard/company', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) {
            const d = await res.json()
            setDashData(d.data || d)
            setLoading(false)
            return
          }
        }
      } catch { /* fallback to localStorage */ }

      // Fallback: read from localStorage auth data
      try {
        const auth = JSON.parse(localStorage.getItem('elogix_auth') || '{}')
        const regCos = JSON.parse(localStorage.getItem('elogix_registered_companies') || '{}')
        const company = auth.company || {}
        const user    = auth.user    || {}
        const slug    = company.slug || user.company || 'demo'
        const regData = regCos[slug] || {}

        setDashData({
          company: {
            name:          company.name || regData.name || 'Your Company',
            slug:          slug,
            plan:          company.plan || regData.plan || 'trial',
            status:        company.status || regData.status || 'active',
            business_type: company.business_type || regData.business_type || 'custom',
            country:       company.country || regData.country || 'Nepal',
            currency:      company.currency || regData.currency || 'NPR',
            created_at:    company.created_at || regData.created_at || new Date().toISOString().split('T')[0],
            modules:       company.modules || regData.modules || [],
          },
          user: {
            name:  user.full_name || user.name || 'Admin',
            email: user.email || auth.email || '',
            role:  user.role || 'super_admin',
            emp_id:user.emp_id || 'ELX-0001',
          },
          stats: {
            total_employees: 0,
            active_today:    0,
            pending_leaves:  0,
            open_jobs:       0,
          }
        })
      } catch(e) {
        setError('Could not load company data. Please refresh.')
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const navTo = (route) => {
    // Navigate to the route in App.jsx
    window.dispatchEvent(new CustomEvent('elogix:navigate', { detail: route }))
  }

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',
      height:'60vh',fontFamily:'system-ui,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48,marginBottom:16 }}>⏳</div>
        <div style={{ fontSize:14,color:'#64748b' }}>Loading your dashboard...</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',
      height:'60vh',fontFamily:'system-ui,sans-serif' }}>
      <div style={{ textAlign:'center',maxWidth:400 }}>
        <div style={{ fontSize:48,marginBottom:16 }}>⚠️</div>
        <div style={{ fontSize:14,color:'#dc2626',marginBottom:16 }}>{error}</div>
        <button onClick={()=>window.location.reload()}
          style={{ padding:'10px 24px',borderRadius:9,border:'none',background:A,
            color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer' }}>
          Refresh Page
        </button>
      </div>
    </div>
  )

  const co    = dashData?.company || {}
  const user  = dashData?.user    || {}
  const stats = dashData?.stats   || {}
  const bt    = BT_CFG[co.business_type] || BT_CFG.custom
  const plan  = PLAN_CFG[co.plan] || PLAN_CFG.trial
  const modules_count = (co.modules || []).length

  return (
    <div style={{ fontFamily:'system-ui,sans-serif',minHeight:'100%',
      background:'#f0f9ff',overflowY:'auto',WebkitOverflowScrolling:'touch' }}>

      {/* Header */}
      <div style={{ background:G,padding:'20px 24px',borderRadius:'0 0 16px 16px',marginBottom:16 }}>
        <div style={{ display:'flex',justifyContent:'space-between',
          alignItems:'flex-start',flexWrap:'wrap',gap:12 }}>
          <div>
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:6 }}>
              <span style={{ fontSize:28 }}>{bt.icon}</span>
              <div>
                <div style={{ fontSize:18,fontWeight:900,color:'#fff' }}>{co.name}</div>
                <div style={{ fontSize:10,color:'rgba(255,255,255,.7)' }}>
                  {co.slug}.elogix.com.np · {bt.label}
                </div>
              </div>
            </div>
            <div style={{ fontSize:11,color:'rgba(255,255,255,.85)' }}>
              Welcome back, <b>{user.name}</b> · {user.emp_id}
            </div>
          </div>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            <div style={{ background:'rgba(255,255,255,.15)',borderRadius:10,
              padding:'8px 14px',textAlign:'center',minWidth:90 }}>
              <div style={{ fontSize:14,fontWeight:900,color:'#fff' }}>
                {plan.label}
              </div>
              <div style={{ fontSize:9,color:'rgba(255,255,255,.65)' }}>Current Plan</div>
            </div>
            <div style={{ background:'rgba(255,255,255,.15)',borderRadius:10,
              padding:'8px 14px',textAlign:'center',minWidth:90 }}>
              <div style={{ fontSize:14,fontWeight:900,color:'#fff' }}>
                {modules_count} Modules
              </div>
              <div style={{ fontSize:9,color:'rgba(255,255,255,.65)' }}>Enabled</div>
            </div>
            <div style={{ background:'rgba(255,255,255,.15)',borderRadius:10,
              padding:'8px 14px',textAlign:'center',minWidth:90 }}>
              <div style={{ fontSize:14,fontWeight:900,
                color:co.status==='active'?'#86efac':'#fde68a' }}>
                {co.status==='trial'?'🎁 Trial':co.status==='active'?'✅ Active':'⏳ Pending'}
              </div>
              <div style={{ fontSize:9,color:'rgba(255,255,255,.65)' }}>Status</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'0 20px 24px' }}>

        {/* Stats row */}
        <div style={{ display:'grid',
          gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',
          gap:12,marginBottom:16 }}>
          {[
            { icon:'👥', label:'Total Employees',   value:stats.total_employees||0,     color:'#0369a1' },
            { icon:'✅', label:'Active Today',       value:stats.active_today||0,         color:'#059669' },
            { icon:'🏖️', label:'Pending Leaves',    value:stats.pending_leaves||0,       color:'#d97706' },
            { icon:'🎯', label:'Open Positions',    value:stats.open_jobs||0,            color:'#7c3aed' },
          ].map(s=>(
            <div key={s.label} style={{ background:'#fff',borderRadius:12,padding:'14px 16px',
              boxShadow:'0 2px 8px rgba(0,0,0,.06)',borderTop:`3px solid ${s.color}` }}>
              <div style={{ fontSize:20,marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:22,fontWeight:900,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10,color:'#64748b',marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ background:'#fff',borderRadius:12,padding:16,
          boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:16 }}>
          <div style={{ fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:12 }}>
            ⚡ Quick Actions
          </div>
          <div style={{ display:'grid',
            gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10 }}>
            {QUICK_ACTIONS.map(a=>(
              <button key={a.route} onClick={()=>navTo(a.route)}
                style={{ padding:'14px 10px',borderRadius:10,border:'none',cursor:'pointer',
                  background:a.color+'10',border:`1px solid ${a.color}20`,
                  textAlign:'center',transition:'all .15s' }}
                onMouseEnter={e=>{ e.currentTarget.style.background=a.color+'20';
                  e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e=>{ e.currentTarget.style.background=a.color+'10';
                  e.currentTarget.style.transform='none' }}>
                <div style={{ fontSize:22,marginBottom:6 }}>{a.icon}</div>
                <div style={{ fontSize:10,fontWeight:700,color:a.color }}>{a.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Setup progress */}
        {co.status==='trial' && (
          <div style={{ background:'#fff',borderRadius:12,padding:16,
            boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:16,
            border:'1.5px solid #bae6fd' }}>
            <div style={{ fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:8 }}>
              🚀 Setup Checklist — Complete your setup
            </div>
            {[
              { done:true,  label:'Company registered',           action:null },
              { done:stats.total_employees>0, label:'Add first employee', action:'add-employee' },
              { done:false, label:'Configure biometric device',   action:'biometric-attendance' },
              { done:false, label:'Set up payroll structure',     action:'salary-structure' },
              { done:false, label:'Import existing employees',    action:'employee-import' },
              { done:false, label:'Upgrade to paid plan',        action:'billing' },
            ].map((item,i)=>(
              <div key={i} style={{ display:'flex',alignItems:'center',gap:10,
                padding:'8px 0',borderBottom:'1px solid #f1f5f9' }}>
                <span style={{ fontSize:16 }}>{item.done?'✅':'⭕'}</span>
                <span style={{ fontSize:11,color:item.done?'#64748b':'#0f172a',
                  flex:1,textDecoration:item.done?'line-through':'' }}>{item.label}</span>
                {!item.done && item.action && (
                  <button onClick={()=>navTo(item.action)}
                    style={{ padding:'4px 12px',borderRadius:7,border:'none',
                      background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer' }}>
                    Do it →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Company info */}
        <div style={{ background:'#fff',borderRadius:12,padding:16,
          boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:12 }}>
            🏢 Company Information
          </div>
          <div style={{ display:'grid',
            gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10 }}>
            {[
              ['Portal URL',      `${co.slug}.elogix.com.np`],
              ['Business Type',   bt.label],
              ['Country',         co.country||'Nepal'],
              ['Currency',        co.currency||'NPR'],
              ['Plan',            plan.label],
              ['Max Employees',   plan.emp.toLocaleString()],
              ['Modules',         `${modules_count} enabled`],
              ['Member Since',    co.created_at||'—'],
            ].map(([lb,v])=>(
              <div key={lb} style={{ padding:'10px 12px',background:'#f8fafc',
                borderRadius:9,border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:9,color:'#94a3b8',marginBottom:2 }}>{lb}</div>
                <div style={{ fontSize:11,fontWeight:700,color:'#0f172a',
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

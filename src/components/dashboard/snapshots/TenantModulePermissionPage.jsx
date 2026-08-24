// FILE: src/components/dashboard/snapshots/TenantModulePermissionPage.jsx
// eLogix HRMS — SuperAdmin: Tenant Module & Permission Control
// SuperAdmin controls which modules/features each tenant company can access
// Business Types: Recruitment Agency, Bank, Hospital, NGO, IT Company, etc.
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect } from 'react'
import {
  saveTenantModules, getTenantModules, getTenantPermissionRecord,
  computeDefaultModules, provisionTenantPermissions,
  PLAN_DEFAULT_MODULES, BUSINESS_TYPE_EXTRA_MODULES,
} from '../../../utils/tenantPermissions.js'

const A = '#7c3aed'
const G = 'linear-gradient(135deg,#1e1b4b,#7c3aed,#a78bfa)'

// ── ALL 48 MODULES (full eLogix HRMS) ────────────────────────
const ALL_MODULES = [
  // Core HR
  { id:'employee',        group:'Core HR',       icon:'👤', label:'Employee Management',      desc:'Employee profiles, documents, lifecycle' },
  { id:'org_setup',       group:'Core HR',       icon:'🏢', label:'Organization Setup',        desc:'Company, branch, department, designation' },
  { id:'attendance',      group:'Core HR',       icon:'⏰', label:'Attendance & Time',          desc:'Punch in/out, shifts, GPS, biometric' },
  { id:'leave',           group:'Core HR',       icon:'📅', label:'Leave Management',           desc:'Leave types, balances, approvals' },
  { id:'payroll',         group:'Core HR',       icon:'💰', label:'Payroll & Salary',           desc:'Salary, SSF, CIT, gratuity, payslip' },
  { id:'self_service',    group:'Core HR',       icon:'📱', label:'Employee Self Service',      desc:'ESS portal, requests, documents' },
  { id:'documents',       group:'Core HR',       icon:'📄', label:'Document Management',        desc:'HR letters, contracts, certificates' },
  // Recruitment
  { id:'ats',             group:'Recruitment',   icon:'🎯', label:'ATS / Recruitment',          desc:'Job postings, applications, pipeline' },
  { id:'job_portal',      group:'Recruitment',   icon:'🌐', label:'Career Portal',              desc:'Company job page, apply now' },
  { id:'interview',       group:'Recruitment',   icon:'🎤', label:'Interview Management',       desc:'Schedule, feedback, scoring' },
  { id:'onboarding',      group:'Recruitment',   icon:'🚀', label:'Onboarding',                 desc:'Welcome kit, induction, buddy' },
  { id:'jd_library',      group:'Recruitment',   icon:'📋', label:'JD Library',                 desc:'Job description templates' },
  { id:'candidate_pool',  group:'Recruitment',   icon:'👥', label:'Candidate Pool / CV Bank',   desc:'CV database, talent sourcing' },
  { id:'outsource',       group:'Recruitment',   icon:'🤝', label:'Outsource / Vendor Mgmt',    desc:'Manpower suppliers, contracts' },
  // Performance
  { id:'performance',     group:'Performance',   icon:'📈', label:'Performance Management',     desc:'KPI, OKR, appraisals, reviews' },
  { id:'goals',           group:'Performance',   icon:'🎯', label:'Goals & OKR',                desc:'Goal setting, tracking, alignment' },
  { id:'360_feedback',    group:'Performance',   icon:'🔄', label:'360° Feedback',              desc:'Peer, subordinate, manager feedback' },
  { id:'pip',             group:'Performance',   icon:'📊', label:'PIP / Improvement Plans',    desc:'Performance improvement tracking' },
  // Training & Development
  { id:'training',        group:'Training',      icon:'📚', label:'Training & LMS',             desc:'Courses, completion, certificates' },
  { id:'skill_matrix',    group:'Training',      icon:'🧩', label:'Skill Matrix',               desc:'Skills, gaps, development plans' },
  { id:'career_pathing',  group:'Training',      icon:'🗺️', label:'Career Pathing',             desc:'Growth paths, succession planning' },
  // Finance & Compliance
  { id:'finance',         group:'Finance',       icon:'💳', label:'Finance & Budget',           desc:'HR budget, cost centers' },
  { id:'compliance',      group:'Finance',       icon:'⚖️', label:'Labour Law Compliance',      desc:'Nepal Labour Act 2074, SSF, audit' },
  { id:'tax',             group:'Finance',       icon:'🧮', label:'Tax & CIT',                  desc:'Income tax, TDS, IRD filing' },
  { id:'loan',            group:'Finance',       icon:'🏦', label:'Loan & Advance',             desc:'Salary advance, loan management' },
  { id:'expense',         group:'Finance',       icon:'🧾', label:'Expense Management',         desc:'Reimbursements, claims' },
  // Analytics & AI
  { id:'ai_chatbot',      group:'AI & Analytics',icon:'🤖', label:'AI HR Chatbot',              desc:'AI assistant for HR queries' },
  { id:'ai_bi',           group:'AI & Analytics',icon:'🧠', label:'AI Business Intelligence',   desc:'Strategic HR analytics, forecasts' },
  { id:'reports',         group:'AI & Analytics',icon:'📊', label:'Reports & Analytics',        desc:'HR dashboards, custom reports' },
  { id:'ai_letters',      group:'AI & Analytics',icon:'✉️', label:'AI Letter Generator',        desc:'Auto-draft HR letters, MOM' },
  // Workforce Planning
  { id:'manpower',        group:'Workforce',     icon:'📐', label:'Manpower Planning',          desc:'Headcount planning, budgeting' },
  { id:'org_chart',       group:'Workforce',     icon:'🌳', label:'Org Chart',                  desc:'Hierarchy visualization' },
  { id:'roster',          group:'Workforce',     icon:'📆', label:'Roster & Duty',              desc:'Duty roster, shift scheduling' },
  { id:'overtime',        group:'Workforce',     icon:'⏱️', label:'Overtime Management',        desc:'OT approval, calculations' },
  // Communication
  { id:'announcements',   group:'Communication', icon:'📢', label:'Announcements',              desc:'Company news, notices' },
  { id:'helpdesk',        group:'Communication', icon:'🎫', label:'HR Helpdesk',               desc:'Ticket system, grievances' },
  { id:'exit',            group:'Communication', icon:'🚪', label:'Exit Management',            desc:'Resignation, clearance, FnF' },
  // Integrations
  { id:'integrations',    group:'Integrations',  icon:'🔗', label:'Job Board Integrations',     desc:'MeroJob, LinkedIn, Indeed etc.' },
  { id:'biometric',       group:'Integrations',  icon:'👁️', label:'Biometric Integration',     desc:'Device sync, attendance import' },
  { id:'accounting',      group:'Integrations',  icon:'📒', label:'Accounting Integration',     desc:'Tally, QuickBooks sync' },
  { id:'api_access',      group:'Integrations',  icon:'⚡', label:'API Access',                 desc:'REST API, webhooks, custom apps' },
  // Admin
  { id:'permissions',     group:'Admin',         icon:'🔐', label:'Role & Permissions',         desc:'RBAC, access control' },
  { id:'audit_log',       group:'Admin',         icon:'📜', label:'Audit Log',                  desc:'Activity trail, compliance' },
  { id:'billing',         group:'Admin',         icon:'💳', label:'Billing & Subscription',     desc:'Plan, invoices, upgrades' },
  { id:'white_label',     group:'Admin',         icon:'🎨', label:'White Label / Branding',     desc:'Custom logo, colors, domain' },
  { id:'multi_branch',    group:'Admin',         icon:'🌿', label:'Multi-Branch / Entity',      desc:'Multiple locations, companies' },
  { id:'sso',             group:'Admin',         icon:'🔑', label:'SSO / OAuth Login',          desc:'Google, Microsoft, SAML login' },
]

// ── BUSINESS TYPE TEMPLATES ────────────────────────────────────
const BUSINESS_TYPES = [
  {
    id:'recruitment_agency',
    label:'Recruitment Agency',
    icon:'🎯',
    color:'#e11d48',
    bg:'#fff1f2',
    desc:'Manpower agencies, placement firms, headhunters',
    modules: ['ats','job_portal','interview','candidate_pool','jd_library','outsource',
              'onboarding','documents','employee','self_service','ai_chatbot','ai_letters',
              'integrations','reports','helpdesk'],
  },
  {
    id:'bank_finance',
    label:'Bank / Finance',
    icon:'🏦',
    color:'#0369a1',
    bg:'#eff6ff',
    desc:'Banks, insurance, NBFCs, cooperatives',
    modules: ['employee','org_setup','attendance','leave','payroll','self_service','documents',
              'performance','goals','training','skill_matrix','career_pathing','finance',
              'compliance','tax','loan','expense','reports','ai_bi','audit_log','permissions',
              'sso','multi_branch','announcements','helpdesk','exit','org_chart','roster'],
  },
  {
    id:'hospital_health',
    label:'Hospital / Healthcare',
    icon:'🏥',
    color:'#059669',
    bg:'#f0fdf4',
    desc:'Hospitals, clinics, diagnostic centers, pharma',
    modules: ['employee','org_setup','attendance','leave','payroll','self_service','documents',
              'roster','overtime','training','compliance','reports','helpdesk','exit',
              'announcements','org_chart','performance','loan','expense','ai_chatbot'],
  },
  {
    id:'ngo_ingo',
    label:'NGO / INGO / Donor',
    icon:'🌱',
    color:'#d97706',
    bg:'#fffbeb',
    desc:'Non-profits, INGOs, development organizations',
    modules: ['employee','org_setup','attendance','leave','payroll','self_service','documents',
              'compliance','reports','training','performance','helpdesk','announcements',
              'exit','org_chart','ai_chatbot','ai_letters','expense'],
  },
  {
    id:'it_software',
    label:'IT / Software Company',
    icon:'💻',
    color:'#7c3aed',
    bg:'#f5f3ff',
    desc:'Software, SaaS, IT services, startups',
    modules: ['employee','org_setup','attendance','leave','payroll','self_service','documents',
              'ats','job_portal','interview','onboarding','jd_library','candidate_pool',
              'performance','goals','360_feedback','training','skill_matrix','career_pathing',
              'reports','ai_bi','ai_chatbot','api_access','integrations','sso','helpdesk',
              'announcements','exit','org_chart','permissions'],
  },
  {
    id:'manufacturing',
    label:'Manufacturing / Factory',
    icon:'🏭',
    color:'#64748b',
    bg:'#f8fafc',
    desc:'Factories, production units, industrial companies',
    modules: ['employee','org_setup','attendance','leave','payroll','self_service','documents',
              'roster','overtime','training','compliance','tax','loan','reports','helpdesk',
              'exit','announcements','org_chart','performance','expense','biometric'],
  },
  {
    id:'hotel_hospitality',
    label:'Hotel / Hospitality',
    icon:'🏨',
    color:'#c2410c',
    bg:'#fff7ed',
    desc:'Hotels, restaurants, tourism, travel agencies',
    modules: ['employee','org_setup','attendance','leave','payroll','self_service','documents',
              'roster','overtime','training','compliance','reports','helpdesk','exit',
              'announcements','org_chart','biometric','expense'],
  },
  {
    id:'school_university',
    label:'Education / University',
    icon:'🎓',
    color:'#0891b2',
    bg:'#f0f9ff',
    desc:'Schools, colleges, universities, training institutes',
    modules: ['employee','org_setup','attendance','leave','payroll','self_service','documents',
              'performance','training','compliance','reports','helpdesk','exit','announcements',
              'org_chart','ai_chatbot','ai_letters'],
  },
  {
    id:'government',
    label:'Government / Public Sector',
    icon:'🏛️',
    color:'#374151',
    bg:'#f9fafb',
    desc:'Government offices, public enterprises, municipalities',
    modules: ['employee','org_setup','attendance','leave','payroll','self_service','documents',
              'compliance','tax','reports','audit_log','helpdesk','exit','announcements',
              'org_chart','permissions','multi_branch'],
  },
  {
    id:'custom',
    label:'Custom / Other',
    icon:'⚙️',
    color:'#6b7280',
    bg:'#f3f4f6',
    desc:'Any other business type — configure manually',
    modules: ['employee','attendance','leave','payroll','self_service'],
  },
]

// ── DEMO TENANTS ──────────────────────────────────────────────
// ── Load real approved tenants from localStorage ──────────────────────
function loadAllTenants() {
  try {
    const sources = []
    const active = JSON.parse(localStorage.getItem('elogix_active_companies') || '[]')
    active.forEach((t, i) => sources.push({
      id: t.id || `live-${t.slug || i}`,
      name: t.name, slug: t.slug,
      type: t.business_type || 'custom',
      plan: (t.plan||'trial').charAt(0).toUpperCase()+(t.plan||'trial').slice(1),
      employees: t.employee_count || 0,
      status: t.status || 'active',
      joined: (t.approved_at||new Date().toISOString()).split('T')[0],
      admin_email: t.admin_email||'',
    }))
    const registry = JSON.parse(localStorage.getItem('elogix_approved_tenants') || '{}')
    Object.values(registry).forEach((t, i) => {
      if (!sources.find(s => s.slug === t.slug)) sources.push({
        id: t.id || `reg-${t.slug||i}`,
        name: t.name, slug: t.slug,
        type: t.business_type || 'custom',
        plan: (t.plan||'trial').charAt(0).toUpperCase()+(t.plan||'trial').slice(1),
        employees: t.employee_count || 0,
        status: t.status || 'active',
        joined: (t.approved_at||new Date().toISOString()).split('T')[0],
        admin_email: t.admin_email||'',
      })
    })
    if (sources.length > 0) return sources
  } catch(_e) {}
  // Default: real eLogix tenants
  return [
    { id:'c1', name:'Abasar Nepal',              slug:'abasarnepal',     type:'recruitment_agency', plan:'Starter', employees:0, status:'active', joined:'2083-05-04' },
    { id:'c2', name:'Subisu Cablenet Pvt. Ltd.', slug:'subisu',          type:'it_software',        plan:'Growth',  employees:0, status:'active', joined:'2083-05-05' },
    { id:'c3', name:'Mainawati Steels',           slug:'mainawatisteels', type:'manufacturing',      plan:'Starter', employees:0, status:'active', joined:'2083-05-05' },
    { id:'c4', name:'HR Hub',                     slug:'hrhub',           type:'custom',             plan:'Trial',   employees:0, status:'trial',  joined:'2083-05-05' },
  ]
}
const DEMO_TENANTS = loadAllTenants()

const GROUP_ORDER = ['Core HR','Recruitment','Performance','Training','Finance','AI & Analytics','Workforce','Communication','Integrations','Admin']
const PLAN_COLORS = { Enterprise:'#7c3aed', Business:'#0369a1', Growth:'#059669', Starter:'#d97706', Trial:'#64748b' }
const STATUS_COLORS = { active:'#16a34a', trial:'#d97706', suspended:'#dc2626', inactive:'#6b7280' }

export default function TenantModulePermissionPage() {
  const [selTenant, setSelTenant] = useState(DEMO_TENANTS[0].id)
  const [search, setSearch]       = useState('')
  const [groupFilter, setGroupFilter] = useState('All')
  const [toast, setToast]         = useState('')
  const [showBizType, setShowBizType] = useState(false)

  // Per-tenant module state
  const [tenantModules, setTenantModules] = useState(() => {
    const init = {}
    DEMO_TENANTS.forEach(t => {
      const bt = BUSINESS_TYPES.find(b => b.id === t.type)
      init[t.id] = new Set(bt?.modules || ['employee','attendance','leave','payroll','self_service'])
    })
    return init
  })

  const notify = m => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const tenant   = DEMO_TENANTS.find(t => t.id === selTenant)
  const bt       = BUSINESS_TYPES.find(b => b.id === tenant?.type)
  const enabled  = tenantModules[selTenant] || new Set()
  const filtered = DEMO_TENANTS.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.type.toLowerCase().includes(search.toLowerCase())
  )

  const toggleModule = (modId) => {
    setTenantModules(prev => {
      const s = new Set(prev[selTenant])
      s.has(modId) ? s.delete(modId) : s.add(modId)
      return { ...prev, [selTenant]: s }
    })
  }

  const applyTemplate = (bt) => {
    setTenantModules(prev => ({ ...prev, [selTenant]: new Set(bt.modules) }))
    notify(`✅ ${bt.label} template applied — ${bt.modules.length} modules enabled`)
    setShowBizType(false)
  }

  const enableAll  = () => { setTenantModules(p => ({ ...p, [selTenant]: new Set(ALL_MODULES.map(m=>m.id)) })); notify('✅ All modules enabled') }
  const disableAll = () => { setTenantModules(p => ({ ...p, [selTenant]: new Set(['employee','self_service']) })); notify('⚠️ All modules disabled (Core HR only)') }
  const saveConfig = () => notify(`✅ ${tenant?.name} permissions saved — ${enabled.size} modules active`)

  const displayModules = ALL_MODULES.filter(m => {
    const gOk = groupFilter === 'All' || m.group === groupFilter
    return gOk
  })

  return (
    <div style={{fontFamily:'system-ui,sans-serif',paddingBottom:60,minHeight:'100%',paddingBottom:60,background:'#f8f5ff'}}>
      {toast && (
        <div style={{ position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f5f3ff',
          border:'1px solid #ddd6fe',borderRadius:12,padding:'12px 20px',
          fontSize:11,color:'#4c1d95',fontWeight:700,boxShadow:'0 4px 20px rgba(0,0,0,.12)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background:G,padding:'16px 24px',borderRadius:'0 0 16px 16px',marginBottom:16 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
          <div>
            <div style={{ fontSize:18,fontWeight:900,color:'#fff' }}>🔐 Tenant Module Permission Control</div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2 }}>
              eLogix SuperAdmin · Control which modules each tenant company can access
            </div>
          </div>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            {[{l:'Total Tenants',v:DEMO_TENANTS.length,i:'🏢'},
              {l:'Active',v:DEMO_TENANTS.filter(t=>t.status==='active').length,i:'✅'},
              {l:'Trial',v:DEMO_TENANTS.filter(t=>t.status==='trial').length,i:'⏳'},
              {l:'Total Modules',v:ALL_MODULES.length,i:'🧩'},
            ].map(s=>(
              <div key={s.l} style={{ background:'rgba(255,255,255,.15)',borderRadius:10,padding:'8px 14px',textAlign:'center',minWidth:80 }}>
                <div style={{ fontSize:15,fontWeight:900,color:'#fff' }}>{s.i} {s.v}</div>
                <div style={{ fontSize:8,color:'rgba(255,255,255,.65)' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'280px 1fr',gap:16,padding:'0 20px 24px' }}>

        {/* ── LEFT: Tenant List ── */}
        <div>
          <div style={{ background:'#fff',borderRadius:12,padding:14,boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:12 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search tenants..."
              style={{ width:'100%',padding:'8px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',
                fontSize:11,outline:'none',boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor=A}
              onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
          </div>
          <div style={{ background:'#fff',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,.06)',overflow:'hidden' }}>
            {filtered.map(t => {
              const bt2 = BUSINESS_TYPES.find(b=>b.id===t.type)
              const mods = tenantModules[t.id]?.size || 0
              const isActive = t.id === selTenant
              return (
                <div key={t.id} onClick={()=>setSelTenant(t.id)}
                  style={{ padding:'12px 14px',borderBottom:'1px solid #f1f5f9',cursor:'pointer',
                    background:isActive?'#f5f3ff':'#fff',
                    borderLeft:`3px solid ${isActive?A:'transparent'}`,transition:'all .12s' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <span style={{ fontSize:18,flexShrink:0 }}>{bt2?.icon||'🏢'}</span>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:11,fontWeight:700,color:isActive?A:'#0f172a',
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{t.name}</div>
                      <div style={{ display:'flex',gap:4,marginTop:2,flexWrap:'wrap' }}>
                        <span style={{ fontSize:8,padding:'1px 6px',borderRadius:8,fontWeight:700,
                          background:(PLAN_COLORS[t.plan]||'#64748b')+'18',
                          color:PLAN_COLORS[t.plan]||'#64748b' }}>{t.plan}</span>
                        <span style={{ fontSize:8,padding:'1px 6px',borderRadius:8,fontWeight:700,
                          background:(STATUS_COLORS[t.status]||'#64748b')+'18',
                          color:STATUS_COLORS[t.status]||'#64748b' }}>{t.status}</span>
                        <span style={{ fontSize:8,color:'#94a3b8' }}>{mods} modules</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT: Module Config ── */}
        <div>
          {/* Tenant Header */}
          {tenant && (
            <div style={{ background:'#fff',borderRadius:12,padding:16,
              boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:14,
              borderLeft:`4px solid ${bt?.color||A}` }}>
              <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
                <span style={{ fontSize:28 }}>{bt?.icon||'🏢'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15,fontWeight:900,color:'#0f172a' }}>{tenant.name}</div>
                  <div style={{ fontSize:10,color:'#64748b',marginTop:2 }}>
                    {bt?.label} · {tenant.employees.toLocaleString()} employees ·
                    Joined {tenant.joined} · {enabled.size}/{ALL_MODULES.length} modules enabled
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  <button onClick={()=>setShowBizType(p=>!p)}
                    style={{ padding:'7px 14px',borderRadius:9,border:'1.5px solid #ddd6fe',
                      background:'#f5f3ff',cursor:'pointer',fontSize:10,fontWeight:700,color:A }}>
                    🏷️ Apply Template
                  </button>
                  <button onClick={enableAll}
                    style={{ padding:'7px 14px',borderRadius:9,border:'1px solid #bbf7d0',
                      background:'#f0fdf4',cursor:'pointer',fontSize:10,fontWeight:700,color:'#15803d' }}>
                    ✅ Enable All
                  </button>
                  <button onClick={disableAll}
                    style={{ padding:'7px 14px',borderRadius:9,border:'1px solid #fecaca',
                      background:'#fef2f2',cursor:'pointer',fontSize:10,fontWeight:700,color:'#dc2626' }}>
                    🚫 Disable All
                  </button>
                  <button onClick={saveConfig}
                    style={{ padding:'7px 18px',borderRadius:9,border:'none',
                      background:G,cursor:'pointer',fontSize:10,fontWeight:800,color:'#fff' }}>
                    💾 Save
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop:12 }}>
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:9,color:'#64748b',marginBottom:4 }}>
                  <span>Module coverage: {Math.round(enabled.size/ALL_MODULES.length*100)}%</span>
                  <span>{enabled.size} of {ALL_MODULES.length} modules</span>
                </div>
                <div style={{ height:6,background:'#f1f5f9',borderRadius:10,overflow:'hidden' }}>
                  <div style={{ height:'100%',width:`${enabled.size/ALL_MODULES.length*100}%`,
                    background:G,borderRadius:10,transition:'width .4s' }}/>
                </div>
              </div>
            </div>
          )}

          {/* Business Type Templates popup */}
          {showBizType && (
            <div style={{ background:'#fff',borderRadius:12,padding:16,
              boxShadow:'0 4px 20px rgba(0,0,0,.12)',marginBottom:14,
              border:'1.5px solid #ddd6fe' }}>
              <div style={{ fontSize:12,fontWeight:800,color:'#1e1b4b',marginBottom:12 }}>
                🏷️ Apply Business Type Template
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8 }}>
                {BUSINESS_TYPES.map(b=>(
                  <div key={b.id} onClick={()=>applyTemplate(b)}
                    style={{ padding:'10px 12px',borderRadius:10,cursor:'pointer',
                      background:b.bg,border:`1.5px solid ${b.color}30`,transition:'all .12s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=b.color; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.1)' }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor=`${b.color}30`; e.currentTarget.style.boxShadow='none' }}>
                    <div style={{ fontSize:18,marginBottom:4 }}>{b.icon}</div>
                    <div style={{ fontSize:11,fontWeight:800,color:b.color }}>{b.label}</div>
                    <div style={{ fontSize:9,color:'#64748b',marginTop:2,lineHeight:1.3 }}>{b.desc}</div>
                    <div style={{ fontSize:9,color:b.color,fontWeight:700,marginTop:4 }}>
                      {b.modules.length} modules
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group filter tabs */}
          <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:14 }}>
            {['All',...GROUP_ORDER].map(g=>(
              <button key={g} onClick={()=>setGroupFilter(g)}
                style={{ padding:'5px 14px',borderRadius:20,border:'none',cursor:'pointer',
                  fontSize:10,fontWeight:700,transition:'all .12s',
                  background:groupFilter===g?A:'#fff',
                  color:groupFilter===g?'#fff':'#374151',
                  boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
                {g==='All'?`All (${ALL_MODULES.length})`:g}
              </button>
            ))}
          </div>

          {/* Module grid */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:10 }}>
            {displayModules.map(mod => {
              const isOn = enabled.has(mod.id)
              return (
                <div key={mod.id}
                  onClick={()=>toggleModule(mod.id)}
                  style={{ background:isOn?'#faf5ff':'#fff',borderRadius:11,padding:'12px 14px',cursor:'pointer',
                    border:`2px solid ${isOn?A+'60':'#f1f5f9'}`,
                    boxShadow:isOn?`0 2px 12px ${A}20`:'0 1px 4px rgba(0,0,0,.05)',
                    transition:'all .15s',opacity:isOn?1:.7 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8 }}>
                    <div style={{ display:'flex',gap:8,alignItems:'flex-start' }}>
                      <span style={{ fontSize:18,flexShrink:0 }}>{mod.icon}</span>
                      <div>
                        <div style={{ fontSize:11,fontWeight:700,color:isOn?A:'#374151',lineHeight:1.3 }}>{mod.label}</div>
                        <div style={{ fontSize:9,color:'#94a3b8',marginTop:2,lineHeight:1.3 }}>{mod.desc}</div>
                        <span style={{ fontSize:8,padding:'1px 7px',borderRadius:8,fontWeight:600,marginTop:4,display:'inline-block',
                          background:'#f1f5f9',color:'#64748b' }}>{mod.group}</span>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <div style={{ flexShrink:0,width:38,height:22,borderRadius:11,
                      background:isOn?A:'#e2e8f0',position:'relative',transition:'background .2s' }}>
                      <div style={{ position:'absolute',top:3,width:16,height:16,borderRadius:'50%',
                        background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.2)',
                        left:isOn?19:3 }}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Save footer */}
          <div style={{ marginTop:16,background:'#fff',borderRadius:12,padding:'14px 20px',
            boxShadow:'0 2px 8px rgba(0,0,0,.06)',display:'flex',justifyContent:'space-between',
            alignItems:'center',flexWrap:'wrap',gap:10 }}>
            <div>
              <div style={{ fontSize:12,fontWeight:800,color:'#0f172a' }}>
                {enabled.size} modules enabled for {tenant?.name}
              </div>
              <div style={{ fontSize:10,color:'#64748b',marginTop:2 }}>
                Changes take effect immediately after saving
              </div>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={()=>applyTemplate(BUSINESS_TYPES.find(b=>b.id===tenant?.type)||BUSINESS_TYPES[0])}
                style={{ padding:'9px 18px',borderRadius:10,border:'1.5px solid #ddd6fe',
                  background:'#f5f3ff',cursor:'pointer',fontSize:11,fontWeight:700,color:A }}>
                ↩ Reset to Default
              </button>
              <button onClick={saveConfig}
                style={{ padding:'9px 24px',borderRadius:10,border:'none',
                  background:G,cursor:'pointer',fontSize:11,fontWeight:800,color:'#fff',
                  boxShadow:'0 4px 14px rgba(124,58,237,.35)' }}>
                💾 Save Permissions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

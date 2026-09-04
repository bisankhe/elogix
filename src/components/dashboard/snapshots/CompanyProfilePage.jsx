// ============================================================
// FILE: src/components/dashboard/snapshots/CompanyProfilePage.jsx
// PURPOSE: Company Profile — LIST view of all companies
//          Shows: company cards, doc compliance, expiry alerts,
//          quick stats, click to view details
//          Separate from CompanySetupPage (form/wizard)
// ============================================================

import React, { useState, useEffect } from 'react'

// ── Mock saved companies (from setup) ─────────────────────────

// ── Shared tenant data hook ─────────────────────────────────
function useTenantCompany() {
  const [company, setCompany] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const load = async () => {
      // 1. Try real API
      try {
        const token = localStorage.getItem('elogix_token') ||
          JSON.parse(localStorage.getItem('elogix_auth')||'{}').token
        if (token) {
          const res = await fetch('/api/v1/companies/me', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const d = await res.json()
            setCompany(d.data || d.company || d)
            setLoading(false)
            return
          }
        }
      } catch {}
      // 2. Fallback: localStorage auth
      try {
        const auth = JSON.parse(localStorage.getItem('elogix_auth')||'{}')
        const regCos = JSON.parse(localStorage.getItem('elogix_registered_companies')||'{}')
        const co = auth.company || {}
        const slug = co.slug || auth.user?.company || 'demo'
        const regData = regCos[slug] || {}
        setCompany({
          id:            co.id || `c_${slug}`,
          name:          co.name || regData.name || 'Your Company',
          slug,
          plan:          co.plan || regData.plan || 'trial',
          status:        co.status || 'active',
          business_type: co.business_type || regData.business_type || 'custom',
          country:       co.country || regData.country || 'Nepal',
          currency:      co.currency || regData.currency || 'NPR',
          admin_email:   co.admin_email || regData.admin_email || auth.user?.email || '',
          modules:       co.modules || regData.modules || [],
          created_at:    co.created_at || regData.created_at || '',
          // Profile fields (empty until filled in setup)
          legal_name: '', short_name: '', pan_number: '', vat_number: '',
          ocr_number: '', ssf_code: '', industry: regData.business_type?.replace(/_/g,' ') || '',
          phone: regData.phone || '', email: regData.admin_email || co.admin_email || '',
          province:'', district:'', municipality:'', registered_address:'', website:'',
        })
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const saveTenantCompany = async (updates) => {
    // Merge updates into localStorage
    try {
      const auth = JSON.parse(localStorage.getItem('elogix_auth')||'{}')
      auth.company = { ...(auth.company||{}), ...updates }
      localStorage.setItem('elogix_auth', JSON.stringify(auth))
      setCompany(p => ({...p, ...updates}))
    } catch {}
    // Try API
    try {
      const token = localStorage.getItem('elogix_token') ||
        JSON.parse(localStorage.getItem('elogix_auth')||'{}').token
      if (token) {
        await fetch('/api/v1/companies/me', {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
          body: JSON.stringify(updates)
        })
      }
    } catch {}
  }

  return { company, loading, saveTenantCompany }
}



function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _useAppFallback() {
  const s = _getSession()
  return {
    sub: s?.last_page || '', persona: s?.persona || s?.user?.role || 'employee',
    lang: s?.lang || 'en', currency: s?.currency || 'NPR',
    company: s?.company || {}, user: s?.user || {},
    darkMode: false, setDarkMode: () => {},
    navTo: (p) => window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page: p } })),
    switchPersona: () => {}, setShowNotif: () => {}, setShowAI: () => {},
    setSidebarOpen: () => {}, sidebarOpen: true,
    currentPersona: { id: s?.persona || 'employee', icon: '👤', color: '#7c3aed', label: '' },
  }
}

export default function CompanyProfilePage() {
  const { navTo } = _useAppFallback()
  const { company: tenantCo, loading: tenantLoading, saveTenantCompany } = useTenantCompany()
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [search,          setSearch]          = useState('')
  const [editMode,        setEditMode]        = useState(false)
  const [editForm,        setEditForm]        = useState({})

  // Build company list from tenant data only (no hardcoded data)
  const tenantCompanies = tenantCo ? [tenantCo] : []
  const filtered = tenantCompanies.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  )

  // Expiry alerts from tenant company documents
  const allAlerts = (tenantCo?.documents || [])
    .filter(d => d.days_left !== null && d.days_left <= 30)
    .map(d => ({ ...d, company_name: tenantCo.name, company_id: tenantCo.id }))
    .sort((a, b) => (a.days_left ?? 999) - (b.days_left ?? 999))

  // Load tenant company into selected on mount
  useEffect(() => {
    if (tenantCo && !selectedCompany) setSelectedCompany(tenantCo)
  }, [tenantCo])

  if (tenantLoading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'40vh'}}>
      <div style={{textAlign:'center',color:'#64748b'}}>⏳ Loading company profile...</div>
    </div>
  )

  return (
    <div>
      {/* Page Title */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:10, marginBottom:20 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <h2 style={{ fontSize:22, fontWeight:900, color:'#0f172a', margin:0 }}>
              Company Profile
            </h2>
            <Pill color="blue">{tenantCompanies.length} Companies</Pill>
            {allAlerts.length > 0 && (
              <span style={{ background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700,
                padding:'3px 10px', borderRadius:20, border:'1px solid #fecaca',
                animation:'pulse 2s infinite' }}>
                ⚠️ {allAlerts.length} Doc Alert{allAlerts.length>1?'s':''}
              </span>
            )}
          </div>
          <p style={{ fontSize:12, color:'#94a3b8', margin:'5px 0 0' }}>
            All registered companies · Document compliance tracking · Expiry alerts
          </p>
        </div>
        <button onClick={() => navTo('company-setup')}
          style={{ padding:'10px 20px', borderRadius:10, border:'none',
            background:'#3b82f6', color:'#fff', fontSize:13, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          + Add New Company
        </button>
      </div>

      {/* Critical Alerts Banner */}
      {allAlerts.length > 0 && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca',
          borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#dc2626', marginBottom:10 }}>
            🚨 Critical Document Alerts — Action Required
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {allAlerts.map((alert, i) => {
              const URGENCY_LEVELS = {
                critical: { label:'Critical', icon:'🔴', bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
                high:     { label:'High',     icon:'🟠', bg:'#fff7ed', color:'#ea580c', border:'#fed7aa' },
                medium:   { label:'Medium',   icon:'🟡', bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
                low:      { label:'Low',      icon:'🟢', bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0' },
              }
              const urg = URGENCY_LEVELS[alert.urgency] || URGENCY_LEVELS.critical
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                  background:'#fff', borderRadius:8, padding:'8px 12px',
                  border:'1px solid #fecaca' }}>
                  <span style={{ fontSize:16 }}>{alert.icon}</span>
                  <div style={{ flex:1, fontSize:12 }}>
                    <strong>{alert.name}</strong>
                    <span style={{ color:'#94a3b8' }}> · {alert.company_name}</span>
                  </div>
                  <span style={{ background:urg?.bg, color:urg?.color,
                    padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700,
                    border:`1px solid ${urg?.border}` }}>
                    {urg?.icon} {urg?.label}
                  </span>
                  <button onClick={() => setSelectedCompany(tenantCompanies.find(c=>c.id===alert.company_id))}
                    style={{ padding:'3px 10px', borderRadius:6, border:'1px solid #fca5a5',
                      background:'#fff', color:'#dc2626', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                    View
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position:'relative', marginBottom:16 }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
          fontSize:14, color:'#94a3b8' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by company name, PAN, or code..."
          style={{ width:'100%', padding:'10px 14px 10px 36px', borderRadius:10,
            border:'1px solid #e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
      </div>

      {/* Company Cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.map(company => {
          const docAlerts = company.documents.filter(d =>
            d.days_left !== null && d.days_left <= 30
          )
          const expiredCount = company.documents.filter(d => d.status === 'expired').length
          const pendingCount = company.documents.filter(d => d.status === 'pending').length

          return (
            <div key={company.id}
              style={{ background:'#fff', border:`1px solid ${docAlerts.length>0?'#fecaca':'#e2e8f0'}`,
                borderRadius:14, overflow:'hidden',
                boxShadow: docAlerts.length>0 ? '0 0 0 2px rgba(239,68,68,.1)' : '0 1px 4px rgba(0,0,0,.05)',
                transition:'box-shadow .2s',
                borderLeft:`4px solid ${company.is_primary?'#3b82f6':'#94a3b8'}` }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.09)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow=docAlerts.length>0?'0 0 0 2px rgba(239,68,68,.1)':'0 1px 4px rgba(0,0,0,.05)'}>

              {/* Main row */}
              <div style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
                {/* Logo */}
                <div style={{ width:50, height:50, borderRadius:12, background:'#eff6ff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:26, flexShrink:0 }}>
                  {company.logo}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:900, color:'#0f172a' }}>{company.name}</span>
                    {company.is_primary && <Pill color="blue">Primary</Pill>}
                    <Pill color={company.is_active?'green':'gray'}>
                      {company.is_active?'Active':'Inactive'}
                    </Pill>
                    <Pill color="gray">{company.base_currency}</Pill>
                  </div>
                  <div style={{ fontSize:11, color:'#64748b' }}>
                    {company.code} · PAN: <strong>{company.pan_number}</strong>
                    {company.vat_number && ` · VAT: ${company.vat_number}`}
                    {' · '}{company.company_type}
                  </div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                    📍 {company.district}, {company.province}
                    {' · '}👥 {company.employee_count.toLocaleString()} employees
                    {' · '}🏢 {company.branches_count} branches
                    {company.group_company && ` · 🏛️ ${company.group_company}`}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display:'flex', gap:10, flexShrink:0, alignItems:'center' }}>

                  {/* Document compliance ring */}
                  <div style={{ textAlign:'center' }}>
                    <svg viewBox="0 0 36 36" width="52" height="52">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="4"/>
                      <circle cx="18" cy="18" r="15" fill="none"
                        stroke={company.doc_compliance_pct===100?'#10b981':company.doc_compliance_pct>=70?'#f59e0b':'#ef4444'}
                        strokeWidth="4"
                        strokeDasharray={`${company.doc_compliance_pct * 0.942} 100`}
                        strokeLinecap="round"
                        transform="rotate(-90 18 18)"/>
                      <text x="18" y="21" textAnchor="middle" fontSize="8" fontWeight="700"
                        fill="#0f172a">{company.doc_compliance_pct}%</text>
                    </svg>
                    <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>Docs</div>
                  </div>

                  {/* Alert badges */}
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {docAlerts.length > 0 && (
                      <span style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca',
                        padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700,
                        whiteSpace:'nowrap' }}>
                        ⚠️ {docAlerts.length} expiring
                      </span>
                    )}
                    {expiredCount > 0 && (
                      <span style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca',
                        padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700 }}>
                        🔴 {expiredCount} expired
                      </span>
                    )}
                    {pendingCount > 0 && (
                      <span style={{ background:'#f1f5f9', color:'#475569', border:'1px solid #e2e8f0',
                        padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700 }}>
                        ○ {pendingCount} pending
                      </span>
                    )}
                    {docAlerts.length===0 && expiredCount===0 && pendingCount===0 && (
                      <span style={{ background:'#f0fdf4', color:'#15803d', border:'1px solid #bbf7d0',
                        padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700 }}>
                        ✅ All clear
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    <button onClick={() => setSelectedCompany(company)}
                      style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #bfdbfe',
                        background:'#eff6ff', color:'#1d4ed8', fontSize:11, fontWeight:700,
                        cursor:'pointer', whiteSpace:'nowrap' }}>
                      👁️ View
                    </button>
                    <button onClick={() => navTo('company-setup')}
                      style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
                        background:'#f8fafc', color:'#475569', fontSize:11, fontWeight:600,
                        cursor:'pointer', whiteSpace:'nowrap' }}>
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              </div>

              {/* Document progress bar */}
              <div style={{ padding:'0 18px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  fontSize:10, marginBottom:4, color:'#64748b' }}>
                  <span>Document Compliance</span>
                  <span style={{ fontWeight:700 }}>{company.doc_compliance_pct}%</span>
                </div>
                <ProgressBar
                  value={company.doc_compliance_pct}
                  color={company.doc_compliance_pct===100?'#10b981':company.doc_compliance_pct>=70?'#f59e0b':'#ef4444'}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Company Detail Modal */}
      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onSetup={(id) => navTo('company-setup')}
        />
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}`}</style>
    </div>
  )
}

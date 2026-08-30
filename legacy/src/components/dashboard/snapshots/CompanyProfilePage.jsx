// ============================================================
// FILE: src/components/dashboard/snapshots/CompanyProfilePage.jsx
// PURPOSE: Company Profile — LIST view of all companies
//          Shows: company cards, doc compliance, expiry alerts,
//          quick stats, click to view details
//          Separate from CompanySetupPage (form/wizard)
// ============================================================

import React, { useState, useEffect } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

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
      } catch(_e) {}
      // 2. Fallback: elogix_session (new AuthContext) or legacy elogix_auth
      try {
        const sess = JSON.parse(
          sessionStorage.getItem('elogix_session') ||
          localStorage.getItem('elogix_session') || 'null'
        )
        const auth = sess || JSON.parse(localStorage.getItem('elogix_auth')||'{}')
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
      } catch(_e) {}
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
    } catch(_e) {}
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
    } catch(_e) {}
  }

  return { company, loading, saveTenantCompany }
}


// ── Pill component ────────────────────────────────────
function Pill({ color='gray', children }) {
  const colors = {
    blue:   { bg:'#dbeafe', text:'#1e40af', border:'#bfdbfe' },
    green:  { bg:'#dcfce7', text:'#166534', border:'#bbf7d0' },
    red:    { bg:'#fee2e2', text:'#991b1b', border:'#fecaca' },
    amber:  { bg:'#fef3c7', text:'#92400e', border:'#fde68a' },
    purple: { bg:'#ede9fe', text:'#5b21b6', border:'#ddd6fe' },
    gray:   { bg:'#f1f5f9', text:'#475569', border:'#e2e8f0' },
  }
  const s = colors[color] || colors.gray
  return (
    <span style={{ background:s.bg, color:s.text, border:`1px solid ${s.border}`,
      fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:20 }}>
      {children}
    </span>
  )
}

// ── ProgressBar component ─────────────────────────────
function ProgressBar({ value=0, color='#3b82f6' }) {
  return (
    <div style={{ height:6, background:'#f1f5f9', borderRadius:6, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${Math.min(value,100)}%`,
        background:color, borderRadius:6, transition:'width .3s' }}/>
    </div>
  )
}

// ── CompanyDetailModal ────────────────────────────────
function CompanyDetailModal({ company, onClose, onSetup }) {
  if (!company) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)',
      zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, width:600, maxWidth:'96vw',
        maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ background:'linear-gradient(135deg,#1e40af,#3b82f6)', padding:'16px 20px',
          borderRadius:'16px 16px 0 0', color:'#fff',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:900 }}>{company.name}</div>
            <div style={{ fontSize:11, opacity:.8 }}>{company.slug}.elogix.com.np</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.2)',
            border:'none', borderRadius:8, color:'#fff', fontSize:18, cursor:'pointer',
            width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:'20px' }}>
          {[
            ['Company Name',    company.name || '—'],
            ['Portal URL',      `${company.slug || '—'}.elogix.com.np`],
            ['Business Type',   (company.business_type||'custom').replace(/_/g,' ')],
            ['Plan',            company.plan || '—'],
            ['Country',         company.country || 'Nepal'],
            ['Currency',        company.currency || 'NPR'],
            ['Admin Email',     company.admin_email || company.email || '—'],
            ['Status',          company.status || 'active'],
            ['Modules',         `${(company.modules||[]).length} configured`],
            ['Registered',      company.created_at || '—'],
          ].map(([label, val]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between',
              padding:'8px 0', borderBottom:'1px solid #f1f5f9', fontSize:12 }}>
              <span style={{ color:'#64748b', fontWeight:500 }}>{label}</span>
              <span style={{ color:'#0f172a', fontWeight:700, textAlign:'right', maxWidth:'65%', wordBreak:'break-all' }}>{val}</span>
            </div>
          ))}
          <div style={{ marginTop:16, display:'flex', gap:10 }}>
            <button onClick={() => { onSetup?.(company.id); onClose() }}
              style={{ flex:1, padding:'10px', borderRadius:9, border:'none',
                background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff',
                fontSize:12, fontWeight:700, cursor:'pointer' }}>
              ✏️ Edit Company Setup
            </button>
            <button onClick={onClose}
              style={{ padding:'10px 16px', borderRadius:9, border:'1px solid #e2e8f0',
                background:'#fff', fontSize:12, cursor:'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


export default function CompanyProfilePage() {
  const { navTo } = useApp()
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
  const allAlerts = []  // populated from API when available; const _docs = (tenantCo?.documents || [])
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
          const docAlerts = (company.documents||[]).filter(d =>
            d.days_left !== null && d.days_left <= 30
          )
          const expiredCount = (company.documents||[]).filter(d => d.status === 'expired').length
          const pendingCount = (company.documents||[]).filter(d => d.status === 'pending').length

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
                  fontSize:26, flexShrink:0 }}>🏢
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:900, color:'#0f172a' }}>{company.name}</span>
                    {company.slug && <Pill color="blue">Primary</Pill>}
                    <Pill color={company.status==='active'?'green':'gray'}>
                      {company.status==='active'?'Active':company.status||'Active'}
                    </Pill>
                    <Pill color="gray">{company.currency||'NPR'}</Pill>
                  </div>
                  <div style={{ fontSize:11, color:'#64748b' }}>
                    {company.code} · PAN: <strong>{company.pan_number}</strong>
                    {company.vat_number && ` · VAT: ${company.vat_number}`}
                    {' · '}{company.company_type}
                  </div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                    📍 {company.country||'Nepal'} · 💰 {company.currency||'NPR'} · 📧 {company.admin_email||company.email||'—'}
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
                        strokeDasharray={`${(company.doc_compliance_pct||0) * 0.942} 100`}
                        strokeLinecap="round"
                        transform="rotate(-90 18 18)"/>
                      <text x="18" y="21" textAnchor="middle" fontSize="8" fontWeight="700"
                        fill="#0f172a">{company.doc_compliance_pct||0}%</text>
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
                  value={company.doc_compliance_pct||0}
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

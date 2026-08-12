// ============================================================
// FILE: src/components/dashboard/snapshots/CompanyProfilePage.jsx
// PURPOSE: Company Profile — LIST view of all companies
//          Shows: company cards, doc compliance, expiry alerts,
//          quick stats, click to view details
//          Separate from CompanySetupPage (form/wizard)
// ============================================================

import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

// ── Mock saved companies (from setup) ─────────────────────────
const SAVED_COMPANIES = [
  {
    id: 'comp-001',
    code: 'NP-001',
    name: 'eLogix HRMS Pvt. Ltd.',
    legal_name: 'eLogix HRMS Private Limited',
    short_name: 'eLogix HRMS',
    logo: '🏢',
    company_type: 'Private Limited (Pvt. Ltd.)',
    industry: 'Information Technology',
    pan_number: '609875432',
    vat_number: '609875432000',
    ocr_number: 'OCR-2079-1254',
    ssf_employer_code: 'SSF-BAG-00142',
    is_primary: true,
    is_active: true,
    setup_completed: true,
    setup_completion_pct: 100,
    employee_count: 1250,
    province: 'Bagmati Province',
    district: 'Kathmandu',
    municipality: 'Kathmandu Metropolitan City',
    ward_no: '14',
    phone: '+977-1-4567890',
    email: 'info@elogix.com.np',
    hr_email: 'hr@elogix.com.np',
    labour_office_zone: 'Bagmati Province Labour Office',
    min_wage_applicable: 15000,
    foreign_worker_pct: 2.1,
    base_currency: 'NPR',
    fiscal_year_type: 'NEPALI',
    established_date: '2020-06-15',
    branches_count: 4,
    group_company: 'eLogix Group Holdings',
    doc_compliance_pct: 90,
    documents: [
      { category: 'ocr_certificate',    name: 'Company Registration (OCR)', status: 'verified', expiry: '2026-07-15', days_left: 34, icon: '🏛️' },
      { category: 'pan_certificate',    name: 'PAN Certificate',             status: 'verified', expiry: null,         days_left: null, icon: '💳' },
      { category: 'vat_certificate',    name: 'VAT Registration',            status: 'verified', expiry: null,         days_left: null, icon: '🧾' },
      { category: 'tax_clearance',      name: 'Tax Clearance Certificate',   status: 'expired',  expiry: '2026-05-31', days_left: -13,  icon: '✅' },
      { category: 'ssf_registration',   name: 'SSF Employer Registration',   status: 'verified', expiry: null,         days_left: null, icon: '🏥' },
      { category: 'labour_audit_report',name: 'Annual Labour Audit',         status: 'uploaded', expiry: '2026-07-31', days_left: 50,   icon: '📋' },
      { category: 'ward_registration',  name: 'Ward Registration',           status: 'verified', expiry: '2026-09-30', days_left: 111,  icon: '🏢' },
      { category: 'company_statute',    name: 'MOA & AOA',                   status: 'verified', expiry: null,         days_left: null, icon: '📜' },
      { category: 'trade_license',      name: 'Trade License',               status: 'renewal_due', expiry: '2026-07-01', days_left: 20, icon: '🔖' },
      { category: 'audited_accounts',   name: 'Audited Financial Statements',status: 'pending',  expiry: null,         days_left: null, icon: '📊' },
    ]
  },
  {
    id: 'comp-002',
    code: 'IN-001',
    name: 'eLogix India Pvt. Ltd.',
    legal_name: 'eLogix India Private Limited',
    short_name: 'eLogix India',
    logo: '🏬',
    company_type: 'Private Limited',
    industry: 'Information Technology',
    pan_number: 'AABCN1234F',
    vat_number: '07AABCN1234F1ZW',
    ocr_number: 'CIN-U72900DL2021PTC385634',
    ssf_employer_code: 'EPFO-DL-001234',
    is_primary: false,
    is_active: true,
    setup_completed: true,
    setup_completion_pct: 85,
    employee_count: 420,
    province: 'Delhi NCR',
    district: 'New Delhi',
    municipality: 'NDMC',
    phone: '+91-11-45678900',
    email: 'info@elogixindia.com',
    hr_email: 'hr@elogixindia.com',
    labour_office_zone: 'Delhi Labour Office',
    min_wage_applicable: 0,
    foreign_worker_pct: 0,
    base_currency: 'INR',
    fiscal_year_type: 'GREGORIAN',
    established_date: '2021-04-01',
    branches_count: 2,
    group_company: 'eLogix Group Holdings',
    doc_compliance_pct: 80,
    documents: [
      { category: 'incorporation_certificate', name: 'Certificate of Incorporation', status: 'verified', expiry: null,         days_left: null, icon: '🏛️' },
      { category: 'pan_certificate',           name: 'Company PAN Card',              status: 'verified', expiry: null,         days_left: null, icon: '💳' },
      { category: 'vat_certificate',           name: 'GST Registration',              status: 'verified', expiry: null,         days_left: null, icon: '🧾' },
      { category: 'ssf_registration',          name: 'EPFO Employer Code',            status: 'verified', expiry: null,         days_left: null, icon: '🏥' },
      { category: 'trade_license',             name: 'Shop & Establishment License',  status: 'renewal_due', expiry: '2026-07-10', days_left: 29, icon: '🔖' },
    ]
  },
]

// ── Helper: get urgency color/label ──────────────────────────
function getExpiryUrgency(days) {
  if (days === null || days === undefined) return null
  if (days < 0)   return { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', label:'EXPIRED',         icon:'🔴' }
  if (days <= 7)  return { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', label:`${days}d — CRITICAL`, icon:'🔴' }
  if (days <= 30) return { color:'#d97706', bg:'#fffbeb', border:'#fde68a', label:`${days}d — Renew Now`, icon:'🟡' }
  if (days <= 60) return { color:'#0369a1', bg:'#eff6ff', border:'#bfdbfe', label:`${days}d — Soon`,   icon:'🔵' }
  return null
}

function getDocStatusConfig(status) {
  return {
    verified:     { color:'#15803d', bg:'#f0fdf4', border:'#bbf7d0', label:'✓ Verified'    },
    uploaded:     { color:'#1d4ed8', bg:'#eff6ff', border:'#bfdbfe', label:'↑ Uploaded'    },
    renewal_due:  { color:'#d97706', bg:'#fffbeb', border:'#fde68a', label:'↻ Renewal Due' },
    expired:      { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', label:'✗ EXPIRED'     },
    pending:      { color:'#475569', bg:'#f1f5f9', border:'#e2e8f0', label:'○ Pending'     },
  }[status] || { color:'#475569', bg:'#f1f5f9', border:'#e2e8f0', label:'—' }
}

// ── Pill ──────────────────────────────────────────────────────
function Pill({ children, color = 'blue' }) {
  const m = {
    green:  { bg:'#f0fdf4', text:'#15803d', border:'#bbf7d0' },
    blue:   { bg:'#eff6ff', text:'#1d4ed8', border:'#bfdbfe' },
    yellow: { bg:'#fffbeb', text:'#b45309', border:'#fde68a' },
    red:    { bg:'#fef2f2', text:'#dc2626', border:'#fecaca' },
    gray:   { bg:'#f1f5f9', text:'#475569', border:'#e2e8f0' },
    purple: { bg:'#f5f3ff', text:'#6d28d9', border:'#ddd6fe' },
    orange: { bg:'#fff7ed', text:'#c2410c', border:'#fed7aa' },
  }
  const c = m[color] || m.blue
  return (
    <span style={{ background:c.bg, color:c.text, border:`1px solid ${c.border}`,
      padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700,
      display:'inline-flex', alignItems:'center', whiteSpace:'nowrap' }}>
      {children}
    </span>
  )
}

function ProgressBar({ value, color = '#3b82f6' }) {
  return (
    <div style={{ height:6, background:'#f1f5f9', borderRadius:6, overflow:'hidden' }}>
      <div style={{ width:`${Math.min(value,100)}%`, height:'100%',
        background:color, borderRadius:6, transition:'width .5s ease' }}/>
    </div>
  )
}

// ── Company Detail Modal ──────────────────────────────────────
function CompanyDetailModal({ company, onClose, onSetup }) {
  const [tab, setTab] = useState('overview')

  const criticalDocs = company.documents.filter(d =>
    d.days_left !== null && d.days_left <= 30
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.52)', zIndex:2000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:18, width:700, maxHeight:'88vh',
        display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,.22)',
        overflow:'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'16px 20px', background:'linear-gradient(135deg,#1e40af,#3b82f6)',
          flexShrink:0, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:46, height:46, borderRadius:12, background:'rgba(255,255,255,.15)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
            {company.logo}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:900, color:'#fff' }}>{company.name}</div>
            <div style={{ fontSize:11, color:'#93c5fd' }}>
              {company.code} · {company.company_type} · {company.base_currency}
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {company.is_primary && <Pill color="green">Primary</Pill>}
            <button onClick={onClose} style={{ background:'rgba(255,255,255,.15)', border:'none',
              borderRadius:8, width:30, height:30, cursor:'pointer', color:'#fff', fontSize:16 }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #f1f5f9', padding:'0 18px',
          background:'#f8fafc', flexShrink:0, overflowX:'auto', scrollbarWidth:'none' }}>
          {[
            { id:'overview',  label:'📊 Overview'   },
            { id:'statutory', label:'📋 Statutory'  },
            { id:'documents', label:`📜 Documents ${criticalDocs.length>0?`⚠️${criticalDocs.length}`:''}`},
            { id:'branches',  label:'📍 Branches'   },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'10px 16px', border:'none', background:'transparent',
                color: tab===t.id ? '#2563eb' : '#64748b',
                fontWeight: tab===t.id ? 700 : 400, fontSize:12, cursor:'pointer',
                borderBottom:`2px solid ${tab===t.id?'#2563eb':'transparent'}`,
                whiteSpace:'nowrap' }}>
              {t.label}
            </button>
          ))}
          <div style={{ flex:1 }}/>
          <button onClick={() => { onClose(); onSetup(company.id) }}
            style={{ margin:'8px 0', padding:'5px 14px', borderRadius:8, border:'none',
              background:'#3b82f6', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
            ✏️ Edit Setup
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto', flex:1, padding:'16px 20px' }}>

          {tab === 'overview' && (
            <div>
              {/* Critical alerts */}
              {criticalDocs.length > 0 && (
                <div style={{ background:'#fef2f2', border:'1px solid #fecaca',
                  borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#dc2626', marginBottom:8 }}>
                    🚨 Document Expiry Alerts — Immediate Action Required
                  </div>
                  {criticalDocs.map((d,i) => {
                    const urg = getExpiryUrgency(d.days_left)
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8,
                        padding:'6px 0', borderBottom: i<criticalDocs.length-1?'1px solid #fecaca':'none' }}>
                        <span>{d.icon}</span>
                        <span style={{ flex:1, fontSize:12, color:'#991b1b' }}>{d.name}</span>
                        {urg && (
                          <span style={{ background:urg.bg, color:urg.color,
                            padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700 }}>
                            {urg.icon} {urg.label}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Stats grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { icon:'👥', label:'Employees',    value:company.employee_count.toLocaleString(), color:'#3b82f6' },
                  { icon:'🏢', label:'Branches',     value:company.branches_count,                  color:'#10b981' },
                  { icon:'📜', label:'Doc Compliance',value:`${company.doc_compliance_pct}%`,        color: company.doc_compliance_pct===100?'#10b981':'#f59e0b' },
                  { icon:'⚙️', label:'Setup Done',   value:`${company.setup_completion_pct}%`,       color:'#8b5cf6' },
                ].map((s,i) => (
                  <div key={i} style={{ background:'#f8fafc', border:`1px solid #e2e8f0`,
                    borderRadius:10, padding:'10px 12px', borderLeft:`3px solid ${s.color}` }}>
                    <div style={{ fontSize:18, marginBottom:3 }}>{s.icon}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:'#0f172a' }}>{s.value}</div>
                    <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Key info */}
              {[
                ['PAN Number',          company.pan_number],
                ['VAT Number',          company.vat_number || '—'],
                ['OCR Registration',    company.ocr_number],
                ['SSF Employer Code',   company.ssf_employer_code],
                ['Industry',            company.industry],
                ['Group Company',       company.group_company || '—'],
                ['Province / District', `${company.province} / ${company.district}`],
                ['Municipality',        company.municipality],
                ['Labour Office',       company.labour_office_zone],
                ['Min Wage',            `${company.base_currency} ${company.min_wage_applicable?.toLocaleString()}/month`],
                ['Foreign Worker %',    `${company.foreign_worker_pct}% (max 5%)`],
                ['HR Email',            company.hr_email],
              ].map(([label, value], i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between',
                  padding:'7px 0', borderBottom:'1px solid #f8fafc', fontSize:12 }}>
                  <span style={{ color:'#64748b', fontWeight:500 }}>{label}</span>
                  <span style={{ fontWeight:700, color:'#0f172a', textAlign:'right', maxWidth:'60%' }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'statutory' && (
            <div>
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a',
                borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:11, color:'#92400e' }}>
                ⚖️ Nepal Companies Act 2063 & Labour Act 2074 compliance details
              </div>
              {[
                { label:'OCR Registration Number', value:company.ocr_number,          badge:'Registered' },
                { label:'PAN Number (IRD)',         value:company.pan_number,          badge:'Active'     },
                { label:'VAT Number (IRD)',         value:company.vat_number,          badge:'Active'     },
                { label:'SSF Employer Code',        value:company.ssf_employer_code,   badge:'Registered' },
                { label:'Province',                 value:company.province,            badge:null         },
                { label:'Labour Office Zone',       value:company.labour_office_zone,  badge:null         },
                { label:'Min Wage (NPR/month)',     value:`NPR ${company.min_wage_applicable?.toLocaleString()}`, badge:'Compliant' },
                { label:'Foreign Worker %',         value:`${company.foreign_worker_pct}%`, badge: company.foreign_worker_pct<=5?'Compliant':'⚠ Exceeds 5%' },
                { label:'Fiscal Year',              value:company.fiscal_year_type,    badge:null         },
                { label:'Currency',                 value:company.base_currency,       badge:null         },
              ].map((row, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', padding:'9px 0', borderBottom:'1px solid #f8fafc', fontSize:12 }}>
                  <span style={{ color:'#64748b' }}>{row.label}</span>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontWeight:700, color:'#0f172a' }}>{row.value}</span>
                    {row.badge && (
                      <Pill color={row.badge.includes('⚠')?'red':'green'}>{row.badge}</Pill>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'documents' && (
            <div>
              <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                {[
                  { label:'Verified',    count:company.documents.filter(d=>d.status==='verified').length, color:'green' },
                  { label:'Uploaded',    count:company.documents.filter(d=>d.status==='uploaded').length, color:'blue' },
                  { label:'Renewal Due', count:company.documents.filter(d=>d.status==='renewal_due').length, color:'yellow' },
                  { label:'Expired',     count:company.documents.filter(d=>d.status==='expired').length, color:'red' },
                  { label:'Pending',     count:company.documents.filter(d=>d.status==='pending').length, color:'gray' },
                ].map((s,i) => (
                  <div key={i} style={{ textAlign:'center', padding:'8px 12px',
                    background:'#f8fafc', borderRadius:8 }}>
                    <div style={{ fontSize:16, fontWeight:800 }}>{s.count}</div>
                    <div style={{ fontSize:9, color:'#94a3b8' }}><Pill color={s.color}>{s.label}</Pill></div>
                  </div>
                ))}
              </div>

              {company.documents.map((doc, i) => {
                const st  = getDocStatusConfig(doc.status)
                return (
                  <div key={i} style={{ background:st.bg, border:`1px solid ${st.border}`,
                    borderRadius:9, padding:'10px 12px', marginBottom:6,
                    display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{doc.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>{doc.name}</div>
                      {doc.expiry && (
                        <div style={{ fontSize:10, color:'#64748b', marginTop:1 }}>
                          Expires: {doc.expiry}
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      {urg && (
                        <span style={{ background:urg.bg, color:urg.color, border:`1px solid ${urg.border}`,
                          padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700 }}>
                          {urg.icon} {urg.label}
                        </span>
                      )}
                      <span style={{ background:st.bg, color:st.color, border:`1px solid ${st.border}`,
                        padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700 }}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'branches' && (
            <div>
              {[
                { name:'Kathmandu HQ',     type:'hq',     city:'Kathmandu',  emp:850, pan:'609875432', ssf:'SSF-BAG-001' },
                { name:'Pokhara Branch',   type:'branch',  city:'Pokhara',    emp:145, pan:'',          ssf:'SSF-GAN-002' },
                { name:'Biratnagar Branch',type:'branch',  city:'Biratnagar', emp:120, pan:'',          ssf:'SSF-KSH-003' },
                { name:'Remote Workers',   type:'remote',  city:'Various',    emp:135, pan:'',          ssf:'' },
              ].map((br, i) => (
                <div key={i} style={{ background:'#f8fafc', border:'1px solid #e2e8f0',
                  borderRadius:9, padding:'12px 14px', marginBottom:8,
                  borderLeft:`4px solid ${br.type==='hq'?'#3b82f6':'#94a3b8'}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:18 }}>{br.type==='hq'?'🏛️':br.type==='remote'?'🏠':'🏢'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>
                        {br.name}
                        {br.type==='hq' && <Pill color="blue">HQ</Pill>}
                      </div>
                      <div style={{ fontSize:10, color:'#94a3b8' }}>
                        {br.city} · 👥 {br.emp} employees
                      </div>
                    </div>
                    <Pill color="green">Active</Pill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main: Company Profile Page ────────────────────────────────
export default function CompanyProfilePage() {
  const { navTo } = useApp()
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [search,          setSearch]          = useState('')

  const filtered = SAVED_COMPANIES.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
               || c.pan_number.includes(search)
               || c.code.toLowerCase().includes(search.toLowerCase())
  )

  // All expiry alerts across all companies
  const allAlerts = SAVED_COMPANIES.flatMap(c =>
    c.documents
      .filter(d => d.days_left !== null && d.days_left <= 30)
      .map(d => ({ ...d, company_name: c.name, company_id: c.id }))
  ).sort((a, b) => (a.days_left ?? 999) - (b.days_left ?? 999))

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
            <Pill color="blue">{SAVED_COMPANIES.length} Companies</Pill>
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
                  <button onClick={() => setSelectedCompany(SAVED_COMPANIES.find(c=>c.id===alert.company_id))}
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

// FILE: src/pages/billing/BillingPage.jsx
// eLogix HRMS — Tenant Billing & Subscription Page
// Shows the current tenant's plan, invoices, and payment history
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

const G  = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%)'
const A  = '#0369a1'

function getSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem('elogix_session') || localStorage.getItem('elogix_session') || 'null')
    if (s?.user) return s
    const a = JSON.parse(localStorage.getItem('elogix_auth') || '{}')
    return { user: a.user || {}, company: a.company || {} }
  } catch(_e) { return { user:{}, company:{} } }
}

const PLAN_PRICES = {
  trial:      { label:'Free Trial',  monthly:0,      annual:0,       color:'#0891b2', employees:10  },
  starter:    { label:'Starter',     monthly:5000,   annual:54000,   color:'#059669', employees:50  },
  growth:     { label:'Growth',      monthly:12000,  annual:130000,  color:'#7c3aed', employees:200 },
  business:   { label:'Business',    monthly:25000,  annual:270000,  color:'#d97706', employees:500 },
  enterprise: { label:'Enterprise',  monthly:50000,  annual:540000,  color:'#dc2626', employees:'∞' },
}

export default function BillingPage() {
  const [sess]     = useState(getSession)
  const company    = sess.company || {}
  const plan       = company.plan || 'trial'
  const planMeta   = PLAN_PRICES[plan] || PLAN_PRICES.trial
  const [invoices, setInvoices] = useState([])
  const [tab,      setTab]      = useState('overview')
  const [toast,    setToast]    = useState('')

  const notify = m => { setToast(m); setTimeout(() => setToast(''), 3500) }

  useEffect(() => {
    // Load invoices from localStorage (tenant-scoped)
    try {
      const slug = company.slug || 'demo'
      const saved = JSON.parse(localStorage.getItem(`elogix_invoices_${slug}`) || '[]')
      setInvoices(saved)
    } catch(_e) {}
  }, [company.slug])

  const tabs = [
    { id:'overview', label:'📊 Overview',    },
    { id:'invoices', label:'🧾 Invoices',    },
    { id:'plan',     label:'📦 Plan Details' },
    { id:'payment',  label:'💳 Payment',     },
  ]

  return (
    <div style={{
      position:'fixed', inset:0,
      fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#f0f9ff',
      overflowY:'scroll',
      overflowX:'hidden',
      WebkitOverflowScrolling:'touch',
      scrollbarWidth:'thin',
      scrollbarColor:'#0369a1 #dbeafe',
      zIndex:10,
    }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999,
          background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10,
          padding:'10px 18px', fontSize:12, color:'#065f46',
          boxShadow:'0 4px 16px rgba(0,0,0,.12)' }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ background:G, padding:'18px 24px', color:'#fff' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:900 }}>💰 Billing & Subscription</div>
            <div style={{ fontSize:12, opacity:.8, marginTop:3 }}>
              {company.name || 'Your Company'} · {company.slug || '—'}.elogix.com.np
            </div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <span style={{ background:'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.3)',
              padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:700 }}>
              {planMeta.label} Plan
            </span>
            <button onClick={() => setTab('plan')}
              style={{ background:'#fff', color:A, border:'none',
                padding:'8px 18px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              ⬆️ Upgrade Plan
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',
          gap:10, marginTop:18 }}>
          {[
            { label:'Current Plan',   value: planMeta.label,                  icon:'📦' },
            { label:'Monthly Cost',   value: planMeta.monthly > 0 ? `NPR ${planMeta.monthly.toLocaleString()}` : 'Free', icon:'💰' },
            { label:'Max Employees',  value: planMeta.employees,              icon:'👥' },
            { label:'Plan Status',    value: company.status?.toUpperCase() || 'ACTIVE', icon:'✅' },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,.12)',
              borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontSize:16, fontWeight:800 }}>{s.value}</div>
              <div style={{ fontSize:10, opacity:.75, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0',
        display:'flex', gap:4, padding:'0 20px', overflowX:'auto',
        position:'sticky', top:0, zIndex:50,
        boxShadow:'0 2px 8px rgba(0,0,0,.05)',
        scrollbarWidth:'none' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'12px 18px', border:'none', background:'transparent',
              color: tab===t.id ? A : '#64748b',
              fontWeight: tab===t.id ? 700 : 500,
              fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
              borderBottom: tab===t.id ? `2.5px solid ${A}` : '2.5px solid transparent',
              transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding:'24px 20px 60px', maxWidth:1100, margin:'0 auto' }}>

        {/* ── OVERVIEW ── */}
        {tab==='overview' && (
          <div>
            {/* Current plan card */}
            <div style={{ background:'#fff', borderRadius:14, padding:'20px 24px',
              boxShadow:'0 2px 10px rgba(0,0,0,.06)', marginBottom:20,
              border:`2px solid ${planMeta.color}30` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                <div>
                  <div style={{ fontSize:13, color:'#64748b', marginBottom:4 }}>Current Subscription</div>
                  <div style={{ fontSize:26, fontWeight:900, color:planMeta.color }}>{planMeta.label}</div>
                  <div style={{ fontSize:12, color:'#64748b', marginTop:6 }}>
                    {planMeta.monthly > 0
                      ? `NPR ${planMeta.monthly.toLocaleString()}/month · NPR ${planMeta.annual.toLocaleString()}/year`
                      : 'Free during trial period'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  <button onClick={() => setTab('plan')}
                    style={{ padding:'10px 20px', borderRadius:9, border:'none',
                      background:G, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    ⬆️ Upgrade
                  </button>
                  <button style={{ padding:'10px 20px', borderRadius:9, border:`1px solid ${A}`,
                    background:'#fff', color:A, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    📋 View All Plans
                  </button>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',
                gap:12, marginTop:20 }}>
                {[
                  ['Employees', `${planMeta.employees} max`],
                  ['Business Type', (company.business_type||'custom').replace(/_/g,' ')],
                  ['Currency', company.currency || 'NPR'],
                  ['Country', company.country || 'Nepal'],
                  ['Admin Email', company.admin_email || '—'],
                  ['Modules', `${(company.modules||[]).length} configured`],
                ].map(([k,v]) => (
                  <div key={k} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                    <div style={{ fontSize:10, color:'#94a3b8', marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', wordBreak:'break-all' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage */}
            <div style={{ background:'#fff', borderRadius:14, padding:'20px 24px',
              boxShadow:'0 2px 10px rgba(0,0,0,.06)', marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:800, marginBottom:16 }}>📊 Usage Overview</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                {[
                  { label:'Employees Used', used:0, max:planMeta.employees==='\u221e'?999:planMeta.employees, icon:'👥', color:'#3b82f6' },
                  { label:'Storage Used',   used:0.2, max:10, unit:'GB', icon:'💾', color:'#8b5cf6' },
                  { label:'API Calls (Mo)', used:0, max:10000, icon:'🔗', color:'#10b981' },
                ].map(u => {
                  const pct = typeof u.max === 'number' ? Math.round(u.used/u.max*100) : 0
                  return (
                    <div key={u.label} style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{u.icon} {u.label}</span>
                        <span style={{ fontSize:11, color:'#94a3b8' }}>{pct}%</span>
                      </div>
                      <div style={{ height:7, background:'#e2e8f0', borderRadius:6, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`,
                          background:u.color, borderRadius:6, transition:'width .4s' }}/>
                      </div>
                      <div style={{ fontSize:10, color:'#94a3b8', marginTop:6 }}>
                        {u.used}{u.unit||''} / {u.max}{u.unit||''}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent invoices preview */}
            <div style={{ background:'#fff', borderRadius:14, padding:'20px 24px',
              boxShadow:'0 2px 10px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:800 }}>🧾 Recent Invoices</div>
                <button onClick={() => setTab('invoices')}
                  style={{ fontSize:11, color:A, background:'none', border:'none',
                    cursor:'pointer', fontWeight:600 }}>View all →</button>
              </div>
              {invoices.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px', color:'#94a3b8' }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>🧾</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>No invoices yet</div>
                  <div style={{ fontSize:11, marginTop:4 }}>Invoices appear after your first billing cycle</div>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:500 }}>
                    <thead>
                      <tr style={{ background:'#f8fafc', fontSize:11 }}>
                        {['Invoice #','Period','Amount','Status','Due Date'].map(h => (
                          <th key={h} style={{ padding:'8px 12px', textAlign:'left',
                            color:'#64748b', fontWeight:600, borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.slice(0,5).map((inv,i) => (
                        <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                          <td style={{ padding:'10px 12px', fontWeight:600 }}>{inv.invoice_number||'—'}</td>
                          <td style={{ padding:'10px 12px', color:'#64748b' }}>{inv.period_month||'—'}</td>
                          <td style={{ padding:'10px 12px', fontWeight:700 }}>NPR {(inv.total_npr||0).toLocaleString()}</td>
                          <td style={{ padding:'10px 12px' }}>
                            <span style={{ padding:'2px 10px', borderRadius:20, fontSize:10,
                              fontWeight:700,
                              background: inv.status==='paid'?'#f0fdf4':inv.status==='overdue'?'#fef2f2':'#fffbeb',
                              color: inv.status==='paid'?'#166534':inv.status==='overdue'?'#dc2626':'#92400e' }}>
                              {inv.status||'pending'}
                            </span>
                          </td>
                          <td style={{ padding:'10px 12px', color:'#64748b' }}>{inv.due_date||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── INVOICES ── */}
        {tab==='invoices' && (
          <div style={{ background:'#fff', borderRadius:14, padding:'20px 24px',
            boxShadow:'0 2px 10px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize:15, fontWeight:800, marginBottom:16 }}>🧾 All Invoices</div>
            {invoices.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
                <div style={{ fontSize:56, marginBottom:14 }}>🧾</div>
                <div style={{ fontSize:16, fontWeight:700, color:'#374151' }}>No invoices yet</div>
                <div style={{ fontSize:12, marginTop:6 }}>
                  Invoices are generated monthly by eLogix SuperAdmin.<br/>
                  Contact <strong>billing@elogix.com.np</strong> for billing queries.
                </div>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:600 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['Invoice #','Period','Amount (NPR)','Status','Due Date','Action'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left',
                          color:'#64748b', fontWeight:600, borderBottom:'2px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv,i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'11px 14px', fontWeight:700 }}>{inv.invoice_number||'—'}</td>
                        <td style={{ padding:'11px 14px', color:'#64748b' }}>{inv.period_month||'—'}</td>
                        <td style={{ padding:'11px 14px', fontWeight:800, color:'#0f172a' }}>
                          {(inv.total_npr||0).toLocaleString()}
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700,
                            background: inv.status==='paid'?'#f0fdf4':inv.status==='overdue'?'#fef2f2':'#fffbeb',
                            color: inv.status==='paid'?'#166534':inv.status==='overdue'?'#dc2626':'#92400e' }}>
                            {inv.status==='paid'?'✅ Paid':inv.status==='overdue'?'🔴 Overdue':'⏳ Pending'}
                          </span>
                        </td>
                        <td style={{ padding:'11px 14px', color:'#64748b' }}>{inv.due_date||'—'}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <button style={{ padding:'4px 12px', borderRadius:6, border:`1px solid ${A}`,
                            background:'#eff6ff', color:A, fontSize:10, fontWeight:700, cursor:'pointer' }}>
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── PLAN DETAILS ── */}
        {tab==='plan' && (
          <div>
            <div style={{ fontSize:15, fontWeight:800, marginBottom:20 }}>📦 Available Plans</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
              {Object.entries(PLAN_PRICES).map(([key, p]) => (
                <div key={key} style={{
                  background:'#fff', borderRadius:14,
                  border: key===plan ? `2px solid ${p.color}` : '1.5px solid #e2e8f0',
                  padding:'20px 18px', position:'relative',
                  boxShadow: key===plan ? `0 0 0 4px ${p.color}15` : '0 1px 4px rgba(0,0,0,.05)',
                }}>
                  {key===plan && (
                    <div style={{ position:'absolute', top:-10, right:12,
                      background:p.color, color:'#fff', fontSize:10, fontWeight:700,
                      padding:'3px 12px', borderRadius:20 }}>Current</div>
                  )}
                  <div style={{ fontSize:20, fontWeight:900, color:p.color, marginBottom:4 }}>{p.label}</div>
                  <div style={{ fontSize:22, fontWeight:900, color:'#0f172a', marginBottom:2 }}>
                    {p.monthly > 0 ? `NPR ${p.monthly.toLocaleString()}` : 'Free'}
                  </div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginBottom:14 }}>per month</div>
                  {[
                    `Up to ${p.employees} employees`,
                    key==='trial'     ? '14-day free trial' : 'All core HR modules',
                    key==='growth'    ? 'Recruitment & ATS' : '',
                    key==='business'  ? 'Advanced analytics' : '',
                    key==='enterprise'? 'AI insights + API access' : '',
                    'Nepal Labour Act 2074 compliant',
                    'Multi-tenant data isolation',
                  ].filter(Boolean).slice(0,4).map((f,i) => (
                    <div key={i} style={{ display:'flex', gap:7, marginBottom:6, fontSize:11, color:'#374151' }}>
                      <span style={{ color:p.color, fontWeight:700, flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                  {key !== plan && (
                    <button
                      onClick={() => notify('Contact billing@elogix.com.np to upgrade')}
                      style={{ width:'100%', marginTop:14, padding:'10px', borderRadius:9, border:'none',
                        background:p.color, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      {key==='trial' ? 'Current' : 'Upgrade →'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PAYMENT ── */}
        {tab==='payment' && (
          <div style={{ background:'#fff', borderRadius:14, padding:'28px 24px',
            boxShadow:'0 2px 10px rgba(0,0,0,.06)', maxWidth:560 }}>
            <div style={{ fontSize:15, fontWeight:800, marginBottom:20 }}>💳 Payment Methods</div>
            <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10,
              padding:'14px 16px', marginBottom:20, fontSize:12, color:'#0369a1' }}>
              💡 eLogix uses manual invoicing. Payments are processed via bank transfer.<br/>
              Contact <strong>billing@elogix.com.np</strong> for payment instructions.
            </div>
            {[
              ['Bank Name',    'Nepal SBI Bank Ltd.'],
              ['Account Name', 'eLogix Technologies Pvt. Ltd.'],
              ['Account No.',  'XXXX-XXXX-XXXX'],
              ['Branch',       'Kathmandu, Hattisar'],
              ['SWIFT Code',   'NSBKNPKA'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between',
                padding:'10px 0', borderBottom:'1px solid #f1f5f9', fontSize:12 }}>
                <span style={{ color:'#64748b' }}>{k}</span>
                <span style={{ fontWeight:700 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:20 }}>
              <button onClick={() => notify('📧 Payment request sent to billing@elogix.com.np')}
                style={{ width:'100%', padding:'12px', borderRadius:10, border:'none',
                  background:G, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                📧 Request Payment Link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

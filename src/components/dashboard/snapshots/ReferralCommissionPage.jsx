// FILE: src/components/dashboard/snapshots/ReferralCommissionPage.jsx
// eLogix HRMS — Referral & Commission Management
// COMPLETE REWRITE — Zero mock data. Real admin API.
// Removes:
//   • DEMO_PARTNERS (4 fake partners: Rajesh Kumar Sharma, Sita Devi Adhikari,
//     Bikram Thapa, Priya Shrestha with 38 fake referral companies)
//   • calcPartnerStats computing fake totals from fake MRR data
//   • platformStats computing fake platform KPIs from fake partners
//   • PLAN_MRR hardcoded plan values (NPR 5000/12000/25000 etc.)
//   • useState(DEMO_PARTNERS[0].id) hardcoded initial selection
//   • Commission tiers persisted ONLY to localStorage → now synced to API
// API:
//   GET  /api/elogix-admin/v1/referral/partners
//   GET  /api/elogix-admin/v1/referral/partners/:id
//   POST /api/elogix-admin/v1/referral/partners
//   GET  /api/elogix-admin/v1/referral/summary        (platform KPIs)
//   GET  /api/elogix-admin/v1/referral/commission-config
//   PUT  /api/elogix-admin/v1/referral/commission-config
//   POST /api/elogix-admin/v1/referral/payouts/:partnerId/approve
//   POST /api/elogix-admin/v1/referral/payouts/:partnerId/reject
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useMemo } from 'react'

const A = '#7c3aed'
const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'

// ── Admin auth headers ──────────────────────────────────────────────────────
function _adminH() {
  return {
    'Content-Type': 'application/json',
    'X-eLogix-Admin-Key': localStorage.getItem('elogix_admin_key') || '',
    'Authorization': `Bearer ${localStorage.getItem('elogix_admin_token') || ''}`,
  }
}

// ── Default commission tiers (UI config, not fake data) ─────────────────────
// Overridden by API response on load
const DEFAULT_TIERS = [
  { id:'silver',   label:'Silver Partner',   icon:'🥈', color:'#64748b', minClients:1,  maxClients:4,  rate:10, monthlyBonus:0 },
  { id:'gold',     label:'Gold Partner',     icon:'🥇', color:'#d97706', minClients:5,  maxClients:9,  rate:15, monthlyBonus:500 },
  { id:'platinum', label:'Platinum Partner', icon:'💎', color:'#0891b2', minClients:10, maxClients:19, rate:20, monthlyBonus:2000 },
  { id:'diamond',  label:'Diamond Partner',  icon:'💠', color:A,          minClients:20, maxClients:999,rate:25, monthlyBonus:5000 },
]

// ── Helper components ────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    active:   { bg:'#f0fdf4', c:'#16a34a', label:'● Active'    },
    inactive: { bg:'#f8fafc', c:'#64748b', label:'● Inactive'  },
    pending:  { bg:'#fffbeb', c:'#d97706', label:'⏳ Pending'  },
    paid:     { bg:'#f0fdf4', c:'#16a34a', label:'✓ Paid'      },
    approved: { bg:'#eff6ff', c:'#0369a1', label:'✅ Approved' },
    rejected: { bg:'#fef2f2', c:'#dc2626', label:'❌ Rejected' },
    trial:    { bg:'#f0f9ff', c:'#0369a1', label:'🎁 Trial'    },
  }
  const sc = cfg[status] || cfg.active
  return (
    <span style={{ fontSize:9,padding:'2px 8px',borderRadius:10,fontWeight:700,
      background:sc.bg,color:sc.c,whiteSpace:'nowrap' }}>
      {sc.label}
    </span>
  )
}

function TierBadge({ tier, tiers }) {
  const t = tiers.find(x=>x.id===tier) || tiers[0] || DEFAULT_TIERS[0]
  return (
    <span style={{ fontSize:9,padding:'2px 10px',borderRadius:10,fontWeight:800,
      background:t.color+'18',color:t.color,whiteSpace:'nowrap' }}>
      {t.icon} {t.label}
    </span>
  )
}

function KPICard({ icon, label, value, sub, color = A }) {
  return (
    <div style={{ background:'rgba(255,255,255,.12)', borderRadius:12,
      padding:'12px 14px', textAlign:'center', minWidth:110 }}>
      <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginBottom:4 }}>{icon} {label}</div>
      <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize:9, color:'rgba(255,255,255,.6)', marginTop:2 }}>{sub}</div>}
    </div>
  )
}

const fmt = n => n == null ? '—' : `NPR ${Number(n).toLocaleString()}`
const inp = {
  padding:'7px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',
  fontSize:11,outline:'none',fontFamily:'inherit',boxSizing:'border-box',
}

// ══════════════════════════════════════════════════════════════════════════
export default function ReferralCommissionPage() {

  const [tab,         setTab]         = useState('dashboard')
  const [partners,    setPartners]    = useState([])
  const [selPartner,  setSelPartner]  = useState('')
  const [partnerDetail, setPartnerDetail] = useState(null)
  const [summary,     setSummary]     = useState({})      // platform KPIs
  const [tiers,       setTiers]       = useState(DEFAULT_TIERS)
  const [commRules,   setCommRules]   = useState({
    trial_commission: false, min_payout: 2000, payout_day: 25,
    lock_period: 30, chargeback_period: 90, lifetime: true, upgrade_bonus: 5,
  })
  const [planMRR,     setPlanMRR]     = useState({})
  const [loading,     setLoading]     = useState(true)
  const [detailLoad,  setDetailLoad]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [toast,       setToast]       = useState('')
  const [showAdd,     setShowAdd]     = useState(false)
  const [newPartner,  setNewPartner]  = useState({
    name:'',type:'',email:'',phone:'',pan:'',
    bank:'',account:'',tier:'silver',
  })
  const [editTiers,   setEditTiers]   = useState([])

  const notify = m => { setToast(m); setTimeout(()=>setToast(''),3500) }

  // ── Load all data on mount ─────────────────────────────────────────────────
  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      // 1. Partners list
      const r1 = await fetch('/api/elogix-admin/v1/referral/partners', { headers:_adminH() })
      if (r1.ok) {
        const d1 = await r1.json()
        const list = d1.data || d1.partners || []
        setPartners(list)
        if (list.length && !selPartner) setSelPartner(list[0].id)
      }

      // 2. Platform summary KPIs
      const r2 = await fetch('/api/elogix-admin/v1/referral/summary', { headers:_adminH() })
      if (r2.ok) { const d2 = await r2.json(); setSummary(d2.data || d2) }

      // 3. Commission config (tiers + rules + plan MRR)
      const r3 = await fetch('/api/elogix-admin/v1/referral/commission-config', { headers:_adminH() })
      if (r3.ok) {
        const d3 = await r3.json()
        const cfg = d3.data || d3
        if (cfg.tiers?.length)  { setTiers(cfg.tiers); setEditTiers(cfg.tiers) }
        if (cfg.rules)            setCommRules(r => ({ ...r, ...cfg.rules }))
        if (cfg.plan_mrr)         setPlanMRR(cfg.plan_mrr)
      }
    } catch(_e) {
      notify('⚠️ API unavailable — showing cached data')
    } finally { setLoading(false) }
  }

  // ── Load single partner detail when selected ───────────────────────────────
  useEffect(() => {
    if (!selPartner) return
    setDetailLoad(true)
    fetch(`/api/elogix-admin/v1/referral/partners/${selPartner}`, { headers:_adminH() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPartnerDetail(d.data || d) })
      .catch(() => {})
      .finally(() => setDetailLoad(false))
  }, [selPartner])

  // ── Save commission config ─────────────────────────────────────────────────
  async function saveConfig() {
    setSaving(true)
    try {
      const r = await fetch('/api/elogix-admin/v1/referral/commission-config', {
        method:'PUT', headers:_adminH(),
        body: JSON.stringify({ tiers: editTiers, rules: commRules }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Save failed')
      setTiers(editTiers)
      notify(`✅ Commission config saved — rates live from next billing cycle`)
    } catch(e) { notify(`❌ ${e.message}`) }
    finally { setSaving(false) }
  }

  // ── Add new partner ────────────────────────────────────────────────────────
  async function addPartner() {
    if (!newPartner.name || !newPartner.email) { notify('⚠️ Name and email required'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/elogix-admin/v1/referral/partners', {
        method:'POST', headers:_adminH(), body:JSON.stringify(newPartner),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to add partner')
      notify(`✅ ${newPartner.name} added as ${newPartner.tier} partner`)
      setShowAdd(false)
      setNewPartner({ name:'',type:'',email:'',phone:'',pan:'',bank:'',account:'',tier:'silver' })
      await loadAll()
    } catch(e) { notify(`❌ ${e.message}`) }
    finally { setSaving(false) }
  }

  // ── Approve / reject payout ────────────────────────────────────────────────
  async function handlePayout(partnerId, action) {
    try {
      const r = await fetch(`/api/elogix-admin/v1/referral/payouts/${partnerId}/${action}`, {
        method:'POST', headers:_adminH(),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Action failed')
      notify(action === 'approve' ? '✅ Payout approved' : '❌ Payout rejected')
      await loadAll()
    } catch(e) { notify(`❌ ${e.message}`) }
  }

  // ── TABS ───────────────────────────────────────────────────────────────────
  const TABS = [
    { id:'dashboard',  icon:'📊', label:'Platform Overview' },
    { id:'partners',   icon:'🤝', label:'Partners' },
    { id:'commission', icon:'💰', label:'Commission Payouts' },
    { id:'rates',      icon:'⚙️', label:'Rate Configuration' },
  ]

  const viewPartner = partnerDetail || partners.find(p => p.id === selPartner) || null
  const activeEt = idx => v => setEditTiers(prev => prev.map((t,i) => i===idx ? {...t,...v} : t))

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", minHeight:'100vh',
      background:'#f5f3ff', overflowY:'auto', scrollbarWidth:'thin',
      scrollbarColor:`${A} #ede9fe` }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999,
          background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:12,
          padding:'12px 20px', fontSize:11, color:'#4c1d95', fontWeight:700,
          boxShadow:'0 4px 20px rgba(0,0,0,.12)', maxWidth:360 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background:G, padding:'18px 24px', borderRadius:'0 0 16px 16px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          flexWrap:'wrap', gap:12, marginBottom: summary.total_partners != null ? 16 : 0 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>
              🤝 Referral & Commission Management
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2 }}>
              eLogix SuperAdmin · Full commission transparency & payout control
            </div>
          </div>
          <button onClick={() => setShowAdd(p => !p)}
            style={{ padding:'8px 18px', borderRadius:10, border:'none',
              background:'rgba(255,255,255,.2)', color:'#fff',
              fontSize:11, fontWeight:800, cursor:'pointer' }}>
            ＋ Add Partner
          </button>
        </div>

        {/* Platform KPIs from API */}
        {!loading && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',
            gap:10, marginTop:4 }}>
            <KPICard icon="🤝" label="Partners"      value={summary.total_partners}   sub="registered"/>
            <KPICard icon="🏢" label="Client Cos."   value={summary.total_clients}    sub="referred total"/>
            <KPICard icon="✅" label="Active Clients" value={summary.active_clients}   sub="paying tenants"/>
            <KPICard icon="💵" label="Platform MRR"  value={summary.total_mrr != null ? `NPR ${Number(summary.total_mrr).toLocaleString()}` : '—'}/>
            <KPICard icon="💰" label="Comm. Due"     value={summary.commission_due != null ? `NPR ${Number(summary.commission_due).toLocaleString()}` : '—'} sub="this cycle"/>
            <KPICard icon="📤" label="Paid Out (YTD)" value={summary.ytd_payout != null ? `NPR ${Number(summary.ytd_payout).toLocaleString()}` : '—'}/>
          </div>
        )}
        {loading && (
          <div style={{ textAlign:'center', padding:'24px 0', color:'rgba(255,255,255,.7)', fontSize:12 }}>
            ⟳ Loading referral data...
          </div>
        )}
      </div>

      {/* Add Partner form */}
      {showAdd && (
        <div style={{ margin:'0 24px 16px', background:'#fff', borderRadius:14,
          border:'1px solid #ddd6fe', padding:'20px', boxShadow:'0 4px 20px rgba(124,58,237,.08)' }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:16 }}>
            ➕ Add New Partner
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
            {[
              ['Full Name *',        'name',    'text',   'Partner full name'],
              ['Partner Type',       'type',    'text',   'Individual / HR Firm / Reseller'],
              ['Email *',            'email',   'email',  'partner@example.com'],
              ['Phone',              'phone',   'tel',    '+977-98XXXXXXXX'],
              ['PAN Number',         'pan',     'text',   'Tax PAN/VAT number'],
              ['Bank Name',          'bank',    'text',   'Nepal Investment Bank'],
              ['Bank Account No.',   'account', 'text',   'Account number'],
            ].map(([lbl,key,type,ph]) => (
              <div key={key}>
                <div style={{ fontSize:10, fontWeight:700, color:'#64748b', marginBottom:4 }}>{lbl}</div>
                <input type={type} value={newPartner[key]} placeholder={ph}
                  onChange={e => setNewPartner(p => ({...p, [key]:e.target.value}))}
                  style={{ ...inp, width:'100%' }}/>
              </div>
            ))}
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'#64748b', marginBottom:4 }}>Tier</div>
              <select value={newPartner.tier}
                onChange={e => setNewPartner(p => ({...p, tier:e.target.value}))}
                style={{ ...inp, width:'100%' }}>
                {tiers.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label} ({t.rate}%)</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:16 }}>
            <button onClick={addPartner} disabled={saving}
              style={{ padding:'9px 22px', borderRadius:10, border:'none',
                background:A, color:'#fff', fontSize:12, fontWeight:700,
                cursor:'pointer', opacity:saving ? .6 : 1 }}>
              {saving ? 'Adding...' : '✅ Add Partner'}
            </button>
            <button onClick={() => setShowAdd(false)}
              style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #e2e8f0',
                background:'#fff', fontSize:11, cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, padding:'0 24px', marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'8px 16px', borderRadius:20, border:'none', cursor:'pointer',
              fontSize:11, fontWeight: tab===t.id ? 700 : 500,
              background: tab===t.id ? A : 'rgba(124,58,237,.1)',
              color: tab===t.id ? '#fff' : A,
              boxShadow: tab===t.id ? '0 2px 8px rgba(124,58,237,.25)' : 'none' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'0 24px 32px' }}>

        {/* ══ PLATFORM OVERVIEW TAB ══ */}
        {tab === 'dashboard' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {partners.length === 0 && !loading ? (
              <div style={{ textAlign:'center', padding:60, background:'#fff',
                borderRadius:16, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🤝</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#475569', marginBottom:6 }}>
                  No partners registered yet
                </div>
                <div style={{ fontSize:12, color:'#94a3b8', marginBottom:20 }}>
                  Add your first referral partner to start tracking commissions
                </div>
                <button onClick={() => setShowAdd(true)}
                  style={{ padding:'10px 24px', borderRadius:10, border:'none',
                    background:A, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  ＋ Add First Partner
                </button>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
                {partners.map(p => {
                  const stats = p.stats || {}
                  const tierInfo = tiers.find(t=>t.id===p.tier) || DEFAULT_TIERS[0]
                  return (
                    <div key={p.id} style={{ background:'#fff', borderRadius:14,
                      border: selPartner===p.id ? `2px solid ${A}` : '1.5px solid #e2e8f0',
                      padding:'16px 18px', cursor:'pointer',
                      boxShadow:'0 2px 8px rgba(0,0,0,.05)',
                      transition:'all .15s' }}
                      onClick={() => { setSelPartner(p.id); setTab('partners') }}>
                      <div style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'flex-start', marginBottom:10 }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>{p.name}</div>
                          <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>
                            {p.type || 'Partner'} · {p.email}
                          </div>
                        </div>
                        <TierBadge tier={p.tier} tiers={tiers}/>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                        {[
                          ['Clients',    stats.active_clients ?? p.active_clients ?? '—'],
                          ['MRR',        stats.total_mrr != null ? `NPR ${Number(stats.total_mrr).toLocaleString()}` : '—'],
                          ['Comm./mo',   stats.monthly_commission != null ? `NPR ${Number(stats.monthly_commission).toLocaleString()}` : '—'],
                        ].map(([l,v]) => (
                          <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'8px 10px' }}>
                            <div style={{ fontSize:8, color:'#94a3b8' }}>{l}</div>
                            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginTop:2 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ PARTNERS TAB ══ */}
        {tab === 'partners' && (
          <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:16 }}>
            {/* Partner list */}
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
              overflow:'hidden', height:'fit-content' }}>
              <div style={{ padding:'12px 14px', borderBottom:'1px solid #f1f5f9',
                fontSize:11, fontWeight:800, color:'#0f172a' }}>
                🤝 Partners ({partners.length})
              </div>
              {partners.length === 0 ? (
                <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:11 }}>
                  No partners yet
                </div>
              ) : partners.map(p => (
                <div key={p.id} onClick={() => setSelPartner(p.id)}
                  style={{ padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid #f8fafc',
                    background: selPartner===p.id ? '#f5f3ff' : '#fff',
                    borderLeft: selPartner===p.id ? `3px solid ${A}` : '3px solid transparent' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>{p.name}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                    <TierBadge tier={p.tier} tiers={tiers}/>
                    <StatusBadge status={p.status || 'active'}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Partner detail */}
            <div>
              {detailLoad ? (
                <div style={{ textAlign:'center', padding:40, color:A, fontSize:12 }}>
                  ⟳ Loading partner data...
                </div>
              ) : !viewPartner ? (
                <div style={{ textAlign:'center', padding:60, background:'#fff',
                  borderRadius:14, border:'1px solid #e2e8f0', color:'#94a3b8' }}>
                  Select a partner to view details
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {/* Partner info card */}
                  <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
                    padding:'18px 20px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between',
                      alignItems:'flex-start', marginBottom:14, flexWrap:'wrap', gap:10 }}>
                      <div>
                        <div style={{ fontSize:15, fontWeight:800, color:'#0f172a' }}>
                          {viewPartner.name}
                        </div>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>
                          {viewPartner.type} · Joined {viewPartner.joined_at || viewPartner.joined || '—'}
                        </div>
                        <div style={{ display:'flex', gap:6, marginTop:6 }}>
                          <TierBadge tier={viewPartner.tier} tiers={tiers}/>
                          <StatusBadge status={viewPartner.status || 'active'}/>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        {[
                          ['Active Clients',    (viewPartner.stats?.active_clients ?? '—')],
                          ['Monthly Comm.',     viewPartner.stats?.monthly_commission != null ? fmt(viewPartner.stats.monthly_commission) : '—'],
                          ['Total Earned',      viewPartner.stats?.total_earned != null ? fmt(viewPartner.stats.total_earned) : '—'],
                          ['Pending Payout',    viewPartner.stats?.pending_payout != null ? fmt(viewPartner.stats.pending_payout) : '—'],
                        ].map(([l,v]) => (
                          <div key={l} style={{ background:'#f8fafc', borderRadius:9, padding:'10px 12px' }}>
                            <div style={{ fontSize:9, color:'#94a3b8' }}>{l}</div>
                            <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginTop:2 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',
                      gap:8, fontSize:11 }}>
                      {[
                        ['Email',       viewPartner.email],
                        ['Phone',       viewPartner.phone],
                        ['PAN',         viewPartner.pan],
                        ['Bank',        viewPartner.bank],
                        ['Account',     viewPartner.account],
                        ['Comm. Rate',  `${tiers.find(t=>t.id===viewPartner.tier)?.rate || '—'}%`],
                      ].map(([k,v]) => (
                        <div key={k} style={{ display:'flex', justifyContent:'space-between',
                          padding:'5px 0', borderBottom:'1px solid #f1f5f9' }}>
                          <span style={{ color:'#64748b' }}>{k}</span>
                          <span style={{ fontWeight:600, color:'#0f172a' }}>{v || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Referred clients table */}
                  <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
                    overflow:'hidden' }}>
                    <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9',
                      display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>
                        🏢 Referred Clients ({(viewPartner.referrals || []).length})
                      </div>
                      <span style={{ fontSize:9, color:'#94a3b8' }}>
                        Live billing data · transparent to partner
                      </span>
                    </div>
                    {(viewPartner.referrals || []).length === 0 ? (
                      <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:11 }}>
                        No referred clients yet for this partner
                      </div>
                    ) : (
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                          <thead>
                            <tr style={{ background:'#f8fafc' }}>
                              {['Company','Plan','MRR','Rate','Monthly Earn','Months','Total Earned','Status'].map(h => (
                                <th key={h} style={{ padding:'8px 12px', textAlign:'left',
                                  fontSize:9, fontWeight:700, color:'#64748b',
                                  borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(viewPartner.referrals || []).map((r, i) => {
                              const rate = tiers.find(t=>t.id===viewPartner.tier)?.rate || 10
                              const earn = r.status==='active' ? Math.round((r.mrr||0)*rate/100) : 0
                              return (
                                <tr key={r.tenant_id || i}
                                  style={{ background:i%2===0?'#fff':'#fafafa',
                                    borderBottom:'1px solid #f1f5f9' }}>
                                  <td style={{ padding:'8px 12px', fontWeight:600, color:'#0f172a' }}>
                                    {r.company}
                                  </td>
                                  <td style={{ padding:'8px 12px' }}>
                                    <span style={{ fontSize:9, padding:'2px 7px', borderRadius:8,
                                      background:'#f5f3ff', color:A, fontWeight:700 }}>
                                      {r.plan ? r.plan.charAt(0).toUpperCase()+r.plan.slice(1) : '—'}
                                    </span>
                                  </td>
                                  <td style={{ padding:'8px 12px', fontWeight:700, color:'#0369a1' }}>
                                    {r.mrr != null ? fmt(r.mrr) : '—'}
                                  </td>
                                  <td style={{ padding:'8px 12px', color:'#64748b' }}>{rate}%</td>
                                  <td style={{ padding:'8px 12px', fontWeight:800, color:A }}>
                                    {r.status==='active' ? fmt(earn) : '—'}
                                  </td>
                                  <td style={{ padding:'8px 12px', color:'#64748b' }}>
                                    {r.paid_months ?? '—'}
                                  </td>
                                  <td style={{ padding:'8px 12px', fontWeight:700, color:'#16a34a' }}>
                                    {r.total_earned != null ? fmt(r.total_earned)
                                      : earn > 0 ? fmt(earn*(r.paid_months||0)) : '—'}
                                  </td>
                                  <td style={{ padding:'8px 12px' }}>
                                    <StatusBadge status={r.status}/>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ COMMISSION PAYOUTS TAB ══ */}
        {tab === 'commission' && (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9',
              fontSize:13, fontWeight:800, color:'#0f172a' }}>
              💰 Commission Payouts
            </div>
            {partners.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>💰</div>
                <div style={{ fontSize:13, fontWeight:600, color:'#475569' }}>
                  No payout data available
                </div>
                <div style={{ fontSize:11, marginTop:4 }}>
                  Payouts appear once partners refer active tenants
                </div>
              </div>
            ) : partners.map(p => {
              const stats   = p.stats || {}
              const pending = stats.pending_payout ?? 0
              const tierInfo = tiers.find(t=>t.id===p.tier) || DEFAULT_TIERS[0]
              return (
                <div key={p.id} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', padding:'14px 18px',
                  borderBottom:'1px solid #f8fafc', flexWrap:'wrap', gap:10 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{p.name}</span>
                      <TierBadge tier={p.tier} tiers={tiers}/>
                    </div>
                    <div style={{ fontSize:10, color:'#64748b' }}>
                      Monthly: {stats.monthly_commission != null ? fmt(stats.monthly_commission) : '—'}
                      &nbsp;·&nbsp; Total Earned: {stats.total_earned != null ? fmt(stats.total_earned) : '—'}
                      &nbsp;·&nbsp; Rate: {tierInfo.rate}%
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:16, fontWeight:900, color:A }}>
                        {pending > 0 ? fmt(pending) : '—'}
                      </div>
                      <div style={{ fontSize:9, color:'#94a3b8' }}>pending payout</div>
                    </div>
                    {pending > 0 && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => handlePayout(p.id, 'approve')}
                          style={{ padding:'6px 14px', borderRadius:8, border:'none',
                            background:'#16a34a', color:'#fff', fontSize:10,
                            fontWeight:700, cursor:'pointer' }}>
                          ✅ Approve
                        </button>
                        <button onClick={() => handlePayout(p.id, 'reject')}
                          style={{ padding:'6px 14px', borderRadius:8,
                            border:'1px solid #fecaca', background:'#fef2f2',
                            color:'#dc2626', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                          ❌ Reject
                        </button>
                      </div>
                    )}
                    {pending === 0 && (
                      <span style={{ fontSize:10, color:'#10b981', fontWeight:700 }}>✓ No pending</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══ RATE CONFIGURATION TAB ══ */}
        {tab === 'rates' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Tier rate editor */}
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
              padding:'18px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                marginBottom:16, flexWrap:'wrap', gap:8 }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>
                  ⚙️ Partner Tier Commission Rates
                </div>
                <button onClick={saveConfig} disabled={saving}
                  style={{ padding:'8px 20px', borderRadius:9, border:'none',
                    background:A, color:'#fff', fontSize:11, fontWeight:700,
                    cursor:'pointer', opacity:saving ? .6 : 1 }}>
                  {saving ? '⟳ Saving...' : '💾 Save All Rates → API'}
                </button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['Tier','Min Clients','Max Clients','Commission Rate %','Monthly Bonus (NPR)'].map(h => (
                        <th key={h} style={{ padding:'10px 12px', textAlign:'left',
                          fontSize:10, fontWeight:700, color:'#64748b',
                          borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editTiers.map((tier, idx) => (
                      <tr key={tier.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'12px' }}>
                          <span style={{ fontWeight:800, color:tier.color }}>
                            {tier.icon} {tier.label}
                          </span>
                        </td>
                        <td style={{ padding:'12px', color:'#64748b' }}>{tier.minClients}+</td>
                        <td style={{ padding:'12px', color:'#64748b' }}>
                          {tier.maxClients >= 999 ? '∞' : tier.maxClients}
                        </td>
                        <td style={{ padding:'12px' }}>
                          <input type="number" min="0" max="50" step="0.5"
                            value={editTiers[idx].rate}
                            onChange={e => activeEt(idx)({ rate: parseFloat(e.target.value)||0 })}
                            style={{ ...inp, width:80, textAlign:'center' }}/>
                          <span style={{ marginLeft:6, color:'#64748b' }}>%</span>
                        </td>
                        <td style={{ padding:'12px' }}>
                          <input type="number" min="0"
                            value={editTiers[idx].monthlyBonus}
                            onChange={e => activeEt(idx)({ monthlyBonus: parseFloat(e.target.value)||0 })}
                            style={{ ...inp, width:100, textAlign:'center' }}/>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop:14, padding:12, background:'#fffbeb', borderRadius:9,
                border:'1px solid #fde68a', fontSize:10, color:'#92400e' }}>
                ⚠️ Rate changes apply to NEW commission calculations from next billing cycle.
                Existing approved payouts are not affected. Changes are saved to the API — live across all pages.
              </div>
            </div>

            {/* Commission rules */}
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
              padding:'18px 20px' }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:14 }}>
                📋 Commission Rules
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',
                gap:12 }}>
                {[
                  ['Min Payout (NPR)',         'min_payout',        'number'],
                  ['Payout Day (of month)',    'payout_day',        'number'],
                  ['Lock Period (days)',        'lock_period',       'number'],
                  ['Chargeback Period (days)', 'chargeback_period', 'number'],
                  ['Upgrade Bonus (%)',        'upgrade_bonus',     'number'],
                ].map(([lbl,key,type]) => (
                  <div key={key}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#64748b', marginBottom:5 }}>{lbl}</div>
                    <input type={type} value={commRules[key] ?? ''}
                      onChange={e => setCommRules(r => ({...r,[key]:+e.target.value}))}
                      style={{ ...inp, width:'100%' }}/>
                  </div>
                ))}
                {[
                  ['Trial Commission',  'trial_commission'],
                  ['Lifetime Commission','lifetime'],
                ].map(([lbl,key]) => (
                  <div key={key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="checkbox" checked={!!commRules[key]}
                      onChange={e => setCommRules(r => ({...r,[key]:e.target.checked}))}
                      style={{ width:16, height:16, cursor:'pointer' }}/>
                    <span style={{ fontSize:11, fontWeight:600, color:'#374151' }}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Commission matrix — from API plan MRR × tiers */}
            {Object.keys(planMRR).length > 0 && (
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
                padding:'18px 20px', overflowX:'auto' }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:14 }}>
                  📊 Commission per Plan × Tier (NPR/month)
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      <th style={{ padding:'8px 12px', textAlign:'left', fontSize:10,
                        color:'#64748b', fontWeight:700 }}>Plan</th>
                      {editTiers.map(t => (
                        <th key={t.id} style={{ padding:'8px 12px', textAlign:'center',
                          fontSize:10, color:t.color, fontWeight:800 }}>
                          {t.icon} {t.rate}%
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(planMRR).filter(([,v])=>v>0).map(([plan,mrr],i) => (
                      <tr key={plan} style={{ background:i%2===0?'#fff':'#fafafa',
                        borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'10px 12px', fontWeight:700, color:'#374151',
                          textTransform:'capitalize' }}>
                          {plan} ({fmt(mrr)}/mo)
                        </td>
                        {editTiers.map(t => (
                          <td key={t.id} style={{ padding:'10px 12px', textAlign:'center',
                            fontWeight:700, color:t.color }}>
                            {fmt(Math.round(mrr*t.rate/100))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// FILE: src/components/dashboard/snapshots/ReferralCommissionPage.jsx
// eLogix HRMS — Referral & Commission Management
// Tracks: Partners/Referrers → Referred Tenants → Revenue → Commission
// Access:
//   - eLogix SuperAdmin/Executive: full view + configure rates + approve payouts
//   - Partner/Stakeholder: their own referrals, commission earned, payout status
// Transparent: partners see live data on their referred tenants' billing
// eLogix Technologies · www.elogix.com.np
import { useState, useMemo } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const A = '#7c3aed'
const G = 'linear-gradient(135deg,#1e1b4b,#7c3aed,#c4b5fd)'

// ── COMMISSION TIERS ──────────────────────────────────────────
const COMMISSION_TIERS = [
  { id:'silver',   label:'Silver Partner',   icon:'🥈', color:'#64748b', minClients:1,  maxClients:4,  rate:10, bonus:0,    monthlyBonus:0 },
  { id:'gold',     label:'Gold Partner',     icon:'🥇', color:'#d97706', minClients:5,  maxClients:9,  rate:15, bonus:5000, monthlyBonus:2000 },
  { id:'platinum', label:'Platinum Partner', icon:'💎', color:'#0891b2', minClients:10, maxClients:19, rate:20, bonus:15000,monthlyBonus:5000 },
  { id:'diamond',  label:'Diamond Partner',  icon:'💠', color:'#7c3aed', minClients:20, maxClients:999,rate:25, bonus:50000,monthlyBonus:15000 },
]

// ── COMMISSION RULES ──────────────────────────────────────────
const COMMISSION_RULES = {
  base_rate:         10,    // % of Monthly Recurring Revenue (MRR) - Silver default
  trial_commission:  false, // No commission on free trials
  min_payout:        2000,  // NPR minimum payout amount
  payout_day:        25,    // 25th of every month
  lock_period:       30,    // 30 days after client payment — then commission is released
  chargeback_period: 90,    // 90 days — if client refunds, commission reversed
  lifetime:          true,  // Lifetime commission (as long as client stays)
  upgrade_bonus:     5,     // Extra % when referred client upgrades plan

// ── PLANS MONTHLY VALUE ───────────────────────────────────────
const PLAN_MRR = {
  trial:      0,
  starter:    5000,
  growth:     12000,
  business:   25000,
  enterprise: 45000,
  unlimited:  75000,

// ── DEMO PARTNERS ─────────────────────────────────────────────
const DEMO_PARTNERS = [
  {
    id:'p1', name:'Rajesh Kumar Sharma', type:'Individual Consultant',
    email:'rajesh@example.com', phone:'+977-9801234567',
    pan:'12345678', bank:'Nepal Investment Bank', account:'01234567890',
    tier:'platinum', joined:'2082-06-15', status:'active',
    referrals: [
      { tenant_id:'t1', company:'Himalayan Bank Ltd.',    plan:'enterprise', mrr:45000, since:'2082-07-01', status:'active',  paid_months:13 },
      { tenant_id:'t2', company:'Grande Hospital',        plan:'business',   mrr:25000, since:'2082-08-15', status:'active',  paid_months:12 },
      { tenant_id:'t3', company:'Surya Nepal Pvt Ltd',    plan:'business',   mrr:25000, since:'2082-10-01', status:'active',  paid_months:10 },
      { tenant_id:'t4', company:'Ncell Pvt Ltd',          plan:'enterprise', mrr:45000, since:'2083-01-20', status:'active',  paid_months:7  },
      { tenant_id:'t5', company:'Nepal Airlines Corp',    plan:'growth',     mrr:12000, since:'2083-02-10', status:'active',  paid_months:6  },
      { tenant_id:'t6', company:'Tara Gaon Resort',       plan:'starter',    mrr:5000,  since:'2083-03-05', status:'active',  paid_months:5  },
      { tenant_id:'t7', company:'Nepal Telecom',          plan:'unlimited',  mrr:75000, since:'2083-03-20', status:'active',  paid_months:4  },
      { tenant_id:'t8', company:'Shangrila Hotel',        plan:'business',   mrr:25000, since:'2083-04-01', status:'active',  paid_months:3  },
      { tenant_id:'t9', company:'Yeti Airlines',          plan:'enterprise', mrr:45000, since:'2083-04-15', status:'pending', paid_months:2  },
      { tenant_id:'t10',company:'CG Corp Nepal',          plan:'unlimited',  mrr:75000, since:'2083-04-20', status:'trial',   paid_months:0  },
    ],
  },
  {
    id:'p2', name:'Sita Devi Adhikari', type:'HR Consulting Firm',
    email:'sita@hrconsult.com.np', phone:'+977-9851234567',
    pan:'87654321', bank:'Nabil Bank', account:'9876543210',
    tier:'gold', joined:'2082-09-01', status:'active',
    referrals: [
      { tenant_id:'t11',company:'Room to Read Nepal',     plan:'growth',     mrr:12000, since:'2082-10-01', status:'active',  paid_months:10 },
      { tenant_id:'t12',company:'Plan International',     plan:'business',   mrr:25000, since:'2082-11-15', status:'active',  paid_months:9  },
      { tenant_id:'t13',company:'World Vision Nepal',     plan:'business',   mrr:25000, since:'2083-01-01', status:'active',  paid_months:7  },
      { tenant_id:'t14',company:'Save the Children',      plan:'growth',     mrr:12000, since:'2083-02-20', status:'active',  paid_months:5  },
      { tenant_id:'t15',company:'Mercy Corps Nepal',      plan:'growth',     mrr:12000, since:'2083-03-10', status:'pending', paid_months:3  },
    ],
  },
  {
    id:'p3', name:'Bikram Thapa', type:'Technology Reseller',
    email:'bikram@technepal.com', phone:'+977-9841234567',
    pan:'11223344', bank:'Siddhartha Bank', account:'1122334455',
    tier:'silver', joined:'2083-02-01', status:'active',
    referrals: [
      { tenant_id:'t16',company:'Leapfrog Technology',    plan:'growth',     mrr:12000, since:'2083-03-01', status:'active',  paid_months:4 },
      { tenant_id:'t17',company:'Cotiviti Nepal',         plan:'business',   mrr:25000, since:'2083-03-20', status:'active',  paid_months:3 },
      { tenant_id:'t18',company:'F1Soft International',   plan:'business',   mrr:25000, since:'2083-04-01', status:'pending', paid_months:2 },
    ],
  },
  {
    id:'p4', name:'Priya Shrestha', type:'Business Development',
    email:'priya@elogix.com.np', phone:'+977-9861234567',
    pan:'55667788', bank:'Standard Chartered', account:'5566778899',
    tier:'diamond', joined:'2082-01-01', status:'active',
    referrals: [
      { tenant_id:'t19',company:'Ncell Axiata',           plan:'unlimited',  mrr:75000, since:'2082-02-01', status:'active',  paid_months:18 },
      { tenant_id:'t20',company:'Chaudhary Group',        plan:'unlimited',  mrr:75000, since:'2082-03-15', status:'active',  paid_months:16 },
      { tenant_id:'t21',company:'Soaltee Hotel',          plan:'enterprise', mrr:45000, since:'2082-05-01', status:'active',  paid_months:15 },
      { tenant_id:'t22',company:'Dabur Nepal',            plan:'enterprise', mrr:45000, since:'2082-06-01', status:'active',  paid_months:14 },
      { tenant_id:'t23',company:'Himalayan Power Plant',  plan:'business',   mrr:25000, since:'2082-07-01', status:'active',  paid_months:13 },
      { tenant_id:'t24',company:'Nepal SBI Bank',         plan:'enterprise', mrr:45000, since:'2082-08-01', status:'active',  paid_months:12 },
      { tenant_id:'t25',company:'Jawalakhel Group',       plan:'business',   mrr:25000, since:'2082-09-01', status:'active',  paid_months:11 },
      { tenant_id:'t26',company:'Vianet Communications',  plan:'business',   mrr:25000, since:'2082-10-01', status:'active',  paid_months:10 },
      { tenant_id:'t27',company:'Kathmandu Valley Water', plan:'growth',     mrr:12000, since:'2082-11-01', status:'active',  paid_months:9  },
      { tenant_id:'t28',company:'Nepal Oil Corporation',  plan:'enterprise', mrr:45000, since:'2082-12-01', status:'active',  paid_months:8  },
      { tenant_id:'t29',company:'Bottlers Nepal',         plan:'business',   mrr:25000, since:'2083-01-01', status:'active',  paid_months:7  },
      { tenant_id:'t30',company:'Unilever Nepal',         plan:'enterprise', mrr:45000, since:'2083-02-01', status:'active',  paid_months:6  },
      { tenant_id:'t31',company:'Siddhartha Group',       plan:'unlimited',  mrr:75000, since:'2083-03-01', status:'active',  paid_months:5  },
      { tenant_id:'t32',company:'Global IME Bank',        plan:'enterprise', mrr:45000, since:'2083-03-15', status:'active',  paid_months:4  },
      { tenant_id:'t33',company:'Nepal Bank Ltd',         plan:'enterprise', mrr:45000, since:'2083-04-01', status:'pending', paid_months:3  },
      { tenant_id:'t34',company:'Bhrikuti Paper Mill',    plan:'business',   mrr:25000, since:'2083-04-10', status:'active',  paid_months:2  },
      { tenant_id:'t35',company:'Chilime Hydropower',     plan:'business',   mrr:25000, since:'2083-04-15', status:'active',  paid_months:2  },
      { tenant_id:'t36',company:'Khimti Hydropower',      plan:'growth',     mrr:12000, since:'2083-04-20', status:'trial',   paid_months:0  },
      { tenant_id:'t37',company:'Shivam Cement',          plan:'business',   mrr:25000, since:'2083-04-25', status:'trial',   paid_months:0  },
      { tenant_id:'t38',company:'Hetauda Cement',         plan:'growth',     mrr:12000, since:'2083-05-01', status:'trial',   paid_months:0  },
    ],
  },
]

// ── HELPERS ──────────────────────────────────────────────────
function getCommissionRate(tier) {
  return COMMISSION_TIERS.find(t=>t.id===tier)?.rate || 10

function calcPartnerStats(partner) {
  const tier_info = COMMISSION_TIERS.find(t=>t.id===partner.tier)
  const rate      = tier_info?.rate || 10
  const active    = partner.referrals.filter(r=>r.status==='active')
  const total_mrr = active.reduce((s,r)=>s+r.mrr,0)
  const monthly_commission = Math.round(total_mrr * rate / 100)
  const total_earned = partner.referrals.reduce((s,r)=>{
    if (r.status==='active') return s + Math.round(r.mrr * rate/100 * r.paid_months)
    return s
  }, 0)
  const pending_payout = Math.round(monthly_commission * 0.3) // simplified
  return {
    rate, tier_info,
    total_clients: partner.referrals.length,
    active_clients: active.length,
    total_mrr,
    monthly_commission,
    total_earned,
    pending_payout,
    ytd: Math.round(monthly_commission * 8),

// ── STATUS BADGE ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    active:  { bg:'#f0fdf4', color:'#16a34a', label:'● Active' },
    pending: { bg:'#fffbeb', color:'#d97706', label:'⏳ Pending' },
    trial:   { bg:'#f0f9ff', color:'#0369a1', label:'🎁 Trial' },
    paid:    { bg:'#f0fdf4', color:'#16a34a', label:'✓ Paid' },
  const c = cfg[status] || cfg.active
  return (
    <span style={{ fontSize:9,padding:'2px 8px',borderRadius:10,fontWeight:700,
      background:c.bg,color:c.color,whiteSpace:'nowrap' }}>
      {c.label}
    </span>
  )

// ── TIER BADGE ───────────────────────────────────────────────
function TierBadge({ tier }) {
  const t = COMMISSION_TIERS.find(x=>x.id===tier) || COMMISSION_TIERS[0]
  return (
    <span style={{ fontSize:9,padding:'2px 10px',borderRadius:10,fontWeight:800,
      background:t.color+'18',color:t.color,whiteSpace:'nowrap' }}>
      {t.icon} {t.label}
    </span>
  )

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function ReferralCommissionPage() {
  const { currentPersona, persona } = useApp()
  const role = (currentPersona?.id||persona||'').toLowerCase()
  const isSuperAdmin = role.includes('super')||role.includes('admin')||role.includes('exec')

  const [tab,         setTab]         = useState('dashboard')
  const [selPartner,  setSelPartner]  = useState(DEMO_PARTNERS[0].id)
  const [showRules,   setShowRules]   = useState(false)
  const [showAddPart, setShowAddPart] = useState(false)
  const [toast,       setToast]       = useState('')
  const [editRate,    setEditRate]    = useState({})

  const notify = m => { setToast(m); setTimeout(()=>setToast(''),3000) }

  // For partner view — only show their own data
  const viewPartner = isSuperAdmin
    ? DEMO_PARTNERS.find(p=>p.id===selPartner) || DEMO_PARTNERS[0]
    : DEMO_PARTNERS[1]  // demo: show Sita's view for partner

  const stats = useMemo(()=>calcPartnerStats(viewPartner), [viewPartner])

  // Platform-wide stats (SuperAdmin only)
  const platformStats = useMemo(()=>{
    const all_stats = DEMO_PARTNERS.map(p=>({...p,...calcPartnerStats(p)}))
    return {
      total_partners:     DEMO_PARTNERS.length,
      active_partners:    DEMO_PARTNERS.filter(p=>p.status==='active').length,
      total_clients:      all_stats.reduce((s,p)=>s+p.total_clients,0),
      active_clients:     all_stats.reduce((s,p)=>s+p.active_clients,0),
      total_mrr:          all_stats.reduce((s,p)=>s+p.total_mrr,0),
      total_commission:   all_stats.reduce((s,p)=>s+p.monthly_commission,0),
      total_earned:       all_stats.reduce((s,p)=>s+p.total_earned,0),
      pending_payout:     all_stats.reduce((s,p)=>s+p.pending_payout,0),
  }, [])

  const TABS = isSuperAdmin
    ? [
        { id:'dashboard',  icon:'📊', label:'Platform Overview' },
        { id:'partners',   icon:'🤝', label:'Partners' },
        { id:'commission', icon:'💰', label:'Commission Payouts' },
        { id:'rates',      icon:'⚙️', label:'Rate Configuration' },
      ]
    : [
        { id:'dashboard',  icon:'📊', label:'My Dashboard' },
        { id:'clients',    icon:'🏢', label:'My Clients' },
        { id:'commission', icon:'💰', label:'My Earnings' },
      ]

  return (
    <div style={{ fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f5f3ff' }}>
      {toast && (
        <div style={{ position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f5f3ff',
          border:'1px solid #ddd6fe',borderRadius:12,padding:'12px 20px',fontSize:11,
          color:'#4c1d95',fontWeight:700,boxShadow:'0 4px 20px rgba(0,0,0,.12)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background:G,padding:'16px 24px',borderRadius:'0 0 16px 16px',marginBottom:16 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12 }}>
          <div>
            <div style={{ fontSize:18,fontWeight:900,color:'#fff' }}>
              🤝 Referral & Commission Management
            </div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2 }}>
              {isSuperAdmin
                ? 'eLogix Executive · Full commission transparency & payout control'
                : `Partner Dashboard · ${viewPartner.name} · ${viewPartner.tier.toUpperCase()} TIER`}
            </div>
          </div>
          {isSuperAdmin && (
            <button onClick={()=>setShowAddPart(p=>!p)}
              style={{ padding:'8px 18px',borderRadius:10,border:'none',
                background:'rgba(255,255,255,.2)',color:'#fff',
                fontSize:11,fontWeight:800,cursor:'pointer' }}>
              + Add Partner
            </button>
          )}
        </div>

        {/* Platform KPIs — SuperAdmin */}
        {isSuperAdmin && (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,marginTop:14 }}>
            {[
              { l:'Total Partners',   v:platformStats.total_partners,                       i:'🤝' },
              { l:'Active Partners',  v:platformStats.active_partners,                      i:'✅' },
              { l:'Total Clients',    v:platformStats.total_clients,                         i:'🏢' },
              { l:'Active Clients',   v:platformStats.active_clients,                       i:'📈' },
              { l:'Total MRR',        v:`NPR ${(platformStats.total_mrr/1000).toFixed(0)}K`,i:'💵' },
              { l:'Monthly Commission',v:`NPR ${(platformStats.total_commission/1000).toFixed(0)}K`,i:'💰' },
              { l:'Pending Payout',   v:`NPR ${(platformStats.pending_payout/1000).toFixed(0)}K`,i:'⏳' },
              { l:'Total Earned',     v:`NPR ${(platformStats.total_earned/100000).toFixed(1)}L`,i:'🏆' },
            ].map(s=>(
              <div key={s.l} style={{ background:'rgba(255,255,255,.15)',borderRadius:10,padding:'10px 12px',textAlign:'center' }}>
                <div style={{ fontSize:13,fontWeight:900,color:'#fff' }}>{s.i} {s.v}</div>
                <div style={{ fontSize:8,color:'rgba(255,255,255,.65)',marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Partner KPIs */}
        {!isSuperAdmin && (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,marginTop:14 }}>
            {[
              { l:'My Clients',       v:stats.total_clients,                              i:'🏢' },
              { l:'Active Clients',   v:stats.active_clients,                             i:'✅' },
              { l:'My MRR',           v:`NPR ${(stats.total_mrr/1000).toFixed(0)}K`,      i:'💵' },
              { l:'Commission Rate',  v:`${stats.rate}%`,                                 i:'📊' },
              { l:'Monthly Earning',  v:`NPR ${stats.monthly_commission.toLocaleString()}`,i:'💰' },
              { l:'Total Earned',     v:`NPR ${(stats.total_earned/100000).toFixed(1)}L`, i:'🏆' },
              { l:'Pending Payout',   v:`NPR ${stats.pending_payout.toLocaleString()}`,   i:'⏳' },
              { l:'YTD Earning',      v:`NPR ${(stats.ytd/1000).toFixed(0)}K`,            i:'📅' },
            ].map(s=>(
              <div key={s.l} style={{ background:'rgba(255,255,255,.15)',borderRadius:10,padding:'10px 12px',textAlign:'center' }}>
                <div style={{ fontSize:13,fontWeight:900,color:'#fff' }}>{s.i} {s.v}</div>
                <div style={{ fontSize:8,color:'rgba(255,255,255,.65)',marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:'0 20px 24px' }}>
        {/* Tabs */}
        <div style={{ display:'flex',gap:6,marginBottom:16,flexWrap:'wrap' }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ padding:'8px 18px',borderRadius:20,border:'none',cursor:'pointer',
                fontSize:11,fontWeight:700,transition:'all .12s',
                background:tab===t.id?A:'#fff',color:tab===t.id?'#fff':'#374151',
                boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══ DASHBOARD TAB ══ */}
        {tab==='dashboard' && (
          <div>
            {/* Commission Tier Cards */}
            <div style={{ background:'#fff',borderRadius:12,padding:16,
              boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:14 }}>
              <div style={{ fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:12 }}>
                📊 Commission Tier Structure
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10 }}>
                {COMMISSION_TIERS.map(tier=>{
                  const isActive = !isSuperAdmin && viewPartner.tier===tier.id
                  const partnerCount = DEMO_PARTNERS.filter(p=>p.tier===tier.id).length
                  return (
                    <div key={tier.id}
                      style={{ borderRadius:12,padding:14,
                        border:`2px solid ${isActive?tier.color:tier.color+'30'}`,
                        background:isActive?tier.color+'10':'#fafafa',
                        position:'relative' }}>
                      {isActive && (
                        <div style={{ position:'absolute',top:-8,right:10,
                          background:tier.color,color:'#fff',fontSize:8,fontWeight:800,
                          padding:'2px 8px',borderRadius:10 }}>YOUR TIER</div>
                      )}
                      <div style={{ fontSize:22,marginBottom:6 }}>{tier.icon}</div>
                      <div style={{ fontSize:12,fontWeight:900,color:tier.color }}>{tier.label}</div>
                      <div style={{ fontSize:10,color:'#64748b',marginTop:2 }}>
                        {tier.minClients}{tier.maxClients===999?'+ clients':`–${tier.maxClients} clients`}
                      </div>
                      <div style={{ fontSize:20,fontWeight:900,color:tier.color,margin:'8px 0 4px' }}>
                        {tier.rate}%
                      </div>
                      <div style={{ fontSize:9,color:'#64748b' }}>of monthly billing</div>
                      {tier.bonus>0 && (
                        <div style={{ marginTop:8,padding:'5px 8px',borderRadius:8,
                          background:tier.color+'15',fontSize:9,color:tier.color,fontWeight:600 }}>
                          🎉 Joining bonus: NPR {tier.bonus.toLocaleString()}<br/>
                          📅 Monthly bonus: NPR {tier.monthlyBonus.toLocaleString()}
                        </div>
                      )}
                      {isSuperAdmin && (
                        <div style={{ marginTop:8,fontSize:9,color:'#94a3b8' }}>
                          {partnerCount} partner{partnerCount!==1?'s':''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Commission Rules */}
            <div style={{ background:'#fff',borderRadius:12,padding:16,
              boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:14 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
                <div style={{ fontSize:13,fontWeight:800,color:'#0f172a' }}>📋 Commission Rules & Policy</div>
                <button onClick={()=>setShowRules(p=>!p)}
                  style={{ background:'none',border:'none',cursor:'pointer',fontSize:11,
                    color:A,fontWeight:700 }}>{showRules?'▲ Hide':'▼ Show'}</button>
              </div>
              {showRules && (
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10 }}>
                  {[
                    { icon:'📊', label:'Base Commission Rate', value:'10% of MRR (Silver)', detail:'Increases with tier' },
                    { icon:'🎁', label:'Trial Commission',     value:'No commission on trials', detail:'Commission starts on first paid invoice' },
                    { icon:'💰', label:'Minimum Payout',       value:`NPR ${COMMISSION_RULES.min_payout.toLocaleString()}`, detail:'Must accumulate before payout' },
                    { icon:'📅', label:'Payout Date',          value:`${COMMISSION_RULES.payout_day}th of every month`, detail:'Direct bank transfer' },
                    { icon:'🔒', label:'Lock Period',          value:`${COMMISSION_RULES.lock_period} days`, detail:'After client pays invoice' },
                    { icon:'↩️', label:'Chargeback Period',    value:`${COMMISSION_RULES.chargeback_period} days`, detail:'Commission reversed if refund' },
                    { icon:'♾️', label:'Lifetime Commission',  value:'Yes — while client is active', detail:'No time limit on earning' },
                    { icon:'⬆️', label:'Upgrade Bonus',        value:`+${COMMISSION_RULES.upgrade_bonus}% on upgrade`, detail:'When referred client upgrades plan' },
                  ].map(r=>(
                    <div key={r.label} style={{ padding:'10px 12px',borderRadius:9,
                      background:'#f8fafc',border:'1px solid #e2e8f0' }}>
                      <div style={{ fontSize:16,marginBottom:4 }}>{r.icon}</div>
                      <div style={{ fontSize:10,fontWeight:700,color:'#374151' }}>{r.label}</div>
                      <div style={{ fontSize:12,fontWeight:900,color:A,marginTop:2 }}>{r.value}</div>
                      <div style={{ fontSize:9,color:'#94a3b8',marginTop:2 }}>{r.detail}</div>
                    </div>
                  ))}
                </div>
              )}
              {!showRules && (
                <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
                  {[`Base rate: 10–25% MRR`,`Payout: ${COMMISSION_RULES.payout_day}th monthly`,
                    `Lock: ${COMMISSION_RULES.lock_period} days`,`Lifetime commission`,
                    `Min NPR ${COMMISSION_RULES.min_payout.toLocaleString()}`
                  ].map(r=>(
                    <span key={r} style={{ fontSize:10,padding:'4px 12px',borderRadius:20,
                      background:'#f5f3ff',color:A,fontWeight:600 }}>{r}</span>
                  ))}
                </div>
              )}
            </div>

            {/* My progress to next tier */}
            {!isSuperAdmin && (
              <div style={{ background:'#fff',borderRadius:12,padding:16,
                boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:12 }}>
                  🚀 Your Progress to Next Tier
                </div>
                {(() => {
                  const curTierIdx = COMMISSION_TIERS.findIndex(t=>t.id===viewPartner.tier)
                  const nextTier   = COMMISSION_TIERS[curTierIdx+1]
                  if (!nextTier) return (
                    <div style={{ textAlign:'center',padding:20,color:'#7c3aed',fontWeight:700 }}>
                      💠 You are at DIAMOND — highest tier! Keep growing!
                    </div>
                  )
                  const progress = Math.min(100, Math.round(stats.active_clients/nextTier.minClients*100))
                  return (
                    <>
                      <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,color:'#64748b',marginBottom:6 }}>
                        <span>Current: <b style={{ color:stats.tier_info?.color }}>{stats.tier_info?.label}</b></span>
                        <span>Next: <b style={{ color:nextTier.color }}>{nextTier.icon} {nextTier.label}</b></span>
                      </div>
                      <div style={{ height:10,background:'#f1f5f9',borderRadius:10,overflow:'hidden',marginBottom:8 }}>
                        <div style={{ height:'100%',width:`${progress}%`,background:G,borderRadius:10,transition:'width .5s' }}/>
                      </div>
                      <div style={{ fontSize:10,color:'#64748b',textAlign:'center' }}>
                        {stats.active_clients} / {nextTier.minClients} active clients needed ·
                        <b style={{ color:nextTier.color }}> {nextTier.minClients-stats.active_clients} more to go</b>
                        {' '}→ Unlock <b>{nextTier.rate}% commission</b>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* ══ PARTNERS TAB (SuperAdmin only) ══ */}
        {tab==='partners' && isSuperAdmin && (
          <div style={{ display:'grid',gridTemplateColumns:'240px 1fr',gap:14 }}>
            {/* Partner list */}
            <div style={{ background:'#fff',borderRadius:12,overflow:'hidden',
              boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              {DEMO_PARTNERS.map(p=>{
                const ps = calcPartnerStats(p)
                const isActive = p.id===selPartner
                return (
                  <div key={p.id} onClick={()=>setSelPartner(p.id)}
                    style={{ padding:'12px 14px',borderBottom:'1px solid #f1f5f9',cursor:'pointer',
                      background:isActive?'#f5f3ff':'#fff',
                      borderLeft:`3px solid ${isActive?A:'transparent'}`,transition:'all .12s' }}>
                    <div style={{ fontSize:11,fontWeight:700,color:isActive?A:'#0f172a' }}>{p.name}</div>
                    <div style={{ fontSize:9,color:'#64748b',marginTop:2 }}>{p.type}</div>
                    <div style={{ display:'flex',gap:5,marginTop:5,flexWrap:'wrap' }}>
                      <TierBadge tier={p.tier}/>
                      <span style={{ fontSize:9,color:'#94a3b8' }}>{ps.active_clients} clients</span>
                    </div>
                    <div style={{ fontSize:10,fontWeight:800,color:'#16a34a',marginTop:4 }}>
                      NPR {ps.monthly_commission.toLocaleString()}/mo
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Partner detail */}
            {(() => {
              const p = DEMO_PARTNERS.find(x=>x.id===selPartner)
              if (!p) return null
              const ps = calcPartnerStats(p)
              return (
                <div>
                  {/* Partner info card */}
                  <div style={{ background:'#fff',borderRadius:12,padding:16,
                    boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:12,
                    borderTop:`4px solid ${ps.tier_info?.color||A}` }}>
                    <div style={{ display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
                      <div>
                        <div style={{ fontSize:15,fontWeight:900,color:'#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize:10,color:'#64748b',marginTop:2 }}>{p.type} · {p.email} · {p.phone}</div>
                        <div style={{ display:'flex',gap:6,marginTop:6,flexWrap:'wrap' }}>
                          <TierBadge tier={p.tier}/>
                          <StatusBadge status={p.status}/>
                          <span style={{ fontSize:9,color:'#94a3b8' }}>PAN: {p.pan}</span>
                          <span style={{ fontSize:9,color:'#94a3b8' }}>Bank: {p.bank} · {p.account}</span>
                        </div>
                      </div>
                      <div style={{ display:'flex',gap:6 }}>
                        <select value={p.tier}
                          onChange={e=>notify(`✅ Tier updated to ${e.target.options[e.target.selectedIndex].text}`)}
                          style={{ padding:'6px 10px',borderRadius:8,border:'1px solid #ddd6fe',
                            fontSize:10,cursor:'pointer',background:'#f5f3ff',color:A,fontWeight:700 }}>
                          {COMMISSION_TIERS.map(t=>(
                            <option key={t.id} value={t.id}>{t.icon} {t.label} ({t.rate}%)</option>
                          ))}
                        </select>
                        <button onClick={()=>notify(`💸 Payout of NPR ${ps.pending_payout.toLocaleString()} approved for ${p.name}`)}
                          style={{ padding:'6px 14px',borderRadius:8,border:'none',
                            background:G,color:'#fff',fontSize:10,fontWeight:800,cursor:'pointer' }}>
                          💸 Process Payout
                        </button>
                      </div>
                    </div>
                    {/* Stats row */}
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:8,marginTop:12 }}>
                      {[
                        { l:'Active Clients',   v:ps.active_clients,                            c:'#16a34a' },
                        { l:'Total MRR',        v:`NPR ${ps.total_mrr.toLocaleString()}`,        c:'#0369a1' },
                        { l:'Commission Rate',  v:`${ps.rate}% MRR`,                             c:ps.tier_info?.color },
                        { l:'Monthly Earn',     v:`NPR ${ps.monthly_commission.toLocaleString()}`,c:'#7c3aed' },
                        { l:'Total Earned',     v:`NPR ${(ps.total_earned/100000).toFixed(1)}L`, c:'#059669' },
                        { l:'Pending Payout',   v:`NPR ${ps.pending_payout.toLocaleString()}`,   c:'#d97706' },
                      ].map(s=>(
                        <div key={s.l} style={{ padding:'8px 10px',borderRadius:9,background:'#f8fafc',
                          border:'1px solid #e2e8f0',textAlign:'center' }}>
                          <div style={{ fontSize:12,fontWeight:900,color:s.c }}>{s.v}</div>
                          <div style={{ fontSize:8,color:'#94a3b8',marginTop:2 }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Referral client list */}
                  <div style={{ background:'#fff',borderRadius:12,overflow:'hidden',
                    boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                    <div style={{ padding:'12px 16px',borderBottom:'1px solid #f1f5f9',
                      display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                      <div style={{ fontSize:12,fontWeight:800,color:'#0f172a' }}>
                        🏢 Referred Clients ({p.referrals.length})
                      </div>
                      <span style={{ fontSize:9,color:'#94a3b8' }}>Live billing data · transparent to partner</span>
                    </div>
                    <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          {['Company','Plan','MRR','Comm Rate','Monthly Earn','Months','Total Earned','Status'].map(h=>(
                            <th key={h} style={{ padding:'8px 12px',textAlign:'left',fontSize:9,
                              fontWeight:700,color:'#64748b',borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {p.referrals.map((r,i)=>{
                          const earn = r.status==='active' ? Math.round(r.mrr*ps.rate/100) : 0
                          const total = Math.round(earn * r.paid_months)
                          return (
                            <tr key={r.tenant_id}
                              style={{ background:i%2===0?'#fff':'#fafafa',
                                borderBottom:'1px solid #f1f5f9' }}>
                              <td style={{ padding:'8px 12px',fontWeight:600,color:'#0f172a' }}>{r.company}</td>
                              <td style={{ padding:'8px 12px' }}>
                                <span style={{ fontSize:9,padding:'2px 7px',borderRadius:8,
                                  background:'#f5f3ff',color:A,fontWeight:700 }}>
                                  {r.plan.charAt(0).toUpperCase()+r.plan.slice(1)}
                                </span>
                              </td>
                              <td style={{ padding:'8px 12px',fontWeight:700,color:'#0369a1' }}>
                                NPR {r.mrr.toLocaleString()}
                              </td>
                              <td style={{ padding:'8px 12px',color:'#64748b' }}>{ps.rate}%</td>
                              <td style={{ padding:'8px 12px',fontWeight:800,color:'#7c3aed' }}>
                                {r.status==='active' ? `NPR ${earn.toLocaleString()}` : '—'}
                              </td>
                              <td style={{ padding:'8px 12px',color:'#64748b' }}>{r.paid_months}</td>
                              <td style={{ padding:'8px 12px',fontWeight:700,color:'#16a34a' }}>
                                {total>0 ? `NPR ${total.toLocaleString()}` : '—'}
                              </td>
                              <td style={{ padding:'8px 12px' }}><StatusBadge status={r.status}/></td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background:'#f5f3ff',fontWeight:800 }}>
                          <td style={{ padding:'10px 12px',color:A }}>TOTAL</td>
                          <td/>
                          <td style={{ padding:'10px 12px',color:'#0369a1' }}>NPR {ps.total_mrr.toLocaleString()}</td>
                          <td style={{ padding:'10px 12px',color:'#64748b' }}>{ps.rate}% avg</td>
                          <td style={{ padding:'10px 12px',color:'#7c3aed' }}>NPR {ps.monthly_commission.toLocaleString()}/mo</td>
                          <td/>
                          <td style={{ padding:'10px 12px',color:'#16a34a' }}>NPR {ps.total_earned.toLocaleString()}</td>
                          <td/>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ══ CLIENTS TAB (Partner self-view) ══ */}
        {tab==='clients' && !isSuperAdmin && (
          <div style={{ background:'#fff',borderRadius:12,overflow:'hidden',
            boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
            <div style={{ padding:'12px 16px',borderBottom:'1px solid #f1f5f9',
              display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div style={{ fontSize:12,fontWeight:800,color:'#0f172a' }}>
                🏢 My Referred Clients ({viewPartner.referrals.length})
              </div>
              <div style={{ fontSize:9,color:'#94a3b8' }}>
                Commission Rate: <b style={{ color:A }}>{stats.rate}% of MRR</b>
              </div>
            </div>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['#','Company','Plan','Monthly Billing','My Commission','Months Active','Total Earned','Status'].map(h=>(
                    <th key={h} style={{ padding:'8px 12px',textAlign:'left',fontSize:9,
                      fontWeight:700,color:'#64748b',borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewPartner.referrals.map((r,i)=>{
                  const earn = r.status==='active' ? Math.round(r.mrr*stats.rate/100) : 0
                  const total = Math.round(earn*r.paid_months)
                  return (
                    <tr key={r.tenant_id}
                      style={{ background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'8px 12px',color:'#94a3b8',fontSize:10 }}>{i+1}</td>
                      <td style={{ padding:'8px 12px',fontWeight:600 }}>{r.company}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ fontSize:9,padding:'2px 7px',borderRadius:8,
                          background:'#f5f3ff',color:A,fontWeight:700 }}>
                          {r.plan.charAt(0).toUpperCase()+r.plan.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding:'8px 12px',fontWeight:700,color:'#0369a1' }}>
                        NPR {r.mrr.toLocaleString()}
                      </td>
                      <td style={{ padding:'8px 12px',fontWeight:800,color:'#7c3aed' }}>
                        {earn>0 ? `NPR ${earn.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding:'8px 12px',color:'#64748b' }}>{r.paid_months} months</td>
                      <td style={{ padding:'8px 12px',fontWeight:700,color:'#16a34a' }}>
                        {total>0 ? `NPR ${total.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding:'8px 12px' }}><StatusBadge status={r.status}/></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:'#f5f3ff',fontWeight:800 }}>
                  <td colSpan={3} style={{ padding:'10px 12px',color:A }}>TOTAL</td>
                  <td style={{ padding:'10px 12px',color:'#0369a1' }}>NPR {stats.total_mrr.toLocaleString()}/mo</td>
                  <td style={{ padding:'10px 12px',color:'#7c3aed' }}>NPR {stats.monthly_commission.toLocaleString()}/mo</td>
                  <td/>
                  <td style={{ padding:'10px 12px',color:'#16a34a' }}>NPR {stats.total_earned.toLocaleString()}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ══ COMMISSION / EARNINGS TAB ══ */}
        {tab==='commission' && (
          <div>
            {/* Monthly payout history */}
            <div style={{ background:'#fff',borderRadius:12,overflow:'hidden',
              boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:14 }}>
              <div style={{ padding:'12px 16px',borderBottom:'1px solid #f1f5f9',
                display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div style={{ fontSize:12,fontWeight:800,color:'#0f172a' }}>💰 Payout History</div>
                {isSuperAdmin && (
                  <button onClick={()=>notify('💸 Bulk payout initiated for all eligible partners')}
                    style={{ padding:'6px 14px',borderRadius:8,border:'none',
                      background:G,color:'#fff',fontSize:10,fontWeight:800,cursor:'pointer' }}>
                    💸 Process All Payouts
                  </button>
                )}
              </div>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Period','Partner','Active Clients','MRR','Rate','Commission','Bonus','Total','Status','Action'].map(h=>(
                      <th key={h} style={{ padding:'8px 10px',textAlign:'left',fontSize:9,
                        fontWeight:700,color:'#64748b',borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(isSuperAdmin ? DEMO_PARTNERS : [viewPartner]).flatMap(p=>{
                    const ps = calcPartnerStats(p)
                    return [
                      { period:'Shrawan 2083',  status:'pending', bonus:ps.tier_info?.monthlyBonus||0, partner:p, ps },
                      { period:'Asar 2083',      status:'paid',    bonus:ps.tier_info?.monthlyBonus||0, partner:p, ps },
                      { period:'Jestha 2083',    status:'paid',    bonus:ps.tier_info?.monthlyBonus||0, partner:p, ps },
                    ]
                  }).slice(0,12).map((row,i)=>(
                    <tr key={i} style={{ background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'8px 10px',fontWeight:600 }}>{row.period}</td>
                      <td style={{ padding:'8px 10px',fontSize:10 }}>{row.partner.name}</td>
                      <td style={{ padding:'8px 10px',color:'#64748b' }}>{row.ps.active_clients}</td>
                      <td style={{ padding:'8px 10px',color:'#0369a1',fontWeight:700 }}>
                        NPR {row.ps.total_mrr.toLocaleString()}
                      </td>
                      <td style={{ padding:'8px 10px',color:'#64748b' }}>{row.ps.rate}%</td>
                      <td style={{ padding:'8px 10px',fontWeight:700,color:'#7c3aed' }}>
                        NPR {row.ps.monthly_commission.toLocaleString()}
                      </td>
                      <td style={{ padding:'8px 10px',color:'#d97706' }}>
                        {row.bonus>0 ? `NPR ${row.bonus.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding:'8px 10px',fontWeight:900,color:'#16a34a' }}>
                        NPR {(row.ps.monthly_commission+row.bonus).toLocaleString()}
                      </td>
                      <td style={{ padding:'8px 10px' }}><StatusBadge status={row.status}/></td>
                      <td style={{ padding:'8px 10px' }}>
                        {row.status==='pending' && isSuperAdmin ? (
                          <button onClick={()=>notify(`✅ Payout approved for ${row.partner.name}`)}
                            style={{ padding:'3px 10px',borderRadius:6,border:'1px solid #bbf7d0',
                              background:'#f0fdf4',color:'#16a34a',fontSize:9,fontWeight:700,cursor:'pointer' }}>
                            Approve
                          </button>
                        ) : row.status==='paid' ? (
                          <span style={{ fontSize:9,color:'#94a3b8' }}>✓ Transferred</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ RATE CONFIGURATION (SuperAdmin only) ══ */}
        {tab==='rates' && isSuperAdmin && (
          <div>
            <div style={{ background:'#fff',borderRadius:12,padding:20,
              boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:14 }}>
              <div style={{ fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:16 }}>
                ⚙️ Commission Rate Configuration
              </div>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Tier','Min Clients','Max Clients','Commission %','Joining Bonus (NPR)','Monthly Bonus (NPR)','Action'].map(h=>(
                      <th key={h} style={{ padding:'10px 12px',textAlign:'left',fontSize:10,
                        fontWeight:700,color:'#64748b',borderBottom:'2px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMMISSION_TIERS.map(tier=>(
                    <tr key={tier.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'12px 12px' }}>
                        <TierBadge tier={tier.id}/>
                      </td>
                      <td style={{ padding:'12px' }}>
                        <input type="number" defaultValue={tier.minClients}
                          style={{ width:60,padding:'4px 8px',borderRadius:6,border:'1px solid #e2e8f0',
                            fontSize:11,textAlign:'center' }}/>
                      </td>
                      <td style={{ padding:'12px' }}>
                        <input type="number" defaultValue={tier.maxClients===999?'∞':tier.maxClients}
                          style={{ width:60,padding:'4px 8px',borderRadius:6,border:'1px solid #e2e8f0',
                            fontSize:11,textAlign:'center' }}/>
                      </td>
                      <td style={{ padding:'12px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                          <input type="number" defaultValue={tier.rate} min={1} max={50}
                            style={{ width:50,padding:'4px 8px',borderRadius:6,border:'1px solid #e2e8f0',
                              fontSize:11,textAlign:'center' }}/>
                          <span style={{ fontSize:11,color:'#64748b' }}>%</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px' }}>
                        <input type="number" defaultValue={tier.bonus}
                          style={{ width:80,padding:'4px 8px',borderRadius:6,border:'1px solid #e2e8f0',
                            fontSize:11,textAlign:'center' }}/>
                      </td>
                      <td style={{ padding:'12px' }}>
                        <input type="number" defaultValue={tier.monthlyBonus}
                          style={{ width:80,padding:'4px 8px',borderRadius:6,border:'1px solid #e2e8f0',
                            fontSize:11,textAlign:'center' }}/>
                      </td>
                      <td style={{ padding:'12px' }}>
                        <button onClick={()=>notify(`✅ ${tier.label} rates updated`)}
                          style={{ padding:'5px 12px',borderRadius:7,border:'none',
                            background:tier.color,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer' }}>
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop:16,padding:14,background:'#fffbeb',borderRadius:9,
                border:'1px solid #fde68a',fontSize:10,color:'#92400e' }}>
                ⚠️ Rate changes apply to NEW commission calculations from next billing cycle.
                Existing approved payouts are not affected.
              </div>
            </div>

            {/* Plan commission preview */}
            <div style={{ background:'#fff',borderRadius:12,padding:20,
              boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14 }}>
                📊 Commission per Plan × Tier (NPR/month)
              </div>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    <th style={{ padding:'8px 12px',textAlign:'left',fontSize:10,color:'#64748b',fontWeight:700 }}>Plan</th>
                    {COMMISSION_TIERS.map(t=>(
                      <th key={t.id} style={{ padding:'8px 12px',textAlign:'center',fontSize:10,color:t.color,fontWeight:700 }}>
                        {t.icon} {t.rate}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(PLAN_MRR).filter(([k,v])=>v>0).map(([plan,mrr],i)=>(
                    <tr key={plan} style={{ background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'10px 12px',fontWeight:700,color:'#374151',textTransform:'capitalize' }}>
                        {plan} (NPR {mrr.toLocaleString()}/mo)
                      </td>
                      {COMMISSION_TIERS.map(t=>(
                        <td key={t.id} style={{ padding:'10px 12px',textAlign:'center',
                          fontWeight:700,color:t.color }}>
                          NPR {Math.round(mrr*t.rate/100).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )

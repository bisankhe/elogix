// FILE: src/pages/admin/ELogixAdminPanel.jsx
// eLogix Technologies — Internal SuperAdmin Panel v2
// All 9 tabs share the same `companies` list loaded once on auth
// ─────────────────────────────────────────────────────────────────────
// TABS:
//   📊 Dashboard       — KPI cards + refresh
//   🏢 Companies       — list, search, status actions, plan change
//   ➕ New Company     — provision new tenant
//   💰 Billing         — per-company invoices + MRR/ARR overview
//   🎫 Support         — open tickets, update status
//   📢 Broadcast       — send to one company or ALL (uses companies list)
//   🔐 Module Perms    — activate/deactivate modules per tenant
//   🤝 Referral        — commission config + referral links
//   👥 eLogix Team     — internal staff management
// ─────────────────────────────────────────────────────────────────────
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useCallback } from 'react'

const G   = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 55%,#818cf8 100%)'
const A   = '#4338ca'
const API = '/api/elogix-admin/v1'

const STATUS_C = {
  trial    : { c:'#0891b2', bg:'#f0f9ff', b:'#bae6fd', icon:'🎁' },
  active   : { c:'#059669', bg:'#f0fdf4', b:'#bbf7d0', icon:'✅' },
  pending  : { c:'#d97706', bg:'#fffbeb', b:'#fde68a', icon:'⏳' },
  suspended: { c:'#d97706', bg:'#fffbeb', b:'#fde68a', icon:'⚠️' },
  cancelled: { c:'#dc2626', bg:'#fef2f2', b:'#fecaca', icon:'❌' },
  churned  : { c:'#6b7280', bg:'#f9fafb', b:'#e5e7eb', icon:'💀' },
}

const ALL_MODULES = [
  'core_hr','attendance','leave','payroll','recruitment','performance',
  'training','appraisal','loan','assets','travel','expense','document',
  'compliance','reports','ai_insights','api_access','ess_portal',
  'notifications','audit_log',
]

const PLAN_PRICES = {
  trial     :{ label:'Trial',      monthly:0,      annual:0       },
  starter   :{ label:'Starter',    monthly:5000,   annual:54000   },
  growth    :{ label:'Growth',     monthly:12000,  annual:130000  },
  business  :{ label:'Business',   monthly:25000,  annual:270000  },
  enterprise:{ label:'Enterprise', monthly:50000,  annual:540000  },
  unlimited :{ label:'Unlimited',  monthly:80000,  annual:864000  },
}

// ── Authenticated API helper ──────────────────────────────────────────────
async function adminFetch(path, opts={}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers:{
      'Content-Type'      :'application/json',
      'X-eLogix-Admin-Key': localStorage.getItem('elogix_admin_key')||'',
      'Authorization'     :`Bearer ${localStorage.getItem('elogix_admin_token')||''}`,
      ...(opts.headers||{}),
    },
  })
  return res.json()
}

// ── Shared input style ────────────────────────────────────────────────────
const inp = {
  padding:'8px 10px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:11,
  outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box',
}

// ════════════════════════════════════════════════════════════════════════════
export default function ELogixAdminPanel() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [adminKey, setAdminKey] = useState(localStorage.getItem('elogix_admin_key')||'')
  const [authed,   setAuthed]   = useState(false)

  // ── Shared state — loaded ONCE for ALL tabs ───────────────────────────────
  const [companies, setCompanies] = useState([])
  const [tickets,   setTickets]   = useState([])
  const [dash,      setDash]      = useState(null)
  const [loading,   setLoading]   = useState(false)

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('dashboard')

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [msg, setMsg] = useState('')
  const toast = m => { setMsg(m); setTimeout(()=>setMsg(''),4000) }

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchCo, setSearchCo] = useState('')

  // ── New company form ──────────────────────────────────────────────────────
  const [newCo, setNewCo] = useState({
    company_name:'', slug:'', admin_email:'', admin_name:'Admin',
    plan:'trial', industry:'', country:'Nepal', sales_rep:'', account_manager:'',
  })

  // ── Broadcast form ────────────────────────────────────────────────────────
  const [bcast, setBcast] = useState({
    slug:'', type:'alert', title:'', message:'', priority:'normal',
  })

  // ── Module permissions ────────────────────────────────────────────────────
  const [modTarget, setModTarget] = useState('')
  const [modState,  setModState]  = useState({})     // { module: bool }

  // ── Referral / commission ─────────────────────────────────────────────────
  const [commConfig, setCommConfig] = useState({
    commission_pct: 10, min_payout_npr: 5000,
    referral_window_days: 90, auto_credit: false,
  })

  // ── eLogix team ───────────────────────────────────────────────────────────
  const [team,    setTeam]    = useState([])
  const [newMember, setNewMember] = useState({
    full_name:'', email:'', role:'support', phone:'',
  })

  // ── Load everything ───────────────────────────────────────────────────────
  const loadAll = useCallback(async (search='') => {
    setLoading(true)
    try {
      const [d, c, t, tm] = await Promise.allSettled([
        adminFetch('/dashboard'),
        adminFetch(`/companies?search=${encodeURIComponent(search)}&limit=200`),
        adminFetch('/tickets?status=open&limit=100'),
        adminFetch('/team'),
      ])
      if (d.status==='fulfilled' && d.value?.summary) setDash(d.value.summary)
      if (c.status==='fulfilled') setCompanies(c.value?.companies || [])
      if (t.status==='fulfilled') setTickets(t.value?.tickets || [])
      if (tm.status==='fulfilled') setTeam(tm.value?.team || [])
    } catch(_e) { toast('⚠️ API error — check admin key and server') }
    setLoading(false)
  }, [])

  const auth = () => {
    if (!adminKey.trim()) { toast('⚠️ Enter admin key'); return }
    localStorage.setItem('elogix_admin_key', adminKey)
    setAuthed(true)
    loadAll()
  }

  // ── Company action helper ─────────────────────────────────────────────────
  const doAction = async (slug, action, extra={}) => {
    let url='', method='PUT', body={}
    if (action==='suspend')    { url=`/companies/${slug}/status`; body={status:'suspended',reason:extra.reason||'Admin action'} }
    if (action==='activate')   { url=`/companies/${slug}/status`; body={status:'active'} }
    if (action==='cancel')     { url=`/companies/${slug}/status`; body={status:'cancelled'} }
    if (action==='changePlan') { url=`/companies/${slug}/plan`;   body={plan:extra.plan} }
    if (action==='invoice')    { url=`/companies/${slug}/invoices`; method='POST'; body={} }
    if (action==='notify')     { url=`/companies/${slug}/notify`; method='POST'; body=extra }
    if (action==='notifyAll')  { url='/notify-all'; method='POST'; body=extra }
    try {
      const r = await adminFetch(url, {method, body:JSON.stringify(body)})
      toast(r.message || r.error || '✅ Done')
      loadAll(searchCo)
    } catch(_e) { toast('⚠️ Action failed') }
  }

  // ── Create company ────────────────────────────────────────────────────────
  const createCompany = async () => {
    if (!newCo.company_name||!newCo.slug||!newCo.admin_email) { toast('⚠️ Fill required fields'); return }
    try {
      const r = await adminFetch('/companies', {method:'POST', body:JSON.stringify(newCo)})
      toast(r.message || r.error || '✅ Company provisioned!')
      setNewCo({company_name:'',slug:'',admin_email:'',admin_name:'Admin',plan:'trial',
                industry:'',country:'Nepal',sales_rep:'',account_manager:''})
      loadAll()
    } catch(_e) { toast('⚠️ Creation failed') }
  }

  // ── Save modules for a company ────────────────────────────────────────────
  const saveModules = async () => {
    if (!modTarget) { toast('⚠️ Select a company first'); return }
    try {
      const enabled = Object.entries(modState).filter(([,v])=>v).map(([k])=>k)
      const r = await adminFetch(`/companies/${modTarget}/modules`, {
        method:'PUT', body:JSON.stringify({modules:enabled}),
      })
      toast(r.message || '✅ Modules updated')
      loadAll()
    } catch(_e) { toast('⚠️ Failed to save modules') }
  }

  const loadModules = async (slug) => {
    setModTarget(slug)
    try {
      const co = companies.find(c=>c.slug===slug)
      const existing = co?.modules || []
      const init = Object.fromEntries(ALL_MODULES.map(m=>[m, existing.includes(m)]))
      setModState(init)
    } catch(_e) {}
  }

  // ── Save commission config ────────────────────────────────────────────────
  const saveCommission = async () => {
    try {
      const r = await adminFetch('/referral/config', {
        method:'PUT', body:JSON.stringify(commConfig),
      })
      toast(r.message || '✅ Commission config saved')
    } catch(_e) { toast('⚠️ Failed to save') }
  }

  // ── Add team member ───────────────────────────────────────────────────────
  const addTeamMember = async () => {
    if (!newMember.full_name||!newMember.email) { toast('⚠️ Name and email required'); return }
    try {
      const r = await adminFetch('/team', {method:'POST', body:JSON.stringify(newMember)})
      toast(r.message || '✅ Team member added')
      setNewMember({full_name:'',email:'',role:'support',phone:''})
      loadAll()
    } catch(_e) { toast('⚠️ Failed to add member') }
  }

  // ── Filtered companies for display ───────────────────────────────────────
  const filteredCos = companies.filter(c =>
    !searchCo ||
    c.name?.toLowerCase().includes(searchCo.toLowerCase()) ||
    c.slug?.toLowerCase().includes(searchCo.toLowerCase()) ||
    c.admin_email?.toLowerCase().includes(searchCo.toLowerCase())
  )

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{
      position:'fixed', inset:0, fontFamily:'system-ui,sans-serif',
      background:'#f0f0ff', display:'flex', alignItems:'center', justifyContent:'center',
      overflowY:'auto',
    }}>
      <div style={{ background:'#fff', borderRadius:20, padding:36, maxWidth:380, width:'100%',
        textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.2)', margin:20 }}>
        <div style={{ fontSize:44, marginBottom:8 }}>⚡</div>
        <div style={{ fontSize:20, fontWeight:900, color:'#0f172a', marginBottom:3 }}>eLogix Admin</div>
        <div style={{ fontSize:11, color:'#64748b', marginBottom:24 }}>Internal use only · eLogix Technologies</div>
        <input type="password" value={adminKey} onChange={e=>setAdminKey(e.target.value)}
          placeholder="Enter eLogix Admin Key"
          style={{...inp, marginBottom:12, textAlign:'center', fontSize:13}}
          onKeyDown={e=>e.key==='Enter'&&auth()}/>
        <button onClick={auth}
          style={{ width:'100%', padding:'12px', borderRadius:10, border:'none',
            background:G, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
          🔐 Authenticate
        </button>
        {msg && <div style={{marginTop:12,fontSize:11,color:'#dc2626'}}>{msg}</div>}
      </div>
    </div>
  )

  // ── Tab button ────────────────────────────────────────────────────────────
  const TabBtn = ({id, label, badge}) => (
    <button onClick={()=>setTab(id)} style={{
      padding:'7px 12px', borderRadius:8, border:'none', fontSize:10,
      fontWeight:tab===id?800:400,
      background:tab===id?'#fff':'transparent',
      color:tab===id?A:'#94a3b8', cursor:'pointer',
      boxShadow:tab===id?'0 1px 4px rgba(0,0,0,.1)':'none',
      whiteSpace:'nowrap', position:'relative',
    }}>
      {label}
      {badge ? <span style={{
        position:'absolute', top:2, right:4,
        background:'#dc2626', color:'#fff', fontSize:8, fontWeight:900,
        borderRadius:20, padding:'1px 5px', lineHeight:1.4,
      }}>{badge}</span> : null}
    </button>
  )

  // ── Status badge ──────────────────────────────────────────────────────────
  const StatusBadge = ({status}) => {
    const sc = STATUS_C[status] || STATUS_C.active
    return (
      <span style={{ background:sc.bg, color:sc.c, border:`1px solid ${sc.b}`,
        padding:'2px 9px', borderRadius:20, fontSize:9, fontWeight:700 }}>
        {sc.icon} {status}
      </span>
    )
  }

  // ── Company card (used in Companies tab) ──────────────────────────────────
  const CoCard = ({c}) => {
    const sc = STATUS_C[c.status] || STATUS_C.active
    return (
      <div style={{ background:'#fff', borderRadius:12, padding:16,
        border:'1px solid #e2e8f0', borderLeft:`4px solid ${sc.c}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:2 }}>{c.name || c.company_name}</div>
            <div style={{ fontSize:10, color:'#64748b', marginBottom:5 }}>
              🌐 {c.slug}.elogix.com.np
              {c.admin_email && ` · 📧 ${c.admin_email}`}
              {c.plan && ` · Plan: `}<b>{c.plan}</b>
              {c.employee_count != null && ` · 👥 ${c.employee_count}/${c.max_employees||'—'}`}
              {c.account_manager && ` · AM: ${c.account_manager}`}
            </div>
            <StatusBadge status={c.status||'trial'} />
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', flexShrink:0 }}>
            {c.status !== 'active' && (
              <button onClick={()=>doAction(c.slug,'activate')}
                style={{ padding:'4px 10px', borderRadius:7, border:'none',
                  background:'#f0fdf4', color:'#059669', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                ✅ Activate
              </button>
            )}
            {c.status === 'active' && (
              <button onClick={()=>{const r=prompt('Suspension reason:');if(r)doAction(c.slug,'suspend',{reason:r})}}
                style={{ padding:'4px 10px', borderRadius:7, border:'none',
                  background:'#fffbeb', color:'#d97706', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                ⚠️ Suspend
              </button>
            )}
            <select onChange={e=>{if(e.target.value){doAction(c.slug,'changePlan',{plan:e.target.value});e.target.value=''}}}
              style={{ padding:'4px 8px', borderRadius:7, border:'1px solid #e2e8f0',
                fontSize:9, cursor:'pointer', background:'#f8fafc' }}>
              <option value="">Plan…</option>
              {Object.keys(PLAN_PRICES).map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={()=>doAction(c.slug,'invoice')}
              style={{ padding:'4px 10px', borderRadius:7, border:'none',
                background:'#f5f3ff', color:'#7c3aed', fontSize:9, fontWeight:700, cursor:'pointer' }}>
              🧾 Invoice
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════ MAIN RENDER ═══════════════════════════════════
  return (
    <div style={{ fontFamily:'system-ui,sans-serif', minHeight:'100vh',
      background:'#f5f3ff', overflowY:'auto',
      scrollbarWidth:'thin', scrollbarColor:'#818cf8 #e0e7ff',
    }}>

      {/* Toast */}
      {msg && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999,
          background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:10,
          padding:'10px 18px', fontSize:11, color:'#4c1d95',
          boxShadow:'0 4px 16px rgba(0,0,0,.12)', maxWidth:420 }}>
          {msg}
        </div>
      )}

      {/* Top nav */}
      <div style={{ background:G, padding:'11px 20px', display:'flex',
        alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ color:'#fff', fontSize:15, fontWeight:900, whiteSpace:'nowrap' }}>
          ⚡ eLogix Admin Panel
        </div>
        <div style={{ color:'rgba(255,255,255,.6)', fontSize:9, flex:1, textAlign:'center' }}>
          {companies.length} companies loaded · eLogix Technologies
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={()=>loadAll(searchCo)}
            style={{ padding:'5px 12px', borderRadius:7, border:'1px solid rgba(255,255,255,.4)',
              background:'transparent', color:'#fff', fontSize:10, cursor:'pointer' }}>
            {loading ? '⟳' : '🔄 Refresh'}
          </button>
          <button onClick={()=>{localStorage.removeItem('elogix_admin_key');setAuthed(false)}}
            style={{ padding:'5px 12px', borderRadius:7, border:'1.5px solid rgba(255,255,255,.5)',
              background:'transparent', color:'#fff', fontSize:10, cursor:'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Tab bar — scrollable on mobile */}
      <div style={{ background:'#fff', padding:'5px 16px', display:'flex', gap:2,
        borderBottom:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.04)',
        overflowX:'auto', scrollbarWidth:'none' }}>
        <TabBtn id="dashboard" label="📊 Dashboard"/>
        <TabBtn id="companies" label="🏢 Companies"/>
        <TabBtn id="create"    label="➕ New Company"/>
        <TabBtn id="billing"   label="💰 Billing"/>
        <TabBtn id="tickets"   label="🎫 Support" badge={tickets.length||null}/>
        <TabBtn id="broadcast" label="📢 Broadcast"/>
        <TabBtn id="modules"   label="🔐 Modules"/>
        <TabBtn id="referral"  label="🤝 Referral"/>
        <TabBtn id="team"      label="👥 eLogix Team"/>
      </div>

      <div style={{ padding:'18px 20px', maxWidth:1300, margin:'0 auto' }}>

        {/* ─────────────── DASHBOARD ─────────────── */}
        {tab==='dashboard' && (
          <div>
            {loading && <div style={{textAlign:'center',padding:40,color:A,fontSize:13}}>⟳ Loading…</div>}
            {dash && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:20 }}>
                  {[
                    ['🏢','Total',    dash.companies?.total,            '#0369a1'],
                    ['✅','Active',   dash.companies?.active,           '#059669'],
                    ['🎁','Trial',    dash.companies?.trial,            '#0891b2'],
                    ['⏳','Pending',  dash.companies?.pending,          '#d97706'],
                    ['⚠️','Suspended',dash.companies?.suspended,        '#f59e0b'],
                    ['💰','MRR',      `NPR ${(dash.billing?.mrr_npr||0).toLocaleString()}`, '#7c3aed'],
                    ['📅','ARR',      `NPR ${(dash.billing?.arr_npr||0).toLocaleString()}`, '#4338ca'],
                    ['🧾','Overdue',  dash.billing?.overdue_invoices,   '#dc2626'],
                    ['🎫','Tickets',  dash.support?.open_tickets,       '#d97706'],
                    ['👥','eL Team',  team.length,                       '#0891b2'],
                  ].map(([ic,lb,v,c])=>(
                    <div key={lb} style={{ background:'#fff', borderRadius:12, padding:'14px 16px',
                      border:`2px solid ${c}20`, boxShadow:'0 1px 4px rgba(0,0,0,.05)',
                      textAlign:'center' }}>
                      <div style={{ fontSize:22, marginBottom:4 }}>{ic}</div>
                      <div style={{ fontSize:18, fontWeight:900, color:c }}>{v ?? '—'}</div>
                      <div style={{ fontSize:9, color:'#64748b', marginTop:2 }}>{lb}</div>
                    </div>
                  ))}
                </div>

                {/* Recent companies */}
                <div style={{ background:'#fff', borderRadius:12, padding:'16px 20px',
                  boxShadow:'0 1px 6px rgba(0,0,0,.05)' }}>
                  <div style={{ fontSize:13, fontWeight:800, marginBottom:12 }}>🕐 Recently Registered</div>
                  {companies.slice(0,5).map(c => (
                    <div key={c.id} style={{ display:'flex', justifyContent:'space-between',
                      alignItems:'center', padding:'7px 0', borderBottom:'1px solid #f1f5f9' }}>
                      <div>
                        <span style={{ fontWeight:700, fontSize:12 }}>{c.name || c.company_name}</span>
                        <span style={{ fontSize:10, color:'#94a3b8', marginLeft:8 }}>{c.slug}</span>
                      </div>
                      <StatusBadge status={c.status||'trial'} />
                    </div>
                  ))}
                  {companies.length === 0 && (
                    <div style={{ textAlign:'center', padding:24, color:'#94a3b8', fontSize:12 }}>
                      No companies yet — provision your first client!
                    </div>
                  )}
                </div>
              </>
            )}
            {!dash && !loading && (
              <div style={{ textAlign:'center', padding:60, color:'#94a3b8', fontSize:13 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
                Dashboard API unavailable — check Flask is running on port 5000
              </div>
            )}
          </div>
        )}

        {/* ─────────────── COMPANIES ─────────────── */}
        {tab==='companies' && (
          <div>
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
              <input value={searchCo}
                onChange={e=>{setSearchCo(e.target.value)}}
                placeholder="Search by name, slug, email…"
                style={{...inp, flex:1, maxWidth:360}}/>
              <button onClick={()=>loadAll(searchCo)}
                style={{ padding:'8px 16px', borderRadius:8, border:'none',
                  background:A, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                🔍 Search
              </button>
              <span style={{ fontSize:10, color:'#94a3b8' }}>
                {filteredCos.length} / {companies.length} companies
              </span>
            </div>
            {loading && <div style={{textAlign:'center',padding:32,color:A}}>⟳ Loading…</div>}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filteredCos.map(c=><CoCard key={c.id||c.slug} c={c}/>)}
              {filteredCos.length===0 && !loading && (
                <div style={{ textAlign:'center', padding:48, color:'#94a3b8', fontSize:13,
                  background:'#fff', borderRadius:12 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🏢</div>
                  No companies found — use ➕ New Company to add your first client
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────── NEW COMPANY ─────────────── */}
        {tab==='create' && (
          <div style={{ background:'#fff', borderRadius:16, padding:28, border:'1px solid #e2e8f0', maxWidth:720 }}>
            <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:18 }}>
              ➕ Provision New eLogix Client Tenant
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {[
                ['Company Name *',  'company_name', 'text',  ''],
                ['Portal Slug *',   'slug',         'text',  'himalayan-bank'],
                ['Admin Email *',   'admin_email',  'email', ''],
                ['Admin Name',      'admin_name',   'text',  'Super Admin'],
                ['Industry',        'industry',     'text',  'Banking & Finance'],
                ['Country',         'country',      'text',  'Nepal'],
                ['Account Manager', 'account_manager','text',''],
                ['Sales Rep',       'sales_rep',    'text',  ''],
              ].map(([l,k,t,ph])=>(
                <div key={k}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                  <input type={t} value={newCo[k]}
                    onChange={e=>setNewCo(p=>({...p,[k]:k==='slug'?e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''):e.target.value}))}
                    placeholder={ph||l.replace(' *','')} style={inp}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Plan *</label>
                <select value={newCo.plan} onChange={e=>setNewCo(p=>({...p,plan:e.target.value}))} style={inp}>
                  {Object.entries(PLAN_PRICES).map(([k,v])=>(
                    <option key={k} value={k}>{v.label} {v.monthly>0?`· NPR ${v.monthly.toLocaleString()}/mo`:''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop:10, padding:'10px 14px', background:'#f0f9ff',
              border:'1px solid #bae6fd', borderRadius:8, fontSize:10, color:'#0369a1' }}>
              🌐 Portal URL will be: <strong>https://{newCo.slug||'{slug}'}.elogix.com.np</strong>
              <br/>📧 Welcome email with temp password will be sent to: <strong>{newCo.admin_email||'{admin_email}'}</strong>
            </div>
            <button onClick={createCompany}
              style={{ marginTop:18, padding:'12px 28px', borderRadius:10, border:'none',
                background:G, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
              🚀 Provision eLogix Tenant
            </button>
          </div>
        )}

        {/* ─────────────── BILLING ─────────────── */}
        {tab==='billing' && (
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:16 }}>
              💰 Billing Overview — All Clients
            </div>

            {/* MRR / ARR cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
              {[
                ['💰','Total MRR',  `NPR ${(companies.filter(c=>c.status==='active').reduce((s,c)=>s+(PLAN_PRICES[c.plan]?.monthly||0),0)).toLocaleString()}`, '#7c3aed'],
                ['📅','Total ARR',  `NPR ${(companies.filter(c=>c.status==='active').reduce((s,c)=>s+(PLAN_PRICES[c.plan]?.annual||0),0)).toLocaleString()}`,  '#4338ca'],
                ['✅','Paying',     companies.filter(c=>c.status==='active'&&c.plan!=='trial').length, '#059669'],
                ['🎁','On Trial',   companies.filter(c=>c.plan==='trial').length, '#0891b2'],
                ['⚠️','Overdue',    dash?.billing?.overdue_invoices ?? '—', '#dc2626'],
              ].map(([ic,lb,v,c])=>(
                <div key={lb} style={{ background:'#fff', borderRadius:12, padding:'14px 16px',
                  border:`2px solid ${c}20`, textAlign:'center' }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{ic}</div>
                  <div style={{ fontSize:17, fontWeight:900, color:c }}>{v}</div>
                  <div style={{ fontSize:9, color:'#64748b', marginTop:2 }}>{lb}</div>
                </div>
              ))}
            </div>

            {/* Per-company billing table */}
            <div style={{ background:'#fff', borderRadius:12, padding:'18px 20px',
              boxShadow:'0 1px 6px rgba(0,0,0,.05)', overflowX:'auto' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Per-Company Billing</div>
              {companies.length===0 ? (
                <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12 }}>
                  No companies — provision a client first
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:600 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['Company','Slug','Plan','Monthly (NPR)','Status','Actions'].map(h=>(
                        <th key={h} style={{ padding:'9px 12px', textAlign:'left',
                          fontSize:10, fontWeight:700, color:'#374151',
                          borderBottom:'2px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c,i)=>(
                      <tr key={c.id||i} style={{ background:i%2===0?'#fff':'#fafafa',
                        borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'9px 12px', fontWeight:700 }}>{c.name||c.company_name}</td>
                        <td style={{ padding:'9px 12px', color:'#64748b', fontSize:10 }}>
                          <code style={{ background:'#f1f5f9', padding:'2px 6px', borderRadius:4 }}>{c.slug}</code>
                        </td>
                        <td style={{ padding:'9px 12px' }}>
                          <span style={{ fontWeight:600, fontSize:10 }}>{c.plan||'trial'}</span>
                        </td>
                        <td style={{ padding:'9px 12px', fontWeight:700 }}>
                          {PLAN_PRICES[c.plan]?.monthly > 0
                            ? `NPR ${PLAN_PRICES[c.plan].monthly.toLocaleString()}`
                            : <span style={{color:'#94a3b8'}}>Free</span>}
                        </td>
                        <td style={{ padding:'9px 12px' }}>
                          <StatusBadge status={c.status||'trial'}/>
                        </td>
                        <td style={{ padding:'9px 12px' }}>
                          <button onClick={()=>doAction(c.slug,'invoice')}
                            style={{ padding:'4px 10px', borderRadius:6, border:'none',
                              background:'#f5f3ff', color:'#7c3aed', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                            🧾 Gen Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ─────────────── SUPPORT / TICKETS ─────────────── */}
        {tab==='tickets' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div style={{ fontSize:14, fontWeight:800 }}>🎫 Support Tickets</div>
              <button onClick={()=>loadAll(searchCo)}
                style={{ padding:'7px 16px', borderRadius:8, border:'none',
                  background:A, color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                ↻ Refresh
              </button>
            </div>

            {/* Company filter */}
            <div style={{ marginBottom:14 }}>
              <select style={{...inp, maxWidth:300, width:'auto'}}
                onChange={async e=>{
                  const slug = e.target.value
                  if (!slug) { loadAll(); return }
                  const t2 = await adminFetch(`/tickets?company_slug=${slug}&status=open`)
                  setTickets(t2.tickets||[])
                }}>
                <option value="">All Companies</option>
                {companies.map(c=>(
                  <option key={c.id} value={c.slug}>{c.name||c.company_name} ({c.slug})</option>
                ))}
              </select>
            </div>

            {tickets.length===0 ? (
              <div style={{ textAlign:'center', padding:60, color:'#94a3b8', fontSize:13,
                background:'#fff', borderRadius:12 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🎫</div>
                No open tickets
              </div>
            ) : tickets.map(t=>(
              <div key={t.id} style={{ background:'#fff', border:'1px solid #e2e8f0',
                borderRadius:12, padding:'14px 18px', marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>
                      {t.ticket_no}: {t.subject}
                    </div>
                    <div style={{ fontSize:10, color:'#64748b', marginTop:3 }}>
                      {companies.find(c=>c.id===t.company_id)?.name || `Company #${t.company_id}`}
                      {` · Priority: `}<strong>{t.priority}</strong>
                      {` · Category: ${t.category}`}
                      {t.created_at && ` · ${new Date(t.created_at).toLocaleDateString('en-NP')}`}
                    </div>
                    {t.description && (
                      <div style={{ fontSize:10, color:'#374151', marginTop:6, background:'#f8fafc',
                        borderRadius:6, padding:'6px 10px', lineHeight:1.5 }}>
                        {t.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', flexShrink:0 }}>
                    {['in_progress','resolved','closed'].map(s=>(
                      <button key={s} onClick={async()=>{
                        await adminFetch(`/tickets/${t.id}`,{method:'PUT',body:JSON.stringify({status:s})})
                        toast(`✅ ${t.ticket_no} → ${s}`)
                        loadAll(searchCo)
                      }}
                        style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #e2e8f0',
                          background:'#f8fafc', color:'#374151', fontSize:9, fontWeight:600, cursor:'pointer' }}>
                        {s.replace('_',' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─────────────── BROADCAST ─────────────── */}
        {tab==='broadcast' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>

            {/* Compose form */}
            <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:16 }}>
                📢 Send Notification
              </div>
              <div style={{ display:'grid', gap:12 }}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>
                    Target Audience
                  </label>
                  <select value={bcast.slug} onChange={e=>setBcast(p=>({...p,slug:e.target.value}))} style={inp}>
                    <option value="">📢 ALL Active Companies ({companies.filter(c=>c.status==='active').length} companies)</option>
                    {companies.map(c=>(
                      <option key={c.id} value={c.slug}>
                        {c.name||c.company_name} — {c.slug} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
                {[
                  ['Type',     'type',     ['billing','alert','update','marketing','security','maintenance']],
                  ['Priority', 'priority', ['low','normal','high','critical']],
                ].map(([l,k,opts])=>(
                  <div key={k}>
                    <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{l}</label>
                    <select value={bcast[k]} onChange={e=>setBcast(p=>({...p,[k]:e.target.value}))} style={inp}>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Title *</label>
                  <input value={bcast.title} onChange={e=>setBcast(p=>({...p,title:e.target.value}))}
                    style={inp} placeholder="Notification title…"/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Message *</label>
                  <textarea value={bcast.message} onChange={e=>setBcast(p=>({...p,message:e.target.value}))}
                    rows={4} style={{...inp,resize:'vertical',fontFamily:'inherit'}}
                    placeholder="Message body…"/>
                </div>
                <button onClick={()=>{
                  if(!bcast.title||!bcast.message){toast('⚠️ Title and message required');return}
                  if(bcast.slug) doAction(bcast.slug,'notify',bcast)
                  else doAction('','notifyAll',bcast)
                }}
                  style={{ padding:'12px', borderRadius:10, border:'none', background:G,
                    color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                  {bcast.slug
                    ? `📢 Send to ${companies.find(c=>c.slug===bcast.slug)?.name||bcast.slug}`
                    : `📢 Broadcast to ALL ${companies.filter(c=>c.status==='active').length} active companies`}
                </button>
              </div>
            </div>

            {/* Quick-notify per company */}
            <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:14 }}>
                ⚡ Quick Notify — Per Company
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:480, overflowY:'auto' }}>
                {companies.length===0 ? (
                  <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:11 }}>
                    No companies — provision a client first
                  </div>
                ) : companies.map(c=>(
                  <div key={c.id} style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', padding:'8px 12px', background:'#f8fafc',
                    borderRadius:8, gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#0f172a', overflow:'hidden',
                        textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {c.name||c.company_name}
                      </div>
                      <div style={{ fontSize:9, color:'#94a3b8' }}>{c.slug} · <StatusBadge status={c.status||'trial'}/></div>
                    </div>
                    <button onClick={()=>{
                      const title   = prompt(`Notification title for ${c.name}:`)
                      const message = prompt('Message:')
                      if(title&&message) doAction(c.slug,'notify',{type:'alert',title,message,priority:'normal'})
                    }}
                      style={{ padding:'4px 10px', borderRadius:6, border:'none',
                        background:'#f0f9ff', color:A, fontSize:9, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                      📢 Notify
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────── MODULE PERMISSIONS ─────────────── */}
        {tab==='modules' && (
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:16 }}>
              🔐 Module Permissions — Activate / Deactivate per Tenant
            </div>

            {/* Company picker */}
            <div style={{ background:'#fff', borderRadius:12, padding:'16px 20px',
              marginBottom:16, border:'1px solid #e2e8f0' }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>
                Select Company to Configure Modules
              </label>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <select value={modTarget}
                  onChange={e=>{ if(e.target.value) loadModules(e.target.value) }}
                  style={{...inp, maxWidth:380, flex:1}}>
                  <option value="">— Choose a company —</option>
                  {companies.map(c=>(
                    <option key={c.id} value={c.slug}>
                      {c.name||c.company_name} ({c.slug}) — {c.plan||'trial'}
                    </option>
                  ))}
                </select>
                {modTarget && (
                  <button onClick={saveModules}
                    style={{ padding:'8px 20px', borderRadius:9, border:'none',
                      background:G, color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer' }}>
                    💾 Save Modules
                  </button>
                )}
              </div>
              {modTarget && (
                <div style={{ marginTop:8, fontSize:10, color:'#64748b' }}>
                  Configuring: <strong>{companies.find(c=>c.slug===modTarget)?.name}</strong>
                  {' · '}Plan: <strong>{companies.find(c=>c.slug===modTarget)?.plan||'trial'}</strong>
                </div>
              )}
            </div>

            {modTarget ? (
              <div>
                <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                  <button onClick={()=>setModState(Object.fromEntries(ALL_MODULES.map(m=>[m,true])))}
                    style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #059669',
                      background:'#f0fdf4', color:'#059669', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                    ✅ Enable All
                  </button>
                  <button onClick={()=>setModState(Object.fromEntries(ALL_MODULES.map(m=>[m,false])))}
                    style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #dc2626',
                      background:'#fef2f2', color:'#dc2626', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                    ❌ Disable All
                  </button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
                  {ALL_MODULES.map(m=>(
                    <label key={m} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                      background: modState[m] ? '#f0fdf4' : '#fff',
                      border: `1px solid ${modState[m] ? '#bbf7d0' : '#e2e8f0'}`,
                      borderRadius:10, cursor:'pointer', transition:'all .1s',
                    }}>
                      <input type="checkbox" checked={!!modState[m]}
                        onChange={e=>setModState(p=>({...p,[m]:e.target.checked}))}
                        style={{ width:15, height:15, cursor:'pointer', accentColor:'#059669' }}/>
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:'#0f172a',
                          textTransform:'capitalize' }}>
                          {m.replace(/_/g,' ')}
                        </div>
                        <div style={{ fontSize:9, color: modState[m] ? '#059669' : '#94a3b8', marginTop:1 }}>
                          {modState[m] ? '✅ Active' : '⭕ Inactive'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop:16 }}>
                  <button onClick={saveModules}
                    style={{ padding:'12px 28px', borderRadius:10, border:'none',
                      background:G, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                    💾 Save Module Configuration for {companies.find(c=>c.slug===modTarget)?.name}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:60, color:'#94a3b8', fontSize:13,
                background:'#fff', borderRadius:12 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔐</div>
                Select a company above to configure its modules
              </div>
            )}
          </div>
        )}

        {/* ─────────────── REFERRAL & COMMISSION ─────────────── */}
        {tab==='referral' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>

            {/* Commission config */}
            <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:16 }}>
                🤝 Commission & Referral Config
              </div>
              <div style={{ display:'grid', gap:12 }}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>
                    Commission % per referral
                  </label>
                  <input type="number" value={commConfig.commission_pct}
                    onChange={e=>setCommConfig(p=>({...p,commission_pct:+e.target.value}))}
                    min={0} max={50} style={inp}/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>
                    Min payout (NPR)
                  </label>
                  <input type="number" value={commConfig.min_payout_npr}
                    onChange={e=>setCommConfig(p=>({...p,min_payout_npr:+e.target.value}))}
                    min={0} style={inp}/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>
                    Referral window (days)
                  </label>
                  <input type="number" value={commConfig.referral_window_days}
                    onChange={e=>setCommConfig(p=>({...p,referral_window_days:+e.target.value}))}
                    min={1} style={inp}/>
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:8,
                  fontSize:11, cursor:'pointer', color:'#374151' }}>
                  <input type="checkbox" checked={!!commConfig.auto_credit}
                    onChange={e=>setCommConfig(p=>({...p,auto_credit:e.target.checked}))}
                    style={{ width:14, height:14, accentColor:A }}/>
                  Auto-credit commission on subscription payment
                </label>
                <button onClick={saveCommission}
                  style={{ padding:'11px', borderRadius:10, border:'none',
                    background:G, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                  💾 Save Commission Config
                </button>
              </div>
            </div>

            {/* Referral links per company */}
            <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:14 }}>
                🔗 Referral Links — Per Company
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:440, overflowY:'auto' }}>
                {companies.length===0 ? (
                  <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:11 }}>
                    No companies yet
                  </div>
                ) : companies.map(c=>{
                  const link = `https://elogix.com.np/register?ref=${c.slug}`
                  return (
                    <div key={c.id} style={{ padding:'10px 12px', background:'#f8fafc',
                      borderRadius:8, border:'1px solid #e2e8f0' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#0f172a', marginBottom:4 }}>
                        {c.name||c.company_name}
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <code style={{ fontSize:9, color:'#4338ca', background:'#eef2ff',
                          padding:'3px 7px', borderRadius:4, flex:1, overflow:'hidden',
                          textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {link}
                        </code>
                        <button onClick={()=>{navigator.clipboard.writeText(link);toast('📋 Copied!')}}
                          style={{ padding:'3px 9px', borderRadius:6, border:'none',
                            background:'#f0f9ff', color:A, fontSize:9, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                          Copy
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────── ELOGIX TEAM ─────────────── */}
        {tab==='team' && (
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:16 }}>
              👥 eLogix Internal Team
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>

              {/* Add team member */}
              <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>➕ Add Team Member</div>
                <div style={{ display:'grid', gap:10 }}>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Full Name *</label>
                    <input value={newMember.full_name} onChange={e=>setNewMember(p=>({...p,full_name:e.target.value}))}
                      style={inp} placeholder="Full name"/>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Email *</label>
                    <input type="email" value={newMember.email} onChange={e=>setNewMember(p=>({...p,email:e.target.value}))}
                      style={inp} placeholder="name@elogix.com.np"/>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Role</label>
                    <select value={newMember.role} onChange={e=>setNewMember(p=>({...p,role:e.target.value}))} style={inp}>
                      {['superadmin','admin','sales','support','billing','developer','operations','marketing'].map(r=>(
                        <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Phone</label>
                    <input value={newMember.phone} onChange={e=>setNewMember(p=>({...p,phone:e.target.value}))}
                      style={inp} placeholder="+977-98XXXXXXXX"/>
                  </div>
                  <button onClick={addTeamMember}
                    style={{ padding:'11px', borderRadius:9, border:'none',
                      background:G, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                    ✅ Add Team Member
                  </button>
                </div>
              </div>

              {/* Team list */}
              <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>
                  eLogix Staff ({team.length})
                </div>
                {team.length===0 ? (
                  <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:11 }}>
                    <div style={{ fontSize:40, marginBottom:8 }}>👥</div>
                    No team members yet
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {team.map((m,i)=>(
                      <div key={m.id||i} style={{ display:'flex', alignItems:'center', gap:12,
                        padding:'10px 14px', background:'#f8fafc', borderRadius:9,
                        border:'1px solid #e2e8f0' }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:G,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color:'#fff', fontWeight:900, fontSize:14, flexShrink:0 }}>
                          {(m.full_name||'?')[0]}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>{m.full_name}</div>
                          <div style={{ fontSize:10, color:'#64748b', overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {m.email} · {m.role}
                          </div>
                        </div>
                        <span style={{ background:'#eef2ff', color:'#4338ca', fontSize:9,
                          fontWeight:700, padding:'2px 8px', borderRadius:20, flexShrink:0 }}>
                          {m.role}
                        </span>
                        <button onClick={async()=>{
                          if(window.confirm(`Deactivate ${m.full_name}?`)){
                            await adminFetch(`/team/${m.id}`,{method:'PATCH',body:JSON.stringify({is_active:false})})
                            toast(`⏸ ${m.full_name} deactivated`)
                            loadAll()
                          }
                        }}
                          style={{ padding:'3px 8px', borderRadius:6, border:'none',
                            background:'#fef2f2', color:'#dc2626', fontSize:8, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Password management for companies */}
            <div style={{ marginTop:16, background:'#fff', borderRadius:14, padding:24, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>
                🔑 Password Management — Client Admin Accounts
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:400, overflowY:'auto' }}>
                {companies.length===0 ? (
                  <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:11 }}>
                    No companies
                  </div>
                ) : companies.map(c=>(
                  <div key={c.id} style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', padding:'9px 14px', background:'#f8fafc',
                    borderRadius:8, border:'1px solid #e2e8f0', flexWrap:'wrap', gap:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#0f172a' }}>
                        {c.name||c.company_name}
                      </div>
                      <div style={{ fontSize:9, color:'#94a3b8' }}>
                        {c.admin_email||'—'} · {c.slug}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={async()=>{
                        const r = await adminFetch(`/companies/${c.slug}/reset-password`,{method:'POST',body:JSON.stringify({})})
                        toast(r.message || `🔑 Password reset for ${c.name}`)
                      }}
                        style={{ padding:'4px 10px', borderRadius:6, border:'none',
                          background:'#f5f3ff', color:'#7c3aed', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                        🔑 Reset PW
                      </button>
                      <button onClick={async()=>{
                        const pw = prompt(`Set new password for ${c.name}:`)
                        if(pw) {
                          const r = await adminFetch(`/companies/${c.slug}/reset-password`,{method:'POST',body:JSON.stringify({new_password:pw})})
                          toast(r.message || `✅ Password set for ${c.name}`)
                        }
                      }}
                        style={{ padding:'4px 10px', borderRadius:6, border:'none',
                          background:'#eff6ff', color:'#0369a1', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                        ✏️ Set PW
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

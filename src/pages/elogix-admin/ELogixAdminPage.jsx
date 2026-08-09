// FILE: src/pages/elogix-admin/ELogixAdminPage.jsx
// eLogix Technologies — Internal Admin Panel
// ONLY for eLogix staff — protected by separate admin key + staff JWT
// Manage all client companies, billing, support, communications
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect } from 'react'

const G  = 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#6366f1 100%)'
const A  = '#4338ca'
const inp = {
  width:'100%', padding:'9px 12px', borderRadius:8,
  border:'1.5px solid #e2e8f0', fontSize:11, outline:'none',
  fontFamily:'inherit', boxSizing:'border-box'
}

const PLAN_COLORS = {
  trial:'#10b981', starter:'#0891b2', growth:'#0369a1',
  business:'#7c3aed', enterprise:'#d97706', unlimited:'#dc2626'
}
const STATUS_COLORS = {
  trial:    { bg:'#f0fdf4', c:'#059669', b:'#bbf7d0', icon:'🆓' },
  active:   { bg:'#eff6ff', c:'#0369a1', b:'#bae6fd', icon:'✅' },
  suspended:{ bg:'#fffbeb', c:'#d97706', b:'#fde68a', icon:'⏸' },
  cancelled:{ bg:'#fef2f2', c:'#dc2626', b:'#fecaca', icon:'❌' },
}

// Mock data — in production comes from /api/elogix-admin/v1
const MOCK_COMPANIES = [
  { id:'c1', name:'Solid Future HR Consulting', slug:'solidfuture', plan:'enterprise', status:'active',
    employee_count:320, max_employees:1000, created_at:'2025-01-15', account_manager:'Bikash KC',
    support_tier:'priority', industry:'HR Consulting', country:'Nepal', currency:'NPR',
    plan_expires_at:'2026-12-31', trial_ends_at:null,
    pending_invoice: 45000, last_payment:'2026-07-01' },
  { id:'c2', name:'Himalayan Bank Ltd.', slug:'himalayan', plan:'business', status:'active',
    employee_count:487, max_employees:500, created_at:'2025-03-10', account_manager:'Priya Sharma',
    support_tier:'dedicated', industry:'Banking & Finance', country:'Nepal', currency:'NPR',
    plan_expires_at:'2026-12-31', trial_ends_at:null,
    pending_invoice: 25000, last_payment:'2026-07-01' },
  { id:'c3', name:'Global IME Bank', slug:'globalime', plan:'growth', status:'active',
    employee_count:198, max_employees:250, created_at:'2025-05-20', account_manager:'Ramesh Poudel',
    support_tier:'standard', industry:'Banking & Finance', country:'Nepal', currency:'NPR',
    plan_expires_at:'2026-11-30', trial_ends_at:null,
    pending_invoice: 12000, last_payment:'2026-07-01' },
  { id:'c4', name:'Ncell Axiata', slug:'ncell', plan:'enterprise', status:'suspended',
    employee_count:834, max_employees:1000, created_at:'2024-11-05', account_manager:'Bikash KC',
    support_tier:'dedicated', industry:'Telecom', country:'Nepal', currency:'NPR',
    plan_expires_at:'2026-08-31', trial_ends_at:null,
    pending_invoice: 45000, last_payment:'2026-06-01', suspended_reason:'Overdue invoice 60+ days' },
  { id:'c5', name:'Tech Startup Nepal', slug:'techstartup', plan:'trial', status:'trial',
    employee_count:6, max_employees:10, created_at:'2026-07-25', account_manager:'New Lead',
    support_tier:'standard', industry:'Technology', country:'Nepal', currency:'NPR',
    plan_expires_at:null, trial_ends_at:'2026-08-08',
    pending_invoice: 0, last_payment:null },
]

const MOCK_INVOICES = [
  { id:'i1', invoice_number:'ELX-202607-SOLID-0001', company:'Solid Future HR', total_npr:45000, status:'pending', due_date:'2026-08-15', period_month:'2026-07' },
  { id:'i2', invoice_number:'ELX-202607-HIMAL-0002', company:'Himalayan Bank', total_npr:25000, status:'paid', due_date:'2026-08-15', period_month:'2026-07' },
  { id:'i3', invoice_number:'ELX-202607-GLOBA-0003', company:'Global IME Bank', total_npr:12000, status:'overdue', due_date:'2026-07-20', period_month:'2026-06' },
  { id:'i4', invoice_number:'ELX-202607-NCELL-0004', company:'Ncell', total_npr:45000, status:'overdue', due_date:'2026-06-15', period_month:'2026-05' },
]

const MOCK_TICKETS = [
  { id:'t1', ticket_no:'SUPP-001', company:'Himalayan Bank', subject:'Payroll export issue', priority:'high', status:'open', category:'technical', created:'2 hrs ago' },
  { id:'t2', ticket_no:'SUPP-002', company:'Global IME Bank', subject:'Add new department', priority:'normal', status:'in_progress', category:'hr_config', created:'1 day ago' },
  { id:'t3', ticket_no:'SUPP-003', company:'Solid Future HR', subject:'SSF report format', priority:'normal', status:'resolved', category:'billing', created:'3 days ago' },
]

export default function ELogixAdminPage({ onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [companies, setCompanies] = useState(MOCK_COMPANIES)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showNotifyModal, setShowNotifyModal] = useState(null)
  const [msg, setMsg] = useState('')
  const [createForm, setCreateForm] = useState({
    company_name:'', slug:'', admin_email:'', admin_name:'',
    plan:'starter', industry:'', country:'Nepal', phone:'', account_manager:'', sales_rep:''
  })

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''), 4000) }
  const scf = (k,v) => setCreateForm(p=>({...p,[k]:v}))

  // Stats
  const total     = companies.length
  const active    = companies.filter(c=>c.status==='active').length
  const trial     = companies.filter(c=>c.status==='trial').length
  const suspended = companies.filter(c=>c.status==='suspended').length
  const mrr       = companies.filter(c=>c.status==='active').reduce((s,c)=>{
    const priceMap = {trial:0,starter:5000,growth:12000,business:25000,enterprise:45000,unlimited:75000}
    return s + (priceMap[c.plan]||0)
  },0)

  // Filter
  const filtered = companies.filter(c=>{
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.slug.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleAction = (slug, action) => {
    setCompanies(p=>p.map(c=>c.slug===slug?{...c,status:action==='reactivate'?'active':action==='suspend'?'suspended':'cancelled'}:c))
    notify(action==='suspend'?`⏸ ${slug} suspended — all users logged out`
          :action==='reactivate'?`✅ ${slug} reactivated`
          :`❌ ${slug} cancelled`)
    setSelected(null)
  }

  const handleCreate = () => {
    if (!createForm.company_name||!createForm.slug||!createForm.admin_email) {
      notify('⚠️ Fill in company name, URL and admin email'); return
    }
    const newC = {
      ...createForm, id:`c${Date.now()}`, status:'active', employee_count:0,
      max_employees:{trial:10,starter:50,growth:250,business:500,enterprise:1000}[createForm.plan]||50,
      created_at:new Date().toISOString().split('T')[0],
      pending_invoice:0, last_payment:null,
      support_tier:'standard', currency:'NPR',
    }
    setCompanies(p=>[...p, newC])
    notify(`✅ ${createForm.company_name} provisioned → ${createForm.slug}.elogix.com.np`)
    setShowCreateModal(false)
    setCreateForm({company_name:'',slug:'',admin_email:'',admin_name:'',plan:'starter',industry:'',country:'Nepal',phone:'',account_manager:'',sales_rep:''})
  }

  const Tab = ({id,label,icon}) => (
    <button onClick={()=>setTab(id)}
      style={{padding:'9px 18px',borderRadius:20,border:`1.5px solid ${tab===id?A:'#e2e8f0'}`,
        background:tab===id?A+'15':'#fff',color:tab===id?A:'#64748b',
        fontSize:11,fontWeight:tab===id?800:400,cursor:'pointer',transition:'all .12s',whiteSpace:'nowrap'}}>
      {icon} {label}
    </button>
  )

  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f5f3ff'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',
        border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:11,
        color:'#065f46',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:440}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,padding:'16px 24px',color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>🏢 eLogix Technologies</div>
            <div style={{fontSize:10,opacity:.7}}>SaaS Control Panel · www.elogix.com.np · Internal Staff Only</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setShowCreateModal(true)}
              style={{padding:'8px 16px',borderRadius:9,border:'none',background:'#fff',
                color:A,fontSize:11,fontWeight:800,cursor:'pointer'}}>
              + Onboard Client
            </button>
            <button onClick={()=>notify('📤 Exporting company list...')}
              style={{padding:'8px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.4)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,cursor:'pointer'}}>
              📤 Export
            </button>
            <button onClick={()=>{ if(confirm('Logout from eLogix Admin Panel?')){ ['elogix_admin_token','elogix_admin_user','elogix_admin_key'].forEach(k=>localStorage.removeItem(k)); onLogout?.() } }}
              style={{padding:'8px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.4)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,cursor:'pointer'}}>
              🔒 Logout
            </button>
          </div>
        </div>

        {/* Dashboard stats */}
        <div style={{display:'flex',gap:12,marginTop:14,flexWrap:'wrap'}}>
          {[
            ['🏢','Total Clients',total],
            ['✅','Active',active],
            ['🆓','Trial',trial],
            ['⏸','Suspended',suspended],
            ['💰','MRR','NPR '+mrr.toLocaleString()],
            ['📈','ARR','NPR '+(mrr*12).toLocaleString()],
            ['📋','Open Tickets',MOCK_TICKETS.filter(t=>t.status==='open').length],
            ['⚠️','Overdue Invoices',MOCK_INVOICES.filter(i=>i.status==='overdue').length],
          ].map(([ic,lb,v])=>(
            <div key={lb} style={{background:'rgba(255,255,255,.12)',borderRadius:9,
              padding:'8px 14px',textAlign:'center',minWidth:80}}>
              <div style={{fontSize:14,fontWeight:900}}>{v}</div>
              <div style={{fontSize:8,opacity:.75}}>{ic} {lb}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:'#fff',padding:'10px 20px',borderBottom:'1px solid #f1f5f9',
        display:'flex',gap:8,overflowX:'auto'}}>
        <Tab id="dashboard" label="Companies" icon="🏢"/>
        <Tab id="billing"   label="Billing"    icon="💰"/>
        <Tab id="tickets"   label="Support"    icon="🎫"/>
        <Tab id="notify"    label="Broadcast"  icon="📢"/>
        <Tab id="admins"    label="eLogix Team" icon="👥"/>
      </div>

      <div style={{padding:'16px 20px'}}>

      {/* ── COMPANIES TAB ── */}
      {tab==='dashboard'&&(
        <>
          <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search company name or URL..."
              style={{...inp,maxWidth:280}}/>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...inp,width:'auto'}}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span style={{fontSize:10,color:'#64748b',marginLeft:'auto'}}>
              Showing {filtered.length} of {companies.length} companies
            </span>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:14}}>
            {filtered.map(c=>{
              const sc = STATUS_COLORS[c.status]||STATUS_COLORS.active
              const utilPct = Math.round(c.employee_count/c.max_employees*100)
              const planColor = PLAN_COLORS[c.plan]||'#64748b'
              return (
                <div key={c.id} style={{background:'#fff',borderRadius:14,boxShadow:'0 2px 8px rgba(0,0,0,.06)',
                  border:`1.5px solid ${sc.b}`,overflow:'hidden'}}>
                  {/* Card header */}
                  <div style={{background:`${sc.bg}`,padding:'12px 16px',
                    borderBottom:`1px solid ${sc.b}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:800,fontSize:13,color:'#0f172a'}}>{c.name}</div>
                      <div style={{fontSize:10,color:'#64748b'}}>{c.slug}.elogix.com.np · {c.industry}</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                      <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,
                        fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                        {sc.icon} {c.status.toUpperCase()}
                      </span>
                      <span style={{background:planColor+'15',color:planColor,
                        fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                        {c.plan.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{padding:'12px 16px'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                      {[
                        ['👥','Employees',`${c.employee_count}/${c.max_employees}`],
                        ['💰','Pending',c.pending_invoice?`NPR ${c.pending_invoice.toLocaleString()}`:'Paid ✅'],
                        ['📅','Last Pay',c.last_payment||'—'],
                      ].map(([ic,lb,v])=>(
                        <div key={lb} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'6px'}}>
                          <div style={{fontSize:16}}>{ic}</div>
                          <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{v}</div>
                          <div style={{fontSize:8,color:'#94a3b8'}}>{lb}</div>
                        </div>
                      ))}
                    </div>

                    {/* Employee utilisation bar */}
                    <div style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#64748b',marginBottom:3}}>
                        <span>Employee utilisation</span><span>{utilPct}%</span>
                      </div>
                      <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${Math.min(utilPct,100)}%`,
                          background:utilPct>90?'#dc2626':utilPct>70?'#d97706':'#059669',
                          borderRadius:3,transition:'width .3s'}}/>
                      </div>
                    </div>

                    <div style={{fontSize:9,color:'#94a3b8',marginBottom:12}}>
                      👤 AM: {c.account_manager} · 🎫 {c.support_tier} support
                      {c.suspended_reason&&<span style={{color:'#d97706'}}> · ⚠️ {c.suspended_reason}</span>}
                    </div>

                    {/* Actions */}
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <button onClick={()=>setSelected(c)}
                        style={{padding:'5px 10px',borderRadius:7,border:'none',
                          background:'#eff6ff',color:'#1d4ed8',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                        👁 View
                      </button>
                      <button onClick={()=>notify(`📄 Invoice generated for ${c.name}`)}
                        style={{padding:'5px 10px',borderRadius:7,border:'none',
                          background:'#f0fdf4',color:'#059669',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                        💰 Invoice
                      </button>
                      <button onClick={()=>setShowNotifyModal(c)}
                        style={{padding:'5px 10px',borderRadius:7,border:'none',
                          background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                        📢 Notify
                      </button>
                      {c.status==='active'&&
                        <button onClick={()=>handleAction(c.slug,'suspend')}
                          style={{padding:'5px 10px',borderRadius:7,border:'none',
                            background:'#fffbeb',color:'#d97706',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                          ⏸ Suspend
                        </button>}
                      {c.status==='suspended'&&
                        <button onClick={()=>handleAction(c.slug,'reactivate')}
                          style={{padding:'5px 10px',borderRadius:7,border:'none',
                            background:'#f0fdf4',color:'#059669',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                          ✅ Reactivate
                        </button>}
                      <a href={`https://${c.slug}.elogix.com.np`} target="_blank" rel="noreferrer"
                        style={{padding:'5px 10px',borderRadius:7,border:'1px solid #e2e8f0',
                          background:'#fff',color:'#64748b',fontSize:9,fontWeight:700,
                          cursor:'pointer',textDecoration:'none'}}>
                        🔗 Portal
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── BILLING TAB ── */}
      {tab==='billing'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
            {[
              {label:'Monthly MRR',value:`NPR ${mrr.toLocaleString()}`,icon:'💰',color:'#059669'},
              {label:'Annual ARR', value:`NPR ${(mrr*12).toLocaleString()}`,icon:'📈',color:'#0369a1'},
              {label:'Pending Invoices',value:MOCK_INVOICES.filter(i=>i.status==='pending').length,icon:'📋',color:'#d97706'},
              {label:'Overdue Amount',value:`NPR ${MOCK_INVOICES.filter(i=>i.status==='overdue').reduce((s,i)=>s+i.total_npr,0).toLocaleString()}`,icon:'⚠️',color:'#dc2626'},
            ].map(({label,value,icon,color})=>(
              <div key={label} style={{background:'#fff',borderRadius:12,padding:'16px',
                boxShadow:'0 1px 6px rgba(0,0,0,.06)',borderLeft:`4px solid ${color}`}}>
                <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                <div style={{fontSize:18,fontWeight:900,color:color}}>{value}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 6px rgba(0,0,0,.06)',overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',
              justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontWeight:800,fontSize:13}}>📋 Invoices</div>
              <button onClick={()=>notify('✅ Monthly invoices generated for all active companies')}
                style={{padding:'7px 14px',borderRadius:8,border:'none',background:A,
                  color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                ⚡ Generate Monthly Invoices
              </button>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['Invoice #','Company','Period','Amount','Status','Due Date','Action'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,
                      fontWeight:700,color:'#374151',borderBottom:'1px solid #f1f5f9'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_INVOICES.map((inv,i)=>{
                  const sc = {pending:{bg:'#fffbeb',c:'#d97706'},paid:{bg:'#f0fdf4',c:'#059669'},
                    overdue:{bg:'#fef2f2',c:'#dc2626'}}[inv.status]||{}
                  return (
                    <tr key={inv.id} style={{background:i%2===0?'#fff':'#fafafa'}}>
                      <td style={{padding:'9px 14px',fontFamily:'monospace',fontSize:9}}>{inv.invoice_number}</td>
                      <td style={{padding:'9px 14px',fontWeight:700}}>{inv.company}</td>
                      <td style={{padding:'9px 14px',color:'#64748b'}}>{inv.period_month}</td>
                      <td style={{padding:'9px 14px',fontWeight:700,color:'#059669'}}>
                        NPR {inv.total_npr.toLocaleString()}
                      </td>
                      <td style={{padding:'9px 14px'}}>
                        <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,
                          padding:'2px 8px',borderRadius:20}}>{inv.status}</span>
                      </td>
                      <td style={{padding:'9px 14px',color:'#64748b',fontSize:10}}>{inv.due_date}</td>
                      <td style={{padding:'9px 14px'}}>
                        {inv.status!=='paid'&&(
                          <button onClick={()=>notify(`✅ Invoice ${inv.invoice_number} marked as paid`)}
                            style={{padding:'4px 10px',borderRadius:7,border:'none',background:'#f0fdf4',
                              color:'#059669',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                            Mark Paid
                          </button>)}
                        {inv.status==='paid'&&<span style={{color:'#94a3b8',fontSize:9}}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUPPORT TAB ── */}
      {tab==='tickets'&&(
        <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 6px rgba(0,0,0,.06)',overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontWeight:800,fontSize:13}}>
            🎫 Support Tickets
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                {['Ticket #','Company','Subject','Priority','Status','Category','Created','Action'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,
                    fontWeight:700,color:'#374151',borderBottom:'1px solid #f1f5f9'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_TICKETS.map((t,i)=>{
                const pc = {high:{bg:'#fef2f2',c:'#dc2626'},normal:{bg:'#fffbeb',c:'#d97706'},low:{bg:'#f0fdf4',c:'#059669'}}[t.priority]||{}
                const sc = {open:{bg:'#eff6ff',c:'#0369a1'},in_progress:{bg:'#f5f3ff',c:'#7c3aed'},resolved:{bg:'#f0fdf4',c:'#059669'}}[t.status]||{}
                return (
                  <tr key={t.id} style={{background:i%2===0?'#fff':'#fafafa'}}>
                    <td style={{padding:'9px 14px',fontFamily:'monospace',fontSize:9,fontWeight:700}}>{t.ticket_no}</td>
                    <td style={{padding:'9px 14px',fontWeight:700}}>{t.company}</td>
                    <td style={{padding:'9px 14px'}}>{t.subject}</td>
                    <td style={{padding:'9px 14px'}}>
                      <span style={{background:pc.bg,color:pc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{t.priority}</span>
                    </td>
                    <td style={{padding:'9px 14px'}}>
                      <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{t.status}</span>
                    </td>
                    <td style={{padding:'9px 14px',color:'#64748b',fontSize:10}}>{t.category}</td>
                    <td style={{padding:'9px 14px',color:'#94a3b8',fontSize:10}}>{t.created}</td>
                    <td style={{padding:'9px 14px'}}>
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>notify(`📩 Responding to ${t.ticket_no}`)}
                          style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#eff6ff',color:'#1d4ed8',fontSize:8,fontWeight:700,cursor:'pointer'}}>Reply</button>
                        {t.status!=='resolved'&&
                          <button onClick={()=>notify(`✅ ${t.ticket_no} resolved`)}
                            style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#f0fdf4',color:'#059669',fontSize:8,fontWeight:700,cursor:'pointer'}}>Resolve</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── BROADCAST TAB ── */}
      {tab==='notify'&&(
        <div style={{maxWidth:600}}>
          <div style={{background:'#fff',borderRadius:12,padding:'20px',boxShadow:'0 1px 6px rgba(0,0,0,.06)'}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:16}}>📢 Broadcast to All / Selected Companies</div>
            {[
              ['Notification Type','select',['alert','billing','update','maintenance','marketing']],
              ['Priority','select',['normal','high','critical']],
            ].map(([lb,type,opts])=>(
              <div key={lb} style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{lb}</label>
                <select style={inp}>{opts.map(o=><option key={o}>{o}</option>)}</select>
              </div>
            ))}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Title *</label>
              <input style={inp} placeholder="eLogix System Maintenance — Aug 10"/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Message *</label>
              <textarea rows={4} style={{...inp,resize:'vertical',fontFamily:'inherit'}}
                placeholder="eLogix HRMS will undergo scheduled maintenance on Aug 10, 2026 from 11PM–2AM. All services will be restored by 2AM. We apologize for any inconvenience."/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Target</label>
              <select style={inp}>
                <option>All Active Companies</option>
                <option>All Trial Companies</option>
                <option>Specific Company</option>
                <option>Overdue Companies</option>
              </select>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>notify(`📢 Broadcast sent to ${active+trial} companies`)}
                style={{flex:1,padding:'11px',borderRadius:9,border:'none',background:G,
                  color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                📢 Send Broadcast
              </button>
              <button onClick={()=>notify('📧 Email preview sent to support@elogix.com.np')}
                style={{padding:'11px 16px',borderRadius:9,border:'1px solid #e2e8f0',
                  background:'#fff',fontSize:11,cursor:'pointer'}}>
                Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMINS TAB ── */}
      {tab==='admins'&&(
        <div style={{background:'#fff',borderRadius:12,padding:'20px',boxShadow:'0 1px 6px rgba(0,0,0,.06)'}}>
          <div style={{fontWeight:800,fontSize:13,marginBottom:16}}>👥 eLogix Internal Team</div>
          {[
            {name:'Bikash Adhikari', email:'bikash@elogix.com.np', role:'elogix_superadmin', status:'active'},
            {name:'Priya Thapa',    email:'priya@elogix.com.np',  role:'sales',             status:'active'},
            {name:'Ramesh Joshi',   email:'ramesh@elogix.com.np', role:'support',           status:'active'},
            {name:'Sita Karki',     email:'sita@elogix.com.np',   role:'billing',           status:'active'},
          ].map((a,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'12px 0',borderBottom:'1px solid #f1f5f9'}}>
              <div>
                <div style={{fontWeight:700,fontSize:12}}>{a.name}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{a.email} · {a.role}</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <span style={{background:'#f0fdf4',color:'#059669',fontSize:9,fontWeight:700,
                  padding:'2px 8px',borderRadius:20}}>✅ {a.status}</span>
                <button onClick={()=>notify(`✅ ${a.name} permissions updated`)}
                  style={{padding:'5px 10px',borderRadius:7,border:'none',background:'#eff6ff',
                    color:'#1d4ed8',fontSize:9,fontWeight:700,cursor:'pointer'}}>Edit</button>
              </div>
            </div>
          ))}
          <button onClick={()=>notify('➕ Add eLogix team member form opening...')}
            style={{marginTop:16,padding:'9px 18px',borderRadius:9,border:'none',background:A,
              color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            + Add Team Member
          </button>
        </div>
      )}

      </div>{/* end content */}

      {/* ── Company Detail Modal ── */}
      {selected&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setSelected(null)}>
          <div style={{background:'#fff',borderRadius:18,width:560,maxWidth:'96vw',maxHeight:'92vh',
            overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:16,fontWeight:900}}>{selected.name}</div>
              <div style={{fontSize:10,opacity:.8}}>{selected.slug}.elogix.com.np · {selected.industry}</div>
            </div>
            <div style={{padding:'20px 22px'}}>
              {/* Info grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                {[
                  ['Plan',selected.plan.toUpperCase()],['Status',selected.status.toUpperCase()],
                  ['Employees',`${selected.employee_count}/${selected.max_employees}`],['Country',selected.country],
                  ['Account Manager',selected.account_manager],['Support Tier',selected.support_tier],
                  ['Created',selected.created_at],['Pending Invoice',selected.pending_invoice?`NPR ${selected.pending_invoice.toLocaleString()}`:'None'],
                ].map(([lb,v])=>(
                  <div key={lb} style={{background:'#f8fafc',borderRadius:9,padding:'10px 12px'}}>
                    <div style={{fontSize:9,color:'#94a3b8',marginBottom:2}}>{lb}</div>
                    <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Change plan */}
              <div style={{marginBottom:16}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Change Plan</label>
                <div style={{display:'flex',gap:8}}>
                  <select id="newPlan" style={{...inp,flex:1}}>
                    {['trial','starter','growth','business','enterprise','unlimited'].map(p=>(
                      <option key={p} selected={p===selected.plan}>{p}</option>
                    ))}
                  </select>
                  <button onClick={()=>{
                    const newPlan=document.getElementById('newPlan').value
                    setCompanies(p=>p.map(c=>c.id===selected.id?{...c,plan:newPlan}:c))
                    setSelected(p=>({...p,plan:newPlan}))
                    notify(`✅ ${selected.name} plan changed to ${newPlan}`)
                  }} style={{padding:'9px 16px',borderRadius:8,border:'none',background:A,
                    color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Update Plan</button>
                </div>
              </div>

              {/* Actions */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                {[
                  ['💰 Generate Invoice','#059669',()=>notify(`📄 Invoice generated for ${selected.name}`)],
                  ['📢 Send Notice','#7c3aed',()=>{setShowNotifyModal(selected);setSelected(null)}],
                  ['🔗 Open Portal','#0369a1',()=>window.open(`https://${selected.slug}.elogix.com.np`,'_blank')],
                  selected.status==='active'
                    ?['⏸ Suspend','#d97706',()=>handleAction(selected.slug,'suspend')]
                    :['✅ Reactivate','#059669',()=>handleAction(selected.slug,'reactivate')],
                  ['🗑 Cancel Account','#dc2626',()=>{if(confirm(`Cancel ${selected.name}?`))handleAction(selected.slug,'cancelled')}],
                  ['📊 Usage Report','#374151',()=>notify('📊 Usage report downloading...')],
                ].map(([lb,color,fn],i)=>(
                  <button key={i} onClick={fn}
                    style={{padding:'9px',borderRadius:9,border:'none',background:color+'15',
                      color:color,fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    {lb}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Company Modal ── */}
      {showCreateModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCreateModal(false)}>
          <div style={{background:'#fff',borderRadius:18,width:620,maxWidth:'96vw',maxHeight:'94vh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>+ Onboard New eLogix Client</div>
              <div style={{fontSize:10,opacity:.8}}>Provisions company schema, default roles, admin user & storage</div>
            </div>
            <div style={{padding:'20px 22px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                {[
                  ['Company Name *','company_name','text'],
                  ['Company URL * (.elogix.com.np)','slug','text'],
                  ['Admin Full Name *','admin_name','text'],
                  ['Admin Email *','admin_email','email'],
                  ['Phone','phone','text'],
                  ['Industry','industry','text'],
                ].map(([lb,k,t])=>(
                  <div key={k}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                    <input type={t} value={createForm[k]} onChange={e=>scf(k,e.target.value)} style={inp}
                      placeholder={k==='slug'?'e.g. himalayan':''}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Plan *</label>
                  <select value={createForm.plan} onChange={e=>scf('plan',e.target.value)} style={inp}>
                    {['trial','starter','growth','business','enterprise','unlimited'].map(p=>(
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Account Manager</label>
                  <input value={createForm.account_manager} onChange={e=>scf('account_manager',e.target.value)} style={inp}/>
                </div>
              </div>
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:9,padding:'10px 14px',
                marginBottom:16,fontSize:10,color:'#92400e'}}>
                ⚡ This will auto-provision: PostgreSQL schema · 14 default roles · Permission matrix · Admin user · MinIO storage · Welcome email
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={handleCreate}
                  style={{flex:1,padding:'11px',borderRadius:9,border:'none',background:G,
                    color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  🚀 Provision eLogix Tenant
                </button>
                <button onClick={()=>setShowCreateModal(false)}
                  style={{padding:'11px 18px',borderRadius:9,border:'1px solid #e2e8f0',
                    background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notify Modal ── */}
      {showNotifyModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNotifyModal(null)}>
          <div style={{background:'#fff',borderRadius:16,width:480,maxWidth:'96vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'13px 20px',borderRadius:'16px 16px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>📢 Notify: {showNotifyModal.name}</div>
            </div>
            <div style={{padding:'16px 20px'}}>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Title</label>
                <input style={inp} placeholder="e.g. eLogix Invoice Ready"/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Message</label>
                <textarea rows={3} style={{...inp,resize:'vertical',fontFamily:'inherit'}}
                  placeholder="Your message to this company..."/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Channels</label>
                <div style={{display:'flex',gap:10}}>
                  {['In-App','Email','WhatsApp'].map(ch=>(
                    <label key={ch} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,cursor:'pointer'}}>
                      <input type="checkbox" defaultChecked={ch==='In-App'||ch==='Email'}/>{ch}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{notify(`📢 Notification sent to ${showNotifyModal.name}`);setShowNotifyModal(null)}}
                  style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:G,
                    color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  Send Notification
                </button>
                <button onClick={()=>setShowNotifyModal(null)}
                  style={{padding:'10px 16px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

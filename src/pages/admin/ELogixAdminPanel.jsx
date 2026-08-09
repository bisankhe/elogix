// FILE: src/pages/admin/ELogixAdminPanel.jsx
// eLogix Technologies — Internal Admin Panel
// For eLogix staff: manage clients, billing, support, communications
// PROTECTED: requires eLogix admin credentials
// www.elogix.com.np
import { useState, useEffect } from 'react'

const G  = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 55%,#818cf8 100%)'
const A  = '#4338ca'
const API = '/api/elogix-admin/v1'

const STATUS_C = {
  trial:     { c:'#0891b2', bg:'#f0f9ff', b:'#bae6fd', icon:'🎁' },
  active:    { c:'#059669', bg:'#f0fdf4', b:'#bbf7d0', icon:'✅' },
  suspended: { c:'#d97706', bg:'#fffbeb', b:'#fde68a', icon:'⚠️' },
  cancelled: { c:'#dc2626', bg:'#fef2f2', b:'#fecaca', icon:'❌' },
  churned:   { c:'#6b7280', bg:'#f9fafb', b:'#e5e7eb', icon:'💀' },
}

const ADMIN_KEY = localStorage.getItem('elogix_admin_key') || ''

async function adminFetch(path, opts={}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type':'application/json',
      'X-eLogix-Admin-Key': localStorage.getItem('elogix_admin_key')||'',
      'Authorization': `Bearer ${localStorage.getItem('elogix_admin_token')||''}`,
      ...(opts.headers||{})
    }
  })
  return res.json()
}

export default function ELogixAdminPanel() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('elogix_admin_key')||'')
  const [authed,   setAuthed]   = useState(false)
  const [tab,      setTab]      = useState('dashboard')
  const [dash,     setDash]     = useState(null)
  const [companies,setCompanies]= useState([])
  const [tickets,  setTickets]  = useState([])
  const [msg,      setMsg]      = useState('')
  const [newCo,    setNewCo]    = useState({company_name:'',slug:'',admin_email:'',admin_name:'Admin',plan:'trial',industry:'',country:'Nepal',sales_rep:'',account_manager:''})
  const [notify,   setNotify]   = useState({slug:'',type:'alert',title:'',message:'',priority:'normal'})
  const [searchCo, setSearchCo] = useState('')

  const toast = m => { setMsg(m); setTimeout(()=>setMsg(''),4000) }

  const auth = () => {
    if (!adminKey.trim()) { toast('⚠️ Enter admin key'); return }
    localStorage.setItem('elogix_admin_key', adminKey)
    setAuthed(true)
    loadAll()
  }

  const loadAll = async () => {
    try {
      const d = await adminFetch('/dashboard')
      setDash(d.summary)
      const c = await adminFetch(`/companies?search=${searchCo}`)
      setCompanies(c.companies || [])
      const t = await adminFetch('/tickets?status=open')
      setTickets(t.tickets || [])
    } catch { toast('⚠️ API error — check admin key and server') }
  }

  const doAction = async (slug, action, extra={}) => {
    let url='', method='PUT', body={}
    if (action==='suspend')     { url=`/companies/${slug}/status`; body={status:'suspended', reason:extra.reason||'Admin action'} }
    if (action==='activate')    { url=`/companies/${slug}/status`; body={status:'active'} }
    if (action==='cancel')      { url=`/companies/${slug}/status`; body={status:'cancelled'} }
    if (action==='changePlan')  { url=`/companies/${slug}/plan`;   body={plan:extra.plan} }
    if (action==='invoice')     { url=`/companies/${slug}/invoices`; method='POST'; body={} }
    if (action==='notify')      { url=`/companies/${slug}/notify`; method='POST'; body=extra }
    if (action==='notifyAll')   { url='/notify-all'; method='POST'; body=extra }
    try {
      const r = await adminFetch(url, { method, body:JSON.stringify(body) })
      toast(r.message || r.error || 'Done')
      loadAll()
    } catch { toast('⚠️ Action failed') }
  }

  const createCompany = async () => {
    if (!newCo.company_name||!newCo.slug||!newCo.admin_email) { toast('⚠️ Fill required fields'); return }
    try {
      const r = await adminFetch('/companies', { method:'POST', body:JSON.stringify(newCo) })
      toast(r.message || r.error || 'Company created')
      setNewCo({company_name:'',slug:'',admin_email:'',admin_name:'Admin',plan:'trial',industry:'',country:'Nepal',sales_rep:'',account_manager:''})
      loadAll()
    } catch { toast('⚠️ Creation failed') }
  }

  const inp = { padding:'8px 10px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:11,
                outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }

  // ── Admin key gate ────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight:'100vh', background:G, display:'flex', alignItems:'center',
                   justifyContent:'center', fontFamily:'system-ui,sans-serif', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:36, maxWidth:380, width:'100%',
                     textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ fontSize:40, marginBottom:8 }}>🔐</div>
        <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', marginBottom:4 }}>eLogix Admin</div>
        <div style={{ fontSize:11, color:'#64748b', marginBottom:24 }}>Internal use only · eLogix Technologies</div>
        <input type="password" value={adminKey} onChange={e=>setAdminKey(e.target.value)}
          placeholder="Enter eLogix Admin Key" style={{...inp, marginBottom:12, textAlign:'center'}}
          onKeyDown={e=>e.key==='Enter'&&auth()}/>
        <button onClick={auth}
          style={{ width:'100%', padding:'11px', borderRadius:9, border:'none', background:G,
                    color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
          Authenticate
        </button>
        {msg && <div style={{ marginTop:12, fontSize:11, color:'#dc2626' }}>{msg}</div>}
      </div>
    </div>
  )

  const TabBtn = ({id,label}) => (
    <button onClick={()=>setTab(id)}
      style={{ padding:'8px 14px', borderRadius:9, border:'none', fontSize:10, fontWeight:tab===id?800:500,
                background:tab===id?'#fff':'transparent', color:tab===id?A:'#94a3b8', cursor:'pointer',
                boxShadow:tab===id?'0 1px 4px rgba(0,0,0,.1)':'none' }}>
      {label}
    </button>
  )

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', minHeight:'100vh', background:'#f5f3ff' }}>
      {msg && <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999, background:'#f5f3ff',
        border:'1px solid #ddd6fe', borderRadius:10, padding:'10px 18px', fontSize:11, color:'#4c1d95',
        boxShadow:'0 4px 16px rgba(0,0,0,.12)', maxWidth:420 }}>{msg}</div>}

      {/* Top nav */}
      <div style={{ background:G, padding:'12px 20px', display:'flex', alignItems:'center',
                     justifyContent:'space-between' }}>
        <div style={{ color:'#fff', fontSize:15, fontWeight:900 }}>🏢 eLogix Admin Panel</div>
        <div style={{ color:'rgba(255,255,255,.7)', fontSize:10 }}>
          eLogix Technologies · www.elogix.com.np
        </div>
        <button onClick={()=>{localStorage.removeItem('elogix_admin_key');setAuthed(false)}}
          style={{ padding:'6px 14px', borderRadius:8, border:'1.5px solid rgba(255,255,255,.5)',
                    background:'transparent', color:'#fff', fontSize:10, cursor:'pointer' }}>
          Logout
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ background:'#fff', padding:'6px 20px', display:'flex', gap:4,
                     borderBottom:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
        <TabBtn id="dashboard" label="📊 Dashboard"/>
        <TabBtn id="companies" label="🏢 Companies"/>
        <TabBtn id="create"    label="➕ New Company"/>
        <TabBtn id="tickets"   label={`🎫 Tickets${tickets.length?` (${tickets.length})`:''}` }/>
        <TabBtn id="broadcast" label="📢 Broadcast"/>
      </div>

      <div style={{ padding:'20px', maxWidth:1200, margin:'0 auto' }}>

        {/* DASHBOARD */}
        {tab==='dashboard' && dash && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
              {[
                ['🏢','Total Companies', dash.companies?.total, '#0369a1'],
                ['✅','Active',           dash.companies?.active, '#059669'],
                ['🎁','Trial',            dash.companies?.trial, '#0891b2'],
                ['⚠️','Suspended',        dash.companies?.suspended, '#d97706'],
                ['💰','MRR (NPR)',         `NPR ${(dash.billing?.mrr_npr||0).toLocaleString()}`, '#7c3aed'],
                ['📅','ARR (NPR)',         `NPR ${(dash.billing?.arr_npr||0).toLocaleString()}`, '#4338ca'],
                ['🧾','Overdue Invoices', dash.billing?.overdue_invoices, '#dc2626'],
                ['🎫','Open Tickets',      dash.support?.open_tickets, '#d97706'],
              ].map(([ic,lb,v,c])=>(
                <div key={lb} style={{ background:'#fff', borderRadius:12, padding:16,
                                        border:`2px solid ${c}20`, boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{ic}</div>
                  <div style={{ fontSize:18, fontWeight:900, color:c }}>{v}</div>
                  <div style={{ fontSize:9, color:'#64748b', marginTop:2 }}>{lb}</div>
                </div>
              ))}
            </div>
            <button onClick={loadAll}
              style={{ padding:'8px 18px', borderRadius:9, border:'none', background:G,
                        color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              🔄 Refresh
            </button>
          </div>
        )}

        {/* COMPANIES */}
        {tab==='companies' && (
          <div>
            <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
              <input value={searchCo} onChange={e=>setSearchCo(e.target.value)}
                placeholder="Search by name or slug..." style={{...inp, flex:1}}/>
              <button onClick={loadAll}
                style={{ padding:'8px 16px', borderRadius:8, border:'none',
                          background:A, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                🔍 Search
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {companies.map(c => {
                const sc = STATUS_C[c.status] || STATUS_C.active
                return (
                  <div key={c.id} style={{ background:'#fff', borderRadius:12, padding:16,
                                            border:'1px solid #e2e8f0',
                                            borderLeft:`4px solid ${sc.c}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:2 }}>{c.name}</div>
                        <div style={{ fontSize:10, color:'#64748b', marginBottom:6 }}>
                          🌐 {c.portal_url} · Plan: <b>{c.plan}</b> · Employees: {c.employee_count}/{c.max_employees}
                          {c.account_manager && ` · AM: ${c.account_manager}`}
                        </div>
                        <span style={{ background:sc.bg, color:sc.c, border:`1px solid ${sc.b}`,
                                        padding:'2px 9px', borderRadius:20, fontSize:9, fontWeight:700 }}>
                          {sc.icon} {c.status}
                        </span>
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {c.status !== 'active' && (
                          <button onClick={()=>doAction(c.slug,'activate')}
                            style={{ padding:'5px 12px', borderRadius:7, border:'none',
                                      background:'#f0fdf4', color:'#059669', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                            ✅ Activate
                          </button>
                        )}
                        {c.status === 'active' && (
                          <button onClick={()=>{const r=prompt('Suspension reason:');if(r)doAction(c.slug,'suspend',{reason:r})}}
                            style={{ padding:'5px 12px', borderRadius:7, border:'none',
                                      background:'#fffbeb', color:'#d97706', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                            ⚠️ Suspend
                          </button>
                        )}
                        <select onChange={e=>{if(e.target.value)doAction(c.slug,'changePlan',{plan:e.target.value})}}
                          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #e2e8f0',
                                    fontSize:10, cursor:'pointer', background:'#f8fafc' }}>
                          <option value="">Change Plan...</option>
                          {['trial','starter','growth','business','enterprise','unlimited'].map(p=>(
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <button onClick={()=>doAction(c.slug,'invoice')}
                          style={{ padding:'5px 12px', borderRadius:7, border:'none',
                                    background:'#f5f3ff', color:'#7c3aed', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                          🧾 Invoice
                        </button>
                        <button onClick={()=>{
                          const title = prompt('Notification title:')
                          const message = prompt('Message:')
                          if(title&&message) doAction(c.slug,'notify',{type:'alert',title,message})
                        }}
                          style={{ padding:'5px 12px', borderRadius:7, border:'none',
                                    background:'#f0f9ff', color:A, fontSize:10, fontWeight:700, cursor:'pointer' }}>
                          📢 Notify
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CREATE COMPANY */}
        {tab==='create' && (
          <div style={{ background:'#fff', borderRadius:16, padding:24, border:'1px solid #e2e8f0', maxWidth:680 }}>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:16 }}>
              ➕ Create New eLogix Client
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                ['Company Name *','company_name','text'],
                ['Portal Slug *','slug','text'],
                ['Admin Email *','admin_email','email'],
                ['Admin Name','admin_name','text'],
                ['Industry','industry','text'],
                ['Country','country','text'],
                ['Account Manager','account_manager','text'],
                ['Sales Rep','sales_rep','text'],
              ].map(([l,k,t])=>(
                <div key={k}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                  <input type={t} value={newCo[k]} onChange={e=>setNewCo(p=>({...p,[k]:e.target.value}))}
                    style={inp} placeholder={l.replace(' *','')}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Plan *</label>
                <select value={newCo.plan} onChange={e=>setNewCo(p=>({...p,plan:e.target.value}))} style={inp}>
                  {['trial','starter','growth','business','enterprise','unlimited'].map(p=>(
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop:8, fontSize:10, color:'#64748b' }}>
              Portal will be: <b>https://{newCo.slug||'{slug}'}.elogix.com.np</b>
            </div>
            <button onClick={createCompany}
              style={{ marginTop:16, padding:'11px 24px', borderRadius:10, border:'none',
                        background:G, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
              🚀 Provision eLogix Tenant
            </button>
          </div>
        )}

        {/* TICKETS */}
        {tab==='tickets' && (
          <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:14 }}>
              🎫 Open Support Tickets
            </div>
            {tickets.length===0 ? (
              <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12 }}>No open tickets</div>
            ) : tickets.map(t=>(
              <div key={t.id} style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:14, marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>{t.ticket_no}: {t.subject}</div>
                    <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>
                      Company: {t.company_id} · Priority: {t.priority} · Category: {t.category}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {['in_progress','resolved','closed'].map(s=>(
                      <button key={s} onClick={async()=>{
                        await adminFetch(`/tickets/${t.id}`,{method:'PUT',body:JSON.stringify({status:s})})
                        toast(`Ticket ${t.ticket_no} → ${s}`)
                        loadAll()
                      }}
                        style={{ padding:'3px 9px', borderRadius:6, border:'none', background:'#f8fafc',
                                  color:'#374151', fontSize:9, fontWeight:600, cursor:'pointer' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BROADCAST */}
        {tab==='broadcast' && (
          <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #e2e8f0', maxWidth:600 }}>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:16 }}>
              📢 Send Communication
            </div>
            <div style={{ display:'grid', gap:12 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Target</label>
                <select value={notify.slug} onChange={e=>setNotify(p=>({...p,slug:e.target.value}))} style={inp}>
                  <option value="">📢 ALL Active Companies</option>
                  {companies.map(c=><option key={c.id} value={c.slug}>{c.name} ({c.slug})</option>)}
                </select>
              </div>
              {[['Type','type',['billing','alert','update','marketing','security']],
                ['Priority','priority',['low','normal','high','critical']]].map(([l,k,opts])=>(
                <div key={k}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                  <select value={notify[k]} onChange={e=>setNotify(p=>({...p,[k]:e.target.value}))} style={inp}>
                    {opts.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Title *</label>
                <input value={notify.title} onChange={e=>setNotify(p=>({...p,title:e.target.value}))} style={inp} placeholder="Notification title..."/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Message *</label>
                <textarea value={notify.message} onChange={e=>setNotify(p=>({...p,message:e.target.value}))}
                  rows={4} style={{...inp,resize:'vertical',fontFamily:'inherit'}} placeholder="Message..."/>
              </div>
              <button onClick={()=>{
                if(!notify.title||!notify.message){toast('⚠️ Title and message required');return}
                if(notify.slug) doAction(notify.slug,'notify',notify)
                else doAction('','notifyAll',notify)
              }}
                style={{ padding:'11px', borderRadius:10, border:'none', background:G,
                          color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                {notify.slug?`📢 Send to ${notify.slug}`:'📢 Send to ALL Companies'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

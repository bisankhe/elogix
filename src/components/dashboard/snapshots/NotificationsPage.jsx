// FILE: src/components/dashboard/snapshots/NotificationsPage.jsx
// eLogix HRMS — Notifications & Alerts Centre
// COMPLETE REWRITE — Zero mock data. 100% real tenant API.
// API: GET /api/v1/notifications
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}

const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const TYPE_CFG = {
  critical : { color:'#ef4444', bg:'#fef2f2', border:'#fecaca', icon:'🔴', label:'Critical' },
  warning  : { color:'#d97706', bg:'#fffbeb', border:'#fde68a', icon:'🟡', label:'Warning'  },
  info     : { color:'#0284c7', bg:'#eff6ff', border:'#bfdbfe', icon:'🔵', label:'Info'     },
  success  : { color:'#059669', bg:'#f0fdf4', border:'#bbf7d0', icon:'🟢', label:'Success'  },
  ai       : { color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', icon:'🤖', label:'AI Alert' },
}

function NotifItem({ n, onRead, onAction }) {
  const t   = TYPE_CFG[n.type] || TYPE_CFG.info
  const [exp, setExp] = useState(false)
  return (
    <div onClick={() => { setExp(v => !v); if (!n.read) onRead(n.id) }}
      style={{ borderLeft:`4px solid ${t.color}`, background:n.read?'#fff':t.bg,
        borderBottom:'1px solid #f1f5f9', padding:'13px 16px', cursor:'pointer',
        transition:'background .15s' }}
      onMouseEnter={e => e.currentTarget.style.background=t.bg}
      onMouseLeave={e => e.currentTarget.style.background=n.read?'#fff':t.bg}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
          background:t.bg, border:`1.5px solid ${t.border}`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
          {n.icon || t.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
            <div style={{ fontWeight:n.read?600:800, fontSize:13, color:'#0f172a', lineHeight:1.3 }}>
              {n.title}
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
              {!n.read && <span style={{ width:8, height:8, borderRadius:'50%', background:t.color, flexShrink:0 }}/>}
              <span style={{ fontSize:10, color:'#94a3b8', whiteSpace:'nowrap' }}>{n.time_ago || n.time}</span>
            </div>
          </div>
          <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>{n.subtitle || n.sub}</div>

          {/* Expanded detail */}
          {exp && n.detail && (
            <div style={{ marginTop:10, padding:10, background:'#f8fafc', borderRadius:8,
              fontSize:12, color:'#475569', lineHeight:1.6 }}>
              {n.detail}
            </div>
          )}

          {/* Action button */}
          {n.action_label && (
            <div style={{ marginTop:8 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => onAction(n)}
                style={{ padding:'5px 14px', borderRadius:8, border:'none',
                  background:t.color, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                {n.action_label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const [notifs,   setNotifs]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [filter,   setFilter]   = useState('all')
  const [module,   setModule]   = useState('All')
  const [search,   setSearch]   = useState('')
  const [marking,  setMarking]  = useState(false)

  const s       = _getSession()
  const company = s?.company || {}
  const user    = s?.user    || {}

  function authHeaders() {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    return { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug, 'Content-Type':'application/json' }
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }

    fetch('/api/v1/notifications?limit=100', { headers: authHeaders() })
      .then(r => {
        if (r.status === 401) { window.dispatchEvent(new CustomEvent('elogix:session-expired')); throw new Error('Session expired') }
        if (!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => setNotifs(d.data?.notifications || d.notifications || d.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const markRead = async (id) => {
    setNotifs(p => p.map(n => n.id === id ? { ...n, read:true } : n))
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method:'PATCH', headers: authHeaders() })
    } catch (_e) {}
  }

  const markAllRead = async () => {
    setMarking(true)
    setNotifs(p => p.map(n => ({ ...n, read:true })))
    try {
      await fetch('/api/v1/notifications/mark-all-read', { method:'PATCH', headers: authHeaders() })
    } catch (_e) {}
    setMarking(false)
  }

  const handleAction = (n) => {
    if (n.action_url) window.dispatchEvent(new CustomEvent('elogix:nav', { detail:{ page:n.action_url } }))
  }

  // Derived values
  const modules  = ['All', ...new Set(notifs.map(n => n.module).filter(Boolean))]
  const unread   = notifs.filter(n => !n.read).length
  const critical = notifs.filter(n => n.type === 'critical').length
  const today    = notifs.filter(n => n.is_today || n.time_ago?.includes('min') || n.time_ago?.includes('hr')).length

  const filtered = notifs.filter(n => {
    if (filter !== 'all' && n.type !== filter) return false
    if (module !== 'All' && n.module !== module) return false
    if (search && !n.title?.toLowerCase().includes(search.toLowerCase()) &&
        !n.subtitle?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:A, fontFamily:'system-ui' }}>
      <div style={{ fontSize:36, marginBottom:12 }}>⟳</div>
      <div style={{ fontSize:13, fontWeight:600 }}>Loading notifications for {company?.name}...</div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>
      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'20px 24px', marginBottom:20,
        boxShadow:'0 4px 24px rgba(124,58,237,.25)',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>🔔 Notifications</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>
            {company?.name} · {unread} unread of {notifs.length}
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} disabled={marking}
            style={{ padding:'7px 16px', borderRadius:20, border:'1.5px solid rgba(255,255,255,.4)',
              background:'rgba(255,255,255,.15)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
            {marking ? '⟳ Marking...' : '✅ Mark all read'}
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'🔔', label:'Total',    val:notifs.length, color:'#7c3aed' },
          { icon:'🔴', label:'Unread',   val:unread,        color:'#ef4444' },
          { icon:'⚠️', label:'Critical', val:critical,      color:'#d97706' },
          { icon:'🕐', label:'Today',    val:today,         color:'#0284c7' },
        ].map((k,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:13, padding:'14px 16px',
            border:`1.5px solid ${k.color}20`, borderTop:`4px solid ${k.color}`,
            boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{k.icon}</div>
            <div style={{ fontSize:26, fontWeight:900, color:k.color }}>{k.val}</div>
            <div style={{ fontSize:10, color:'#64748b', marginTop:3, fontWeight:600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        {['all','critical','warning','info','success','ai'].map(f => {
          const cfg = TYPE_CFG[f] || { color:A, bg:'#f5f3ff', label:'All' }
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'5px 14px', borderRadius:20, border:`1.5px solid ${filter===f?cfg.color:'#e2e8f0'}`,
                background:filter===f?cfg.color:'#fff', color:filter===f?'#fff':'#64748b',
                fontSize:11, fontWeight:700, cursor:'pointer' }}>
              {cfg.icon || '🔔'} {cfg.label || 'All'}
            </button>
          )
        })}
      </div>

      {/* Module filter + Search */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search notifications..."
          style={{ flex:1, minWidth:180, padding:'7px 12px', borderRadius:8,
            border:'1px solid #e2e8f0', fontSize:12, outline:'none' }}/>
        <select value={module} onChange={e => setModule(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e2e8f0',
            fontSize:12, outline:'none', background:'#fff' }}>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding:'12px 16px', background:'#fef2f2', borderRadius:10,
          color:'#dc2626', fontSize:12, fontWeight:600, marginBottom:14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Notification list */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        {notifs.length === 0 && !loading && (
          <div style={{ padding:60, textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔔</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#475569' }}>No notifications yet</div>
            <div style={{ fontSize:12, marginTop:6 }}>Alerts will appear here as activity happens</div>
          </div>
        )}
        {filtered.length === 0 && notifs.length > 0 && (
          <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:13 }}>
            No notifications match your filter
          </div>
        )}
        {filtered.map(n => (
          <NotifItem key={n.id} n={n} onRead={markRead} onAction={handleAction}/>
        ))}
      </div>

      {filtered.length > 0 && (
        <div style={{ textAlign:'center', marginTop:12, fontSize:11, color:'#94a3b8' }}>
          Showing {filtered.length} of {notifs.length} notifications
        </div>
      )}
    </div>
  )
}

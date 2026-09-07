// FILE: src/components/dashboard/snapshots/UpcomingEventsPage.jsx
// eLogix HRMS — Upcoming Events
// COMPLETE REWRITE — Zero mock data. 100% real tenant API.
// APIs: /api/v1/calendar/events + /api/v1/employees/birthdays-anniversaries
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

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0891b2 60%,#38bdf8 100%)'
const A = '#0891b2'

const TYPE_META = {
  payroll    : { color:'#7c3aed', bg:'#f5f3ff', icon:'💰', label:'Payroll'     },
  compliance : { color:'#ef4444', bg:'#fef2f2', icon:'⚠️', label:'Compliance'  },
  training   : { color:'#0891b2', bg:'#f0f9ff', icon:'🎓', label:'Training'    },
  holiday    : { color:'#f59e0b', bg:'#fffbeb', icon:'🏖️', label:'Holiday'     },
  onboard    : { color:'#10b981', bg:'#f0fdf4', icon:'🎉', label:'Onboarding'  },
  meeting    : { color:'#374151', bg:'#f9fafb', icon:'📋', label:'Meeting'     },
  review     : { color:'#8b5cf6', bg:'#faf5ff', icon:'📊', label:'Review'      },
  social     : { color:'#f97316', bg:'#fff7ed', icon:'🎊', label:'Social'      },
  birthday   : { color:'#ec4899', bg:'#fdf4ff', icon:'🎂', label:'Birthday'    },
  anniversary: { color:'#10b981', bg:'#f0fdf4', icon:'🥂', label:'Anniversary' },
  deadline   : { color:'#ef4444', bg:'#fef2f2', icon:'⏰', label:'Deadline'    },
  leave      : { color:'#06b6d4', bg:'#f0f9ff', icon:'🌴', label:'Leave'       },
  default    : { color:'#64748b', bg:'#f8fafc', icon:'📅', label:'Event'       },
}
const PRIORITY_C = { critical:'#ef4444', high:'#f59e0b', normal:'#10b981' }

function daysFromNow(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0)
  const ev    = new Date(dateStr); ev.setHours(0,0,0,0)
  return Math.round((ev - today) / 86400000)
}
function urgencyLabel(days) {
  if (days < 0)  return { label:'Overdue', color:'#ef4444' }
  if (days === 0) return { label:'Today',   color:'#ef4444' }
  if (days === 1) return { label:'Tomorrow',color:'#f59e0b' }
  if (days <= 7)  return { label:`In ${days}d`,  color:'#f59e0b' }
  if (days <= 30) return { label:`In ${days}d`,  color:'#64748b' }
  return               { label:`In ${days}d`,    color:'#94a3b8' }
}

export default function UpcomingEventsPage() {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')
  const [range,   setRange]   = useState(60)

  const s       = _getSession()
  const company = s?.company || {}

  function authHeaders() {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    return { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug, 'Content-Type':'application/json' }
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }

    setLoading(true)
    Promise.all([
      fetch(`/api/v1/calendar/events?days=${range}`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null),
      fetch('/api/v1/employees/birthdays-anniversaries', { headers: authHeaders() }).then(r => r.ok ? r.json() : null),
      fetch('/api/v1/employees/contract-expiry', { headers: authHeaders() }).then(r => r.ok ? r.json() : null),
    ])
      .then(([calData, bdData, contractData]) => {
        const all = []

        // Calendar events
        const calEvents = calData?.events || calData?.data || []
        calEvents.forEach(e => {
          const days = daysFromNow(e.date)
          if (days >= -1 && days <= range) {
            all.push({ ...e, days, source:'calendar',
              type: e.type || 'meeting',
              priority: days <= 1 ? 'critical' : days <= 7 ? 'high' : 'normal' })
          }
        })

        // Birthdays
        const bdays = bdData?.data?.birthdays || bdData?.birthdays || []
        bdays.forEach(b => {
          const days = daysFromNow(b.date || b.next_birthday)
          if (days >= 0 && days <= range) {
            all.push({
              id: `bd-${b.id}`, title: `🎂 ${b.name}'s Birthday`,
              date: b.date || b.next_birthday, days,
              type:'birthday', dept: b.department, source:'birthday',
              priority: days === 0 ? 'critical' : days <= 7 ? 'high' : 'normal',
              detail: `${b.name} from ${b.department} turns ${b.age} today!`
            })
          }
        })

        // Anniversaries
        const anns = bdData?.data?.anniversaries || bdData?.anniversaries || []
        anns.forEach(a => {
          const days = daysFromNow(a.date || a.next_anniversary)
          if (days >= 0 && days <= range) {
            all.push({
              id: `ann-${a.id}`, title: `🥂 ${a.name} — ${a.years}yr Anniversary`,
              date: a.date || a.next_anniversary, days,
              type:'anniversary', dept: a.department, source:'anniversary',
              priority: days === 0 ? 'critical' : days <= 7 ? 'high' : 'normal',
              detail: `${a.name} celebrates ${a.years} years at ${company?.name}`
            })
          }
        })

        // Contract expiries
        const contracts = contractData?.data?.contracts || contractData?.contracts || []
        contracts.forEach(c => {
          const days = daysFromNow(c.end_date)
          if (days >= 0 && days <= range) {
            all.push({
              id: `ct-${c.id}`, title: `📄 Contract Expiry — ${c.name}`,
              date: c.end_date, days,
              type:'compliance', dept: c.dept, source:'contract',
              priority: days <= 7 ? 'critical' : days <= 30 ? 'high' : 'normal',
              detail: `${c.name}'s contract expires in ${days} days`
            })
          }
        })

        // Sort by days
        all.sort((a,b) => a.days - b.days)
        setEvents(all)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [range])

  const types    = ['all', ...new Set(events.map(e => e.type))]
  const critical = events.filter(e => e.priority === 'critical').length
  const thisWeek = events.filter(e => e.days >= 0 && e.days <= 7).length

  const filtered = events.filter(e => {
    if (filter !== 'all' && e.type !== filter) return false
    if (search && !e.title?.toLowerCase().includes(search.toLowerCase()) &&
        !e.dept?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:A, fontFamily:'system-ui' }}>
      <div style={{ fontSize:36, marginBottom:12 }}>⟳</div>
      <div style={{ fontSize:13, fontWeight:600 }}>Loading upcoming events for {company?.name}...</div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>
      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'20px 24px', marginBottom:20,
        boxShadow:'0 4px 24px rgba(8,145,178,.25)',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>📅 Upcoming Events</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>
            {company?.name} · Next {range} days
          </div>
        </div>
        <select value={range} onChange={e => setRange(Number(e.target.value))}
          style={{ padding:'6px 12px', borderRadius:20, border:'1.5px solid rgba(255,255,255,.4)',
            background:'rgba(255,255,255,.15)', color:'#fff', fontSize:11, fontWeight:700, outline:'none' }}>
          {[7,14,30,60,90].map(d => <option key={d} value={d} style={{ color:'#0f172a' }}>Next {d} days</option>)}
        </select>
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'📅', label:'Total',     val:events.length, color:A          },
          { icon:'🔴', label:'Critical',  val:critical,      color:'#ef4444'  },
          { icon:'📆', label:'This Week', val:thisWeek,      color:'#f59e0b'  },
          { icon:'📋', label:'Types',     val:types.length-1,color:'#8b5cf6'  },
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
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
        {types.map(type => {
          const m = TYPE_META[type] || TYPE_META.default
          return (
            <button key={type} onClick={() => setFilter(type)}
              style={{ padding:'5px 12px', borderRadius:20,
                border:`1.5px solid ${filter===type?m.color:'#e2e8f0'}`,
                background:filter===type?m.color:'#fff',
                color:filter===type?'#fff':'#64748b',
                fontSize:11, fontWeight:700, cursor:'pointer' }}>
              {type==='all'?'📋 All':`${m.icon} ${m.label}`}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom:14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search events or departments..."
          style={{ width:'100%', maxWidth:320, padding:'7px 12px', borderRadius:8,
            border:'1px solid #e2e8f0', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding:'12px 16px', background:'#fffbeb', borderRadius:10,
          color:'#92400e', fontSize:12, fontWeight:600, marginBottom:14 }}>
          ⚠️ {error} — showing available data
        </div>
      )}

      {/* Empty */}
      {events.length === 0 && !loading && (
        <div style={{ textAlign:'center', padding:60, color:'#94a3b8', background:'#fff', borderRadius:14 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#475569' }}>No upcoming events in the next {range} days</div>
          <div style={{ fontSize:12, marginTop:6 }}>Add events to your calendar to see them here</div>
        </div>
      )}

      {/* Event list */}
      {filtered.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map((ev, i) => {
            const m   = TYPE_META[ev.type] || TYPE_META.default
            const urg = urgencyLabel(ev.days)
            const [exp, setExp] = useState(false)
            return (
              <div key={ev.id || i} onClick={() => setExp(v => !v)}
                style={{ background:'#fff', borderRadius:13, padding:'14px 18px',
                  border:`1.5px solid ${m.color}20`, borderLeft:`5px solid ${m.color}`,
                  boxShadow:'0 2px 8px rgba(0,0,0,.06)', cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background=m.bg}
                onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
                    background:m.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                    {m.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>{ev.title}</div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>
                      {ev.date}{ev.time ? ` · ${ev.time}` : ''}{ev.dept ? ` · ${ev.dept}` : ''}{ev.loc ? ` · 📍${ev.loc}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:urg.color }}>{urg.label}</div>
                    <span style={{ fontSize:9, padding:'2px 8px', borderRadius:20, fontWeight:700,
                      background:m.bg, color:m.color, display:'inline-block', marginTop:3 }}>
                      {m.label}
                    </span>
                  </div>
                </div>
                {exp && ev.detail && (
                  <div style={{ marginTop:10, padding:10, background:'#f8fafc', borderRadius:8,
                    fontSize:12, color:'#475569', lineHeight:1.5 }}>
                    {ev.detail}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

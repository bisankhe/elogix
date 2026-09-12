// ============================================================
// FILE: src/components/dashboard/EmployeeDashboard.jsx
// PURPOSE: Employee Self-Service (ESS) Dashboard — quick actions,
//          leave balances, payslip, goals, daily tasks, events,
//          birthdays, Nepal Labour Act leave entitlements
// ============================================================

import { useState, useEffect } from 'react'
import { useApp }      from '../../context/AppContext.jsx'
import { StatCard }    from '../shared/StatCard.jsx'
import { Card }        from '../shared/Card.jsx'
import EmployeeFeedWidget from '../shared/EmployeeFeedWidget.jsx'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

function ProgressBar({ value = 0, color = '#3b82f6', height = 6 }) {
  return (
    <div style={{ height, background: '#f1f5f9', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, value))}%`,
        background: color, borderRadius: height, transition: 'width .5s' }}/>
    </div>
  )
}



const quickActions = [
  { icon: '📋', label: 'Apply Leave',     action: 'apply-leave'     },
  { icon: '💵', label: 'View Payslip',    action: 'payslips'        },
  { icon: '🎯', label: 'My Goals',        action: 'goals'           },
  { icon: '📑', label: 'Request Letter',  action: 'letter-request'  },
  { icon: '⏰', label: 'Attendance',      action: 'attendance'      },
  { icon: '👤', label: 'My Profile',      action: 'employee-profile'},
]

export default function EmployeeDashboard() {

  const _s  = _getSession()
  const _co = _s?.company || {}
  const _u  = _s?.user    || {}

  const [leaveBalances,  setLeaveBalances]  = useState([])
  const [myTasks,        setMyTasks]        = useState([])
  const [events,         setEvents]         = useState([])
  const [birthdays,      setBirthdays]      = useState([])
  const [performance,    setPerformance]    = useState([])
  const [profile,        setProfile]        = useState({})
  const [apiLoading,     setApiLoading]     = useState(true)
  const [apiError,       setApiError]       = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token') || _s?.token || ''
    const slug  = _s?.company?.slug || ''
    if (!token || !slug) { setApiLoading(false); return }
    fetch('/api/v1/employee-dashboard/my-summary', { headers: _authH() })
      .then(r => {
        if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
        if(!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => {
        const dd = d.data || d
        if(dd.leave_balances)   setLeaveBalances(dd.leave_balances)
        if(dd.tasks)            setMyTasks(dd.tasks)
        if(dd.events)           setEvents(dd.events)
        if(dd.birthdays)        setBirthdays(dd.birthdays)
        if(dd.performance)      setPerformance(dd.performance)
        if(dd.profile)          setProfile(dd.profile)
      })
      .catch(e => setApiError(e.message))
      .finally(() => setApiLoading(false))
  }, [])
  const { t, cc, navTo } = useApp()
  const [tasks, setTasks] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const toggle = (id) => setTasks(p => p.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk))
  const done = tasks.filter(t => t.done).length

  const fmt = (val) => `${cc.symbol}${val.toLocaleString()}`

  return (
    <div>
      <PageTitle title="Employee Self-Service Portal" sub="Welcome, Ram Bahadur Thapa · IT Department · Senior Developer · ID: NHR-2024-0847 · 🔒 Your data is private & confidential." badge="ESS" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="📅" label="Leave Balance"       value="8 days"         change="Annual leave"          up  accent="#3b82f6" />
        <StatCard icon="🎯" label="Performance Score"   value="82%"            change="+3% vs last quarter"   up  accent="#10b981" />
        <StatCard icon="🕐" label="Tenure"              value="2.3 yrs"        change="Since Feb 2024"        up  accent="#f59e0b" />
        <StatCard icon="💵" label="Last Payslip (May)"  value={fmt(68000)}     change="Processed"             up  accent="#8b5cf6" />
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'overview',  label: '🏠 Overview'  },
          { id: 'leave',     label: '📅 Leave'     },
          { id: 'tasks',     label: `✅ Tasks (${done}/${tasks.length})` },
          { id: 'payslips',  label: '💵 Payslips'  },
          { id: 'profile',   label: '👤 My Profile'},
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border-none cursor-pointer
              ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Quick Actions */}
              <Card title="Quick Actions" subtitle="Self-service shortcuts">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {quickActions.map((q, i) => (
                    <button key={i}
                      onClick={() => navTo && navTo(q.action)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', transition: 'all .15s', fontSize: 10, color: '#475569' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3b82f6' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0' }}>
                      <span style={{ fontSize: 20 }}>{q.icon}</span>
                      <span style={{ fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{q.label}</span>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Performance */}
              <Card title="My Performance" subtitle="Q2 2026 at a glance">
                {(performance.length > 0 ? performance : [
                  { label: 'KPI Achievement',     pct: null, color: '#10b981' },
                  { label: 'Goals Completed',     pct: null, color: '#3b82f6' },
                  { label: 'Training Completion', pct: null, color: '#8b5cf6' },
                  { label: 'Attendance YTD',      pct: null, color: '#f59e0b' },
                ]).map((p, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                      <span style={{ color: '#475569' }}>{p.label}</span>
                      <span style={{ fontWeight: 700 }}>{p.pct}%</span>
                    </div>
                    <ProgressBar value={p.pct} color={p.color} />
                  </div>
                ))}
              </Card>
            </div>

            {/* Events + Birthdays */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Card title="Upcoming Events" subtitle="Company calendar">
                {events.slice(0, 4).map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: eventColor[ev.type] || '#3b82f6', lineHeight: 1 }}>{ev.day}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{ev.month}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{ev.title}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{ev.sub}</div>
                    </div>
                  </div>
                ))}
              </Card>

              <Card title="Birthdays & Anniversaries">
                {birthdays.map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                    <span style={{ fontSize: 20 }}>{b.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{b.dept} · {b.when}</div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leave' && (
        <div>
          <Card title="My Leave Balance — Nepal Labour Act Entitlements" subtitle="Your legal leave rights — confidential to you only">
            {leaveBalances.map((l, i) => (
              <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{l.type}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{l.law}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{l.used}</span> used · <span style={{ fontWeight: 800, color: l.color }}>{l.total - l.used}</span> remaining
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>of {l.total} days entitled</div>
                  </div>
                </div>
                <ProgressBar value={(l.used / l.total) * 100} color={l.color} />
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <button style={{ padding: '9px 18px', borderRadius: 9, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginRight: 8 }}>
                📝 Apply for Leave
              </button>
              <button style={{ padding: '9px 18px', borderRadius: 9, background: '#fff', color: '#3b82f6', border: '1px solid #3b82f6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                📊 Leave History
              </button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          <Card title="My Daily Tasks & Things To Do" subtitle="Today's agenda — stored for performance records">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>📋 Today's Tasks</div>
                {tasks.map(tk => <TaskItem key={tk.id} {...tk} onToggle={() => toggle(tk.id)} />)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>📅 This Week's Events</div>
                {events.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: eventColor[ev.type], lineHeight: 1 }}>{ev.day}</div>
                      <div style={{ fontSize: 9, color: '#94a3b8' }}>{ev.month}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{ev.title}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{ev.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'payslips' && (
        <Card title="My Payslips" subtitle="Last 3 months — download available · 🔒 Confidential">
          {myPayslips.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.month}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Gross: {fmt(p.gross)} · Deductions: {fmt(p.deductions)} · <strong>Net: {fmt(p.net)}</strong></div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Pill color="green">{p.status}</Pill>
                <button style={{ padding: '5px 12px', borderRadius: 7, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  ⬇ Download
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'profile' && (
        <Card title="My Profile" subtitle="🔒 Personal information — visible only to you and HR">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { label: 'Full Name',       value: 'Ram Bahadur Thapa'      },
              { label: 'Employee ID',     value: 'NHR-2024-0847'          },
              { label: 'Department',      value: 'IT Department'          },
              { label: 'Position',        value: 'Senior Developer'       },
              { label: 'Grade',           value: 'G4 — Senior'           },
              { label: 'Reporting To',    value: 'Bikram Shrestha'        },
              { label: 'Join Date',       value: 'Feb 15, 2024'          },
              { label: 'Employment Type', value: 'Insource — Permanent'  },
              { label: 'Work Location',   value: 'Kathmandu HQ'          },
              { label: 'Contract Type',   value: 'Regular / Permanent'   },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>{f.label}</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{f.value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <button style={{ padding: '9px 18px', borderRadius: 9, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              ✏️ Request Profile Update
            </button>
          </div>
        </Card>
      )}
      {/* Employee Hub social feed -- auto-appears at bottom of every ESS dashboard */}
      <EmployeeFeedWidget navTo={navTo}/>
    </div>
  )
}

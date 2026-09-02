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
import { Pill }        from '../shared/Pill.jsx'
import { ProgressBar } from '../shared/ProgressBar.jsx'
import { TaskItem }    from '../shared/TaskItem.jsx'
import { PageTitle }   from '../shared/PageTitle.jsx'
import EmployeeFeedWidget from '../shared/EmployeeFeedWidget.jsx'

const leaveBalances = [
  { type: 'Annual (Home) Leave',  used: 12, total: 20, color: '#3b82f6', law: 'Sec.55 — 1 day per 20 days worked' },
  { type: 'Sick Leave',           used: 4,  total: 12, color: '#8b5cf6', law: 'Sec.56 — 12 days/year' },
  { type: 'Compensatory Leave',   used: 3,  total: 5,  color: '#10b981', law: 'Earned via OT work' },
  { type: 'Paternity Leave',      used: 0,  total: 15, color: '#f59e0b', law: 'Sec.58 — 15 days paid' },
]

const myTasks = [
  { id: 1, task: 'Submit daily activity report',      priority: 'high',   done: false },
  { id: 2, task: 'Update project status in system',   priority: 'high',   done: false },
  { id: 3, task: 'Complete online training module 3', priority: 'medium', done: false },
  { id: 4, task: 'Attend team standup at 9:30 AM',    priority: 'medium', done: true  },
  { id: 5, task: 'Submit timesheet for May review',   priority: 'low',    done: true  },
  { id: 6, task: 'Review and sign Q2 appraisal',      priority: 'medium', done: false },
]

const events = [
  { day: '5',  month: 'Jun', title: 'Leadership Training',        sub: 'IT Dept · Mandatory',            type: 'mandatory'  },
  { day: '10', month: 'Jun', title: 'Q2 Performance Review',      sub: 'With Bikram Shrestha',            type: 'review'     },
  { day: '13', month: 'Jun', title: '⚠️ Tax Clearance EXPIRED',  sub: 'IRD · eLogix HRMS · Renew NOW',    type: 'doc_expired'},
  { day: '15', month: 'Jun', title: 'Payroll Processing',         sub: 'Submit timesheet by Jun 12',      type: 'payroll'    },
  { day: '20', month: 'Jun', title: '🔔 Trade License Renewal',   sub: 'Dept. of Commerce · Due Jul 1',  type: 'doc_warn'   },
  { day: '20', month: 'Jun', title: 'Company Town Hall',          sub: 'All-hands · 10:00 AM',           type: 'company'    },
  { day: '30', month: 'Jun', title: 'Compliance Review Due',      sub: 'Nepal Labour Act 2017',           type: 'compliance' },
  { day: '15', month: 'Jul', title: '⚠️ OCR Certificate Expires', sub: 'OCR · eLogix HRMS · Renew by Jul 15', type: 'doc_warn'},
]

const birthdays = [
  { name: 'Roshan Shrestha', dept: 'IT',      when: 'Today',    icon: '🎂', type: 'birthday'   },
  { name: 'Anita Gurung',    dept: 'HR',      when: 'Tomorrow', icon: '🎂', type: 'birthday'   },
  { name: 'Suresh Bista',    dept: 'Finance', when: 'Jun 8',    icon: '🏅', type: 'anniversary'},
]

const myPayslips = [
  { month: 'May 2026', gross: 80000, deductions: 12000, net: 68000, status: 'Paid'    },
  { month: 'Apr 2026', gross: 80000, deductions: 12000, net: 68000, status: 'Paid'    },
  { month: 'Mar 2026', gross: 78000, deductions: 11700, net: 66300, status: 'Paid'    },
]

const eventColor = {
  mandatory: '#ef4444', review: '#3b82f6', payroll: '#10b981',
  company: '#8b5cf6', compliance: '#f59e0b',
  doc_expired: '#dc2626', doc_warn: '#f59e0b',
}

const quickActions = [
  { icon: '📝', label: 'Apply Leave',    action: 'leave-request-ess'  },
  { icon: '🕐', label: 'Attendance',    action: 'my-attendance-ess'  },
  { icon: '💵', label: 'Payslip',       action: 'payslip-download'   },
  { icon: '🧾', label: 'Expenses',      action: 'field-visit-expenses'},
  { icon: '👤', label: 'My Profile',    action: 'my-profile'         },
  { icon: '🎯', label: 'My Goals',      action: 'my-goals-kpi'       },
  { icon: '📋', label: 'Daily Report',  action: 'my-daily-activity'  },
  { icon: '🎓', label: 'Training',      action: 'my-training-ess'    },
  { icon: '💬', label: 'Feedback',      action: 'my-feedback-ess'    },
]


function _sess() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch{return{}}
}
function _headers() {
  const s=_sess()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug),session:s}
}

export default function EmployeeDashboard() {
  const [dashData,setDashData]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState(null)
  const { t, cc, navTo } = useApp()
  const [tasks, setTasks] = useState(myTasks)
  const [activeTab, setActiveTab] = useState('overview')
  const toggle = (id) => setTasks(p => p.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk))
  const done = tasks.filter(t => t.done).length

  const fmt = (val) => `${cc.symbol}${val.toLocaleString()}`

  useEffect(()=>{
    const {token,slug,valid,session} = _headers()
    if(!valid){setLoading(false);return}
    setLoading(true);setError(null)
    const empId = session?.user?.employee_id||''
    fetch('/api/v1/dashboard/employee' + (empId?`?emp_id=${empId}`:''), {
      headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}
    })
      .then(r=>{
        if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
        if(!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json()
      })
      .then(d=>{ if(d.success) setDashData(d.data) })
      .catch(err=>{setError(err.message);console.error('[eLogix dashboard] /employee:',err)})
      .finally(()=>setLoading(false))
  },[])

  return (
    <div>
      <PageTitle title="Employee Self-Service Portal" sub="Welcome, Ram Bahadur Thapa · IT Department · Senior Developer · ID: NHR-2024-0847 · 🔒 Your data is private & confidential." badge="ESS" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {loading && (
        <div style={{textAlign:'center',padding:60,color:'#7c3aed'}}>
          <div style={{fontSize:36,marginBottom:12,display:'inline-block',animation:'spin 1s linear infinite'}}>⟳</div>
          <div style={{fontSize:13,fontWeight:600}}>Loading your dashboard...</div>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {error && !loading && (
        <div style={{padding:'12px 20px',background:'#fef2f2',border:'1px solid #fecaca',
          borderRadius:10,marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>
          ⚠️ {error}
        </div>
      )}
      {!loading && !dashData && !error && (
        <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}>
          <div style={{fontSize:40,marginBottom:12}}>📊</div>
          <div style={{fontSize:14,fontWeight:600}}>No data available</div>
          <div style={{fontSize:12,marginTop:4}}>Data will appear once your company is set up in eLogix</div>
        </div>
      )}
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
                {[
                  { label: 'KPI Achievement',     pct: 82, color: '#10b981' },
                  { label: 'Goals Completed',     pct: 65, color: '#3b82f6' },
                  { label: 'Training Completion', pct: 90, color: '#8b5cf6' },
                  { label: 'Attendance YTD',      pct: 96, color: '#f59e0b' },
                ].map((p, i) => (
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

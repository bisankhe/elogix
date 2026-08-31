// ============================================================
// FILE: src/components/dashboard/snapshots/LeaveSnapshot.jsx
// PURPOSE: Leave management snapshot — accrued vs used,
//          Nepal Labour Act entitlements, calendar heatmap,
//          peak periods, pending approvals
// ============================================================

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useApp }      from '../../../context/AppContext.jsx'
import { StatCard }    from '../../shared/StatCard.jsx'
import { Card }        from '../../shared/Card.jsx'
import { Pill }        from '../../shared/Pill.jsx'
import { ProgressBar } from '../../shared/ProgressBar.jsx'
import { PageTitle }   from '../../shared/PageTitle.jsx'

// ── Mock Data ────────────────────────────────────────────────
const leaveEntitlements = [
  { type: 'Annual (Home) Leave',   entitled: 20,  used: 12, remaining: 8,  color: '#3b82f6', law: 'Section 55 — 1 day per 20 days worked' },
  { type: 'Sick Leave',            entitled: 12,  used: 4,  remaining: 8,  color: '#8b5cf6', law: 'Section 56 — 12 days paid'             },
  { type: 'Maternity Leave',       entitled: 98,  used: 0,  remaining: 98, color: '#10b981', law: 'Section 57 — 98 days paid'             },
  { type: 'Paternity Leave',       entitled: 15,  used: 5,  remaining: 10, color: '#f59e0b', law: 'Section 58 — 15 days paid'             },
  { type: 'Mourning Leave',        entitled: 13,  used: 0,  remaining: 13, color: '#ef4444', law: 'Section 59'                            },
  { type: 'Compensatory Leave',    entitled: 5,   used: 3,  remaining: 2,  color: '#06b6d4', law: 'Earned via OT or holiday work'         },
]

const leaveByDept = [
  { dept: 'IT',         annual: 18, sick: 7,  maternity: 0, paternity: 2 },
  { dept: 'HR',         annual: 12, sick: 4,  maternity: 3, paternity: 1 },
  { dept: 'Finance',    annual: 15, sick: 9,  maternity: 0, paternity: 3 },
  { dept: 'Operations', annual: 22, sick: 11, maternity: 2, paternity: 4 },
  { dept: 'Sales',      annual: 19, sick: 8,  maternity: 1, paternity: 2 },
]

const monthlyLeaveData = [
  { month: 'Jan', leave: 80,  forecast: 78  },
  { month: 'Feb', leave: 90,  forecast: 88  },
  { month: 'Mar', leave: 70,  forecast: 74  },
  { month: 'Apr', leave: 75,  forecast: 77  },
  { month: 'May', leave: 85,  forecast: 84  },
  { month: 'Jun', leave: 110, forecast: 108 },
  { month: 'Jul', leave: 95,  forecast: 98  },
  { month: 'Aug', leave: 88,  forecast: 90  },
  { month: 'Sep', leave: 92,  forecast: 95  },
  { month: 'Oct', leave: null, forecast: 195 }, // Dashain spike forecast
  { month: 'Nov', leave: null, forecast: 168 },
  { month: 'Dec', leave: null, forecast: 105 },
]

const pendingLeaves = [
  { name: 'Bikram Rai',     dept: 'IT',      type: 'Annual',  from: 'Jun 10', to: 'Jun 14', days: 5, pending: '3 days' },
  { name: 'Sunita KC',      dept: 'Finance', type: 'Sick',    from: 'Jun 5',  to: 'Jun 7',  days: 3, pending: '1 day'  },
  { name: 'Rajan Shrestha', dept: 'Sales',   type: 'Annual',  from: 'Jun 20', to: 'Jun 25', days: 6, pending: '5 days' },
  { name: 'Mina Tamang',    dept: 'Ops',     type: 'Paternity',from:'Jun 8',  to: 'Jun 22', days: 15,pending: '2 days' },
  { name: 'Nabin Gurung',   dept: 'IT',      type: 'Comp',    from: 'Jun 12', to: 'Jun 12', days: 1, pending: '4 days' },
]

const leaveTypeDistribution = [
  { name: 'Annual',    value: 45, color: '#3b82f6' },
  { name: 'Sick',      value: 30, color: '#8b5cf6' },
  { name: 'Maternity', value: 15, color: '#10b981' },
  { name: 'Paternity', value: 10, color: '#f59e0b' },
]

const typeColor = {
  Annual:    'blue',
  Sick:      'purple',
  Maternity: 'green',
  Paternity: 'yellow',
  Comp:      'cyan',
}

// ── Calendar Heatmap ─────────────────────────────────────────
function LeaveCalendarHeatmap({ month = 'June 2026' }) {
  const highDays = [5, 15, 20, 25, 27, 28]
  const medDays  = [8, 9, 10, 11, 12]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
      {apiLoading && (
        <div style={{textAlign:'center',padding:40,color:'#7c3aed',fontSize:13,fontWeight:600}}>
          <div style={{fontSize:32,marginBottom:8}}>⟳</div>Loading...
        </div>
      )}
      {apiError && !apiLoading && (
        <div style={{padding:'8px 14px',background:'#fef2f2',border:'1px solid #fecaca',
          borderRadius:8,fontSize:12,color:'#dc2626',marginBottom:8,fontWeight:600}}>
          ⚠️ {apiError}
        </div>
      )}
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium pb-1">{d}</div>
        ))}
      </div>
      {/* First row — June 2026 starts on Monday, so 2 empty cells */}
      <div className="grid grid-cols-7 gap-1">
        <div />
        {Array.from({ length: 30 }, (_, i) => {
          const day = i + 1
          const isHigh = highDays.includes(day)
          const isMed  = medDays.includes(day)
          const isToday = day === 4
          let bg    = '#f8fafc'
          let tc    = '#94a3b8'
          if (isHigh) { bg = '#ef4444'; tc = '#fff' }
          else if (isMed) { bg = '#f59e0b'; tc = '#fff' }
          else if (isToday) { bg = '#3b82f6'; tc = '#fff' }

          return (
            <div
              key={i}
              title={`June ${day} — ${isHigh ? 'High leave' : isMed ? 'Medium leave' : 'Normal'}`}
              style={{ height: 28, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: tc, fontWeight: isToday ? 800 : 500, cursor: 'pointer', transition: 'transform .1s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex gap-4 mt-3 justify-center">
        <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded" style={{ background: '#3b82f6', display: 'inline-block' }}></span>Today</span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded" style={{ background: '#f59e0b', display: 'inline-block' }}></span>Medium leave</span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded" style={{ background: '#ef4444', display: 'inline-block' }}></span>High leave</span>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}}
}
function _getTenantCtx() {
  const s=_getSession()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug)}
}

export default function LeaveSnapshot() {
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const { t, cc } = useApp()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(()=>{
    const {token,slug,valid} = _getTenantCtx()
    if(!valid){setApiLoading(false);return}
    setApiLoading(true);setApiError(null)
    fetch('/api/v1/leave/snapshot',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>{const p=d.snapshot||d.data||d;if(p)setApiData(p)})
      .catch(err=>setApiError(err.message))
      .finally(()=>setApiLoading(false))
  },[])

  return (
    <div>
      <PageTitle
        title="Leave Snapshot"
        sub="Accrued vs. used time-off, Nepal Labour Act entitlements, peak periods & pending manager approvals."
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="📅" label="Total On Leave Today" value="163"      change="13% of staff"    up={false} accent="#f59e0b" />
        <StatCard icon="⏳" label="Pending Approvals"    value="12"       change="Oldest: 3 days"  up={false} accent="#ef4444" />
        <StatCard icon="💰" label="Leave Encashment"     value={`${cc.symbol}480k`} change="24 employees" up accent="#10b981" />
        <StatCard icon="📊" label="Leave Utilization"    value="67%"      change="of annual quota" up accent="#3b82f6" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'overview',    label: '📊 Overview'    },
          { id: 'entitlements',label: '📋 Entitlements'},
          { id: 'calendar',    label: '📅 Calendar'    },
          { id: 'pending',     label: '⏳ Pending'     },
          { id: 'forecast',    label: '🔮 Forecast'    },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border-none cursor-pointer
              ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card title="Leave Type Distribution" subtitle="Nepal Labour Act entitlements vs used this month">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={[
                  { type: 'Annual', entitled: 20, used: 12 },
                  { type: 'Sick',   entitled: 12, used: 4  },
                  { type: 'Mat.',   entitled: 98, used: 0  },
                  { type: 'Pat.',   entitled: 15, used: 5  },
                  { type: 'Comp.',  entitled: 5,  used: 3  },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entitled" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Entitled (days)" />
                  <Bar dataKey="used"     fill="#3b82f6" radius={[4, 4, 0, 0]} name="Used (days)"     />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Leave Distribution — Current Month">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={leaveTypeDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value">
                    {leaveTypeDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 mt-2">
                {leaveTypeDistribution.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-none">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color, display: 'inline-block' }} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{d.value}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Dept Breakdown */}
          <Card title="Department-wise Leave Breakdown" subtitle="Leave taken by type per department — current month">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={leaveByDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="annual"    stackId="a" fill="#3b82f6" name="Annual"    />
                <Bar dataKey="sick"      stackId="a" fill="#8b5cf6" name="Sick"      />
                <Bar dataKey="maternity" stackId="a" fill="#10b981" name="Maternity" />
                <Bar dataKey="paternity" stackId="a" fill="#f59e0b" name="Paternity" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── ENTITLEMENTS ── */}
      {activeTab === 'entitlements' && (
        <Card title="Nepal Labour Act 2017 — Leave Entitlements" subtitle="Legal leave rights for all employees — compliant tracking">
          {leaveEntitlements.map((l, i) => (
            <div key={i} className="py-4 border-b border-gray-50 last:border-none">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-bold text-gray-800">{l.type}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{l.law}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    <span className="font-bold text-gray-800">{l.used}</span> used · <span className="font-bold" style={{ color: l.color }}>{l.remaining}</span> remaining
                  </div>
                  <div className="text-xs text-gray-400">of {l.entitled} days entitled</div>
                </div>
              </div>
              <ProgressBar value={(l.used / l.entitled) * 100} color={l.color} />
            </div>
          ))}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="text-xs font-bold text-blue-700 mb-1">🔒 Confidentiality Notice</div>
            <div className="text-xs text-blue-600">All leave data is encrypted and accessible only to authorized HR personnel and the employee themselves. Nepal Right to Privacy Act 2018 compliant.</div>
          </div>
        </Card>
      )}

      {/* ── CALENDAR ── */}
      {activeTab === 'calendar' && (
        <div>
          <Card title="Leave Calendar — June 2026" subtitle="Click any date to see who is on leave. High dates = team coverage risk.">
            <LeaveCalendarHeatmap />
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card title="High Leave Days This Month" subtitle="Dates requiring coverage planning">
              {[
                { date: 'Jun 5',  count: 22, reason: 'Multiple annual leaves approved'   },
                { date: 'Jun 15', count: 18, reason: 'Post-payday long weekend'           },
                { date: 'Jun 20', count: 31, reason: 'Pre-town-hall leave requests'       },
                { date: 'Jun 25', count: 19, reason: 'Month-end approvals pending'        },
              ].map((d, i) => (
                <div key={i} className="flex justify-between py-2.5 border-b border-gray-50 last:border-none">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{d.date}</div>
                    <div className="text-xs text-gray-400">{d.reason}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-600">{d.count} absent</div>
                    <Pill color={d.count > 25 ? 'red' : 'yellow'}>
                      {d.count > 25 ? 'High Risk' : 'Moderate'}
                    </Pill>
                  </div>
                </div>
              ))}
            </Card>

            <Card title="Nepal Compliance Checklist">
              {[
                { label: 'Annual leave approval within 7 days',  status: 'green',  value: '100%'     },
                { label: 'Maternity leave notification given',   status: 'green',  value: 'OK'       },
                { label: 'Paternity leave processed',            status: 'green',  value: 'OK'       },
                { label: 'Leave without pay documented',         status: 'green',  value: 'Recorded' },
                { label: 'Festival leave (Dashain) planned',     status: 'yellow', value: 'Oct plan needed' },
                { label: 'Leave encashment calculated',          status: 'green',  value: `${cc.symbol}480k` },
              ].map((c, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-none text-xs">
                  <span className="text-gray-600">{c.label}</span>
                  <Pill color={c.status}>{c.value}</Pill>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── PENDING ── */}
      {activeTab === 'pending' && (
        <Card title="Pending Leave Approvals" subtitle="12 requests awaiting manager action — oldest is 3 days pending">
          <div className="flex items-center justify-between mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-xs text-amber-800 font-semibold">⚠️ SLA Warning: 3 requests pending beyond 48-hour approval policy</div>
            <button className="px-3 py-1 bg-amber-600 text-white text-xs rounded-lg cursor-pointer hover:bg-amber-700 transition-colors border-none">
              Approve All
            </button>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {['Employee', 'Department', 'Type', 'Period', 'Days', 'Pending', 'Action'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingLeaves.map((l, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {l.name[0]}
                      </div>
                      <span className="text-xs font-semibold text-gray-800">{l.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-gray-500">{l.dept}</td>
                  <td className="py-3"><Pill color={typeColor[l.type] || 'gray'}>{l.type}</Pill></td>
                  <td className="py-3 text-xs text-gray-500">{l.from} – {l.to}</td>
                  <td className="py-3 text-xs font-bold text-gray-800">{l.days}d</td>
                  <td className="py-3">
                    <Pill color={parseInt(l.pending) > 3 ? 'red' : 'yellow'}>{l.pending}</Pill>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1.5">
                      <button className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded cursor-pointer hover:bg-green-200 transition-colors border-none font-semibold">✓</button>
                      <button className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded cursor-pointer hover:bg-red-200 transition-colors border-none font-semibold">✗</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── FORECAST ── */}
      {activeTab === 'forecast' && (
        <div>
          <Card title="12-Month Leave Forecast" subtitle="AI-predicted leave pattern — Dashain/Tihar spike in Oct–Nov (Nepal festival season)">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyLeaveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="leave"    stroke="#3b82f6" strokeWidth={2.5} name="Actual"   dot={{ r: 4 }} connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={2}   name="Forecast" strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 bg-violet-50 border border-violet-100 rounded-lg text-xs text-violet-700">
              🧠 <strong>AI Prediction:</strong> October will see a 23% spike in leave requests due to Dashain festival (Oct 2–12, 2026). Plan coverage and approve leave freeze for critical roles 2 weeks prior.
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

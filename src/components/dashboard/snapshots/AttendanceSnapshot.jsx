// ============================================================
// FILE: src/components/dashboard/snapshots/AttendanceSnapshot.jsx
// PURPOSE: Real-time attendance — GPS, biometric, tardiness,
//          absenteeism, remote vs on-site, Nepal Labour Act
// ============================================================

import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts'
import { useApp } from '../../../context/AppContext.jsx'
import { StatCard }    from '../../shared/StatCard.jsx'
import { Card }        from '../../shared/Card.jsx'
import { Pill }        from '../../shared/Pill.jsx'
import { ProgressBar } from '../../shared/ProgressBar.jsx'
import { PageTitle }   from '../../shared/PageTitle.jsx'

// ── Mock Data ───────────────────────────────────────────────
const monthlyAttendance = [
  { month: 'Jan', present: 1100, leave: 80,  absent: 20, wfh: 180 },
  { month: 'Feb', present: 1080, leave: 90,  absent: 30, wfh: 200 },
  { month: 'Mar', present: 1150, leave: 70,  absent: 30, wfh: 210 },
  { month: 'Apr', present: 1090, leave: 85,  absent: 25, wfh: 190 },
  { month: 'May', present: 1087, leave: 163, absent: 0,  wfh: 218 },
  { month: 'Jun', present: 1120, leave: 110, absent: 20, wfh: 205 },
]

const todayDistribution = [
  { name: 'In-Office', value: 869, color: '#3b82f6' },
  { name: 'WFH',       value: 218, color: '#10b981' },
  { name: 'On Leave',  value: 163, color: '#f59e0b' },
]

const departmentAttendance = [
  { dept: 'IT',         present: 298, total: 320, pct: 93.1 },
  { dept: 'HR',         present: 162, total: 180, pct: 90.0 },
  { dept: 'Finance',    present: 185, total: 210, pct: 88.1 },
  { dept: 'Operations', present: 241, total: 280, pct: 86.1 },
  { dept: 'Sales',      present: 201, total: 260, pct: 77.3 },
]

const weeklyTrend = [
  { day: 'Mon', present: 1102, late: 24 },
  { day: 'Tue', present: 1089, late: 18 },
  { day: 'Wed', present: 1095, late: 21 },
  { day: 'Thu', present: 1087, late: 31 },
  { day: 'Fri', present: 1063, late: 42 },
]

const liveAttendance = [
  { name: 'Ram Bahadur Thapa',  dept: 'IT',      in: '09:02', type: 'Biometric', status: 'Present'  },
  { name: 'Sita Sharma',        dept: 'HR',      in: '08:58', type: 'Web',       status: 'Present'  },
  { name: 'Hari Prasad KC',     dept: 'Finance', in: '09:15', type: 'GPS',       status: 'Late'     },
  { name: 'Gita Rai',           dept: 'Ops',     in: '--',    type: 'WFH',       status: 'WFH'      },
  { name: 'Bikram Limbu',       dept: 'Sales',   in: '--',    type: '--',        status: 'Absent'   },
  { name: 'Anita Gurung',       dept: 'HR',      in: '08:45', type: 'Biometric', status: 'Present'  },
  { name: 'Suresh Bista',       dept: 'Finance', in: '09:30', type: 'Web',       status: 'Late'     },
  { name: 'Priya Thapa',        dept: 'Sales',   in: '--',    type: 'GPS',       status: 'Field'    },
]

const statusColor = {
  Present: 'green',
  Late:    'yellow',
  WFH:     'blue',
  Absent:  'red',
  Field:   'cyan',
}

const OVERTIME_LABEL_MAP = {
  allowed:  { label: 'OT allowed',  color: '#10b981' },
  exceeded: { label: 'OT exceeded', color: '#ef4444' },
  none:     { label: 'No OT',       color: '#94a3b8' },
}

export default function AttendanceSnapshot() {
  const { t } = useApp()
  const [view, setView] = useState('overview') // 'overview' | 'live' | 'department'

  return (
    <div>
      <PageTitle
        title="Attendance Snapshot"
        sub="Real-time attendance analytics — GPS, biometric, tardiness, absenteeism & remote vs on-site ratio."
        badge="🟢 Live"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="✅" label="Present Today"       value="1,087"  change="86.9% rate"      up accent="#10b981" />
        <StatCard icon="🏠" label="Work From Home"      value="218"    change="17.4% of staff"  up accent="#3b82f6" />
        <StatCard icon="❌" label="Absent (Unexcused)"  value="24"     change="Needs attention"  up={false} accent="#ef4444" />
        <StatCard icon="⏰" label="Late Arrivals"       value="31"     change="2.5% tardiness"  up={false} accent="#f59e0b" />
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'overview',   label: '📊 Overview'    },
          { id: 'live',       label: '🟢 Live Feed'   },
          { id: 'department', label: '🏢 By Department' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border-none cursor-pointer
              ${view === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {view === 'overview' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Monthly Stacked Bar */}
            <div className="lg:col-span-2">
              <Card title="Monthly Attendance Trend" subtitle="Present, leave, absent — stacked view">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" stackId="a" fill="#3b82f6" name="Present" />
                    <Bar dataKey="wfh"     stackId="a" fill="#10b981" name="WFH" />
                    <Bar dataKey="leave"   stackId="a" fill="#f59e0b" name="Leave" />
                    <Bar dataKey="absent"  stackId="a" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Today's Donut */}
            <div className="flex flex-col gap-4">
              <Card title="Today's Distribution" subtitle="Real-time workforce location">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={todayDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value">
                      {todayDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                {todayDistribution.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: d.color }} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </Card>

              {/* Nepal Compliance */}
              <Card title="Nepal Compliance" subtitle="Labour Act 2017">
                <div className="flex justify-between py-2 border-b border-gray-50 text-xs">
                  <span className="text-gray-600">8hr/day · 48hr/week max</span>
                  <Pill color="green">Compliant</Pill>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50 text-xs">
                  <span className="text-gray-600">30-min break tracked</span>
                  <Pill color="green">Enabled</Pill>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50 text-xs">
                  <span className="text-gray-600">OT ≤ 24hrs/week @ 1.5x</span>
                  <Pill color="yellow">3 cases</Pill>
                </div>
                <div className="flex justify-between py-2 text-xs">
                  <span className="text-gray-600">Salary via banking (Rule 21)</span>
                  <Pill color="green">OK</Pill>
                </div>
              </Card>
            </div>
          </div>

          {/* Weekly Trend */}
          <Card title="This Week — Daily Attendance Trend" subtitle="Present employees and late arrivals per day">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="present" stroke="#3b82f6" fill="url(#gPresent)" strokeWidth={2} name="Present" />
                <Area type="monotone" dataKey="late" stroke="#f59e0b" fill="none" strokeWidth={2} name="Late Arrivals" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── LIVE FEED ── */}
      {view === 'live' && (
        <Card title="🟢 Live Attendance Feed" subtitle="Real-time employee check-in data — updates every 60 seconds">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              {['All', 'Present', 'Late', 'WFH', 'Absent'].map(f => (
                <button key={f} className="px-3 py-1 rounded-full text-xs border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 cursor-pointer transition-colors">
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"></span>
              Live — Last updated: just now
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {['Employee', 'Department', 'Check-In', 'Method', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liveAttendance.map((emp, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: `hsl(${i * 40}, 60%, 50%)` }}
                      >
                        {emp.name[0]}
                      </div>
                      <span className="text-xs font-semibold text-gray-800">{emp.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-xs text-gray-500">{emp.dept}</td>
                  <td className="py-2.5 text-xs text-gray-700 font-mono">{emp.in}</td>
                  <td className="py-2.5">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{emp.type}</span>
                  </td>
                  <td className="py-2.5">
                    <Pill color={statusColor[emp.status] || 'gray'}>{emp.status}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── DEPARTMENT VIEW ── */}
      {view === 'department' && (
        <div>
          <Card title="Department-wise Attendance" subtitle="Today's attendance rate by department">
            <div className="space-y-4">
              {departmentAttendance.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 w-20">{d.dept}</span>
                      <span className="text-gray-400">{d.present} / {d.total} present</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{d.pct}%</span>
                      <Pill color={d.pct >= 90 ? 'green' : d.pct >= 80 ? 'yellow' : 'red'}>
                        {d.pct >= 90 ? 'Excellent' : d.pct >= 80 ? 'Good' : 'Low'}
                      </Pill>
                    </div>
                  </div>
                  <ProgressBar value={d.pct} color={d.pct >= 90 ? '#10b981' : d.pct >= 80 ? '#f59e0b' : '#ef4444'} />
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card title="Department Bar Chart" subtitle="Visual attendance comparison">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={departmentAttendance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <YAxis dataKey="dept" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={v => [`${v}%`, 'Attendance']} />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]} name="Attendance %">
                    {departmentAttendance.map((d, i) => (
                      <Cell key={i} fill={d.pct >= 90 ? '#10b981' : d.pct >= 80 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Attendance Alerts" subtitle="Departments needing attention">
              {departmentAttendance.filter(d => d.pct < 88).map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-none">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{d.dept} Department</div>
                    <div className="text-xs text-gray-400">Attendance: {d.pct}% — {d.total - d.present} absent</div>
                  </div>
                  <Pill color={d.pct < 80 ? 'red' : 'yellow'}>
                    {d.pct < 80 ? 'Critical' : 'Review'}
                  </Pill>
                </div>
              ))}
              {departmentAttendance.filter(d => d.pct < 88).length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">✅ All departments above threshold</div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

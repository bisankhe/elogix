// ============================================================
// FILE: src/components/dashboard/ExecutiveDashboard.jsx
// PURPOSE: Executive Dashboard — strategic BI, headcount,
//          labor cost, OKR, attrition risk, diversity metrics,
//          daily tasks, things to do
// ============================================================

import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useApp }        from '../../context/AppContext.jsx'
import { StatCard }      from '../shared/StatCard.jsx'
import { Card }          from '../shared/Card.jsx'
import { Pill }          from '../shared/Pill.jsx'
import { ProgressBar }   from '../shared/ProgressBar.jsx'
import { TaskItem }      from '../shared/TaskItem.jsx'
import { PageTitle }     from '../shared/PageTitle.jsx'
import { AIInsightCard } from '../shared/AIInsightCard.jsx'

// ── Mock Data ────────────────────────────────────────────────
const payrollVsBudget = [
  { month: 'Jan', actual: 3800000, budget: 4000000 },
  { month: 'Feb', actual: 3900000, budget: 4000000 },
  { month: 'Mar', actual: 4000000, budget: 4100000 },
  { month: 'Apr', actual: 4100000, budget: 4100000 },
  { month: 'May', actual: 4200000, budget: 4200000 },
  { month: 'Jun', actual: 4350000, budget: 4200000 },
]

const attritionRisk = [
  { name: 'Low Risk',    value: 62, color: '#10b981' },
  { name: 'Medium Risk', value: 28, color: '#f59e0b' },
  { name: 'High Risk',   value: 10, color: '#ef4444' },
]

const deptHeadcount = [
  { dept: 'IT',         value: 320, color: '#3b82f6', last: 298 },
  { dept: 'Operations', value: 280, color: '#f59e0b', last: 265 },
  { dept: 'Sales',      value: 260, color: '#ef4444', last: 245 },
  { dept: 'Finance',    value: 210, color: '#10b981', last: 205 },
  { dept: 'HR',         value: 180, color: '#8b5cf6', last: 175 },
]

const okrProgress = [
  { objective: 'Revenue Growth 20%',         q1: 55, q2: 74, target: 100 },
  { objective: 'Employee Satisfaction',       q1: 76, q2: 82, target: 100 },
  { objective: 'Product Releases',            q1: 70, q2: 88, target: 100 },
  { objective: 'Hiring Plan',                 q1: 40, q2: 55, target: 100 },
  { objective: 'Training Completion',         q1: 48, q2: 67, target: 100 },
  { objective: 'Customer NPS',                q1: 52, q2: 61, target: 100 },
]

const genderData = [
  { name: 'Male',   value: 56, color: '#3b82f6' },
  { name: 'Female', value: 42, color: '#ec4899' },
  { name: 'Other',  value: 2,  color: '#10b981' },
]

const headcountTrend = [
  { month: 'Jan', headcount: 1185, target: 1200 },
  { month: 'Feb', headcount: 1198, target: 1210 },
  { month: 'Mar', headcount: 1215, target: 1220 },
  { month: 'Apr', headcount: 1228, target: 1230 },
  { month: 'May', headcount: 1238, target: 1240 },
  { month: 'Jun', headcount: 1250, target: 1260 },
]

const tasksByDept = [
  { id: 1, task: 'Review IT department OKR progress',          priority: 'high',   done: false, dept: 'IT',      role: 'Executive' },
  { id: 2, task: 'Approve Q2 payroll budget variance',          priority: 'high',   done: false, dept: 'Finance', role: 'Executive' },
  { id: 3, task: 'Board meeting preparation — Jun 15',          priority: 'high',   done: false, dept: 'All',     role: 'Executive' },
  { id: 4, task: 'Review Sales team performance Q2',            priority: 'medium', done: true,  dept: 'Sales',   role: 'Executive' },
  { id: 5, task: 'Sign off on 3 senior hire offers',            priority: 'medium', done: false, dept: 'HR',      role: 'Executive' },
  { id: 6, task: 'Annual strategy review with department heads', priority: 'medium', done: false, dept: 'All',     role: 'Executive' },
  { id: 7, task: 'Review Q3 workforce planning projections',    priority: 'low',    done: false, dept: 'HR',      role: 'Executive' },
]

const biMetrics = [
  { metric: 'Revenue per Employee',     value: 'Rs 280K', change: '+12%',   up: true  },
  { metric: 'Cost per Employee',        value: 'Rs 3.4K', change: '+2.1%',  up: false },
  { metric: 'Training ROI',            value: '3.2x',    change: '+0.4x',  up: true  },
  { metric: 'HR to Employee Ratio',    value: '1:14.4',  change: 'Optimal',up: true  },
  { metric: 'Voluntary Turnover',      value: '6.8%',    change: '-1.4%',  up: true  },
  { metric: 'Involuntary Turnover',    value: '1.4%',    change: 'Stable', up: true  },
  { metric: 'Internal Hire Rate',      value: '33%',     change: '+5%',    up: true  },
  { metric: 'Benefits Cost per EE',    value: 'Rs 248',  change: '+3.2%',  up: false },
]

const aiInsights = [
  { color: '#ef4444', label: 'Attrition Alert',      text: '14 employees in IT show disengagement signals. Predicted exit within 60 days. Recommend compensation review.' },
  { color: '#f59e0b', label: 'Cost Overrun Risk',    text: 'Jun payroll projected Rs 4.35M — Rs 150K above budget. Finance OT driving overage. Review staffing plan.' },
  { color: '#10b981', label: 'OKR on Track',         text: 'Product Releases (88%) and Employee Satisfaction (82%) are exceeding targets. Maintain current momentum.' },
  { color: '#3b82f6', label: 'Q3 Hiring Forecast',   text: 'Based on growth trajectory, 28–35 new hires needed in Q3 2026: IT (12), Sales (8), Operations (15).' },
]

export default function ExecutiveDashboard() {
  const { t, cc } = useApp()
  const [tasks, setTasks] = useState(tasksByDept)
  const [activeTab, setActiveTab] = useState('overview')
  const toggleTask = (id) => setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk))

  const fmt = (val, compact = true) => {
    if (compact) {
      if (val >= 1000000) return `${cc.symbol}${(val / 1000000).toFixed(1)}M`
      if (val >= 1000)    return `${cc.symbol}${(val / 1000).toFixed(0)}K`
    }
    return `${cc.symbol}${val.toLocaleString()}`
  }

  const completedTasks = tasks.filter(t => t.done).length

  return (
    <div>
      <PageTitle
        title="Executive Dashboard"
        sub="Strategic workforce intelligence — headcount, BI, OKR, attrition risk, diversity & business performance."
        badge="C-Suite"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="👥" label="Total Headcount"         value="1,250"      change="+12 vs last month"   up  accent="#3b82f6" />
        <StatCard icon="💰" label={`Labor Cost (${cc.code})`} value={fmt(4200000)} change="+2.1% this month" up  accent="#10b981" />
        <StatCard icon="📉" label="Turnover Rate"           value="8.2%"       change="Industry avg 12%"    up  accent="#ef4444" />
        <StatCard icon="🎯" label="OKR Completion (Avg)"    value="74%"        change="Q2 on track"         up  accent="#f59e0b" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'overview',  label: '📊 Overview'   },
          { id: 'okr',       label: '🎯 OKR'        },
          { id: 'bi',        label: '📈 BI'          },
          { id: 'diversity', label: '👥 Diversity'  },
          { id: 'tasks',     label: `✅ Tasks (${completedTasks}/${tasks.length})` },
          { id: 'ai',        label: '🧠 AI Insights' },
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <Card title={`Payroll vs. Budget — ${cc.code}`} subtitle="Actual spend vs approved budget — Jun over budget by Rs 150K">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={payrollVsBudget}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={v => [`${cc.symbol}${(v / 1000000).toFixed(2)}M`]} />
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2.5} name="Actual"  dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="budget" stroke="#f59e0b" strokeWidth={2}   name="Budget"  strokeDasharray="5 5" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <Card title="AI Attrition Risk" subtitle="ML-predicted flight risk">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={attritionRisk} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value">
                    {attritionRisk.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                </PieChart>
              </ResponsiveContainer>
              {attritionRisk.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                    <span style={{ color: '#475569' }}>{d.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{d.value}%</span>
                </div>
              ))}
            </Card>
          </div>

          {/* Headcount Trend + Dept */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Headcount Trend — YTD" subtitle="Actual vs hiring target">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={headcountTrend}>
                  <defs>
                    <linearGradient id="gHC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[1150, 1300]} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="headcount" stroke="#3b82f6" fill="url(#gHC)" strokeWidth={2.5} name="Headcount" />
                  <Area type="monotone" dataKey="target"    stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 4" name="Target" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Department Headcount" subtitle="Current vs last month">
              {deptHeadcount.map((d, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                      <span style={{ color: '#475569', fontWeight: 500 }}>{d.dept}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{d.value}</span>
                      <span style={{ fontSize: 10, color: d.value > d.last ? '#10b981' : '#94a3b8' }}>
                        {d.value > d.last ? `+${d.value - d.last}` : '—'}
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={(d.value / 320) * 100} color={d.color} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── OKR ── */}
      {activeTab === 'okr' && (
        <div>
          <Card title="OKR Progress — Q1 vs Q2 2026" subtitle="Company-wide objectives and key results comparison">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={okrProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="objective" tick={{ fontSize: 9 }} angle={-12} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip formatter={v => [`${v}%`]} />
                <Legend />
                <Bar dataKey="q1"     fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Q1 Progress %" />
                <Bar dataKey="q2"     fill="#3b82f6" radius={[4, 4, 0, 0]} name="Q2 Progress %" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="mt-4">
            <Card title="OKR Detail Cards" subtitle="Current status and progress">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {okrProgress.map((o, i) => {
                  const status = o.q2 >= 85 ? { label: 'On Track', color: 'green' } : o.q2 >= 65 ? { label: 'Monitor', color: 'yellow' } : { label: 'Behind', color: 'red' }
                  return (
                    <div key={i} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', flex: 1, paddingRight: 8 }}>{o.objective}</div>
                        <Pill color={status.color}>{status.label}</Pill>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                        <span>Q1: {o.q1}%</span>
                        <span>Q2: {o.q2}%</span>
                        <span style={{ color: o.q2 > o.q1 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                          {o.q2 > o.q1 ? `+${o.q2 - o.q1}%` : `${o.q2 - o.q1}%`}
                        </span>
                      </div>
                      <ProgressBar value={o.q2} color={o.q2 >= 85 ? '#10b981' : o.q2 >= 65 ? '#f59e0b' : '#ef4444'} />
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── BI ── */}
      {activeTab === 'bi' && (
        <Card title="Business Intelligence — Key HR Metrics" subtitle="Strategic KPIs for executive review">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {biMetrics.map((m, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${m.up ? '#10b981' : '#ef4444'}` }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: m.up ? '#10b981' : '#ef4444' }}>{m.value}</div>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginTop: 2 }}>{m.metric}</div>
                <div style={{ fontSize: 10, color: m.up ? '#10b981' : '#ef4444', marginTop: 2, fontWeight: 700 }}>
                  {m.up ? '▲' : '▼'} {m.change}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── DIVERSITY ── */}
      {activeTab === 'diversity' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Gender Diversity" subtitle="Workforce gender composition — 1,250 employees">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                    {genderData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                {genderData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: d.color, display: 'inline-block' }} />
                    <span style={{ color: '#475569' }}>{d.name}: <strong>{d.value}%</strong></span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Diversity Metrics Summary">
              {[
                { label: 'Female in leadership (G5+)',   value: '38%',  change: '+5% YoY', up: true  },
                { label: 'Female in technical roles',    value: '31%',  change: '+3% YoY', up: true  },
                { label: 'Diverse hires Q2 2026',        value: '42%',  change: 'Target: 45%', up: false },
                { label: 'Age diversity (under 30)',      value: '34%',  change: 'Balanced', up: true  },
                { label: 'Age diversity (30–45)',         value: '51%',  change: 'Core group', up: true },
                { label: 'Age diversity (45+)',           value: '15%',  change: '+2% YoY', up: true  },
                { label: 'Foreign workers',               value: '2.1%', change: 'Max 5%',  up: true  },
                { label: 'DEI training completion',       value: '78%',  change: 'Q3 target: 90%', up: false },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                  <span style={{ color: '#475569' }}>{m.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{m.value}</span>
                    <span style={{ fontSize: 10, color: m.up ? '#10b981' : '#f59e0b' }}>{m.change}</span>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── TASKS ── */}
      {activeTab === 'tasks' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 16px', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#3b82f6' }}>{tasks.length}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Total Tasks</div>
            </div>
            <div style={{ flex: 1, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 16px', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>{completedTasks}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Completed</div>
            </div>
            <div style={{ flex: 1, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 16px', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444' }}>{tasks.filter(t => !t.done && t.priority === 'high').length}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>High Priority</div>
            </div>
            <div style={{ flex: 1, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 16px', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b' }}>{Math.round((completedTasks / tasks.length) * 100)}%</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Completion Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="🔴 High Priority Tasks" subtitle="Immediate action required">
              {tasks.filter(t => t.priority === 'high').map(tk => (
                <TaskItem key={tk.id} {...tk} onToggle={() => toggleTask(tk.id)} />
              ))}
            </Card>
            <Card title="🟡 Medium & Low Priority" subtitle="This week agenda">
              {tasks.filter(t => t.priority !== 'high').map(tk => (
                <TaskItem key={tk.id} {...tk} onToggle={() => toggleTask(tk.id)} />
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── AI ── */}
      {activeTab === 'ai' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AIInsightCard insights={aiInsights.slice(0, 2)} title="⚠️ Risk Alerts" />
            <AIInsightCard insights={aiInsights.slice(2, 4)} title="📈 Opportunities" />
          </div>
        </div>
      )}
    </div>
  )
}

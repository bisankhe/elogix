// ============================================================
// FILE: src/components/dashboard/snapshots/PayrollSnapshot.jsx
// PURPOSE: Payroll Snapshot — restricted HR Directors & Finance
//          Nepal Labour Act compliance, Rule 21 bank transfer,
//          PF/Gratuity, OT calculation, salary structure
// ============================================================

import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useApp }      from '../../../context/AppContext.jsx'
import { StatCard }    from '../../shared/StatCard.jsx'
import { Card }        from '../../shared/Card.jsx'
import { Pill }        from '../../shared/Pill.jsx'
import { ProgressBar } from '../../shared/ProgressBar.jsx'
import { PageTitle }   from '../../shared/PageTitle.jsx'

// ── Mock Data ────────────────────────────────────────────────
const payrollTrend = [
  { month: 'Jan', amount: 3800000, budget: 4000000, ot: 240000 },
  { month: 'Feb', amount: 3900000, budget: 4000000, ot: 260000 },
  { month: 'Mar', amount: 4000000, budget: 4100000, ot: 280000 },
  { month: 'Apr', amount: 4100000, budget: 4100000, ot: 270000 },
  { month: 'May', amount: 4200000, budget: 4200000, ot: 280000 },
  { month: 'Jun', amount: 4350000, budget: 4200000, ot: 310000 },
]

const salaryComposition = [
  { name: 'Basic Salary',  value: 65, color: '#3b82f6' },
  { name: 'Allowances',    value: 18, color: '#8b5cf6' },
  { name: 'Overtime',      value: 7,  color: '#f59e0b' },
  { name: 'Benefits',      value: 7,  color: '#10b981' },
  { name: 'Incentives',    value: 3,  color: '#06b6d4' },
]

const deductionData = [
  { name: 'PF (10%)',         value: 420000, color: '#3b82f6' },
  { name: 'Tax (PAYE)',       value: 185000, color: '#ef4444' },
  { name: 'Health Insurance', value: 62000,  color: '#10b981' },
  { name: 'Loan Deduction',   value: 45000,  color: '#f59e0b' },
]

const deptPayroll = [
  { dept: 'IT',         gross: 1680000, headcount: 320, avgSalary: 52500 },
  { dept: 'Finance',    gross: 1050000, headcount: 210, avgSalary: 50000 },
  { dept: 'Operations', gross: 980000,  headcount: 280, avgSalary: 35000 },
  { dept: 'Sales',      gross: 780000,  headcount: 260, avgSalary: 30000 },
  { dept: 'HR',         gross: 630000,  headcount: 180, avgSalary: 35000 },
]

const salaryBands = [
  { grade: 'G1 — Entry',       min: 25000,  max: 35000,  employees: 180 },
  { grade: 'G2 — Junior',      min: 35000,  max: 50000,  employees: 320 },
  { grade: 'G3 — Mid',         min: 50000,  max: 75000,  employees: 420 },
  { grade: 'G4 — Senior',      min: 75000,  max: 110000, employees: 210 },
  { grade: 'G5 — Lead',        min: 110000, max: 150000, employees: 80  },
  { grade: 'G6 — Manager',     min: 150000, max: 220000, employees: 30  },
  { grade: 'G7 — Director',    min: 220000, max: 350000, employees: 10  },
]

const pfSummary = [
  { label: 'Employee PF Contribution (10%)', amount: 420000  },
  { label: 'Employer PF Contribution (10%)', amount: 420000  },
  { label: 'Total PF This Month',            amount: 840000  },
  { label: 'Gratuity Provision (8.33%)',     amount: 349860  },
  { label: 'Total Statutory Deductions',     amount: 1189860 },
]

// ── Access Guard ─────────────────────────────────────────────
function PayrollAccessGuard({ persona, children }) {
  const allowed = ['super-admin', 'executive', 'hr']
  if (!allowed.includes(persona)) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
          Access Restricted
        </h3>
        <p style={{ color: '#64748b', fontSize: 13, maxWidth: 400, margin: '0 auto 20px' }}>
          Payroll data is confidential and restricted to HR Directors and Finance personnel only.
          Per Nepal Right to Privacy Act 2018 and company RBAC policy.
        </p>
        <Pill color="red">🔒 Payroll — Restricted Access</Pill>
      </div>
    )
  }
  return children
}

// ── Main Component ───────────────────────────────────────────
export default function PayrollSnapshot() {
  const { t, cc, persona } = useApp()
  const [activeTab, setActiveTab] = useState('overview')

  const fmt = (val, compact = true) => {
    if (compact) {
      if (val >= 1000000) return `${cc.symbol}${(val / 1000000).toFixed(1)}M`
      if (val >= 1000)    return `${cc.symbol}${(val / 1000).toFixed(0)}K`
    }
    return `${cc.symbol}${val.toLocaleString()}`
  }

  return (
    <div>
      <PageTitle
        title="Payroll Snapshot"
        sub="🔒 Restricted — HR Directors & Finance only. Total cost, OT, benefits, Nepal Rule 21 & PF compliance."
        badge="🔒 Restricted"
      />

      <PayrollAccessGuard persona={persona || 'hr'}>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard icon="💰" label={`Total Payroll (May)`} value={fmt(4200000)}   change="+2.1% MoM"      up  accent="#10b981" />
          <StatCard icon="⏰" label="Overtime Cost"          value={fmt(280000)}    change="6.7% of payroll" up={false} accent="#f59e0b" />
          <StatCard icon="🛡️" label="PF Contributions"      value={fmt(840000)}    change="10% employee+employer" up accent="#3b82f6" />
          <StatCard icon="🏦" label="Bank Transfer Status"   value="Initiated"      change="Rule 21 compliant" up accent="#8b5cf6" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
          {[
            { id: 'overview',   label: '📊 Overview'     },
            { id: 'structure',  label: '🏗️ Structure'    },
            { id: 'deductions', label: '📉 Deductions'   },
            { id: 'dept',       label: '🏢 By Dept'      },
            { id: 'compliance', label: '⚖️ Compliance'   },
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
              {/* Payroll vs Budget */}
              <div className="lg:col-span-2">
                <Card title={`Payroll Trend (YTD) — ${cc.code}`} subtitle="Actual payroll vs approved budget with overtime cost">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={payrollTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip formatter={v => [`${cc.symbol}${(v / 1000000).toFixed(2)}M`]} />
                      <Legend />
                      <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} name="Actual"   />
                      <Bar dataKey="budget" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Budget"   />
                      <Bar dataKey="ot"     fill="#f59e0b" radius={[4, 4, 0, 0]} name="Overtime" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Composition Donut */}
              <Card title="Payroll Composition" subtitle="May 2026 gross breakdown">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={salaryComposition} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value">
                      {salaryComposition.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                {salaryComposition.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: d.color }} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{d.value}%</span>
                  </div>
                ))}
              </Card>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Gross Payroll',      value: fmt(4200000), icon: '💰', color: '#10b981' },
                { label: 'Total Deductions',   value: fmt(712000),  icon: '📉', color: '#ef4444' },
                { label: 'Net Payroll',        value: fmt(3488000), icon: '🏦', color: '#3b82f6' },
                { label: 'Cost per Employee',  value: fmt(3360),    icon: '👤', color: '#8b5cf6' },
              ].map((m, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{m.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STRUCTURE ── */}
        {activeTab === 'structure' && (
          <div>
            <Card title="Salary Band Structure" subtitle={`Grade-wise salary bands in ${cc.code} — ${cc.symbol} per month`}>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Grade', 'Min Salary', 'Max Salary', 'Employees', 'Budget Share'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salaryBands.map((b, i) => {
                    const total = salaryBands.reduce((s, x) => s + x.employees, 0)
                    const pct = ((b.employees / total) * 100).toFixed(1)
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 text-xs font-semibold text-gray-800">{b.grade}</td>
                        <td className="py-3 text-xs text-gray-600 font-mono">{cc.symbol}{b.min.toLocaleString()}</td>
                        <td className="py-3 text-xs text-gray-600 font-mono">{cc.symbol}{b.max.toLocaleString()}</td>
                        <td className="py-3 text-xs font-bold text-gray-800">{b.employees}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div style={{ flex: 1 }}>
                              <ProgressBar value={parseFloat(pct)} color="#3b82f6" />
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-8">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <Card title="Band Distribution Chart" subtitle="Employees per grade">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={salaryBands.map(b => ({ grade: b.grade.split('—')[0].trim(), count: b.employees }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="grade" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Employees" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Minimum Wage Compliance" subtitle="Nepal Labour Act 2017">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
                  <div className="text-xs font-bold text-green-700">✅ All employees above minimum wage</div>
                  <div className="text-xs text-green-600 mt-1">Nepal minimum wage: {cc.symbol}15,000/month — All 1,250 employees are compliant</div>
                </div>
                {[
                  { label: 'Min wage threshold',          value: `${cc.symbol}15,000`,  ok: true  },
                  { label: 'Employees below threshold',   value: '0',                   ok: true  },
                  { label: 'Grade G1 minimum',            value: `${cc.symbol}25,000`,  ok: true  },
                  { label: 'OT rate (1.5x)',              value: 'Enforced',            ok: true  },
                  { label: 'Salary review date',          value: 'Jul 2026',            ok: true  },
                ].map((c, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-none text-xs">
                    <span className="text-gray-600">{c.label}</span>
                    <Pill color={c.ok ? 'green' : 'red'}>{c.value}</Pill>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ── DEDUCTIONS ── */}
        {activeTab === 'deductions' && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <Card title="Deduction Breakdown — May 2026" subtitle="Total deductions by category">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={deductionData} cx="50%" cy="50%" outerRadius={72} dataKey="value">
                      {deductionData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={v => [`${cc.symbol}${v.toLocaleString()}`]} />
                  </PieChart>
                </ResponsiveContainer>
                {deductionData.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: d.color }} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{cc.symbol}{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </Card>

              <Card title="PF & Statutory Summary" subtitle="Nepal provident fund contributions">
                {pfSummary.map((p, i) => (
                  <div key={i} className={`flex justify-between items-center py-2.5 border-b border-gray-50 last:border-none ${i === pfSummary.length - 1 ? 'font-bold' : ''}`}>
                    <span className="text-xs text-gray-700">{p.label}</span>
                    <span className="text-xs font-bold text-gray-900">{cc.symbol}{p.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="mt-3 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="text-xs text-blue-700">PF submitted to CEPF (Citizens Investment Trust) by 15th of next month as per Nepal law.</div>
                </div>
              </Card>
            </div>

            {/* Loan & Advance */}
            <Card title="Loan & Advance Deductions" subtitle="Active employee loans and salary advances">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Employee', 'Loan Type', 'Total Loan', 'Monthly EMI', 'Remaining', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Hari Prasad KC',  type: 'Festival Loan', total: 150000, emi: 12500, remaining: 8,  status: 'Active' },
                    { name: 'Gita Rai',        type: 'Advance Salary', total: 68000, emi: 68000, remaining: 1,  status: 'Last EMI' },
                    { name: 'Bikram Limbu',    type: 'Education Loan', total: 300000, emi: 25000, remaining: 10, status: 'Active' },
                  ].map((l, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2.5 text-xs font-semibold text-gray-800">{l.name}</td>
                      <td className="py-2.5 text-xs text-gray-500">{l.type}</td>
                      <td className="py-2.5 text-xs font-mono text-gray-700">{cc.symbol}{l.total.toLocaleString()}</td>
                      <td className="py-2.5 text-xs font-mono text-gray-700">{cc.symbol}{l.emi.toLocaleString()}</td>
                      <td className="py-2.5 text-xs text-gray-500">{l.remaining} months</td>
                      <td className="py-2.5"><Pill color={l.status === 'Last EMI' ? 'green' : 'blue'}>{l.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ── BY DEPT ── */}
        {activeTab === 'dept' && (
          <div>
            <Card title="Department-wise Payroll" subtitle="Gross payroll, headcount and average salary per department">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptPayroll}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={v => [`${cc.symbol}${(v / 1000000).toFixed(2)}M`]} />
                  <Bar dataKey="gross" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Gross Payroll" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="mt-4">
              <Card title="Department Payroll Summary Table">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Department', 'Headcount', 'Gross Payroll', 'Avg Salary', 'Share %'].map(h => (
                        <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deptPayroll.map((d, i) => {
                      const pct   = ((d.gross / total) * 100).toFixed(1)
                      return (
                        <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 text-xs font-bold text-gray-800">{d.dept}</td>
                          <td className="py-3 text-xs text-gray-600">{d.headcount}</td>
                          <td className="py-3 text-xs font-mono font-bold text-gray-800">{cc.symbol}{(d.gross / 1000000).toFixed(2)}M</td>
                          <td className="py-3 text-xs font-mono text-gray-600">{cc.symbol}{d.avgSalary.toLocaleString()}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <ProgressBar value={parseFloat(pct)} color="#3b82f6" />
                              <span className="text-xs font-bold text-gray-700 w-8">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {/* Total Row */}
                    <tr className="bg-gray-50">
                      <td className="py-3 text-xs font-black text-gray-900">TOTAL</td>
                      <td className="py-3 text-xs font-bold text-gray-900">1,250</td>
                      <td className="py-3 text-xs font-black text-gray-900 font-mono">{cc.symbol}5.12M</td>
                      <td className="py-3 text-xs font-bold text-gray-700 font-mono">{cc.symbol}40,960</td>
                      <td className="py-3 text-xs font-bold text-gray-900">100%</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        )}

        {/* ── COMPLIANCE ── */}
        {activeTab === 'compliance' && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Nepal Labour Act Payroll Compliance" subtitle="Rule 21 — Salary must be paid via approved banking channels">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <div className="text-xs font-bold text-green-700 mb-1">✅ Full Compliance Status — May 2026</div>
                  <div className="text-xs text-green-600">All 1,250 salaries processed via approved banking channels per Nepal Labour Rules 2018, Rule 21.</div>
                </div>
                {[
                  { label: 'Salary via banking (Rule 21)',   value: '100%',         ok: true  },
                  { label: 'Salary paid within 7th',         value: 'Jun 7, 2026',  ok: true  },
                  { label: 'Minimum wage compliance',         value: 'All staff',    ok: true  },
                  { label: 'OT rate 1.5x enforced',          value: 'Enforced',     ok: true  },
                  { label: 'OT ≤ 24 hrs/week',               value: '3 exceptions', ok: false },
                  { label: 'PF submitted to CEPF',            value: 'Jun 12, 2026', ok: true  },
                  { label: 'Gratuity provisioned (8.33%)',    value: `${cc.symbol}349,860`, ok: true },
                  { label: 'SSF (Social Security Fund)',      value: 'Enrolled',     ok: true  },
                  { label: 'Employee insurance',              value: 'Active',       ok: true  },
                  { label: 'Tax (PAYE) deducted',            value: 'IRD compliant',ok: true  },
                ].map((c, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-none text-xs">
                    <span className="text-gray-600">{c.label}</span>
                    <Pill color={c.ok ? 'green' : 'yellow'}>{c.value}</Pill>
                  </div>
                ))}
              </Card>

              <div className="space-y-4">
                <Card title="Bank Transfer File Status" subtitle="May 2026 payroll — bank files">
                  {[
                    { bank: 'Nepal SBI Bank',      accounts: 420, amount: 1764000, status: 'Sent'    },
                    { bank: 'NIC Asia Bank',       accounts: 310, amount: 1302000, status: 'Sent'    },
                    { bank: 'Global IME Bank',     accounts: 280, amount: 1176000, status: 'Sent'    },
                    { bank: 'Nabil Bank',          accounts: 240, amount: 1008000, status: 'Pending' },
                  ].map((b, i) => (
                    <div key={i} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-none">
                      <div>
                        <div className="text-xs font-bold text-gray-800">{b.bank}</div>
                        <div className="text-xs text-gray-400">{b.accounts} accounts · {cc.symbol}{(b.amount / 1000000).toFixed(2)}M</div>
                      </div>
                      <Pill color={b.status === 'Sent' ? 'green' : 'yellow'}>{b.status}</Pill>
                    </div>
                  ))}
                </Card>

                <Card title="Payroll Calendar — June 2026">
                  {[
                    { date: 'Jun 1',  task: 'Payroll attendance freeze',        done: true  },
                    { date: 'Jun 3',  task: 'Salary processing begins',         done: true  },
                    { date: 'Jun 5',  task: 'Payroll approval — HR Director',   done: false },
                    { date: 'Jun 7',  task: 'Bank transfer file submission',     done: false },
                    { date: 'Jun 10', task: 'Salary credited to employees',      done: false },
                    { date: 'Jun 12', task: 'PF submission to CEPF',             done: false },
                    { date: 'Jun 15', task: 'Tax submission to IRD',             done: false },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-none">
                      <div className={`w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0 ${c.done ? 'bg-green-500 text-white' : 'border-2 border-gray-300'}`}>
                        {c.done ? '✓' : ''}
                      </div>
                      <div className="text-xs text-gray-400 w-12 flex-shrink-0">{c.date}</div>
                      <div className="text-xs text-gray-700 flex-1">{c.task}</div>
                      <Pill color={c.done ? 'green' : 'gray'}>{c.done ? 'Done' : 'Pending'}</Pill>
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          </div>
        )}

      </PayrollAccessGuard>
    </div>
  )
}

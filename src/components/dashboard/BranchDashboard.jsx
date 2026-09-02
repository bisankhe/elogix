// ============================================================
// FILE: src/components/dashboard/BranchDashboard.jsx
// PURPOSE: Branch/Section/Unit Dashboard — forward reports to
//          seniors, branch attendance, performance, engagement,
//          team ops, daily tasks by role
// ============================================================

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useApp }        from '../../context/AppContext.jsx'
import { StatCard }      from '../shared/StatCard.jsx'
import { Card }          from '../shared/Card.jsx'
import { Pill }          from '../shared/Pill.jsx'
import { ProgressBar }   from '../shared/ProgressBar.jsx'
import { TaskItem }      from '../shared/TaskItem.jsx'
import { PageTitle }     from '../shared/PageTitle.jsx'
import { AIInsightCard } from '../shared/AIInsightCard.jsx'

const attendanceData = [
  { month: 'Jan', present: 128, leave: 9,  absent: 3 },
  { month: 'Feb', present: 125, leave: 11, absent: 4 },
  { month: 'Mar', present: 130, leave: 8,  absent: 2 },
  { month: 'Apr', present: 127, leave: 10, absent: 3 },
  { month: 'May', present: 128, leave: 12, absent: 0 },
  { month: 'Jun', present: 130, leave: 10, absent: 5 },
]

const kpiData = [
  { kpi: 'Customer Satisfaction', actual: 84, target: 85  },
  { kpi: 'SLA Compliance',        actual: 91, target: 90  },
  { kpi: 'Task Completion',       actual: 78, target: 80  },
  { kpi: 'Error Rate',            actual: 5,  target: 3   },
  { kpi: 'Response Time (hrs)',   actual: 4,  target: 6   },
]

const branchTasks = [
  { id: 1, task: 'Submit daily attendance report to HR',       priority: 'high',   done: false, dept: 'All',      role: 'Branch Manager' },
  { id: 2, task: 'Forward weekly performance report',          priority: 'high',   done: false, dept: 'All',      role: 'Branch Manager' },
  { id: 3, task: 'Approve 4 leave requests',                   priority: 'high',   done: false, dept: 'Ops',      role: 'Branch Manager' },
  { id: 4, task: 'Review branch KPI — Jun progress',          priority: 'medium', done: true,  dept: 'All',      role: 'Branch Manager' },
  { id: 5, task: 'Conduct team stand-up meeting',              priority: 'medium', done: true,  dept: 'All',      role: 'Branch Manager' },
  { id: 6, task: 'Approve 5 WFH requests',                    priority: 'medium', done: false, dept: 'Ops',      role: 'Branch Manager' },
  { id: 7, task: 'Submit expense claims × 3',                  priority: 'low',    done: false, dept: 'Finance',  role: 'Branch Manager' },
  { id: 8, task: 'Update branch headcount to HR system',       priority: 'low',    done: true,  dept: 'HR',       role: 'Branch Manager' },
]

const roleTasks = [
  { role: 'Team Lead',      tasks: 4, done: 3, color: '#3b82f6' },
  { role: 'Senior Officer', tasks: 5, done: 4, color: '#8b5cf6' },
  { role: 'Officer',        tasks: 6, done: 5, color: '#10b981' },
  { role: 'Assistant',      tasks: 3, done: 2, color: '#f59e0b' },
  { role: 'Intern',         tasks: 2, done: 2, color: '#94a3b8' },
]

const aiInsights = [
  { color: '#f59e0b', label: 'Attendance Dip',       text: 'Sales sub-unit attendance dropped 5% this week. 3 unexcused absences need follow-up.' },
  { color: '#10b981', label: 'KPI Performing Well',  text: 'SLA compliance at 91% — exceeding 90% target. Team response time also ahead of goal.' },
  { color: '#3b82f6', label: 'Report Reminder',      text: 'Weekly report to Department Head is due today by 5 PM. Include attendance & KPI summary.' },
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

export default function BranchDashboard() {
  const [dashData,setDashData]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState(null)
  const { t } = useApp()
  const [tasks, setTasks] = useState(branchTasks)
  const [activeTab, setActiveTab] = useState('overview')
  const [reportStatus, setReportStatus] = useState({ dept: 'Pending', hr: 'Sent', exec: 'Pending' })
  const toggle = (id) => setTasks(p => p.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk))
  const done = tasks.filter(t => t.done).length

  const forwardReport = (to) => {
    setReportStatus(prev => ({ ...prev, [to]: 'Sent' }))
  }

  useEffect(()=>{
    const {token,slug,valid,session} = _headers()
    if(!valid){setLoading(false);return}
    setLoading(true);setError(null)
    const empId = session?.user?.employee_id||''
    fetch('/api/v1/dashboard/branch' + (empId?`?emp_id=${empId}`:''), {
      headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}
    })
      .then(r=>{
        if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
        if(!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json()
      })
      .then(d=>{ if(d.success) setDashData(d.data) })
      .catch(err=>{setError(err.message);console.error('[eLogix dashboard] /branch:',err)})
      .finally(()=>setLoading(false))
  },[])

  return (
    <div>
      <PageTitle title="Branch / Section / Unit Dashboard" sub="Kathmandu Branch · Operations Section · Branch Manager: Sunita Rai · Can forward reports to seniors." badge="Branch" />

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
        <StatCard icon="👥" label="Branch Headcount"   value="145"   change="+2 this month"   up  accent="#06b6d4" />
        <StatCard icon="✅" label="Branch Attendance"  value="88.3%" change="vs 87% last wk"  up  accent="#10b981" />
        <StatCard icon="📊" label="Branch Performance" value="79%"   change="+4% vs target"   up  accent="#f59e0b" />
        <StatCard icon="⏳" label="Pending Actions"    value="11"    change="Action needed"    up={false} accent="#ef4444" />
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'overview',    label: '📊 Overview'    },
          { id: 'reports',     label: '📤 Forward Reports' },
          { id: 'performance', label: '🎯 Performance' },
          { id: 'tasks',       label: `✅ Tasks (${done}/${tasks.length})` },
          { id: 'ai',          label: '🧠 AI Insights' },
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card title="Branch Attendance Trend" subtitle="Monthly present vs leave vs absent">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={attendanceData}>
                  <defs>
                    <linearGradient id="gBR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="present" stroke="#06b6d4" fill="url(#gBR)" strokeWidth={2.5} name="Present" />
                  <Area type="monotone" dataKey="leave" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 4" name="Leave" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <div className="space-y-4">
              <Card title="Team Leave / WFH Status">
                {[
                  { label: 'Annual leave', count: '8 members',  bg: '#eff6ff', color: '#1d4ed8' },
                  { label: 'Sick leave',   count: '3 members',  bg: '#fef2f2', color: '#dc2626' },
                  { label: 'WFH approved',count: '18 members', bg: '#f0fdf4', color: '#15803d' },
                  { label: 'Field visit',  count: '6 members',  bg: '#fff7ed', color: '#c2410c' },
                ].map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: l.bg, color: l.color, padding: '9px 12px', borderRadius: 8, marginBottom: 6, fontSize: 12, fontWeight: 600 }}>
                    <span>{l.label}</span><span style={{ fontWeight: 800 }}>{l.count}</span>
                  </div>
                ))}
              </Card>

              <Card title="Engagement Pulse">
                {[
                  { label: 'Work-life balance',    v: 7.6, c: '#3b82f6' },
                  { label: 'Manager support',      v: 8.0, c: '#10b981' },
                  { label: 'Growth opportunities', v: 6.7, c: '#f59e0b' },
                  { label: 'Team satisfaction',    v: 7.8, c: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: '#475569' }}>{s.label}</span>
                      <span style={{ fontWeight: 700 }}>{s.v}/10</span>
                    </div>
                    <ProgressBar value={s.v * 10} color={s.c} />
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div>
          <div style={{ padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, marginBottom: 16, fontSize: 12, color: '#1e3a8a' }}>
            📤 <strong>Branch Report Forwarding</strong> — Submit attendance, performance & KPI reports to your seniors. All forwards are logged and timestamped.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {[
              { to: 'Department Head',  key: 'dept', name: 'Bikram Shrestha',  level: 'L1', icon: '🏢' },
              { to: 'HR Manager',       key: 'hr',   name: 'Anita Gurung',     level: 'L2', icon: '👥' },
              { to: 'Executive',        key: 'exec', name: 'Rajesh Sharma',    level: 'L3', icon: '📊' },
            ].map((r, i) => (
              <Card key={i}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{r.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>To: {r.to}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{r.name}</div>
                  <Pill color={reportStatus[r.key] === 'Sent' ? 'green' : 'yellow'}>{reportStatus[r.key]}</Pill>
                  {reportStatus[r.key] !== 'Sent' && (
                    <button
                      onClick={() => forwardReport(r.key)}
                      style={{ display: 'block', width: '100%', marginTop: 10, padding: '8px', borderRadius: 8, background: '#06b6d4', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      📤 Forward Report
                    </button>
                  )}
                  {reportStatus[r.key] === 'Sent' && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#10b981', fontWeight: 600 }}>✅ Sent successfully</div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Card title="Report History" subtitle="Last 7 days forwards">
            {[
              { to: 'Department Head', report: 'Weekly Attendance Report',    date: 'Jun 3',  status: 'Acknowledged' },
              { to: 'HR Manager',      report: 'Monthly KPI Summary',         date: 'Jun 1',  status: 'Viewed'       },
              { to: 'Department Head', report: 'Daily Attendance — May 31',   date: 'May 31', status: 'Acknowledged' },
              { to: 'Executive',       report: 'Branch Performance Q2',       date: 'May 28', status: 'Acknowledged' },
            ].map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#334155' }}>{h.report}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>To: {h.to} · {h.date}</div>
                </div>
                <Pill color="green">{h.status}</Pill>
              </div>
            ))}
          </Card>
        </div>
      )}

      {activeTab === 'performance' && (
        <div>
          <Card title="Branch KPI Performance" subtitle="Current quarter progress">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={kpiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="kpi" tick={{ fontSize: 10 }} angle={-12} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="actual" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Actual" />
                <Bar dataKey="target" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="mt-4">
            {kpiData.map((k, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: '#475569', fontWeight: 500 }}>{k.kpi}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: k.actual >= k.target ? '#10b981' : '#ef4444' }}>{k.actual}</span>
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>/ {k.target} target</span>
                    <Pill color={k.actual >= k.target ? 'green' : 'red'}>{k.actual >= k.target ? '✓' : '↓'}</Pill>
                  </div>
                </div>
                <ProgressBar value={Math.min((k.actual / k.target) * 100, 100)} color={k.actual >= k.target ? '#10b981' : '#ef4444'} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="My Daily Tasks" subtitle="Branch manager — today's agenda">
              {tasks.map(tk => <TaskItem key={tk.id} {...tk} onToggle={() => toggle(tk.id)} />)}
            </Card>
            <Card title="Role-wise Task Summary" subtitle="Team task completion by role">
              {roleTasks.map((r, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: r.color, display: 'inline-block' }} />
                      <span style={{ color: '#475569', fontWeight: 500 }}>{r.role}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: r.color }}>{r.done}/{r.tasks} tasks done</span>
                  </div>
                  <ProgressBar value={(r.done / r.tasks) * 100} color={r.color} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <AIInsightCard insights={aiInsights} title="🧠 Branch Manager AI Insights" />
      )}
    </div>
  )
}

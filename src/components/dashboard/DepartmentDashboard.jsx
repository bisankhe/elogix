// ============================================================
// FILE: src/components/dashboard/DepartmentDashboard.jsx
// PURPOSE: Department Head Dashboard — IT dept, sprint velocity,
//          team ops, engagement, performance, peer recognition,
//          daily tasks, things to do by role
// ============================================================

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useApp }        from '../../context/AppContext.jsx'
import { StatCard }      from '../shared/StatCard.jsx'
import { Card }          from '../shared/Card.jsx'
import { Pill }          from '../shared/Pill.jsx'
import { ProgressBar }   from '../shared/ProgressBar.jsx'
import { TaskItem }      from '../shared/TaskItem.jsx'
import { PageTitle }     from '../shared/PageTitle.jsx'
import { AIInsightCard } from '../shared/AIInsightCard.jsx'

const sprintData = [
  { sprint: 'S1', velocity: 72 }, { sprint: 'S2', velocity: 68 },
  { sprint: 'S3', velocity: 78 }, { sprint: 'S4', velocity: 80 },
  { sprint: 'S5', velocity: 79 }, { sprint: 'S6', velocity: 84 },
]

const deptTasks = [
  { id: 1, task: 'Review 360° feedback for all team members', priority: 'high',   done: false, role: 'Dept Head' },
  { id: 2, task: 'Approve 4 overtime requests',               priority: 'high',   done: false, role: 'Dept Head' },
  { id: 3, task: 'Complete Q2 performance reviews — 7 staff', priority: 'high',   done: false, role: 'Dept Head' },
  { id: 4, task: 'Sprint S7 planning session',               priority: 'medium', done: true,  role: 'Dept Head' },
  { id: 5, task: 'Review training nominations × 3',           priority: 'medium', done: false, role: 'Dept Head' },
  { id: 6, task: 'Approve WFH requests × 7',                 priority: 'medium', done: false, role: 'Dept Head' },
  { id: 7, task: 'Asset allocation request — 2 laptops',     priority: 'low',    done: true,  role: 'Dept Head' },
  { id: 8, task: 'Forward weekly report to HR Manager',       priority: 'low',    done: false, role: 'Dept Head' },
]

const roleTasks = [
  { role: 'Senior Developer', tasks: 3, done: 2, color: '#3b82f6' },
  { role: 'Junior Developer', tasks: 5, done: 4, color: '#8b5cf6' },
  { role: 'QA Engineer',      tasks: 4, done: 3, color: '#10b981' },
  { role: 'DevOps',           tasks: 2, done: 2, color: '#f59e0b' },
  { role: 'UI/UX Designer',   tasks: 3, done: 1, color: '#ef4444' },
]

const recognitions = [
  { name: 'Prabesh Karki',   note: 'Exceptional API migration delivery — 2 days ahead of schedule',  icon: '⭐', color: '#3b82f6' },
  { name: 'Maya Adhikari',   note: 'Best bug-fix turnaround — zero regression in 3 weeks',           icon: '🏆', color: '#8b5cf6' },
  { name: 'Dev Raj Poudel',  note: 'Outstanding team mentorship — 3 junior devs leveled up',         icon: '💡', color: '#10b981' },
]

const aiInsights = [
  { color: '#ef4444', label: 'Attrition Risk',    text: '3 senior developers showing disengagement signals. Schedule 1-on-1s this week before it escalates.' },
  { color: '#10b981', label: 'Sprint Velocity',   text: 'Team velocity improved 16% over last 6 sprints. At current rate, Q3 targets are achievable.' },
  { color: '#f59e0b', label: 'Skill Gap Detected',text: 'Cloud infrastructure skills gap identified. 4 developers need AWS certification — budget allocation recommended.' },
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

export default function DepartmentDashboard() {
  const [dashData,setDashData]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState(null)
  const { t } = useApp()
  const [tasks, setTasks] = useState(deptTasks)
  const [activeTab, setActiveTab] = useState('overview')
  const toggle = (id) => setTasks(p => p.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk))
  const done = tasks.filter(t => t.done).length

  useEffect(()=>{
    const {token,slug,valid,session} = _headers()
    if(!valid){setLoading(false);return}
    setLoading(true);setError(null)
    const empId = session?.user?.employee_id||''
    fetch('/api/v1/dashboard/department' + (empId?`?emp_id=${empId}`:''), {
      headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}
    })
      .then(r=>{
        if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
        if(!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json()
      })
      .then(d=>{ if(d.success) setDashData(d.data) })
      .catch(err=>{setError(err.message);console.error('[eLogix dashboard] /department:',err)})
      .finally(()=>setLoading(false))
  },[])

  return (
    <div>
      <PageTitle title="Department Head Dashboard" sub="IT Department · 320 members · Head: Bikram Shrestha — Sprint velocity, performance & team operations." badge="IT Dept" />

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
        <StatCard icon="👥" label="Team Headcount"  value="320"    change="+5 this quarter"    up  accent="#3b82f6" />
        <StatCard icon="✅" label="Team Attendance" value="91.2%"  change="vs 89% last month"  up  accent="#10b981" />
        <StatCard icon="📊" label="Sprint Velocity" value="84 pts" change="+6 this sprint"     up  accent="#f59e0b" />
        <StatCard icon="💰" label="Budget Used"     value="67%"    change="On track Q2"        up  accent="#8b5cf6" />
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'overview',     label: '📊 Overview'    },
          { id: 'performance',  label: '🎯 Performance' },
          { id: 'tasks',        label: `✅ Tasks (${done}/${tasks.length})` },
          { id: 'team',         label: '👥 Team'        },
          { id: 'ai',           label: '🧠 AI Insights' },
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
            <Card title="Sprint Velocity Trend" subtitle="Last 6 sprints (Agile story points)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sprintData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="sprint" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[60, 90]} />
                  <Tooltip />
                  <Bar dataKey="velocity" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Story Points" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Team Engagement Score" subtitle="Pulse survey — this week">
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <svg viewBox="0 0 100 100" width="120" height="120" style={{ display: 'block', margin: '0 auto' }}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="10"
                    strokeDasharray={`${(78 / 100) * 251.2} 251.2`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                  <text x="50" y="48" textAnchor="middle" fontSize="18" fontWeight="700" fill="#0f172a">78</text>
                  <text x="50" y="60" textAnchor="middle" fontSize="8" fill="#94a3b8">/100</text>
                </svg>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Employee Engagement Score</div>
              </div>
              {[
                { label: 'Work-life balance',    v: 7.8, c: '#3b82f6' },
                { label: 'Manager support',      v: 8.1, c: '#10b981' },
                { label: 'Growth opportunities', v: 6.9, c: '#f59e0b' },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                    <span style={{ color: '#475569' }}>{s.label}</span>
                    <span style={{ fontWeight: 700 }}>{s.v}/10</span>
                  </div>
                  <ProgressBar value={s.v * 10} color={s.c} />
                </div>
              ))}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Team Leave / WFH">
              {[
                { label: 'Annual leave',  count: '18 members', bg: '#eff6ff', color: '#1d4ed8' },
                { label: 'Sick leave',    count: '7 members',  bg: '#fef2f2', color: '#dc2626' },
                { label: 'WFH approved', count: '42 members', bg: '#f0fdf4', color: '#15803d' },
                { label: 'On training',  count: '15 members', bg: '#f5f3ff', color: '#6d28d9' },
              ].map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: l.bg, color: l.color, padding: '9px 12px', borderRadius: 8, marginBottom: 6, fontSize: 12, fontWeight: 600 }}>
                  <span>{l.label}</span><span style={{ fontWeight: 800 }}>{l.count}</span>
                </div>
              ))}
            </Card>

            <Card title="Pending Approvals">
              {[
                { label: 'Overtime approval',    value: '4 pending', color: 'red'    },
                { label: 'WFH requests',         value: '7 pending', color: 'yellow' },
                { label: 'Training nominations', value: '3 pending', color: 'blue'   },
                { label: 'Project budget',       value: '2 pending', color: 'purple' },
                { label: 'Asset allocation',     value: '5 pending', color: 'yellow' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                  <span style={{ color: '#475569' }}>{c.label}</span>
                  <Pill color={c.color}>{c.value}</Pill>
                </div>
              ))}
            </Card>

            <Card title="Peer Recognition Wall" subtitle="This month">
              {recognitions.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {r.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>{r.note}</div>
                  </div>
                  <span style={{ fontSize: 18 }}>{r.icon}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div>
          <Card title="Performance Management — IT Department" subtitle="Q2 2026 performance tracking">
            {[
              { label: 'Appraisals completed',  pct: 73, color: '#3b82f6' },
              { label: 'Goals on track',        pct: 81, color: '#10b981' },
              { label: 'Avg performance score', pct: 83, color: '#8b5cf6' },
              { label: 'Training completion',   pct: 67, color: '#f59e0b' },
              { label: 'PIP active',            pct: 3,  color: '#ef4444' },
            ].map((p, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: '#475569' }}>{p.label}</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.pct}%</span>
                </div>
                <ProgressBar value={p.pct} color={p.color} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card title="My Daily Tasks" subtitle="Stored for performance records">
              {tasks.map(tk => <TaskItem key={tk.id} {...tk} onToggle={() => toggle(tk.id)} />)}
            </Card>
            <Card title="Role-wise Task Completion" subtitle="Team tasks by role — today">
              {roleTasks.map((r, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>{r.role}</span>
                    <span style={{ fontWeight: 700, color: r.color }}>{r.done}/{r.tasks} done</span>
                  </div>
                  <ProgressBar value={(r.done / r.tasks) * 100} color={r.color} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <Card title="Team Composition — IT Department" subtitle="320 members across roles">
          {[
            { role: 'Senior Developer',    count: 45, color: '#3b82f6' },
            { role: 'Mid Developer',       count: 80, color: '#8b5cf6' },
            { role: 'Junior Developer',    count: 65, color: '#06b6d4' },
            { role: 'QA Engineer',         count: 40, color: '#10b981' },
            { role: 'DevOps Engineer',     count: 25, color: '#f59e0b' },
            { role: 'UI/UX Designer',      count: 20, color: '#ec4899' },
            { role: 'Data Analyst',        count: 18, color: '#ef4444' },
            { role: 'Project Manager',     count: 15, color: '#84cc16' },
            { role: 'IT Support',          count: 12, color: '#94a3b8' },
          ].map((r, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: r.color, display: 'inline-block' }} />
                  <span style={{ color: '#475569', fontWeight: 500 }}>{r.role}</span>
                </div>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{r.count}</span>
              </div>
              <ProgressBar value={(r.count / 80) * 100} color={r.color} />
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'ai' && (
        <AIInsightCard insights={aiInsights} title="🧠 Department Head AI Insights" />
      )}
    </div>
  )
}

// ============================================================
// FILE: src/components/dashboard/RecruitmentDashboard.jsx
// PURPOSE: Recruitment Agency Portal — ATS features, candidate
//          pipeline, open vacancies, interview schedule,
//          placement stats. RBAC: No payroll/internal data.
// ============================================================

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useApp }      from '../../context/AppContext.jsx'
import { StatCard }    from '../shared/StatCard.jsx'
import { Card }        from '../shared/Card.jsx'
import { Pill }        from '../shared/Pill.jsx'
import { ProgressBar } from '../shared/ProgressBar.jsx'
import { PageTitle }   from '../shared/PageTitle.jsx'

const myPipeline = [
  { name: 'Applied',     value: 34, fill: '#3b82f6' },
  { name: 'Screened',    value: 22, fill: '#8b5cf6' },
  { name: 'Interviewed', value: 8,  fill: '#f59e0b' },
  { name: 'Offered',     value: 3,  fill: '#10b981' },
  { name: 'Placed',      value: 2,  fill: '#22c55e' },
]

const myCandidates = [
  { name: 'Sunil Khadka',    pos: 'Senior Developer',  stage: 'Offered',     date: '2026-06-01', score: 88 },
  { name: 'Priyanka Rana',   pos: 'Finance Analyst',   stage: 'Interviewed', date: '2026-05-30', score: 82 },
  { name: 'Amir Shrestha',   pos: 'Sales Executive',   stage: 'Screened',    date: '2026-05-28', score: 75 },
  { name: 'Binita Maharjan', pos: 'HR Coordinator',    stage: 'Applied',     date: '2026-05-25', score: 70 },
  { name: 'Nabin Thapa',     pos: 'IT Support',        stage: 'Placed',      date: '2026-05-20', score: 79 },
  { name: 'Rajan Bhandari',  pos: 'Sales Executive',   stage: 'Screened',    date: '2026-06-01', score: 68 },
  { name: 'Sima Gurung',     pos: 'Finance Analyst',   stage: 'Applied',     date: '2026-06-02', score: 73 },
]

const vacancies = [
  { id: 'REQ-001', title: 'Senior Developer',   dept: 'IT',      salary: 'NPR 80k–120k', urgency: 'Urgent', days: 15, candidates: 32 },
  { id: 'REQ-002', title: 'Finance Analyst',    dept: 'Finance', salary: 'NPR 55k–70k',  urgency: 'Open',   days: 10, candidates: 18 },
  { id: 'REQ-003', title: 'Sales Executive × 3',dept: 'Sales',   salary: 'NPR 40k–55k',  urgency: 'Urgent', days: 7,  candidates: 45 },
  { id: 'REQ-004', title: 'HR Coordinator',     dept: 'HR',      salary: 'NPR 35k–45k',  urgency: 'Open',   days: 3,  candidates: 22 },
  { id: 'REQ-005', title: 'Operations Manager', dept: 'Ops',     salary: 'NPR 90k–130k', urgency: 'Open',   days: 2,  candidates: 8  },
]

const interviews = [
  { candidate: 'Sunil Khadka',    pos: 'Senior Developer', date: 'Jun 4, 10:00 AM', type: 'Technical',   interviewer: 'Bikram Shrestha', status: 'Confirmed' },
  { candidate: 'Priyanka Rana',   pos: 'Finance Analyst',  date: 'Jun 5, 2:00 PM',  type: 'HR Round',    interviewer: 'Anita Gurung',    status: 'Confirmed' },
  { candidate: 'Amir Shrestha',   pos: 'Sales Executive',  date: 'Jun 6, 11:00 AM', type: 'Final Round', interviewer: 'CEO Office',      status: 'Pending'   },
]

const placementTrend = [
  { month: 'Jan', placements: 2 }, { month: 'Feb', placements: 3 },
  { month: 'Mar', placements: 4 }, { month: 'Apr', placements: 3 },
  { month: 'May', placements: 5 }, { month: 'Jun', placements: 2 },
]

const sourceData = [
  { name: 'Job Portals', value: 35, color: '#3b82f6' },
  { name: 'Referral',    value: 28, color: '#8b5cf6' },
  { name: 'Social',      value: 22, color: '#10b981' },
  { name: 'Campus',      value: 15, color: '#f59e0b' },
]

const stageColor = {
  Applied: 'gray', Screened: 'blue', Interviewed: 'yellow', Offered: 'purple', Placed: 'green',
}


function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}}
}
function _getTenantCtx() {
  const s=_getSession()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug)}
}

export default function RecruitmentDashboard() {
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const { t } = useApp()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedVacancy, setSelectedVacancy] = useState(null)

  useEffect(()=>{
    const {token,slug,valid} = _getTenantCtx()
    if(!valid){setApiLoading(false);return}
    setApiLoading(true);setApiError(null)
    fetch('/api/v1/dashboard/recruitment',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>{const p=d.dashboard||d.data||d;if(p)setApiData(p)})
      .catch(err=>setApiError(err.message))
      .finally(()=>setApiLoading(false))
  },[])

  return (
    <div>
      {/* RBAC Banner */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
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
        <span>🔒</span>
        <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
          Recruitment Agency Portal — TalentBridge Nepal Pvt. Ltd. · RBAC Enforced: Salary bands visible, internal grade/payroll/employee data NOT accessible.
        </span>
      </div>

      <PageTitle title="Recruitment Agency Portal" sub="ATS features for your submitted candidates · Pipeline funnel · Interview schedule · Placement analytics." badge="ATS" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="💼" label="Open Positions"       value="18"  change="3 urgent fill"    up={false} accent="#06b6d4" />
        <StatCard icon="👤" label="My Submissions"       value="34"  change="This month"       up  accent="#10b981" />
        <StatCard icon="📅" label="Interviews Scheduled" value="8"   change="This week"        up  accent="#f59e0b" />
        <StatCard icon="✅" label="Placed (YTD)"         value="12"  change="35% success rate" up  accent="#8b5cf6" />
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'overview',   label: '📊 Overview'   },
          { id: 'pipeline',   label: '🔄 Pipeline'   },
          { id: 'candidates', label: '👥 Candidates' },
          { id: 'vacancies',  label: '💼 Vacancies'  },
          { id: 'interviews', label: '📅 Interviews' },
          { id: 'analytics',  label: '📈 Analytics'  },
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
            <Card title="My Pipeline Summary" subtitle="Your candidates — stage overview">
              {myPipeline.map((s, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: s.fill, display: 'inline-block' }} />
                      <span style={{ color: '#475569', fontWeight: 500 }}>{s.name}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: s.fill }}>{s.value} candidates</span>
                  </div>
                  <div style={{ height: 24, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${(s.value / 34) * 100}%`, height: '100%', background: s.fill, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 8, transition: 'width .5s' }}>
                      <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{s.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            <Card title="Today's Interviews" subtitle="Scheduled for this week">
              {interviews.map((iv, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{iv.candidate}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{iv.pos} · {iv.date}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>Interviewer: {iv.interviewer}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                      <Pill color={iv.type === 'Technical' ? 'blue' : iv.type === 'HR Round' ? 'green' : 'purple'}>{iv.type}</Pill>
                      <Pill color={iv.status === 'Confirmed' ? 'green' : 'yellow'}>{iv.status}</Pill>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Hiring Funnel — My Candidates" subtitle="Stage-by-stage conversion">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={myPipeline} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Candidates">
                  {myPipeline.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Conversion Rates" subtitle="Stage-to-stage drop-off">
            {myPipeline.map((s, i) => {
              const prev = i > 0 ? myPipeline[i - 1].value : s.value
              const rate = i === 0 ? 100 : ((s.value / prev) * 100).toFixed(1)
              return (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                    <span style={{ color: '#475569' }}>{i === 0 ? 'Total Applied' : `${myPipeline[i-1].name} → ${s.name}`}</span>
                    <span style={{ fontWeight: 700, color: s.fill }}>{rate}%</span>
                  </div>
                  <ProgressBar value={parseFloat(rate)} color={s.fill} />
                </div>
              )
            })}
          </Card>
        </div>
      )}

      {activeTab === 'candidates' && (
        <Card title="Candidate Database" subtitle="Your submitted candidates — RBAC: salary/internal grade hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {['Candidate', 'Position', 'Stage', 'Submitted', 'Assessment', 'Action'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myCandidates.map((c, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                  <td className="py-3">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                        {c.name[0]}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{c.pos}</td>
                  <td><Pill color={stageColor[c.stage]}>{c.stage}</Pill></td>
                  <td style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{c.date}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ProgressBar value={c.score} color={c.score >= 80 ? '#10b981' : c.score >= 70 ? '#f59e0b' : '#ef4444'} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', width: 28 }}>{c.score}</span>
                    </div>
                  </td>
                  <td>
                    <button style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0', color: '#3b82f6', background: 'transparent', cursor: 'pointer' }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'vacancies' && (
        <Card title="Open Vacancies" subtitle="Available for submission — 🔒 Salary bands only, internal grade hidden per RBAC">
          {vacancies.map((v, i) => (
            <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{v.title}</span>
                  <Pill color={v.urgency === 'Urgent' ? 'red' : 'gray'}>{v.urgency}</Pill>
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{v.dept} · <strong>{v.salary}</strong> · {v.days} days open · {v.candidates} applicants</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{v.id}</div>
              </div>
              <button
                onClick={() => setSelectedVacancy(v.id === selectedVacancy ? null : v.id)}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: selectedVacancy === v.id ? '#10b981' : '#06b6d4', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {selectedVacancy === v.id ? '✓ Selected' : 'Submit Candidate'}
              </button>
            </div>
          ))}
          {selectedVacancy && (
            <div style={{ marginTop: 12, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>📋 Submit candidate for {vacancies.find(v => v.id === selectedVacancy)?.title}</div>
              <div style={{ fontSize: 11, color: '#166534' }}>Upload CV or select from your candidate database to submit for this role.</div>
              <button style={{ marginTop: 8, padding: '6px 14px', borderRadius: 7, background: '#10b981', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                + Submit from Database
              </button>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'interviews' && (
        <Card title="Interview Schedule — This Week" subtitle="Confirmed and pending interviews for your candidates">
          {interviews.map((iv, i) => (
            <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 3 }}>{iv.candidate}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{iv.pos} · {iv.date}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Interviewer: {iv.interviewer} · {iv.type}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Pill color={iv.type === 'Technical' ? 'blue' : iv.type === 'HR Round' ? 'green' : 'purple'}>{iv.type}</Pill>
                  <Pill color={iv.status === 'Confirmed' ? 'green' : 'yellow'}>{iv.status}</Pill>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Monthly Placement Trend" subtitle="Candidates placed by month">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={placementTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="placements" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} name="Placements" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card title="My Performance Stats" subtitle="YTD 2026">
            {[
              { label: 'Total submitted',       value: '34'  },
              { label: 'Screened (pass rate)',  value: '65%' },
              { label: 'Interview rate',        value: '24%' },
              { label: 'Offer rate',            value: '14%' },
              { label: 'Placement rate',        value: '35%' },
              { label: 'Avg time-to-place',     value: '22 days' },
              { label: 'Quality score (avg)',   value: '76/100' },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                <span style={{ color: '#475569' }}>{m.label}</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{m.value}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}

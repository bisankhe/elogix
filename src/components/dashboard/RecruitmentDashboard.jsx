// ============================================================
// FILE: src/components/dashboard/RecruitmentDashboard.jsx
// PURPOSE: Recruitment Agency Portal — ATS features, candidate
//          pipeline, open vacancies, interview schedule,
//          placement stats. RBAC: No payroll/internal data.
// ============================================================

import { useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useApp }      from '../../context/AppContext.jsx'
import { StatCard }    from '../shared/StatCard.jsx'
import { Card }        from '../shared/Card.jsx'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

function ProgressBar({value=0,color='#3b82f6',height=6}){
  return<div style={{height,background:'#f1f5f9',borderRadius:height,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(100,value)}%`,background:color,borderRadius:height,transition:'width .5s'}}/></div>
}
function Pill({color='blue',children}){
  const cfg={blue:{bg:'#eff6ff',c:'#1d4ed8'},green:{bg:'#f0fdf4',c:'#15803d'},yellow:{bg:'#fffbeb',c:'#b45309'},purple:{bg:'#f5f3ff',c:'#6d28d9'},gray:{bg:'#f8fafc',c:'#64748b'}}
  const s=cfg[color]||cfg.gray
  return<span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,background:s.bg,color:s.c}}>{children}</span>
}


export default function RecruitmentDashboard() {

  const _s = _getSession(); const _co = _s?.company||{}

  const [myPipeline,      setMyPipeline]      = useState([])
  const [myCandidates,    setMyCandidates]    = useState([])
  const [vacancies,       setVacancies]       = useState([])
  const [interviews,      setInterviews]      = useState([])
  const [placementTrend,  setPlacementTrend]  = useState([])
  const [sourceData,      setSourceData]      = useState([])
  const [kpis,            setKpis]            = useState({})
  const [apiLoading,      setApiLoading]      = useState(true)
  const [apiError,        setApiError]        = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token') || _s?.token || ''
    const slug  = _s?.company?.slug || ''
    if (!token || !slug) { setApiLoading(false); return }
    fetch('/api/v1/recruitment/agency-summary', { headers: _authH() })
      .then(r => {
        if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
        if(!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => {
        const dd = d.data || d
        if(dd.pipeline)         setMyPipeline(dd.pipeline)
        if(dd.candidates)       setMyCandidates(dd.candidates)
        if(dd.vacancies)        setVacancies(dd.vacancies)
        if(dd.interviews)       setInterviews(dd.interviews)
        if(dd.placement_trend)  setPlacementTrend(dd.placement_trend)
        if(dd.source_data)      setSourceData(dd.source_data)
        if(dd.kpis)             setKpis(dd.kpis)
      })
      .catch(e => setApiError(e.message))
      .finally(() => setApiLoading(false))
  }, [])
  const { t } = useApp()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedVacancy, setSelectedVacancy] = useState(null)

  return (
    <div>
      {/* RBAC Banner */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>🔒</span>
        <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
          Recruitment Agency Portal — TalentBridge Nepal Pvt. Ltd. · RBAC Enforced: Salary bands visible, internal grade/payroll/employee data NOT accessible.
        </span>
      </div>

      {/* eLogix gradient header */}
      <div style={{background:'linear-gradient(135deg,#1e3a5f 0%,#2563eb 60%,#93c5fd 100%)',borderRadius:16,padding:'18px 22px',marginBottom:16,boxShadow:'0 4px 20px rgba(0,0,0,.12)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>🎯</span>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Recruitment Dashboard</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{_co?.name} · ATS · Pipeline · Placements</div>
          </div>
        </div>
      </div>
      {apiError&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {apiError}</div>}

      {/* PageTitle removed — use header above */}
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="💼" label="Open Positions"       value={kpis?.auto_value ?? "—"}  change="3 urgent fill"    up={false} accent="#06b6d4" />
        <StatCard icon="👤" label="My Submissions"       value={kpis.my_submissions ?? "—"}  change="This month"       up  accent="#10b981" />
        <StatCard icon="📅" label="Interviews Scheduled" value={kpis.interviews_scheduled ?? "—"}   change="This week"        up  accent="#f59e0b" />
        <StatCard icon="✅" label="Placed (YTD)"         value={kpis.open_positions ?? "—"}  change="35% success rate" up  accent="#8b5cf6" />
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
              {(myPipeline||[]).length===0?<div style={{textAlign:"center",padding:32,color:"#94a3b8"}}><div style={{fontSize:28,marginBottom:8}}>🔍</div><div>No pipeline data yet for {_co?.name}</div></div>:(myPipeline||[]).map((s, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: s.fill, display: 'inline-block' }} />
                      <span style={{ color: '#475569', fontWeight: 500 }}>{s.name}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: s.fill }}>{s.value} candidates</span>
                  </div>
                  <div style={{ height: 24, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${(s.value / Math.max(...(myPipeline||[]).map(p=>p.value||0),1)) * 100}%`, height: '100%', background: s.fill, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 8, transition: 'width .5s' }}>
                      <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{s.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            <Card title="Today's Interviews" subtitle="Scheduled for this week">
              {(interviews||[]).length===0?<div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:11}}>No interviews scheduled</div>:(interviews||[]).map((iv, i) => (
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
              {(myCandidates||[]).length===0?<div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:11}}>No candidates yet</div>:(myCandidates||[]).map((c, i) => (
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
          {(vacancies||[]).length===0?<div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:11}}>No open vacancies yet</div>:(vacancies||[]).map((v, i) => (
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
          {(interviews||[]).length===0?<div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:11}}>No interviews scheduled</div>:(interviews||[]).map((iv, i) => (
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

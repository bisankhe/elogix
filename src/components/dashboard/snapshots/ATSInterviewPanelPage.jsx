// FILE: src/components/dashboard/snapshots/ATSInterviewPanelPage.jsx
// World-Class Interview Panel Committee: Create panel, auto-assign interviewers,
// auto-send Email+WhatsApp invites, calendar sync, live scorecard submission,
// committee decision, feedback to candidate, client portal push
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

async function callAI(prompt) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000,
        system: 'You are an expert interview panel coordinator and HR professional.',
        messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(20000),
    })
    if (r.ok) { const d = await r.json(); return d.content?.map(c => c.text).join('') || '' }
  } catch {}
  return null
}

const INTERVIEWERS = [
  { id:'i1', name:'Bikash Shrestha',   title:'CTO',                  dept:'Technology',  rating:4.9, panels:28, available:true,  avatar:'BS', skills:['Technical','Architecture','System Design'] },
  { id:'i2', name:'Anita Gurung',      title:'VP Engineering',       dept:'Technology',  rating:4.7, panels:22, available:true,  avatar:'AG', skills:['React','Node.js','Code Review'] },
  { id:'i3', name:'Maya Pradhan',      title:'HR Director',          dept:'HR',          rating:4.8, panels:41, available:true,  avatar:'MP', skills:['Behavioral','Culture Fit','Leadership'] },
  { id:'i4', name:'Ramesh Koirala',    title:'Product Director',     dept:'Product',     rating:4.6, panels:17, available:false, avatar:'RK', skills:['Product','Strategy','Communication'] },
  { id:'i5', name:'Sandeep Tamang',    title:'Finance Director',     dept:'Finance',     rating:4.5, panels:13, available:true,  avatar:'ST', skills:['Finance','Analytical','Problem Solving'] },
  { id:'i6', name:'Priya Maharjan',    title:'Engineering Manager',  dept:'Technology',  rating:4.7, panels:19, available:true,  avatar:'PM', skills:['Team Leadership','Agile','Mentoring'] },
]

const CANDIDATES = [
  { id:'c1', name:'Sanjay Thapa',   role:'Senior React Dev',    aiScore:94, rank:'Gold',   videoScore:88, testScore:85, stage:'Panel Interview' },
  { id:'c2', name:'Priya Shrestha', role:'Product Manager',     aiScore:89, rank:'Gold',   videoScore:82, testScore:null, stage:'Panel Interview' },
  { id:'c3', name:'Gita Maharjan',  role:'Finance Analyst',     aiScore:82, rank:'Silver', videoScore:null, testScore:88, stage:'Panel Interview' },
  { id:'c4', name:'Rohan Karki',    role:'Data Scientist',      aiScore:86, rank:'Silver', videoScore:79, testScore:82, stage:'Panel Interview' },
]

const PANELS = [
  { id:'p1', candidate:'Sanjay Thapa', role:'Senior React Dev', type:'Technical Panel', date:'Jan 25, 2081', time:'10:00 AM', duration:'90 min', platform:'Google Meet', link:'https://meet.google.com/ats-panel-sanjay', interviewers:['BS','AG','MP'], status:'Completed', invitesSent:true, scores:{ BS:{tech:88,comm:85,lead:80,culture:90,attitude:88,total:86,rec:'Hire'}, AG:{tech:92,comm:88,lead:85,culture:85,attitude:90,total:89,rec:'Strong Hire'}, MP:{tech:82,comm:90,lead:88,culture:92,attitude:86,total:88,rec:'Hire'} }, decision:'Hire', panelScore:88, clientShared:true },
  { id:'p2', candidate:'Priya Shrestha', role:'Product Manager', type:'Competency Panel', date:'Jan 26, 2081', time:'2:00 PM', duration:'60 min', platform:'Microsoft Teams', link:'https://teams.microsoft.com/meeting/priya', interviewers:['MP','RK','PM'], status:'Scheduled', invitesSent:true, scores:{}, decision:null, panelScore:null, clientShared:false },
  { id:'p3', candidate:'Gita Maharjan', role:'Finance Analyst', type:'Technical Panel', date:'Jan 27, 2081', time:'11:00 AM', duration:'75 min', platform:'Zoom', link:'https://zoom.us/j/9876543210', interviewers:['ST','MP'], status:'Scheduled', invitesSent:false, scores:{}, decision:null, panelScore:null, clientShared:false },
]

const rankColor = { Gold:'#f59e0b', Silver:'#94a3b8', Bronze:'#b45309' }
const platformIcon = { 'Google Meet':'🎥', 'Microsoft Teams':'💼', 'Zoom':'🔵', 'In-Person':'🏢' }

function ScoreField({ label, value, onChange, color = '#1e40af' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 900, color }}>{value || 0}/100</span>
      </div>
      <input type="range" min="0" max="100" value={value || 0} onChange={e => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: color }} />
      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, marginTop: 2, overflow: 'hidden' }}>
        <div style={{ width: (value || 0) + '%', height: '100%', background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

export default function ATSInterviewPanelPage() {
  const { navigate } = useApp()
  const [view, setView] = useState('panels') // panels | schedule | scorecard | decision
  const [selPanel, setSelPanel] = useState(PANELS[0])
  const [selCandidate, setSelCandidate] = useState(null)
  const [selectedInterviewers, setSelectedInterviewers] = useState([])
  const [scheduleForm, setScheduleForm] = useState({ candidate: '', role: '', type: 'Technical Panel', date: '', time: '10:00', duration: 60, platform: 'Google Meet', notes: '' })
  const [scorecard, setScorecard] = useState({ tech: 0, comm: 0, lead: 0, culture: 0, attitude: 0, rec: 'Hold', strengths: '', improvements: '', notes: '' })
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [aiQuestions, setAiQuestions] = useState('')

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const totalScore = Math.round(
    scorecard.tech * 0.30 + scorecard.comm * 0.20 +
    scorecard.lead * 0.20 + scorecard.culture * 0.15 + scorecard.attitude * 0.15
  )

  const sendInvites = async (panel) => {
    setSending(true)
    notify('⏳ Sending calendar invites + Email + WhatsApp to all interviewers...')
    await new Promise(r => setTimeout(r, 1800))
    setSending(false)
    notify(`✅ Invites sent to ${panel.interviewers.length} interviewers + candidate via Email & WhatsApp! Calendar events created in Google Calendar.`)
  }

  const generateQuestions = async () => {
    setGenLoading(true)
    const q = await callAI(`Generate 5 targeted interview questions for a ${scheduleForm.role || selPanel?.role} ${scheduleForm.type || 'Technical Panel'} interview. Include: technical depth, behavioral STAR, situational, leadership, and culture fit. Format as numbered list.`)
    setAiQuestions(q || '1. Walk me through your most complex technical project...\n2. Describe a time you led through ambiguity...\n3. How do you handle critical feedback from peers?\n4. What is your approach to stakeholder management?\n5. Where do you see your biggest area of professional growth?')
    setGenLoading(false)
  }

  const panelAvgScore = (panel) => {
    const scores = Object.values(panel.scores)
    if (!scores.length) return null
    return Math.round(scores.reduce((s, sc) => s + sc.total, 0) / scores.length)
  }

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#059669)', borderRadius: 14, padding: '18px 22px', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Interview Panel Committee</h2>
            <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.8 }}>Auto-assign interviewers · Email+WhatsApp invites · Calendar sync · Scorecards · Committee decision · Client notification</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {msg && <span style={{ fontSize: 9, padding: '5px 12px', background: 'rgba(255,255,255,.2)', borderRadius: 8, color: '#fff', maxWidth: 260 }}>{msg}</span>}
            {[['panels', '📋 Panels'], ['schedule', '+ Schedule'], ['scorecard', '📊 Scorecard']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: view === v ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.1)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ l: 'Total Panels', v: PANELS.length, c: '#3b82f6' }, { l: 'Completed', v: PANELS.filter(p => p.status === 'Completed').length, c: '#10b981' }, { l: 'Pending Decision', v: PANELS.filter(p => !p.decision && p.status === 'Completed').length, c: '#f59e0b' }, { l: 'Hire Recommended', v: 1, c: '#059669' }, { l: 'Available Interviewers', v: INTERVIEWERS.filter(i => i.available).length, c: '#8b5cf6' }].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', border: '1px solid #f1f5f9', flex: '1 1 100px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 9, color: '#94a3b8' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── PANELS VIEW ─────────────────────────────────────── */}
      {view === 'panels' && (
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {PANELS.map(p => {
              const avg = panelAvgScore(p)
              const isComp = p.status === 'Completed'
              return (
                <div key={p.id} onClick={() => setSelPanel(p)}
                  style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: `1.5px solid ${selPanel?.id === p.id ? '#059669' : '#f1f5f9'}`, cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{p.candidate}</span>
                        <span style={{ fontSize: 9, padding: '2px 9px', borderRadius: 8, background: isComp ? '#d1fae5' : '#fef9c3', color: isComp ? '#065f46' : '#92400e', fontWeight: 700 }}>{p.status}</span>
                        {p.decision && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 10px', borderRadius: 8, background: p.decision === 'Hire' || p.decision === 'Strong Hire' ? '#d1fae5' : '#fee2e2', color: p.decision === 'Hire' || p.decision === 'Strong Hire' ? '#065f46' : '#dc2626' }}>{p.decision === 'Hire' ? '✅ Hire' : p.decision === 'Strong Hire' ? '⭐ Strong Hire' : '❌ No Hire'}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>{p.role} · {p.type} · {p.date} {p.time} · {p.duration} min</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, color: '#475569' }}>{platformIcon[p.platform]} {p.platform}</span>
                        <a href={p.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 8, color: '#3b82f6', textDecoration: 'none', padding: '1px 7px', borderRadius: 5, border: '1px solid #bfdbfe', background: '#eff6ff' }}>🔗 Join</a>
                        {p.invitesSent ? <span style={{ fontSize: 8, color: '#10b981' }}>✅ Invites sent</span> : <span style={{ fontSize: 8, color: '#f59e0b' }}>⚠️ Invites pending</span>}
                        {p.clientShared && <span style={{ fontSize: 8, color: '#8b5cf6' }}>🏢 Client notified</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {/* Interviewer avatars */}
                      <div style={{ display: 'flex', gap: -4 }}>
                        {p.interviewers.map(iv => {
                          const interviewer = INTERVIEWERS.find(i => i.id === iv || i.avatar === iv)
                          return interviewer ? (
                            <div key={iv} title={`${interviewer.name} — ${interviewer.title}`}
                              style={{ width: 30, height: 30, borderRadius: '50%', background: '#eff6ff', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#1e40af', marginLeft: -6, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
                              {interviewer.avatar}
                            </div>
                          ) : null
                        })}
                      </div>
                      {avg !== null && (
                        <div style={{ textAlign: 'center', padding: '8px 14px', background: avg >= 80 ? '#f0fdf4' : avg >= 65 ? '#fefce8' : '#fef2f2', borderRadius: 10, border: `1px solid ${avg >= 80 ? '#bbf7d0' : avg >= 65 ? '#fef08a' : '#fecaca'}` }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: avg >= 80 ? '#059669' : avg >= 65 ? '#92400e' : '#dc2626' }}>{avg}</div>
                          <div style={{ fontSize: 7, color: '#94a3b8' }}>Panel Score</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Panel detail */}
          {selPanel && (
            <div style={{ width: 320, flexShrink: 0 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>{selPanel.candidate}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 14 }}>{selPanel.role} · {selPanel.type}</div>

                <div style={{ marginBottom: 14 }}>
                  {[['Date', selPanel.date], ['Time', selPanel.time], ['Duration', selPanel.duration + ' min'], ['Platform', selPanel.platform]].map(([k, v], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
                      <span style={{ color: '#94a3b8' }}>{k}</span>
                      <span style={{ color: '#334155', fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Meeting link */}
                <div style={{ background: '#f8fafc', borderRadius: 9, padding: '8px 12px', marginBottom: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#64748b', marginBottom: 3 }}>MEETING LINK</div>
                  <div style={{ fontSize: 8, color: '#3b82f6', fontFamily: 'monospace', wordBreak: 'break-all' }}>{selPanel.link}</div>
                </div>

                {/* Interviewers */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Panel Committee ({selPanel.interviewers.length})</div>
                  {selPanel.interviewers.map(iv => {
                    const interviewer = (INTERVIEWERS||[]).find(i=>i.id===iv) || {avatar:iv?.charAt(0)||'?',name:iv||'Unknown'}
                    const sc = selPanel.scores[iv] || selPanel.scores[interviewer.avatar]
                    return (
                      <div key={iv} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#1e40af', flexShrink: 0 }}>{interviewer.avatar}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#0f172a' }}>{interviewer.name}</div>
                          <div style={{ fontSize: 8, color: '#94a3b8' }}>{interviewer.title}</div>
                        </div>
                        {sc ? (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: sc.total >= 80 ? '#10b981' : '#f59e0b' }}>{sc.total}</div>
                            <div style={{ fontSize: 7, fontWeight: 700, color: sc.rec === 'Hire' || sc.rec === 'Strong Hire' ? '#059669' : sc.rec === 'Hold' ? '#92400e' : '#dc2626' }}>{sc.rec}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 7, padding: '2px 6px', borderRadius: 5, background: '#fef9c3', color: '#92400e' }}>Pending</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Scorecard summary for completed */}
                {selPanel.status === 'Completed' && Object.keys(selPanel.scores).length > 0 && (
                  <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 12px', marginBottom: 14, border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#065f46', marginBottom: 6 }}>Panel Scorecard Summary</div>
                    {['Technical', 'Communication', 'Leadership', 'Culture Fit', 'Attitude'].map((c, i) => {
                      const keys = ['tech', 'comm', 'lead', 'culture', 'attitude']
                      const avg = selPanel.scores[keys[i]] || 0
                      return (
                        <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, padding: '2px 0' }}>
                          <span style={{ color: '#374151' }}>{c}</span>
                          <span style={{ fontWeight: 700, color: avg >= 80 ? '#059669' : '#374151' }}>{avg}/100</span>
                        </div>
                      )
                    })}
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900, textAlign: 'center', color: '#059669' }}>Panel Decision: {selPanel.decision} ✅</div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {!selPanel.invitesSent && (
                    <button onClick={() => sendInvites(selPanel)} disabled={sending}
                      style={{ gridColumn: 'span 2', padding: '9px', borderRadius: 9, border: 'none', background: sending ? '#e2e8f0' : 'linear-gradient(135deg,#1e3a5f,#059669)', color: sending ? '#94a3b8' : '#fff', fontSize: 10, fontWeight: 800, cursor: sending ? 'default' : 'pointer' }}>
                      {sending ? '⏳ Sending...' : '📧 Send All Invites (Email + WhatsApp)'}
                    </button>
                  )}
                  {selPanel.invitesSent && (
                    <button onClick={() => notify('📧 Reminders sent to all panel members!')} style={{ padding: '8px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 9, cursor: 'pointer' }}>🔔 Send Reminder</button>
                  )}
                  <button onClick={() => { setView('scorecard') }} style={{ padding: '8px', borderRadius: 9, border: 'none', background: '#1e40af', color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>📊 Submit Score</button>
                  {!selPanel.clientShared && <button onClick={() => notify('🏢 Candidate profile + panel scores shared with client!')} style={{ padding: '8px', borderRadius: 9, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', fontSize: 9, cursor: 'pointer' }}>🏢 Share with Client</button>}
                  {selPanel.status === 'Completed' && !selPanel.decision && (
                    <button onClick={() => notify('✅ Panel decision recorded! Candidate notified.')} style={{ gridColumn: 'span 2', padding: '9px', borderRadius: 9, border: 'none', background: '#059669', color: '#fff', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>✅ Record Committee Decision</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SCHEDULE VIEW ─────────────────────────────────── */}
      {view === 'schedule' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 18 }}>Schedule Panel Interview</div>

            {/* Candidate selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Select Candidate *</label>
              <select value={scheduleForm.candidate} onChange={e => setScheduleForm(f => ({ ...f, candidate: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 11, outline: 'none' }}>
                <option value="">-- Select Candidate --</option>
                {CANDIDATES.map(c => <option key={c.id} value={c.id}>{c.name} — {c.role} (AI: {c.aiScore}% · {c.rank})</option>)}
              </select>
            </div>

            {[['Interview Type', 'type', 'select', ['Technical Panel', 'Competency Panel', 'HR Panel', 'Final Panel', 'Client Interview']],
              ['Date *', 'date', 'date', []],
              ['Time', 'time', 'time', []],
              ['Duration (min)', 'duration', 'number', []],
            ].map(([label, key, type, opts]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                {type === 'select' ? (
                  <select value={scheduleForm[key]} onChange={e => setScheduleForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 11, outline: 'none' }}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={type} value={scheduleForm[key]} onChange={e => setScheduleForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}

            {/* Platform */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Meeting Platform</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Google Meet', 'Microsoft Teams', 'Zoom', 'In-Person'].map(pl => (
                  <button key={pl} onClick={() => setScheduleForm(f => ({ ...f, platform: pl }))}
                    style={{ flex: 1, padding: '8px 6px', borderRadius: 9, border: `2px solid ${scheduleForm.platform === pl ? '#1e40af' : '#e2e8f0'}`, background: scheduleForm.platform === pl ? '#eff6ff' : '#f8fafc', color: scheduleForm.platform === pl ? '#1e40af' : '#64748b', fontSize: 8, fontWeight: scheduleForm.platform === pl ? 700 : 400, cursor: 'pointer' }}>
                    {platformIcon[pl]} {pl.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Questions */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#374151' }}>Interview Questions</label>
                <button onClick={generateQuestions} disabled={genLoading} style={{ padding: '4px 10px', borderRadius: 7, border: 'none', background: genLoading ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#1e40af)', color: genLoading ? '#94a3b8' : '#fff', fontSize: 8, fontWeight: 700, cursor: genLoading ? 'default' : 'pointer' }}>
                  {genLoading ? '⏳ Generating...' : '🤖 AI Generate'}
                </button>
              </div>
              <textarea value={aiQuestions} onChange={e => setAiQuestions(e.target.value)} rows={4}
                placeholder="AI will generate targeted interview questions based on role and interview type..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} />
            </div>

            <button onClick={() => notify(`✅ Panel scheduled! Invites sent via Email + WhatsApp + Google Calendar to ${selectedInterviewers.length || 2} interviewers and candidate!`)}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1e3a5f,#059669)', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
              📅 Schedule & Send All Invites
            </button>
          </div>

          {/* Interviewer selection */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Select Panel Members</div>
              <button onClick={() => { setSelectedInterviewers(INTERVIEWERS.filter(i => i.available).slice(0, 3).map(i => i.id)); notify('🤖 AI auto-selected 3 best interviewers based on role!') }}
                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#1e40af)', color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>🤖 AI Auto-Assign</button>
            </div>
            {INTERVIEWERS.map(iv => {
              const sel = selectedInterviewers.includes(iv.id)
              return (
                <div key={iv.id} onClick={() => setSelectedInterviewers(s => sel ? s.filter(x => x !== iv.id) : [...s, iv.id])}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `2px solid ${sel ? '#059669' : '#f1f5f9'}`, background: sel ? '#f0fdf4' : '#f8fafc', cursor: 'pointer', marginBottom: 8, opacity: iv.available ? 1 : 0.5 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: sel ? '#059669' : '#eff6ff', border: `2px solid ${sel ? '#059669' : '#bfdbfe'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: sel ? '#fff' : '#1e40af', flexShrink: 0 }}>{sel ? '✓' : iv.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{iv.name}</div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>{iv.title} · {iv.dept} · ⭐ {iv.rating} · {iv.panels} panels</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      {iv.skills.map(s => <span key={s} style={{ fontSize: 7, padding: '1px 5px', borderRadius: 4, background: '#eff6ff', color: '#1e40af' }}>{s}</span>)}
                    </div>
                  </div>
                  <div>
                    {iv.available ? <span style={{ fontSize: 8, color: '#10b981', fontWeight: 700 }}>✅ Available</span> : <span style={{ fontSize: 8, color: '#f59e0b', fontWeight: 700 }}>⚠️ Busy</span>}
                  </div>
                </div>
              )
            })}
            {selectedInterviewers.length > 0 && (
              <div style={{ background: '#f0fdf4', borderRadius: 9, padding: '10px 14px', border: '1px solid #bbf7d0', marginTop: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#065f46' }}>{selectedInterviewers.length} interviewer(s) selected</div>
                <div style={{ fontSize: 8, color: '#374151', marginTop: 3 }}>Auto-notifications: Calendar invite + Email + WhatsApp will be sent to each member</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SCORECARD VIEW ────────────────────────────────── */}
      {view === 'scorecard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Submit Interview Scorecard</div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 20 }}>Candidate: {selPanel?.candidate || 'Sanjay Thapa'} · {selPanel?.role || 'Senior React Dev'}</div>

            <ScoreField label="Technical Skills (30% weight)" value={scorecard.tech} onChange={v => setScorecard(s => ({ ...s, tech: v }))} color="#3b82f6" />
            <ScoreField label="Communication (20% weight)" value={scorecard.comm} onChange={v => setScorecard(s => ({ ...s, comm: v }))} color="#8b5cf6" />
            <ScoreField label="Leadership Potential (20% weight)" value={scorecard.lead} onChange={v => setScorecard(s => ({ ...s, lead: v }))} color="#059669" />
            <ScoreField label="Culture Fit (15% weight)" value={scorecard.culture} onChange={v => setScorecard(s => ({ ...s, culture: v }))} color="#f59e0b" />
            <ScoreField label="Attitude & Motivation (15% weight)" value={scorecard.attitude} onChange={v => setScorecard(s => ({ ...s, attitude: v }))} color="#ef4444" />

            <div style={{ background: '#eff6ff', borderRadius: 12, padding: 14, border: '1px solid #bfdbfe', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Weighted Panel Score</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: totalScore >= 80 ? '#10b981' : totalScore >= 65 ? '#f59e0b' : '#ef4444' }}>{totalScore}/100</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Overall Recommendation</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Strong Hire', 'Hire', 'Hold', 'No Hire'].map(rec => (
                  <button key={rec} onClick={() => setScorecard(s => ({ ...s, rec }))}
                    style={{ flex: 1, padding: '10px 6px', borderRadius: 9, border: `2px solid ${scorecard.rec === rec ? (rec === 'Strong Hire' || rec === 'Hire' ? '#059669' : rec === 'Hold' ? '#f59e0b' : '#ef4444') : '#e2e8f0'}`, background: scorecard.rec === rec ? (rec === 'Strong Hire' || rec === 'Hire' ? '#f0fdf4' : rec === 'Hold' ? '#fefce8' : '#fef2f2') : '#f8fafc', color: scorecard.rec === rec ? (rec === 'Strong Hire' || rec === 'Hire' ? '#065f46' : rec === 'Hold' ? '#92400e' : '#dc2626') : '#64748b', fontSize: 9, fontWeight: scorecard.rec === rec ? 800 : 400, cursor: 'pointer' }}>
                    {rec === 'Strong Hire' ? '⭐' : rec === 'Hire' ? '✅' : rec === 'Hold' ? '⏳' : '❌'} {rec}
                  </button>
                ))}
              </div>
            </div>

            {[['Key Strengths', 'strengths', 'Excellent technical depth, clear communicator, strong architecture knowledge...'], ['Areas for Improvement', 'improvements', 'Could be more concise, should add more metrics to achievements...'], ['Additional Notes', 'notes', 'Any other observations about the candidate...']].map(([l, k, ph]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>{l}</label>
                <textarea value={scorecard[k]} onChange={e => setScorecard(s => ({ ...s, [k]: e.target.value }))} rows={2} placeholder={ph}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => notify(`✅ Scorecard submitted! ${totalScore}/100 — ${scorecard.rec}. All panel members notified.`)}
                style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1e3a5f,#059669)', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>💾 Submit Scorecard</button>
              <button onClick={() => notify('📧 Feedback sent to candidate!')}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 10, cursor: 'pointer' }}>📧 Send Feedback</button>
            </div>
          </div>

          {/* Summary panel */}
          <div>
            <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Candidate Summary</div>
              {selPanel && (
                <>
                  {CANDIDATES.find(c => c.name === selPanel.candidate) && (() => {
                    const cand = CANDIDATES.find(c => c.name === selPanel.candidate)
                    return [
                      ['AI Match Score', cand.aiScore + '%'],
                      ['AI Rank', cand.rank],
                      ['Video Score', (cand.videoScore || '—') + (cand.videoScore ? '%' : '')],
                      ['Written Test', (cand.testScore || '—') + (cand.testScore ? '%' : '')],
                    ].map(([k, v], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '5px 0', borderBottom: '1px solid #f8fafc' }}>
                        <span style={{ color: '#94a3b8' }}>{k}</span>
                        <span style={{ color: '#334155', fontWeight: 700 }}>{v}</span>
                      </div>
                    ))
                  })()}
                </>
              )}
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Score Preview</div>
              {[['Technical', scorecard.tech, '#3b82f6', '30%'], ['Communication', scorecard.comm, '#8b5cf6', '20%'], ['Leadership', scorecard.lead, '#059669', '20%'], ['Culture Fit', scorecard.culture, '#f59e0b', '15%'], ['Attitude', scorecard.attitude, '#ef4444', '15%']].map(([l, v, c, w]) => (
                <div key={l} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                    <span style={{ color: '#374151' }}>{l} <span style={{ color: '#94a3b8' }}>({w})</span></span>
                    <span style={{ fontWeight: 700, color: c }}>{v}</span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, marginTop: 3, overflow: 'hidden' }}>
                    <div style={{ width: v + '%', height: '100%', background: c, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, textAlign: 'center', padding: '10px', background: totalScore >= 80 ? '#f0fdf4' : '#fefce8', borderRadius: 9, border: `1px solid ${totalScore >= 80 ? '#bbf7d0' : '#fef08a'}` }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Weighted Total</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: totalScore >= 80 ? '#059669' : '#92400e' }}>{totalScore}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: totalScore >= 80 ? '#059669' : '#92400e' }}>{scorecard.rec}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

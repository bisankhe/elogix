// FILE: ATSAutoShortlistPage.jsx — AI Auto Shortlist Engine
// Takes CV score + Written exam score + Video interview score
// → Weights → AI ranks → Top 3–10 → Auto physical/virtual interview invite
import { useState, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

async function callAI(prompt, sys) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1200,
        system: sys || 'You are a world-class AI recruitment analyst.', messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(25000)
    })
    if (r.ok) { const d = await r.json(); return d.content?.map(c => c.text).join('') || '' }
  } catch {}
  return null

const JOB_POSITIONS = [
  { id: 'j1', title: 'Senior React Developer', dept: 'Technology', minAge: 22, maxAge: 45, minExp: 4, openings: 2 },
  { id: 'j2', title: 'Finance Manager', dept: 'Finance', minAge: 25, maxAge: 50, minExp: 5, openings: 1 },
  { id: 'j3', title: 'HR Business Partner', dept: 'HR', minAge: 24, maxAge: 45, minExp: 4, openings: 1 },
]

const ALL_CANDIDATES = [
  { id: 'c1', name: 'Gita Maharjan',    role: 'React Developer',      age: 30, ageOK: true,  cv: { score: 94, rank: 'Gold',   match: 92 }, exam: { score: 92, grade: 'A',  time: '68m' }, video: { score: 88, confidence: 87, clarity: 91 }, source: 'LinkedIn' },
  { id: 'c2', name: 'Anil KC',          role: 'Senior Engineer',       age: 33, ageOK: true,  cv: { score: 90, rank: 'Gold',   match: 88 }, exam: { score: 84, grade: 'B+', time: '71m' }, video: { score: 86, confidence: 85, clarity: 88 }, source: 'Company Portal' },
  { id: 'c3', name: 'Rajan Shrestha',   role: 'Full Stack Developer',  age: 31, ageOK: true,  cv: { score: 86, rank: 'Silver', match: 86 }, exam: { score: 88, grade: 'B+', time: '82m' }, video: { score: 82, confidence: 79, clarity: 86 }, source: 'Indeed' },
  { id: 'c4', name: 'Priya Tamang',     role: 'Frontend Developer',    age: 28, ageOK: true,  cv: { score: 80, rank: 'Silver', match: 78 }, exam: { score: 79, grade: 'B',  time: '87m' }, video: { score: 76, confidence: 72, clarity: 80 }, source: 'Naukri' },
  { id: 'c5', name: 'Bikash Tamang',    role: 'Software Developer',    age: 26, ageOK: true,  cv: { score: 70, rank: 'Bronze', match: 68 }, exam: { score: 65, grade: 'C',  time: '90m' }, video: { score: 70, confidence: 68, clarity: 72 }, source: 'Facebook' },
  { id: 'c6', name: 'Sunita Rai',       role: 'Junior Developer',      age: 24, ageOK: true,  cv: { score: 62, rank: 'Bronze', match: 60 }, exam: { score: 58, grade: 'C',  time: '90m' }, video: { score: 62, confidence: 60, clarity: 64 }, source: 'MeroJob' },
  { id: 'c7', name: 'Anita Gurung',     role: 'Junior Designer',       age: 19, ageOK: false, cv: { score: 48, rank: 'Reject', match: 45 }, exam: { score: null, grade: null, time: null }, video: { score: null, confidence: null, clarity: null }, source: 'Portal', rejectionReason: 'Age 19 below minimum 22' },
  { id: 'c8', name: 'Dev Maharjan',     role: 'DevOps Engineer',       age: 29, ageOK: true,  cv: { score: 76, rank: 'Silver', match: 72 }, exam: { score: 74, grade: 'B',  time: '77m' }, video: { score: 68, confidence: 65, clarity: 72 }, source: 'GitHub' },
]

function weightedScore(c, w) {
  if (!c.ageOK) return 0
  const cv = c.cv.match || 0
  const ex = c.exam.score || 0
  const vi = c.video.score || 0
  return Math.round(cv * w.cv / 100 + ex * w.exam / 100 + vi * w.video / 100)

const rankColor = { Gold: '#f59e0b', Silver: '#94a3b8', Bronze: '#b45309', Reject: '#ef4444' }
const rankBg    = { Gold: '#fef9c3', Silver: '#f1f5f9', Bronze: '#fff7ed', Reject: '#fef2f2' }

export default function ATSAutoShortlistPage() {
  const { navigate } = useApp()
  const [selJob, setSelJob] = useState(JOB_POSITIONS[0])
  const [shortlistN, setShortlistN] = useState(5)
  const [weights, setWeights] = useState({ cv: 30, exam: 40, video: 30 })
  const [aiRanking, setAiRanking] = useState('')
  const [ranking, setRanking] = useState(false)
  const [inviteSent, setInviteSent] = useState({})
  const [interviewType, setInterviewType] = useState('Physical')
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewTime, setInterviewTime] = useState('10:00')
  const [interviewVenue, setInterviewVenue] = useState('eLogix Office, Kathmandu')
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('engine') // engine | shortlist | invite | history

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  // Weight validation: keep sum to 100
  const setWeight = (key, val) => {
    const others = Object.keys(weights).filter(k => k !== key)
    const remaining = 100 - val
    const each = Math.floor(remaining / others.length)
    setWeights(w => ({ ...w, [key]: val, [others[0]]: each, [others[1]]: remaining - each }))

  const sorted = [...ALL_CANDIDATES].map(c => ({ ...c, composite: weightedScore(c, weights) })).sort((a, b) => b.composite - a.composite)
  const eligible   = sorted.filter(c => c.ageOK && c.composite > 0)
  const shortlisted = eligible.slice(0, shortlistN)
  const waitlisted  = eligible.slice(shortlistN)
  const rejected    = sorted.filter(c => !c.ageOK || c.composite === 0)

  const runAIRanking = async () => {
    setRanking(true)
    const summary = shortlisted.map((c, i) => `${i + 1}. ${c.name}: CV ${c.cv.match}%, Exam ${c.exam.score || 0}%, Video ${c.video.score || 0}%, Composite ${c.composite}%`).join('\n')
    const resp = await callAI(
      `Rank these top ${shortlistN} candidates for ${selJob.title}. Provide your AI selection rationale:\n\n${summary}\n\nWeights: CV=${weights.cv}%, Written Exam=${weights.exam}%, Video=${weights.video}%.\n\nIn 3-4 sentences, explain your top 3 selection and any notable candidates to watch.`,
      'You are an expert AI recruitment analyst making data-driven hiring recommendations.'
    )
    setAiRanking(resp || 'AI analysis: Candidates ranked by composite score. Top candidates show strong alignment across all three evaluation dimensions.')
    setRanking(false)

  const sendInterviewInvites = async (candidates) => {
    for (const c of candidates) {
      setInviteSent(s => ({ ...s, [c.id]: 'sending' }))
      await new Promise(r => setTimeout(r, 400))
      setInviteSent(s => ({ ...s, [c.id]: 'sent' }))
    const typeLabel = interviewType === 'Physical' ? 'in-person physical' : 'virtual'
    notify(`✅ ${interviewType} interview invites sent to ${candidates.length} candidates via Email + WhatsApp! Date: ${interviewDate || 'TBD'} at ${interviewTime}`)

  // Candidate row component
  const CandidateRow = ({ c, pos, showInvite = false }) => {
    const score = c.composite
    const rankLabel = score >= 85 ? 'Gold' : score >= 70 ? 'Silver' : score >= 55 ? 'Bronze' : 'Reject'
    const iStat = inviteSent[c.id]
    return (
      <div style={{ background: '#fff', borderRadius: 13, padding: '14px 16px', marginBottom: 9, border: `1.5px solid ${pos <= 3 ? '#fde68a' : '#f1f5f9'}`, boxShadow: '0 1px 5px rgba(0,0,0,.05)', position: 'relative' }}>
        {pos <= 3 && <div style={{ position: 'absolute', top: -8, left: 14, background: '#f59e0b', color: '#fff', fontSize: 8, fontWeight: 900, padding: '2px 8px', borderRadius: 6 }}>#{pos} SHORTLISTED</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Rank badge */}
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: rankBg[rankLabel], border: `2px solid ${rankColor[rankLabel]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
            {pos <= 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos <= shortlistN ? '✅' : '⏳'}
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{c.name}</span>
              <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 7px', borderRadius: 7, background: rankBg[rankLabel], color: rankColor[rankLabel] }}>{rankLabel}</span>
              <span style={{ fontSize: 8, color: '#94a3b8' }}>Age {c.age}</span>
              <span style={{ fontSize: 8, color: '#64748b', padding: '1px 6px', borderRadius: 5, background: '#f1f5f9' }}>{c.source}</span>
            </div>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{c.role}</div>
          </div>

          {/* Score breakdown */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {[{ l: 'CV', v: c.cv.match, c: '#3b82f6' }, { l: 'Exam', v: c.exam.score, c: '#7c3aed' }, { l: 'Video', v: c.video.score, c: '#0891b2' }].map(s => (
              <div key={s.l} style={{ textAlign: 'center', padding: '5px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9', minWidth: 50 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: (s.v || 0) >= 80 ? s.c : '#94a3b8' }}>{s.v || '—'}{s.v ? '%' : ''}</div>
                <div style={{ fontSize: 7, color: '#94a3b8' }}>{s.l}</div>
              </div>
            ))}
            <div style={{ textAlign: 'center', padding: '5px 12px', background: score >= 80 ? '#f0fdf4' : score >= 65 ? '#fefce8' : '#f8fafc', borderRadius: 8, border: `2px solid ${score >= 80 ? '#bbf7d0' : score >= 65 ? '#fef08a' : '#e2e8f0'}`, minWidth: 60 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: score >= 80 ? '#059669' : score >= 65 ? '#92400e' : '#64748b' }}>{score}%</div>
              <div style={{ fontSize: 7, color: '#94a3b8' }}>Composite</div>
            </div>
          </div>

          {/* Actions */}
          {showInvite && c.ageOK && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {iStat === 'sent' ? (
                <span style={{ fontSize: 8, fontWeight: 700, color: '#059669', padding: '5px 10px', background: '#f0fdf4', borderRadius: 7, border: '1px solid #bbf7d0' }}>✅ Invited</span>
              ) : iStat === 'sending' ? (
                <span style={{ fontSize: 8, color: '#7c3aed', padding: '5px 10px' }}>⏳ Sending...</span>
              ) : (
                <button onClick={() => sendInterviewInvites([c])} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: '#1e40af', color: '#fff', fontSize: 8, fontWeight: 700, cursor: 'pointer' }}>📧 Invite</button>
              )}
            </div>
          )}
          {!c.ageOK && (
            <span style={{ fontSize: 8, fontWeight: 700, color: '#dc2626', padding: '4px 8px', background: '#fef2f2', borderRadius: 7, border: '1px solid #fecaca', flexShrink: 0 }}>❌ {c.rejectionReason || 'Age ineligible'}</span>
          )}
        </div>

        {/* Score bars */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
          {[{ l: `CV (${weights.cv}%)`, v: c.cv.match, c: '#3b82f6' }, { l: `Exam (${weights.exam}%)`, v: c.exam.score, c: '#7c3aed' }, { l: `Video (${weights.video}%)`, v: c.video.score, c: '#0891b2' }].map(s => (
            <div key={s.l}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2 }}>
                <span style={{ color: '#94a3b8' }}>{s.l}</span>
                <span style={{ color: s.c, fontWeight: 700 }}>{s.v || 0}%</span>
              </div>
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: (s.v || 0) + '%', height: '100%', background: s.c, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#059669)', borderRadius: 14, padding: '16px 22px', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>AI Auto-Shortlist Engine</h2>
            <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.8 }}>CV + Written Exam + Video Interview → AI composite score → Top 3–10 → Auto physical/virtual interview invite</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {msg && <span style={{ fontSize: 9, padding: '5px 14px', background: 'rgba(255,255,255,.2)', borderRadius: 8 }}>{msg}</span>}
            {[['engine', '⚙️ Engine'], ['shortlist', '🏆 Shortlist'], ['invite', '📅 Invite'], ['history', '📋 History']].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 13px', borderRadius: 8, border: 'none', background: tab === t ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.1)', color: '#fff', fontSize: 9, fontWeight: tab === t ? 800 : 400, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ l: 'Total Pool', v: ALL_CANDIDATES.length, c: '#3b82f6' }, { l: 'Age Eligible', v: ALL_CANDIDATES.filter(c => c.ageOK).length, c: '#10b981' }, { l: 'Shortlisted', v: shortlistN, c: '#f59e0b' }, { l: 'Waitlisted', v: Math.max(0, eligible.length - shortlistN), c: '#8b5cf6' }, { l: 'Auto-Rejected', v: rejected.length, c: '#ef4444' }].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', border: '1px solid #f1f5f9', flex: '1 1 90px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 8, color: '#94a3b8' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── ENGINE CONFIG ── */}
      {tab === 'engine' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
          <div>
            {/* Job selector */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Select Job Position</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {JOB_POSITIONS.map(j => (
                  <button key={j.id} onClick={() => setSelJob(j)} style={{ padding: '8px 16px', borderRadius: 9, border: `2px solid ${selJob.id === j.id ? '#059669' : '#e2e8f0'}`, background: selJob.id === j.id ? '#f0fdf4' : '#f8fafc', color: selJob.id === j.id ? '#065f46' : '#475569', fontSize: 10, fontWeight: selJob.id === j.id ? 800 : 400, cursor: 'pointer' }}>
                    {j.title} <span style={{ opacity: 0.6 }}>({j.openings} opening{j.openings > 1 ? 's' : ''})</span>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 8 }}>Age filter: {selJob.minAge}–{selJob.maxAge} · Min experience: {selJob.minExp} years</div>
            </div>

            {/* Scoring weights */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Evaluation Weights</div>
              <div style={{ fontSize: 9, color: '#64748b', marginBottom: 14 }}>Adjust how much each stage counts toward final composite score (must total 100%)</div>
              {[['cv', 'CV & Resume Score', '#3b82f6'], ['exam', 'Written Exam Score', '#7c3aed'], ['video', 'Video Interview Score', '#0891b2']].map(([k, l, c]) => (
                <div key={k} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5 }}>
                    <span style={{ fontWeight: 700, color: '#334155' }}>{l}</span>
                    <span style={{ fontWeight: 900, color: c, fontSize: 14 }}>{weights[k]}%</span>
                  </div>
                  <input type="range" min="10" max="80" step="5" value={weights[k]} onChange={e => setWeight(k, +e.target.value)} style={{ width: '100%', accentColor: c }} />
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, marginTop: 3, overflow: 'hidden' }}>
                    <div style={{ width: weights[k] + '%', height: '100%', background: c, borderRadius: 3, transition: 'width .3s' }} />
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 10, color: '#374151' }}>Total</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: (weights.cv + weights.exam + weights.video) === 100 ? '#059669' : '#ef4444' }}>{weights.cv + weights.exam + weights.video}%</span>
              </div>
            </div>

            {/* Shortlist count */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Shortlist Size: <span style={{ color: '#059669' }}>Top {shortlistN}</span></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[3, 5, 7, 10].map(n => (
                  <button key={n} onClick={() => setShortlistN(n)} style={{ padding: '8px 18px', borderRadius: 9, border: `2px solid ${shortlistN === n ? '#059669' : '#e2e8f0'}`, background: shortlistN === n ? '#f0fdf4' : '#f8fafc', color: shortlistN === n ? '#065f46' : '#64748b', fontSize: 12, fontWeight: shortlistN === n ? 900 : 400, cursor: 'pointer' }}>Top {n}</button>
                ))}
              </div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 8 }}>Select top {shortlistN} candidates from {eligible.length} eligible pool for physical/virtual interview</div>
            </div>
          </div>

          {/* Preview panel */}
          <div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Live Preview — Top {shortlistN}</div>
              {shortlisted.slice(0, 5).map((c, i) => (
                <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 0', borderBottom: i < 4 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? '#fef9c3' : i === 1 ? '#f1f5f9' : '#fff7ed', border: `2px solid ${i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#b45309'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                    <div style={{ fontSize: 8, color: '#94a3b8' }}>{c.role}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: c.composite >= 80 ? '#059669' : '#f59e0b' }}>{c.composite}%</div>
                </div>
              ))}
              {shortlisted.length > 5 && <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 6 }}>+{shortlisted.length - 5} more shortlisted</div>}
            </div>
            <button onClick={() => { setTab('shortlist'); runAIRanking() }} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1e3a5f,#059669)', color: '#fff', fontSize: 11, fontWeight: 900, cursor: 'pointer', marginBottom: 8 }}>
              🤖 Run AI Shortlist Engine
            </button>
            <button onClick={() => setTab('invite')} style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 10, cursor: 'pointer' }}>
              📅 Go to Interview Invite
            </button>
          </div>
        </div>
      )}

      {/* ── SHORTLIST RESULTS ── */}
      {tab === 'shortlist' && (
        <div>
          {/* AI analysis banner */}
          {(aiRanking || ranking) && (
            <div style={{ background: '#eff6ff', borderRadius: 12, padding: 16, border: '1px solid #bfdbfe', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{ranking ? '⏳' : '🤖'}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#1e40af', marginBottom: 4 }}>AI Ranking Analysis — {selJob.title}</div>
                  <div style={{ fontSize: 10, color: '#334155', lineHeight: 1.7 }}>{ranking ? 'AI is analysing composite scores and generating ranking rationale...' : aiRanking}</div>
                </div>
              </div>
            </div>
          )}

          {/* Shortlisted */}
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            🏆 Top {shortlistN} Shortlisted
            <span style={{ fontSize: 9, fontWeight: 400, color: '#64748b' }}>Auto-selected for physical/virtual interview</span>
            <div style={{ flex: 1 }} />
            <button onClick={runAIRanking} disabled={ranking} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: ranking ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#1e40af)', color: ranking ? '#94a3b8' : '#fff', fontSize: 9, fontWeight: 700, cursor: ranking ? 'default' : 'pointer' }}>
              {ranking ? '⏳ Analysing...' : '🤖 Re-run AI Analysis'}
            </button>
          </div>
          {shortlisted.map((c, i) => <CandidateRow key={c.id} c={c} pos={i + 1} />)}

          {waitlisted.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '18px 0 8px' }}>⏳ Waitlisted ({waitlisted.length})</div>
              {waitlisted.map((c, i) => <CandidateRow key={c.id} c={c} pos={shortlistN + i + 1} />)}
            </>
          )}
          {rejected.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', margin: '18px 0 8px' }}>❌ Auto-Rejected ({rejected.length}) — Age/Experience ineligible</div>
              {rejected.map((c, i) => <CandidateRow key={c.id} c={c} pos={-1} />)}
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => setTab('invite')} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1e3a5f,#059669)', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>📅 Proceed to Interview Invite →</button>
            <button onClick={() => notify(`📧 Rejection emails sent to ${rejected.length} ineligible candidates`)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 10, cursor: 'pointer' }}>📧 Send Rejection Emails</button>
          </div>
        </div>
      )}

      {/* ── INVITE ── */}
      {tab === 'invite' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 18 }}>Schedule Physical / Virtual Interview</div>

            {/* Interview type */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Interview Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Physical', 'Virtual (Google Meet)', 'Virtual (Teams)', 'Virtual (Zoom)', 'Hybrid'].map(t => (
                  <button key={t} onClick={() => setInterviewType(t)} style={{ flex: 1, padding: '9px 6px', borderRadius: 9, border: `2px solid ${interviewType === t ? '#059669' : '#e2e8f0'}`, background: interviewType === t ? '#f0fdf4' : '#f8fafc', color: interviewType === t ? '#065f46' : '#64748b', fontSize: 8, fontWeight: interviewType === t ? 800 : 400, cursor: 'pointer', textAlign: 'center' }}>
                    {t === 'Physical' ? '🏢' : t.includes('Meet') ? '🎥' : t.includes('Teams') ? '💼' : t.includes('Zoom') ? '🔵' : '🔀'}<br />{t}
                  </button>
                ))}
              </div>
            </div>

            {[['Interview Date', 'interviewDate', 'date'], ['Time', 'interviewTime', 'time']].map(([l, k, type]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>{l} *</label>
                <input type={type} value={k === 'interviewDate' ? interviewDate : interviewTime}
                  onChange={e => k === 'interviewDate' ? setInterviewDate(e.target.value) : setInterviewTime(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>{interviewType === 'Physical' ? 'Venue / Address' : 'Meeting Link'}</label>
              <input value={interviewVenue} onChange={e => setInterviewVenue(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Communication checklist */}
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', marginBottom: 18, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#065f46', marginBottom: 8 }}>Auto-Communication Package</div>
              {['📧 Personalised Email with interview details', '💬 WhatsApp message with date/time/venue', '📅 Google Calendar invite with meeting link', '📋 Interview guidelines PDF attachment', '🔔 Reminder email 24h before interview', '🔔 Reminder WhatsApp 2h before interview'].map((item, i) => (
                <div key={i} style={{ fontSize: 9, color: '#374151', padding: '3px 0', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#10b981' }}>✓</span> {item}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => sendInterviewInvites(shortlisted)}
                style={{ flex: 2, padding: '12px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#1e3a5f,#059669)', color: '#fff', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
                📧 Send to All {shortlistN} Shortlisted (Email + WhatsApp + Calendar)
              </button>
            </div>
          </div>

          {/* Shortlist preview with invite status */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Invite Status — Top {shortlistN}</div>
            {shortlisted.map((c, i) => {
              const st = inviteSent[c.id]
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ fontSize: 14, flexShrink: 0 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                    <div style={{ fontSize: 8, color: '#94a3b8' }}>{c.composite}% composite</div>
                  </div>
                  <div>
                    {st === 'sent' ? <span style={{ fontSize: 8, fontWeight: 700, color: '#059669', padding: '3px 8px', background: '#f0fdf4', borderRadius: 6 }}>✅ Invited</span>
                      : st === 'sending' ? <span style={{ fontSize: 8, color: '#f59e0b' }}>⏳...</span>
                        : <span style={{ fontSize: 8, color: '#94a3b8' }}>Pending</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === 'history' && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Previous Shortlisting Cycles</div>
          {[
            { date: '2081-08-15', job: 'Senior React Developer', total: 28, eligible: 21, shortlisted: 5, hired: 2, type: 'Physical', status: 'Completed' },
            { date: '2081-07-20', job: 'Finance Manager', total: 42, eligible: 35, shortlisted: 7, hired: 1, type: 'Virtual (Teams)', status: 'In Progress' },
            { date: '2081-06-10', job: 'Marketing Manager', total: 67, eligible: 58, shortlisted: 10, hired: 1, type: 'Physical', status: 'Completed' },
          ].map((h, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, border: '1px solid #f1f5f9', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{h.job}</div>
                <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{h.date} · {h.type}</div>
              </div>
              {[{ l: 'Total CVs', v: h.total }, { l: 'Eligible', v: h.eligible }, { l: 'Shortlisted', v: h.shortlisted }, { l: 'Hired', v: h.hired }].map((s, j) => (
                <div key={j} style={{ textAlign: 'center', padding: '6px 12px', background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: j === 3 ? '#059669' : '#1e40af' }}>{s.v}</div>
                  <div style={{ fontSize: 8, color: '#94a3b8' }}>{s.l}</div>
                </div>
              ))}
              <span style={{ fontSize: 9, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: h.status === 'Completed' ? '#d1fae5' : '#fef9c3', color: h.status === 'Completed' ? '#065f46' : '#92400e' }}>{h.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

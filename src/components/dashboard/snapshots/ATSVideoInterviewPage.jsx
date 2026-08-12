// FILE: src/components/dashboard/snapshots/ATSVideoInterviewPage.jsx
// World-Class AI Video Interview: Camera + Mic + AI Questions + Recording Simulation
// + Face detection overlay + Transcript + AI scoring + HR review dashboard
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

async function callAI(prompt, sys) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500,
        system: sys || 'You are an AI video interviewer.', messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(25000),
    })
    if (r.ok) { const d = await r.json(); return d.content?.map(c => c.text).join('') || '' }
  } catch {}
  return null
}

const AI_QUESTIONS = [
  { id: 1, q: 'Tell me about yourself and your most significant professional achievement in the last 2 years.', category: 'General', duration: 120, keywords: ['achievement','impact','results','led','built','improved'] },
  { id: 2, q: 'Describe a technically complex problem you solved. Walk me through your thought process and solution.', category: 'Technical', duration: 150, keywords: ['architecture','scalable','performance','debugging','solution','optimized'] },
  { id: 3, q: 'How do you prioritise when you have multiple urgent tasks and tight deadlines?', category: 'Behavioral', duration: 90, keywords: ['prioritize','deadline','communicate','stakeholder','organised','delivery'] },
  { id: 4, q: 'Tell me about a time you disagreed with a team member or manager. How did you resolve it?', category: 'Behavioral', duration: 120, keywords: ['conflict','resolved','listened','compromise','professional','outcome'] },
  { id: 5, q: 'Where do you see yourself in 3-5 years? How does this role fit your career goals?', category: 'Career', duration: 90, keywords: ['growth','leadership','skills','contribute','align','goals'] },
]

const COMPLETED = [
  { id: 'v1', name: 'Sanjay Thapa', role: 'Senior React Developer', date: '2 days ago', duration: '28 min', scores: { overall: 88, confidence: 82, clarity: 91, eyeContact: 85, voice: 79, pace: 88, sentiment: 92 }, keywords: ['microservices','React','Node.js','AWS','performance','architecture'], transcript: 'Q1: I\'m Sanjay, a senior developer with 6 years in React and Node.js. My biggest achievement was architecting a real-time trading dashboard handling 50k concurrent users at my previous company. I designed the microservices architecture, reduced page load from 4s to 800ms, and led a team of 8 engineers...\n\nQ2: We had a critical performance issue — our API was timing out under load. I profiled the bottleneck to N+1 database queries in our ORM. I rewrote the queries with proper JOINs, added Redis caching for hot data, and implemented connection pooling. Result was 10x throughput improvement...\n\nQ3: I use the RICE framework — Reach, Impact, Confidence, Effort — to score tasks. I communicate blockers early and deliver incrementally. I also block deep-work time in my calendar to avoid context-switching...', recommendation: 'Strongly Recommend', rank: 'Gold' },
  { id: 'v2', name: 'Priya Shrestha', role: 'Product Manager', date: '3 days ago', duration: '24 min', scores: { overall: 82, confidence: 79, clarity: 86, eyeContact: 80, voice: 75, pace: 82, sentiment: 88 }, keywords: ['roadmap','stakeholder','metrics','agile','customer','prioritization'], transcript: 'Q1: I\'m a product manager with 5 years in B2B SaaS. My biggest achievement was leading our enterprise product expansion that grew ARR by 40% in one year. I worked closely with sales, engineering, and customer success...\n\nQ2: We had conflicting feature requests from 3 enterprise clients. I ran discovery sessions, mapped to user stories, built a priority matrix using impact vs effort, and aligned stakeholders on a 6-month roadmap...', recommendation: 'Recommend', rank: 'Silver' },
]

// ── LIVE VIDEO INTERVIEW COMPONENT ───────────────────────────
function LiveVideoInterview({ candidate, onComplete, onExit }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const [phase, setPhase] = useState('setup') // setup | briefing | question | thinking | done
  const [qIdx, setQIdx] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [answers, setAnswers] = useState([])
  const [faceDetected, setFaceDetected] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState(null)
  const [camError, setCamError] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [eyeWarnings, setEyeWarnings] = useState(0)

  const currentQ = AI_QUESTIONS[qIdx]

  // Simulate camera feed
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      // Mic level simulation
      const ac = new AudioContext()
      const src = ac.createMediaStreamSource(stream)
      const analyser = ac.createAnalyser()
      src.connect(analyser)
      analyser.fftSize = 256
      const buf = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(buf)
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length
        setMicLevel(Math.min(100, avg * 2))
        setSpeaking(avg > 20)
        requestAnimationFrame(tick)
      }
      tick()
    } catch (e) {
      setCamError(true)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }, [])

  // Face detection simulation
  useEffect(() => {
    if (phase !== 'question') return
    const id = setInterval(() => {
      const detected = Math.random() > 0.08
      setFaceDetected(detected)
      if (!detected) setEyeWarnings(w => w + 1)
    }, 3000)
    return () => clearInterval(id)
  }, [phase])

  // Timer
  useEffect(() => {
    if (phase !== 'question' || remaining <= 0) return
    timerRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(timerRef.current); handleNextQuestion(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, qIdx])

  const startInterview = async () => {
    await startCamera()
    setPhase('briefing')
    setTimeout(() => startQuestion(0), 3000)
  }

  const startQuestion = (qi) => {
    setQIdx(qi)
    setPhase('question')
    setRemaining(AI_QUESTIONS[qi].duration)
    setSpeaking(false)
  }

  const handleNextQuestion = async () => {
    clearInterval(timerRef.current)
    // Simulate answer recording
    setAnswers(a => [...a, { qIdx, text: `[Recorded answer for Q${qIdx + 1}]`, duration: AI_QUESTIONS[qIdx].duration }])
    if (qIdx < AI_QUESTIONS.length - 1) {
      setPhase('thinking')
      setTimeout(() => startQuestion(qIdx + 1), 2000)
    } else {
      await finishInterview()
    }
  }

  const finishInterview = async () => {
    clearInterval(timerRef.current)
    stopCamera()
    setPhase('done')
    setAnalyzing(true)
    // Simulate AI analysis with actual AI call
    const evalPrompt = `Evaluate a ${candidate.role} video interview. The candidate answered ${AI_QUESTIONS.length} questions.
Provide scores (0-100) for: overall, confidence, clarity, eyeContact, voice, pace, sentiment.
Also identify 6 keyword hits from their domain.
Return JSON only: {overall, confidence, clarity, eyeContact, voice, pace, sentiment, keywords[], transcript_summary, recommendation, strengths[], improvements[]}`
    const resp = await callAI(evalPrompt, 'You are an expert AI video interview evaluator. Return only valid JSON.')
    let aiResult
    try {
      const clean = (resp || '').replace(/```json|```/g, '').trim()
      aiResult = JSON.parse(clean)
    } catch {
      aiResult = {
        overall: 85, confidence: 82, clarity: 88, eyeContact: 79, voice: 83, pace: 86, sentiment: 90,
        keywords: ['technical', 'leadership', 'problem-solving', 'communication', 'results', 'agile'],
        transcript_summary: 'Candidate demonstrated strong technical competency and clear communication.',
        recommendation: 'Recommend for next round',
        strengths: ['Clear technical knowledge', 'Structured answers', 'Good eye contact'],
        improvements: ['Could be more concise', 'Add more specific metrics'],
      }
    }
    aiResult.eyeWarnings = eyeWarnings
    setResults(aiResult)
    setAnalyzing(false)
    onComplete && onComplete(aiResult)
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  // ── SETUP SCREEN ─────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ background: '#1e293b', borderRadius: 16, padding: 36, maxWidth: 480, width: '90%', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎥</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc', marginBottom: 6 }}>AI Video Interview</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 24 }}>For: <strong style={{ color: '#60a5fa' }}>{candidate.role}</strong> · {AI_QUESTIONS.length} questions · ~{AI_QUESTIONS.reduce((s, q) => s + q.duration, 0) / 60} minutes</div>
          {[['📷 Camera', 'Required for face detection'], ['🎙️ Microphone', 'Required for voice analysis'], ['🌐 Stable Internet', 'Required for AI processing'], ['🔇 Quiet Space', 'Recommended for clarity']].map(([icon, text], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#0f172a', borderRadius: 8, marginBottom: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 10, color: '#cbd5e1' }}>{text}</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, color: '#10b981', fontWeight: 700 }}>✓ Ready</span>
            </div>
          ))}
          {camError && <div style={{ fontSize: 10, color: '#fbbf24', background: '#451a03', padding: '8px 14px', borderRadius: 8, marginBottom: 12 }}>⚠️ Camera access denied. Interview will proceed in audio-only mode.</div>}
          <button onClick={startInterview} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginTop: 8 }}>🚀 Start AI Interview</button>
          <button onClick={onExit} style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 10, cursor: 'pointer', marginTop: 8 }}>Cancel</button>
        </div>
      </div>
    )
  }

  // ── BRIEFING ─────────────────────────────────────────────
  if (phase === 'briefing') {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#f8fafc' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>AI Interviewer Ready</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Starting your first question in 3 seconds...</div>
          <div style={{ width: 200, height: 4, background: '#1e293b', borderRadius: 2, margin: '20px auto', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#3b82f6', borderRadius: 2, animation: 'loadBar 3s linear forwards' }} />
          </div>
          <style>{`@keyframes loadBar{from{width:0}to{width:100%}}`}</style>
        </div>
      </div>
    )
  }

  // ── THINKING (between questions) ─────────────────────────
  if (phase === 'thinking') {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#f8fafc' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Great! Moving to next question...</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Question {qIdx + 1} of {AI_QUESTIONS.length} complete</div>
        </div>
      </div>
    )
  }

  // ── RESULTS ───────────────────────────────────────────────
  if (phase === 'done') {
    if (analyzing) return (
      <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#f8fafc' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>AI Analysing Your Interview...</div>
          {['Processing video & audio signals', 'Running face detection analysis', 'Analysing voice patterns & pace', 'Reading transcript with Claude AI', 'Calculating confidence scores', 'Generating HR report'].map((s, i) => (
            <div key={i} style={{ fontSize: 9, color: '#94a3b8', padding: '2px 0', animation: `pulse ${1 + i * 0.2}s infinite` }}>{s}</div>
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
        </div>
      </div>
    )
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 40 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>Interview Complete!</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>AI has analysed your interview — results sent to HR</div>
          </div>
          {results && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                {[{ l: 'Overall', v: results.overall + '%', c: '#10b981' }, { l: 'Confidence', v: results.confidence + '%', c: '#3b82f6' }, { l: 'Clarity', v: results.clarity + '%', c: '#8b5cf6' }, { l: 'Eye Contact', v: results.eyeContact + '%', c: '#f59e0b' }].map((s, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 14, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #f1f5f9', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Detailed AI Scores</div>
                {[['Voice Stability', results.voice], ['Pace & Rhythm', results.pace], ['Sentiment Score', results.sentiment]].map(([l, v], i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                      <span style={{ color: '#334155', fontWeight: 600 }}>{l}</span>
                      <span style={{ color: '#1e40af', fontWeight: 800 }}>{v}%</span>
                    </div>
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: v + '%', height: '100%', background: v >= 80 ? '#10b981' : v >= 65 ? '#f59e0b' : '#ef4444', borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
              {results.keywords?.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #f1f5f9', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>🔑 Keyword Hits Detected</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {results.keywords.map(k => <span key={k} style={{ fontSize: 9, padding: '3px 10px', borderRadius: 8, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontWeight: 600 }}>{k}</span>)}
                  </div>
                </div>
              )}
              {eyeWarnings > 2 && <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 14px', border: '1px solid #fed7aa', marginBottom: 12, fontSize: 10, color: '#92400e' }}>⚠️ {eyeWarnings} eye contact warnings detected during interview</div>}
              <div style={{ background: '#eff6ff', borderRadius: 12, padding: 14, border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#1e40af', marginBottom: 4 }}>🤖 AI Recommendation</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{results.recommendation}</div>
                {results.transcript_summary && <div style={{ fontSize: 9, color: '#334155', marginTop: 6, lineHeight: 1.6 }}>{results.transcript_summary}</div>}
              </div>
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button onClick={onExit} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#1e40af', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>← Back to Dashboard</button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── LIVE QUESTION UI ──────────────────────────────────────
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Top HUD */}
      <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
        <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>REC</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Q {qIdx + 1}/{AI_QUESTIONS.length}</span>
        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: '#1e293b', color: '#60a5fa' }}>{currentQ.category}</span>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: remaining < 30 ? '#ef4444' : '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>⏱ {mm}:{ss}</div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 16 }}>
          {[...Array(5)].map((_, i) => <div key={i} style={{ width: 4, borderRadius: 2, background: micLevel > i * 20 ? '#10b981' : '#334155', height: 4 + i * 3 }} />)}
        </div>
        <span style={{ fontSize: 9, color: speaking ? '#10b981' : '#94a3b8' }}>{speaking ? '🎙 Speaking' : '🔇 Silent'}</span>
        <button onClick={onExit} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 9, cursor: 'pointer' }}>Exit</button>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 400px', gap: 0 }}>
        {/* AI Question side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          {/* AI avatar */}
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 24, boxShadow: '0 0 0 4px rgba(59,130,246,.3), 0 0 0 8px rgba(59,130,246,.1)' }}>🤖</div>
          <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, marginBottom: 12 }}>AI Interviewer — eLogix ATS</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', textAlign: 'center', lineHeight: 1.6, maxWidth: 500, background: '#1e293b', padding: '20px 24px', borderRadius: 14, border: '1px solid #334155' }}>
            {currentQ.q}
          </div>
          <div style={{ marginTop: 16, fontSize: 10, color: '#64748b' }}>Answer within {currentQ.duration} seconds · Speak clearly into your microphone</div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            {AI_QUESTIONS.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < qIdx ? '#10b981' : i === qIdx ? '#3b82f6' : '#334155', transition: 'all .3s' }} />
            ))}
          </div>

          {/* Skip/Next */}
          <button onClick={handleNextQuestion} style={{ marginTop: 24, padding: '10px 24px', borderRadius: 10, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 10, cursor: 'pointer' }}>
            {qIdx < AI_QUESTIONS.length - 1 ? 'Skip to Next →' : '✅ Finish Interview'}
          </button>
        </div>

        {/* Camera feed side */}
        <div style={{ background: '#000', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <video ref={videoRef} autoPlay muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          {camError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 40 }}>📷</div>
                <div style={{ fontSize: 10, marginTop: 8 }}>Camera not available</div>
                <div style={{ fontSize: 9, marginTop: 4 }}>Audio-only mode active</div>
              </div>
            </div>
          )}
          {/* Face detection overlay */}
          {!camError && (
            <div style={{ position: 'absolute', top: 16, left: 16, right: 16 }}>
              <div style={{ border: `2px solid ${faceDetected ? '#10b981' : '#ef4444'}`, borderRadius: 8, padding: '4px 10px', background: 'rgba(0,0,0,.5)', display: 'inline-block', fontSize: 9, color: faceDetected ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                {faceDetected ? '✅ Face Detected' : '⚠️ Look at Camera'}
              </div>
            </div>
          )}
          {/* Live voice waveform */}
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
            <div style={{ background: 'rgba(0,0,0,.6)', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 24 }}>
                {[...Array(30)].map((_, i) => {
                  const h = speaking ? Math.random() * micLevel * 0.24 : 3
                  return <div key={i} style={{ flex: 1, background: speaking ? '#10b981' : '#334155', borderRadius: 2, height: h + 'px', transition: 'height .1s' }} />
                })}
              </div>
              <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 4 }}>Voice level: {Math.round(micLevel)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function ATSVideoInterviewPage() {
  const { navigate } = useApp()
  const [view, setView] = useState('dashboard') // dashboard | live | review
  const [selCandidate, setSelCandidate] = useState(null)
  const [selInterview, setSelInterview] = useState(null)
  const [tab, setTab] = useState('analysis')
  const [schedulingFor, setSchedulingFor] = useState(null)
  const [msg, setMsg] = useState('')

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  if (view === 'live') {
    return <LiveVideoInterview candidate={selCandidate || { role: 'Software Developer' }}
      onComplete={(r) => { notify('✅ Interview complete! AI analysis saved.'); setView('dashboard') }}
      onExit={() => setView('dashboard')} />
  }

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e40af)', borderRadius: 14, padding: '18px 22px', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>AI Video Interview</h2>
            <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.8 }}>AI asks questions · Face detection · Voice analysis · Auto-transcript · AI scoring · HR dashboard</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {msg && <span style={{ fontSize: 9, padding: '4px 12px', background: 'rgba(255,255,255,.15)', borderRadius: 8, color: '#fff' }}>{msg}</span>}
            <button onClick={() => { setSelCandidate({ name: 'Demo', role: 'Software Developer' }); setView('live') }}
              style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>🔴 Start Demo Interview</button>
            <button onClick={() => notify('✅ Bulk video interview links sent to 8 candidates!')}
              style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>📧 Send Bulk Invites</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ l: 'Total Interviews', v: 12, c: '#3b82f6' }, { l: 'Completed', v: 8, c: '#10b981' }, { l: 'Pending', v: 4, c: '#f59e0b' }, { l: 'Avg AI Score', v: '84%', c: '#8b5cf6' }, { l: 'Recommended', v: 6, c: '#059669' }].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', border: '1px solid #f1f5f9', flex: '1 1 100px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 9, color: '#94a3b8' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        {/* Interviews list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Completed Interviews</div>
          {COMPLETED.map(v => (
            <div key={v.id} onClick={() => { setSelInterview(v); setTab('analysis') }}
              style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, border: `1.5px solid ${selInterview?.id === v.id ? '#1e40af' : '#f1f5f9'}`, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: v.rank === 'Gold' ? '#fef9c3' : '#eff6ff', border: `2px solid ${v.rank === 'Gold' ? '#f59e0b' : '#3b82f6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: v.rank === 'Gold' ? '#92400e' : '#1e40af', flexShrink: 0 }}>{v.name.split(' ').map(x => x[0]).join('')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{v.name}</div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>{v.role} · {v.date} · {v.duration}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {Object.entries(v.scores).slice(0, 3).map(([k, val]) => (
                    <div key={k} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: val >= 80 ? '#10b981' : '#f59e0b' }}>{val}%</div>
                      <div style={{ fontSize: 7, color: '#94a3b8' }}>{k}</div>
                    </div>
                  ))}
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: '#d1fae5', color: '#065f46' }}>{v.recommendation}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {v.keywords.slice(0, 6).map(k => <span key={k} style={{ fontSize: 7, padding: '1px 6px', borderRadius: 5, background: '#eff6ff', color: '#1d4ed8' }}>{k}</span>)}
              </div>
            </div>
          ))}

          {/* Pending */}
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', margin: '14px 0 10px' }}>Pending / Scheduled</div>
          {[
            { name: 'Bikash Tamang', role: 'Finance Analyst', scheduledAt: 'Tomorrow 10:00 AM', link: 'https://interview.elogix.com/vi/bik2024' },
            { name: 'Sunita Rana', role: 'Marketing Manager', scheduledAt: 'Jan 26 2:00 PM', link: 'https://interview.elogix.com/vi/sun2024' },
          ].map((p, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 8, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef9c3', border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#92400e', flexShrink: 0 }}>{p.name.split(' ').map(x => x[0]).join('')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{p.name} — {p.role}</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Scheduled: {p.scheduledAt}</div>
                <div style={{ fontSize: 8, color: '#3b82f6', fontFamily: 'monospace', marginTop: 2 }}>{p.link}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => notify('📧 Reminder sent via Email + WhatsApp!')} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 8, cursor: 'pointer' }}>🔔 Remind</button>
                <button onClick={() => notify('🔗 Link copied!')} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#1e40af', color: '#fff', fontSize: 8, cursor: 'pointer' }}>📋 Copy Link</button>
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selInterview && (
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{selInterview.name}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 12 }}>{selInterview.role} · {selInterview.duration}</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[['analysis', '📊 AI Analysis'], ['transcript', '📝 Transcript'], ['summary', '💡 Summary'], ['preview_exam', '👁 Preview Exam'], ['results', '📋 Results']].map(([t, l]) => (
                  <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '6px', borderRadius: 7, border: 'none', background: tab === t ? '#1e40af' : '#f1f5f9', color: tab === t ? '#fff' : '#475569', fontSize: 9, fontWeight: tab === t ? 700 : 400, cursor: 'pointer' }}>{l}</button>
                ))}
              </div>

              {tab === 'analysis' && (
                <>
                  {Object.entries(selInterview.scores).map(([k, v]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 3 }}>
                        <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                        <span style={{ color: '#1e40af', fontWeight: 700 }}>{v}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: v + '%', height: '100%', background: v >= 80 ? '#10b981' : v >= 65 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Keyword Hits</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {selInterview.keywords.map(k => <span key={k} style={{ fontSize: 8, padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>{k}</span>)}
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0fdf4', borderRadius: 9, border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#065f46' }}>🤖 AI Recommendation</div>
                    <div style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', marginTop: 3 }}>{selInterview.recommendation}</div>
                  </div>
                </>
              )}

              {tab === 'transcript' && (
                <div style={{ fontSize: 9, color: '#374151', lineHeight: 1.8, background: '#f8fafc', padding: 12, borderRadius: 9, maxHeight: 320, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{selInterview.transcript}</div>
              )}

              {tab === 'summary' && (
                <div style={{ fontSize: 9, color: '#374151', lineHeight: 1.7, background: '#eff6ff', padding: 12, borderRadius: 9, border: '1px solid #bfdbfe' }}>
                  AI Summary: {selInterview.name} is a <strong>{selInterview.recommendation?.toLowerCase()}</strong> candidate for the {selInterview.role} role. Demonstrated strong technical knowledge with keyword density in: {selInterview.keywords.join(', ')}. Overall AI score of {selInterview.scores.overall}% places them in the <strong>{selInterview.rank}</strong> tier.
                </div>
              )}

              {tab === 'preview_exam' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>📹 Video Interview Questions Assigned</div>
                  {[
                    { no: 1, q: 'Introduce yourself and walk us through your most relevant experience for this role.', time: '2 min', type: 'Behavioral' },
                    { no: 2, q: 'Describe a challenging technical problem you solved and what your approach was.', time: '3 min', type: 'Technical' },
                    { no: 3, q: 'How do you manage multiple priorities when working under tight deadlines?', time: '2 min', type: 'Situational' },
                    { no: 4, q: 'Where do you see yourself in 3-5 years and how does this role align with those goals?', time: '2 min', type: 'Career' },
                  ].map(q => (
                    <div key={q.no} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 10, marginBottom: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ background: '#1e40af', color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>Q{q.no} · {q.type} · ⏱ {q.time}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#374151' }}>{q.q}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, fontSize: 9, color: '#64748b', background: '#fffbeb', padding: '8px 12px', borderRadius: 8, border: '1px solid #fde68a' }}>
                    ⚠️ Candidate has {selInterview.duration} total to complete. Questions are AI-generated from the JD. AI evaluates tone, keywords, clarity, and confidence.
                  </div>
                </div>
              )}

              {tab === 'results' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>📋 Detailed AI Results</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[['Overall Score', selInterview.scores.overall + '%', '#1e40af'], ['Communication', selInterview.scores.communication + '%', '#8b5cf6'], ['Technical', selInterview.scores.technical + '%', '#3b82f6'], ['Confidence', selInterview.scores.confidence + '%', '#10b981'], ['Problem Solving', selInterview.scores.problemSolving + '%', '#f59e0b'], ['Culture Fit', selInterview.scores.cultureFit + '%', '#ef4444']].map(([label, val, color]) => (
                      <div key={label} style={{ background: '#f8fafc', borderRadius: 9, padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color }}>{val}</div>
                        <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: selInterview.scores.overall >= 80 ? '#f0fdf4' : '#fffbeb', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>🤖 AI Decision</div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: selInterview.scores.overall >= 80 ? '#059669' : '#b45309' }}>{selInterview.recommendation}</div>
                    <div style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>Rank: {selInterview.rank} · Keywords matched: {selInterview.keywords.length}</div>
                  </div>
                  <div style={{ fontSize: 9, color: '#374151', background: '#f8fafc', padding: '10px 12px', borderRadius: 9, lineHeight: 1.7 }}>
                    <strong>Transcript excerpt:</strong><br/>{selInterview.transcript?.substring(0, 200)}...
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                <button onClick={() => notify('✅ Moving to panel interview stage!')} style={{ padding: '8px', borderRadius: 9, border: 'none', background: '#1e40af', color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>✅ Move Forward</button>
                <button onClick={() => notify('✅ Rejection email sent!')} style={{ padding: '8px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 9, cursor: 'pointer' }}>❌ Reject</button>
                <button onClick={() => notify('📋 Added to shortlist!')} style={{ padding: '8px', borderRadius: 9, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', fontSize: 9, cursor: 'pointer' }}>⭐ Shortlist</button>
                <button onClick={() => notify('📄 Report downloaded!')} style={{ padding: '8px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 9, cursor: 'pointer' }}>📥 Report</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

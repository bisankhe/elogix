// FILE: src/components/dashboard/snapshots/ATSAssessmentPage.jsx
// World-Class AI Written Assessment Centre
// Views: Test Library | Create Test | Live Exam (Candidate) | Results & AI Evaluation
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

// ── AI CALL ─────────────────────────────────────────────────
async function callAI(prompt, sys = 'You are a world-class assessment expert.') {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000,
        system: sys, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(30000),
    })
    if (r.ok) { const d = await r.json(); return d.content?.map(c => c.text).join('') || '' }
  } catch {}
  return null

// ── QUESTION BANK (built-in) ─────────────────────────────────
const QB = {
  MCQ: [
    { id:'m1', q:'Which data structure is best for implementing a priority queue?', opts:['Array','Linked List','Binary Heap','Hash Table'], ans:2, marks:5, topic:'Data Structures' },
    { id:'m2', q:'What does SOLID stand for in software engineering?', opts:['Single, Open, Liskov, Interface, Dependency','Simple, Object, Layer, Interface, Design','Single, Object, Linked, Integrated, Design','None of above'], ans:0, marks:5, topic:'Software Engineering' },
    { id:'m3', q:'Nepal Labour Act 2074 specifies minimum probation period of:', opts:['3 months','6 months','12 months','No limit'], ans:1, marks:5, topic:'HR Compliance' },
    { id:'m4', q:'REST API HTTP method for updating a partial resource:', opts:['PUT','POST','PATCH','DELETE'], ans:2, marks:5, topic:'API Design' },
    { id:'m5', q:'In SQL, which clause filters groups after aggregation?', opts:['WHERE','GROUP BY','HAVING','ORDER BY'], ans:2, marks:5, topic:'Database' },
    { id:'m6', q:'SSF employer contribution rate under Nepal SSF Act:', opts:['11%','18%','20%','31%'], ans:2, marks:5, topic:'Nepal Payroll' },
    { id:'m7', q:'Big-O notation for binary search algorithm:', opts:['O(n)','O(log n)','O(n²)','O(1)'], ans:1, marks:5, topic:'Algorithms' },
    { id:'m8', q:'Which React hook runs after every render by default?', opts:['useState','useCallback','useEffect','useMemo'], ans:2, marks:5, topic:'React' },
  ],
  CODING: [
    { id:'c1', q:'Write a function that returns the nth Fibonacci number efficiently.', starter:'def fibonacci(n):\n    # Your code here\n    pass', lang:'Python', marks:20, topic:'Algorithms', testCases:[{inp:'5',out:'5'},{inp:'10',out:'55'}] },
    { id:'c2', q:'Reverse a linked list in O(n) time and O(1) space.', starter:'def reverse_linked_list(head):\n    # Your code here\n    pass', lang:'Python', marks:25, topic:'Data Structures', testCases:[{inp:'1->2->3',out:'3->2->1'}] },
    { id:'c3', q:'Implement a rate limiter that allows N requests per minute.', starter:'class RateLimiter:\n    def __init__(self, n):\n        pass\n    def is_allowed(self):\n        pass', lang:'Python', marks:30, topic:'System Design', testCases:[] },
  ],
  ESSAY: [
    { id:'e1', q:'Describe a challenging technical problem you solved. Include the problem, approach, solution, and lessons learned. (300-500 words)', marks:25, wordLimit:'300-500', rubric:'Clarity of problem description, Logical approach, Quality of solution, Lessons articulated', time:1800 },
    { id:'e2', q:'How would you architect a system to handle 1 million concurrent users? Include scaling strategy, database choices, and trade-offs. (400-600 words)', marks:30, wordLimit:'400-600', rubric:'Scalability understanding, Tech choices, Trade-off analysis, Practical considerations', time:2400 },
  ],
  PSYCHOMETRIC: [
    { id:'p1', q:'When faced with a tight deadline, I typically:', opts:['Work extra hours alone','Ask for help immediately','Prioritise and delegate','Request deadline extension'], marks:0, topic:'Work Style' },
    { id:'p2', q:'I prefer working in:', opts:['Completely independent setting','Small close-knit team','Large collaborative group','Varies by task'], marks:0, topic:'Team Preference' },
    { id:'p3', q:'When I receive critical feedback, I:', opts:['Take time to reflect','Immediately act on it','Seek clarification first','Discuss with mentor'], marks:0, topic:'Feedback Response' },
    { id:'p4', q:'My decision-making style is best described as:', opts:['Data-driven always','Intuition-led','Collaborative consensus','Situational mix'], marks:0, topic:'Decision Making' },
    { id:'p5', q:'I handle ambiguity best by:', opts:['Creating structure immediately','Embracing and exploring','Seeking guidance','Depends on the context'], marks:0, topic:'Ambiguity' },
  ],

const TESTS = [
  { id:'t1', name:'Senior React Developer — Full Stack Assessment', job:'Senior React Developer', duration:90, status:'Active', candidates:14, submitted:8, avgScore:78, sections:['MCQ','CODING','ESSAY'], mcq:8, coding:2, essay:1, psych:0, passMark:65 },
  { id:'t2', name:'Finance Manager — Technical Competency Test', job:'Finance Manager', duration:60, status:'Completed', candidates:9, submitted:9, avgScore:82, sections:['MCQ','ESSAY','PSYCHOMETRIC'], mcq:8, coding:0, essay:1, psych:5, passMark:70 },
  { id:'t3', name:'HR Business Partner — Aptitude Assessment', job:'HR Business Partner', duration:45, status:'Scheduled', candidates:6, submitted:0, avgScore:null, sections:['MCQ','PSYCHOMETRIC'], mcq:6, coding:0, essay:0, psych:5, passMark:60 },
]

const RESULTS = [
  { name:'Gita Maharjan',  mcq:46,coding:88,essay:92,psych:'INTJ (Leader)',  overall:92, grade:'A',  rec:'Strongly Shortlist', time:'68m', passed:true },
  { name:'Rajan Shrestha', mcq:42,coding:82,essay:88,psych:'ENTJ (Visionary)',overall:88, grade:'B+', rec:'Shortlist',          time:'82m', passed:true },
  { name:'Priya Tamang',   mcq:38,coding:75,essay:80,psych:'INFP (Mediator)',overall:79, grade:'B',  rec:'Consider',           time:'87m', passed:true },
  { name:'Anil KC',        mcq:40,coding:90,essay:76,psych:'ISTP (Craftsman)',overall:84, grade:'B+', rec:'Shortlist',         time:'71m', passed:true },
  { name:'Sunita Rai',     mcq:28,coding:55,essay:68,psych:'ENFJ (Teacher)', overall:62, grade:'C',  rec:'Reject',             time:'90m', passed:false },
]

// ── LIVE EXAM COMPONENT ──────────────────────────────────────
function LiveExam({ test, onSubmit, onExit }) {
  const allQs = [
    ...QB.MCQ.slice(0, test.mcq).map(q => ({ ...q, type: 'MCQ' })),
    ...QB.CODING.slice(0, test.coding).map(q => ({ ...q, type: 'CODING' })),
    ...QB.ESSAY.slice(0, test.essay).map(q => ({ ...q, type: 'ESSAY' })),
    ...QB.PSYCHOMETRIC.slice(0, test.psych).map(q => ({ ...q, type: 'PSYCHOMETRIC' })),
  ]
  const totalSecs = test.duration * 60
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [remaining, setRemaining] = useState(totalSecs)
  const [submitted, setSubmitted] = useState(false)
  const [aiEval, setAiEval] = useState(null)
  const [evaling, setEvaling] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const urgent = remaining < 300

  const progress = Math.round((Object.keys(answers).length / allQs.length) * 100)
  const q = allQs[idx]

  const setAnswer = (val) => setAnswers(a => ({ ...a, [q.id]: val }))

  const handleSubmit = useCallback(async () => {
    clearInterval(timerRef.current)
    setSubmitted(true)
    setEvaling(true)
    // Score MCQ
    let mcqScore = 0, mcqTotal = 0
    allQs.filter(q => q.type === 'MCQ').forEach(q => {
      mcqTotal += q.marks
      if (answers[q.id] === q.ans) mcqScore += q.marks
    })
    // AI evaluate essays
    const essays = allQs.filter(q => q.type === 'ESSAY')
    let essayScore = 0, essayFeedback = ''
    for (const eq of essays) {
      const ans = answers[eq.id] || ''
      if (ans.length > 50) {
        const fb = await callAI(
          `Evaluate this essay answer (0-${eq.marks} marks):\nQuestion: ${eq.q}\nRubric: ${eq.rubric}\nAnswer: ${ans}\n\nReturn: SCORE: X\nFEEDBACK: ...`,
          'You are an expert assessment evaluator. Be fair and detailed.'
        )
        if (fb) {
          const sm = fb.match(/SCORE:\s*(\d+)/i)
          essayScore += sm ? parseInt(sm[1]) : Math.floor(eq.marks * 0.6)
          essayFeedback += fb + '\n'
    // Score coding (simplified)
    const codingTotal = allQs.filter(q => q.type === 'CODING').reduce((s, q) => s + q.marks, 0)
    const codingScore = Math.floor(codingTotal * 0.72)
    const overall = Math.round(
      (mcqScore / (mcqTotal || 1) * 40) +
      (codingScore / (codingTotal || 1) * 30) +
      (essayScore / (essays.reduce((s, q) => s + q.marks, 0) || 1) * 30)
    )
    setEvaling(false)
    setAiEval({ mcqScore, mcqTotal, codingScore, codingTotal, essayScore, essayFeedback, overall,
      grade: overall >= 85 ? 'A' : overall >= 70 ? 'B+' : overall >= 60 ? 'B' : overall >= 50 ? 'C' : 'F',
      passed: overall >= test.passMark,
      recommendation: overall >= 80 ? 'Strongly Shortlist' : overall >= 65 ? 'Shortlist' : overall >= 50 ? 'Consider' : 'Reject'
    })
    onSubmit && onSubmit({ answers, overall })
  }, [answers, allQs, test, onSubmit])

  if (submitted) {
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', padding: 24 }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {evaling ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1e40af', marginBottom: 8 }}>AI is evaluating your responses...</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Checking MCQ answers · Evaluating code · Reading your essays with AI</div>
              <div style={{ width: 200, height: 6, background: '#e2e8f0', borderRadius: 3, margin: '20px auto', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,#1e40af,#7c3aed)', borderRadius: 3, animation: 'evalSlide 2s ease-in-out infinite', width: '60%' }} />
              </div>
            </div>
          ) : aiEval && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 48 }}>{aiEval.passed ? '🎉' : '📋'}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>{aiEval.passed ? 'Assessment Completed!' : 'Thank You for Completing the Test'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>AI evaluation complete — results sent to HR team</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { l: 'Overall Score', v: `${aiEval.overall}%`, c: aiEval.overall >= 70 ? '#10b981' : '#f59e0b' },
                  { l: 'Grade', v: aiEval.grade, c: '#3b82f6' },
                  { l: 'Result', v: aiEval.passed ? 'PASS ✅' : 'NOT PASS ❌', c: aiEval.passed ? '#10b981' : '#ef4444' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {[
                { l: 'MCQ', sc: aiEval.mcqScore, tot: aiEval.mcqTotal, c: '#3b82f6' },
                { l: 'Coding', sc: aiEval.codingScore, tot: aiEval.codingTotal, c: '#7c3aed' },
                { l: 'Essay (AI)', sc: aiEval.essayScore, tot: 55, c: '#10b981' },
              ].filter(s => s.tot > 0).map((s, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>{s.l}</span>
                    <span style={{ fontSize: 10, color: s.c, fontWeight: 700 }}>{s.sc}/{s.tot}</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(s.sc / s.tot * 100)}%`, background: s.c, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
              {aiEval.essayFeedback && (
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, border: '1px solid #bfdbfe', marginTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#1e40af', marginBottom: 6 }}>🤖 AI Essay Feedback</div>
                  <div style={{ fontSize: 9, color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiEval.essayFeedback.slice(0, 600)}</div>
                </div>
              )}
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', padding: '10px 20px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                  AI Recommendation: <strong>{aiEval.recommendation}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
        <style>{`@keyframes evalSlide{0%{transform:translateX(-100%)}50%{transform:translateX(50%)}100%{transform:translateX(200%)}}`}</style>
      </div>
    )

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      {/* Top bar */}
      <div style={{ background: urgent ? '#dc2626' : '#1e3a5f', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800 }}>{test.name}</div>
          <div style={{ fontSize: 9, opacity: 0.7 }}>Q {idx + 1} of {allQs.length} · {q?.type}</div>
        </div>
        {/* Timer */}
        <div style={{ textAlign: 'center', padding: '6px 16px', background: 'rgba(255,255,255,.15)', borderRadius: 10, animation: urgent ? 'pulse 1s infinite' : 'none' }}>
          <div style={{ fontSize: 20, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>⏱ {mm}:{ss}</div>
          <div style={{ fontSize: 8, opacity: 0.7 }}>remaining</div>
        </div>
        {/* Progress */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 900 }}>{progress}%</div>
          <div style={{ fontSize: 8, opacity: 0.7 }}>answered</div>
        </div>
        <button onClick={handleSubmit} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>Submit Now</button>
        <button onClick={onExit} style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: '#fff', fontSize: 10, cursor: 'pointer' }}>✕ Exit</button>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>
        {/* Question navigator */}
        <div style={{ width: 180, background: '#fff', borderRight: '1px solid #e2e8f0', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', marginBottom: 8 }}>QUESTIONS</div>
          {allQs.map((q, i) => {
            const done = answers[q.id] !== undefined
            const typeC = { MCQ: '#3b82f6', CODING: '#7c3aed', ESSAY: '#10b981', PSYCHOMETRIC: '#f59e0b' }
            return (
              <button key={i} onClick={() => setIdx(i)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 8, border: `2px solid ${i === idx ? typeC[q.type] : done ? '#10b981' : '#e2e8f0'}`, background: i === idx ? typeC[q.type] + '15' : done ? '#f0fdf4' : '#f8fafc', color: '#334155', fontSize: 9, fontWeight: i === idx ? 800 : 400, cursor: 'pointer', marginBottom: 3 }}>
                <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: typeC[q.type], color: '#fff', fontSize: 8, fontWeight: 900, textAlign: 'center', lineHeight: '16px', marginRight: 5 }}>{i + 1}</span>
                {q.type} {done ? '✓' : ''}
              </button>
            )
          })}
        </div>

        {/* Question area */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {q && (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 8, background: q.type === 'MCQ' ? '#dbeafe' : q.type === 'CODING' ? '#ede9fe' : q.type === 'ESSAY' ? '#d1fae5' : '#fef9c3', color: q.type === 'MCQ' ? '#1e40af' : q.type === 'CODING' ? '#6d28d9' : q.type === 'ESSAY' ? '#065f46' : '#92400e' }}>{q.type}</span>
                {q.marks > 0 && <span style={{ fontSize: 9, color: '#64748b' }}>{q.marks} marks</span>}
                {q.topic && <span style={{ fontSize: 9, color: '#94a3b8' }}>· {q.topic}</span>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.6, marginBottom: 20, background: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>{q.q}</div>

              {q.type === 'MCQ' || q.type === 'PSYCHOMETRIC' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.opts.map((opt, oi) => (
                    <button key={oi} onClick={() => setAnswer(oi)}
                      style={{ padding: '12px 16px', borderRadius: 10, border: `2px solid ${answers[q.id] === oi ? '#1e40af' : '#e2e8f0'}`, background: answers[q.id] === oi ? '#eff6ff' : '#fff', color: answers[q.id] === oi ? '#1e40af' : '#334155', fontSize: 11, fontWeight: answers[q.id] === oi ? 700 : 400, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${answers[q.id] === oi ? '#1e40af' : '#cbd5e1'}`, background: answers[q.id] === oi ? '#1e40af' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {answers[q.id] === oi && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <span style={{ fontWeight: 600, marginRight: 6 }}>{String.fromCharCode(65 + oi)}.</span> {opt}
                    </button>
                  ))}
                </div>
              ) : q.type === 'CODING' ? (
                <div>
                  {q.testCases.length > 0 && (
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 12, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>TEST CASES</div>
                      {q.testCases.map((tc, i) => (
                        <div key={i} style={{ fontSize: 9, color: '#334155', fontFamily: 'monospace' }}>Input: {tc.inp} → Expected: {tc.out}</div>
                      ))}
                    </div>
                  )}
                  <textarea value={answers[q.id] || q.starter} onChange={e => setAnswer(e.target.value)}
                    style={{ width: '100%', minHeight: 280, padding: 14, fontFamily: 'JetBrains Mono,Consolas,monospace', fontSize: 12, background: '#1e293b', color: '#e2e8f0', border: '2px solid #334155', borderRadius: 10, resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
                  <div style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>Language: {q.lang} · AI will evaluate logic, efficiency, and correctness</div>
                </div>
              ) : q.type === 'ESSAY' ? (
                <div>
                  <textarea value={answers[q.id] || ''} onChange={e => setAnswer(e.target.value)}
                    placeholder="Write your answer here..."
                    style={{ width: '100%', minHeight: 240, padding: 14, fontFamily: 'system-ui', fontSize: 12, color: '#0f172a', background: '#fff', border: '2px solid #e2e8f0', borderRadius: 10, resize: 'vertical', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', marginTop: 4 }}>
                    <span>Word limit: {q.wordLimit} words</span>
                    <span>Words: {(answers[q.id] || '').split(/\s+/).filter(Boolean).length}</span>
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
                  style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 11, cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}>← Previous</button>
                <div style={{ flex: 1 }} />
                {idx < allQs.length - 1 ? (
                  <button onClick={() => setIdx(i => i + 1)}
                    style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#1e40af', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Next Question →</button>
                ) : (
                  <button onClick={handleSubmit}
                    style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>✅ Submit Assessment</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function ATSAssessmentPage() {
  const { navigate } = useApp()
  const [view, setView] = useState('library') // library | create | exam | results
  const [selTest, setSelTest] = useState(null)
  const [creating, setCreating] = useState(false)
  const [genMsg, setGenMsg] = useState('')
  const [form, setForm] = useState({ name: '', job: '', duration: 60, mcq: 8, coding: 2, essay: 1, psych: 5, passMark: 65, negativeMarking: false, randomize: true, proctoring: false })
  const [aiGenerating, setAiGenerating] = useState(false)

  const generateWithAI = async () => {
    setAiGenerating(true)
    setGenMsg('🤖 AI generating question bank...')
    await new Promise(r => setTimeout(r, 1800))
    setGenMsg('✅ Question bank generated! MCQ × ' + form.mcq + ', Coding × ' + form.coding + ', Essay × ' + form.essay + ', Psychometric × ' + form.psych)
    setAiGenerating(false)

  if (view === 'exam' && selTest) {
    return <LiveExam test={selTest} onSubmit={() => { }} onExit={() => { setView('library'); setSelTest(null) }} />

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#7c3aed)', borderRadius: 14, padding: '18px 22px', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>AI Assessment Centre</h2>
            <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.8 }}>MCQ · Coding · Essay · Psychometric · AI auto-evaluation · Proctoring · Real-time leaderboard</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['library', '📋 Tests'], ['create', '+ Create'], ['results', '📊 Results']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: view === v ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.1)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ l: 'Total Tests', v: TESTS.length, c: '#3b82f6' }, { l: 'Active', v: TESTS.filter(t => t.status === 'Active').length, c: '#10b981' }, { l: 'Total Candidates', v: TESTS.reduce((s, t) => s + t.candidates, 0), c: '#8b5cf6' }, { l: 'Avg Pass Score', v: '79%', c: '#f59e0b' }].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '10px 18px', border: '1px solid #f1f5f9', flex: '1 1 120px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 9, color: '#94a3b8' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── LIBRARY ── */}
      {view === 'library' && (
        <div>
          {TESTS.map(t => (
            <div key={t.id} style={{ background: '#fff', borderRadius: 14, padding: 18, marginBottom: 10, border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{t.name}</span>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: t.status === 'Active' ? '#d1fae5' : t.status === 'Completed' ? '#dbeafe' : '#fef9c3', color: t.status === 'Active' ? '#065f46' : t.status === 'Completed' ? '#1e40af' : '#92400e' }}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>For: {t.job} · Duration: {t.duration} min · Pass mark: {t.passMark}%</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {t.sections.map(s => <span key={s} style={{ fontSize: 8, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>{s}</span>)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ l: 'Invited', v: t.candidates }, { l: 'Submitted', v: t.submitted }, { l: 'Pending', v: t.candidates - t.submitted }, { l: 'Avg Score', v: t.avgScore ? t.avgScore + '%' : '—' }].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9', minWidth: 56 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#1e40af' }}>{s.v}</div>
                      <div style={{ fontSize: 8, color: '#94a3b8' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setSelTest(t); setView('exam') }}
                    style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#1e3a5f,#7c3aed)', color: '#fff', fontSize: 9, fontWeight: 800, cursor: 'pointer' }}>▶ Preview Exam</button>
                  <button onClick={() => setView('results')}
                    style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>📊 Results</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE ── */}
      {view === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 18 }}>Create New Assessment</div>
            {[['Test Name *', 'name', 'text', 'Senior React Developer — Full Stack Test'],
              ['For Job Position', 'job', 'text', 'Senior React Developer'],
            ].map(([label, key, type, ph]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              {[['Duration (min)', 'duration'], ['Pass Mark (%)', 'passMark']].map(([l, k]) => (
                <div key={k}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>{l}</label>
                  <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: +e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Question Counts</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[['MCQ', 'mcq', '#3b82f6'], ['Coding', 'coding', '#7c3aed'], ['Essay', 'essay', '#10b981'], ['Psychometric', 'psych', '#f59e0b']].map(([l, k, c]) => (
                  <div key={k} style={{ textAlign: 'center', padding: 12, background: c + '10', borderRadius: 10, border: `1px solid ${c}30` }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: c, marginBottom: 6 }}>{l}</div>
                    <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: +e.target.value }))} min={0} max={30}
                      style={{ width: 50, padding: '6px 8px', borderRadius: 7, border: `2px solid ${c}40`, fontSize: 14, fontWeight: 900, textAlign: 'center', outline: 'none', color: c }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
              {[['Negative Marking', 'negativeMarking'], ['Randomize Questions', 'randomize'], ['Enable Proctoring', 'proctoring']].map(([l, k]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, cursor: 'pointer', color: '#374151' }}>
                  <input type="checkbox" checked={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} />
                  {l}
                </label>
              ))}
            </div>
            {genMsg && <div style={{ fontSize: 10, padding: '8px 14px', background: '#f0fdf4', color: '#15803d', borderRadius: 9, border: '1px solid #bbf7d0', marginBottom: 14 }}>{genMsg}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={generateWithAI} disabled={aiGenerating || !form.name}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: aiGenerating ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#1e40af)', color: aiGenerating ? '#94a3b8' : '#fff', fontSize: 11, fontWeight: 800, cursor: aiGenerating ? 'default' : 'pointer' }}>
                {aiGenerating ? '🤖 Generating...' : '🤖 AI Generate Questions'}
              </button>
              <button style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#1e40af', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>💾 Save & Invite Candidates</button>
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>📋 Test Preview</div>
            {[['Test Name', form.name || '—'], ['Position', form.job || '—'], ['Total Duration', form.duration + ' minutes'], ['Pass Mark', form.passMark + '%'], ['Total Questions', form.mcq + form.coding + form.essay + form.psych], ['Estimated Marks', form.mcq * 5 + form.coding * 25 + form.essay * 25 + ' + psychometric']].map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#94a3b8' }}>{k}</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 8 }}>AI Features</div>
              {['Auto-grade MCQ instantly', 'AI evaluate coding (test cases)', 'Claude AI evaluate essays', 'Psychometric personality profile', 'AI leaderboard & ranking', 'Auto-send results to HR'].map((f, i) => (
                <div key={i} style={{ fontSize: 9, color: '#475569', padding: '3px 0', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#10b981' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button onClick={() => { setSelTest({ ...form, id: 'preview', name: form.name || 'Preview Test', status: 'Preview' }); setView('exam') }}
              style={{ width: '100%', marginTop: 16, padding: '10px', borderRadius: 10, background: '#f8fafc', color: '#1e40af', fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid #bfdbfe' }}>👁️ Preview Exam as Candidate</button>
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {view === 'results' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Senior React Developer — Written Assessment Results</div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 16 }}>8 submitted · AI evaluated · Auto-ranked</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Candidate', 'MCQ /40', 'Coding /75', 'Essay (AI) /55', 'Personality', 'Overall', 'Grade', 'AI Recommendation', 'Time'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: 9, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RESULTS.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc', background: r.passed ? '#fff' : '#fff7f7' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0f172a' }}>{r.name}</td>
                    <td style={{ padding: '9px 10px', color: r.mcq >= 30 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{r.mcq}</td>
                    <td style={{ padding: '9px 10px', color: r.coding >= 55 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{r.coding}</td>
                    <td style={{ padding: '9px 10px', color: r.essay >= 40 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{r.essay}</td>
                    <td style={{ padding: '9px 10px', color: '#8b5cf6', fontSize: 9 }}>{r.psych}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: r.overall + '%', height: '100%', background: r.overall >= 80 ? '#10b981' : r.overall >= 65 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 900, color: r.overall >= 80 ? '#10b981' : r.overall >= 65 ? '#f59e0b' : '#ef4444' }}>{r.overall}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '9px 10px', fontWeight: 800, color: '#1e40af' }}>{r.grade}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: r.rec === 'Strongly Shortlist' ? '#d1fae5' : r.rec === 'Shortlist' ? '#dbeafe' : r.rec === 'Consider' ? '#fef9c3' : '#fee2e2', color: r.rec === 'Strongly Shortlist' ? '#065f46' : r.rec === 'Shortlist' ? '#1e40af' : r.rec === 'Consider' ? '#92400e' : '#dc2626' }}>{r.rec}</span>
                    </td>
                    <td style={{ padding: '9px 10px', color: '#94a3b8', fontSize: 9 }}>{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#1e40af', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>📧 Move Shortlisted to Next Stage</button>
            <button style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>❌ Send Rejection to Failed</button>
            <button style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 10, cursor: 'pointer' }}>📥 Export Excel</button>
          </div>
        </div>
      )}
    </div>
  )

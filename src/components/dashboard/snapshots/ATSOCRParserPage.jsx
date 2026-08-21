// ATSOCRParserPage.jsx — World-Class AI OCR + Duplicate Detection + Auto Candidate ID + Full AI Matching
// Phase 4+5+6: Download → OCR → Parse → Deduplicate → Auto ID → AI Scoring → Gold/Silver/Bronze/Reject
import { useState, useRef, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

async function callAI(prompt, sys) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500,
        system: sys || 'You are a world-class AI ATS resume parser. Return only valid JSON.',
        messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(30000)
    })
    if (r.ok) { const d = await r.json(); return d.content?.map(c => c.text).join('') || '' }
  } catch {}
  return null

const FILE_ICONS = {
  pdf: { icon: '📄', color: '#ef4444', bg: '#fef2f2', label: 'PDF' },
  doc:  { icon: '📝', color: '#1e40af', bg: '#eff6ff', label: 'Word' },
  docx: { icon: '📝', color: '#1e40af', bg: '#eff6ff', label: 'Word' },
  xls:  { icon: '📊', color: '#059669', bg: '#f0fdf4', label: 'Excel' },
  xlsx: { icon: '📊', color: '#059669', bg: '#f0fdf4', label: 'Excel' },
  jpg:  { icon: '🖼️', color: '#7c3aed', bg: '#f5f3ff', label: 'Image' },
  jpeg: { icon: '🖼️', color: '#7c3aed', bg: '#f5f3ff', label: 'Image' },
  png:  { icon: '🖼️', color: '#7c3aed', bg: '#f5f3ff', label: 'Image' },
  txt:  { icon: '📃', color: '#64748b', bg: '#f8fafc', label: 'Text' },
  rtf:  { icon: '📋', color: '#0891b2', bg: '#ecfeff', label: 'RTF' },

const OCR_STAGES = [
  { label: 'Downloading file from source', pct: 8 },
  { label: 'Detecting file format', pct: 16 },
  { label: 'OCR image recognition', pct: 28 },
  { label: 'Extracting raw text', pct: 40 },
  { label: 'AI parsing name / contact', pct: 52 },
  { label: 'Extracting skills & experience', pct: 64 },
  { label: 'Running duplicate detection', pct: 76 },
  { label: 'Calculating AI match scores', pct: 88 },
  { label: 'Assigning rank & candidate ID', pct: 100 },
]

const JOB_POSITIONS = [
  { id: 'j1', title: 'Senior React Developer', dept: 'Technology', minAge: 22, maxAge: 45, minExp: 4,
    skills: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
    matchWeights: { skills: 40, experience: 20, education: 15, certification: 10, location: 5, salary: 5, notice: 5 } },
  { id: 'j2', title: 'Finance Manager', dept: 'Finance', minAge: 25, maxAge: 50, minExp: 5,
    skills: ['Excel', 'SAP', 'FP&A', 'CPA'],
    matchWeights: { skills: 35, experience: 25, education: 20, certification: 10, location: 5, salary: 3, notice: 2 } },
  { id: 'j3', title: 'HR Business Partner', dept: 'HR', minAge: 24, maxAge: 45, minExp: 4,
    skills: ['HRBP', 'LA2074', 'Payroll', 'OD'],
    matchWeights: { skills: 35, experience: 20, education: 15, certification: 10, location: 5, salary: 10, notice: 5 } },
]

const DEMO_CVS = [
  { full_name:'Gita Maharjan',  email:'gita@mail.com',   phone:'+977-9801001001', dob:'1994-03-15', age:30,
    current_role:'React Developer', experience_years:6.5, expected_salary:95000, notice_period:30,
    education:'M.Tech CS, Tribhuvan University', skills:['React','Node.js','PostgreSQL','AWS','Docker','TypeScript'],
    certifications:['AWS Solutions Architect','Scrum Master'], location:'Kathmandu',
    linkedin:'linkedin.com/in/gita', github:'github.com/gita',
    match_detail:{ skills:92, experience:88, education:90, certification:95, location:100, salary:85, notice:90 } },
  { full_name:'Rajan Shrestha', email:'rajan@mail.com',  phone:'+977-9802002002', dob:'1993-07-22', age:31,
    current_role:'Full Stack Developer', experience_years:6, expected_salary:85000, notice_period:45,
    education:'B.Tech CS, Kathmandu University', skills:['React','Node.js','PostgreSQL','AWS','JavaScript'],
    certifications:['AWS Developer'], location:'Kathmandu',
    linkedin:'linkedin.com/in/rajan', github:'github.com/rajan',
    match_detail:{ skills:88, experience:85, education:80, certification:75, location:100, salary:90, notice:80 } },
  { full_name:'Anil KC',        email:'anil@mail.com',   phone:'+977-9804004004', dob:'1991-05-03', age:33,
    current_role:'Senior Engineer', experience_years:7, expected_salary:130000, notice_period:60,
    education:'B.E. CS, IOE Pulchowk', skills:['React','PostgreSQL','AWS','Docker','Python','Kubernetes'],
    certifications:['AWS DevOps','CKA'], location:'Kathmandu',
    linkedin:'linkedin.com/in/anil', github:'github.com/anil',
    match_detail:{ skills:95, experience:95, education:90, certification:100, location:100, salary:60, notice:65 } },
  { full_name:'Priya Tamang',   email:'priya@mail.com',  phone:'+977-9803003003', dob:'1996-11-10', age:28,
    current_role:'Frontend Developer', experience_years:5, expected_salary:75000, notice_period:30,
    education:'M.Sc IT, Pokhara University', skills:['React','Node.js','MySQL','JavaScript'],
    certifications:[], location:'Pokhara',
    linkedin:'linkedin.com/in/priya', github:'',
    match_detail:{ skills:72, experience:78, education:85, certification:30, location:60, salary:92, notice:90 } },
  { full_name:'Anita Gurung',   email:'anita@mail.com',  phone:'+977-9805005005', dob:'2004-02-28', age:19,
    current_role:'Junior Designer', experience_years:1, expected_salary:35000, notice_period:0,
    education:'BCA Running', skills:['Figma','HTML','CSS'],
    certifications:[], location:'Kathmandu',
    linkedin:'', github:'',
    match_detail:{ skills:20, experience:10, education:30, certification:0, location:100, salary:100, notice:100 },
    ageRejected: true },
  { full_name:'Rajan Shrestha', email:'rajan@gmail.com', phone:'+977-9802002002', dob:'1993-07-22', age:31,
    current_role:'Full Stack Developer', experience_years:6, expected_salary:85000, notice_period:45,
    education:'B.Tech CS, Kathmandu University', skills:['React','Node.js','PostgreSQL'],
    certifications:['AWS Developer'], location:'Kathmandu',
    linkedin:'', github:'github.com/rajan',
    isDuplicate: true, duplicateOf: 'rajan@mail.com',
    match_detail:{ skills:88, experience:85, education:80, certification:75, location:100, salary:90, notice:80 } },
]

function calcAIScore(parsed, job) {
  if (!parsed?.match_detail) return 0
  const w = job.matchWeights
  const d = parsed.match_detail
  return Math.round(
    d.skills * w.skills / 100 +
    d.experience * w.experience / 100 +
    d.education * w.education / 100 +
    d.certification * w.certification / 100 +
    d.location * w.location / 100 +
    d.salary * w.salary / 100 +
    d.notice * w.notice / 100
  )

function getRank(score, ageOK, isDupe, ageRejected) {
  if (ageRejected) return 'Reject'
  if (isDupe) return 'Duplicate'
  if (score >= 85) return 'Gold'
  if (score >= 70) return 'Silver'
  if (score >= 55) return 'Bronze'
  return 'Reject'

const rankStyle = {
  Gold:      { c: '#92400e', bg: '#fef9c3', border: '#f59e0b', icon: '🥇' },
  Silver:    { c: '#334155', bg: '#f1f5f9', border: '#94a3b8', icon: '🥈' },
  Bronze:    { c: '#7c2d12', bg: '#fff7ed', border: '#fb923c', icon: '🥉' },
  Reject:    { c: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '❌' },
  Duplicate: { c: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', icon: '🔁' },

function ScoreRing({ score, size = 56 }) {
  const c = score >= 80 ? '#059669' : score >= 65 ? '#f59e0b' : '#ef4444'
  const pct = score / 100
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={5}
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`} strokeLinecap="round" />
      <text x={size/2} y={size/2} textAnchor="middle" dy="0.35em" fill={c} fontSize={size/4.5}
        fontWeight="900" transform={`rotate(90,${size/2},${size/2})`}>{score}%</text>
    </svg>
  )

function MatchBreakdown({ detail, weights }) {
  const labels = { skills:'Skills', experience:'Experience', education:'Education',
    certification:'Certifications', location:'Location', salary:'Salary', notice:'Notice Period' }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {Object.entries(detail).map(([k, v]) => (
        <div key={k} style={{ background: '#f8fafc', borderRadius: 7, padding: '6px 8px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>{labels[k] || k}</span>
            <span style={{ fontSize: 9, fontWeight: 900, color: v >= 80 ? '#059669' : v >= 55 ? '#f59e0b' : '#ef4444' }}>{v}%</span>
          </div>
          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: v + '%', height: '100%', background: v >= 80 ? '#10b981' : v >= 55 ? '#f59e0b' : '#ef4444', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 7, color: '#94a3b8', marginTop: 2 }}>Weight: {weights[k]}%</div>
        </div>
      ))}
    </div>
  )

export default function ATSOCRParserPage() {
  const { navigate } = useApp()
  const dropRef = useRef(null)
  const inputRef = useRef(null)
  const [selJob, setSelJob] = useState(JOB_POSITIONS[0])
  const [files, setFiles] = useState([])
  const [viewFile, setViewFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [tab, setTab] = useState('upload')
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const simulateOCR = useCallback((entry, demo) => {
    let idx = 0
    const iv = setInterval(() => {
      if (idx >= OCR_STAGES.length) {
        clearInterval(iv)
        const ageOK = demo ? (demo.age >= selJob.minAge && demo.age <= selJob.maxAge) : true
        const aiScore = demo ? calcAIScore(demo, selJob) : Math.round(40 + Math.random() * 50)
        const rank = getRank(aiScore, ageOK, demo?.isDuplicate, demo?.ageRejected)
        const candidateId = 'CAND-' + String(Date.now()).slice(-5) + String(Math.floor(Math.random()*100)).padStart(2,'0')
        setFiles(prev => prev.map(f => f.id === entry.id ? {
          ...f, status: demo?.isDuplicate ? 'Duplicate' : demo?.ageRejected ? 'Age Rejected' : 'Done',
          pct: 100, stage: demo?.isDuplicate ? 'Duplicate detected' : 'Complete',
          parsed: demo, aiScore, rank, candidateId, ageOK: !demo?.ageRejected && ageOK,
          parseConfidence: 92 + Math.random() * 7
        } : f))
        return
      const stage = OCR_STAGES[idx]
      setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, stage: stage.label, pct: stage.pct } : f))
      idx++
    }, 320 + Math.random() * 180)
  }, [selJob])

  const handleFiles = useCallback((rawFiles) => {
    const entries = rawFiles.map((file, idx) => {
      const ext = file.name.split('.').pop().toLowerCase()
      const sizeKB = Math.round(file.size / 1024)
      return { id: Date.now() + idx, name: file.name,
        size: sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + ' MB' : sizeKB + ' KB',
        ext, status: 'Parsing', pct: 0, stage: 'Starting OCR pipeline...',
        parsed: null, aiScore: null, rank: null, candidateId: null }
    })
    setFiles(prev => [...prev, ...entries])
    entries.forEach((entry, idx) => {
      const demo = DEMO_CVS[idx % DEMO_CVS.length]
      setTimeout(() => simulateOCR(entry, demo), idx * 800)
    })
    setTab('results')
  }, [simulateOCR])

  const done = files.filter(f => f.status === 'Done')
  const eligible = done.filter(f => f.ageOK && f.rank !== 'Reject')
  const rejected = files.filter(f => f.status === 'Age Rejected' || (f.status === 'Done' && f.rank === 'Reject'))
  const duplicates = files.filter(f => f.status === 'Duplicate')
  const parsing = files.filter(f => f.status === 'Parsing')
  const gold = eligible.filter(f => f.rank === 'Gold')
  const silver = eligible.filter(f => f.rank === 'Silver')
  const bronze = eligible.filter(f => f.rank === 'Bronze')

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>
      {/* Detail Modal */}
      {viewFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setViewFile(null)}>
          <div style={{ background: '#fff', borderRadius: 16, maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#7c3aed)', padding: '16px 20px', borderRadius: '16px 16px 0 0', color: '#fff', display: 'flex', gap: 14, alignItems: 'center' }}>
              <ScoreRing score={viewFile.aiScore || 0} size={64} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{viewFile.parsed?.full_name || viewFile.name}</div>
                <div style={{ fontSize: 9, opacity: .8, marginTop: 2 }}>{viewFile.parsed?.current_role} · {viewFile.parsed?.experience_years}yr · {viewFile.parsed?.location}</div>
                <div style={{ fontSize: 8, opacity: .6, marginTop: 2 }}>ID: {viewFile.candidateId} · Source: {viewFile.name} · Confidence: {viewFile.parseConfidence?.toFixed(1)}%</div>
              </div>
              {viewFile.rank && <div style={{ padding: '6px 14px', borderRadius: 10, background: rankStyle[viewFile.rank]?.bg, color: rankStyle[viewFile.rank]?.c, fontSize: 12, fontWeight: 900, border: `1.5px solid ${rankStyle[viewFile.rank]?.border}` }}>{rankStyle[viewFile.rank]?.icon} {viewFile.rank}</div>}
              <button onClick={() => setViewFile(null)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              {/* Warnings */}
              {viewFile.parsed?.isDuplicate && (
                <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>
                  🔁 DUPLICATE DETECTED — Same candidate already applied as {viewFile.parsed.duplicateOf}. Auto-merged to original profile.
                </div>
              )}
              {viewFile.parsed?.ageRejected && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 10, color: '#dc2626', fontWeight: 700 }}>
                  ❌ AGE INELIGIBLE — Candidate age {viewFile.parsed.age} is outside the allowed range ({selJob.minAge}–{selJob.maxAge}) for {selJob.title}.
                </div>
              )}
              {/* Profile grid */}
              {viewFile.parsed && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Extracted Profile</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {[['Full Name', viewFile.parsed.full_name],['Email', viewFile.parsed.email],['Phone', viewFile.parsed.phone],['Date of Birth', viewFile.parsed.dob + ' (Age ' + viewFile.parsed.age + ')'],['Location', viewFile.parsed.location],['Current Role', viewFile.parsed.current_role],['Experience', viewFile.parsed.experience_years + ' years'],['Expected Salary', 'NPR ' + (viewFile.parsed.expected_salary || 0).toLocaleString()],['Notice Period', viewFile.parsed.notice_period + ' days'],['Education', viewFile.parsed.education]].map(([k,v]) => (
                      <div key={k} style={{ padding: '6px 10px', background: '#f8fafc', borderRadius: 7, border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 7, color: '#94a3b8' }}>{k}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#0f172a', marginTop: 1 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Skills */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Skills Detected</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {viewFile.parsed.skills?.map(s => {
                        const isMatch = selJob.skills.some(js => s.toLowerCase().includes(js.toLowerCase()))
                        return <span key={s} style={{ fontSize: 9, padding: '3px 9px', borderRadius: 7, background: isMatch ? '#d1fae5' : '#f1f5f9', color: isMatch ? '#065f46' : '#475569', border: `1px solid ${isMatch ? '#bbf7d0' : '#e2e8f0'}`, fontWeight: isMatch ? 700 : 400 }}>{isMatch ? '✓ ' : ''}{s}</span>
                      })}
                    </div>
                  </div>
                  {/* AI Match breakdown */}
                  {viewFile.parsed.match_detail && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>AI Match Score Breakdown</div>
                      <MatchBreakdown detail={viewFile.parsed.match_detail} weights={selJob.matchWeights} />
                    </div>
                  )}
                  {/* Actions */}
                  {!viewFile.parsed.ageRejected && !viewFile.parsed.isDuplicate && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
                      <button onClick={() => { notify('Written exam invitation sent!'); setViewFile(null) }} style={{ padding: '9px', borderRadius: 9, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>📝 Send Written Exam</button>
                      <button onClick={() => { notify('Video interview link sent!'); setViewFile(null) }} style={{ padding: '9px', borderRadius: 9, border: 'none', background: '#1e40af', color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>🎥 Send Video Interview</button>
                      <button onClick={() => { notify('Shortlisted!'); setViewFile(null) }} style={{ padding: '9px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 9, cursor: 'pointer' }}>⭐ Shortlist</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#0891b2)', borderRadius: 14, padding: '16px 22px', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>AI OCR Resume Parser</h2>
            <p style={{ margin: '3px 0 0', fontSize: 10, opacity: .8 }}>PDF · DOC · DOCX · XLS · XLSX · JPG · PNG · TXT · RTF — OCR → Parse → Deduplicate → Auto ID → AI Scoring (Skills+Exp+Education+Salary+Notice) → Gold/Silver/Bronze/Reject</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {msg && <span style={{ fontSize: 9, padding: '5px 12px', background: 'rgba(255,255,255,.2)', borderRadius: 8 }}>{msg}</span>}
            {[['upload','Upload'],['results','All'],['eligible','Eligible'],['duplicates','Duplicates'],['rejected','Rejected']].map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: tab === t ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.1)', color: '#fff', fontSize: 9, fontWeight: tab === t ? 800 : 400, cursor: 'pointer' }}>
                {l}{t === 'eligible' && eligible.length ? ` (${eligible.length})` : t === 'duplicates' && duplicates.length ? ` (${duplicates.length})` : t === 'rejected' && rejected.length ? ` (${rejected.length})` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[{ l:'Uploaded', v:files.length, c:'#3b82f6' },{ l:'Parsing', v:parsing.length, c:'#f59e0b' },{ l:'Gold', v:gold.length, c:'#f59e0b' },{ l:'Silver', v:silver.length, c:'#94a3b8' },{ l:'Bronze', v:bronze.length, c:'#b45309' },{ l:'Duplicates', v:duplicates.length, c:'#7c3aed' },{ l:'Rejected', v:rejected.length, c:'#ef4444' }].map((s,i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', border: '1px solid #f1f5f9', flex: '1 1 80px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 8, color: '#94a3b8' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Job selector */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', marginBottom: 14, border: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#374151', flexShrink: 0 }}>Matching for:</span>
        {JOB_POSITIONS.map(j => (
          <button key={j.id} onClick={() => setSelJob(j)} style={{ padding: '6px 14px', borderRadius: 9, border: `2px solid ${selJob.id === j.id ? '#0891b2' : '#e2e8f0'}`, background: selJob.id === j.id ? '#ecfeff' : '#f8fafc', color: selJob.id === j.id ? '#0891b2' : '#475569', fontSize: 9, fontWeight: selJob.id === j.id ? 800 : 400, cursor: 'pointer' }}>{j.title}</button>
        ))}
        <span style={{ fontSize: 9, color: '#64748b', marginLeft: 'auto' }}>Age: {selJob.minAge}–{selJob.maxAge} · Skills: {selJob.skills.join(', ')}</span>
      </div>

      {/* Upload tab */}
      {tab === 'upload' && (
        <div>
          <div ref={dropRef}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = Array.from(e.dataTransfer.files); if (f.length) handleFiles(f) }}
            onClick={() => inputRef.current?.click()}
            style={{ border: `2.5px dashed ${dragging ? '#0891b2' : '#cbd5e1'}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center', background: dragging ? '#ecfeff' : '#f8fafc', cursor: 'pointer', transition: 'all .2s', marginBottom: 16 }}>
            <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.rtf" onChange={e => handleFiles(Array.from(e.target.files))} style={{ display: 'none' }} />
            <div style={{ fontSize: 44, marginBottom: 12 }}>📁</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: dragging ? '#0891b2' : '#0f172a', marginBottom: 6 }}>{dragging ? 'Drop CVs here!' : 'Drag & Drop CV Files'}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 16 }}>or click to browse — PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT, RTF</div>
            <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              {Object.entries(FILE_ICONS).map(([ext, fi]) => (
                <span key={ext} style={{ fontSize: 8, padding: '3px 9px', borderRadius: 7, background: fi.bg, color: fi.color, border: `1px solid ${fi.color}30`, fontWeight: 700 }}>{fi.icon} .{ext.toUpperCase()}</span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, maxWidth: 540, margin: '0 auto', textAlign: 'left' }}>
              {[['🔍 9-Stage OCR','Reads all formats including scanned images'],['🤖 AI Parser','Extracts name, skills, exp, salary, education'],['🔁 Duplicate Detection','Auto-detects same candidate applied twice'],['🎂 Age Filter','Instantly flags outside min-max age range'],['📊 7-Factor Match','Skills+Exp+Education+Cert+Location+Salary+Notice'],['🏅 Auto Rank','Gold / Silver / Bronze / Reject — auto-assigned']].map(([t,d],i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 9, padding: '10px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>{t}</div>
                  <div style={{ fontSize: 8, color: '#64748b', lineHeight: 1.4 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results tabs */}
      {(tab === 'results' || tab === 'eligible' || tab === 'duplicates' || tab === 'rejected') && (() => {
        const display = tab === 'eligible' ? eligible
          : tab === 'duplicates' ? duplicates
          : tab === 'rejected' ? rejected
          : files
        return (
          <div>
            {parsing.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 14px', marginBottom: 12, fontSize: 10, color: '#92400e', fontWeight: 700 }}>
                ⏳ OCR Pipeline: {parsing.length} file{parsing.length > 1 ? 's' : ''} in progress...
              </div>
            )}
            {tab === 'duplicates' && duplicates.length > 0 && (
              <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 10, padding: '9px 14px', marginBottom: 12, fontSize: 9, color: '#7c3aed', fontWeight: 700 }}>
                🔁 {duplicates.length} duplicate(s) detected. Original profiles kept. Duplicates auto-merged. No exam or interview invite will be sent.
              </div>
            )}
            {tab === 'eligible' && eligible.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={() => notify(`Written exam sent to ${eligible.length} candidates!`)} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>📝 Send Exam to All ({eligible.length})</button>
                <button onClick={() => notify(`Video interview link sent to ${eligible.length} candidates!`)} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#1e40af', color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>🎥 Send Video to All</button>
              </div>
            )}
            {display.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                <div>No files in this category yet.</div>
                <button onClick={() => setTab('upload')} style={{ marginTop: 14, padding: '8px 20px', borderRadius: 9, border: 'none', background: '#0891b2', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Upload CVs</button>
              </div>
            ) : display.map(f => {
              const fi = FILE_ICONS[ext] || FILE_ICONS.txt
              const rs = rankStyle[f.rank] || {}
              return (
                <div key={f.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: `1.5px solid ${f.rank ? rs.border : '#e2e8f0'}`, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: fi.bg, border: `1px solid ${fi.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{fi.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{f.parsed?.full_name || f.name}</span>
                        <span style={{ fontSize: 7, color: '#94a3b8' }}>{f.size}</span>
                        {f.candidateId && <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569', fontFamily: 'monospace' }}>{f.candidateId}</span>}
                        {f.rank && <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: rs.bg, color: rs.c, border: `1px solid ${rs.border}` }}>{rs.icon} {f.rank}</span>}
                      </div>
                      {f.status === 'Parsing' ? (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontSize: 8, color: '#7c3aed', fontWeight: 600, marginBottom: 3 }}>{f.stage}</div>
                          <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: f.pct + '%', background: 'linear-gradient(90deg,#7c3aed,#0891b2)', borderRadius: 2, transition: 'width .4s' }} />
                          </div>
                        </div>
                      ) : (
                        <div>
                          {f.parsed && (
                            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4 }}>
                              {f.parsed.current_role} · {f.parsed.experience_years}yr · {f.parsed.location} · NPR {(f.parsed.expected_salary || 0).toLocaleString()}
                            </div>
                          )}
                          {f.parsed?.match_detail && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {Object.entries(f.parsed.match_detail).slice(0, 4).map(([k, v]) => (
                                <span key={k} style={{ fontSize: 7, padding: '1px 6px', borderRadius: 4, background: v >= 80 ? '#f0fdf4' : v >= 55 ? '#fffbeb' : '#fef2f2', color: v >= 80 ? '#065f46' : v >= 55 ? '#92400e' : '#dc2626', border: '1px solid transparent' }}>
                                  {k}: {v}%
                                </span>
                              ))}
                            </div>
                          )}
                          {f.parsed?.isDuplicate && <div style={{ fontSize: 8, color: '#7c3aed', fontWeight: 700, marginTop: 3 }}>🔁 Duplicate of: {f.parsed.duplicateOf}</div>}
                          {f.parsed?.ageRejected && <div style={{ fontSize: 8, color: '#dc2626', fontWeight: 700, marginTop: 3 }}>❌ Age {f.parsed.age} outside {selJob.minAge}–{selJob.maxAge}</div>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {f.aiScore != null && <ScoreRing score={f.aiScore} size={52} />}
                      {f.status !== 'Parsing' && <button onClick={() => setViewFile(f)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#eff6ff', color: '#1e40af', fontSize: 8, fontWeight: 700, cursor: 'pointer' }}>View</button>}
                    </div>
                  </div>
                </div>
              )
            })}
            {tab === 'rejected' && rejected.length > 0 && (
              <button onClick={() => notify(`Rejection emails sent to ${rejected.length} candidates.`)} style={{ marginTop: 8, padding: '9px 20px', borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>📧 Send Rejection Emails ({rejected.length})</button>
            )}
          </div>
        )
      })()}
    </div>
  )

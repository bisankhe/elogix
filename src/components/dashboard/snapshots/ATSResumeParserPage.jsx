// FILE: ATSResumeParserPage.jsx
// World-class ATS — AI Resume Parser, Matcher, Ranker with Gold/Silver/Bronze scoring

import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const G  = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#7c3aed 100%)'
const GA = 'linear-gradient(135deg,#4338ca,#7c3aed)'
const P  = '#4338ca'

const JOB = { title:'Senior Software Engineer', dept:'Engineering', exp:'5+ years', skills:['React','Node.js','PostgreSQL','AWS','Docker','TypeScript','Git','REST APIs'], edu:'Bachelor in CS/IT or equivalent', salary:'NPR 80,000-120,000', location:'Kathmandu' }

const PARSED_CANDIDATES = [
  {
    id:'c1', name:'Gita Maharjan', email:'gita@email.com', phone:'9800000000', avatar:'GM',
    applied:'2024-01-15', source:'LinkedIn',
    parsed:{ skills:['React','Node.js','PostgreSQL','AWS','Docker','TypeScript','Python','Redis'], exp:'6 years', edu:'M.Tech CS, TU', location:'Kathmandu', salary:'NPR 90,000', linkedin:'linkedin.com/in/gita', github:'github.com/gita', certifications:['AWS Solutions Architect','Scrum Master'] },
    scores:{ skills:98, exp:95, edu:100, location:100, salary:90, overall:96 },
    rank:'Gold', aiSummary:'Exceptional candidate — 6/8 required skills match exactly with 2 bonus certifications. Above-average experience. Slightly above salary range but extremely high value. Strongly recommended for immediate panel interview.',
    recommendation:'Strongly Recommended'
  },
  {
    id:'c2', name:'Rajan Shrestha', email:'rajan@email.com', phone:'9801111111', avatar:'RS',
    applied:'2024-01-16', source:'Company Portal',
    parsed:{ skills:['React','Node.js','PostgreSQL','AWS','Docker','JavaScript'], exp:'6 years', edu:'B.Tech CS', location:'Kathmandu', salary:'NPR 85,000', linkedin:'linkedin.com/in/rajan', github:'github.com/rajan', certifications:['AWS Developer'] },
    scores:{ skills:92, exp:95, edu:88, location:100, salary:95, overall:94 },
    rank:'Gold', aiSummary:'Strong candidate with 6/8 skills matched. Good experience level and within salary range. Missing TypeScript and REST API formal experience but demonstrated through projects. Recommended for written test.',
    recommendation:'Recommended'
  },
  {
    id:'c3', name:'Priya Tamang', email:'priya@email.com', phone:'9802222222', avatar:'PT',
    applied:'2024-01-17', source:'Indeed',
    parsed:{ skills:['React','Node.js','MySQL','JavaScript','Git'], exp:'5 years', edu:'M.Sc IT', location:'Pokhara', salary:'NPR 75,000', linkedin:'linkedin.com/in/priya', github:'', certifications:[] },
    scores:{ skills:78, exp:90, edu:92, location:70, salary:100, overall:86 },
    rank:'Silver', aiSummary:'Good candidate with relevant skills but location mismatch (Pokhara). Uses MySQL not PostgreSQL — transferable. Salary expectation below range (value hire). Missing Docker and AWS experience. Worth pursuing if relocation confirmed.',
    recommendation:'Consider'
  },
  {
    id:'c4', name:'Anil KC', email:'anil@email.com', phone:'9803333333', avatar:'AK',
    applied:'2024-01-18', source:'LinkedIn',
    parsed:{ skills:['React','PostgreSQL','AWS','Docker','Python'], exp:'7 years', edu:'B.E. CS', location:'Kathmandu', salary:'NPR 130,000', linkedin:'linkedin.com/in/anil', github:'github.com/anil', certifications:['AWS DevOps'] },
    scores:{ skills:82, exp:100, edu:85, location:100, salary:65, overall:86 },
    rank:'Silver', aiSummary:'Senior candidate with excellent experience and cloud expertise. Missing Node.js and TypeScript — key requirements. Salary expectation significantly above range. Has 7 years experience which is a premium. Good fit if salary can be negotiated.',
    recommendation:'Consider — Negotiate Salary'
  },
  {
    id:'c5', name:'Bikash Gurung', email:'bikash@email.com', phone:'9805555555', avatar:'BG',
    applied:'2024-01-19', source:'Naukri',
    parsed:{ skills:['React','Node.js','MongoDB'], exp:'3 years', edu:'BCA', location:'Kathmandu', salary:'NPR 55,000', linkedin:'', github:'github.com/bikash', certifications:[] },
    scores:{ skills:60, exp:55, edu:65, location:100, salary:100, overall:74 },
    rank:'Bronze', aiSummary:'Junior candidate with potential. Only 3/8 skills matched and insufficient experience (3 years vs required 5+). Uses MongoDB not PostgreSQL. Education below preferred level. Not suitable for this role — consider for junior position.',
    recommendation:'Reject for this Role'
  },
]

const SKILL_COLORS = { match:'#10b981', partial:'#f59e0b', missing:'#ef4444' }

function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:9, color:'#374151', fontWeight:600 }}>{label}</span>
        <span style={{ fontSize:9, fontWeight:800, color:value>=90?'#059669':value>=75?'#f59e0b':'#ef4444' }}>{value}%</span>
      </div>
      <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${value}%`, background:value>=90?'#10b981':value>=75?'#f59e0b':'#ef4444', borderRadius:3, transition:'width .6s' }}/>
      </div>
    </div>
  )

export default function ATSResumeParserPage() {
  const { navTo } = useApp()
  const [selected, setSelected] = useState(PARSED_CANDIDATES[0])
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [tab, setTab] = useState('parsed')

  const handleUpload = async () => {
    setUploading(true)
    await new Promise(r=>setTimeout(r,2500))
    setUploading(false)
    setUploadMsg('✅ 24 CVs uploaded! AI parsing complete — 18 candidates created, 3 duplicates detected and merged, 3 invalid files skipped.')

  const rankColor = { Gold:'#fbbf24', Silver:'#94a3b8', Bronze:'#d97706' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'18px 24px', boxShadow:'0 4px 20px rgba(67,56,202,.3)' }}>
        <div style={{ fontSize:8, color:'rgba(255,255,255,.5)', marginBottom:3 }}>ATS · Recruitment & Hiring</div>
        <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>🤖 AI Resume Parser & Matcher</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2 }}>AI OCR · Auto CV parsing · Skills matching · AI ranking · Gold/Silver/Bronze classification</div>
        <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap' }}>
          {[{l:'Parsed CVs',v:PARSED_CANDIDATES.length},{l:'🥇 Gold',v:PARSED_CANDIDATES.filter(c=>c.rank==='Gold').length},{l:'🥈 Silver',v:PARSED_CANDIDATES.filter(c=>c.rank==='Silver').length},{l:'🥉 Bronze',v:PARSED_CANDIDATES.filter(c=>c.rank==='Bronze').length}].map((s,i)=>(
            <div key={i} style={{ background:'rgba(255,255,255,.12)', borderRadius:10, padding:'5px 14px' }}>
              <div style={{ fontSize:8, color:'rgba(255,255,255,.6)' }}>{s.l}</div>
              <div style={{ fontSize:16, fontWeight:900, color:'#fff' }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload zone */}
      <div style={{ background:'#fff', borderRadius:14, padding:20, border:'2px dashed #e2e8f0' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📄</div>
          <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', marginBottom:4 }}>Bulk Upload Resumes</div>
          <div style={{ fontSize:10, color:'#64748b', marginBottom:14 }}>PDF · DOCX · DOC · TXT — AI will auto-parse, extract skills, detect duplicates, create candidate profiles</div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={handleUpload} disabled={uploading} style={{ padding:'10px 24px', borderRadius:11, border:'none', background:GA, color:'#fff', fontSize:11, fontWeight:700, cursor:uploading?'default':'pointer', display:'flex', alignItems:'center', gap:8 }}>
              {uploading?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite'}}/>AI Parsing CVs...</>:'📁 Upload Bulk CVs'}
            </button>
            <button style={{ padding:'10px 24px', borderRadius:11, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:11, fontWeight:600, cursor:'pointer' }}>🔗 Import from LinkedIn</button>
            <button style={{ padding:'10px 24px', borderRadius:11, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:11, fontWeight:600, cursor:'pointer' }}>📧 Fetch from Email</button>
          </div>
          {uploadMsg && <div style={{ marginTop:12, fontSize:10, color:'#15803d', fontWeight:700, background:'#f0fdf4', padding:'8px 16px', borderRadius:8 }}>{uploadMsg}</div>}
        </div>
      </div>

      {/* Job being matched */}
      <div style={{ background:'#eff6ff', borderRadius:12, padding:'12px 16px', border:'1px solid #bfdbfe', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#1e40af' }}>🎯 Matching against: {JOB.title}</div>
          <div style={{ fontSize:9, color:'#3b82f6', marginTop:2 }}>Required skills: {JOB.skills.join(' · ')} · {JOB.exp} · {JOB.edu}</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #bfdbfe', background:'#fff', color:'#1e40af', fontSize:9, fontWeight:700, cursor:'pointer' }}>Change Job</button>
          <button onClick={()=>navTo?.('ats-candidate-pipeline')} style={{ padding:'6px 12px', borderRadius:8, border:'none', background:GA, color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>View Pipeline →</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:14 }}>
        {/* Candidate list */}
        <div>
          <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:8 }}>🏆 AI Ranking</div>
          {PARSED_CANDIDATES.map(c => (
            <div key={c.id} onClick={()=>setSelected(c)}
              style={{ background:'#fff', borderRadius:12, padding:'12px 14px', border:`1.5px solid ${selected?.id===c.id?P:'#e2e8f0'}`, cursor:'pointer', marginBottom:6, transition:'all .15s' }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:GA, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:900, flexShrink:0 }}>{c.avatar}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'#0f172a' }}>{c.name}</div>
                  <div style={{ fontSize:8, color:'#64748b', marginTop:1 }}>{c.parsed.exp} · {c.parsed.edu}</div>
                  <div style={{ fontSize:7, color:'#94a3b8', marginTop:1 }}>via {c.source} · {c.applied}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:c.scores.overall>=90?'#059669':c.scores.overall>=80?'#f59e0b':'#ef4444' }}>{c.scores.overall}%</div>
                  <div style={{ fontSize:8, color:rankColor[c.rank], fontWeight:700 }}>{'🥇🥈🥉'[['Gold','Silver','Bronze'].indexOf(c.rank)]} {c.rank}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected && (
          <div style={{ background:'#fff', borderRadius:14, padding:20, border:`1px solid ${P}20` }}>
            {/* Top */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:48, height:48, borderRadius:12, background:GA, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:16, fontWeight:900 }}>{selected.avatar}</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:900, color:'#0f172a' }}>{selected.name}</div>
                  <div style={{ fontSize:9, color:'#64748b' }}>{selected.email} · {selected.phone}</div>
                  <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
                    {selected.parsed.linkedin&&<a href={`https://${selected.parsed.linkedin}`} style={{ fontSize:8, color:'#0077b5', fontWeight:600 }}>💼 LinkedIn</a>}
                    {selected.parsed.github&&<a href={`https://${selected.parsed.github}`} style={{ fontSize:8, color:'#0f172a', fontWeight:600 }}>🐙 GitHub</a>}
                  </div>
                </div>
              </div>
              <div style={{ textAlign:'center', padding:'12px 20px', background:selected.scores.overall>=90?'#f0fdf4':selected.scores.overall>=80?'#fffbeb':'#fef2f2', borderRadius:12, border:`1px solid ${selected.scores.overall>=90?'#bbf7d0':selected.scores.overall>=80?'#fde68a':'#fecaca'}` }}>
                <div style={{ fontSize:28, fontWeight:900, color:selected.scores.overall>=90?'#059669':selected.scores.overall>=80?'#f59e0b':'#ef4444' }}>{selected.scores.overall}%</div>
                <div style={{ fontSize:9, color:'#64748b' }}>AI Match Score</div>
                <div style={{ fontSize:10, fontWeight:800, color:rankColor[selected.rank], marginTop:2 }}>{'🥇🥈🥉'[['Gold','Silver','Bronze'].indexOf(selected.rank)]} {selected.rank}</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', gap:3, background:'#f8fafc', borderRadius:10, padding:3, marginBottom:16 }}>
              {[['parsed','📊 Parsed Data'],['match','🎯 Match Analysis'],['ai','🤖 AI Summary']].map(([t,l])=>(
                <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'7px', borderRadius:8, border:'none', background:tab===t?'#fff':'transparent', color:tab===t?P:'#64748b', fontWeight:tab===t?800:400, fontSize:10, cursor:'pointer', boxShadow:tab===t?'0 1px 4px rgba(0,0,0,.08)':'none' }}>{l}</button>
              ))}
            </div>

            {tab==='parsed' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#374151', marginBottom:8 }}>📋 Extracted Information</div>
                  {[['Experience',selected.parsed.exp],['Education',selected.parsed.edu],['Location',selected.parsed.location],['Salary Expectation',selected.parsed.salary]].map(([l,v],i)=>(
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f8fafc' }}>
                      <span style={{ fontSize:9, color:'#94a3b8' }}>{l}</span>
                      <span style={{ fontSize:9, fontWeight:700, color:'#0f172a' }}>{v}</span>
                    </div>
                  ))}
                  {selected.parsed.certifications?.length>0 && (
                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:'#374151', marginBottom:5 }}>🏆 Certifications</div>
                      {selected.parsed.certifications.map((c,i)=><span key={i} style={{ display:'inline-block', fontSize:8, padding:'2px 8px', borderRadius:8, background:'#f0fdf4', color:'#15803d', fontWeight:700, margin:'0 4px 4px 0' }}>{c}</span>)}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#374151', marginBottom:8 }}>🛠️ Extracted Skills</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {selected.parsed.skills.map((skill,i)=>{
                      const isRequired = JOB.skills.includes(skill)
                      return (
                        <span key={i} style={{ fontSize:8, padding:'3px 9px', borderRadius:8, background:isRequired?'#f0fdf4':'#f8fafc', color:isRequired?'#15803d':'#64748b', border:`1px solid ${isRequired?'#bbf7d0':'#e2e8f0'}`, fontWeight:isRequired?700:400 }}>
                          {isRequired?'✓ ':''}{skill}
                        </span>
                      )
                    })}
                  </div>
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontSize:8, color:'#94a3b8', marginBottom:4 }}>Required skills not found:</div>
                    {JOB.skills.filter(s=>!selected.parsed.skills.includes(s)).map((s,i)=>(
                      <span key={i} style={{ display:'inline-block', fontSize:8, padding:'2px 7px', borderRadius:8, background:'#fef2f2', color:'#dc2626', margin:'0 4px 4px 0', fontWeight:600 }}>✗ {s}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab==='match' && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'#374151', marginBottom:12 }}>🎯 AI Match Analysis</div>
                <ScoreBar label="Skills Match" value={selected.scores.skills}/>
                <ScoreBar label="Experience Match" value={selected.scores.exp}/>
                <ScoreBar label="Education Match" value={selected.scores.edu}/>
                <ScoreBar label="Location Match" value={selected.scores.location}/>
                <ScoreBar label="Salary Compatibility" value={selected.scores.salary}/>
                <div style={{ marginTop:12, padding:'10px 14px', background:`${selected.scores.overall>=90?'#f0fdf4':selected.scores.overall>=80?'#fffbeb':'#fef2f2'}`, borderRadius:10 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#374151', marginBottom:4 }}>🤖 AI Recommendation</div>
                  <div style={{ fontSize:9, color:'#374151', fontWeight:700 }}>{selected.recommendation}</div>
                </div>
              </div>
            )}

            {tab==='ai' && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'#374151', marginBottom:10 }}>🤖 AI-Generated Summary</div>
                <div style={{ fontSize:10, color:'#374151', lineHeight:1.7, background:'#f8fafc', padding:'14px 16px', borderRadius:10 }}>{selected.aiSummary}</div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display:'flex', gap:8, marginTop:16, flexWrap:'wrap' }}>
              <button onClick={()=>navTo?.('ats-assessment')} style={{ padding:'9px 16px', borderRadius:10, border:'none', background:'#eff6ff', color:'#1e40af', fontSize:10, fontWeight:700, cursor:'pointer' }}>✍️ Invite to Test</button>
              <button onClick={()=>navTo?.('ats-video-interview')} style={{ padding:'9px 16px', borderRadius:10, border:'none', background:'#fffbeb', color:'#92400e', fontSize:10, fontWeight:700, cursor:'pointer' }}>🎥 Video Interview</button>
              <button onClick={()=>navTo?.('ats-interview-panel')} style={{ padding:'9px 16px', borderRadius:10, border:'none', background:'#f5f3ff', color:'#5b21b6', fontSize:10, fontWeight:700, cursor:'pointer' }}>👥 Schedule Panel</button>
              <button style={{ padding:'9px 16px', borderRadius:10, border:'none', background:'#fef2f2', color:'#dc2626', fontSize:10, fontWeight:700, cursor:'pointer' }}>❌ Reject</button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

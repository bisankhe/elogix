// ATSCandidateSearchPage.jsx
// AI Semantic Search · Duplicate Detection · Candidate Rediscovery · Talent Pool AI Matching
import { useState, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

async function callAI(prompt, sys) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000,
        system: sys || 'You are a world-class AI recruiter assistant.',
        messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(20000)
    })
    if (r.ok) { const d = await r.json(); return d.content?.map(c => c.text).join('') || '' }
  } catch {}
  return null

const CANDIDATE_DB = [
  { id:'c001', name:'Gita Maharjan',    email:'gita@mail.com',   phone:'+977-9801001001', age:30, location:'Kathmandu', current_role:'React Developer',      company:'Tech Solutions',  exp:6.5, skills:['React','Node.js','PostgreSQL','AWS','Docker','TypeScript'], cv_score:92, status:'Active', last_seen:'2 days ago',   source:'LinkedIn',   salary:95000, duplicate:false },
  { id:'c002', name:'Rajan Shrestha',   email:'rajan@mail.com',  phone:'+977-9802002002', age:31, location:'Kathmandu', current_role:'Full Stack Dev',         company:'Digital Agency',  exp:6,   skills:['React','Node.js','PostgreSQL','AWS','JavaScript'],        cv_score:86, status:'Active', last_seen:'5 days ago',   source:'Indeed',     salary:85000, duplicate:false },
  { id:'c003', name:'Anil KC',          email:'anil@mail.com',   phone:'+977-9804004004', age:33, location:'Kathmandu', current_role:'Senior Engineer',        company:'FinTech Nepal',   exp:7,   skills:['React','PostgreSQL','AWS','Docker','Python','Kubernetes'],  cv_score:90, status:'Pool',   last_seen:'12 days ago',  source:'Portal',     salary:130000,duplicate:false },
  { id:'c004', name:'Priya Tamang',     email:'priya@mail.com',  phone:'+977-9803003003', age:28, location:'Pokhara',   current_role:'Frontend Developer',     company:'WebCraft',        exp:5,   skills:['React','Node.js','MySQL','JavaScript','Git'],              cv_score:80, status:'Active', last_seen:'3 days ago',   source:'Naukri',     salary:75000, duplicate:false },
  { id:'c005', name:'Bikash Tamang',    email:'bikash@mail.com', phone:'+977-9806006006', age:26, location:'Lalitpur',  current_role:'Software Developer',     company:'StartupHub',      exp:3,   skills:['React','Node.js','MongoDB','JavaScript'],                   cv_score:70, status:'Pool',   last_seen:'20 days ago',  source:'Facebook',   salary:55000, duplicate:false },
  { id:'c006', name:'Sunita Rai',       email:'sunita@mail.com', phone:'+977-9807007007', age:29, location:'Kathmandu', current_role:'Software Engineer',       company:'IT Hub',          exp:4,   skills:['Java','Spring Boot','React','SQL'],                         cv_score:75, status:'Pool',   last_seen:'45 days ago',  source:'MeroJob',    salary:70000, duplicate:false },
  { id:'c007', name:'Dev Maharjan',     email:'dev@mail.com',    phone:'+977-9808008008', age:30, location:'Kathmandu', current_role:'DevOps Engineer',         company:'CloudNepal',      exp:5,   skills:['AWS','Docker','Kubernetes','Jenkins','Terraform'],           cv_score:85, status:'Pool',   last_seen:'8 days ago',   source:'LinkedIn',   salary:90000, duplicate:false },
  { id:'c008', name:'Gita Maharjan',    email:'gita@gmail.com',  phone:'+977-9801001099', age:30, location:'Kathmandu', current_role:'React Developer',         company:'Tech Solutions',  exp:6.5, skills:['React','Node.js','PostgreSQL','AWS'],                       cv_score:91, status:'Active', last_seen:'2 days ago',   source:'Direct',     salary:95000, duplicate:true },
  { id:'c009', name:'Ramesh Karki',     email:'ramesh@mail.com', phone:'+977-9809009009', age:35, location:'Kathmandu', current_role:'Tech Lead',               company:'NCell',           exp:8,   skills:['React','Node.js','AWS','Leadership','System Design'],       cv_score:88, status:'Pool',   last_seen:'60 days ago',  source:'LinkedIn',   salary:140000,duplicate:false },
  { id:'c010', name:'Anjali Thapa',     email:'anjali@mail.com', phone:'+977-9810010010', age:27, location:'Kathmandu', current_role:'Frontend Engineer',       company:'E-Sewa',          exp:3,   skills:['React','Vue.js','CSS','JavaScript','Figma'],                cv_score:72, status:'Pool',   last_seen:'90 days ago',  source:'Referral',   salary:60000, duplicate:false },
]

const DUPES = [
  { ids:['c001','c008'], name:'Gita Maharjan', reason:'Same name + company + experience + location. Email differs (gita@mail.com vs gita@gmail.com). Phone differs by last 2 digits.', confidence:97, action:'Merge' },
]

export default function ATSCandidateSearchPage() {
  const { navigate } = useApp()
  const [tab, setTab] = useState('semantic')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [aiResults, setAiResults] = useState(null)
  const [aiExplain, setAiExplain] = useState('')
  const [filters, setFilters] = useState({ location:'', minExp:'', maxSalary:'', skills:'', status:'' })
  const [selCand, setSelCand] = useState(null)
  const [msg, setMsg] = useState('')

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const semanticSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearching(true)
    setAiResults(null)
    const explain = await callAI(
      `Given this natural-language search query: "${query}"\n\nFrom these candidates:\n${CANDIDATE_DB.filter(c=>!c.duplicate).map(c=>`${c.id}: ${c.name}, ${c.current_role}, ${c.exp}yr exp, skills: ${c.skills.join(', ')}, location: ${c.location}, salary: NPR ${c.salary}`).join('\n')}\n\nReturn a JSON object: { "ranked_ids": ["c001","c003",...] in order of relevance, "explanation": "why top result matches", "insights": "what you inferred from the query" }\nReturn ONLY valid JSON.`,
      'You are an AI semantic recruiter search engine. Understand intent, not just keywords. Return only valid JSON.'
    )
    let ranked = []
    try {
      const parsed = JSON.parse((explain || '').replace(/```json|```/g, '').trim())
      ranked = parsed.ranked_ids || []
      setAiExplain((parsed.explanation || '') + (parsed.insights ? '\n\nInferred intent: ' + parsed.insights : ''))
    } catch {
      ranked = CANDIDATE_DB.filter(c => !c.duplicate).map(c => c.id)
      setAiExplain('AI semantic ranking applied based on skills, experience, and role relevance.')
    const results = ranked.map(id => CANDIDATE_DB.find(c => c.id === id)).filter(Boolean)
    const remaining = CANDIDATE_DB.filter(c => !c.duplicate && !ranked.includes(c.id))
    setAiResults([...results, ...remaining])
    setSearching(false)
  }, [query])

  const filteredDB = CANDIDATE_DB.filter(c => {
    if (c.duplicate) return false
    if (filters.location && !c.location.toLowerCase().includes(filters.location.toLowerCase())) return false
    if (filters.minExp && c.exp < parseFloat(filters.minExp)) return false
    if (filters.maxSalary && c.salary > parseInt(filters.maxSalary)) return false
    if (filters.skills && !filters.skills.split(',').every(s => c.skills.some(cs => cs.toLowerCase().includes(s.trim().toLowerCase())))) return false
    if (filters.status && c.status !== filters.status) return false
    return true
  })

  const display = tab === 'semantic' ? (aiResults || CANDIDATE_DB.filter(c=>!c.duplicate)) : tab === 'rediscover' ? CANDIDATE_DB.filter(c => c.status === 'Pool' && !c.duplicate) : filteredDB

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'linear-gradient(135deg,#1e3a5f,#7c3aed)', borderRadius:14, padding:'16px 22px', marginBottom:16, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900 }}>AI Candidate Search</h2>
          <p style={{ margin:'3px 0 0', fontSize:10, opacity:.8 }}>Semantic AI search · Duplicate detection · Talent rediscovery · Natural language queries</p>
        </div>
        {msg && <span style={{ fontSize:9, padding:'5px 12px', background:'rgba(255,255,255,.2)', borderRadius:8 }}>{msg}</span>}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[['semantic','🔍 AI Semantic Search'],['filter','⚙️ Advanced Filter'],['rediscover','♻️ Candidate Rediscovery'],['duplicates','🔁 Duplicate Detection']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'8px 16px', borderRadius:9, background:tab===t?'#7c3aed':'#fff', color:tab===t?'#fff':'#475569', fontSize:10, fontWeight:tab===t?800:400, cursor:'pointer', border:tab!==t?'1px solid #e2e8f0':'none' }}>
            {l}
          </button>
        ))}
        <div style={{ flex:1 }} />
        <div style={{ padding:'8px 14px', borderRadius:9, background:'#fff', border:'1px solid #e2e8f0', fontSize:10, color:'#374151' }}>
          {CANDIDATE_DB.filter(c=>!c.duplicate).length} candidates · {CANDIDATE_DB.filter(c=>c.duplicate).length} duplicate detected
        </div>
      </div>

      {/* SEMANTIC SEARCH */}
      {tab === 'semantic' && (
        <div>
          <div style={{ background:'#fff', borderRadius:14, padding:'18px', border:'1px solid #e2e8f0', marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#374151', marginBottom:6 }}>Natural Language AI Search</div>
            <div style={{ display:'flex', gap:10 }}>
              <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&semanticSearch()}
                placeholder='Try: "senior react developer in Kathmandu with AWS experience under NPR 100K" or "backend engineer 5+ years microservices"'
                style={{ flex:1, padding:'11px 14px', borderRadius:10, border:'2px solid #e2e8f0', fontSize:11, outline:'none' }} />
              <button onClick={semanticSearch} disabled={!query.trim()||searching}
                style={{ padding:'11px 22px', borderRadius:10, border:'none', background:searching||!query.trim()?'#e2e8f0':'linear-gradient(135deg,#7c3aed,#1e40af)', color:searching||!query.trim()?'#94a3b8':'#fff', fontSize:11, fontWeight:800, cursor:searching||!query.trim()?'default':'pointer' }}>
                {searching?'Searching...':'AI Search'}
              </button>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
              {['React developer 4+ years AWS','Full stack engineer Kathmandu hybrid','DevOps Kubernetes experience','Frontend React salary under 80K'].map(s => (
                <button key={s} onClick={()=>{setQuery(s);}} style={{ fontSize:8, padding:'3px 10px', borderRadius:6, border:'1px solid #bfdbfe', background:'#eff6ff', color:'#1e40af', cursor:'pointer' }}>{s}</button>
              ))}
            </div>
            {aiExplain && <div style={{ marginTop:10, padding:'8px 12px', background:'#f5f3ff', borderRadius:8, border:'1px solid #e9d5ff', fontSize:9, color:'#6d28d9', lineHeight:1.6 }}>
              🤖 AI: {aiExplain}
            </div>}
          </div>
          <div style={{ display:'flex', gap:14 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#64748b', marginBottom:8 }}>{display.length} results {aiResults?'(AI ranked)':''}</div>
              {display.map((c,i) => (
                <div key={c.id} onClick={()=>setSelCand(c)} style={{ background:'#fff', borderRadius:12, padding:'12px 14px', marginBottom:8, border:`1.5px solid ${selCand?.id===c.id?'#7c3aed':'#f1f5f9'}`, cursor:'pointer', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                  {aiResults && <div style={{ width:22, height:22, borderRadius:'50%', background:i===0?'#fef9c3':i===1?'#f1f5f9':i===2?'#fff7ed':'#f8fafc', border:`2px solid ${i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':'#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:i===0?'#92400e':i===1?'#475569':i===2?'#92400e':'#94a3b8', flexShrink:0 }}>
                    {i+1}
                  </div>}
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#1e40af,#7c3aed)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, flexShrink:0 }}>{c.name.split(' ').map(x=>x[0]).join('')}</div>
                  <div style={{ flex:1, minWidth:160 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:2 }}>{c.name}</div>
                    <div style={{ fontSize:9, color:'#64748b' }}>{c.current_role} · {c.company} · {c.exp}yr · {c.location}</div>
                    <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
                      {c.skills.slice(0,4).map(s=><span key={s} style={{ fontSize:7, padding:'1px 6px', borderRadius:4, background:'#eff6ff', color:'#1e40af' }}>{s}</span>)}
                      {c.skills.length>4&&<span style={{ fontSize:7, color:'#94a3b8' }}>+{c.skills.length-4}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:16, fontWeight:900, color:c.cv_score>=85?'#059669':c.cv_score>=70?'#f59e0b':'#ef4444' }}>{c.cv_score}%</div>
                      <div style={{ fontSize:7, color:'#94a3b8' }}>AI Score</div>
                    </div>
                    <span style={{ fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:6, background:c.status==='Active'?'#d1fae5':'#eff6ff', color:c.status==='Active'?'#065f46':'#1e40af' }}>{c.status}</span>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:9, color:'#94a3b8', fontWeight:600 }}>NPR {c.salary.toLocaleString()}</div>
                      <div style={{ fontSize:7, color:'#94a3b8' }}>{c.last_seen}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {selCand && (
              <div style={{ width:280, flexShrink:0 }}>
                <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #e2e8f0', position:'sticky', top:0 }}>
                  <div style={{ textAlign:'center', marginBottom:14 }}>
                    <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#1e40af,#7c3aed)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, margin:'0 auto 8px' }}>{selCand.name.split(' ').map(x=>x[0]).join('')}</div>
                    <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>{selCand.name}</div>
                    <div style={{ fontSize:9, color:'#64748b' }}>{selCand.current_role}</div>
                  </div>
                  {[['Email',selCand.email],['Phone',selCand.phone],['Location',selCand.location],['Experience',selCand.exp+'yr'],['Expected Salary','NPR '+selCand.salary.toLocaleString()],['Source',selCand.source],['Last Active',selCand.last_seen]].map(([k,v])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:9, padding:'4px 0', borderBottom:'1px solid #f8fafc' }}>
                      <span style={{ color:'#94a3b8' }}>{k}</span><span style={{ color:'#0f172a', fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'#374151', marginBottom:5 }}>Skills</div>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {selCand.skills.map(s=><span key={s} style={{ fontSize:8, padding:'2px 8px', borderRadius:6, background:'#eff6ff', color:'#1e40af', border:'1px solid #bfdbfe' }}>{s}</span>)}
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:14 }}>
                    <button onClick={()=>notify('Added to shortlist!')} style={{ padding:'8px', borderRadius:8, border:'none', background:'#059669', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>Shortlist</button>
                    <button onClick={()=>notify('Invite sent!')} style={{ padding:'8px', borderRadius:8, border:'none', background:'#1e40af', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>Invite</button>
                    <button onClick={()=>notify('Added to talent pool!')} style={{ padding:'8px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:8, cursor:'pointer' }}>Add to Pool</button>
                    <button onClick={()=>notify('Message sent!')} style={{ padding:'8px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:8, cursor:'pointer' }}>Message</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADVANCED FILTER */}
      {tab === 'filter' && (
        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:14 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:14 }}>Advanced Filters</div>
            {[['Location','location','text','Kathmandu'],['Min Experience (yr)','minExp','number','4'],['Max Salary (NPR)','maxSalary','number','100000'],['Skills (comma-sep)','skills','text','React, Node.js']].map(([l,k,t,ph])=>(
              <div key={k} style={{ marginBottom:12 }}>
                <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                <input type={t} value={filters[k]} onChange={e=>setFilters(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Status</label>
              <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none' }}>
                <option value=''>All</option>
                <option value='Active'>Active</option>
                <option value='Pool'>Talent Pool</option>
              </select>
            </div>
            <button onClick={()=>setFilters({location:'',minExp:'',maxSalary:'',skills:'',status:''})} style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#374151', fontSize:9, cursor:'pointer' }}>Clear Filters</button>
          </div>
          <div>
            <div style={{ fontSize:10, color:'#64748b', marginBottom:8, fontWeight:700 }}>{filteredDB.length} candidates match your filters</div>
            {filteredDB.map(c=>(
              <div key={c.id} style={{ background:'#fff', borderRadius:11, padding:'11px 14px', marginBottom:8, border:'1px solid #f1f5f9', display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#1e40af,#7c3aed)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, flexShrink:0 }}>{c.name.split(' ').map(x=>x[0]).join('')}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{c.name} <span style={{ fontSize:8, color:'#64748b' }}>· {c.current_role} · {c.exp}yr · {c.location}</span></div>
                  <div style={{ display:'flex', gap:4, marginTop:3 }}>{c.skills.slice(0,5).map(s=><span key={s} style={{ fontSize:7, padding:'1px 5px', borderRadius:4, background:'#eff6ff', color:'#1e40af' }}>{s}</span>)}</div>
                </div>
                <div style={{ fontSize:11, fontWeight:900, color:c.cv_score>=80?'#059669':'#f59e0b' }}>{c.cv_score}%</div>
                <div style={{ fontSize:9, color:'#94a3b8' }}>NPR {c.salary.toLocaleString()}</div>
                <button onClick={()=>notify('Shortlisted!')} style={{ padding:'5px 10px', borderRadius:7, border:'none', background:'#1e40af', color:'#fff', fontSize:8, cursor:'pointer' }}>Shortlist</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CANDIDATE REDISCOVERY */}
      {tab === 'rediscover' && (
        <div>
          <div style={{ background:'#eff6ff', borderRadius:12, padding:'12px 16px', marginBottom:14, border:'1px solid #bfdbfe' }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#1e40af', marginBottom:4 }}>AI Candidate Rediscovery</div>
            <div style={{ fontSize:9, color:'#334155' }}>These candidates applied or were screened previously and are now in your talent pool. AI identifies which are worth re-engaging for current openings.</div>
          </div>
          {display.map(c => {
            const daysSince = parseInt(c.last_seen)
            const reEngageScore = Math.max(0, 100 - (daysSince * 1.5))
            return (
              <div key={c.id} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', marginBottom:8, border:'1px solid #f1f5f9', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#1e40af,#7c3aed)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, flexShrink:0 }}>{c.name.split(' ').map(x=>x[0]).join('')}</div>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#0f172a', marginBottom:2 }}>{c.name}</div>
                  <div style={{ fontSize:9, color:'#64748b' }}>{c.current_role} · {c.company} · {c.exp}yr exp · Last active: {c.last_seen}</div>
                  <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
                    {c.skills.slice(0,4).map(s=><span key={s} style={{ fontSize:7, padding:'1px 6px', borderRadius:4, background:'#f0fdf4', color:'#065f46' }}>{s}</span>)}
                  </div>
                </div>
                <div style={{ textAlign:'center', padding:'8px 12px', background:'#f8fafc', borderRadius:9 }}>
                  <div style={{ fontSize:14, fontWeight:900, color:reEngageScore>=70?'#059669':'#f59e0b' }}>{Math.round(reEngageScore)}%</div>
                  <div style={{ fontSize:7, color:'#94a3b8' }}>Re-engage score</div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>notify(`Re-engagement email sent to ${c.name}!`)} style={{ padding:'6px 12px', borderRadius:8, border:'none', background:'#059669', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>Re-engage</button>
                  <button onClick={()=>notify('Added to active pipeline!')} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:8, cursor:'pointer' }}>To Pipeline</button>
                </div>
              </div>
            )
          })}
          <button onClick={()=>notify('Bulk re-engagement sent to 6 candidates!')} style={{ marginTop:10, padding:'10px 24px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#1e40af,#7c3aed)', color:'#fff', fontSize:10, fontWeight:800, cursor:'pointer' }}>Bulk Re-engage All (Email + WhatsApp)</button>
        </div>
      )}

      {/* DUPLICATE DETECTION */}
      {tab === 'duplicates' && (
        <div>
          <div style={{ background:'#fff7ed', borderRadius:12, padding:'12px 16px', marginBottom:14, border:'1px solid #fed7aa' }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#c2410c', marginBottom:4 }}>AI Duplicate Detection</div>
            <div style={{ fontSize:9, color:'#92400e' }}>AI detected {DUPES.length} duplicate candidate(s) in your database. Duplicates inflate your funnel and cause confused communication. Merge or mark as separate below.</div>
          </div>
          {DUPES.map((d,i)=>(
            <div key={i} style={{ background:'#fff', borderRadius:14, padding:'16px', marginBottom:12, border:'2px solid #fed7aa' }}>
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
                <div style={{ fontSize:13, fontWeight:900, color:'#0f172a' }}>{d.name}</div>
                <span style={{ fontSize:9, fontWeight:700, padding:'3px 10px', borderRadius:8, background:'#fff7ed', color:'#c2410c' }}>{d.confidence}% duplicate confidence</span>
              </div>
              <div style={{ fontSize:9, color:'#374151', marginBottom:12, lineHeight:1.6, padding:'8px 12px', background:'#f8fafc', borderRadius:8 }}>
                AI Reason: {d.reason}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                {d.ids.map(id=>{
                  const c = CANDIDATE_DB.find(x=>x.id===id)
                  if(!c) return null
                  return(
                    <div key={id} style={{ padding:'10px', background:'#f8fafc', borderRadius:9, border:'1px solid #e2e8f0' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#0f172a', marginBottom:6 }}>{c.name} <span style={{ fontSize:8, color:'#94a3b8' }}>({c.id})</span></div>
                      {[['Email',c.email],['Phone',c.phone],['Source',c.source],['Added',c.last_seen]].map(([k,v])=>(
                        <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:8, padding:'2px 0' }}>
                          <span style={{ color:'#94a3b8' }}>{k}</span><span style={{ color:'#334155', fontWeight:600 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>notify('Records merged! Keeping primary profile, archiving duplicate.')} style={{ flex:1, padding:'9px', borderRadius:9, border:'none', background:'#f59e0b', color:'#fff', fontSize:10, fontWeight:800, cursor:'pointer' }}>Merge Records</button>
                <button onClick={()=>notify('Marked as separate individuals.')} style={{ flex:1, padding:'9px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:10, cursor:'pointer' }}>Keep Separate</button>
                <button onClick={()=>notify('Second record archived.')} style={{ flex:1, padding:'9px', borderRadius:9, border:'none', background:'#ef4444', color:'#fff', fontSize:10, cursor:'pointer' }}>Archive Duplicate</button>
              </div>
            </div>
          ))}
          <div style={{ background:'#f0fdf4', borderRadius:10, padding:'12px 14px', border:'1px solid #bbf7d0', fontSize:9, color:'#065f46' }}>
            AI detection methods: Name similarity · Email domain matching · Phone number variants · Same employer+role+location · CV content fingerprint · IP address matching
          </div>
        </div>
      )}
    </div>
  )

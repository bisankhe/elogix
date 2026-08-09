// ATSAIToolsPage.jsx — AI Toolbox: All AI writing, search, and recommendation tools
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

async function callAI(prompt, sys, max=1200) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:max,
        system: sys || 'You are an expert HR professional. Be concise and professional.',
        messages:[{role:'user',content:prompt}] }),
      signal: AbortSignal.timeout(25000)
    })
    if (r.ok) { const d=await r.json(); return d.content?.map(c=>c.text).join('')||'' }
  } catch {}
  return null
}

const AI_TOOLS = [
  { id:'email',     icon:'📧', label:'AI Email Writer',         color:'#1e40af', bg:'#eff6ff', desc:'Write professional recruitment emails for any stage' },
  { id:'whatsapp',  icon:'💬', label:'AI WhatsApp Writer',      color:'#25d366', bg:'#f0fdf4', desc:'Short, friendly WhatsApp messages for candidates' },
  { id:'jd',        icon:'📋', label:'AI JD Generator',         color:'#7c3aed', bg:'#f5f3ff', desc:'Bias-free job descriptions from a simple brief' },
  { id:'offer',     icon:'📄', label:'AI Offer Letter',         color:'#059669', bg:'#f0fdf4', desc:'Professional offer letters with Nepal LA2074 compliance' },
  { id:'feedback',  icon:'💡', label:'AI Feedback Generator',   color:'#f59e0b', bg:'#fffbeb', desc:'Constructive candidate feedback for any stage' },
  { id:'search',    icon:'🔍', label:'AI Candidate Search',     color:'#0891b2', bg:'#ecfeff', desc:'Natural language search across all candidate profiles' },
  { id:'salary',    icon:'💰', label:'AI Salary Advisor',       color:'#8b5cf6', bg:'#f5f3ff', desc:'Market salary recommendations for Nepal positions' },
  { id:'summary',   icon:'📊', label:'AI CV Summary',           color:'#ef4444', bg:'#fef2f2', desc:'Auto-summarise any CV into a structured profile' },
]

const EMAIL_TYPES = ['Application Received','Shortlisted — Written Exam Invite','Written Exam Result','Video Interview Invite','Interview Scheduled','Offer Letter','Rejected','Selected','Joining Reminder','Thank You for Applying','Background Verification Request','Reference Check Request']
const WA_TYPES    = ['Application Confirmed','Exam Link','Interview Reminder','Offer Notification','Rejection','Welcome Aboard']
const CANDIDATES_SAMPLE = ['Gita Maharjan — Senior React Dev (Score: 92%)', 'Anil KC — Senior React Dev (Score: 90%)', 'Rajan Shrestha — Senior React Dev (Score: 86%)', 'Priya Tamang — Senior React Dev (Score: 80%)', 'Laxmi Karmacharya — HR Business Partner (Score: 88%)']

export default function ATSAIToolsPage() {
  const { navigate } = useApp()
  const [selTool, setSelTool] = useState('email')
  const [output,  setOutput]  = useState('')
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState('')
  const [copied,  setCopied]  = useState(false)

  // Form states per tool
  const [emailForm, setEmailForm] = useState({ type:'Application Received', candidate:'Gita Maharjan', role:'Senior React Dev', company:'NepHR Pro', extra:'' })
  const [waForm,    setWaForm]    = useState({ type:'Exam Link', candidate:'Gita Maharjan', link:'https://ats.nephrpro.com/exam/abc123', date:'' })
  const [jdForm,    setJdForm]    = useState({ role:'', dept:'', skills:'', exp:'', level:'Senior' })
  const [offerForm, setOfferForm] = useState({ candidate:'', role:'', salary:'', joining:'', probation:'6 months' })
  const [fbForm,    setFbForm]    = useState({ candidate:'', stage:'Written Exam', outcome:'Not Passed', notes:'' })
  const [searchQ,   setSearchQ]   = useState('')
  const [salaryForm,setSalaryForm]= useState({ role:'', exp:'', location:'Kathmandu', skills:'' })
  const [cvText,    setCvText]    = useState('')

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),2500) }

  const generate = async () => {
    setLoading(true); setOutput('')
    let prompt = '', sys = ''

    if (selTool==='email') {
      sys = 'You are an expert recruitment email writer. Write professional, warm emails. Nepal context. Include subject line.'
      prompt = `Write a recruitment email:\nType: ${emailForm.type}\nCandidate: ${emailForm.candidate}\nRole: ${emailForm.role}\nCompany: ${emailForm.company}\n${emailForm.extra?'Additional context: '+emailForm.extra:''}\n\nFormat: Subject: ...\n\n[Body]`
    } else if (selTool==='whatsapp') {
      sys = 'Write concise, friendly WhatsApp messages for recruitment. Max 160 characters. Use emojis appropriately. Nepal context.'
      prompt = `Write a WhatsApp message:\nType: ${waForm.type}\nCandidate: ${waForm.candidate}\n${waForm.link?'Link: '+waForm.link:''}\n${waForm.date?'Date/Time: '+waForm.date:''}\n\nKeep under 200 words. Friendly and professional.`
    } else if (selTool==='jd') {
      sys = 'Write comprehensive, bias-free job descriptions. Use gender-neutral language. Nepal context.'
      prompt = `Write a complete, bias-free job description:\nRole: ${jdForm.role}\nDepartment: ${jdForm.dept}\nLevel: ${jdForm.level}\nExperience: ${jdForm.exp}\nKey Skills: ${jdForm.skills}\n\nInclude: Summary, 8 Key Responsibilities, 6 Requirements, 3 Nice-to-Have, Benefits. Gender-neutral. No age bias.`
    } else if (selTool==='offer') {
      sys = 'Write formal employment offer letters. Nepal Labour Act 2074 compliant. Professional and warm.'
      prompt = `Write an employment offer letter:\nCandidate: ${offerForm.candidate}\nRole: ${offerForm.role}\nSalary: NPR ${offerForm.salary}/month\nJoining Date: ${offerForm.joining}\nProbation: ${offerForm.probation} (Nepal Labour Act 2074 S.13)\n\nInclude: formal greeting, role & compensation, probation clause, benefits (18 days annual leave, 12 sick leave, SSF enrollment), acceptance instructions, digital signature placeholder.`
    } else if (selTool==='feedback') {
      sys = 'Write constructive, empathetic candidate feedback. Professional, specific, encouraging. Nepal context.'
      prompt = `Write candidate feedback:\nCandidate: ${fbForm.candidate}\nStage: ${fbForm.stage}\nOutcome: ${fbForm.outcome}\nNotes: ${fbForm.notes}\n\nWrite a professional, constructive 150-word feedback message. Be specific, encouraging, and suggest improvement areas. If rejected, remain positive.`
    } else if (selTool==='search') {
      sys = 'You are an AI talent search engine. Search our candidate database and return matching profiles with match scores and reasons.'
      prompt = `Semantic search request: "${searchQ}"\n\nFrom these candidates: ${CANDIDATES_SAMPLE.join(', ')}\n\nRank by relevance, explain match percentage, highlight matching skills and gaps. Format as a ranked list.`
    } else if (selTool==='salary') {
      sys = 'You are an expert Nepal HR compensation analyst with deep knowledge of Nepal market salary ranges.'
      prompt = `Provide salary recommendation for Nepal market:\nRole: ${salaryForm.role}\nExperience: ${salaryForm.exp}\nLocation: ${salaryForm.location}\nKey Skills: ${salaryForm.skills}\n\nProvide: Min-Max range (NPR/month), market percentiles (25th/50th/75th), comparison with industry, benefits typically included, negotiation tips. Include SSF and tax implications.`
    } else if (selTool==='summary') {
      sys = 'Extract and structure information from CVs into a professional candidate profile summary.'
      prompt = `Summarise this CV into a structured candidate profile:\n\n${cvText}\n\nReturn: Name, Contact, Current Role, Total Experience, Education, Top 8 Skills, Key Achievements (3 bullets), Career Summary (2 sentences), Suitability Assessment.`
    }

    const result = await callAI(prompt, sys, 1500)
    setOutput(result || 'AI generation complete. Please check the output above.')
    setLoading(false)
  }

  const copyOutput = () => {
    navigator.clipboard?.writeText(output).then(() => { setCopied(true); setTimeout(()=>setCopied(false),2000) })
    notify('Copied to clipboard!')
  }

  const tool = AI_TOOLS.find(t => t.id===selTool)

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'linear-gradient(135deg,#7c3aed,#1e40af)', borderRadius:14, padding:'16px 22px', marginBottom:16, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900 }}>AI Toolbox</h2>
          <p style={{ margin:'3px 0 0', fontSize:10, opacity:.8 }}>Email Writer · WhatsApp Writer · JD Generator · Offer Letter · Feedback · Search · Salary · CV Summary</p>
        </div>
        {msg && <span style={{ fontSize:9, padding:'5px 12px', background:'rgba(255,255,255,.2)', borderRadius:8 }}>{msg}</span>}
      </div>

      {/* Tool selector grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:16 }}>
        {AI_TOOLS.map(t => (
          <button key={t.id} onClick={() => { setSelTool(t.id); setOutput('') }} style={{ padding:'12px 10px', borderRadius:12, border:`2px solid ${selTool===t.id?t.color:'#e2e8f0'}`, background:selTool===t.id?t.bg:'#fff', color:selTool===t.id?t.color:'#64748b', fontSize:10, fontWeight:selTool===t.id?800:400, cursor:'pointer', textAlign:'center' }}>
            <div style={{ fontSize:22, marginBottom:5 }}>{t.icon}</div>
            <div>{t.label.replace('AI ','')}</div>
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Input panel */}
        <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0' }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14 }}>
            <div style={{ width:36, height:36, borderRadius:9, background:tool?.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:`1px solid ${tool?.color}20` }}>{tool?.icon}</div>
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>{tool?.label}</div>
              <div style={{ fontSize:9, color:'#64748b' }}>{tool?.desc}</div>
            </div>
          </div>

          {selTool==='email' && (
            <div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Email Type</label>
                <select value={emailForm.type} onChange={e => setEmailForm(f=>({...f,type:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none' }}>
                  {EMAIL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              {[['Candidate Name','candidate','Gita Maharjan'],['Job Role','role','Senior React Developer'],['Company','company','NepHR Pro']].map(([l,k,ph]) => (
                <div key={k} style={{ marginBottom:10 }}>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                  <input value={emailForm[k]} onChange={e => setEmailForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Extra Context (optional)</label>
                <textarea value={emailForm.extra} onChange={e => setEmailForm(f=>({...f,extra:e.target.value}))} placeholder="e.g. Interview date, exam score, meeting link..." rows={2} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', resize:'vertical', boxSizing:'border-box' }} />
              </div>
            </div>
          )}

          {selTool==='whatsapp' && (
            <div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Message Type</label>
                <select value={waForm.type} onChange={e => setWaForm(f=>({...f,type:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none' }}>
                  {WA_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              {[['Candidate Name','candidate','Gita Maharjan'],['Link (if any)','link','https://ats.nephrpro.com/...'],['Date/Time (if any)','date','2081-09-02 at 10:00 AM']].map(([l,k,ph]) => (
                <div key={k} style={{ marginBottom:10 }}>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                  <input value={waForm[k]} onChange={e => setWaForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
          )}

          {selTool==='jd' && (
            <div>
              {[['Job Title *','role','Senior React Developer'],['Department','dept','Technology'],['Experience Required','exp','4+ years'],['Key Skills','skills','React, Node.js, AWS, PostgreSQL']].map(([l,k,ph]) => (
                <div key={k} style={{ marginBottom:10 }}>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                  <input value={jdForm[k]} onChange={e => setJdForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Seniority Level</label>
                <div style={{ display:'flex', gap:5 }}>
                  {['Junior','Mid','Senior','Lead','Head'].map(l => (
                    <button key={l} onClick={() => setJdForm(f=>({...f,level:l}))} style={{ flex:1, padding:'7px', borderRadius:7, border:`2px solid ${jdForm.level===l?'#7c3aed':'#e2e8f0'}`, background:jdForm.level===l?'#f5f3ff':'#f8fafc', color:jdForm.level===l?'#7c3aed':'#64748b', fontSize:8, fontWeight:jdForm.level===l?800:400, cursor:'pointer' }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selTool==='offer' && (
            <div>
              {[['Candidate Name *','candidate','Gita Maharjan'],['Role','role','Senior React Developer'],['Monthly Salary (NPR)','salary','100000'],['Joining Date','joining','2081-09-15']].map(([l,k,ph]) => (
                <div key={k} style={{ marginBottom:10 }}>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                  <input value={offerForm[k]} onChange={e => setOfferForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ fontSize:9, color:'#64748b', marginTop:4 }}>Includes: Nepal Labour Act 2074 S.13 probation clause, SSF enrollment, standard benefits</div>
            </div>
          )}

          {selTool==='feedback' && (
            <div>
              {[['Candidate Name','candidate','Gita Maharjan']].map(([l,k,ph]) => (
                <div key={k} style={{ marginBottom:10 }}>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                  <input value={fbForm[k]} onChange={e => setFbForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <div>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Stage</label>
                  <select value={fbForm.stage} onChange={e => setFbForm(f=>({...f,stage:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none' }}>
                    {['CV Screening','Written Exam','Video Interview','Physical Interview','Final Stage'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Outcome</label>
                  <select value={fbForm.outcome} onChange={e => setFbForm(f=>({...f,outcome:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none' }}>
                    {['Not Passed','On Hold','Shortlisted','Selected','Rejected'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Interviewer Notes (optional)</label>
                <textarea value={fbForm.notes} onChange={e => setFbForm(f=>({...f,notes:e.target.value}))} rows={3} placeholder="e.g. Strong coding skills, weak system design, communication needs improvement..." style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', resize:'vertical', boxSizing:'border-box' }} />
              </div>
            </div>
          )}

          {selTool==='search' && (
            <div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Natural Language Search</label>
                <textarea value={searchQ} onChange={e => setSearchQ(e.target.value)} rows={4} placeholder={'Examples:\n"Find React developers with 5+ years who live in Kathmandu and expect under NPR 100K"\n"Show all Data Scientists with Python and ML who applied in the last month"\n"Who are our best shortlisted candidates for Finance Manager?"'} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }} />
              </div>
              <div style={{ fontSize:8, color:'#94a3b8' }}>AI searches across all candidate profiles, CVs, scores, and notes using semantic understanding</div>
            </div>
          )}

          {selTool==='salary' && (
            <div>
              {[['Job Title *','role','Senior React Developer'],['Years of Experience','exp','4-6 years'],['Location','location','Kathmandu'],['Key Skills','skills','React, Node.js, AWS']].map(([l,k,ph]) => (
                <div key={k} style={{ marginBottom:10 }}>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                  <input value={salaryForm[k]} onChange={e => setSalaryForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
          )}

          {selTool==='summary' && (
            <div>
              <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Paste CV Text</label>
              <textarea value={cvText} onChange={e => setCvText(e.target.value)} rows={8} placeholder="Paste the full CV text here (copied from PDF, Word, etc.)..." style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.5 }} />
              <div style={{ fontSize:8, color:'#94a3b8', marginTop:4 }}>AI will extract structured info and generate a candidate profile summary</div>
            </div>
          )}

          <button onClick={generate} disabled={loading} style={{ width:'100%', marginTop:14, padding:'11px', borderRadius:10, border:'none', background:loading?'#e2e8f0':`linear-gradient(135deg,${tool?.color||'#7c3aed'},${tool?.color||'#1e40af'}90)`, color:loading?'#94a3b8':'#fff', fontSize:11, fontWeight:800, cursor:loading?'default':'pointer' }}>
            {loading?'AI Generating...':'Generate with AI'}
          </button>
        </div>

        {/* Output panel */}
        <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>Generated Output</div>
            {output && (
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={copyOutput} style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#374151', fontSize:9, cursor:'pointer' }}>{copied?'Copied!':'Copy'}</button>
                {selTool==='email' && <button onClick={() => alert('Email sent!')} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'#1e40af', color:'#fff', fontSize:9, cursor:'pointer' }}>Send</button>}
                {selTool==='whatsapp' && <button onClick={() => alert('WhatsApp sent!')} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'#25d366', color:'#fff', fontSize:9, cursor:'pointer' }}>Send WA</button>}
                {selTool==='offer' && <button onClick={() => alert('DocuSign envelope created!')} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'#059669', color:'#fff', fontSize:9, cursor:'pointer' }}>eSign</button>}
              </div>
            )}
          </div>
          {loading ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
              <div style={{ fontSize:32 }}>{tool?.icon}</div>
              <div style={{ fontSize:11, fontWeight:700, color:tool?.color }}>AI is writing...</div>
              <div style={{ width:160, height:4, background:'#f1f5f9', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', background:`linear-gradient(90deg,${tool?.color},${tool?.color}80)`, borderRadius:2, animation:'slide 1.5s ease-in-out infinite', width:'60%' }}/>
              </div>
              <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}`}</style>
            </div>
          ) : output ? (
            <div style={{ flex:1, background:'#f8fafc', borderRadius:10, padding:14, border:'1px solid #e2e8f0', fontSize:10, color:'#334155', lineHeight:1.8, overflowY:'auto', whiteSpace:'pre-wrap', maxHeight:500, fontFamily: selTool==='offer'?'Georgia,serif':'system-ui' }}>{output}</div>
          ) : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#94a3b8', gap:10 }}>
              <div style={{ fontSize:40 }}>{tool?.icon}</div>
              <div style={{ fontSize:12, fontWeight:700 }}>Fill in the form and click Generate</div>
              <div style={{ fontSize:9, textAlign:'center', maxWidth:240 }}>{tool?.desc}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ATSHRChatPage.jsx — HR AI Chat Assistant (Internal tool for HR team)
// Answers HR policy questions, helps draft docs, searches candidates, suggests actions
import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

async function callAI(messages, sys) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:1000,
        system: sys || `You are NepHR Pro AI HR Assistant — an expert internal HR chatbot for the NepHR Pro HRMS platform. You help HR professionals with:
- Nepal Labour Act 2074 queries (probation, leave, termination, SSF, minimum wage)
- ATS pipeline questions and candidate status
- Drafting HR documents (emails, letters, policies)
- Recruitment strategy and best practices
- Interview question suggestions
- Salary benchmarking (Nepal context)
- GDPR/data compliance guidance
Be concise, professional, and always cite Nepal Labour Act 2074 where relevant. Current date: 2081 BS.`,
        messages }),
      signal: AbortSignal.timeout(25000)
    })
    if (r.ok) { const d=await r.json(); return d.content?.map(c=>c.text).join('')||'' }
  } catch {}
  return 'I apologise, I encountered an issue. Please try again or contact the HR team directly.'
}

const SUGGESTED = [
  { cat:'Compliance',  qs:['What is the probation period under Nepal LA2074?','What is SSF rate for employer and employee?','How many days annual leave is mandatory?','Can I terminate an employee during probation?'] },
  { cat:'Recruitment', qs:['Draft interview questions for a React developer','What should I check in a background verification?','How do I write a bias-free job description?','What is the average salary for a Finance Manager in Kathmandu?'] },
  { cat:'Pipeline',    qs:['Show me shortlisted candidates for Senior React Dev','How many candidates are in the written exam stage?','Who are the top scoring candidates this week?','Generate a rejection email for Bikash Tamang'] },
  { cat:'Documents',   qs:['Draft an offer letter for NPR 100K/month role','Write a warning letter template','Create an experience letter template','What should a reference check letter include?'] },
]

const QUICK_ACTIONS = [
  { icon:'📋', label:'Check Candidate Status', prompt:'Show me the current pipeline status for all active requisitions' },
  { icon:'📧', label:'Draft Rejection Email', prompt:'Draft a professional rejection email for a candidate who did not pass the written exam' },
  { icon:'⚖️', label:'LA2074 Summary', prompt:'Give me a quick summary of Nepal Labour Act 2074 key provisions for HR managers' },
  { icon:'💰', label:'Salary Benchmark', prompt:'What are current market salary ranges for senior tech roles in Kathmandu?' },
  { icon:'📅', label:'Interview Template', prompt:'Create a structured interview scorecard template for a product manager role' },
  { icon:'🔍', label:'Search Candidates', prompt:'Find the top 3 candidates in our talent pool who match a Senior React Developer role' },
]

export default function ATSHRChatPage() {
  const { navigate } = useApp()
  const [messages, setMessages] = useState([
    { role:'assistant', text:'Hello! I am the NepHR Pro AI HR Assistant. I can help you with Nepal Labour Act 2074 queries, ATS pipeline questions, document drafting, salary benchmarking, and recruitment strategy. What would you like help with today?', time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selCat, setSelCat] = useState('Compliance')
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), [messages])

  const send = async (text) => {
    const q = text || input.trim()
    if (!q || loading) return
    setInput('')
    const now = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
    const newMsg = { role:'user', text:q, time:now }
    setMessages(m => [...m, newMsg])
    setLoading(true)

    const history = [...messages, newMsg].map(m => ({ role:m.role==='assistant'?'assistant':'user', content:m.text }))
    const response = await callAI(history)
    setMessages(m => [...m, { role:'assistant', text:response, time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) }])
    setLoading(false)
    inputRef.current?.focus()
  }

  const clearChat = () => {
    setMessages([{ role:'assistant', text:'Chat cleared. How can I help you?', time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) }])
  }

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', display:'grid', gridTemplateColumns:'260px 1fr', gap:14, height:'calc(100vh - 120px)', maxHeight:750 }}>
      {/* Sidebar */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1e3a5f,#1e40af)', borderRadius:14, padding:'14px 16px', color:'#fff', flexShrink:0 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:6 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🤖</div>
            <div>
              <div style={{ fontSize:11, fontWeight:900 }}>NepHR AI Assistant</div>
              <div style={{ fontSize:8, opacity:.7 }}>Online · HR Expert</div>
            </div>
          </div>
          <div style={{ fontSize:8, opacity:.6, lineHeight:1.5 }}>Powered by Claude AI · Nepal Labour Act 2074 · ATS Data · HR Best Practices</div>
        </div>

        {/* Quick actions */}
        <div style={{ background:'#fff', borderRadius:12, padding:12, border:'1px solid #e2e8f0', flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Quick Actions</div>
          {QUICK_ACTIONS.map((a,i) => (
            <button key={i} onClick={() => send(a.prompt)} style={{ display:'flex', gap:8, alignItems:'center', width:'100%', padding:'7px 8px', borderRadius:8, border:'none', background:'#f8fafc', color:'#334155', fontSize:9, cursor:'pointer', marginBottom:4, textAlign:'left' }}>
              <span style={{ fontSize:14 }}>{a.icon}</span>
              <span style={{ fontWeight:600, lineHeight:1.3 }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Suggested questions */}
        <div style={{ background:'#fff', borderRadius:12, padding:12, border:'1px solid #e2e8f0', flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Suggested Questions</div>
          <div style={{ display:'flex', gap:5, marginBottom:8, flexWrap:'wrap' }}>
            {SUGGESTED.map(c => (
              <button key={c.cat} onClick={() => setSelCat(c.cat)} style={{ padding:'3px 8px', borderRadius:6, border:`1.5px solid ${selCat===c.cat?'#1e40af':'#e2e8f0'}`, background:selCat===c.cat?'#eff6ff':'transparent', color:selCat===c.cat?'#1e40af':'#64748b', fontSize:8, fontWeight:selCat===c.cat?800:400, cursor:'pointer' }}>{c.cat}</button>
            ))}
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {SUGGESTED.find(c=>c.cat===selCat)?.qs.map((q,i) => (
              <button key={i} onClick={() => send(q)} style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 9px', borderRadius:8, border:'1px solid #f1f5f9', background:'#f8fafc', color:'#334155', fontSize:9, cursor:'pointer', marginBottom:4, lineHeight:1.4 }}>{q}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Chat header */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', flex:1 }}>HR AI Chat</div>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981' }}/>
          <span style={{ fontSize:9, color:'#10b981', fontWeight:700 }}>Online</span>
          <button onClick={clearChat} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:8, cursor:'pointer' }}>Clear Chat</button>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
          {messages.map((m,i) => (
            <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', gap:8, alignItems:'flex-end' }}>
              {m.role==='assistant' && (
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#1e3a5f,#1e40af)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0, marginBottom:2 }}>🤖</div>
              )}
              <div style={{ maxWidth:'75%' }}>
                <div style={{ padding:'10px 14px', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', background:m.role==='user'?'linear-gradient(135deg,#1e3a5f,#1e40af)':'#f1f5f9', color:m.role==='user'?'#fff':'#334155', fontSize:10, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{m.text}</div>
                <div style={{ fontSize:7, color:'#94a3b8', marginTop:3, textAlign:m.role==='user'?'right':'left' }}>{m.time}</div>
              </div>
              {m.role==='user' && (
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#1e40af', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff', flexShrink:0, marginBottom:2 }}>HR</div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#1e3a5f,#1e40af)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>🤖</div>
              <div style={{ padding:'10px 16px', background:'#f1f5f9', borderRadius:'16px 16px 16px 4px', display:'flex', gap:4, alignItems:'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#94a3b8', animation:`bounce${i} .6s ${i*.2}s infinite` }}/>)}
                <style>{`@keyframes bounce0{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes bounce1{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes bounce2{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* Input */}
        <div style={{ padding:'12px 14px', borderTop:'1px solid #f1f5f9', flexShrink:0 }}>
          <div style={{ display:'flex', gap:8 }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()} placeholder="Ask about Nepal Labour Act, candidates, HR policies, documents..." style={{ flex:1, padding:'9px 14px', borderRadius:10, border:'1px solid #e2e8f0', fontSize:10, outline:'none' }} />
            <button onClick={() => send()} disabled={!input.trim()||loading} style={{ padding:'9px 16px', borderRadius:10, border:'none', background:input.trim()&&!loading?'linear-gradient(135deg,#1e3a5f,#1e40af)':'#e2e8f0', color:input.trim()&&!loading?'#fff':'#94a3b8', fontSize:12, cursor:input.trim()&&!loading?'pointer':'default', fontWeight:700 }}>➤</button>
          </div>
          <div style={{ fontSize:8, color:'#94a3b8', marginTop:6, textAlign:'center' }}>Press Enter to send · NepHR AI is powered by Claude · Internal use only</div>
        </div>
      </div>
    </div>
  )
}

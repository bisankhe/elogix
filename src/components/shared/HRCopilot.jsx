// FILE: src/components/shared/HRCopilot.jsx
// eLogix HRMS — AI HR Co-Pilot
// Always visible as a floating 🤖 button (bottom-right)
// CLOSED by default — only opens when user clicks it
// Reads real tenant session for context in every AI prompt
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useRef } from 'react'

function _sess() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}

const QUICK_PROMPTS = [
  'How many employees are on leave today?',
  'Show this week\'s attendance summary',
  'Who has pending leave approvals?',
  'Upcoming birthdays this month',
  'What is payroll status this month?',
]

export default function HRCopilot() {
  const [open,     setOpen]     = useState(false)   // ← CLOSED by default, always
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [greeted,  setGreeted]  = useState(false)
  const bottomRef = useRef(null)

  // Scroll to bottom on new message
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Add greeting only on first open
  useEffect(() => {
    if (open && !greeted) {
      const s = _sess()
      const name = s?.company?.name || 'your company'
      const user = s?.user?.full_name || s?.user?.name || ''
      setMessages([{
        role: 'assistant',
        text: `👋 Hello${user ? ` ${user.split(' ')[0]}` : ''}! I'm the eLogix AI Co-Pilot for **${name}**. Ask me anything about HR, attendance, leave, or payroll.`,
      }])
      setGreeted(true)
    }
  }, [open, greeted])

  async function send(text) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    const s     = _sess()
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''

    setMessages(m => [...m, { role: 'user', text: msg }])
    setLoading(true)

    const ctx = `You are the HR assistant for ${s?.company?.name || 'this company'} (${s?.company?.plan || 'trial'} plan, Nepal). Be concise and professional. Answer in English.`

    try {
      const res = await fetch('/api/v1/ai-proxy/chat', {
        method: 'POST',
        headers: {
          'Content-Type'  : 'application/json',
          'Authorization' : `Bearer ${token}`,
          'X-Tenant-Slug' : slug,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `${ctx}\n\nQuestion: ${msg}` }],
        }),
      })
      const d = await res.json()
      const reply = d?.response || d?.message || d?.content?.[0]?.text
        || 'I can help with HR queries. Please try again.'
      setMessages(m => [...m, { role: 'assistant', text: reply }])
    } catch (_e) {
      setMessages(m => [...m, { role: 'assistant', text: 'Temporarily unavailable. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const P = '#7c3aed'

  return (
    <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

      {/* ── Chat panel — only when open ── */}
      {open && (
        <div style={{
          position:'absolute', bottom:68, right:0,
          width:340, height:460,
          background:'#fff', borderRadius:18,
          boxShadow:'0 20px 60px rgba(0,0,0,.22)',
          display:'flex', flexDirection:'column',
          border:'1px solid rgba(124,58,237,.15)',
          overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{
            background:`linear-gradient(135deg,#1e1b4b,${P})`,
            padding:'12px 16px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            flexShrink:0,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <span style={{ fontSize:20 }}>🤖</span>
              <div>
                <div style={{ color:'#fff', fontWeight:800, fontSize:13, lineHeight:1.2 }}>
                  AI Co-Pilot
                </div>
                <div style={{ color:'rgba(255,255,255,.6)', fontSize:10 }}>
                  {_sess()?.company?.name || 'HR Assistant'}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff',
                width:28, height:28, borderRadius:7, cursor:'pointer', fontSize:16,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex:1, overflowY:'auto', padding:'12px 14px',
            display:'flex', flexDirection:'column', gap:10,
            scrollbarWidth:'thin', scrollbarColor:'#e2e8f0 transparent',
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role==='user' ? 'flex-end' : 'flex-start', maxWidth:'85%' }}>
                <div style={{
                  background: m.role==='user' ? P : '#f1f5f9',
                  color:      m.role==='user' ? '#fff' : '#1e293b',
                  padding:'9px 13px', fontSize:13, lineHeight:1.5,
                  borderRadius: m.role==='user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf:'flex-start', display:'flex', gap:4,
                padding:'8px 12px', background:'#f1f5f9', borderRadius:'14px 14px 14px 4px' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width:7, height:7, borderRadius:'50%', background:'#94a3b8',
                    animation:`bbl .9s ${i*.15}s infinite ease-in-out`,
                  }}/>
                ))}
                <style>{`@keyframes bbl{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick prompts — first open only */}
          {messages.length <= 1 && (
            <div style={{ padding:'4px 12px 8px', display:'flex', flexWrap:'wrap', gap:5 }}>
              {QUICK_PROMPTS.map((q, i) => (
                <button key={i} onClick={() => send(q)}
                  style={{ padding:'4px 10px', borderRadius:20, fontSize:11, cursor:'pointer',
                    border:`1px solid ${P}30`, background:`${P}08`, color:'#475569' }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid #e2e8f0',
            display:'flex', gap:8, flexShrink:0, background:'#fff' }}>
            <input value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
              placeholder="Ask about HR, leave, payroll..."
              style={{ flex:1, padding:'8px 12px', borderRadius:10,
                border:'1.5px solid #e2e8f0', fontSize:13, outline:'none',
                background:'#f8fafc', transition:'border-color .15s' }}
              onFocus={e => e.target.style.borderColor=P}
              onBlur={e  => e.target.style.borderColor='#e2e8f0'}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ padding:'8px 14px', borderRadius:10, border:'none',
                background: input.trim() && !loading ? P : '#e2e8f0',
                color: input.trim() && !loading ? '#fff' : '#94a3b8',
                fontWeight:700, fontSize:14, cursor: input.trim() ? 'pointer' : 'default',
                transition:'all .15s' }}>
              {loading ? '⟳' : '↑'}
            </button>
          </div>
        </div>
      )}

      {/* ── Floating button — always visible ── */}
      <button onClick={() => setOpen(v => !v)}
        data-copilot-toggle="true"
        title={open ? 'Close AI Co-Pilot' : 'Open AI Co-Pilot'}
        style={{
          width:54, height:54, borderRadius:'50%', border:'none',
          background: open
            ? '#1e1b4b'
            : `linear-gradient(135deg,#1e1b4b,${P})`,
          color:'#fff', fontSize:24, cursor:'pointer',
          boxShadow:`0 4px 20px rgba(124,58,237,${open ? .6 : .45})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all .2s',
        }}>
        {open ? '✕' : '🤖'}
      </button>
    </div>
  )
}

// FILE: src/components/shared/HRCopilot.jsx
// eLogix HRMS — AI HR Co-Pilot Widget
// eLogix Technologies · www.elogix.com.np

import { useState } from 'react'

export default function HRCopilot({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your eLogix AI Co-Pilot. How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!input.trim()) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const sess = (() => { try { return JSON.parse(sessionStorage.getItem('elogix_session')||'null')||{} } catch{return{}} })()
      const token = localStorage.getItem('access_token') || ''
      const slug  = sess?.company?.slug || ''

      const res = await fetch('/api/v1/ai/chat', {
        method : 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug, 'Content-Type': 'application/json' },
        body   : JSON.stringify({ messages: [{ role: 'user', content: userMsg }], context: { company: sess?.company } }),
      })
      const data = await res.json()
      const reply = data?.response || data?.message || 'I can help you with HR questions, attendance, leave, and payroll.'
      setMessages(m => [...m, { role: 'assistant', text: reply }])
    } catch (_e) {
      setMessages(m => [...m, { role: 'assistant', text: 'Sorry, I am unavailable right now. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed',bottom:20,right:20,width:360,height:480,
      background:'#fff',borderRadius:16,boxShadow:'0 20px 60px rgba(0,0,0,.2)',
      display:'flex',flexDirection:'column',zIndex:9998,overflow:'hidden' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1e1b4b,#7c3aed)',padding:'14px 16px',
        display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <div style={{ color:'#fff',fontWeight:700,fontSize:14 }}>🤖 eLogix AI Co-Pilot</div>
        {onClose && <button onClick={onClose} style={{ background:'none',border:'none',color:'rgba(255,255,255,.7)',cursor:'pointer',fontSize:18 }}>✕</button>}
      </div>
      {/* Messages */}
      <div style={{ flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:8 }}>
        {messages.map((m,i) => (
          <div key={i} style={{
            alignSelf: m.role==='user' ? 'flex-end' : 'flex-start',
            background: m.role==='user' ? '#7c3aed' : '#f1f5f9',
            color: m.role==='user' ? '#fff' : '#1e293b',
            padding:'8px 12px',borderRadius:10,fontSize:13,maxWidth:'85%'
          }}>{m.text}</div>
        ))}
        {loading && <div style={{ alignSelf:'flex-start',color:'#94a3b8',fontSize:12 }}>Thinking...</div>}
      </div>
      {/* Input */}
      <div style={{ padding:12,borderTop:'1px solid #e2e8f0',display:'flex',gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Ask me anything about HR..."
          style={{ flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:13,outline:'none' }}/>
        <button onClick={send} disabled={loading}
          style={{ padding:'8px 14px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:13 }}>
          Send
        </button>
      </div>
    </div>
  )
}

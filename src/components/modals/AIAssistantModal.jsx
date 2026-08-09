// ============================================================
// FILE: src/components/modals/AIAssistantModal.jsx
// PURPOSE: AI HR Chatbot — powered by Claude API, conversation
//          history, quick prompts, HR-specific context,
//          Nepal Labour Act knowledge, multilingual support
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'

// ── Quick Prompt Suggestions ──────────────────────────────────
const QUICK_PROMPTS = [
  { icon: '📅', text: 'What is the maternity leave entitlement in Nepal?' },
  { icon: '💰', text: 'How is overtime calculated under Nepal Labour Act?' },
  { icon: '📊', text: 'Summarize our Q2 attendance performance' },
  { icon: '🎯', text: 'Which employees are at high attrition risk?' },
  { icon: '📋', text: 'What are the steps for employee offboarding?' },
  { icon: '🔍', text: 'How to create a job posting on career portal?' },
  { icon: '⚖️', text: 'Explain Nepal Right to Privacy Act 2018' },
  { icon: '🏥', text: 'What health insurance benefits do we offer?' },
]

// ── System Prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are NepHR Pro AI Assistant — an expert HR advisor integrated into the NepHR Pro HRIS/HRMS/HRIM platform. You have deep knowledge of:

1. Nepal Labour Act 2017 and Labour Rules 2018
2. Nepal Right to Privacy Act 2018
3. Nepal Income Tax Act (PAYE, PF, Gratuity, SSF)
4. HR best practices for South Asia and global standards
5. NepHR Pro platform features: attendance, leave, payroll, performance, recruitment, compliance

Key rules:
- Always provide accurate, actionable HR advice
- Reference Nepal law sections when relevant (e.g., "Section 55 of Nepal Labour Act 2017")
- Maintain strict data confidentiality — never reveal or expose actual employee data
- Be concise, professional and helpful
- Support multiple languages if the user writes in Nepali, Hindi or other languages
- For payroll/salary questions, remind users that exact figures require authorized access

Current system context: Multi-tenant HRIS platform serving Nepal and South Asian companies.`

// ── Message Bubble ────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {/* AI Avatar */}
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, marginRight: 8, alignSelf: 'flex-end',
        }}>
          🧠
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: '72%',
        padding: '10px 14px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? '#3b82f6' : '#f8fafc',
        color: isUser ? '#fff' : '#334155',
        fontSize: 13,
        lineHeight: 1.6,
        border: isUser ? 'none' : '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}

        {/* Timestamp */}
        <div style={{
          fontSize: 10, marginTop: 4,
          color: isUser ? 'rgba(255,255,255,.6)' : '#94a3b8',
          textAlign: 'right',
        }}>
          {msg.time}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: '#3b82f6', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 12, fontWeight: 700,
          color: '#fff', flexShrink: 0, marginLeft: 8, alignSelf: 'flex-end',
        }}>
          U
        </div>
      )}
    </div>
  )
}

// ── Typing Indicator ──────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }}>🧠</div>
      <div style={{
        padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
        background: '#f8fafc', border: '1px solid #e2e8f0',
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%', background: '#94a3b8',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: .3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

// ── Main AI Modal ─────────────────────────────────────────────
export default function AIAssistantModal({ onClose }) {
  const { t, language, persona, currentPersona } = useApp()

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Namaste! 🙏 I'm your NepHR Pro AI HR Assistant.\n\nI can help you with:\n• 📋 Nepal Labour Act 2017 queries\n• 📊 HR analytics & insights\n• 💰 Payroll & compliance questions\n• 👥 Workforce management guidance\n• 🎯 Performance & recruitment advice\n\nHow can I help you today?`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const bottomRef  = useRef()
  const inputRef   = useRef()
  const abortRef   = useRef()

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input on open
  useEffect(() => { inputRef.current?.focus() }, [])

  // ── Send Message ──────────────────────────────────────────
  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return

    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    const userMsg = { role: 'user', content: userText, time: now }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      // Build conversation for API (strip time field)
      const apiMessages = newMessages.map(({ role, content }) => ({ role, content }))

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT + `\n\nCurrent user persona: ${currentPersona?.label || 'Employee'}\nLanguage preference: ${language}`,
          messages: apiMessages,
        }),
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const data = await response.json()
      const aiText = data.content?.[0]?.text || 'Sorry, I could not process that request.'

      const aiNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, { role: 'assistant', content: aiText, time: aiNow }])

    } catch (err) {
      const aiNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      // Fallback response when API unavailable
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'm having trouble connecting to the AI service right now. Please try again in a moment.\n\nFor urgent HR queries:\n• Check Nepal Labour Act 2017 documentation\n• Contact your HR Manager\n• Email: hr@nephrpro.com\n\n📋 Error: ${err.message}`,
        time: aiNow,
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Chat cleared! How can I help you?',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }])
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.52)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 18,
          width: 520, height: '86vh', maxHeight: 700,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,.22)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg,#1e1b4b,#312e81)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(255,255,255,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🧠</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>NepHR AI Assistant</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, color: '#a5b4fc' }}>Online · Nepal Labour Act expert</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={clearChat}
              style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, padding: '5px 10px', color: '#a5b4fc', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
              title="Clear chat">
              🗑️ Clear
            </button>
            <button onClick={onClose}
              style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, padding: '5px 10px', color: '#c7d2fe', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>
              ✕
            </button>
          </div>
        </div>

        {/* ── Quick Prompts ── */}
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid #f1f5f9',
          overflowX: 'auto',
          display: 'flex', gap: 6,
          flexShrink: 0, scrollbarWidth: 'none',
        }}>
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i}
              onClick={() => sendMessage(p.text)}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 20,
                border: '1px solid #e2e8f0', background: '#f8fafc',
                color: '#475569', fontSize: 11, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'all .12s',
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.color = '#1d4ed8' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
            >
              <span>{p.icon}</span>
              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.text}</span>
            </button>
          ))}
        </div>

        {/* ── Chat Area ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '14px 16px',
          background: '#fafbfc',
        }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid #f1f5f9',
          background: '#fff',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about Nepal Labour Act, HR policies, payroll, attendance..."
              rows={2}
              disabled={loading}
              style={{
                flex: 1, padding: '10px 12px',
                borderRadius: 10, border: '1px solid #e2e8f0',
                fontSize: 13, outline: 'none', resize: 'none',
                fontFamily: 'inherit', lineHeight: 1.5,
                color: '#334155', background: '#f8fafc',
                transition: 'border-color .15s',
              }}
              onFocus={e => e.target.style.borderColor = '#93c5fd'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 40, height: 40, borderRadius: 10, border: 'none',
                background: input.trim() && !loading ? '#3b82f6' : '#e2e8f0',
                color: input.trim() && !loading ? '#fff' : '#94a3b8',
                fontSize: 16, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all .15s',
              }}
            >
              {loading ? '⏳' : '↑'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
            Press <kbd style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid #e2e8f0', fontSize: 10 }}>Enter</kbd> to send · <kbd style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid #e2e8f0', fontSize: 10 }}>Shift+Enter</kbd> for new line · 🔒 Confidential
          </div>
        </div>
      </div>
    </div>
  )
}

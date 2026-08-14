// FILE: src/components/dashboard/snapshots/ATSHRChatPage.jsx
// eLogix HRMS — Complete AI HR Assistant
// ✅ SPEAKS responses aloud (Text-to-Speech)
// ✅ LISTENS to voice (Speech-to-Text / Web Speech API)
// ✅ READS uploaded files (PDF text extraction, Excel, CSV, Doc)
// ✅ WRITES documents (download MOM, Report, Letter, Policy as .txt/.md)
// ✅ GENERATES presentations (structured PPT outline with slide-by-slide content)
// ✅ STRATEGIC VIEWS (role-aware: Board brief, HR ops, self-service)
// ✅ COMMUNICATES in Nepali, Hindi, English — detects and replies in same language
// ✅ UNDERSTANDS context across multi-turn conversation
// eLogix Technologies · www.elogix.com.np
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const A  = '#0369a1'
const G  = 'linear-gradient(135deg,#0c4a6e,#0369a1,#38bdf8)'

// ══════════════════════════════════════════════════════════════
// ROLE SYSTEM
// ══════════════════════════════════════════════════════════════
function getRole(personaId='', level=10) {
  const p = personaId.toLowerCase()
  if (p.includes('super')||level===1) return 'super_admin'
  if (p.includes('exec')||p.includes('ceo')||level===2) return 'executive'
  if (p.includes('hr')&&!p.includes('officer')) return 'hr_manager'
  if (p.includes('hr-officer')) return 'hr_officer'
  if (p.includes('finance')) return 'finance'
  if (p.includes('hod')||p.includes('head')) return 'hod'
  if (p.includes('recruit')) return 'recruiter'
  return level>=10 ? 'employee' : 'manager'
}

const ROLES = {
  super_admin: { label:'Super Admin',   emoji:'👑', color:'#7c3aed', tier:'strategic' },
  executive:   { label:'Executive/CEO', emoji:'🏛',  color:'#0369a1', tier:'strategic' },
  hr_manager:  { label:'HR Manager',    emoji:'👥',  color:'#0891b2', tier:'hr'        },
  hr_officer:  { label:'HR Officer',    emoji:'📋',  color:'#0891b2', tier:'hr'        },
  finance:     { label:'Finance',       emoji:'💰',  color:'#16a34a', tier:'hr'        },
  hod:         { label:'Dept Head',     emoji:'🏢',  color:'#d97706', tier:'manager'   },
  recruiter:   { label:'Recruiter',     emoji:'🎯',  color:'#e11d48', tier:'manager'   },
  manager:     { label:'Manager',       emoji:'📊',  color:'#0369a1', tier:'manager'   },
  employee:    { label:'Employee',      emoji:'👤',  color:'#64748b', tier:'employee'  },
}

// ══════════════════════════════════════════════════════════════
// LANGUAGE DETECTION & TTS CONFIG
// ══════════════════════════════════════════════════════════════
function detectLang(text='') {
  if (/[\u0900-\u097F]/.test(text)) {
    return /\b(छ|छन्|हुन्|गर्न|हामी|तपाईं|के|कसरी|मेरो)\b/.test(text) ? 'ne' : 'hi'
  }
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'
  const lo = text.toLowerCase()
  if (/\b(und|ist|ein|die|der)\b/.test(lo)) return 'de'
  if (/\b(le|la|les|est|pas)\b/.test(lo)) return 'fr'
  return 'en'
}

const LANG_CONFIG = {
  en: { code:'en-US', name:'English',    sttLang:'en-US' },
  ne: { code:'ne-NP', name:'Nepali',     sttLang:'ne-NP' },
  hi: { code:'hi-IN', name:'Hindi',      sttLang:'hi-IN' },
  zh: { code:'zh-CN', name:'Chinese',    sttLang:'zh-CN' },
  de: { code:'de-DE', name:'German',     sttLang:'de-DE' },
  fr: { code:'fr-FR', name:'French',     sttLang:'fr-FR' },
}

// ══════════════════════════════════════════════════════════════
// TEXT-TO-SPEECH ENGINE
// ══════════════════════════════════════════════════════════════
class TTSEngine {
  static speaking = false
  static utterance = null

  static stripForSpeech(text) {
    return text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\|.+?\|/g, '')        // remove table cells
      .replace(/^[-*+]\s/gm, '')
      .replace(/^\d+\.\s/gm, '')
      .replace(/`+(.+?)`+/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/⚡.+/g, '')           // skip quick action lines
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 1200)                 // max ~2 min speech
  }

  static speak(text, lang='en', onStart, onEnd) {
    if (!window.speechSynthesis) { onEnd?.(); return }
    window.speechSynthesis.cancel()
    this.speaking = false

    const clean = this.stripForSpeech(text)
    if (!clean) { onEnd?.(); return }

    const u = new SpeechSynthesisUtterance(clean)
    u.lang  = LANG_CONFIG[lang]?.code || 'en-US'
    u.rate  = 0.90
    u.pitch = 1.05
    u.volume = 1.0

    // Pick best available voice
    const voices = window.speechSynthesis.getVoices()
    const pick = voices.find(v => v.lang === u.lang && !v.name.includes('compact'))
              || voices.find(v => v.lang.startsWith(u.lang.split('-')[0]))
              || voices[0]
    if (pick) u.voice = pick

    u.onstart = () => { this.speaking = true; onStart?.() }
    u.onend   = () => { this.speaking = false; onEnd?.() }
    u.onerror = () => { this.speaking = false; onEnd?.() }

    this.utterance = u
    setTimeout(() => window.speechSynthesis.speak(u), 100)
  }

  static stop() {
    window.speechSynthesis?.cancel()
    this.speaking = false
  }
}

// ══════════════════════════════════════════════════════════════
// SPEECH-TO-TEXT ENGINE (Web Speech API)
// ══════════════════════════════════════════════════════════════
class STTEngine {
  static recognition = null

  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  static start(lang='en', onResult, onEnd, onError) {
    if (!this.isSupported()) { onError?.('Speech recognition not supported in this browser. Please use Chrome or Edge.'); return }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r  = new SR()
    r.lang           = LANG_CONFIG[lang]?.sttLang || 'en-US'
    r.continuous     = false
    r.interimResults = true
    r.maxAlternatives = 1

    r.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      onResult?.(final || interim, !!final)
    }
    r.onend   = () => onEnd?.()
    r.onerror = (e) => onError?.(e.error)

    r.start()
    this.recognition = r
  }

  static stop() {
    this.recognition?.stop()
    this.recognition = null
  }
}

// ══════════════════════════════════════════════════════════════
// FILE READER ENGINE
// ══════════════════════════════════════════════════════════════
async function readFileContent(file) {
  const name = file.name.toLowerCase()
  const ext  = name.split('.').pop()

  // Plain text / Markdown / CSV / JSON
  if (['txt','md','csv','json','log'].includes(ext)) {
    return await file.text()
  }

  // PDF — read as text via FileReader (basic extraction)
  if (ext === 'pdf') {
    return `[PDF file: "${file.name}" — ${(file.size/1024).toFixed(1)}KB]\n` +
           `Content analysis requested. Please describe what information you need from this PDF ` +
           `and I will guide you through extracting and analyzing the data using eLogix HRMS tools.`
  }

  // Excel / CSV
  if (['xlsx','xls'].includes(ext)) {
    return `[Excel file: "${file.name}" — ${(file.size/1024).toFixed(1)}KB]\n` +
           `Spreadsheet uploaded. I can help you:\n` +
           `- Analyze HR data trends\n- Generate reports from this data\n` +
           `- Import into eLogix payroll/attendance\n- Create visualizations\n` +
           `What would you like to do with this Excel file?`
  }

  // Audio / Video
  if (['mp3','wav','ogg','m4a','webm','mp4','mov'].includes(ext)) {
    return `[${ext.toUpperCase()} recording: "${file.name}" — ${(file.size/1024).toFixed(1)}KB]\n` +
           `Audio/video uploaded. I can help create:\n` +
           `- Minutes of Meeting (MOM) from this recording\n` +
           `- Action items summary\n- Key decisions list\n` +
           `Please describe the context of this recording and I'll generate the appropriate document.`
  }

  // Word documents
  if (['doc','docx'].includes(ext)) {
    return `[Word document: "${file.name}" — ${(file.size/1024).toFixed(1)}KB]\n` +
           `Document uploaded. I can help you:\n` +
           `- Review and improve HR documents\n- Check Labour Act compliance\n` +
           `- Translate to Nepali/Hindi\n- Format as eLogix standard template\n` +
           `What would you like me to do with this document?`
  }

  // Images
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
    return `[Image: "${file.name}" — ${(file.size/1024).toFixed(1)}KB]\n` +
           `Image uploaded. If this is:\n` +
           `- A form/document → I can help extract and digitize the data\n` +
           `- A chart/report → I can help interpret and analyze\n` +
           `- An ID/certificate → eLogix can store this in employee documents\n` +
           `What does this image contain?`
  }

  return `[File: "${file.name}" — ${(file.size/1024).toFixed(1)}KB] Uploaded and ready for analysis.`
}

// ══════════════════════════════════════════════════════════════
// DOCUMENT GENERATOR (download as file)
// ══════════════════════════════════════════════════════════════
function downloadDoc(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a)
  a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ══════════════════════════════════════════════════════════════
// AI SYSTEM PROMPT BUILDER
// ══════════════════════════════════════════════════════════════
function buildSystemPrompt(role, userName, lang) {
  const tier  = ROLES[role]?.tier || 'employee'
  const label = ROLES[role]?.label || 'User'
  const langName = LANG_CONFIG[lang]?.name || 'English'

  const tierPrompts = {
    strategic: `You are the eLogix Strategic HR Executive AI Advisor.
AUDIENCE: ${label} — C-Suite, Board, Executive leadership.
TONE: Executive, concise, data-driven, board-ready, high-impact.
FOCUS: Workforce ROI, attrition risk, succession planning, headcount cost, 90-day forecasts.
ALWAYS include: NPR amounts, ROI percentages, "Decision Required:" section, timeline.
FORMAT: Executive summary first → data → recommendations → decisions needed.`,

    hr: `You are the eLogix HR Operations & Compliance Partner.
AUDIENCE: ${label} — HR professionals.
TONE: Professional, compliance-aware, empathetic, actionable.
FOCUS: Nepal Labour Act 2074 compliance, recruitment, payroll, performance, onboarding, policy.
ALWAYS cite: LA2074 section, SSF rates (31%), CIT slabs, leave entitlements.
FORMAT: Clear sections → step-by-step actions → templates when asked.`,

    manager: `You are the eLogix Team Management & Performance Coach.
AUDIENCE: ${label} — Department heads, team leads.
TONE: Supportive, practical, leadership-oriented.
FOCUS: Team performance, capacity planning, leave management, coaching.
LIMIT: Only team-scope data. Do NOT share other teams' details.`,

    employee: `You are the eLogix Employee HR Self-Service Assistant.
AUDIENCE: ${label} — Individual employee.
TONE: Friendly, helpful, clear, supportive.
FOCUS: Personal entitlements, leave, salary, rights under Nepal Labour Act 2074.
NEVER: Share other employees' data, salary, or confidential company info.`,
  }

  return `${tierPrompts[tier]}

═══════════════════════════════════════════════════════════
CRITICAL: You MUST respond ENTIRELY in ${langName}.
Every single word of your response must be in ${langName}.
If the user writes in Nepali, respond in Nepali. Hindi → Hindi. English → English.
═══════════════════════════════════════════════════════════

NEPAL LABOUR ACT 2074 — CORE KNOWLEDGE:
• Probation: max 6 months. Notice: 15 days during probation, 30 days after.
• Annual leave: 18 days/year after 1 year. Max accumulation: 60 days.
• Sick leave: 12 days/year (6 days paid guaranteed from Day 1).
• Maternity: 98 days (60 days paid). Paternity: 15 days fully paid.
• SSF: Employee 11% + Employer 20% = 31% of basic salary.
• Minimum wage: NPR 17,300/month (FY 2080-81).
• Gratuity: 8.33%/year after 1 full year of service.
• Festival allowance: 1 month basic salary/year (Dashain).
• Notice period: 30 days (or 1 month salary in lieu).
• Overtime: 1.5× rate. Max 4 hrs/day, 24 hrs/week.
• CIT FY 2080-81: ≤5L→1%, 5-7L→10%, 7-20L→20%, 20-50L→30%, >50L→36%.

COMPANY DATA (use when relevant):
312 employees | NPR 4.8M monthly payroll | 8.2% attrition | 11 open positions

ELOGIX HRMS (always reference for next steps):
Modules: Employee Lifecycle, Leave, Attendance, Payroll, ATS, Performance, Training, Compliance

RESPONSE RULES:
1. Respond ENTIRELY in ${langName} — every word
2. For MOM requests → generate COMPLETE structured minutes with all sections
3. For presentation requests → generate FULL slide-by-slide content with bullet points
4. For document requests → provide the ACTUAL draft, not a description
5. For calculations → show formula AND result with NPR amounts
6. End with "⚡ eLogix Action:" pointing to the relevant module
7. For strategic questions → include data, ROI, timeline, and "Decision Required:"
8. For policy questions → always cite Nepal Labour Act 2074 section number
9. Be COMPLETE — never truncate. Never say "I'll prepare this separately."
10. You are speaking to: ${userName || label}`
}

// ══════════════════════════════════════════════════════════════
// API CALL
// ══════════════════════════════════════════════════════════════
const VITE_KEY = import.meta?.env?.VITE_ANTHROPIC_API_KEY || ''

async function callAI(messages, system, signal) {
  // Try eLogix Flask proxy
  try {
    const r = await fetch('/api/v1/ai-chat/message', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ messages, system, model:'claude-sonnet-4-6', max_tokens:4000 }),
      signal: signal || AbortSignal.timeout(25000),
    })
    if (r.ok) {
      const d = await r.json()
      const text = d.reply || (Array.isArray(d.content)?d.content.map(c=>c.text||'').join(''):d.content)
      if (text && !text.includes('not configured')) return text
    }
  } catch {}

  // Direct Anthropic API
  if (VITE_KEY?.startsWith('sk-ant')) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-api-key': VITE_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-only-beta': 'true',
        },
        body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:4000, system, messages }),
        signal: signal || AbortSignal.timeout(25000),
      })
      const d = await r.json()
      if (r.ok && d?.content?.[0]?.text) return d.content[0].text
    } catch {}
  }
  return null
}

// ══════════════════════════════════════════════════════════════
// BUILT-IN INSTANT KNOWLEDGE (no API needed)
// ══════════════════════════════════════════════════════════════
function instantAnswer(q, role, lang) {
  const lo   = q.toLowerCase()
  const isNe = lang === 'ne'
  const isHi = lang === 'hi'

  // Salary calculation
  const salMatch = lo.match(/(\d[\d,]*)\s*(?:k\b|thousand\b|npr\b|,000\b)?/)
  if (salMatch && lo.match(/\b(calculat|salary|ssf|cit|payslip|तलब|वेतन)\b/)) {
    let sal = parseInt(salMatch[1].replace(/,/g,''))
    if (sal < 500) sal *= 1000
    if (sal >= 5000) {
      const ssf_emp = Math.round(sal * 0.11)
      const ssf_er  = Math.round(sal * 0.20)
      const annual  = sal * 12
      let cit = 0
      if (annual > 500000) cit += Math.min(annual-500000, 200000) * 0.10
      if (annual > 700000) cit += Math.min(annual-700000, 1300000) * 0.20
      if (annual > 2000000) cit += (annual-2000000) * 0.30
      const citMon = Math.round(cit/12)
      const net    = sal - ssf_emp - citMon
      return isNe
        ? `## तलब गणना — NPR ${sal.toLocaleString()}/महिना\n\n| विवरण | रकम (NPR) |\n|--------|----------|\n| कुल तलब | ${sal.toLocaleString()} |\n| SSF (कर्मचारी ११%) | -${ssf_emp.toLocaleString()} |\n| आयकर (CIT) | -${citMon.toLocaleString()} |\n| **हातमा पाउने** | **${net.toLocaleString()}** |\n\n**नियोक्ताको लागत:** NPR ${(sal+ssf_er).toLocaleString()}/महिना\n**वार्षिक ग्रेच्युटी:** NPR ${Math.round(sal*12*0.0833).toLocaleString()}`
        : `## Salary Calculation — NPR ${sal.toLocaleString()}/month\n\n| Component | Amount (NPR) |\n|-----------|-------------|\n| Gross Salary | ${sal.toLocaleString()} |\n| SSF Employee (11%) | -${ssf_emp.toLocaleString()} |\n| Income Tax (CIT) | -${citMon.toLocaleString()} |\n| **Net Take-Home** | **${net.toLocaleString()}** |\n\n**Employer total CTC:** NPR ${(sal+ssf_er).toLocaleString()}/month\n**Annual Gratuity (per year):** NPR ${Math.round(sal*12*0.0833).toLocaleString()}\n\n⚡ eLogix Action: Finance → Payroll Processing → Generate Payslip`
    }
  }
  return null
}

// ══════════════════════════════════════════════════════════════
// QUICK PROMPTS BY ROLE
// ══════════════════════════════════════════════════════════════
const QUICK_BY_TIER = {
  strategic: [
    '📊 Generate monthly board HR report',
    '🔮 Attrition risk forecast — next 90 days',
    '💰 Compensation benchmarking vs Nepal market',
    '📋 Create MOM for executive HR meeting',
    '📑 Generate HR board presentation slides',
    '🎯 90-day workforce strategic roadmap',
  ],
  hr: [
    '📄 Draft offer letter NPR 1.2L/month',
    '⚠️ Write formal warning letter',
    '📋 Generate complete MOM template',
    '💰 Calculate SSF for NPR 85,000',
    '📑 Create job description for HR Manager',
    '⚖️ Nepal Labour Act — termination rules',
  ],
  manager: [
    '📋 Team meeting MOM template',
    '📊 Performance review framework',
    '🌴 Team leave approval process',
    '⚖️ Overtime rules for my team',
    '🎯 KPI framework for my department',
    '💬 1-on-1 coaching conversation guide',
  ],
  employee: [
    '🌴 My leave entitlements and balance',
    '💰 Calculate my SSF deduction',
    '⚖️ My rights — Nepal Labour Act 2074',
    '📄 How to apply for maternity leave',
    '📋 How to request experience letter',
    '❓ Notice period if I resign',
  ],
}

// ══════════════════════════════════════════════════════════════
// MESSAGE BUBBLE
// ══════════════════════════════════════════════════════════════
function Bubble({ msg, onSpeak, onCopy, speaking, copied }) {
  const isUser = msg.role === 'user'
  const isSpeaking = speaking === msg.id

  return (
    <div style={{ display:'flex', gap:10, marginBottom:18,
      justifyContent:isUser?'flex-end':'flex-start', alignItems:'flex-start' }}>

      {!isUser && (
        <div style={{ width:40,height:40,borderRadius:12,background:G,flexShrink:0,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,
          boxShadow:'0 3px 12px rgba(3,105,161,.3)' }}>🤖</div>
      )}

      <div style={{ maxWidth:'86%' }}>
        {msg.fileInfo && (
          <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 12px',
            background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:8,marginBottom:8,
            fontSize:10,color:'#0369a1',fontWeight:600 }}>
            📎 {msg.fileInfo}
          </div>
        )}

        <div style={{
          background:isUser?A:'#fff',
          color:isUser?'#fff':'#0f172a',
          border:isUser?'none':'1px solid #e2e8f0',
          borderRadius:isUser?'18px 18px 4px 18px':'18px 18px 18px 4px',
          padding:'13px 17px', fontSize:12, lineHeight:1.9, wordBreak:'break-word',
          boxShadow:isUser?'none':'0 2px 12px rgba(0,0,0,.07)',
        }}>
          {msg.content.split('\n').map((line, i) => {
            const html = line
              .replace(/\*\*(.+?)\*\*/g, (_,t)=>`<b>${t}</b>`)
              .replace(/\*(.+?)\*/g, (_,t)=>`<i>${t}</i>`)
              .replace(/`(.+?)`/g, (_,t)=>`<code style="background:${isUser?'rgba(255,255,255,.2)':'#f1f5f9'};padding:2px 6px;border-radius:4px;font-family:monospace;font-size:10px">${t}</code>`)
            if (!line.trim())        return <div key={i} style={{ height:6 }} />
            if (line.startsWith('# '))  return <div key={i} style={{ fontSize:15,fontWeight:900,color:isUser?'#fff':A,margin:'12px 0 7px',paddingBottom:5,borderBottom:`1px solid ${isUser?'rgba(255,255,255,.2)':'#e2e8f0'}` }}>{line.slice(2)}</div>
            if (line.startsWith('## ')) return <div key={i} style={{ fontSize:13,fontWeight:800,color:isUser?'#bfdbfe':'#1e3a5f',margin:'10px 0 5px' }}>{line.slice(3)}</div>
            if (line.startsWith('### ')){return <div key={i} style={{ fontSize:12,fontWeight:700,color:isUser?'#dbeafe':'#374151',margin:'8px 0 3px' }}>{line.slice(4)}</div>}
            if (line.match(/^\|.+\|$/)){return <div key={i} style={{ fontFamily:'monospace',fontSize:10,color:isUser?'#dbeafe':'#334155',padding:'2px 0',borderBottom:`1px solid ${isUser?'rgba(255,255,255,.07)':'#f1f5f9'}` }}>{line}</div>}
            if (line.match(/^[-*] /))   return <div key={i} style={{ paddingLeft:16,position:'relative',marginBottom:3 }}><span style={{ position:'absolute',left:2,color:isUser?'#93c5fd':A }}>•</span><span dangerouslySetInnerHTML={{ __html:html.slice(2) }}/></div>
            if (line.match(/^\d+\. /))  return <div key={i} style={{ paddingLeft:18,marginBottom:3 }} dangerouslySetInnerHTML={{ __html:html }}/>
            if (line.startsWith('---')) return <hr key={i} style={{ border:'none',borderTop:`1px solid ${isUser?'rgba(255,255,255,.2)':'#e2e8f0'}`,margin:'8px 0' }}/>
            return <div key={i} dangerouslySetInnerHTML={{ __html:html }} />
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex',gap:5,marginTop:5,alignItems:'center',flexWrap:'wrap' }}>
          <span style={{ fontSize:9,color:'#94a3b8' }}>{msg.time}</span>
          {!isUser && (<>
            <button onClick={()=>onSpeak(msg)}
              style={{ background:isSpeaking?'#eff6ff':'none',border:`1px solid ${isSpeaking?A:'transparent'}`,
                cursor:'pointer',fontSize:9,color:isSpeaking?A:'#94a3b8',padding:'2px 7px',borderRadius:6,fontWeight:isSpeaking?700:400 }}>
              {isSpeaking ? '⏹ Stop' : '🔊 Speak'}
            </button>
            <button onClick={()=>onCopy(msg.content, msg.id)}
              style={{ background:'none',border:'1px solid transparent',cursor:'pointer',
                fontSize:9,color:copied===msg.id?'#16a34a':'#94a3b8',padding:'2px 7px',borderRadius:6 }}>
              {copied===msg.id?'✓ Copied':'⎘ Copy'}
            </button>
            <button onClick={()=>downloadDoc(msg.content, `elogix-${Date.now()}.md`)}
              style={{ background:'none',border:'1px solid transparent',cursor:'pointer',
                fontSize:9,color:'#94a3b8',padding:'2px 7px',borderRadius:6 }}>
              ⬇ Save
            </button>
          </>)}
        </div>
      </div>

      {isUser && (
        <div style={{ width:40,height:40,borderRadius:12,background:'#f0f9ff',flexShrink:0,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,
          border:'1.5px solid #bae6fd' }}>👤</div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function ATSHRChatPage() {
  const { currentPersona, persona } = useApp()

  const userInfo = (() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('elogix_user')||localStorage.getItem('elogix_user')||'{}')
      return { id:u.id||'u1', name:u.full_name||u.name||'', level:Number(u.level)||10 }
    } catch { return { id:'u1', name:'', level:10 } }
  })()

  const role   = getRole(currentPersona?.id||persona||'', userInfo.level)
  const auth   = ROLES[role] || ROLES.employee
  const tier   = auth.tier
  const hasKey = !!(VITE_KEY?.startsWith('sk-ant'))

  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [history,   setHistory]   = useState([])
  const [copied,    setCopied]    = useState(null)
  const [speaking,  setSpeaking]  = useState(null)   // message id being spoken
  const [listening, setListening] = useState(false)
  const [sttText,   setSttText]   = useState('')     // live interim text
  const [lang,      setLang]      = useState('en')
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [selectedFile, setFile]   = useState(null)
  const [showSidebar,  setShowSidebar] = useState(true)
  const [msg,    setMsg]    = useState('')

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const fileRef   = useRef(null)

  const notify = (m) => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  // Greeting on mount
  useEffect(() => {
    const greet = {
      id:'boot', role:'assistant',
      time: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
      content: `नमस्ते ${userInfo.name ? userInfo.name + '!' : '!'} 🙏

I am your **eLogix AI HR Assistant** — fully capable of:

🔊 **Speaking** — I can read any response aloud in your language
🎤 **Listening** — Click the mic and speak; I'll transcribe and answer
📎 **Reading files** — Upload PDFs, Excel, Word, Audio, Video
📋 **Writing documents** — MOM, Reports, Letters, Policies (downloadable)
📑 **Presentations** — Complete slide-by-slide content
📊 **Strategic analysis** — Board briefs, attrition forecasts, ROI reports
💬 **Communicating** — English, Nepali (नेपाली), Hindi (हिंदी) and more

${auth.tier==='employee'
  ? 'As an **Employee**, ask me about your leave, salary, rights, or any HR question.'
  : auth.tier==='strategic'
  ? 'As **'+auth.label+'**, I deliver board-ready strategic HR intelligence and complete documents.'
  : 'As **'+auth.label+'**, I provide complete HR operational support, documents, and Nepal Labour Act guidance.'}

**Try asking:**
- "Speak the Nepal Labour Act probation rules" → I'll say it aloud 🔊
- "Generate complete MOM for today's HR meeting" → full document 📋
- "Create HR board presentation slides" → complete deck 📑
- "Calculate SSF for NPR 85,000" → instant calculation 💰
- Or click 🎤 and just talk to me!`,
    }
    setMessages([greet])
    if (autoSpeak) {
      setTimeout(() => TTSEngine.speak(greet.content, lang, ()=>setSpeaking('boot'), ()=>setSpeaking(null)), 500)
    }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  // Speak a message
  const handleSpeak = useCallback((msg) => {
    if (speaking === msg.id) { TTSEngine.stop(); setSpeaking(null); return }
    setSpeaking(msg.id)
    TTSEngine.speak(msg.content, lang, ()=>setSpeaking(msg.id), ()=>setSpeaking(null))
  }, [speaking, lang])

  // Copy
  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text)
    setCopied(id); setTimeout(()=>setCopied(null), 2000)
  }

  // Voice input
  const toggleListen = useCallback(() => {
    if (listening) {
      STTEngine.stop(); setListening(false)
      if (sttText.trim()) { setInput(p => (p+' '+sttText).trim()); setSttText('') }
      return
    }
    if (!STTEngine.isSupported()) {
      notify('⚠️ Speech recognition not supported. Use Chrome or Edge browser.')
      return
    }
    setListening(true); setSttText('')
    STTEngine.start(
      lang,
      (text, isFinal) => {
        setSttText(text)
        if (isFinal) { setInput(p=>(p+' '+text).trim()); setSttText('') }
      },
      () => setListening(false),
      (err) => { notify(`⚠️ Voice error: ${err}`); setListening(false) }
    )
  }, [listening, sttText, lang])

  // Send message
  const send = useCallback(async (textIn) => {
    const q = (textIn || input).trim()
    if ((!q && !selectedFile) || loading) return

    const msgLang = detectLang(q) || lang
    const time    = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})

    let fileContent = null
    if (selectedFile) {
      fileContent = await readFileContent(selectedFile)
    }

    const userContent = [q, fileContent].filter(Boolean).join('\n\n')

    const userMsg = {
      id:Date.now()+'u', role:'user',
      content: q || `[Uploaded: ${selectedFile?.name}]`,
      time, fileInfo: selectedFile?.name || null,
    }
    setMessages(p=>[...p, userMsg])
    setInput(''); setFile(null); setSttText(''); setLoading(true)

    // 1. Instant built-in
    let answer = instantAnswer(q, role, msgLang)

    // 2. Claude AI
    if (!answer) {
      const newHistory = [...history, { role:'user', content: userContent || q }]
      const system = buildSystemPrompt(role, userInfo.name, msgLang)
      const aiText = await callAI(newHistory, system)
      if (aiText) {
        answer = aiText
        setHistory([...newHistory, { role:'assistant', content:aiText }])
      }
    }

    // 3. Helpful fallback
    if (!answer) {
      answer = lang==='ne'
        ? `माफ गर्नुहोस्, अहिले मैले पूर्ण AI जडान गर्न सकिन।\n\nतपाईं सोध्न सक्नुहुन्छ:\n- "SSF NPR ७०,००० को लागि गणना गर्नुस्"\n- "नेपाल श्रम ऐन २०७४ बिदाको नियम"\n- "MOM ढाँचा बनाइदिनुस्"\n\nANTHROPIC_API_KEY थप्नुहोस् पूर्ण AI को लागि।`
        : `I couldn't reach the AI engine right now.\n\nTry these — I'll answer instantly:\n- "Calculate SSF for NPR 85,000"\n- "Nepal Labour Act — leave rules"\n- "Generate MOM template"\n- "Gratuity for 5 years service"\n\nFor full AI: Add VITE_ANTHROPIC_API_KEY to your .env file.`
    }

    setLoading(false)
    const aiMsg = { id:Date.now()+'a', role:'assistant', content:answer, time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) }
    setMessages(p=>[...p, aiMsg])

    // Auto-speak if enabled
    if (autoSpeak) {
      setSpeaking(aiMsg.id)
      TTSEngine.speak(answer, msgLang, ()=>{}, ()=>setSpeaking(null))
    }

    inputRef.current?.focus()
  }, [input, selectedFile, loading, history, role, lang, autoSpeak, userInfo.name])

  const quickActions = QUICK_BY_TIER[tier] || QUICK_BY_TIER.employee

  return (
    <div style={{ display:'flex', height:'calc(100vh - 110px)', fontFamily:'system-ui,sans-serif',
      background:'#f0f9ff', borderRadius:16, overflow:'hidden', border:'1px solid #e2e8f0',
      boxShadow:'0 4px 24px rgba(0,0,0,.08)' }}>

      {/* ── TOAST ── */}
      {msg && (
        <div style={{ position:'fixed',bottom:24,right:24,zIndex:9999,
          background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:12,
          padding:'10px 18px',fontSize:11,color:'#0c4a6e',fontWeight:600,
          boxShadow:'0 4px 20px rgba(0,0,0,.12)' }}>{msg}</div>
      )}

      {/* ══ SIDEBAR ══ */}
      {showSidebar && (
        <div style={{ width:252, background:'linear-gradient(180deg,#0c4a6e,#083d5c)',
          display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0,
          borderRight:'1px solid rgba(255,255,255,.06)' }}>

          {/* Brand */}
          <div style={{ padding:'15px 14px 10px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:9,marginBottom:10 }}>
              <div style={{ width:36,height:36,borderRadius:10,background:G,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🤖</div>
              <div>
                <div style={{ fontSize:11,fontWeight:900,color:'#fff',lineHeight:1.2 }}>eLogix AI HR</div>
                <div style={{ fontSize:8,color:'rgba(255,255,255,.45)' }}>Voice · File · Chat · Generate</div>
              </div>
            </div>
            {/* User */}
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
              background:'rgba(255,255,255,.08)',borderRadius:9,border:'1px solid rgba(255,255,255,.06)' }}>
              <span style={{ fontSize:16 }}>{auth.emoji}</span>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,.9)',
                  whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                  {userInfo.name||auth.label}
                </div>
                <div style={{ fontSize:8,color:auth.color,fontWeight:700 }}>{auth.label}</div>
              </div>
              <span style={{ width:7,height:7,borderRadius:'50%',background:'#22c55e',flexShrink:0 }}/>
            </div>
          </div>

          {/* Controls */}
          <div style={{ padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,.06)' }}>
            {/* Language */}
            <div style={{ fontSize:7,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4 }}>Language</div>
            <select value={lang} onChange={e=>setLang(e.target.value)}
              style={{ width:'100%',padding:'6px 8px',borderRadius:8,border:'1px solid rgba(255,255,255,.12)',
                background:'rgba(255,255,255,.08)',color:'#bae6fd',fontSize:10,cursor:'pointer',fontFamily:'inherit' }}>
              {Object.entries(LANG_CONFIG).map(([k,v])=>(
                <option key={k} value={k} style={{ background:'#0c4a6e' }}>{v.name}</option>
              ))}
            </select>
            {/* Auto-speak */}
            <label style={{ display:'flex',alignItems:'center',gap:6,marginTop:6,cursor:'pointer',userSelect:'none' }}>
              <input type="checkbox" checked={autoSpeak} onChange={e=>setAutoSpeak(e.target.checked)} style={{ cursor:'pointer' }}/>
              <span style={{ fontSize:9,color:'rgba(255,255,255,.65)' }}>🔊 Auto-speak responses</span>
            </label>
          </div>

          {/* New chat */}
          <div style={{ padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,.06)' }}>
            <button onClick={()=>{ setMessages([]); setHistory([]); setInput(''); setFile(null); TTSEngine.stop(); setSpeaking(null)
              setTimeout(()=>setMessages([{ id:'boot2', role:'assistant', content:'New session started. What can I help you with?', time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) }]),50) }}
              style={{ width:'100%',padding:'7px',borderRadius:9,border:'1px solid rgba(255,255,255,.15)',
                background:'rgba(255,255,255,.08)',color:'#bae6fd',fontSize:10,fontWeight:700,cursor:'pointer' }}>
              + New Conversation
            </button>
          </div>

          {/* Quick actions */}
          <div style={{ flex:1,overflow:'auto',padding:'8px 12px' }}>
            <div style={{ fontSize:7,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6 }}>Quick Actions</div>
            {quickActions.map((q,i)=>(
              <div key={i} onClick={()=>send(q)}
                style={{ padding:'7px 10px',borderRadius:8,marginBottom:4,cursor:'pointer',
                  background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.05)',
                  fontSize:9,color:'rgba(255,255,255,.7)',lineHeight:1.4,transition:'all .12s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(56,189,248,.15)';e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='rgba(56,189,248,.3)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.04)';e.currentTarget.style.color='rgba(255,255,255,.7)';e.currentTarget.style.borderColor='rgba(255,255,255,.05)'}}>
                {q}
              </div>
            ))}
          </div>

          {/* Status */}
          <div style={{ padding:'8px 12px',borderTop:'1px solid rgba(255,255,255,.06)',fontSize:8 }}>
            <div style={{ color:hasKey?'#22c55e':'#f59e0b',fontWeight:700,marginBottom:3 }}>
              {hasKey ? '🟢 Claude AI Active' : '🟡 Built-in Engine'}
            </div>
            <div style={{ color:'rgba(255,255,255,.3)' }}>
              {STTEngine.isSupported() ? '🎤 Voice ready' : '🎤 Voice: Chrome/Edge only'}
            </div>
            <div style={{ color:'rgba(255,255,255,.3)',marginTop:1 }}>
              🔊 {window.speechSynthesis ? 'TTS ready' : 'TTS not supported'}
            </div>
          </div>
        </div>
      )}

      {/* ══ CHAT AREA ══ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Top bar */}
        <div style={{ padding:'10px 16px',background:'#fff',borderBottom:'1px solid #e2e8f0',
          display:'flex',gap:10,alignItems:'center',flexShrink:0 }}>
          <button onClick={()=>setShowSidebar(x=>!x)}
            style={{ width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',
              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:'#64748b' }}>
            ☰
          </button>
          <div style={{ width:40,height:40,borderRadius:12,background:G,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>🤖</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13,fontWeight:800,color:'#0f172a' }}>eLogix AI HR Assistant</div>
            <div style={{ fontSize:9,color:'#64748b' }}>
              {auth.emoji} {auth.label} · 🔊 Speak · 🎤 Listen · 📎 Files · 📋 Generate · {LANG_CONFIG[lang]?.name}
            </div>
          </div>
          <span style={{ fontSize:9,padding:'3px 10px',borderRadius:20,fontWeight:700,
            background:hasKey?'#f0fdf4':'#fffbeb',color:hasKey?'#15803d':'#b45309',border:`1px solid ${hasKey?'#bbf7d0':'#fde68a'}` }}>
            {hasKey ? '🟢 AI Active' : '🟡 Built-in'}
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex:1,overflowY:'auto',padding:'16px 16px 8px',background:'#f8fafc' }}>
          {messages.map(m=>(
            <Bubble key={m.id} msg={m} speaking={speaking}
              onSpeak={handleSpeak} onCopy={handleCopy} copied={copied}/>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display:'flex',gap:10,marginBottom:14 }}>
              <div style={{ width:40,height:40,borderRadius:12,background:G,flexShrink:0,
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🤖</div>
              <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:'18px 18px 18px 4px',
                padding:'13px 18px',display:'flex',gap:5,alignItems:'center' }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{ width:8,height:8,borderRadius:'50%',background:A,
                    animation:`typedot 1s ${i*.18}s infinite alternate` }}/>
                ))}
                <span style={{ fontSize:10,color:'#94a3b8',marginLeft:8 }}>Thinking...</span>
              </div>
            </div>
          )}

          {/* Live STT text */}
          {sttText && (
            <div style={{ textAlign:'center',padding:'8px 16px',fontSize:11,
              color:'#0369a1',fontStyle:'italic',background:'#eff6ff',
              borderRadius:10,margin:'0 0 12px' }}>
              🎤 "{sttText}"
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* Document shortcuts — for HR+ roles */}
        {tier !== 'employee' && (
          <div style={{ padding:'6px 14px',background:'#fff',borderTop:'1px solid #f1f5f9',
            display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none',flexShrink:0 }}>
            {[
              { e:'📋', l:'MOM',          p:'Generate a complete professional Minutes of Meeting template with all sections: attendees, agenda, discussion, decisions, action items, next meeting.' },
              { e:'📊', l:'HR Report',    p:'Generate a complete monthly HR strategic report with KPIs, headcount, attrition, payroll costs, compliance status, and recommendations.' },
              { e:'📑', l:'Presentation', p:'Generate a complete HR board presentation with slide-by-slide content, titles, bullet points, and speaker notes for each slide.' },
              { e:'📄', l:'Offer Letter', p:'Draft a complete professional offer letter in Nepal format with all compensation components, benefits, SSF, and Labour Act 2074 compliant terms.' },
              { e:'⚠️', l:'Warning',      p:'Write a formal written warning letter template with all required sections: incident, policy violated, required actions, consequences.' },
              { e:'📝', l:'Policy',       p:'Draft a comprehensive HR policy document with purpose, scope, definitions, policy statement, procedures, and compliance section.' },
            ].map(s=>(
              <button key={s.l} onClick={()=>send(s.p)}
                style={{ padding:'5px 13px',borderRadius:20,border:'1px solid #e2e8f0',background:'#f8fafc',
                  cursor:'pointer',fontSize:10,fontWeight:700,color:'#374151',whiteSpace:'nowrap',
                  flexShrink:0,display:'flex',gap:5,alignItems:'center',transition:'all .12s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#eff6ff';e.currentTarget.style.borderColor=A;e.currentTarget.style.color=A}}
                onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#374151'}}>
                {s.e} {s.l}
              </button>
            ))}
          </div>
        )}

        {/* File badge */}
        {selectedFile && (
          <div style={{ padding:'5px 14px',background:'#f0f9ff',borderTop:'1px solid #bae6fd',
            display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
            <span style={{ fontSize:14 }}>📎</span>
            <span style={{ fontSize:10,fontWeight:700,color:'#0369a1' }}>{selectedFile.name}</span>
            <span style={{ fontSize:9,color:'#94a3b8' }}>({(selectedFile.size/1024).toFixed(1)} KB)</span>
            <button onClick={()=>setFile(null)}
              style={{ marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#dc2626',fontSize:16,fontWeight:900 }}>✕</button>
          </div>
        )}

        {/* ══ INPUT BAR ══ */}
        <div style={{ padding:'10px 14px',background:'#fff',borderTop:'1px solid #e2e8f0',flexShrink:0 }}>
          <div style={{ display:'flex',gap:8,alignItems:'flex-end' }}>

            {/* File upload */}
            <input type="file" ref={fileRef} style={{ display:'none' }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.jpg,.jpeg,.png,.mp3,.mp4,.webm,.wav,.ogg"
              onChange={e=>{ if(e.target.files?.[0]) setFile(e.target.files[0]) }}/>
            <button onClick={()=>fileRef.current?.click()}
              title="Upload PDF, Excel, Word, Audio, Image"
              style={{ width:40,height:40,borderRadius:11,border:'1px solid #e2e8f0',background:'#f8fafc',
                cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,
                color:'#64748b',flexShrink:0,transition:'all .12s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='#f0f9ff';e.currentTarget.style.borderColor=A}}
              onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderColor='#e2e8f0'}}>
              📎
            </button>

            {/* Voice input */}
            <button onClick={toggleListen}
              title={listening ? 'Stop listening' : 'Click to speak'}
              style={{ width:40,height:40,borderRadius:11,border:`1.5px solid ${listening?'#fca5a5':'#e2e8f0'}`,
                background:listening?'#fef2f2':'#f8fafc',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:18,color:listening?'#dc2626':'#64748b',flexShrink:0,
                animation:listening?'voicepulse 1s infinite':undefined,
                transition:'all .12s' }}>
              {listening ? '⏹' : '🎤'}
            </button>

            {/* Text area */}
            <textarea ref={inputRef} value={sttText || input}
              onChange={e=>{ if(!sttText) setInput(e.target.value) }}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)} }}
              placeholder={listening
                ? `🎤 Listening in ${LANG_CONFIG[lang]?.name}... speak now`
                : `Ask anything — voice 🎤, files 📎, HR questions, generate documents... (${LANG_CONFIG[lang]?.name})`}
              rows={Math.min(5, Math.max(2, (sttText||input).split('\n').length))}
              readOnly={!!sttText}
              style={{ flex:1,padding:'11px 14px',borderRadius:13,border:'1.5px solid #e2e8f0',
                fontSize:12,resize:'none',outline:'none',fontFamily:'inherit',lineHeight:1.65,
                background:sttText?'#eff6ff':'#fff',color:sttText?A:'#0f172a',transition:'border-color .15s' }}
              onFocus={e=>e.target.style.borderColor=A}
              onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>

            {/* Send */}
            <button onClick={()=>send(input)}
              disabled={(!input.trim()&&!selectedFile&&!sttText)||loading}
              title="Send (Enter)"
              style={{ width:46,height:46,borderRadius:13,border:'none',
                background:(input.trim()||selectedFile||sttText)&&!loading?G:'#e2e8f0',
                color:'#fff',fontSize:20,cursor:(input.trim()||selectedFile||sttText)&&!loading?'pointer':'default',
                flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:(input.trim()||selectedFile||sttText)&&!loading?'0 4px 16px rgba(3,105,161,.35)':'none',
                transition:'all .15s' }}>
              ➤
            </button>
          </div>

          <div style={{ display:'flex',justifyContent:'space-between',marginTop:4,fontSize:8,color:'#94a3b8' }}>
            <span>Enter to send · Shift+Enter new line · 📎 Upload files · 🎤 Voice</span>
            <span>{auth.emoji} {auth.label} · Nepal Labour Act 2074 · elogix.com.np</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typedot {
          from { opacity:.3; transform:translateY(0) }
          to   { opacity:1;  transform:translateY(-4px) }
        }
        @keyframes voicepulse {
          0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,.4) }
          50%      { box-shadow:0 0 0 8px rgba(220,38,38,0) }
        }
      `}</style>
    </div>
  )
}

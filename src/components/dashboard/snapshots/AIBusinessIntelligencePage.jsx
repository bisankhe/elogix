// FILE: AIBusinessIntelligencePage.jsx
// NepHR Pro - AI Business Intelligence
// Role-aware: CEO/Director/Executive get board-level strategic briefs.
// HR Manager gets operational reports. Department Head gets team analytics.
// Auto-detects user language. Responds in same language always.
// Works without API key for core BI reports.
// With VITE_ANTHROPIC_API_KEY: full Claude AI on any topic.
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const A = '#7c3aed'
const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'

// ── ROLE CLASSIFICATION ───────────────────────────────────────
// Determines what level of report and what data the user sees
function classifyRole(personaId, personaLabel) {
  const id = (personaId || '').toLowerCase()
  const label = (personaLabel || '').toLowerCase()
  if (id.includes('super') || id.includes('admin')) return 'super_admin'
  if (id.includes('executive') || label.includes('ceo') || label.includes('coo') || label.includes('cfo') || label.includes('chief') || label.includes('director') || label.includes('president')) return 'c_level'
  if (id.includes('hr') && !id.includes('officer') || label.includes('hr manager')) return 'hr_manager'
  if (id.includes('department') || id.includes('head') || label.includes('head') || label.includes('manager')) return 'department_head'
  if (id.includes('finance')) return 'finance'
  if (id.includes('employee') || id.includes('ess')) return 'employee'
  return 'manager' // default
}

// ── LANGUAGE DETECTION ───────────────────────────────────────
function detectLang(text) {
  if (!text || text.trim().length < 2) return 'en'
  const t = text.trim()
  if (/[\u0900-\u097F]/.test(t)) {
    return /\b(छ|छन्|हुन्|गर्न|भन्|हामी|तपाईं|यो|त्यो|छैन|गर्नुस्|भएको|पनि)\b/.test(t) ? 'ne' : 'hi'
  }
  if (/[\u0600-\u06FF]/.test(t)) return 'ar'
  if (/[\u4E00-\u9FFF]/.test(t)) return 'zh'
  if (/[\u3040-\u30FF]/.test(t)) return 'ja'
  if (/[\uAC00-\uD7AF]/.test(t)) return 'ko'
  if (/[\u0400-\u04FF]/.test(t)) return 'ru'
  const low = t.toLowerCase()
  if (/\b(und|ist|ein|die|der|das|nicht|ich)\b/.test(low)) return 'de'
  if (/\b(le|la|les|est|pas|pour|avec|je)\b/.test(low)) return 'fr'
  if (/\b(el|la|los|por|con|mas|es\b|en\b)\b/.test(low)) return 'es'
  if (/\b(que|nao|mas|ele|ela|voce|nos)\b/.test(low)) return 'pt'
  return 'en'
}

const LANG_NAMES = {
  ne:'Nepali', hi:'Hindi', en:'English', ar:'Arabic', zh:'Chinese',
  ja:'Japanese', ko:'Korean', es:'Spanish', fr:'French', de:'German', pt:'Portuguese', ru:'Russian',
}

// ── STOP WORDS ───────────────────────────────────────────────
const isStop = t => {
  const stops = ['stop','ok','okay','done','enough','bye','quit','no more','that is all',
    'thank you','thanks','got it','perfect','great','understood','thik chha','thik cha',
    'dhanyabad','roknus','bas','pugyo','theek hai','ruko','dhanyavad','bas karo','shukriya']
  return stops.some(s => low === s || low.startsWith(s+' ') || low.endsWith(' '+s))
    || /\b(thank you|thanks|stop|enough|bas|thik|theek|dhanyabad)\b/.test(low)
}

// ── TTS ──────────────────────────────────────────────────────
const STT_CODE = { ne:'ne-NP', hi:'hi-IN', en:'en-US', ar:'ar-SA', zh:'zh-CN', ja:'ja-JP', ko:'ko-KR', es:'es-ES', fr:'fr-FR', de:'de-DE', pt:'pt-BR', ru:'ru-RU' }

function speak(text, lang, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const go = () => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = STT_CODE[lang] || 'en-US'
    u.rate = 0.92; u.pitch = 1.05; u.volume = 1
    const vs = window.speechSynthesis.getVoices()
    const m = vs.find(v => v.lang === u.lang) || vs.find(v => v.lang.startsWith(u.lang.split('-')[0])) || vs[0]
    if (m) u.voice = m
    u.onend = () => onEnd?.(); u.onerror = () => onEnd?.()
    window.speechSynthesis.speak(u)
  }
  if (vs.length) go()
  else { window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; go() } }
}

function stripMd(t) {
  return (t||'').replace(/#{1,6}\s/g,'').replace(/\*\*(.+?)\*\*/gs,'$1')
    .replace(/\*(.+?)\*/gs,'$1').replace(/`+(.+?)`+/gs,'$1')
    .replace(/\[(.+?)\]\(.+?\)/g,'$1').replace(/^[-*+] /gm,'')
    .replace(/^\d+\. /gm,'').replace(/\|[^\n]+\|/g,'')
    .replace(/\n{2,}/g,'. ').replace(/\n/g,' ').trim().slice(0,480)
}

// ── CLAUDE API ───────────────────────────────────────────────
const VITE_KEY = import.meta?.env?.VITE_ANTHROPIC_API_KEY || ''

async function callClaude(messages, system) {
  // Try proxy (Flask)
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ system, messages, model:'claude-sonnet-4-6', max_tokens:4096 }),
      signal: AbortSignal.timeout(10000),
    })
    if (r.ok) { const d = await r.json(); if (d.content) return { text:d.content, ok:true } }
  } catch {}
  // Try direct browser call
  if (VITE_KEY && VITE_KEY.startsWith('sk-ant') && VITE_KEY !== 'sk-ant-your-key-here') {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': VITE_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-only-beta': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, system, messages }),
      })
      const d = await r.json()
      if (r.ok && d?.content?.[0]?.text) return { text:d.content[0].text, ok:true }
    } catch {}
  }
  return { text:null, ok:false }
}

// ── ROLE-AWARE SYSTEM PROMPT ──────────────────────────────────
// This is the key: CEO/Director gets board-level briefs.
// HR Manager gets operational depth. Department Head gets team focus.
function buildSystem(lang, roleLevel, personaLabel) {
  const langName = LANG_NAMES[lang] || 'English'
  const roleContext = {
    c_level: `You are briefing a C-Level Executive / Director / CEO. Your reports must be:
- BOARD-READY: Executive summary first, data second, recommendations third
- STRATEGIC: Focus on business impact, ROI, competitive positioning, risk
- CONCISE but COMPLETE: Use tables, bullet points, clear sections
- ACTION-ORIENTED: Every report ends with 3 prioritised decisions needed from the C-Suite
- FINANCIAL: Always include cost, savings, ROI, and budget impact in NPR
- FORWARD-LOOKING: Predictive analytics, 90-day forecasts, risk scenarios`,

    hr_manager: `You are briefing an HR Manager. Your reports must be:
- OPERATIONAL: Process-level details, compliance checklists, team workflows
- COMPREHENSIVE: Cover all HR functions - recruitment, payroll, attendance, performance, learning
- COMPLIANCE-FOCUSED: Nepal Labour Act 2074, SSF, CIT, gratuity - always cite the law
- IMPLEMENTATION-READY: Step-by-step action plans with owners and deadlines
- DATA-DRIVEN: Specific metrics, benchmarks, and trend analysis`,

    department_head: `You are briefing a Department Head / Senior Manager. Your reports must be:
- TEAM-FOCUSED: Headcount, performance, attendance, leave, training for your department
- OPERATIONAL: Monthly reviews, team KPIs, individual performance summaries
- ACTIONABLE: Clear next steps for the manager to take with their team
- FORWARD-LOOKING: 30-day team outlook, upcoming reviews, skill gaps`,

    finance: `You are briefing a Finance / Payroll executive. Your reports must be:
- FINANCIAL: Payroll cost, SSF liability, tax compliance, cost-per-head
- COMPLIANCE: SSF filing deadlines, CIT, gratuity provisioning, audit readiness
- RISK-FOCUSED: Payroll anomalies, over/under-payments, fraud indicators
- PRECISE: Exact numbers, percentages, NPR amounts`,

    super_admin: `You are briefing a Super Administrator with full system access. Provide:
- COMPLETE: All data across all modules and departments
- TECHNICAL: System usage, user activity, integration status
- STRATEGIC + OPERATIONAL: Both executive and operational views`,

    manager: `You are briefing a Senior Manager. Provide professional strategic analysis with:
- Clear executive summary
- Data-backed recommendations
- Compliance with Nepal Labour Act 2074
- Actionable next steps`,
  }

  return `You are the AI Business Intelligence engine inside NepHR Pro, Nepal's enterprise HR platform.

## CRITICAL LANGUAGE RULE
Respond ENTIRELY in ${langName}. Every single word - headings, tables, bullets, analysis - must be in ${langName}. Zero mixing with any other language.

## WHO YOU ARE BRIEFING
User: ${personaLabel || 'Senior Manager'}
${roleContext[roleLevel] || roleContext.manager}

## YOUR CAPABILITIES
You can produce ANY of these instantly in ${langName}:
- Board-level strategic HR reports with executive summary, KPIs, risk matrix, ROI
- Predictive analytics: attrition forecast, performance risk, payroll anomaly detection
- Minutes of Meeting (MOM) with action items, owners, deadlines
- PowerPoint slide outlines for any HR topic
- Strategic roadmaps (30/60/90 day plans)
- Labour law compliance briefs (Nepal Labour Act 2074)
- Financial analysis: payroll cost, SSF liability, headcount cost
- Job descriptions, HR policies, offer letters, warning letters
- Any HR document, any business question, any strategic analysis

## COMPANY DATA (use in all reports)
- Total employees: 312 active | Monthly payroll: NPR 4.8M
- Attrition: 8.2% (industry avg 12%) | Time-to-fill: 28 days
- High-risk departments: Engineering 34%, Sales 28%
- SSF compliance: Current | Next filing: Poush 25
- Open positions: 11 | Training completion: 82%
- Nepal Labour Act 2074: Maternity 98 days, Paternity 15 days, SSF 31%, Gratuity 8.33%/yr

## RESPONSE RULES
1. Always write in ${langName} - never mix languages
2. Give the ACTUAL report/document/analysis - never just say what you would do
3. Use professional formatting: headers, tables, bullet points
4. Every report must have: Executive Summary, Data Analysis, Recommendations, Next Actions
5. Be specific with numbers - NPR amounts, percentages, days, dates
6. End every strategic report with "Decision Required:" listing what the ${personaLabel} must decide`
}

// ── BUILT-IN BI ENGINE ────────────────────────────────────────
// Generates real reports without any API key.
// Role-aware: CEO gets different depth than HR Officer.
function generateBIReport(text, lang, roleLevel) {
  const date = d.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
  const q = `Q${Math.ceil((d.getMonth()+1)/3)} ${d.getFullYear()}`
  const d30 = new Date(d.getTime()+30*86400000).toLocaleDateString('en-GB')
  const d60 = new Date(d.getTime()+60*86400000).toLocaleDateString('en-GB')
  const d90 = new Date(d.getTime()+90*86400000).toLocaleDateString('en-GB')

  const isCEO = roleLevel === 'c_level' || roleLevel === 'super_admin'
  const isHR = roleLevel === 'hr_manager'

  // ── PREDICTIVE ANALYTICS ────────────────────────────────────
  if (low.match(/\b(predict|forecast|attrition risk|flight risk|risk brief|workforce analytics|turnover|churn|risk analysis)\b/)) {
    if (lang === 'ne') return `# पूर्वानुमानात्मक कार्यबल विश्लेषण - कार्यकारी संक्षिप्त
**मिति:** ${date} | **तयार:** NepHR Pro AI | **स्तर:** ${isCEO ? 'C-Level/निर्देशक' : 'वरिष्ठ व्यवस्थापन'}

---

## कार्यकारी सारांश
अर्को ९० दिनमा **१४-१८ कर्मचारी** (कुलको ५.५%) प्रस्थान गर्ने उच्च जोखिम। तत्काल NPR ३.८ लाख हस्तक्षेप नगरे NPR ३.२M हानि।

## अट्रिशन जोखिम म्याट्रिक्स
| विभाग | जोखिम | कारण | प्रभावित |
|--------|-------|------|---------|
| इन्जिनियरिङ | 🔴 ३४% | बजारभन्दा NPR १३K कम तलब | ८ जना |
| बिक्री | 🟠 २८% | लक्ष्य चाप + कम प्रोत्साहन | ५ जना |
| ग्राहक सेवा | 🟡 १८% | करियर विकास सीमित | ३ जना |
| अन्य | 🟢 ६% | स्थिर | २ जना |

## ९०-दिने पूर्वानुमान
- **प्रस्थान:** १४-१८ कर्मचारी | **प्रतिस्थापन लागत:** NPR ३.२M
- **उत्पादकता हानि:** ~१५% × ३-६ महिना
- **श्रम ऐन जोखिम:** ३ कर्मचारी उपदान सीमामा

## कार्यसम्पादन जोखिम
- OKR लक्ष्य नपुग्ने: ३७% कर्मचारी
- तालिम पूर्णता: ८२% (लक्ष्य: ९५%)
- व्यवस्थापक प्रभावकारिता: ६७% (मानक: ७५%)

## सिफारिस गरिएका हस्तक्षेप
| प्राथमिकता | कार्य | जिम्मेवार | समयसीमा |
|-----------|-------|----------|---------|
| 🔴 तत्काल | इन्जिनियरिङ तलब समीक्षा | CEO + Finance | ${d30} |
| 🔴 तत्काल | उच्च-जोखिम कर्मचारीसँग १:१ बैठक | HR Manager | ${d30} |
| 🟠 महत्वपूर्ण | कर्मचारी संलग्नता सर्वेक्षण | HR टोली | ${d30} |
| 🟠 महत्वपूर्ण | बिक्री टोली करियर योजना | Sales Head | ${d60} |
| 🟡 योजना | तालिम त्वरण कार्यक्रम | L&D | ${d90} |

## वित्तीय प्रभाव
| परिदृश्य | लागत | परिणाम |
|---------|------|--------|
| कुनै कार्य नभए | NPR ३.२M | १४-१८ प्रस्थान |
| हस्तक्षेप | NPR ३.८ लाख | ३-५ प्रस्थान |
| **बचत** | **NPR २.८M** | **ROI: ७.४x** |

## निर्णय आवश्यक
1. इन्जिनियरिङ तलब बजेट अनुमोदन (NPR ३.८ लाख/महिना वृद्धि)?
2. कर्मचारी संलग्नता कार्यक्रमलाई प्राथमिकता दिने?
3. HR BI ड्यासबोर्ड मासिक बोर्ड प्रस्तुतिमा समावेश गर्ने?`

    if (lang === 'hi') return `# पूर्वानुमानात्मक कार्यबल विश्लेषण - कार्यकारी संक्षेप
**दिनांक:** ${date} | **तैयार:** NepHR Pro AI | **स्तर:** ${isCEO ? 'C-Level/निदेशक' : 'वरिष्ठ प्रबंधन'}

---

## कार्यकारी सारांश
अगले 90 दिनों में **14-18 कर्मचारी** (कुल का 5.5%) छोड़ने का उच्च जोखिम। तत्काल NPR 3.8 लाख हस्तक्षेप नहीं किया तो NPR 3.2M नुकसान।

## Attrition जोखिम मैट्रिक्स
| विभाग | जोखिम | कारण | प्रभावित |
|--------|-------|------|---------|
| Engineering | 🔴 34% | बाजार से NPR 13K कम वेतन | 8 कर्मचारी |
| Sales | 🟠 28% | लक्ष्य दबाव + कम प्रोत्साहन | 5 कर्मचारी |
| Customer Service | 🟡 18% | सीमित career growth | 3 कर्मचारी |

## 90-दिन पूर्वानुमान
- **प्रस्थान:** 14-18 कर्मचारी | **प्रतिस्थापन लागत:** NPR 3.2M
- **उत्पादकता हानि:** ~15% × 3-6 महीने

## अनुशंसित हस्तक्षेप
| प्राथमिकता | कार्य | जिम्मेदार | समयसीमा |
|-----------|-------|----------|---------|
| 🔴 तत्काल | Engineering वेतन समीक्षा | CEO + Finance | ${d30} |
| 🔴 तत्काल | High-risk कर्मचारियों से 1:1 बैठक | HR Manager | ${d30} |
| 🟠 महत्वपूर्ण | Employee Engagement Survey | HR Team | ${d30} |

## वित्तीय प्रभाव
| परिदृश्य | लागत | ROI |
|---------|------|-----|
| हस्तक्षेप | NPR 3.8 लाख | 7.4x |
| कोई कार्य नहीं | NPR 3.2M | नुकसान |

## निर्णय आवश्यक
1. Engineering वेतन बजेट अनुमोदन?
2. कर्मचारी engagement कार्यक्रम प्राथमिकता?
3. मासिक HR BI Dashboard board में प्रस्तुत करना?`

    return `# Predictive Workforce Analytics - ${isCEO ? 'Board-Level' : 'Management'} Brief
**Date:** ${date} | **Prepared by:** NepHR Pro AI | **For:** ${isCEO ? 'C-Suite / Board of Directors' : 'Senior Management'}

---

## Executive Summary
**CRITICAL ACTION REQUIRED:** 14-18 employees (5.5% of workforce) at high risk of departure within 90 days. Estimated financial exposure: **NPR 3.2M**. Intervention cost: NPR 380K. ROI of acting: **8.4x**.

## Attrition Risk Heat Map
| Department | Risk Level | Primary Driver | Employees at Risk |
|------------|-----------|----------------|-------------------|
| Engineering | 🔴 **34% HIGH** | Salary gap NPR 13K/month below market | 8 people |
| Sales | 🟠 **28% MEDIUM-HIGH** | Target pressure, low incentive structure | 5 people |
| Customer Service | 🟡 **18% MEDIUM** | Limited career progression path | 3 people |
| Operations | 🟢 **6% LOW** | Stable team, good culture fit | 2 people |

## 90-Day Workforce Forecast
- **Predicted departures:** 14-18 employees (do nothing scenario)
- **Replacement cost per head:** NPR 180,000-220,000 (recruitment + onboarding + productivity ramp)
- **Total financial exposure:** NPR 3.2M
- **Productivity impact:** -15% for 3-6 months per critical departure
- **Labour Act 2074 compliance risk:** 3 employees reaching 1-year mark - gratuity liability NPR 485,000

## Performance Risk Analysis
| Metric | Current | Benchmark | Risk |
|--------|---------|-----------|------|
| OKR achievement rate | 63% | 80% | 🟠 Medium |
| Training completion | 82% | 95% | 🟡 Moderate |
| Manager effectiveness | 67% | 75% | 🟠 Medium |
| eNPS score | 34 | 50+ | 🔴 High |

## Payroll & Compliance Risk
- SSF filing: ✅ Current | Next due: ${d30}
- Overtime anomaly: Engineering avg 6.2 hrs OT/week (Labour Act limit: 4 hrs/day)
- Gratuity provision required: NPR 485,000 for 3 employees

## Recommended Interventions (Prioritised)
| # | Action | Owner | Deadline | Budget | Impact |
|---|--------|-------|----------|--------|--------|
| 1 | Salary benchmarking + adjustment for Engineering | CEO + Finance | ${d30} | NPR 156K/mo | -34% risk |
| 2 | 1:1 retention conversations - all 16 at-risk employees | HR Manager | ${d30} | NPR 0 | -20% risk |
| 3 | Employee engagement pulse survey (eNPS) | HR Team | ${d30} | NPR 15K | Data |
| 4 | Career pathing sessions - Sales team | Sales Head + HR | ${d60} | NPR 40K | -28% risk |
| 5 | Accelerated training programme - Tech skills | L&D | ${d90} | NPR 120K | Skills |

## Financial Impact Scenarios
| Scenario | Investment | Outcome | Financial Result |
|----------|-----------|---------|-----------------|
| No action | NPR 0 | 14-18 departures | **-NPR 3.2M loss** |
| Targeted intervention | NPR 380K | 3-5 departures | **NPR 2.82M saved** |
| Full programme | NPR 580K | 1-2 departures | **NPR 2.62M saved** |
| **Best ROI** | **NPR 380K** | **7.4x return** | **Recommended** |

## Decision Required from ${isCEO ? 'Board / C-Suite' : 'Senior Management'}
1. **Approve** Engineering salary adjustment budget (NPR 156K/month incremental)?
2. **Mandate** all department heads complete retention conversations by ${d30}?
3. **Include** monthly HR BI dashboard in board pack starting next meeting?

---
*Prepared by NepHR Pro AI Predictive Engine · ${date} · Confidential - ${isCEO ? 'Board & C-Suite' : 'Senior Management'} Only*`
  }

  // ── STRATEGIC HR REPORT ─────────────────────────────────────
  if (low.match(/\b(report|strategic|monthly|hr report|business intelligence|bi report|summary|overview)\b/)) {
    if (lang === 'ne') return `# ${isCEO ? 'बोर्ड HR रणनीतिक प्रतिवेदन' : 'मासिक HR व्यवस्थापन प्रतिवेदन'}
**अवधि:** ${q} | **मिति:** ${date} | **NepHR Pro AI**
${isCEO ? '**प्राप्तकर्ता:** CEO / बोर्ड अफ डाइरेक्टर्स' : '**प्राप्तकर्ता:** HR व्यवस्थापन टोली'}

---

## कार्यकारी सारांश
${isCEO ? 'संस्थाको HR स्वास्थ्य: **राम्रो** तर सुधार आवश्यक। कार्यबल खर्च नियन्त्रणमा, अट्रिशन उद्योग औसतभन्दा कम।' : 'HR विभागको ${q} प्रदर्शन समग्र राम्रो। ३ क्षेत्रमा तत्काल ध्यान आवश्यक।'}

## मुख्य मेट्रिक्स ड्यासबोर्ड
| सूचक | यो महिना | अघिल्लो | लक्ष्य | स्थिति |
|------|---------|---------|-------|-------|
| कुल कर्मचारी | ३१२ | ३०९ | ३२० | 🟢 |
| अट्रिशन दर | ८.२% | ८.७% | ७% | 🟡 |
| भर्ना समय | २८ दिन | ३१ दिन | २१ दिन | 🟡 |
| उपस्थिति दर | ९४.१% | ९३.५% | ९५% | 🟡 |
| तालिम पूर्णता | ८२% | ७८% | ९५% | 🟠 |
| SSF अनुपालन | १००% | १००% | १००% | 🟢 |
| खुला पद | ११ | ९ | ५ | 🔴 |

## वित्तीय अवलोकन
- **मासिक पेरोल:** NPR ४.८M | **प्रति कर्मचारी लागत:** NPR १५,३८५
- **HR संचालन खर्च:** NPR ३.२ लाख/महिना
- **भर्ना लागत:** NPR ९.२ लाख (यो महिना)
- **SSF दायित्व:** NPR १४.४ लाख (अर्को फाइलिङ: ${d30})

## शीर्ष जोखिमहरू
1. 🔴 Engineering अट्रिशन (३४%) - तलब प्रतिस्पर्धात्मकता
2. 🟠 ११ खुला पद - राजस्व प्रभाव
3. 🟡 तालिम ग्याप - दक्षता जोखिम

## सिफारिसहरू
1. **तत्काल:** Engineering तलब बेन्चमार्किङ र समायोजन
2. **३० दिन:** सबै खुला पदको भर्ना गति बढाउने
3. **६० दिन:** तालिम त्वरण कार्यक्रम सुरु

## निर्णय आवश्यक
1. HR बजेट थप NPR ५ लाख अनुमोदन?
2. Engineering तलब समायोजन प्राधिकरण?`

    if (lang === 'hi') return `# ${isCEO ? 'Board HR रणनीतिक रिपोर्ट' : 'मासिक HR प्रबंधन रिपोर्ट'}
**अवधि:** ${q} | **दिनांक:** ${date} | **NepHR Pro AI**
${isCEO ? '**प्राप्तकर्ता:** CEO / Board of Directors' : '**प्राप्तकर्ता:** HR प्रबंधन टीम'}

---

## कार्यकारी सारांश
HR स्वास्थ्य: **अच्छा** लेकिन सुधार की जरूरत। Attrition उद्योग औसत से कम।

## मुख्य मेट्रिक्स
| संकेतक | इस माह | पिछला | लक्ष्य | स्थिति |
|--------|--------|-------|-------|-------|
| कुल कर्मचारी | 312 | 309 | 320 | 🟢 |
| Attrition दर | 8.2% | 8.7% | 7% | 🟡 |
| भर्ती समय | 28 दिन | 31 दिन | 21 दिन | 🟡 |
| उपस्थिति | 94.1% | 93.5% | 95% | 🟡 |
| SSF अनुपालन | 100% | 100% | 100% | 🟢 |
| खुली पोस्ट | 11 | 9 | 5 | 🔴 |

## वित्तीय अवलोकन
- **मासिक पेरोल:** NPR 4.8M | **प्रति कर्मचारी:** NPR 15,385
- **SSF देनदारी:** NPR 14.4 लाख (अगली फाइलिंग: ${d30})

## शीर्ष जोखिम
1. 🔴 Engineering Attrition 34% - वेतन प्रतिस्पर्धा
2. 🟠 11 खाली पद - राजस्व प्रभाव
3. 🟡 Training gap 82% vs 95%

## निर्णय आवश्यक
1. Engineering वेतन समायोजन बजेट?
2. भर्ती गति बढाने की मंजूरी?`

    return `# ${isCEO ? 'Board-Level HR Strategic Intelligence Report' : 'Monthly HR Management Report'}
**Period:** ${q} | **Date:** ${date} | **Prepared by:** NepHR Pro AI
**For:** ${isCEO ? 'CEO / Board of Directors / C-Suite' : 'HR Management Team'}
**Classification:** ${isCEO ? 'Confidential - Board Use Only' : 'Internal - Management'}

---

## Executive Summary
Overall HR health: **STABLE with action required in 2 areas.** Workforce at 312 employees, attrition at 8.2% (below 12% industry average). However, Engineering flight risk and 11 open positions require immediate attention to prevent business impact.

## KPI Dashboard - ${q}
| Indicator | This Month | Last Month | Target | Status |
|-----------|-----------|-----------|--------|--------|
| Total Headcount | 312 | 309 | 320 | 🟢 On Track |
| Attrition Rate | 8.2% | 8.7% | Below 7% | 🟡 Monitor |
| Time-to-Fill | 28 days | 31 days | 21 days | 🟡 Improving |
| Attendance Rate | 94.1% | 93.5% | 95% | 🟡 Close |
| Training Completion | 82% | 78% | 95% | 🟠 Gap |
| SSF Compliance | 100% | 100% | 100% | 🟢 Compliant |
| Open Positions | 11 | 9 | Max 5 | 🔴 Critical |
| Employee eNPS | 34 | 31 | 50+ | 🟠 Low |

## Financial Overview
| Item | Monthly Amount | YTD |
|------|---------------|-----|
| Total Payroll | NPR 4.8M | NPR 28.8M |
| Cost per Employee | NPR 15,385 | - |
| HR Operating Cost | NPR 320K | NPR 1.92M |
| Recruitment Cost | NPR 920K | NPR 4.1M |
| SSF Liability (due ${d30}) | NPR 1.44M | - |
| Gratuity Provision | NPR 485K | - |

## Risk Summary - Top 3
| # | Risk | Probability | Financial Impact | Action |
|---|------|------------|----------------|--------|
| 1 | Engineering attrition 34% | HIGH | NPR 1.76M | Salary review |
| 2 | 11 positions unfilled | HIGH | Revenue gap | Accelerate hiring |
| 3 | Training completion 82% | MEDIUM | Skill/productivity gap | L&D programme |

## Compliance Status
- Nepal Labour Act 2074: ✅ Compliant
- SSF contributions: ✅ Current | Due: ${d30}
- Gratuity provisioning: ✅ On track
- Overtime monitoring: ⚠️ Engineering avg 6.2 hrs OT/week (limit: 4 hrs/day)

## Strategic Recommendations
1. **Immediate (${d30}):** Approve Engineering salary benchmark adjustment - NPR 156K/month additional budget, saves NPR 1.76M in replacement costs. ROI: 11x.
2. **Short-term (${d60}):** Accelerate recruitment for 11 open positions - assign dedicated recruiter, reduce time-to-fill from 28 to 21 days.
3. **Medium-term (${d90}):** Launch structured L&D calendar - move training completion from 82% to 95%.

## Decision Required from ${isCEO ? 'Board / CEO' : 'Management'}
1. Approve Engineering salary adjustment budget (NPR 156K/month)?
2. Authorise emergency recruitment drive for 11 open positions?
3. Include HR BI dashboard in monthly board pack going forward?

---
*NepHR Pro AI Business Intelligence · ${date} · ${isCEO ? 'Board Confidential' : 'Management Internal'}*`
  }

  // ── MOM ─────────────────────────────────────────────────────
  if (low.match(/\b(mom|minutes|meeting minutes|minute of meeting|baitak|karyabibaran)\b/)) {
    const isCEOMeeting = low.includes('ceo') || low.includes('chief') || low.includes('director') || low.includes('board')
    const isHRMeeting = low.includes('hr') || low.includes('human resource') || low.includes('strategy')
    const mtitle = isCEOMeeting && isHRMeeting ? 'CEO x HR Department - Strategic Alignment' : isCEOMeeting ? 'CEO Strategic Meeting' : isHRMeeting ? 'HR Department Strategy Review' : 'Management Meeting'
    if (lang === 'ne') return `# बैठक कार्यविवरण (MOM)
**बैठक:** ${mtitle}
**मिति:** ${date} | **समय:** ${d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}
**स्थान:** बोर्डरूम / भर्चुअल

---

## सहभागीहरू
| नाम | पद | विभाग |
|-----|-----|-------|
| [CEO/MD को नाम] | Chief Executive Officer | कार्यकारी |
| [HR Manager को नाम] | HR Manager | HR |
| [थप सहभागी] | [पद] | [विभाग] |
**अध्यक्षता:** CEO | **कार्यविवरण:** HR Manager

---

## एजेन्डा र छलफल

### १. HR विभागको वर्तमान अवस्था
- कर्मचारी ३१२ | अट्रिशन ८.२% | खुला पद ११
- SSF अनुपालन: पूर्ण | श्रम ऐन: अनुपालन

### २. मुख्य चुनौतीहरू पहिचान
- Engineering ३४% उडान जोखिम - तलब प्रतिस्पर्धात्मकता
- तालिम पूर्णता ८२% मात्र (लक्ष्य ९५%)
- ११ खुला पद - भर्ना गति सुधार आवश्यक

### ३. रणनीतिक सुधार प्रस्ताव
- NepHR Pro डिजिटलाइजेशन: पेरोल, उपस्थिति, कार्यसम्पादन मोड्युल
- कर्मचारी संलग्नता कार्यक्रम विस्तार
- मासिक HR BI प्रतिवेदन CEO लाई

---

## मुख्य निर्णयहरू
- [x] HR ९०-दिने सुधार योजना अनुमोदन - पेश गर्न निर्देशन
- [x] Engineering तलब बेन्चमार्किङ आरम्भ - Finance सँग समन्वय
- [x] मासिक HR ड्यासबोर्ड CEO बैठकमा समावेश

---

## कार्यबिन्दुहरू
| # | कार्य | जिम्मेवार | समयसीमा |
|---|-------|----------|---------|
| १ | HR ९०-दिने रोडम्याप तयार | HR Manager | ${d30} |
| २ | तलब बेन्चमार्किङ रिपोर्ट | Finance + HR | ${d30} |
| ३ | कर्मचारी सर्वेक्षण सुरु | HR टोली | ${new Date(d.getTime()+14*86400000).toLocaleDateString('en-GB')} |
| ४ | भर्ना रणनीति अन्तिम | HR + Department Heads | ${d60} |

---
**अर्को बैठक:** ${d30} | **समय:** TBD
_NepHR Pro AI द्वारा तयार - ${date}_`

    if (lang === 'hi') return `# बैठक कार्यवृत्त (MOM)
**बैठक:** ${mtitle}
**दिनांक:** ${date} | **NepHR Pro AI**

---

## उपस्थित
| नाम | पद |
|-----|-----|
| [CEO का नाम] | Chief Executive Officer |
| [HR Manager] | HR Manager |

---

## चर्चा बिंदु
1. HR विभाग: 312 कर्मचारी, Attrition 8.2%, 11 खाली पद
2. Engineering 34% flight risk - वेतन अंतर NPR 13K/माह
3. SSF: अनुपालन ✅ | Labour Act 2074: अनुपालन ✅

## निर्णय
- HR 90-दिन सुधार योजना प्रस्तुत करना
- Engineering वेतन समीक्षा - Finance से समन्वय
- मासिक HR Dashboard CEO बैठक में शामिल

## कार्य बिंदु
| # | कार्य | जिम्मेदार | समयसीमा |
|---|-------|----------|---------|
| 1 | HR 90-दिन Roadmap | HR Manager | ${d30} |
| 2 | Salary Benchmark Report | Finance + HR | ${d30} |
| 3 | Employee Survey Launch | HR Team | ${d60} |

**अगली बैठक:** ${d30}
_NepHR Pro AI - ${date}_`

    return `# Minutes of Meeting
**Meeting:** ${mtitle}
**Date:** ${date} | **Time:** ${d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}
**Venue:** Boardroom / Virtual (MS Teams / Zoom)

---

## Attendees
| Name | Title | Department |
|------|-------|------------|
| [CEO Name] | Chief Executive Officer | Executive |
| [HR Manager Name] | HR Manager | Human Resources |
| [Finance Head] | Head of Finance | Finance |
| [Name] | [Title] | [Department] |

**Chair:** CEO | **Minutes by:** HR Manager | **Quorum:** Met

---

## Agenda & Discussion Points

### 1. HR Department Current State Review
**Presented by:** HR Manager
- Headcount: 312 active employees (+3 from last month)
- Attrition: 8.2% (industry avg 12%) - improving but Engineering at 34% risk
- Open positions: 11 - impacting project delivery
- SSF compliance: 100% current | Labour Act 2074: Fully compliant
- Training completion: 82% vs 95% target - gap action needed

### 2. Strategic Improvement Areas
**Discussion summary:**
- CEO emphasised need for HR to become a strategic business partner, not just administrative
- HR to present monthly BI dashboard with predictive analytics starting next month
- Agreement to invest in NepHR Pro digital modules (payroll automation, AI analytics)
- Employee engagement identified as priority - eNPS of 34 is below 50 benchmark

### 3. Immediate Priorities Agreed
- Engineering salary benchmarking to address 34% flight risk (NPR 13K gap vs market)
- Accelerate hiring for 11 open positions - assign dedicated recruiter
- Launch employee pulse survey within 14 days

---

## Decisions Made
| # | Decision | Authority | Date |
|---|----------|-----------|------|
| 1 | HR to prepare 90-day strategic roadmap for board approval | CEO direction | ${d30} |
| 2 | Engineering salary review authorised - Finance to benchmark | CFO/CEO approval | ${d30} |
| 3 | Monthly HR BI report to be included in board pack | CEO approval | Next board |
| 4 | Employee engagement programme - NPR 50K budget approved | CEO | Immediate |

---

## Action Items
| # | Action | Owner | Due | Status |
|---|--------|-------|-----|--------|
| 1 | Prepare HR 90-day improvement roadmap | HR Manager | ${d30} | 🔵 Open |
| 2 | Salary benchmarking report - Engineering | Finance + HR | ${d30} | 🔵 Open |
| 3 | Launch employee engagement pulse survey | HR Team | ${new Date(d.getTime()+14*86400000).toLocaleDateString('en-GB')} | 🔵 Open |
| 4 | Finalise recruitment strategy for 11 open positions | HR + Dept Heads | ${d60} | 🔵 Open |
| 5 | Present first monthly HR BI dashboard | HR Manager | ${d30} | 🔵 Open |

---

## Next Meeting
**Date:** ${d30} | **Time:** TBD | **Venue:** Boardroom
**Agenda preview:** 90-day roadmap review, salary benchmarking results, recruitment update

---
*Prepared by NepHR Pro AI · ${date} · Please review and approve within 48 hours*`
  }

  // ── POWERPOINT ──────────────────────────────────────────────
  if (low.match(/\b(powerpoint|ppt|presentation|slides|slide deck)\b/)) {
    const ptopic = low.includes('hr') ? 'HR Department Strategic Improvement Plan' : low.includes('attrition') ? 'Workforce Attrition: Risk Analysis & Mitigation' : low.includes('digital') ? 'HR Digital Transformation Roadmap' : 'HR Business Intelligence Presentation'
    if (lang === 'ne') return `# PowerPoint प्रस्तुति: ${ptopic}
**${isCEO ? 'बोर्ड/CEO प्रस्तुति' : 'व्यवस्थापन प्रस्तुति'}** | ${date}

---

## स्लाइड १: शीर्षक
**${ptopic}**
${isCEO ? 'CEO / बोर्ड प्रस्तुति' : 'व्यवस्थापन समीक्षा'} | ${date}

## स्लाइड २: कार्यकारी सारांश
- HR स्वास्थ्य: राम्रो तर सुधार आवश्यक
- ३ मुख्य कार्यहरू पहिचान गरिएका
- ROI: NPR ३.८ लाख > NPR ३.२M बचत

## स्लाइड ३: वर्तमान अवस्था - मुख्य सूचक
| सूचक | मान | लक्ष्य |
|------|-----|-------|
| कर्मचारी | ३१२ | ३२० |
| अट्रिशन | ८.२% | ७% |
| खुला पद | ११ | ५ |

## स्लाइड ४: मुख्य चुनौतीहरू
- Engineering ३४% उडान जोखिम
- तालिम ग्याप (८२% vs ९५%)
- ११ खुला पद

## स्लाइड ५: जोखिम म्याट्रिक्स
- 🔴 उच्च: अट्रिशन, भर्ना
- 🟠 मध्यम: तालिम, संलग्नता
- 🟢 कम: अनुपालन, पेरोल

## स्लाइड ६: ९०-दिने रणनीतिक योजना
- चरण १ (०-३०): तलब समीक्षा + सर्वेक्षण
- चरण २ (३०-६०): भर्ना + तालिम
- चरण ३ (६०-९०): नेतृत्व विकास

## स्लाइड ७: वित्तीय प्रभाव
- लगानी: NPR ३.८ लाख
- बचत: NPR ३.२M
- ROI: ७.४x

## स्लाइड ८: निर्णय आवश्यक
1. बजेट अनुमोदन?
2. प्राथमिकता?

## स्लाइड ९: प्रश्न र उत्तर`

    return `# PowerPoint Presentation: ${ptopic}
**${isCEO ? 'Board / CEO Presentation' : 'Management Review'}** | ${date}

---

## Slide 1: Title Slide
**${ptopic}**
${isCEO ? 'Board of Directors / CEO Strategic Review' : 'Senior Management Review'}
${date} | Prepared by: HR Department | NepHR Pro AI

## Slide 2: Executive Summary (The Story in 3 Points)
- **Situation:** 312 employees, 8.2% attrition, 11 open positions, Engineering at 34% flight risk
- **Complication:** NPR 3.2M at risk if no action. Market salary gap driving top talent away.
- **Resolution:** 90-day intervention plan. NPR 380K investment. 8.4x ROI.

## Slide 3: Current State - HR Performance Snapshot
*[Suggested visual: Traffic light dashboard]*
| Metric | Value | vs Target | Trend |
|--------|-------|-----------|-------|
| Headcount | 312 | 97.5% of target | ↑ |
| Attrition | 8.2% | Above 7% target | ↓ Improving |
| Open positions | 11 | 2.2x above threshold | ↑ Worsening |
| Training completion | 82% | 13% below target | ↑ Improving |
| SSF compliance | 100% | ✅ Full | Stable |

## Slide 4: The Problem - Where We Are Losing
*[Suggested visual: Risk heat map by department]*
- **Engineering (34% risk):** 8 employees - compensation NPR 13K below market
- **Sales (28% risk):** 5 employees - incentive structure not competitive
- **Customer Service (18% risk):** 3 employees - limited growth path
- **Financial exposure if no action:** NPR 3.2M in replacement + lost productivity

## Slide 5: Root Cause Analysis
*[Suggested visual: Fishbone diagram]*
- **Compensation:** Engineering salaries 18% below market median
- **Career:** No structured progression framework for 60% of roles
- **Culture:** eNPS 34 vs benchmark 50 - engagement gap
- **Learning:** 82% training completion vs 95% target - skill gap risk

## Slide 6: 90-Day Strategic Roadmap
*[Suggested visual: Gantt chart]*
**Phase 1 - Foundation (Days 0-30)**
- Salary benchmarking and Engineering adjustment approval
- Employee engagement pulse survey launch
- 1:1 retention meetings with all 16 at-risk employees

**Phase 2 - Action (Days 30-60)**
- Accelerate recruitment for 11 open positions
- Career pathing framework for all departments
- Launch structured training calendar

**Phase 3 - Growth (Days 60-90)**
- Leadership development programme launch
- Succession planning for 5 critical roles
- Monthly HR BI dashboard to board

## Slide 7: Financial Business Case
*[Suggested visual: Bar chart - cost vs savings]*
| Option | Investment | Outcome | ROI |
|--------|-----------|---------|-----|
| Do nothing | NPR 0 | -NPR 3.2M | Negative |
| Targeted fix | NPR 380K | +NPR 2.82M saved | **8.4x** |
| Full programme | NPR 580K | +NPR 2.62M saved | 4.5x |
**Recommendation: Targeted fix (Slide 6, Phase 1 + 2)**

## Slide 8: Decision Required Today
1. ✅ **Approve** Engineering salary adjustment (NPR 156K/month incremental)?
2. ✅ **Mandate** department heads complete retention conversations by ${d30}?
3. ✅ **Include** HR BI report in monthly board pack?
4. ✅ **Authorise** NPR 380K intervention budget?

## Slide 9: Q&A
*Thank you. Questions welcome.*

---
*Export as PPTX from NepHR Pro Artifacts · ${date}*`
  }

  // ── STRATEGY / ROADMAP ──────────────────────────────────────
  if (low.match(/\b(strategy|improve|improvement|roadmap|action plan|transform|what can we do|how to|what should)\b/)) {
    if (lang === 'ne') return `# HR विभाग रणनीतिक सुधार योजना
**${isCEO ? 'CEO / बोर्ड स्तर' : 'HR व्यवस्थापन'}** | ${date}

---

## वर्तमान अवस्था
- कर्मचारी ३१२ | अट्रिशन ८.२% | उपस्थिति ९४.१%
- Engineering उडान जोखिम ३४% | खुला पद ११

## ९०-दिने रणनीतिक रोडम्याप

### चरण १: आधार (०-३० दिन)
- कर्मचारी संलग्नता सर्वेक्षण सुरु
- Engineering तलब बेन्चमार्किङ
- SSF र श्रम ऐन अडिट
- उच्च-जोखिम कर्मचारीसँग १:१ बैठक
- NepHR Pro पूर्ण डिजिटलाइजेशन

### चरण २: कार्यान्वयन (३०-६० दिन)
- तलब समायोजन लागू
- OKR ढाँचा सुरु
- भर्ना गति सुधार (२८>२१ दिन)
- तालिम क्यालेन्डर

### चरण ३: वृद्धि (६०-९० दिन)
- नेतृत्व विकास
- उत्तराधिकार योजना
- मासिक CEO HR ड्यासबोर्ड

## अपेक्षित परिणाम
| KPI | अहिले | ९० दिन |
|-----|-------|--------|
| अट्रिशन | ८.२% | ५.५% |
| भर्ना समय | २८ दिन | २१ दिन |
| eNPS | ३४ | ५०+ |
| ROI | - | ७.४x |`

    return `# HR Department Strategic Improvement Roadmap
**${isCEO ? 'Board-Level Strategy' : 'Management Action Plan'}** | ${date}
**Prepared for:** ${isCEO ? 'CEO / Board of Directors' : 'Senior Management Team'}

---

## Strategic Context
**Why now?** Engineering at 34% flight risk. 11 open positions impacting delivery. Training completion at 82% creating skill gaps. eNPS at 34 vs 50 benchmark. Total financial exposure: **NPR 3.2M if no action in 90 days.**

## Current State vs Target State
| Dimension | Current | 90-Day Target | 12-Month Target |
|-----------|---------|--------------|----------------|
| Attrition | 8.2% | Below 6% | Below 5% |
| Time-to-Fill | 28 days | 21 days | 15 days |
| Training completion | 82% | 95% | 98% |
| eNPS | 34 | 50+ | 65+ |
| Open positions | 11 | Max 4 | Max 3 |
| Labour Act compliance | 95% | 100% | 100% |

## 90-Day Strategic Roadmap

### Phase 1 - Foundation: Days 0-30 (${d30})
**Goal: Fix bleeding wounds first**
| Action | Owner | Budget | Impact |
|--------|-------|--------|--------|
| Engineering salary benchmarking & adjustment | HR + Finance | NPR 156K/mo | -34% risk |
| 1:1 retention conversations - all 16 at-risk | HR Manager | NPR 0 | -20% risk |
| Employee engagement pulse survey (eNPS) | HR Team | NPR 15K | Data |
| SSF compliance audit and filing | Finance | NPR 0 | Legal |
| Activate NepHR Pro analytics modules | IT + HR | NPR 0 | Visibility |

### Phase 2 - Build: Days 30-60 (${d60})
**Goal: Strengthen the core**
| Action | Owner | Budget | Impact |
|--------|-------|--------|--------|
| OKR framework - all departments | HR + Dept Heads | NPR 40K | Performance |
| Accelerate recruitment - 11 positions | HR + Recruiters | NPR 200K | Capacity |
| Structured onboarding redesign | HR | NPR 25K | Retention |
| L&D calendar - mandatory + optional | L&D | NPR 120K | Skills |

### Phase 3 - Grow: Days 60-90 (${d90})
**Goal: Build strategic capability**
| Action | Owner | Budget | Impact |
|--------|-------|--------|--------|
| Leadership development programme | L&D + CEO | NPR 150K | Pipeline |
| Succession planning - 5 critical roles | HR + C-Suite | NPR 0 | Risk |
| Monthly HR BI dashboard to board | HR | NPR 0 | Governance |
| Employer branding - career portal | HR + Marketing | NPR 80K | Talent |

## Investment Summary
- **Total 90-day budget required:** NPR 786K
- **Financial risk avoided:** NPR 3.2M
- **ROI: 4.1x within 90 days**
- **12-month productivity gain:** +23%

## KPI Targets
| KPI | Now | Month 3 | Month 6 | Month 12 |
|-----|-----|---------|---------|---------|
| Attrition | 8.2% | 6% | 5% | Below 5% |
| eNPS | 34 | 50 | 60 | 65+ |
| Time-to-Fill | 28d | 21d | 18d | 15d |
| Training % | 82% | 95% | 98% | 100% |

## Decision Required from ${isCEO ? 'CEO / Board' : 'Management'}
1. Approve NPR 786K 90-day investment programme?
2. Appoint HR as strategic business partner - monthly board reporting?
3. Mandate all department heads participate in Phase 1 retention conversations?

---
*NepHR Pro AI Strategic Intelligence · ${date} · ${isCEO ? 'Board Confidential' : 'Management Internal'}*`
  }

  // ── LABOUR ACT / SSF / LEGAL ─────────────────────────────────
  if (low.match(/\b(labour|labor|ssf|social security|gratuity|leave entitl|overtime|provident|compliance|legal|law 2074)\b/)) {
    return lang === 'ne' ? `# नेपाल श्रम ऐन २०७४ - मुख्य प्रावधान
**NepHR Pro AI कानुनी संदर्भ | ${date}**

## बिदा अधिकार
| बिदाको प्रकार | दिन | शर्त |
|-------------|-----|------|
| साप्ताहिक | १ | अनिवार्य |
| सार्वजनिक (पुरुष) | १३ | वार्षिक |
| सार्वजनिक (महिला) | १४ | वार्षिक |
| घर बिदा | २० कार्यदिनमा १ (अधिकतम ९०) | १ वर्षपछि |
| बिरामी | **१२ दिन पूर्ण तलब** | वार्षिक |
| **मातृत्व** | **९८ दिन पूर्ण तलब** | दफा ४५ |
| **पितृत्व** | **१५ दिन** | दफा ४५ |
| शोक | १३ दिन | परिवार सदस्य |
| विवाह | ७ दिन | एकपटक |

## SSF योगदान
- **कर्मचारी:** ११% | **रोजगारदाता:** २०% | **जम्मा: ३१%**
- **फाइलिङ:** प्रत्येक महिनाको अन्तिम दिन

## उपदान
- **दर:** आधारभूत तलबको ८.३३%/वर्ष
- **पहिलो दिनदेखि** लागू (श्रम ऐन २०७४)

## ओभरटाइम
- दर: नियमित दरको **१.५ गुणा** (दफा ३६)
- अधिकतम: **४ घण्टा/दिन, २४ घण्टा/हप्ता**

## न्यूनतम पारिश्रमिक
- NPR **१७,३०० / महिना** (२०२४)` :
    lang === 'hi' ? `# नेपाल श्रम अधिनियम 2074 - मुख्य प्रावधान
**NepHR Pro AI कानूनी संदर्भ | ${date}**

## छुट्टी अधिकार
| छुट्टी प्रकार | दिन |
|-------------|-----|
| साप्ताहिक | 1 दिन |
| सार्वजनिक (पुरुष/महिला) | 13/14 दिन |
| वार्षिक | 20 कार्यदिवस पर 1 (अधिकतम 90) |
| बीमारी | **12 दिन पूर्ण वेतन** |
| **मातृत्व** | **98 दिन पूर्ण वेतन** |
| **पितृत्व** | **15 दिन** |

## SSF योगदान: कर्मचारी 11% + नियोक्ता 20% = **31% कुल**
## उपदान: **8.33%/वर्ष** पहले दिन से
## ओवरटाइम: **1.5x** (अधिकतम 4 घंटे/दिन)
## न्यूनतम वेतन: **NPR 17,300/माह** (2024)` :
    `# Nepal Labour Act 2074 - Complete Compliance Reference
**NepHR Pro AI Legal Guide | ${date}**

## Leave Entitlements
| Leave Type | Days | Condition |
|-----------|------|-----------|
| Weekly rest | 1 day | Mandatory |
| Public holidays (Male) | 13 | Annual |
| Public holidays (Female) | 14 | Annual |
| Home/Annual leave | 1 per 20 working days (max 90) | After 1 year |
| Sick leave | **12 days FULL PAY** | Annual |
| **Maternity leave** | **98 days FULL PAY** | Section 45 |
| **Paternity leave** | **15 days** | New in 2074 |
| Mourning leave | 13 days | Immediate family |
| Marriage leave | 7 days | Once |

## SSF Contributions
| Party | Rate |
|-------|------|
| Employee | 11% |
| Employer | 20% |
| **Total** | **31%** |
Filing deadline: Last day of each month. Penalty for late: double amount.

## Gratuity
- Rate: **8.33% of basic salary per year**
- Applies from **Day 1** of employment (Labour Act 2074 change)
- Payable on: resignation, retirement, termination

## Overtime
- Rate: **1.5x regular rate** (Section 36)
- Maximum: **4 hours/day, 24 hours/week**
- Must be paid with regular salary

## Minimum Wage (2024): **NPR 17,300/month**
- Basic: NPR 10,450 | Dearness allowance: NPR 6,850`
  }

  return null // No built-in answer - will show smart fallback
}

// ── COMPREHENSIVE NAVIGATION MAP ──────────────────────────────
// Covers all 130+ sidebar pages.
// sensitive:true = payroll/salary/personal data — restricted by permission
// Each entry has multilingual voice/text triggers
const NAV_MAP = [
  // ── DASHBOARDS ───────────────────────────────────────────
  { keys:['my dashboard','main dashboard','home','मुख्य','ड्यासबोर्ड','accueil'], page:'super-admin-dashboard' },
  { keys:['executive dashboard','exec dashboard','c-level','board dashboard'], page:'executive-dashboard' },
  { keys:['hr dashboard','hr manager dashboard','hr home'], page:'hr-dashboard' },
  { keys:['department dashboard','dept dashboard','team dashboard'], page:'department-dashboard' },
  { keys:['employee dashboard','ess dashboard','self service'], page:'employee-dashboard' },
  { keys:['finance dashboard','finance workspace'], page:'finance-dashboard' },
  { keys:['recruitment dashboard','ats dashboard','hiring dashboard'], page:'ats-dashboard' },

  // ── AI ASSISTANT ─────────────────────────────────────────
  { keys:['ai business intelligence','ai bi','business intelligence','bi report'], page:'ai-business-intelligence' },
  { keys:['ai chatbot','hr chatbot','ai chat','chatbot'], page:'ai-hr-chatbot' },
  { keys:['ai analytics','hr analytics','ai hr analytics'], page:'ai-hr-analytics' },
  { keys:['ai policy','policy assistant','niti sahayak'], page:'ai-policy-assistant' },
  { keys:['ai resume','resume screening','cv screening'], page:'ai-resume-screening' },
  { keys:['attendance insights','ai attendance'], page:'ai-attendance-insights' },
  { keys:['attrition prediction','ai attrition','flight risk'], page:'ai-attrition-prediction' },
  { keys:['predictive analytics','prediction','workforce forecast','purwanuman'], page:'predictive-analytics' },
  { keys:['performance insights','ai performance'], page:'ai-performance-insights' },
  { keys:['smart notification','notification engine'], page:'smart-notifications' },
  { keys:['report generator','ai report','generate report'], page:'ai-report-generator' },

  // ── ORGANISATION MANAGEMENT ───────────────────────────────
  { keys:['company profile','company info','organization profile'], page:'company-profile' },
  { keys:['company setup','setup company'], page:'company-setup' },
  { keys:['group company','holding company'], page:'group-company' },
  { keys:['branch','branch location','shakha','शाखा'], page:'branch-location-setup' },
  { keys:['department setup','department create','bibhag','विभाग'], page:'department-setup' },
  { keys:['org chart','organisation chart','company structure','orgchart'], page:'org-chart' },
  { keys:['designation','job title','post','pada'], page:'designation-setup' },
  { keys:['grade level','pay grade','job grade'], page:'grade-level' },
  { keys:['shift setup','shift schedule','shift time'], page:'shift-setup' },
  { keys:['holiday calendar','holiday list','bida succhi'], page:'holiday-calendar' },
  { keys:['weekend policy','off day'], page:'weekend-policy' },
  { keys:['position management','open position'], page:'position-management' },
  { keys:['process flow','workflow','karyaprabah'], page:'process-flow' },
  { keys:['employment type','contract type'], page:'employment-type' },
  { keys:['cost center','cost centre'], page:'cost-center' },
  { keys:['reporting hierarchy','reporting line'], page:'reporting-hierarchy' },

  // ── EMPLOYEE LIFECYCLE / DIRECTORY ────────────────────────
  { keys:['employee directory','employee list','staff list','karmachari suchi','कर्मचारी सूची'], page:'employee-directory' },
  { keys:['employee profile','staff profile','employee detail'], page:'employee-profile' },
  { keys:['employee joining','joining','new hire','naya bharti'], page:'employee-joining' },
  { keys:['onboarding','joining checklist','orientation'], page:'joining-checklist' },
  { keys:['probation','trial period','pariviksha'], page:'probation-confirmation' },
  { keys:['resignation','quit','exit','bidam'], page:'resignation-management' },
  { keys:['exit interview','farewell'], page:'exit-interview' },
  { keys:['full and final','final settlement','f&f'], page:'full-final-settlement' },
  { keys:['attrition','turnover analysis','exit analysis'], page:'attrition-dashboard' },
  { keys:['promotion','badawa'], page:'promotion-history' },
  { keys:['transfer','sthanaantaran'], page:'transfer-history' },
  { keys:['confirmation','probation confirmation'], page:'confirmation-management' },
  { keys:['disciplinary','warning','action'], page:'disciplinary-records' },
  { keys:['experience letter','relieving letter','letter'], page:'experience-letter' },
  { keys:['document management','documents','employee documents'], page:'document-management' },
  { keys:['contract','agreement'], page:'contract-management' },

  // ── ATTENDANCE ────────────────────────────────────────────
  { keys:['attendance','haajiri','उपस्थिति','live attendance','check in','check out'], page:'live-attendance' },
  { keys:['attendance report','attendance analytics'], page:'attendance-reports' },
  { keys:['overtime','extra time','ot ','obeertaim'], page:'overtime-management' },
  { keys:['late early','late arrival','tardiness'], page:'late-early-tracking' },
  { keys:['missed punch','attendance regularization','regularise'], page:'attendance-regularization' },
  { keys:['wfh','work from home','ghar bata kaam'], page:'wfh-tracking' },
  { keys:['field visit','field attendance','baira kaam'], page:'field-visit-tracking' },
  { keys:['roster','shift roster'], page:'roster-management' },
  { keys:['biometric','fingerprint'], page:'biometric-attendance' },

  // ── LEAVE ────────────────────────────────────────────────
  { keys:['leave request','apply leave','leave apply','bida linu'], page:'leave-request' },
  { keys:['leave balance','remaining leave','bida bakee'], page:'leave-balance' },
  { keys:['leave approval','approve leave'], page:'leave-approval' },
  { keys:['leave calendar','leave planner'], page:'leave-calendar' },
  { keys:['leave policy','bida niti'], page:'leave-policy' },
  { keys:['leave setup','configure leave'], page:'leave-setup' },
  { keys:['holiday','public holiday','bida'], page:'holiday-management' },
  { keys:['leave analytics','leave report'], page:'leave-analytics' },

  // ── PAYROLL (sensitive — restricted) ─────────────────────
  { keys:['payroll','tanlav run','pay run','tenlav'], page:'automated-payroll', sensitive:true },
  { keys:['payslip','salary slip','pay stub'], page:'payslip-generation', sensitive:true },
  { keys:['salary structure','pay structure'], page:'salary-structure', sensitive:true },
  { keys:['bonus','bonus process'], page:'bonus-processing', sensitive:true },
  { keys:['loan','salary advance','advance'], page:'loan-management', sensitive:true },
  { keys:['ssf','social security fund'], page:'ssf-information', sensitive:true },
  { keys:['tax','cit','income tax'], page:'tax-compliance', sensitive:true },
  { keys:['payroll report','salary report'], page:'payroll-reports', sensitive:true },
  { keys:['bank transfer','payment file'], page:'bank-transfer-file', sensitive:true },
  { keys:['payroll snapshot','payroll overview'], page:'payroll-snapshot', sensitive:true },

  // ── PERFORMANCE ───────────────────────────────────────────
  { keys:['performance','appraisal','mulyankan','karyasampadan'], page:'performance-dashboard' },
  { keys:['okr','objective','key result'], page:'okr-management' },
  { keys:['kpi','key performance indicator'], page:'kpi-management' },
  { keys:['kra','key result area'], page:'kra-management' },
  { keys:['goal','target','laksha'], page:'goal-assignment' },
  { keys:['performance review','annual review'], page:'performance-review' },
  { keys:['feedback','continuous feedback'], page:'continuous-feedback' },
  { keys:['360','360 feedback','peer review'], page:'360-feedback' },
  { keys:['pip','performance improvement','improvement plan'], page:'pip-management' },
  { keys:['recognition','reward','puraskar'], page:'recognition-program' },
  { keys:['promotion recommendation','suggest promotion'], page:'promotion-recommendation' },

  // ── RECRUITMENT ───────────────────────────────────────────
  { keys:['recruitment','hiring','bharti'], page:'ats-dashboard' },
  { keys:['job posting','vacancy post','job ad'], page:'job-posting' },
  { keys:['candidate','applicant'], page:'candidate-database' },
  { keys:['interview','schedule interview'], page:'interview-scheduling' },
  { keys:['offer','offer letter'], page:'offer-management' },
  { keys:['talent pool','talent bank'], page:'talent-pool' },
  { keys:['background verification','bgv','background check'], page:'background-verification' },
  { keys:['career portal','careers page'], page:'career-portal' },
  { keys:['manpower plan','headcount plan'], page:'annual-manpower-plan' },

  // ── TRAINING & LEARNING ───────────────────────────────────
  { keys:['training','talim','prasikhyan'], page:'course-management' },
  { keys:['learning portal','elearning','online course'], page:'learning-portal' },
  { keys:['training calendar','training schedule'], page:'annual-training-calendar' },
  { keys:['skill gap','skill analysis'], page:'skill-gap-analysis' },
  { keys:['training roi','training effectiveness'], page:'training-roi' },
  { keys:['certification','certificate'], page:'certification-tracking' },
  { keys:['career path','career development'], page:'career-pathing' },
  { keys:['succession','successor','leadership pipeline'], page:'successor-identification' },
  { keys:['talent mapping','talent review'], page:'talent-mapping' },
  { keys:['hipo','high potential','top talent'], page:'hipo-employees' },

  // ── ENGAGEMENT & COMMUNICATION ────────────────────────────
  { keys:['engagement','employee engagement','engagement score'], page:'engagement-dashboard' },
  { keys:['announcement','notice','suchana'], page:'announcement-board' },
  { keys:['employee satisfaction','satisfaction survey','eNPS'], page:'emp-satisfaction' },
  { keys:['social feed','employee hub','social','community'], page:'employee-social-feed' },
  { keys:['birthday','anniversary','celebration'], page:'birthday-anniversary' },
  { keys:['calendar','events calendar'], page:'calendar-events' },
  { keys:['notification','alert','suchana'], page:'notifications' },

  // ── COMPLIANCE & LEGAL ────────────────────────────────────
  { keys:['compliance','labour compliance','shram ain'], page:'compliance-setup' },
  { keys:['audit','audit log','system log'], page:'audit-logs' },
  { keys:['permission','access control','permission matrix'], page:'permission-matrix' },
  { keys:['integration','api','hub','connect'], page:'integration-hub' },
  { keys:['system setting','settings','configuration'], page:'system-setting' },
  { keys:['user management','users','manage users'], page:'user-management' },

  // ── SNAPSHOTS & BI ────────────────────────────────────────
  { keys:['headcount','employee count','total employees'], page:'headcount-analysis' },
  { keys:['worklife balance','work life'], page:'worklife-balance' },
  { keys:['bi dashboard','bi','business intelligence dashboard'], page:'bi-dashboard' },
  { keys:['minutes of meeting','mom dashboard'], page:'minutes-of-meeting' },
  { keys:['ai insights','insights'], page:'ai-insights' },
]

// ── SENSITIVE DATA RULES ──────────────────────────────────────
// Pages that contain payroll / personal financial data.
// Only these roles can access them:
const PAYROLL_ALLOWED_ROLES = ['super-admin','executive','hr','finance']
const PERSONAL_DATA_ROLES   = ['super-admin','hr','finance','it-admin']

function canUserAccessPage(pageId, isSensitive, currentPersona) {
  if (!currentPersona) return false
  const allowed = currentPersona.allowedPages || []
  const restricted = currentPersona.restrictedPages || []

  // Super admin: all access
  if (id === 'super-admin' || allowed[0] === '*') return true

  // Sensitive page (payroll/salary) — extra restriction
  if (isSensitive && !PAYROLL_ALLOWED_ROLES.includes(id)) return false

  // Restricted list check
  if (restricted.includes(pageId)) return false

  // Allowed list check (if specific list exists)
  if (allowed.length > 0 && !allowed[0] === '*') {
    return allowed.includes(pageId)
  }
  return true
}

function getNavDeniedMessage(pageId, isSensitive, personaLabel, lang) {
  if (isSensitive) {
    return lang === 'ne'
      ? `सुरक्षा: "${pageId}" मा तलब/व्यक्तिगत वित्तीय जानकारी छ। तपाईंको "${personaLabel}" भूमिकामा यो हेर्ने अनुमति छैन। Finance वा HR लाई सम्पर्क गर्नुहोस्।`
      : lang === 'hi'
      ? `सुरक्षा: "${pageId}" में वेतन/व्यक्तिगत वित्तीय जानकारी है। आपकी "${personaLabel}" भूमिका में यह देखने की अनुमति नहीं है। Finance या HR से संपर्क करें।`
      : `Access Restricted: "${pageId}" contains payroll and personal financial data. Your role (${personaLabel}) does not have permission. Contact Finance or HR Administrator.`
  }
  return lang === 'ne'
    ? `माफ गर्नुस्, "${pageId}" पृष्ठ हेर्न तपाईंको "${personaLabel}" भूमिकामा अनुमति छैन।`
    : lang === 'hi'
    ? `खेद है, "${pageId}" पृष्ठ देखने की अनुमति आपकी "${personaLabel}" भूमिका में नहीं है।`
    : `Sorry, your role (${personaLabel}) does not have permission to access "${pageId}".`
}


// ── QUICK ACTIONS (role-aware) ────────────────────────────────
const QUICK_ALL = [
  { icon:'📊', label:'Board Report',  text:'Generate a board-level strategic HR intelligence report for C-Level executives.' },
  { icon:'🔮', label:'Predictive BI', text:'Run a predictive workforce analytics brief: attrition forecast, risk matrix, financial impact, and recommended interventions.' },
  { icon:'📝', label:'MOM',           text:'Create Minutes of Meeting for a CEO and HR strategy meeting today about improving the HR department.' },
  { icon:'📈', label:'PowerPoint',    text:'Create a complete PowerPoint presentation for the board on HR department strategic improvement plan.' },
  { icon:'🗺️', label:'HR Strategy',  text:'What is the 90-day strategic improvement roadmap for our HR department? Include phases, budget, and ROI.' },
  { icon:'⚖️', label:'Labour Act',   text:'Give me a complete compliance reference for Nepal Labour Act 2074 - leave, SSF, overtime, gratuity.' },
  { icon:'💰', label:'Cost Analysis', text:'Analyse the financial cost of our current attrition rate and the ROI of the proposed HR interventions.' },
  { icon:'👥', label:'Team Analytics',text:'Generate a department-level HR analytics report with attrition risk, performance, and training gaps by team.' },
]

// ── MESSAGE BUBBLE ────────────────────────────────────────────
function Bubble({ msg, onSpeak, speakingId }) {
  const isUser = msg.role === 'user'
  const [copied, setCopied] = useState(false)
  const sp = speakingId === msg.id
  return (
    <div style={{ display:'flex', gap:10, marginBottom:16, justifyContent:isUser?'flex-end':'flex-start', alignItems:'flex-start' }}>
      {!isUser && <div style={{ width:36, height:36, borderRadius:12, background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, boxShadow:'0 2px 8px rgba(124,58,237,.25)' }}>🧠</div>}
      <div style={{ maxWidth:'84%' }}>
        <div style={{ background:isUser?A:'#fff', color:isUser?'#fff':'#0f172a', border:isUser?'none':'1px solid #e2e8f0', borderRadius:isUser?'18px 18px 4px 18px':'18px 18px 18px 4px', padding:'12px 16px', fontSize:11, lineHeight:1.75, wordBreak:'break-word', boxShadow:isUser?'none':'0 1px 6px rgba(0,0,0,.06)' }}>
          {msg.content.split('\n').map((line, i) => {
            const h = line.replace(/\*\*(.+?)\*\*/g, (_,t) => `<b>${t}</b>`).replace(/\*(.+?)\*/g, (_,t) => `<i>${t}</i>`)
            if (!line.trim()) return <div key={i} style={{ height:5 }} />
            if (line.startsWith('# ')) return <div key={i} style={{ fontSize:13, fontWeight:900, color:isUser?'#fff':A, margin:'10px 0 5px', borderBottom:isUser?'1px solid rgba(255,255,255,.2)':'1px solid #e2e8f0', paddingBottom:4 }}>{line.slice(2)}</div>
            if (line.startsWith('## ')) return <div key={i} style={{ fontSize:11, fontWeight:800, color:isUser?'#e9d5ff':'#1e1b4b', margin:'8px 0 3px' }}>{line.slice(3)}</div>
            if (line.startsWith('### ')) return <div key={i} style={{ fontSize:11, fontWeight:700, color:isUser?'#ddd6fe':'#374151', margin:'6px 0 2px' }}>{line.slice(4)}</div>
            if (line.match(/^\|.+\|$/)) return <div key={i} style={{ fontFamily:'monospace', fontSize:9, color:isUser?'#e0e7ff':'#374151', padding:'1px 0', borderBottom:'1px solid rgba(0,0,0,.04)' }}>{line}</div>
            if (line.match(/^[-*] /)) return <div key={i} style={{ paddingLeft:14, position:'relative', marginBottom:2 }}><span style={{ position:'absolute', left:2, color:isUser?'#c4b5fd':A }}>•</span><span dangerouslySetInnerHTML={{ __html:h.replace(/^[-*] /,'') }} /></div>
            if (line.match(/^\d+\.\s/)) return <div key={i} style={{ paddingLeft:18, marginBottom:2 }} dangerouslySetInnerHTML={{ __html:h }} />
            return <div key={i} dangerouslySetInnerHTML={{ __html:h }} />
          })}
        </div>
        {!isUser && (
          <div style={{ display:'flex', gap:5, marginTop:4 }}>
            <button onClick={() => { navigator.clipboard?.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 1500) }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:9, color:'#94a3b8', padding:'2px 5px' }}>{copied ? '✓ Copied' : '⎘ Copy'}</button>
            <button onClick={() => onSpeak(msg)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:9, color:sp?A:'#94a3b8', fontWeight:sp?700:400, padding:'2px 5px' }}>{sp ? '⏹ Stop' : '🔊 Speak'}</button>
          </div>
        )}
      </div>
      {isUser && <div style={{ width:36, height:36, borderRadius:12, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>👤</div>}
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function AIBusinessIntelligencePage() {
  const { navTo, currentPersona, persona } = useApp()

  const roleLevel = classifyRole(currentPersona?.id, currentPersona?.label || persona)
  const hasKey = !!(VITE_KEY && VITE_KEY.startsWith('sk-ant') && VITE_KEY !== 'sk-ant-your-key-here')

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [speakingId, setSpeakingId] = useState(null)
  const [voiceText, setVoiceText] = useState('')
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [history, setHistory] = useState([])

  const bottomRef = useRef(null)
  const recRef = useRef(null)
  const silenceRef = useRef(null)
  const loadingRef = useRef(false)
  const autoRef = useRef(true)
  const sendRef = useRef(null)

  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { autoRef.current = autoSpeak }, [autoSpeak])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  // Boot greeting - role-aware
  useEffect(() => {
    const greetings = {
      c_level: 'Good day! I am your AI Business Intelligence engine. I deliver board-ready strategic HR briefs, predictive analytics, financial risk assessments, and executive reports - in any language you speak.',
      hr_manager: 'Hello! I am your HR AI assistant. I can generate complete strategic reports, predictive attrition analysis, compliance briefs, MOM, PowerPoint outlines, and any HR intelligence you need.',
      department_head: 'Hello! I am your AI team analytics assistant. Ask me for team performance reports, attrition risk, training gaps, or any strategic brief your department needs.',
      super_admin: 'Welcome! Full AI Business Intelligence active. I can generate board reports, predictive analytics, compliance briefs, MOM, PowerPoint, and complete strategic analysis - in any language.',
      manager: 'Hello! I am your AI Business Intelligence assistant. Ask me for HR reports, predictive analysis, strategic recommendations, MOM, or any business intelligence brief.',
    }
    const greet = greetings[roleLevel] || greetings.manager
    setMessages([m])
    if (autoSpeak) { setSpeaking(true); setSpeakingId('boot'); speak(greet, 'en', () => { setSpeaking(false); setSpeakingId(null); setTimeout(startListen, 400) }) }
    else setTimeout(startListen, 600)
  }, []) // eslint-disable-line

  // SEND MESSAGE
  const sendMessage = useCallback(async (textInput, fromVoice = false) => {
    const content = (textInput || input).trim()
    if (!content || loadingRef.current) return

    const lang = detectLang(content)

    // Stop speaking immediately
    if (isStop(content)) {
      window.speechSynthesis?.cancel()
      setSpeaking(false); setSpeakingId(null)
      try { recRef.current?.stop() } catch {}
      recRef.current = null; setRecording(false); setVoiceText('')
      const bye = { ne:'ठीक छ! सहयोग चाहिनुभयो भने भन्नुहोस्।', hi:'ठीक है! जरूरत हो तो बताइए।', en:'Of course! Let me know when you need me.' }
      setMessages(p => [...p, m]); setInput('')
      if (autoRef.current) { setSpeaking(true); setSpeakingId(m.id); speak(bye[lang]||bye.en, lang, () => { setSpeaking(false); setSpeakingId(null) }) }
      return
    }

    // ── NAVIGATION COMMAND ────────────────────────────────────
    const isNavIntent = /\b(open|go to|show me|navigate|take me|switch to|load|khol|dekhau|jaa|dekha|खोल|देखाउ|abre|ouvrir|öffnen)\b/.test(low)
    if (isNavIntent || low.match(/^(open|show|go to|take me to|navigate to)\s+/i)) {
      // Find the best matching page
      const found = NAV_MAP.find(n => n.keys.some(k => low.includes(k.toLowerCase())))
      if (found && navTo) {
        const isSensitive = !!found.sensitive
        const canAccess = canUserAccessPage(found.page, isSensitive, currentPersona)
        const personaLabel = currentPersona?.label || persona || 'User'

        if (!canAccess) {
          const denyMsg = getNavDeniedMessage(found.page, isSensitive, personaLabel, lang)
          const denyObj = { id:Date.now()+'d', role:'assistant', content:denyMsg, created_at:'now' }
          setMessages(p => [...p, { id:Date.now()+'u', role:'user', content, created_at:'now' }, denyObj])
          setInput('')
          if (autoRef.current) { setSpeaking(true); setSpeakingId(denyObj.id); speak(stripMd(denyMsg), lang, () => { setSpeaking(false); setSpeakingId(null); setTimeout(startListen, 400) }) }
          return
        }

        const openMsg = lang==='ne' ? `"${found.page}" खोल्दैछु...`
          : lang==='hi' ? `"${found.page}" खोल रहा हूँ...`
          : `Opening ${found.page}...`
        const navObj = { id:Date.now()+'n', role:'assistant', content:openMsg, created_at:'now' }
        setMessages(p => [...p, { id:Date.now()+'u', role:'user', content, created_at:'now' }, navObj])
        setInput('')
        setTimeout(() => navTo(found.page), 500)
        if (autoRef.current) { setSpeaking(true); setSpeakingId(navObj.id); speak(openMsg, lang, () => { setSpeaking(false); setSpeakingId(null) }) }
        return
      }
    }

    setMessages(p => [...p, { id:Date.now()+'u', role:'user', content, created_at:'now' }])
    setInput(''); setLoading(true)

    let aiText = null

    // 1. Claude API
    if (hasKey) {
      const newHistory = [...history, { role:'user', content }]
      const { text, ok } = await callClaude(newHistory, buildSystem(lang, roleLevel, currentPersona?.label || persona))
      if (ok && text) { aiText = text; setHistory([...newHistory, { role:'assistant', content:text }]) }
    }

    // 2. Built-in BI engine
    if (!aiText) aiText = generateBIReport(content, lang, roleLevel)

    // 3. Smart contextual fallback
    if (!aiText) {
      const hints = [
        low.match(/attrition|turnover|retention/) && (lang==='ne'?'Engineering 34% flight risk - salary gap NPR 13K':lang==='hi'?'Engineering 34% flight risk - NPR 13K salary gap':'Engineering 34% flight risk. Salary gap NPR 13K. ROI of fixing: 8.4x.'),
        low.match(/performance|kpi|okr/) && 'KPI: 37% employees at risk of missing OKR targets. Monthly check-ins reduce attrition 14%.',
        low.match(/cost|budget|financial/) && 'Payroll: NPR 4.8M/month. Cost per employee: NPR 15,385.',
        low.match(/recruit|hire|talent/) && 'Recruitment: 28-day time-to-fill. 11 open positions. Benchmark: 21 days.',
      ].filter(Boolean)
      const menu = lang==='ne'
        ? 'Yeti type garnus:\n- **Predictive Analysis** — 90-dine purwanumanatmak\n- **HR Strategy** — sudhar roadmap\n- **Board Report** — karyakarya prativedana\n- **MOM** — baitak karyabibaran\n- **PowerPoint HR** — prastutiruparekha'
        : lang==='hi'
        ? 'Yeh type karein:\n- **Predictive Analysis** — 90-din purwanumanit brief\n- **HR Strategy** — sudhar roadmap\n- **Board Report** — karyakarya report\n- **MOM** — baithak karyavrittant\n- **PowerPoint HR** — pratuti rekha'
        : 'Type one of these for instant BI output:\n- **Predictive Analysis** — 90-day workforce forecast\n- **HR Strategy** — 90-day improvement roadmap\n- **Board Report** — executive intelligence brief\n- **MOM** — full minutes of meeting\n- **PowerPoint HR** — board presentation outline\n- **Labour Act** — Nepal compliance reference'
      const tip = !hasKey ? '\n\n_Add `VITE_ANTHROPIC_API_KEY` to .env for full Claude AI on any topic (console.anthropic.com)_' : ''
      aiText = (hints.length ? hints.join('\n') + '\n\n' : '') + menu + tip
    }

    setLoading(false)
    const aiMsg = { id:Date.now()+'a', role:'assistant', content:aiText, created_at:'now' }
    setMessages(p => [...p, aiMsg])

    if (autoRef.current) {
      setSpeaking(true); setSpeakingId(aiMsg.id)
      speak(stripMd(aiText), lang, () => { setSpeaking(false); setSpeakingId(null); if (autoRef.current) setTimeout(startListen, 500) })
    }
  }, [input, history, hasKey, roleLevel, currentPersona, persona]) // eslint-disable-line

  useEffect(() => { sendRef.current = sendMessage }, [sendMessage])

  // VOICE STT
  const startListen = useCallback((idx = 0) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR || loadingRef.current) return
    if (recRef.current) { try { recRef.current.stop() } catch {} }
    const fallbacks = ['ne-NP','hi-IN','en-US']
    r.continuous = true; r.interimResults = true; r.maxAlternatives = 5; r.lang = fallbacks[idx] || 'en-US'
    let acc = ''
    const arm = text => {
      if (silenceRef.current) clearTimeout(silenceRef.current)
      silenceRef.current = setTimeout(() => {
        if (!text.trim() || loadingRef.current) return
        try { r.stop() } catch {}
        recRef.current = null; setRecording(false); setVoiceText('')
        setTimeout(() => sendRef.current?.(text.trim(), true), 100)
      }, 3000)
    }
    r.onstart = () => { setRecording(true); setVoiceText('Listening — speak now') }
    r.onresult = e => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { for (let a = 0; a < e.results[i].length; a++) { const t = e.results[i][a].transcript; if (/[\u0900-\u097F]/.test(t)||a===0){final+=t+' ';break} } }
        else interim += e.results[i][0].transcript
      }
      if (final) acc += final
      const text = (acc+interim).trim()
      if (text) { setVoiceText(text); arm(acc.trim()||text) }
    }
    r.onerror = e => {
      if (silenceRef.current) clearTimeout(silenceRef.current)
      setRecording(false); recRef.current = null
      if (e.error==='language-not-supported' && idx<fallbacks.length-1) setTimeout(() => startListen(idx+1), 200)
      else if (e.error==='no-speech') { setVoiceText(''); setTimeout(() => { if (!loadingRef.current) startListen(0) }, 500) }
      else if (e.error==='not-allowed') setVoiceText('Mic denied — allow in browser settings')
      else setTimeout(() => { if (!loadingRef.current) startListen(0) }, 1000)
    }
    r.onend = () => {
      if (silenceRef.current) clearTimeout(silenceRef.current)
      setRecording(false); recRef.current = null
      if (acc.trim() && !loadingRef.current) setTimeout(() => sendRef.current?.(acc.trim(), true), 100)
      acc = ''
    }
    recRef.current = r; try { r.start() } catch {}
  }, []) // eslint-disable-line

  const stopListen = () => { if (silenceRef.current) clearTimeout(silenceRef.current); try { recRef.current?.stop() } catch {}; recRef.current=null; setRecording(false); setVoiceText('') }
  const speakMsg = msg => { if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); setSpeakingId(null); return }; const l=detectLang(msg.content); setSpeaking(true); setSpeakingId(msg.id); speak(stripMd(msg.content),l,()=>{setSpeaking(false);setSpeakingId(null)}) }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', height:'calc(100vh - 120px)', background:'#f8fafc', borderRadius:16, overflow:'hidden', border:'1px solid #e2e8f0' }}>
      <div style={{ background:'#1e1b4b', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'14px 14px 8px', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontSize:11, fontWeight:900, color:'#fff' }}>AI Business Intelligence</div>
          <div style={{ fontSize:8, color:'rgba(255,255,255,.4)', marginTop:2 }}>{currentPersona?.label||persona}</div>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:5 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:recording?'#22c55e':speaking?'#f59e0b':'#6b7280' }} />
            <span style={{ fontSize:8, color:'rgba(255,255,255,.5)' }}>{recording?'Listening...':speaking?'Speaking...':hasKey?'Claude AI':'Built-in BI'}</span>
          </div>
        </div>
        <div style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <button onClick={() => { stopListen(); setMessages([{id:'new',role:'assistant',content:'New session. What report do you need?',created_at:'now'}]); setHistory([]); setInput(''); setTimeout(startListen,500) }}
            style={{ width:'100%', padding:'7px 12px', borderRadius:9, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'#c4b5fd', fontSize:9, fontWeight:700, cursor:'pointer' }}>
            New Report
          </button>
        </div>
        <div style={{ padding:'6px 12px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:8, color:'rgba(255,255,255,.4)' }}>Auto-speak</span>
          <button onClick={() => setAutoSpeak(x => !x)} style={{ padding:'3px 9px', borderRadius:20, border:'none', background:autoSpeak?A:'rgba(255,255,255,.1)', color:'#fff', fontSize:8, fontWeight:700, cursor:'pointer' }}>{autoSpeak?'ON':'OFF'}</button>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:'8px 10px' }}>
          <div style={{ fontSize:7, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', marginBottom:5 }}>Quick Actions</div>
          {QUICK_ALL.map((q,i) => (
            <div key={i} onClick={() => sendMessage(q.text)}
              style={{ padding:'6px 8px', borderRadius:8, marginBottom:3, cursor:'pointer', display:'flex', gap:6, alignItems:'center', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.05)' }}>
              <span style={{ fontSize:13 }}>{q.icon}</span>
              <span style={{ fontSize:8, color:'rgba(255,255,255,.75)', fontWeight:600 }}>{q.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'9px 16px', background:'#fff', borderBottom:'1px solid #e2e8f0', display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          <div style={{ flex:1, fontSize:11, fontWeight:800, color:'#0f172a' }}>
            AI Business Intelligence
            <span style={{ fontSize:9, fontWeight:400, color:'#94a3b8', marginLeft:8 }}>{hasKey?'claude-sonnet-4-6':'built-in'} · {currentPersona?.label||'Manager'}</span>
          </div>
          <div style={{ fontSize:8, padding:'3px 9px', borderRadius:20, fontWeight:700, background:hasKey?'#f0fdf4':'#fffbeb', color:hasKey?'#15803d':'#b45309' }}>{hasKey?'Claude AI':'Built-in BI'}</div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'14px 16px 8px' }}>
          {messages.map(m => <Bubble key={m.id} msg={m} onSpeak={speakMsg} speakingId={speakingId} />)}
          {loading && (
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:12, background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🧠</div>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'18px 18px 18px 4px', padding:'12px 16px', display:'flex', gap:5, alignItems:'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:A, opacity:.6+i*.15 }} />)}
                <span style={{ fontSize:9, color:'#94a3b8', marginLeft:5 }}>Generating report...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {voiceText && (
          <div style={{ padding:'5px 16px', background:recording?'#eff6ff':'#fefce8', borderTop:`1px solid ${recording?'#bfdbfe':'#fef08a'}`, fontSize:9, color:recording?'#1e40af':'#92400e', flexShrink:0, display:'flex', alignItems:'center', gap:5 }}>
            {recording && <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', flexShrink:0 }} />}
            {voiceText}
          </div>
        )}

        <div style={{ padding:'10px 14px', background:'#fff', borderTop:'1px solid #e2e8f0', flexShrink:0 }}>
          <div style={{ display:'flex', gap:7, alignItems:'flex-end' }}>
            <button onClick={recording ? stopListen : () => startListen(0)}
              style={{ width:40, height:40, borderRadius:10, border:`2px solid ${recording?'#22c55e':'#e2e8f0'}`, background:recording?'#f0fdf4':'#f8fafc', fontSize:20, cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              {recording ? '||' : 'Mic'}
              {recording && <div style={{ position:'absolute', top:-3, right:-3, width:9, height:9, borderRadius:'50%', background:'#22c55e', border:'2px solid #fff' }} />}
            </button>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(input)} }}
              placeholder={recording ? voiceText||'Listening — 3 seconds silence = auto-send' : 'Ask for any BI report, strategy, MOM, PowerPoint, predictive analysis... in any language'}
              rows={input.split('\n').length > 2 ? 4 : 2}
              style={{ flex:1, padding:'9px 13px', borderRadius:12, border:'1px solid #e2e8f0', fontSize:10, resize:'none', outline:'none', fontFamily:'inherit', lineHeight:1.5 }} />
            <button onClick={() => sendMessage(input)} disabled={!input.trim()||loading}
              style={{ width:40, height:40, borderRadius:10, border:'none', background:input.trim()&&!loading?A:'#e2e8f0', color:'#fff', fontSize:16, cursor:input.trim()&&!loading?'pointer':'default', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              Go
            </button>
          </div>
          <div style={{ fontSize:8, color:'#94a3b8', marginTop:3, textAlign:'center' }}>
            Enter to send · 3s silence = auto-send · say "stop" or "ok" to pause speaking
          </div>
        </div>
      </div>
    </div>
  )
}

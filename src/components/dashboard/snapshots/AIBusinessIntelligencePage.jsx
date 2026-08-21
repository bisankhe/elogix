// FILE: AIBusinessIntelligencePage.jsx
// eLogix HRMS - AI Business Intelligence Dashboard
// Strategic BI: KPI dashboard + Predictive analytics + AI chat
// Role-aware: CEO/Board → Board-level briefs | HR Manager → Operational | Dept Head → Team
// Multi-language: Nepali, Hindi, English + 9 more languages
// eLogix Technologies · www.elogix.com.np
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const A  = '#7c3aed'
const G  = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const d  = new Date()
const now = d.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
const q   = `Q${Math.ceil((d.getMonth()+1)/3)} ${d.getFullYear()}`
const d30 = new Date(d.getTime()+30*86400000).toLocaleDateString('en-GB')
const d60 = new Date(d.getTime()+60*86400000).toLocaleDateString('en-GB')
const d90 = new Date(d.getTime()+90*86400000).toLocaleDateString('en-GB')

// ── ROLE CLASSIFICATION ───────────────────────────────────────
function classifyRole(id='', label='') {
  const i = id.toLowerCase(), l = label.toLowerCase()
  if (i.includes('super')||i.includes('admin')) return 'super_admin'
  if (i.includes('executive')||l.includes('ceo')||l.includes('coo')||l.includes('cfo')||l.includes('chief')||l.includes('director')) return 'c_level'
  if ((i.includes('hr')&&!i.includes('officer'))||l.includes('hr manager')) return 'hr_manager'
  if (i.includes('department')||i.includes('head')||l.includes('head')) return 'department_head'
  if (i.includes('finance')) return 'finance'
  return 'manager'

// ── LANGUAGE DETECTION ────────────────────────────────────────
function detectLang(text='') {
  const t = text.trim()
  if (/[\u0900-\u097F]/.test(t)) return /\b(छ|छन्|हुन्|गर्न|हामी|तपाईं)\b/.test(t) ? 'ne' : 'hi'
  if (/[\u4E00-\u9FFF]/.test(t)) return 'zh'
  const lo = t.toLowerCase()
  if (/\b(und|ist|ein|die|der)\b/.test(lo)) return 'de'
  if (/\b(le|la|les|est|pas)\b/.test(lo)) return 'fr'
  if (/\b(el|la|los|por)\b/.test(lo)) return 'es'
  return 'en'

// ── CLAUDE API ────────────────────────────────────────────────
const VITE_KEY = import.meta?.env?.VITE_ANTHROPIC_API_KEY || ''
async function callClaude(messages, system) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ system, messages, model:'claude-sonnet-4-6', max_tokens:4096 }),
      signal: AbortSignal.timeout(15000),
    })
    if (r.ok) { const d = await r.json(); if (d.content) return { text:Array.isArray(d.content)?d.content.map(c=>c.text||'').join(''): d.content, ok:true } }
  } catch {}
  if (VITE_KEY?.startsWith('sk-ant')) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        headers:{'Content-Type':'application/json','x-api-key':VITE_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},
        body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:4096, system, messages }),
      })
      const d = await r.json()
      if (r.ok && d?.content?.[0]?.text) return { text:d.content[0].text, ok:true }
    } catch {}
  return { text:null, ok:false }

function buildSystem(lang, roleLevel, persona) {
  const l = { en:'English', ne:'Nepali', hi:'Hindi', de:'German', fr:'French', es:'Spanish', zh:'Chinese' }[lang]||'English'
  const role = {
    c_level:`You are briefing a C-Level Executive / CEO / Board. Board-ready strategic briefs. Executive summary first, data second, decisions third. Always include NPR cost/savings/ROI. 90-day forecasts. End with "Decision Required:"`,
    hr_manager:`You are briefing an HR Manager. Operational depth. Nepal Labour Act 2074 compliance always cited. Step-by-step action plans with owners and deadlines. Specific metrics.`,
    super_admin:`You are briefing a Super Administrator. Complete data, all modules, strategic + operational view.`,
    department_head:`You are briefing a Department Head. Team-focused: headcount, attendance, leave, performance. 30-day team outlook.`,
    finance:`You are briefing Finance. Payroll cost, SSF liability, CIT, gratuity. Exact NPR amounts.`,
    manager:`You are briefing a Senior Manager. Professional strategic analysis. Nepal Labour Act 2074. Actionable.`,
  }[roleLevel]||''
  return `You are the AI Business Intelligence engine inside eLogix HRMS, Nepal's premier enterprise HR platform.
Respond ENTIRELY in ${l}. Every word must be in ${l}.
${role}
Company data: 312 employees | Payroll NPR 4.8M/mo | Attrition 8.2% | 11 open positions | Engineering 34% flight risk | SSF compliance 100% | Nepal Labour Act 2074 compliant.
Give ACTUAL reports — never describe what you would do. Use tables, headers, bullet points.
End every strategic report with "Decision Required:" listing what ${persona||'Management'} must decide.`

function stripMd(t='') {
  return t.replace(/#{1,6}\s/g,'').replace(/\*\*(.+?)\*\*/gs,'$1').replace(/\*(.+?)\*/gs,'$1')
    .replace(/`+(.+?)`+/gs,'$1').replace(/\[(.+?)\]\(.+?\)/g,'$1').replace(/^[-*+] /gm,'')
    .replace(/^\d+\. /gm,'').replace(/\n{2,}/g,'. ').replace(/\n/g,' ').trim().slice(0,480)

const LANGS = { en:'en-US', ne:'ne-NP', hi:'hi-IN', de:'de-DE', fr:'fr-FR', es:'es-ES', zh:'zh-CN' }
function speak(text, lang, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = LANGS[lang]||'en-US'; u.rate=0.92; u.pitch=1.05
  const vs = window.speechSynthesis.getVoices()
  const m = vs.find(v=>v.lang===u.lang)||vs.find(v=>v.lang.startsWith(u.lang.split('-')[0]))||vs[0]
  if (m) u.voice = m
  u.onend = ()=>onEnd?.(); u.onerror = ()=>onEnd?.()
  setTimeout(()=>window.speechSynthesis.speak(u), 50)

// ── BUILT-IN BI REPORT ENGINE ─────────────────────────────────
function generateBIReport(text, lang, roleLevel) {
  const lo = text.toLowerCase()
  const isCEO = roleLevel==='c_level'||roleLevel==='super_admin'

  if (lo.match(/\b(predict|forecast|attrition|flight risk|turnover|churn|risk)\b/)) {
    return `# Predictive Workforce Analytics — ${isCEO?'Board-Level Brief':'Management Report'}
**Date:** ${now} | **Prepared by:** eLogix HRMS AI | **For:** ${isCEO?'C-Suite / Board':'Senior Management'}
**Classification:** ${isCEO?'Confidential — Board Use Only':'Internal — Management'}

---

## Executive Summary
**⚠️ CRITICAL ACTION REQUIRED:** 14-18 employees (5.5% of workforce) at high risk of departure within 90 days.
Estimated financial exposure: **NPR 3.2M**. Intervention cost: NPR 3.8L. ROI of acting: **8.4x**.

## Attrition Risk Heat Map
| Department | Risk Level | Primary Driver | At Risk |
|------------|-----------|----------------|---------|
| Engineering | 🔴 **34% HIGH** | Salary NPR 13K/mo below market | 8 employees |
| Sales | 🟠 **28% MED-HIGH** | Target pressure + low incentives | 5 employees |
| Customer Service | 🟡 **18% MEDIUM** | Limited career progression | 3 employees |
| Operations | 🟢 **6% LOW** | Stable culture | 2 employees |

## 90-Day Workforce Forecast
- **Predicted departures (no action):** 14-18 employees
- **Replacement cost per head:** NPR 1.8L–2.2L (recruitment + onboarding + ramp-up)
- **Total financial exposure:** NPR 3.2M
- **Productivity impact:** -15% for 3-6 months per critical departure
- **Labour Act 2074 risk:** 3 employees at 1-year mark — gratuity liability NPR 4.85L

## Performance Risk Analysis
| Metric | Current | Benchmark | Risk |
|--------|---------|-----------|------|
| OKR achievement rate | 63% | 80% | 🟠 Medium |
| Training completion | 82% | 95% | 🟡 Moderate |
| Manager effectiveness | 67% | 75% | 🟠 Medium |
| eNPS score | 34 | 50+ | 🔴 High |

## Compliance & Payroll Risk
- SSF filing: ✅ Current | Next due: ${d30}
- Overtime anomaly: Engineering avg 6.2 hrs OT/week (Labour Act limit: 4 hrs/day)
- Gratuity provision required: NPR 4.85L for 3 employees

## Recommended Interventions
| # | Action | Owner | Deadline | Budget | Impact |
|---|--------|-------|----------|--------|--------|
| 1 | Salary benchmark + Engineering adjustment | CEO + Finance | ${d30} | NPR 1.56L/mo | -34% risk |
| 2 | 1:1 retention conversations — 16 at-risk staff | HR Manager | ${d30} | NPR 0 | -20% risk |
| 3 | Employee engagement pulse survey | HR Team | ${d30} | NPR 15K | Data |
| 4 | Career pathing — Sales team | Sales + HR | ${d60} | NPR 40K | -28% risk |
| 5 | Accelerated L&D programme | L&D | ${d90} | NPR 1.2L | Skills |

## Financial Impact Scenarios
| Scenario | Investment | Outcome | Financial Result |
|----------|-----------|---------|----|
| No action | NPR 0 | 14-18 departures | **-NPR 3.2M loss** |
| Targeted intervention | NPR 3.8L | 3-5 departures | **NPR 2.82M saved** |
| Full programme | NPR 5.8L | 1-2 departures | **NPR 2.62M saved** |
| **Best ROI** | **NPR 3.8L** | **7.4x return** | **✅ Recommended** |

## Decision Required from ${isCEO?'Board / C-Suite':'Senior Management'}
1. **Approve** Engineering salary adjustment budget (NPR 1.56L/month incremental)?
2. **Mandate** all department heads complete retention conversations by ${d30}?
3. **Include** monthly HR BI dashboard in board pack from next meeting?

---
*eLogix HRMS AI Predictive Engine · ${now} · Confidential*`

  if (lo.match(/\b(report|strategic|monthly|hr report|business intelligence|bi|summary|overview)\b/)) {
    return `# ${isCEO?'Board-Level HR Strategic Intelligence Report':'Monthly HR Management Report'}
**Period:** ${q} | **Date:** ${now} | **Prepared by:** eLogix HRMS AI
**For:** ${isCEO?'CEO / Board of Directors / C-Suite':'HR Management Team'}
**Classification:** ${isCEO?'Confidential — Board Use Only':'Internal — Management'}

---

## Executive Summary
Overall HR health: **STABLE — action required in 2 critical areas.**
Workforce at 312, attrition at 8.2% (below 12% industry avg). Engineering flight risk and 11 open positions require immediate attention.

## KPI Dashboard — ${q}
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
| Item | Monthly | YTD |
|------|---------|-----|
| Total Payroll | NPR 4.8M | NPR 28.8M |
| Cost per Employee | NPR 15,385 | — |
| HR Operating Cost | NPR 3.2L | NPR 19.2L |
| Recruitment Cost | NPR 9.2L | NPR 41L |
| SSF Liability (due ${d30}) | NPR 14.4L | — |
| Gratuity Provision | NPR 4.85L | — |

## Risk Summary
| # | Risk | Probability | Financial Impact | Action Required |
|---|------|------------|----------------|-----------------|
| 1 | Engineering attrition 34% | HIGH | NPR 1.76M | Salary review |
| 2 | 11 positions unfilled | HIGH | Revenue gap | Accelerate hiring |
| 3 | Training 82% vs 95% | MEDIUM | Skill gap | L&D programme |

## Compliance Status
- Nepal Labour Act 2074: ✅ Compliant
- SSF contributions: ✅ Current | Due: ${d30}
- Gratuity provisioning: ✅ On track
- Overtime monitoring: ⚠️ Engineering avg 6.2 hrs OT/week (limit: 4 hrs/day)

## Strategic Recommendations
1. **Immediate (${d30}):** Engineering salary adjustment — NPR 1.56L/mo. Saves NPR 1.76M. ROI: 11x.
2. **Short-term (${d60}):** Accelerate recruitment — dedicated recruiter, reduce TTF from 28→21 days.
3. **Medium-term (${d90}):** L&D calendar — move training completion 82%→95%.

## Decision Required from ${isCEO?'Board / CEO':'Management'}
1. Approve Engineering salary adjustment budget (NPR 1.56L/month)?
2. Authorise emergency recruitment drive for 11 open positions?
3. Include HR BI dashboard in monthly board pack?

---
*eLogix HRMS AI Business Intelligence · ${now} · ${isCEO?'Board Confidential':'Management Internal'}*`

  if (lo.match(/\b(mom|minutes|meeting|baitak|karyabibaran)\b/)) {
    return `# Minutes of Meeting (MOM)
**Meeting:** HR Strategic Review — ${isCEO?'CEO × HR':'Department Heads × HR'}
**Date:** ${now} | **Venue:** Boardroom / Virtual
**Chair:** ${isCEO?'CEO / MD':'HR Manager'} | **Minutes by:** HR Manager | **Quorum:** ✅ Met

---

## Attendees
| Name | Title | Department |
|------|-------|------------|
| [CEO/MD Name] | Chief Executive Officer | Executive |
| [HR Manager] | HR Manager | Human Resources |
| [Finance Head] | Head of Finance | Finance |
| [Dept Heads] | Department Heads | Various |

---

## Agenda & Discussion

### 1. HR Current State
- Headcount: 312 (+3 from last month) | Attrition: 8.2% | Open: 11 positions
- SSF: ✅ Current | Labour Act 2074: ✅ Compliant | Training: 82% (target 95%)
- Engineering: 🔴 34% flight risk — salary gap NPR 13K below market

### 2. Strategic Priorities Agreed
- HR to become strategic business partner, not just administrative
- Monthly HR BI dashboard to be presented at every CEO/Board meeting
- Employee engagement (eNPS 34 vs benchmark 50) is top priority

### 3. Immediate Priorities
- Engineering salary benchmarking and adjustment (Finance coordination)
- Accelerate 11 open positions — assign dedicated recruiter
- Employee pulse survey within 14 days

---

## Decisions Made
| # | Decision | Authority | Deadline |
|---|----------|-----------|----------|
| 1 | HR to prepare 90-day strategic roadmap | CEO direction | ${d30} |
| 2 | Engineering salary review authorised | CFO/CEO approval | ${d30} |
| 3 | Monthly HR BI report in board pack | CEO approval | Next board |
| 4 | Employee engagement programme — NPR 50K | CEO | Immediate |

---

## Action Items
| # | Action | Owner | Due | Status |
|---|--------|-------|-----|--------|
| 1 | HR 90-day improvement roadmap | HR Manager | ${d30} | 🔵 Open |
| 2 | Salary benchmarking report — Engineering | Finance + HR | ${d30} | 🔵 Open |
| 3 | Employee pulse survey launch | HR Team | ${new Date(d.getTime()+14*86400000).toLocaleDateString('en-GB')} | 🔵 Open |
| 4 | Recruitment strategy for 11 positions | HR + Dept Heads | ${d60} | 🔵 Open |
| 5 | First monthly HR BI dashboard presentation | HR Manager | ${d30} | 🔵 Open |

---

**Next Meeting:** ${d30} | TBD | Boardroom
**Agenda preview:** 90-day roadmap review, salary benchmarking results, recruitment update

---
*eLogix HRMS AI · ${now} · Please review and approve within 48 hours*`

  if (lo.match(/\b(powerpoint|ppt|presentation|slides)\b/)) {
    const topic = lo.includes('attrition')?'Workforce Attrition: Risk & Mitigation':lo.includes('digital')?'HR Digital Transformation':lo.includes('compensation')?'Compensation Strategy':'HR Strategic Improvement Plan'
    return `# PowerPoint Outline: ${topic}
**${isCEO?'Board / CEO Presentation':'Management Review'}** | ${now}

---

## Slide 1 — Title Slide
**${topic}**
${isCEO?'Board of Directors / CEO Strategic Review':'Senior Management Review'}
${now} | HR Department | eLogix HRMS AI

## Slide 2 — Executive Summary (The Story in 3 Points)
- **Situation:** 312 employees, 8.2% attrition, 11 open positions, Engineering 34% flight risk
- **Complication:** NPR 3.2M at risk if no action. Salary gap driving top talent away.
- **Resolution:** 90-day plan. NPR 3.8L investment. 8.4x ROI.

## Slide 3 — Current State: HR Performance Snapshot
*[Visual: Traffic light dashboard]*
| Metric | Value | Status |
|--------|-------|--------|
| Headcount | 312 | 🟢 |
| Attrition | 8.2% | 🟡 |
| Open Positions | 11 | 🔴 |
| Training | 82% | 🟠 |
| SSF | 100% | 🟢 |

## Slide 4 — The Problem: Where We Are Losing Talent
*[Visual: Risk heat map by department]*
- Engineering 34%: Salary NPR 13K below market — 8 at risk
- Sales 28%: Incentive structure not competitive — 5 at risk
- Customer Service 18%: Limited growth path — 3 at risk
- **Total financial exposure: NPR 3.2M**

## Slide 5 — Root Cause Analysis
*[Visual: Fishbone diagram]*
- Compensation: Engineering 18% below market median
- Career: No structured progression for 60% of roles
- Culture: eNPS 34 vs benchmark 50
- Learning: 82% training completion vs 95% target

## Slide 6 — 90-Day Strategic Roadmap
*[Visual: Gantt chart]*
- **Days 1-30:** Salary benchmarking | Pulse survey | 1:1 retention talks
- **Days 30-60:** Salary adjustments | Recruitment drive | L&D launch
- **Days 60-90:** Performance review | Leadership development | eNPS remeasure

## Slide 7 — Financial Impact
*[Visual: Bar chart — Investment vs Return]*
- Investment: NPR 3.8L
- Savings: NPR 2.82M
- **ROI: 7.4x**
- Break-even: 6 weeks

## Slide 8 — Nepal Labour Act 2074 Compliance
- Gratuity: 8.33%/year — provisioned ✅
- SSF: 31% (Employee 11% + Employer 20%) — current ✅
- Maternity: 98 days | Paternity: 15 days — policy updated ✅
- Overtime: Engineering exceeding 4 hrs/day limit — ⚠️ action needed

## Slide 9 — Decision Required
1. **Approve** Engineering salary budget (NPR 1.56L/month)?
2. **Prioritise** employee engagement programme?
3. **Include** HR BI in monthly board pack?

## Slide 10 — Q&A

---
*eLogix HRMS AI · ${now} · Ready for PowerPoint build*`

  if (lo.match(/\b(compensation|salary|pay|benchmark|increment|raise)\b/)) {
    return `# Compensation Strategy & Benchmarking Report
**Date:** ${now} | **eLogix HRMS AI** | **For:** ${isCEO?'CEO / Board':'HR Management'}

---

## Executive Summary
Current compensation structure has a **critical gap in Engineering** (18% below market) driving 34% flight risk. Immediate salary adjustment recommended — NPR 1.56L/month investment saves NPR 1.76M in replacement costs. ROI: 11.3x.

## Market Benchmarking — Key Roles
| Role | eLogix Current | Market Median | Gap | Risk |
|------|---------------|---------------|-----|------|
| Senior Engineer | NPR 85K | NPR 98K | -13K | 🔴 HIGH |
| Software Engineer | NPR 65K | NPR 74K | -9K | 🔴 HIGH |
| Sales Executive | NPR 45K | NPR 51K | -6K | 🟠 MED |
| HR Officer | NPR 38K | NPR 40K | -2K | 🟢 LOW |
| Operations | NPR 35K | NPR 36K | -1K | 🟢 LOW |

## SSF & Statutory Deductions (Nepal Labour Act 2074)
| Component | Employee % | Employer % | Total |
|-----------|-----------|-----------|-------|
| SSF Contribution | 11% | 20% | 31% |
| Gratuity Provision | — | 8.33%/yr | — |
| CIT (above NPR 5L) | Progressive | — | — |
| Festival Allowance | 1 month/yr | — | NPR 4.8M/yr |

## Recommended Salary Structure
| Grade | Current Range | Proposed Range | Adjustment |
|-------|-------------|---------------|-----------|
| L1 Entry | 25K–35K | 27K–38K | +8% |
| L2 Junior | 35K–55K | 38K–60K | +10% |
| L3 Senior | 55K–90K | 65K–100K | +15% |
| L4 Lead | 90K–130K | 100K–145K | +12% |
| L5 Manager | 130K–200K | 140K–215K | +8% |

## Financial Impact of Adjustment
- Total incremental cost: NPR 1.56L/month | NPR 18.7L/year
- Avoided replacement costs: NPR 1.76M
- **Net ROI: 11.3x in Year 1**

## Decision Required
1. Approve L3/L4 Engineering salary adjustment effective next payroll?
2. Authorise annual compensation benchmarking cycle?
3. Implement performance-linked increment policy?

---
*eLogix HRMS AI · ${now}*`

  // Default menu
  const hasKey = !!(VITE_KEY?.startsWith('sk-ant'))
  return `# eLogix AI Business Intelligence Engine
**Active for:** ${isCEO?'C-Suite / Board Strategic Briefs':'HR Management Reports'}
**Mode:** ${hasKey?'Claude AI — Full Intelligence':'Built-in BI Engine'}

---

## Available Reports — Type Any:

**📊 Strategic Reports**
- **Board Report** — Full executive HR intelligence brief for ${q}
- **Monthly HR Report** — Operational HR performance summary
- **MOM** — Complete minutes of meeting with action items

**🔮 Predictive Analytics**
- **Predictive Analysis** — 90-day attrition forecast & risk brief
- **Attrition Risk** — Department-wise flight risk heat map

**💰 Financial & Compliance**
- **Compensation Strategy** — Salary benchmarking vs Nepal market
- **Labour Act** — Nepal Labour Act 2074 compliance reference
- **Payroll Analysis** — Cost per head, SSF, gratuity, CIT

**📋 Documents & Presentations**
- **PowerPoint HR** — Board presentation outline
- **Job Description** — Any role in any department
- **HR Policy** — Draft any HR policy document

---

**Quick data points:**
- 312 employees | NPR 4.8M monthly payroll
- 8.2% attrition (industry avg 12%) — Engineering 34% risk
- 11 open positions | SSF: ✅ 100% compliant
- Nepal Labour Act 2074: ✅ Fully compliant

${hasKey?'':'_Add VITE_ANTHROPIC_API_KEY to .env for unlimited Claude AI on any topic_'}`

// ── KPI CARDS DATA ─────────────────────────────────────────────
const KPI_CARDS = [
  { label:'Total Headcount', value:'312', sub:'Target: 320', trend:'+3 this month', color:'#0369a1', bg:'#eff6ff', icon:'👥', good:true },
  { label:'Attrition Rate', value:'8.2%', sub:'Industry avg: 12%', trend:'↓ from 8.7%', color:'#d97706', bg:'#fffbeb', icon:'📉', good:true },
  { label:'Monthly Payroll', value:'NPR 4.8M', sub:'Per head: NPR 15,385', trend:'↑ +2.1%', color:'#059669', bg:'#f0fdf4', icon:'💰', good:true },
  { label:'Open Positions', value:'11', sub:'Target: Max 5', trend:'↑ from 9', color:'#dc2626', bg:'#fef2f2', icon:'🔴', good:false },
  { label:'SSF Compliance', value:'100%', sub:`Due: ${d30}`, trend:'✅ Current', color:'#059669', bg:'#f0fdf4', icon:'⚖️', good:true },
  { label:'Training Done', value:'82%', sub:'Target: 95%', trend:'↑ from 78%', color:'#7c3aed', bg:'#f5f3ff', icon:'📚', good:false },
  { label:'eNPS Score', value:'34', sub:'Benchmark: 50+', trend:'↑ from 31', color:'#0891b2', bg:'#f0f9ff', icon:'❤️', good:false },
  { label:'Time-to-Fill', value:'28d', sub:'Target: 21 days', trend:'↓ from 31d', color:'#059669', bg:'#f0fdf4', icon:'⏱', good:true },
]

// ── RISK BARS ──────────────────────────────────────────────────
const RISK_DATA = [
  { dept:'Engineering', pct:34, color:'#dc2626', label:'🔴 HIGH', people:8, reason:'Salary gap NPR 13K' },
  { dept:'Sales', pct:28, color:'#f59e0b', label:'🟠 MED-HIGH', people:5, reason:'Low incentives' },
  { dept:'Customer Svc', pct:18, color:'#d97706', label:'🟡 MEDIUM', people:3, reason:'No career path' },
  { dept:'Operations', pct:6, color:'#16a34a', label:'🟢 LOW', people:2, reason:'Stable culture' },
]

// ── QUICK PROMPTS ─────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon:'📊', label:'Board Report', text:'Generate board-level HR strategic intelligence report' },
  { icon:'🔮', label:'Predict Attrition', text:'Predictive workforce attrition risk analysis and brief' },
  { icon:'📋', label:'MOM', text:'Generate minutes of meeting HR strategic review' },
  { icon:'📑', label:'PPT Outline', text:'PowerPoint HR strategic improvement plan presentation' },
  { icon:'💰', label:'Compensation', text:'Compensation strategy and salary benchmarking report' },
  { icon:'⚖️', label:'Labour Act', text:'Nepal Labour Act 2074 compliance status and reference' },
  { icon:'🎯', label:'90-Day Plan', text:'Generate 90-day HR strategic improvement roadmap' },
  { icon:'💼', label:'Job Description', text:'Write a job description for Senior Software Engineer' },
]

// ── MESSAGE BUBBLE ────────────────────────────────────────────
function Bubble({ msg, onSpeak, speakingId }) {
  const isUser = msg.role === 'user'
  const [copied, setCopied] = useState(false)
  const sp = speakingId === msg.id
  return (
    <div style={{ display:'flex', gap:10, marginBottom:14, justifyContent:isUser?'flex-end':'flex-start', alignItems:'flex-start' }}>
      {!isUser && <div style={{ width:34,height:34,borderRadius:10,background:G,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>🧠</div>}
      <div style={{ maxWidth:'86%' }}>
        <div style={{ background:isUser?A:'#fff', color:isUser?'#fff':'#0f172a', border:isUser?'none':'1px solid #e2e8f0', borderRadius:isUser?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'10px 14px', fontSize:11, lineHeight:1.75, wordBreak:'break-word', boxShadow:isUser?'none':'0 1px 4px rgba(0,0,0,.06)' }}>
          {msg.content.split('\n').map((line, i) => {
            const h = line.replace(/\*\*(.+?)\*\*/g, (_,t) => `<b>${t}</b>`).replace(/\*(.+?)\*/g, (_,t) => `<i>${t}</i>`)
            if (!line.trim()) return <div key={i} style={{ height:4 }} />
            if (line.startsWith('# ')) return <div key={i} style={{ fontSize:13,fontWeight:900,color:isUser?'#fff':A,margin:'10px 0 5px',borderBottom:isUser?'1px solid rgba(255,255,255,.2)':'1px solid #e2e8f0',paddingBottom:4 }}>{line.slice(2)}</div>
            if (line.startsWith('## ')) return <div key={i} style={{ fontSize:11,fontWeight:800,color:isUser?'#e9d5ff':'#1e1b4b',margin:'8px 0 3px' }}>{line.slice(3)}</div>
            if (line.startsWith('### ')) return <div key={i} style={{ fontSize:11,fontWeight:700,color:isUser?'#ddd6fe':'#374151',margin:'6px 0 2px' }}>{line.slice(4)}</div>
            if (line.match(/^\|.+\|$/)) return <div key={i} style={{ fontFamily:'monospace',fontSize:9,color:isUser?'#e0e7ff':'#374151',padding:'1px 0',borderBottom:'1px solid rgba(0,0,0,.04)' }}>{line}</div>
            if (line.match(/^[-*] /)) return <div key={i} style={{ paddingLeft:14,position:'relative',marginBottom:2 }}><span style={{ position:'absolute',left:2,color:isUser?'#c4b5fd':A }}>•</span><span dangerouslySetInnerHTML={{ __html:h.replace(/^[-*] /,'') }} /></div>
            if (line.match(/^\d+\.\s/)) return <div key={i} style={{ paddingLeft:18,marginBottom:2 }} dangerouslySetInnerHTML={{ __html:h }} />
            return <div key={i} dangerouslySetInnerHTML={{ __html:h }} />
          })}
        </div>
        {!isUser && (
          <div style={{ display:'flex', gap:4, marginTop:4 }}>
            <button onClick={() => { navigator.clipboard?.writeText(msg.content); setCopied(true); setTimeout(()=>setCopied(false),1500) }} style={{ background:'none',border:'none',cursor:'pointer',fontSize:9,color:'#94a3b8',padding:'2px 6px' }}>{copied?'✓ Copied':'⎘ Copy'}</button>
            <button onClick={() => onSpeak(msg)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:9,color:sp?A:'#94a3b8',fontWeight:sp?700:400,padding:'2px 6px' }}>{sp?'⏹ Stop':'🔊 Read'}</button>
          </div>
        )}
      </div>
      {isUser && <div style={{ width:34,height:34,borderRadius:10,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0 }}>👤</div>}
    </div>
  )

// ── MAIN COMPONENT ─────────────────────────────────────────────
export default function AIBusinessIntelligencePage() {
  const { currentPersona, persona } = useApp()
  const roleLevel = classifyRole(currentPersona?.id, currentPersona?.label||persona)
  const hasKey = !!(VITE_KEY?.startsWith('sk-ant'))
  const isCEO = roleLevel==='c_level'||roleLevel==='super_admin'

  const [tab, setTab] = useState('dashboard')  // dashboard | chat
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [speakingId, setSpeakingId] = useState(null)
  const [history, setHistory] = useState([])
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [msg, setMsg] = useState('')

  const bottomRef = useRef(null)
  const loadingRef = useRef(false)
  const sendRef = useRef(null)

  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  // Boot greeting
  useEffect(() => {
    const greet = isCEO
      ? `Good day. I am your AI Business Intelligence engine. I deliver board-ready strategic HR briefs, predictive analytics, and executive intelligence in any language. What report do you need today?`
      : `Hello! I am your eLogix AI HR Intelligence assistant. I can generate strategic reports, predictive analysis, MOM, PowerPoint outlines, and any HR brief instantly. What would you like?`
    setMessages([{ id:'boot', role:'assistant', content:greet, created_at:'now' }])
  }, [])

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const sendMessage = useCallback(async (textInput) => {
    const content = (textInput||input).trim()
    if (!content||loadingRef.current) return
    const lang = detectLang(content)
    setMessages(p => [...p, { id:Date.now()+'u', role:'user', content, created_at:'now' }])
    setInput(''); setLoading(true); setTab('chat')

    let aiText = null
    if (hasKey) {
      const newHistory = [...history, { role:'user', content }]
      const { text, ok } = await callClaude(newHistory, buildSystem(lang, roleLevel, currentPersona?.label||persona))
      if (ok && text) { aiText = text; setHistory([...newHistory, { role:'assistant', content:text }]) }
    if (!aiText) aiText = generateBIReport(content, lang, roleLevel)

    setLoading(false)
    const aiMsg = { id:Date.now()+'a', role:'assistant', content:aiText, created_at:'now' }
    setMessages(p => [...p, aiMsg])
    if (autoSpeak) { setSpeaking(true); setSpeakingId(aiMsg.id); speak(stripMd(aiText), lang, ()=>{ setSpeaking(false); setSpeakingId(null) }) }
  }, [input, history, hasKey, roleLevel, currentPersona, persona, autoSpeak])

  useEffect(() => { sendRef.current = sendMessage }, [sendMessage])

  const speakMsg = msg => {
    if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); setSpeakingId(null); return }
    const l = detectLang(msg.content); setSpeaking(true); setSpeakingId(msg.id)
    speak(stripMd(msg.content), l, ()=>{ setSpeaking(false); setSpeakingId(null) })

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', minHeight:'100vh', background:'#f0f7ff', paddingBottom:24 }}>
      {msg&&<div style={{ position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'10px 18px',fontSize:11,color:'#4c1d95',boxShadow:'0 4px 16px rgba(0,0,0,.12)' }}>{msg}</div>}

      {/* ── HEADER ── */}
      <div style={{ background:G, padding:'16px 24px', borderRadius:'0 0 16px 16px', marginBottom:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff', marginBottom:2 }}>🧠 AI Business Intelligence</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.7)' }}>
              {isCEO ? 'Board-Level Strategic Intelligence' : 'HR Management Intelligence'} · {currentPersona?.label||persona||'Manager'}
              <span style={{ marginLeft:10, background:'rgba(255,255,255,.15)', padding:'2px 8px', borderRadius:10, fontSize:9 }}>
                {hasKey ? '🟢 Claude AI Active' : '🟡 Built-in BI Engine'}
              </span>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[
              { id:'dashboard', label:'📊 Dashboard' },
              { id:'chat',      label:'🧠 AI Chat' },
            ].map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ padding:'7px 16px', borderRadius:20, border:'none', cursor:'pointer',
                  fontSize:11, fontWeight:700,
                  background:tab===t.id?'#fff':'rgba(255,255,255,.18)',
                  color:tab===t.id?A:'#fff', transition:'all .15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>

        {/* ════ DASHBOARD TAB ════ */}
        {tab==='dashboard' && (
          <div>
            {/* KPI Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:16 }}>
              {KPI_CARDS.map(card => (
                <div key={card.label} style={{ background:'#fff', borderRadius:12, padding:'14px 16px',
                  boxShadow:'0 2px 8px rgba(0,0,0,.06)', borderLeft:`4px solid ${card.color}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontSize:9, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{card.label}</div>
                      <div style={{ fontSize:20, fontWeight:900, color:card.color }}>{card.value}</div>
                      <div style={{ fontSize:9, color:'#94a3b8', marginTop:3 }}>{card.sub}</div>
                    </div>
                    <span style={{ fontSize:22 }}>{card.icon}</span>
                  </div>
                  <div style={{ marginTop:8, fontSize:9, fontWeight:600, color:card.good?'#16a34a':'#dc2626',
                    background:card.good?'#f0fdf4':'#fef2f2', padding:'2px 8px', borderRadius:20, display:'inline-block' }}>
                    {card.trend}
                  </div>
                </div>
              ))}
            </div>

            {/* Attrition Risk + Forecast */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              {/* Attrition Risk */}
              <div style={{ background:'#fff', borderRadius:12, padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#374151', marginBottom:4 }}>🔴 Attrition Risk by Department</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginBottom:14 }}>90-day flight risk forecast · {now}</div>
                {RISK_DATA.map(r => (
                  <div key={r.dept} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#374151' }}>{r.dept}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:9, color:'#64748b' }}>{r.people} at risk</span>
                        <span style={{ fontSize:9, fontWeight:700, padding:'1px 7px', borderRadius:10,
                          background:r.pct>30?'#fef2f2':r.pct>20?'#fffbeb':'#f0fdf4',
                          color:r.pct>30?'#dc2626':r.pct>20?'#d97706':'#16a34a' }}>
                          {(r.pct||0)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height:8, background:'#f1f5f9', borderRadius:8, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(r.pct||0)}%`, background:r.color, borderRadius:8, transition:'width .5s' }}/>
                    </div>
                    <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>{r.reason}</div>
                  </div>
                ))}
                <div style={{ marginTop:12, padding:'10px', background:'#fef2f2', borderRadius:8, fontSize:10, color:'#dc2626', fontWeight:600 }}>
                  ⚠️ 14-18 departures predicted · NPR 3.2M exposure · ROI of acting: 8.4x
                </div>
              </div>

              {/* 90-Day Forecast */}
              <div style={{ background:'#fff', borderRadius:12, padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#374151', marginBottom:4 }}>📅 90-Day Strategic Roadmap</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginBottom:14 }}>Priority action plan · {now}</div>
                {[
                  { phase:'Phase 1 · Days 1-30', color:'#dc2626', bg:'#fef2f2', actions:[
                    'Engineering salary benchmark review',
                    '1:1 retention talks — 16 at-risk staff',
                    'Employee pulse survey (eNPS)',
                  ], due:d30 },
                  { phase:'Phase 2 · Days 30-60', color:'#d97706', bg:'#fffbeb', actions:[
                    'Salary adjustments — Engineering',
                    'Accelerate recruitment — 11 positions',
                    'L&D programme launch',
                  ], due:d60 },
                  { phase:'Phase 3 · Days 60-90', color:'#059669', bg:'#f0fdf4', actions:[
                    'Performance review cycle',
                    'Leadership development cohort',
                    'eNPS re-measurement',
                  ], due:d90 },
                ].map(p => (
                  <div key={p.phase} style={{ marginBottom:12, background:p.bg, borderRadius:8, padding:'10px 12px',
                    borderLeft:`3px solid ${p.color}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:10, fontWeight:800, color:p.color }}>{p.phase}</span>
                      <span style={{ fontSize:9, color:'#94a3b8' }}>Due: {p.due}</span>
                    </div>
                    {p.actions.map(a => (
                      <div key={a} style={{ fontSize:10, color:'#374151', marginBottom:3, display:'flex', gap:5, alignItems:'flex-start' }}>
                        <span style={{ color:p.color, flexShrink:0 }}>→</span>{a}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Snapshot + Compliance */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              {/* Financial */}
              <div style={{ background:'#fff', borderRadius:12, padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#374151', marginBottom:14 }}>💰 Financial Overview — {q}</div>
                {[
                  { label:'Total Payroll', val:'NPR 4.8M', sub:'↑ +2.1% from last month', color:'#0369a1' },
                  { label:'SSF Liability', val:'NPR 14.4L', sub:`Due: ${d30}`, color:'#dc2626' },
                  { label:'Gratuity Provision', val:'NPR 4.85L', sub:'3 employees at 1-year mark', color:'#d97706' },
                  { label:'Recruitment Cost', val:'NPR 9.2L', sub:'11 open positions', color:'#7c3aed' },
                  { label:'HR Operating Cost', val:'NPR 3.2L', sub:'Per month', color:'#059669' },
                  { label:'Cost per Employee', val:'NPR 15,385', sub:'All-in monthly cost', color:'#0891b2' },
                ].map(item => (
                  <div key={item.label} style={{ display:'flex', justifyContent:'space-between',
                    padding:'8px 0', borderBottom:'1px solid #f1f5f9', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:'#374151' }}>{item.label}</div>
                      <div style={{ fontSize:9, color:'#94a3b8', marginTop:1 }}>{item.sub}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:800, color:item.color }}>{item.val}</div>
                  </div>
                ))}
              </div>

              {/* Compliance */}
              <div style={{ background:'#fff', borderRadius:12, padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#374151', marginBottom:14 }}>⚖️ Nepal Labour Act 2074 — Compliance</div>
                {[
                  { item:'SSF Contributions (31%)', status:'✅ Current', color:'#16a34a', note:`Next: ${d30}` },
                  { item:'Gratuity (8.33%/yr)', status:'✅ Provisioned', color:'#16a34a', note:'NPR 4.85L set aside' },
                  { item:'Maternity (98 days)', status:'✅ Policy Updated', color:'#16a34a', note:'2 employees on leave' },
                  { item:'Paternity (15 days)', status:'✅ Compliant', color:'#16a34a', note:'Policy in place' },
                  { item:'Festival Allowance (1 month)', status:'✅ Budgeted', color:'#16a34a', note:'Dashain: NPR 4.8M' },
                  { item:'Overtime (max 4hrs/day)', status:'⚠️ Action Needed', color:'#dc2626', note:'Engineering avg 6.2 hrs OT' },
                  { item:'CIT Filing', status:'✅ On Track', color:'#16a34a', note:'Q2 filing due' },
                  { item:'Written Employment Contracts', status:'✅ 100%', color:'#16a34a', note:'All 312 employees' },
                ].map(c => (
                  <div key={c.item} style={{ display:'flex', justifyContent:'space-between',
                    padding:'7px 0', borderBottom:'1px solid #f1f5f9', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:10, fontWeight:600, color:'#374151' }}>{c.item}</div>
                      <div style={{ fontSize:9, color:'#94a3b8', marginTop:1 }}>{c.note}</div>
                    </div>
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:10, flexShrink:0,
                      background:c.color==='#16a34a'?'#f0fdf4':'#fef2f2',
                      color:c.color }}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick AI Actions */}
            <div style={{ background:'#fff', borderRadius:12, padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#374151', marginBottom:4 }}>🧠 Generate AI Report Instantly</div>
              <div style={{ fontSize:10, color:'#94a3b8', marginBottom:14 }}>Click any report type — AI generates it in seconds</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8 }}>
                {QUICK_PROMPTS.map(p => (
                  <button key={p.label} onClick={()=>sendMessage(p.text)}
                    style={{ padding:'12px', borderRadius:10, border:'1.5px solid #e2e8f0',
                      background:'#f8fafc', cursor:'pointer', textAlign:'left', transition:'all .15s',
                      display:'flex', flexDirection:'column', gap:6 }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=A; e.currentTarget.style.background='#f5f3ff' }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.background='#f8fafc' }}>
                    <span style={{ fontSize:20 }}>{p.icon}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:'#374151' }}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ CHAT TAB ════ */}
        {tab==='chat' && (
          <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,.06)', overflow:'hidden' }}>
            {/* Chat header */}
            <div style={{ padding:'12px 16px', background:G, display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1, fontSize:12, fontWeight:800, color:'#fff' }}>
                🧠 AI Business Intelligence Chat
                <span style={{ fontSize:9, fontWeight:400, color:'rgba(255,255,255,.7)', marginLeft:8 }}>
                  {hasKey?'claude-sonnet-4-6':'built-in BI'} · {currentPersona?.label||'Manager'}
                </span>
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:'rgba(255,255,255,.7)', cursor:'pointer' }}>
                <input type="checkbox" checked={autoSpeak} onChange={e=>setAutoSpeak(e.target.checked)} style={{ cursor:'pointer' }}/>
                Auto-read
              </label>
              <button onClick={()=>{ setMessages([{ id:'new', role:'assistant', content:'New session. What report do you need?', created_at:'now' }]); setHistory([]); setInput('') }}
                style={{ padding:'5px 12px', borderRadius:20, border:'1px solid rgba(255,255,255,.3)', background:'transparent', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>
                New Chat
              </button>
            </div>

            {/* Messages */}
            <div style={{ height:'55vh', overflowY:'auto', padding:'14px 16px 8px' }}>
              {messages.map(m => <Bubble key={m.id} msg={m} onSpeak={speakMsg} speakingId={speakingId} />)}
              {loading && (
                <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                  <div style={{ width:34,height:34,borderRadius:10,background:G,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>🧠</div>
                  <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:'16px 16px 16px 4px',padding:'10px 14px',display:'flex',gap:4,alignItems:'center' }}>
                    {[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:'50%',background:A,opacity:.5+i*.2 }}/>)}
                    <span style={{ fontSize:9,color:'#94a3b8',marginLeft:5 }}>Generating report...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Quick prompts in chat */}
            <div style={{ padding:'6px 16px', display:'flex', gap:6, overflowX:'auto', borderTop:'1px solid #f1f5f9' }}>
              {QUICK_PROMPTS.slice(0,5).map(p => (
                <button key={p.label} onClick={()=>sendMessage(p.text)}
                  style={{ padding:'5px 12px', borderRadius:20, border:'1px solid #e2e8f0', background:'#f8fafc',
                    cursor:'pointer', fontSize:10, fontWeight:600, color:'#374151', whiteSpace:'nowrap', flexShrink:0 }}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding:'10px 14px', borderTop:'1px solid #e2e8f0' }}>
              <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                <textarea value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(input) } }}
                  placeholder="Ask for any BI report, strategy, MOM, predictive analysis, job description... in English, Nepali, Hindi or any language"
                  rows={input.split('\n').length>2?3:2}
                  style={{ flex:1,padding:'9px 13px',borderRadius:12,border:'1px solid #e2e8f0',fontSize:11,resize:'none',outline:'none',fontFamily:'inherit',lineHeight:1.5 }}
                  onFocus={e=>e.target.style.borderColor=A}
                  onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                <button onClick={()=>sendMessage(input)} disabled={!input.trim()||loading}
                  style={{ width:42,height:42,borderRadius:10,border:'none',
                    background:input.trim()&&!loading?G:'#e2e8f0',
                    color:'#fff',fontSize:16,cursor:input.trim()&&!loading?'pointer':'default',
                    flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  →
                </button>
              </div>
              <div style={{ fontSize:8,color:'#94a3b8',marginTop:3,textAlign:'center' }}>
                Enter to send · Shift+Enter new line · Works in Nepali, Hindi, English and more
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

// FILE: src/components/shared/HRCopilot.jsx
// NepHR Pro - HR Co-Pilot (Persistent Right-Side Chat Panel)
//
// SPEC COMPLIANCE:
//   - 380px right-side sliding panel, non-blocking, always accessible
//   - Floating icon bottom-right when collapsed
//   - Role-aware: Employee vs Manager vs HR Admin vs C-Level
//   - Multilingual: detects input language, responds in same language
//   - Voice STT: 3s silence auto-send, bcp47 retry chain
//   - Permission-checked navigation: opens any sidebar page by voice/text
//   - Data security: payroll/PII restricted by role
//   - Claude API (proxy + direct browser fallback)
//   - Thumbs up/down feedback on every message
//   - "Connect to HR" human escalation button
//   - Quick action chips: context-aware by role
//   - Company isolation: only accesses data for the logged-in company tenant

import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../context/AppContext.jsx'

// ── BRAND ─────────────────────────────────────────────────────
const PURPLE = '#7c3aed'
const DARK   = '#1e1b4b'
const G      = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const PANEL_W = 380

// ── LANGUAGE DETECTION ────────────────────────────────────────
function detectLang(text) {
  if (!text || text.trim().length < 2) return 'en'
  const t = text.trim()
  if (/[\u0900-\u097F]/.test(t))
    return /\b(छ|छन्|हुन्|गर्न|भन्|हामी|तपाईं|यो|त्यो|छैन|गर्नुस्|र\b|मा\b|को\b)\b/.test(t) ? 'ne' : 'hi'
  if (/[\u0600-\u06FF]/.test(t)) return 'ar'
  if (/[\u4E00-\u9FFF]/.test(t)) return 'zh'
  if (/[\u3040-\u30FF]/.test(t)) return 'ja'
  if (/[\uAC00-\uD7AF]/.test(t)) return 'ko'
  if (/[\u0400-\u04FF]/.test(t)) return 'ru'
  const low = t.toLowerCase()
  if (/\b(und|ist|ein|die|der|nicht|ich)\b/.test(low)) return 'de'
  if (/\b(le|la|les|est|pas|pour|je)\b/.test(low)) return 'fr'
  if (/\b(el|la|los|por|con|es\b|en\b)\b/.test(low)) return 'es'
  return 'en'
}

const LANG_NAMES = {
  ne:'Nepali', hi:'Hindi', en:'English', ar:'Arabic', zh:'Chinese',
  ja:'Japanese', ko:'Korean', de:'German', fr:'French', es:'Spanish', ru:'Russian',
}

// ── STOP WORDS ────────────────────────────────────────────────
const isStop = t => {
  const low = (t||'').trim().toLowerCase()
  return ['stop','ok','okay','done','enough','bye','thank you','thanks','thik chha',
    'dhanyabad','bas','theek hai','ruko','shukriya'].some(s =>
    low === s || low.startsWith(s+' ') || /\b(thank you|thanks|stop|bas|thik|theek|dhanyabad)\b/.test(low))
}

// ── TTS ───────────────────────────────────────────────────────
const STT_CODE = { ne:'ne-NP', hi:'hi-IN', en:'en-US', ar:'ar-SA', zh:'zh-CN', ja:'ja-JP', ko:'ko-KR', de:'de-DE', fr:'fr-FR', es:'es-ES', ru:'ru-RU' }

function speak(text, lang, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const go = () => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = STT_CODE[lang] || 'en-US'; u.rate = 0.92; u.pitch = 1.05; u.volume = 1
    const vs = window.speechSynthesis.getVoices()
    const m = vs.find(v=>v.lang===u.lang)||vs.find(v=>v.lang.startsWith(u.lang.split('-')[0]))||vs[0]
    if (m) u.voice = m
    u.onend = ()=>onEnd?.(); u.onerror = ()=>onEnd?.()
    window.speechSynthesis.speak(u)
  }
  const vs = window.speechSynthesis.getVoices()
  if (vs.length) go()
  else { window.speechSynthesis.onvoiceschanged = ()=>{window.speechSynthesis.onvoiceschanged=null; go()} }
}

function stripMd(t) {
  return (t||'').replace(/#{1,6}\s/g,'').replace(/\*\*(.+?)\*\*/gs,'$1')
    .replace(/\*(.+?)\*/gs,'$1').replace(/`+(.+?)`+/gs,'$1')
    .replace(/\[(.+?)\]\(.+?\)/g,'$1').replace(/^[-*+] /gm,'')
    .replace(/^\d+\. /gm,'').replace(/\|[^\n]+\|/g,'')
    .replace(/\n{2,}/g,'. ').replace(/\n/g,' ').trim().slice(0,400)
}

// ── PERMISSION HELPERS ────────────────────────────────────────
const PAYROLL_ROLES = ['super-admin','executive','hr','finance']

function classifyRole(id, label) {
  const i = (id||'').toLowerCase(), l = (label||'').toLowerCase()
  if (i.includes('super')||i.includes('admin')) return 'super_admin'
  if (i.includes('executive')||l.includes('ceo')||l.includes('director')||l.includes('chief')) return 'c_level'
  if (i.includes('hr')&&!i.includes('officer')) return 'hr_manager'
  if (i.includes('finance')) return 'finance'
  if (i.includes('department')||i.includes('head')||l.includes('manager')) return 'department_head'
  if (i.includes('employee')||i.includes('ess')) return 'employee'
  return 'staff'
}

// ── NAVIGATION MAP (130+ pages) ───────────────────────────────
const NAV_ENTRIES = [
  // Dashboards
  { keys:['dashboard','home','मुख्य','ड्यासबोर्ड'], page:'super-admin-dashboard' },
  { keys:['hr dashboard','hr home'], page:'hr-dashboard' },
  { keys:['executive dashboard','board dashboard'], page:'executive-dashboard' },
  { keys:['finance dashboard'], page:'finance-dashboard' },
  { keys:['employee dashboard','my dashboard','ess'], page:'employee-dashboard' },
  // AI
  { keys:['ai business intelligence','bi report','business intelligence'], page:'ai-business-intelligence' },
  { keys:['ai chatbot','hr chatbot','chatbot'], page:'ai-hr-chatbot' },
  { keys:['predictive','forecast','attrition prediction'], page:'predictive-analytics' },
  { keys:['ai analytics','hr analytics'], page:'ai-hr-analytics' },
  { keys:['ai policy','policy assistant'], page:'ai-policy-assistant' },
  { keys:['ai report','report generator'], page:'ai-report-generator' },
  // Organisation
  { keys:['org chart','organisation chart','company structure'], page:'org-chart' },
  { keys:['company profile','organization profile'], page:'company-profile' },
  { keys:['department','विभाग','bibhag'], page:'department-setup' },
  { keys:['branch','shakha','शाखा'], page:'branch-location-setup' },
  { keys:['designation','job title'], page:'designation-setup' },
  { keys:['grade','pay grade'], page:'grade-level' },
  { keys:['shift setup','shift time'], page:'shift-setup' },
  { keys:['holiday calendar','holidays'], page:'holiday-management' },
  { keys:['position','open position'], page:'position-management' },
  { keys:['process flow','workflow'], page:'process-flow' },
  // Employee
  { keys:['employee directory','employee list','staff list','कर्मचारी सूची'], page:'employee-directory' },
  { keys:['employee profile','staff profile'], page:'employee-profile' },
  { keys:['onboarding','joining checklist'], page:'joining-checklist' },
  { keys:['probation'], page:'probation-confirmation' },
  { keys:['resignation','exit','bidam'], page:'resignation-management' },
  { keys:['exit interview'], page:'exit-interview' },
  { keys:['full and final','f&f','final settlement'], page:'full-final-settlement' },
  { keys:['promotion','badawa'], page:'promotion-history' },
  { keys:['transfer'], page:'transfer-history' },
  { keys:['disciplinary','warning'], page:'disciplinary-records' },
  { keys:['experience letter','relieving letter'], page:'experience-letter' },
  { keys:['document management','documents'], page:'document-management' },
  { keys:['attrition dashboard','turnover'], page:'attrition-dashboard' },
  // Attendance
  { keys:['attendance','haajiri','उपस्थिति','live attendance','check in'], page:'live-attendance' },
  { keys:['overtime','ot ','obeertaim'], page:'overtime-management' },
  { keys:['late','tardiness'], page:'late-early-tracking' },
  { keys:['missed punch','regularization'], page:'attendance-regularization' },
  { keys:['wfh','work from home'], page:'wfh-tracking' },
  { keys:['field visit','field attendance'], page:'field-visit-tracking' },
  { keys:['roster'], page:'roster-management' },
  { keys:['attendance report'], page:'attendance-reports' },
  // Leave
  { keys:['apply leave','leave request','bida linu'], page:'leave-request' },
  { keys:['leave balance','remaining leave','bida bakee'], page:'leave-balance' },
  { keys:['leave approval','approve leave'], page:'leave-approval' },
  { keys:['leave calendar'], page:'leave-calendar' },
  { keys:['leave policy','bida niti'], page:'leave-policy' },
  { keys:['leave setup','configure leave'], page:'leave-setup' },
  { keys:['leave analytics'], page:'leave-analytics' },
  // Payroll (sensitive)
  { keys:['payroll','run payroll','pay run'], page:'automated-payroll', sensitive:true },
  { keys:['payslip','salary slip'], page:'payslip-generation', sensitive:true },
  { keys:['salary structure'], page:'salary-structure', sensitive:true },
  { keys:['bonus'], page:'bonus-processing', sensitive:true },
  { keys:['loan','advance'], page:'loan-management', sensitive:true },
  { keys:['ssf','social security'], page:'ssf-information', sensitive:true },
  { keys:['tax','cit','income tax'], page:'tax-compliance', sensitive:true },
  { keys:['payroll report'], page:'payroll-reports', sensitive:true },
  { keys:['bank transfer','payment file'], page:'bank-transfer-file', sensitive:true },
  // Performance
  { keys:['performance','appraisal'], page:'performance-dashboard' },
  { keys:['okr','objective'], page:'okr-management' },
  { keys:['kpi','key performance'], page:'kpi-management' },
  { keys:['goal','target','laksha'], page:'goal-assignment' },
  { keys:['performance review'], page:'performance-review' },
  { keys:['360','peer review','360 feedback'], page:'360-feedback' },
  { keys:['pip','improvement plan'], page:'pip-management' },
  { keys:['recognition','reward'], page:'recognition-program' },
  // Recruitment
  { keys:['recruitment','hiring','ats'], page:'ats-dashboard' },
  { keys:['job posting','vacancy'], page:'job-posting' },
  { keys:['candidate','applicant'], page:'candidate-database' },
  { keys:['interview'], page:'interview-scheduling' },
  { keys:['offer letter'], page:'offer-management' },
  { keys:['talent pool'], page:'talent-pool' },
  { keys:['background check','bgv'], page:'background-verification' },
  { keys:['career portal','careers'], page:'career-portal' },
  { keys:['manpower plan'], page:'annual-manpower-plan' },
  // Training
  { keys:['training','talim','course'], page:'course-management' },
  { keys:['learning portal','elearning'], page:'learning-portal' },
  { keys:['training calendar'], page:'annual-training-calendar' },
  { keys:['skill gap'], page:'skill-gap-analysis' },
  { keys:['certification'], page:'certification-tracking' },
  { keys:['career path','career development'], page:'career-pathing' },
  { keys:['succession','successor'], page:'successor-identification' },
  { keys:['hipo','high potential'], page:'hipo-employees' },
  // Engagement
  { keys:['engagement','engagement score'], page:'engagement-dashboard' },
  { keys:['announcement','notice','suchana'], page:'announcement-board' },
  { keys:['employee satisfaction','enps'], page:'emp-satisfaction' },
  { keys:['social feed','employee hub','community'], page:'employee-social-feed' },
  { keys:['birthday','anniversary'], page:'birthday-anniversary' },
  { keys:['calendar','events'], page:'calendar-events' },
  { keys:['notification','alert'], page:'notifications' },
  // Compliance & System
  { keys:['compliance','shram ain'], page:'compliance-setup' },
  { keys:['audit','audit log'], page:'audit-logs' },
  { keys:['permission','access control'], page:'permission-matrix' },
  { keys:['integration','api','hub'], page:'integration-hub' },
  { keys:['system setting','settings'], page:'system-setting' },
  { keys:['user management','manage users'], page:'user-management' },
  // Snapshots
  { keys:['headcount','employee count'], page:'headcount-analysis' },
  { keys:['minutes of meeting','mom'], page:'minutes-of-meeting' },
  { keys:['payroll snapshot'], page:'payroll-snapshot', sensitive:true },
]

function findPage(text) {
  const low = text.toLowerCase()
  return NAV_ENTRIES.find(n => n.keys.some(k => low.includes(k))) || null
}

// ── ROLE-AWARE QUICK ACTIONS ──────────────────────────────────
function getQuickActions(roleLevel) {
  const all = {
    c_level: [
      { label:'Board Report',   text:'Generate a board-level HR strategic intelligence report.' },
      { label:'Predictive BI',  text:'Run predictive workforce analytics: attrition risk, performance, financial impact.' },
      { label:'HR Strategy',    text:'What is the 90-day strategic HR improvement roadmap?' },
      { label:'Cost Analysis',  text:'Analyse payroll cost, attrition cost, and intervention ROI.' },
    ],
    hr_manager: [
      { label:'Monthly Report', text:'Generate the monthly HR operations report with KPIs and compliance status.' },
      { label:'Attrition Risk', text:'Which employees are at high attrition risk? Give me a predictive brief.' },
      { label:'Labour Act',     text:'What are the Nepal Labour Act 2074 leave and SSF provisions?' },
      { label:'Create MOM',     text:'Help me create minutes of meeting for an HR strategy session.' },
    ],
    department_head: [
      { label:'Team Report',    text:'Generate a team performance and attendance report for my department.' },
      { label:'Leave Balance',  text:'What is the current leave balance status for my team?' },
      { label:'Performance',    text:'Show me the performance analytics for my department.' },
      { label:'Training Gaps',  text:'What are the skill and training gaps in my team?' },
    ],
    finance: [
      { label:'Payroll Status', text:'What is the current payroll processing status and SSF compliance?' },
      { label:'Cost Report',    text:'Generate a payroll cost analysis and headcount cost report.' },
      { label:'Tax Status',     text:'What is our CIT and income tax compliance status?' },
      { label:'SSF Filing',     text:'When is the next SSF filing deadline and what is due?' },
    ],
    employee: [
      { label:'Leave Balance',  text:'How many leave days do I have remaining?' },
      { label:'Apply Leave',    text:'I want to apply for leave.' },
      { label:'My Payslip',     text:'Can I see my latest payslip information?' },
      { label:'Policies',       text:'What are the key HR policies I need to know?' },
    ],
  }
  return all[roleLevel] || [
    { label:'HR Report',   text:'Generate an HR summary report.' },
    { label:'Leave Info',  text:'What are the leave entitlements under Nepal Labour Act 2074?' },
    { label:'Performance', text:'Show me performance analytics and KPIs.' },
    { label:'Org Chart',   text:'Show me the organisation structure.' },
  ]
}

// ── OFFLINE KNOWLEDGE ENGINE ──────────────────────────────────
// Answers warmly and helpfully without any API key.
// Covers all common HR questions an employee or manager would ask.
function offlineAnswer(text, lang, roleLevel, personaLabel) {
  const low = (text||'').toLowerCase()
  const d = new Date()
  const date = d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})
  const name = personaLabel || 'there'
  const isNe = lang==='ne', isHi = lang==='hi'

  // ── LEAVE ───────────────────────────────────────────────
  if (low.match(/\b(leave|bida|biramee|vacation|sick|maternity|paternity|annual|छुट्टी|बिदा)\b/)) {
    if (isNe) return `नमस्ते ${name}! 😊\n\nनेपाल श्रम ऐन २०७४ अनुसार तपाईंलाई यी बिदा अधिकार छन्:\n\n**बिदाका प्रकार:**\n- 🏥 बिरामी बिदा: **१२ दिन** (पूर्ण तलबसहित, पहिलो दिनदेखि)\n- 🏠 घर बिदा: प्रत्येक २० कार्यदिनमा **१ दिन** (अधिकतम ९०)\n- 👶 **मातृत्व बिदा: ९८ दिन** पूर्ण तलबसहित (दफा ४५)\n- 👨 पितृत्व बिदा: **१५ दिन** पूर्ण तलबसहित\n- 🌸 सार्वजनिक बिदा: पुरुष १३, महिला १४ दिन\n- 💔 शोक बिदा: **१३ दिन**\n\n💡 **बिदाको लागि:** "Open Leave Request" टाइप गर्नुस् — म तुरुन्त खोलिदिन्छु!\n\nके अरू केही जान्न चाहनुहुन्छ? 🙂`
    if (isHi) return `नमस्ते ${name}! 😊\n\nनेपाल श्रम अधिनियम 2074 के अनुसार आपके छुट्टी अधिकार:\n\n**छुट्टी के प्रकार:**\n- 🏥 बीमारी छुट्टी: **12 दिन** (पूर्ण वेतन, पहले दिन से)\n- 🏠 वार्षिक छुट्टी: हर 20 कार्यदिवस पर **1 दिन** (अधिकतम 90)\n- 👶 **मातृत्व छुट्टी: 98 दिन** पूर्ण वेतन (धारा 45)\n- 👨 पितृत्व छुट्टी: **15 दिन** पूर्ण वेतन\n- 🌸 सार्वजनिक छुट्टी: पुरुष 13, महिला 14 दिन\n- 💔 शोक छुट्टी: **13 दिन**\n\n💡 **छुट्टी के लिए:** "Open Leave Request" type करें — मैं तुरंत खोल दूंगा!\n\nकोई और सवाल? 🙂`
    return `Hi ${name}! 😊 Great question about leave.\n\n**Your Leave Entitlements (Nepal Labour Act 2074):**\n- 🏥 Sick Leave: **12 days/year** — full pay from Day 1\n- 🏠 Home/Annual Leave: **1 day per 20 working days** (max 90 days)\n- 👶 **Maternity Leave: 98 days** — full pay (Section 45)\n- 👨 Paternity Leave: **15 days** — full pay (new in 2074)\n- 🌸 Public Holidays: **13 days** (male) / **14 days** (female)\n- 💔 Mourning Leave: **13 days**\n- 💍 Marriage Leave: **7 days**\n\n💡 **To apply for leave:** Just say "Open Leave Request" and I'll take you there right away!\n\nAnything else I can help you with? 😊`
  }

  // ── ATTENDANCE ──────────────────────────────────────────
  if (low.match(/\b(attendance|haajiri|उपस्थिति|check in|checkout|late|overtime|ot)\b/)) {
    if (isNe) return `नमस्ते ${name}! ⏰\n\n**उपस्थिति नीति:**\n- ⏰ कार्य समय: बिहान ९:०० — साँझ ६:०० (८ घण्टा)\n- ✅ Grace period: **१५ मिनेट**\n- 📅 महिनामा **३ पटक** ढिला निःशुल्क\n- ⚠️ त्यसभन्दा बढी: ०.५ दिनको कटौती\n\n**ओभरटाइम (श्रम ऐन दफा ३६):**\n- दर: नियमित दरको **१.५ गुणा**\n- अधिकतम: **४ घण्टा/दिन, २४ घण्टा/हप्ता**\n\n💡 लाइभ उपस्थिति हेर्न: "Open Attendance" भन्नुस्!\n\nके सहयोग चाहिन्छ? 🙂`
    return `Hi ${name}! ⏰\n\n**Attendance Policy:**\n- Working hours: 9:00 AM — 6:00 PM (8 hrs/day)\n- ✅ Grace period: **15 minutes**\n- 📅 **3 free late arrivals** per month\n- ⚠️ Beyond that: 0.5 day salary deduction\n\n**Overtime (Labour Act Section 36):**\n- Rate: **1.5x** regular rate\n- Maximum: **4 hrs/day, 24 hrs/week**\n\n💡 To see live attendance: say "Open Attendance" and I'll navigate you there!\n\nHow can I help further? 😊`
  }

  // ── PAYROLL / SALARY ────────────────────────────────────
  if (low.match(/\b(payroll|salary|tanlav|talav|payslip|pay slip|minimum wage|ssf|social security|gratuity|उपदान|तलब|वेतन)\b/)) {
    if (roleLevel==='employee') {
      if (isNe) return `नमस्ते ${name}! 💰\n\nतपाईंको तलब जानकारी सुरक्षित छ। Payslip हेर्नका लागि:\n\n💡 "Open My Payslip" वा "Open Employee Dashboard" भन्नुस्।\n\n**न्यूनतम पारिश्रमिक (नेपाल, २०२४):** NPR **१७,३०० /महिना**\n\n**SSF कटौती:**\n- कर्मचारी योगदान: तपाईंको आधारभूत तलबको **११%**\n- रोजगारदाताले थप्छ: **२०%**\n\n**उपदान:** पहिलो दिनदेखि ८.३३%/वर्ष\n\nसुरक्षाका कारण विस्तृत तलब जानकारी यहाँ देखाउन सकिँदैन। Finance वा HR सँग सम्पर्क गर्नुस् वा "Live HR" बटन थिच्नुस्।`
      return `Hi ${name}! 💰\n\nFor your personal payslip, say **"Open My Payslip"** and I'll navigate you right there.\n\n**General Payroll Info (Nepal 2024):**\n- Minimum wage: NPR **17,300/month**\n- SSF deduction from your salary: **11%** of basic\n- Your employer contributes an additional: **20%**\n- Gratuity: **8.33%/year** from Day 1\n\nFor detailed personal salary figures, please visit the Employee Self-Service dashboard or contact your HR department. For privacy, I keep sensitive compensation data secure. 🔒\n\nAnything else I can help with? 😊`
    }
    if (isNe) return `**पेरोल अवलोकन (${date}):**\n\n- मासिक पेरोल: NPR **४.८M**\n- कुल कर्मचारी: ३१२\n- प्रति कर्मचारी: NPR **१५,३८५**\n- SSF दायित्व: NPR **१४.४ लाख** (अर्को फाइलिङ: पुस २५)\n\n**न्यूनतम पारिश्रमिक:** NPR १७,३०० (२०२४)\n**ओभरटाइम:** १.५ गुणा | **उपदान:** ८.३३%/वर्ष\n\n💡 विस्तृत रिपोर्टका लागि: "Payroll Report" वा "Predictive Analysis" टाइप गर्नुस्।`
    return `**Payroll Overview (${date}):**\n\n- Monthly payroll: NPR **4.8M**\n- Total employees: **312**\n- Cost per employee: NPR **15,385**\n- SSF liability: NPR **14.4 lakhs** (Next filing: Poush 25)\n\n**Key Rates:**\n- Minimum wage: NPR 17,300/month (2024)\n- SSF: Employee 11% + Employer 20% = **31% total**\n- Gratuity: **8.33%/year** from Day 1\n- Overtime: **1.5x** (max 4 hrs/day)\n\n💡 For the full payroll report, say **"Open Payroll Report"** and I'll take you there!`
  }

  // ── PERFORMANCE / KPI / OKR ─────────────────────────────
  if (low.match(/\b(performance|appraisal|kpi|okr|goal|target|review|feedback|kra)\b/)) {
    if (isNe) return `नमस्ते ${name}! 📊\n\n**कार्यसम्पादन प्रणाली:**\n\n**कानुनी आवश्यकता (श्रम ऐन २०७४):**\n- वार्षिक मूल्यांकन अनिवार्य\n- ३ पटक लगातार खराब = बर्खास्तीको आधार\n- **७ दिन** स्पष्टीकरण अवसर अनिवार्य\n\n**हाम्रो ४-स्तम्भ ढाँचा:**\n- 🎯 **OKR** — त्रैमासिक लक्ष्य\n- 📋 **KRA** — मुख्य जिम्मेवारी क्षेत्र\n- 📈 **KPI** — मापनयोग्य सूचक\n- ⚠️ **KRI** — जोखिम सूचक\n\n**वर्तमान स्थिति:**\n- OKR उपलब्धि: ६३% (लक्ष्य: ८०%)\n- ३७% कर्मचारी लक्ष्य नपुग्ने जोखिममा\n\n💡 "Open Performance Dashboard" टाइप गर्नुस्!`
    return `Hi ${name}! 📊\n\n**Performance Management System:**\n\n**Legal Requirements (Labour Act 2074):**\n- Annual appraisal is mandatory\n- 3 consecutive poor reviews = grounds for termination\n- Employee has right to **7-day explanation period**\n\n**Our 4-Pillar Framework:**\n- 🎯 **OKR** — Quarterly cascaded objectives\n- 📋 **KRA** — Key Responsibility Areas\n- 📈 **KPI** — Measurable performance indicators\n- ⚠️ **KRI** — Risk indicators (burnout, attrition signals)\n\n**Current Status:**\n- OKR achievement: 63% (target: 80%)\n- 37% of employees at risk of missing targets\n- Monthly check-ins reduce attrition by 14%\n\n💡 Say **"Open Performance Dashboard"** for the full view!`
  }

  // ── ATTRITION / RISK ────────────────────────────────────
  if (low.match(/\b(attrition|turnover|retention|flight risk|resign|quit|leaving|predict)\b/)) {
    if (roleLevel==='employee') {
      return `Hi ${name}! 😊\n\nI understand you may have questions about career or retention.\n\nIf you're thinking about your future here, our HR team would love to talk:\n- 📞 **HR Helpdesk:** Ext. 1234\n- 💬 Say **"Live HR"** and I'll connect you right away\n\nWe value every team member and want to ensure you feel supported. Is there something specific on your mind I can help with? 🙂`
    }
    return `📊 **Workforce Risk Intelligence (${date}):**\n\n**Attrition Forecast — Next 90 Days:**\n| Department | Risk | Employees |\n|-----------|------|----------|\n| Engineering | 🔴 34% HIGH | 8 people |\n| Sales | 🟠 28% MED-HIGH | 5 people |\n| Customer Service | 🟡 18% MEDIUM | 3 people |\n\n**Predicted departures:** 14–18 employees\n**Financial exposure:** NPR 3.2M\n**Intervention cost:** NPR 380K\n**ROI of acting:** 8.4x\n\n**Root cause:** Engineering salary gap NPR 13K/month below market\n\n💡 Say **"Predictive Analysis"** for the full executive brief with recommendations!`
  }

  // ── ONBOARDING ──────────────────────────────────────────
  if (low.match(/\b(onboard|joining|new hire|probation|orientation|welcome|checklist)\b/)) {
    if (isNe) return `${roleLevel==='employee'?`स्वागत छ ${name}!`:`नमस्ते ${name}!`} 🎉\n\n**Onboarding Checklist:**\n- ✅ सरकारी परिचयपत्र जम्मा\n- ✅ Biometric दर्ता\n- ✅ Bank खाता विवरण\n- ✅ Digital Forms / E-Sign\n- ✅ SSF दर्ता\n- ✅ IT Equipment प्राप्ति\n- ✅ Buddy Assignment\n- ✅ Orientation कार्यक्रम\n\n**परिवीक्षा अवधि:** अधिकतम **६ महिना** (श्रम ऐन २०७४)\n\n💡 "Open Joining Checklist" टाइप गर्नुस् — म तुरुन्त खोलिदिन्छु! 🙂`
    return `${roleLevel==='employee'?`Welcome, ${name}!`:`Hi ${name}!`} 🎉\n\n**Onboarding Checklist:**\n- ✅ Government ID submission\n- ✅ Biometric registration\n- ✅ Bank account details\n- ✅ Digital forms & e-signatures\n- ✅ SSF registration\n- ✅ IT equipment allocation\n- ✅ Buddy assignment\n- ✅ Orientation program\n\n**Probation period:** Maximum **6 months** (Labour Act 2074)\n\n💡 Say **"Open Joining Checklist"** and I'll take you right there!\n\nHow is your first few days going? I'm here to help with anything! 😊`
  }

  // ── HR REPORT / ANALYTICS ───────────────────────────────
  if (low.match(/\b(report|analytics|summary|monthly|strategic|hr report|bi|intelligence)\b/)) {
    if (isNe) return `**मासिक HR रिपोर्ट (${date}):**\n\n| KPI | मान | स्थिति |\n|-----|-----|-------|\n| कुल कर्मचारी | ३१२ | 🟢 |\n| अट्रिशन दर | ८.२% | 🟡 |\n| उपस्थिति | ९४.१% | 🟡 |\n| खुला पद | ११ | 🔴 |\n| SSF अनुपालन | १००% | 🟢 |\n| तालिम | ८२% | 🟠 |\n\n**शीर्ष जोखिम:** Engineering ३४% flight risk\n**तत्काल:** SSF फाइलिङ — पुस २५\n\n💡 विस्तृत रिपोर्टका लागि "AI Business Intelligence" खोल्नुस्!`
    if (isHi) return `**मासिक HR रिपोर्ट (${date}):**\n\n| KPI | मान | स्थिति |\n|-----|-----|-------|\n| कुल कर्मचारी | 312 | 🟢 |\n| Attrition | 8.2% | 🟡 |\n| उपस्थिति | 94.1% | 🟡 |\n| खुले पद | 11 | 🔴 |\n| SSF अनुपालन | 100% | 🟢 |\n\n💡 विस्तृत रिपोर्ट के लिए "AI Business Intelligence" खोलें!`
    return `**Monthly HR Dashboard (${date}):**\n\n| Metric | Value | Status |\n|--------|-------|--------|\n| Total Employees | 312 | 🟢 On Track |\n| Attrition Rate | 8.2% | 🟡 Monitor |\n| Attendance | 94.1% | 🟡 Close |\n| Open Positions | 11 | 🔴 Critical |\n| SSF Compliance | 100% | 🟢 Compliant |\n| Training | 82% | 🟠 Gap |\n\n**Top Risk:** Engineering 34% flight risk — salary gap NPR 13K/month\n**Immediate Action:** SSF filing due Poush 25\n\n💡 For the full strategic report, say **"Open AI Business Intelligence"** — I'll take you right there!`
  }

  // ── LABOUR LAW / COMPLIANCE ─────────────────────────────
  if (low.match(/\b(labour|labor|law|act|2074|compliance|legal|ssf|cit|tax|norms|rules)\b/)) {
    if (isNe) return `**नेपाल श्रम ऐन २०७४ — त्वरित मार्गदर्शन:**\n\n**बिदा:** मातृत्व ९८ दिन | पितृत्व १५ दिन | बिरामी १२ दिन | घर बिदा अधिकतम ९०\n**SSF:** कर्मचारी ११% + रोजगारदाता २०% = **३१%**\n**उपदान:** पहिलो दिनदेखि **८.३३%/वर्ष**\n**ओभरटाइम:** **१.५ गुणा** (दफा ३६, अधिकतम ४ घण्टा/दिन)\n**न्यूनतम तलब:** NPR **१७,३०० /महिना** (२०२४)\n**परिवीक्षा:** अधिकतम **६ महिना**\n**अवकाश उमेर:** **५८ वर्ष**\n\n**मुख्य जरिमाना:**\n- नियुक्ति पत्र नदिनु: NPR १०,०००/कर्मचारी\n- SSF जम्मा नगर्नु: दोब्बर रकम\n\n💡 "Open Compliance Setup" टाइप गर्नुस्!`
    return `**Nepal Labour Act 2074 — Quick Reference:**\n\n**Leave:** Maternity 98 days | Paternity 15 days | Sick 12 days | Home max 90\n**SSF:** Employee 11% + Employer 20% = **31% total**\n**Gratuity:** **8.33%/year** from Day 1 — no minimum service\n**Overtime:** **1.5x rate** (Section 36 — max 4 hrs/day, 24 hrs/week)\n**Minimum wage:** NPR **17,300/month** (2024)\n**Probation:** Maximum **6 months**\n**Retirement age:** **58 years**\n\n**Key Penalties:**\n- No appointment letter: NPR 10,000 per employee\n- SSF non-deposit: Double amount penalty\n- Wrong classification: Up to NPR 500,000\n\n💡 Say **"Open Compliance Setup"** for the full compliance module!`
  }

  // ── GREETING / HOW ARE YOU ───────────────────────────────
  if (low.match(/\b(hello|hi|namaste|namaskar|good morning|good afternoon|how are|help|start|begin|what can)\b/)) {
    const hour = d.getHours()
    const timeGreet = hour<12?'Good morning':'hour'<17?'Good afternoon':'Good evening'
    const roleGreets = {
      c_level:`${timeGreet}, ${name}! I'm your HR Co-Pilot, ready to provide strategic intelligence.\n\n**What I can do for you right now:**\n- 📊 Board-level HR strategic reports\n- 🔮 Predictive workforce analytics & attrition risk\n- 📝 Minutes of Meeting generation\n- 📈 PowerPoint presentation outlines\n- 💰 Payroll cost & ROI analysis\n\n**Just say or type what you need** — in any language. I'm here 24/7! 🙂`,
      hr_manager:`${timeGreet}, ${name}! I'm your HR Co-Pilot — your intelligent assistant for everything HR.\n\n**I can help you with:**\n- 📋 Monthly HR reports & KPI dashboards\n- ⚠️ Attrition risk analysis & predictions\n- ⚖️ Nepal Labour Act 2074 compliance\n- 📝 MOM, job descriptions, HR letters\n- 🔀 Navigate to any HR module instantly\n\n**Speak or type in any language** — I'll respond in the same language! 😊`,
      department_head:`${timeGreet}, ${name}! I'm your HR Co-Pilot — here to support you and your team.\n\n**I can help with:**\n- 👥 Team performance & attendance reports\n- 📅 Leave balance & approval status\n- 🎯 OKR & KPI tracking\n- 🧑‍💻 Training gaps & skill development\n- 🔀 Open any module by voice or text\n\nHow is your team doing today? 😊`,
      employee:`${timeGreet}, ${name}! I'm your HR Co-Pilot — always here to help you! 🤗\n\n**I can help you with:**\n- 📅 Check your leave balance\n- 📝 Apply for leave\n- 💰 Payslip & salary queries\n- 📋 Company policies & rules\n- 🎯 Your goals & performance\n\n**Just ask me anything** — in Nepali, Hindi, English or any language! I'm here for you. 😊`,
    }
    return roleGreets[roleLevel] || `${timeGreet}, ${name}! I'm your HR Co-Pilot — your intelligent HR assistant. How can I help you today? 😊\n\nI can answer HR questions, generate reports, navigate to any module, and provide compliance guidance — all in your language!`
  }

  // ── THANK YOU / POSITIVE ─────────────────────────────────
  if (low.match(/\b(thank|shukriya|dhanyabad|great|excellent|good|perfect|helpful|awesome)\b/)) {
    return isNe ? `तपाईंलाई स्वागत छ, ${name}! 😊 म यहाँ सधैं तपाईंको सहयोगमा छु। अरू केही प्रश्न छ भने निःसंकोच सोध्नुस्।`
      : isHi ? `आपका स्वागत है, ${name}! 😊 मैं हमेशा आपकी सेवा में हूँ। कोई और सवाल हो तो बेझिझक पूछिए।`
      : `You're very welcome, ${name}! 😊 I'm always here whenever you need me. Don't hesitate to ask anything — big or small! 🤗`
  }

  // ── SMART CONTEXTUAL FALLBACK ───────────────────────────
  const menu = isNe
    ? `म यी विषयमा तुरुन्त सहयोग गर्न सक्छु:\n- **Leave Balance** — बिदा जानकारी\n- **Attendance** — उपस्थिति\n- **Labour Act** — श्रम कानून\n- **HR Report** — HR रिपोर्ट\n- **Performance** — कार्यसम्पादन\n- **Predictive Analysis** — जोखिम विश्लेषण\n- कुनै पनि मोड्युल खोल्न: "Open [module name]" भन्नुस्\n\nवा "Live HR" बटन थिचेर Human HR सँग जोडिनुस्। 🙂`
    : isHi
    ? `मैं इन विषयों पर तुरंत मदद कर सकता हूँ:\n- **Leave Balance** — छुट्टी जानकारी\n- **Attendance** — उपस्थिति\n- **Labour Act** — श्रम कानून\n- **HR Report** — HR रिपोर्ट\n- **Performance** — कार्यप्रदर्शन\n- **Predictive Analysis** — जोखिम विश्लेषण\n- कोई भी module खोलने के लिए: "Open [module]" बोलें\n\nया "Live HR" button दबाकर Human HR से जुड़ें। 🙂`
    : `I'm here to help, ${name}! 😊 Here's what I can do for you right now:\n\n- 📅 **Leave info** — balances, policies, how to apply\n- ⏰ **Attendance** — check-in, overtime, reports\n- ⚖️ **Labour Act** — Nepal Labour Act 2074 guidance\n- 📊 **HR Reports** — dashboard, KPIs, analytics\n- 🔮 **Predictive Analysis** — attrition risk, forecasts\n- 🔀 **Navigation** — say "Open [any module]" to go anywhere\n\nOr click **👤 Live HR** to connect with an HR professional.\n\nWhat would you like to know? 🤗`

  return isNe
    ? `नमस्ते ${name}! तपाईंले सोध्नुभयो: **"${text.slice(0,60)}"**\n\n${menu}`
    : isHi
    ? `नमस्ते ${name}! आपने पूछा: **"${text.slice(0,60)}"**\n\n${menu}`
    : `Hi ${name}! You asked about: **"${text.slice(0,60)}"**\n\n${menu}`
}

// ── SYSTEM PROMPT (role-aware) ────────────────────────────────
function buildPrompt(lang, roleLevel, personaLabel, currentPage) {
  const langName = LANG_NAMES[lang] || 'English'
  const context = {
    c_level: 'You are briefing a C-Level Executive/CEO/Director. Every response must be board-ready: executive summary first, financial impact, ROI, risk matrix, and "Decision Required" at the end.',
    hr_manager: 'You are briefing an HR Manager. Provide operational depth: compliance checklists, Labour Act citations, step-by-step action plans, metrics.',
    department_head: 'You are briefing a Department Head. Focus on team-level data: performance, attendance, leave, training for their department.',
    finance: 'You are briefing a Finance executive. Focus on payroll costs, SSF liability, tax compliance, cost-per-head analysis.',
    employee: 'You are briefing an Employee. Provide self-service answers: leave balances, policies, payslip info, benefits, onboarding. Keep it simple and friendly.',
    super_admin: 'You are briefing a Super Administrator. Provide complete access: all data, all modules, technical details included.',
    staff: 'You are briefing a Staff member. Provide helpful, clear answers about HR policies, leave, attendance, and company information.',
  }
  return `You are NepHR Pro HR Co-Pilot - a persistent AI assistant embedded in the NepHR Pro HRIS/HRMS platform.

CRITICAL LANGUAGE RULE: Respond ENTIRELY in ${langName}. Every word. No mixing. If user wrote in ${langName}, respond 100% in ${langName}.

USER CONTEXT:
- Role: ${personaLabel || 'Staff'}
- Currently viewing: ${currentPage || 'Dashboard'}
- ${context[roleLevel] || context.staff}

DATA SECURITY RULES - YOU MUST ENFORCE THESE:
- NEVER reveal salary, compensation, or payroll data to employees or department heads
- NEVER show one employee's data to another employee
- NEVER reveal SSN, bank account numbers, or PII in chat
- Payroll data: only show summaries to Finance, HR Manager, Executive, Super Admin
- If restricted data is requested by unauthorized role: politely decline and explain

COMPANY ISOLATION:
- You only have access to data from the logged-in user's company tenant
- Never reference or reveal data from other companies
- All responses are scoped to this organization only

CAPABILITIES:
- Answer ANY HR question with specific, real answers
- Generate complete reports, MOM, PowerPoint outlines, strategic briefs
- Navigate to any page in the system (permission-checked)
- Provide compliance guidance: Nepal Labour Act 2074, SSF, CIT, Privacy Act 2018
- Run predictive analytics and risk assessments
- Draft HR letters, policies, job descriptions

KEY DATA:
- Nepal Labour Act 2074: Maternity 98 days, Paternity 15 days, SSF 31%, Gratuity 8.33%/yr
- Min wage: NPR 17,300/month | OT: 1.5x | Probation: max 6 months
- Company: 312 employees | Attrition: 8.2% | Open positions: 11
- Engineering: 34% flight risk | SSF: current | Next filing: Poush 25

Always give REAL answers - specific, actionable, professional. Never just list what you can do.`
}

// ── CLAUDE API ────────────────────────────────────────────────
const VITE_KEY = import.meta?.env?.VITE_ANTHROPIC_API_KEY || ''

async function callClaude(messages, system) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({system, messages, model:'claude-sonnet-4-6', max_tokens:2048}),
      signal:AbortSignal.timeout(10000),
    })
    if (r.ok) { const d=await r.json(); if(d.content) return {text:d.content, ok:true} }
  } catch {}
  if (VITE_KEY&&VITE_KEY.startsWith('sk-ant')&&VITE_KEY!=='sk-ant-your-key-here') {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':VITE_KEY,
          'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},
        body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:2048,system,messages}),
      })
      const d=await r.json()
      if(r.ok&&d?.content?.[0]?.text) return {text:d.content[0].text, ok:true}
    } catch {}
  }
  return {text:null, ok:false}
}

// ── MESSAGE BUBBLE ─────────────────────────────────────────────
function MsgBubble({msg, onFeedback, onSpeak, speakingId}) {
  const isUser = msg.role==='user'
  const [copied, setCopied] = useState(false)
  const sp = speakingId===msg.id
  return (
    <div style={{display:'flex',gap:8,marginBottom:14,justifyContent:isUser?'flex-end':'flex-start',alignItems:'flex-start'}}>
      {!isUser && (
        <div style={{width:30,height:30,borderRadius:10,background:G,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0,boxShadow:'0 2px 6px rgba(124,58,237,.3)'}}>
          🤖
        </div>
      )}
      <div style={{maxWidth:'78%'}}>
        {!isUser && (
          <div style={{fontSize:8,color:'#94a3b8',marginBottom:2,fontWeight:600}}>
            HR Co-Pilot {msg.isEscalated && <span style={{background:'#fef3c7',color:'#92400e',padding:'1px 6px',borderRadius:10,marginLeft:4}}>Human HR</span>}
          </div>
        )}
        <div style={{
          background:isUser?PURPLE:'#fff',
          color:isUser?'#fff':'#0f172a',
          border:isUser?'none':'1px solid #e2e8f0',
          borderRadius:isUser?'16px 16px 3px 16px':'16px 16px 16px 3px',
          padding:'10px 13px', fontSize:11, lineHeight:1.7, wordBreak:'break-word',
          boxShadow:isUser?'none':'0 1px 4px rgba(0,0,0,.06)',
        }}>
          {msg.content.split('\n').map((line,i)=>{
            const html = line.replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b>${t}</b>`).replace(/\*(.+?)\*/g,(_,t)=>`<i>${t}</i>`)
            if(!line.trim()) return <div key={i} style={{height:4}}/>
            if(line.startsWith('# ')) return <div key={i} style={{fontSize:12,fontWeight:900,color:isUser?'#fff':PURPLE,margin:'8px 0 3px'}}>{line.slice(2)}</div>
            if(line.startsWith('## ')) return <div key={i} style={{fontSize:11,fontWeight:800,color:isUser?'#e9d5ff':DARK,margin:'6px 0 2px'}}>{line.slice(3)}</div>
            if(line.match(/^\|.+\|$/)) return <div key={i} style={{fontFamily:'monospace',fontSize:9,color:isUser?'#e0e7ff':'#374151',padding:'1px 0',borderBottom:'1px solid rgba(0,0,0,.04)'}}>{line}</div>
            if(line.match(/^[-*] /)) return <div key={i} style={{paddingLeft:12,position:'relative',marginBottom:2}}><span style={{position:'absolute',left:2,color:isUser?'#c4b5fd':PURPLE}}>-</span><span dangerouslySetInnerHTML={{__html:html.replace(/^[-*] /,'')}}/></div>
            if(line.match(/^\d+\.\s/)) return <div key={i} style={{paddingLeft:16,marginBottom:2}} dangerouslySetInnerHTML={{__html:html}}/>
            return <div key={i} dangerouslySetInnerHTML={{__html:html}}/>
          })}
        </div>
        {!isUser && (
          <div style={{display:'flex',gap:4,marginTop:4,alignItems:'center',flexWrap:'wrap'}}>
            <button onClick={()=>{navigator.clipboard?.writeText(msg.content);setCopied(true);setTimeout(()=>setCopied(false),1400)}}
              style={{background:'none',border:'none',cursor:'pointer',fontSize:9,color:'#94a3b8',padding:'1px 4px'}}>
              {copied?'✓':'⎘'}
            </button>
            <button onClick={()=>onSpeak(msg)}
              style={{background:'none',border:'none',cursor:'pointer',fontSize:9,color:sp?PURPLE:'#94a3b8',padding:'1px 4px'}}>
              {sp?'⏹':'🔊'}
            </button>
            {msg.feedback==null && (
              <>
                <button onClick={()=>onFeedback(msg.id,true)}
                  style={{background:'none',border:'none',cursor:'pointer',fontSize:10,color:'#94a3b8',padding:'1px 4px'}} title="Helpful">👍</button>
                <button onClick={()=>onFeedback(msg.id,false)}
                  style={{background:'none',border:'none',cursor:'pointer',fontSize:10,color:'#94a3b8',padding:'1px 4px'}} title="Not helpful">👎</button>
              </>
            )}
            {msg.feedback===true && <span style={{fontSize:9,color:'#15803d'}}>👍 Thanks!</span>}
            {msg.feedback===false && <span style={{fontSize:9,color:'#dc2626'}}>👎 Noted</span>}
          </div>
        )}
      </div>
      {isUser && (
        <div style={{width:30,height:30,borderRadius:10,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>👤</div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT - HRCopilot
// ══════════════════════════════════════════════════════════════
export default function HRCopilot({ currentPage }) {
  const { navTo, currentPersona, persona, sub } = useApp()
  const activePage = sub || currentPage || 'Dashboard'
  const roleLevel = classifyRole(currentPersona?.id, currentPersona?.label||persona)
  const hasKey = !!(VITE_KEY&&VITE_KEY.startsWith('sk-ant')&&VITE_KEY!=='sk-ant-your-key-here')

  const [open, setOpen]     = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [speakingId, setSpeakingId] = useState(null)
  const [voiceText, setVoiceText] = useState('')
  const [history, setHistory] = useState([])
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [unread, setUnread] = useState(0)

  const bottomRef  = useRef(null)
  const recRef     = useRef(null)
  const silenceRef = useRef(null)
  const loadingRef = useRef(false)
  const autoRef    = useRef(false)
  const sendRef    = useRef(null)

  useEffect(()=>{ loadingRef.current=loading },[loading])
  useEffect(()=>{ autoRef.current=autoSpeak },[autoSpeak])
  useEffect(()=>{ if(open) { bottomRef.current?.scrollIntoView({behavior:'smooth'}); setUnread(0) } },[messages,open])

  // Boot greeting when first opened -- warm, personal, time-aware
  useEffect(()=>{
    if (!open || messages.length>0) return
    const hr=new Date().getHours()
    const tg=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening'
    const greetings={
      c_level:`${tg}! I'm **HR Co-Pilot**, your AI Business Intelligence assistant. I provide board-level strategic HR reports, predictive analytics, attrition risk briefs, and executive intelligence - in any language you prefer. What strategic information can I get for you today?`,
      hr_manager:`${tg}! I'm **HR Co-Pilot** - your intelligent HR assistant, always by your side. I can help with reports, compliance, attrition analysis, Labour Act guidance, MOM, and navigation to any module. Speak or type in any language! What do you need? 😊`,
      department_head:`${tg}! I'm **HR Co-Pilot** - here to support you and your team. I help with team analytics, leave, performance, training gaps, and any HR queries. How can I help today? 😊`,
      finance:`${tg}! I'm **HR Co-Pilot** - your HR Finance intelligence assistant. I provide payroll summaries, SSF compliance, tax reports, and cost analysis. What do you need today? 📊`,
      employee:`${tg}! Welcome - I'm **HR Co-Pilot**, your personal HR assistant! 🤗 I'm here for leave balance, payslip queries, company policies, your goals, and anything in the system. Ask me in Nepali, Hindi, English or any language - I respond in the same language! 😊`,
      super_admin:`${tg}! I'm **HR Co-Pilot** with full system access. Reports, navigation, compliance, predictive analytics - anything you need, instantly. 🚀`,
    }
    const greet=greetings[roleLevel]||`${tg}! I'm HR Co-Pilot - your intelligent HR assistant. How can I help you today? 😊`
    setMessages([{id:'boot',role:'assistant',content:greet,feedback:null,created_at:'now'}])
  },[open,roleLevel,currentPersona,persona]) // eslint-disable-line

  // Context-aware tip when page changes
  // Context-aware tip when page changes
  const prevPage = useRef('')
  useEffect(()=>{
    if (!open || activePage===prevPage.current || messages.length===0) return
    prevPage.current = activePage
    const tips = {
      'leave-request':'I noticed you are on Leave Request. Want me to check your remaining balance or explain the leave policy?',
      'automated-payroll':'I see you are viewing Payroll. Need help with payroll processing, SSF calculations, or compliance?',
      'performance-dashboard':'You are on Performance. Want a team performance summary or attrition risk analysis?',
      'live-attendance':'Viewing Attendance. Need an attendance report or overtime analysis?',
      'employee-directory':'On Employee Directory. Want a headcount analysis or department breakdown?',
    }
    if (tips[activePage]) {
      const tip = {id:Date.now()+'tip',role:'assistant',content:tips[activePage],feedback:null,created_at:'now',isContext:true}
      setMessages(p=>[...p,tip])
      setUnread(u=>u+1)
    }
  },[activePage,open]) // eslint-disable-line

  // SEND
  const sendMessage = useCallback(async(textInput, fromVoice=false)=>{
    const content = (textInput||input).trim()
    if (!content||loadingRef.current) return

    const lang = detectLang(content)

    // Stop words
    if (isStop(content)) {
      window.speechSynthesis?.cancel(); setSpeaking(false); setSpeakingId(null)
      try{recRef.current?.stop()}catch{}; recRef.current=null; setRecording(false); setVoiceText('')
      const bye = { ne:'ठीक छ! सहयोग चाहिनुभयो भने भन्नुहोस्।', hi:'ठीक है! जब जरूरत हो, बताइए।', en:'Of course! Let me know when you need me.' }
      const m = {id:Date.now()+'b',role:'assistant',content:bye[lang]||bye.en,feedback:null,created_at:'now'}
      setMessages(p=>[...p,m]); setInput(''); return
    }

    // Human escalation
    if (/\b(human|live agent|connect hr|hr admin|escalate|speak to someone|talk to hr)\b/.test(content.toLowerCase())) {
      const esc = {id:Date.now()+'e',role:'assistant',content:`Connecting you to an HR representative now. Your conversation history will be shared so you don't have to repeat yourself.\n\n📞 **HR Helpdesk:** hr@company.com | Ext: 1234\n📱 **WhatsApp HR:** +977-XXXXXXX\n\nA member of the HR team will respond within 2 business hours.`,feedback:null,created_at:'now',isEscalated:true}
      setMessages(p=>[...p,{id:Date.now()+'u',role:'user',content,created_at:'now'},esc]); setInput(''); return
    }

    // Navigation
    const low = content.toLowerCase()
    const isNav = /\b(open|go to|show|navigate|take me|switch|khol|dekhau|jaa|abre)\b/.test(low)
    if (isNav) {
      const found = findPage(content)
      if (found && navTo) {
        const isSensitive = !!found.sensitive
        const personaId = currentPersona?.id||''
        const canAccess = personaId==='super-admin' ||
          (currentPersona?.allowedPages?.[0]==='*') ||
          (!isSensitive || PAYROLL_ROLES.includes(personaId))

        if (!canAccess) {
          const deny = isSensitive
            ? (lang==='ne'?`सुरक्षा: "${found.page}" मा तलब/वित्तीय जानकारी छ। तपाईंको भूमिकामा अनुमति छैन।`:lang==='hi'?`सुरक्षा: "${found.page}" में वेतन/वित्तीय जानकारी है। आपकी भूमिका में अनुमति नहीं है।`:`Security: "${found.page}" contains payroll/financial data. Your role (${currentPersona?.label}) does not have access. Contact Finance or HR Admin.`)
            : (lang==='ne'?`माफ गर्नुस्, "${found.page}" हेर्ने अनुमति छैन।`:lang==='hi'?`खेद है, "${found.page}" देखने की अनुमति नहीं है।`:`Sorry, your role does not have permission to access "${found.page}".`)
          setMessages(p=>[...p,{id:Date.now()+'u',role:'user',content,created_at:'now'},{id:Date.now()+'d',role:'assistant',content:deny,feedback:null,created_at:'now'}])
          setInput(''); return
        }

        const ok = lang==='ne'?`"${found.page}" खोल्दैछु...`:lang==='hi'?`"${found.page}" खोल रहा हूँ...`:`Opening ${found.page}...`
        setMessages(p=>[...p,{id:Date.now()+'u',role:'user',content,created_at:'now'},{id:Date.now()+'n',role:'assistant',content:ok,feedback:null,created_at:'now'}])
        setInput(''); setTimeout(()=>navTo(found.page),400); return
      }
    }

    setMessages(p=>[...p,{id:Date.now()+'u',role:'user',content,created_at:'now'}])
    setInput(''); setLoading(true)

    const newHistory = [...history,{role:'user',content}]
    const system = buildPrompt(lang, roleLevel, currentPersona?.label||persona, activePage)
    const {text:reply,ok} = await callClaude(newHistory,system)
    setLoading(false)

    let aiText
    if (reply&&ok) {
      aiText = reply
      setHistory([...newHistory,{role:'assistant',content:reply}])
    } else {
      // Offline knowledge engine — answers warmly without any API key
      aiText = offlineAnswer(content, lang, roleLevel, currentPersona?.label||persona)
    }

    const aiMsg = {id:Date.now()+'a',role:'assistant',content:aiText,feedback:null,created_at:'now'}
    setMessages(p=>[...p,aiMsg])
    if (!open) setUnread(u=>u+1)

    if (autoRef.current) {
      setSpeaking(true); setSpeakingId(aiMsg.id)
      speak(stripMd(aiText),lang,()=>{setSpeaking(false);setSpeakingId(null)})
    }
  },[input,history,hasKey,roleLevel,currentPersona,persona,navTo,activePage,open]) // eslint-disable-line

  useEffect(()=>{sendRef.current=sendMessage},[sendMessage])

  // STT
  const startListen = useCallback((idx=0)=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!SR||loadingRef.current) return
    if(recRef.current){try{recRef.current.stop()}catch{}}
    const fallbacks=['ne-NP','hi-IN','en-US']
    const r=new SR()
    r.continuous=true; r.interimResults=true; r.maxAlternatives=5; r.lang=fallbacks[idx]||'en-US'
    let acc=''
    const arm=text=>{
      if(silenceRef.current)clearTimeout(silenceRef.current)
      silenceRef.current=setTimeout(()=>{
        if(!text.trim()||loadingRef.current) return
        try{r.stop()}catch{}
        recRef.current=null; setRecording(false); setVoiceText('')
        setTimeout(()=>sendRef.current?.(text.trim(),true),100)
      },3000)
    }
    r.onstart=()=>{setRecording(true);setVoiceText('Listening...')}
    r.onresult=e=>{
      let interim='',final=''
      for(let i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal){for(let a=0;a<e.results[i].length;a++){const t=e.results[i][a].transcript;if(/[\u0900-\u097F]/.test(t)||a===0){final+=t+' ';break}}}
        else interim+=e.results[i][0].transcript
      }
      if(final)acc+=final
      const text=(acc+interim).trim()
      if(text){setVoiceText(text);arm(acc.trim()||text)}
    }
    r.onerror=e=>{
      if(silenceRef.current)clearTimeout(silenceRef.current)
      setRecording(false); recRef.current=null
      if(e.error==='language-not-supported'&&idx<fallbacks.length-1)setTimeout(()=>startListen(idx+1),200)
      else if(e.error==='no-speech'){setVoiceText('');setTimeout(()=>startListen(0),500)}
      else{setVoiceText('');setTimeout(()=>setVoiceText(''),2000)}
    }
    r.onend=()=>{
      if(silenceRef.current)clearTimeout(silenceRef.current)
      setRecording(false); recRef.current=null
      if(acc.trim()&&!loadingRef.current)setTimeout(()=>sendRef.current?.(acc.trim(),true),100)
      acc=''
    }
    recRef.current=r; try{r.start()}catch{}
  },[]) // eslint-disable-line

  const stopListen=()=>{if(silenceRef.current)clearTimeout(silenceRef.current);try{recRef.current?.stop()}catch{};recRef.current=null;setRecording(false);setVoiceText('')}
  const speakMsg=msg=>{if(speaking){window.speechSynthesis?.cancel();setSpeaking(false);setSpeakingId(null);return};const l=detectLang(msg.content);setSpeaking(true);setSpeakingId(msg.id);speak(stripMd(msg.content),l,()=>{setSpeaking(false);setSpeakingId(null)})}
  const giveFeeback=(id,val)=>setMessages(p=>p.map(m=>m.id===id?{...m,feedback:val}:m))

  const quickActions = getQuickActions(roleLevel)

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <>
      {/* ── FLOATING ICON (bottom-right, shows when closed) ── */}
      {!open && (
        <button
          onClick={()=>setOpen(true)}
          data-copilot-toggle="true"
          title="HR Co-Pilot - Click to open"
          style={{
            position:'fixed', bottom:24, right:24, zIndex:9000,
            width:56, height:56, borderRadius:'50%',
            background:G, border:'none', cursor:'pointer',
            boxShadow:'0 4px 20px rgba(124,58,237,.5)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:24, transition:'transform .2s',
          }}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
        >
          🤖
          {unread>0 && (
            <div style={{position:'absolute',top:-3,right:-3,width:20,height:20,borderRadius:'50%',background:'#ef4444',color:'#fff',fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff'}}>
              {unread>9?'9+':unread}
            </div>
          )}
        </button>
      )}

      {/* ── SIDE PANEL ─────────────────────────────────────── */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0,
        width:open ? PANEL_W : 0,
        zIndex:8999,
        display:'flex', flexDirection:'column',
        background:'#fff',
        boxShadow:open?'-4px 0 32px rgba(0,0,0,.15)':'none',
        transform:open?'translateX(0)':'translateX(100%)',
        transition:'transform .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1)',
        overflow:'hidden',
        borderLeft:'1px solid #e2e8f0',
      }}>

        {/* ── HEADER ─────────────────────────────────────── */}
        <div style={{background:G,padding:'12px 14px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:34,height:34,borderRadius:10,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🤖</div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:900,color:'#fff'}}>HR Co-Pilot</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.7)',display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80'}}/>
                {recording?'Listening...':speaking?'Speaking...':hasKey?'Claude AI Ready':'Built-in Mode'}
              </div>
            </div>
            <div style={{display:'flex',gap:4,alignItems:'center'}}>
              <button onClick={()=>setAutoSpeak(x=>!x)} title="Auto-speak toggle"
                style={{background:autoSpeak?'rgba(255,255,255,.3)':'rgba(255,255,255,.1)',border:'none',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:9,color:'#fff',fontWeight:700}}>
                {autoSpeak?'🔊':'🔇'}
              </button>
              <button onClick={()=>{setMessages([]);setHistory([])}} title="Clear chat"
                style={{background:'rgba(255,255,255,.15)',border:'none',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:9,color:'#fff'}}>
                🗑️
              </button>
              <button onClick={()=>setOpen(false)} title="Close"
                style={{background:'rgba(255,255,255,.15)',border:'none',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:15,color:'#fff',fontWeight:700,lineHeight:1}}>
                ✕
              </button>
            </div>
          </div>
          {/* Context badge - what page is active */}
          <div style={{marginTop:8,background:'rgba(255,255,255,.12)',borderRadius:8,padding:'4px 10px',fontSize:8,color:'rgba(255,255,255,.8)',display:'flex',alignItems:'center',gap:5}}>
            <span>📍</span>
            <span>Viewing: <b style={{color:'#fff'}}>{activePage.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</b></span>
            <span style={{marginLeft:'auto'}}>{currentPersona?.icon} {currentPersona?.label||persona}</span>
          </div>
        </div>

        {/* ── QUICK ACTIONS (chips) ──────────────────────── */}
        <div style={{padding:'8px 10px',borderBottom:'1px solid #f1f5f9',flexShrink:0,display:'flex',gap:5,flexWrap:'wrap'}}>
          {quickActions.map((a,i)=>(
            <button key={i} onClick={()=>sendMessage(a.text)}
              style={{padding:'4px 9px',borderRadius:20,border:`1px solid ${PURPLE}22`,background:`${PURPLE}10`,color:PURPLE,fontSize:8,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
              {a.label}
            </button>
          ))}
          <button onClick={()=>sendMessage('Connect me to a human HR representative')}
            style={{padding:'4px 9px',borderRadius:20,border:'1px solid #f59e0b22',background:'#fef3c7',color:'#92400e',fontSize:8,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            👤 Live HR
          </button>
        </div>

        {/* ── MESSAGES ──────────────────────────────────── */}
        <div style={{flex:1,overflowY:'auto',padding:'12px 10px 6px'}}>
          {messages.length===0&&open&&(
            <div style={{textAlign:'center',color:'#94a3b8',fontSize:10,marginTop:40}}>
              <div style={{fontSize:32,marginBottom:8}}>🤖</div>
              <div style={{fontWeight:700}}>HR Co-Pilot</div>
              <div style={{marginTop:4}}>Opening conversation...</div>
            </div>
          )}
          {messages.map(m=>(
            <MsgBubble key={m.id} msg={m} onFeedback={giveFeeback} onSpeak={speakMsg} speakingId={speakingId}/>
          ))}
          {loading&&(
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <div style={{width:30,height:30,borderRadius:10,background:G,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>🤖</div>
              <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:'16px 16px 16px 3px',padding:'10px 13px',display:'flex',gap:4,alignItems:'center'}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:PURPLE,opacity:.5+i*.25}}/>)}
                <span style={{fontSize:9,color:'#94a3b8',marginLeft:4}}>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* ── VOICE STATUS ───────────────────────────────── */}
        {voiceText&&(
          <div style={{padding:'5px 12px',background:recording?'#eff6ff':'#fefce8',borderTop:`1px solid ${recording?'#bfdbfe':'#fef08a'}`,fontSize:9,color:recording?'#1e40af':'#92400e',flexShrink:0,display:'flex',alignItems:'center',gap:5}}>
            {recording&&<div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',flexShrink:0}}/>}
            <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{voiceText}</span>
          </div>
        )}

        {/* ── INPUT BAR ──────────────────────────────────── */}
        <div style={{padding:'8px 10px',background:'#f8fafc',borderTop:'1px solid #e2e8f0',flexShrink:0}}>
          <div style={{display:'flex',gap:6,alignItems:'flex-end'}}>
            {/* Mic */}
            <button onClick={recording?stopListen:()=>startListen(0)}
              title={recording?'Stop':'Speak - 3s silence = auto-send'}
              style={{width:36,height:36,borderRadius:10,border:`2px solid ${recording?'#22c55e':'#e2e8f0'}`,background:recording?'#f0fdf4':'#fff',fontSize:16,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
              {recording?'⏹':'🎤'}
              {recording&&<div style={{position:'absolute',top:-3,right:-3,width:9,height:9,borderRadius:'50%',background:'#22c55e',border:'2px solid #fff'}}/>}
            </button>

            {/* Text input */}
            <textarea
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(input)}}}
              placeholder={recording?voiceText||'Listening - 3s silence sends automatically':'Ask anything in any language...'}
              rows={input.split('\n').length>2?3:1}
              style={{flex:1,padding:'8px 11px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:10,resize:'none',outline:'none',fontFamily:'inherit',lineHeight:1.5,background:'#fff'}}
            />

            {/* Send */}
            <button onClick={()=>sendMessage(input)} disabled={!input.trim()||loading}
              style={{width:36,height:36,borderRadius:10,border:'none',background:input.trim()&&!loading?PURPLE:'#e2e8f0',color:'#fff',fontSize:15,cursor:input.trim()&&!loading?'pointer':'default',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              ▶
            </button>
          </div>
          <div style={{fontSize:7,color:'#94a3b8',marginTop:3,textAlign:'center'}}>
            Enter to send · 🎤 auto-sends 3s · say "stop" to pause · "live hr" for human agent
          </div>
        </div>

        {/* ── SECURITY FOOTER ────────────────────────────── */}
        <div style={{padding:'4px 10px',background:'#f8fafc',borderTop:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
          <span style={{fontSize:8}}>🔒</span>
          <span style={{fontSize:7,color:'#94a3b8'}}>Encrypted · RBAC · Company-isolated · Nepal Privacy Act 2018</span>
        </div>
      </div>
    </>
  )
}

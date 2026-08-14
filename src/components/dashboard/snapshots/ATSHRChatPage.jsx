// FILE: ATSHRChatPage.jsx
// eLogix HRMS — AI HR Chatbot (Complete)
// Role-aware: SuperAdmin/CEO → full access | HR → HR ops | Employee → self-service only
// Supports: Nepal Labour Act 2074, Payroll, Leave, Attendance, Recruitment,
//           Policy drafting, SSF/PF/CIT, Grievance, Training, Performance
// Multi-language: Nepali, Hindi, English
// eLogix Technologies · www.elogix.com.np
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const A  = '#0369a1'
const G  = 'linear-gradient(135deg,#0c4a6e,#0369a1,#38bdf8)'
const NOW = new Date()

// ── ROLE DETECTION ────────────────────────────────────────────
function getRole(persona='', level=10) {
  const p = persona.toLowerCase()
  if (p.includes('super')||p.includes('admin')||level===1) return 'super_admin'
  if (p.includes('executive')||p.includes('ceo')||p.includes('coo')||level===2) return 'executive'
  if (p.includes('hr')&&!p.includes('officer')) return 'hr_manager'
  if (p.includes('hr-officer')||p.includes('hr_officer')) return 'hr_officer'
  if (p.includes('finance')) return 'finance'
  if (p.includes('department')||p.includes('hod')||p.includes('head')) return 'hod'
  if (p.includes('it')||p.includes('admin-officer')) return 'it_admin'
  if (p.includes('recruit')) return 'recruiter'
  if (p.includes('employee')||level>=10) return 'employee'
  return 'manager'
}

const ROLE_INFO = {
  super_admin: { label:'Super Admin', color:'#7c3aed', access:'full', emoji:'👑' },
  executive:   { label:'Executive',   color:'#0369a1', access:'full', emoji:'🏛' },
  hr_manager:  { label:'HR Manager',  color:'#0891b2', access:'hr',   emoji:'👥' },
  hr_officer:  { label:'HR Officer',  color:'#0891b2', access:'hr',   emoji:'📋' },
  finance:     { label:'Finance',     color:'#16a34a', access:'finance', emoji:'💰' },
  hod:         { label:'HOD',         color:'#d97706', access:'dept', emoji:'🏢' },
  it_admin:    { label:'IT Admin',    color:'#64748b', access:'it',   emoji:'💻' },
  recruiter:   { label:'Recruiter',   color:'#e11d48', access:'recruitment', emoji:'🎯' },
  employee:    { label:'Employee',    color:'#64748b', access:'self', emoji:'👤' },
  manager:     { label:'Manager',     color:'#0369a1', access:'dept', emoji:'📊' },
}

// ── QUICK QUESTIONS BY ROLE ──────────────────────────────────
const QUICK_BY_ROLE = {
  full: [
    { cat:'📊 Strategic', qs:['Generate monthly HR strategic report','Show attrition risk analysis','What is our current headcount and payroll cost?','Give me a 90-day workforce forecast'] },
    { cat:'⚖️ Labour Law', qs:['Nepal Labour Act 2074 key provisions','What is the SSF contribution rate?','Explain gratuity calculation formula','What are the termination rules?'] },
    { cat:'💰 Payroll & Finance', qs:['Calculate SSF and CIT for NPR 80,000 salary','What is the festival allowance entitlement?','Generate payroll compliance checklist','Overtime calculation formula Nepal'] },
    { cat:'📋 HR Operations', qs:['Draft a warning letter for attendance issue','Write a show cause notice','Create job description for HR Manager','Employee handbook key sections'] },
    { cat:'🎯 Recruitment', qs:['Draft structured interview questions for Developer','Write a job advertisement for Finance Officer','Background check process Nepal','Onboarding checklist for new employee'] },
    { cat:'📈 Performance', qs:['Design KPI framework for Sales team','360 degree feedback template','Performance improvement plan (PIP) template','OKR examples for HR department'] },
  ],
  hr: [
    { cat:'⚖️ Nepal Labour Act', qs:['What is the probation period under LA2074?','How many days sick leave are mandatory?','Annual leave entitlement and carry forward rules?','Maternity and paternity leave provisions?'] },
    { cat:'💰 Payroll & SSF', qs:['Calculate SSF for NPR 65,000 salary','What is CIT threshold for employees?','Generate payslip format for Nepal','Festival allowance calculation'] },
    { cat:'📋 HR Documents', qs:['Draft offer letter template NPR 100K','Write a warning letter for late attendance','Experience letter format Nepal','Employment contract essential clauses'] },
    { cat:'🎯 Recruitment', qs:['Structured interview questions for React Developer','HR Manager job description','Background verification checklist','Rejection email for unsuccessful candidate'] },
    { cat:'👥 Employee Relations', qs:['How to handle employee grievance?','Disciplinary procedure steps Nepal','Exit interview questions','Employee engagement survey questions'] },
    { cat:'📊 HR Reports', qs:['Monthly attendance report format','Training completion tracking','Leave balance report','Attrition analysis for Engineering team'] },
  ],
  finance: [
    { cat:'💰 Payroll', qs:['SSF calculation for all employees','CIT deduction rates Nepal 2081','Festival allowance budget','Salary revision impact analysis'] },
    { cat:'⚖️ Compliance', qs:['SSF filing deadline Poush','IRD compliance checklist','Gratuity provisioning formula','Labour audit preparation'] },
    { cat:'📊 Financial HR', qs:['Cost per employee analysis','HR budget vs actual','Overtime cost report','Headcount cost by department'] },
  ],
  dept: [
    { cat:'👥 My Team', qs:['How to approve leave for my team?','Team attendance summary this month','Performance review process for team','Overtime policy for my department'] },
    { cat:'📋 Documents', qs:['Team meeting agenda template','Project performance review format','Transfer request letter','Grievance handling procedure'] },
    { cat:'⚖️ Policies', qs:['Late attendance policy','Work from home policy','Code of conduct key points','Leave policy for my team'] },
  ],
  self: [
    { cat:'🌴 Leave', qs:['How many leave days do I have left?','How to apply for annual leave?','What is the leave encashment policy?','Can I carry forward unused leaves?'] },
    { cat:'💰 Payroll', qs:['How is my salary calculated?','What are SSF deductions from my salary?','When is salary credited?','How do I get my payslip?'] },
    { cat:'⚖️ My Rights', qs:['What are my rights under Nepal Labour Act?','What is the minimum wage in Nepal?','What is the notice period for resignation?','How is gratuity calculated?'] },
    { cat:'📋 Documents', qs:['How to request an experience letter?','How to update my personal information?','Emergency contact update process','Loan application process in eLogix'] },
  ],
}

// ── SYSTEM PROMPT BY ROLE ────────────────────────────────────
function buildSystem(role, personaLabel, userName) {
  const base = `You are the eLogix HRMS AI HR Assistant — Nepal's most advanced HR chatbot, built into eLogix HRMS (elogix.com.np).
You are talking to ${userName||personaLabel||'a user'} (${ROLE_INFO[role]?.label||'User'}).

## CURRENT COMPANY DATA (use when relevant)
- Company: Demo Company Pvt Ltd (demo tenant)
- Total employees: 312 active | Monthly payroll: NPR 4.8M
- Attrition: 8.2% | Time-to-fill: 28 days | Training completion: 82%
- Open positions: 11 | eNPS: 34
- Nepal Labour Act 2074 compliance: ✅ | SSF: ✅ Current | Next due: ${new Date(NOW.getTime()+20*86400000).toLocaleDateString('en-GB')}

## NEPAL LABOUR ACT 2074 — KEY PROVISIONS (always cite)
- Probation: Max 6 months (extendable once with written consent)
- Annual leave: 18 days per year (after 1 year service)
- Sick leave: 12 days per year (first 6 days paid from Day 1)
- Maternity: 98 days paid (60 days paid) | Paternity: 15 days paid
- SSF: Employee 11% + Employer 20% = 31% of basic salary
- Minimum wage: NPR 17,300/month (FY 2080-81)
- Gratuity: 8.33% of basic salary per year after 1 year
- Festival allowance: 1 month basic per year (usually Dashain)
- Notice period: 30 days (or 1 month salary in lieu)
- Overtime: 1.5x rate, max 4 hrs/day, max 24 hrs/week
- CIT: Progressive — up to 4L: 1%, 4-5L: 10%, 5-7L: 20%, above 7L: 30%
- Working hours: 8 hrs/day, 48 hrs/week

## RESPONSE RULES
1. Answer ANY question about HR, payroll, leave, attendance, performance, recruitment, compliance, or Nepal labour law
2. Always provide specific numbers, dates, and calculations when asked
3. Cite Nepal Labour Act 2074 section where relevant
4. Be professional but conversational — like a knowledgeable HR colleague
5. For sensitive data questions, note data access depends on system permissions
6. Respond in the SAME LANGUAGE the user writes in (Nepali → Nepali, Hindi → Hindi, English → English)
7. Always be helpful — never refuse a reasonable HR question
8. Provide templates, formats, and examples when helpful`

  const roleAddons = {
    super_admin: `\n\nYou are talking to the SUPER ADMIN. Provide FULL access to all information including:
- All financial data, payroll, costs, SSF liabilities
- All employee personal data and records
- System configuration and access management
- Strategic analysis and board-level reports
- Complete audit logs and compliance status`,

    executive: `\n\nYou are talking to an EXECUTIVE/C-LEVEL. Focus on:
- Strategic workforce analytics and business impact
- ROI of HR decisions and investments
- Risk assessment and mitigation
- Board-ready summaries and insights
- Financial impact of HR initiatives`,

    hr_manager: `\n\nYou are talking to the HR MANAGER. You have full access to:
- All employee records and HR operations
- Payroll data and SSF/CIT details
- Recruitment pipeline and ATS data
- Performance and training data
- Policy drafting and compliance guidance`,

    hr_officer: `\n\nYou are talking to an HR OFFICER. Access includes:
- Employee records (non-financial)
- Leave and attendance management
- Recruitment operational support
- Training administration
- HR document templates`,

    finance: `\n\nYou are talking to the FINANCE team. Focus on:
- Payroll costs and financial analysis
- SSF, CIT, gratuity calculations
- HR budget analysis
- Cost per employee metrics
- Financial compliance reporting`,

    hod: `\n\nYou are talking to a DEPARTMENT HEAD. Focus on:
- Their team's HR data (headcount, attendance, leave, performance)
- Team management policies and procedures
- Leave approval and attendance management
- Team performance and KPIs
- Department-level reporting
Do NOT provide company-wide financial data or other departments' individual employee records.`,

    employee: `\n\nYou are talking to an EMPLOYEE. Provide:
- Their personal HR information (self-service)
- General company policies applicable to all employees
- Nepal Labour Act rights and entitlements
- How to request documents, apply for leave, etc.
- General HR guidance
Do NOT provide: other employees' data, salary details of others, confidential company info, financial reports.`,

    recruiter: `\n\nYou are talking to a RECRUITER. Focus on:
- Recruitment process and ATS pipeline
- Interview frameworks and evaluation
- Job description and advertisement creation
- Candidate communication templates
- Onboarding coordination`,
  }

  return base + (roleAddons[role]||roleAddons.employee)
}

// ── BUILT-IN ANSWERS (no API needed) ─────────────────────────
function builtInAnswer(q, role) {
  const lo = q.toLowerCase()
  const isEmployee = role==='employee'
  const hasFullAccess = ['super_admin','executive','hr_manager','hr_officer'].includes(role)

  // Nepal Labour Act questions
  if (lo.match(/\b(probation|trial period)\b/))
    return `## Probation Period — Nepal Labour Act 2074

**Duration:** Maximum **6 months** (Section 34)
- Can be extended **once** with mutual written consent (max 3 more months)
- During probation: either party can terminate with **15 days notice** (or 15 days pay in lieu)
- After probation: 30 days notice required for termination

**Key points:**
- Probation employee entitled to same SSF contributions
- Minimum wage applies during probation
- If employer doesn't issue confirmation letter after 6 months, employee is deemed confirmed

*Source: Nepal Labour Act 2074, Section 34-36*`

  if (lo.match(/\b(ssf|social security|fund)\b/))
    return `## SSF Contribution — Nepal Labour Act 2074

**Contribution Rates:**
| Party | Rate | On |
|-------|------|-----|
| Employee | **11%** | Basic salary |
| Employer | **20%** | Basic salary |
| **Total** | **31%** | Basic salary |

**Benefits covered:**
- Medical (health insurance)
- Accidental insurance
- Maternity benefit
- Dependent family benefit
- Old age benefit (pension)

**Filing deadlines:** 15th of the following Nepali month
**Filed with:** SSF office (Social Security Fund)

**Example — NPR 50,000 basic:**
- Employee pays: NPR 5,500
- Employer pays: NPR 10,000
- Total SSF: NPR 15,500/month

*Source: Nepal Labour Act 2074 + SSF Act 2074*`

  if (lo.match(/\b(leave|bिदा|छुट्टी)\b/))
    return `## Leave Entitlements — Nepal Labour Act 2074

| Leave Type | Days | Paid | Condition |
|-----------|------|------|-----------|
| **Annual Leave** | **18 days/year** | ✅ Full pay | After 1 year service |
| **Sick Leave** | **12 days/year** | ✅ Full pay (6 days guaranteed) | With medical certificate |
| **Maternity** | **98 days** | ✅ 60 days paid | Female employees |
| **Paternity** | **15 days** | ✅ Full pay | Male employees |
| **Mourning Leave** | **13 days** | ✅ Full pay | Death of close family |
| **Study Leave** | **12 days/year** | Half pay | With approval |
| **Special Leave** | As agreed | Negotiable | Per employment contract |

**Key rules:**
- Annual leave accumulates — can be carried forward (max 60 days)
- Leave encashment: Can be paid out on separation
- Sick leave beyond 12 days: Employer may request medical certificate from Day 1

*Source: Nepal Labour Act 2074, Chapter 6*`

  if (lo.match(/\b(gratuity|उपदान|severance)\b/))
    return `## Gratuity Calculation — Nepal Labour Act 2074

**Formula:** (Basic Salary ÷ 12) × Years of Service × 0.833

Or simply: **8.33% of basic salary per year** after completing 1 full year

| Service Years | Gratuity % of Annual Basic |
|--------------|--------------------------|
| 1-3 years | 8.33%/year |
| 3-5 years | 8.33%/year |
| 5-7 years | 8.33%/year |
| 7+ years | 8.33%/year |

**Example:**
- Basic salary: NPR 60,000/month
- Service: 5 years
- Gratuity = 60,000 × 12 × 5 × 0.0833 = **NPR 2,99,880**

**Eligibility:** Minimum 1 year of continuous service
**Payment:** At separation (resignation, termination, retirement)
**Tax:** Gratuity up to NPR 5L is tax-exempt (CIT Act)

*Source: Nepal Labour Act 2074, Section 52*`

  if (lo.match(/\b(minimum wage|न्यूनतम तलब|न्यूनतम)\b/))
    return `## Minimum Wage — Nepal (FY 2080-81)

**Minimum Wage:** NPR **17,300 per month**
- Basic: NPR 13,450
- Dearness Allowance: NPR 3,850

**By category:**
| Category | Minimum/Month |
|----------|--------------|
| General workers | NPR 17,300 |
| Skilled workers | NPR 17,300+ |
| Daily wage | NPR 685/day |

**Note:** Government reviews every 2 years. Next review: 2082 BS.

*Source: Nepal Government, Labour Ministry Notification 2080*`

  if (lo.match(/\b(cit|tax|income tax|कर)\b/))
    return `## Income Tax (CIT) — Nepal FY 2080-81

**Individual Tax Slabs (Annual Income):**
| Income Range | Tax Rate |
|-------------|---------|
| Up to NPR 5,00,000 | 1% |
| NPR 5L to 7L | 10% |
| NPR 7L to 20L | 20% |
| NPR 20L to 50L | 30% |
| Above NPR 50L | 36% |

**For Couples (married filing jointly):** 10% relief on above slabs

**Key deductions:**
- SSF contribution (employee 11%) — deductible
- Life insurance premium — up to NPR 25,000 deductible
- Remote area allowance — exempt
- Medical expense reimbursement — up to NPR 2,500/month exempt

**Example (NPR 80,000/month = NPR 9.6L/year):**
- Tax on 5L: NPR 5,000
- Tax on 5-7L: NPR 20,000
- Tax on 7-9.6L: NPR 52,000
- Total CIT: NPR 77,000/year

*Source: Income Tax Act 2058 (as amended FY 2080-81)*`

  if (lo.match(/\b(overtime|ओभरटाइम|extra time)\b/))
    return `## Overtime Rules — Nepal Labour Act 2074

**Overtime Rate:** **1.5x (150%)** of normal hourly rate

**Limits:**
- Maximum **4 hours per day** of overtime
- Maximum **24 hours per week** of overtime
- 200 hours per year maximum

**Calculation:**
- Hourly rate = Monthly salary ÷ 26 days ÷ 8 hours
- OT rate = Hourly rate × 1.5

**Example (NPR 60,000/month):**
- Hourly rate = 60,000 ÷ 26 ÷ 8 = NPR 288.46
- OT per hour = NPR 288.46 × 1.5 = **NPR 432.69**

**Voluntary principle:** Overtime cannot be compelled without employee consent
**Health limit:** Engineering team currently averaging 6.2 hrs OT/week ⚠️ (exceeds 4hr/day limit)

*Source: Nepal Labour Act 2074, Section 45*`

  if (lo.match(/\b(resign|resignation|notice period|बर्खास्त|quit)\b/))
    return `## Resignation & Notice Period — Nepal Labour Act 2074

**Resignation:**
- Required notice: **30 days** (or 1 month salary in lieu of notice)
- Submit written resignation letter
- Handover period: As agreed with manager

**Termination by Employer:**
- Probation: 15 days notice
- Confirmed employee: 30 days notice OR 30 days salary
- Retrenchment: 90 days notice OR 90 days salary

**Clearance Process:**
1. Submit resignation letter → HR acknowledgement
2. Handover of responsibilities
3. Clearance from all departments
4. Final settlement within 30 days of last working day

**Final settlement includes:**
- Pending salary
- Leave encashment (unused annual leave)
- Gratuity (if 1+ year service)
- SSF final settlement (via SSF portal)
- Festival allowance (pro-rata)
- Experience letter, relieving letter

*Source: Nepal Labour Act 2074, Sections 56-58*`

  if (lo.match(/\b(offer letter|appointment|joining|नियुक्ति)\b/) && hasFullAccess)
    return `## Offer Letter Template — eLogix HRMS

---
**[COMPANY LETTERHEAD]**

Date: ${NOW.toLocaleDateString('en-GB')}
Reference: HR/OL/${NOW.getFullYear()}/___

**APPOINTMENT LETTER**

Dear [Candidate Name],

We are pleased to offer you the position of **[Job Title]** with [Company Name] on the following terms:

**Position Details:**
- Department: [Department Name]
- Reporting to: [Manager Name & Title]
- Start Date: [Start Date]
- Work Location: [Office Address]

**Compensation Package:**
| Component | Monthly (NPR) |
|-----------|--------------|
| Basic Salary | [Amount] |
| Dearness Allowance | [Amount] |
| HRA | [Amount] |
| **Gross CTC** | **[Total]** |
| SSF (Employee 11%) | -[Amount] |
| CIT | -[Amount] |
| **Net Take-home** | **[Amount]** |

**Benefits:**
- SSF: As per Social Security Fund Act 2074 (Employer: 20%, Employee: 11%)
- Festival Allowance: 1 month basic (Dashain)
- Annual Leave: 18 days after 1 year | Sick Leave: 12 days/year
- Medical: [If applicable]
- Probation: 6 months (with written confirmation)

**Notice Period:** 30 days (after probation)
**Probation:** This appointment is subject to a 6-month probation period.

Please sign and return the duplicate of this letter by [Date] as confirmation of your acceptance.

Warm regards,
[HR Manager Name]
[Company Name]
[Contact Details]

---
*Draft generated by eLogix HRMS AI · Verify with HR Manager before issue*`

  if (lo.match(/\b(warning letter|show cause|misconduct|अनुशासन)\b/) && hasFullAccess)
    return `## Warning Letter Template — eLogix HRMS

---
**[COMPANY LETTERHEAD]**

Date: ${NOW.toLocaleDateString('en-GB')}
Ref: HR/WL/${NOW.getFullYear()}/___

**WRITTEN WARNING**

To: [Employee Name]
Employee ID: [ID]
Department: [Department]

Dear [Employee Name],

This letter serves as a **formal written warning** regarding your conduct on [Date(s)].

**Nature of Misconduct:**
[Describe the specific incident, policy violated, date, and evidence]

**Company Policy Reference:**
This action violates [specific HR Policy / Nepal Labour Act provision].

**Previous Warning(s):** [None / Verbal warning dated ___]

**Required Improvement:**
You are required to:
1. [Specific action/improvement required]
2. [Timeline for improvement]
3. [How compliance will be measured]

**Consequences:** Should this behaviour continue, further disciplinary action may be taken, including and up to termination of employment, in accordance with Nepal Labour Act 2074.

Please acknowledge receipt of this warning by signing below.

Yours sincerely,
[HR Manager Name]

**Acknowledgement:**
I, [Employee Name], acknowledge receipt of this warning letter.
Signature: ___________ Date: ___________

---
*Template by eLogix HRMS AI · Reviewed by HR before issue*`

  // Payroll calculation
  if (lo.match(/\b(calculat|payslip|salary|तलब)\b/) && lo.match(/\d{2,}/)) {
    const match = lo.match(/(\d{2,}(?:,\d{3})*(?:\.\d+)?)\s*(?:k|thousand)?/)
    let sal = 0
    if (match) {
      sal = parseFloat(match[1].replace(/,/g,''))
      if (lo.includes(' k')) sal *= 1000
    }
    if (sal > 0) {
      const ssf_emp = Math.round(sal * 0.11)
      const ssf_emp_pct = '11%'
      const ssf_emr = Math.round(sal * 0.20)
      const annual = sal * 12
      // Simple CIT
      let cit = 0
      if (annual > 500000) cit += Math.min(annual-500000, 200000) * 0.10
      if (annual > 700000) cit += Math.min(annual-700000, 1300000) * 0.20
      if (annual > 2000000) cit += (annual-2000000) * 0.30
      cit = Math.round(cit/12)
      const net = sal - ssf_emp - cit
      return `## Salary Calculation — NPR ${sal.toLocaleString()}/month

| Component | Amount (NPR) |
|-----------|-------------|
| **Gross Salary** | **${sal.toLocaleString()}** |
| SSF — Employee (11%) | -${ssf_emp.toLocaleString()} |
| Income Tax (CIT) | -${cit.toLocaleString()} |
| **Net Take-home** | **${net.toLocaleString()}** |

**Employer Cost:**
| Component | Amount (NPR) |
|-----------|-------------|
| Gross Salary | ${sal.toLocaleString()} |
| SSF — Employer (20%) | ${ssf_emr.toLocaleString()} |
| **Total CTC** | **${(sal+ssf_emr).toLocaleString()}** |

**Annual Entitlements:**
- Festival Allowance: NPR ${sal.toLocaleString()} (1 month basic)
- Gratuity (per year): NPR ${Math.round(sal*12*0.0833).toLocaleString()}
- Annual CTC: NPR ${((sal+ssf_emr)*12+sal).toLocaleString()}

*Calculated per Nepal Labour Act 2074 + CIT Act FY 2080-81*`
    }
  }

  // Greetings
  if (lo.match(/^(hi|hello|namaste|नमस्ते|hey|good morning|good afternoon|सुप्रभात)[\s!,]*$/))
    return `नमस्ते 🙏 Hello! I am the **eLogix HRMS AI HR Assistant**.

I can help you with:
- 📅 **Leave & Attendance** — policies, calculations, applications
- 💰 **Payroll & SSF** — calculations, deductions, CIT
- ⚖️ **Nepal Labour Act 2074** — rights, entitlements, compliance
- 📋 **HR Documents** — letters, templates, policies
- 🎯 **Recruitment** — JDs, interview questions, processes
- 📊 **Performance** — KPIs, reviews, frameworks
${hasFullAccess ? '- 🧠 **Strategic Analysis** — reports, forecasts, risk analysis\n- 📈 **Business Intelligence** — payroll costs, attrition, benchmarks' : ''}

What would you like help with today? You can ask me in **English, Nepali, or Hindi**.`

  return null
}

// ── API CALL ─────────────────────────────────────────────────
const VITE_KEY = import.meta?.env?.VITE_ANTHROPIC_API_KEY || ''
async function callClaude(messages, system) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ system, messages, model:'claude-sonnet-4-6', max_tokens:2000 }),
      signal: AbortSignal.timeout(20000),
    })
    if (r.ok) {
      const d = await r.json()
      const text = Array.isArray(d.content) ? d.content.map(c=>c.text||'').join('') : d.content
      if (text) return text
    }
  } catch {}
  if (VITE_KEY?.startsWith('sk-ant')) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':VITE_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},
        body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:2000, system, messages }),
      })
      const d = await r.json()
      return d?.content?.[0]?.text || null
    } catch {}
  }
  return null
}

// ── MESSAGE RENDERER ─────────────────────────────────────────
function MessageBubble({ msg, copied, onCopy }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', gap:10, marginBottom:16,
      justifyContent:isUser?'flex-end':'flex-start', alignItems:'flex-start' }}>
      {!isUser && (
        <div style={{ width:36,height:36,borderRadius:10,background:G,flexShrink:0,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,
          boxShadow:'0 2px 8px rgba(3,105,161,.25)' }}>🤖</div>
      )}
      <div style={{ maxWidth:'82%' }}>
        <div style={{ background:isUser?A:'#fff', color:isUser?'#fff':'#0f172a',
          border:isUser?'none':'1px solid #e2e8f0',
          borderRadius:isUser?'16px 16px 4px 16px':'16px 16px 16px 4px',
          padding:'12px 16px', fontSize:12, lineHeight:1.8, wordBreak:'break-word',
          boxShadow:isUser?'none':'0 2px 8px rgba(0,0,0,.06)' }}>
          {msg.content.split('\n').map((line,i) => {
            const html = line
              .replace(/\*\*(.+?)\*\*/g, (_,t)=>`<b>${t}</b>`)
              .replace(/\*(.+?)\*/g, (_,t)=>`<i>${t}</i>`)
              .replace(/`(.+?)`/g, (_,t)=>`<code style="background:${isUser?'rgba(255,255,255,.2)':'#f1f5f9'};padding:1px 5px;border-radius:4px;font-family:monospace;font-size:11px">${t}</code>`)
            if (!line.trim()) return <div key={i} style={{ height:5 }}/>
            if (line.startsWith('# ')) return <div key={i} style={{ fontSize:14,fontWeight:900,color:isUser?'#fff':A,margin:'10px 0 6px',paddingBottom:5,borderBottom:`1px solid ${isUser?'rgba(255,255,255,.25)':'#e2e8f0'}` }}>{line.slice(2)}</div>
            if (line.startsWith('## ')) return <div key={i} style={{ fontSize:12,fontWeight:800,color:isUser?'#bfdbfe':'#1e3a5f',margin:'10px 0 4px' }}>{line.slice(3)}</div>
            if (line.startsWith('### ')) return <div key={i} style={{ fontSize:12,fontWeight:700,color:isUser?'#dbeafe':'#374151',margin:'8px 0 3px' }}>{line.slice(4)}</div>
            if (line.match(/^\|.+\|$/)) return <div key={i} style={{ fontFamily:'monospace',fontSize:10,color:isUser?'#dbeafe':'#374151',padding:'2px 0',borderBottom:`1px solid ${isUser?'rgba(255,255,255,.1)':'#f1f5f9'}` }}>{line}</div>
            if (line.match(/^[-*] /)) return <div key={i} style={{ paddingLeft:16,position:'relative',marginBottom:3 }}><span style={{ position:'absolute',left:3,color:isUser?'#93c5fd':A }}>•</span><span dangerouslySetInnerHTML={{ __html:html.replace(/^[-*] /,'') }}/></div>
            if (line.match(/^\d+\.\s/)) return <div key={i} style={{ paddingLeft:18,marginBottom:3 }} dangerouslySetInnerHTML={{ __html:html }}/>
            if (line.startsWith('---')) return <hr key={i} style={{ border:'none',borderTop:`1px solid ${isUser?'rgba(255,255,255,.2)':'#e2e8f0'}`,margin:'8px 0' }}/>
            return <div key={i} dangerouslySetInnerHTML={{ __html:html }}/>
          })}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:5, alignItems:'center' }}>
          <span style={{ fontSize:9, color:'#94a3b8' }}>{msg.time}</span>
          {!isUser && (
            <button onClick={()=>onCopy(msg.content, msg.id)}
              style={{ background:'none',border:'none',cursor:'pointer',fontSize:9,
                color:copied===msg.id?'#16a34a':'#94a3b8',padding:'2px 6px',
                borderRadius:4,fontFamily:'inherit' }}>
              {copied===msg.id ? '✓ Copied' : '⎘ Copy'}
            </button>
          )}
        </div>
      </div>
      {isUser && (
        <div style={{ width:36,height:36,borderRadius:10,background:'#f0f9ff',flexShrink:0,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,
          border:'1.5px solid #bae6fd' }}>👤</div>
      )}
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function ATSHRChatPage() {
  const { currentPersona, persona } = useApp()

  // Get user details from auth storage
  const userInfo = (() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('elogix_user')||localStorage.getItem('elogix_user')||'{}')
      return { name: u.full_name||u.name||'User', level: u.level||10, role: u.role||'' }
    } catch { return { name:'User', level:10, role:'' } }
  })()

  const role = getRole(currentPersona?.id||persona||'', userInfo.level)
  const ri   = ROLE_INFO[role] || ROLE_INFO.employee
  const hasFullAccess = ['super_admin','executive','hr_manager','hr_officer'].includes(role)
  const hasKey = !!(VITE_KEY?.startsWith('sk-ant'))

  const quickBank = QUICK_BY_ROLE[ri.access] || QUICK_BY_ROLE.self
  const [selCat, setSelCat] = useState(0)

  const initMsg = {
    id:'boot', role:'assistant', time:NOW.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
    content:`नमस्ते ${userInfo.name||''}! 🙏 I am your **eLogix HRMS AI HR Assistant**.

${hasFullAccess
  ? `As **${ri.label}**, you have access to:\n- Complete HR policies, calculations, and compliance\n- Nepal Labour Act 2074 detailed guidance\n- Document drafting (letters, policies, templates)\n- Payroll & SSF calculations\n- Recruitment support and interview frameworks\n${role==='super_admin'||role==='executive' ? '- Strategic analytics and business intelligence\n- Financial and cost analysis' : ''}`
  : role==='employee'
  ? `As an employee, I can help you with:\n- Your leave entitlements and how to apply\n- Understanding your salary and deductions\n- Nepal Labour Act 2074 — your rights\n- How to request HR documents\n- Company policies that apply to you`
  : `As ${ri.label}, I can help you with your team's HR matters, policies, and guidance.`}

Ask me anything in **English, Nepali, or Hindi**. I'll answer in the same language.`
  }

  const [messages, setMessages] = useState([initMsg])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(null)
  const [history, setHistory]   = useState([])
  const [showSidebar, setShowSidebar] = useState(true)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text)
    setCopied(id); setTimeout(()=>setCopied(null), 2000)
  }

  const send = useCallback(async (textIn) => {
    const q = (textIn||input).trim()
    if (!q||loading) return
    setInput('')
    const time = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
    const userMsg = { id:Date.now()+'u', role:'user', content:q, time }
    setMessages(p=>[...p, userMsg])
    setLoading(true)

    let answer = null

    // 1. Built-in answers (instant, no API)
    answer = builtInAnswer(q, role)

    // 2. Claude API (if no built-in match)
    if (!answer) {
      const newHistory = [...history, { role:'user', content:q }]
      const aiText = await callClaude(newHistory, buildSystem(role, currentPersona?.label||persona, userInfo.name))
      if (aiText) {
        answer = aiText
        setHistory([...newHistory, { role:'assistant', content:aiText }])
      }
    }

    // 3. Helpful fallback
    if (!answer) {
      answer = `I understand you're asking about: **"${q}"**

Here's what I can help you with right now:

${hasFullAccess ? `**HR & Labour Law:**
- Nepal Labour Act 2074 provisions
- SSF, CIT, gratuity calculations
- Leave entitlements and policies

**Documents & Templates:**
- Offer letters, warning letters, experience letters
- HR policies and procedures
- Interview frameworks and job descriptions

**Strategic:**
- Try asking for a "monthly HR report" or "attrition analysis"
- "Calculate SSF for NPR 80,000"
- "Draft a warning letter for attendance"` :
`**Your Self-Service Options:**
- "How many leave days do I have?"
- "What is my SSF deduction?"
- "How do I apply for leave?"
- "What is the notice period if I resign?"
- "Explain my rights under Nepal Labour Act"`}

${hasKey ? '' : '\n*For unlimited AI answers on any topic, set VITE_ANTHROPIC_API_KEY in your .env file.*'}`
    }

    setLoading(false)
    setMessages(p=>[...p, { id:Date.now()+'a', role:'assistant', content:answer, time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) }])
    inputRef.current?.focus()
  }, [input, loading, history, role, currentPersona, persona, hasFullAccess, hasKey, userInfo.name])

  return (
    <div style={{ display:'flex', height:'calc(100vh - 100px)', fontFamily:'system-ui,sans-serif',
      background:'#f0f9ff', borderRadius:16, overflow:'hidden', border:'1px solid #e2e8f0' }}>

      {/* ── SIDEBAR ── */}
      {showSidebar && (
        <div style={{ width:240, background:'#0c4a6e', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
          {/* Header */}
          <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:32,height:32,borderRadius:8,background:G,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>🤖</div>
              <div>
                <div style={{ fontSize:11,fontWeight:900,color:'#fff' }}>eLogix HR Assistant</div>
                <div style={{ fontSize:8,color:'rgba(255,255,255,.5)' }}>AI-Powered · Always available</div>
              </div>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 10px',background:'rgba(255,255,255,.08)',borderRadius:8 }}>
              <span style={{ fontSize:14 }}>{ri.emoji}</span>
              <div>
                <div style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,.9)' }}>{userInfo.name||'User'}</div>
                <div style={{ fontSize:8,color:ri.color,fontWeight:600 }}>{ri.label}</div>
              </div>
              <div style={{ marginLeft:'auto',width:7,height:7,borderRadius:'50%',background:'#22c55e',flexShrink:0 }}/>
            </div>
          </div>

          {/* New Chat */}
          <div style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
            <button onClick={()=>{ setMessages([initMsg]); setHistory([]); setInput('') }}
              style={{ width:'100%',padding:'7px',borderRadius:9,border:'1px solid rgba(255,255,255,.15)',
                background:'rgba(255,255,255,.08)',color:'#bae6fd',fontSize:10,fontWeight:700,cursor:'pointer' }}>
              + New Conversation
            </button>
          </div>

          {/* Category selector */}
          <div style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize:7,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5 }}>Topics</div>
            <div style={{ display:'flex',flexDirection:'column',gap:2 }}>
              {quickBank.map((cat,i)=>(
                <button key={i} onClick={()=>setSelCat(i)}
                  style={{ width:'100%',padding:'6px 10px',borderRadius:8,border:'none',cursor:'pointer',
                    textAlign:'left',fontSize:9,fontWeight:600,transition:'all .1s',
                    background:selCat===i?'rgba(56,189,248,.2)':'transparent',
                    color:selCat===i?'#38bdf8':'rgba(255,255,255,.6)' }}>
                  {cat.cat}
                </button>
              ))}
            </div>
          </div>

          {/* Quick questions */}
          <div style={{ flex:1, overflow:'auto', padding:'8px 12px' }}>
            <div style={{ fontSize:7,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6 }}>
              Quick Questions
            </div>
            {quickBank[selCat]?.qs.map((q,i)=>(
              <div key={i} onClick={()=>send(q)}
                style={{ padding:'7px 9px',borderRadius:8,marginBottom:4,cursor:'pointer',
                  background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.06)',
                  fontSize:9,color:'rgba(255,255,255,.75)',lineHeight:1.4,transition:'all .1s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(56,189,248,.12)';e.currentTarget.style.color='#fff'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.color='rgba(255,255,255,.75)'}}>
                {q}
              </div>
            ))}
          </div>

          {/* Status */}
          <div style={{ padding:'8px 12px',borderTop:'1px solid rgba(255,255,255,.06)',fontSize:8,color:'rgba(255,255,255,.3)' }}>
            <div style={{ display:'flex',justifyContent:'space-between' }}>
              <span>Mode: {hasKey?'🟢 Claude AI':'🟡 Built-in'}</span>
              <span>{messages.length-1} messages</span>
            </div>
          </div>
        </div>
      )}

      {/* ── CHAT AREA ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Top bar */}
        <div style={{ padding:'10px 16px', background:'#fff', borderBottom:'1px solid #e2e8f0',
          display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
          <button onClick={()=>setShowSidebar(x=>!x)}
            style={{ width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',
              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#64748b' }}>
            ☰
          </button>
          <div style={{ width:36,height:36,borderRadius:10,background:G,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🤖</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13,fontWeight:800,color:'#0f172a' }}>eLogix AI HR Assistant</div>
            <div style={{ fontSize:9,color:'#64748b' }}>
              {ri.emoji} {ri.label} · {hasKey?'Claude AI Active':'Built-in HR Engine'} · Nepal Labour Act 2074 Expert
            </div>
          </div>
          <div style={{ fontSize:9,padding:'3px 10px',borderRadius:20,fontWeight:700,
            background:hasKey?'#f0fdf4':'#fffbeb',color:hasKey?'#15803d':'#b45309' }}>
            {hasKey?'🟢 AI Active':'🟡 Built-in'}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 8px', background:'#f8fafc' }}>
          {messages.map(m => (
            <MessageBubble key={m.id} msg={m} copied={copied} onCopy={handleCopy}/>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ width:36,height:36,borderRadius:10,background:G,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🤖</div>
              <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:'16px 16px 16px 4px',padding:'12px 16px',display:'flex',gap:5,alignItems:'center' }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{ width:8,height:8,borderRadius:'50%',background:A,
                    animation:`bounce 1s ${i*0.15}s infinite alternate` }}/>
                ))}
                <span style={{ fontSize:10,color:'#94a3b8',marginLeft:6 }}>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Suggested questions bar */}
        {messages.length<=2 && (
          <div style={{ padding:'8px 16px',borderTop:'1px solid #e2e8f0',background:'#fff',
            display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none' }}>
            <span style={{ fontSize:9,color:'#94a3b8',flexShrink:0,alignSelf:'center',marginRight:2 }}>Try:</span>
            {quickBank[0]?.qs.slice(0,4).map((q,i)=>(
              <button key={i} onClick={()=>send(q)}
                style={{ padding:'5px 12px',borderRadius:20,border:'1px solid #bae6fd',
                  background:'#f0f9ff',cursor:'pointer',fontSize:10,fontWeight:600,
                  color:'#0369a1',whiteSpace:'nowrap',flexShrink:0 }}>
                {q.length>40?q.slice(0,38)+'...':q}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div style={{ padding:'10px 14px', background:'#fff', borderTop:'1px solid #e2e8f0', flexShrink:0 }}>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)} }}
              placeholder={`Ask anything${hasFullAccess?' — HR policies, calculations, documents, strategies':' — leave, payroll, rights, policies'}... (English, Nepali, or Hindi)`}
              rows={input.split('\n').length>2?4:2}
              style={{ flex:1,padding:'10px 14px',borderRadius:12,border:'1.5px solid #e2e8f0',
                fontSize:12,resize:'none',outline:'none',fontFamily:'inherit',lineHeight:1.6,
                transition:'border-color .15s' }}
              onFocus={e=>e.target.style.borderColor=A}
              onBlur={e=>e.target.style.borderColor='#e2e8f0'}
            />
            <button onClick={()=>send(input)} disabled={!input.trim()||loading}
              style={{ width:44,height:44,borderRadius:12,border:'none',
                background:input.trim()&&!loading?G:'#e2e8f0',
                color:'#fff',fontSize:18,cursor:input.trim()&&!loading?'pointer':'default',
                flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                transition:'all .15s',boxShadow:input.trim()&&!loading?'0 4px 14px rgba(3,105,161,.3)':'none' }}>
              ➤
            </button>
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',marginTop:4,fontSize:9,color:'#94a3b8' }}>
            <span>Enter to send · Shift+Enter for new line</span>
            <span>{ri.emoji} {ri.label} · Nepal Labour Act 2074 Compliant</span>
          </div>
        </div>
      </div>

      <style>{`@keyframes bounce { from { transform: translateY(0) } to { transform: translateY(-6px) } }`}</style>
    </div>
  )
}

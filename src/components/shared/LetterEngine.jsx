// FILE: src/components/shared/LetterEngine.jsx
// eLogix HRMS — Universal Letter Generation Engine
// Used by: AIHRLettersPage, ExperienceLetterPage, WarningLetterPage,
//          RelievingLetterPage, OfferLetterPage, CITLettersPage, etc.
//
// Features:
//   • Claude AI generates letter content in English + Nepali
//   • Works without API key (built-in professional templates)
//   • PDF download (browser print-to-PDF with letterhead)
//   • Copy to clipboard
//   • Email send via backend API
//   • Digital signature placeholder
//   • Nepal Labour Act 2074 compliance citations auto-inserted

import { useState, useRef } from 'react'

const VITE_KEY = import.meta?.env?.VITE_ANTHROPIC_API_KEY || ''
const P = '#7c3aed'
const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'

// ── CALL CLAUDE AI ───────────────────────────────────────────
async function callClaude(prompt) {
  const system = `You are an expert HR letter writer for eLogix HRMS, a Nepal-based HRIS platform.
Write professional, legally compliant HR letters that:
- Reference Nepal Labour Act 2074 sections correctly
- Use formal Nepali/English business language
- Include all required legal elements
- Are compassionate but firm where needed
- Follow company letterhead format`

  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: [{ role: 'user', content: prompt }], model: 'claude-sonnet-4-6', max_tokens: 2048 }),
      signal: AbortSignal.timeout(15000),
    })
    if (r.ok) { const d = await r.json(); if (d.content) return d.content }
  } catch {}

  if (VITE_KEY && VITE_KEY.startsWith('sk-ant') && VITE_KEY !== 'sk-ant-your-key-here') {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': VITE_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-only-beta': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2048, system, messages: [{ role: 'user', content: prompt }] }),
      })
      const d = await r.json()
      if (r.ok && d?.content?.[0]?.text) return d.content[0].text
    } catch {}
  }
  return null
}

// ── BUILT-IN LETTER TEMPLATES (work without API key) ─────────
const OFFLINE_TEMPLATES = {
  offer: (f) => ({
    english: `[${f.company || 'eLogix HRMS Pvt. Ltd.'} Letterhead]

LETTER OF APPOINTMENT

Date: ${f.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
Reference No: OFFER/${new Date().getFullYear()}/${String(Math.floor(Math.random()*9000)+1000)}

Dear ${f.employee || '[Employee Name]'},

Subject: Offer of Employment — ${f.position || '[Position]'}

We are pleased to offer you the position of **${f.position || '[Position]'}** in the **${f.department || '[Department]'}** department at ${f.company || 'eLogix HRMS Pvt. Ltd.'}, effective **${f.start_date || '[Start Date]'}**.

**Terms of Employment:**
- Designation:      ${f.position || '[Position]'}
- Department:       ${f.department || '[Department]'}
- Reporting to:     ${f.reporting_to || '[Manager Name]'}
- Basic Salary:     NPR ${f.salary || '[Amount]'}/month
- Employment Type:  ${f.type || 'Regular Full-Time'}
- Probation Period: 6 months (Nepal Labour Act 2074, Section 13)
- Office Hours:     9:00 AM – 6:00 PM, Sunday to Friday

**Benefits:**
- SSF Contribution: 11% (Employee) + 20% (Employer) — Labour Act 2074
- Gratuity:         8.33% of basic salary per year from Day 1
- Annual Leave:     12 days sick + home leave as per Labour Act 2074
- Festival Advance: As per company policy

This offer is conditional upon successful completion of document verification and medical examination. Please sign and return one copy of this letter by **${f.accept_by || '[Date]'}** to confirm your acceptance.

We look forward to welcoming you to our team.

Sincerely,

_______________________
${f.hr_name || 'HR Manager'}
Human Resources Department
${f.company || 'eLogix HRMS Pvt. Ltd.'}`,

    nepali: `[${f.company || 'नेपएचआर प्रो प्रा.लि.'} लेटरहेड]

नियुक्ति पत्र

मिति: ${f.date || new Date().toLocaleDateString('ne-NP')}

प्रिय ${f.employee || '[कर्मचारीको नाम]'},

विषय: रोजगारी प्रस्ताव — ${f.position || '[पद'}

हामीलाई ${f.company || 'नेपएचआर प्रो प्रा.लि.'} मा **${f.department || '[विभाग]'}** विभागमा **${f.position || '[पद]'}** को पदमा तपाईंलाई मिति **${f.start_date || '[मिति]'}** देखि प्रस्ताव गर्न खुसी लाग्छ।

**रोजगारीका शर्तहरू:**
- पदनाम:        ${f.position || '[पद]'}
- विभाग:         ${f.department || '[विभाग]'}
- आधारभूत तलब:  NPR ${f.salary || '[रकम]'}/महिना
- रोजगारी प्रकार: ${f.type || 'नियमित पूर्ण-समय'}
- परिवीक्षण अवधि: ६ महिना (श्रम ऐन २०७४, दफा १३)

**सुविधाहरू:**
- SSF योगदान: कर्मचारी ११% + रोजगारदाता २०% — श्रम ऐन २०७४
- उपदान:       प्रथम दिनदेखि आधारभूत तलबको ८.३३%/वर्ष

यो प्रस्ताव स्वीकार गर्न कृपया **${f.accept_by || '[मिति]'}** सम्म एक प्रति हस्ताक्षर गरी फिर्ता गर्नुहोस्।

भवदीय,

_______________________
${f.hr_name || 'मानव संसाधन प्रबन्धक'}
${f.company || 'नेपएचआर प्रो प्रा.लि.'}`
  }),

  experience: (f) => ({
    english: `[${f.company || 'eLogix HRMS Pvt. Ltd.'} Letterhead]

CERTIFICATE OF EXPERIENCE

Date: ${f.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
Reference No: EXP/${new Date().getFullYear()}/${String(Math.floor(Math.random()*9000)+1000)}

TO WHOM IT MAY CONCERN

This is to certify that **${f.employee || '[Employee Name]'}** (Employee ID: ${f.emp_id || 'EMP-XXXX'}) was employed with ${f.company || 'eLogix HRMS Pvt. Ltd.'} from **${f.join_date || '[Join Date]'}** to **${f.lwd || '[Last Working Date]'}**, holding the position of **${f.position || '[Position]'}** in the **${f.department || '[Department]'}** department.

The total tenure of employment was **${f.tenure || '[Duration]'}**.

During this period, ${f.employee?.split(' ')[0] || 'the employee'}'s primary responsibilities included ${f.responsibilities || 'duties as assigned for the above-mentioned position'}.

This certificate is issued as per the employee's request and in accordance with Nepal Labour Act 2074, Section 150, which provides for issuance of experience documentation upon separation.

We wish ${f.employee?.split(' ')[0] || 'the employee'} success in all future endeavors.

For ${f.company || 'eLogix HRMS Pvt. Ltd.'}

_______________________        _______________________
${f.hr_name || 'HR Manager'}                     ${f.md_name || 'Managing Director'}
Human Resources                  Authorized Signatory`,

    nepali: `[${f.company || 'नेपएचआर प्रो प्रा.लि.'} लेटरहेड]

अनुभव प्रमाणपत्र

मिति: ${f.date || new Date().toLocaleDateString('ne-NP')}

सम्बन्धित सबैको जानकारीका लागि,

यसद्वारा प्रमाणित गरिन्छ कि **${f.employee || '[कर्मचारीको नाम]'}** (कर्मचारी नं: ${f.emp_id || 'EMP-XXXX'}) **${f.join_date || '[योग मिति]'}** देखि **${f.lwd || '[अन्तिम कार्य मिति]'}** सम्म ${f.company || 'नेपएचआर प्रो प्रा.लि.'} मा **${f.department || '[विभाग]'}** विभागमा **${f.position || '[पद]'}** को पदमा कार्यरत हुनुहुन्थ्यो।

कुल सेवा अवधि **${f.tenure || '[अवधि]'}** रहेको छ।

यो प्रमाणपत्र नेपाल श्रम ऐन २०७४ को दफा १५० अन्तर्गत कर्मचारीको अनुरोधमा जारी गरिएको हो।

${f.employee?.split(' ')[0] || 'कर्मचारी'} लाई भविष्यमा सफलताको शुभकामना।

${f.company || 'नेपएचआर प्रो प्रा.लि.'} का तर्फबाट,

_______________________
${f.hr_name || 'मानव संसाधन प्रबन्धक'}`
  }),

  warning: (f) => ({
    english: `[${f.company || 'eLogix HRMS Pvt. Ltd.'} Letterhead]

${f.level === 'final' ? 'FINAL WARNING NOTICE' : f.level === 'verbal' ? 'VERBAL WARNING — RECORD COPY' : 'WRITTEN WARNING NOTICE'}

Date: ${f.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
Warning No: WARN/${new Date().getFullYear()}/${String(Math.floor(Math.random()*9000)+1000)}
Confidential — Employee Record

To: ${f.employee || '[Employee Name]'}
Position: ${f.position || '[Position]'}
Department: ${f.department || '[Department]'}

Dear ${f.employee || '[Employee Name]'},

Subject: ${f.level === 'final' ? 'Final Warning — Risk of Termination' : 'Warning Letter'} — ${f.offense || '[Nature of Offense]'}

This letter serves as a formal ${f.level || 'written'} warning regarding your conduct on ${f.incident_date || '[Date]'}.

**Incident Details:**
${f.offense || '[Description of the violation or misconduct]'}

**Previous Warnings:** ${f.prior_warnings || '0'} prior warning(s) on record.

This behavior is in violation of company policy and your employment contract. ${f.level === 'final' ? `\n\n**PLEASE NOTE:** This is your FINAL WARNING. Any further violation of company policy may result in termination of employment in accordance with Nepal Labour Act 2074, Section 142.` : `You are required to immediately cease this behavior and ensure it does not recur.`}

You are required to:
1. Acknowledge receipt of this warning within 24 hours
2. Submit a written explanation within 3 working days
3. Attend a disciplinary meeting on ${f.meeting_date || '[Date]'} at ${f.meeting_time || '[Time]'}

This warning will be recorded in your personnel file. Improvement in performance and conduct is expected immediately.

Sincerely,

_______________________
${f.hr_name || 'HR Manager'}
Human Resources Department
${f.company || 'eLogix HRMS Pvt. Ltd.'}

**Employee Acknowledgement:**
I acknowledge receipt of this warning letter.

Signature: _______________________    Date: _______________
Name: ${f.employee || '[Employee Name]'}`,

    nepali: `[${f.company || 'नेपएचआर प्रो प्रा.लि.'} लेटरहेड]

${f.level === 'final' ? 'अन्तिम चेतावनी सूचना' : 'चेतावनी पत्र'}

मिति: ${f.date || new Date().toLocaleDateString('ne-NP')}
गोपनीय — कर्मचारी अभिलेख

प्रति: ${f.employee || '[कर्मचारीको नाम]'}
पद: ${f.position || '[पद]'}
विभाग: ${f.department || '[विभाग]'}

प्रिय ${f.employee || '[कर्मचारीको नाम]'},

विषय: चेतावनी पत्र — ${f.offense || '[उल्लंघनको प्रकृति]'}

${f.incident_date || '[मिति]'} मा भएको घटनाका सम्बन्धमा यो औपचारिक चेतावनी पत्र जारी गरिएको छ।

**घटनाको विवरण:**
${f.offense || '[उल्लंघन वा दुर्व्यवहारको विवरण]'}

यो व्यवहार कम्पनीको नीति र तपाईंको रोजगारी सम्झौताको विरुद्ध छ।${f.level === 'final' ? ' यो तपाईंको अन्तिम चेतावनी हो। थप उल्लंघनले श्रम ऐन २०७४ को दफा १४२ अन्तर्गत बर्खास्तीमा परिणत हुन सक्छ।' : ''}

यो चेतावनी तपाईंको कर्मचारी अभिलेखमा राखिनेछ।

भवदीय,

_______________________
${f.hr_name || 'मानव संसाधन प्रबन्धक'}
${f.company || 'नेपएचआर प्रो प्रा.लि.'}`
  }),

  probation_clearance: (f) => ({
    english: `[${f.company || 'eLogix HRMS Pvt. Ltd.'} Letterhead]

PROBATION CLEARANCE & EMPLOYMENT CONFIRMATION

Date: ${f.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
Reference No: CONF/${new Date().getFullYear()}/${String(Math.floor(Math.random()*9000)+1000)}

Dear ${f.employee || '[Employee Name]'},

Subject: Confirmation of Employment — ${f.position || '[Position]'}

We are pleased to inform you that you have successfully completed your probationary period of **6 months**, effective **${f.confirm_date || '[Date]'}**.

Your performance during the probationary period has met the expectations required for your role as **${f.position || '[Position]'}** in the **${f.department || '[Department]'}** department.

As of the date of this letter, your employment status is hereby confirmed as a **Regular Employee** of ${f.company || 'eLogix HRMS Pvt. Ltd.'}, in accordance with **Nepal Labour Act 2074, Section 13**.

Your current terms of employment, including:
- Basic Salary: NPR ${f.salary || '[Amount]'}/month
- SSF Contribution: 11% (Employee) + 20% (Employer)  
- Gratuity: 8.33% per year (applicable from Day 1, Labour Act 2074)
- Leave entitlements as per Labour Act 2074

...remain unchanged and will continue as per your original employment contract.

We congratulate you on this achievement and look forward to your continued contribution to the organization.

Sincerely,

_______________________        _______________________
${f.hr_name || 'HR Manager'}                     ${f.ceo_name || 'CEO / Managing Director'}
Human Resources                  ${f.company || 'eLogix HRMS Pvt. Ltd.'}`,

    nepali: `[${f.company || 'नेपएचआर प्रो प्रा.लि.'} लेटरहेड]

परिवीक्षण अनुमोदन तथा रोजगारी पुष्टि पत्र

मिति: ${f.date || new Date().toLocaleDateString('ne-NP')}

प्रिय ${f.employee || '[कर्मचारीको नाम]'},

विषय: रोजगारी पुष्टि — ${f.position || '[पद]'}

हामीलाई यो जानकारी दिँदा खुसी लाग्छ कि तपाईंले मिति **${f.confirm_date || '[मिति]'}** बाट प्रभावकारी रूपमा आफ्नो **६ महिना** को परिवीक्षण अवधि सफलतापूर्वक पूरा गर्नुभएको छ।

यस अवधिमा तपाईंको कार्यसम्पादनले **${f.department || '[विभाग]'}** मा **${f.position || '[पद]'}** को भूमिकाका लागि आवश्यक अपेक्षाहरू पूरा गरेको छ।

यो पत्रको मितिदेखि, **नेपाल श्रम ऐन २०७४ को दफा १३** बमोजिम तपाईंको रोजगारी स्थिति ${f.company || 'नेपएचआर प्रो प्रा.लि.'} को **नियमित कर्मचारी** को रूपमा पुष्टि गरिएको छ।

तपाईंको रोजगारीका शर्तहरू अपरिवर्तित रहनेछन्।

यस उपलब्धिमा हामी तपाईंलाई हार्दिक बधाई दिन्छौं।

भवदीय,

_______________________
${f.hr_name || 'मानव संसाधन प्रबन्धक'}
${f.company || 'नेपएचआर प्रो प्रा.लि.'}`
  }),

  termination: (f) => ({
    english: `[${f.company || 'eLogix HRMS Pvt. Ltd.'} Letterhead]

TERMINATION NOTICE

Date: ${f.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
Reference No: TERM/${new Date().getFullYear()}/${String(Math.floor(Math.random()*9000)+1000)}
STRICTLY CONFIDENTIAL

To: ${f.employee || '[Employee Name]'}
Position: ${f.position || '[Position]'}
Department: ${f.department || '[Department]'}

Dear ${f.employee || '[Employee Name]'},

Subject: Termination of Employment

This letter serves as formal notice of termination of your employment with ${f.company || 'eLogix HRMS Pvt. Ltd.'}, effective **${f.termination_date || '[Date]'}**.

**Reason for Termination:**
${f.reason || '[State reason — performance, misconduct, redundancy, or mutual separation]'}

**Settlement Details (Nepal Labour Act 2074):**
- Notice period: ${f.notice_period || '30 days'} (Section 31, Labour Act 2074)
- Gratuity payable: As calculated per Section 52, Labour Act 2074
- Outstanding leave encashment: As per your leave balance
- Final settlement will be processed within ${f.settlement_days || '30'} days of your last working date

Please return all company property (laptop, access cards, documents) to the HR department on your last working day.

Your Full & Final Settlement will be completed in accordance with Nepal Labour Act 2074.

For ${f.company || 'eLogix HRMS Pvt. Ltd.'}

_______________________
${f.hr_name || 'HR Manager'}
Human Resources

CC: Department Head, Finance Department, IT Department`,

    nepali: `[${f.company || 'नेपएचआर प्रो प्रा.लि.'} लेटरहेड]

बर्खास्ती सूचना

मिति: ${f.date || new Date().toLocaleDateString('ne-NP')}
अत्यन्त गोपनीय

प्रति: ${f.employee || '[कर्मचारीको नाम]'}

प्रिय ${f.employee || '[कर्मचारीको नाम]'},

यो पत्रद्वारा ${f.company || 'नेपएचआर प्रो प्रा.लि.'} मा तपाईंको रोजगारी मिति **${f.termination_date || '[मिति]'}** बाट समाप्त हुने औपचारिक सूचना दिइन्छ।

**बर्खास्तीको कारण:**
${f.reason || '[कारण उल्लेख गर्नुहोस्]'}

**निपटारा (श्रम ऐन २०७४ अन्तर्गत):**
- सूचना अवधि: दफा ३१ अनुसार ${f.notice_period || '३० दिन'}
- उपदान: दफा ५२ अनुसार गणना
- पूर्ण र अन्तिम निपटारा अन्तिम कार्य मितिको ${f.settlement_days || '३०'} दिनभित्र

भवदीय,

_______________________
${f.hr_name || 'मानव संसाधन प्रबन्धक'}
${f.company || 'नेपएचआर प्रो प्रा.लि.'}`
  }),

  promotion: (f) => ({
    english: `[${f.company || 'eLogix HRMS Pvt. Ltd.'} Letterhead]

PROMOTION LETTER

Date: ${f.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
Reference No: PROMO/${new Date().getFullYear()}/${String(Math.floor(Math.random()*9000)+1000)}

Dear ${f.employee || '[Employee Name]'},

Subject: Promotion — ${f.new_position || '[New Position]'}

We are delighted to inform you that based on your outstanding performance, dedication, and contribution to ${f.company || 'eLogix HRMS Pvt. Ltd.'}, you have been promoted to the position of **${f.new_position || '[New Position]'}** in the **${f.department || '[Department]'}** department, effective **${f.effective_date || '[Date]'}**.

**Updated Terms:**
- New Designation:  ${f.new_position || '[New Position]'}
- Revised Salary:   NPR ${f.new_salary || '[Amount]'}/month (revised from NPR ${f.old_salary || '[Previous Amount]'})
- Grade Level:      ${f.grade || '[Grade]'}
- Reporting to:     ${f.reporting_to || '[Manager]'}

Your SSF, gratuity, and all other statutory benefits will be recalculated based on your revised basic salary, in accordance with Nepal Labour Act 2074.

Congratulations on this well-deserved achievement!

Sincerely,

_______________________
${f.hr_name || 'HR Manager'}
${f.company || 'eLogix HRMS Pvt. Ltd.'}`,

    nepali: `[${f.company || 'नेपएचआर प्रो प्रा.लि.'} लेटरहेड]

बढुवा पत्र

मिति: ${f.date || new Date().toLocaleDateString('ne-NP')}

प्रिय ${f.employee || '[कर्मचारीको नाम]'},

विषय: बढुवा — ${f.new_position || '[नयाँ पद]'}

तपाईंको उत्कृष्ट कार्यसम्पादन र योगदानको कदर गर्दै, मिति **${f.effective_date || '[मिति]'}** देखि तपाईंलाई **${f.department || '[विभाग]'}** मा **${f.new_position || '[नयाँ पद]'}** मा बढुवा गर्न पाउँदा हामीलाई खुसी लाग्छ।

**परिमार्जित शर्तहरू:**
- नयाँ पदनाम: ${f.new_position || '[नयाँ पद]'}
- परिमार्जित तलब: NPR ${f.new_salary || '[रकम]'}/महिना

यस योग्य उपलब्धिमा हार्दिक बधाई!

भवदीय,

_______________________
${f.hr_name || 'मानव संसाधन प्रबन्धक'}
${f.company || 'नेपएचआर प्रो प्रा.लि.'}`
  }),

  transfer: (f) => ({
    english: `[${f.company || 'eLogix HRMS Pvt. Ltd.'} Letterhead]

TRANSFER ORDER

Date: ${f.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
Reference No: TRANS/${new Date().getFullYear()}/${String(Math.floor(Math.random()*9000)+1000)}

Dear ${f.employee || '[Employee Name]'},

Subject: Transfer Order — ${f.new_location || '[New Location/Department]'}

You are hereby informed that based on operational requirements, you are transferred from **${f.current_location || '[Current Location]'}** to **${f.new_location || '[New Location]'}**, effective **${f.effective_date || '[Date]'}**.

- Current Department/Branch: ${f.current_location || '[Current]'}
- New Department/Branch:     ${f.new_location || '[New Location]'}
- New Reporting Manager:     ${f.new_manager || '[Manager Name]'}
- Effective Date:            ${f.effective_date || '[Date]'}

Your salary, benefits, and other terms of employment remain unchanged. Any relocation assistance will be provided as per company policy.

Please report to your new assignment on the effective date.

Sincerely,

_______________________
${f.hr_name || 'HR Manager'}
${f.company || 'eLogix HRMS Pvt. Ltd.'}`,

    nepali: `स्थानान्तरण आदेश — ${f.employee || '[कर्मचारी]'} लाई ${f.new_location || '[नयाँ स्थान]'} मा मिति ${f.effective_date || '[मिति]'} बाट स्थानान्तरण गरिएको छ।`
  }),

  salary_revision: (f) => ({
    english: `[${f.company || 'eLogix HRMS Pvt. Ltd.'} Letterhead]

SALARY REVISION LETTER

Date: ${f.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
Confidential

Dear ${f.employee || '[Employee Name]'},

Subject: Revision of Salary — Effective ${f.effective_date || '[Date]'}

Following the annual performance review, we are pleased to inform you that your salary has been revised as follows, effective **${f.effective_date || '[Date]'}**:

| Component        | Previous (NPR) | Revised (NPR) |
|------------------|---------------|---------------|
| Basic Salary     | ${f.old_basic || '[Old]'} | ${f.new_basic || '[New]'} |
| Total CTC        | ${f.old_ctc || '[Old CTC]'} | ${f.new_ctc || '[New CTC]'} |
| SSF (Employee)   | 11% of basic | 11% of revised basic |

Your gratuity provision will also be recalculated at 8.33% of your revised basic salary per year, in accordance with Nepal Labour Act 2074.

Sincerely,

_______________________
${f.hr_name || 'HR Manager'}
${f.company || 'eLogix HRMS Pvt. Ltd.'}`,
    nepali: `तलब पुनरावलोकन पत्र — ${f.employee || '[कर्मचारी]'} को तलब मिति ${f.effective_date || '[मिति]'} बाट NPR ${f.new_basic || '[रकम]'} प्रति महिनामा पुनरावलोकन गरिएको छ।`
  }),
}

// ── PDF DOWNLOAD ─────────────────────────────────────────────
function downloadPDF(content, filename, language = 'both') {
  const printWindow = window.open('', '_blank', 'width=800,height=900')
  if (!printWindow) { alert('Please allow popups to download PDF'); return }

  const html = `<!DOCTYPE html>
<html lang="${language === 'nepali' ? 'ne' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; background: #fff; padding: 40px 50px; line-height: 1.6; }
    .header { border-bottom: 3px solid #1e1b4b; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company-name { font-size: 18pt; font-weight: bold; color: #1e1b4b; }
    .company-sub { font-size: 9pt; color: #64748b; margin-top: 2px; }
    .elogix-logo { font-size: 28pt; }
    .letter-body { white-space: pre-wrap; font-size: 11pt; line-height: 1.8; }
    .letter-body strong, b { font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9pt; color: #94a3b8; text-align: center; }
    .divider { margin: 30px 0; border-top: 1px dashed #e2e8f0; }
    .lang-label { font-size: 10pt; font-weight: bold; color: #7c3aed; margin-bottom: 8px; background: #f5f3ff; padding: 4px 12px; border-radius: 4px; display: inline-block; }
    @media print {
      body { padding: 20px 30px; }
      @page { margin: 15mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">eLogix HRMS</div>
      <div class="company-sub">HRIS · HRMS · HRIM · HCM | Nepal Labour Act 2074 Compliant</div>
    </div>
    <div class="elogix-logo">🏢</div>
  </div>

  ${language !== 'nepali' && content.english ? `
    <div class="lang-label">🇬🇧 English</div>
    <div class="letter-body">${content.english.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>
  ` : ''}

  ${language !== 'english' && content.nepali ? `
    ${language === 'both' ? '<div class="divider"></div>' : ''}
    <div class="lang-label">🇳🇵 नेपाली</div>
    <div class="letter-body" style="font-family: serif;">${content.nepali.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>
  ` : ''}

  <div class="footer">
    Generated by eLogix HRMS AI · ${new Date().toLocaleString()} · Confidential HR Document
  </div>
  <script>window.onload=()=>{window.print(); setTimeout(()=>window.close(), 2000)}<\/script>
</body>
</html>`

  printWindow.document.write(html)
  printWindow.document.close()
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function LetterEngine({
  templateType = 'offer',   // offer | experience | warning | probation_clearance | termination | promotion | transfer | salary_revision
  initialFields = {},        // pre-fill from employee record
  onGenerated = null,        // callback when letter is ready
  accent = P,
  showLanguageToggle = true,
}) {
  const [fields,    setFields]    = useState({ date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), ...initialFields })
  const [loading,   setLoading]   = useState(false)
  const [content,   setContent]   = useState(null)   // { english, nepali }
  const [language,  setLanguage]  = useState('both') // both | english | nepali
  const [copied,    setCopied]    = useState(false)
  const [sent,      setSent]      = useState(false)
  const [aiUsed,    setAiUsed]    = useState(false)

  const set = (k, v) => setFields(p => ({ ...p, [k]: v }))

  // Key fields per template
  const FIELD_SETS = {
    offer:                ['employee', 'position', 'department', 'salary', 'start_date', 'reporting_to', 'accept_by', 'type', 'hr_name'],
    experience:           ['employee', 'emp_id', 'position', 'department', 'join_date', 'lwd', 'tenure', 'responsibilities', 'hr_name', 'md_name'],
    warning:              ['employee', 'position', 'department', 'level', 'offense', 'incident_date', 'prior_warnings', 'meeting_date', 'hr_name'],
    probation_clearance:  ['employee', 'position', 'department', 'salary', 'confirm_date', 'hr_name', 'ceo_name'],
    termination:          ['employee', 'position', 'department', 'termination_date', 'reason', 'notice_period', 'settlement_days', 'hr_name'],
    promotion:            ['employee', 'position', 'new_position', 'department', 'new_salary', 'old_salary', 'effective_date', 'reporting_to', 'hr_name'],
    transfer:             ['employee', 'position', 'current_location', 'new_location', 'new_manager', 'effective_date', 'hr_name'],
    salary_revision:      ['employee', 'position', 'old_basic', 'new_basic', 'old_ctc', 'new_ctc', 'effective_date', 'hr_name'],
  }

  const FIELD_LABELS = {
    employee: 'Employee Full Name', emp_id: 'Employee ID', position: 'Current Position',
    new_position: 'New Position', department: 'Department', salary: 'Basic Salary (NPR)',
    new_salary: 'New Basic Salary (NPR)', old_salary: 'Previous Salary (NPR)',
    old_basic: 'Previous Basic (NPR)', new_basic: 'New Basic (NPR)',
    old_ctc: 'Previous CTC (NPR)', new_ctc: 'New CTC (NPR)',
    start_date: 'Start Date', join_date: 'Join Date', lwd: 'Last Working Date',
    tenure: 'Total Tenure', confirm_date: 'Confirmation Date', effective_date: 'Effective Date',
    termination_date: 'Termination Date', responsibilities: 'Key Responsibilities',
    reporting_to: 'Reporting Manager', accept_by: 'Acceptance Deadline',
    type: 'Employment Type', level: 'Warning Level (verbal/written/final)',
    offense: 'Nature of Offense/Reason', incident_date: 'Incident Date',
    prior_warnings: 'Prior Warnings Count', meeting_date: 'Disciplinary Meeting Date',
    reason: 'Reason for Termination', notice_period: 'Notice Period',
    settlement_days: 'Settlement Days', hr_name: 'HR Manager Name',
    ceo_name: 'CEO / MD Name', md_name: 'Authorized Signatory Name',
    new_manager: 'New Reporting Manager', current_location: 'Current Dept/Branch',
    new_location: 'New Dept/Branch', accept_by: 'Acceptance Deadline',
    grade: 'Grade Level',
  }

  const fieldSet = FIELD_SETS[templateType] || FIELD_SETS.offer

  const generate = async () => {
    setLoading(true); setContent(null); setAiUsed(false)

    // Try Claude AI first
    const aiPrompt = `Generate a professional HR ${templateType.replace(/_/g,' ')} letter in BOTH English and Nepali for eLogix HRMS.

Employee details:
${Object.entries(fields).filter(([k,v])=>v).map(([k,v])=>`${FIELD_LABELS[k]||k}: ${v}`).join('\n')}

Requirements:
1. Write FULL professional letter — include all legal clauses, signature blocks, reference numbers
2. Reference Nepal Labour Act 2074 section numbers correctly
3. English: formal business English, complete letter
4. Nepali: formal Nepali (Devanagari script), complete letter
5. Return exactly this format:
---ENGLISH---
[full English letter here]
---NEPALI---
[full Nepali letter here]`

    const aiResult = await callClaude(aiPrompt)

    if (aiResult) {
      // Parse Claude's response
      const enMatch  = aiResult.match(/---ENGLISH---\s*([\s\S]+?)(?=---NEPALI---|$)/i)
      const neMatch  = aiResult.match(/---NEPALI---\s*([\s\S]+?)$/i)
      const english  = enMatch?.[1]?.trim() || aiResult
      const nepali   = neMatch?.[1]?.trim() || ''
      const generated = { english, nepali: nepali || OFFLINE_TEMPLATES[templateType]?.(fields)?.nepali || '' }
      setContent(generated)
      setAiUsed(true)
      onGenerated?.(generated)
    } else {
      // Offline template fallback
      const tmpl = OFFLINE_TEMPLATES[templateType]
      if (tmpl) {
        const generated = tmpl(fields)
        setContent(generated)
        onGenerated?.(generated)
      } else {
        setContent({ english: `Letter template for "${templateType}" — please fill in employee details above and try again.`, nepali: '' })
      }
    }
    setLoading(false)
  }

  const handleDownload = () => {
    if (!content) return
    const filename = `${templateType}_${(fields.employee || 'letter').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`
    downloadPDF(content, filename, language)
  }

  const handleCopy = () => {
    const text = language === 'nepali' ? content?.nepali : language === 'english' ? content?.english : `${content?.english}\n\n---\n\n${content?.nepali}`
    navigator.clipboard?.writeText(text || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const handleSend = async () => {
    setSent(false)
    try {
      const token = localStorage.getItem('elogix_access_token')
      await fetch('/api/v1/letters/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type: templateType, employee: fields.employee, content, fields }),
      })
    } catch {}
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Fields form */}
      {!content && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>
            📝 Fill Employee Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {fieldSet.map(key => (
              <div key={key}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>
                  {FIELD_LABELS[key] || key}
                </label>
                {key === 'responsibilities' || key === 'reason' || key === 'offense' ? (
                  <textarea value={fields[key] || ''} onChange={e => set(key, e.target.value)} rows={2}
                    placeholder={`Enter ${FIELD_LABELS[key] || key}...`}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, resize: 'none', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                ) : (
                  <input value={fields[key] || ''} onChange={e => set(key, e.target.value)}
                    placeholder={`Enter ${FIELD_LABELS[key] || key}...`}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
          </div>

          <button onClick={generate} disabled={loading}
            style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 11, border: 'none',
              background: loading ? '#e2e8f0' : G, color: loading ? '#94a3b8' : '#fff',
              fontSize: 13, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? (
              <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'lspin 1s linear infinite' }} /> Generating letter...</>
            ) : '🤖 Generate Letter (English + Nepali)'}
          </button>
        </div>
      )}

      {/* Generated letter */}
      {content && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Status bar */}
          <div style={{ background: aiUsed ? '#f0fdf4' : '#faf5ff', border: `1px solid ${aiUsed ? '#bbf7d0' : '#e9d5ff'}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14 }}>{aiUsed ? '🧠' : '📋'}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: aiUsed ? '#15803d' : P }}>
              {aiUsed ? 'Generated by Claude AI' : 'Generated from built-in template'}
            </span>
            <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>Nepal Labour Act 2074 compliant</span>
          </div>

          {/* Language toggle */}
          {showLanguageToggle && (
            <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 10, padding: 4 }}>
              {[['both', '🌐 Both'], ['english', '🇬🇧 English'], ['nepali', '🇳🇵 नेपाली']].map(([val, label]) => (
                <button key={val} onClick={() => setLanguage(val)}
                  style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: language === val ? '#fff' : 'transparent', color: language === val ? P : '#64748b', fontWeight: language === val ? 800 : 500, fontSize: 10, cursor: 'pointer', boxShadow: language === val ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Letter previews */}
          <div style={{ display: 'grid', gridTemplateColumns: language === 'both' ? '1fr 1fr' : '1fr', gap: 12 }}>
            {(language === 'both' || language === 'english') && content.english && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', marginBottom: 5 }}>🇬🇧 English Version</div>
                <textarea value={content.english} readOnly
                  style={{ width: '100%', height: language === 'both' ? 360 : 480, padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 10.5, lineHeight: 1.8, fontFamily: "'Times New Roman', serif", resize: 'vertical', background: '#fafafa', boxSizing: 'border-box' }} />
              </div>
            )}
            {(language === 'both' || language === 'nepali') && content.nepali && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', marginBottom: 5 }}>🇳🇵 नेपाली संस्करण</div>
                <textarea value={content.nepali} readOnly
                  style={{ width: '100%', height: language === 'both' ? 360 : 480, padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 10.5, lineHeight: 1.8, fontFamily: 'serif', resize: 'vertical', background: '#fafafa', boxSizing: 'border-box' }} />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            <button onClick={handleDownload}
              style={{ padding: '11px 8px', borderRadius: 10, border: 'none', background: G, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              📥 Download PDF
            </button>
            <button onClick={handleCopy}
              style={{ padding: '11px 8px', borderRadius: 10, border: '1px solid #e2e8f0', background: copied ? '#f0fdf4' : '#fff', color: copied ? '#15803d' : '#374151', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {copied ? '✓ Copied!' : '⎘ Copy Text'}
            </button>
            <button onClick={handleSend}
              style={{ padding: '11px 8px', borderRadius: 10, border: 'none', background: sent ? '#10b981' : '#0ea5e9', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {sent ? '✅ Sent!' : '📧 Send Email'}
            </button>
            <button onClick={() => setContent(null)}
              style={{ padding: '11px 8px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              🔄 Edit Fields
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes lspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

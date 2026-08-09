# SERVICE LEVEL AGREEMENT (SLA)
## NepHR Pro Platform
**Version:** 1.0 | **Effective Date:** June 11, 2026

---

## 1. SERVICE AVAILABILITY COMMITMENTS

| Plan | Monthly Uptime SLA | Max Downtime/Month |
|---|---|---|
| Starter | 99.5% | 3.6 hours |
| Professional | 99.9% | 43.8 minutes |
| Enterprise | 99.97% | 13.1 minutes |

**Measurement:** Uptime is measured monthly, excluding scheduled maintenance.
**Monitoring:** 24/7 automated monitoring with real-time status at status.nephrpro.com

---

## 2. SCHEDULED MAINTENANCE

- Maintenance windows: Sundays 02:00–06:00 UTC (Nepal: 07:45–11:45 NST)
- Advance notice: 48 hours minimum for planned maintenance
- Emergency maintenance: As soon as practicable notice via email + in-app

---

## 3. INCIDENT RESPONSE TIMES

| Severity | Definition | Initial Response | Resolution Target |
|---|---|---|---|
| P1 — Critical | Platform completely unavailable | 15 minutes | 4 hours |
| P2 — High | Core feature unavailable (payroll, attendance) | 1 hour | 8 hours |
| P3 — Medium | Non-critical feature impaired | 4 hours | 24 hours |
| P4 — Low | Minor issues, cosmetic bugs | 24 hours | 72 hours |

---

## 4. SUPPORT CHANNELS

| Plan | Email | Live Chat | Phone | Dedicated CSM |
|---|---|---|---|---|
| Starter | ✅ | ❌ | ❌ | ❌ |
| Professional | ✅ | ✅ | ❌ | ❌ |
| Enterprise | ✅ | ✅ | ✅ | ✅ |

---

## 5. SLA CREDITS

If uptime falls below SLA:
| Uptime Achieved | Credit (% of Monthly Fee) |
|---|---|
| 99.0% – SLA threshold | 10% |
| 95.0% – 99.0% | 25% |
| Below 95.0% | 50% |

Credits must be requested within 30 days of the incident.
Maximum credit per month: 50% of monthly subscription fee.

---

## 6. EXCLUSIONS FROM SLA

The following are NOT counted against uptime:
- Scheduled maintenance (with 48hr notice)
- Force majeure events (natural disasters, war, pandemic)
- Issues caused by Client's actions or integrations
- Third-party service outages beyond our control
- DDoS attacks (best-effort mitigation)

---

## 7. DATA BACKUP POLICY

| Data Type | Backup Frequency | Retention | RTO | RPO |
|---|---|---|---|---|
| Employee records | Every 6 hours | 30 days | 4 hours | 6 hours |
| Payroll data | Daily | 90 days | 4 hours | 24 hours |
| System configuration | Daily | 30 days | 2 hours | 24 hours |
| Full database snapshot | Weekly | 12 months | 8 hours | 7 days |

**RTO** = Recovery Time Objective | **RPO** = Recovery Point Objective

---
---

# DATA RETENTION POLICY
## NepHR Pro Platform
**Version:** 1.0 | **Effective Date:** June 11, 2026

---

## PURPOSE

This policy defines how long NepHR Pro retains different categories of personal data, in compliance with Nepal Labour Act 2017, GDPR, UK GDPR, DPDP Act 2023, and other applicable regulations.

---

## RETENTION SCHEDULE

### Employee Personal Data
| Data Category | Retention Period | Legal Basis |
|---|---|---|
| Employment contracts | Duration + 7 years | Labour law |
| Payroll records | Duration + 7 years | Tax law (Nepal IRD, UK HMRC, India IT Act) |
| Tax records | Duration + 7 years | Tax compliance |
| Leave records | Duration + 3 years | Labour Act |
| Attendance records | Duration + 3 years | Labour Act |
| Performance appraisals | Duration + 5 years | Legitimate interest |
| Disciplinary records | Duration + 5 years | Legal defence |
| Training certificates | Duration + 5 years | Professional compliance |
| Medical/health records | Duration + 7 years | Health & Safety law |
| Biometric data (fingerprint) | Employment only | Explicit consent |
| Bank account details | Duration + 7 years | Financial compliance |
| Emergency contacts | Duration of employment | Contractual |

### Recruitment Data
| Data Category | Retention Period | Legal Basis |
|---|---|---|
| Successful candidate files | Convert to employee record | N/A |
| Unsuccessful candidate CVs | 2 years | Legitimate interest |
| Interview notes | 2 years | Legal defence |
| Background check results | 2 years | Legal requirement |

### System & Security Data
| Data Category | Retention Period | Legal Basis |
|---|---|---|
| Access/audit logs | 3 years | Security compliance |
| Security incident logs | 5 years | ISO 27001 / SOC 2 |
| VAPT reports | 5 years | Security compliance |
| Support ticket records | 3 years | Service improvement |

### AI & Analytics Data
| Data Category | Retention Period | Legal Basis |
|---|---|---|
| Anonymized usage statistics | 3 years | Product improvement |
| AI model training data (anonymized) | 3 years | Product development |
| Individual AI predictions | 1 year | Legitimate interest |

---

## DELETION PROCEDURES

On reaching retention expiry:
1. **Automated deletion** — system flags and schedules deletion
2. **Soft delete** — data marked deleted, hidden from UI
3. **Hard delete** — permanent deletion from all storage
4. **Backup purge** — removed from all backups within 90 days
5. **Certificate** — deletion certificate available on request

### Right to Erasure (GDPR)
Upon receiving a valid erasure request:
- Acknowledge within **72 hours**
- Complete deletion within **30 days**
- Provide confirmation to requestor
- Exceptions: where retention is legally required (payroll, tax)

---

## COUNTRY-SPECIFIC REQUIREMENTS

| Country | Payroll Retention | Tax Records | Labor Records |
|---|---|---|---|
| Nepal | 7 years | 7 years (IRD) | 5 years |
| India | 8 years | 8 years (IT Act) | 5 years |
| UK | 6 years | 6 years (HMRC) | 6 years |
| EU | 6 years (varies) | 10 years | 5 years |
| USA | 4 years (FLSA) | 7 years (IRS) | 3 years |
| Australia | 7 years | 5 years (ATO) | 7 years |

---
---

# INCIDENT RESPONSE PLAN
## NepHR Pro — Security & Data Breach Response
**Version:** 1.0 | **Effective Date:** June 11, 2026
**Classification:** CONFIDENTIAL — Internal Use Only

---

## PURPOSE

This plan defines NepHR Pro's procedures for detecting, responding to, and recovering from security incidents and personal data breaches, in compliance with:
- GDPR Article 33 & 34 (72-hour notification)
- UK GDPR Article 33
- Nepal Privacy Act 2018
- ISO/IEC 27001 Annex A.16
- SOC 2 Availability & Security criteria

---

## INCIDENT CLASSIFICATION

| Level | Type | Examples |
|---|---|---|
| P1 — Critical | Data breach with confirmed PII exposure | Unauthorized DB access, bulk data export |
| P2 — High | Suspected breach or system compromise | Suspicious login patterns, malware detected |
| P3 — Medium | Security vulnerability discovered | VAPT finding, unpatched CVE |
| P4 — Low | Policy violation, minor incident | Single unauthorized access attempt |

---

## RESPONSE TEAM

| Role | Responsibility | Contact |
|---|---|---|
| Incident Commander | Overall response coordination | CEO / CTO |
| Security Lead | Technical investigation | security@nephrpro.com |
| DPO (Data Protection Officer) | Privacy compliance | dpo@nephrpro.com |
| Legal Counsel | Legal obligations, notifications | legal@nephrpro.com |
| Communications Lead | Client & public communications | comms@nephrpro.com |

---

## RESPONSE PHASES

### Phase 1: DETECT & IDENTIFY (0–1 hour)
- [ ] Automated monitoring alerts triggered
- [ ] Security team acknowledges alert within 15 minutes (P1)
- [ ] Initial triage: Is this a real incident?
- [ ] Classify severity level
- [ ] Notify Incident Commander

### Phase 2: CONTAIN (1–4 hours)
- [ ] Isolate affected systems
- [ ] Preserve evidence (logs, forensic images)
- [ ] Block unauthorized access vectors
- [ ] Assess scope: how many tenants/data subjects affected?
- [ ] Determine if personal data was exposed

### Phase 3: ASSESS LEGAL OBLIGATIONS (4–24 hours)
- [ ] DPO assesses if this is a **notifiable breach** under GDPR
- [ ] If notifiable: prepare supervisory authority notification
- [ ] Determine if data subjects must be notified
- [ ] Document all findings

### Phase 4: NOTIFY (within 72 hours of discovery — GDPR)
**Supervisory Authorities to notify if required:**
- 🇪🇺 EU: Relevant National DPA
- 🇬🇧 UK: ICO — report.ico.org.uk (within 72 hours)
- 🇮🇳 India: Data Protection Board (when operational)
- 🇦🇺 Australia: OAIC — notifiable data breach scheme

**Client notification includes:**
- Nature of breach
- Categories and number of data subjects
- Likely consequences
- Measures taken/proposed
- Contact point for more information

### Phase 5: ERADICATE & RECOVER (1–7 days)
- [ ] Remove malware or unauthorized access
- [ ] Patch exploited vulnerabilities
- [ ] Restore from clean backups if needed
- [ ] Verify systems are clean
- [ ] Restore normal operations

### Phase 6: POST-INCIDENT REVIEW (within 30 days)
- [ ] Full incident post-mortem
- [ ] Root cause analysis
- [ ] Lessons learned documentation
- [ ] Update security controls
- [ ] Update this response plan if needed
- [ ] VAPT re-assessment if required

---

## COMMUNICATION TEMPLATES

### Client Notification Template:
```
Subject: Important Security Notice — NepHR Pro

Dear [Client Name],

We are writing to inform you that NepHR Pro detected a security incident on [DATE] at [TIME] UTC.

Nature of incident: [DESCRIPTION]
Data potentially affected: [CATEGORIES]
Estimated number of affected individuals: [NUMBER]
Discovery date: [DATE]

Immediate actions we have taken:
1. [ACTION 1]
2. [ACTION 2]

We are continuing to investigate and will provide updates every [FREQUENCY].

If you have questions, please contact: security@nephrpro.com

[Signature]
```

---
---

# SUB-PROCESSOR LIST
## NepHR Pro — GDPR Article 28 Compliant
**Version:** 1.0 | **Last Updated:** June 11, 2026

---

Clients who have signed a Data Processing Agreement with NepHR Pro are entitled to this list under GDPR Article 28(4).

| # | Sub-Processor | Purpose | Data Types | Location | Safeguard |
|---|---|---|---|---|---|
| 1 | Amazon Web Services (AWS) | Cloud infrastructure, storage | All HR data | Region-specific (selectable) | SCCs, AWS DPA, ISO 27001 |
| 2 | Anthropic, PBC | AI assistant (Claude API) | Anonymized queries only | USA | SCCs, DPA |
| 3 | SendGrid / SES | Email notifications | Name, email | USA/EU | SCCs, DPA |
| 4 | Stripe (or equiv.) | Subscription billing | Name, card (tokenized) | USA | PCI DSS, DPA |
| 5 | Cloudflare | DDoS protection, CDN | IP addresses, metadata | USA/EU | DPA, Privacy Shield successor |
| 6 | Sentry / DataDog | Error monitoring | Anonymized error logs | USA | DPA, data minimization |

---

## NOTES:
- No sub-processor has access to **raw employee PII** except AWS (hosting)
- AI API (Anthropic) receives **anonymized queries only** — no employee names/IDs
- Clients will be notified **30 days in advance** of any changes to this list
- All sub-processors are bound by **equivalent data protection obligations**

---
---

# COOKIE POLICY
## NepHR Pro Platform
**Version:** 1.0 | **Effective Date:** June 11, 2026

---

## WHAT ARE COOKIES?

Cookies are small text files stored on your device when you access NepHR Pro. We use cookies to make the platform function correctly and securely.

---

## COOKIES WE USE

### 1. Essential Cookies (Always Active)
These are required for the platform to function. They cannot be disabled.

| Cookie Name | Purpose | Duration |
|---|---|---|
| `nephr_session` | Maintains your login session | Session |
| `nephr_csrf` | Prevents cross-site request forgery attacks | Session |
| `nephr_tenant` | Identifies your organization's tenant | Session |
| `nephr_role` | Stores your current role/persona | Session |

### 2. Functional Cookies (Opt-in)
These remember your preferences.

| Cookie Name | Purpose | Duration |
|---|---|---|
| `nephr_lang` | Stores language preference | 1 year |
| `nephr_currency` | Stores currency preference | 1 year |
| `nephr_theme` | Stores dark/light mode preference | 1 year |
| `nephr_sidebar` | Stores sidebar state | 1 year |

### 3. Analytics Cookies (Opt-in)
These help us understand how the platform is used. Data is **fully anonymized**.

| Cookie Name | Purpose | Duration |
|---|---|---|
| `nephr_analytics` | Anonymized feature usage | 1 year |
| `nephr_perf` | Performance monitoring | 30 days |

### 4. Advertising/Tracking Cookies
**We do NOT use advertising or third-party tracking cookies.**

---

## YOUR CHOICES

You can manage cookies via:
- **Cookie Settings** — available in the platform footer
- **Browser settings** — block or delete cookies in your browser

**Note:** Disabling essential cookies will prevent platform access.

---

## UPDATES

We will notify you of material changes to this Cookie Policy via in-app notification.

---
---

# AI TRANSPARENCY STATEMENT
## NepHR Pro — EU AI Act & Responsible AI Compliance
**Version:** 1.0 | **Effective Date:** June 11, 2026

---

## OUR COMMITMENT TO RESPONSIBLE AI

NepHR Pro is committed to transparent, fair, and accountable use of Artificial Intelligence in HR management. This statement explains how our AI works, its limitations, and your rights.

---

## AI FEATURES & THEIR PURPOSE

| AI Feature | Purpose | Risk Level | Accuracy |
|---|---|---|---|
| Attrition Prediction | Identify employees at risk of leaving | HIGH-RISK* | 87.3% |
| Salary Recommendation | Market-based compensation benchmarking | MEDIUM | 91.2% |
| Resume Screening | Initial candidate matching | HIGH-RISK* | 84.6% |
| Performance Forecasting | Quarterly performance trend analysis | MEDIUM | 76.4% |
| Leave Pattern Detection | Seasonal absence forecasting | LOW | 79.8% |
| Sentiment Analysis | Employee engagement signals | MEDIUM | 82.1% |

*HIGH-RISK: These features may influence employment-related decisions and are subject to mandatory human review.

---

## HOW OUR AI WORKS

### Data Sources
- Anonymized, aggregated historical HR data
- Industry benchmarks (no individual employee data used for training)
- Public labor market data

### Training Process
- Models are retrained monthly with fresh anonymized data
- Training data is audited for bias before each training run
- Models undergo accuracy validation before deployment
- No individual employee's identifiable data is used in model training

### What AI Does NOT Do
- Make final employment decisions autonomously
- Access competitor or third-party employee data
- Process data beyond its stated purpose
- Store conversation data from AI chatbot (session-only)

---

## HUMAN OVERSIGHT — MANDATORY

**All AI-influenced decisions require human review:**

| Decision Type | AI Role | Human Role |
|---|---|---|
| Employee termination | Risk signal only | Manager + HR required |
| Promotion/demotion | Performance indicator | Manager + HR required |
| Salary changes | Market benchmark | HR approval required |
| Hiring decisions | Initial screening only | HR + Hiring manager required |
| Performance rating | Data analysis only | Manager decides |

**NepHR Pro prohibits fully automated employment decisions.** Our platform is designed so AI can never take action without human confirmation.

---

## YOUR RIGHTS REGARDING AI

Under GDPR Article 22, EU AI Act, and our responsible AI policy:

✅ **Right to explanation** — request explanation of any AI recommendation
✅ **Right to human review** — any AI-influenced decision can be reviewed by a human
✅ **Right to contest** — challenge AI-generated assessments
✅ **Right to opt out** — disable AI profiling for specific employees
✅ **Right to transparency** — access this AI Transparency Statement at any time

To exercise these rights: privacy@nephrpro.com

---

## BIAS MONITORING

We actively monitor our AI models for discrimination:
- Monthly bias audits across gender, age, nationality, ethnicity
- Protected characteristics are NEVER used as model features
- Any bias detected triggers immediate model review
- Bias audit results available to enterprise clients on request

---

## EU AI ACT COMPLIANCE STATUS

| Requirement | Status |
|---|---|
| High-risk AI system registration | In Progress |
| Technical documentation | Complete |
| Human oversight measures | Implemented ✅ |
| Transparency to users | This document ✅ |
| Accuracy metrics published | ✅ (see table above) |
| Bias assessment | Monthly ✅ |
| Conformity assessment | Planned Q3 2026 |
| CE Mark (if required) | Planned 2027 |

---

## CONTACT FOR AI CONCERNS

For questions, concerns, or to exercise AI-related rights:
- **AI Ethics Team:** ai-ethics@nephrpro.com
- **DPO:** dpo@nephrpro.com
- **Response time:** Within 30 days

---

## UPDATES TO THIS STATEMENT

This statement is reviewed quarterly and updated when:
- New AI features are added
- Model accuracy significantly changes
- Regulatory requirements change
- Bias audit results require disclosure

---

*© 2026 NepHR Pro Pvt. Ltd.*
*AI Transparency Statement v1.0*
*This document is subject to regular review and legal verification.*
*All AI accuracy figures are based on internal validation testing as of June 2026.*

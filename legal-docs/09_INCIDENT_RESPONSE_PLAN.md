# INCIDENT RESPONSE PLAN (IRP)
## NepHR Pro — Security & Data Breach Response
**Document #9** | **Version:** 1.0 | **Effective Date:** June 11, 2026
**Classification:** STRICTLY CONFIDENTIAL — Internal Use Only

---

## 1. PURPOSE & LEGAL BASIS

This Incident Response Plan (IRP) defines NepHR Pro's procedures for detecting, containing, investigating, and recovering from security incidents and personal data breaches.

**Legal Compliance:**
| Regulation | Requirement | Our Commitment |
|---|---|---|
| GDPR Art. 33 | Notify supervisory authority within 72 hours | ✅ Phase 4 of this plan |
| GDPR Art. 34 | Notify data subjects if high risk | ✅ Phase 4 of this plan |
| UK GDPR Art. 33 | Notify ICO within 72 hours | ✅ Phase 4 of this plan |
| Nepal Privacy Act 2018 | Protect personal information | ✅ Throughout all phases |
| India DPDP Act 2023 | Notify Data Protection Board | ✅ Phase 4 of this plan |
| ISO/IEC 27001 Annex A.16 | Information security incident management | ✅ This entire document |
| SOC 2 CC7 | Detect and respond to threats | ✅ Phase 1 & 2 |
| Australia NDB Scheme | Notify OAIC of eligible breaches | ✅ Phase 4 of this plan |

---

## 2. INCIDENT CLASSIFICATION MATRIX

| Severity | Level | Definition | Examples | Response Time |
|---|---|---|---|---|
| 🔴 P1 — Critical | 4 | Confirmed data breach with PII exposure | Unauthorized DB access, bulk export of employee data, ransomware | **15 minutes** |
| 🟠 P2 — High | 3 | Suspected breach or system compromise | Unusual admin activity, malware detected, suspicious data access | **1 hour** |
| 🟡 P3 — Medium | 2 | Security vulnerability discovered | VAPT finding, unpatched CVE, failed intrusion attempt | **4 hours** |
| 🟢 P4 — Low | 1 | Minor security event | Single failed login, policy violation, minor misconfiguration | **24 hours** |

---

## 3. RESPONSE TEAM & CONTACTS

| Role | Name/Team | Responsibility | Contact |
|---|---|---|---|
| **Incident Commander** | CEO / CTO | Overall coordination, final decisions | incident-cmd@nephrpro.com |
| **Security Lead** | InfoSec Team | Technical investigation & containment | security@nephrpro.com |
| **Data Protection Officer (DPO)** | DPO | Privacy compliance, notification decisions | dpo@nephrpro.com |
| **Legal Counsel** | Legal Team | Legal obligations, regulatory notifications | legal@nephrpro.com |
| **Communications Lead** | PR/Comms | Client & public communications | comms@nephrpro.com |
| **Engineering Lead** | Dev Team | System recovery, patch deployment | engineering@nephrpro.com |
| **Customer Success** | CSM Team | Client relationship management | csm@nephrpro.com |

### Escalation Path:
```
Any employee detects incident
        ↓
Report to Security Lead (security@nephrpro.com)
        ↓
Security Lead notifies Incident Commander
        ↓
Incident Commander assembles Response Team
        ↓
DPO assesses notification requirements
        ↓
Legal authorizes external notifications
```

---

## 4. SIX-PHASE RESPONSE PROCESS

---

### 🔴 PHASE 1: DETECT & IDENTIFY (0–1 hour)

**Objective:** Confirm the incident is real and assess initial scope.

**Triggers for Phase 1:**
- Automated security monitoring alert
- Employee reports suspicious activity
- Client reports data anomaly
- Third-party security researcher notification
- Law enforcement notification

**Actions:**
- [ ] Security monitoring system generates alert
- [ ] Security Lead acknowledges alert within **15 min (P1)** / **1 hr (P2)**
- [ ] Initial triage: Is this a false positive or real incident?
- [ ] Assign incident severity level (P1–P4)
- [ ] Create incident ticket with unique ID (INC-YYYY-MMDD-###)
- [ ] Notify Incident Commander immediately for P1/P2
- [ ] Begin incident log documentation
- [ ] Preserve all evidence (do NOT shut down affected systems before imaging)

**Detection Sources:**
- AWS CloudWatch / GuardDuty — automated threat detection
- Application access logs — unusual access patterns
- SIEM (Security Information & Event Management) alerts
- Employee reports — internal channels
- VAPT findings — scheduled testing
- Client reports — unusual data behavior

**Evidence Preservation Checklist:**
- [ ] Capture system snapshots and memory images
- [ ] Preserve all relevant log files (do NOT delete)
- [ ] Screenshot suspicious activity
- [ ] Document timeline of events with UTC timestamps
- [ ] Identify affected systems, users, and data categories

---

### 🟠 PHASE 2: CONTAIN (1–4 hours)

**Objective:** Stop the incident from spreading or causing further damage.

**Containment Actions:**

**Short-term containment (immediate):**
- [ ] Isolate affected systems from the network
- [ ] Disable compromised user accounts
- [ ] Block malicious IP addresses at firewall
- [ ] Revoke compromised API keys or tokens
- [ ] Enable enhanced logging on all related systems
- [ ] Notify cloud provider (AWS) if infrastructure is affected

**Long-term containment (same day):**
- [ ] Deploy patched systems (if vulnerability is known)
- [ ] Increase monitoring sensitivity
- [ ] Conduct tenant isolation check — verify no cross-tenant leakage
- [ ] Assess scope: How many tenants affected? How many data subjects?
- [ ] Determine: Was any personal data actually accessed or exfiltrated?

**Multi-tenant Isolation Check:**
```
✅ Verify schema isolation between tenants
✅ Check access logs across all tenants for anomalous patterns
✅ Confirm audit trail integrity
✅ Verify RBAC controls are functioning correctly
```

---

### 🟡 PHASE 3: ASSESS LEGAL & NOTIFICATION OBLIGATIONS (4–24 hours)

**Objective:** Determine legal reporting requirements.

**DPO Assessment Questions:**
1. Was personal data accessed, disclosed, or destroyed without authorization?
2. If yes — is this a "personal data breach" under GDPR?
3. What categories of data were involved?
4. How many data subjects are potentially affected?
5. Is there likely a "risk to rights and freedoms" of data subjects?
6. Is the risk "high" — requiring direct data subject notification?

**Decision Matrix:**
| Situation | Action Required |
|---|---|
| No personal data involved | Document internally, no external notification |
| Personal data involved, low risk | Document, notify clients, no supervisory authority notification |
| Personal data involved, medium risk | Notify supervisory authority within 72 hours |
| Personal data involved, high risk | Notify supervisory authority + affected data subjects |
| Criminal activity suspected | Notify law enforcement + supervisory authority |

**Documentation Required:**
- [ ] Incident classification and severity
- [ ] Categories of personal data involved
- [ ] Approximate number of affected data subjects
- [ ] Timeline of discovery and response actions
- [ ] Likely consequences of the breach
- [ ] Measures taken and proposed
- [ ] All decisions and their rationale

---

### 🔴 PHASE 4: NOTIFY (within 72 hours of discovery)

**Objective:** Meet all legal notification requirements.

---

#### 4A. SUPERVISORY AUTHORITY NOTIFICATIONS

**⏰ GDPR / UK GDPR: 72-hour deadline from discovery**

| Country | Authority | Portal / Contact |
|---|---|---|
| 🇪🇺 EU (all members) | Relevant National DPA | e.g., BfDI (Germany), CNIL (France), DPC (Ireland) |
| 🇬🇧 UK | ICO (Information Commissioner's Office) | report.ico.org.uk — 0303 123 1113 |
| 🇮🇳 India | Data Protection Board of India | (when operational) |
| 🇦🇺 Australia | OAIC (Office of the Australian Information Commissioner) | oaic.gov.au/privacy/notifiable-data-breaches |
| 🇺🇸 USA | FTC + State AGs (if applicable) | ftc.gov |
| 🇳🇵 Nepal | No formal breach authority yet — document internally | internal record |

**Information to include in supervisory authority notification:**
1. Nature of the breach
2. Categories of personal data involved
3. Approximate number of data subjects
4. Approximate number of records concerned
5. Name and contact details of DPO
6. Likely consequences of the breach
7. Measures taken or proposed

---

#### 4B. CLIENT NOTIFICATION

**Timing:** Within 72 hours of discovering the breach (before or alongside supervisory authority notification)

**Method:** Email to registered Data Controller contact + In-app notification

**Template — Client Breach Notification:**

```
Subject: [URGENT] Security Incident Notification — NepHR Pro [INC-ID]

Dear [Client Administrator Name],

We are writing to inform you of a security incident affecting NepHR Pro
that may impact your organization's data.

INCIDENT SUMMARY
━━━━━━━━━━━━━━━
Incident ID:        [INC-YYYY-MMDD-###]
Discovery Date/Time: [DATE] at [TIME] UTC
Notification Date:  [DATE] at [TIME] UTC

WHAT HAPPENED
━━━━━━━━━━━━
[Plain-language description of the incident]

DATA INVOLVED
━━━━━━━━━━━━
Categories of data potentially affected:
• [e.g., Employee names and email addresses]
• [e.g., Attendance records]

Estimated number of data subjects affected: [NUMBER or "Under investigation"]

YOUR ORGANIZATION SPECIFICALLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Specific impact to this client, or "We are still assessing your specific exposure"]

ACTIONS WE HAVE TAKEN
━━━━━━━━━━━━━━━━━━━━
1. [Specific action taken]
2. [Specific action taken]
3. [Specific action taken]

YOUR RECOMMENDED ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━
1. [Recommended action for client]
2. [Recommended action for client]

NEXT STEPS
━━━━━━━━━━
We will provide a full incident report within [X] business days.
Updates will be sent every [24 hours / X hours] until resolution.

CONTACT
━━━━━━━
Dedicated incident response: incident-[INC-ID]@nephrpro.com
DPO: dpo@nephrpro.com
Security: security@nephrpro.com
Phone: [DEDICATED INCIDENT HOTLINE]

We sincerely apologize for this incident and are committed to full
transparency throughout our investigation.

[Name]
[Title]
NepHR Pro Pvt. Ltd.
```

---

#### 4C. DATA SUBJECT NOTIFICATION (if high risk)

**When required:** If breach is likely to result in high risk to individuals' rights and freedoms.

**Template — Data Subject Notification:**

```
Subject: Important Notice About Your Personal Data — NepHR Pro

Dear [Employee Name / "Valued User"],

We are writing to inform you that NepHR Pro experienced a security
incident that may have affected your personal information.

WHAT HAPPENED
Your employer uses NepHR Pro to manage HR data. On [DATE], we discovered
[brief plain-language description].

INFORMATION THAT MAY HAVE BEEN AFFECTED
• [Specific data categories]
• [Your employer: COMPANY NAME]

WHAT WE ARE DOING
• [Action 1]
• [Action 2]

WHAT YOU CAN DO
• Change your passwords if you use any affected systems
• Monitor for suspicious activity on your accounts
• Contact your HR department for further information
• [Any country-specific advice, e.g., fraud alert services]

YOUR RIGHTS
You have the right to contact [Supervisory Authority] if you have
concerns about how your data has been handled.

FOR MORE INFORMATION
Email: privacy@nephrpro.com
DPO: dpo@nephrpro.com

We deeply regret this incident and are committed to your data's protection.

NepHR Pro Data Protection Team
```

---

### 🔵 PHASE 5: ERADICATE & RECOVER (1–7 days)

**Objective:** Fully remove the threat and restore normal operations.

**Eradication:**
- [ ] Identify and remove all malware or unauthorized access
- [ ] Patch exploited vulnerability (within 24 hours for P1)
- [ ] Remove all backdoors or persistence mechanisms
- [ ] Reset all compromised credentials (admin + affected users)
- [ ] Rotate all exposed API keys and secrets
- [ ] Verify third-party sub-processors are unaffected

**Recovery:**
- [ ] Restore systems from verified clean backups (if needed)
- [ ] Validate data integrity after restoration
- [ ] Gradually restore services (phased rollout)
- [ ] Increase monitoring for 30 days post-incident
- [ ] Verify all RBAC and access controls are functioning correctly
- [ ] Confirm multi-tenant isolation is intact
- [ ] Run automated security scan on all restored systems
- [ ] Client notification: "Systems fully restored"

**Recovery Time Objectives (RTO):**
| Severity | Target Recovery Time |
|---|---|
| P1 — Critical | 4 hours |
| P2 — High | 8 hours |
| P3 — Medium | 24 hours |
| P4 — Low | 72 hours |

---

### 🟢 PHASE 6: POST-INCIDENT REVIEW (within 30 days)

**Objective:** Learn from the incident to prevent recurrence.

**Post-Incident Report must include:**
- [ ] Full incident timeline (UTC timestamps)
- [ ] Root cause analysis (RCA)
- [ ] How the incident was detected
- [ ] Total impact assessment (data, systems, clients, financial)
- [ ] Effectiveness of response
- [ ] What worked well
- [ ] What could be improved
- [ ] Specific action items with owners and deadlines
- [ ] Update to this Incident Response Plan if needed
- [ ] Assessment: Does VAPT need to be re-run?

**Distribution of Post-Incident Report:**
- Incident Commander
- DPO
- Legal Counsel
- Affected client(s) — redacted version
- Supervisory authority — if required
- ISO 27001 / SOC 2 auditors — for compliance records

---

## 5. ANNUAL TESTING REQUIREMENTS

| Test Type | Frequency | Owner |
|---|---|---|
| Tabletop incident simulation | Annually | Security Lead |
| Breach notification drill | Annually | DPO + Legal |
| Technical recovery drill | Annually | Engineering |
| Client communication drill | Annually | CSM + Comms |
| Full plan review and update | Annually | All team leads |

---

## 6. INCIDENT LOG REGISTER

All incidents must be logged in the Incident Register:

| Field | Required |
|---|---|
| Incident ID | INC-YYYY-MMDD-### |
| Discovery date/time | UTC |
| Reported by | Name + role |
| Severity level | P1–P4 |
| Summary | Brief description |
| Data categories affected | List |
| Number of data subjects | Estimated count |
| Notification sent? | Yes/No + date |
| Supervisory authority notified? | Yes/No + date + reference |
| Resolution date | UTC |
| Root cause | Brief description |
| Lessons learned | Key points |

---

*Document Owner: NepHR Pro DPO & Security Lead*
*Created: June 11, 2026 | Review: June 11, 2027*
*© 2026 NepHR Pro Pvt. Ltd. — Strictly Confidential*

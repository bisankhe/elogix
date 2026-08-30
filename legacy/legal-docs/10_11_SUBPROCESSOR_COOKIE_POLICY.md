# SUB-PROCESSOR LIST
## eLogix HRMS — GDPR Article 28 Compliant Register
**Document #10** | **Version:** 1.0 | **Last Updated:** June 11, 2026
**Classification:** Public (available to clients on request)

---

## 1. PURPOSE

Under GDPR Article 28(4) and UK GDPR, eLogix HRMS is required to maintain a list of all sub-processors engaged to process personal data on behalf of our clients. This document satisfies that requirement.

**eLogix HRMS's role:** Data Processor
**Client's role:** Data Controller
**Sub-Processor's role:** Sub-Processor (engaged by eLogix HRMS)

---

## 2. NOTIFICATION POLICY

- Clients will be notified **30 days in advance** before any new sub-processor is added
- Clients may **object in writing within 14 days** of notification
- If no objection is received, the new sub-processor is deemed accepted
- This list is **reviewed and updated quarterly**

---

## 3. CURRENT SUB-PROCESSORS

### 3.1 Infrastructure & Cloud Services

| Sub-Processor | Parent Company | Purpose | Personal Data Accessed | Locations | Security Standards | DPA in Place |
|---|---|---|---|---|---|---|
| Amazon Web Services (AWS) | Amazon.com Inc. | Cloud hosting, database storage, backups, CDN | All HR data (encrypted at rest) | Region-specific (client selects: Nepal, India, EU, UK, USA, AU) | ISO 27001, SOC 2 Type II, ISO 27017, ISO 27018 | ✅ AWS DPA + SCCs |
| AWS CloudWatch | Amazon.com Inc. | System monitoring, alerting | Anonymized logs only | Same as AWS instance | ISO 27001, SOC 2 | ✅ Covered by AWS DPA |
| AWS GuardDuty | Amazon.com Inc. | Threat detection & security monitoring | IP addresses, metadata | Same as AWS instance | ISO 27001, SOC 2 | ✅ Covered by AWS DPA |

### 3.2 AI & Machine Learning

| Sub-Processor | Parent Company | Purpose | Personal Data Accessed | Location | Security Standards | DPA in Place |
|---|---|---|---|---|---|---|
| Anthropic, PBC (Claude API) | Anthropic, PBC | AI HR assistant chatbot | **Anonymized queries only** — No employee names, IDs, or sensitive data sent | San Francisco, USA | SOC 2 Type II, data minimization controls | ✅ DPA + SCCs |

> ⚠️ **Important:** The AI chatbot (Claude) only receives anonymized, context-only queries. No employee PII is transmitted to Anthropic. All AI model training is performed on eLogix HRMS's own anonymized data within AWS.

### 3.3 Communications & Notifications

| Sub-Processor | Parent Company | Purpose | Personal Data Accessed | Location | Security Standards | DPA in Place |
|---|---|---|---|---|---|---|
| Amazon SES (Simple Email Service) | Amazon.com Inc. | Transactional emails (password resets, HR notifications) | Name, email address | Region-specific | ISO 27001, SOC 2 | ✅ Covered by AWS DPA |
| Twilio (optional) | Twilio Inc. | SMS notifications (MFA, urgent HR alerts) | Phone number only | USA / EU | ISO 27001, SOC 2 | ✅ Twilio DPA + SCCs |

### 3.4 Payment Processing

| Sub-Processor | Parent Company | Purpose | Personal Data Accessed | Location | Security Standards | DPA in Place |
|---|---|---|---|---|---|---|
| Stripe Inc. | Stripe Inc. | Subscription billing & payment processing | Name, billing address, card (tokenized — raw card data never reaches eLogix HRMS) | USA / Ireland (EU) | PCI DSS Level 1, ISO 27001, SOC 2 | ✅ Stripe DPA + SCCs |

> ⚠️ **Important:** eLogix HRMS never stores raw payment card data. All card data is tokenized by Stripe. eLogix HRMS is PCI DSS SAQ A compliant.

### 3.5 Security & Performance Monitoring

| Sub-Processor | Parent Company | Purpose | Personal Data Accessed | Location | Security Standards | DPA in Place |
|---|---|---|---|---|---|---|
| Cloudflare Inc. | Cloudflare Inc. | DDoS protection, WAF, CDN | IP addresses, HTTP metadata (no HR data) | USA / EU (data processing agreement) | ISO 27001, SOC 2 Type II | ✅ Cloudflare DPA |
| Sentry (or DataDog) | Functional Software / Datadog Inc. | Application error monitoring | Anonymized error logs only — PII is scrubbed before sending | USA / EU | SOC 2 Type II | ✅ DPA in place |

### 3.6 Development & Operations (Non-Production)

| Sub-Processor | Purpose | Personal Data Accessed | Notes |
|---|---|---|---|
| GitHub (Microsoft) | Source code repository | No personal data — code only | Strict policy: No real PII in repositories |
| Jira/Confluence (Atlassian) | Project management | No personal data | Support tickets anonymized |

---

## 4. DATA MINIMIZATION BY SUB-PROCESSOR

| Sub-Processor | Actual PII Received | How Minimized |
|---|---|---|
| AWS | Encrypted HR data | AES-256 encryption — AWS cannot read data |
| Anthropic (Claude) | **ZERO PII** | Only anonymized context queries sent |
| Stripe | Name + tokenized card | Raw card data never transmitted |
| Cloudflare | IP address only | No HR data in CDN layer |
| Sentry/DataDog | **ZERO PII** | PII scrubbed from error logs before sending |
| SES/Twilio | Name + email/phone | Minimum required for notification |

---

## 5. SUB-PROCESSOR CHANGE LOG

| Date | Change | Client Notification Sent | Objection Period |
|---|---|---|---|
| June 11, 2026 | Initial sub-processor list published | Via Privacy Policy | N/A |

---

## 6. HOW TO OBJECT TO A NEW SUB-PROCESSOR

If you wish to object to a proposed new sub-processor:
1. Send written objection to: dpo@elogix.com
2. Include: Your organization name, the sub-processor you object to, and your reason
3. We will work with you to find an acceptable solution
4. If no solution is found, you may terminate the agreement per the ToS termination clause

---

*Document Owner: eLogix HRMS DPO*
*Created: June 11, 2026 | Quarterly Review: September 11, 2026*
*© 2026 eLogix HRMS Pvt. Ltd.*

---
---

# COOKIE POLICY
## eLogix HRMS Platform
**Document #11** | **Version:** 1.0 | **Effective Date:** June 11, 2026

---

## 1. WHAT ARE COOKIES?

Cookies are small text files placed on your device (computer, tablet, or phone) when you access eLogix HRMS. They help the platform remember your preferences, keep you logged in securely, and understand how the platform is used.

We also use similar technologies including:
- **Local storage** — for offline data caching
- **Session storage** — for temporary session data
- **Pixels** — NOT used by eLogix HRMS

---

## 2. WHO SETS COOKIES?

| Type | Who Sets It | Description |
|---|---|---|
| **First-party cookies** | eLogix HRMS directly | Set by our platform for core functionality |
| **Third-party cookies** | Sub-processors | Set by AWS, Cloudflare only for security |

**eLogix HRMS does NOT allow advertising networks or data brokers to set cookies.**

---

## 3. COOKIES WE USE

### Category 1 — STRICTLY NECESSARY ✅ (Always Active, Cannot Be Disabled)

These cookies are essential for the platform to function. Without them, you cannot log in or use the service.

| Cookie Name | Set By | Purpose | Duration | Data Stored |
|---|---|---|---|---|
| `elogix_session_id` | eLogix HRMS | Maintains your authenticated login session | Session (deleted on browser close) | Encrypted session token |
| `elogix_csrf_token` | eLogix HRMS | Prevents Cross-Site Request Forgery attacks | Session | Random security token |
| `elogix_tenant_id` | eLogix HRMS | Identifies which organization's environment you belong to | Session | Encrypted tenant identifier |
| `elogix_auth_role` | eLogix HRMS | Stores your current access role/persona | Session | Encrypted role identifier |
| `__cf_bm` | Cloudflare | Bot management and DDoS protection | 30 minutes | Encrypted identifier |
| `cf_clearance` | Cloudflare | Security challenge verification | 30 minutes | Security token |

**Legal basis:** Legitimate interests (essential for contracted service delivery)

---

### Category 2 — FUNCTIONAL / PREFERENCES ✅ (Default On, Can Be Disabled)

These cookies remember your personal preferences so you don't have to reset them every visit.

| Cookie Name | Set By | Purpose | Duration | Data Stored |
|---|---|---|---|---|
| `elogix_language` | eLogix HRMS | Remembers your selected language (20 options) | 365 days | Language code (e.g., "en", "ne", "ar") |
| `elogix_currency` | eLogix HRMS | Remembers your selected currency (26 options) | 365 days | Currency code (e.g., "NPR", "USD") |
| `elogix_theme` | eLogix HRMS | Remembers dark/light mode preference | 365 days | "dark" or "light" |
| `elogix_sidebar_state` | eLogix HRMS | Remembers sidebar open/collapsed state | 365 days | Boolean |
| `elogix_persona` | eLogix HRMS | Remembers last selected persona | 365 days | Persona identifier |
| `elogix_notifications_read` | eLogix HRMS | Tracks which notifications you've read | 30 days | List of notification IDs |

**Legal basis:** Consent (you can disable these in Cookie Settings)

---

### Category 3 — ANALYTICS ⚙️ (Default Off, Requires Consent)

These cookies collect **fully anonymized** information about how the platform is used to help us improve it. **No individual is identified.**

| Cookie Name | Set By | Purpose | Duration | Data Stored |
|---|---|---|---|---|
| `elogix_analytics_id` | eLogix HRMS | Anonymized feature usage tracking | 365 days | Random anonymous identifier (NOT tied to your account) |
| `elogix_performance` | eLogix HRMS | Page load times and performance metrics | 30 days | Anonymized timing data |
| `elogix_feature_flags` | eLogix HRMS | A/B testing of new features | 90 days | Anonymous flag identifier |

**Legal basis:** Consent (opt-in only)

**What we track (anonymized):**
- Which features are most used
- Page load performance
- Error rates
- Geographic distribution (country-level only, no city/individual)

**What we do NOT track:**
- Individual employee names or IDs
- What HR data you enter
- Your employees' personal information
- Browsing on other websites

---

### Category 4 — ADVERTISING & TRACKING ❌ (NEVER USED)

**eLogix HRMS does NOT use:**
- Advertising cookies
- Cross-site tracking cookies
- Social media tracking pixels (Facebook Pixel, LinkedIn Insight, Google Analytics)
- Data broker cookies
- Retargeting cookies

We will **never** sell your cookie data or share it with advertising networks.

---

## 4. YOUR COOKIE CHOICES

### Managing Cookies in eLogix HRMS:
1. Click **Settings** in the top navigation
2. Select **Privacy & Cookies**
3. Toggle categories on or off
4. Click **Save Preferences**

Your preferences are remembered for 12 months.

### Managing Cookies in Your Browser:

| Browser | How to Manage Cookies |
|---|---|
| Chrome | Settings → Privacy → Cookies |
| Firefox | Settings → Privacy → Cookies |
| Safari | Preferences → Privacy → Cookies |
| Edge | Settings → Privacy → Cookies |

> ⚠️ **Warning:** Disabling **Strictly Necessary** cookies will prevent you from logging in to eLogix HRMS.

---

## 5. COOKIE CONSENT BY REGION

| Region | Consent Requirement | Our Approach |
|---|---|---|
| 🇪🇺 EU (GDPR + ePrivacy Directive) | Opt-in consent required for non-essential | Cookie banner on first visit ✅ |
| 🇬🇧 UK (UK GDPR + PECR) | Opt-in consent required | Cookie banner on first visit ✅ |
| 🇺🇸 USA (CCPA/CPRA) | Right to opt-out of "sale" (we don't sell) | Preference center available ✅ |
| 🇳🇵 Nepal | No specific cookie law yet | Best practice: consent banner ✅ |
| 🇮🇳 India | DPDP Act 2023 — purpose limitation | Consent for analytics ✅ |
| 🇦🇺 Australia | Privacy Act 1988 | Transparency + opt-out ✅ |

---

## 6. COOKIE RETENTION & DELETION

All cookies are automatically deleted:
- **Session cookies** — when you close your browser
- **Persistent cookies** — after their specified duration (see tables above)
- **On account deletion** — all cookies and local storage cleared immediately
- **On consent withdrawal** — non-essential cookies deleted within 24 hours

---

## 7. UPDATES TO THIS POLICY

We will notify you of material changes via:
- In-app notification at least **30 days** before changes take effect
- Updated "Last Updated" date at top of this document

---

## 8. CONTACT

For cookie-related questions:
- **Privacy Team:** privacy@elogix.com
- **DPO:** dpo@elogix.com
- **ICO complaint (UK):** ico.org.uk
- **EDPB complaint (EU):** edpb.europa.eu

---

*© 2026 eLogix HRMS Pvt. Ltd.*
*Cookie Policy v1.0 — Subject to legal review before final publication.*

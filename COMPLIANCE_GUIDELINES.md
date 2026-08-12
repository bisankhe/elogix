# eLogix HRMS — Global Compliance & Quality Standards
## Permanent Owner Guidelines | Date: June 11, 2026 | Version: 1.0
## Classification: CONFIDENTIAL — Internal Reference

---

## 🎯 OUR SOFTWARE PROFILE
- **Type:** B2B SaaS — HRIS + HRMS + HRIM Platform
- **Data Handled:** PII — salaries, national IDs, bank details, biometrics, performance data
- **Target Markets:** Nepal, India, USA, UK, Europe, Middle East, Australia, Southeast Asia
- **Deployment:** Multi-tenant cloud SaaS, 20 languages, 26 currencies

---

## 📋 CERTIFICATIONS ROADMAP

### TIER 1 — BEFORE PUBLIC LAUNCH (Critical)
| Certification | Region | Priority |
|---|---|---|
| ISO/IEC 27001 | Global | CRITICAL — ISMS for PII protection |
| Nepal Privacy Act 2018 | Nepal | ✅ ACTIVE in software |
| Nepal Labour Act 2017 | Nepal | ✅ ACTIVE in software |
| GDPR | Europe/UK | HIGH — EU/UK market entry |
| SOC 2 Type II | USA/Global | HIGH — Enterprise B2B standard |

### TIER 2 — WITHIN 6 MONTHS
| Certification | Region | Priority |
|---|---|---|
| ISO/IEC 27701 | Global | Privacy Information Management |
| ISO/IEC 27018 | Global | PII in public cloud (SaaS) |
| ISO 9001 | Global | Quality Management System |
| VAPT (CREST/CHECK) | UK | UK GDPR Article 32 |
| Cyber Essentials Plus | UK | UK government contracts |
| CCPA/CPRA | USA | California privacy law |
| DPDP Act 2023 | India | Indian government mandate |

### TIER 3 — WITHIN 12 MONTHS
| Certification | Region | Priority |
|---|---|---|
| ISO 30414 | Global | Human Capital Reporting |
| ISO 30405 | Global | ATS/Recruitment guidelines |
| ISO/IEC 25010 | Global | Software Quality Characteristics |
| SOC 1 Type II | USA | Payroll/financial data |
| PCI DSS | Global | If payment processing added |
| DSP OSF | Australia | Payroll/tax/ATO integration |
| WCAG 2.1 AA | Global | Accessibility (ADA/EAA) |
| EU AI Act Conformity | EU | AI features compliance |

---

## 🌍 COUNTRY-SPECIFIC DATA POLICIES

### 🇳🇵 NEPAL — ACTIVE
- Nepal Right to Privacy Act 2018 ✅
- Nepal Labour Act 2017 ✅
- Nepal Labour Rules 2018 ✅
- Data residency: Nepal employee data on Nepal servers
- AES-256 encryption, TLS 1.3 ✅
- RBAC enforced ✅
- Audit trail on all actions ✅

### 🇮🇳 INDIA
- **DPDP Act (Digital Personal Data Protection) 2023**
  - Purpose-specific consent for all HR data collection
  - Data minimization — collect only what's needed
  - Employee rights: access, correction, withdrawal
  - Data Fiduciary obligations — we are the vendor
  - Data residency: India servers for Indian employee data
- e-HRMS interoperability: PFMS, SPARROW system compatibility
- Supreme Court ruling: Privacy as fundamental right
- RBAC + Encryption mandatory for government clients

### 🇺🇸 USA
- **CCPA/CPRA (California Consumer Privacy Act)**
  - Right to opt-out of data sale/sharing
  - Right to delete personal data on request
  - Data portability required
- **SOC 2 Type II** — mandatory for enterprise sales
- **NIST Cybersecurity Framework** alignment
- **ADA + WCAG 2.1** — accessibility compliance
- **HIPAA** — if any health/medical data processed
- State laws: NY SHIELD, Virginia CDPA, Colorado CPA

### 🇬🇧 UK
- **UK GDPR (Post-Brexit):**
  - Article 32: Regular VAPT testing mandatory
  - DPIA (Data Privacy Impact Assessment) required
  - Right to be forgotten implementation
  - Data portability features mandatory
- **Cyber Essentials Plus** — government contracts
- **CHECK/CREST VAPT** — annual penetration testing
- **ISO 27001** — enterprise client requirement
- ICO (Information Commissioner's Office) registration

### 🇪🇺 EUROPE (EU)
- **GDPR (General Data Protection Regulation):**
  - DPIA required before processing high-risk data
  - User consent management system
  - Right to be forgotten (data erasure)
  - Data portability (export in machine-readable format)
  - 72-hour breach notification to supervisory authority
  - Data Protection Officer (DPO) required
- **EU Cyber Resilience Act (CRA)** — secure SDLC
- **EU AI Act** — AI features require conformity assessment
  - Attrition prediction = potentially HIGH-RISK AI
  - Requires human oversight, explainability
- **European Accessibility Act (EAA)** — WCAG 2.1
- Data residency: EU data must stay in EU servers

### 🇦🇪 UAE / 🇸🇦 SAUDI ARABIA (Middle East)
- **UAE Data Protection Law** — data localization required
- **Saudi PDPL (Personal Data Protection Law)**
- RTL (Right-to-Left) UI support ✅ ACTIVE
- Arabic localization — 20 languages including Arabic ✅
- Hijri Calendar support for enterprise clients
- TDRA/CST approval if encrypted comms involved
- UAE PASS integration for digital identity (enterprise)
- ZATCA integration for Saudi e-invoicing (if billing)

### 🇦🇺 AUSTRALIA
- **Australian Consumer Law (ACL)** — fit for purpose
- **DSP OSF** — if payroll/tax/ATO integration
- **EVTE testing** — Standard Business Reporting
- Data residency: Australian data = Australia servers
- Privacy Act 1988 (amended) compliance

---

## 🔒 SECURITY IMPLEMENTATION CHECKLIST

### Currently Implemented ✅
- [x] AES-256 encryption at rest
- [x] TLS in transit
- [x] RBAC — 7 persona levels, server-side enforced
- [x] Audit trails — all user actions logged
- [x] Multi-tenant data isolation (separate schemas)
- [x] Nepal Privacy Act 2018 compliance
- [x] Nepal Labour Act 2017 compliance
- [x] AI model anonymization
- [x] Employee consent for AI processing
- [x] Payroll restricted to authorized roles only
- [x] RTL support for Arabic/Urdu
- [x] Confidentiality banner on all pages
- [x] Session-based authentication

### Must Implement Before International Launch 🔧
- [ ] MFA (Multi-Factor Authentication) for all users
- [ ] GDPR consent management (cookie/data consent popup)
- [ ] Right to be forgotten — data erasure API endpoint
- [ ] Data portability — export as JSON/CSV/XML
- [ ] DPIA documentation (for each country)
- [ ] Privacy policy page (per country language)
- [ ] Terms of service (per jurisdiction)
- [ ] Data Processing Agreement (DPA) template
- [ ] Breach notification pipeline (72-hr GDPR requirement)
- [ ] WCAG 2.1 AA accessibility audit and fixes
- [ ] Session timeout (configurable per compliance requirement)
- [ ] IP whitelisting option for enterprise clients
- [ ] Data residency selector (Nepal/India/EU/US/AU servers)
- [ ] Sub-processor disclosure list
- [ ] Cookie consent management

---

## 📄 LEGAL DOCUMENTS REQUIRED PER MARKET

### Documents to Prepare:
1. **Privacy Policy** — country-specific, legally reviewed
2. **Terms of Service** — jurisdiction-specific
3. **Data Processing Agreement (DPA)** — GDPR/UK GDPR
4. **Non-Disclosure Agreement (NDA)** — all B2B clients
5. **End User License Agreement (EULA)**
6. **Acceptable Use Policy (AUP)**
7. **SLA (Service Level Agreement)** — uptime guarantees
8. **Data Retention Policy** — per regulation per country
9. **Incident Response Plan** — SOC 2/ISO 27001 requirement
10. **Sub-Processor List** — GDPR Article 28 requirement
11. **Cookie Policy** — EU/UK specific
12. **AI Transparency Statement** — EU AI Act requirement

---

## 🛡️ VAPT TESTING REQUIREMENTS

### Areas to Test:
- API Security — all REST endpoints
- Authentication — login, session management, MFA
- Authorization — RBAC bypass testing
- SQL Injection — all database queries
- XSS (Cross-Site Scripting) — all input fields
- CSRF — all state-changing operations
- PII Data Exposure — leakage testing
- Encryption — at-rest and in-transit verification
- Third-party dependencies — outdated packages
- AI Model — adversarial input testing
- Multi-tenant isolation — cross-tenant access testing

### Standards:
- **OWASP Top 10** — web application security baseline
- **OWASP ASVS** — application security verification standard
- **CREST** — for UK market enterprise clients
- **CHECK** — for UK government contracts

### Frequency:
- Annual full VAPT — mandatory
- Quarterly automated vulnerability scans
- On every major release — security regression testing
- After significant infrastructure changes

---

## 🤖 AI COMPLIANCE — EU AI ACT

Our AI features may be HIGH-RISK under EU AI Act:
- Attrition prediction — affects employment decisions
- Salary recommendation — affects compensation
- Performance prediction — affects promotion/demotion

### Required:
- [ ] AI transparency documentation
- [ ] Training data bias assessment
- [ ] Model accuracy public logging (87.3% attrition, 91.2% salary)
- [ ] Human oversight — no automated employment decisions
- [ ] AI conformity assessment before EU launch
- [ ] Right to explanation for AI-driven decisions
- [ ] AI register entry for high-risk systems

---

## 📊 ISO STANDARDS FOR HRIS/HRMS (Priority Order)

| Standard | What It Covers | Priority |
|---|---|---|
| ISO/IEC 27001 | ISMS — Core information security | CRITICAL |
| ISO/IEC 27018 | PII protection in public cloud | HIGH |
| ISO/IEC 27701 | Privacy management (GDPR alignment) | HIGH |
| ISO 9001 | Quality management system | HIGH |
| ISO/IEC 25010 | Software quality characteristics | MEDIUM |
| ISO 30414 | Human capital reporting standards | MEDIUM |
| ISO 30408 | Human governance guidelines | MEDIUM |
| ISO 30405 | Recruitment/ATS ethical guidelines | MEDIUM |

---

## ⚠️ CRITICAL DEVELOPMENT RULES

1. **NEVER log PII** — salaries, IDs, passwords must NOT appear in logs
2. **ALWAYS encrypt** employee financial/health data before storing
3. **RBAC must be server-side** — never trust client-side role claims
4. **Audit every access** to payroll, health, personal data
5. **Data minimization** — collect only what's legally required
6. **Anonymize AI training data** — no real employee names in models
7. **Separate environments** — no real PII in development/test
8. **Patch dependencies** — security vulnerabilities within 30 days
9. **Multi-tenant isolation** — zero cross-tenant leakage, tested
10. **Incident response** — 72-hour breach notification ready
11. **No data to 3rd parties** without explicit consent + DPA
12. **Right to erasure** — implement full cascade delete for GDPR

---

## 🗓️ IMPLEMENTATION TIMELINE

### Q3 2026 (Jul–Sep)
- ISO 27001 gap analysis & remediation
- Implement GDPR consent management
- Add MFA for all user roles
- Begin VAPT with CREST-certified provider
- Draft Privacy Policy per country

### Q4 2026 (Oct–Dec)
- ISO 27001 formal certification audit
- SOC 2 Type I audit
- WCAG 2.1 AA accessibility complete
- India launch — DPDP Act compliant
- UK beta launch — Cyber Essentials

### Q1 2027 (Jan–Mar)
- SOC 2 Type II monitoring period starts
- ISO 9001 certification
- CCPA compliance — US market
- EU GDPR compliant version launch
- Middle East localization complete

### Q2 2027 (Apr–Jun)
- SOC 2 Type II report received
- ISO 27701 certification
- ISO 30414 Human Capital Reporting
- Full global launch across all target markets
- Australia DSP OSF compliance complete

---

*Document Owner: eLogix HRMS Product Team*
*Created: June 11, 2026*
*Next Review: September 11, 2026*
*Classification: CONFIDENTIAL — Internal Reference Only*

# AI TRANSPARENCY STATEMENT
## NepHR Pro — Responsible AI in HR Management
**Document #12** | **Version:** 1.0 | **Effective Date:** June 11, 2026
**Classification:** Public — Available to all users and clients

---

## 1. OUR COMMITMENT

NepHR Pro is committed to responsible, transparent, and fair use of Artificial Intelligence in Human Resource management. We believe AI should:
- **Assist** HR professionals — never replace human judgment
- **Explain** its recommendations in plain language
- **Never discriminate** on protected characteristics
- **Be accurate** and regularly validated
- **Respect privacy** — trained on anonymized data only

---

## 2. AI FEATURES OVERVIEW

### 2.1 Complete AI Feature Inventory

| # | Feature | Module | Risk Level | Accuracy (Jun 2026) | Auto-Decision? |
|---|---|---|---|---|---|
| 1 | **Attrition Prediction** | AI Insights | 🔴 HIGH-RISK* | 87.3% | ❌ Never |
| 2 | **Salary Recommendation** | Payroll / Compensation | 🟡 MEDIUM | 91.2% | ❌ Never |
| 3 | **Resume / CV Screening** | Recruitment ATS | 🔴 HIGH-RISK* | 84.6% | ❌ Never |
| 4 | **Performance Forecasting** | Performance Management | 🟡 MEDIUM | 76.4% | ❌ Never |
| 5 | **Leave Pattern Detection** | Attendance / Leave | 🟢 LOW | 79.8% | ❌ Never |
| 6 | **Sentiment Analysis** | Employee Engagement | 🟡 MEDIUM | 82.1% | ❌ Never |
| 7 | **Hiring Time Prediction** | Recruitment | 🟢 LOW | 84.6% | ❌ Never |
| 8 | **Seasonal Absence Forecasting** | Workforce Planning | 🟢 LOW | 79.8% | ❌ Never |
| 9 | **AI HR Chatbot** | HR Services | 🟢 LOW | Advisory | ❌ Never |
| 10 | **OKR Completion Prediction** | Performance | 🟡 MEDIUM | 76.4% | ❌ Never |

**🔴 HIGH-RISK*** under EU AI Act Article 6 + Annex III because these features relate to employment, workers management, and access to employment — specifically:
- Attrition Prediction: influences retention decisions
- Resume Screening: influences recruitment decisions

---

## 3. HOW OUR AI WORKS

### 3.1 Data Sources for AI Training

| Data Type | Used for Training? | How? |
|---|---|---|
| Individual employee names | ❌ NO | Never used |
| Individual employee IDs | ❌ NO | Never used |
| Individual salary details | ❌ NO | Never used |
| Anonymized aggregate patterns | ✅ YES | Fully anonymized trends only |
| Industry benchmarks | ✅ YES | Public market data |
| Nepal Labor Market data | ✅ YES | Publicly available statistics |

> **Privacy by Design:** Our AI models are trained exclusively on fully anonymized, aggregated patterns. No individual employee's identifiable information is ever used in model training.

### 3.2 Model Training Process

```
Step 1: Raw HR data → Anonymization layer (names, IDs removed)
         ↓
Step 2: Aggregation → Group-level statistics only
         ↓
Step 3: Bias audit → Screen for protected characteristic correlations
         ↓
Step 4: Model training → Supervised ML on anonymized features
         ↓
Step 5: Validation testing → Accuracy + fairness metrics
         ↓
Step 6: Deployment → With mandatory human review gates
         ↓
Step 7: Monthly retraining → Continuous improvement cycle
```

### 3.3 AI Retraining Schedule

| Model | Retraining Frequency | Last Trained | Next Scheduled |
|---|---|---|---|
| Attrition Prediction | Monthly | May 28, 2026 | June 28, 2026 |
| Salary Recommendation | Monthly | May 28, 2026 | June 28, 2026 |
| Resume Screening | Monthly | May 28, 2026 | June 28, 2026 |
| Performance Forecasting | Quarterly | April 30, 2026 | July 30, 2026 |
| Leave Pattern Detection | Monthly | May 15, 2026 | June 15, 2026 |
| Sentiment Analysis | Monthly | May 28, 2026 | June 28, 2026 |

---

## 4. HUMAN OVERSIGHT — MANDATORY POLICY

### 4.1 The Golden Rule

> **NepHR Pro AI never makes final employment decisions.**
> Every AI recommendation requires documented human review before any action is taken.

### 4.2 Human Oversight Requirements by Decision Type

| HR Decision Type | AI Role | Required Human Oversight |
|---|---|---|
| **Employee termination** | Risk signal only | HR Manager + Director approval mandatory |
| **Promotion / demotion** | Performance indicator | Line Manager + HR Manager sign-off |
| **Salary adjustment** | Market benchmark suggestion | HR Manager authorization required |
| **Hiring decision** | Initial shortlist only | HR + Hiring Manager interview required |
| **Performance rating** | Data analysis support | Manager completes assessment independently |
| **PIP placement** | Pattern detection | HR Manager + Legal review required |
| **Leave approval** | Pattern alert only | Manager approves per policy |
| **Redundancy selection** | Risk flag only | HR + Legal + Director required |
| **Training nomination** | Skill gap indicator | Manager confirms appropriately |
| **Succession planning** | HiPo identification | Leadership committee review |

### 4.3 Technical Safeguards for Human Oversight

Our platform is technically designed so that:
- AI cannot directly modify employee records
- AI outputs are always labeled as "AI Recommendation — Human Review Required"
- Every AI-influenced action requires a user to click a confirmation button
- All AI-influenced decisions are logged in the audit trail
- Reports show "AI-assisted" flag for transparency

---

## 5. PROTECTED CHARACTERISTICS — DISCRIMINATION PREVENTION

### 5.1 Features NEVER Used in AI Models

The following characteristics are **explicitly excluded** from all AI model features:

| Protected Characteristic | Legal Basis for Exclusion |
|---|---|
| Gender / Sex | Nepal Labour Act, GDPR, Equality Act (UK), Title VII (USA) |
| Race / Ethnicity / Nationality | All applicable anti-discrimination laws |
| Religion or belief | All applicable anti-discrimination laws |
| Age | Age Discrimination in Employment Act (USA), Equality Act (UK) |
| Disability status | ADA (USA), Equality Act (UK), CRPD (international) |
| Pregnancy / maternity | Nepal Labour Act S.57, Equality Act (UK), FMLA (USA) |
| Sexual orientation | Applicable local laws |
| Political opinion | Nepal Constitution, GDPR |
| Union membership | ILO conventions, local labor law |

### 5.2 Bias Monitoring

| Monitoring Activity | Frequency | Owner |
|---|---|---|
| Bias audit across gender | Monthly | AI Ethics Team |
| Bias audit across age groups | Monthly | AI Ethics Team |
| Bias audit across nationality | Monthly | AI Ethics Team |
| Disparate impact analysis | Quarterly | DPO + AI Team |
| External bias review | Annually | Independent auditor |

**Bias audit results:** Available to Enterprise clients upon written request to ai-ethics@nephrpro.com

---

## 6. AI ACCURACY & LIMITATIONS

### 6.1 Current Accuracy Metrics

| Feature | Accuracy | Confidence Interval | Testing Method | Data Size |
|---|---|---|---|---|
| Attrition Prediction | 87.3% | ±2.1% | Cross-validation (k=10) | 50,000+ records |
| Salary Recommendation | 91.2% | ±1.8% | Market comparison | 100,000+ data points |
| Resume Screening | 84.6% | ±2.4% | A/B testing vs human | 10,000+ applications |
| Performance Forecasting | 76.4% | ±3.1% | Retrospective testing | 25,000+ reviews |
| Leave Pattern Detection | 79.8% | ±2.8% | Historical validation | 200,000+ records |
| Sentiment Analysis | 82.1% | ±2.5% | Human-labeled validation | 15,000+ surveys |

### 6.2 Important Limitations

⚠️ **Please read these limitations before using AI features:**

1. **No model is 100% accurate** — Always apply human judgment
2. **Small teams** (< 20 people) — AI predictions are less reliable due to limited data
3. **New employees** (< 6 months) — Attrition prediction is less accurate
4. **Unusual industries** — Models trained on general HR data may be less accurate for niche industries
5. **Cultural context** — Festival seasons (Dashain, Tihar) naturally increase leave — this is expected, not a risk signal
6. **AI chatbot** — The HR chatbot provides general guidance. For legal HR advice, consult a qualified professional.

---

## 7. YOUR RIGHTS REGARDING AI

### 7.1 Individual Rights (Employees)

Under GDPR Article 22, EU AI Act, and our policy:

| Right | Description | How to Exercise |
|---|---|---|
| **Right to explanation** | Request an explanation of any AI recommendation that affected you | Email privacy@nephrpro.com |
| **Right to human review** | Request that any AI-influenced decision be reviewed by a human | Contact your HR manager or privacy@nephrpro.com |
| **Right to contest** | Challenge an AI-generated assessment you believe is inaccurate or unfair | Email ai-ethics@nephrpro.com |
| **Right to opt out** | Request that AI profiling is disabled for your data | Email privacy@nephrpro.com |
| **Right to transparency** | Access this AI Transparency Statement at any time | This document |

**Response time:** Within 30 days

### 7.2 Client (Organization) Rights

| Right | Description |
|---|---|
| **Audit AI outputs** | Request an audit of AI recommendations for your organization |
| **Disable specific features** | Any AI feature can be disabled per tenant configuration |
| **Access bias reports** | Enterprise clients can request bias audit results |
| **Custom thresholds** | Set your own risk thresholds for attrition alerts |

---

## 8. EU AI ACT COMPLIANCE STATUS

The EU AI Act (Regulation (EU) 2024/1689) applies to our AI systems deployed in the EU.

### 8.1 Classification Assessment

| AI Feature | EU AI Act Risk Classification | Rationale |
|---|---|---|
| Attrition Prediction | 🔴 **High-Risk** (Annex III, Category 4) | Used in employment context affecting workers |
| Resume Screening | 🔴 **High-Risk** (Annex III, Category 4) | Used in recruitment decisions |
| Salary Recommendation | 🟡 **Limited Risk** | Advisory only, no automated decisions |
| Performance Forecasting | 🟡 **Limited Risk** | Advisory only, human review required |
| AI HR Chatbot | 🟡 **Limited Risk** | General purpose chatbot, transparency required |
| Leave / Attendance Analytics | 🟢 **Minimal Risk** | Operational analytics, no individual profiling |

### 8.2 High-Risk AI Compliance Checklist

For Attrition Prediction & Resume Screening (High-Risk):

| Requirement | Status | Target Date |
|---|---|---|
| Technical documentation prepared | ✅ Complete | June 2026 |
| Risk management system | ✅ Complete | June 2026 |
| Data governance documentation | ✅ Complete | June 2026 |
| Human oversight mechanisms | ✅ Implemented | June 2026 |
| Transparency to users | ✅ This document | June 2026 |
| Accuracy, robustness metrics | ✅ Published above | June 2026 |
| Bias monitoring system | ✅ Monthly audits | June 2026 |
| Logging and traceability | ✅ Audit trail | June 2026 |
| User instructions provided | ✅ In-app help | June 2026 |
| EU AI Register entry | 🔄 In progress | Q3 2026 |
| Conformity assessment | 🔄 Planned | Q3 2026 |
| CE Mark (if required) | 📅 Planned | 2027 |
| Notified Body involvement | 📅 Planned | Q3 2026 |

### 8.3 AI Transparency Obligations (Limited Risk AI)

For chatbot and other limited-risk AI features, we disclose:
- That the user is interacting with an AI system (not a human)
- The purpose and capabilities of the AI
- The limitations of the AI's knowledge
- How to reach a human HR professional

---

## 9. GLOBAL AI REGULATION COMPLIANCE TRACKER

| Regulation | Jurisdiction | Our Status |
|---|---|---|
| EU AI Act | European Union | 🔄 Assessment in progress |
| GDPR Article 22 | EU / UK | ✅ Human oversight implemented |
| UK AI Regulatory Framework | UK | ✅ Voluntary principles adopted |
| US Executive Order on AI (Oct 2023) | USA | ✅ Safety practices implemented |
| India DPDP Act 2023 | India | ✅ Consent + purpose limitation |
| Nepal Privacy Act 2018 | Nepal | ✅ Full compliance |
| UAE AI Strategy 2031 | UAE | 📅 Assessment planned Q4 2026 |
| Saudi AI Ethics Principles | Saudi Arabia | 📅 Assessment planned Q4 2026 |

---

## 10. AI GOVERNANCE STRUCTURE

| Role | Responsibility |
|---|---|
| **AI Ethics Lead** | Oversees responsible AI practices, bias monitoring |
| **Data Protection Officer** | Ensures AI compliance with privacy law |
| **Engineering Lead** | Technical implementation of AI safeguards |
| **Legal Counsel** | Monitors AI regulation changes globally |
| **Product Manager** | Ensures AI features serve legitimate HR purposes |

**AI Ethics Committee** meets monthly to review:
- Model accuracy and drift
- Bias audit results
- Regulatory updates
- User feedback and complaints

---

## 11. INCIDENT REPORTING FOR AI

If you believe our AI has produced a discriminatory, inaccurate, or harmful output:

1. **Email:** ai-ethics@nephrpro.com
2. **Subject line:** "AI Concern — [Feature Name]"
3. **Include:** Description of the output, when it occurred, why you believe it is problematic
4. **Response:** We will acknowledge within 5 business days and investigate fully

All AI concern reports are reviewed by the AI Ethics Committee and DPO.

---

## 12. UPDATES TO THIS STATEMENT

This statement is reviewed:
- **Quarterly** — for accuracy metric updates
- **On new AI feature release** — before public deployment
- **On material regulatory change** — within 30 days

---

*Document Owner: NepHR Pro AI Ethics Lead & DPO*
*Created: June 11, 2026 | Next Review: September 11, 2026*
*© 2026 NepHR Pro Pvt. Ltd.*
*Subject to legal review. Accuracy figures based on internal testing as of June 2026.*

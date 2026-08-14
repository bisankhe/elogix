"""
FILE: backend/routes/ai_chat_routes.py
eLogix HRMS — AI HR Chatbot API Routes
Endpoints:
  POST /api/v1/ai-chat/session          Create new chat session
  GET  /api/v1/ai-chat/sessions         List sessions for current user
  POST /api/v1/ai-chat/message          Send message + get AI reply
  GET  /api/v1/ai-chat/session/<id>     Get session with messages
  DELETE /api/v1/ai-chat/session/<id>   Delete a session
  POST /api/v1/ai-chat/feedback         Rate a message
  GET  /api/v1/ai-chat/usage            Usage stats for current company
eLogix Technologies · www.elogix.com.np
"""
import time, uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from anthropic import Anthropic
from ..config.settings import Config
from ..middleware.auth import require_auth
from ..database import db_session
from ..utils.logging_config import get_logger

log = get_logger('elogix.ai_chat')

ai_chat_bp = Blueprint('ai_chat', __name__, url_prefix='/api/v1/ai-chat')

# ── Lazy Anthropic client ──────────────────────────────────────
_client = None
def get_client():
    global _client
    if _client is None and Config.ANTHROPIC_API_KEY:
        _client = Anthropic(api_key=Config.ANTHROPIC_API_KEY)
    return _client

# ── Nepal Labour Act 2074 knowledge (always available, no API needed) ──
NEPAL_LABOUR_LAW = """
NEPAL LABOUR ACT 2074 — KEY PROVISIONS FOR eLogix HRMS:
- Probation: Max 6 months (extendable once with written consent). 15 days notice during probation.
- Annual leave: 18 working days per year (after 1 year service). Max 60 days accumulation.
- Sick leave: 12 days per year (first 6 days guaranteed paid from Day 1).
- Maternity leave: 98 days total (60 days paid). Before/after delivery.
- Paternity leave: 15 working days fully paid.
- Mourning leave: 13 days for close family death.
- SSF: Employee 11% + Employer 20% = 31% of basic salary. Filed 15th of following month.
- Minimum wage: NPR 17,300/month (FY 2080-81). Basic NPR 13,450 + DA NPR 3,850.
- Gratuity: 8.33% of basic salary per year. Minimum 1 year service. Tax-exempt up to NPR 5L.
- Festival allowance: 1 month basic salary per year (usually Dashain).
- Notice period: 30 days (or 1 month salary in lieu) after confirmation.
- Overtime: 1.5x rate. Max 4 hrs/day, 24 hrs/week, 200 hrs/year.
- Working hours: 8 hrs/day, 48 hrs/week. Rest 30 min after 5 hrs continuous work.
- CIT slabs FY 2080-81: Up to 4L→1%, 4-5L→10%, 5-7L→20%, 7-20L→30%, above 50L→36%.
- Termination: 1 month notice or salary in lieu. 90 days for retrenchment.
- Written employment contract mandatory for all employees (Section 10).
- Anti-discrimination: No discrimination on gender, caste, religion, disability.
"""

ELOGIX_COMPANY_CONTEXT = """
ELOGIX HRMS SYSTEM CONTEXT:
- Platform: eLogix HRMS (elogix.com.np) — Nepal's AI-Powered HR Management System
- Modules: Employee Lifecycle, Attendance, Leave, Payroll (SSF/PF/CIT), Recruitment (ATS),
  Performance (KPI/OKR), Training (LMS), Compliance, Finance, Organization Management
- Nepal Labour Act 2074 compliant
- Multi-tenant SaaS: Each company gets isolated schema
- Languages: English, Nepali, Hindi
"""

def build_system_prompt(role: str, persona_label: str, user_name: str, company_name: str) -> str:
    """Build role-aware system prompt for the AI."""
    role_context = {
        'super_admin': """You are talking to the SUPER ADMIN. Provide COMPLETE access:
- All financial data, payroll costs, SSF liabilities, budget analysis
- All employee records, HR metrics, strategic reports
- System configuration guidance, integration support
- Full strategic analytics: attrition, performance, compensation benchmarking
- Board-level reports and executive briefings""",

        'executive': """You are talking to a C-LEVEL EXECUTIVE / CEO / DIRECTOR. Focus on:
- Strategic workforce intelligence and business impact analysis
- ROI of HR decisions, cost savings, competitive positioning
- Risk assessment: attrition risk, compliance risk, financial exposure
- Board-ready summaries, 90-day forecasts, scenario planning
- KPIs and OKRs at organizational level""",

        'hr_manager': """You are talking to the HR MANAGER. Full HR operational access:
- All HR policies, procedures, and Nepal Labour Act 2074 interpretation
- Payroll processing, SSF/CIT/gratuity calculations and compliance
- Recruitment pipeline management, ATS, onboarding
- Performance reviews, training plans, disciplinary procedures
- Document drafting: offer letters, warning letters, policies, procedures
- Monthly/quarterly HR reports and analytics""",

        'hr_officer': """You are talking to an HR OFFICER. Access includes:
- Employee records management (excluding sensitive financial details)
- Leave and attendance administration
- Recruitment coordination: scheduling, communications, documentation
- Training administration and tracking
- HR document templates and standard procedures
- Nepal Labour Act basic provisions""",

        'finance': """You are talking to a FINANCE TEAM MEMBER. Focus on:
- Payroll calculations, SSF/CIT/gratuity precise amounts
- Financial compliance: IRD filing, SSF filing deadlines
- Cost per employee, headcount cost analysis
- Budget variance analysis for HR
- Payroll audit trails and reconciliation""",

        'hod': """You are talking to a DEPARTMENT HEAD / HOD. Focus on:
- Their team's HR data: attendance, leave, performance, training
- Team management policies and approval procedures
- Leave and overtime management for their department
- Team performance reviews and goal setting
- Department-level recruitment coordination
DO NOT provide: other departments' individual data, company-wide financials, confidential HR data of others.""",

        'recruiter': """You are talking to a RECRUITER. Focus on:
- End-to-end recruitment process and ATS pipeline management
- Job description writing, job advertisement creation
- Interview frameworks, structured scoring rubrics
- Candidate communication templates (offer, rejection, scheduling)
- Onboarding coordination and documentation
- Nepal-specific hiring practices, work permit requirements""",

        'employee': """You are talking to an EMPLOYEE (self-service only). Provide:
- Their personal entitlements: leave balance, salary structure, benefits
- General HR policies applicable to ALL employees
- Nepal Labour Act 2074 — employee rights and entitlements
- How to submit requests: leave, expense, loan, grievance
- Company processes for common requests
DO NOT provide: other employees' data, salary details of others, financial reports, confidential information.""",
    }

    base_role = role_context.get(role, role_context['employee'])

    return f"""You are the eLogix HRMS AI HR Assistant — an intelligent, empathetic, and expert HR chatbot built into eLogix HRMS, Nepal's most advanced AI-powered Human Resources Management System.

## WHO YOU ARE TALKING TO
Name: {user_name or 'User'}
Role: {persona_label or role or 'Employee'}
Company: {company_name or 'Your Company'}

## YOUR ROLE MANDATE
{base_role}

{NEPAL_LABOUR_LAW}

{ELOGIX_COMPANY_CONTEXT}

## RESPONSE RULES
1. ALWAYS respond in the SAME LANGUAGE the user writes in:
   - English message → English response
   - Nepali (नेपाली) message → Nepali response
   - Hindi (हिंदी) message → Hindi response
2. Give COMPLETE, ACTIONABLE answers — never say "I can't help with that" for reasonable HR questions
3. Cite Nepal Labour Act 2074 section when discussing legal matters
4. Use proper formatting: headers (##), tables (|col|), bullet points (-)
5. For calculations, show the formula AND the result
6. For document requests, provide the ACTUAL draft (not just a description)
7. Be warm and professional — like a trusted HR colleague
8. End complex answers with "⚡ Quick Action:" suggesting the next step in eLogix HRMS
9. For sensitive topics (termination, disciplinary action), remind that HR Manager approval is needed
10. NEVER make up employee-specific data — acknowledge you're providing general guidance"""


# ── ROUTES ────────────────────────────────────────────────────

@ai_chat_bp.post('/message')
@require_auth
def send_message():
    """
    Main chat endpoint — takes a message + history, returns AI reply.
    Also saves to DB if session_id provided.
    Body: { message, history, session_id?, role?, persona_label?, user_name?, company_name? }
    """
    try:
        body         = request.get_json() or {}
        message      = (body.get('message') or '').strip()
        history      = body.get('history', [])
        session_id   = body.get('session_id')
        role         = body.get('role', 'employee')
        persona_label= body.get('persona_label', '')
        user_name    = body.get('user_name', '')
        company_name = body.get('company_name', '')
        max_tokens   = min(int(body.get('max_tokens', 2000)), 4096)

        if not message:
            return jsonify({'error': 'message is required'}), 400

        system   = build_system_prompt(role, persona_label, user_name, company_name)
        messages = history + [{'role': 'user', 'content': message}]

        client   = get_client()
        start    = time.time()
        ai_text  = None
        tokens_in= tokens_out = 0

        if client:
            try:
                resp      = client.messages.create(
                    model     = Config.ANTHROPIC_MODEL or 'claude-sonnet-4-6',
                    max_tokens= max_tokens,
                    system    = system,
                    messages  = messages,
                )
                ai_text   = resp.content[0].text
                tokens_in = resp.usage.input_tokens
                tokens_out= resp.usage.output_tokens
            except Exception as e:
                log.warning('Anthropic API error: %s', e)

        latency = int((time.time() - start) * 1000)

        # If no API response, provide built-in answer
        if not ai_text:
            ai_text = _builtin_answer(message, role)

        # Save to DB if session_id provided and DB available
        if session_id:
            try:
                _save_messages(session_id, message, ai_text, tokens_in, tokens_out)
            except Exception as e:
                log.warning('DB save failed: %s', e)

        return jsonify({
            'reply':      ai_text,
            'tokens_in':  tokens_in,
            'tokens_out': tokens_out,
            'latency_ms': latency,
            'session_id': session_id,
            'model':      Config.ANTHROPIC_MODEL or 'claude-sonnet-4-6',
            'has_ai':     client is not None,
        })

    except Exception as e:
        log.error('AI chat error: %s', e)
        return jsonify({
            'reply': _builtin_answer(body.get('message',''), body.get('role','employee')),
            'has_ai': False,
            'error': str(e)[:100],
        })


@ai_chat_bp.post('/session')
@require_auth
def create_session():
    """Create a new chat session and return session_id."""
    body  = request.get_json() or {}
    sid   = str(uuid.uuid4())
    return jsonify({
        'session_id': sid,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'model':      Config.ANTHROPIC_MODEL or 'claude-sonnet-4-6',
    })


@ai_chat_bp.get('/health')
def health():
    """Health check — is AI configured?"""
    has_key = bool(Config.ANTHROPIC_API_KEY and Config.ANTHROPIC_API_KEY != 'sk-ant-your-key-here')
    return jsonify({
        'ok':      has_key,
        'model':   Config.ANTHROPIC_MODEL or 'claude-sonnet-4-6',
        'message': 'AI ready' if has_key else 'Set ANTHROPIC_API_KEY in .env',
    })


@ai_chat_bp.post('/feedback')
@require_auth
def save_feedback():
    """Save thumbs up/down on a message."""
    body = request.get_json() or {}
    # In production: update AIChatMessage.feedback in DB
    return jsonify({'ok': True, 'feedback': body.get('feedback')})


@ai_chat_bp.get('/usage')
@require_auth
def get_usage():
    """Return AI usage stats for the current company this month."""
    month = datetime.now(timezone.utc).strftime('%Y-%m')
    # In production: query AIUsageLog for g.company_id, month
    return jsonify({
        'month':         month,
        'queries_used':  142,
        'tokens_used':   89340,
        'plan_limit':    1000,
        'plan_pct':      14.2,
        'modules': {
            'hr_chatbot':  87,
            'bi_engine':   35,
            'hr_letters':  20,
        }
    })


# ── HELPERS ───────────────────────────────────────────────────
def _save_messages(session_id, user_msg, ai_reply, tokens_in, tokens_out):
    """Save user + assistant messages to DB."""
    pass   # production: INSERT into ai_chat_messages

def _builtin_answer(text: str, role: str) -> str:
    """Instant answers without API key — covers most common HR questions."""
    lo = text.lower()

    if any(w in lo for w in ['probation','trial period','परिवीक्षा']):
        return """## Probation Period — Nepal Labour Act 2074

**Duration:** Maximum **6 months** (Section 34)
- Extendable **once** with mutual written consent (max 3 more months)
- During probation: either party can terminate with **15 days notice**
- After probation: 30 days notice required

**eLogix HRMS:** Probation reminders are automatic. Go to **Employee Lifecycle → Probation Tracker**.

⚡ **Quick Action:** Check pending probation confirmations in eLogix → Employee Lifecycle"""

    if any(w in lo for w in ['ssf','social security','सामाजिक सुरक्षा']):
        return """## SSF Contribution Rates — Nepal Labour Act 2074

| Contributor | Rate | On |
|-------------|------|----|
| **Employee** | **11%** | Basic salary |
| **Employer** | **20%** | Basic salary |
| **Total** | **31%** | Basic salary |

**Filing deadline:** 15th of following Nepali month
**Filed with:** Social Security Fund (SSF) office

**Example — NPR 60,000 basic:**
- Employee: NPR 6,600 | Employer: NPR 12,000 | Total: NPR 18,600/month

⚡ **Quick Action:** eLogix → Finance → SSF Filing to generate this month's report"""

    if any(w in lo for w in ['leave','बिदा','छुट्टी','annual leave','sick leave']):
        return """## Leave Entitlements — Nepal Labour Act 2074

| Leave Type | Days | Paid | When |
|-----------|------|------|------|
| **Annual Leave** | **18 days/year** | ✅ Full | After 1 year service |
| **Sick Leave** | **12 days/year** | ✅ Full | First 6 days guaranteed |
| **Maternity** | **98 days** | ✅ 60 days paid | Female employees |
| **Paternity** | **15 days** | ✅ Full | Male employees |
| **Mourning** | **13 days** | ✅ Full | Close family death |
| **Study Leave** | **12 days/year** | Half pay | With approval |

**Accumulation:** Annual leave carries forward (max 60 days)

⚡ **Quick Action:** eLogix → HR Services → Leave Management"""

    if any(w in lo for w in ['gratuity','उपदान','severance']):
        return """## Gratuity — Nepal Labour Act 2074 Section 52

**Formula:** Basic Salary × 8.33% × Years of Service

**Minimum service:** 1 full year
**Tax exempt:** Up to NPR 5,00,000

**Example — NPR 60,000/month, 5 years:**
= NPR 60,000 × 0.0833 × 5 = **NPR 24,990/month × 12 months × ... = NPR 2,99,880**

⚡ **Quick Action:** eLogix → Finance → Gratuity Calculator"""

    if any(w in lo for w in ['minimum wage','न्यूनतम तलब','न्यूनतम ज्याला']):
        return """## Minimum Wage Nepal — FY 2080-81

**Monthly minimum:** NPR **17,300**
- Basic: NPR 13,450
- Dearness Allowance: NPR 3,850

**Daily wage:** NPR 685/day
**Reviewed:** Every 2 years by Government of Nepal

*Source: Nepal Labour Ministry Notification 2080*"""

    if any(w in lo for w in ['overtime','ओभरटाइम','extra hours']):
        return """## Overtime Rules — Nepal Labour Act 2074

**Rate:** 1.5× (150%) of normal hourly rate
**Limits:** Max **4 hrs/day**, **24 hrs/week**, **200 hrs/year**

**Calculation:**
- Hourly rate = Monthly salary ÷ 26 days ÷ 8 hrs
- OT rate = Hourly rate × 1.5

**Example — NPR 60,000/month:**
- Hourly = 60,000 ÷ 26 ÷ 8 = NPR 288.46
- OT/hr = NPR **432.69**

*Overtime is voluntary — cannot be forced without consent*"""

    if any(w in lo for w in ['resign','notice period','राजीनामा','छाड्ने']):
        return """## Resignation & Notice Period — Nepal Labour Act 2074

**Employee resignation:**
- Notice required: **30 days** written notice
- Or: Pay 1 month salary in lieu of notice

**Final settlement (within 30 days):**
- Pending salary + Leave encashment + Gratuity (if 1+ yr)
- Festival allowance (pro-rata) + SSF final settlement

**Documents required:**
1. Resignation letter → HR acknowledgement
2. Department handover completion
3. Clearance from Finance, IT, Admin
4. Experience letter + Relieving letter

⚡ **Quick Action:** eLogix → Employee Lifecycle → Exit Management"""

    if any(w in lo for w in ['cit','income tax','कर','tax slab']):
        return """## Income Tax (CIT) — Nepal FY 2080-81

**Annual Income Tax Slabs:**
| Annual Income | Tax Rate |
|--------------|---------|
| Up to NPR 5,00,000 | 1% |
| NPR 5L – 7L | 10% |
| NPR 7L – 20L | 20% |
| NPR 20L – 50L | 30% |
| Above NPR 50L | 36% |

**Married (Couple):** 10% relief on each slab

**Key deductions:**
- SSF employee contribution (11%) — deductible
- Life insurance premium — up to NPR 25,000
- Remote allowance — fully exempt

⚡ **Quick Action:** eLogix → Finance → CIT Calculator"""

    # Greeting
    if lo.strip() in ['hi','hello','namaste','नमस्ते','hey','हाय'] or not lo.strip():
        return f"""नमस्ते! 🙏 I'm your **eLogix HRMS AI HR Assistant**.

I can instantly help you with:

| Topic | Examples |
|-------|---------|
| ⚖️ **Nepal Labour Act 2074** | Leave rules, SSF, gratuity, termination |
| 💰 **Payroll & Tax** | SSF calculation, CIT slabs, overtime pay |
| 📋 **HR Documents** | Offer letters, warning letters, policies |
| 🎯 **Recruitment** | Job descriptions, interview questions |
| 📊 **HR Reports** | Attrition, headcount, performance |
| 👤 **Self-Service** | My leave balance, salary, rights |

Ask me anything in **English 🇬🇧 | Nepali 🇳🇵 | Hindi 🇮🇳**

*Type a question or click a topic from the sidebar →*"""

    # Generic helpful response
    return f"""I understand you're asking about: **"{text}"**

Let me help you. Here are the most relevant resources:

**For HR & Labour Law questions:**
- Ask: *"What is the probation period?"* → Instant Nepal Labour Act answer
- Ask: *"Calculate SSF for NPR 80,000"* → Instant calculation

**For Documents:**
- Ask: *"Draft an offer letter for NPR 1.2L/month"* → Complete template
- Ask: *"Write a warning letter for late attendance"* → Ready template

**For Reports:**
- Ask: *"Monthly HR report"* → Full strategic report
- Ask: *"Attrition risk analysis"* → 90-day predictive brief

*For full AI answers on any HR topic, ensure ANTHROPIC_API_KEY is configured in eLogix .env*

⚡ **Quick Action:** Try typing your question more specifically — I work best with direct questions!"""

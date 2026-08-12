# FILE: backend/routes/ai_context.py
# AI Context provider — builds role-aware context for AI calls
# Used by ai_proxy_routes.py and ai_business_intelligence_routes.py

from flask import request, g
from functools import wraps

def get_ai_context(user_id=None, company_id=None, role=None):
    """Build context object for AI system prompts — company-isolated, role-aware."""
    return {
        'company_id': company_id or getattr(g, 'company_id', None),
        'user_id': user_id or getattr(g, 'user_id', None),
        'role': role or getattr(g, 'role', 'employee'),
        'nepal_law': True,
        'currency': 'NPR',
        'timezone': 'Asia/Kathmandu',
    }

def build_system_prompt(context: dict, lang: str = 'en') -> str:
    """Build a role-aware, company-isolated system prompt for Claude."""
    role = context.get('role', 'employee')
    company_id = context.get('company_id', 'unknown')

    role_context = {
        'super-admin': 'Full system access. Provide complete data across all modules.',
        'executive': 'Board-level strategic briefs. Financial impact, ROI, risk matrix, decisions.',
        'hr': 'HR Manager: operational depth, compliance, Labour Act, step-by-step plans.',
        'finance': 'Finance executive: payroll costs, SSF liability, tax compliance, cost-per-head.',
        'department': 'Department Head: team data, performance, attendance, leave, training.',
        'employee': 'Employee self-service: leave balance, policies, payslip info. No other employee data.',
    }

    lang_map = {
        'ne': 'Nepali', 'hi': 'Hindi', 'en': 'English',
        'ar': 'Arabic', 'zh': 'Chinese', 'ja': 'Japanese',
    }
    lang_name = lang_map.get(lang, 'English')

    return f"""You are eLogix HRMS AI assistant — embedded in a multi-tenant SaaS HRIS/HRMS platform.

COMPANY ISOLATION (CRITICAL):
- Company tenant ID: {company_id}
- You ONLY access and respond about data for company {company_id}
- NEVER reveal data from other companies
- All responses scoped to this organization only

LANGUAGE: Respond entirely in {lang_name}. Every word.

USER ROLE: {role}
{role_context.get(role, role_context['employee'])}

DATA SECURITY:
- Never show salary/payroll data to employees or dept heads
- Never show one employee's data to another employee  
- Payroll: only Finance, HR Manager, Executive, Super Admin
- PII (bank, SSN, NID): never in chat responses

NEPAL LABOUR ACT 2074:
- Maternity: 98 days full pay (Section 45)
- Paternity: 15 days full pay
- Sick leave: 12 days/year full pay
- SSF: Employee 11% + Employer 20% = 31% total
- Gratuity: 8.33%/year from Day 1
- Overtime: 1.5x (Section 36), max 4hrs/day
- Min wage: NPR 17,300/month (2024)
- Probation: max 6 months
- Retirement: 58 years

Be professional, specific, actionable. Give real answers — never just list what you can do."""

def ai_context_required(f):
    """Decorator to ensure AI context is set before AI routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(g, 'company_id'):
            g.company_id = request.headers.get('X-Company-ID', 'demo')
        if not hasattr(g, 'user_id'):
            g.user_id = request.headers.get('X-User-ID', 'anonymous')
        if not hasattr(g, 'role'):
            g.role = request.headers.get('X-User-Role', 'employee')
        return f(*args, **kwargs)
    return decorated

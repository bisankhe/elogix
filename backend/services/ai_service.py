# FILE: backend/services/ai_service.py
# Claude API wrapper with company isolation, role-aware prompts, rate limiting
import os
from anthropic import Anthropic
from typing import Optional

client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY', ''))
MODEL  = os.getenv('ANTHROPIC_MODEL', 'claude-sonnet-4-6')

class AIService:
    @staticmethod
    def build_system_prompt(company_id: int, role: str, lang: str = 'en') -> str:
        lang_map = {'ne':'Nepali','hi':'Hindi','en':'English','ar':'Arabic','zh':'Chinese'}
        lang_name = lang_map.get(lang, 'English')
        role_ctx = {
            'super-admin': 'Full system access. All data visible.',
            'executive':   'Board-level briefs. Financial impact and ROI required.',
            'hr':          'HR Manager: operational depth, Labour Act compliance, action plans.',
            'finance':     'Finance: payroll costs, SSF, tax, cost-per-head.',
            'department':  'Department Head: team data, performance, attendance.',
            'employee':    'Employee self-service only. Never show other employee data.',
        }
        return f"""You are eLogix HRMS AI — embedded in a multi-tenant HRIS/HRMS SaaS platform.

COMPANY ISOLATION: Company ID {company_id}. ONLY respond about this company's data.
LANGUAGE: Respond entirely in {lang_name}. Every word.
ROLE: {role}. {role_ctx.get(role, 'Provide professional HR assistance.')}

DATA SECURITY:
- Never reveal salary/payroll to employees or dept heads
- Payroll data: Finance, HR Manager, Executive, Super Admin only
- Never show PII (bank account, NID, SSN) in chat
- Never reference other companies' data

Nepal Labour Act 2074: Maternity 98d | Paternity 15d | SSF 31% | Gratuity 8.33%/yr | OT 1.5x | Min wage NPR 17,300"""

    @classmethod
    def chat(cls, messages: list, company_id: int, role: str,
             lang: str = 'en', max_tokens: int = 2048) -> Optional[str]:
        try:
            system = cls.build_system_prompt(company_id, role, lang)
            response = client.messages.create(
                model=MODEL, max_tokens=max_tokens,
                system=system, messages=messages
            )
            return response.content[0].text if response.content else None
        except Exception as e:
            print(f"[AI ERROR] {e}")
            return None

    @classmethod
    def generate_report(cls, report_type: str, data: dict,
                        company_id: int, role: str, lang: str = 'en') -> Optional[str]:
        prompt = f"Generate a professional {report_type} report using this data: {data}"
        return cls.chat([{'role':'user','content':prompt}], company_id, role, lang, 4096)

    @classmethod
    def analyse_attrition(cls, dept_data: dict, company_id: int, lang: str = 'en') -> Optional[str]:
        prompt = f"Analyse this department attrition data and give a predictive brief with interventions: {dept_data}"
        return cls.chat([{'role':'user','content':prompt}], company_id, 'hr', lang, 2048)

# FILE: backend/services/billing_service.py
# Subscription billing — plans, usage tracking, invoice generation
# Integrates with eSewa (Nepal) and Stripe (international)
import os
from datetime import datetime, date, timedelta
from typing import Optional

# Pricing plans (NPR per employee per month)
PLANS = {
    'starter': {
        'name': 'Starter',
        'price_per_employee': 150,
        'max_employees': 50,
        'features': ['attendance', 'leave', 'payroll', 'basic_reports'],
        'ai_requests_per_month': 100,
        'storage_gb': 10,
    },
    'professional': {
        'name': 'Professional',
        'price_per_employee': 300,
        'max_employees': 500,
        'features': ['all_starter', 'performance', 'recruitment', 'ai_analytics', 'advanced_reports'],
        'ai_requests_per_month': 1000,
        'storage_gb': 100,
    },
    'enterprise': {
        'name': 'Enterprise',
        'price_per_employee': 500,
        'max_employees': 10000,
        'features': ['all_professional', 'custom_workflows', 'api_access', 'dedicated_support', 'white_label'],
        'ai_requests_per_month': 10000,
        'storage_gb': 1000,
    },
    'trial': {
        'name': '30-Day Free Trial',
        'price_per_employee': 0,
        'max_employees': 50,
        'features': ['all_professional'],
        'ai_requests_per_month': 200,
        'storage_gb': 5,
        'trial_days': 30,
    },
}

class BillingService:
    @staticmethod
    def calculate_invoice(company_id: int, plan: str, employee_count: int,
                          month: date = None) -> dict:
        """Calculate monthly invoice for a company."""
        if month is None:
            month = date.today().replace(day=1)

        plan_config = PLANS.get(plan, PLANS['starter'])
        base_price  = plan_config['price_per_employee'] * employee_count

        # SSF (Nepal VAT 13%)
        vat_rate    = 0.13
        vat_amount  = round(base_price * vat_rate)
        total       = base_price + vat_amount

        return {
            'company_id':      company_id,
            'invoice_month':   month.strftime('%B %Y'),
            'plan':            plan_config['name'],
            'employee_count':  employee_count,
            'rate_per_head':   plan_config['price_per_employee'],
            'subtotal_npr':    base_price,
            'vat_13pct_npr':   vat_amount,
            'total_npr':       total,
            'due_date':        (month + timedelta(days=30)).strftime('%Y-%m-%d'),
            'currency':        'NPR',
        }

    @staticmethod
    def check_plan_limits(company_id: int, plan: str,
                          current_employees: int, current_storage_gb: float) -> dict:
        """Check if company is within plan limits."""
        config = PLANS.get(plan, PLANS['starter'])
        issues = []
        if current_employees > config['max_employees']:
            issues.append(f"Employee count {current_employees} exceeds plan limit {config['max_employees']}")
        if current_storage_gb > config['storage_gb']:
            issues.append(f"Storage {current_storage_gb}GB exceeds plan limit {config['storage_gb']}GB")
        return {
            'within_limits': len(issues) == 0,
            'issues':        issues,
            'employee_usage_pct': round(current_employees / config['max_employees'] * 100),
            'storage_usage_pct':  round(current_storage_gb / config['storage_gb'] * 100),
        }

    @staticmethod
    def get_trial_status(created_at: datetime) -> dict:
        """Check if trial period is still active."""
        trial_days  = PLANS['trial']['trial_days']
        expires_at  = created_at + timedelta(days=trial_days)
        now         = datetime.utcnow()
        days_left   = (expires_at - now).days
        return {
            'is_active':   days_left > 0,
            'days_left':   max(0, days_left),
            'expires_at':  expires_at.strftime('%Y-%m-%d'),
            'expired':     days_left <= 0,
        }

    @staticmethod
    def initiate_esewa_payment(amount_npr: int, company_id: int,
                                invoice_id: str) -> dict:
        """Generate eSewa payment parameters (Nepal)."""
        ESEWA_MERCHANT = os.getenv('ESEWA_MERCHANT_CODE', 'NEPHRPRO')
        ESEWA_URL      = os.getenv('ESEWA_URL', 'https://esewa.com.np/epay/main')
        success_url    = f"{os.getenv('APP_URL', 'http://localhost:5173')}/billing/success"
        failure_url    = f"{os.getenv('APP_URL', 'http://localhost:5173')}/billing/failed"
        return {
            'gateway':     'eSewa',
            'url':         ESEWA_URL,
            'amount':      amount_npr,
            'tax_amount':  0,
            'total_amount':amount_npr,
            'product_code':ESEWA_MERCHANT,
            'product_service_charge': 0,
            'product_delivery_charge': 0,
            'success_url': success_url,
            'failure_url': failure_url,
            'signed_field_names': 'total_amount,transaction_uuid,product_code',
        }

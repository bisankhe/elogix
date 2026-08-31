# FILE: backend/utils/email_service.py
# eLogix HRMS — Email Service
# Handles all outgoing emails: welcome, OTP, payslip, leave alerts, etc.
# Uses Flask-Mail with SMTP. Can be swapped for SendGrid/SES via env var.
# eLogix Technologies · www.elogix.com.np

import logging
from datetime import datetime
from flask import current_app
from jinja2 import Template

logger = logging.getLogger('elogix.email')


# ══════════════════════════════════════════════════════════════════════
# EMAIL TEMPLATES (inline — no external files needed)
# ══════════════════════════════════════════════════════════════════════

TEMPLATES = {

'welcome_tenant': """
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto">
<div style="background:linear-gradient(135deg,#1e1b4b,#7c3aed);padding:32px;border-radius:12px 12px 0 0;text-align:center">
  <h1 style="color:#fff;margin:0;font-size:24px">🎉 Welcome to eLogix HRMS!</h1>
  <p style="color:rgba(255,255,255,.8);margin:8px 0 0">AI-Powered Human Resource Management</p>
</div>
<div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
  <p>Hello <strong>{{ admin_name }}</strong>,</p>
  <p>Your eLogix account for <strong>{{ company_name }}</strong> has been approved and activated!</p>
  <div style="background:#f8fafc;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #7c3aed">
    <p style="margin:0 0 8px"><strong>Your Portal:</strong> <a href="{{ portal_url }}" style="color:#7c3aed">{{ portal_url }}</a></p>
    <p style="margin:0 0 8px"><strong>Login Email:</strong> {{ admin_email }}</p>
    <p style="margin:0"><strong>Plan:</strong> {{ plan | capitalize }}</p>
  </div>
  <a href="{{ portal_url }}" style="display:block;background:#7c3aed;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;margin:24px 0">
    🚀 Access Your HRMS Portal
  </a>
  <p style="color:#64748b;font-size:12px">Need help? Contact us at <a href="mailto:support@elogix.com.np">support@elogix.com.np</a></p>
</div>
</body></html>
""",

'otp': """
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
  <h2 style="color:#1e293b">🔐 Your Verification Code</h2>
  <p>Hello {{ name }},</p>
  <p>Use this OTP to verify your {{ purpose }}:</p>
  <div style="text-align:center;margin:24px 0">
    <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#7c3aed;background:#f5f3ff;padding:16px 24px;border-radius:12px;display:inline-block">
      {{ otp }}
    </span>
  </div>
  <p style="color:#64748b">This code expires in <strong>{{ expiry_minutes }} minutes</strong>. Do not share it with anyone.</p>
  <p style="color:#94a3b8;font-size:12px">eLogix Technologies · support@elogix.com.np</p>
</div>
""",

'leave_approval': """
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
  <div style="background:{{ '#16a34a' if approved else '#dc2626' }};padding:20px;color:#fff">
    <h2 style="margin:0">{{ '✅ Leave Approved' if approved else '❌ Leave Rejected' }}</h2>
  </div>
  <div style="padding:24px">
    <p>Hello <strong>{{ employee_name }}</strong>,</p>
    <p>Your leave request has been <strong>{{ 'approved' if approved else 'rejected' }}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f8fafc"><td style="padding:8px 12px"><strong>Leave Type</strong></td><td style="padding:8px 12px">{{ leave_type }}</td></tr>
      <tr><td style="padding:8px 12px"><strong>From</strong></td><td style="padding:8px 12px">{{ from_date }}</td></tr>
      <tr style="background:#f8fafc"><td style="padding:8px 12px"><strong>To</strong></td><td style="padding:8px 12px">{{ to_date }}</td></tr>
      <tr><td style="padding:8px 12px"><strong>Days</strong></td><td style="padding:8px 12px">{{ days }}</td></tr>
      {% if reason %}<tr style="background:#f8fafc"><td style="padding:8px 12px"><strong>Reason</strong></td><td style="padding:8px 12px">{{ reason }}</td></tr>{% endif %}
    </table>
    {% if not approved and reject_reason %}
    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px;border-radius:4px">
      <strong>Rejection reason:</strong> {{ reject_reason }}
    </div>
    {% endif %}
  </div>
</div>
""",

'payslip_ready': """
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
  <div style="background:#1e1b4b;padding:20px;color:#fff;text-align:center">
    <h2 style="margin:0">💰 Your Payslip is Ready</h2>
    <p style="margin:4px 0 0;opacity:.8">{{ pay_month }}</p>
  </div>
  <div style="padding:24px">
    <p>Hello <strong>{{ employee_name }}</strong>,</p>
    <p>Your salary for <strong>{{ pay_month }}</strong> has been processed.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;margin:16px 0">
      <p style="margin:0;color:#64748b;font-size:12px">Net Salary</p>
      <p style="margin:4px 0;font-size:28px;font-weight:900;color:#16a34a">NPR {{ net_salary }}</p>
    </div>
    <a href="{{ portal_url }}/payslip" style="display:block;background:#7c3aed;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:bold">
      📄 View & Download Payslip
    </a>
  </div>
</div>
""",

'password_reset': """
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
  <h2 style="color:#1e293b">🔑 Reset Your Password</h2>
  <p>Hello {{ name }},</p>
  <p>Click the button below to reset your eLogix password. This link expires in <strong>30 minutes</strong>.</p>
  <a href="{{ reset_url }}" style="display:block;background:#7c3aed;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;margin:24px 0">
    Reset Password
  </a>
  <p style="color:#94a3b8;font-size:12px">If you didn't request this, ignore this email. Your password won't change.</p>
</div>
""",
}


# ══════════════════════════════════════════════════════════════════════
# EMAIL SERVICE CLASS
# ══════════════════════════════════════════════════════════════════════

class EmailService:

    @staticmethod
    def _render(template_name: str, **context) -> str:
        html = TEMPLATES.get(template_name, '')
        return Template(html).render(**context)

    @staticmethod
    def _send(to: str | list, subject: str, html: str, text: str = None):
        """Send email using Flask-Mail. Falls back to log if not configured."""
        try:
            from flask_mail import Message
            from backend.extensions import mail

            msg = Message(
                subject    = f'[eLogix] {subject}',
                recipients = [to] if isinstance(to, str) else to,
                html       = html,
                body       = text or 'Please view this email in HTML.',
                sender     = current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@elogix.com.np'),
            )
            mail.send(msg)
            logger.info(f'Email sent: {subject} → {to}')
            return True

        except Exception as e:
            logger.error(f'Email send failed [{subject}]: {e}')
            # In development, log the email instead of failing
            if current_app.config.get('DEBUG'):
                logger.info(f'[DEV EMAIL]\nTo: {to}\nSubject: {subject}\n{html[:500]}')
            return False

    # ── Public methods ─────────────────────────────────────────────

    @classmethod
    def send_welcome_tenant(cls, admin_email: str, admin_name: str,
                             company_name: str, plan: str, portal_url: str):
        html = cls._render('welcome_tenant',
            admin_name=admin_name, admin_email=admin_email,
            company_name=company_name, plan=plan, portal_url=portal_url
        )
        return cls._send(admin_email, f'Welcome to eLogix — {company_name}!', html)

    @classmethod
    def send_otp(cls, email: str, name: str, otp: str,
                 purpose: str = 'login', expiry_minutes: int = 10):
        html = cls._render('otp', name=name, otp=otp,
                            purpose=purpose, expiry_minutes=expiry_minutes)
        return cls._send(email, f'Your eLogix OTP: {otp}', html)

    @classmethod
    def send_leave_decision(cls, employee_email: str, employee_name: str,
                             leave_type: str, from_date: str, to_date: str,
                             days: float, approved: bool,
                             reason: str = None, reject_reason: str = None):
        html = cls._render('leave_approval',
            employee_name=employee_name, leave_type=leave_type,
            from_date=from_date, to_date=to_date, days=days,
            approved=approved, reason=reason, reject_reason=reject_reason
        )
        subject = f"Leave {'Approved' if approved else 'Rejected'} — {from_date} to {to_date}"
        return cls._send(employee_email, subject, html)

    @classmethod
    def send_payslip_notification(cls, employee_email: str, employee_name: str,
                                   pay_month: str, net_salary: str, portal_url: str):
        html = cls._render('payslip_ready',
            employee_name=employee_name, pay_month=pay_month,
            net_salary=net_salary, portal_url=portal_url
        )
        return cls._send(employee_email, f'Your Payslip is Ready — {pay_month}', html)

    @classmethod
    def send_password_reset(cls, email: str, name: str, reset_url: str):
        html = cls._render('password_reset', name=name, reset_url=reset_url)
        return cls._send(email, 'Password Reset Request', html)

    @classmethod
    def send_bulk(cls, recipients: list[dict], template: str, subject: str):
        """Send same email to multiple recipients (e.g. payslip notification batch)."""
        success = 0
        for r in recipients:
            if cls._send(r['email'], subject, cls._render(template, **r)):
                success += 1
        logger.info(f'Bulk email {template}: {success}/{len(recipients)} sent')
        return success


# Convenience instance
email_service = EmailService()

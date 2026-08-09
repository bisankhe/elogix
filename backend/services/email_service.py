"""
FILE: backend/services/email_service.py
eLogix HRMS — Transactional Email Service (SendGrid)
"""
import os
from ..utils.logging_config import get_logger
logger = get_logger("elogix.email")

FROM_EMAIL = os.getenv("FROM_EMAIL", "hr@elogix.com.np")
FROM_NAME  = os.getenv("FROM_NAME", "eLogix HRMS")
SENDGRID_KEY = os.getenv("SENDGRID_API_KEY", "")

class EmailService:
    @staticmethod
    def _send(to_email, to_name, subject, html_body):
        if not SENDGRID_KEY:
            logger.warning(f"eLogix Email: SENDGRID_API_KEY not set — skipping send to {to_email}")
            return False
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Email, To, Content
            msg = Mail(
                from_email=Email(FROM_EMAIL, FROM_NAME),
                to_emails=To(to_email, to_name),
                subject=subject,
                html_content=Content("text/html", html_body)
            )
            r = SendGridAPIClient(SENDGRID_KEY).send(msg)
            logger.info(f"eLogix Email: sent '{subject}' to {to_email} — status {r.status_code}")
            return r.status_code in (200, 201, 202)
        except Exception as e:
            logger.error(f"eLogix Email: failed to send to {to_email}: {e}")
            return False

    @classmethod
    def send_welcome(cls, to_email, to_name, portal_url, temp_password, company_name):
        return cls._send(to_email, to_name,
            f"Welcome to eLogix HRMS — {company_name}",
            f"""<h2>🎉 Welcome to eLogix HRMS!</h2>
<p>Hi {to_name},</p>
<p>Your eLogix account for <b>{company_name}</b> is ready.</p>
<p><b>Portal:</b> <a href="{portal_url}">{portal_url}</a><br>
<b>Email:</b> {to_email}<br>
<b>Temporary Password:</b> <code>{temp_password}</code></p>
<p style="color:red">⚠️ Please change your password on first login.</p>
<p>Support: <a href="mailto:support@elogix.com.np">support@elogix.com.np</a> | <a href="https://www.elogix.com.np">www.elogix.com.np</a></p>""")

    @classmethod
    def send_password_reset(cls, to_email, to_name, reset_url, company_name):
        return cls._send(to_email, to_name,
            "eLogix HRMS — Password Reset",
            f"""<h2>🔐 eLogix Password Reset</h2>
<p>Hi {to_name},</p>
<p>A password reset was requested for your eLogix account at {company_name}.</p>
<p><a href="{reset_url}" style="background:#4338ca;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Reset Password</a></p>
<p>Link expires in 2 hours. If you didn't request this, ignore this email.</p>
<p>eLogix Technologies | <a href="https://www.elogix.com.np">www.elogix.com.np</a></p>""")

    @classmethod
    def send_password_reset_admin(cls, to_email, to_name, temp_password, company_name):
        return cls._send(to_email, to_name,
            "eLogix HRMS — Password Reset by Admin",
            f"""<h2>🔐 Password Reset — {company_name}</h2>
<p>Hi {to_name}, your eLogix password has been reset by your administrator.</p>
<p><b>Temporary Password:</b> <code>{temp_password}</code></p>
<p style="color:red">⚠️ Change your password immediately after logging in.</p>""")

    @classmethod
    def send_invoice(cls, to_email, to_name, company_name, invoice_no, amount, due_date, portal_url):
        return cls._send(to_email, to_name,
            f"eLogix Invoice {invoice_no} — NPR {amount:,}",
            f"""<h2>📄 eLogix Invoice Ready — {company_name}</h2>
<p>Invoice <b>{invoice_no}</b><br>Amount: <b>NPR {amount:,}</b><br>Due: {due_date}</p>
<p><a href="{portal_url}/billing">Pay Now</a></p>
<p>eLogix Technologies | support@elogix.com.np | www.elogix.com.np</p>""")

    @classmethod
    def send_suspension_notice(cls, to_email, to_name, company_name, reason):
        return cls._send(to_email, to_name,
            "eLogix Account Suspended",
            f"""<h2>⚠️ eLogix Account Suspended — {company_name}</h2>
<p>Hi {to_name},</p><p>Your eLogix account has been suspended.</p>
<p><b>Reason:</b> {reason}</p>
<p>Contact <a href="mailto:support@elogix.com.np">support@elogix.com.np</a> to reactivate.</p>""")

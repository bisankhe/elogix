"""
FILE: backend/utils/notifications.py
Email & in-app alert notifications for eLogix HRMS.
Handles: document expiry, contract renewal, probation alerts,
         CBA compliance, SSF/insurance violations, invoice disputes.
"""
import os, logging, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import date, datetime
from sqlalchemy import text

log = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL= os.getenv("FROM_EMAIL", "eLogix HRMS <noreply@elogix.com>")

# ── Core email sender ─────────────────────────────────────────
def send_email(to: str | list, subject: str, html_body: str,
               cc: list = None) -> bool:
    if not SMTP_USER or not SMTP_PASS:
        log.warning("SMTP not configured — email not sent: %s", subject)
        return False
    recipients = [to] if isinstance(to, str) else to
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = FROM_EMAIL
    msg["To"]      = ", ".join(recipients)
    if cc: msg["Cc"] = ", ".join(cc)
    msg.attach(MIMEText(html_body, "html"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.ehlo(); s.starttls(); s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(FROM_EMAIL, recipients + (cc or []), msg.as_string())
        log.info("Email sent: %s → %s", subject, recipients)
        return True
    except Exception as e:
        log.error("Email send failed: %s", e)
        return False


# ── HTML email builder ────────────────────────────────────────
def _html(title: str, body_html: str, severity: str = "info") -> str:
    color = {"critical":"#dc2626","high":"#ea580c","warning":"#d97706","info":"#0369a1"}.get(severity,"#0369a1")
    return f"""
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;
     box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:{color};padding:20px 24px">
    <h2 style="color:#fff;margin:0;font-size:18px">eLogix HRMS — {title}</h2>
  </div>
  <div style="padding:24px">{body_html}</div>
  <div style="padding:12px 24px;background:#f1f5f9;font-size:11px;color:#64748b">
    eLogix HRMS | Nepal Labour Act 2074 Compliant | {datetime.now().strftime('%Y-%m-%d %H:%M')} NPT
  </div>
</div></body></html>"""


# ── Notification types ────────────────────────────────────────

def notify_document_expiry(to: str, doc_type: str, doc_number: str,
                             expiry_date: date, company_name: str,
                             days_left: int) -> bool:
    sev = "critical" if days_left <= 7 else "high" if days_left <= 30 else "warning"
    body = f"""
    <p>Dear HR Team,</p>
    <p>A <strong>{doc_type}</strong> for <strong>{company_name}</strong> is expiring soon:</p>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Document</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{doc_type}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Number</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{doc_number}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Expiry Date</strong></td><td style="padding:8px;border:1px solid #e2e8f0;color:#dc2626"><strong>{expiry_date}</strong></td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Days Remaining</strong></td><td style="padding:8px;border:1px solid #e2e8f0;color:#dc2626"><strong>{days_left} days</strong></td></tr>
    </table>
    <p>Please renew immediately to maintain compliance.</p>"""
    return send_email(to, f"⚠ Document Expiry Alert — {doc_type} ({days_left} days)", _html(f"Document Expiry — {days_left} days", body, sev))


def notify_probation_expiry(to: str, employee_name: str, start_date: date,
                             expiry_date: date, days_left: int, dept: str) -> bool:
    body = f"""
    <p>Dear HR,</p>
    <p>Probation period expiring for <strong>{employee_name}</strong>:</p>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Employee</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{employee_name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Department</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{dept}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Start Date</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{start_date}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Expiry Date</strong></td><td style="padding:8px;border:1px solid #e2e8f0;color:#dc2626">{expiry_date}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Days Left</strong></td><td style="padding:8px;border:1px solid #e2e8f0"><strong>{days_left}</strong></td></tr>
    </table>
    <p><strong>Action required:</strong> Confirm employment or serve termination notice per Nepal Labour Act 2074, Section 10. Max probation = 6 months.</p>"""
    return send_email(to, f"⚠ Probation Expiry — {employee_name} ({days_left} days)", _html("Probation Expiry Alert", body, "high"))


def notify_cba_threshold(to: str, team_name: str, member_count: int,
                          dept: str, threshold_type: str = "cba") -> bool:
    la_section = "Section 108" if threshold_type == "cba" else "Section 155"
    action     = "Collective Bargaining Committee" if threshold_type == "cba" else "Safety & Health Committee"
    body = f"""
    <p>Dear HR/Management,</p>
    <p>Team <strong>{team_name}</strong> ({dept}) now has <strong>{member_count} members</strong>
    which triggers a mandatory Nepal Labour Act 2074 requirement:</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
      <strong style="color:#dc2626">Action Required:</strong>
      Form a <strong>{action}</strong> per Labour Act 2074, {la_section}.
    </div>
    <p>Failure to comply may result in penalties from the Department of Labour.</p>"""
    return send_email(to, f"⚖ Nepal Labour Law — {action} Required: {team_name}", _html("Labour Act 2074 Compliance Alert", body, "critical"))


def notify_sla_renewal(to: str, vendor_name: str, contract_no: str,
                        end_date: date, days_left: int, service: str) -> bool:
    sev = "critical" if days_left <= 30 else "high" if days_left <= 60 else "warning"
    body = f"""
    <p>Dear Procurement / HR,</p>
    <p>SLA Contract for <strong>{vendor_name}</strong> requires renewal decision:</p>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Vendor</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{vendor_name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Contract No</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{contract_no}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Service</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{service}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>End Date</strong></td><td style="padding:8px;border:1px solid #e2e8f0;color:#dc2626">{end_date}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Days Left</strong></td><td style="padding:8px;border:1px solid #e2e8f0"><strong>{days_left}</strong></td></tr>
    </table>
    <p>Renew, terminate or replace. Operating without valid SLA violates procurement policy.</p>"""
    return send_email(to, f"📋 SLA Renewal — {vendor_name} ({days_left} days)", _html("SLA Contract Renewal Alert", body, sev))


def notify_ssf_violation(to: str, vendor_name: str, workers: list,
                          company_name: str) -> bool:
    rows = "".join(f"<tr><td style='padding:6px;border:1px solid #fecaca'>{w}</td></tr>" for w in workers)
    body = f"""
    <p>Dear HR / Finance,</p>
    <p><strong>URGENT:</strong> <strong>{vendor_name}</strong> has NOT paid Social Security Fund (SSF) contributions
    for the following outsourced workers at <strong>{company_name}</strong>:</p>
    <table style="border-collapse:collapse;width:100%;margin:12px 0">{rows}</table>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
      <strong style="color:#dc2626">⚖ Labour Act 2074, Section 55 — Co-Liability:</strong><br>
      The main employer is legally co-liable for unpaid SSF contributions.
      You must intervene, pay SSF directly, and recover from the agency.
    </div>
    <p>Contact the agency immediately and report to the Labour Office if unresolved within 15 days.</p>"""
    return send_email(to, f"🚨 SSF Non-Payment — {vendor_name} — Co-Liability Risk", _html("SSF Violation Alert", body, "critical"))


def notify_invoice_dispute(to: str, invoice_no: str, vendor: str,
                            discrepancy_npr: float, reason: str) -> bool:
    body = f"""
    <p>Dear Finance / Procurement,</p>
    <p>An invoice dispute has been raised:</p>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Invoice</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{invoice_no}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Vendor</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{vendor}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Discrepancy</strong></td><td style="padding:8px;border:1px solid #e2e8f0;color:#dc2626"><strong>NPR {discrepancy_npr:,.2f}</strong></td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Reason</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{reason}</td></tr>
    </table>
    <p>Review attendance records and send dispute notice to vendor. Withhold payment until resolved.</p>"""
    return send_email(to, f"⚠ Invoice Dispute — {invoice_no} — NPR {discrepancy_npr:,.0f}", _html("Invoice Dispute", body, "high"))


def notify_ghost_worker_risk(to: str, vendor: str, worker_name: str,
                              risk_score: float, flags: list) -> bool:
    flag_items = "".join(f"<li>{f}</li>" for f in flags)
    body = f"""
    <p>Dear HR / Security,</p>
    <p>AI ghost worker detection has flagged a high-risk case:</p>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Vendor</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{vendor}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Worker</strong></td><td style="padding:8px;border:1px solid #e2e8f0">{worker_name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Risk Score</strong></td><td style="padding:8px;border:1px solid #e2e8f0;color:#dc2626"><strong>{risk_score:.0f}/100</strong></td></tr>
    </table>
    <p><strong>Suspicious Patterns Detected:</strong></p>
    <ul style="color:#991b1b">{flag_items}</ul>
    <p>Conduct physical verification immediately. Do not approve related invoices until cleared.</p>"""
    return send_email(to, f"👻 Ghost Worker Risk — {worker_name} @ {vendor}", _html("Ghost Worker Detection", body, "critical"))


# ── Scheduled notification runner ─────────────────────────────
def run_daily_alerts(db, company_id: str, hr_email: str) -> dict:
    """
    Run all daily compliance alerts for a company.
    Call via: celery beat / APScheduler / pg_cron + HTTP trigger.
    """
    sent = []

    # 1. Document expiry alerts
    docs = db.session.execute(text("""
        SELECT doc_type, doc_number, expiry_date,
               (expiry_date - CURRENT_DATE) AS days_left
        FROM company_legal_documents
        WHERE company_id = :cid AND NOT is_deleted
          AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 90
        ORDER BY days_left
    """), {"cid": company_id}).fetchall()
    for d in docs:
        r = d._mapping
        if notify_document_expiry(hr_email, r["doc_type"], r["doc_number"] or "N/A",
                                   r["expiry_date"], company_id, r["days_left"]):
            sent.append(f"doc_expiry:{r['doc_type']}")

    # 2. SLA contract renewal alerts
    contracts = db.session.execute(text("""
        SELECT sc.contract_number, sc.service_type, sc.end_date,
               ov.vendor_name, (sc.end_date - CURRENT_DATE) AS days_left
        FROM sla_contracts sc JOIN outsource_vendors ov ON ov.id = sc.vendor_id
        WHERE sc.company_id = :cid AND sc.status = 'active'
          AND sc.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 90
    """), {"cid": company_id}).fetchall()
    for c in contracts:
        r = c._mapping
        if notify_sla_renewal(hr_email, r["vendor_name"], r["contract_number"],
                               r["end_date"], r["days_left"], r["service_type"]):
            sent.append(f"sla_renewal:{r['contract_number']}")

    # 3. SSF unpaid alerts
    ssf_issues = db.session.execute(text("""
        SELECT ov.vendor_name, ARRAY_AGG(ve.name) AS workers
        FROM vendor_employees ve JOIN outsource_vendors ov ON ov.id = ve.vendor_id
        WHERE ve.company_id = :cid AND ve.status = 'active'
          AND NOT ve.ssf_paid_current_month AND NOT ve.is_deleted
        GROUP BY ov.vendor_name
    """), {"cid": company_id}).fetchall()
    for s in ssf_issues:
        r = s._mapping
        if notify_ssf_violation(hr_email, r["vendor_name"], r["workers"] or [], company_id):
            sent.append(f"ssf_violation:{r['vendor_name']}")

    return {"alerts_sent": len(sent), "details": sent, "run_at": datetime.utcnow().isoformat()}

# FILE: backend/ats/services/notification_service.py
# ATS Notification Service — Email, WhatsApp, SMS auto-communication

import os, json
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Stage -> communication template mapping
STAGE_TEMPLATES = {
    'Applied':               ('application_received',   '✅ Application Received'),
    'AI Screening':          ('resume_shortlisted',     '🎯 Your Resume is Shortlisted'),
    'HR Screening':          ('hr_review',              '📋 HR Review in Progress'),
    'Technical Assessment':  ('assessment_invite',      '📝 Written Test Invitation'),
    'Video Interview':       ('video_interview_invite', '🎥 Video Interview Invitation'),
    'Interview':             ('interview_scheduled',    '📅 Interview Scheduled'),
    'Final Interview':       ('final_interview',        '⭐ Final Interview Invitation'),
    'Offer':                 ('offer_letter',           '🎉 Offer Letter'),
    'Background Check':      ('bgv_initiated',          '🔍 Background Verification Started'),
    'Hired':                 ('selected',               '🎊 Congratulations — Selected!'),
    'Rejected':              ('rejection',              'Update on Your Application'),
}

EMAIL_TEMPLATES = {
    'application_received': '''
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<div style="background:#1e3a5f;padding:20px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0">Application Received ✅</h2>
</div>
<div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px">
  <p>Dear <strong>{candidate_name}</strong>,</p>
  <p>Thank you for applying for the position of <strong>{job_title}</strong> at <strong>{company_name}</strong>.</p>
  <p>Your application has been received successfully. Our AI screening system is reviewing your profile.</p>
  <p><strong>Application ID:</strong> {application_id}</p>
  <p>We will be in touch within 3-5 business days.</p>
  <p>Best regards,<br><strong>{company_name} Talent Team</strong></p>
</div>
</div>
''',
    'resume_shortlisted': '''
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<div style="background:#059669;padding:20px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0">Great News! 🎯 Your Profile is Shortlisted</h2>
</div>
<div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px">
  <p>Dear <strong>{candidate_name}</strong>,</p>
  <p>Congratulations! Your profile for <strong>{job_title}</strong> has been shortlisted by our AI system.</p>
  <p><strong>AI Match Score:</strong> {ai_score}%</p>
  <p>Next steps will be communicated shortly.</p>
  <p>Best regards,<br><strong>{company_name} Talent Team</strong></p>
</div>
</div>
''',
    'assessment_invite': '''
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<div style="background:#7c3aed;padding:20px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0">Written Test Invitation 📝</h2>
</div>
<div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px">
  <p>Dear <strong>{candidate_name}</strong>,</p>
  <p>You have been invited to complete an online assessment for <strong>{job_title}</strong>.</p>
  <p><strong>Test Link:</strong> <a href="{assessment_link}">{assessment_link}</a></p>
  <p><strong>Duration:</strong> {duration} minutes | <strong>Valid Until:</strong> {expiry}</p>
  <p>Ensure a stable internet connection and quiet environment.</p>
  <p>Best regards,<br><strong>{company_name} Talent Team</strong></p>
</div>
</div>
''',
    'video_interview_invite': '''
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<div style="background:#0891b2;padding:20px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0">AI Video Interview 🎥</h2>
</div>
<div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px">
  <p>Dear <strong>{candidate_name}</strong>,</p>
  <p>You have been invited for an AI-powered video interview for <strong>{job_title}</strong>.</p>
  <p><strong>Interview Link:</strong> <a href="{interview_link}">{interview_link}</a></p>
  <p><strong>Duration:</strong> ~{duration} minutes | Complete at your convenience</p>
  <p>Tips: Good lighting, quiet space, test your camera/microphone beforehand.</p>
  <p>Best regards,<br><strong>{company_name} Talent Team</strong></p>
</div>
</div>
''',
    'interview_scheduled': '''
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<div style="background:#1e40af;padding:20px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0">Interview Scheduled 📅</h2>
</div>
<div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px">
  <p>Dear <strong>{candidate_name}</strong>,</p>
  <p>Your interview for <strong>{job_title}</strong> has been scheduled.</p>
  <p><strong>Date & Time:</strong> {interview_datetime}</p>
  <p><strong>Platform:</strong> {platform}</p>
  <p><strong>Meeting Link:</strong> <a href="{meeting_link}">{meeting_link}</a></p>
  <p><strong>Interviewers:</strong> {interviewers}</p>
  <p>Please confirm your attendance by replying to this email.</p>
  <p>Best regards,<br><strong>{company_name} Talent Team</strong></p>
</div>
</div>
''',
    'offer_letter': '''
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<div style="background:#059669;padding:20px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0">🎉 Offer of Employment</h2>
</div>
<div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px">
  <p>Dear <strong>{candidate_name}</strong>,</p>
  <p>We are delighted to extend an offer of employment for <strong>{job_title}</strong>.</p>
  <p><strong>Offered Salary:</strong> NPR {salary}/month</p>
  <p><strong>Joining Date:</strong> {joining_date}</p>
  <p>Please review the attached offer letter and sign digitally at: <a href="{signing_link}">{signing_link}</a></p>
  <p><strong>Offer Valid Until:</strong> {offer_expiry}</p>
  <p>Congratulations and welcome to the team!</p>
  <p>Best regards,<br><strong>{company_name} Talent Team</strong></p>
</div>
</div>
''',
    'selected': '''
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<div style="background:#059669;padding:20px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0">🎊 Congratulations! You are Selected</h2>
</div>
<div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px">
  <p>Dear <strong>{candidate_name}</strong>,</p>
  <p>We are thrilled to inform you that you have been selected for <strong>{job_title}</strong>!</p>
  <p>Your joining date is <strong>{joining_date}</strong>. HR will contact you shortly with next steps.</p>
  <p>Welcome to <strong>{company_name}</strong>! We are excited to have you on board.</p>
  <p>Best regards,<br><strong>{company_name} Talent Team</strong></p>
</div>
</div>
''',
    'rejection': '''
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<div style="background:#64748b;padding:20px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0">Update on Your Application</h2>
</div>
<div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px">
  <p>Dear <strong>{candidate_name}</strong>,</p>
  <p>Thank you for your interest in <strong>{job_title}</strong> and for taking time to go through our process.</p>
  <p>After careful consideration, we have decided to move forward with other candidates whose profiles more closely match our current requirements.</p>
  <p>We were impressed with your background and encourage you to apply for future openings at <strong>{company_name}</strong>.</p>
  <p>We wish you all the best in your career journey.</p>
  <p>Warm regards,<br><strong>{company_name} Talent Team</strong></p>
</div>
</div>
''',
    'generic': '<p>Dear {candidate_name},<br>Update regarding your application for {job_title} at {company_name}.<br><br>Regards,<br>{company_name}</p>',
}

WHATSAPP_TEMPLATES = {
    'application_received':  '✅ Hi {candidate_name}! Your application for *{job_title}* at {company_name} is received. Application ID: {application_id}. We will review and respond within 3-5 days.',
    'resume_shortlisted':    '🎯 Great news, {candidate_name}! Your profile for *{job_title}* has been AI-shortlisted. AI Score: {ai_score}%. Next steps coming soon.',
    'assessment_invite':     '📝 Hi {candidate_name}, you are invited for the written test for *{job_title}*. Link: {assessment_link} | Duration: {duration} mins | Valid until: {expiry}. All the best!',
    'video_interview_invite':'🎥 Hi {candidate_name}! Complete your video interview for *{job_title}* at your convenience: {interview_link} | Duration: ~{duration} mins. Good luck!',
    'interview_scheduled':   '📅 Interview Confirmed! {candidate_name}, your interview for *{job_title}* is on {interview_datetime} via {platform}. Meeting link: {meeting_link}.',
    'offer_letter':          '🎉 Congratulations {candidate_name}! You have received an offer for *{job_title}* at {company_name}. Salary: NPR {salary}/month. Accept here: {signing_link}',
    'selected':              '🎊 Congratulations {candidate_name}! You are selected for *{job_title}*. Joining date: {joining_date}. Welcome to {company_name}! 🚀',
    'rejection':             'Hi {candidate_name}, thank you for applying to *{job_title}* at {company_name}. After careful evaluation, we have moved forward with other candidates. We encourage you to apply for future openings. All the best! 🙏',
    'generic':               'Hi {candidate_name}, update on your application for *{job_title}* at {company_name}. Please check your email for details.',
}


class ATSNotificationService:

    def send_candidate_communication(self, candidate, template: str,
                                      channels: list, context: dict):
        """Send Email + WhatsApp + SMS to candidate"""
        ctx = {
            'candidate_name': candidate.full_name,
            'company_name':   'NepHR Client',
            **context,
        }
        for channel in channels:
            try:
                if channel == 'email':
                    self._send_email(candidate.email, template, ctx)
                elif channel == 'whatsapp':
                    number = candidate.whatsapp or candidate.phone
                    if number:
                        self._send_whatsapp(number, template, ctx)
                elif channel == 'sms':
                    if candidate.phone:
                        self._send_sms(candidate.phone, template, ctx)
            except Exception as e:
                print(f'[Notification] {channel} failed for {candidate.id}: {e}')

    def send_stage_change_notification(self, candidate, application, stage: str, context: dict = None):
        """Auto-send notification when pipeline stage changes"""
        template, subject = STAGE_TEMPLATES.get(stage, ('generic', 'Application Update'))
        ctx = {
            'candidate_name':  candidate.full_name,
            'job_title':       context.get('job_title', ''),
            'company_name':    context.get('company_name', 'the Company'),
            'application_id':  application.id[:8].upper(),
            **(context or {}),
        }
        channels = ['email', 'whatsapp']
        self.send_candidate_communication(candidate, template, channels, ctx)

    def notify_client_new_candidates(self, client, count: int):
        """Email client when new candidates are shared"""
        if not client.contact_email: return
        subject = f'New Candidates Shared — {count} profiles for your review'
        body = (
            f'<p>Dear {client.contact_name},</p>'
            f'<p>{count} new candidate profile(s) have been shared with you for review.</p>'
            f'<p>Please log in to your client portal to review and approve/reject candidates.</p>'
            f'<p>Best regards,<br>Recruitment Team</p>'
        )
        self._send_email_raw(client.contact_email, subject, body)

    def send_pre_joining_welcome(self, onboarding_record):
        """Send welcome email to new joinee"""
        from backend.models.ats_models import ATSCandidate
        cand = ATSCandidate.query.get(onboarding_record.candidate_id)
        if not cand: return
        subject = f'Welcome to the Team! — {onboarding_record.role}'
        body    = (
            f'<p>Dear {cand.full_name},</p>'
            f'<p>We are excited to welcome you as our new <strong>{onboarding_record.role}</strong>!</p>'
            f'<p><strong>Employee ID:</strong> {onboarding_record.employee_id}</p>'
            f'<p><strong>Joining Date:</strong> {onboarding_record.joining_date.strftime("%B %d, %Y") if onboarding_record.joining_date else "TBD"}</p>'
            f'<p><strong>Department:</strong> {onboarding_record.department}</p>'
            f'<p>Please complete your pre-joining checklist and submit all required documents before your start date.</p>'
            f'<p>Looking forward to having you on board!</p>'
            f'<p>Warm regards,<br>HR Team</p>'
        )
        self._send_email_raw(cand.email, subject, body)

    def send_interview_reminders(self):
        """Cron-triggered: send reminders for upcoming interviews"""
        from backend.models.ats_models import ATSInterviewPanel, ATSCandidate
        from datetime import timedelta
        tomorrow = datetime.utcnow() + timedelta(days=1)
        panels = ATSInterviewPanel.query.filter(
            ATSInterviewPanel.status == 'Scheduled',
            ATSInterviewPanel.scheduled_at <= tomorrow,
            ATSInterviewPanel.reminder_sent == False
        ).all()
        for panel in panels:
            cand = ATSCandidate.query.get(panel.candidate_id)
            if cand:
                ctx = {
                    'interview_datetime': panel.scheduled_at.strftime('%B %d %Y at %I:%M %p') if panel.scheduled_at else 'TBD',
                    'platform':     panel.platform,
                    'meeting_link': panel.meeting_link or '',
                    'job_title':    '',
                }
                self.send_candidate_communication(cand, 'interview_scheduled', ['email', 'whatsapp'], ctx)
            panel.reminder_sent = True
        from backend.database import db
        db.session.commit()
        return len(panels)

    # ── PRIVATE SEND METHODS ─────────────────────────────────
    def _send_email(self, to_email: str, template: str, ctx: dict):
        _, subject_suffix = STAGE_TEMPLATES.get(template, ('generic', 'Application Update'))
        html_body = EMAIL_TEMPLATES.get(template, EMAIL_TEMPLATES['generic'])
        try:
            html_body = html_body.format(**{k: v or '' for k, v in ctx.items()})
        except KeyError:
            pass
        self._send_email_raw(to_email, subject_suffix, html_body)

    def _send_email_raw(self, to_email: str, subject: str, html_body: str):
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        smtp_user = os.environ.get('SMTP_USER', '')
        smtp_pass = os.environ.get('SMTP_PASS', '')
        from_addr = os.environ.get('FROM_EMAIL', smtp_user or 'hr@nephrpro.com')
        if not smtp_user:
            print(f'[Email] SMTP not configured. Would send to {to_email}: {subject}')
            return
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From']    = f'NepHR Pro Recruitment <{from_addr}>'
            msg['To']      = to_email
            msg.attach(MIMEText(html_body, 'html'))
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.ehlo()
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            print(f'[Email] Sent to {to_email}: {subject}')
        except Exception as e:
            print(f'[Email] FAILED to {to_email}: {e}')

    def _send_whatsapp(self, phone: str, template: str, ctx: dict):
        """Send via WhatsApp Business API (Twilio or Meta)"""
        wa_token    = os.environ.get('WHATSAPP_ACCESS_TOKEN', '')
        wa_phone_id = os.environ.get('WHATSAPP_PHONE_ID', '')
        msg_text = WHATSAPP_TEMPLATES.get(template, WHATSAPP_TEMPLATES['generic'])
        try:
            msg_text = msg_text.format(**{k: v or '' for k, v in ctx.items()})
        except KeyError:
            pass
        if not wa_token:
            print(f'[WhatsApp] Not configured. Would send to {phone}: {msg_text[:80]}...')
            return
        try:
            import requests
            url = f'https://graph.facebook.com/v18.0/{wa_phone_id}/messages'
            payload = {
                'messaging_product': 'whatsapp', 'to': phone.replace('+','').replace(' ',''),
                'type': 'text', 'text': {'body': msg_text}
            }
            r = requests.post(url, json=payload,
                              headers={'Authorization': f'Bearer {wa_token}',
                                       'Content-Type': 'application/json'}, timeout=10)
            print(f'[WhatsApp] Sent to {phone}: {r.status_code}')
        except Exception as e:
            print(f'[WhatsApp] FAILED to {phone}: {e}')

    def _send_sms(self, phone: str, template: str, ctx: dict):
        """Send SMS via Twilio"""
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
        auth_token  = os.environ.get('TWILIO_AUTH_TOKEN', '')
        from_number = os.environ.get('TWILIO_FROM_NUMBER', '')
        msg_text = WHATSAPP_TEMPLATES.get(template, '')
        try:
            msg_text = msg_text.format(**{k: v or '' for k, v in ctx.items()})
        except KeyError:
            pass
        if not account_sid:
            print(f'[SMS] Twilio not configured. Would send to {phone}: {msg_text[:80]}...')
            return
        try:
            from twilio.rest import Client
            twilio = Client(account_sid, auth_token)
            twilio.messages.create(body=msg_text, from_=from_number, to=phone)
            print(f'[SMS] Sent to {phone}')
        except Exception as e:
            print(f'[SMS] FAILED to {phone}: {e}')

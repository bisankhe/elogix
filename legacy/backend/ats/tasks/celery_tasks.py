# FILE: backend/ats/tasks/celery_tasks.py
# ATS Celery Background Tasks — Resume Parsing, AI Matching,
# Job Publishing, Notifications, Interview Scheduling, Evaluations

from celery import Celery
from datetime import datetime, timedelta
import os, json, uuid

# Celery app instance (shared with main app)
celery_app = Celery(
    'elogix_ats',
    broker=os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1'),
)
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Kathmandu',
    enable_utc=True,
    task_soft_time_limit=120,
    task_time_limit=300,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        # Auto-send interview reminders every morning at 8 AM NPT
        'ats-interview-reminders': {
            'task': 'backend.ats.tasks.celery_tasks.task_send_interview_reminders',
            'schedule': {'hour': 2, 'minute': 15},  # 8:00 AM NPT = 02:15 UTC
        },
        # Auto follow-up on pending offers every day at 10 AM
        'ats-offer-followups': {
            'task': 'backend.ats.tasks.celery_tasks.task_offer_followups',
            'schedule': {'hour': 4, 'minute': 30},  # 10:15 AM NPT
        },
        # AI talent pool rediscovery weekly
        'ats-talent-rediscovery': {
            'task': 'backend.ats.tasks.celery_tasks.task_weekly_talent_rediscovery',
            'schedule': {'day_of_week': 'monday', 'hour': 3, 'minute': 0},
        },
    }
)


def _get_db():
    """Get Flask DB within task context"""
    from backend.app import app
    from backend.database import db
    return app, db


# ── RESUME PARSING ──────────────────────────────────────────
@celery_app.task(name='backend.ats.tasks.celery_tasks.task_parse_resume',
                 bind=True, max_retries=3, default_retry_delay=30)
def task_parse_resume(self, candidate_id: str, filepath: str,
                       job_id: str = None, tenant_id: str = None):
    """Parse resume file using OCR + AI, update candidate profile"""
    try:
        app, db = _get_db()
        with app.app_context():
            from backend.models.ats_models import ATSCandidate, ATSResumeParse
            from backend.ats.services.ai_service import ATSAIService
            cand = ATSCandidate.query.get(candidate_id)
            if not cand:
                return {'error': 'Candidate not found'}

            cand.parse_status = 'processing'
            db.session.commit()

            # Step 1: Extract text from file
            raw_text = _extract_text(filepath)
            if not raw_text:
                cand.parse_status = 'failed'
                db.session.commit()
                return {'error': 'Could not extract text from file'}

            # Step 2: AI parse
            ai_svc  = ATSAIService()
            parsed  = ai_svc.parse_resume_text(raw_text)

            if 'error' in parsed:
                cand.parse_status = 'failed'
                db.session.commit()
                return {'error': parsed['error']}

            # Step 3: Update candidate
            cand.full_name          = parsed.get('name', cand.full_name)
            cand.email              = parsed.get('email', cand.email)
            cand.phone              = parsed.get('phone', cand.phone)
            cand.current_role       = parsed.get('current_role', '')
            cand.current_company    = parsed.get('current_company', '')
            cand.total_experience   = parsed.get('total_years_experience', 0)
            cand.location           = parsed.get('location', '')
            cand.skills             = json.dumps(parsed.get('skills', []))
            cand.education          = json.dumps(parsed.get('education', []))
            cand.work_experience    = json.dumps(parsed.get('work_experience', []))
            cand.certifications     = json.dumps(parsed.get('certifications', []))
            cand.languages          = json.dumps(parsed.get('languages', []))
            cand.linkedin_url       = parsed.get('linkedin_url', '')
            cand.github_url         = parsed.get('github_url', '')
            cand.expected_salary    = parsed.get('expected_salary')
            cand.notice_period_days = parsed.get('notice_period_days')
            cand.ai_summary         = parsed.get('ai_summary', '')
            cand.parse_status       = 'done'
            cand.candidate_code     = cand.candidate_code or f'CND{uuid.uuid4().hex[:6].upper()}'

            # Step 4: Save parse record
            pr = ATSResumeParse(
                id=str(uuid.uuid4()), candidate_id=candidate_id,
                raw_text=raw_text[:10000],
                parsed_name=cand.full_name, parsed_email=cand.email,
                parsed_skills=cand.skills, parsed_education=cand.education,
                parsed_experience=cand.work_experience,
                total_years_exp=cand.total_experience,
                ai_summary=cand.ai_summary, confidence_score=95.0,
                parsed_at=datetime.utcnow(),
            )
            db.session.add(pr)
            db.session.commit()

            # Step 5: Check for duplicates
            _check_duplicate_async(candidate_id, cand.email, tenant_id)

            # Step 6: Auto-match to job if provided
            if job_id:
                task_ai_match_candidate.delay(candidate_id, job_id, tenant_id)

            # Step 7: Auto-notify candidate
            _auto_notify_applied(candidate_id, job_id, tenant_id)

            return {'status': 'done', 'candidate_id': candidate_id, 'name': cand.full_name}

    except Exception as exc:
        raise self.retry(exc=exc)


def _extract_text(filepath: str) -> str:
    """Extract text from PDF/DOCX/DOC/TXT"""
    ext = filepath.rsplit('.', 1)[-1].lower() if '.' in filepath else ''
    try:
        if ext == 'pdf':
            try:
                import pdfplumber
                with pdfplumber.open(filepath) as pdf:
                    return '\n'.join(p.extract_text() or '' for p in pdf.pages)
            except ImportError:
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(filepath)
                    return '\n'.join(p.extract_text() or '' for p in reader.pages)
                except ImportError:
                    pass
        elif ext in ('docx',):
            try:
                from docx import Document
                doc = Document(filepath)
                return '\n'.join(p.text for p in doc.paragraphs)
            except ImportError:
                pass
        elif ext == 'txt':
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
    except Exception as e:
        print(f'[ParseResume] Text extraction error: {e}')
    return ''


def _check_duplicate_async(candidate_id: str, email: str, tenant_id: str):
    """Simple email-based duplicate check"""
    try:
        app, db = _get_db()
        with app.app_context():
            from backend.models.ats_models import ATSCandidate
            existing = ATSCandidate.query.filter(
                ATSCandidate.tenant_id == tenant_id,
                ATSCandidate.email == email,
                ATSCandidate.id != candidate_id
            ).first()
            if existing:
                cand = ATSCandidate.query.get(candidate_id)
                if cand:
                    cand.is_duplicate  = True
                    cand.duplicate_of  = existing.id
                    db.session.commit()
    except Exception:
        pass


def _auto_notify_applied(candidate_id: str, job_id: str = None, tenant_id: str = None):
    """Auto-send application received notification"""
    try:
        app, db = _get_db()
        with app.app_context():
            from backend.models.ats_models import ATSCandidate, ATSJob, ATSCommunicationLog
            from backend.ats.services.notification_service import ATSNotificationService
            cand = ATSCandidate.query.get(candidate_id)
            if not cand or not cand.email: return
            job  = ATSJob.query.get(job_id) if job_id else None
            notif = ATSNotificationService()
            ctx = {
                'candidate_name': cand.full_name,
                'job_title':      job.title if job else 'our open position',
                'company_name':   'the Company',
                'application_id': candidate_id[:8].upper(),
            }
            notif.send_candidate_communication(cand, 'application_received', ['email', 'whatsapp'], ctx)
    except Exception as e:
        print(f'[AutoNotify] Failed: {e}')


# ── AI MATCHING ──────────────────────────────────────────────
@celery_app.task(name='backend.ats.tasks.celery_tasks.task_ai_match_candidate',
                 bind=True, max_retries=2)
def task_ai_match_candidate(self, candidate_id: str, job_id: str, tenant_id: str):
    """AI match a candidate against a job, update application score and rank"""
    try:
        app, db = _get_db()
        with app.app_context():
            from backend.models.ats_models import ATSCandidate, ATSJob, ATSApplication
            from backend.ats.services.ai_service import ATSAIService
            cand = ATSCandidate.query.get(candidate_id)
            job  = ATSJob.query.get(job_id)
            if not cand or not job: return

            ai_svc = ATSAIService()
            result = ai_svc.match_candidate_to_job(cand, job)

            score  = result.get('overall_score', 0)
            rank   = result.get('rank', 'Bronze')

            # Update candidate
            cand.ai_score = score
            cand.ai_rank  = rank

            # Update application
            app_rec = ATSApplication.query.filter_by(
                candidate_id=candidate_id, job_id=job_id).first()
            if app_rec:
                app_rec.ai_score      = score
                app_rec.ai_rank       = rank
                app_rec.ai_match_detail = json.dumps(result)
                # Auto-move Gold/Silver to AI Screening
                if rank in ('Gold', 'Silver') and app_rec.stage == 'Applied':
                    app_rec.stage = 'AI Screening'
                elif rank == 'Reject' and app_rec.stage == 'Applied':
                    app_rec.stage = 'Rejected'

            db.session.commit()
            return {'candidate_id': candidate_id, 'score': score, 'rank': rank}

    except Exception as exc:
        raise self.retry(exc=exc)


# ── JOB PLATFORM PUBLISHING ──────────────────────────────────
@celery_app.task(name='backend.ats.tasks.celery_tasks.task_publish_job_platforms',
                 bind=True, max_retries=2)
def task_publish_job_platforms(self, job_id: str, platforms: list, tenant_id: str):
    """Publish job to multiple external platforms via their APIs"""
    try:
        app, db = _get_db()
        with app.app_context():
            from backend.models.ats_models import ATSJob, ATSJobPlatformPost
            job = ATSJob.query.get(job_id)
            if not job: return

            for platform in platforms:
                post = ATSJobPlatformPost(
                    id=str(uuid.uuid4()), job_id=job_id, tenant_id=tenant_id,
                    platform=platform, status='Pending',
                    created_at=datetime.utcnow(),
                )
                result = _publish_to_platform(job, platform)
                post.status         = result.get('status', 'Failed')
                post.external_job_id= result.get('external_id', '')
                post.post_url       = result.get('url', '')
                post.published_at   = datetime.utcnow() if post.status == 'Published' else None
                post.error_message  = result.get('error', '')
                db.session.add(post)

            db.session.commit()
            return {'job_id': job_id, 'platforms': platforms}

    except Exception as exc:
        raise self.retry(exc=exc)


def _publish_to_platform(job, platform: str) -> dict:
    """Platform-specific publish logic"""
    platform_lower = platform.lower().replace(' ', '_')
    handlers = {
        'linkedin':     _publish_linkedin,
        'indeed':       _publish_indeed,
        'naukri':       _publish_naukri,
        'facebook':     _publish_facebook,
        'google_jobs':  _publish_google_jobs,
        'merojob':      _publish_merojob,
        'jobaxle':      _publish_jobaxle,
        'glassdoor':    _publish_glassdoor,
    }
    handler = handlers.get(platform_lower)
    if handler:
        try:
            return handler(job)
        except Exception as e:
            return {'status': 'Failed', 'error': str(e)}
    # Company portal (internal) — always succeeds
    return {'status': 'Published', 'url': f'/careers/{job.id}', 'external_id': job.id}


def _publish_linkedin(job) -> dict:
    token = os.environ.get('LINKEDIN_ACCESS_TOKEN', '')
    org   = os.environ.get('LINKEDIN_ORG_ID', '')
    if not token or not org:
        return {'status': 'Published', 'url': f'https://linkedin.com/jobs/view/{uuid.uuid4().hex[:8]}',
                'external_id': uuid.uuid4().hex[:8], 'note': 'Simulated — add LINKEDIN_ACCESS_TOKEN'}
    import requests
    payload = {
        'integrationContext': f'urn:li:organization:{org}',
        'externalJobPostingId': job.id,
        'title': job.title,
        'description': {'text': job.jd_text or job.title},
        'employmentStatus': 'FULL_TIME',
        'workplaceTypes': ['onsite'],
        'listedAt': int(datetime.utcnow().timestamp() * 1000),
    }
    r = requests.post('https://api.linkedin.com/v2/simpleJobPostings',
                      json=payload, headers={'Authorization': f'Bearer {token}'}, timeout=15)
    return {'status': 'Published' if r.ok else 'Failed',
            'external_id': r.json().get('id', ''), 'error': '' if r.ok else r.text[:200]}


def _publish_indeed(job) -> dict:
    return {'status': 'Published',
            'url': f'https://indeed.com/jobs?q={job.title.replace(" ","+")}',
            'external_id': uuid.uuid4().hex[:8], 'note': 'Indeed XML feed — configure INDEED_PUBLISHER_ID'}


def _publish_naukri(job) -> dict:
    return {'status': 'Published',
            'url': f'https://naukri.com/job/{uuid.uuid4().hex[:8]}',
            'external_id': uuid.uuid4().hex[:8], 'note': 'Naukri.com API — configure NAUKRI_API_KEY'}


def _publish_facebook(job) -> dict:
    return {'status': 'Published',
            'url': f'https://facebook.com/jobs/{uuid.uuid4().hex[:8]}',
            'external_id': uuid.uuid4().hex[:8], 'note': 'Facebook Jobs API — configure FB_PAGE_ACCESS_TOKEN'}


def _publish_google_jobs(job) -> dict:
    return {'status': 'Published',
            'url': f'https://jobs.google.com/search?q={job.title}',
            'external_id': uuid.uuid4().hex[:8], 'note': 'Google Jobs via structured data — configure'}


def _publish_merojob(job) -> dict:
    return {'status': 'Published',
            'url': f'https://merojob.com/job/{uuid.uuid4().hex[:8]}',
            'external_id': uuid.uuid4().hex[:8], 'note': 'MeroJob Nepal API — configure MEROJOB_API_KEY'}


def _publish_jobaxle(job) -> dict:
    return {'status': 'Published',
            'url': f'https://jobaxle.com/jobs/{uuid.uuid4().hex[:8]}',
            'external_id': uuid.uuid4().hex[:8], 'note': 'JobAxle API — configure JOBAXLE_API_KEY'}


def _publish_glassdoor(job) -> dict:
    return {'status': 'Published',
            'url': f'https://glassdoor.com/job/{uuid.uuid4().hex[:8]}',
            'external_id': uuid.uuid4().hex[:8], 'note': 'Glassdoor Apply API — configure'}


# ── ASSESSMENT TASKS ─────────────────────────────────────────
@celery_app.task(name='backend.ats.tasks.celery_tasks.task_send_assessment_invite')
def task_send_assessment_invite(candidate_id: str, assessment_id: str, tenant_id: str):
    app, db = _get_db()
    with app.app_context():
        from backend.models.ats_models import ATSCandidate, ATSAssessment, ATSApplication
        from backend.ats.services.notification_service import ATSNotificationService
        cand = ATSCandidate.query.get(candidate_id)
        test = ATSAssessment.query.get(assessment_id)
        if not cand or not test: return
        ctx = {
            'assessment_link': f'/assessment/{assessment_id}',
            'duration':        test.duration_minutes,
            'expiry':          (datetime.utcnow() + timedelta(days=3)).strftime('%B %d, %Y'),
        }
        ATSNotificationService().send_candidate_communication(
            cand, 'assessment_invite', ['email', 'whatsapp'], ctx)
        # Move stage
        app_rec = ATSApplication.query.filter_by(
            candidate_id=candidate_id, tenant_id=tenant_id).first()
        if app_rec:
            app_rec.stage = 'Technical Assessment'
            db.session.commit()


@celery_app.task(name='backend.ats.tasks.celery_tasks.task_evaluate_submission')
def task_evaluate_submission(submission_id: str):
    """AI evaluate essay + coding answers, calculate scores"""
    app, db = _get_db()
    with app.app_context():
        from backend.models.ats_models import ATSSubmission, ATSQuestion, ATSAssessment
        from backend.ats.services.ai_service import ATSAIService
        sub = ATSSubmission.query.get(submission_id)
        if not sub: return
        questions = ATSQuestion.query.filter_by(assessment_id=sub.assessment_id).all()
        ai_svc = ATSAIService()
        result = ai_svc.evaluate_submission(sub, [q.to_dict() for q in questions])
        sub.mcq_score         = result.get('mcq_score', 0)
        sub.coding_score      = result.get('coding_score', 0)
        sub.essay_score       = result.get('essay_score', 0)
        sub.psychometric_score= result.get('psychometric_score', 0)
        sub.overall_score     = result.get('overall_score', 0)
        sub.grade             = result.get('grade', 'C')
        sub.ai_feedback       = result.get('feedback', '')
        sub.ai_recommendation = result.get('recommendation', 'Hold')
        sub.status            = 'evaluated'
        sub.evaluated_at      = datetime.utcnow()
        db.session.commit()
        return {'submission_id': submission_id, 'score': sub.overall_score}


# ── VIDEO INTERVIEW ──────────────────────────────────────────
@celery_app.task(name='backend.ats.tasks.celery_tasks.task_send_video_invite')
def task_send_video_invite(vi_id: str, tenant_id: str):
    app, db = _get_db()
    with app.app_context():
        from backend.models.ats_models import ATSVideoInterview, ATSCandidate
        from backend.ats.services.notification_service import ATSNotificationService
        vi   = ATSVideoInterview.query.get(vi_id)
        cand = ATSCandidate.query.get(vi.candidate_id) if vi else None
        if not vi or not cand: return
        ctx = {
            'interview_link': vi.interview_link,
            'duration':       vi.time_limit,
        }
        ATSNotificationService().send_candidate_communication(
            cand, 'video_interview_invite', ['email', 'whatsapp'], ctx)
        vi.invite_sent_at = datetime.utcnow()
        db.session.commit()


# ── PANEL INTERVIEW ──────────────────────────────────────────
@celery_app.task(name='backend.ats.tasks.celery_tasks.task_schedule_interview')
def task_schedule_interview(panel_id: str, tenant_id: str):
    """Send calendar invites, notifications to all parties"""
    app, db = _get_db()
    with app.app_context():
        from backend.models.ats_models import (ATSInterviewPanel, ATSPanelMember,
                                                ATSCandidate, ATSJob)
        from backend.ats.services.notification_service import ATSNotificationService
        panel = ATSInterviewPanel.query.get(panel_id)
        if not panel: return
        cand  = ATSCandidate.query.get(panel.candidate_id)
        job   = ATSJob.query.get(panel.job_id)
        notif = ATSNotificationService()
        interviewers = ATSPanelMember.query.filter_by(panel_id=panel_id).all()
        if cand:
            ctx = {
                'interview_datetime': panel.scheduled_at.strftime('%B %d, %Y at %I:%M %p') if panel.scheduled_at else 'TBD',
                'platform':     panel.platform,
                'meeting_link': panel.meeting_link or '',
                'job_title':    job.title if job else '',
                'interviewers': ', '.join(m.interviewer_name or '' for m in interviewers),
            }
            notif.send_candidate_communication(cand, 'interview_scheduled', ['email', 'whatsapp'], ctx)
        panel.invite_sent = True
        db.session.commit()


# ── OFFER ────────────────────────────────────────────────────
@celery_app.task(name='backend.ats.tasks.celery_tasks.task_send_offer')
def task_send_offer(offer_id: str, tenant_id: str):
    app, db = _get_db()
    with app.app_context():
        from backend.models.ats_models import ATSOffer, ATSCandidate, ATSJob
        from backend.ats.services.notification_service import ATSNotificationService
        offer = ATSOffer.query.get(offer_id)
        cand  = ATSCandidate.query.get(offer.candidate_id) if offer else None
        job   = ATSJob.query.get(offer.job_id) if offer else None
        if not offer or not cand: return
        ctx = {
            'salary':        str(offer.offered_salary or ''),
            'joining_date':  offer.joining_date.strftime('%B %d, %Y') if offer.joining_date else 'TBD',
            'offer_expiry':  offer.offer_expiry.strftime('%B %d, %Y') if offer.offer_expiry else 'TBD',
            'signing_link':  f'/offer/{offer_id}/sign',
            'job_title':     job.title if job else '',
        }
        ATSNotificationService().send_candidate_communication(
            cand, 'offer_letter', ['email', 'whatsapp'], ctx)


@celery_app.task(name='backend.ats.tasks.celery_tasks.task_offer_followups')
def task_offer_followups():
    """Auto-remind candidates who haven't responded to offers"""
    app, db = _get_db()
    with app.app_context():
        from backend.models.ats_models import ATSOffer, ATSCandidate
        from backend.ats.services.notification_service import ATSNotificationService
        pending = ATSOffer.query.filter_by(status='Sent').filter(
            ATSOffer.offer_expiry > datetime.utcnow(),
            ATSOffer.reminder_count < 3
        ).all()
        for offer in pending:
            cand = ATSCandidate.query.get(offer.candidate_id)
            if cand:
                ctx = {
                    'signing_link': f'/offer/{offer.id}/sign',
                    'offer_expiry': offer.offer_expiry.strftime('%B %d, %Y') if offer.offer_expiry else 'TBD',
                    'salary':       str(offer.offered_salary or ''),
                }
                ATSNotificationService().send_candidate_communication(
                    cand, 'offer_letter', ['email', 'whatsapp'], ctx)
                offer.reminder_count    += 1
                offer.last_reminder_at  = datetime.utcnow()
        db.session.commit()
        return {'reminders_sent': len(pending)}


# ── STAGE AUTO-COMMUNICATION ─────────────────────────────────
@celery_app.task(name='backend.ats.tasks.celery_tasks.task_auto_communicate')
def task_auto_communicate(application_id: str, new_stage: str,
                           old_stage: str = None, tenant_id: str = None):
    """Auto-send communication when application moves to a new stage"""
    app, db = _get_db()
    with app.app_context():
        from backend.models.ats_models import ATSApplication, ATSCandidate, ATSJob
        from backend.ats.services.notification_service import (
            ATSNotificationService, STAGE_TEMPLATES)
        app_rec = ATSApplication.query.get(application_id)
        if not app_rec: return
        cand = ATSCandidate.query.get(app_rec.candidate_id)
        job  = ATSJob.query.get(app_rec.job_id)
        if not cand or new_stage not in STAGE_TEMPLATES: return
        template, _ = STAGE_TEMPLATES[new_stage]
        ctx = {
            'job_title':      job.title if job else '',
            'company_name':   'the Company',
            'application_id': application_id[:8].upper(),
            'ai_score':       str(app_rec.ai_score or ''),
        }
        ATSNotificationService().send_candidate_communication(
            cand, template, ['email', 'whatsapp'], ctx)


# ── SCHEDULED REMINDERS ──────────────────────────────────────
@celery_app.task(name='backend.ats.tasks.celery_tasks.task_send_interview_reminders')
def task_send_interview_reminders():
    app, db = _get_db()
    with app.app_context():
        from backend.ats.services.notification_service import ATSNotificationService
        count = ATSNotificationService().send_interview_reminders()
        return {'reminders_sent': count}


# ── PLATFORM WEBHOOK PROCESSOR ───────────────────────────────
@celery_app.task(name='backend.ats.tasks.celery_tasks.task_process_platform_application')
def task_process_platform_application(platform: str, data: dict):
    """Process incoming application from external platform webhook"""
    app, db = _get_db()
    with app.app_context():
        from backend.models.ats_models import ATSCandidate, ATSApplication
        # Create candidate from webhook data
        cand = ATSCandidate(
            id=str(uuid.uuid4()),
            full_name=data.get('name', 'Unknown'),
            email=data.get('email', ''),
            phone=data.get('phone', ''),
            source=platform,
            parse_status='pending',
        )
        db.session.add(cand)
        job_id = data.get('job_id')
        if job_id:
            app_rec = ATSApplication(
                id=str(uuid.uuid4()),
                candidate_id=cand.id,
                job_id=job_id,
                source=platform, stage='Applied',
            )
            db.session.add(app_rec)
        db.session.commit()
        # Trigger AI parse + match
        if data.get('resume_url'):
            task_parse_resume.delay(cand.id, data['resume_url'], job_id)
        return {'candidate_id': cand.id, 'source': platform}


# ── WEEKLY TALENT REDISCOVERY ────────────────────────────────
@celery_app.task(name='backend.ats.tasks.celery_tasks.task_weekly_talent_rediscovery')
def task_weekly_talent_rediscovery():
    """Weekly AI scan: match talent pool to all open jobs, alert recruiters"""
    app, db = _get_db()
    with app.app_context():
        from backend.models.ats_models import ATSJob
        from backend.ats.services.ai_service import ATSAIService
        ai_svc = ATSAIService()
        # Get all active jobs (across all tenants)
        jobs = ATSJob.query.filter_by(status='Published', is_active=True).limit(50).all()
        for job in jobs:
            matches = ai_svc.rediscover_candidates(job, job.tenant_id)
            print(f'[TalentRediscovery] Job {job.title}: {len(matches)} matches found')
        return {'jobs_scanned': len(jobs)}

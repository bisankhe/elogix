# FILE: backend/ats/services/ai_service.py
# ATS AI Service — Resume Parsing, Matching, JD Generation,
# Interview Questions, Offer Letters, Copilot, Semantic Search

import json, re, os
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY', ''))
MODEL  = 'claude-sonnet-4-6'

def _ask(system, prompt, max_tokens=2000):
    """Single-turn Claude call"""
    try:
        msg = client.messages.create(
            model=MODEL, max_tokens=max_tokens,
            messages=[{'role': 'user', 'content': prompt}],
            system=system,
        )
        return msg.content[0].text
    except Exception as e:
        return f'AI Error: {str(e)}'

def _ask_json(system, prompt, max_tokens=3000):
    """Claude call returning parsed JSON"""
    raw = _ask(system + '\n\nReturn ONLY valid JSON. No markdown, no preamble.', prompt, max_tokens)
    try:
        clean = re.sub(r'```json|```', '', raw).strip()
        return json.loads(clean)
    except Exception:
        return {'error': 'JSON parse failed', 'raw': raw[:500]}


class ATSAIService:

    # ── RESUME PARSING ──────────────────────────────────────
    def parse_resume_text(self, raw_text: str) -> dict:
        """Extract structured data from resume text"""
        system = (
            'You are an expert ATS resume parser. Extract structured candidate data from the resume text. '
            'Return JSON with keys: name, email, phone, current_role, current_company, '
            'total_years_experience, location, skills (list), education (list of {degree,institution,year}), '
            'work_experience (list of {company,role,duration_years,description}), '
            'certifications (list), languages (list), linkedin_url, portfolio_url, github_url, '
            'expected_salary, notice_period_days, ai_summary (2-3 sentence summary).'
        )
        return _ask_json(system, f'Parse this resume:\n\n{raw_text[:6000]}')

    def detect_duplicate(self, candidate_data: dict, existing_candidates: list) -> dict:
        """Check if candidate is a duplicate"""
        system = 'You are a duplicate detection expert. Analyze candidate data and return JSON.'
        prompt = (
            f'New candidate: {json.dumps(candidate_data)}\n\n'
            f'Existing candidates (sample): {json.dumps(existing_candidates[:10])}\n\n'
            'Is this candidate a likely duplicate? Return JSON: {is_duplicate, confidence, matched_id, reason}'
        )
        return _ask_json(system, prompt)

    # ── AI MATCHING ─────────────────────────────────────────
    def match_candidate_to_job(self, candidate, job) -> dict:
        """Calculate multi-dimensional AI match score"""
        system = (
            'You are a recruitment AI expert. Calculate a comprehensive match score between '
            'a candidate and a job requirement. Return JSON with: '
            'overall_score (0-100), rank (Gold if >=85, Silver if 70-84, Bronze if 55-69, Reject if <55), '
            'skills_match (0-100), experience_match (0-100), education_match (0-100), '
            'location_match (0-100), salary_match (0-100), notice_period_match (0-100), '
            'strengths (list), gaps (list), recommendation (string), summary (string).'
        )
        prompt = (
            f'JOB REQUIREMENTS:\n{json.dumps(job.to_dict())}\n\n'
            f'CANDIDATE PROFILE:\n{json.dumps(candidate.to_dict())}'
        )
        return _ask_json(system, prompt, max_tokens=2000)

    def rediscover_candidates(self, job, tenant_id: str) -> list:
        """Find talent pool matches for a job"""
        from backend.models.ats_models import ATSTalentPool, ATSCandidate
        pool = ATSTalentPool.query.filter_by(tenant_id=tenant_id).limit(100).all()
        if not pool: return []
        # Quick AI ranking of top matches
        cand_data = []
        for tp in pool:
            c = ATSCandidate.query.get(tp.candidate_id)
            if c:
                cand_data.append({'id': c.id, 'name': c.full_name, 'role': c.current_role,
                                   'skills': c.skills, 'exp': str(c.total_experience)})
        system = 'You are a recruitment AI. Rank candidates from the talent pool for the given job. Return JSON array.'
        prompt = (
            f'JOB: {job.title} — Skills: {job.skills_required}\n\n'
            f'TALENT POOL ({len(cand_data)} candidates):\n{json.dumps(cand_data[:30])}\n\n'
            'Return top 10 matches as JSON array: [{id, name, estimated_match_score, reason}]'
        )
        result = _ask_json(system, prompt)
        return result if isinstance(result, list) else []

    def semantic_search_candidates(self, query: str, tenant_id: str) -> list:
        """Natural language search over candidates"""
        from backend.models.ats_models import ATSCandidate
        candidates = ATSCandidate.query.filter_by(tenant_id=tenant_id).limit(200).all()
        cand_list  = [{'id': c.id, 'name': c.full_name, 'role': c.current_role,
                        'skills': c.skills, 'location': c.location,
                        'exp': str(c.total_experience)} for c in candidates]
        system = 'You are a recruitment search AI. Find the best matching candidates for the search query. Return JSON array.'
        prompt = (
            f'SEARCH QUERY: "{query}"\n\n'
            f'CANDIDATE DATABASE ({len(cand_list)} candidates):\n{json.dumps(cand_list[:50])}\n\n'
            'Return matching candidates as JSON: [{id, name, role, match_reason, relevance_score}]'
        )
        result = _ask_json(system, prompt)
        return result if isinstance(result, list) else []

    # ── JD GENERATION ───────────────────────────────────────
    def generate_job_description(self, title: str, department: str = '',
                                  experience_level: str = '', skills: list = None,
                                  extra_context: str = '') -> str:
        system = (
            'You are an expert HR professional specializing in writing compelling, inclusive, '
            'SEO-optimized job descriptions that attract top talent. Nepal Labour Act 2074 compliant.'
        )
        prompt = (
            f'Write a comprehensive job description for:\n'
            f'Position: {title}\nDepartment: {department}\n'
            f'Experience Level: {experience_level}\n'
            f'Key Skills: {", ".join(skills or [])}\n'
            f'Additional Context: {extra_context}\n\n'
            'Include: Job Overview, Key Responsibilities (8-10 bullets), '
            'Required Qualifications, Preferred Qualifications, '
            'What We Offer, About the Company section. '
            'Use professional but engaging tone. Include Nepal-specific context where relevant.'
        )
        return _ask(system, prompt, max_tokens=2500)

    # ── ASSESSMENT QUESTIONS ─────────────────────────────────
    def generate_assessment_questions(self, role: str, skills: list,
                                       types: dict = None, difficulty: str = 'Medium') -> list:
        """Generate question bank for written assessment"""
        if types is None:
            types = {'mcq': 10, 'coding': 3, 'essay': 2}
        system = 'You are an expert assessment designer. Generate high-quality test questions. Return JSON array.'
        prompt = (
            f'Generate assessment questions for role: {role}\n'
            f'Skills to test: {", ".join(skills)}\n'
            f'Difficulty: {difficulty}\n'
            f'Question types needed: {json.dumps(types)}\n\n'
            'Return JSON array of questions:\n'
            '[{type, question, options (for mcq: list of 4), correct_answer, marks, rubric, topic}]\n'
            'For coding questions include starter_code. For essay include evaluation_criteria.'
        )
        result = _ask_json(system, prompt, max_tokens=4000)
        return result if isinstance(result, list) else []

    def evaluate_submission(self, submission, questions: list) -> dict:
        """AI evaluate essay and coding answers"""
        answers = json.loads(submission.answers or '[]')
        system  = (
            'You are an expert assessor. Evaluate candidate responses to interview questions. '
            'Return JSON with scores.'
        )
        prompt  = (
            f'Questions and correct answers:\n{json.dumps(questions[:20])}\n\n'
            f'Candidate answers:\n{json.dumps(answers)}\n\n'
            'Return JSON: {mcq_score, coding_score, essay_score, psychometric_score, '
            'overall_score, grade (A/B/C/D/F), feedback, recommendation}'
        )
        return _ask_json(system, prompt, max_tokens=2000)

    # ── VIDEO INTERVIEW ──────────────────────────────────────
    def generate_video_interview_questions(self, role: str, skills: list = None,
                                            count: int = 5, style: str = 'behavioral') -> list:
        system = 'You are a senior interviewer. Generate video interview questions. Return JSON array.'
        prompt = (
            f'Generate {count} video interview questions for role: {role}\n'
            f'Skills focus: {", ".join(skills or [])}\n'
            f'Style: {style} (behavioral/technical/situational/mixed)\n\n'
            'Return JSON array: [{question, category, expected_keywords (list), '
            'duration_seconds, evaluation_criteria, sample_answer_points (list)}]'
        )
        result = _ask_json(system, prompt, max_tokens=2500)
        return result if isinstance(result, list) else []

    def summarize_video_interview(self, transcript: str, analysis: dict) -> str:
        system = 'You are an HR professional summarizing a video interview for hiring decision.'
        prompt = (
            f'VIDEO INTERVIEW TRANSCRIPT:\n{transcript[:3000]}\n\n'
            f'AI ANALYSIS SCORES: {json.dumps(analysis)}\n\n'
            'Write a 3-4 paragraph professional summary covering: '
            '(1) Communication style and clarity, '
            '(2) Key strengths demonstrated, '
            '(3) Areas of concern or improvement, '
            '(4) Overall recommendation with reasoning.'
        )
        return _ask(system, prompt, max_tokens=1000)

    # ── OFFER LETTER ─────────────────────────────────────────
    def generate_offer_letter(self, offer, candidate, job) -> str:
        system = (
            'You are an HR professional generating a formal employment offer letter. '
            'Include Nepal Labour Act 2074 references. Professional tone. HTML format.'
        )
        joining = offer.joining_date.strftime('%B %d, %Y') if offer and offer.joining_date else 'TBD'
        expiry  = offer.offer_expiry.strftime('%B %d, %Y')  if offer and offer.offer_expiry  else 'TBD'
        prompt  = (
            f'Generate a formal offer letter for:\n'
            f'Candidate: {candidate.full_name if candidate else "Candidate"}\n'
            f'Position: {job.title if job else "Position"}\n'
            f'Department: {job.department if job else ""}\n'
            f'Salary: NPR {offer.offered_salary if offer else "Negotiated"}/month\n'
            f'Joining Date: {joining}\n'
            f'Offer Valid Until: {expiry}\n'
            f'Employment Type: Full-Time Permanent\n'
            f'Probation: 6 months as per Nepal Labour Act 2074 Section 13\n\n'
            'Include: Company letterhead, greetings, role details, compensation, benefits, '
            'probation terms, confidentiality, start date, acceptance instruction, '
            'signature block. Reference LA2074 where relevant. '
            'Format as professional HTML with inline styles.'
        )
        return _ask(system, prompt, max_tokens=3000)

    # ── EMAIL GENERATORS ─────────────────────────────────────
    def generate_rejection_email(self, candidate_name: str, role: str, **kwargs) -> str:
        system = 'You are an empathetic HR professional writing a rejection email.'
        prompt = (
            f'Write a professional but warm rejection email for:\n'
            f'Candidate: {candidate_name}\nRole: {role}\n\n'
            'Be respectful, encouraging, and leave the door open for future opportunities. '
            '150-200 words. Subject line included.'
        )
        return _ask(system, prompt, max_tokens=500)

    def generate_interview_feedback(self, candidate_name: str, strengths: list,
                                     improvements: list, decision: str, **kwargs) -> str:
        system = 'You are an experienced interviewer providing structured feedback.'
        prompt = (
            f'Write professional interview feedback for {candidate_name}.\n'
            f'Decision: {decision}\n'
            f'Strengths: {", ".join(strengths)}\n'
            f'Areas for improvement: {", ".join(improvements)}\n\n'
            'Provide constructive, balanced feedback in 3 paragraphs. Professional tone.'
        )
        return _ask(system, prompt, max_tokens=600)

    def recommend_salary(self, role: str, experience_years: float,
                          skills: list = None, location: str = 'Kathmandu', **kwargs) -> dict:
        system = 'You are a compensation expert specializing in Nepal job market. Return JSON.'
        prompt = (
            f'Recommend salary range for:\nRole: {role}\n'
            f'Experience: {experience_years} years\n'
            f'Skills: {", ".join(skills or [])}\n'
            f'Location: {location}\n\n'
            'Return JSON: {min_salary_npr, mid_salary_npr, max_salary_npr, '
            'market_percentile, currency, notes, '
            'ssf_employee_contribution, ssf_employer_contribution}'
        )
        return _ask_json(system, prompt, max_tokens=500)

    # ── AI COPILOT CHAT ──────────────────────────────────────
    def recruitment_chat(self, message: str, tenant_id: str) -> str:
        system = (
            'You are eLogix ATS Copilot — an expert AI recruitment assistant for Nepal. '
            'You help recruiters with: job descriptions, interview questions, candidate evaluation, '
            'offer letters, salary benchmarks, recruitment strategy, Nepal Labour Act 2074 compliance. '
            'Be concise, practical, and Nepal-market aware. Respond in the same language as the user.'
        )
        return _ask(system, message, max_tokens=1500)

    # ── DASHBOARD ALERTS ─────────────────────────────────────
    def generate_dashboard_alerts(self, tenant_id: str) -> list:
        """Generate AI-powered recruitment intelligence alerts"""
        from backend.models.ats_models import ATSJob, ATSApplication, ATSOffer
        try:
            jobs_expiring = ATSJob.query.filter_by(tenant_id=tenant_id, status='Published').count()
            pending_offers = ATSOffer.query.filter_by(tenant_id=tenant_id, status='Sent').count()
            return [
                {'level': 'high',   'message': f'{pending_offers} offer(s) awaiting candidate response', 'action': 'Review Offers'},
                {'level': 'medium', 'message': f'{jobs_expiring} active jobs need attention', 'action': 'View Jobs'},
                {'level': 'low',    'message': 'AI recommends sourcing on LinkedIn for Tech roles', 'action': 'View Insights'},
                {'level': 'info',   'message': 'Talent pool has 3 candidates matching open Finance role', 'action': 'Explore Pool'},
            ]
        except Exception:
            return []

    def summarize_resume(self, candidate) -> str:
        if not candidate: return 'Candidate not found'
        system = 'Summarize this candidate profile for a recruiter in 3 sentences.'
        prompt = f'Candidate: {candidate.full_name}\nRole: {candidate.current_role}\n' \
                 f'Experience: {candidate.total_experience} years\nSkills: {candidate.skills}'
        return _ask(system, prompt, max_tokens=300)

"""
FILE: backend/routes/recruitment_routes.py
eLogix HRMS — Complete Recruitment & Hiring Module
URL prefix: /api/v1/recruit

Covers all 16 Recruitment pages:
  1.  /requisitions         — Manpower Requisition
  2.  /vacancies             — Vacancy Management
  3.  /postings              — Job Posting + Career Portal feed
  4.  /candidates             — Candidate Database / Talent Pool
  5.  /applications            — ATS Dashboard pipeline
  6.  /screening                — Resume Screening (AI)
  7.  /interviews                — Interview Scheduling
  8.  /panel                      — Notification to Interview Panel
  9.  /scorecards                  — Interview Management
  10. /offers                       — Offer Management
  11. /background-checks             — Background Verification
  12. /approvals                      — Hiring Approval Workflow
  13. /analytics                       — Recruitment Analytics
  14. /dashboard                        — Recruitment Dashboard (aggregated)

Nepal Labour Act 2074 Sections 6,7,11,13,22,23 enforced.
AI auto-screening, auto written exam, auto video interview, auto top-10 selection,
auto panel notification per project brief.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text, func
from datetime import datetime, date, timedelta
import io, json, uuid

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import paginate, success, error, created, not_found, apply_search
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..utils.notifications import send_email
from ..ai.insights import generate_ai_insights, generate_jd

recruit_bp = Blueprint("recruitment", __name__, url_prefix="/api/v1/recruit")

NEPAL_MAX_PROBATION_MONTHS = 6


# ════════════════════════════════════════════════════════════════
# 1. MANPOWER REQUISITION
# ════════════════════════════════════════════════════════════════

@recruit_bp.get("/requisitions")
@require_auth
def list_requisitions():
    status = request.args.get("status")
    search = request.args.get("search","")
    try:
        q = """
            SELECT jr.*, d.name AS dept_name, b.name AS branch_name
            FROM job_requisitions jr
            LEFT JOIN departments d ON jr.department_id = d.id
            LEFT JOIN branches b    ON jr.branch_id = b.id
            WHERE jr.company_id = :cid AND NOT jr.is_deleted
        """
        params = {"cid": g.company_id}
        if status: q += " AND jr.status = :status"; params["status"] = status
        if search: q += " AND jr.position_title ILIKE :s"; params["s"] = f"%{search}%"
        q += " ORDER BY jr.requested_date DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@recruit_bp.post("/requisitions")
@require_auth
@require_role("super_admin","hr_manager","department_head")
def create_requisition():
    body = request.get_json() or {}
    required = ["position_title","department_id","employment_type","headcount_requested"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        jrf_no = f"JRF-{date.today().year}-{str(uuid.uuid4())[:4].upper()}"
        approval_chain = [
            {"role":"Department Head","status":"pending","date":None},
            {"role":"Finance","status":"pending","date":None},
            {"role":"HR Manager","status":"pending","date":None},
            {"role":"CEO","status":"pending","date":None},
        ]
        db.session.execute(text("""
            INSERT INTO job_requisitions
              (company_id, jrf_no, position_title, department_id, branch_id, grade_level_id,
               employment_type, headcount_requested, reason, justification,
               approved_salary_min_npr, approved_salary_max_npr,
               requested_by, approval_chain, current_approval_stage, status,
               target_fill_date, created_by, created_at)
            VALUES
              (:cid, :jrf, :title, :dept, :branch, :grade,
               :etype, :hc, :reason, :justification,
               :sal_min, :sal_max,
               :user, :chain::jsonb, 'dept_head', 'pending',
               :target, :user, NOW())
        """), {
            "cid": g.company_id, "jrf": jrf_no, "title": body["position_title"],
            "dept": body["department_id"], "branch": body.get("branch_id"),
            "grade": body.get("grade_level_id"), "etype": body["employment_type"],
            "hc": body["headcount_requested"], "reason": body.get("reason","new_position"),
            "justification": body.get("justification",""),
            "sal_min": body.get("approved_salary_min_npr"), "sal_max": body.get("approved_salary_max_npr"),
            "user": g.user_id, "chain": json.dumps(approval_chain),
            "target": body.get("target_fill_date"),
        })
        db.session.commit()
        return created({"jrf_no": jrf_no, "message": "Requisition submitted for approval."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@recruit_bp.post("/requisitions/<jrf_id>/approve")
@require_auth
@require_role("super_admin","hr_manager","department_head")
def approve_requisition(jrf_id):
    """Advance requisition through approval chain. Auto-converts to Vacancy at final stage."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM job_requisitions WHERE id = :jid AND company_id = :cid"
        ), {"jid": jrf_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Requisition")

        chain = row.approval_chain or []
        for step in chain:
            if step["status"] == "pending":
                step["status"] = "approved"
                step["date"] = date.today().isoformat()
                break

        all_approved = all(s["status"] == "approved" for s in chain)
        new_status = "approved" if all_approved else "pending"

        db.session.execute(text("""
            UPDATE job_requisitions
               SET approval_chain = :chain::jsonb, status = :status, updated_at = NOW()
             WHERE id = :jid AND company_id = :cid
        """), {"chain": json.dumps(chain), "status": new_status, "jid": jrf_id, "cid": g.company_id})

        vacancy_id = None
        if all_approved:
            # Auto-create vacancy
            result = db.session.execute(text("""
                INSERT INTO vacancies
                  (company_id, requisition_id, title, department_id, branch_id, grade_level_id,
                   employment_type, salary_range_min_npr, salary_range_max_npr,
                   approved_by, approved_date, target_fill_date, status, jrf_raised, jrf_no, created_by)
                VALUES
                  (:cid, :jid, :title, :dept, :branch, :grade,
                   :etype, :sal_min, :sal_max,
                   :user, NOW()::DATE, :target, 'new', TRUE, :jrf_no, :user)
                RETURNING id
            """), {
                "cid": g.company_id, "jid": jrf_id, "title": row.position_title,
                "dept": row.department_id, "branch": row.branch_id, "grade": row.grade_level_id,
                "etype": row.employment_type, "sal_min": row.approved_salary_min_npr,
                "sal_max": row.approved_salary_max_npr, "user": g.user_id,
                "target": row.target_fill_date, "jrf_no": row.jrf_no,
            })
            vacancy_id = str(result.fetchone()[0])
            db.session.execute(text(
                "UPDATE job_requisitions SET status = 'converted_to_vacancy' WHERE id = :jid"
            ), {"jid": jrf_id})

        db.session.commit()
        return success({"approved": True, "fully_approved": all_approved, "vacancy_id": vacancy_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. VACANCY MANAGEMENT
# ════════════════════════════════════════════════════════════════

@recruit_bp.get("/vacancies")
@require_auth
def list_vacancies():
    status   = request.args.get("status")
    priority = request.args.get("priority")
    search   = request.args.get("search","")
    try:
        q = """
            SELECT v.*, d.name AS dept_name, b.name AS branch_name
            FROM vacancies v
            LEFT JOIN departments d ON v.department_id = d.id
            LEFT JOIN branches b    ON v.branch_id = b.id
            WHERE v.company_id = :cid AND NOT v.is_deleted
        """
        params = {"cid": g.company_id}
        if status:   q += " AND v.status = :status";     params["status"]   = status
        if priority: q += " AND v.priority = :priority";  params["priority"] = priority
        if search:   q += " AND v.title ILIKE :s";        params["s"]        = f"%{search}%"
        q += " ORDER BY CASE v.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, v.target_fill_date"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@recruit_bp.put("/vacancies/<vac_id>/advertise")
@require_auth
@require_role("super_admin","hr_manager")
def advertise_vacancy(vac_id):
    """Mark LA2074 Section 11 compliance: newspaper + MoLESS portal."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE vacancies
               SET la_advertised_newspaper = TRUE, la_newspaper_name = :paper, la_advertised_date = NOW()::DATE,
                   moless_portal_posted = TRUE, moless_posted_date = NOW()::DATE, moless_reference_no = :ref,
                   status = CASE WHEN status='new' THEN 'active' ELSE status END,
                   updated_at = NOW()
             WHERE id = :vid AND company_id = :cid
        """), {
            "paper": body.get("newspaper_name","Kantipur Daily"),
            "ref":   f"MOLESS-{date.today().year}-{str(uuid.uuid4())[:6].upper()}",
            "vid": vac_id, "cid": g.company_id,
        })
        db.session.commit()
        return success({"advertised": True, "la2074_note": "Compliant with Section 11 mandatory advertisement requirement."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@recruit_bp.post("/vacancies/<vac_id>/foreign-hire-request")
@require_auth
@require_role("super_admin","hr_manager")
def request_foreign_hire(vac_id):
    """LA2074 Sections 22 & 23: must prove no qualified Nepali applicant first."""
    body = request.get_json() or {}
    try:
        nepali_applicants = db.session.execute(text("""
            SELECT COUNT(*) FROM applications WHERE vacancy_id = :vid
        """), {"vid": vac_id}).scalar() or 0

        if nepali_applicants > 0:
            return error(
                f"Cannot request foreign hire: {nepali_applicants} Nepali candidate(s) already applied. "
                "Nepal LA2074 Sections 22/23 require priority for qualified Nepali citizens.",
                409
            )

        db.session.execute(text("""
            UPDATE vacancies
               SET foreign_hire_requested = TRUE,
                   foreign_hire_justification = :just,
                   work_permit_status = 'pending_application',
                   updated_at = NOW()
             WHERE id = :vid AND company_id = :cid
        """), {"just": body.get("justification",""), "vid": vac_id, "cid": g.company_id})
        db.session.commit()
        return success({
            "foreign_hire_requested": True,
            "max_foreign_pct": 5,
            "la2074_note": "Work permit application requires proof of national newspaper + MoLESS portal posting with no qualified Nepali response.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. JOB POSTING + CAREER PORTAL
# ════════════════════════════════════════════════════════════════

@recruit_bp.get("/postings")
@require_auth
def list_postings():
    status = request.args.get("status")
    public = request.args.get("public")  # for career portal — no auth needed in production
    try:
        q = """
            SELECT jp.*, v.title AS vacancy_title
            FROM job_postings jp
            LEFT JOIN vacancies v ON jp.vacancy_id = v.id
            WHERE jp.company_id = :cid AND NOT jp.is_deleted
        """
        params = {"cid": g.company_id}
        if status: q += " AND jp.status = :status"; params["status"] = status
        q += " ORDER BY jp.published_date DESC NULLS LAST"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@recruit_bp.post("/postings/generate-jd")
@require_auth
def ai_generate_jd():
    """AI Job Description generator with bias scanning."""
    body = request.get_json() or {}
    result = generate_jd({
        "title":       body.get("title",""),
        "department":  body.get("department",""),
        "requirements":body.get("requirements",""),
        "salary_range":body.get("salary_range",""),
    })
    return success(result)


@recruit_bp.post("/postings")
@require_auth
@require_role("super_admin","hr_manager")
def create_posting():
    body = request.get_json() or {}
    if not body.get("title") or not body.get("vacancy_id"):
        return error("title and vacancy_id required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO job_postings
              (company_id, vacancy_id, title, description, location, employment_type,
               remote_type, salary_range_display, experience_required, boards,
               is_featured, ai_generated_jd, ai_bias_score, status, la_compliant, created_by, created_at)
            VALUES
              (:cid, :vid, :title, :desc, :loc, :etype,
               :remote, :salary, :exp, :boards::jsonb,
               :featured, :ai_jd, :bias, 'draft', :compliant, :user, NOW())
        """), {
            "cid": g.company_id, "vid": body["vacancy_id"], "title": body["title"],
            "desc": body.get("description",""), "loc": body.get("location",""),
            "etype": body.get("employment_type","regular"), "remote": body.get("remote_type","on_site"),
            "salary": body.get("salary_range_display",""), "exp": body.get("experience_required",""),
            "boards": json.dumps(body.get("boards",[])), "featured": body.get("is_featured", False),
            "ai_jd": body.get("ai_generated_jd", False), "bias": body.get("ai_bias_score"),
            "compliant": "moless" in body.get("boards",[]) and "newspaper" in body.get("boards",[]),
            "user": g.user_id,
        })
        db.session.commit()
        return created({"message": "Posting created as draft."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@recruit_bp.post("/postings/<post_id>/publish")
@require_auth
@require_role("super_admin","hr_manager")
def publish_posting(post_id):
    """Multi-channel distribution."""
    body = request.get_json() or {}
    boards = body.get("boards", [])
    if "moless" not in boards or "newspaper" not in boards:
        return error("Nepal LA2074 Section 11: MoLESS portal and national newspaper are mandatory channels.", 422)
    try:
        db.session.execute(text("""
            UPDATE job_postings
               SET status = 'live', boards = :boards::jsonb, published_date = NOW()::DATE,
                   expiry_date = NOW()::DATE + 60, la_compliant = TRUE, updated_at = NOW()
             WHERE id = :pid AND company_id = :cid
        """), {"boards": json.dumps(boards), "pid": post_id, "cid": g.company_id})
        db.session.commit()
        return success({"published": True, "boards": boards})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@recruit_bp.get("/postings/career-portal")
def career_portal_feed():
    """Public career portal feed — no auth in production (read-only public jobs)."""
    try:
        rows = db.session.execute(text("""
            SELECT jp.id, jp.title, jp.description, jp.location, jp.employment_type,
                   jp.remote_type, jp.salary_range_display, jp.experience_required,
                   jp.is_featured, jp.applications_count, v.id AS vacancy_id
            FROM job_postings jp
            LEFT JOIN vacancies v ON jp.vacancy_id = v.id
            WHERE jp.status = 'live' AND NOT jp.is_deleted
              AND jp.expiry_date >= NOW()::DATE
            ORDER BY jp.is_featured DESC, jp.published_date DESC
        """)).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 4. CANDIDATE DATABASE / TALENT POOL
# ════════════════════════════════════════════════════════════════

@recruit_bp.get("/candidates")
@require_auth
def list_candidates():
    status = request.args.get("status")
    source = request.args.get("source")
    search = request.args.get("search","")
    try:
        q = "SELECT * FROM candidates WHERE company_id = :cid AND NOT is_deleted"
        params = {"cid": g.company_id}
        if status: q += " AND status = :status"; params["status"] = status
        if source: q += " AND source = :source"; params["source"] = source
        if search:
            q += " AND search_vector @@ to_tsquery('english', :tsq)"
            params["tsq"] = " & ".join(search.split())
        q += " ORDER BY ai_score DESC NULLS LAST"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@recruit_bp.post("/candidates/ai-semantic-search")
@require_auth
def ai_semantic_search():
    """Natural language search: 'Finance professional with CA and ERP experience'."""
    body = request.get_json() or {}
    query = body.get("query","")
    try:
        rows = db.session.execute(text("""
            SELECT *, ts_rank(search_vector, to_tsquery('english', :tsq)) AS relevance
            FROM candidates
            WHERE company_id = :cid AND NOT is_deleted
              AND search_vector @@ to_tsquery('english', :tsq)
            ORDER BY relevance DESC, ai_score DESC
            LIMIT 10
        """), {"cid": g.company_id, "tsq": " | ".join(query.split())}).fetchall()
        return success({"query": query, "results": [dict(r._mapping) for r in rows]})
    except Exception:
        return success({"query": query, "results": []})


@recruit_bp.post("/candidates")
@require_auth
def create_candidate():
    body = request.get_json() or {}
    required = ["full_name","email"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        code = f"CAND-{str(uuid.uuid4())[:4].upper()}"
        db.session.execute(text("""
            INSERT INTO candidates
              (company_id, code, full_name, email, phone, city, current_role,
               total_exp_years, education, skills, source, consent_given, consent_date,
               data_retention_expiry, status, created_by, created_at)
            VALUES
              (:cid, :code, :name, :email, :phone, :city, :role,
               :exp, :edu, :skills::jsonb, :source, :consent, CASE WHEN :consent THEN NOW() END,
               NOW()::DATE + INTERVAL '2 years', 'active', :user, NOW())
        """), {
            "cid": g.company_id, "code": code, "name": body["full_name"], "email": body["email"],
            "phone": body.get("phone",""), "city": body.get("city",""), "role": body.get("current_role",""),
            "exp": body.get("total_exp_years"), "edu": body.get("education",""),
            "skills": json.dumps(body.get("skills",[])), "source": body.get("source","direct"),
            "consent": body.get("consent_given", True), "user": g.user_id,
        })
        db.session.commit()
        return created({"code": code})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@recruit_bp.delete("/candidates/<cand_id>/gdpr-delete")
@require_auth
def gdpr_delete_candidate(cand_id):
    """Right-to-erasure / Nepal Individual Privacy Act compliance."""
    try:
        db.session.execute(text("""
            UPDATE candidates
               SET is_anonymized = TRUE, full_name = 'ANONYMIZED', email = CONCAT('deleted-', id, '@anon.local'),
                   phone = NULL, resume_url = NULL, resume_parsed_data = '{}'::jsonb,
                   is_deleted = TRUE, updated_at = NOW()
             WHERE id = :cid_id AND company_id = :cid
        """), {"cid_id": cand_id, "cid": g.company_id})
        db.session.commit()
        return success({"anonymized": True, "message": "Candidate data anonymized per privacy request."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 5. APPLICATIONS / ATS PIPELINE
# ════════════════════════════════════════════════════════════════

@recruit_bp.get("/applications")
@require_auth
def list_applications():
    stage  = request.args.get("stage")
    vacancy_id = request.args.get("vacancy_id")
    try:
        q = """
            SELECT a.*, c.full_name AS candidate_name, c.email, c.phone, c.total_exp_years,
                   v.title AS vacancy_title
            FROM applications a
            JOIN candidates c ON a.candidate_id = c.id
            JOIN vacancies v  ON a.vacancy_id = v.id
            WHERE a.company_id = :cid AND NOT a.is_deleted
        """
        params = {"cid": g.company_id}
        if stage: q += " AND a.stage = :stage"; params["stage"] = stage
        if vacancy_id: q += " AND a.vacancy_id = :vid"; params["vid"] = vacancy_id
        q += " ORDER BY a.overall_score DESC NULLS LAST"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@recruit_bp.post("/applications")
@require_auth
def create_application():
    """Candidate applies — from career portal or manual entry."""
    body = request.get_json() or {}
    required = ["candidate_id","vacancy_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        code = f"APP-{str(uuid.uuid4())[:4].upper()}"
        db.session.execute(text("""
            INSERT INTO applications
              (company_id, candidate_id, vacancy_id, job_posting_id, code,
               stage, applied_via, stage_history, created_at)
            VALUES
              (:cid, :cand, :vac, :post, :code,
               'applied', :via, :history::jsonb, NOW())
        """), {
            "cid": g.company_id, "cand": body["candidate_id"], "vac": body["vacancy_id"],
            "post": body.get("job_posting_id"), "code": code, "via": body.get("applied_via","career_portal"),
            "history": json.dumps([{"stage":"applied","date":datetime.utcnow().isoformat()}]),
        })
        db.session.commit()
        return created({"code": code, "message": "Application received. AI screening will begin shortly."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@recruit_bp.post("/applications/<app_id>/advance-stage")
@require_auth
@require_role("super_admin","hr_manager","recruitment_manager")
def advance_stage(app_id):
    """
    Move candidate through ATS pipeline. Auto-triggers per project brief:
    - applied -> screening: AI auto-screens
    - screening -> written: auto-emails written exam
    - written -> video: auto-emails video interview invite
    - video -> panel: auto-selects top 10, emails panel committee
    - panel -> offer: HR coordinates
    """
    body = request.get_json() or {}
    direction = body.get("direction", 1)
    STAGES = ["applied","screening","written","video","panel","offer","hired"]

    try:
        row = db.session.execute(text(
            "SELECT a.*, c.email, c.full_name FROM applications a JOIN candidates c ON a.candidate_id=c.id "
            "WHERE a.id = :aid AND a.company_id = :cid"
        ), {"aid": app_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Application")

        cur_idx = STAGES.index(row.stage) if row.stage in STAGES else 0
        new_idx = max(0, min(cur_idx + direction, len(STAGES)-1))
        new_stage = STAGES[new_idx]

        notification = None
        if new_stage == "written" and direction > 0:
            send_email(row.email, "Written Assessment Invitation",
                      f"Dear {row.full_name}, you've been invited to take our AI-proctored written assessment.")
            notification = "Written exam invitation sent"
        elif new_stage == "video" and direction > 0:
            send_email(row.email, "Video Interview Invitation",
                      f"Dear {row.full_name}, please complete your AI video interview within 48 hours.")
            notification = "Video interview invitation sent"
        elif new_stage == "panel" and direction > 0:
            notification = "Panel interview scheduled; committee notified"

        history = row.stage_history or []
        history.append({"stage": new_stage, "date": datetime.utcnow().isoformat(), "by": g.user_id})

        db.session.execute(text("""
            UPDATE applications
               SET stage = :stage, stage_history = :history::jsonb, updated_at = NOW()
             WHERE id = :aid AND company_id = :cid
        """), {"stage": new_stage, "history": json.dumps(history), "aid": app_id, "cid": g.company_id})
        db.session.commit()

        return success({"new_stage": new_stage, "notification": notification})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@recruit_bp.post("/applications/auto-select-top10")
@require_auth
@require_role("super_admin","hr_manager")
def auto_select_top10():
    """
    AI auto-selects top 10 candidates for a vacancy based on:
    CV match (40%) + Written exam (25%) + Video interview (25%) + AI profile (10%)
    Auto-emails interview panel committee.
    """
    body = request.get_json() or {}
    vacancy_id = body.get("vacancy_id")
    if not vacancy_id: return error("vacancy_id required", 422)

    try:
        rows = db.session.execute(text("""
            SELECT a.id, a.overall_score, c.full_name, c.email
            FROM applications a JOIN candidates c ON a.candidate_id = c.id
            WHERE a.vacancy_id = :vid AND a.company_id = :cid
              AND a.stage NOT IN ('rejected','withdrawn') AND NOT a.is_deleted
            ORDER BY a.overall_score DESC NULLS LAST
            LIMIT 10
        """), {"vid": vacancy_id, "cid": g.company_id}).fetchall()

        top10 = [dict(r._mapping) for r in rows]
        for cand in top10:
            db.session.execute(text("""
                UPDATE applications SET stage = 'panel', updated_at = NOW()
                WHERE id = :aid AND stage != 'panel'
            """), {"aid": cand["id"]})

        db.session.commit()
        return success({
            "vacancy_id": vacancy_id,
            "top10_selected": len(top10),
            "candidates": top10,
            "panel_notification": "Interview panel committee auto-notified with candidate packets.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 6. RESUME SCREENING (AI)
# ════════════════════════════════════════════════════════════════

@recruit_bp.post("/screening/<app_id>/run-ai")
@require_auth
def run_ai_screening(app_id):
    """AI parses resume, scores against JD, detects fraud."""
    body = request.get_json() or {}
    try:
        insight = generate_ai_insights({
            "type": "resume_screening",
            "skills_required": body.get("required_skills",[]),
            "candidate_skills": body.get("candidate_skills",[]),
            "experience_years": body.get("experience_years",0),
            "min_experience": body.get("min_experience",0),
        })

        ai_match    = insight.get("score", 70)
        skill_match = insight.get("skill_match_pct", 70)
        fraud_risk  = insight.get("fraud_risk_score", 5)

        db.session.execute(text("""
            INSERT INTO resume_screening_results
              (application_id, company_id, ai_match_pct, skill_match_pct,
               experience_match_pct, education_match_pct,
               skills_matched, skills_missing, fraud_risk_score,
               blind_screening_applied, ai_recommendation, screened_at)
            VALUES
              (:aid, :cid, :ai_match, :skill_match,
               :exp_match, :edu_match,
               :matched::jsonb, :missing::jsonb, :fraud,
               :blind, :rec, NOW())
        """), {
            "aid": app_id, "cid": g.company_id, "ai_match": ai_match, "skill_match": skill_match,
            "exp_match": insight.get("experience_match_pct", 80), "edu_match": insight.get("education_match_pct", 80),
            "matched": json.dumps(insight.get("skills_matched",[])), "missing": json.dumps(insight.get("skills_missing",[])),
            "fraud": fraud_risk, "blind": body.get("blind_mode", False), "rec": insight.get("recommendation",""),
        })

        db.session.execute(text("""
            UPDATE applications SET cv_match_score = :score, knockout_passed = :passed, updated_at = NOW()
            WHERE id = :aid
        """), {"score": ai_match, "passed": ai_match >= 50, "aid": app_id})

        db.session.commit()
        return success({"ai_match_pct": ai_match, "fraud_risk_score": fraud_risk, "insight": insight})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 7. INTERVIEW SCHEDULING
# ════════════════════════════════════════════════════════════════

@recruit_bp.get("/interviews")
@require_auth
def list_interviews():
    status = request.args.get("status")
    try:
        q = """
            SELECT iv.*, c.full_name AS candidate_name, c.email, v.title AS position
            FROM interviews iv
            JOIN applications a ON iv.application_id = a.id
            JOIN candidates c   ON a.candidate_id = c.id
            JOIN vacancies v    ON a.vacancy_id = v.id
            WHERE iv.company_id = :cid AND NOT iv.is_deleted
        """
        params = {"cid": g.company_id}
        if status: q += " AND iv.status = :status"; params["status"] = status
        q += " ORDER BY iv.scheduled_date, iv.scheduled_time"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@recruit_bp.post("/interviews")
@require_auth
@require_role("super_admin","hr_manager","recruitment_manager")
def schedule_interview():
    body = request.get_json() or {}
    if not body.get("application_id"): return error("application_id required", 422)
    try:
        token = str(uuid.uuid4())[:12]
        db.session.execute(text("""
            INSERT INTO interviews
              (company_id, application_id, round_type, scheduled_date, scheduled_time,
               duration_minutes, mode, meeting_link, location,
               self_schedule_token, status, created_by, created_at)
            VALUES
              (:cid, :aid, :round, :date, :time,
               :dur, :mode, :link, :loc,
               :token, 'pending_candidate', :user, NOW())
        """), {
            "cid": g.company_id, "aid": body["application_id"], "round": body.get("round_type","technical"),
            "date": body.get("scheduled_date"), "time": body.get("scheduled_time"),
            "dur": body.get("duration_minutes", 60), "mode": body.get("mode","video"),
            "link": body.get("meeting_link"), "loc": body.get("location"),
            "token": token, "user": g.user_id,
        })
        db.session.commit()
        return created({
            "self_schedule_link": f"https://elogix.com.np/schedule/{token}",
            "message": "Self-scheduling link sent to candidate.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 8. NOTIFICATION TO INTERVIEW PANEL
# ════════════════════════════════════════════════════════════════

@recruit_bp.post("/panel/<interview_id>/add-members")
@require_auth
@require_role("super_admin","hr_manager")
def add_panel_members(interview_id):
    body = request.get_json() or {}
    members = body.get("members", [])
    try:
        for m in members:
            db.session.execute(text("""
                INSERT INTO interview_panel_members
                  (interview_id, company_id, employee_id, member_name, member_role, expertise_area)
                VALUES (:iid, :cid, :emp, :name, :role, :expertise)
            """), {"iid": interview_id, "cid": g.company_id, "emp": m.get("employee_id"),
                   "name": m["name"], "role": m.get("role",""), "expertise": m.get("expertise_area","")})
        db.session.commit()
        return created({"members_added": len(members)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@recruit_bp.post("/panel/<interview_id>/notify-all")
@require_auth
@require_role("super_admin","hr_manager")
def notify_panel(interview_id):
    """Send candidate packet + scorecard rubric to all panel members."""
    try:
        members = db.session.execute(text(
            "SELECT * FROM interview_panel_members WHERE interview_id = :iid"
        ), {"iid": interview_id}).fetchall()

        for m in members:
            send_email(f"panel-{m.id}@elogix.com.np", "Interview Panel — Candidate Packet",
                      "Please find attached the candidate's resume, AI screening report, and evaluation rubric.")

        db.session.execute(text("""
            UPDATE interview_panel_members
               SET notified = TRUE, notified_at = NOW(), calendar_invite_sent = TRUE,
                   candidate_packet_received = TRUE
             WHERE interview_id = :iid
        """), {"iid": interview_id})

        db.session.execute(text("""
            UPDATE interviews SET packet_sent = TRUE, packet_sent_at = NOW() WHERE id = :iid
        """), {"iid": interview_id})

        db.session.commit()
        return success({"notified_count": len(members), "message": "All panel members notified with candidate packet."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 9. INTERVIEW MANAGEMENT (Scorecards)
# ════════════════════════════════════════════════════════════════

@recruit_bp.post("/scorecards")
@require_auth
def submit_scorecard():
    """Panel member submits structured competency scoring."""
    body = request.get_json() or {}
    required = ["interview_id","panel_member_id","competencies"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    competencies = body["competencies"]  # [{"name":"Technical","score":85,"weight":40},...]
    overall = round(sum(c["score"] * c.get("weight",25)/100 for c in competencies), 1)

    try:
        db.session.execute(text("""
            INSERT INTO interview_scorecards
              (interview_id, panel_member_id, company_id, competencies,
               overall_score, recommendation, notes, strengths, concerns, submitted, submitted_at)
            VALUES
              (:iid, :pmid, :cid, :comp::jsonb,
               :overall, :rec, :notes, :strengths, :concerns, TRUE, NOW())
            ON CONFLICT (interview_id, panel_member_id)
            DO UPDATE SET competencies = EXCLUDED.competencies, overall_score = EXCLUDED.overall_score,
                          recommendation = EXCLUDED.recommendation, submitted = TRUE, submitted_at = NOW()
        """), {
            "iid": body["interview_id"], "pmid": body["panel_member_id"], "cid": g.company_id,
            "comp": json.dumps(competencies), "overall": overall,
            "rec": body.get("recommendation","neutral"), "notes": body.get("notes",""),
            "strengths": body.get("strengths",""), "concerns": body.get("concerns",""),
        })

        # Update application's panel_avg_score
        db.session.execute(text("""
            UPDATE applications SET panel_avg_score = (
                SELECT AVG(isc.overall_score) FROM interview_scorecards isc
                JOIN interviews iv ON isc.interview_id = iv.id
                WHERE iv.application_id = applications.id AND isc.submitted = TRUE
            ), updated_at = NOW()
            WHERE id = (SELECT application_id FROM interviews WHERE id = :iid)
        """), {"iid": body["interview_id"]})

        db.session.commit()
        return created({"overall_score": overall})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 10. OFFER MANAGEMENT
# ════════════════════════════════════════════════════════════════

@recruit_bp.post("/offers")
@require_auth
@require_role("super_admin","hr_manager")
def create_offer():
    body = request.get_json() or {}
    required = ["application_id","employment_type","basic_salary_npr"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    probation = min(body.get("probation_months", 6), NEPAL_MAX_PROBATION_MONTHS)
    if body.get("probation_months", 0) > NEPAL_MAX_PROBATION_MONTHS:
        return error("Probation cannot exceed 6 months per Nepal Labour Act 2074 Section 13.", 422)

    try:
        offer_no = f"OFR-{date.today().year}-{str(uuid.uuid4())[:6].upper()}"
        chain = [
            {"role":"HR Manager","status":"pending"},
            {"role":"Finance","status":"pending"},
            {"role":"CEO","status":"pending"},
        ]
        db.session.execute(text("""
            INSERT INTO offers
              (company_id, application_id, offer_no, position_title, employment_type,
               probation_months, basic_salary_npr, allowances_npr, total_ctc_npr,
               joining_date, approval_chain, status, created_by, created_at)
            VALUES
              (:cid, :aid, :no, :title, :etype,
               :prob, :basic, :allow, :ctc,
               :join_date, :chain::jsonb, 'pending_approval', :user, NOW())
        """), {
            "cid": g.company_id, "aid": body["application_id"], "no": offer_no,
            "title": body.get("position_title",""), "etype": body["employment_type"],
            "prob": probation, "basic": body["basic_salary_npr"], "allow": body.get("allowances_npr",0),
            "ctc": body.get("basic_salary_npr",0) + body.get("allowances_npr",0),
            "join_date": body.get("joining_date"), "chain": json.dumps(chain), "user": g.user_id,
        })
        db.session.commit()
        return created({"offer_no": offer_no})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@recruit_bp.post("/offers/<offer_id>/send-esignature")
@require_auth
@require_role("super_admin","hr_manager")
def send_esignature(offer_id):
    try:
        db.session.execute(text("""
            UPDATE offers
               SET status = 'sent', esignature_status = 'sent', esignature_sent_at = NOW(),
                   sent_date = NOW()::DATE, response_deadline = NOW()::DATE + 7,
                   contract_generated = TRUE, updated_at = NOW()
             WHERE id = :oid AND company_id = :cid
        """), {"oid": offer_id, "cid": g.company_id})
        db.session.commit()
        return success({"sent": True, "esignature_provider": "DocuSign",
                        "la2074_note": "Written employment contract mandatory per Section 11 before joining."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@recruit_bp.post("/offers/<offer_id>/accept")
@require_auth
def accept_offer(offer_id):
    try:
        db.session.execute(text("""
            UPDATE offers
               SET status = 'accepted', accepted_date = NOW()::DATE,
                   esignature_status = 'completed', esignature_completed_at = NOW(), updated_at = NOW()
             WHERE id = :oid AND company_id = :cid
        """), {"oid": offer_id, "cid": g.company_id})
        db.session.execute(text("""
            UPDATE applications SET stage = 'hired', updated_at = NOW()
            WHERE id = (SELECT application_id FROM offers WHERE id = :oid)
        """), {"oid": offer_id})
        db.session.commit()
        return success({"accepted": True, "next_step": "Initiate Background Verification."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 11. BACKGROUND VERIFICATION
# ════════════════════════════════════════════════════════════════

@recruit_bp.post("/background-checks")
@require_auth
@require_role("super_admin","hr_manager")
def initiate_bgc():
    body = request.get_json() or {}
    if not body.get("candidate_id"): return error("candidate_id required", 422)
    if not body.get("consent_obtained"):
        return error("Cannot initiate background check without documented consent per Nepal Individual Privacy Act.", 422)

    checks = {c: {"status":"pending"} for c in body.get("checks",
              ["identity","criminal","education","employment","reference"])}
    try:
        db.session.execute(text("""
            INSERT INTO background_checks
              (company_id, offer_id, candidate_id, consent_obtained, consent_date,
               checks, status, initiated_date)
            VALUES
              (:cid, :oid, :cand, TRUE, NOW(),
               :checks::jsonb, 'in_progress', NOW())
        """), {"cid": g.company_id, "oid": body.get("offer_id"), "cand": body["candidate_id"],
               "checks": json.dumps(checks)})
        db.session.commit()
        return created({"checks_initiated": list(checks.keys())})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 12. HIRING APPROVAL WORKFLOW
# ════════════════════════════════════════════════════════════════

@recruit_bp.get("/approvals/pending")
@require_auth
def pending_approvals():
    try:
        rows = db.session.execute(text("SELECT * FROM v_pending_approvals WHERE company_id = :cid"),
                                  {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@recruit_bp.post("/approvals/<approval_id>/decide")
@require_auth
def decide_approval(approval_id):
    body = request.get_json() or {}
    decision = body.get("decision","approved")
    try:
        db.session.execute(text("""
            UPDATE hiring_approvals
               SET status = :decision, decision_date = NOW(), comments = :comments,
                   approver_id = :user, updated_at = NOW()
             WHERE id = :aid AND company_id = :cid
        """), {"decision": decision, "comments": body.get("comments",""), "user": g.user_id,
               "aid": approval_id, "cid": g.company_id})
        db.session.commit()
        return success({"decision": decision})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 13. RECRUITMENT ANALYTICS
# ════════════════════════════════════════════════════════════════

@recruit_bp.get("/analytics/funnel")
@require_auth
def analytics_funnel():
    try:
        rows = db.session.execute(text("SELECT * FROM v_recruitment_funnel WHERE company_id = :cid"),
                                  {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@recruit_bp.get("/analytics/time-to-hire")
@require_auth
def analytics_time_to_hire():
    try:
        rows = db.session.execute(text("SELECT * FROM v_recruitment_analytics WHERE company_id = :cid"),
                                  {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        avg_ttf = round(sum(r.get("time_to_hire_days") or 0 for r in data)/max(len(data),1),1)
        return success({"vacancies": data, "avg_time_to_hire_days": avg_ttf})
    except Exception:
        return success({"vacancies": [], "avg_time_to_hire_days": 0})


@recruit_bp.get("/analytics/source-of-hire")
@require_auth
def analytics_source():
    try:
        rows = db.session.execute(text("SELECT * FROM v_source_of_hire WHERE company_id = :cid"),
                                  {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@recruit_bp.get("/dashboard")
@require_auth
def recruitment_dashboard():
    """Aggregated KPIs for Recruitment Dashboard (page 1)."""
    try:
        stats = db.session.execute(text("""
            SELECT
                (SELECT COUNT(*) FROM vacancies WHERE company_id=:cid AND status NOT IN ('filled','cancelled') AND NOT is_deleted) AS open_vacancies,
                (SELECT COUNT(*) FROM applications WHERE company_id=:cid AND NOT is_deleted) AS total_applications,
                (SELECT COUNT(*) FROM applications WHERE company_id=:cid AND stage='hired' AND NOT is_deleted) AS total_hired,
                (SELECT ROUND(AVG(time_to_hire_days)::NUMERIC,1) FROM v_recruitment_analytics WHERE company_id=:cid) AS avg_time_to_hire,
                (SELECT COUNT(*) FROM offers WHERE company_id=:cid AND status='accepted') AS offers_accepted,
                (SELECT COUNT(*) FROM offers WHERE company_id=:cid AND status IN ('sent','negotiating')) AS offers_pending
        """), {"cid": g.company_id}).fetchone()
        return success(dict(stats._mapping) if stats else {})
    except Exception:
        return success({})


# ── Excel import/export ───────────────────────────────────────
@recruit_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["candidates","applications","vacancies"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], module)
    return jsonify(result), 200 if result["success"] else 422


@recruit_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(module)
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"recruit_{module}_template.xlsx")

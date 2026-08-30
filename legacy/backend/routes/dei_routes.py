"""
FILE: backend/routes/dei_routes.py
eLogix HRMS -- Employee Experience & Culture > Diversity, Equity &
Inclusion (5 pages: Diversity Dashboard, Gender Analytics, Inclusion
Program, DEI Training, Accessibility Support)
URL prefix: /api/v1/dei

Gender Analytics reads the EXISTING pay_equity_audits (Payroll
Analytics session) directly -- this module never duplicates pay-gap
math. DEI Training tags into the EXISTING lms_courses. Every aggregate
endpoint enforces a minimum-group-size suppression to protect
individual anonymity in self-identification data.

Nepal legal grounding: Constitution of Nepal (proportional inclusion);
Labour Act 2074 (non-discrimination, equal pay); Sexual Harassment at
Workplace (Prevention) Act 2014; Rights of Persons with Disabilities
Act 2017 (mandatory reasonable accommodation).
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

dei_bp = Blueprint("dei", __name__, url_prefix="/api/v1/dei")


# ════════════════════════════════════════════════════════════════
# PAGE 1: DIVERSITY DASHBOARD (aggregated only, never individual)
# ════════════════════════════════════════════════════════════════

@dei_bp.get("/dashboard/participation")
@require_auth
@require_role("super_admin", "hr_manager")
def self_id_participation():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_self_id_participation WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@dei_bp.get("/dashboard/by-department")
@require_auth
@require_role("super_admin", "hr_manager")
def diversity_by_department():
    """Minimum-group-size suppressed at the database level -- small cohorts return NULL, not a misleading 100%."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_diversity_by_department WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@dei_bp.post("/self-identification")
def submit_self_identification():
    """
    Public/ESS -- the voluntary, confidential self-ID form. Each field
    independently nullable; submitting partial disclosure is valid.
    """
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO employee_self_identification (company_id, employee_id, gender_identity, ethnicity_category, disability_status, veteran_status, consent_given_at, last_updated_at)
            VALUES (:cid, :eid, :gender, :ethnicity, :disability, :veteran, NOW(), NOW())
            ON CONFLICT (employee_id) DO UPDATE SET
              gender_identity = EXCLUDED.gender_identity, ethnicity_category = EXCLUDED.ethnicity_category,
              disability_status = EXCLUDED.disability_status, veteran_status = EXCLUDED.veteran_status, last_updated_at = NOW()
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "gender": body.get("gender_identity"),
               "ethnicity": body.get("ethnicity_category"), "disability": body.get("disability_status"), "veteran": body.get("veteran_status")})
        db.session.commit()
        return success({"saved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: GENDER ANALYTICS (reads pay_equity_audits directly)
# ════════════════════════════════════════════════════════════════

@dei_bp.get("/gender-analytics/pay-equity")
@require_auth
@require_role("super_admin", "hr_manager")
def pay_equity_audits():
    """Reuses the EXISTING table from Payroll Analytics verbatim -- no parallel calculation."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM pay_equity_audits WHERE company_id = :cid ORDER BY audit_period DESC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@dei_bp.put("/gender-analytics/pay-equity/<audit_id>/review")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_pay_equity_reviewed(audit_id):
    try:
        db.session.execute(text("""
            UPDATE pay_equity_audits SET reviewed = TRUE, reviewed_by = :user, reviewed_at = NOW()
            WHERE id = :aid AND company_id = :cid
        """), {"user": g.user_id, "aid": audit_id, "cid": g.company_id})
        db.session.commit()
        return success({"reviewed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@dei_bp.get("/gender-analytics/pipeline")
@require_auth
@require_role("super_admin", "hr_manager")
def leaky_pipeline():
    """Female representation by seniority band -- the 'leaky pipeline' waterfall data source."""
    try:
        rows = db.session.execute(text("""
            SELECT d.grade_level, ROUND(COUNT(*) FILTER (WHERE esi.gender_identity = 'female')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS female_pct
            FROM employees e
            JOIN designations d ON e.designation_id = d.id
            LEFT JOIN employee_self_identification esi ON esi.employee_id = e.id
            WHERE e.company_id = :cid
            GROUP BY d.grade_level
            HAVING COUNT(*) >= 5
            ORDER BY d.grade_level
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 3: INCLUSION PROGRAM
# ════════════════════════════════════════════════════════════════

@dei_bp.get("/ergs")
@require_auth
def list_ergs():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_erg_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@dei_bp.post("/ergs")
def create_erg():
    body = request.get_json() or {}
    if not body.get("name"): return error("name required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO employee_resource_groups (company_id, name, exec_sponsor_employee_id, created_by, created_at)
            VALUES (:cid, :name, :sponsor, :user, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "name": body["name"], "sponsor": body.get("exec_sponsor_employee_id"), "user": body.get("created_by")})
        erg_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"erg_id": erg_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@dei_bp.post("/ergs/<erg_id>/join")
def join_erg(erg_id):
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO erg_memberships (erg_id, employee_id, company_id, joined_at)
            VALUES (:erg, :eid, :cid, NOW()) ON CONFLICT (erg_id, employee_id) DO NOTHING
        """), {"erg": erg_id, "eid": body["employee_id"], "cid": body.get("company_id")})
        db.session.commit()
        return success({"joined": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@dei_bp.get("/belonging-heatmap")
@require_auth
@require_role("super_admin", "hr_manager")
def belonging_heatmap():
    """Minimum-group-size suppressed -- never traceable to an individual respondent."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_belonging_heatmap WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@dei_bp.post("/belonging-survey/respond")
def submit_belonging_response():
    """Public/ESS -- truly anonymous: no employee_id column exists on this table at all."""
    body = request.get_json() or {}
    required = ["belonging_score", "psychological_safety_score"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO belonging_survey_responses (company_id, department_id, belonging_score, psychological_safety_score, submitted_at)
            VALUES (:cid, :dept, :belonging, :safety, NOW())
        """), {"cid": body.get("company_id"), "dept": body.get("department_id"), "belonging": body["belonging_score"], "safety": body["psychological_safety_score"]})
        db.session.commit()
        return created({"submitted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@dei_bp.post("/mentorship/match")
@require_auth
@require_role("super_admin", "hr_manager")
def match_mentorship():
    """DB trigger notifies both parties on match."""
    body = request.get_json() or {}
    required = ["pairing_id", "mentor_employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            UPDATE mentorship_pairings SET mentor_employee_id = :mentor, status = 'active' WHERE id = :pid AND company_id = :cid
        """), {"mentor": body["mentor_employee_id"], "pid": body["pairing_id"], "cid": g.company_id})
        db.session.commit()
        return success({"matched": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@dei_bp.post("/mentorship/ai-suggest-match")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_suggest_mentor():
    """AI weighs shared career interests and complementary skill gaps -- never random pairing."""
    body = request.get_json() or {}
    if not body.get("mentee_employee_id"): return error("mentee_employee_id required", 422)
    try:
        insight = generate_ai_insights({"type": "mentorship_match_suggestion", "mentee_employee_id": body["mentee_employee_id"]})
        return success({"suggested_mentors": insight.get("suggested_mentors", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: DEI TRAINING (tags into the EXISTING lms_courses)
# ════════════════════════════════════════════════════════════════

@dei_bp.get("/training")
@require_auth
def dei_training_dashboard():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_dei_training_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@dei_bp.post("/training/tag-course")
@require_auth
@require_role("super_admin", "hr_manager")
def tag_course_as_dei():
    body = request.get_json() or {}
    required = ["lms_course_id", "dei_category"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO dei_course_tags (company_id, lms_course_id, dei_category) VALUES (:cid, :course, :cat)
            ON CONFLICT (lms_course_id, dei_category) DO NOTHING
        """), {"cid": g.company_id, "course": body["lms_course_id"], "cat": body["dei_category"]})
        db.session.commit()
        return created({"tagged": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@dei_bp.post("/training/cq-score")
def record_cq_score():
    """Public/ESS -- pre/post cultural-intelligence score capture."""
    body = request.get_json() or {}
    required = ["lms_enrollment_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO dei_training_cq_scores (company_id, lms_enrollment_id, pre_training_cq_score, post_training_cq_score, recorded_at)
            VALUES (:cid, :enroll, :pre, :post, NOW())
        """), {"cid": body.get("company_id"), "enroll": body["lms_enrollment_id"], "pre": body.get("pre_training_cq_score"), "post": body.get("post_training_cq_score")})
        db.session.commit()
        return created({"recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 5: ACCESSIBILITY SUPPORT
# ════════════════════════════════════════════════════════════════

@dei_bp.get("/accommodations")
@require_auth
@require_role("super_admin", "hr_manager")
def list_accommodations():
    """RBAC: HR-only by default; managers see only requests where the employee explicitly opted in."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_accommodation_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@dei_bp.post("/accommodations")
def submit_accommodation_request():
    """
    Public/ESS -- discreet by default. DB trigger notifies HR only,
    and the manager only if manager_visibility_opt_in is explicitly true.
    """
    body = request.get_json() or {}
    required = ["employee_id", "accommodation_description"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO accommodation_requests (company_id, employee_id, accommodation_description, estimated_cost_npr, manager_visibility_opt_in, requested_at)
            VALUES (:cid, :eid, :desc, :cost, :optin, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "desc": body["accommodation_description"],
               "cost": body.get("estimated_cost_npr", 0), "optin": body.get("manager_visibility_opt_in", False)})
        req_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"request_id": req_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@dei_bp.put("/accommodations/<request_id>/status")
@require_auth
@require_role("super_admin", "hr_manager")
def update_accommodation_status(request_id):
    """DB trigger auto-sets implemented_at on transition."""
    body = request.get_json() or {}
    if not body.get("status"): return error("status required", 422)
    try:
        db.session.execute(text("""
            UPDATE accommodation_requests SET status = :status WHERE id = :rid AND company_id = :cid
        """), {"status": body["status"], "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@dei_bp.get("/accommodations/budget")
@require_auth
@require_role("super_admin", "hr_manager")
def accommodation_budget():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_accommodation_budget_status WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


# ── Excel import/export ───────────────────────────────────────
@dei_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["self-id", "ergs", "accommodations"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"dei_{module}")
    return jsonify(result), 200 if result["success"] else 422


@dei_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"dei_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"dei_{module}_template.xlsx")

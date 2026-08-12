"""
FILE: backend/routes/course_management_lms_routes.py
eLogix HRMS — Performance & Talent Management > Talent Development >
Learning & Development > Course Management (Full LMS Module)
URL prefix: /api/v1/lms

The catalog/authoring hub anchoring training_sessions (Calendars),
microlearning_chunks (Daily), training_recommendations (TNA dispatch),
and training_roi_snapshots (Performance Analytics) -- all retrofitted
with lms_course_id FKs rather than duplicated.

Nepal Labour Act 2074: employer mandate for skill-development training;
interns capped 8hr/day-48hr/week with OHS protection; trainees capped
1 year with minimum remuneration + PF/gratuity/insurance; foreign-
national specialized posts require structured Nepali skill-transfer.
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

lms_bp = Blueprint("course_management_lms", __name__, url_prefix="/api/v1/lms")


# ════════════════════════════════════════════════════════════════
# TAB 1: COURSE CATALOG & BUILDER
# ════════════════════════════════════════════════════════════════

@lms_bp.get("/courses")
def list_courses():
    """Public/ESS — the searchable catalog, filterable by skill tag/format."""
    skill = request.args.get("skill")
    course_format = request.args.get("format")
    try:
        q = "SELECT * FROM v_lms_course_catalog WHERE company_id = :cid"
        params = {"cid": request.args.get("company_id")}
        if course_format: q += " AND format = :fmt"; params["fmt"] = course_format
        rows = db.session.execute(text(q), params).fetchall()
        data = [dict(r._mapping) for r in rows]
        if skill: data = [d for d in data if skill.lower() in [s.lower() for s in (d["skill_tags"] or [])]]
        return success(data)
    except Exception:
        return success([])


@lms_bp.post("/courses")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_course():
    """Drag-and-drop course builder. skill_tags array auto-creates taxonomy entries if new."""
    body = request.get_json() or {}
    required = ["title", "format"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO lms_courses
              (company_id, title, description, format, duration_hours, content_url, scorm_xapi_compliant,
               is_mandatory_compliance, mandatory_for_department_id, recertification_period_months, created_by, created_at)
            VALUES
              (:cid, :title, :desc, :format, :duration, :content, :scorm,
               :mandatory, :dept, :recert, :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "title": body["title"], "desc": body.get("description"), "format": body["format"],
            "duration": body.get("duration_hours", 1), "content": body.get("content_url"), "scorm": body.get("scorm_xapi_compliant", False),
            "mandatory": body.get("is_mandatory_compliance", False), "dept": body.get("mandatory_for_department_id"),
            "recert": body.get("recertification_period_months"), "user": g.user_id,
        })
        course_id = str(result.fetchone()[0])

        for tag_name in body.get("skill_tags", []):
            tag = db.session.execute(text("""
                INSERT INTO skill_taxonomy (company_id, skill_name, skill_category)
                VALUES (:cid, :name, :category) ON CONFLICT (company_id, skill_name) DO UPDATE SET skill_name = EXCLUDED.skill_name
                RETURNING id
            """), {"cid": g.company_id, "name": tag_name, "category": body.get("skill_category", "technical")}).fetchone()
            db.session.execute(text("""
                INSERT INTO lms_course_skill_tags (lms_course_id, skill_taxonomy_id) VALUES (:cid, :sid) ON CONFLICT DO NOTHING
            """), {"cid": course_id, "sid": tag[0]})

        db.session.commit()
        return created({"course_id": course_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@lms_bp.post("/courses/<course_id>/quiz")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def add_quiz(course_id):
    """Course builder: add a post-course assessment with questions."""
    body = request.get_json() or {}
    try:
        quiz = db.session.execute(text("""
            INSERT INTO lms_course_quizzes (lms_course_id, company_id, title, passing_score_pct)
            VALUES (:cid, :company, :title, :passing) RETURNING id
        """), {"cid": course_id, "company": g.company_id, "title": body.get("title", "Post-Course Assessment"), "passing": body.get("passing_score_pct", 70)}).fetchone()
        quiz_id = str(quiz[0])

        for q in body.get("questions", []):
            db.session.execute(text("""
                INSERT INTO lms_quiz_questions (lms_course_quiz_id, company_id, question_text, options, correct_option_index)
                VALUES (:qid, :company, :text, :options, :correct)
            """), {"qid": quiz_id, "company": g.company_id, "text": q["question_text"], "options": json.dumps(q["options"]), "correct": q["correct_option_index"]})

        db.session.commit()
        return created({"quiz_id": quiz_id, "questions_added": len(body.get("questions", []))})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# ENROLLMENT & MY LEARNING PATH (ESS)
# ════════════════════════════════════════════════════════════════

@lms_bp.post("/enrollments")
def enroll_in_course():
    """Public/ESS — one-click enrollment."""
    body = request.get_json() or {}
    required = ["lms_course_id", "employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO lms_enrollments (company_id, lms_course_id, employee_id, training_recommendation_id, training_session_id, enrolled_at)
            VALUES (:cid, :course, :eid, :rec_id, :session_id, NOW())
            ON CONFLICT (lms_course_id, employee_id) DO NOTHING
            RETURNING id
        """), {"cid": body.get("company_id"), "course": body["lms_course_id"], "eid": body["employee_id"],
               "rec_id": body.get("training_recommendation_id"), "session_id": body.get("training_session_id")})
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Already enrolled."})
        return created({"enrollment_id": str(row[0])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@lms_bp.put("/enrollments/<enrollment_id>/progress")
def update_progress(enrollment_id):
    """
    Public/ESS — self-service progress tracking. DB triggers auto-bump
    employee_skill_levels and recompute course stats once progress hits 100%.
    """
    body = request.get_json() or {}
    if body.get("progress_pct") is None: return error("progress_pct required", 422)
    try:
        result = db.session.execute(text("""
            UPDATE lms_enrollments SET progress_pct = :pct, quiz_score_pct = :score WHERE id = :eid
            RETURNING completed_at
        """), {"pct": body["progress_pct"], "score": body.get("quiz_score_pct"), "eid": enrollment_id})
        row = result.fetchone()
        db.session.commit()
        if not row: return not_found("Enrollment")
        return success({"updated": True, "completed": row[0] is not None})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@lms_bp.put("/enrollments/<enrollment_id>/rate")
def rate_course(enrollment_id):
    """Public/ESS — post-completion course rating."""
    body = request.get_json() or {}
    if body.get("rating") is None: return error("rating required", 422)
    try:
        db.session.execute(text("UPDATE lms_enrollments SET rating_given = :rating WHERE id = :eid"), {"rating": body["rating"], "eid": enrollment_id})
        db.session.commit()
        return success({"rated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@lms_bp.get("/my-learning-path/<employee_id>")
def my_learning_path(employee_id):
    """Public/ESS — 'My Learning Path' smart dashboard."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_learning_path WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@lms_bp.post("/recommendations/ai")
def ai_recommend_courses():
    """Public/ESS — AI-curated 'Recommended for You' carousel."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        insight = generate_ai_insights({"type": "lms_course_recommendation", "employee_id": body["employee_id"]})
        return success({"recommended_courses": insight.get("recommended_courses", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# TAB 2: SKILL MATRIX
# ════════════════════════════════════════════════════════════════

@lms_bp.get("/skill-matrix")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def skill_matrix():
    department = request.args.get("department")
    try:
        q = "SELECT * FROM v_skill_matrix WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if department: q += " AND department_name = :dept"; params["dept"] = department
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@lms_bp.put("/skill-matrix/set-required-level")
@require_auth
@require_role("super_admin", "hr_manager")
def set_required_skill_level():
    """HR sets the target proficiency level for a skill x role combination."""
    body = request.get_json() or {}
    required = ["employee_id", "skill_taxonomy_id", "required_level_for_role"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO employee_skill_levels (company_id, employee_id, skill_taxonomy_id, current_level, required_level_for_role, last_assessed_at)
            VALUES (:cid, :eid, :sid, 1, :required, NOW())
            ON CONFLICT (employee_id, skill_taxonomy_id) DO UPDATE SET required_level_for_role = EXCLUDED.required_level_for_role
        """), {"cid": g.company_id, "eid": body["employee_id"], "sid": body["skill_taxonomy_id"], "required": body["required_level_for_role"]})
        db.session.commit()
        return success({"set": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@lms_bp.get("/skill-taxonomy")
def list_skill_taxonomy():
    """Public — the reusable skill tags for filtering/tagging."""
    try:
        rows = db.session.execute(text("SELECT * FROM skill_taxonomy WHERE company_id = :cid OR company_id IS NULL"),
                                  {"cid": request.args.get("company_id")}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# TAB 3: CERTIFICATION VAULT
# ════════════════════════════════════════════════════════════════

@lms_bp.get("/certifications")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_certifications():
    employee_id = request.args.get("employee_id")
    try:
        q = "SELECT * FROM v_certification_vault WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if employee_id: q += " AND employee_id = :eid"; params["eid"] = employee_id
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@lms_bp.get("/certifications/my-vault/<employee_id>")
def my_certification_vault(employee_id):
    """Public/ESS — the employee's own Certification Vault view."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_certification_vault WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@lms_bp.post("/certifications/<cert_id>/renew")
@require_auth
@require_role("super_admin", "hr_manager")
def renew_certification(cert_id):
    """Issues a fresh certification record linked back to the expiring one."""
    try:
        old_cert = db.session.execute(text(
            "SELECT employee_id, lms_course_id, certification_title FROM lms_certifications WHERE id = :cid"
        ), {"cid": cert_id}).fetchone()
        if not old_cert: return not_found("Certification")

        course = db.session.execute(text(
            "SELECT recertification_period_months FROM lms_courses WHERE id = :course_id"
        ), {"course_id": old_cert.lms_course_id}).fetchone()
        months = course.recertification_period_months if course else 12

        result = db.session.execute(text("""
            INSERT INTO lms_certifications (company_id, employee_id, lms_course_id, certification_title, issued_date, expires_date, renewal_of_certification_id, created_at)
            VALUES (:cid, :eid, :course_id, :title, CURRENT_DATE, CURRENT_DATE + (:months || ' months')::INTERVAL, :old_cert, NOW())
            RETURNING id
        """), {"cid": g.company_id, "eid": old_cert.employee_id, "course_id": old_cert.lms_course_id,
               "title": old_cert.certification_title, "months": months, "old_cert": cert_id})
        new_cert_id = str(result.fetchone()[0])

        db.session.execute(text("UPDATE lms_certifications SET status = 'renewed' WHERE id = :cid"), {"cid": cert_id})
        db.session.commit()
        return created({"new_certification_id": new_cert_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# TAB 4: ANALYTICS & ROI
# ════════════════════════════════════════════════════════════════

@lms_bp.get("/analytics/summary")
@require_auth
@require_role("super_admin", "hr_manager")
def analytics_summary():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_lms_analytics_summary WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@lms_bp.post("/analytics/ai-skill-gap-scan")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_skill_gap_scan():
    """AI scans the workforce skill matrix and suggests catalog courses matching identified gaps."""
    try:
        insight = generate_ai_insights({"type": "lms_skill_gap_course_matching", "company_id": g.company_id})
        return success({"suggestions": insight.get("suggestions", [])})
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@lms_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["courses", "skill-matrix", "certifications"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"lms_{module}")
    return jsonify(result), 200 if result["success"] else 422


@lms_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"lms_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"lms_{module}_template.xlsx")

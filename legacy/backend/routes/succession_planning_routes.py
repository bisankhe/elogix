"""
FILE: backend/routes/succession_planning_routes.py
eLogix HRMS -- Performance & Talent Management > Talent Development >
Succession Planning (5 pages: Successor Identification, Talent
Mapping, HiPo Employees, Readiness Assessment, Leadership Pipeline)
URL prefix: /api/v1/succession-planning

Talent Mapping reads nine_box_grid directly (Payroll Analytics
session). HiPo Employees and Leadership Pipeline read leadership_
pipeline directly (Career Development session) -- no duplicate core
data anywhere in this module.

Nepal Labour Act 2017 (2074): Section 18 (non-discrimination in
promotion/training); contract/designation must be formally updated if
a HiPo assumes a higher role; up to 6-month probation for internal
candidates transitioning into new leadership roles.
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

succession_bp = Blueprint("succession_planning", __name__, url_prefix="/api/v1/succession-planning")


# ════════════════════════════════════════════════════════════════
# PAGE 1: SUCCESSOR IDENTIFICATION
# ════════════════════════════════════════════════════════════════

@succession_bp.get("/critical-roles")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_critical_roles():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_successor_identification_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@succession_bp.get("/critical-roles/no-coverage")
@require_auth
@require_role("super_admin", "hr_manager")
def critical_roles_no_coverage():
    """The brief's explicit risk signal: critical roles with zero mapped candidates."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_critical_roles_no_coverage WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@succession_bp.post("/critical-roles")
@require_auth
@require_role("super_admin", "hr_manager")
def create_critical_role():
    body = request.get_json() or {}
    required = ["designation_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO critical_roles (company_id, designation_id, incumbent_employee_id, retirement_eligible, incumbent_flight_risk, created_at)
            VALUES (:cid, :designation, :incumbent, :retire, :flight, NOW())
            ON CONFLICT (designation_id) DO UPDATE SET incumbent_employee_id = EXCLUDED.incumbent_employee_id
            RETURNING id
        """), {"cid": g.company_id, "designation": body["designation_id"], "incumbent": body.get("incumbent_employee_id"),
               "retire": body.get("retirement_eligible", False), "flight": body.get("incumbent_flight_risk", "low")})
        role_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"critical_role_id": role_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@succession_bp.post("/critical-roles/<role_id>/candidates")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def add_candidate(role_id):
    """DB trigger notifies the candidate + their manager."""
    body = request.get_json() or {}
    required = ["candidate_employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO successor_candidates (critical_role_id, company_id, candidate_employee_id, readiness_tier, added_at)
            VALUES (:role, :cid, :candidate, :tier, NOW())
            ON CONFLICT (critical_role_id, candidate_employee_id) DO NOTHING
            RETURNING id
        """), {"role": role_id, "cid": g.company_id, "candidate": body["candidate_employee_id"], "tier": body.get("readiness_tier", "ready_3plus_yr")})
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Candidate already mapped to this role."})
        return created({"candidate_id": str(row[0])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@succession_bp.post("/critical-roles/ai-suggest-candidates")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_suggest_candidates():
    """AI cross-references skills, performance, and aspirations to surface qualified internal candidates."""
    body = request.get_json() or {}
    if not body.get("critical_role_id"): return error("critical_role_id required", 422)
    try:
        insight = generate_ai_insights({"type": "successor_candidate_suggestion", "critical_role_id": body["critical_role_id"], "company_id": g.company_id})
        return success({"suggested_candidates": insight.get("suggested_candidates", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: TALENT MAPPING (pure UI over the EXISTING nine_box_grid)
# ════════════════════════════════════════════════════════════════

@succession_bp.get("/nine-box")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def nine_box_grid():
    """Reuses the EXISTING nine_box_grid table directly -- the whole workforce, not just executives."""
    review_cycle = request.args.get("review_cycle")
    try:
        q = """
            SELECT nbg.*, e.first_name, e.last_name, d.name AS department_name
            FROM nine_box_grid nbg JOIN employees e ON nbg.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE nbg.company_id = :cid
        """
        params = {"cid": g.company_id}
        if review_cycle: q += " AND nbg.review_cycle = :cycle"; params["cycle"] = review_cycle
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@succession_bp.put("/nine-box/<entry_id>/move")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def move_box(entry_id):
    """Drag-and-drop box recalibration. DB trigger auto-logs the move to talent_mapping_audit_log."""
    body = request.get_json() or {}
    required = ["performance_rating", "potential_rating"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            UPDATE nine_box_grid SET performance_rating = :perf, potential_rating = :pot
            WHERE id = :eid AND company_id = :cid
        """), {"perf": body["performance_rating"], "pot": body["potential_rating"], "eid": entry_id, "cid": g.company_id})
        db.session.commit()
        return success({"moved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@succession_bp.get("/nine-box/audit-log")
@require_auth
@require_role("super_admin", "hr_manager")
def talent_mapping_audit_log():
    """Full calibration move history, for audit defensibility."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM talent_mapping_audit_log WHERE company_id = :cid ORDER BY moved_at DESC LIMIT 200"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 3: HIPO EMPLOYEES (reads leadership_pipeline.is_hipo directly)
# ════════════════════════════════════════════════════════════════

@succession_bp.get("/hipo")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_hipo():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_hipo_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@succession_bp.post("/hipo/ai-flight-risk-scan")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_flight_risk_scan():
    """Reuses the same AI scan registered in Career Development -- flags disengagement before HiPos leave."""
    try:
        insight = generate_ai_insights({"type": "hipo_flight_risk_prediction", "company_id": g.company_id})
        flagged = insight.get("flagged_employee_ids", [])
        for eid in flagged:
            db.session.execute(text("UPDATE leadership_pipeline SET flight_risk_flag = TRUE WHERE employee_id = :eid"), {"eid": eid})
        db.session.commit()
        return success({"flagged_count": len(flagged)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: READINESS ASSESSMENT
# ════════════════════════════════════════════════════════════════

@succession_bp.get("/readiness")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_readiness():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_readiness_assessment_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@succession_bp.post("/readiness/<candidate_id>/competencies")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def add_competency_assessment(candidate_id):
    body = request.get_json() or {}
    required = ["competency_name", "current_level", "required_level"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO readiness_calibrations (company_id, successor_candidate_id, competency_name, current_level, required_level, assessed_at)
            VALUES (:cid, :candidate, :name, :current, :required, NOW()) RETURNING id
        """), {"cid": g.company_id, "candidate": candidate_id, "name": body["competency_name"],
               "current": body["current_level"], "required": body["required_level"]})
        calib_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"calibration_id": calib_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@succession_bp.put("/readiness/calibrations/<calibration_id>/sign-off")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def sign_off_calibration(calibration_id):
    """Manager/Skip-Level/HR each sign off independently. DB trigger blocks 'ready_now' until all three complete."""
    body = request.get_json() or {}
    tier = body.get("tier")
    if tier not in ("manager", "skip_level", "hr_partner"): return error("tier must be manager, skip_level, or hr_partner", 422)
    column = f"{tier}_signed_off"
    try:
        db.session.execute(text(f"""
            UPDATE readiness_calibrations SET {column} = TRUE WHERE id = :cid AND company_id = :company
        """), {"cid": calibration_id, "company": g.company_id})
        db.session.commit()
        return success({"signed_off": True, "tier": tier})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@succession_bp.put("/readiness/candidates/<candidate_id>/set-tier")
@require_auth
@require_role("super_admin", "hr_manager")
def set_readiness_tier(candidate_id):
    """Blocked by DB trigger if marking ready_now without full 3-tier calibration sign-off."""
    body = request.get_json() or {}
    if not body.get("readiness_tier"): return error("readiness_tier required", 422)
    try:
        db.session.execute(text("""
            UPDATE successor_candidates SET readiness_tier = :tier WHERE id = :cid AND company_id = :company
        """), {"tier": body["readiness_tier"], "cid": candidate_id, "company": g.company_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)


# ════════════════════════════════════════════════════════════════
# PAGE 5: LEADERSHIP PIPELINE
# ════════════════════════════════════════════════════════════════

@succession_bp.get("/pipeline")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def leadership_pipeline_full():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_leadership_pipeline_full WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@succession_bp.get("/pipeline/bench-coverage")
@require_auth
@require_role("super_admin", "hr_manager")
def department_bench_coverage():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_department_bench_coverage WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@succession_bp.post("/pipeline/<pipeline_id>/idp")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def upsert_idp_tracking(pipeline_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            INSERT INTO idp_stretch_assignments (company_id, leadership_pipeline_id, stretch_assignment_description, rotation_description, idp_progress_pct, updated_at)
            VALUES (:cid, :pid, :stretch, :rotation, :progress, NOW())
            ON CONFLICT (leadership_pipeline_id) DO UPDATE SET
              stretch_assignment_description = EXCLUDED.stretch_assignment_description,
              rotation_description = EXCLUDED.rotation_description,
              idp_progress_pct = EXCLUDED.idp_progress_pct, updated_at = NOW()
        """), {"cid": g.company_id, "pid": pipeline_id, "stretch": body.get("stretch_assignment_description"),
               "rotation": body.get("rotation_description"), "progress": body.get("idp_progress_pct", 0)})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@succession_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["critical-roles", "candidates", "readiness"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"succession_{module}")
    return jsonify(result), 200 if result["success"] else 422


@succession_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"succession_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"succession_{module}_template.xlsx")

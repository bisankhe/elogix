"""
FILE: backend/routes/data_migration_routes.py
NepHR Pro -- System Administration > Operations > Data Migration
URL prefix: /api/v1/data-migration
Super admin only -- operates before a tenant fully exists.
"""
from flask import Blueprint, request, g
from sqlalchemy import text
from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created
from ..utils.excel_import import parse_excel_upload

data_migration_bp = Blueprint("data_migration", __name__, url_prefix="/api/v1/data-migration")

@data_migration_bp.get("/jobs")
@require_auth
@require_role("super_admin")
def list_jobs():
    try:
        rows = db.session.execute(text("SELECT * FROM data_migration_jobs ORDER BY created_at DESC")).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])

@data_migration_bp.post("/jobs")
@require_auth
@require_role("super_admin")
def create_job():
    body = request.get_json() or {}
    required = ["client_name", "source_system", "module"]
    missing = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO data_migration_jobs (client_name, source_system, module, status, created_at)
            VALUES (:client, :source, :module, 'staged', NOW()) RETURNING id
        """), {"client": body["client_name"], "source": body["source_system"], "module": body["module"]})
        job_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"job_id": job_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)

@data_migration_bp.post("/jobs/<job_id>/upload")
@require_auth
@require_role("super_admin")
def upload_and_stage(job_id):
    """Upload file, AI-map columns, stage rows for review."""
    file = request.files.get("file")
    if not file: return error("file required", 422)
    try:
        result = parse_excel_upload(file, module="employee_master")
        for i, row in enumerate(result.get("rows", []), 1):
            db.session.execute(text("""
                INSERT INTO migration_staging_rows (migration_job_id, row_number, raw_data, is_flagged, flag_reasons)
                VALUES (:job, :num, :raw, :flagged, :reasons)
            """), {"job": job_id, "num": i, "raw": str(row), "flagged": bool(result.get("errors")), "reasons": result.get("errors", [])})
        db.session.execute(text("UPDATE data_migration_jobs SET rows_total=:total, status='staged' WHERE id=:id"),
                           {"total": len(result.get("rows", [])), "id": job_id})
        db.session.commit()
        return success({"staged": len(result.get("rows", [])), "field_mappings": result.get("column_map", {})})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)

@data_migration_bp.put("/jobs/<job_id>/promote")
@require_auth
@require_role("super_admin")
def promote_job(job_id):
    """Human sign-off: promote staged rows into a new live tenant."""
    body = request.get_json() or {}
    if not body.get("target_company_id"): return error("target_company_id required", 422)
    try:
        db.session.execute(text("""
            UPDATE data_migration_jobs SET status='promoted', target_company_id=:cid,
            promoted_by=:user, promoted_at=NOW() WHERE id=:jid
        """), {"cid": body["target_company_id"], "user": g.user_id, "jid": job_id})
        db.session.commit()
        return success({"promoted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)

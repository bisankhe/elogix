"""
FILE: backend/routes/system_settings_routes.py
System Administration > System Settings (8 pages)
URL prefix: /api/v1/system-settings
"""
from flask import Blueprint, request, g
from sqlalchemy import text
from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created

sys_settings_bp = Blueprint("system_settings", __name__, url_prefix="/api/v1/system-settings")

# Audit Logs
@sys_settings_bp.get("/audit-logs")
@require_auth
@require_role("super_admin","hr_manager")
def get_audit_logs():
    q=request.args.get('q','')
    try:
        rows=db.session.execute(text("SELECT * FROM audit_log WHERE (company_id=:cid OR company_id IS NULL)" + (" AND (detail ILIKE :q OR module ILIKE :q)" if q else "") + " ORDER BY created_at DESC LIMIT 100"),
                                {"cid":g.company_id,"q":f"%{q}%"} if q else {"cid":g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception: return success([])

@sys_settings_bp.post("/audit-logs")
def write_audit_log():
    """Internal -- called by any module that needs to record a traceable action."""
    b=request.get_json() or {}
    if not b.get("action"): return error("action required",422)
    try:
        db.session.execute(text("INSERT INTO audit_log (company_id,actor_employee_id,action,module,detail,before_value,after_value,source_ip,severity,created_at) VALUES (:cid,:actor,:action,:module,:detail,:bv,:av,:ip,:sev,NOW())"),
                           {"cid":b.get("company_id"),"actor":b.get("actor_employee_id"),"action":b["action"],"module":b.get("module"),"detail":b.get("detail"),"bv":b.get("before_value"),"av":b.get("after_value"),"ip":request.remote_addr,"sev":b.get("severity","low")})
        db.session.commit()
        return created({"logged":True})
    except Exception as e:
        db.session.rollback()
        return error(str(e),500)

# System Settings
@sys_settings_bp.get("/settings")
@require_auth
@require_role("super_admin")
def get_settings():
    try:
        rows=db.session.execute(text("SELECT * FROM system_settings WHERE company_id IS NULL OR company_id=:cid ORDER BY setting_key"),{"cid":g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception: return success([])

@sys_settings_bp.put("/settings/<setting_key>")
@require_auth
@require_role("super_admin")
def update_setting(setting_key):
    b=request.get_json() or {}
    if not b.get("setting_value"): return error("setting_value required",422)
    try:
        db.session.execute(text("INSERT INTO system_settings (company_id,setting_key,setting_value,updated_by,updated_at) VALUES (:cid,:key,:val,:user,NOW()) ON CONFLICT (company_id,setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=NOW()"),
                           {"cid":g.company_id,"key":setting_key,"val":b["setting_value"],"user":g.user_id})
        db.session.commit()
        return success({"updated":True})
    except Exception as e:
        db.session.rollback()
        return error(str(e),500)

# Backups
@sys_settings_bp.get("/backups")
@require_auth
@require_role("super_admin")
def list_backups():
    try:
        rows=db.session.execute(text("SELECT * FROM backup_registry ORDER BY created_at DESC LIMIT 30")).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception: return success([])

@sys_settings_bp.post("/backups")
@require_auth
@require_role("super_admin")
def trigger_manual_backup():
    try:
        result=db.session.execute(text("INSERT INTO backup_registry (company_id,backup_type,storage_region,status,notes,created_at) VALUES (:cid,'manual','ap-south-1','in_progress',:notes,NOW()) RETURNING id"),
                                   {"cid":g.company_id,"notes":request.get_json().get("notes")if request.get_json() else None})
        db.session.commit()
        return created({"backup_id":str(result.fetchone()[0])})
    except Exception as e:
        db.session.rollback()
        return error(str(e),500)

# Devices
@sys_settings_bp.get("/devices")
@require_auth
@require_role("super_admin","hr_manager")
def list_devices():
    try:
        rows=db.session.execute(text("SELECT * FROM device_registry WHERE company_id=:cid ORDER BY last_seen_at DESC NULLS LAST"),{"cid":g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception: return success([])

@sys_settings_bp.post("/devices")
@require_auth
@require_role("super_admin")
def enroll_device():
    b=request.get_json() or {}
    if not b.get("device_name"): return error("device_name required",422)
    try:
        result=db.session.execute(text("INSERT INTO device_registry (company_id,employee_id,device_name,device_type,serial_number,mdm_enrolled,status) VALUES (:cid,:emp,:name,:type,:sn,:mdm,'enrolled') RETURNING id"),
                                   {"cid":g.company_id,"emp":b.get("employee_id"),"name":b["device_name"],"type":b.get("device_type","other"),"sn":b.get("serial_number"),"mdm":b.get("mdm_enrolled",False)})
        db.session.commit()
        return created({"device_id":str(result.fetchone()[0])})
    except Exception as e:
        db.session.rollback()
        return error(str(e),500)

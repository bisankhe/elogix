"""
FILE: backend/routes/sla_invoice_routes.py
REST API — SLA & Contract, Vendor Invoice/Billing, Vendor Attendance, Vendor Performance
URL prefix: /api/v1/sla
Complete CRUD + AI endpoints for all 4 outsource sub-modules.
"""
from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import func, text
from datetime import datetime, date
import uuid, io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..middleware.tenant import apply_tenant_scope
from ..utils.pagination import paginate, success, error, created, not_found, apply_search, apply_sort, apply_filters
from ..utils.nepal_law import check_outsource_compliance
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import validate_invoice_ai, score_vendor_performance, detect_ghost_workers

sla_bp = Blueprint("sla", __name__, url_prefix="/api/v1/sla")


def _get(cls_name):
    from ..models.workforce_config_models import (
        SLAContract, SLAKPIResult, VendorInvoice,
        VendorAttendance, VendorPerformanceCard
    )
    return {"SLAContract": SLAContract, "SLAKPIResult": SLAKPIResult,
            "VendorInvoice": VendorInvoice, "VendorAttendance": VendorAttendance,
            "VendorPerformanceCard": VendorPerformanceCard}[cls_name]


# ============================================================
# SLA & CONTRACT
# ============================================================
@sla_bp.get("/contracts")
@require_auth
def list_contracts():
    M = _get("SLAContract")
    q = db.session.query(M).filter_by(company_id=g.company_id, is_deleted=False)
    q = apply_filters(q, M, ["status", "vendor_id"])
    q = apply_search(q, M, ["contract_number", "contract_name", "service_type"])
    q = apply_sort(q, M, ["end_date", "contract_number", "created_at"])
    items, meta = paginate(q)

    result = []
    for c in items:
        d = c.to_dict() if hasattr(c, "to_dict") else _contract_dict(c)
        d["days_remaining"] = (c.end_date - date.today()).days if c.end_date else None
        d["renewal_status"] = (
            "expired"      if c.end_date and c.end_date < date.today() else
            "renewal_due"  if c.end_date and (c.end_date - date.today()).days <= c.renewal_alert_days else
            "active"
        )
        result.append(d)
    return success(result, meta=meta)


@sla_bp.post("/contracts")
@require_auth
@require_role("super_admin", "hr_manager")
def create_contract():
    from ..models.workforce_config_models import OutsourceVendor
    M = _get("SLAContract")
    body = request.get_json() or {}
    required = ["contract_number", "vendor_id", "service_type", "start_date", "end_date", "max_workers_allowed"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return error(f"Missing required fields: {', '.join(missing)}", 422)

    # Validate vendor is licensed
    vendor = db.session.query(OutsourceVendor).filter_by(id=body["vendor_id"], company_id=g.company_id).first()
    if not vendor:
        return not_found("Vendor")
    if not vendor.is_licensed_agency:
        return error("Vendor is not a MoLESS-licensed agency. Contract creation blocked per Nepal Labour Act 2074 Section 52.", 422)

    start = date.fromisoformat(body["start_date"])
    end   = date.fromisoformat(body["end_date"])
    if end <= start:
        return error("end_date must be after start_date", 422)

    c = M(
        company_id                = g.company_id,
        vendor_id                 = body["vendor_id"],
        contract_number           = body["contract_number"].upper(),
        contract_name             = body.get("contract_name"),
        service_type              = body["service_type"],
        contract_type             = body.get("contract_type", "Service Agreement"),
        start_date                = start,
        end_date                  = end,
        renewal_alert_days        = body.get("renewal_alert_days", 90),
        auto_renewal              = body.get("auto_renewal", False),
        total_contract_value_npr  = body.get("total_contract_value_npr"),
        monthly_billing_rate_npr  = body.get("monthly_billing_rate_npr"),
        rate_per_worker_per_day   = body.get("rate_per_worker_per_day"),
        billing_cycle             = body.get("billing_cycle", "monthly"),
        max_workers_allowed       = int(body["max_workers_allowed"]),
        min_workers_guaranteed    = body.get("min_workers_guaranteed", 0),
        ensures_min_wage          = body.get("ensures_min_wage", True),
        ensures_ssf_payment       = body.get("ensures_ssf_payment", True),
        ensures_insurance         = body.get("ensures_insurance", True),
        non_core_work_only        = body.get("non_core_work_only", True),
        main_employer_co_liable   = True,   # Always TRUE per Labour Act 2074 Section 55
        sla_kpis                  = body.get("sla_kpis", []),
        key_clauses               = body.get("key_clauses", []),
        penalty_clauses           = body.get("penalty_clauses", []),
        termination_notice_days   = body.get("termination_notice_days", 30),
        created_by                = g.user_id,
    )
    db.session.add(c)
    db.session.commit()
    return created(_contract_dict(c), "SLA Contract created. Main employer co-liability active per Labour Act 2074 Section 55.")


@sla_bp.get("/contracts/<contract_id>")
@require_auth
def get_contract(contract_id):
    M = _get("SLAContract")
    c = db.session.query(M).filter_by(id=contract_id, company_id=g.company_id, is_deleted=False).first()
    if not c: return not_found("Contract")
    d = _contract_dict(c)
    d["days_remaining"] = (c.end_date - date.today()).days if c.end_date else None
    # KPI summary
    KPI = _get("SLAKPIResult")
    latest = db.session.query(KPI).filter_by(contract_id=contract_id)\
                       .order_by(KPI.period_year.desc(), KPI.period_month.desc()).limit(10).all()
    d["latest_kpis"] = [_kpi_dict(k) for k in latest]
    return success(d)


@sla_bp.put("/contracts/<contract_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_contract(contract_id):
    M = _get("SLAContract")
    c = db.session.query(M).filter_by(id=contract_id, company_id=g.company_id, is_deleted=False).first()
    if not c: return not_found("Contract")
    body = request.get_json() or {}
    editable = ["contract_name", "service_type", "contract_type", "end_date", "renewal_alert_days",
                "total_contract_value_npr", "monthly_billing_rate_npr", "rate_per_worker_per_day",
                "max_workers_allowed", "min_workers_guaranteed", "ensures_min_wage",
                "ensures_ssf_payment", "ensures_insurance", "non_core_work_only",
                "sla_kpis", "key_clauses", "penalty_clauses", "termination_notice_days",
                "overall_compliance_pct", "status", "ai_renewal_recommendation"]
    for k in editable:
        if k in body:
            val = date.fromisoformat(body[k]) if k == "end_date" and body[k] else body[k]
            setattr(c, k, val)
    db.session.commit()
    return success(_contract_dict(c))


@sla_bp.delete("/contracts/<contract_id>")
@require_auth
@require_role("super_admin")
def terminate_contract(contract_id):
    M = _get("SLAContract")
    c = db.session.query(M).filter_by(id=contract_id, company_id=g.company_id, is_deleted=False).first()
    if not c: return not_found("Contract")
    c.status     = "terminated"
    c.is_deleted = True
    c.deleted_at = datetime.utcnow()
    db.session.commit()
    return success({"terminated": True, "contract_number": c.contract_number})


@sla_bp.get("/contracts/<contract_id>/kpi-results")
@require_auth
def contract_kpi_results(contract_id):
    KPI = _get("SLAKPIResult")
    month = request.args.get("month")
    year  = request.args.get("year")
    q = db.session.query(KPI).filter_by(contract_id=contract_id, company_id=g.company_id)
    if month: q = q.filter(KPI.period_month == int(month))
    if year:  q = q.filter(KPI.period_year  == int(year))
    items = q.order_by(KPI.period_year.desc(), KPI.period_month.desc()).all()
    return success([_kpi_dict(k) for k in items])


@sla_bp.post("/contracts/<contract_id>/kpi-results")
@require_auth
@require_role("super_admin", "hr_manager")
def add_kpi_result(contract_id):
    KPI = _get("SLAKPIResult")
    body = request.get_json() or {}
    k = KPI(
        contract_id   = contract_id,
        company_id    = g.company_id,
        vendor_id     = body["vendor_id"],
        period_month  = body["period_month"],
        period_year   = body["period_year"],
        kpi_name      = body["kpi_name"],
        kpi_unit      = body.get("kpi_unit"),
        target_value  = body.get("target_value"),
        actual_value  = body.get("actual_value"),
        is_met        = body.get("is_met"),
        weight_pct    = body.get("weight_pct"),
        score         = body.get("score"),
    )
    db.session.add(k)
    db.session.commit()
    return created(_kpi_dict(k))


# ============================================================
# VENDOR INVOICE / BILLING
# ============================================================
@sla_bp.get("/invoices")
@require_auth
def list_invoices():
    M = _get("VendorInvoice")
    q = db.session.query(M).filter_by(company_id=g.company_id, is_deleted=False)
    q = apply_filters(q, M, ["status", "vendor_id", "contract_id"])
    if request.args.get("month"): q = q.filter(M.invoice_period_month == int(request.args["month"]))
    if request.args.get("year"):  q = q.filter(M.invoice_period_year  == int(request.args["year"]))
    q = apply_sort(q, M, ["issue_date", "due_date", "total_amount_npr", "status"])
    items, meta = paginate(q)
    return success([_invoice_dict(i) for i in items], meta=meta)


@sla_bp.post("/invoices")
@require_auth
@require_role("super_admin", "hr_manager")
def create_invoice():
    M = _get("VendorInvoice")
    body = request.get_json() or {}
    required = ["invoice_number", "vendor_id", "contract_id",
                "invoice_period_month", "invoice_period_year",
                "issue_date", "due_date", "total_amount_npr"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return error(f"Missing: {', '.join(missing)}", 422)

    issue = date.fromisoformat(body["issue_date"])
    due   = date.fromisoformat(body["due_date"])
    if due < issue:
        return error("due_date cannot be before issue_date", 422)

    total     = float(body["total_amount_npr"])
    tds_rate  = float(body.get("tds_rate_pct", 1.5))
    tds_amt   = round(total * tds_rate / 100, 2)

    inv = M(
        company_id             = g.company_id,
        vendor_id              = body["vendor_id"],
        contract_id            = body["contract_id"],
        invoice_number         = body["invoice_number"].upper(),
        invoice_period_month   = int(body["invoice_period_month"]),
        invoice_period_year    = int(body["invoice_period_year"]),
        issue_date             = issue,
        due_date               = due,
        workers_billed         = body.get("workers_billed"),
        days_billed            = body.get("days_billed"),
        rate_per_day_npr       = body.get("rate_per_day_npr"),
        amount_before_tax_npr  = body.get("amount_before_tax_npr", total),
        tds_rate_pct           = tds_rate,
        tds_amount_npr         = tds_amt,
        total_amount_npr       = total,
        status                 = "pending_approval",
    )
    db.session.add(inv)
    db.session.commit()
    return created(_invoice_dict(inv), "Invoice created. Run AI validation to cross-check timesheets.")


@sla_bp.get("/invoices/<invoice_id>")
@require_auth
def get_invoice(invoice_id):
    M = _get("VendorInvoice")
    inv = db.session.query(M).filter_by(id=invoice_id, company_id=g.company_id, is_deleted=False).first()
    if not inv: return not_found("Invoice")
    return success(_invoice_dict(inv))


@sla_bp.put("/invoices/<invoice_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_invoice(invoice_id):
    M = _get("VendorInvoice")
    inv = db.session.query(M).filter_by(id=invoice_id, company_id=g.company_id, is_deleted=False).first()
    if not inv: return not_found("Invoice")
    body = request.get_json() or {}
    for k in ["workers_billed", "days_billed", "rate_per_day_npr",
               "timesheet_amount_npr", "attendance_verified", "timesheet_approved"]:
        if k in body: setattr(inv, k, body[k])
    db.session.commit()
    return success(_invoice_dict(inv))


@sla_bp.post("/invoices/<invoice_id>/ai-validate")
@require_auth
def ai_validate_invoice(invoice_id):
    M = _get("VendorInvoice")
    inv = db.session.query(M).filter_by(id=invoice_id, company_id=g.company_id).first()
    if not inv: return not_found("Invoice")

    ATT = _get("VendorAttendance")
    att = db.session.execute(text("""
        SELECT COUNT(*) FILTER (WHERE is_present)  AS present_days,
               COUNT(*)                            AS total_records,
               COALESCE(SUM(overtime_hours), 0)   AS total_ot
        FROM vendor_attendance
        WHERE contract_id = :cid
          AND period_year = :yr AND period_month = :mo
    """), {"cid": str(inv.contract_id),
           "yr": inv.invoice_period_year,
           "mo": inv.invoice_period_month}).fetchone()

    result = validate_invoice_ai({
        "invoice_number":    inv.invoice_number,
        "billed_amount":     float(inv.total_amount_npr),
        "workers_billed":    inv.workers_billed or 0,
        "days_billed":       inv.days_billed or 0,
        "rate_per_day":      float(inv.rate_per_day_npr or 0),
        "attendance_present":att.present_days if att else 0,
        "attendance_records":att.total_records if att else 0,
        "total_ot_hrs":      float(att.total_ot or 0) if att else 0,
    })

    inv.ai_validated         = True
    inv.ai_validated_at      = datetime.utcnow()
    inv.ai_validation_result = result.get("summary", "")
    inv.ai_fraud_risk_score  = result.get("fraud_risk_score", 0)
    inv.timesheet_amount_npr = result.get("expected_amount")
    inv.has_discrepancy      = result.get("has_discrepancy", False)
    db.session.commit()
    return success({"invoice_id": invoice_id, "validation": result,
                    "has_discrepancy": inv.has_discrepancy,
                    "discrepancy_npr": float(inv.discrepancy_amount_npr or 0)})


@sla_bp.post("/invoices/<invoice_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager")
def approve_invoice(invoice_id):
    M = _get("VendorInvoice")
    inv = db.session.query(M).filter_by(id=invoice_id, company_id=g.company_id).first()
    if not inv: return not_found("Invoice")
    if inv.has_discrepancy:
        return error("Cannot approve: unresolved discrepancy. Raise dispute first or verify with vendor.", 409)
    if not inv.timesheet_approved:
        return error("Timesheet must be approved before invoice approval.", 422)
    inv.status      = "approved"
    inv.approved_by = g.user_id
    inv.approved_at = datetime.utcnow()
    db.session.commit()
    return success({"status": "approved", "invoice_number": inv.invoice_number})


@sla_bp.post("/invoices/<invoice_id>/dispute")
@require_auth
def dispute_invoice(invoice_id):
    M = _get("VendorInvoice")
    inv = db.session.query(M).filter_by(id=invoice_id, company_id=g.company_id).first()
    if not inv: return not_found("Invoice")
    body = request.get_json() or {}
    inv.status            = "disputed"
    inv.dispute_reason    = body.get("reason", "Discrepancy detected")
    inv.dispute_raised_by = g.user_id
    inv.dispute_raised_at = datetime.utcnow()
    db.session.commit()
    return success({"status": "disputed", "message": "Dispute raised. Agency must respond within 15 days per SLA terms."})


@sla_bp.post("/invoices/<invoice_id>/mark-paid")
@require_auth
@require_role("super_admin")
def mark_paid(invoice_id):
    M = _get("VendorInvoice")
    inv = db.session.query(M).filter_by(id=invoice_id, company_id=g.company_id).first()
    if not inv: return not_found("Invoice")
    if inv.status != "approved":
        return error("Invoice must be approved before marking as paid", 422)
    body = request.get_json() or {}
    inv.status            = "paid"
    inv.payment_date      = date.fromisoformat(body["payment_date"]) if body.get("payment_date") else date.today()
    inv.payment_reference = body.get("payment_reference")
    db.session.commit()
    return success({"status": "paid", "payment_date": str(inv.payment_date)})


@sla_bp.get("/invoices/summary")
@require_auth
def invoice_summary():
    """Billing summary for OutsourceBillingPage dashboard stats."""
    rows = db.session.execute(text("""
        SELECT
            status,
            COUNT(*)                    AS count,
            COALESCE(SUM(total_amount_npr), 0) AS total_npr
        FROM vendor_invoices
        WHERE company_id = :cid AND NOT is_deleted
        GROUP BY status
    """), {"cid": g.company_id}).fetchall()
    disc = db.session.execute(text("""
        SELECT COUNT(*) AS count,
               COALESCE(SUM(ABS(discrepancy_amount_npr)), 0) AS total_npr
        FROM vendor_invoices
        WHERE company_id = :cid AND has_discrepancy AND NOT is_deleted
    """), {"cid": g.company_id}).fetchone()
    by_status = {r.status: {"count": r.count, "total_npr": float(r.total_npr)} for r in rows}
    return success({
        "by_status":           by_status,
        "discrepancy_count":   disc.count if disc else 0,
        "discrepancy_total":   float(disc.total_npr) if disc else 0,
        "total_billed":        sum(v["total_npr"] for v in by_status.values()),
        "total_paid":          by_status.get("paid", {}).get("total_npr", 0),
    })


# ============================================================
# VENDOR ATTENDANCE
# ============================================================
@sla_bp.get("/attendance")
@require_auth
def list_attendance():
    M = _get("VendorAttendance")
    q = db.session.query(M).filter_by(company_id=g.company_id)
    q = apply_filters(q, M, ["vendor_id", "contract_id", "vendor_employee_id"])
    if request.args.get("month"): q = q.filter(M.period_month == int(request.args["month"]))
    if request.args.get("year"):  q = q.filter(M.period_year  == int(request.args["year"]))
    if request.args.get("date"):  q = q.filter(M.attendance_date == date.fromisoformat(request.args["date"]))
    items, meta = paginate(q)
    return success([_att_dict(a) for a in items], meta=meta)


@sla_bp.post("/attendance")
@require_auth
def log_attendance():
    """Clock-in / clock-out for vendor employees."""
    M = _get("VendorAttendance")
    body = request.get_json() or {}
    if not body.get("vendor_employee_id") or not body.get("attendance_date"):
        return error("vendor_employee_id and attendance_date are required", 422)

    att_date = date.fromisoformat(body["attendance_date"])

    # Upsert — one record per employee per day
    existing = db.session.query(M).filter_by(
        vendor_employee_id=body["vendor_employee_id"],
        attendance_date=att_date
    ).first()

    if existing:
        rec = existing
    else:
        rec = M(
            company_id         = g.company_id,
            vendor_id          = body["vendor_id"],
            vendor_employee_id = body["vendor_employee_id"],
            contract_id        = body.get("contract_id"),
            attendance_date    = att_date,
        )
        db.session.add(rec)

    rec.shift_type          = body.get("shift_type")
    rec.is_present          = body.get("is_present", True)
    rec.is_absent           = not body.get("is_present", True)
    rec.is_late             = body.get("is_late", False)
    rec.late_minutes        = body.get("late_minutes", 0)
    rec.is_half_day         = body.get("is_half_day", False)
    rec.biometric_verified  = body.get("biometric_verified", False)
    rec.gps_verified        = body.get("gps_verified", False)
    rec.gps_latitude        = body.get("gps_latitude")
    rec.gps_longitude       = body.get("gps_longitude")
    rec.verification_method = body.get("verification_method", "manual")
    rec.overtime_hours      = body.get("overtime_hours", 0)
    rec.remarks             = body.get("remarks")

    if body.get("check_in_time"):
        rec.check_in_time  = datetime.fromisoformat(body["check_in_time"])
    if body.get("check_out_time"):
        rec.check_out_time = datetime.fromisoformat(body["check_out_time"])

    db.session.commit()
    return created(_att_dict(rec), "Attendance logged")


@sla_bp.put("/attendance/<att_id>")
@require_auth
def update_attendance(att_id):
    M = _get("VendorAttendance")
    rec = db.session.query(M).filter_by(id=att_id, company_id=g.company_id).first()
    if not rec: return not_found("Attendance Record")
    body = request.get_json() or {}
    for k in ["is_present", "is_absent", "is_late", "late_minutes", "overtime_hours",
               "biometric_verified", "verification_method", "remarks", "leave_type"]:
        if k in body: setattr(rec, k, body[k])
    rec.updated_at = datetime.utcnow()
    db.session.commit()
    return success(_att_dict(rec))


@sla_bp.post("/attendance/ai-ghost-scan")
@require_auth
def ai_ghost_scan():
    M = _get("VendorAttendance")
    month = int(request.get_json().get("month", date.today().month))
    year  = int(request.get_json().get("year",  date.today().year))
    vendor_id = request.get_json().get("vendor_id")

    q = db.session.query(M).filter_by(company_id=g.company_id, period_year=year, period_month=month)
    if vendor_id: q = q.filter(M.vendor_id == vendor_id)
    records = q.all()

    flags = detect_ghost_workers([{
        "vendor_emp_id":     str(r.vendor_employee_id),
        "date":              r.attendance_date.isoformat(),
        "is_present":        r.is_present,
        "biometric_verified":r.biometric_verified,
        "late_minutes":      r.late_minutes or 0,
        "ghost_risk_score":  r.ghost_risk_score or 0,
    } for r in records])

    for flag in (flags.get("high_risk_workers") or []):
        db.session.execute(text("""
            UPDATE vendor_attendance
               SET ghost_risk_score = :score,
                   ai_anomaly_detected = TRUE,
                   ghost_risk_flags = :flags::jsonb
             WHERE vendor_employee_id = :eid
               AND period_year = :yr AND period_month = :mo
        """), {"score": flag.get("risk_score", 80),
               "flags": str(flag.get("patterns", [])),
               "eid":   flag["vendor_emp_id"],
               "yr":    year, "mo": month})
    db.session.commit()

    return success({"scanned": len(records), "period": f"{month}/{year}",
                    "findings": flags, "scanned_at": datetime.utcnow().isoformat()})


@sla_bp.get("/attendance/monthly-summary")
@require_auth
def attendance_monthly_summary():
    month = int(request.args.get("month", date.today().month))
    year  = int(request.args.get("year",  date.today().year))
    rows = db.session.execute(text("""
        SELECT
            ve.vendor_emp_id,
            ve.name,
            ve.role,
            ov.vendor_name,
            va.shift_type,
            COUNT(*)                                         AS working_days,
            COUNT(*) FILTER (WHERE va.is_present)           AS present_days,
            COUNT(*) FILTER (WHERE va.is_absent)            AS absent_days,
            COUNT(*) FILTER (WHERE va.is_late)              AS late_count,
            COALESCE(SUM(va.overtime_hours), 0)             AS total_ot_hrs,
            ROUND(AVG(va.ghost_risk_score)::NUMERIC, 1)     AS avg_ghost_risk,
            BOOL_AND(va.biometric_verified)                 AS all_biometric
        FROM vendor_attendance va
        JOIN vendor_employees ve ON va.vendor_employee_id = ve.id
        JOIN outsource_vendors ov ON va.vendor_id = ov.id
        WHERE va.company_id = :cid
          AND va.period_year = :yr AND va.period_month = :mo
        GROUP BY ve.vendor_emp_id, ve.name, ve.role, ov.vendor_name, va.shift_type
        ORDER BY avg_ghost_risk DESC NULLS LAST
    """), {"cid": g.company_id, "yr": year, "mo": month}).fetchall()

    data = [dict(r._mapping) for r in rows]
    total_present = sum(r["present_days"] for r in data)
    total_days    = sum(r["working_days"]  for r in data)
    return success({
        "period":  f"{month}/{year}",
        "workers": data,
        "summary": {
            "total_workers":       len(data),
            "avg_attendance_pct":  round(total_present / total_days * 100, 1) if total_days else 0,
            "ghost_risk_workers":  sum(1 for r in data if (r.get("avg_ghost_risk") or 0) > 50),
            "non_biometric":       sum(1 for r in data if not r.get("all_biometric")),
            "total_ot_hrs":        sum(float(r.get("total_ot_hrs") or 0) for r in data),
        }
    })


# ============================================================
# VENDOR PERFORMANCE CARDS
# ============================================================
@sla_bp.get("/performance-cards")
@require_auth
def list_performance_cards():
    M = _get("VendorPerformanceCard")
    q = db.session.query(M).filter_by(company_id=g.company_id)
    q = apply_filters(q, M, ["vendor_id", "contract_id"])
    if request.args.get("month"): q = q.filter(M.period_month == int(request.args["month"]))
    if request.args.get("year"):  q = q.filter(M.period_year  == int(request.args["year"]))
    q = q.order_by(M.overall_score.asc())
    items, meta = paginate(q)
    return success([_perf_dict(p) for p in items], meta=meta)


@sla_bp.put("/performance-cards/<card_id>/review")
@require_auth
@require_role("super_admin", "hr_manager")
def review_performance_card(card_id):
    M = _get("VendorPerformanceCard")
    card = db.session.query(M).filter_by(id=card_id, company_id=g.company_id).first()
    if not card: return not_found("Performance Card")
    body = request.get_json() or {}
    card.reviewed_by          = g.user_id
    card.reviewed_at          = datetime.utcnow()
    card.review_notes         = body.get("review_notes")
    card.action_plan_received = body.get("action_plan_received", False)
    db.session.commit()
    return success(_perf_dict(card))


@sla_bp.post("/performance-cards/<card_id>/issue-warning")
@require_auth
@require_role("super_admin", "hr_manager")
def issue_warning(card_id):
    M = _get("VendorPerformanceCard")
    card = db.session.query(M).filter_by(id=card_id, company_id=g.company_id).first()
    if not card: return not_found("Performance Card")
    if (card.overall_score or 100) >= 80:
        return error("Performance score is above 80%. Warning not warranted.", 422)
    card.warning_issued    = True
    card.warning_issued_at = datetime.utcnow()
    db.session.commit()
    return success({"warning_issued": True, "vendor_id": str(card.vendor_id),
                    "score": card.overall_score,
                    "message": "Warning issued. Agency must submit action plan within 30 days."})


@sla_bp.post("/performance-cards/generate")
@require_auth
@require_role("super_admin", "hr_manager")
def generate_scorecards():
    """AI auto-generates monthly scorecards for all active vendors."""
    from ..models.workforce_config_models import OutsourceVendor
    body   = request.get_json() or {}
    month  = int(body.get("month", date.today().month))
    year   = int(body.get("year",  date.today().year))
    M      = _get("VendorPerformanceCard")

    vendors = db.session.execute(text("""
        SELECT ov.id, ov.vendor_name,
               sc.id AS contract_id, sc.max_workers_allowed
        FROM outsource_vendors ov
        JOIN sla_contracts sc ON sc.vendor_id = ov.id AND sc.status = 'active'
        WHERE ov.company_id = :cid AND ov.status = 'active' AND NOT ov.is_deleted
    """), {"cid": g.company_id}).fetchall()

    generated = []
    for v in vendors:
        att = db.session.execute(text("""
            SELECT ROUND(AVG(CASE WHEN is_present THEN 100.0 ELSE 0 END)::NUMERIC, 1) AS att_pct,
                   COUNT(DISTINCT vendor_employee_id) AS worker_count
            FROM vendor_attendance
            WHERE vendor_id = :vid AND period_year = :yr AND period_month = :mo
        """), {"vid": str(v.id), "yr": year, "mo": month}).fetchone()

        inv = db.session.execute(text("""
            SELECT COUNT(*) FILTER (WHERE NOT has_discrepancy) AS clean,
                   COUNT(*)                                   AS total
            FROM vendor_invoices
            WHERE vendor_id = :vid AND invoice_period_year = :yr AND invoice_period_month = :mo
        """), {"vid": str(v.id), "yr": year, "mo": month}).fetchone()

        comp = db.session.execute(text("""
            SELECT COUNT(*) FILTER (WHERE ssf_paid_current_month AND insurance_active) AS ok,
                   COUNT(*) AS total
            FROM vendor_employees
            WHERE vendor_id = :vid AND status = 'active'
        """), {"vid": str(v.id)}).fetchone()

        att_pct   = float(att.att_pct or 0) if att else 0
        fill_pct  = round((att.worker_count or 0) / max(v.max_workers_allowed, 1) * 100, 1) if att else 0
        bill_pct  = round((inv.clean or 0) / max(inv.total or 1, 1) * 100, 1) if inv else 100
        comp_pct  = round((comp.ok or 0) / max(comp.total or 1, 1) * 100, 1) if comp else 100

        kpi_data  = {"attendance_pct": att_pct, "fill_rate_pct": fill_pct,
                     "billing_accuracy_pct": bill_pct, "legal_compliance_pct": comp_pct}
        scored    = score_vendor_performance(kpi_data)

        existing = db.session.query(M).filter_by(
            vendor_id=str(v.id), contract_id=str(v.contract_id),
            period_year=year, period_month=month
        ).first()
        card = existing or M(company_id=g.company_id, vendor_id=str(v.id),
                              contract_id=str(v.contract_id), period_month=month, period_year=year)

        card.fill_rate_target_pct        = 95;  card.fill_rate_actual_pct        = fill_pct;  card.fill_rate_met        = fill_pct  >= 95
        card.attendance_target_pct       = 90;  card.attendance_actual_pct       = att_pct;   card.attendance_met       = att_pct   >= 90
        card.billing_accuracy_target_pct = 98;  card.billing_accuracy_actual_pct = bill_pct;  card.billing_accuracy_met = bill_pct  >= 98
        card.legal_compliance_target_pct = 90;  card.legal_compliance_actual_pct = comp_pct;  card.legal_compliance_met = comp_pct  >= 90
        card.overall_score        = scored.get("overall_score", 0)
        card.overall_risk_level   = scored.get("risk_level", "low")
        card.ai_generated         = True;  card.ai_generated_at  = datetime.utcnow()
        card.ai_summary           = scored.get("summary");  card.ai_recommendation = scored.get("recommendation")
        card.ai_trend             = scored.get("trend", "stable")

        if not existing: db.session.add(card)
        generated.append({"vendor_id": str(v.id), "vendor_name": v.vendor_name,
                           "score": card.overall_score, "risk": card.overall_risk_level})

    db.session.commit()
    return success({"generated": len(generated), "period": f"{month}/{year}", "scorecards": generated})


# ── Dict helpers ──────────────────────────────────────────────
def _contract_dict(c) -> dict:
    return {
        "id": str(c.id), "contract_number": c.contract_number, "contract_name": c.contract_name,
        "vendor_id": str(c.vendor_id), "service_type": c.service_type, "contract_type": c.contract_type,
        "start_date": str(c.start_date), "end_date": str(c.end_date),
        "renewal_alert_days": c.renewal_alert_days, "auto_renewal": c.auto_renewal,
        "total_contract_value_npr": float(c.total_contract_value_npr or 0),
        "monthly_billing_rate_npr": float(c.monthly_billing_rate_npr or 0),
        "rate_per_worker_per_day": float(c.rate_per_worker_per_day or 0),
        "max_workers_allowed": c.max_workers_allowed, "current_workers_deployed": c.current_workers_deployed,
        "ensures_min_wage": c.ensures_min_wage, "ensures_ssf_payment": c.ensures_ssf_payment,
        "ensures_insurance": c.ensures_insurance, "non_core_work_only": c.non_core_work_only,
        "main_employer_co_liable": c.main_employer_co_liable,
        "overall_compliance_pct": float(c.overall_compliance_pct or 100),
        "sla_kpis": c.sla_kpis or [], "key_clauses": c.key_clauses or [],
        "status": c.status, "ai_renewal_recommendation": c.ai_renewal_recommendation,
    }

def _kpi_dict(k) -> dict:
    return {
        "id": str(k.id), "kpi_name": k.kpi_name, "kpi_unit": k.kpi_unit,
        "period_month": k.period_month, "period_year": k.period_year,
        "target_value": float(k.target_value or 0), "actual_value": float(k.actual_value or 0),
        "is_met": k.is_met, "weight_pct": float(k.weight_pct or 0),
        "score": float(k.score or 0), "ai_root_cause": k.ai_root_cause,
        "ai_action_items": k.ai_action_items or [],
    }

def _invoice_dict(i) -> dict:
    return {
        "id": str(i.id), "invoice_number": i.invoice_number,
        "vendor_id": str(i.vendor_id), "contract_id": str(i.contract_id),
        "period": f"{i.invoice_period_month}/{i.invoice_period_year}",
        "invoice_period_month": i.invoice_period_month, "invoice_period_year": i.invoice_period_year,
        "issue_date": str(i.issue_date), "due_date": str(i.due_date),
        "payment_date": str(i.payment_date) if i.payment_date else None,
        "workers_billed": i.workers_billed, "days_billed": i.days_billed,
        "rate_per_day_npr": float(i.rate_per_day_npr or 0),
        "amount_before_tax_npr": float(i.amount_before_tax_npr or 0),
        "tds_rate_pct": float(i.tds_rate_pct or 1.5), "tds_amount_npr": float(i.tds_amount_npr or 0),
        "total_amount_npr": float(i.total_amount_npr),
        "timesheet_amount_npr": float(i.timesheet_amount_npr or 0) if i.timesheet_amount_npr else None,
        "discrepancy_amount_npr": float(i.discrepancy_amount_npr or 0),
        "has_discrepancy": i.has_discrepancy, "ai_validated": i.ai_validated,
        "ai_validation_result": i.ai_validation_result,
        "ai_fraud_risk_score": float(i.ai_fraud_risk_score or 0),
        "timesheet_approved": i.timesheet_approved, "attendance_verified": i.attendance_verified,
        "status": i.status, "dispute_reason": i.dispute_reason,
        "approved_at": str(i.approved_at) if i.approved_at else None,
        "payment_reference": i.payment_reference,
    }

def _att_dict(a) -> dict:
    return {
        "id": str(a.id), "vendor_employee_id": str(a.vendor_employee_id),
        "attendance_date": str(a.attendance_date), "shift_type": a.shift_type,
        "check_in_time": str(a.check_in_time) if a.check_in_time else None,
        "check_out_time": str(a.check_out_time) if a.check_out_time else None,
        "hours_worked": float(a.hours_worked or 0) if a.hours_worked else None,
        "overtime_hours": float(a.overtime_hours or 0),
        "is_present": a.is_present, "is_absent": a.is_absent,
        "is_late": a.is_late, "late_minutes": a.late_minutes,
        "is_half_day": a.is_half_day, "leave_type": a.leave_type,
        "biometric_verified": a.biometric_verified, "gps_verified": a.gps_verified,
        "verification_method": a.verification_method,
        "ghost_risk_score": float(a.ghost_risk_score or 0),
        "ai_anomaly_detected": a.ai_anomaly_detected,
        "included_in_invoice": a.included_in_invoice, "remarks": a.remarks,
    }

def _perf_dict(p) -> dict:
    return {
        "id": str(p.id), "vendor_id": str(p.vendor_id), "contract_id": str(p.contract_id),
        "period": f"{p.period_month}/{p.period_year}",
        "fill_rate":        {"target": p.fill_rate_target_pct, "actual": p.fill_rate_actual_pct, "met": p.fill_rate_met},
        "attendance":       {"target": p.attendance_target_pct, "actual": p.attendance_actual_pct, "met": p.attendance_met},
        "billing_accuracy": {"target": p.billing_accuracy_target_pct, "actual": p.billing_accuracy_actual_pct, "met": p.billing_accuracy_met},
        "legal_compliance": {"target": p.legal_compliance_target_pct, "actual": p.legal_compliance_actual_pct, "met": p.legal_compliance_met},
        "turnover_rate":    {"target": p.turnover_rate_target_pct, "actual": p.turnover_rate_actual_pct, "met": p.turnover_rate_met},
        "custom_kpi_results": p.custom_kpi_results or [],
        "overall_score": float(p.overall_score or 0), "overall_risk_level": p.overall_risk_level,
        "ai_generated": p.ai_generated, "ai_summary": p.ai_summary,
        "ai_recommendation": p.ai_recommendation, "ai_trend": p.ai_trend,
        "warning_issued": p.warning_issued, "action_plan_received": p.action_plan_received,
        "reviewed_at": str(p.reviewed_at) if p.reviewed_at else None,
        "review_notes": p.review_notes,
    }

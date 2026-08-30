"""
FILE: backend/routes/workforce_routes.py
Flask REST API — Workforce Configuration: Employment Type, Outsource, SLA, Billing
Nepal Labour Act 2074 co-liability enforcement
"""

from flask import Blueprint, request, jsonify
from sqlalchemy import func, and_, text
from datetime import datetime, date
import uuid

from ..models.workforce_config_models import (
    EmploymentTypeConfig, OutsourceVendor, SLAContract, SLAKPIResult,
    VendorEmployee, VendorInvoice, VendorAttendance, VendorPerformanceCard
)
from ..extensions import db, cache, limiter
from ..ai.insights import validate_invoice_ai, score_vendor_performance, detect_ghost_workers

wf_bp = Blueprint("workforce", __name__, url_prefix="/api/v1/workforce")


def success(data, status=200, meta=None):
    resp = {"success": True, "data": data}
    if meta: resp["meta"] = meta
    return jsonify(resp), status

def error(msg, status=400, details=None):
    resp = {"success": False, "error": msg}
    if details: resp["details"] = details
    return jsonify(resp), status

def paginate(query, page=1, per_page=20):
    total = query.count()
    items = query.offset((page-1)*per_page).limit(per_page).all()
    return items, {"total": total, "page": page, "per_page": per_page,
                   "total_pages": (total + per_page - 1) // per_page}


# ============================================================
# EMPLOYMENT TYPE ENDPOINTS
# ============================================================

@wf_bp.get("/companies/<uuid:company_id>/employment-type/overview")
@cache.cached(timeout=60)
def employment_type_overview(company_id):
    """Dashboard stats for EmploymentTypePage"""
    # Insource summary from employment_categories
    cats = db.session.execute(text("""
        SELECT ec.code, ec.name, ec.name_nepali, ec.la_section,
               ec.written_contract_required, ec.max_probation_months,
               ec.cba_eligible, ec.pf_required, ec.ssf_required,
               ec.annual_leave_days, ec.employee_count
        FROM employment_categories ec
        WHERE ec.company_id = :cid AND ec.status = 'active'
        ORDER BY ec.code
    """), {"cid": str(company_id)}).fetchall()

    # Outsource vendor summary
    vendors = db.session.execute(text("""
        SELECT ov.vendor_name, ov.service_category, ov.moless_license_no,
               ov.is_licensed_agency, ov.total_workers_deployed,
               ov.overall_performance_score, ov.overall_risk_level,
               sc.end_date AS contract_end,
               COUNT(vi.id) FILTER (WHERE vi.status = 'pending_approval') AS pending_invoices
        FROM outsource_vendors ov
        LEFT JOIN sla_contracts sc ON sc.vendor_id = ov.id AND sc.status = 'active'
        LEFT JOIN vendor_invoices vi ON vi.vendor_id = ov.id
        WHERE ov.company_id = :cid AND ov.status = 'active'
        GROUP BY ov.id, ov.vendor_name, ov.service_category, ov.moless_license_no,
                 ov.is_licensed_agency, ov.total_workers_deployed,
                 ov.overall_performance_score, ov.overall_risk_level, sc.end_date
    """), {"cid": str(company_id)}).fetchall()

    # Nepal Labour Act 2074 compliance checks
    compliance_alerts = []
    for v in vendors:
        if not v.is_licensed_agency:
            compliance_alerts.append({
                "severity": "critical",
                "vendor": v.vendor_name,
                "msg": "Unlicensed agency! Workers are deemed direct employees per Labour Act 2074 Section 52."
            })
        if v.contract_end and v.contract_end < date.today():
            compliance_alerts.append({
                "severity": "high",
                "vendor": v.vendor_name,
                "msg": f"Contract expired on {v.contract_end}. Operating without valid SLA."
            })

    total_insource  = sum(c.employee_count for c in cats)
    total_outsource = sum(v.total_workers_deployed or 0 for v in vendors)

    return success({
        "insource_types":  [dict(c._mapping) for c in cats],
        "outsource_vendors": [dict(v._mapping) for v in vendors],
        "totals": {
            "insource": total_insource,
            "outsource": total_outsource,
            "total": total_insource + total_outsource,
            "outsource_pct": round(total_outsource/(total_insource+total_outsource)*100, 1)
                             if (total_insource+total_outsource) > 0 else 0,
        },
        "compliance_alerts": compliance_alerts,
        "compliance_score": max(100 - len(compliance_alerts) * 10, 0),
    })


# ============================================================
# OUTSOURCE VENDOR ENDPOINTS
# ============================================================

@wf_bp.get("/companies/<uuid:company_id>/vendors")
def list_vendors(company_id):
    q = db.session.query(OutsourceVendor).filter_by(company_id=company_id, status="active")
    vendors, meta = paginate(q, int(request.args.get("page",1)))
    result = [{
        "id": str(v.id), "vendor_code": v.vendor_code, "vendor_name": v.vendor_name,
        "service_category": v.service_category,
        "moless_license_no": v.moless_license_no,
        "moless_license_expiry": v.moless_license_expiry.isoformat() if v.moless_license_expiry else None,
        "is_licensed_agency": v.is_licensed_agency,
        "overall_performance_score": float(v.overall_performance_score or 0),
        "overall_risk_level": v.overall_risk_level,
        "total_workers_deployed": v.total_workers_deployed,
        "active_contracts_count": v.active_contracts_count,
        "contact_person": v.contact_person, "contact_email": v.contact_email,
        "ai_insights": v.ai_vendor_insights,
    } for v in vendors]
    return success(result, meta=meta)


@wf_bp.post("/companies/<uuid:company_id>/vendors")
def create_vendor(company_id):
    body = request.get_json()
    if not body.get("vendor_code") or not body.get("vendor_name"):
        return error("vendor_code and vendor_name required", 422)

    # Critical Nepal law check
    if not body.get("moless_license_no"):
        return error(
            "MoLESS licence number is mandatory. Unlicensed agencies are illegal per Nepal Labour Act 2074 Section 52.",
            422,
            details={"nepal_law": "Labour Act 2074, Section 52: Only licensed labour suppliers permitted"}
        )

    v = OutsourceVendor(
        company_id          = company_id,
        vendor_code         = body["vendor_code"].upper(),
        vendor_name         = body["vendor_name"],
        vendor_name_nepali  = body.get("vendor_name_nepali"),
        service_category    = body.get("service_category"),
        moless_license_no   = body.get("moless_license_no"),
        moless_license_expiry = date.fromisoformat(body["moless_license_expiry"]) if body.get("moless_license_expiry") else None,
        is_licensed_agency  = bool(body.get("moless_license_no")),
        agency_pan          = body.get("agency_pan"),
        contact_person      = body.get("contact_person"),
        contact_email       = body.get("contact_email"),
        contact_phone       = body.get("contact_phone"),
        address             = body.get("address"),
        created_by          = uuid.UUID(body["created_by"]) if body.get("created_by") else None,
    )
    db.session.add(v)
    db.session.commit()
    cache.clear()
    return success({"id": str(v.id), "vendor_code": v.vendor_code, "vendor_name": v.vendor_name,
                    "is_licensed_agency": v.is_licensed_agency}, 201)


# ============================================================
# SLA CONTRACT ENDPOINTS
# ============================================================

@wf_bp.get("/companies/<uuid:company_id>/sla-contracts")
def list_sla_contracts(company_id):
    q = db.session.query(SLAContract).filter_by(company_id=company_id)
    if request.args.get("status"):
        q = q.filter(SLAContract.status == request.args["status"])

    contracts, meta = paginate(q, int(request.args.get("page",1)))
    result = [{
        "id": str(c.id), "contract_number": c.contract_number,
        "vendor_id": str(c.vendor_id), "service_type": c.service_type,
        "contract_type": c.contract_type,
        "start_date": c.start_date.isoformat(), "end_date": c.end_date.isoformat(),
        "days_remaining": (c.end_date - date.today()).days,
        "total_contract_value_npr": float(c.total_contract_value_npr or 0),
        "monthly_billing_rate_npr": float(c.monthly_billing_rate_npr or 0),
        "max_workers_allowed": c.max_workers_allowed,
        "current_workers_deployed": c.current_workers_deployed,
        "overall_compliance_pct": float(c.overall_compliance_pct or 100),
        "status": c.status,
        "non_core_work_only": c.non_core_work_only,
        "main_employer_co_liable": c.main_employer_co_liable,
        "sla_kpis": c.sla_kpis, "key_clauses": c.key_clauses,
        "ai_renewal_recommendation": c.ai_renewal_recommendation,
    } for c in contracts]
    return success(result, meta=meta)


@wf_bp.post("/companies/<uuid:company_id>/sla-contracts")
def create_sla_contract(company_id):
    body = request.get_json()
    required = ["contract_number","vendor_id","service_type","start_date","end_date","max_workers_allowed"]
    missing = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing required fields: {', '.join(missing)}", 422)

    # Validate vendor is licensed
    vendor = db.session.get(OutsourceVendor, body["vendor_id"])
    if not vendor: return error("Vendor not found", 404)
    if not vendor.is_licensed_agency:
        return error("Cannot create contract with unlicensed agency. Nepal Labour Act 2074 violation.", 422)

    c = SLAContract(
        company_id               = company_id,
        vendor_id                = uuid.UUID(body["vendor_id"]),
        contract_number          = body["contract_number"],
        contract_name            = body.get("contract_name"),
        service_type             = body["service_type"],
        contract_type            = body.get("contract_type", "Service Agreement"),
        start_date               = date.fromisoformat(body["start_date"]),
        end_date                 = date.fromisoformat(body["end_date"]),
        renewal_alert_days       = body.get("renewal_alert_days", 90),
        total_contract_value_npr = body.get("total_contract_value_npr"),
        monthly_billing_rate_npr = body.get("monthly_billing_rate_npr"),
        rate_per_worker_per_day  = body.get("rate_per_worker_per_day"),
        max_workers_allowed      = body["max_workers_allowed"],
        sla_kpis                 = body.get("sla_kpis", []),
        key_clauses              = body.get("key_clauses", []),
        ensures_min_wage         = body.get("ensures_min_wage", True),
        ensures_ssf_payment      = body.get("ensures_ssf_payment", True),
        ensures_insurance        = body.get("ensures_insurance", True),
        non_core_work_only       = body.get("non_core_work_only", True),
        created_by               = uuid.UUID(body["created_by"]) if body.get("created_by") else None,
    )
    db.session.add(c)
    db.session.commit()
    cache.clear()
    return success({"id": str(c.id), "contract_number": c.contract_number,
                    "message": "Contract created. Co-liability clause active per Labour Act 2074."}, 201)


# ============================================================
# VENDOR INVOICE / BILLING ENDPOINTS
# ============================================================

@wf_bp.get("/companies/<uuid:company_id>/vendor-invoices")
def list_invoices(company_id):
    q = db.session.query(VendorInvoice).filter_by(company_id=company_id)
    if request.args.get("status"):
        q = q.filter(VendorInvoice.status == request.args["status"])
    if request.args.get("vendor_id"):
        q = q.filter(VendorInvoice.vendor_id == request.args["vendor_id"])
    invoices, meta = paginate(q, int(request.args.get("page",1)))
    result = [{
        "id": str(i.id), "invoice_number": i.invoice_number,
        "vendor_id": str(i.vendor_id), "contract_id": str(i.contract_id),
        "period": f"{i.invoice_period_month}/{i.invoice_period_year}",
        "issue_date": i.issue_date.isoformat(), "due_date": i.due_date.isoformat(),
        "workers_billed": i.workers_billed, "days_billed": i.days_billed,
        "total_amount_npr": float(i.total_amount_npr),
        "tds_amount_npr": float(i.tds_amount_npr or 0),
        "has_discrepancy": i.has_discrepancy,
        "discrepancy_amount_npr": float(i.discrepancy_amount_npr or 0),
        "ai_validated": i.ai_validated, "ai_validation_result": i.ai_validation_result,
        "ai_fraud_risk_score": float(i.ai_fraud_risk_score or 0),
        "timesheet_approved": i.timesheet_approved,
        "attendance_verified": i.attendance_verified,
        "status": i.status,
    } for i in invoices]
    return success(result, meta=meta)


@wf_bp.post("/companies/<uuid:company_id>/vendor-invoices/<uuid:invoice_id>/ai-validate")
@limiter.limit("50 per hour")
def ai_validate_invoice(company_id, invoice_id):
    """AI cross-checks invoice against timesheet and attendance data"""
    inv = db.session.get(VendorInvoice, invoice_id)
    if not inv: return error("Invoice not found", 404)

    # Get actual attendance data for cross-check
    att_data = db.session.execute(text("""
        SELECT COUNT(*) FILTER (WHERE is_present) AS present_days,
               COUNT(*) AS total_records,
               SUM(overtime_hours)               AS total_ot
        FROM vendor_attendance
        WHERE contract_id = :cid
        AND period_year = :yr AND period_month = :mo
    """), {"cid": str(inv.contract_id),
           "yr": inv.invoice_period_year,
           "mo": inv.invoice_period_month}).fetchone()

    result = validate_invoice_ai({
        "invoice_number":    inv.invoice_number,
        "billed_amount":     float(inv.total_amount_npr),
        "workers_billed":    inv.workers_billed,
        "days_billed":       inv.days_billed,
        "rate_per_day":      float(inv.rate_per_day_npr or 0),
        "attendance_present":att_data.present_days if att_data else 0,
        "attendance_records":att_data.total_records if att_data else 0,
    })

    inv.ai_validated            = True
    inv.ai_validated_at         = datetime.utcnow()
    inv.ai_validation_result    = result.get("summary")
    inv.ai_fraud_risk_score     = result.get("fraud_risk_score", 0)
    inv.timesheet_amount_npr    = result.get("expected_amount")
    inv.has_discrepancy         = result.get("has_discrepancy", False)
    db.session.commit()

    return success({
        "invoice_id": str(invoice_id),
        "validation": result,
        "has_discrepancy": inv.has_discrepancy,
        "discrepancy_amount_npr": float(inv.discrepancy_amount_npr or 0),
    })


@wf_bp.post("/companies/<uuid:company_id>/vendor-invoices/<uuid:invoice_id>/approve")
def approve_invoice(company_id, invoice_id):
    inv = db.session.get(VendorInvoice, invoice_id)
    if not inv: return error("Invoice not found", 404)
    if inv.has_discrepancy:
        return error("Cannot approve invoice with unresolved discrepancy. Raise dispute first.", 409)
    if not inv.timesheet_approved:
        return error("Timesheet must be approved before invoice approval.", 422)

    inv.status      = "approved"
    inv.approved_by = uuid.UUID(request.get_json().get("approved_by","00000000-0000-0000-0000-000000000000"))
    inv.approved_at = datetime.utcnow()
    db.session.commit()
    return success({"invoice_id": str(invoice_id), "status": "approved"})


@wf_bp.post("/companies/<uuid:company_id>/vendor-invoices/<uuid:invoice_id>/dispute")
def dispute_invoice(company_id, invoice_id):
    body = request.get_json()
    inv  = db.session.get(VendorInvoice, invoice_id)
    if not inv: return error("Invoice not found", 404)

    inv.status            = "disputed"
    inv.dispute_reason    = body.get("reason")
    inv.dispute_raised_by = uuid.UUID(body["raised_by"]) if body.get("raised_by") else None
    inv.dispute_raised_at = datetime.utcnow()
    db.session.commit()
    return success({"invoice_id": str(invoice_id), "status": "disputed",
                    "message": "Dispute raised. Agency must respond within 15 days."})


# ============================================================
# VENDOR ATTENDANCE ENDPOINTS
# ============================================================

@wf_bp.get("/companies/<uuid:company_id>/vendor-attendance")
def get_vendor_attendance(company_id):
    month  = int(request.args.get("month", date.today().month))
    year   = int(request.args.get("year",  date.today().year))
    vendor_id = request.args.get("vendor_id")

    q = db.session.execute(text("""
        SELECT
            ve.vendor_emp_id, ve.name, ve.role,
            ov.vendor_name,
            va.shift_type,
            COUNT(*) FILTER (WHERE va.is_present)              AS present_days,
            COUNT(*) FILTER (WHERE va.is_absent)               AS absent_days,
            COUNT(*) FILTER (WHERE va.is_late)                 AS late_count,
            SUM(va.overtime_hours)                             AS total_ot_hours,
            ROUND(AVG(va.ghost_risk_score)::NUMERIC, 1)        AS avg_ghost_risk,
            BOOL_AND(va.biometric_verified)                    AS fully_biometric,
            COUNT(*)                                           AS total_records
        FROM vendor_attendance va
        JOIN vendor_employees ve ON va.vendor_employee_id = ve.id
        JOIN outsource_vendors ov ON va.vendor_id = ov.id
        WHERE va.company_id = :cid
          AND va.period_year = :yr AND va.period_month = :mo
          AND (:vid IS NULL OR va.vendor_id::TEXT = :vid)
        GROUP BY ve.vendor_emp_id, ve.name, ve.role, ov.vendor_name, va.shift_type
        ORDER BY avg_ghost_risk DESC
    """), {"cid": str(company_id), "yr": year, "mo": month, "vid": vendor_id}).fetchall()

    records = [dict(r._mapping) for r in q]
    total_present = sum(r["present_days"] for r in records)
    total_records = sum(r["total_records"] for r in records)

    return success({
        "period": f"{month}/{year}",
        "records": records,
        "summary": {
            "total_workers": len(records),
            "avg_attendance_pct": round(total_present/total_records*100, 1) if total_records else 0,
            "ghost_risk_count": sum(1 for r in records if (r["avg_ghost_risk"] or 0) > 50),
            "non_biometric_count": sum(1 for r in records if not r["fully_biometric"]),
        }
    })


@wf_bp.post("/companies/<uuid:company_id>/vendor-attendance/ai-ghost-scan")
@limiter.limit("10 per hour")
def ai_ghost_worker_scan(company_id):
    """AI scans attendance patterns for ghost worker detection"""
    month  = int(request.args.get("month", date.today().month))
    year   = int(request.args.get("year",  date.today().year))

    # Get attendance records
    records = db.session.query(VendorAttendance).filter(
        VendorAttendance.company_id == company_id,
        VendorAttendance.period_year  == year,
        VendorAttendance.period_month == month,
    ).all()

    flags = detect_ghost_workers([{
        "vendor_emp_id": str(r.vendor_employee_id),
        "date": r.attendance_date.isoformat(),
        "is_present": r.is_present,
        "biometric_verified": r.biometric_verified,
        "late_minutes": r.late_minutes,
    } for r in records])

    # Update risk scores
    for flag in flags.get("high_risk_workers", []):
        db.session.execute(text("""
            UPDATE vendor_attendance
            SET ghost_risk_score = :score, ai_anomaly_detected = TRUE,
                ghost_risk_flags = :flags
            WHERE vendor_employee_id = :emp_id
              AND period_year = :yr AND period_month = :mo
        """), {
            "score": flag["risk_score"],
            "flags": str(flag.get("patterns",[])),
            "emp_id": flag["vendor_emp_id"],
            "yr": year, "mo": month
        })
    db.session.commit()

    return success({
        "scanned_records": len(records),
        "ghost_risk_findings": flags,
        "scanned_at": datetime.utcnow().isoformat(),
    })


# ============================================================
# VENDOR PERFORMANCE ENDPOINTS
# ============================================================

@wf_bp.get("/companies/<uuid:company_id>/vendor-performance")
def list_vendor_performance(company_id):
    month = int(request.args.get("month", date.today().month))
    year  = int(request.args.get("year",  date.today().year))

    cards = db.session.query(VendorPerformanceCard).filter_by(
        company_id=company_id, period_year=year, period_month=month
    ).all()

    return success([{
        "id": str(c.id), "vendor_id": str(c.vendor_id),
        "period": f"{c.period_month}/{c.period_year}",
        "fill_rate_actual_pct": float(c.fill_rate_actual_pct or 0),
        "fill_rate_met": c.fill_rate_met,
        "attendance_actual_pct": float(c.attendance_actual_pct or 0),
        "attendance_met": c.attendance_met,
        "legal_compliance_actual_pct": float(c.legal_compliance_actual_pct or 0),
        "legal_compliance_met": c.legal_compliance_met,
        "billing_accuracy_actual_pct": float(c.billing_accuracy_actual_pct or 0),
        "billing_accuracy_met": c.billing_accuracy_met,
        "turnover_rate_actual_pct": float(c.turnover_rate_actual_pct or 0),
        "turnover_rate_met": c.turnover_rate_met,
        "overall_score": float(c.overall_score or 0),
        "overall_risk_level": c.overall_risk_level,
        "ai_summary": c.ai_summary,
        "ai_recommendation": c.ai_recommendation,
        "ai_trend": c.ai_trend,
        "warning_issued": c.warning_issued,
    } for c in cards])


@wf_bp.post("/companies/<uuid:company_id>/vendor-performance/generate-scorecards")
@limiter.limit("5 per hour")
def generate_vendor_scorecards(company_id):
    """AI auto-generates monthly vendor performance scorecards"""
    month = int(request.get_json().get("month", date.today().month))
    year  = int(request.get_json().get("year",  date.today().year))

    vendors = db.session.query(OutsourceVendor).filter_by(company_id=company_id, status="active").all()
    generated = []

    for vendor in vendors:
        # Gather KPI data from DB
        att_stats = db.session.execute(text("""
            SELECT
              ROUND(AVG(CASE WHEN is_present THEN 100.0 ELSE 0 END), 1) AS att_pct,
              COUNT(DISTINCT vendor_employee_id) AS worker_count
            FROM vendor_attendance
            WHERE vendor_id = :vid AND period_year = :yr AND period_month = :mo
        """), {"vid": str(vendor.id), "yr": year, "mo": month}).fetchone()

        invoice_stats = db.session.execute(text("""
            SELECT
              COUNT(*) FILTER (WHERE NOT has_discrepancy) AS clean_invoices,
              COUNT(*) AS total_invoices
            FROM vendor_invoices
            WHERE vendor_id = :vid
              AND invoice_period_year = :yr AND invoice_period_month = :mo
        """), {"vid": str(vendor.id), "yr": year, "mo": month}).fetchone()

        compliance_stats = db.session.execute(text("""
            SELECT
              COUNT(*) FILTER (WHERE ssf_paid_current_month AND insurance_active) AS compliant,
              COUNT(*) AS total
            FROM vendor_employees
            WHERE vendor_id = :vid AND status = 'active'
        """), {"vid": str(vendor.id)}).fetchone()

        kpi_data = {
            "attendance_pct":     float(att_stats.att_pct or 0) if att_stats else 0,
            "workers_deployed":   (att_stats.worker_count or 0) if att_stats else 0,
            "billing_accuracy":   (invoice_stats.clean_invoices/invoice_stats.total_invoices*100
                                   if invoice_stats and invoice_stats.total_invoices else 100),
            "legal_compliance":   (compliance_stats.compliant/compliance_stats.total*100
                                   if compliance_stats and compliance_stats.total else 100),
        }

        # AI scoring
        scored = score_vendor_performance(kpi_data)

        # Upsert performance card
        existing = db.session.query(VendorPerformanceCard).filter_by(
            vendor_id=vendor.id, period_year=year, period_month=month
        ).first()

        card = existing or VendorPerformanceCard(
            company_id=company_id, vendor_id=vendor.id,
            period_month=month, period_year=year,
        )

        card.attendance_actual_pct       = kpi_data["attendance_pct"]
        card.attendance_met              = kpi_data["attendance_pct"] >= 90
        card.billing_accuracy_actual_pct = kpi_data["billing_accuracy"]
        card.billing_accuracy_met        = kpi_data["billing_accuracy"] >= 98
        card.legal_compliance_actual_pct = kpi_data["legal_compliance"]
        card.legal_compliance_met        = kpi_data["legal_compliance"] >= 90
        card.overall_score               = scored.get("overall_score", 0)
        card.overall_risk_level          = scored.get("risk_level", "low")
        card.ai_generated                = True
        card.ai_generated_at             = datetime.utcnow()
        card.ai_summary                  = scored.get("summary")
        card.ai_recommendation           = scored.get("recommendation")
        card.ai_trend                    = scored.get("trend", "stable")

        if not existing: db.session.add(card)

        # Update vendor overall score
        vendor.overall_performance_score = scored.get("overall_score", 0)
        vendor.overall_risk_level        = scored.get("risk_level", "low")
        vendor.ai_last_scored            = datetime.utcnow()

        generated.append({"vendor_id": str(vendor.id), "vendor_name": vendor.vendor_name,
                           "score": scored.get("overall_score"), "risk": scored.get("risk_level")})

    db.session.commit()
    return success({"generated_count": len(generated), "scorecards": generated,
                    "period": f"{month}/{year}"})


# ============================================================
# VENDOR COMPLIANCE — Nepal Labour Act 2074
# ============================================================

@wf_bp.get("/companies/<uuid:company_id>/vendor-compliance-check")
def vendor_compliance_check(company_id):
    """Full Nepal Labour Act 2074 co-liability check for all vendors"""
    results = db.session.execute(text("""
        SELECT
            ov.vendor_name, ov.service_category,
            ov.moless_license_no, ov.moless_license_expiry,
            ov.is_licensed_agency,
            COUNT(ve.id)                                                       AS total_workers,
            COUNT(ve.id) FILTER (WHERE NOT ve.ssf_paid_current_month)         AS ssf_unpaid,
            COUNT(ve.id) FILTER (WHERE NOT ve.insurance_active)               AS uninsured,
            COUNT(ve.id) FILTER (WHERE NOT ve.bg_verified)                    AS bg_unverified,
            COUNT(ve.id) FILTER (WHERE ve.monthly_wage_npr < 15000)           AS below_min_wage,
            COUNT(vi.id) FILTER (WHERE vi.has_discrepancy)                    AS disputed_invoices,
            ov.overall_performance_score                                       AS perf_score
        FROM outsource_vendors ov
        LEFT JOIN vendor_employees ve ON ve.vendor_id = ov.id AND ve.status = 'active'
        LEFT JOIN vendor_invoices vi  ON vi.vendor_id = ov.id
        WHERE ov.company_id = :cid
        GROUP BY ov.id, ov.vendor_name, ov.service_category,
                 ov.moless_license_no, ov.moless_license_expiry,
                 ov.is_licensed_agency, ov.overall_performance_score
    """), {"cid": str(company_id)}).fetchall()

    compliance_report = []
    for r in results:
        issues = []
        risk_score = 100

        if not r.is_licensed_agency:
            issues.append({"severity":"critical","msg":"Unlicensed agency - workers deemed direct employees (LA2074 S.52)"})
            risk_score -= 30
        if r.moless_license_expiry and r.moless_license_expiry < date.today():
            issues.append({"severity":"critical","msg":f"MoLESS license expired: {r.moless_license_expiry}"})
            risk_score -= 25
        if r.ssf_unpaid > 0:
            issues.append({"severity":"high","msg":f"{r.ssf_unpaid} workers SSF unpaid - main employer co-liable (LA2074 S.55)"})
            risk_score -= 15
        if r.uninsured > 0:
            issues.append({"severity":"high","msg":f"{r.uninsured} workers without insurance - mandatory per law"})
            risk_score -= 10
        if r.below_min_wage > 0:
            issues.append({"severity":"high","msg":f"{r.below_min_wage} workers paid below NPR 15,000 minimum wage"})
            risk_score -= 20
        if r.disputed_invoices > 0:
            issues.append({"severity":"medium","msg":f"{r.disputed_invoices} disputed invoices pending resolution"})
            risk_score -= 5

        compliance_report.append({
            "vendor_name": r.vendor_name,
            "service_category": r.service_category,
            "total_workers": r.total_workers,
            "compliance_score": max(risk_score, 0),
            "issues": issues, "issues_count": len(issues),
            "action_required": risk_score < 70,
            "performance_score": float(r.perf_score or 0),
        })

    overall_risk = sum(1 for r in compliance_report if r["action_required"])
    return success({
        "vendor_compliance": compliance_report,
        "vendors_needing_action": overall_risk,
        "overall_company_risk": "critical" if overall_risk > 0 else "low",
        "generated_at": datetime.utcnow().isoformat(),
        "nepal_law_reference": "Labour Act 2074 (2017), Sections 52-60",
    })
